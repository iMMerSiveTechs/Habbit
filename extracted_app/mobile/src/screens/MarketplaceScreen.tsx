import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Modal, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ShoppingBag, Check, Download, Sparkles, Clock, TrendingUp, X, Info } from "lucide-react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/types";
import { api } from "@/lib/api";
import type { HabitTemplate } from "@/shared/contracts";
import * as Haptics from "expo-haptics";

type Props = NativeStackScreenProps<RootStackParamList, "Marketplace">;

const CATEGORY_LABELS: Record<string, { label: string; emoji: string; color: string }> = {
  morning: { label: "Morning", emoji: "☀️", color: "#FF9800" },
  evening: { label: "Evening", emoji: "🌙", color: "#673AB7" },
  fitness: { label: "Fitness", emoji: "💪", color: "#FF5722" },
  wellness: { label: "Wellness", emoji: "✨", color: "#4CAF50" },
  productivity: { label: "Productivity", emoji: "⚡", color: "#00D4FF" },
  mental_health: { label: "Mental Health", emoji: "🧠", color: "#9C27B0" },
  full_day: { label: "Full Day", emoji: "🌟", color: "#FFC107" },
};

export default function MarketplaceScreen({ navigation }: Props) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<HabitTemplate | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const queryClient = useQueryClient();

  // Fetch all templates
  const { data: templatesData, isLoading } = useQuery({
    queryKey: ["marketplace-templates"],
    queryFn: async () => {
      return await api.get<{ templates: HabitTemplate[] }>("/api/templates/marketplace");
    },
  });

  // Purchase mutation
  const purchaseMutation = useMutation({
    mutationFn: async (templateId: string) => {
      return await api.post<any>(`/api/templates/marketplace/${templateId}/purchase`, {
        paymentMethod: "mock"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketplace-templates"] });
      queryClient.invalidateQueries({ queryKey: ["habits"] });
    },
  });

  // Import mutation
  const importMutation = useMutation({
    mutationFn: async (templateId: string) => {
      return await api.post<any>(`/api/templates/marketplace/${templateId}/import`, {});
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["marketplace-templates"] });
      queryClient.invalidateQueries({ queryKey: ["habits"] });
      Alert.alert(
        "Success!",
        `${data.habitsCreated.length} habits added to your list`,
        [{ text: "OK" }]
      );
    },
  });

  const handlePurchase = (template: HabitTemplate) => {
    Alert.alert(
      `Purchase ${template.title}?`,
      `This template costs $${template.price.toFixed(2)} and includes ${template.habits.length} habits.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Purchase",
          onPress: () => {
            purchaseMutation.mutate(template.id, {
              onSuccess: () => {
                Alert.alert("Purchased!", "Template purchased successfully. You can now import it.");
              },
              onError: (error: any) => {
                Alert.alert("Error", error?.message || "Failed to purchase template");
              },
            });
          },
        },
      ]
    );
  };

  const handleImport = (template: HabitTemplate) => {
    Alert.alert(
      `Import ${template.title}?`,
      `This will add ${template.habits.length} habits to your list. You can customize them after importing.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Import",
          onPress: () => {
            importMutation.mutate(template.id);
          },
        },
      ]
    );
  };

  const templates = templatesData?.templates || [];
  const filteredTemplates = selectedCategory
    ? templates.filter((t: HabitTemplate) => t.category === selectedCategory)
    : templates;

  const categories = Object.keys(CATEGORY_LABELS);

  return (
    <View className="flex-1 bg-[#0A0F1C]">
      <SafeAreaView edges={["top"]} className="flex-1">
        {/* Header */}
        <View className="px-6 py-4 border-b border-white/10">
          <View className="flex-row items-center justify-between mb-2">
            <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4">
              <ArrowLeft size={24} color="#fff" />
            </TouchableOpacity>
            <Text className="text-2xl font-bold text-white flex-1">Template Store</Text>
            <ShoppingBag size={24} color="#00D4FF" />
          </View>
          <Text className="text-gray-400 text-sm">
            Pre-built habit routines to jumpstart your journey
          </Text>
        </View>

        {/* Category Filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="px-6 py-4 border-b border-white/10"
          contentContainerStyle={{ gap: 8 }}
        >
          <TouchableOpacity
            onPress={() => setSelectedCategory(null)}
            className={`px-4 py-2 rounded-full border ${
              selectedCategory === null
                ? "bg-[#00D4FF] border-[#00D4FF]"
                : "bg-white/5 border-white/20"
            }`}
          >
            <Text
              className={`font-medium ${
                selectedCategory === null ? "text-black" : "text-white"
              }`}
            >
              All
            </Text>
          </TouchableOpacity>
          {categories.map((category) => {
            const meta = CATEGORY_LABELS[category];
            return (
              <TouchableOpacity
                key={category}
                onPress={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-full border flex-row items-center ${
                  selectedCategory === category
                    ? "bg-[#00D4FF] border-[#00D4FF]"
                    : "bg-white/5 border-white/20"
                }`}
              >
                <Text className="mr-1">{meta.emoji}</Text>
                <Text
                  className={`font-medium ${
                    selectedCategory === category ? "text-black" : "text-white"
                  }`}
                >
                  {meta.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Templates List */}
        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#00D4FF" />
          </View>
        ) : (
          <ScrollView className="flex-1 px-6 py-4" contentContainerStyle={{ paddingBottom: 100 }}>
            {filteredTemplates.map((template: HabitTemplate) => {
              const categoryMeta = CATEGORY_LABELS[template.category];
              return (
                <View
                  key={template.id}
                  className="bg-white/5 rounded-2xl p-5 mb-4 border border-white/10"
                >
                  {/* Template Header */}
                  <View className="flex-row items-start justify-between mb-3">
                    <View className="flex-1">
                      <View className="flex-row items-center mb-2">
                        <Text className="text-2xl mr-2">{categoryMeta.emoji}</Text>
                        <View className="flex-1">
                          <Text className="text-white text-lg font-bold">
                            {template.title}
                          </Text>
                          {template.isPremium && (
                            <View className="flex-row items-center mt-1">
                              <Sparkles size={12} color="#FFC107" />
                              <Text className="text-[#FFC107] text-xs ml-1 font-semibold">
                                PREMIUM
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                      <Text className="text-gray-400 text-sm" numberOfLines={2}>
                        {template.description}
                      </Text>
                    </View>
                  </View>

                  {/* Template Stats */}
                  <View className="flex-row items-center mb-3">
                    <View className="flex-row items-center mr-4">
                      <Clock size={14} color="#00D4FF" />
                      <Text className="text-gray-400 text-xs ml-1">
                        {template.habits.length} habits
                      </Text>
                    </View>
                    <View className="flex-row items-center mr-4">
                      <TrendingUp size={14} color="#4CAF50" />
                      <Text className="text-gray-400 text-xs ml-1">
                        {template.usageCount} users
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setSelectedTemplate(template);
                        setShowDetailModal(true);
                      }}
                      className="flex-row items-center ml-auto"
                    >
                      <Info size={14} color="#00D4FF" />
                      <Text className="text-[#00D4FF] text-xs ml-1 font-semibold">
                        View Details
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Action Buttons */}
                  <View className="flex-row gap-2">
                    {template.isPurchased ? (
                      <>
                        {template.isImported ? (
                          <View className="flex-1 bg-green-500/20 border border-green-500/30 rounded-xl py-3 flex-row items-center justify-center">
                            <Check size={18} color="#4CAF50" />
                            <Text className="text-green-500 font-semibold ml-2">
                              Imported
                            </Text>
                          </View>
                        ) : (
                          <TouchableOpacity
                            onPress={(e) => {
                              e.stopPropagation();
                              handleImport(template);
                            }}
                            disabled={importMutation.isPending}
                            className="flex-1 bg-[#00D4FF] rounded-xl py-3 flex-row items-center justify-center"
                          >
                            {importMutation.isPending ? (
                              <ActivityIndicator size="small" color="#000" />
                            ) : (
                              <>
                                <Download size={18} color="#000" />
                                <Text className="text-black font-bold ml-2">
                                  Import Habits
                                </Text>
                              </>
                            )}
                          </TouchableOpacity>
                        )}
                      </>
                    ) : (
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation();
                          handlePurchase(template);
                        }}
                        disabled={purchaseMutation.isPending}
                        className="flex-1 bg-[#00D4FF] rounded-xl py-3 flex-row items-center justify-center"
                      >
                        {purchaseMutation.isPending ? (
                          <ActivityIndicator size="small" color="#000" />
                        ) : (
                          <>
                            <ShoppingBag size={18} color="#000" />
                            <Text className="text-black font-bold ml-2">
                              ${template.price.toFixed(2)}
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
          </ScrollView>
        )}

        {/* Template Detail Modal */}
        <Modal
          visible={showDetailModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowDetailModal(false)}
        >
          <View className="flex-1 bg-[#0A0F1C]">
            <SafeAreaView edges={["top"]} className="flex-1">
              {selectedTemplate && (
                <>
                  {/* Modal Header */}
                  <View className="px-6 py-4 border-b border-white/10 flex-row items-center justify-between">
                    <Text className="text-white text-2xl font-bold flex-1">
                      {selectedTemplate.title}
                    </Text>
                    <TouchableOpacity
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setShowDetailModal(false);
                      }}
                      className="ml-4"
                    >
                      <X size={28} color="#fff" />
                    </TouchableOpacity>
                  </View>

                  {/* Modal Content */}
                  <ScrollView className="flex-1 px-6 py-4">
                    {/* Template Info */}
                    <View className="bg-white/5 rounded-2xl p-5 mb-4 border border-white/10">
                      <View className="flex-row items-center mb-3">
                        <Text className="text-3xl mr-3">
                          {CATEGORY_LABELS[selectedTemplate.category].emoji}
                        </Text>
                        <View className="flex-1">
                          <Text className="text-white/60 text-sm">
                            {CATEGORY_LABELS[selectedTemplate.category].label}
                          </Text>
                          {selectedTemplate.isPremium && (
                            <View className="flex-row items-center mt-1">
                              <Sparkles size={12} color="#FFC107" />
                              <Text className="text-[#FFC107] text-xs ml-1 font-semibold">
                                PREMIUM TEMPLATE
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                      <Text className="text-white/80 text-base leading-6">
                        {selectedTemplate.description}
                      </Text>

                      {/* Stats Row */}
                      <View className="flex-row items-center mt-4 pt-4 border-t border-white/10">
                        <View className="flex-row items-center mr-6">
                          <Clock size={16} color="#00D4FF" />
                          <Text className="text-white/60 text-sm ml-2">
                            {selectedTemplate.habits.length} habits
                          </Text>
                        </View>
                        <View className="flex-row items-center mr-6">
                          <TrendingUp size={16} color="#4CAF50" />
                          <Text className="text-white/60 text-sm ml-2">
                            {selectedTemplate.usageCount} users
                          </Text>
                        </View>
                        <View className="flex-row items-center ml-auto">
                          <ShoppingBag size={16} color="#FFD700" />
                          <Text className="text-[#FFD700] text-lg font-bold ml-2">
                            ${selectedTemplate.price.toFixed(2)}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Habits List */}
                    <View className="mb-4">
                      <Text className="text-white text-xl font-bold mb-3">
                        Included Habits ({selectedTemplate.habits.length})
                      </Text>
                      {selectedTemplate.habits.map((habit, index) => (
                        <View
                          key={habit.id}
                          className="bg-white/5 rounded-xl p-4 mb-2 border border-white/10"
                        >
                          <View className="flex-row items-start">
                            <View className="bg-[#00D4FF]/20 w-8 h-8 rounded-full items-center justify-center mr-3">
                              <Text className="text-[#00D4FF] font-bold">
                                {index + 1}
                              </Text>
                            </View>
                            <View className="flex-1">
                              <Text className="text-white font-semibold text-base mb-1">
                                {habit.title}
                              </Text>
                              {habit.description && (
                                <Text className="text-white/60 text-sm mb-2">
                                  {habit.description}
                                </Text>
                              )}
                              <View className="flex-row items-center flex-wrap gap-2">
                                <View className="bg-white/10 px-2 py-1 rounded-md">
                                  <Text className="text-white/70 text-xs">
                                    {habit.category}
                                  </Text>
                                </View>
                                {habit.timeOfDay && habit.timeOfDay !== 'anytime' && (
                                  <View className="bg-[#00D4FF]/20 px-2 py-1 rounded-md">
                                    <Text className="text-[#00D4FF] text-xs">
                                      {habit.timeOfDay}
                                    </Text>
                                  </View>
                                )}
                                <View className="bg-white/10 px-2 py-1 rounded-md">
                                  <Text className="text-white/70 text-xs">
                                    {habit.frequency}
                                  </Text>
                                </View>
                              </View>
                            </View>
                          </View>
                        </View>
                      ))}
                    </View>
                  </ScrollView>

                  {/* Modal Actions */}
                  <View className="px-6 py-4 border-t border-white/10">
                    {selectedTemplate.isPurchased ? (
                      selectedTemplate.isImported ? (
                        <View className="bg-green-500/20 border border-green-500/30 rounded-xl py-4 flex-row items-center justify-center">
                          <Check size={20} color="#4CAF50" />
                          <Text className="text-green-500 font-bold ml-2 text-lg">
                            Already Imported
                          </Text>
                        </View>
                      ) : (
                        <TouchableOpacity
                          onPress={() => {
                            setShowDetailModal(false);
                            handleImport(selectedTemplate);
                          }}
                          disabled={importMutation.isPending}
                          className="bg-[#00D4FF] rounded-xl py-4 flex-row items-center justify-center"
                        >
                          {importMutation.isPending ? (
                            <ActivityIndicator size="small" color="#000" />
                          ) : (
                            <>
                              <Download size={20} color="#000" />
                              <Text className="text-black font-bold ml-2 text-lg">
                                Import {selectedTemplate.habits.length} Habits
                              </Text>
                            </>
                          )}
                        </TouchableOpacity>
                      )
                    ) : (
                      <TouchableOpacity
                        onPress={() => {
                          setShowDetailModal(false);
                          handlePurchase(selectedTemplate);
                        }}
                        disabled={purchaseMutation.isPending}
                        className="bg-[#00D4FF] rounded-xl py-4 flex-row items-center justify-center"
                      >
                        {purchaseMutation.isPending ? (
                          <ActivityIndicator size="small" color="#000" />
                        ) : (
                          <>
                            <ShoppingBag size={20} color="#000" />
                            <Text className="text-black font-bold ml-2 text-lg">
                              Purchase for ${selectedTemplate.price.toFixed(2)}
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                </>
              )}
            </SafeAreaView>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
}
