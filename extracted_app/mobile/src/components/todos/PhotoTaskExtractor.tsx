/**
 * PhotoTaskExtractor - Modal wrapper for photo-based task extraction
 *
 * Wraps the existing PhotoTaskExtractor component in a Modal with
 * visibility control. Includes logic for creating todos from extracted
 * tasks and showing success/error alerts.
 */

import React, { useEffect } from "react";
import { Modal, Alert } from "react-native";
import { PhotoTaskExtractor as BasePhotoTaskExtractor } from "@/components/PhotoTaskExtractor";
import {
  ImageTaskExtractionService,
  type ExtractedTask,
} from "@/services/imageTaskExtractionService";
import { todosApi } from "@/lib/todosApi";
import * as Haptics from "expo-haptics";

interface PhotoTaskExtractorModalProps {
  /** Called after tasks have been successfully created, so the parent can reload todos */
  onTasksExtracted: (tasks: ExtractedTask[]) => void;
  visible: boolean;
  onClose: () => void;
}

const PhotoTaskExtractorModal = React.memo(function PhotoTaskExtractorModal({
  onTasksExtracted,
  visible,
  onClose,
}: PhotoTaskExtractorModalProps) {
  // Initialize OpenAI API key from environment
  useEffect(() => {
    const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
    if (apiKey) {
      ImageTaskExtractionService.initialize(apiKey);
    }
  }, []);

  const handleTasksExtracted = async (tasks: ExtractedTask[]) => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Create todos from extracted tasks
      for (const task of tasks) {
        const priorityMap: Record<string, "low" | "medium" | "high"> = {
          low: "low",
          medium: "medium",
          high: "high",
        };

        await todosApi.createTodo({
          title: task.title,
          description: task.description,
          dueDate: task.dueDate || undefined,
          priority: task.priority ? priorityMap[task.priority] : "medium",
          reminderEnabled: false,
        });
      }

      // Notify parent so it can reload todos
      onTasksExtracted(tasks);

      Alert.alert(
        "Tasks Added! 🎉",
        `Successfully added ${tasks.length} task${tasks.length > 1 ? "s" : ""} from your photo.`,
        [{ text: "OK" }]
      );
    } catch (error) {
      console.error("Failed to create todos from extracted tasks:", error);
      Alert.alert(
        "Error",
        "Failed to add some tasks. Please try again.",
        [{ text: "OK" }]
      );
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <BasePhotoTaskExtractor
        onTasksExtracted={handleTasksExtracted}
        onClose={onClose}
      />
    </Modal>
  );
});

export { PhotoTaskExtractorModal };
export type { PhotoTaskExtractorModalProps, ExtractedTask };
