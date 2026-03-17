import { useState, useEffect, useCallback } from "react";
import { View, Text, ScrollView, Pressable, Alert, RefreshControl } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { GlassCard } from "@/components/GlassCard";
import { api } from "@/lib/api";
import * as Haptics from "expo-haptics";
import { Archive, Trash2, RotateCcw, Shield, AlertTriangle } from "lucide-react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "Vault">;

interface ArchivedHabit {
  id: string;
  title: string;
  type?: string;
  color?: string;
  category?: string;
  protocolStatus?: "failed" | "archived" | "active" | "completed";
  failureReason?: string;
  protocolTarget?: number;
  protocolCompletions?: number;
  protocolWindowDays?: number;
  archivedAt?: string;
  createdAt?: string;
}

export default function VaultScreen({ navigation }: Props) {
  const [archivedHabits, setArchivedHabits] = useState<ArchivedHabit[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadArchivedHabits = async () => {
    try {
      const response = await api.get<any>("/api/habits/archived");
      setArchivedHabits(response.habits || []);
    } catch (error) {
      console.log("Failed to load archived habits");
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await loadArchivedHabits();
      setLoading(false);
    };
    init();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadArchivedHabits();
    setRefreshing(false);
  }, []);

  const handleRestore = async (habitId: string) => {
    try {
      await api.post(`/api/habits/${habitId}/restore`, {});
      await loadArchivedHabits();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.log("Failed to restore habit");
    }
  };

  const handlePermanentDelete = async (habitId: string) => {
    Alert.alert(
      "Permanent Delete",
      "This cannot be undone. Delete this habit forever?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Forever",
          style: "destructive",
          onPress: async () => {
            try {
              await api.delete(`/api/habits/${habitId}/permanent`);
              await loadArchivedHabits();
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (error) {
              console.log("Failed to delete habit");
            }
          },
        },
      ]
    );
  };

  const failedHabits = archivedHabits.filter(
    (h) => h.protocolStatus === "failed"
  );
  const archivedOnly = archivedHabits.filter(
    (h) => h.protocolStatus !== "failed"
  );

  const getTypeBadgeLabel = (type?: string): string => {
    switch (type?.toLowerCase()) {
      case "protocol":
        return "PROTOCOL";
      case "core":
        return "CORE";
      case "intention":
        return "INTENTION";
      default:
        return "STANDARD";
    }
  };

  const getTypeBadgeColor = (type?: string): string => {
    switch (type?.toLowerCase()) {
      case "protocol":
        return "#00D4FF";
      case "core":
        return "#8B5CF6";
      case "intention":
        return "#FFB800";
      default:
        return "#888";
    }
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return "Unknown date";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return "Unknown date";
    }
  };

  const renderHabitCard = (
    habit: ArchivedHabit,
    variant: "failed" | "archived"
  ) => {
    const isFailed = variant === "failed";
    const borderColor = isFailed
      ? "rgba(213,0,0,0.4)"
      : "rgba(136,136,136,0.3)";
    const statusLabel = isFailed ? "FAILED" : "ARCHIVED";
    const statusColor = isFailed ? "#D50000" : "#888";

    return (
      <GlassCard
        key={habit.id}
        className="mb-4 p-5"
        style={{ borderColor, borderWidth: 1 }}
      >
        {/* Title row */}
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-white text-lg font-bold flex-1 mr-3" numberOfLines={1}>
            {habit.title}
          </Text>
          <View
            style={{
              backgroundColor: `${statusColor}15`,
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: `${statusColor}40`,
            }}
          >
            <Text
              style={{
                color: statusColor,
                fontSize: 10,
                fontWeight: "900",
                letterSpacing: 1.5,
              }}
            >
              {statusLabel}
            </Text>
          </View>
        </View>

        {/* Type badge */}
        <View className="flex-row items-center mb-3">
          <View
            style={{
              backgroundColor: `${getTypeBadgeColor(habit.type)}15`,
              paddingHorizontal: 10,
              paddingVertical: 3,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: `${getTypeBadgeColor(habit.type)}30`,
            }}
          >
            <Text
              style={{
                color: getTypeBadgeColor(habit.type),
                fontSize: 9,
                fontWeight: "800",
                letterSpacing: 1.5,
              }}
            >
              {getTypeBadgeLabel(habit.type)}
            </Text>
          </View>
        </View>

        {/* Failed protocol info */}
        {isFailed && (
          <View className="mb-3">
            {habit.failureReason && (
              <View className="flex-row items-center mb-2">
                <AlertTriangle size={14} color="#D50000" />
                <Text className="text-red-400 text-sm ml-2" numberOfLines={2}>
                  {habit.failureReason}
                </Text>
              </View>
            )}
            {habit.protocolTarget != null && habit.protocolCompletions != null && (
              <Text className="text-white/40 text-xs">
                {habit.protocolCompletions}/{habit.protocolTarget} completions in{" "}
                {habit.protocolWindowDays ?? "?"} days
              </Text>
            )}
          </View>
        )}

        {/* Archived date */}
        {!isFailed && habit.archivedAt && (
          <View className="mb-3">
            <Text className="text-white/40 text-xs">
              Archived {formatDate(habit.archivedAt)}
            </Text>
          </View>
        )}

        {/* Action buttons */}
        <View className="flex-row" style={{ gap: 10 }}>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              handleRestore(habit.id);
            }}
            className="flex-1 active:scale-95"
            style={{
              height: 42,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: "rgba(0,212,255,0.5)",
              backgroundColor: "rgba(0,212,255,0.06)",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",
              gap: 6,
            }}
          >
            <RotateCcw size={14} color="#00D4FF" />
            <Text
              style={{
                color: "#00D4FF",
                fontSize: 12,
                fontWeight: "800",
                letterSpacing: 1,
              }}
            >
              RESTORE
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              handlePermanentDelete(habit.id);
            }}
            className="flex-1 active:scale-95"
            style={{
              height: 42,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: "rgba(213,0,0,0.5)",
              backgroundColor: "rgba(213,0,0,0.06)",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",
              gap: 6,
            }}
          >
            <Trash2 size={14} color="#D50000" />
            <Text
              style={{
                color: "#D50000",
                fontSize: 12,
                fontWeight: "800",
                letterSpacing: 1,
              }}
            >
              DELETE
            </Text>
          </Pressable>
        </View>
      </GlassCard>
    );
  };

  const isEmpty = archivedHabits.length === 0 && !loading;

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={["#050813", "#0A0F1C", "#0D1929"]}
        style={{ flex: 1 }}
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#00D4FF"
            />
          }
        >
          {/* Header */}
          <View className="px-5 pt-4 pb-6">
            <View className="flex-row items-center" style={{ gap: 10 }}>
              <Archive size={28} color="#00D4FF" />
              <Text className="text-white text-3xl font-bold" style={{ letterSpacing: 3 }}>
                VAULT
              </Text>
            </View>
            <Text className="text-white/50 text-sm mt-2" style={{ letterSpacing: 0.5 }}>
              Archived & Failed protocols
            </Text>
          </View>

          {/* Empty state */}
          {isEmpty && (
            <View className="items-center justify-center px-10 mt-20">
              <View
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 40,
                  backgroundColor: "rgba(255,255,255,0.04)",
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.08)",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 20,
                }}
              >
                <Shield size={32} color="rgba(255,255,255,0.2)" />
              </View>
              <Text className="text-white/30 text-lg font-semibold text-center">
                Nothing in the vault
              </Text>
              <Text className="text-white/20 text-sm text-center mt-2">
                Failed and archived habits will appear here
              </Text>
            </View>
          )}

          {/* Loading state */}
          {loading && (
            <View className="items-center justify-center mt-20">
              <Text className="text-white/40 text-sm">Loading vault...</Text>
            </View>
          )}

          {/* Failed Protocols Section */}
          {failedHabits.length > 0 && (
            <View className="px-5 mb-6">
              <View className="flex-row items-center mb-4" style={{ gap: 8 }}>
                <AlertTriangle size={16} color="#D50000" />
                <Text
                  className="text-red-400 text-xs font-bold"
                  style={{ letterSpacing: 2 }}
                >
                  FAILED PROTOCOLS
                </Text>
                <View
                  style={{
                    backgroundColor: "rgba(213,0,0,0.15)",
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: 10,
                  }}
                >
                  <Text
                    style={{
                      color: "#D50000",
                      fontSize: 11,
                      fontWeight: "800",
                    }}
                  >
                    {failedHabits.length}
                  </Text>
                </View>
              </View>
              {failedHabits.map((habit) => renderHabitCard(habit, "failed"))}
            </View>
          )}

          {/* Archived Section */}
          {archivedOnly.length > 0 && (
            <View className="px-5 mb-6">
              <View className="flex-row items-center mb-4" style={{ gap: 8 }}>
                <Archive size={16} color="#888" />
                <Text
                  className="text-white/50 text-xs font-bold"
                  style={{ letterSpacing: 2 }}
                >
                  ARCHIVED
                </Text>
                <View
                  style={{
                    backgroundColor: "rgba(136,136,136,0.15)",
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: 10,
                  }}
                >
                  <Text
                    style={{
                      color: "#888",
                      fontSize: 11,
                      fontWeight: "800",
                    }}
                  >
                    {archivedOnly.length}
                  </Text>
                </View>
              </View>
              {archivedOnly.map((habit) => renderHabitCard(habit, "archived"))}
            </View>
          )}
        </ScrollView>
      </LinearGradient>
    </View>
  );
}
