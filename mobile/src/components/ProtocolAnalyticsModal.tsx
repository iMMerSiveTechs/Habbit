import { useMemo } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  ScrollView,
} from "react-native";
import * as Haptics from "expo-haptics";
import { TimeSystem } from "@/utils/TimeSystem";

interface ProtocolAnalyticsModalProps {
  visible: boolean;
  onClose: () => void;
  habit: {
    id: string;
    title: string;
    color?: string;
    habitType?: string;
    protocolTarget?: number | null;
    protocolWindowDays?: number | null;
    protocolStartDate?: string | null;
    protocolStatus?: string | null;
    bestStreak?: number;
    completionHistory?: string | null;
    currentStreak?: number;
    streak?: number;
    reminderTime?: string | null;
  } | null;
  onArchive: (habitId: string) => void;
  onSetReminder?: (habitId: string) => void;
}

export function ProtocolAnalyticsModal({
  visible,
  onClose,
  habit,
  onArchive,
  onSetReminder,
}: ProtocolAnalyticsModalProps) {
  const accentColor = habit?.color || "#00E5FF";

  const analytics = useMemo(() => {
    if (!habit) return null;

    let completedDates: string[] = [];
    if (habit.completionHistory) {
      try {
        const parsed = JSON.parse(habit.completionHistory);
        if (Array.isArray(parsed)) {
          completedDates = parsed;
        }
      } catch {
        completedDates = [];
      }
    }

    const completedCount = completedDates.length;
    const today = TimeSystem.getTodayKey();

    let daysSinceStart = 1;
    if (habit.protocolStartDate) {
      const diff = TimeSystem.daysBetween(habit.protocolStartDate, today);
      daysSinceStart = Math.max(diff, 1);
    }

    const adherence =
      completedCount > 0
        ? Math.min(Math.round((completedCount / daysSinceStart) * 100), 100)
        : 0;

    const currentStreak = habit.currentStreak ?? habit.streak ?? 0;
    const bestStreak = habit.bestStreak ?? 0;

    return {
      adherence,
      completedCount,
      daysSinceStart,
      currentStreak,
      bestStreak,
    };
  }, [habit]);

  if (!habit) return null;

  const handleArchive = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    onArchive(habit.id);
    onClose();
  };

  const handleReminder = () => {
    if (onSetReminder) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onSetReminder(habit.id);
    }
  };

  const handleDismiss = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  const habitTypeBadge = (habit.habitType || "STANDARD").toUpperCase();
  const isProtocol =
    habitTypeBadge === "PROTOCOL" || habitTypeBadge === "CORE";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          bounces={false}
        >
          <View style={[styles.card, { borderColor: accentColor }]}>
            {/* Title */}
            <Text style={[styles.title, { color: "#FFFFFF" }]}>
              {habit.title.toUpperCase()}
            </Text>

            {/* Stats Section */}
            <View style={styles.statsContainer}>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>ADHERENCE</Text>
                <Text style={[styles.statValue, { color: accentColor }]}>
                  {analytics?.adherence ?? 0}%
                </Text>
              </View>

              <View style={styles.statRow}>
                <Text style={styles.statLabel}>CURRENT STREAK</Text>
                <Text style={[styles.statValue, { color: accentColor }]}>
                  {analytics?.currentStreak ?? 0}
                </Text>
              </View>

              <View style={styles.statRow}>
                <Text style={styles.statLabel}>BEST STREAK</Text>
                <Text style={[styles.statValue, { color: accentColor }]}>
                  {analytics?.bestStreak ?? 0}
                </Text>
              </View>

              <View style={styles.statRow}>
                <Text style={styles.statLabel}>TYPE</Text>
                <View
                  style={[
                    styles.badge,
                    { borderColor: accentColor },
                  ]}
                >
                  <Text style={[styles.badgeText, { color: accentColor }]}>
                    {habitTypeBadge}
                  </Text>
                </View>
              </View>

              {habit.protocolStatus && (
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>STATUS</Text>
                  <Text style={[styles.statValue, { color: accentColor }]}>
                    {habit.protocolStatus.toUpperCase()}
                  </Text>
                </View>
              )}

              {isProtocol &&
                habit.protocolTarget != null &&
                habit.protocolWindowDays != null && (
                  <View style={styles.protocolProgress}>
                    <Text style={styles.protocolProgressText}>
                      {analytics?.completedCount ?? 0}/{habit.protocolTarget}{" "}
                      completions in {habit.protocolWindowDays}-day window
                    </Text>
                  </View>
                )}
            </View>

            {/* Action Buttons */}
            <View style={styles.actionsContainer}>
              {/* Reminder Button */}
              <Pressable
                onPress={handleReminder}
                style={({ pressed }) => [
                  styles.actionButton,
                  styles.reminderButton,
                  pressed && styles.buttonPressed,
                ]}
                disabled={!onSetReminder}
              >
                <Text style={styles.reminderButtonText}>
                  REMINDER: {habit.reminderTime || "OFF"}
                </Text>
              </Pressable>

              {/* Archive Button */}
              <Pressable
                onPress={handleArchive}
                style={({ pressed }) => [
                  styles.actionButton,
                  styles.archiveButton,
                  pressed && styles.buttonPressed,
                ]}
              >
                <Text style={styles.archiveButtonText}>ARCHIVE</Text>
              </Pressable>

              {/* Dismiss Button */}
              <Pressable
                onPress={handleDismiss}
                style={({ pressed }) => [
                  styles.actionButton,
                  styles.dismissButton,
                  pressed && styles.buttonPressed,
                ]}
              >
                <Text style={styles.dismissButtonText}>DISMISS</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    backgroundColor: "#0A0A0A",
    borderRadius: 25,
    borderWidth: 1,
    padding: 28,
    width: "100%",
    maxWidth: 380,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: 1.5,
    textAlign: "center",
    marginBottom: 24,
  },
  statsContainer: {
    marginBottom: 28,
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "rgba(255,255,255,0.5)",
    letterSpacing: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "800",
  },
  badge: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  protocolProgress: {
    marginTop: 16,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  protocolProgressText: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255,255,255,0.7)",
    textAlign: "center",
  },
  actionsContainer: {
    gap: 12,
  },
  actionButton: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.97 }],
  },
  reminderButton: {
    borderColor: "#FFB800",
  },
  reminderButtonText: {
    color: "#FFB800",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 1,
  },
  archiveButton: {
    borderColor: "#666",
  },
  archiveButtonText: {
    color: "#888",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 1,
  },
  dismissButton: {
    borderColor: "#00E5FF",
  },
  dismissButtonText: {
    color: "#00E5FF",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 1,
  },
});
