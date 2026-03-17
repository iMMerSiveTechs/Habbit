/**
 * Photo Task Extractor Component
 *
 * Allows users to upload photos of task lists and automatically extract todos
 */

import React, { useState } from "react";
import { View, Text, TouchableOpacity, Alert, ActivityIndicator, Image } from "react-native";
import { Camera, Image as ImageIcon, X, CheckCircle } from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { GlassCard } from "@/components/GlassCard";
import { ImageTaskExtractionService, type ExtractedTask } from "@/services/imageTaskExtractionService";

interface PhotoTaskExtractorProps {
  onTasksExtracted: (tasks: ExtractedTask[]) => void;
  onClose: () => void;
}

export function PhotoTaskExtractor({ onTasksExtracted, onClose }: PhotoTaskExtractorProps) {
  const [loading, setLoading] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [extractedTasks, setExtractedTasks] = useState<ExtractedTask[]>([]);
  const [step, setStep] = useState<"select" | "preview" | "extracted">("select");

  const requestPermissions = async () => {
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
    const { status: libraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (cameraStatus !== "granted" || libraryStatus !== "granted") {
      Alert.alert(
        "Permissions Required",
        "Please enable camera and photo library permissions to upload task photos."
      );
      return false;
    }

    return true;
  };

  const handleTakePhoto = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
      setStep("preview");
      await extractTasks(result.assets[0].uri);
    }
  };

  const handlePickPhoto = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
      setStep("preview");
      await extractTasks(result.assets[0].uri);
    }
  };

  const extractTasks = async (uri: string) => {
    try {
      setLoading(true);

      // Check if service is configured
      if (!ImageTaskExtractionService.isConfigured()) {
        Alert.alert(
          "OpenAI API Key Required",
          "To use AI task extraction, please add your OpenAI API key in the ENV tab of the Vibecode app.",
          [{ text: "OK" }]
        );
        setLoading(false);
        return;
      }

      const result = await ImageTaskExtractionService.extractTasksFromImage(uri);

      if (result.tasks.length === 0) {
        Alert.alert(
          "No Tasks Found",
          "Could not find any tasks in the image. Please try again with a clearer photo.",
          [
            {
              text: "Try Again",
              onPress: () => {
                setImageUri(null);
                setStep("select");
              },
            },
            { text: "Cancel", style: "cancel", onPress: onClose },
          ]
        );
        setLoading(false);
        return;
      }

      setExtractedTasks(result.tasks);
      setStep("extracted");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error("Failed to extract tasks:", error);
      Alert.alert(
        "Extraction Failed",
        error instanceof Error ? error.message : "Failed to extract tasks from image. Please try again.",
        [
          {
            text: "Try Again",
            onPress: () => {
              setImageUri(null);
              setStep("select");
            },
          },
          { text: "Cancel", style: "cancel", onPress: onClose },
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onTasksExtracted(extractedTasks);
    onClose();
  };

  return (
    <View className="flex-1 bg-obsidian">
      <LinearGradient colors={["#050813", "#0A0F1C", "#0D1929"]} style={{ flex: 1 }}>
        {/* Header */}
        <View className="px-5 pt-16 pb-6 flex-row items-center justify-between">
          <View className="flex-1">
            <Text className="text-white text-2xl font-bold">Extract Tasks from Photo</Text>
            <Text className="text-white/60 text-sm mt-1">
              {step === "select" && "Take a photo or upload an image"}
              {step === "preview" && "Analyzing image..."}
              {step === "extracted" && `Found ${extractedTasks.length} tasks`}
            </Text>
          </View>
          <TouchableOpacity
            onPress={onClose}
            className="w-10 h-10 rounded-full bg-white/10 items-center justify-center"
          >
            <X size={20} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* Select Photo Step */}
        {step === "select" && (
          <View className="flex-1 justify-center px-5">
            <GlassCard className="p-8 mb-6">
              <View className="items-center">
                <View className="w-20 h-20 rounded-full bg-cyan/20 items-center justify-center mb-4">
                  <ImageIcon size={40} color="#00D4FF" />
                </View>
                <Text className="text-white text-xl font-semibold mb-2 text-center">
                  Upload a Task List
                </Text>
                <Text className="text-white/60 text-center text-base leading-6">
                  Take a photo of a handwritten list, whiteboard, or screenshot. Our AI will
                  automatically extract all tasks.
                </Text>
              </View>
            </GlassCard>

            <TouchableOpacity onPress={handleTakePhoto} activeOpacity={0.8} className="mb-4">
              <LinearGradient
                colors={["#00D4FF", "#8B5CF6"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ borderRadius: 16, padding: 20 }}
              >
                <View className="flex-row items-center justify-center">
                  <Camera size={24} color="#FFF" style={{ marginRight: 12 }} />
                  <Text className="text-white font-bold text-lg">Take Photo</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity onPress={handlePickPhoto} activeOpacity={0.8}>
              <View
                style={{
                  borderRadius: 16,
                  padding: 20,
                  backgroundColor: "rgba(255, 255, 255, 0.1)",
                  borderWidth: 1,
                  borderColor: "rgba(255, 255, 255, 0.2)",
                }}
              >
                <View className="flex-row items-center justify-center">
                  <ImageIcon size={24} color="#FFF" style={{ marginRight: 12 }} />
                  <Text className="text-white font-semibold text-lg">Choose from Library</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Preview/Loading Step */}
        {step === "preview" && imageUri && (
          <View className="flex-1 justify-center px-5">
            <GlassCard className="p-6 mb-6">
              <Image
                source={{ uri: imageUri }}
                style={{
                  width: "100%",
                  height: 300,
                  borderRadius: 12,
                  marginBottom: 20,
                }}
                resizeMode="contain"
              />
              {loading && (
                <View className="items-center">
                  <ActivityIndicator size="large" color="#00D4FF" />
                  <Text className="text-white/60 mt-4 text-center">
                    Analyzing image with AI...
                  </Text>
                  <Text className="text-white/40 mt-2 text-center text-sm">
                    This may take a few seconds
                  </Text>
                </View>
              )}
            </GlassCard>
          </View>
        )}

        {/* Extracted Tasks Step */}
        {step === "extracted" && (
          <View className="flex-1 px-5">
            <GlassCard className="p-6 mb-6">
              <View className="items-center mb-4">
                <View className="w-16 h-16 rounded-full bg-green-500/20 items-center justify-center mb-3">
                  <CheckCircle size={32} color="#00FFB3" />
                </View>
                <Text className="text-white text-xl font-semibold">
                  {extractedTasks.length} Tasks Extracted
                </Text>
                <Text className="text-white/60 text-center mt-2">
                  Review the tasks below and tap &quot;Add to Todos&quot; to import them
                </Text>
              </View>

              <View className="space-y-3 mt-4">
                {extractedTasks.map((task, index) => (
                  <View
                    key={index}
                    className="bg-white/5 border border-white/10 rounded-xl p-4"
                  >
                    <Text className="text-white font-semibold text-base mb-1">{task.title}</Text>
                    {task.description && (
                      <Text className="text-white/60 text-sm mb-2">{task.description}</Text>
                    )}
                    <View className="flex-row items-center space-x-2">
                      {task.priority && (
                        <View
                          className="px-2 py-1 rounded-full"
                          style={{
                            backgroundColor:
                              task.priority === "high"
                                ? "rgba(255, 107, 107, 0.2)"
                                : task.priority === "medium"
                                ? "rgba(255, 184, 0, 0.2)"
                                : "rgba(0, 255, 179, 0.2)",
                          }}
                        >
                          <Text
                            className="text-xs font-semibold"
                            style={{
                              color:
                                task.priority === "high"
                                  ? "#FF6B6B"
                                  : task.priority === "medium"
                                  ? "#FFB800"
                                  : "#00FFB3",
                            }}
                          >
                            {task.priority.toUpperCase()}
                          </Text>
                        </View>
                      )}
                      {task.dueDate && (
                        <View className="px-2 py-1 rounded-full bg-cyan/20">
                          <Text className="text-cyan text-xs font-semibold">{task.dueDate}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            </GlassCard>

            <TouchableOpacity onPress={handleConfirm} activeOpacity={0.8} className="mb-8">
              <LinearGradient
                colors={["#00D4FF", "#8B5CF6"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ borderRadius: 16, padding: 20 }}
              >
                <Text className="text-white font-bold text-lg text-center">
                  Add {extractedTasks.length} Tasks to Todos
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </LinearGradient>
    </View>
  );
}
