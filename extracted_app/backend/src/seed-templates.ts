import { db } from "./db";

/**
 * Seed script to populate the database with habit templates
 * Run with: bun run src/seed-templates.ts
 */

const templates = [
  // MORNING ROUTINES
  {
    title: "Essential Morning Routine",
    description: "Start your day right with these fundamental morning habits",
    category: "morning",
    price: 0.99,
    isPremium: false,
    habits: [
      { title: "Make your bed", icon: "Bed", color: "#00D4FF", category: "general", order: 0, timeOfDay: "morning" },
      { title: "Drink water", icon: "Droplets", color: "#4FC3F7", category: "health", order: 1, timeOfDay: "morning" },
      { title: "Stretch for 5 min", icon: "Waves", color: "#9C27B0", category: "fitness", order: 2, timeOfDay: "morning" },
      { title: "Healthy breakfast", icon: "Coffee", color: "#FF9800", category: "health", order: 3, timeOfDay: "morning" },
    ],
  },
  {
    title: "Mindful Morning",
    description: "Cultivate calm and focus before your day begins",
    category: "morning",
    price: 0.99,
    isPremium: false,
    habits: [
      { title: "5 min meditation", icon: "Brain", color: "#9C27B0", category: "mindfulness", order: 0, timeOfDay: "morning" },
      { title: "Gratitude journal", icon: "BookHeart", color: "#E91E63", category: "mindfulness", order: 1, timeOfDay: "morning" },
      { title: "Set daily intention", icon: "Target", color: "#00D4FF", category: "mindfulness", order: 2, timeOfDay: "morning" },
      { title: "Read 10 pages", icon: "BookOpen", color: "#4CAF50", category: "growth", order: 3, timeOfDay: "morning" },
    ],
  },
  {
    title: "Energized Morning",
    description: "Boost energy and prepare your body for the day",
    category: "morning",
    price: 0.99,
    isPremium: false,
    habits: [
      { title: "Cold shower", icon: "Droplets", color: "#03A9F4", category: "wellness", order: 0, timeOfDay: "morning" },
      { title: "20 min workout", icon: "Dumbbell", color: "#FF5722", category: "fitness", order: 1, timeOfDay: "morning" },
      { title: "Protein smoothie", icon: "Salad", color: "#4CAF50", category: "health", order: 2, timeOfDay: "morning" },
      { title: "Plan top 3 tasks", icon: "ListChecks", color: "#FFC107", category: "work", order: 3, timeOfDay: "morning" },
    ],
  },

  // EVENING ROUTINES
  {
    title: "Wind Down Routine",
    description: "Prepare your mind and body for restful sleep",
    category: "evening",
    price: 0.99,
    isPremium: false,
    habits: [
      { title: "Screens off by 9pm", icon: "PhoneOff", color: "#673AB7", category: "wellness", order: 0, timeOfDay: "evening" },
      { title: "Evening skincare", icon: "Sparkles", color: "#E91E63", category: "wellness", order: 1, timeOfDay: "evening" },
      { title: "Journal reflections", icon: "BookOpen", color: "#00BCD4", category: "mindfulness", order: 2, timeOfDay: "evening" },
      { title: "Read before bed", icon: "Book", color: "#4CAF50", category: "growth", order: 3, timeOfDay: "evening" },
    ],
  },
  {
    title: "Evening Reset",
    description: "Reflect, reset, and prepare for tomorrow",
    category: "evening",
    price: 0.99,
    isPremium: false,
    habits: [
      { title: "Review today's wins", icon: "Trophy", color: "#FFC107", category: "mindfulness", order: 0, timeOfDay: "evening" },
      { title: "Plan tomorrow", icon: "Calendar", color: "#00D4FF", category: "work", order: 1, timeOfDay: "evening" },
      { title: "Tidy workspace", icon: "Sparkles", color: "#9C27B0", category: "general", order: 2, timeOfDay: "evening" },
      { title: "Set out clothes", icon: "Shirt", color: "#FF5722", category: "general", order: 3, timeOfDay: "evening" },
    ],
  },

  // FITNESS & WELLNESS
  {
    title: "Fitness Fundamentals",
    description: "Build a consistent fitness routine",
    category: "fitness",
    price: 0.99,
    isPremium: false,
    habits: [
      { title: "10k steps daily", icon: "Footprints", color: "#4CAF50", category: "fitness", order: 0, timeOfDay: "anytime" },
      { title: "Strength training", icon: "Dumbbell", color: "#FF5722", category: "fitness", order: 1, timeOfDay: "anytime" },
      { title: "Stretch routine", icon: "Waves", color: "#9C27B0", category: "fitness", order: 2, timeOfDay: "anytime" },
      { title: "Track protein intake", icon: "Salad", color: "#4CAF50", category: "health", order: 3, timeOfDay: "anytime" },
    ],
  },
  {
    title: "Hydration & Nutrition",
    description: "Fuel your body properly throughout the day",
    category: "wellness",
    price: 0.99,
    isPremium: false,
    habits: [
      { title: "Drink 8 glasses water", icon: "Droplets", color: "#03A9F4", category: "health", order: 0, timeOfDay: "anytime" },
      { title: "Take vitamins", icon: "Pill", color: "#FF9800", category: "health", order: 1, timeOfDay: "morning" },
      { title: "Eat vegetables", icon: "Salad", color: "#4CAF50", category: "health", order: 2, timeOfDay: "anytime" },
      { title: "Healthy snacks", icon: "Apple", color: "#E91E63", category: "health", order: 3, timeOfDay: "anytime" },
    ],
  },

  // MENTAL HEALTH
  {
    title: "Mental Wellness Pack",
    description: "Daily practices for mental health and clarity",
    category: "mental_health",
    price: 0.99,
    isPremium: false,
    habits: [
      { title: "10 min meditation", icon: "Brain", color: "#9C27B0", category: "mindfulness", order: 0, timeOfDay: "anytime" },
      { title: "Breathing exercises", icon: "Wind", color: "#00BCD4", category: "mindfulness", order: 1, timeOfDay: "anytime" },
      { title: "Gratitude list", icon: "Heart", color: "#E91E63", category: "mindfulness", order: 2, timeOfDay: "anytime" },
      { title: "Social connection", icon: "Users", color: "#FF9800", category: "social", order: 3, timeOfDay: "anytime" },
    ],
  },
  {
    title: "Mindfulness Practice",
    description: "Deepen your mindfulness and presence",
    category: "mental_health",
    price: 0.99,
    isPremium: false,
    habits: [
      { title: "Morning meditation", icon: "Sunrise", color: "#FF9800", category: "mindfulness", order: 0, timeOfDay: "morning" },
      { title: "Mindful eating", icon: "UtensilsCrossed", color: "#4CAF50", category: "mindfulness", order: 1, timeOfDay: "anytime" },
      { title: "Walking meditation", icon: "Footprints", color: "#00BCD4", category: "mindfulness", order: 2, timeOfDay: "anytime" },
      { title: "Evening reflection", icon: "Moon", color: "#673AB7", category: "mindfulness", order: 3, timeOfDay: "evening" },
    ],
  },

  // PRODUCTIVITY
  {
    title: "Productivity System",
    description: "Get more done with focused work habits",
    category: "productivity",
    price: 0.99,
    isPremium: false,
    habits: [
      { title: "Plan your day", icon: "ListChecks", color: "#00D4FF", category: "work", order: 0, timeOfDay: "morning" },
      { title: "Deep work block", icon: "Brain", color: "#9C27B0", category: "work", order: 1, timeOfDay: "anytime" },
      { title: "Review progress", icon: "TrendingUp", color: "#4CAF50", category: "work", order: 2, timeOfDay: "evening" },
      { title: "Clear inbox", icon: "Mail", color: "#FF9800", category: "work", order: 3, timeOfDay: "anytime" },
    ],
  },

  // FULL DAY - PREMIUM
  {
    title: "Complete Daily System",
    description: "Full morning, afternoon, and evening routine for optimal living",
    category: "full_day",
    price: 1.99,
    isPremium: true,
    habits: [
      // Morning
      { title: "Wake up at 6am", icon: "Sun", color: "#FF9800", category: "general", order: 0, timeOfDay: "morning" },
      { title: "Make bed", icon: "Bed", color: "#00D4FF", category: "general", order: 1, timeOfDay: "morning" },
      { title: "Drink water", icon: "Droplets", color: "#03A9F4", category: "health", order: 2, timeOfDay: "morning" },
      { title: "Morning workout", icon: "Dumbbell", color: "#FF5722", category: "fitness", order: 3, timeOfDay: "morning" },
      { title: "Cold shower", icon: "Droplets", color: "#00BCD4", category: "wellness", order: 4, timeOfDay: "morning" },
      { title: "Meditation", icon: "Brain", color: "#9C27B0", category: "mindfulness", order: 5, timeOfDay: "morning" },
      { title: "Healthy breakfast", icon: "Coffee", color: "#FF9800", category: "health", order: 6, timeOfDay: "morning" },
      { title: "Review goals", icon: "Target", color: "#4CAF50", category: "work", order: 7, timeOfDay: "morning" },
      // Afternoon
      { title: "10k steps", icon: "Footprints", color: "#4CAF50", category: "fitness", order: 8, timeOfDay: "afternoon" },
      { title: "Healthy lunch", icon: "Salad", color: "#4CAF50", category: "health", order: 9, timeOfDay: "afternoon" },
      { title: "Deep work session", icon: "Brain", color: "#673AB7", category: "work", order: 10, timeOfDay: "afternoon" },
      // Evening
      { title: "Screens off 9pm", icon: "PhoneOff", color: "#673AB7", category: "wellness", order: 11, timeOfDay: "evening" },
      { title: "Evening journal", icon: "BookOpen", color: "#00BCD4", category: "mindfulness", order: 12, timeOfDay: "evening" },
      { title: "Read 20 pages", icon: "Book", color: "#4CAF50", category: "growth", order: 13, timeOfDay: "evening" },
      { title: "Plan tomorrow", icon: "Calendar", color: "#00D4FF", category: "work", order: 14, timeOfDay: "evening" },
      { title: "Sleep by 10pm", icon: "Moon", color: "#673AB7", category: "wellness", order: 15, timeOfDay: "evening" },
    ],
  },
  {
    title: "High Performer's Day",
    description: "Elite daily routine for maximum productivity and wellness",
    category: "full_day",
    price: 1.99,
    isPremium: true,
    habits: [
      // Morning
      { title: "5am wake up", icon: "Sun", color: "#FF5722", category: "general", order: 0, timeOfDay: "morning" },
      { title: "Lemon water", icon: "Droplets", color: "#FFC107", category: "health", order: 1, timeOfDay: "morning" },
      { title: "Journal gratitude", icon: "BookHeart", color: "#E91E63", category: "mindfulness", order: 2, timeOfDay: "morning" },
      { title: "45 min workout", icon: "Dumbbell", color: "#FF5722", category: "fitness", order: 3, timeOfDay: "morning" },
      { title: "Protein breakfast", icon: "Egg", color: "#FF9800", category: "health", order: 4, timeOfDay: "morning" },
      { title: "Review vision board", icon: "Eye", color: "#9C27B0", category: "mindfulness", order: 5, timeOfDay: "morning" },
      { title: "Top 3 priorities", icon: "ListChecks", color: "#00D4FF", category: "work", order: 6, timeOfDay: "morning" },
      // Afternoon
      { title: "Power hour work", icon: "Zap", color: "#FF5722", category: "work", order: 7, timeOfDay: "afternoon" },
      { title: "Healthy lunch", icon: "Salad", color: "#4CAF50", category: "health", order: 8, timeOfDay: "afternoon" },
      { title: "15 min power nap", icon: "Bed", color: "#673AB7", category: "wellness", order: 9, timeOfDay: "afternoon" },
      { title: "Learn something new", icon: "BookOpen", color: "#00BCD4", category: "growth", order: 10, timeOfDay: "afternoon" },
      // Evening
      { title: "Evening workout", icon: "Dumbbell", color: "#FF5722", category: "fitness", order: 11, timeOfDay: "evening" },
      { title: "Family time", icon: "Users", color: "#E91E63", category: "social", order: 12, timeOfDay: "evening" },
      { title: "Review wins", icon: "Trophy", color: "#FFC107", category: "mindfulness", order: 13, timeOfDay: "evening" },
      { title: "Read 30 min", icon: "Book", color: "#4CAF50", category: "growth", order: 14, timeOfDay: "evening" },
      { title: "Sleep routine", icon: "Moon", color: "#673AB7", category: "wellness", order: 15, timeOfDay: "evening" },
    ],
  },
];

async function seedTemplates() {
  console.log("🌱 Starting template seed...");

  try {
    for (const template of templates) {
      console.log(`  📦 Creating template: ${template.title}`);

      const { habits, ...templateData } = template;

      const createdTemplate = await db.habitTemplate.create({
        data: {
          ...templateData,
          habits: {
            create: habits.map((habit) => ({
              title: habit.title,
              icon: habit.icon,
              color: habit.color,
              category: habit.category,
              frequency: "daily",
              targetCount: 1,
              order: habit.order,
              timeOfDay: habit.timeOfDay,
            })),
          },
        },
        include: {
          habits: true,
        },
      });

      console.log(`    ✅ Created with ${createdTemplate.habits.length} habits`);
    }

    console.log("\n✨ Template seed completed successfully!");
    console.log(`📊 Total templates created: ${templates.length}`);

    // Show summary
    const summary = templates.reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log("\n📈 Summary by category:");
    Object.entries(summary).forEach(([category, count]) => {
      console.log(`  ${category}: ${count} template(s)`);
    });
  } catch (error) {
    console.error("❌ Error seeding templates:", error);
    throw error;
  }
}

// Run the seed
seedTemplates()
  .then(() => {
    console.log("\n🎉 Seed complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Seed failed:", error);
    process.exit(1);
  });
