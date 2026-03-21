import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import type { AppType } from "../index";
import { db } from "../db";
import { useTemplateRequestSchema } from "../../../shared/contracts";

const templates = new Hono<AppType>();

// GET /api/templates - Get all templates (system + user's own)
templates.get("/", async (c) => {
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

  // Get both system templates and user's own templates
  const allTemplates = await db.todoTemplate.findMany({
    where: {
      OR: [
        { isSystem: true },
        { profileId: profile.id },
      ],
    },
    include: {
      items: {
        orderBy: { order: "asc" },
      },
    },
    orderBy: [
      { isSystem: "desc" }, // System templates first
      { usageCount: "desc" }, // Then by popularity
      { createdAt: "desc" },
    ],
  });

  return c.json({
    templates: allTemplates.map((template) => ({
      ...template,
      createdAt: template.createdAt.toISOString(),
      updatedAt: template.updatedAt.toISOString(),
      items: template.items.map((item) => ({
        ...item,
        createdAt: item.createdAt.toISOString(),
      })),
    })),
  });
});

// POST /api/templates/:id/use - Create a todo from template
templates.post(
  "/:id/use",
  zValidator("json", useTemplateRequestSchema),
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

    const templateId = c.req.param("id");
    const { dueDate } = c.req.valid("json");

    // Get template (must be system template or user's own template)
    const template = await db.todoTemplate.findFirst({
      where: {
        id: templateId,
        OR: [
          { isSystem: true },
          { profileId: profile.id },
        ],
      },
      include: { items: true },
    });

    if (!template) {
      return c.json({ error: "Template not found" }, 404);
    }

    // Increment usage count
    await db.todoTemplate.update({
      where: { id: templateId },
      data: { usageCount: { increment: 1 } },
    });

    // Get max order for new todo
    const maxOrder = await db.todo.findFirst({
      where: { profileId: profile.id },
      orderBy: { order: "desc" },
      select: { order: true },
    });

    // Create new todo from template
    const newTodo = await db.todo.create({
      data: {
        profileId: profile.id,
        title: template.title,
        description: template.description,
        priority: template.priority,
        dueDate: dueDate ? new Date(dueDate) : null,
        order: (maxOrder?.order ?? -1) + 1,
        items: {
          create: template.items.map((item) => ({
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
      },
    });
  }
);

// DELETE /api/templates/:id - Delete user's own template
templates.delete("/:id", async (c) => {
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

  const templateId = c.req.param("id");

  // Verify template belongs to user and is not a system template
  const template = await db.todoTemplate.findFirst({
    where: {
      id: templateId,
      profileId: profile.id,
      isSystem: false,
    },
  });

  if (!template) {
    return c.json({ error: "Template not found or cannot be deleted" }, 404);
  }

  await db.todoTemplate.delete({
    where: { id: templateId },
  });

  return c.json({ success: true });
});

export default templates;
