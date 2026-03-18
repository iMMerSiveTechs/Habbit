import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import type { AppType } from "../index";
import { db } from "../db";
import {
  createTodoRequestSchema,
  updateTodoRequestSchema,
  completeTodoRequestSchema,
  addTodoItemRequestSchema,
  updateTodoItemRequestSchema,
  archiveTodoRequestSchema,
  repeatTodoRequestSchema,
  saveAsTemplateRequestSchema,
  addTodoReminderRequestSchema,
} from "../../../shared/contracts";
import { getLimits } from "../tierGuard";

function parsePagination(c: any) {
  const rawLimit = parseInt(c.req.query("limit") || "50", 10);
  const rawOffset = parseInt(c.req.query("offset") || "0", 10);
  const limit = Math.max(1, Math.min(100, isNaN(rawLimit) ? 50 : rawLimit));
  const offset = Math.max(0, isNaN(rawOffset) ? 0 : rawOffset);
  return { limit, offset };
}

const todos = new Hono<AppType>();

// GET /api/todos - Get all todos for authenticated user
todos.get("/", async (c) => {
  const user = c.get("user");

  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const profile = await db.profile.findUnique({
    where: { userId: user.id },
  });

  if (!profile) {
    return c.json({ error: "Profile not found" }, 404);
  }

  const { limit, offset } = parsePagination(c);

  const whereClause = {
    profileId: profile.id,
    archived: false, // Only show non-archived todos by default
  };

  const [userTodos, total] = await Promise.all([
    db.todo.findMany({
      where: whereClause,
      include: {
        items: {
          orderBy: { order: "asc" },
        },
        reminders: {
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: [{ completed: "asc" }, { order: "asc" }, { createdAt: "desc" }],
      take: limit,
      skip: offset,
    }),
    db.todo.count({ where: whereClause }),
  ]);

  return c.json({
    todos: userTodos.map((todo) => ({
      ...todo,
      createdAt: todo.createdAt.toISOString(),
      updatedAt: todo.updatedAt.toISOString(),
      completedAt: todo.completedAt?.toISOString() ?? null,
      dueDate: todo.dueDate?.toISOString() ?? null,
      items: todo.items.map((item) => ({
        ...item,
        createdAt: item.createdAt.toISOString(),
        completedAt: item.completedAt?.toISOString() ?? null,
      })),
      reminders: (todo.reminders || []).map((r: any) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
      })),
    })),
    total,
    limit,
    offset,
  });
});

// POST /api/todos - Create a new todo
todos.post("/", zValidator("json", createTodoRequestSchema), async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const profile = await db.profile.findUnique({
    where: { userId: user.id },
  });

  if (!profile) {
    return c.json({ error: "Profile not found" }, 404);
  }

  // Tier gate: check todo creation limit
  const limits = getLimits(profile.subscriptionTier || "free");
  if (limits.maxTodos !== -1) {
    const currentCount = await db.todo.count({
      where: { profileId: profile.id, archived: false, completed: false },
    });
    if (currentCount >= limits.maxTodos) {
      return c.json(
        {
          error: "upgrade_required",
          message: `You've reached your limit of ${limits.maxTodos} active todos. Upgrade to Core or higher to create more.`,
          requiredTier: "core",
        },
        403,
      );
    }
  }

  const data = c.req.valid("json");

  // Get max order for new todo
  const maxOrder = await db.todo.findFirst({
    where: { profileId: profile.id },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  const newTodo = await db.todo.create({
    data: {
      profileId: profile.id,
      title: data.title,
      description: data.description,
      priority: data.priority,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      linkedHabitId: data.linkedHabitId,
      order: (maxOrder?.order ?? -1) + 1,
      recurringType: data.recurringType || null,
      recurringInterval: data.recurringInterval || null,
      recurringDays: data.recurringDays ? JSON.stringify(data.recurringDays) : null,
      reminderTime: data.reminderTime || null,
      reminderEnabled: data.reminderEnabled || false,
      items: data.items
        ? {
            create: data.items.map((item, index) => ({
              title: item.title,
              order: item.order ?? index,
            })),
          }
        : undefined,
    },
    include: {
      items: {
        orderBy: { order: "asc" },
      },
      reminders: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  return c.json({
    todo: {
      ...newTodo,
      createdAt: newTodo.createdAt.toISOString(),
      updatedAt: newTodo.updatedAt.toISOString(),
      completedAt: newTodo.completedAt?.toISOString() ?? null,
      dueDate: newTodo.dueDate?.toISOString() ?? null,
      items: newTodo.items.map((item) => ({
        ...item,
        createdAt: item.createdAt.toISOString(),
        completedAt: item.completedAt?.toISOString() ?? null,
      })),
      reminders: (newTodo.reminders || []).map((r: any) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
      })),
    },
  });
});

// POST /api/todos/reorder - Reorder todos
todos.post("/reorder", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const profile = await db.profile.findUnique({
    where: { userId: user.id },
  });

  if (!profile) {
    return c.json({ error: "Profile not found" }, 404);
  }

  const body = await c.req.json();
  const orderedIds: string[] = body.orderedIds;

  if (!Array.isArray(orderedIds)) {
    return c.json({ error: "orderedIds must be an array" }, 400);
  }

  // Update order for each todo
  await db.$transaction(
    orderedIds.map((id, index) =>
      db.todo.updateMany({
        where: { id, profileId: profile.id },
        data: { order: index },
      })
    )
  );

  return c.json({ success: true });
});

// PATCH /api/todos/:id - Update a todo
todos.patch("/:id", zValidator("json", updateTodoRequestSchema), async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const profile = await db.profile.findUnique({
    where: { userId: user.id },
  });

  if (!profile) {
    return c.json({ error: "Profile not found" }, 404);
  }

  const todoId = c.req.param("id");
  const data = c.req.valid("json");

  // Verify todo belongs to user
  const existingTodo = await db.todo.findFirst({
    where: { id: todoId, profileId: profile.id },
  });

  if (!existingTodo) {
    return c.json({ error: "Todo not found" }, 404);
  }

  const updatedTodo = await db.todo.update({
    where: { id: todoId },
    data: {
      ...(data.title && { title: data.title }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.priority && { priority: data.priority }),
      ...(data.dueDate !== undefined && {
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
      }),
      ...(data.linkedHabitId !== undefined && {
        linkedHabitId: data.linkedHabitId,
      }),
      ...(data.order !== undefined && { order: data.order }),
      ...(data.recurringType !== undefined && { recurringType: data.recurringType }),
      ...(data.recurringInterval !== undefined && { recurringInterval: data.recurringInterval }),
      ...(data.recurringDays !== undefined && {
        recurringDays: data.recurringDays ? JSON.stringify(data.recurringDays) : null
      }),
      ...(data.reminderTime !== undefined && { reminderTime: data.reminderTime }),
      ...(data.reminderEnabled !== undefined && { reminderEnabled: data.reminderEnabled }),
    },
    include: {
      items: {
        orderBy: { order: "asc" },
      },
      reminders: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  return c.json({
    todo: {
      ...updatedTodo,
      createdAt: updatedTodo.createdAt.toISOString(),
      updatedAt: updatedTodo.updatedAt.toISOString(),
      completedAt: updatedTodo.completedAt?.toISOString() ?? null,
      dueDate: updatedTodo.dueDate?.toISOString() ?? null,
      items: updatedTodo.items.map((item) => ({
        ...item,
        createdAt: item.createdAt.toISOString(),
        completedAt: item.completedAt?.toISOString() ?? null,
      })),
      reminders: (updatedTodo.reminders || []).map((r: any) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
      })),
    },
  });
});

// POST /api/todos/:id/complete - Toggle todo completion
todos.post(
  "/:id/complete",
  zValidator("json", completeTodoRequestSchema),
  async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const profile = await db.profile.findUnique({
      where: { userId: user.id },
    });

    if (!profile) {
      return c.json({ error: "Profile not found" }, 404);
    }

    const todoId = c.req.param("id");
    const { completed } = c.req.valid("json");

    // Verify todo belongs to user
    const existingTodo = await db.todo.findFirst({
      where: { id: todoId, profileId: profile.id },
    });

    if (!existingTodo) {
      return c.json({ error: "Todo not found" }, 404);
    }

    const updatedTodo = await db.todo.update({
      where: { id: todoId },
      data: {
        completed,
        completedAt: completed ? new Date() : null,
      },
      include: {
        items: {
          orderBy: { order: "asc" },
        },
        reminders: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    return c.json({
      todo: {
        ...updatedTodo,
        createdAt: updatedTodo.createdAt.toISOString(),
        updatedAt: updatedTodo.updatedAt.toISOString(),
        completedAt: updatedTodo.completedAt?.toISOString() ?? null,
        dueDate: updatedTodo.dueDate?.toISOString() ?? null,
        items: updatedTodo.items.map((item) => ({
          ...item,
          createdAt: item.createdAt.toISOString(),
          completedAt: item.completedAt?.toISOString() ?? null,
        })),
        reminders: (updatedTodo.reminders || []).map((r: any) => ({
          ...r,
          createdAt: r.createdAt.toISOString(),
        })),
      },
    });
  }
);

// DELETE /api/todos/:id - Delete a todo
todos.delete("/:id", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const profile = await db.profile.findUnique({
    where: { userId: user.id },
  });

  if (!profile) {
    return c.json({ error: "Profile not found" }, 404);
  }

  const todoId = c.req.param("id");

  // Verify todo belongs to user
  const existingTodo = await db.todo.findFirst({
    where: { id: todoId, profileId: profile.id },
  });

  if (!existingTodo) {
    return c.json({ error: "Todo not found" }, 404);
  }

  await db.todo.delete({
    where: { id: todoId },
  });

  return c.json({ success: true });
});

// POST /api/todos/:id/items - Add a checklist item to a todo
todos.post(
  "/:id/items",
  zValidator("json", addTodoItemRequestSchema),
  async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const profile = await db.profile.findUnique({
      where: { userId: user.id },
    });

    if (!profile) {
      return c.json({ error: "Profile not found" }, 404);
    }

    const todoId = c.req.param("id");
    const data = c.req.valid("json");

    // Verify todo belongs to user
    const existingTodo = await db.todo.findFirst({
      where: { id: todoId, profileId: profile.id },
    });

    if (!existingTodo) {
      return c.json({ error: "Todo not found" }, 404);
    }

    // Get max order for new item
    const maxOrder = await db.todoItem.findFirst({
      where: { todoId },
      orderBy: { order: "desc" },
      select: { order: true },
    });

    const newItem = await db.todoItem.create({
      data: {
        todoId,
        title: data.title,
        order: data.order ?? (maxOrder?.order ?? -1) + 1,
      },
    });

    return c.json({
      item: {
        ...newItem,
        createdAt: newItem.createdAt.toISOString(),
        completedAt: newItem.completedAt?.toISOString() ?? null,
      },
    });
  }
);

// PATCH /api/todos/:todoId/items/:itemId - Update a checklist item
todos.patch(
  "/:todoId/items/:itemId",
  zValidator("json", updateTodoItemRequestSchema),
  async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const profile = await db.profile.findUnique({
      where: { userId: user.id },
    });

    if (!profile) {
      return c.json({ error: "Profile not found" }, 404);
    }

    const todoId = c.req.param("todoId");
    const itemId = c.req.param("itemId");
    const data = c.req.valid("json");

    // Verify todo belongs to user
    const existingTodo = await db.todo.findFirst({
      where: { id: todoId, profileId: profile.id },
    });

    if (!existingTodo) {
      return c.json({ error: "Todo not found" }, 404);
    }

    // Verify item belongs to todo
    const existingItem = await db.todoItem.findFirst({
      where: { id: itemId, todoId },
    });

    if (!existingItem) {
      return c.json({ error: "Item not found" }, 404);
    }

    const updatedItem = await db.todoItem.update({
      where: { id: itemId },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.completed !== undefined && {
          completed: data.completed,
          completedAt: data.completed ? new Date() : null,
        }),
        ...(data.order !== undefined && { order: data.order }),
      },
    });

    return c.json({
      item: {
        ...updatedItem,
        createdAt: updatedItem.createdAt.toISOString(),
        completedAt: updatedItem.completedAt?.toISOString() ?? null,
      },
    });
  }
);

// DELETE /api/todos/:todoId/items/:itemId - Delete a checklist item
todos.delete("/:todoId/items/:itemId", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const profile = await db.profile.findUnique({
    where: { userId: user.id },
  });

  if (!profile) {
    return c.json({ error: "Profile not found" }, 404);
  }

  const todoId = c.req.param("todoId");
  const itemId = c.req.param("itemId");

  // Verify todo belongs to user
  const existingTodo = await db.todo.findFirst({
    where: { id: todoId, profileId: profile.id },
  });

  if (!existingTodo) {
    return c.json({ error: "Todo not found" }, 404);
  }

  // Verify item belongs to todo
  const existingItem = await db.todoItem.findFirst({
    where: { id: itemId, todoId },
  });

  if (!existingItem) {
    return c.json({ error: "Item not found" }, 404);
  }

  await db.todoItem.delete({
    where: { id: itemId },
  });

  return c.json({ success: true });
});

// POST /api/todos/:id/archive - Archive/unarchive a todo
todos.post(
  "/:id/archive",
  zValidator("json", archiveTodoRequestSchema),
  async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const profile = await db.profile.findUnique({
      where: { userId: user.id },
    });

    if (!profile) {
      return c.json({ error: "Profile not found" }, 404);
    }

    const todoId = c.req.param("id");
    const { archived } = c.req.valid("json");

    const existingTodo = await db.todo.findFirst({
      where: { id: todoId, profileId: profile.id },
    });

    if (!existingTodo) {
      return c.json({ error: "Todo not found" }, 404);
    }

    const updatedTodo = await db.todo.update({
      where: { id: todoId },
      data: {
        archived,
        archivedAt: archived ? new Date() : null,
      },
      include: {
        items: {
          orderBy: { order: "asc" },
        },
        reminders: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    return c.json({
      todo: {
        ...updatedTodo,
        createdAt: updatedTodo.createdAt.toISOString(),
        updatedAt: updatedTodo.updatedAt.toISOString(),
        completedAt: updatedTodo.completedAt?.toISOString() ?? null,
        archivedAt: updatedTodo.archivedAt?.toISOString() ?? null,
        dueDate: updatedTodo.dueDate?.toISOString() ?? null,
        items: updatedTodo.items.map((item) => ({
          ...item,
          createdAt: item.createdAt.toISOString(),
          completedAt: item.completedAt?.toISOString() ?? null,
        })),
        reminders: (updatedTodo.reminders || []).map((r: any) => ({
          ...r,
          createdAt: r.createdAt.toISOString(),
        })),
      },
    });
  }
);

// POST /api/todos/:id/repeat - Create a new todo from existing one
todos.post(
  "/:id/repeat",
  zValidator("json", repeatTodoRequestSchema),
  async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const profile = await db.profile.findUnique({
      where: { userId: user.id },
    });

    if (!profile) {
      return c.json({ error: "Profile not found" }, 404);
    }

    const todoId = c.req.param("id");
    const { resetItems } = c.req.valid("json");

    const existingTodo = await db.todo.findFirst({
      where: { id: todoId, profileId: profile.id },
      include: { items: true },
    });

    if (!existingTodo) {
      return c.json({ error: "Todo not found" }, 404);
    }

    // Get max order for new todo
    const maxOrder = await db.todo.findFirst({
      where: { profileId: profile.id },
      orderBy: { order: "desc" },
      select: { order: true },
    });

    const newTodo = await db.todo.create({
      data: {
        profileId: profile.id,
        title: existingTodo.title,
        description: existingTodo.description,
        priority: existingTodo.priority,
        dueDate: existingTodo.dueDate,
        linkedHabitId: existingTodo.linkedHabitId,
        order: (maxOrder?.order ?? -1) + 1,
        items: {
          create: existingTodo.items.map((item) => ({
            title: item.title,
            order: item.order,
            completed: resetItems ? false : item.completed,
            completedAt: resetItems ? null : item.completedAt,
          })),
        },
      },
      include: {
        items: {
          orderBy: { order: "asc" },
        },
        reminders: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    return c.json({
      todo: {
        ...newTodo,
        createdAt: newTodo.createdAt.toISOString(),
        updatedAt: newTodo.updatedAt.toISOString(),
        completedAt: newTodo.completedAt?.toISOString() ?? null,
        archivedAt: newTodo.archivedAt?.toISOString() ?? null,
        dueDate: newTodo.dueDate?.toISOString() ?? null,
        items: newTodo.items.map((item) => ({
          ...item,
          createdAt: item.createdAt.toISOString(),
          completedAt: item.completedAt?.toISOString() ?? null,
        })),
        reminders: (newTodo.reminders || []).map((r: any) => ({
          ...r,
          createdAt: r.createdAt.toISOString(),
        })),
      },
    });
  }
);

// POST /api/todos/:id/save-template - Save todo as template
todos.post(
  "/:id/save-template",
  zValidator("json", saveAsTemplateRequestSchema),
  async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const profile = await db.profile.findUnique({
      where: { userId: user.id },
    });

    if (!profile) {
      return c.json({ error: "Profile not found" }, 404);
    }

    const todoId = c.req.param("id");
    const { category } = c.req.valid("json");

    const existingTodo = await db.todo.findFirst({
      where: { id: todoId, profileId: profile.id },
      include: { items: true },
    });

    if (!existingTodo) {
      return c.json({ error: "Todo not found" }, 404);
    }

    const template = await db.todoTemplate.create({
      data: {
        profileId: profile.id,
        title: existingTodo.title,
        description: existingTodo.description,
        priority: existingTodo.priority,
        category,
        isSystem: false,
        items: {
          create: existingTodo.items.map((item) => ({
            title: item.title,
            order: item.order,
          })),
        },
      },
      include: {
        items: {
          orderBy: { order: "asc" },
        },
      },
    });

    return c.json({
      template: {
        ...template,
        createdAt: template.createdAt.toISOString(),
        updatedAt: template.updatedAt.toISOString(),
        items: template.items.map((item) => ({
          ...item,
          createdAt: item.createdAt.toISOString(),
        })),
      },
    });
  }
);

// POST /api/todos/:id/reminders - Add a reminder to a todo
todos.post(
  "/:id/reminders",
  zValidator("json", addTodoReminderRequestSchema),
  async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const profile = await db.profile.findUnique({
      where: { userId: user.id },
    });

    if (!profile) {
      return c.json({ error: "Profile not found" }, 404);
    }

    const todoId = c.req.param("id");
    const data = c.req.valid("json");

    // Verify todo belongs to user
    const existingTodo = await db.todo.findFirst({
      where: { id: todoId, profileId: profile.id },
    });

    if (!existingTodo) {
      return c.json({ error: "Todo not found" }, 404);
    }

    const reminder = await db.todoReminder.create({
      data: {
        todoId,
        reminderTime: data.reminderTime,
        recurringType: data.recurringType,
        recurringDays: data.recurringDays ? JSON.stringify(data.recurringDays) : null,
        enabled: data.enabled,
      },
    });

    return c.json({
      reminder: {
        ...reminder,
        createdAt: reminder.createdAt.toISOString(),
      },
    });
  }
);

// DELETE /api/todos/:todoId/reminders/:reminderId - Delete a reminder
todos.delete("/:todoId/reminders/:reminderId", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const profile = await db.profile.findUnique({
    where: { userId: user.id },
  });

  if (!profile) {
    return c.json({ error: "Profile not found" }, 404);
  }

  const todoId = c.req.param("todoId");
  const reminderId = c.req.param("reminderId");

  // Verify todo belongs to user
  const existingTodo = await db.todo.findFirst({
    where: { id: todoId, profileId: profile.id },
  });

  if (!existingTodo) {
    return c.json({ error: "Todo not found" }, 404);
  }

  // Verify reminder belongs to todo
  const existingReminder = await db.todoReminder.findFirst({
    where: { id: reminderId, todoId },
  });

  if (!existingReminder) {
    return c.json({ error: "Reminder not found" }, 404);
  }

  await db.todoReminder.delete({
    where: { id: reminderId },
  });

  return c.json({ success: true });
});

// GET /api/todos/:id/reminders - List reminders for a todo
todos.get("/:id/reminders", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const profile = await db.profile.findUnique({
    where: { userId: user.id },
  });

  if (!profile) {
    return c.json({ error: "Profile not found" }, 404);
  }

  const todoId = c.req.param("id");

  // Verify todo belongs to user
  const existingTodo = await db.todo.findFirst({
    where: { id: todoId, profileId: profile.id },
  });

  if (!existingTodo) {
    return c.json({ error: "Todo not found" }, 404);
  }

  const todoReminders = await db.todoReminder.findMany({
    where: { todoId },
    orderBy: { createdAt: "asc" },
  });

  return c.json({
    reminders: todoReminders.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
    })),
  });
});

export default todos;
