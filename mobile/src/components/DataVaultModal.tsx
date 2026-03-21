import { useState } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  TextInput,
  Alert,
  Share,
  StyleSheet,
} from "react-native";
import { api } from "@/lib/api";
import * as Haptics from "expo-haptics";
import { Download, Upload, X } from "lucide-react-native";

interface DataVaultModalProps {
  visible: boolean;
  onClose: () => void;
}

export function DataVaultModal({ visible, onClose }: DataVaultModalProps) {
  const [jsonData, setJsonData] = useState("");
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);

  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const response = await api.get<any>("/api/protocol/export");
      const dataString = JSON.stringify(response, null, 2);
      setJsonData(dataString);

      await Share.share({
        message: dataString,
        title: "Vibecode Data Export",
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Export Complete", "Your data has been exported successfully.");
    } catch (error) {
      console.log("Failed to export data");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Export Failed", "Could not export your data. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async () => {
    if (importing) return;

    if (!jsonData.trim()) {
      Alert.alert("No Data", "Paste your backup JSON into the text area first.");
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonData);
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Invalid JSON", "The text you entered is not valid JSON. Please check and try again.");
      return;
    }

    Alert.alert(
      "Restore Data",
      "This will import the data from your backup. Existing data may be affected. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Restore",
          style: "destructive",
          onPress: async () => {
            setImporting(true);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

            try {
              await api.post("/api/protocol/import", parsed as object);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert("Restore Complete", "Your data has been restored successfully.");
              setJsonData("");
            } catch (error) {
              console.log("Failed to import data");
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              Alert.alert("Restore Failed", "Could not restore your data. Please check the format and try again.");
            } finally {
              setImporting(false);
            }
          },
        },
      ]
    );
  };

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Close button */}
          <Pressable
            onPress={handleClose}
            style={styles.closeButton}
            className="active:scale-90"
          >
            <X size={20} color="#666" />
          </Pressable>

          {/* Header */}
          <View style={styles.headerRow}>
            <Download size={22} color="#9C27B0" />
            <Text style={styles.title}>DATA VAULT</Text>
          </View>
          <Text style={styles.subtitle}>
            Export your data or restore from backup
          </Text>

          {/* JSON text area */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>JSON DATA</Text>
            <TextInput
              value={jsonData}
              onChangeText={setJsonData}
              placeholder="Exported data will appear here, or paste backup JSON to restore..."
              placeholderTextColor="rgba(255,255,255,0.2)"
              style={styles.textArea}
              multiline
              textAlignVertical="top"
              autoCorrect={false}
              autoCapitalize="none"
            />
          </View>

          {/* Action buttons */}
          <View style={styles.buttonRow}>
            <Pressable
              onPress={handleExport}
              disabled={exporting}
              style={[
                styles.actionButton,
                styles.exportButton,
                exporting && styles.actionButtonDisabled,
              ]}
              className="active:scale-95"
            >
              <Download size={16} color={exporting ? "#444" : "#2962FF"} />
              <Text
                style={[
                  styles.actionButtonText,
                  styles.exportButtonText,
                  exporting && styles.actionButtonTextDisabled,
                ]}
              >
                {exporting ? "EXPORTING..." : "EXPORT"}
              </Text>
            </Pressable>

            <Pressable
              onPress={handleImport}
              disabled={importing}
              style={[
                styles.actionButton,
                styles.importButton,
                importing && styles.actionButtonDisabled,
              ]}
              className="active:scale-95"
            >
              <Upload size={16} color={importing ? "#444" : "#D50000"} />
              <Text
                style={[
                  styles.actionButtonText,
                  styles.importButtonText,
                  importing && styles.actionButtonTextDisabled,
                ]}
              >
                {importing ? "RESTORING..." : "RESTORE"}
              </Text>
            </Pressable>
          </View>

          {/* Close link */}
          <Pressable
            onPress={handleClose}
            style={styles.closeLink}
            className="active:opacity-60"
          >
            <Text style={styles.closeLinkText}>CLOSE</Text>
          </Pressable>
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
    borderColor: "rgba(156,39,176,0.3)",
    padding: 24,
    paddingBottom: 16,
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
    marginBottom: 24,
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
  textArea: {
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 15,
    height: 150,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: "#fff",
    fontSize: 12,
    fontFamily: undefined,
    lineHeight: 18,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 8,
  },
  actionButton: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  actionButtonDisabled: {
    borderColor: "#333",
    backgroundColor: "transparent",
  },
  exportButton: {
    borderColor: "#2962FF",
    backgroundColor: "rgba(41,98,255,0.06)",
  },
  importButton: {
    borderColor: "#D50000",
    backgroundColor: "rgba(213,0,0,0.06)",
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 2,
  },
  actionButtonTextDisabled: {
    color: "#444",
  },
  exportButtonText: {
    color: "#2962FF",
  },
  importButtonText: {
    color: "#D50000",
  },
  closeLink: {
    alignItems: "center",
    paddingVertical: 14,
  },
  closeLinkText: {
    color: "#555",
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 2,
  },
});
