import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Pressable,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  MapPin,
  Plus,
  Trash2,
  X,
  Bell,
  Sparkles,
  Navigation,
  Clock,
  ArrowLeft,
  ChevronRight,
  LogIn,
  LogOut,
  Timer,
  CheckCircle,
  XCircle,
  Edit3,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
// Note: react-native-maps requires native code and cannot be used in this environment
// Using a coordinate-based location picker instead
import * as Location from "expo-location";
import { api } from "@/lib/habitApi";
import { GlassCard } from "@/components/GlassCard";
import { useGeofences } from "@/hooks/useLocationFeatures";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import { useSession } from "@/lib/useSession";

interface Geofence {
  id: string;
  name: string;
  category: string;
  latitude: number;
  longitude: number;
  radius: number;
  linkedHabits?: string[];
  linkedTodos?: string[];
  onEnter?: string | null;
  onExit?: string | null;
  isActive: boolean;
  visitCount: number;
}

interface LocationReminder {
  id: string;
  geofenceId: string | null;
  title: string;
  message: string;
  triggerType: "on_enter" | "on_exit" | "on_stay" | "nearby";
  priority: "low" | "medium" | "high";
  isActive: boolean;
  geofence?: { name: string } | null;
}

interface LocationSuggestion {
  id: string;
  name: string;
  category: string;
  latitude: number;
  longitude: number;
  reason: string;
  confidence: number;
}

type TabKey = "locations" | "reminders" | "suggestions";

const TRIGGER_ICONS: Record<string, typeof LogIn> = {
  on_enter: LogIn,
  on_exit: LogOut,
  on_stay: Timer,
  nearby: Navigation,
};

const TRIGGER_LABELS: Record<string, string> = {
  on_enter: "On Enter",
  on_exit: "On Exit",
  on_stay: "On Stay",
  nearby: "Nearby",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "#10B981",
  medium: "#FFD700",
  high: "#FF6B6B",
};

const CATEGORY_COLORS: Record<string, string> = {
  home: "#00D4FF",
  work: "#8B5CF6",
  fitness: "#FF6B6B",
  social: "#FF8C00",
  errands: "#10B981",
  other: "#A0AEC0",
};

export default function LocationReminderScreen() {
  const navigation = useNavigation();
  const { data: session } = useSession();
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [reminders, setReminders] = useState<LocationReminder[]>([]);
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentLocation, setCurrentLocation] = useState<Location.LocationObject | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddReminderModal, setShowAddReminderModal] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("locations");
  const [generatingSuggestions, setGeneratingSuggestions] = useState(false);
  const [editingGeofence, setEditingGeofence] = useState<Geofence | null>(null);

  // New geofence form
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("home");
  const [newRadius, setNewRadius] = useState("100");
  const [newOnEnter, setNewOnEnter] = useState("");
  const [newOnExit, setNewOnExit] = useState("");
  const [mapLocation, setMapLocation] = useState({ latitude: 37.78825, longitude: -122.4324 });

  // New reminder form
  const [reminderTitle, setReminderTitle] = useState("");
  const [reminderMessage, setReminderMessage] = useState("");
  const [reminderTriggerType, setReminderTriggerType] = useState<"on_enter" | "on_exit" | "on_stay" | "nearby">("on_enter");
  const [reminderPriority, setReminderPriority] = useState<"low" | "medium" | "high">("medium");
  const [reminderGeofenceId, setReminderGeofenceId] = useState<string | null>(null);

  const { addGeofence, removeGeofence, getCurrentLocation } = useGeofences();

  const requireAuth = () => {
    if (!session) {
      Alert.alert("Sign In Required", "Please sign in to manage your locations and reminders.");
      return false;
    }
    return true;
  };

  useEffect(() => {
    loadAllData();
    loadCurrentLocation();
  }, []);

  const loadCurrentLocation = async () => {
    try {
      const location = await getCurrentLocation();
      if (location) {
        setCurrentLocation(location);
        setMapLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      }
    } catch (error) {
      console.error("Failed to get current location:", error);
    }
  };

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [geofencesRes, remindersRes, suggestionsRes] = await Promise.all([
        api.getGeofences(),
        api.getLocationReminders().catch(() => ({ reminders: [] })),
        api.getLocationSuggestions().catch(() => ({ suggestions: [] })),
      ]);
      setGeofences(geofencesRes.geofences);
      setReminders(remindersRes.reminders || []);
      setSuggestions(suggestionsRes.suggestions || []);
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddGeofence = async () => {
    if (!requireAuth()) return;
    if (!newName.trim()) {
      Alert.alert("Error", "Please enter a name for this location");
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await addGeofence(newName, newCategory, mapLocation.latitude, mapLocation.longitude, {
        radius: parseInt(newRadius) || 100,
        onEnter: newOnEnter || undefined,
        onExit: newOnExit || undefined,
      });

      setNewName("");
      setNewCategory("home");
      setNewRadius("100");
      setNewOnEnter("");
      setNewOnExit("");
      setShowAddModal(false);
      await loadAllData();
    } catch (error) {
      console.error("Failed to add geofence:", error);
      Alert.alert("Error", "Failed to create location");
    }
  };

  const handleEditGeofence = async () => {
    if (!requireAuth()) return;
    if (!editingGeofence || !newName.trim()) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await api.updateGeofence(editingGeofence.id, {
        name: newName,
        category: newCategory,
        radius: parseInt(newRadius) || 100,
        onEnter: newOnEnter || undefined,
        onExit: newOnExit || undefined,
      });

      setEditingGeofence(null);
      setNewName("");
      setNewCategory("home");
      setNewRadius("100");
      setNewOnEnter("");
      setNewOnExit("");
      setShowAddModal(false);
      await loadAllData();
    } catch (error) {
      console.warn("Failed to update geofence:", error);
      Alert.alert("Error", "Failed to update location");
    }
  };

  const handleAddReminder = async () => {
    if (!requireAuth()) return;
    if (!reminderTitle.trim() || !reminderMessage.trim()) {
      Alert.alert("Error", "Please enter title and message");
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await api.createLocationReminder({
        geofenceId: reminderGeofenceId || undefined,
        title: reminderTitle,
        message: reminderMessage,
        triggerType: reminderTriggerType,
        priority: reminderPriority,
      });

      setReminderTitle("");
      setReminderMessage("");
      setReminderTriggerType("on_enter");
      setReminderPriority("medium");
      setReminderGeofenceId(null);
      setShowAddReminderModal(false);
      await loadAllData();
    } catch (error) {
      console.error("Failed to add reminder:", error);
      Alert.alert("Error", "Failed to create reminder");
    }
  };

  const handleDeleteGeofence = async (geofenceId: string) => {
    if (!requireAuth()) return;
    Alert.alert("Delete Location", "Remove this location and its reminders?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await removeGeofence(geofenceId);
            await loadAllData();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch (error) {
            Alert.alert("Error", "Failed to delete location");
          }
        },
      },
    ]);
  };

  const handleDeleteReminder = async (reminderId: string) => {
    if (!requireAuth()) return;
    Alert.alert("Delete Reminder", "Remove this reminder?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await api.deleteLocationReminder(reminderId);
            await loadAllData();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch (error) {
            Alert.alert("Error", "Failed to delete reminder");
          }
        },
      },
    ]);
  };

  const handleAcceptSuggestion = async (suggestion: LocationSuggestion) => {
    if (!requireAuth()) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await api.acceptLocationSuggestion(suggestion.id, {
        name: suggestion.name,
        category: suggestion.category,
      });
      await loadAllData();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error("Failed to accept suggestion:", error);
      Alert.alert("Error", "Failed to accept suggestion");
    }
  };

  const handleDismissSuggestion = async (suggestionId: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await api.dismissLocationSuggestion(suggestionId);
      setSuggestions((prev) => prev.filter((s) => s.id !== suggestionId));
    } catch (error) {
      console.error("Failed to dismiss suggestion:", error);
    }
  };

  const handleGenerateSuggestions = async () => {
    try {
      setGeneratingSuggestions(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await api.generateLocationSuggestions();
      await loadAllData();
    } catch (error) {
      console.error("Failed to generate suggestions:", error);
    } finally {
      setGeneratingSuggestions(false);
    }
  };

  const openEditGeofence = (geo: Geofence) => {
    setEditingGeofence(geo);
    setNewName(geo.name);
    setNewCategory(geo.category);
    setNewRadius(String(geo.radius));
    setNewOnEnter(geo.onEnter || "");
    setNewOnExit(geo.onExit || "");
    setMapLocation({ latitude: geo.latitude, longitude: geo.longitude });
    setShowAddModal(true);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#050813" }}>
        <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#00D4FF" />
            <Text className="text-white/60 mt-4">Loading locations...</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // ---- ADD / EDIT GEOFENCE MODAL ----
  if (showAddModal) {
    return (
      <View style={{ flex: 1, backgroundColor: "#050813" }}>
        <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
          <ScrollView className="flex-1 px-5">
            <View className="flex-row items-center justify-between py-4">
              <Text className="text-2xl font-bold text-white">
                {editingGeofence ? "Edit Location" : "Add Location"}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowAddModal(false);
                  setEditingGeofence(null);
                  setNewName("");
                  setNewCategory("home");
                  setNewRadius("100");
                  setNewOnEnter("");
                  setNewOnExit("");
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                className="w-10 h-10 items-center justify-center rounded-full bg-white/10"
              >
                <X size={20} color="#FFF" />
              </TouchableOpacity>
            </View>

            {/* Location Coordinates Display */}
            <View className="rounded-2xl overflow-hidden mb-4 bg-white/5 border border-white/10 p-4">
              <View className="flex-row items-center justify-center gap-3 mb-4">
                <View className="w-12 h-12 rounded-full bg-cyan-500/20 items-center justify-center">
                  <MapPin size={24} color="#00D4FF" />
                </View>
                <View>
                  <Text className="text-white/40 text-xs">Selected Location</Text>
                  <Text className="text-white font-mono text-sm">
                    {mapLocation.latitude.toFixed(6)}, {mapLocation.longitude.toFixed(6)}
                  </Text>
                </View>
              </View>

              <Pressable
                onPress={async () => {
                  const loc = await getCurrentLocation();
                  if (loc) {
                    setMapLocation({
                      latitude: loc.coords.latitude,
                      longitude: loc.coords.longitude,
                    });
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  }
                }}
                className="active:scale-95"
              >
                <View className="bg-cyan-500/15 border border-cyan-500/30 rounded-xl py-3 items-center flex-row justify-center gap-2">
                  <Navigation size={16} color="#00D4FF" />
                  <Text className="text-cyan-400 font-semibold text-sm">Use Current Location</Text>
                </View>
              </Pressable>
            </View>

            <View className="mb-4">
              <Text className="text-white/60 text-xs font-semibold mb-2 tracking-wider">NAME</Text>
              <TextInput
                value={newName}
                onChangeText={setNewName}
                placeholder="e.g., Home, Gym, Office"
                placeholderTextColor="rgba(255,255,255,0.25)"
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white text-base"
              />
            </View>

            <View className="mb-4">
              <Text className="text-white/60 text-xs font-semibold mb-2 tracking-wider">CATEGORY</Text>
              <View className="flex-row flex-wrap gap-2">
                {["home", "work", "fitness", "social", "errands", "other"].map((cat) => (
                  <Pressable
                    key={cat}
                    onPress={() => {
                      setNewCategory(cat);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    className="active:scale-95"
                  >
                    <View
                      className={`px-4 py-2.5 rounded-full border ${
                        newCategory === cat
                          ? "border-cyan-500"
                          : "border-white/10"
                      }`}
                      style={{
                        backgroundColor: newCategory === cat
                          ? `${CATEGORY_COLORS[cat] || "#00D4FF"}15`
                          : "rgba(255,255,255,0.03)",
                      }}
                    >
                      <Text
                        className="text-sm font-medium"
                        style={{
                          color: newCategory === cat
                            ? CATEGORY_COLORS[cat] || "#00D4FF"
                            : "rgba(255,255,255,0.5)",
                        }}
                      >
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            </View>

            <View className="mb-4">
              <Text className="text-white/60 text-xs font-semibold mb-2 tracking-wider">RADIUS (METERS)</Text>
              <TextInput
                value={newRadius}
                onChangeText={setNewRadius}
                placeholder="100"
                keyboardType="numeric"
                placeholderTextColor="rgba(255,255,255,0.25)"
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white text-base"
              />
            </View>

            <View className="mb-4">
              <Text className="text-white/60 text-xs font-semibold mb-2 tracking-wider">ON ENTER MESSAGE</Text>
              <TextInput
                value={newOnEnter}
                onChangeText={setNewOnEnter}
                placeholder="e.g., Time to work out!"
                placeholderTextColor="rgba(255,255,255,0.25)"
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white text-base"
                multiline
              />
            </View>

            <View className="mb-6">
              <Text className="text-white/60 text-xs font-semibold mb-2 tracking-wider">ON EXIT MESSAGE</Text>
              <TextInput
                value={newOnExit}
                onChangeText={setNewOnExit}
                placeholder="e.g., Great workout!"
                placeholderTextColor="rgba(255,255,255,0.25)"
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white text-base"
                multiline
              />
            </View>

            <Pressable
              onPress={editingGeofence ? handleEditGeofence : handleAddGeofence}
              className="mb-10 active:scale-[0.97]"
            >
              <LinearGradient
                colors={["#00D4FF", "#8B5CF6"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ borderRadius: 16, padding: 16, alignItems: "center" }}
              >
                <Text className="text-white font-bold text-lg">
                  {editingGeofence ? "Update Location" : "Create Location"}
                </Text>
              </LinearGradient>
            </Pressable>
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  // ---- ADD REMINDER MODAL ----
  const renderAddReminderModal = () => (
    <Modal visible={showAddReminderModal} animationType="slide" presentationStyle="pageSheet">
      <View style={{ flex: 1, backgroundColor: "#050813" }}>
        <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
          <ScrollView className="flex-1 px-5">
            <View className="flex-row items-center justify-between py-4">
              <Text className="text-2xl font-bold text-white">New Reminder</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowAddReminderModal(false);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                className="w-10 h-10 items-center justify-center rounded-full bg-white/10"
              >
                <X size={20} color="#FFF" />
              </TouchableOpacity>
            </View>

            <View className="mb-4">
              <Text className="text-white/60 text-xs font-semibold mb-2 tracking-wider">TITLE</Text>
              <TextInput
                value={reminderTitle}
                onChangeText={setReminderTitle}
                placeholder="e.g., Start workout routine"
                placeholderTextColor="rgba(255,255,255,0.25)"
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white text-base"
              />
            </View>

            <View className="mb-4">
              <Text className="text-white/60 text-xs font-semibold mb-2 tracking-wider">MESSAGE</Text>
              <TextInput
                value={reminderMessage}
                onChangeText={setReminderMessage}
                placeholder="What should the reminder say?"
                placeholderTextColor="rgba(255,255,255,0.25)"
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white text-base"
                multiline
                style={{ minHeight: 80 }}
              />
            </View>

            <View className="mb-4">
              <Text className="text-white/60 text-xs font-semibold mb-2 tracking-wider">LINKED LOCATION</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row gap-2">
                  <Pressable
                    onPress={() => {
                      setReminderGeofenceId(null);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    className="active:scale-95"
                  >
                    <View
                      className={`px-4 py-2.5 rounded-full border ${
                        reminderGeofenceId === null ? "border-cyan-500 bg-cyan-500/15" : "border-white/10 bg-white/3"
                      }`}
                    >
                      <Text className={reminderGeofenceId === null ? "text-cyan-400 text-sm font-medium" : "text-white/50 text-sm"}>
                        Any Location
                      </Text>
                    </View>
                  </Pressable>
                  {geofences.map((geo) => (
                    <Pressable
                      key={geo.id}
                      onPress={() => {
                        setReminderGeofenceId(geo.id);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                      className="active:scale-95"
                    >
                      <View
                        className={`px-4 py-2.5 rounded-full border ${
                          reminderGeofenceId === geo.id ? "border-cyan-500 bg-cyan-500/15" : "border-white/10"
                        }`}
                        style={{ backgroundColor: reminderGeofenceId === geo.id ? undefined : "rgba(255,255,255,0.03)" }}
                      >
                        <Text className={reminderGeofenceId === geo.id ? "text-cyan-400 text-sm font-medium" : "text-white/50 text-sm"}>
                          {geo.name}
                        </Text>
                      </View>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            </View>

            <View className="mb-4">
              <Text className="text-white/60 text-xs font-semibold mb-2 tracking-wider">TRIGGER</Text>
              <View className="flex-row flex-wrap gap-2">
                {(["on_enter", "on_exit", "on_stay", "nearby"] as const).map((trigger) => {
                  const Icon = TRIGGER_ICONS[trigger];
                  return (
                    <Pressable
                      key={trigger}
                      onPress={() => {
                        setReminderTriggerType(trigger);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                      className="active:scale-95"
                    >
                      <View
                        className={`flex-row items-center px-4 py-2.5 rounded-full border ${
                          reminderTriggerType === trigger ? "border-cyan-500 bg-cyan-500/15" : "border-white/10"
                        }`}
                        style={{ backgroundColor: reminderTriggerType === trigger ? undefined : "rgba(255,255,255,0.03)" }}
                      >
                        <Icon size={14} color={reminderTriggerType === trigger ? "#00D4FF" : "rgba(255,255,255,0.4)"} />
                        <Text
                          className={`ml-2 text-sm font-medium ${
                            reminderTriggerType === trigger ? "text-cyan-400" : "text-white/50"
                          }`}
                        >
                          {TRIGGER_LABELS[trigger]}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View className="mb-6">
              <Text className="text-white/60 text-xs font-semibold mb-2 tracking-wider">PRIORITY</Text>
              <View className="flex-row gap-2">
                {(["low", "medium", "high"] as const).map((p) => (
                  <Pressable
                    key={p}
                    onPress={() => {
                      setReminderPriority(p);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    className="flex-1 active:scale-95"
                  >
                    <View
                      className={`py-3 rounded-xl border items-center ${
                        reminderPriority === p ? "border-transparent" : "border-white/10"
                      }`}
                      style={{
                        backgroundColor: reminderPriority === p
                          ? `${PRIORITY_COLORS[p]}20`
                          : "rgba(255,255,255,0.03)",
                      }}
                    >
                      <Text
                        className="text-sm font-semibold capitalize"
                        style={{ color: reminderPriority === p ? PRIORITY_COLORS[p] : "rgba(255,255,255,0.5)" }}
                      >
                        {p}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            </View>

            <Pressable onPress={handleAddReminder} className="mb-10 active:scale-[0.97]">
              <LinearGradient
                colors={["#00D4FF", "#8B5CF6"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ borderRadius: 16, padding: 16, alignItems: "center" }}
              >
                <Text className="text-white font-bold text-lg">Create Reminder</Text>
              </LinearGradient>
            </Pressable>
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );

  // ---- TAB: LOCATIONS ----
  const renderLocationsTab = () => (
    <>
      {currentLocation && geofences.length > 0 && (
        <View className="rounded-2xl overflow-hidden mb-4 mx-5 bg-white/5 border border-white/10 p-4">
          <View className="flex-row items-center gap-3 mb-3">
            <View className="w-10 h-10 rounded-full bg-cyan-500/20 items-center justify-center">
              <Navigation size={20} color="#00D4FF" />
            </View>
            <View>
              <Text className="text-white/40 text-xs">Your Current Location</Text>
              <Text className="text-white font-mono text-xs">
                {currentLocation.coords.latitude.toFixed(4)}, {currentLocation.coords.longitude.toFixed(4)}
              </Text>
            </View>
          </View>
          <Text className="text-white/30 text-xs">{geofences.length} saved {geofences.length === 1 ? 'location' : 'locations'}</Text>
        </View>
      )}

      {geofences.length === 0 ? (
        <View className="mx-5 items-center py-16">
          <View className="bg-white/5 p-6 rounded-full mb-5">
            <MapPin size={40} color="rgba(255,255,255,0.15)" />
          </View>
          <Text className="text-white/70 text-lg font-semibold mb-2">No locations yet</Text>
          <Text className="text-white/40 text-center text-sm mb-6">
            Add your key locations to get smart{"\n"}reminders and track patterns.
          </Text>
          <Pressable
            onPress={() => {
              setShowAddModal(true);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }}
            className="active:scale-95"
          >
            <LinearGradient
              colors={["#00D4FF", "#8B5CF6"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24 }}
            >
              <Text className="text-white font-semibold">Add Your First Location</Text>
            </LinearGradient>
          </Pressable>
        </View>
      ) : (
        <View className="px-5">
          {geofences.map((geo) => (
            <GlassCard key={geo.id} className="p-4 mb-3">
              <View className="flex-row items-start justify-between">
                <Pressable className="flex-1" onPress={() => openEditGeofence(geo)}>
                  <View className="flex-row items-center gap-2.5 mb-2">
                    <View
                      className="w-8 h-8 rounded-full items-center justify-center"
                      style={{ backgroundColor: `${CATEGORY_COLORS[geo.category] || "#8B5CF6"}20` }}
                    >
                      <MapPin size={16} color={CATEGORY_COLORS[geo.category] || "#8B5CF6"} />
                    </View>
                    <View className="flex-1">
                      <Text className="text-white font-bold text-base">{geo.name}</Text>
                      <Text className="text-white/40 text-xs mt-0.5">
                        {geo.category} · {geo.radius}m · {geo.visitCount} visits
                      </Text>
                    </View>
                  </View>

                  {geo.onEnter && (
                    <View className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2 mb-1.5 ml-10">
                      <Text className="text-emerald-400 text-xs">{geo.onEnter}</Text>
                    </View>
                  )}
                  {geo.onExit && (
                    <View className="bg-orange-500/10 border border-orange-500/20 rounded-lg px-3 py-2 ml-10">
                      <Text className="text-orange-400 text-xs">{geo.onExit}</Text>
                    </View>
                  )}
                </Pressable>

                <View className="flex-row gap-1 ml-2">
                  <Pressable
                    onPress={() => openEditGeofence(geo)}
                    className="p-2 bg-white/5 rounded-lg active:bg-white/10"
                  >
                    <Edit3 size={16} color="rgba(255,255,255,0.4)" />
                  </Pressable>
                  <Pressable
                    onPress={() => handleDeleteGeofence(geo.id)}
                    className="p-2 bg-red-500/10 rounded-lg active:bg-red-500/20"
                  >
                    <Trash2 size={16} color="#FF6B6B" />
                  </Pressable>
                </View>
              </View>
            </GlassCard>
          ))}
        </View>
      )}
    </>
  );

  // ---- TAB: REMINDERS ----
  const renderRemindersTab = () => (
    <View className="px-5">
      {reminders.length === 0 ? (
        <View className="items-center py-16">
          <View className="bg-white/5 p-6 rounded-full mb-5">
            <Bell size={40} color="rgba(255,255,255,0.15)" />
          </View>
          <Text className="text-white/70 text-lg font-semibold mb-2">No reminders yet</Text>
          <Text className="text-white/40 text-center text-sm mb-6">
            Create reminders that trigger when you{"\n"}arrive at or leave a location.
          </Text>
          <Pressable
            onPress={() => {
              setShowAddReminderModal(true);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }}
            className="active:scale-95"
          >
            <LinearGradient
              colors={["#00D4FF", "#8B5CF6"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24 }}
            >
              <Text className="text-white font-semibold">Create a Reminder</Text>
            </LinearGradient>
          </Pressable>
        </View>
      ) : (
        reminders.map((reminder) => {
          const TriggerIcon = TRIGGER_ICONS[reminder.triggerType] || Bell;
          return (
            <GlassCard key={reminder.id} className="p-4 mb-3">
              <View className="flex-row items-start justify-between">
                <View className="flex-1">
                  <View className="flex-row items-center gap-2.5 mb-2">
                    <View
                      className="w-8 h-8 rounded-full items-center justify-center"
                      style={{ backgroundColor: `${PRIORITY_COLORS[reminder.priority]}20` }}
                    >
                      <TriggerIcon size={16} color={PRIORITY_COLORS[reminder.priority]} />
                    </View>
                    <View className="flex-1">
                      <Text className="text-white font-bold text-base">{reminder.title}</Text>
                      <View className="flex-row items-center gap-2 mt-0.5">
                        <Text
                          className="text-xs font-semibold"
                          style={{ color: PRIORITY_COLORS[reminder.priority] }}
                        >
                          {reminder.priority.toUpperCase()}
                        </Text>
                        <Text className="text-white/30 text-xs">·</Text>
                        <Text className="text-white/40 text-xs">
                          {TRIGGER_LABELS[reminder.triggerType]}
                        </Text>
                        {reminder.geofence?.name && (
                          <>
                            <Text className="text-white/30 text-xs">·</Text>
                            <Text className="text-white/40 text-xs">{reminder.geofence.name}</Text>
                          </>
                        )}
                      </View>
                    </View>
                  </View>

                  <Text className="text-white/60 text-sm ml-10">{reminder.message}</Text>
                </View>

                <Pressable
                  onPress={() => handleDeleteReminder(reminder.id)}
                  className="p-2 bg-red-500/10 rounded-lg ml-2 active:bg-red-500/20"
                >
                  <Trash2 size={16} color="#FF6B6B" />
                </Pressable>
              </View>
            </GlassCard>
          );
        })
      )}
    </View>
  );

  // ---- TAB: SUGGESTIONS ----
  const renderSuggestionsTab = () => (
    <View className="px-5">
      <Pressable
        onPress={handleGenerateSuggestions}
        disabled={generatingSuggestions}
        className="mb-4 active:scale-[0.97]"
      >
        <View className="border border-violet-500/30 bg-violet-500/10 rounded-xl py-3 items-center flex-row justify-center gap-2">
          {generatingSuggestions ? (
            <ActivityIndicator size="small" color="#8B5CF6" />
          ) : (
            <Sparkles size={16} color="#8B5CF6" />
          )}
          <Text className="text-violet-400 font-semibold text-sm">
            {generatingSuggestions ? "Analyzing patterns..." : "Generate New Suggestions"}
          </Text>
        </View>
      </Pressable>

      {suggestions.length === 0 ? (
        <View className="items-center py-12">
          <View className="bg-white/5 p-6 rounded-full mb-5">
            <Sparkles size={40} color="rgba(255,255,255,0.15)" />
          </View>
          <Text className="text-white/70 text-lg font-semibold mb-2">No suggestions yet</Text>
          <Text className="text-white/40 text-center text-sm">
            Use the app for a few days and we&apos;ll{"\n"}detect your location patterns.
          </Text>
        </View>
      ) : (
        suggestions.map((suggestion) => (
          <GlassCard key={suggestion.id} className="p-4 mb-3">
            <View className="flex-row items-center gap-2.5 mb-3">
              <View className="w-8 h-8 rounded-full bg-violet-500/20 items-center justify-center">
                <Sparkles size={16} color="#8B5CF6" />
              </View>
              <View className="flex-1">
                <Text className="text-white font-bold text-base">{suggestion.name}</Text>
                <Text className="text-white/40 text-xs mt-0.5">
                  {suggestion.category} · {Math.round(suggestion.confidence * 100)}% confidence
                </Text>
              </View>
            </View>

            <Text className="text-white/60 text-sm mb-4 ml-10">{suggestion.reason}</Text>

            <View className="flex-row gap-2 ml-10">
              <Pressable
                onPress={() => handleAcceptSuggestion(suggestion)}
                className="flex-1 active:scale-95"
              >
                <View className="bg-emerald-500/15 border border-emerald-500/30 rounded-xl py-2.5 items-center flex-row justify-center gap-1.5">
                  <CheckCircle size={14} color="#10B981" />
                  <Text className="text-emerald-400 font-semibold text-sm">Accept</Text>
                </View>
              </Pressable>
              <Pressable
                onPress={() => handleDismissSuggestion(suggestion.id)}
                className="flex-1 active:scale-95"
              >
                <View className="bg-white/5 border border-white/10 rounded-xl py-2.5 items-center flex-row justify-center gap-1.5">
                  <XCircle size={14} color="rgba(255,255,255,0.4)" />
                  <Text className="text-white/50 font-semibold text-sm">Dismiss</Text>
                </View>
              </Pressable>
            </View>
          </GlassCard>
        ))
      )}
    </View>
  );

  // ---- MAIN RENDER ----
  return (
    <View style={{ flex: 1, backgroundColor: "#050813" }}>
      <LinearGradient colors={["#050813", "#0A0F1C"]} style={{ flex: 1 }}>
        <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
          {/* Header */}
          <View className="flex-row items-center justify-between px-5 py-3">
            <View className="flex-row items-center">
              <Pressable
                onPress={() => navigation.goBack()}
                hitSlop={12}
                className="mr-3 active:opacity-60"
              >
                <ArrowLeft size={24} color="#FFF" />
              </Pressable>
              <View>
                <Text className="text-white text-2xl font-bold">Locations</Text>
                <Text className="text-white/40 text-xs mt-0.5">
                  {geofences.length} {geofences.length === 1 ? "place" : "places"} · {reminders.length} reminders
                </Text>
              </View>
            </View>
            <Pressable
              onPress={() => {
                if (activeTab === "reminders") {
                  setShowAddReminderModal(true);
                } else {
                  setShowAddModal(true);
                }
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              }}
              className="w-10 h-10 items-center justify-center rounded-full bg-cyan-500/15 active:bg-cyan-500/25"
            >
              <Plus size={22} color="#00D4FF" />
            </Pressable>
          </View>

          {/* Tabs */}
          <View className="flex-row mx-5 mb-4 bg-white/[0.04] rounded-xl p-1">
            {([
              { key: "locations" as TabKey, label: "Places", icon: MapPin },
              { key: "reminders" as TabKey, label: "Reminders", icon: Bell },
              { key: "suggestions" as TabKey, label: "AI Suggest", icon: Sparkles },
            ]).map(({ key, label, icon: Icon }) => (
              <Pressable
                key={key}
                onPress={() => {
                  setActiveTab(key);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                className="flex-1"
              >
                <View
                  className={`flex-row items-center justify-center py-2.5 rounded-lg gap-1.5 ${
                    activeTab === key ? "bg-white/10" : ""
                  }`}
                >
                  <Icon
                    size={14}
                    color={activeTab === key ? "#00D4FF" : "rgba(255,255,255,0.35)"}
                  />
                  <Text
                    className={`text-sm font-medium ${
                      activeTab === key ? "text-cyan-400" : "text-white/35"
                    }`}
                  >
                    {label}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>

          {/* Tab Content */}
          <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }}>
            {activeTab === "locations" && renderLocationsTab()}
            {activeTab === "reminders" && renderRemindersTab()}
            {activeTab === "suggestions" && renderSuggestionsTab()}
          </ScrollView>

          {renderAddReminderModal()}
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}
