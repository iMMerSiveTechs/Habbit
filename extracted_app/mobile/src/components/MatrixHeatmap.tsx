/**
 * MatrixHeatmap - 28-day engagement heatmap across all habits
 *
 * GitHub-style contribution grid using the Obsidian ICE palette.
 * Cyan intensity indicates daily activity level.
 */

import { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { GlassCard } from "@/components/GlassCard";
import { TimeSystem, type DateKey } from "@/utils/TimeSystem";

interface MatrixHeatmapProps {
  habits: Array<{
    id: string;
    completedToday: boolean;
    todayCount: number;
    events?: Array<{ completedAt: string }>;
  }>;
  className?: string;
}

const DAYS_LABEL = ["M", "T", "W", "T", "F", "S", "S"] as const;
const TOTAL_DAYS = 28;
const COLS = 7;
const CELL_SIZE = 12;
const CELL_RADIUS = 3;
const CELL_GAP = 4;

/**
 * Normalize an ISO timestamp or YYYY-MM-DD string to a DateKey (YYYY-MM-DD).
 */
function toDateKey(raw: string): DateKey {
  // Handle full ISO timestamps like "2026-02-10T14:30:00.000Z"
  if (raw.length > 10) {
    return raw.slice(0, 10);
  }
  return raw;
}

/**
 * Determine cell opacity from the number of habits completed on a given day.
 * Returns a style object for backgroundColor.
 */
function getCellColor(count: number): string {
  if (count === 0) return "rgba(255,255,255,0.06)";
  if (count === 1) return "rgba(0,212,255,0.30)";
  if (count === 2) return "rgba(0,212,255,0.60)";
  return "rgba(0,212,255,1.0)";
}

export function MatrixHeatmap({ habits, className }: MatrixHeatmapProps) {
  const todayKey = TimeSystem.getTodayKey();

  // Build a map of dateKey -> number of habits with at least one completion
  const { activityMap, activeDaysCount, days } = useMemo(() => {
    const daysArray = TimeSystem.getLastNDays(TOTAL_DAYS);
    const map = new Map<DateKey, number>();

    // Initialise every day with zero
    for (const day of daysArray) {
      map.set(day, 0);
    }

    // Walk through every habit's events and tally per day
    for (const habit of habits) {
      if (!habit.events || habit.events.length === 0) continue;

      // Collect unique days this habit had events within our 28-day window
      const habitDays = new Set<DateKey>();
      for (const event of habit.events) {
        const key = toDateKey(event.completedAt);
        if (map.has(key)) {
          habitDays.add(key);
        }
      }

      for (const day of habitDays) {
        map.set(day, (map.get(day) || 0) + 1);
      }
    }

    let active = 0;
    for (const count of map.values()) {
      if (count > 0) active++;
    }

    return { activityMap: map, activeDaysCount: active, days: daysArray };
  }, [habits, todayKey]);

  // Split the flat 28-day array into rows of 7 (4 rows)
  const rows: DateKey[][] = [];
  for (let r = 0; r < TOTAL_DAYS / COLS; r++) {
    rows.push(days.slice(r * COLS, r * COLS + COLS));
  }

  return (
    <GlassCard className={className} style={styles.card}>
      {/* Title */}
      <Text style={styles.title}>ENGAGEMENT MATRIX</Text>

      {/* Day-of-week header labels */}
      <View style={styles.dayLabelsRow}>
        {DAYS_LABEL.map((label, idx) => (
          <View key={idx} style={styles.dayLabelCell}>
            <Text style={styles.dayLabelText}>{label}</Text>
          </View>
        ))}
      </View>

      {/* Grid */}
      <View style={styles.grid}>
        {rows.map((row, rowIdx) => (
          <View key={rowIdx} style={styles.gridRow}>
            {row.map((dateKey) => {
              const count = activityMap.get(dateKey) || 0;
              const isToday = dateKey === todayKey;
              return (
                <View
                  key={dateKey}
                  style={[
                    styles.cell,
                    { backgroundColor: getCellColor(count) },
                    isToday && styles.cellToday,
                    count >= 3 && styles.cellGlow,
                  ]}
                />
              );
            })}
          </View>
        ))}
      </View>

      {/* Summary */}
      <Text style={styles.summary}>
        {activeDaysCount} of {TOTAL_DAYS} days active
      </Text>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
  },
  title: {
    color: "rgba(255,255,255,0.60)",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2,
    marginBottom: 12,
  },
  dayLabelsRow: {
    flexDirection: "row",
    marginBottom: 6,
  },
  dayLabelCell: {
    width: CELL_SIZE,
    marginRight: CELL_GAP,
    alignItems: "center",
  },
  dayLabelText: {
    color: "rgba(255,255,255,0.35)",
    fontSize: 9,
    fontWeight: "600",
  },
  grid: {
    marginBottom: 12,
  },
  gridRow: {
    flexDirection: "row",
    marginBottom: CELL_GAP,
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: CELL_RADIUS,
    marginRight: CELL_GAP,
  },
  cellToday: {
    borderWidth: 1,
    borderColor: "rgba(0,212,255,0.6)",
  },
  cellGlow: {
    shadowColor: "#00D4FF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 4,
  },
  summary: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
});
