/**
 * QuickReportModal
 * A fast-access weekly performance report modal displaying
 * integrity scores, adherence stats, protocol status, and grades.
 */

import { useEffect, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  Modal,
  StyleSheet,
  Animated,
  Easing,
} from "react-native";
import * as Haptics from "expo-haptics";
import { BarChart3, Eye } from "lucide-react-native";

interface QuickReportModalProps {
  visible: boolean;
  onClose: () => void;
  onViewFullInsights?: () => void;
  integrity: number;
  adherence: number;
  coverageDays: number;
  grade: string;
  xp: number;
  activeProtocols: number;
  promotedProtocols: number;
  failedProtocols: number;
}

const GRADE_COLORS: Record<string, string> = {
  S: "#00D4FF",
  A: "#00C853",
  B: "#FFB800",
  C: "#EF4444",
  D: "#EF4444",
  F: "#EF4444",
};

const MOTIVATIONAL_TEXT: Record<string, string> = {
  S: "Exceptional discipline. You're operating at peak.",
  A: "Strong performance. Stay the course.",
  B: "Room for improvement. Show up tomorrow.",
};

const DEFAULT_MOTIVATIONAL = "Time to recommit. Every day is a reset.";

function getMotivationalText(grade: string): string {
  return MOTIVATIONAL_TEXT[grade.toUpperCase()] ?? DEFAULT_MOTIVATIONAL;
}

function getGradeColor(grade: string): string {
  return GRADE_COLORS[grade.toUpperCase()] ?? "#EF4444";
}

// Circular progress ring drawn with Animated rotation trick
// Uses a simple border-based approach for compatibility
function CircularProgress({
  percentage,
  size,
  strokeWidth,
  color,
  children,
}: {
  percentage: number;
  size: number;
  strokeWidth: number;
  color: string;
  children: React.ReactNode;
}) {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    animatedValue.setValue(0);
    Animated.timing(animatedValue, {
      toValue: percentage,
      duration: 1200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [percentage, animatedValue]);

  // We use two half-circle overlays to simulate a ring fill.
  // Left half fills from 0-50%, right half fills from 50-100%.
  const halfSize = size / 2;

  const rightRotation = animatedValue.interpolate({
    inputRange: [0, 50, 100],
    outputRange: ["0deg", "180deg", "180deg"],
    extrapolate: "clamp",
  });

  const leftRotation = animatedValue.interpolate({
    inputRange: [0, 50, 100],
    outputRange: ["0deg", "0deg", "180deg"],
    extrapolate: "clamp",
  });

  const leftOpacity = animatedValue.interpolate({
    inputRange: [0, 49.9, 50, 100],
    outputRange: [0, 0, 1, 1],
    extrapolate: "clamp",
  });

  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Background track ring */}
      <View
        style={{
          position: "absolute",
          width: size,
          height: size,
          borderRadius: halfSize,
          borderWidth: strokeWidth,
          borderColor: "rgba(255,255,255,0.08)",
        }}
      />

      {/* Right half clip */}
      <View
        style={{
          position: "absolute",
          width: halfSize,
          height: size,
          right: 0,
          overflow: "hidden",
        }}
      >
        <Animated.View
          style={{
            width: size,
            height: size,
            borderRadius: halfSize,
            borderWidth: strokeWidth,
            borderColor: color,
            borderLeftColor: "transparent",
            borderBottomColor: "transparent",
            right: halfSize,
            transform: [{ rotate: rightRotation }],
          }}
        />
      </View>

      {/* Left half clip */}
      <Animated.View
        style={{
          position: "absolute",
          width: halfSize,
          height: size,
          left: 0,
          overflow: "hidden",
          opacity: leftOpacity,
        }}
      >
        <Animated.View
          style={{
            width: size,
            height: size,
            borderRadius: halfSize,
            borderWidth: strokeWidth,
            borderColor: color,
            borderRightColor: "transparent",
            borderTopColor: "transparent",
            transform: [{ rotate: leftRotation }],
          }}
        />
      </Animated.View>

      {/* Center content */}
      <View style={{ alignItems: "center", justifyContent: "center" }}>
        {children}
      </View>
    </View>
  );
}

export function QuickReportModal({
  visible,
  onClose,
  onViewFullInsights,
  integrity,
  adherence,
  coverageDays,
  grade,
  xp,
  activeProtocols,
  promotedProtocols,
  failedProtocols,
}: QuickReportModalProps) {
  const gradeColor = getGradeColor(grade);
  const motivationalText = getMotivationalText(grade);

  const handleDismiss = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onClose();
  };

  const handleViewInsights = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onViewFullInsights?.();
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.headerRow}>
            <BarChart3 size={18} color="#00D4FF" />
            <Text style={styles.title}>WEEKLY REPORT</Text>
          </View>

          {/* Hero Section - Integrity Ring */}
          <View style={styles.heroSection}>
            <CircularProgress
              percentage={integrity}
              size={140}
              strokeWidth={6}
              color={gradeColor}
            >
              <Text style={styles.heroPercentage}>{integrity}</Text>
              <Text style={styles.heroPercentSign}>%</Text>
            </CircularProgress>
            {/* Grade Badge */}
            <View
              style={[styles.gradeBadge, { backgroundColor: `${gradeColor}20`, borderColor: gradeColor }]}
            >
              <Text style={[styles.gradeBadgeText, { color: gradeColor }]}>
                {grade.toUpperCase()}
              </Text>
            </View>
          </View>

          {/* Stats Grid 2x2 */}
          <View style={styles.statsGrid}>
            <View style={styles.statCell}>
              <Text style={styles.statLabel}>ADHERENCE</Text>
              <Text style={styles.statValue}>{adherence}%</Text>
            </View>
            <View style={styles.statCell}>
              <Text style={styles.statLabel}>COVERAGE</Text>
              <Text style={styles.statValue}>{coverageDays}/7 days</Text>
            </View>
            <View style={styles.statCell}>
              <Text style={styles.statLabel}>XP EARNED</Text>
              <Text style={styles.statValue}>{xp}</Text>
            </View>
            <View style={styles.statCell}>
              <Text style={styles.statLabel}>GRADE</Text>
              <Text style={[styles.statValue, { color: gradeColor }]}>
                {grade.toUpperCase()}
              </Text>
            </View>
          </View>

          {/* Protocol Status Row */}
          <View style={styles.protocolRow}>
            <View style={styles.protocolItem}>
              <Text style={styles.protocolCount}>{activeProtocols}</Text>
              <Text style={styles.protocolLabel}>Active</Text>
            </View>
            <View style={styles.protocolDivider} />
            <View style={styles.protocolItem}>
              <Text style={[styles.protocolCount, { color: "#00C853" }]}>
                {promotedProtocols}
              </Text>
              <Text style={[styles.protocolLabel, { color: "#00C853" }]}>
                Promoted
              </Text>
            </View>
            <View style={styles.protocolDivider} />
            <View style={styles.protocolItem}>
              <Text style={[styles.protocolCount, { color: "#EF4444" }]}>
                {failedProtocols}
              </Text>
              <Text style={[styles.protocolLabel, { color: "#EF4444" }]}>
                Failed
              </Text>
            </View>
          </View>

          {/* Motivational Text */}
          <View style={styles.motivationalContainer}>
            <Text style={styles.motivationalText}>{motivationalText}</Text>
          </View>

          {/* Dismiss Button */}
          <Pressable
            onPress={handleDismiss}
            style={styles.dismissButton}
            className="active:scale-95"
          >
            <Text style={styles.dismissButtonText}>DISMISS</Text>
          </Pressable>

          {/* View Full Insights Link */}
          {onViewFullInsights && (
            <Pressable
              onPress={handleViewInsights}
              style={styles.insightsLink}
              className="active:opacity-60"
            >
              <Eye size={14} color="#00D4FF" />
              <Text style={styles.insightsLinkText}>View Full Insights</Text>
            </Pressable>
          )}
        </View>
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
    paddingHorizontal: 20,
  },
  card: {
    width: "100%",
    backgroundColor: "#0A0A0A",
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "rgba(0,212,255,0.3)",
    padding: 24,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 24,
  },
  title: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 3,
    textAlign: "center",
  },
  heroSection: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
    position: "relative",
  },
  heroPercentage: {
    color: "#fff",
    fontSize: 48,
    fontWeight: "900",
    lineHeight: 52,
  },
  heroPercentSign: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 16,
    fontWeight: "700",
    marginTop: -4,
  },
  gradeBadge: {
    position: "absolute",
    top: 0,
    right: "20%",
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  gradeBadgeText: {
    fontSize: 16,
    fontWeight: "900",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 20,
  },
  statCell: {
    width: "47%",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  statLabel: {
    color: "#666",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  statValue: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "900",
  },
  protocolRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginBottom: 20,
  },
  protocolItem: {
    flex: 1,
    alignItems: "center",
  },
  protocolDivider: {
    width: 1,
    height: 30,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  protocolCount: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 2,
  },
  protocolLabel: {
    color: "#888",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
  },
  motivationalContainer: {
    backgroundColor: "rgba(0,212,255,0.05)",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "rgba(0,212,255,0.1)",
  },
  motivationalText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 13,
    fontStyle: "italic",
    textAlign: "center",
    lineHeight: 18,
  },
  dismissButton: {
    width: "100%",
    height: 52,
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: "#00D4FF",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,212,255,0.06)",
  },
  dismissButtonText: {
    color: "#00D4FF",
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 3,
  },
  insightsLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 16,
  },
  insightsLinkText: {
    color: "#00D4FF",
    fontSize: 13,
    fontWeight: "600",
  },
});
