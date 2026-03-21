import { View, Text, ScrollView, Pressable } from "react-native";
import { HabitCategory } from "@/shared/contracts";
import * as Haptics from "expo-haptics";

interface CategoryFilterProps {
  selectedCategory: HabitCategory | "all";
  onSelectCategory: (category: HabitCategory | "all") => void;
}

const CATEGORIES: { value: HabitCategory | "all"; label: string; emoji: string }[] = [
  { value: "all", label: "All", emoji: "📋" },
  { value: "health", label: "Health", emoji: "💪" },
  { value: "mind", label: "Mind", emoji: "🧠" },
  { value: "work", label: "Work", emoji: "💼" },
  { value: "growth", label: "Growth", emoji: "🌱" },
  { value: "fitness", label: "Fitness", emoji: "🏃" },
  { value: "mindfulness", label: "Mindfulness", emoji: "🧘" },
  { value: "social", label: "Social", emoji: "👥" },
  { value: "leisure", label: "Leisure", emoji: "🎮" },
  { value: "general", label: "General", emoji: "📌" },
];

export function CategoryFilter({ selectedCategory, onSelectCategory }: CategoryFilterProps) {
  return (
    <View className="mb-4">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 4 }}
        className="flex-row"
      >
        {CATEGORIES.map((category) => {
          const isSelected = selectedCategory === category.value;
          return (
            <Pressable
              key={category.value}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onSelectCategory(category.value);
              }}
              className={`mr-3 px-5 py-3 rounded-full border flex-row items-center gap-2 ${
                isSelected
                  ? "bg-neon-cyan/20 border-neon-cyan"
                  : "bg-white/5 border-white/20"
              } active:scale-95`}
              hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
            >
              <Text className="text-lg">{category.emoji}</Text>
              <Text
                className={`text-base font-semibold ${
                  isSelected ? "text-neon-cyan" : "text-white/70"
                }`}
              >
                {category.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
