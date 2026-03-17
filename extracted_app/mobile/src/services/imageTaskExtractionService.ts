/**
 * Image Task Extraction Service
 *
 * Uses AI (OpenAI Vision API) to extract tasks from images
 * Perfect for converting handwritten lists, whiteboard photos, or screenshots into todos
 */

import OpenAI from "openai";

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
  private static openai: OpenAI | null = null;

  /**
   * Initialize the service with OpenAI API key
   * Users should add their API key via ENV tab in Vibecode app
   */
  static initialize(apiKey: string) {
    this.openai = new OpenAI({
      apiKey,
    });
  }

  /**
   * Check if the service is configured
   */
  static isConfigured(): boolean {
    return this.openai !== null;
  }

  /**
   * Extract tasks from an image
   */
  static async extractTasksFromImage(
    imageUri: string,
    context?: string
  ): Promise<TaskExtractionResult> {
    if (!this.isConfigured()) {
      throw new Error(
        "Image Task Extraction Service not configured. Please add your OpenAI API key in Settings."
      );
    }

    try {
      // Convert image to base64
      const base64Image = await this.imageUriToBase64(imageUri);

      // Create the prompt
      const prompt = `You are a task extraction AI. Analyze this image and extract all tasks, to-dos, or action items you can find.

${context ? `Context: ${context}\n\n` : ""}
Look for:
- Handwritten lists
- Typed lists
- Whiteboard notes
- Screenshots of task lists
- Any text that represents things to be done

For each task, provide:
1. Title (clear, concise description)
2. Description (optional details if available)
3. Priority (low, medium, or high based on markers like "!", "urgent", or context)
4. Due date (if mentioned in the image)

Return a JSON object with this structure:
{
  "tasks": [
    {
      "title": "Task title",
      "description": "Optional description",
      "priority": "low" | "medium" | "high",
      "dueDate": "YYYY-MM-DD or null"
    }
  ],
  "rawText": "All text found in the image",
  "confidence": 0.0-1.0 (how confident you are in the extraction)
}

If the image contains no tasks, return an empty tasks array.`;

      const response = await this.openai!.chat.completions.create({
        model: "gpt-4o", // GPT-4 with vision
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`,
                },
              },
            ],
          },
        ],
        max_tokens: 1000,
        temperature: 0.3, // Lower temperature for more consistent extraction
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error("No response from AI");
      }

      // Parse the JSON response
      const result: TaskExtractionResult = JSON.parse(content);

      return result;
    } catch (error) {
      console.error("Failed to extract tasks from image:", error);
      throw error;
    }
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
    if (!this.isConfigured()) {
      throw new Error("Service not configured");
    }

    try {
      const base64Image = await this.imageUriToBase64(imageUri);

      const response = await this.openai!.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyze this image briefly. Does it contain text? Does it look like a list or tasks? How many items approximately? Give a short preview of what you see.",
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`,
                },
              },
            ],
          },
        ],
        max_tokens: 200,
      });

      const content = response.choices[0].message.content || "";

      // Parse the response (simple heuristics)
      const hasText = content.toLowerCase().includes("text") || content.toLowerCase().includes("list");
      const hasListStructure =
        content.toLowerCase().includes("list") ||
        content.toLowerCase().includes("items") ||
        content.toLowerCase().includes("tasks");

      // Estimate task count from content
      const numbers = content.match(/\d+/g);
      const estimatedTaskCount = numbers ? parseInt(numbers[0]) : 0;

      return {
        hasText,
        hasListStructure,
        estimatedTaskCount,
        preview: content,
      };
    } catch (error) {
      console.error("Failed to analyze image:", error);
      throw error;
    }
  }
}
