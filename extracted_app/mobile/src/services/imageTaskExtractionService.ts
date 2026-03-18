/**
 * Image Task Extraction Service
 *
 * Uses the backend AI proxy to extract tasks from images
 * Perfect for converting handwritten lists, whiteboard photos, or screenshots into todos
 */

import { api } from "@/lib/api";

export interface ExtractedTask {
  title: string;
  description?: string;
  priority?: "low" | "medium" | "high";
  dueDate?: string;
}

export interface TaskExtractionResult {
  tasks: ExtractedTask[];
  rawText?: string;
  confidence: number;
}

export class ImageTaskExtractionService {
  /**
   * The service is always configured since it uses the backend proxy
   */
  static initialize(_apiKey?: string) {
    // No-op: API key is now managed server-side
  }

  /**
   * Check if the service is configured
   * Always returns true since we use the backend proxy
   */
  static isConfigured(): boolean {
    return true;
  }

  /**
   * Extract tasks from an image via the backend proxy
   */
  static async extractTasksFromImage(
    imageUri: string,
    _context?: string
  ): Promise<TaskExtractionResult> {
    try {
      // Convert image to base64
      const base64Image = await this.imageUriToBase64(imageUri);

      // Determine MIME type from URI
      const mimeType = this.getMimeType(imageUri);

      // Call the backend proxy endpoint
      const response = await api.post("/api/ai/extract-tasks", {
        imageBase64: base64Image,
        mimeType,
      });

      const data = response.data as { tasks: ExtractedTask[] };
      const tasks = data.tasks || [];

      return {
        tasks,
        confidence: tasks.length > 0 ? 0.8 : 0.0,
      };
    } catch (error) {
      console.error("Failed to extract tasks from image:", error);
      throw error;
    }
  }

  /**
   * Determine MIME type from image URI
   */
  private static getMimeType(uri: string): string {
    const lower = uri.toLowerCase();
    if (lower.endsWith(".png")) return "image/png";
    if (lower.endsWith(".gif")) return "image/gif";
    if (lower.endsWith(".webp")) return "image/webp";
    return "image/jpeg";
  }

  /**
   * Convert image URI to base64
   */
  private static async imageUriToBase64(uri: string): Promise<string> {
    try {
      // For web URLs, fetch and convert
      if (uri.startsWith("http")) {
        const response = await fetch(uri);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = reader.result as string;
            // Remove data URL prefix if present
            resolve(base64.split(",")[1] || base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      }

      // For local files (React Native)
      const FileSystem = require("expo-file-system");
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return base64;
    } catch (error) {
      console.error("Failed to convert image to base64:", error);
      throw error;
    }
  }

  /**
   * Extract tasks with simplified result (just titles)
   */
  static async extractSimpleTasks(imageUri: string): Promise<string[]> {
    const result = await this.extractTasksFromImage(imageUri);
    return result.tasks.map((task) => task.title);
  }

  /**
   * Quick extraction with automatic todo creation
   * Returns the number of tasks extracted
   */
  static async quickExtractAndCreate(
    imageUri: string,
    onTaskExtracted: (task: ExtractedTask) => void
  ): Promise<number> {
    const result = await this.extractTasksFromImage(imageUri);

    for (const task of result.tasks) {
      onTaskExtracted(task);
    }

    return result.tasks.length;
  }

  /**
   * Analyze image for task context (before extraction)
   * Returns a preview of what the AI sees
   */
  static async analyzeImage(imageUri: string): Promise<{
    hasText: boolean;
    hasListStructure: boolean;
    estimatedTaskCount: number;
    preview: string;
  }> {
    // Use the extract endpoint and infer analysis from results
    try {
      const result = await this.extractTasksFromImage(imageUri);
      const taskCount = result.tasks.length;

      return {
        hasText: taskCount > 0,
        hasListStructure: taskCount > 1,
        estimatedTaskCount: taskCount,
        preview: taskCount > 0
          ? `Found ${taskCount} task(s): ${result.tasks.map(t => t.title).join(", ")}`
          : "No tasks detected in the image.",
      };
    } catch (error) {
      console.error("Failed to analyze image:", error);
      throw error;
    }
  }
}
