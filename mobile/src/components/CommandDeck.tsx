/**
 * CommandDeck - Bottom-sheet action modal for nuanced habit logging
 *
 * Provides granular completion options: Verified, Partial, Skipped, Undo.
 * Obsidian ICE aesthetic - dark glassmorphism with haptic feedback.
 */

import { useRef, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  Animated,
  StyleSheet,
} from "react-native";
import * as Haptics from "expo-haptics";

type CommandQuality = "verified" | "partial" | "skipped" | "undo";

interface CommandDeckProps {
  visible: boolean;
  onClose: () => void;
  habitTitle: string;
  habitColor?: string;
  habitType?: "standard" | "protocol" | "core";
  todayLogged?: string | null;
  onCommand: (quality: CommandQuality) => void;
}

interface CommandAction {
  quality: CommandQuality;
  label: string;
  subtitle: string;
  borderColor: string;
  textColor: string;
}

const COMMANDS: CommandAction[] = [
  {
    quality: "verified",
    label: "VERIFIED",
    subtitle: "Completed fully",
    borderColor: "#00C853",
    textColor: "#00C853",
  },
  {
    quality: "partial",
    label: "PARTIAL",
    subtitle: "Attempted but incomplete",
    borderColor: "#FFB800",
    textColor: "#FFB800",
  },
  {
    quality: "skipped",
    label: "SKIPPED",
    subtitle: "Acknowledged skip",
    borderColor: "#888888",
    textColor: "#888888",
  },
];

const UNDO_COMMAND: CommandAction = {
  quality: "undo",
  label: "UNDO",
  subtitle: "Remove today's log",
  borderColor: "#D50000",
  textColor: "#D50000",
};

export function CommandDeck({
  visible,
  onClose,
  habitTitle,
  habitColor,
  habitType,
  todayLogged,
  onCommand,
}: CommandDeckProps) {
  const slideAnim = useRef(new Animated.Value(0)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Animate entrance with a spring for the sheet and fade for overlay
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }),
        Animated.timing(overlayAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      slideAnim.setValue(0);
      overlayAnim.setValue(0);
    }
  }, [visible, slideAnim, overlayAnim]);

  const handleCommand = (quality: CommandQuality) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onCommand(quality);
  };

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [400, 0],
  });

  const typeLabel =
    habitType === "protocol"
      ? "PROTOCOL"
      : habitType === "core"
        ? "CORE"
        : null;

  const accentColor = habitColor || "#00D4FF";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      {/* Overlay */}
      <Animated.View style={[styles.overlay, { opacity: overlayAnim }]}>
        <Pressable style={styles.overlayPressable} onPress={handleClose} />
      </Animated.View>

      {/* Bottom Sheet */}
      <View style={styles.sheetContainer} pointerEvents="box-none">
        <Animated.View
          style={[styles.sheet, { transform: [{ translateY }] }]}
        >
          {/* Top accent line */}
          <View style={styles.handleRow}>
            <View
              style={[styles.handle, { backgroundColor: accentColor }]}
            />
          </View>

          {/* Header */}
          <View style={styles.header}>
            {todayLogged && (
              <View style={styles.loggedIndicator}>
                <Text style={styles.loggedText}>
                  Already logged: {todayLogged.toUpperCase()}
                </Text>
              </View>
            )}

            {typeLabel && (
              <Text style={[styles.typeLabel, { color: accentColor }]}>
                {typeLabel}
              </Text>
            )}

            <Text style={styles.habitTitle} numberOfLines={2}>
              {habitTitle.toUpperCase()}
            </Text>
          </View>

          {/* Command Buttons */}
          <View style={styles.commandList}>
            {COMMANDS.map((cmd) => (
              <Pressable
                key={cmd.quality}
                onPress={() => handleCommand(cmd.quality)}
                style={({ pressed }) => [
                  styles.commandButton,
                  {
                    borderColor: cmd.borderColor,
                    opacity: pressed ? 0.7 : 1,
                    transform: [{ scale: pressed ? 0.97 : 1 }],
                  },
                ]}
              >
                <Text
                  style={[styles.commandLabel, { color: cmd.textColor }]}
                >
                  {cmd.label}
                </Text>
                <Text style={styles.commandSubtitle}>{cmd.subtitle}</Text>
              </Pressable>
            ))}

            {/* Undo - separated with extra margin */}
            <Pressable
              onPress={() => handleCommand(UNDO_COMMAND.quality)}
              style={({ pressed }) => [
                styles.commandButton,
                styles.undoButton,
                {
                  borderColor: UNDO_COMMAND.borderColor,
                  opacity: pressed ? 0.7 : 1,
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                },
              ]}
            >
              <Text
                style={[
                  styles.commandLabel,
                  { color: UNDO_COMMAND.textColor },
                ]}
              >
                {UNDO_COMMAND.label}
              </Text>
              <Text style={styles.commandSubtitle}>
                {UNDO_COMMAND.subtitle}
              </Text>
            </Pressable>
          </View>

          {/* Close */}
          <Pressable onPress={handleClose} style={styles.closeButton}>
            <Text style={styles.closeText}>CLOSE</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.8)",
  },
  overlayPressable: {
    flex: 1,
  },
  sheetContainer: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#0C0C0C",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  handleRow: {
    alignItems: "center",
    paddingTop: 12,
    paddingBottom: 8,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    opacity: 0.6,
  },
  header: {
    paddingHorizontal: 28,
    paddingTop: 12,
    paddingBottom: 20,
  },
  loggedIndicator: {
    backgroundColor: "rgba(255,255,255,0.06)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginBottom: 12,
  },
  loggedText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1,
  },
  typeLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2,
    marginBottom: 6,
  },
  habitTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  commandList: {
    paddingHorizontal: 28,
  },
  commandButton: {
    height: 55,
    borderRadius: 15,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
    flexDirection: "row",
    gap: 10,
  },
  undoButton: {
    marginTop: 14,
  },
  commandLabel: {
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 2.5,
  },
  commandSubtitle: {
    color: "rgba(255,255,255,0.35)",
    fontSize: 12,
    fontWeight: "500",
  },
  closeButton: {
    alignItems: "center",
    paddingTop: 20,
    paddingBottom: 4,
  },
  closeText: {
    color: "rgba(255,255,255,0.35)",
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 2,
  },
});
