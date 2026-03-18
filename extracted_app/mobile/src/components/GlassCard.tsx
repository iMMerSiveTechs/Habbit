import React from "react";
import { View, type ViewProps } from "react-native";
import { cn } from "@/utils/cn";

interface GlassCardProps extends ViewProps {
  children: React.ReactNode;
  className?: string;
  intensity?: "light" | "medium" | "strong";
}

function GlassCardComponent({ children, className, intensity = "medium", style, ...props }: GlassCardProps) {
  const intensityClasses = {
    light: "bg-white/[0.03]",
    medium: "bg-white/[0.05]",
    strong: "bg-white/[0.08]",
  };

  const shadowStyle = {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  };

  return (
    <View
      className={cn(
        "rounded-3xl border border-white/15",
        intensityClasses[intensity],
        className,
      )}
      style={[shadowStyle, style]}
      {...props}
    >
      {children}
    </View>
  );
}

export const GlassCard = React.memo(GlassCardComponent);
