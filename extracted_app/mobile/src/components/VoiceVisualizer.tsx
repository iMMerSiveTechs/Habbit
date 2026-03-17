import { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";

interface VoiceVisualizerProps {
  isActive?: boolean;
  barCount?: number;
  height?: number;
}

export function VoiceVisualizer({ isActive = true, barCount = 5, height = 60 }: VoiceVisualizerProps) {
  const bars = Array.from({ length: barCount });

  return (
    <View style={[styles.container, { height }]}>
      {bars.map((_, index) => (
        <VoiceBar key={index} index={index} isActive={isActive} maxHeight={height} />
      ))}
    </View>
  );
}

function VoiceBar({ index, isActive, maxHeight }: { index: number; isActive: boolean; maxHeight: number }) {
  const height = useSharedValue(maxHeight * 0.3);

  useEffect(() => {
    if (isActive) {
      height.value = withDelay(
        index * 100,
        withRepeat(
          withTiming(Math.random() * maxHeight * 0.6 + maxHeight * 0.2, {
            duration: 600 + Math.random() * 400,
            easing: Easing.inOut(Easing.ease),
          }),
          -1,
          true,
        ),
      );
    } else {
      height.value = withTiming(maxHeight * 0.3, { duration: 300 });
    }
  }, [isActive, index, maxHeight]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: height.value,
  }));

  return (
    <Animated.View style={[styles.bar, animatedStyle]}>
      <LinearGradient colors={["#00D4FF", "#8B5CF6"]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.gradient} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  bar: {
    width: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  gradient: {
    flex: 1,
  },
});
