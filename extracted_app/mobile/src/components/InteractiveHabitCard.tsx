import React, { useState, useRef, useMemo } from "react";
import { View, Text, Pressable, Animated, PanResponder, Alert } from "react-native";
import { GlassCard } from "./GlassCard";
import { Circle, CheckCircle2, Pencil, X, Check, Flame, TrendingUp } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";

interface InteractiveHabitCardProps {
  habit: {
    id: string;
    title: string;
    description?: string | null;
    color: string;
    completedToday: boolean;
    todayCount: number;
    targetCount: number;
    streak?: number;
    habitType?: 'standard' | 'protocol' | 'core';
    protocolTarget?: number | null;
    protocolWindowDays?: number | null;
    protocolStartDate?: string | null;
    protocolStatus?: string | null;
    bestStreak?: number;
    completionHistory?: string | null;
    todayLogQuality?: string | null;
    currentStreak?: number;
  };
  onComplete: (habitId: string) => Promise<void>;
  onEdit: (habit: any) => void;
  onViewDetails: (habitId: string) => void;
  isCompleting?: boolean;
}

/** Parse completionHistory JSON string into an array of date strings. */
function parseCompletionHistory(raw?: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Calculate remaining days for a protocol window. */
function calcRemainingDays(startDate?: string | null, windowDays?: number | null): number {
  if (!startDate || !windowDays) return 0;
  const start = new Date(startDate);
  const end = new Date(start.getTime() + windowDays * 24 * 60 * 60 * 1000);
  const now = new Date();
  const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(diff, 0);
}

/** Return dot color for todayLogQuality. */
function logQualityColor(quality?: string | null): string | null {
  if (quality === "verified") return "#22C55E";
  if (quality === "partial") return "#F59E0B";
  if (quality === "skipped") return "#9CA3AF";
  return null;
}

function InteractiveHabitCardComponent({
  habit,
  onComplete,
  onEdit,
  onViewDetails,
  isCompleting = false,
}: InteractiveHabitCardProps) {
  const [showActions, setShowActions] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const pan = useRef(new Animated.ValueXY()).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const checkAnim = useRef(new Animated.Value(0)).current;

  // Progress percentage
  const progressPercent = (habit.todayCount / habit.targetCount) * 100;
  const isComplete = habit.completedToday || habit.todayCount >= habit.targetCount;

  // Protocol-specific computed values
  const isProtocol = habit.habitType === "protocol";
  const isCore = habit.habitType === "core";
  const isFailed = habit.protocolStatus === "failed";

  const completedDays = useMemo(
    () => parseCompletionHistory(habit.completionHistory).length,
    [habit.completionHistory]
  );

  const remainingDays = useMemo(
    () => calcRemainingDays(habit.protocolStartDate, habit.protocolWindowDays),
    [habit.protocolStartDate, habit.protocolWindowDays]
  );

  const qualityDotColor = logQualityColor(habit.todayLogQuality);

  const effectiveStreak = habit.currentStreak ?? habit.streak ?? 0;
  const bestStreak = habit.bestStreak ?? 0;

  // Swipe gesture handler
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only start pan if horizontal swipe is significant
        return Math.abs(gestureState.dx) > 10;
      },
      onPanResponderGrant: () => {
        pan.setOffset({
          x: (pan.x as any)._value,
          y: (pan.y as any)._value,
        });
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      },
      onPanResponderMove: (_, gestureState) => {
        // Only allow horizontal movement
        pan.setValue({ x: gestureState.dx, y: 0 });

        // Show action hints based on swipe direction
        if (gestureState.dx > 50) {
          setShowActions(true);
        } else if (gestureState.dx < -50) {
          setShowActions(true);
        } else {
          setShowActions(false);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        pan.flattenOffset();

        // Swipe right = Complete
        if (gestureState.dx > 100 && !isComplete) {
          handleQuickComplete();
        }
        // Swipe left = View details
        else if (gestureState.dx < -100) {
          onViewDetails(habit.id);
        }
        // Return to center
        else {
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: false,
            friction: 8,
          }).start();
        }

        setShowActions(false);
      },
    })
  ).current;

  const handleQuickComplete = async () => {
    if (isCompleting || isComplete) return;

    // Animate completion
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Glow effect
    Animated.sequence([
      Animated.timing(glowAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(glowAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    // Check animation
    Animated.spring(checkAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 4,
    }).start();

    // Reset position
    Animated.spring(pan, {
      toValue: { x: 0, y: 0 },
      useNativeDriver: false,
      friction: 8,
    }).start();

    // Call completion handler
    await onComplete(habit.id);

    // Reset animations after a delay
    setTimeout(() => {
      checkAnim.setValue(0);
    }, 1500);
  };

  const handlePress = () => {
    if (isCompleting) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Scale animation
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    onViewDetails(habit.id);
  };

  const handleCircleTap = async () => {
    if (isComplete || isCompleting) return;
    await handleQuickComplete();
  };

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.6],
  });

  const checkScale = checkAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1.2],
  });

  // Determine card-level style overrides
  const cardStyle: Record<string, any> = {
    opacity: isFailed ? 0.5 : isCompleting ? 0.6 : 1,
  };

  if (isFailed) {
    cardStyle.borderColor = "#EF4444";
    cardStyle.borderWidth = 2;
  } else if (isCore) {
    cardStyle.borderColor = "#FFB800";
    cardStyle.borderWidth = 2;
    cardStyle.shadowColor = "#FFB800";
    cardStyle.shadowOffset = { width: 0, height: 0 };
    cardStyle.shadowOpacity = 0.3;
    cardStyle.shadowRadius = 10;
    cardStyle.elevation = 10;
  }

  return (
    <View className="mb-4">
      <Animated.View
        {...panResponder.panHandlers}
        style={{
          transform: [{ translateX: pan.x }],
        }}
      >
        <Animated.View
          style={{
            transform: [{ scale: scaleAnim }],
          }}
        >
        {/* Background actions */}
        {showActions && (
          <View className="absolute inset-0 flex-row justify-between items-center px-4 z-0">
            {/* Complete action (right swipe) */}
            {!isComplete && (
              <View className="bg-green-500/20 rounded-2xl p-4">
                <Check size={24} color="#10B981" />
              </View>
            )}

            {/* View details action (left swipe) */}
            <View className="ml-auto bg-cyan-500/20 rounded-2xl p-4">
              <TrendingUp size={24} color="#00D4FF" />
            </View>
          </View>
        )}

        {/* Main card */}
        <GlassCard
          className="p-4 flex-row items-center"
          style={cardStyle}
          accessibilityLabel={`${habit.title} habit, ${isComplete ? 'completed' : 'not completed'}. ${effectiveStreak} day streak`}
          accessibilityRole="button"
        >
          {/* Glow effect overlay */}
          <Animated.View
            className="absolute inset-0 rounded-2xl"
            style={{
              opacity: glowOpacity,
              backgroundColor: habit.color,
            }}
          />

          {/* Circle button + log quality dot */}
          <View className="mr-4 items-center justify-center">
            <Pressable
              onPress={handleCircleTap}
              disabled={isCompleting || isComplete}
              className="active:scale-90"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <View
                className="w-16 h-16 rounded-full items-center justify-center relative"
                style={{
                  backgroundColor: `${habit.color}20`,
                  borderWidth: 3,
                  borderColor: habit.color,
                }}
              >
                {/* Progress ring */}
                {!isComplete && progressPercent > 0 && (
                  <View
                    className="absolute inset-0 rounded-full"
                    style={{
                      borderWidth: 3,
                      borderColor: habit.color,
                      opacity: 0.4,
                      transform: [
                        { rotate: `${(progressPercent / 100) * 360}deg` }
                      ],
                    }}
                  />
                )}

                {/* Icon */}
                {isComplete ? (
                  <Animated.View style={{ transform: [{ scale: checkScale }] }}>
                    <CheckCircle2 size={32} color={habit.color} fill={habit.color} />
                  </Animated.View>
                ) : (
                  <Circle size={32} color={habit.color} strokeWidth={2.5} />
                )}
              </View>
            </Pressable>

            {/* Today's log quality dot indicator */}
            {qualityDotColor != null && (
              <View
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: qualityDotColor,
                  position: "absolute",
                  bottom: -2,
                  right: -2,
                  borderWidth: 1.5,
                  borderColor: "#1a1a2e",
                }}
              />
            )}
          </View>

          {/* Habit info */}
          <Pressable onPress={handlePress} className="flex-1">
            <View className="flex-row items-center justify-between mb-1">
              <View className="flex-row items-center flex-1">
                <Text className="text-white text-lg font-bold" numberOfLines={1} style={{ flexShrink: 1 }}>
                  {habit.title}
                </Text>

                {/* Protocol / Core / Failed badge */}
                {isFailed ? (
                  <View className="ml-2 px-2 py-0.5 rounded" style={{ backgroundColor: "rgba(239,68,68,0.25)" }}>
                    <Text className="text-xs font-bold" style={{ color: "#EF4444" }}>FAILED</Text>
                  </View>
                ) : isProtocol ? (
                  <View className="ml-2 px-2 py-0.5 rounded" style={{ backgroundColor: "rgba(0,229,255,0.15)" }}>
                    <Text className="text-xs font-bold" style={{ color: "#00E5FF" }}>PROTOCOL</Text>
                  </View>
                ) : isCore ? (
                  <View
                    className="ml-2 px-2 py-0.5 rounded"
                    style={{
                      backgroundColor: "rgba(255,184,0,0.15)",
                      shadowColor: "#FFB800",
                      shadowOffset: { width: 0, height: 0 },
                      shadowOpacity: 0.4,
                      shadowRadius: 4,
                      elevation: 4,
                    }}
                  >
                    <Text className="text-xs font-bold" style={{ color: "#FFB800" }}>CORE</Text>
                  </View>
                ) : null}
              </View>

              {/* Streak display with best streak */}
              {effectiveStreak > 0 && (
                <View className="flex-row items-center bg-orange-500/30 px-3 py-1.5 rounded-lg ml-2">
                  <Flame size={16} color="#F97316" />
                  <Text className="text-orange-400 text-sm font-bold ml-1">
                    {effectiveStreak}
                    {bestStreak > 0 ? ` (best: ${bestStreak})` : ""}
                  </Text>
                </View>
              )}
            </View>

            {/* Protocol progress text */}
            {isProtocol && habit.protocolTarget != null && !isFailed && (
              <Text className="text-xs mb-1" style={{ color: "#00E5FF" }}>
                {completedDays}/{habit.protocolTarget} proofs{" "}
                {"\u2022"} {remainingDays}d remaining
              </Text>
            )}

            {/* Progress info */}
            <View className="flex-row items-center">
              <View className="flex-1">
                {/* Progress bar */}
                <View className="h-2.5 bg-white/10 rounded-full overflow-hidden mb-1.5">
                  <LinearGradient
                    colors={[habit.color, `${habit.color}80`]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{
                      width: `${Math.min(progressPercent, 100)}%`,
                      height: '100%',
                    }}
                  />
                </View>

                <Text className="text-white/70 text-sm font-medium">
                  {habit.todayCount}/{habit.targetCount} today
                  {isComplete && " \u2713"}
                </Text>
              </View>
            </View>
          </Pressable>

          {/* Edit button */}
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              onEdit(habit);
            }}
            className="w-12 h-12 items-center justify-center active:scale-90 ml-2"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Pencil size={20} color="#00D4FF" />
          </Pressable>
        </GlassCard>
        </Animated.View>
      </Animated.View>

      {/* Swipe hint (show on first render) */}
      {!isComplete && habit.todayCount === 0 && (
        <View className="absolute -bottom-2 right-4 bg-cyan-500/20 px-3 py-1 rounded-full">
          <Text className="text-cyan-400 text-xs font-semibold">Swipe to complete</Text>
        </View>
      )}
    </View>
  );
}

export const InteractiveHabitCard = React.memo(InteractiveHabitCardComponent);
