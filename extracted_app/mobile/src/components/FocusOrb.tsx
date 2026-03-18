import { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";

interface FocusOrbProps {
  size?: number;
  timer?: string;
  targetDuration?: string;
  showTimer?: boolean;
}

export function FocusOrb({ size = 150, timer = "25:00", targetDuration, showTimer = true }: FocusOrbProps) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.7);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 6000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 6000, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );

    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 6000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.7, { duration: 6000, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <View
      style={{ alignItems: "center", justifyContent: "center" }}
      accessibilityLabel={`Focus timer${showTimer ? `, ${timer}` : ''}`}
      accessibilityRole="timer"
    >
      <Animated.View style={[animatedStyle, { width: size, height: size }]}>
        <LinearGradient
          colors={["#00D4FF", "#FF00E5", "#8B5CF6"]}
          start={{ x: 0.3, y: 0.3 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.orb,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
            },
          ]}
        >
          {showTimer && (
            <View style={{ alignItems: "center" }}>
              <Text
                style={[
                  styles.timer,
                  {
                    fontSize: size * 0.2,
                  },
                ]}
              >
                {timer}
              </Text>
              {targetDuration && (
                <Text
                  style={[
                    styles.targetLabel,
                    {
                      fontSize: size * 0.09,
                    },
                  ]}
                >
                  of {targetDuration}
                </Text>
              )}
            </View>
          )}
        </LinearGradient>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  orb: {
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#00D4FF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 30,
    elevation: 10,
  },
  timer: {
    color: "#FFFFFF",
    fontWeight: "700",
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  targetLabel: {
    color: "rgba(255, 255, 255, 0.6)",
    fontWeight: "500",
    marginTop: 2,
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
});
