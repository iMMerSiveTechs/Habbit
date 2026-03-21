import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import type { AppType } from "../index";
import { db } from "../db";
import {
  getMarketplaceTemplatesResponseSchema,
  purchaseTemplateRequestSchema,
  purchaseTemplateResponseSchema,
  importTemplateRequestSchema,
  importTemplateResponseSchema,
  getMyPurchasesResponseSchema,
  type HabitTemplate,
  type TemplatePurchase,
} from "../../../shared/contracts";

const marketplace = new Hono<AppType>();

// GET /api/templates/marketplace - Get all available templates
marketplace.get("/", async (c) => {
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

  // Get all active templates with their habits
  const templates = await db.habitTemplate.findMany({
    where: { isActive: true },
    include: {
      habits: {
        orderBy: { order: "asc" },
      },
    },
    orderBy: [
      { isPremium: "asc" }, // Free templates first
      { usageCount: "desc" }, // Most popular first
    ],
  });

  // Get user's purchases to mark which templates are purchased/imported
  const purchases = await db.templatePurchase.findMany({
    where: { profileId: profile.id },
  });

  const purchaseMap = new Map(
    purchases.map((p) => [p.templateId, p])
  );

  // Format response with purchase status
  const formattedTemplates: HabitTemplate[] = templates.map((template) => {
    const purchase = purchaseMap.get(template.id);
    return {
      id: template.id,
      title: template.title,
      description: template.description,
      category: template.category as any,
      price: template.price,
      imageUrl: template.imageUrl,
      isPremium: template.isPremium,
      isActive: template.isActive,
      usageCount: template.usageCount,
      createdAt: template.createdAt.toISOString(),
      updatedAt: template.updatedAt.toISOString(),
      habits: template.habits.map((h) => ({
        id: h.id,
        templateId: h.templateId,
        title: h.title,
        description: h.description,
        icon: h.icon,
        color: h.color,
        category: h.category as any,
        frequency: h.frequency,
        targetCount: h.targetCount,
        order: h.order,
        timeOfDay: h.timeOfDay as any,
        createdAt: h.createdAt.toISOString(),
      })),
      isPurchased: !!purchase,
      isImported: purchase?.imported || false,
    };
  });

  return c.json({ templates: formattedTemplates });
});

// POST /api/templates/marketplace/:id/purchase - Purchase a template
marketplace.post(
  "/:id/purchase",
  zValidator("json", purchaseTemplateRequestSchema),
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

    // Check if template exists
    const template = await db.habitTemplate.findUnique({
      where: { id: templateId },
      include: {
        habits: {
          orderBy: { order: "asc" },
        },
      },
    });

    if (!template || !template.isActive) {
      return c.json({ error: "Template not found" }, 404);
    }

    // Check if already purchased
    const existingPurchase = await db.templatePurchase.findUnique({
      where: {
        profileId_templateId: {
          profileId: profile.id,
          templateId: template.id,
        },
      },
    });

    if (existingPurchase) {
      return c.json({ error: "Template already purchased" }, 400);
    }

    // Create purchase (mock payment for now)
    const purchase = await db.templatePurchase.create({
      data: {
        profileId: profile.id,
        templateId: template.id,
        price: template.price,
      },
    });

    // Increment usage count
    await db.habitTemplate.update({
      where: { id: template.id },
      data: {
        usageCount: { increment: 1 },
      },
    });

    const formattedTemplate: HabitTemplate = {
      id: template.id,
      title: template.title,
      description: template.description,
      category: template.category as any,
      price: template.price,
      imageUrl: template.imageUrl,
      isPremium: template.isPremium,
      isActive: template.isActive,
      usageCount: template.usageCount + 1,
      createdAt: template.createdAt.toISOString(),
      updatedAt: template.updatedAt.toISOString(),
      habits: template.habits.map((h) => ({
        id: h.id,
        templateId: h.templateId,
        title: h.title,
        description: h.description,
        icon: h.icon,
        color: h.color,
        category: h.category as any,
        frequency: h.frequency,
        targetCount: h.targetCount,
        order: h.order,
        timeOfDay: h.timeOfDay as any,
        createdAt: h.createdAt.toISOString(),
      })),
      isPurchased: true,
      isImported: false,
    };

    const formattedPurchase: TemplatePurchase = {
      id: purchase.id,
      profileId: purchase.profileId,
      templateId: purchase.templateId,
      price: purchase.price,
      purchasedAt: purchase.purchasedAt.toISOString(),
      imported: purchase.imported,
      importedAt: purchase.importedAt?.toISOString() || null,
    };

    return c.json({
      success: true,
      purchase: formattedPurchase,
      template: formattedTemplate,
    });
  }
);

// POST /api/templates/marketplace/:id/import - Import purchased template into user's habits
marketplace.post(
  "/:id/import",
  zValidator("json", importTemplateRequestSchema),
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
    const body = c.req.valid("json");

    // Check if user purchased this template
    const purchase = await db.templatePurchase.findUnique({
      where: {
        profileId_templateId: {
          profileId: profile.id,
          templateId: templateId,
        },
      },
    });

    if (!purchase) {
      return c.json({ error: "Template not purchased" }, 403);
    }

    // Get template with habits
    const template = await db.habitTemplate.findUnique({
      where: { id: templateId },
      include: {
        habits: {
          orderBy: { order: "asc" },
        },
      },
    });

    if (!template) {
      return c.json({ error: "Template not found" }, 404);
    }

    // Get user's current max habit order
    const maxOrderHabit = await db.habit.findFirst({
      where: { profileId: profile.id },
      orderBy: { order: "desc" },
    });

    const startOrder = (maxOrderHabit?.order || 0) + 1;

    // Create customization map
    const customizationMap = new Map(
      (body.customizations || []).map((c) => [c.habitIndex, c])
    );

    // Create habits from template
    const createdHabits = await Promise.all(
      template.habits.map(async (templateHabit, index) => {
        const customization = customizationMap.get(index);

        return db.habit.create({
          data: {
            profileId: profile.id,
            title: customization?.title || templateHabit.title,
            description: templateHabit.description,
            icon: customization?.icon || templateHabit.icon,
            color: customization?.color || templateHabit.color,
            category: templateHabit.category,
            frequency: templateHabit.frequency,
            targetCount: templateHabit.targetCount,
            order: startOrder + index,
          },
          include: {
            reminders: true,
          },
        });
      })
    );

    // Mark purchase as imported
    await db.templatePurchase.update({
      where: { id: purchase.id },
      data: {
        imported: true,
        importedAt: new Date(),
      },
    });

    // Format habits for response
    const formattedHabits = createdHabits.map((habit) => ({
      id: habit.id,
      title: habit.title,
      description: habit.description,
      icon: habit.icon,
      color: habit.color,
      category: habit.category as any,
      frequency: habit.frequency,
      targetCount: habit.targetCount,
      order: habit.order,
      archived: habit.archived,
      recurringType: habit.recurringType,
      recurringInterval: habit.recurringInterval,
      recurringDays: habit.recurringDays,
      reminderTime: habit.reminderTime,
      reminderEnabled: habit.reminderEnabled,
      createdAt: habit.createdAt.toISOString(),
      updatedAt: habit.updatedAt.toISOString(),
      reminders: habit.reminders.map((r) => ({
        id: r.id,
        habitId: r.habitId,
        reminderTime: r.reminderTime,
        recurringType: r.recurringType as any,
        recurringInterval: r.recurringInterval,
        recurringDays: r.recurringDays,
        enabled: r.enabled,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      })),
    }));

    return c.json({
      success: true,
      habitsCreated: formattedHabits,
    });
  }
);

// GET /api/templates/marketplace/purchases - Get user's purchased templates
marketplace.get("/purchases", async (c) => {
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

  const purchases = await db.templatePurchase.findMany({
    where: { profileId: profile.id },
    include: {
      template: {
        include: {
          habits: {
            orderBy: { order: "asc" },
          },
        },
      },
    },
    orderBy: { purchasedAt: "desc" },
  });

  const formattedPurchases = purchases.map((p) => ({
    purchase: {
      id: p.id,
      profileId: p.profileId,
      templateId: p.templateId,
      price: p.price,
      purchasedAt: p.purchasedAt.toISOString(),
      imported: p.imported,
      importedAt: p.importedAt?.toISOString() || null,
    },
    template: {
      id: p.template.id,
      title: p.template.title,
      description: p.template.description,
      category: p.template.category as any,
      price: p.template.price,
      imageUrl: p.template.imageUrl,
      isPremium: p.template.isPremium,
      isActive: p.template.isActive,
      usageCount: p.template.usageCount,
      createdAt: p.template.createdAt.toISOString(),
      updatedAt: p.template.updatedAt.toISOString(),
      habits: p.template.habits.map((h) => ({
        id: h.id,
        templateId: h.templateId,
        title: h.title,
        description: h.description,
        icon: h.icon,
        color: h.color,
        category: h.category as any,
        frequency: h.frequency,
        targetCount: h.targetCount,
        order: h.order,
        timeOfDay: h.timeOfDay as any,
        createdAt: h.createdAt.toISOString(),
      })),
      isPurchased: true,
      isImported: p.imported,
    },
  }));

  return c.json({ purchases: formattedPurchases });
});

export default marketplace;
