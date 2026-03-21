import { useEffect, useRef } from "react";
import { View, Animated } from "react-native";

interface SkeletonLoaderProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  className?: string;
}

export function SkeletonLoader({
  width = "100%",
  height = 20,
  borderRadius = 8,
  className = ""
}: SkeletonLoaderProps) {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const shimmer = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    shimmer.start();
    return () => shimmer.stop();
  }, [shimmerAnim]);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.6],
  });

  return (
    <Animated.View
      className={className}
      style={[
        {
          backgroundColor: "#ffffff",
          opacity,
        },
        typeof width === "number" ? { width } : { width: width as any },
        { height, borderRadius },
      ]}
    />
  );
}

export function HabitCardSkeleton() {
  return (
    <View className="bg-white/5 rounded-2xl p-4 mb-4">
      <View className="flex-row items-center mb-3">
        <SkeletonLoader width={48} height={48} borderRadius={24} className="mr-3" />
        <View className="flex-1">
          <SkeletonLoader width="60%" height={20} className="mb-2" />
          <SkeletonLoader width="40%" height={16} />
        </View>
      </View>
      <View className="flex-row justify-between">
        <SkeletonLoader width="30%" height={16} />
        <SkeletonLoader width="30%" height={16} />
      </View>
    </View>
  );
}

export function TodoCardSkeleton() {
  return (
    <View className="bg-white/5 rounded-xl p-4 mb-3">
      <View className="flex-row items-center mb-2">
        <SkeletonLoader width={24} height={24} borderRadius={12} className="mr-3" />
        <SkeletonLoader width="70%" height={18} />
      </View>
      <SkeletonLoader width="50%" height={14} />
    </View>
  );
}

export function InsightCardSkeleton() {
  return (
    <View className="bg-white/5 rounded-2xl p-6 mb-5">
      <View className="flex-row items-center mb-4">
        <SkeletonLoader width={20} height={20} className="mr-2" />
        <SkeletonLoader width="40%" height={20} />
      </View>
      <SkeletonLoader width="100%" height={16} className="mb-2" />
      <SkeletonLoader width="80%" height={16} />
    </View>
  );
}
