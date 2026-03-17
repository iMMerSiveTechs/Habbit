import { View, Text, Pressable } from "react-native";
import { GlassCard } from "./GlassCard";
import { VoiceVisualizer } from "./VoiceVisualizer";
import { Sparkles } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";

interface CerebraCardProps {
  message: string;
  onAccept?: () => void;
  onDismiss?: () => void;
  showActions?: boolean;
}

export function CerebraCard({ message, onAccept, onDismiss, showActions = true }: CerebraCardProps) {
  return (
    <GlassCard className="mx-5 p-5 border-neon-violet/30">
      <LinearGradient
        colors={["rgba(139, 92, 246, 0.1)", "rgba(255, 0, 229, 0.1)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          borderRadius: 24,
        }}
      />

      <View className="flex-row items-center mb-3">
        <View className="bg-gradient-to-r from-neon-violet to-neon-magenta px-3 py-1 rounded-full">
          <Text className="text-white text-xs font-bold">CEREBRA-MODE</Text>
        </View>
        <Sparkles size={16} color="#8B5CF6" style={{ marginLeft: 8 }} />
      </View>

      <Text className="text-white text-base leading-6 mb-4">{message}</Text>

      <VoiceVisualizer height={50} />

      {showActions && (
        <View className="flex-row gap-3 mt-4">
          <Pressable
            onPress={onAccept}
            className="flex-1 bg-white/10 border border-white/20 rounded-xl py-3 items-center active:scale-95"
          >
            <Text className="text-white font-semibold">Yes, schedule it</Text>
          </Pressable>
          <Pressable
            onPress={onDismiss}
            className="flex-1 bg-white/5 border border-white/10 rounded-xl py-3 items-center active:scale-95"
          >
            <Text className="text-white/70 font-semibold">Maybe later</Text>
          </Pressable>
        </View>
      )}
    </GlassCard>
  );
}
