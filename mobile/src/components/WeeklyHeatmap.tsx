/**
 * WeeklyHeatmap Component
 * GitHub-style contribution graph showing habit completion history
 */

import { View, Text, Pressable } from "react-native";
import { GlassCard } from "./GlassCard";
import { format, subDays, startOfWeek, isSameDay, parseISO } from "date-fns";
import * as Haptics from "expo-haptics";

interface WeeklyHeatmapProps {
  completionDates: string[]; // Array of ISO date strings
  title?: string;
  weeksToShow?: number;
}

export function WeeklyHeatmap({ completionDates, title = "Completion History", weeksToShow = 12 }: WeeklyHeatmapProps) {
  // Generate the last N weeks of dates
  const today = new Date();
  const weeks: Date[][] = [];

  for (let weekIndex = weeksToShow - 1; weekIndex >= 0; weekIndex--) {
    const weekStart = startOfWeek(subDays(today, weekIndex * 7), { weekStartsOn: 0 });
    const week: Date[] = [];
    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + dayIndex);
      week.push(date);
    }
    weeks.push(week);
  }

  // Count completions per day
  const completionCounts = new Map<string, number>();
  completionDates.forEach((dateStr) => {
    try {
      const date = parseISO(dateStr);
      const key = format(date, "yyyy-MM-dd");
      completionCounts.set(key, (completionCounts.get(key) || 0) + 1);
    } catch (error) {
      console.warn("Invalid date:", dateStr);
    }
  });

  // Get color based on completion count
  const getColorForCount = (count: number): string => {
    if (count === 0) return "bg-white/5";
    if (count === 1) return "bg-green-500/30";
    if (count === 2) return "bg-green-500/50";
    if (count === 3) return "bg-green-500/70";
    return "bg-green-500/90";
  };

  // Calculate stats
  const totalCompletions = completionDates.length;
  const daysWithCompletions = completionCounts.size;
  const maxStreak = calculateMaxStreak(completionDates);
  const currentStreak = calculateCurrentStreak(completionDates);

  return (
    <GlassCard className="p-5">
      <View className="mb-4">
        <Text className="text-white text-xl font-bold mb-1">{title}</Text>
        <Text className="text-white/60 text-sm">Last {weeksToShow} weeks</Text>
      </View>

      {/* Heatmap Grid */}
      <View className="mb-4">
        {/* Day labels */}
        <View className="flex-row mb-2">
          <View className="w-8" />
          {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
            <View key={index} className="w-4 mr-1 items-center">
              <Text className="text-white/40 text-xs">{day}</Text>
            </View>
          ))}
        </View>

        {/* Heatmap rows */}
        {weeks.map((week, weekIndex) => (
          <View key={weekIndex} className="flex-row mb-1">
            {/* Week label */}
            <View className="w-8 justify-center">
              <Text className="text-white/40 text-xs">
                {format(week[0], "MMM d")}
              </Text>
            </View>

            {/* Day squares */}
            {week.map((date, dayIndex) => {
              const dateKey = format(date, "yyyy-MM-dd");
              const count = completionCounts.get(dateKey) || 0;
              const isToday = isSameDay(date, today);
              const isFuture = date > today;

              return (
                <Pressable
                  key={dayIndex}
                  onPress={() => {
                    if (count > 0) {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                  }}
                  className="mr-1"
                  disabled={count === 0}
                >
                  <View
                    className={`w-4 h-4 rounded ${getColorForCount(count)} ${
                      isToday ? "border border-cyan-400" : ""
                    } ${isFuture ? "opacity-30" : ""}`}
                  >
                    {count > 0 && (
                      <View className="absolute inset-0 items-center justify-center">
                        <Text className="text-white text-[8px] font-bold">{count}</Text>
                      </View>
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>

      {/* Legend */}
      <View className="flex-row items-center justify-between mb-4">
        <View className="flex-row items-center">
          <Text className="text-white/60 text-xs mr-2">Less</Text>
          {[0, 1, 2, 3, 4].map((level) => (
            <View key={level} className={`w-3 h-3 rounded mr-1 ${getColorForCount(level)}`} />
          ))}
          <Text className="text-white/60 text-xs ml-1">More</Text>
        </View>
      </View>

      {/* Stats */}
      <View className="flex-row flex-wrap gap-3">
        <View className="bg-white/5 px-3 py-2 rounded-lg">
          <Text className="text-white/60 text-xs">Total</Text>
          <Text className="text-white text-lg font-bold">{totalCompletions}</Text>
        </View>
        <View className="bg-white/5 px-3 py-2 rounded-lg">
          <Text className="text-white/60 text-xs">Active Days</Text>
          <Text className="text-white text-lg font-bold">{daysWithCompletions}</Text>
        </View>
        <View className="bg-white/5 px-3 py-2 rounded-lg">
          <Text className="text-white/60 text-xs">Current Streak</Text>
          <Text className="text-green-400 text-lg font-bold">{currentStreak} 🔥</Text>
        </View>
        <View className="bg-white/5 px-3 py-2 rounded-lg">
          <Text className="text-white/60 text-xs">Max Streak</Text>
          <Text className="text-orange-400 text-lg font-bold">{maxStreak} ⭐</Text>
        </View>
      </View>
    </GlassCard>
  );
}

/**
 * Calculate the maximum streak of consecutive days with completions
 */
function calculateMaxStreak(completionDates: string[]): number {
  if (completionDates.length === 0) return 0;

  // Parse and sort unique dates
  const uniqueDates = Array.from(
    new Set(
      completionDates.map((dateStr) => {
        try {
          return format(parseISO(dateStr), "yyyy-MM-dd");
        } catch {
          return null;
        }
      }).filter(Boolean) as string[]
    )
  ).sort();

  let maxStreak = 0;
  let currentStreak = 1;

  for (let i = 1; i < uniqueDates.length; i++) {
    const prevDate = parseISO(uniqueDates[i - 1]);
    const currDate = parseISO(uniqueDates[i]);
    const dayDiff = Math.floor((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));

    if (dayDiff === 1) {
      currentStreak++;
    } else {
      maxStreak = Math.max(maxStreak, currentStreak);
      currentStreak = 1;
    }
  }

  return Math.max(maxStreak, currentStreak);
}

/**
 * Calculate the current streak (consecutive days up to today)
 */
function calculateCurrentStreak(completionDates: string[]): number {
  if (completionDates.length === 0) return 0;

  // Parse and sort unique dates
  const uniqueDates = Array.from(
    new Set(
      completionDates.map((dateStr) => {
        try {
          return format(parseISO(dateStr), "yyyy-MM-dd");
        } catch {
          return null;
        }
      }).filter(Boolean) as string[]
    )
  ).sort().reverse(); // Most recent first

  const today = format(new Date(), "yyyy-MM-dd");
  const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd");

  // Check if there's a completion today or yesterday
  if (uniqueDates[0] !== today && uniqueDates[0] !== yesterday) {
    return 0;
  }

  let streak = 0;
  let checkDate = new Date();

  for (let i = 0; i < uniqueDates.length; i++) {
    const dateKey = format(checkDate, "yyyy-MM-dd");
    if (uniqueDates.includes(dateKey)) {
      streak++;
      checkDate = subDays(checkDate, 1);
    } else {
      break;
    }
  }

  return streak;
}
