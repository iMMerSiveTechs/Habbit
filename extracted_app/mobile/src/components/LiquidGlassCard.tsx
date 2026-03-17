import React from "react";
import { View, Text, StyleSheet, ViewStyle, TextStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";

interface LiquidGlassCardProps {
  children?: React.ReactNode;
  title?: string;
  subtitle?: string;
  gradientColors?: [string, string, ...string[]];
  style?: ViewStyle;
  contentStyle?: ViewStyle;
}

export function LiquidGlassCard({
  children,
  title,
  subtitle,
  gradientColors = ["#00D4FF", "#8B5CF6", "#FF00E5"],
  style,
  contentStyle,
}: LiquidGlassCardProps) {
  return (
    <View style={[styles.container, style]}>
      {/* Gradient Border */}
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientBorder}
      >
        {/* Glass Background */}
        <View style={styles.glassContainer}>
          <BlurView intensity={20} tint="dark" style={styles.blurView}>
            <View style={[styles.content, contentStyle]}>
              {title && (
                <View style={styles.header}>
                  <Text style={styles.title}>{title}</Text>
                  {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
                </View>
              )}
              {children}
            </View>
          </BlurView>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    overflow: "hidden",
  },
  gradientBorder: {
    padding: 1.5,
    borderRadius: 20,
  },
  glassContainer: {
    borderRadius: 18.5,
    overflow: "hidden",
    backgroundColor: "rgba(26, 31, 46, 0.4)",
  },
  blurView: {
    borderRadius: 18.5,
    overflow: "hidden",
  },
  content: {
    padding: 16,
  },
  header: {
    marginBottom: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: "400",
    color: "rgba(255, 255, 255, 0.6)",
    lineHeight: 18,
  },
});
