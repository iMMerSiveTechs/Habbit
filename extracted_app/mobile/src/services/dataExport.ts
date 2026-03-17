/**
 * Data Export Service
 * Exports habits and todos data to CSV format
 */

import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { format } from "date-fns";
import type { HabitWithStats } from "@/state/habitsStore";
import type { Todo } from "@/shared/contracts";

/**
 * Converts a value to a CSV-safe string
 * Escapes quotes and wraps in quotes if contains comma/newline
 */
function csvEscape(value: any): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  // If contains comma, quote, or newline, escape and wrap in quotes
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Exports habits data to CSV file
 */
export async function exportHabitsToCSV(habits: HabitWithStats[]): Promise<void> {
  try {
    // CSV headers
    const headers = [
      "Title",
      "Description",
      "Category",
      "Color",
      "Frequency",
      "Target Count",
      "Completed Today",
      "Today Count",
      "Current Streak",
      "Archived",
      "Reminder Enabled",
      "Reminder Time",
      "Recurring Type",
      "Created At",
      "Updated At",
    ];

    // Convert habits to CSV rows
    const rows = habits.map((habit) => [
      csvEscape(habit.title),
      csvEscape(habit.description || ""),
      csvEscape(habit.category || "general"),
      csvEscape(habit.color),
      csvEscape(habit.frequency),
      csvEscape(habit.targetCount),
      csvEscape(habit.completedToday ? "Yes" : "No"),
      csvEscape(habit.todayCount || 0),
      csvEscape(habit.streak || 0),
      csvEscape(habit.archived ? "Yes" : "No"),
      csvEscape(habit.reminderEnabled ? "Yes" : "No"),
      csvEscape(habit.reminderTime || ""),
      csvEscape(habit.recurringType || ""),
      csvEscape(habit.createdAt || ""),
      csvEscape(habit.updatedAt || ""),
    ]);

    // Build CSV content
    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    // Generate filename with timestamp
    const timestamp = format(new Date(), "yyyy-MM-dd_HH-mm-ss");
    const filename = `habits_export_${timestamp}.csv`;
    const fileUri = `${FileSystem.cacheDirectory}${filename}`;

    // Write file
    await FileSystem.writeAsStringAsync(fileUri, csvContent, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    // Share file
    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(fileUri, {
        mimeType: "text/csv",
        dialogTitle: "Export Habits Data",
        UTI: "public.comma-separated-values-text",
      });
    } else {
      throw new Error("Sharing is not available on this device");
    }

    console.log(`✅ Exported ${habits.length} habits to ${filename}`);
  } catch (error) {
    console.error("❌ Failed to export habits:", error);
    throw error;
  }
}

/**
 * Exports todos data to CSV file
 */
export async function exportTodosToCSV(todos: Todo[]): Promise<void> {
  try {
    // CSV headers
    const headers = [
      "Title",
      "Description",
      "Priority",
      "Completed",
      "Archived",
      "Due Date",
      "Linked Habit ID",
      "Reminder Enabled",
      "Reminder Time",
      "Recurring Type",
      "Item Count",
      "Completed Items",
      "Created At",
      "Updated At",
      "Completed At",
    ];

    // Convert todos to CSV rows
    const rows = todos.map((todo) => {
      const itemCount = todo.items.length;
      const completedItems = todo.items.filter((item) => item.completed).length;

      return [
        csvEscape(todo.title),
        csvEscape(todo.description || ""),
        csvEscape(todo.priority),
        csvEscape(todo.completed ? "Yes" : "No"),
        csvEscape(todo.archived ? "Yes" : "No"),
        csvEscape(todo.dueDate || ""),
        csvEscape(todo.linkedHabitId || ""),
        csvEscape(todo.reminderEnabled ? "Yes" : "No"),
        csvEscape(todo.reminderTime || ""),
        csvEscape(todo.recurringType || ""),
        csvEscape(itemCount),
        csvEscape(completedItems),
        csvEscape(todo.createdAt),
        csvEscape(todo.updatedAt),
        csvEscape(todo.completedAt || ""),
      ];
    });

    // Build CSV content
    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    // Generate filename with timestamp
    const timestamp = format(new Date(), "yyyy-MM-dd_HH-mm-ss");
    const filename = `todos_export_${timestamp}.csv`;
    const fileUri = `${FileSystem.cacheDirectory}${filename}`;

    // Write file
    await FileSystem.writeAsStringAsync(fileUri, csvContent, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    // Share file
    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(fileUri, {
        mimeType: "text/csv",
        dialogTitle: "Export Todos Data",
        UTI: "public.comma-separated-values-text",
      });
    } else {
      throw new Error("Sharing is not available on this device");
    }

    console.log(`✅ Exported ${todos.length} todos to ${filename}`);
  } catch (error) {
    console.error("❌ Failed to export todos:", error);
    throw error;
  }
}

/**
 * Exports all data (habits + todos) to a combined CSV file
 */
export async function exportAllDataToCSV(
  habits: HabitWithStats[],
  todos: Todo[]
): Promise<void> {
  try {
    // Generate timestamp
    const timestamp = format(new Date(), "yyyy-MM-dd_HH-mm-ss");

    // Export habits
    const habitsHeaders = [
      "Type",
      "Title",
      "Description",
      "Category",
      "Color",
      "Frequency",
      "Target Count",
      "Completed Today",
      "Today Count",
      "Current Streak",
      "Archived",
      "Created At",
    ];

    const habitsRows = habits.map((habit) => [
      "Habit",
      csvEscape(habit.title),
      csvEscape(habit.description || ""),
      csvEscape(habit.category || "general"),
      csvEscape(habit.color),
      csvEscape(habit.frequency),
      csvEscape(habit.targetCount),
      csvEscape(habit.completedToday ? "Yes" : "No"),
      csvEscape(habit.todayCount || 0),
      csvEscape(habit.streak || 0),
      csvEscape(habit.archived ? "Yes" : "No"),
      csvEscape(habit.createdAt || ""),
    ]);

    // Export todos
    const todosRows = todos.map((todo) => [
      "Todo",
      csvEscape(todo.title),
      csvEscape(todo.description || ""),
      csvEscape(todo.priority),
      "", // No color for todos
      "", // No frequency for todos
      "", // No target count for todos
      csvEscape(todo.completed ? "Yes" : "No"),
      "", // No today count for todos
      "", // No streak for todos
      csvEscape(todo.archived ? "Yes" : "No"),
      csvEscape(todo.createdAt),
    ]);

    // Combine all rows
    const allRows = [...habitsRows, ...todosRows];

    // Build CSV content
    const csvContent = [
      habitsHeaders.join(","),
      ...allRows.map((row) => row.join(",")),
    ].join("\n");

    // Create file
    const filename = `all_data_export_${timestamp}.csv`;
    const fileUri = `${FileSystem.cacheDirectory}${filename}`;

    // Write file
    await FileSystem.writeAsStringAsync(fileUri, csvContent, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    // Share file
    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(fileUri, {
        mimeType: "text/csv",
        dialogTitle: "Export All Data",
        UTI: "public.comma-separated-values-text",
      });
    } else {
      throw new Error("Sharing is not available on this device");
    }

    console.log(
      `✅ Exported all data (${habits.length} habits + ${todos.length} todos) to ${filename}`
    );
  } catch (error) {
    console.error("❌ Failed to export all data:", error);
    throw error;
  }
}
