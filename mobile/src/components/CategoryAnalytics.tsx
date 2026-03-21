import { View, Text, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { GlassCard } from "@/components/GlassCard";
import { HabitCategory } from "@/shared/contracts";
import { HabitWithStats } from "@/state/habitsStore";
import { TrendingUp, TrendingDown, Minus } from "lucide-react-native";

interface CategoryAnalyticsProps {
  habits: HabitWithStats[];
}

const CATEGORIES: { value: HabitCategory; label: string; emoji: string; color: string }[] = [
  { value: "health", label: "Health", emoji: "💪", color: "#10B981" },
  { value: "mind", label: "Mind", emoji: "🧠", color: "#8B5CF6" },
  { value: "work", label: "Work", emoji: "💼", color: "#3B82F6" },
  { value: "growth", label: "Growth", emoji: "🌱", color: "#10B981" },
  { value: "fitness", label: "Fitness", emoji: "🏃", color: "#F59E0B" },
  { value: "mindfulness", label: "Mindfulness", emoji: "🧘", color: "#A78BFA" },
  { value: "social", label: "Social", emoji: "👥", color: "#EC4899" },
  { value: "general", label: "General", emoji: "📌", color: "#6B7280" },
];

interface CategoryStats {
  category: HabitCategory;
  label: string;
  emoji: string;
  color: string;
  totalHabits: number;
  completedToday: number;
  completionRate: number;
  totalStreak: number;
}

function calculateCategoryStats(habits: HabitWithStats[]): CategoryStats[] {
  const stats: CategoryStats[] = [];

  for (const cat of CATEGORIES) {
    const categoryHabits = habits.filter((h) => (h.category || "general") === cat.value);
    const completedToday = categoryHabits.filter((h) => h.completedToday).length;
    const totalHabits = categoryHabits.length;
    const completionRate = totalHabits > 0 ? (completedToday / totalHabits) * 100 : 0;
    const totalStreak = categoryHabits.reduce((sum, h) => sum + (h.streak || 0), 0);

    if (totalHabits > 0) {
      stats.push({
        category: cat.value,
        label: cat.label,
        emoji: cat.emoji,
        color: cat.color,
        totalHabits,
        completedToday,
        completionRate,
        totalStreak,
      });
    }
  }

  // Sort by completion rate descending
  return stats.sort((a, b) => b.completionRate - a.completionRate);
}

export function CategoryAnalytics({ habits }: CategoryAnalyticsProps) {
  const categoryStats = calculateCategoryStats(habits);

  if (categoryStats.length === 0) {
    return (
      <GlassCard className="p-6">
        <Text className="text-white/60 text-center">
          No categories yet. Start adding habits to see your analytics!
        </Text>
      </GlassCard>
    );
  }

  // Calculate overall stats
  const totalHabits = habits.length;
  const completedToday = habits.filter((h) => h.completedToday).length;
  const overallCompletionRate = totalHabits > 0 ? (completedToday / totalHabits) * 100 : 0;

  return (
    <View>
      {/* Overall Stats Card */}
      <GlassCard className="p-6 mb-4">
        <Text className="text-white text-xl font-bold mb-4">📊 Today&apos;s Overview</Text>
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-white/70 text-base">Total Progress</Text>
          <Text className="text-white text-2xl font-bold">{Math.round(overallCompletionRate)}%</Text>
        </View>
        <View className="h-3 bg-white/10 rounded-full overflow-hidden mb-4">
          <LinearGradient
            colors={["#00D4FF", "#8B5CF6"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{
              width: `${overallCompletionRate}%`,
              height: "100%",
            }}
          />
        </View>
        <View className="flex-row justify-between">
          <View>
            <Text className="text-white/50 text-xs mb-1">Completed</Text>
            <Text className="text-neon-cyan text-lg font-bold">{completedToday}</Text>
          </View>
          <View>
            <Text className="text-white/50 text-xs mb-1">Remaining</Text>
            <Text className="text-white/70 text-lg font-bold">{totalHabits - completedToday}</Text>
          </View>
          <View>
            <Text className="text-white/50 text-xs mb-1">Total</Text>
            <Text className="text-white text-lg font-bold">{totalHabits}</Text>
          </View>
        </View>
      </GlassCard>

      {/* Category Breakdown */}
      <Text className="text-white text-xl font-bold mb-3 px-5">By Category</Text>
      {categoryStats.map((stat) => (
        <GlassCard key={stat.category} className="p-4 mb-3">
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center flex-1">
              <Text className="text-3xl mr-3">{stat.emoji}</Text>
              <View className="flex-1">
                <Text className="text-white text-base font-semibold">{stat.label}</Text>
                <Text className="text-white/50 text-xs">
                  {stat.completedToday}/{stat.totalHabits} habits completed
                </Text>
              </View>
            </View>
            <View className="items-end">
              <Text className="text-white text-xl font-bold">{Math.round(stat.completionRate)}%</Text>
              {stat.completionRate >= 80 && (
                <View className="flex-row items-center mt-1">
                  <TrendingUp size={14} color="#10B981" />
                  <Text className="text-green-500 text-xs ml-1">Excellent</Text>
                </View>
              )}
              {stat.completionRate >= 50 && stat.completionRate < 80 && (
                <View className="flex-row items-center mt-1">
                  <Minus size={14} color="#F59E0B" />
                  <Text className="text-yellow-500 text-xs ml-1">Good</Text>
                </View>
              )}
              {stat.completionRate < 50 && (
                <View className="flex-row items-center mt-1">
                  <TrendingDown size={14} color="#EF4444" />
                  <Text className="text-red-500 text-xs ml-1">Needs work</Text>
                </View>
              )}
            </View>
          </View>

          {/* Progress Bar */}
          <View className="h-2 bg-white/10 rounded-full overflow-hidden">
            <View
              className="h-full rounded-full"
              style={{
                width: `${stat.completionRate}%`,
                backgroundColor: stat.color,
              }}
            />
          </View>

          {/* Total Streak */}
          {stat.totalStreak > 0 && (
            <View className="flex-row items-center mt-2">
              <Text className="text-orange-500 text-xs mr-1">🔥</Text>
              <Text className="text-white/50 text-xs">{stat.totalStreak} total streak days</Text>
            </View>
          )}
        </GlassCard>
      ))}
    </View>
  );
}
