import { db } from "../src/db";

const systemTemplates = [
  {
    title: "Morning Routine",
    description: "A structured morning routine to start your day right",
    priority: "high" as const,
    category: "wellness",
    items: [
      { title: "Wake up and stretch", order: 0 },
      { title: "Drink a glass of water", order: 1 },
      { title: "Morning meditation (5-10 min)", order: 2 },
      { title: "Healthy breakfast", order: 3 },
      { title: "Review daily goals", order: 4 },
    ],
  },
  {
    title: "Weekly Meal Prep",
    description: "Prepare healthy meals for the week ahead",
    priority: "medium" as const,
    category: "health",
    items: [
      { title: "Plan meals for the week", order: 0 },
      { title: "Create grocery shopping list", order: 1 },
      { title: "Go grocery shopping", order: 2 },
      { title: "Prep vegetables and proteins", order: 3 },
      { title: "Cook and portion meals", order: 4 },
      { title: "Store in containers", order: 5 },
    ],
  },
  {
    title: "Deep Work Session",
    description: "Focused work session for maximum productivity",
    priority: "high" as const,
    category: "work",
    items: [
      { title: "Clear workspace and close distractions", order: 0 },
      { title: "Set 90-minute timer", order: 1 },
      { title: "Work on single most important task", order: 2 },
      { title: "Take 15-minute break", order: 3 },
      { title: "Review progress and next steps", order: 4 },
    ],
  },
  {
    title: "Home Cleaning",
    description: "Weekly home maintenance and cleaning",
    priority: "medium" as const,
    category: "personal",
    items: [
      { title: "Vacuum all rooms", order: 0 },
      { title: "Clean kitchen and bathroom", order: 1 },
      { title: "Do laundry", order: 2 },
      { title: "Take out trash and recycling", order: 3 },
      { title: "Tidy living spaces", order: 4 },
    ],
  },
  {
    title: "Monthly Budget Review",
    description: "Review and plan your monthly finances",
    priority: "high" as const,
    category: "finance",
    items: [
      { title: "Review last month's expenses", order: 0 },
      { title: "Update budget categories", order: 1 },
      { title: "Set savings goals for this month", order: 2 },
      { title: "Pay bills and subscriptions", order: 3 },
      { title: "Check investment accounts", order: 4 },
    ],
  },
  {
    title: "Evening Wind Down",
    description: "Relaxing evening routine for better sleep",
    priority: "medium" as const,
    category: "wellness",
    items: [
      { title: "Prepare tomorrow's outfit", order: 0 },
      { title: "Light dinner (2-3 hours before bed)", order: 1 },
      { title: "No screens 1 hour before bed", order: 2 },
      { title: "Evening journaling or reading", order: 3 },
      { title: "Relaxing activity (bath, stretching)", order: 4 },
      { title: "Set alarm for tomorrow", order: 5 },
    ],
  },
  {
    title: "Gym Workout",
    description: "Complete gym workout routine",
    priority: "medium" as const,
    category: "health",
    items: [
      { title: "5-10 min warm-up cardio", order: 0 },
      { title: "Dynamic stretching", order: 1 },
      { title: "Strength training routine", order: 2 },
      { title: "Core exercises", order: 3 },
      { title: "Cool down and stretch", order: 4 },
      { title: "Log workout in app", order: 5 },
    ],
  },
  {
    title: "Weekly Planning",
    description: "Plan and organize your upcoming week",
    priority: "high" as const,
    category: "work",
    items: [
      { title: "Review last week's accomplishments", order: 0 },
      { title: "Set top 3 priorities for the week", order: 1 },
      { title: "Schedule important meetings", order: 2 },
      { title: "Block time for deep work", order: 3 },
      { title: "Plan personal activities", order: 4 },
    ],
  },
  {
    title: "Car Maintenance",
    description: "Monthly vehicle check and maintenance",
    priority: "low" as const,
    category: "personal",
    items: [
      { title: "Check tire pressure", order: 0 },
      { title: "Check oil level", order: 1 },
      { title: "Wash exterior", order: 2 },
      { title: "Vacuum interior", order: 3 },
      { title: "Check for any dashboard alerts", order: 4 },
    ],
  },
  {
    title: "Social Media Audit",
    description: "Clean up and optimize your social media presence",
    priority: "low" as const,
    category: "personal",
    items: [
      { title: "Review follower list", order: 0 },
      { title: "Unfollow inactive accounts", order: 1 },
      { title: "Update profile information", order: 2 },
      { title: "Delete old posts if needed", order: 3 },
      { title: "Adjust privacy settings", order: 4 },
    ],
  },
];

async function seedTemplates() {
  console.log("🌱 Seeding system templates...");

  // Check if templates already exist
  const existingCount = await db.todoTemplate.count({
    where: { isSystem: true },
  });

  if (existingCount > 0) {
    console.log(`⚠️  Found ${existingCount} existing system templates. Skipping seed.`);
    console.log("   To re-seed, delete existing templates first.");
    return;
  }

  let created = 0;
  for (const template of systemTemplates) {
    try {
      await db.todoTemplate.create({
        data: {
          title: template.title,
          description: template.description,
          priority: template.priority,
          category: template.category,
          isSystem: true,
          profileId: null,
          items: {
            create: template.items,
          },
        },
      });
      created++;
      console.log(`✅ Created template: ${template.title}`);
    } catch (error) {
      console.error(`❌ Failed to create template: ${template.title}`, error);
    }
  }

  console.log(`\n🎉 Successfully seeded ${created} system templates!`);
}

seedTemplates()
  .catch((error) => {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
