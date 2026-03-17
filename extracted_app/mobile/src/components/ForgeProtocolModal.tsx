/**
 * ForgeProtocolModal
 * A commitment contract modal for creating trial habit "Protocols"
 * with a target number of completions within a time window.
 */

import { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Modal,
  ScrollView,
  StyleSheet,
} from "react-native";
import * as Haptics from "expo-haptics";
import { X, Minus, Plus, Shield } from "lucide-react-native";

interface ForgeProtocolModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (data: {
    title: string;
    target: number;
    windowDays: number;
    color: string;
    category: string;
  }) => void;
}

const PROTOCOL_COLORS = [
  "#00D4FF",
  "#8B5CF6",
  "#FF00E5",
  "#00C853",
  "#FFB800",
  "#D50000",
];

const PROTOCOL_CATEGORIES = [
  "health",
  "mind",
  "work",
  "growth",
  "fitness",
  "mindfulness",
  "social",
  "leisure",
  "general",
];

export function ForgeProtocolModal({
  visible,
  onClose,
  onConfirm,
}: ForgeProtocolModalProps) {
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState(7);
  const [windowDays, setWindowDays] = useState(14);
  const [selectedColor, setSelectedColor] = useState(PROTOCOL_COLORS[0]);
  const [selectedCategory, setSelectedCategory] = useState("general");

  const clamp = (value: number, min: number, max: number): number =>
    Math.min(Math.max(value, min), max);

  const handleStepTarget = useCallback(
    (delta: number) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setTarget((prev) => clamp(prev + delta, 1, 365));
    },
    []
  );

  const handleStepWindow = useCallback(
    (delta: number) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setWindowDays((prev) => clamp(prev + delta, 1, 365));
    },
    []
  );

  const handleColorSelect = useCallback((color: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedColor(color);
  }, []);

  const handleCategorySelect = useCallback((category: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedCategory(category);
  }, []);

  const handleInitiate = () => {
    if (!title.trim()) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onConfirm({
      title: title.trim(),
      target,
      windowDays,
      color: selectedColor,
      category: selectedCategory,
    });
    // Reset form
    setTitle("");
    setTarget(7);
    setWindowDays(14);
    setSelectedColor(PROTOCOL_COLORS[0]);
    setSelectedCategory("general");
    onClose();
  };

  const handleCancel = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Close button */}
          <Pressable
            onPress={handleCancel}
            style={styles.closeButton}
            className="active:scale-90"
          >
            <X size={20} color="#666" />
          </Pressable>

          <ScrollView
            showsVerticalScrollIndicator={false}
            bounces={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Header */}
            <View style={styles.headerRow}>
              <Shield size={22} color="#00D4FF" />
              <Text style={styles.title}>FORGE PROTOCOL</Text>
            </View>
            <Text style={styles.subtitle}>
              Commit to a trial period. Hit your target or face the
              consequences.
            </Text>

            {/* Title Input */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>PROTOCOL TITLE</Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="Protocol title..."
                placeholderTextColor="rgba(255,255,255,0.25)"
                style={styles.textInput}
                autoCorrect={false}
              />
            </View>

            {/* Target Proofs Stepper */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>TARGET PROOFS</Text>
              <View style={styles.stepperRow}>
                <Pressable
                  onPress={() => handleStepTarget(-1)}
                  style={styles.stepperButton}
                  className="active:scale-95"
                >
                  <Minus size={18} color="#fff" />
                </Pressable>
                <View style={styles.stepperValueContainer}>
                  <Text style={styles.stepperValue}>{target}</Text>
                </View>
                <Pressable
                  onPress={() => handleStepTarget(1)}
                  style={styles.stepperButton}
                  className="active:scale-95"
                >
                  <Plus size={18} color="#fff" />
                </Pressable>
              </View>
            </View>

            {/* Window Days Stepper */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>WINDOW (DAYS)</Text>
              <View style={styles.stepperRow}>
                <Pressable
                  onPress={() => handleStepWindow(-1)}
                  style={styles.stepperButton}
                  className="active:scale-95"
                >
                  <Minus size={18} color="#fff" />
                </Pressable>
                <View style={styles.stepperValueContainer}>
                  <Text style={styles.stepperValue}>{windowDays}</Text>
                </View>
                <Pressable
                  onPress={() => handleStepWindow(1)}
                  style={styles.stepperButton}
                  className="active:scale-95"
                >
                  <Plus size={18} color="#fff" />
                </Pressable>
              </View>
            </View>

            {/* Summary */}
            <View style={styles.summaryContainer}>
              <Text style={styles.summaryText}>
                Complete{" "}
                <Text style={styles.summaryHighlight}>{target}</Text> times in{" "}
                <Text style={styles.summaryHighlight}>{windowDays}</Text> days
              </Text>
            </View>

            {/* Color Picker */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>COLOR</Text>
              <View style={styles.colorRow}>
                {PROTOCOL_COLORS.map((color) => {
                  const isSelected = selectedColor === color;
                  return (
                    <Pressable
                      key={color}
                      onPress={() => handleColorSelect(color)}
                      style={[
                        styles.colorCircle,
                        { backgroundColor: color },
                        isSelected && {
                          borderWidth: 3,
                          borderColor: "#fff",
                        },
                        !isSelected && { opacity: 0.5 },
                      ]}
                      className="active:scale-90"
                    />
                  );
                })}
              </View>
            </View>

            {/* Category Picker */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>CATEGORY</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoryScroll}
              >
                {PROTOCOL_CATEGORIES.map((cat) => {
                  const isSelected = selectedCategory === cat;
                  return (
                    <Pressable
                      key={cat}
                      onPress={() => handleCategorySelect(cat)}
                      style={[
                        styles.categoryChip,
                        isSelected && styles.categoryChipSelected,
                      ]}
                      className="active:scale-95"
                    >
                      <Text
                        style={[
                          styles.categoryChipText,
                          isSelected && styles.categoryChipTextSelected,
                        ]}
                      >
                        {cat.toUpperCase()}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* Initiate Button */}
            <Pressable
              onPress={handleInitiate}
              disabled={!title.trim()}
              style={[
                styles.initiateButton,
                !title.trim() && styles.initiateButtonDisabled,
              ]}
              className="active:scale-95"
            >
              <Text
                style={[
                  styles.initiateButtonText,
                  !title.trim() && styles.initiateButtonTextDisabled,
                ]}
              >
                INITIATE
              </Text>
            </Pressable>

            {/* Cancel Link */}
            <Pressable
              onPress={handleCancel}
              style={styles.cancelLink}
              className="active:opacity-60"
            >
              <Text style={styles.cancelLinkText}>CANCEL</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  card: {
    width: "100%",
    maxHeight: "85%",
    backgroundColor: "#0A0A0A",
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "rgba(0,212,255,0.2)",
    overflow: "hidden",
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 32,
  },
  closeButton: {
    position: "absolute",
    top: 16,
    right: 16,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
    marginTop: 4,
  },
  title: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: 3,
  },
  subtitle: {
    color: "#888",
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 28,
  },
  fieldGroup: {
    marginBottom: 22,
  },
  label: {
    color: "#888",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 2,
    marginBottom: 10,
    textTransform: "uppercase",
  },
  textInput: {
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 15,
    height: 50,
    paddingHorizontal: 16,
    color: "#fff",
    fontSize: 15,
  },
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  stepperButton: {
    width: 60,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#333",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  stepperValueContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperValue: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "900",
  },
  summaryContainer: {
    backgroundColor: "rgba(0,212,255,0.06)",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: "rgba(0,212,255,0.15)",
  },
  summaryText: {
    color: "#888",
    fontSize: 14,
    textAlign: "center",
  },
  summaryHighlight: {
    color: "#00D4FF",
    fontWeight: "900",
  },
  colorRow: {
    flexDirection: "row",
    gap: 14,
  },
  colorCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  categoryScroll: {
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#333",
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  categoryChipSelected: {
    borderColor: "#00D4FF",
    backgroundColor: "rgba(0,212,255,0.12)",
  },
  categoryChipText: {
    color: "#666",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
  },
  categoryChipTextSelected: {
    color: "#00D4FF",
  },
  initiateButton: {
    width: "100%",
    height: 52,
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: "#00D4FF",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,212,255,0.06)",
    marginTop: 6,
  },
  initiateButtonDisabled: {
    borderColor: "#333",
    backgroundColor: "transparent",
  },
  initiateButtonText: {
    color: "#00D4FF",
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 3,
  },
  initiateButtonTextDisabled: {
    color: "#444",
  },
  cancelLink: {
    alignItems: "center",
    paddingVertical: 16,
  },
  cancelLinkText: {
    color: "#555",
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 2,
  },
});
