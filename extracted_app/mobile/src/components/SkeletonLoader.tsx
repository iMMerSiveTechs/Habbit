import React, { useEffect, useRef } from 'react';
import { View, Animated } from 'react-native';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

function SkeletonLoaderComponent({ width = '100%', height = 20, borderRadius = 8, style }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: '#1a1f35',
          opacity,
        },
        style,
      ]}
    />
  );
}

export const SkeletonLoader = React.memo(SkeletonLoaderComponent);

// Pre-built skeleton layouts
export function HabitCardSkeleton() {
  return (
    <View className="p-4 mb-3 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
      <View className="flex-row items-center mb-2">
        <SkeletonLoader width={40} height={40} borderRadius={20} />
        <View className="ml-3 flex-1">
          <SkeletonLoader width="60%" height={16} style={{ marginBottom: 6 }} />
          <SkeletonLoader width="40%" height={12} />
        </View>
      </View>
      <SkeletonLoader width="100%" height={8} style={{ marginTop: 8 }} />
    </View>
  );
}

export function BriefingSkeleton() {
  return (
    <View className="p-4 rounded-xl mb-4" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
      <SkeletonLoader width="70%" height={18} style={{ marginBottom: 10 }} />
      <SkeletonLoader width="100%" height={14} style={{ marginBottom: 6 }} />
      <SkeletonLoader width="90%" height={14} style={{ marginBottom: 6 }} />
      <SkeletonLoader width="50%" height={14} />
    </View>
  );
}

export function TodoCardSkeleton() {
  return (
    <View className="p-4 mb-3 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
      <View className="flex-row items-center mb-2">
        <SkeletonLoader width={24} height={24} borderRadius={12} />
        <View className="ml-3 flex-1">
          <SkeletonLoader width="70%" height={18} />
        </View>
      </View>
      <SkeletonLoader width="50%" height={14} />
    </View>
  );
}

export function InsightCardSkeleton() {
  return (
    <View className="p-6 mb-5 rounded-2xl" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
      <View className="flex-row items-center mb-4">
        <SkeletonLoader width={20} height={20} style={{ marginRight: 8 }} />
        <SkeletonLoader width="40%" height={20} />
      </View>
      <SkeletonLoader width="100%" height={16} style={{ marginBottom: 8 }} />
      <SkeletonLoader width="80%" height={16} />
    </View>
  );
}
