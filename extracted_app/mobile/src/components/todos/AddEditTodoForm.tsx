/**
 * AddEditTodoForm - The add/edit modal for creating new todos,
 * plus the CompletionWorkflowModal shown after completing a todo.
 */

import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import {
  Plus,
  Circle,
  CheckCircle2,
  Trash2,
  Calendar,
  Repeat,
  Archive,
  Save,
} from "lucide-react-native";
import type { Todo } from "@/shared/contracts";
import { todosApi } from "@/lib/todosApi";
import { DateTimePickerComponent } from "@/components/DateTimePicker";
import {
  TodoRemindersManager,
  type LocalReminder,
} from "@/components/TodoRemindersManager";

// ─── AddTodoModal ───────────────────────────────────────────
interface AddTodoModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (todo: Todo) => void;
}

const AddTodoModal = React.memo(function AddTodoModal({
  visible,
  onClose,
  onAdd,
}: AddTodoModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">(
    "medium"
  );
  const [checklistItems, setChecklistItems] = useState<string[]>([]);
  const [newItem, setNewItem] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Date/Time/Recurring fields
  const [hasDueDate, setHasDueDate] = useState(false);
  const [dueDate, setDueDate] = useState(new Date());
  const [reminders, setReminders] = useState<LocalReminder[]>([]);
  const [recurringEnabled, setRecurringEnabled] = useState(false);
  const [recurringType, setRecurringType] = useState<
    "daily" | "weekly" | "weekdays" | "weekends"
  >("daily");
  const [recurringDays, setRecurringDays] = useState<number[]>([]);

  const handleSubmit = async () => {
    if (!title.trim()) {
      console.log("[AddTodoModal] Submit blocked: title is empty");
      return;
    }

    console.log("[AddTodoModal] Creating todo:", {
      title: title.trim(),
      description: description.trim(),
      priority,
      itemsCount: checklistItems.length,
      hasDueDate,
      remindersCount: reminders.length,
      recurringEnabled,
    });

    try {
      setIsSubmitting(true);

      const response = await todosApi.createTodo({
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        dueDate: hasDueDate ? dueDate.toISOString() : undefined,
        reminderEnabled: reminders.length > 0,
        reminderTime:
          reminders.length > 0 ? reminders[0]?.reminderTime : undefined,
        recurringType: recurringEnabled ? recurringType : undefined,
        recurringDays:
          recurringEnabled &&
          recurringType === "weekly" &&
          recurringDays.length > 0
            ? recurringDays
            : undefined,
        items:
          checklistItems.length > 0
            ? checklistItems.map((item, index) => ({
                title: item,
                order: index,
              }))
            : undefined,
      });

      // Create reminders for the new todo
      for (const reminder of reminders) {
        try {
          const recurringDaysArr = reminder.recurringDays
            ? JSON.parse(reminder.recurringDays)
            : undefined;
          await todosApi.addTodoReminder(response.todo.id, {
            reminderTime: reminder.reminderTime,
            recurringType: reminder.recurringType as
              | "daily"
              | "weekdays"
              | "weekends"
              | "weekly",
            recurringDays: Array.isArray(recurringDaysArr)
              ? recurringDaysArr
              : undefined,
            enabled: reminder.enabled,
          });
        } catch (err) {
          console.error("[AddTodoModal] Failed to create reminder:", err);
        }
      }

      console.log(
        "[AddTodoModal] Todo created successfully:",
        response.todo.id
      );
      onAdd(response.todo);

      // Reset form
      setTitle("");
      setDescription("");
      setPriority("medium");
      setChecklistItems([]);
      setNewItem("");
      setHasDueDate(false);
      setDueDate(new Date());
      setReminders([]);
      setRecurringEnabled(false);
      setRecurringType("daily");
      setRecurringDays([]);
    } catch (error) {
      console.error("[AddTodoModal] Failed to create todo:", error);
      Alert.alert("Error", "Failed to create todo. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const addChecklistItem = () => {
    if (newItem.trim()) {
      setChecklistItems([...checklistItems, newItem.trim()]);
      setNewItem("");
    }
  };

  const removeChecklistItem = (index: number) => {
    setChecklistItems(checklistItems.filter((_, i) => i !== index));
  };

  const getPriorityColor = (p: string) => {
    switch (p) {
      case "high":
        return "#FF00E5";
      case "medium":
        return "#00D4FF";
      case "low":
        return "#8B5CF6";
      default:
        return "#00D4FF";
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View className="flex-1" style={{ backgroundColor: "#0D1117" }}>
        <SafeAreaView edges={["top"]} className="flex-1">
          <View className="px-6 py-4 border-b border-white/5 flex-row items-center justify-between">
            <Text className="text-white text-xl font-bold">New Todo</Text>
            <TouchableOpacity onPress={onClose}>
              <Text className="text-[#00D4FF] text-base font-semibold">
                Cancel
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1 px-6 py-6">
            <View className="mb-4">
              <Text className="text-white/60 text-sm mb-2 font-medium">
                Title *
              </Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="What needs to be done?"
                placeholderTextColor="#ffffff30"
                className="text-white px-4 py-3.5 rounded-2xl border"
                style={{
                  backgroundColor: "rgba(30, 35, 45, 0.5)",
                  borderColor: "rgba(255, 255, 255, 0.1)",
                }}
              />
            </View>

            <View className="mb-4">
              <Text className="text-white/60 text-sm mb-2 font-medium">
                Description
              </Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Add details..."
                placeholderTextColor="#ffffff30"
                multiline
                numberOfLines={3}
                className="text-white px-4 py-3.5 rounded-2xl border"
                style={{
                  backgroundColor: "rgba(30, 35, 45, 0.5)",
                  borderColor: "rgba(255, 255, 255, 0.1)",
                }}
                textAlignVertical="top"
              />
            </View>

            <View className="mb-4">
              <Text className="text-white/60 text-sm mb-2 font-medium">
                Priority
              </Text>
              <View className="flex-row gap-3">
                {(["low", "medium", "high"] as const).map((p) => (
                  <TouchableOpacity
                    key={p}
                    onPress={() => setPriority(p)}
                    className="flex-1 py-3 rounded-2xl items-center"
                    style={{
                      backgroundColor:
                        priority === p
                          ? `${getPriorityColor(p)}20`
                          : "rgba(30, 35, 45, 0.5)",
                      borderWidth: priority === p ? 1.5 : 1,
                      borderColor:
                        priority === p
                          ? getPriorityColor(p)
                          : "rgba(255, 255, 255, 0.1)",
                    }}
                  >
                    <Text
                      className="text-sm font-semibold capitalize"
                      style={{
                        color:
                          priority === p
                            ? getPriorityColor(p)
                            : "#ffffff50",
                      }}
                    >
                      {p}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Due Date Quick Picks */}
            <View className="mb-4">
              <Text className="text-white/60 text-sm mb-2 font-medium">
                Due Date
              </Text>
              <View className="flex-row gap-2 mb-3">
                {[
                  {
                    label: "Today",
                    getValue: () => {
                      const d = new Date();
                      d.setHours(23, 59, 0, 0);
                      return d;
                    },
                    color: "#FF6B6B",
                  },
                  {
                    label: "This Week",
                    getValue: () => {
                      const d = new Date();
                      const day = d.getDay();
                      const daysUntilSunday = 7 - day;
                      d.setDate(d.getDate() + daysUntilSunday);
                      d.setHours(23, 59, 0, 0);
                      return d;
                    },
                    color: "#FFD700",
                  },
                  {
                    label: "This Month",
                    getValue: () => {
                      const d = new Date();
                      d.setMonth(d.getMonth() + 1, 0);
                      d.setHours(23, 59, 0, 0);
                      return d;
                    },
                    color: "#00D4FF",
                  },
                ].map(({ label, getValue, color }) => {
                  const targetDate = getValue();
                  const isSelected =
                    hasDueDate &&
                    dueDate.toDateString() === targetDate.toDateString();
                  return (
                    <TouchableOpacity
                      key={label}
                      onPress={() => {
                        setHasDueDate(true);
                        setDueDate(getValue());
                      }}
                      className="flex-1 py-3 rounded-2xl items-center"
                      style={{
                        backgroundColor: isSelected
                          ? `${color}20`
                          : "rgba(30, 35, 45, 0.5)",
                        borderWidth: isSelected ? 1.5 : 1,
                        borderColor: isSelected
                          ? color
                          : "rgba(255, 255, 255, 0.1)",
                      }}
                    >
                      <Text
                        className="text-xs font-bold"
                        style={{
                          color: isSelected ? color : "#ffffff50",
                        }}
                      >
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View
                className="flex-row items-center justify-between px-4 py-3 rounded-2xl mb-2"
                style={{
                  backgroundColor: "rgba(30, 35, 45, 0.5)",
                  borderWidth: 1,
                  borderColor: "rgba(255, 255, 255, 0.1)",
                }}
              >
                <View className="flex-row items-center">
                  <Calendar size={20} color="#00D4FF" />
                  <Text className="text-white font-semibold ml-2">
                    Custom Date
                  </Text>
                </View>
                <Switch
                  value={hasDueDate}
                  onValueChange={(val) => {
                    setHasDueDate(val);
                    if (val && dueDate < new Date()) {
                      const d = new Date();
                      d.setHours(23, 59, 0, 0);
                      setDueDate(d);
                    }
                  }}
                  trackColor={{ false: "#767577", true: "#00D4FF" }}
                  thumbColor={hasDueDate ? "#ffffff" : "#f4f3f4"}
                />
              </View>

              {hasDueDate && (
                <DateTimePickerComponent
                  mode="date"
                  value={dueDate}
                  onChange={setDueDate}
                  minimumDate={new Date()}
                />
              )}
            </View>

            {/* Multiple Reminders */}
            <TodoRemindersManager
              reminders={reminders}
              onRemindersChange={setReminders}
            />

            {/* Recurring Toggle & Options */}
            <View className="mb-4">
              <View
                className="flex-row items-center justify-between px-4 py-3 rounded-2xl mb-2"
                style={{
                  backgroundColor: "rgba(30, 35, 45, 0.5)",
                  borderWidth: 1,
                  borderColor: "rgba(255, 255, 255, 0.1)",
                }}
              >
                <View className="flex-row items-center">
                  <Repeat size={20} color="#00D4FF" />
                  <Text className="text-white font-semibold ml-2">
                    Make Recurring
                  </Text>
                </View>
                <Switch
                  value={recurringEnabled}
                  onValueChange={setRecurringEnabled}
                  trackColor={{ false: "#767577", true: "#00D4FF" }}
                  thumbColor={recurringEnabled ? "#ffffff" : "#f4f3f4"}
                />
              </View>

              {recurringEnabled && (
                <>
                  <View className="flex-row flex-wrap gap-2 mb-3">
                    {(
                      ["daily", "weekdays", "weekends", "weekly"] as const
                    ).map((type) => (
                      <TouchableOpacity
                        key={type}
                        onPress={() => setRecurringType(type)}
                        className="px-4 py-2 rounded-2xl"
                        style={{
                          backgroundColor:
                            recurringType === type
                              ? "#00D4FF20"
                              : "rgba(30, 35, 45, 0.5)",
                          borderWidth: recurringType === type ? 1.5 : 1,
                          borderColor:
                            recurringType === type
                              ? "#00D4FF"
                              : "rgba(255, 255, 255, 0.1)",
                        }}
                      >
                        <Text
                          className="text-sm font-semibold capitalize"
                          style={{
                            color:
                              recurringType === type
                                ? "#00D4FF"
                                : "#ffffff50",
                          }}
                        >
                          {type}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {recurringType === "weekly" && (
                    <View className="flex-row gap-2">
                      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                        (day, index) => (
                          <TouchableOpacity
                            key={index}
                            onPress={() => {
                              if (recurringDays.includes(index)) {
                                setRecurringDays(
                                  recurringDays.filter((d) => d !== index)
                                );
                              } else {
                                setRecurringDays(
                                  [...recurringDays, index].sort()
                                );
                              }
                            }}
                            className="flex-1 py-2 rounded-xl items-center"
                            style={{
                              backgroundColor: recurringDays.includes(index)
                                ? "#8B5CF620"
                                : "rgba(30, 35, 45, 0.5)",
                              borderWidth: recurringDays.includes(index)
                                ? 1.5
                                : 1,
                              borderColor: recurringDays.includes(index)
                                ? "#8B5CF6"
                                : "rgba(255, 255, 255, 0.1)",
                            }}
                          >
                            <Text
                              className="text-xs font-semibold"
                              style={{
                                color: recurringDays.includes(index)
                                  ? "#8B5CF6"
                                  : "#ffffff50",
                              }}
                            >
                              {day}
                            </Text>
                          </TouchableOpacity>
                        )
                      )}
                    </View>
                  )}
                </>
              )}
            </View>

            <View className="mb-4">
              <Text className="text-white/60 text-sm mb-2 font-medium">
                Checklist Items (Optional)
              </Text>

              {checklistItems.map((item, index) => (
                <View
                  key={index}
                  className="flex-row items-center px-4 py-3 rounded-2xl mb-2"
                  style={{
                    backgroundColor: "rgba(30, 35, 45, 0.5)",
                    borderWidth: 1,
                    borderColor: "rgba(255, 255, 255, 0.1)",
                  }}
                >
                  <Circle size={16} color="#00D4FF" strokeWidth={2} />
                  <Text className="text-white text-sm ml-3 flex-1">
                    {item}
                  </Text>
                  <TouchableOpacity
                    onPress={() => removeChecklistItem(index)}
                  >
                    <Trash2 size={16} color="#ffffff30" />
                  </TouchableOpacity>
                </View>
              ))}

              <View className="flex-row items-center gap-2">
                <TextInput
                  value={newItem}
                  onChangeText={setNewItem}
                  placeholder="Add checklist item..."
                  placeholderTextColor="#ffffff30"
                  className="flex-1 text-white px-4 py-3.5 rounded-2xl border"
                  style={{
                    backgroundColor: "rgba(30, 35, 45, 0.5)",
                    borderColor: "rgba(255, 255, 255, 0.1)",
                  }}
                  onSubmitEditing={addChecklistItem}
                  returnKeyType="done"
                />
                <TouchableOpacity
                  onPress={addChecklistItem}
                  disabled={!newItem.trim()}
                  style={{ opacity: newItem.trim() ? 1 : 0.5 }}
                >
                  <LinearGradient
                    colors={["#00D4FF", "#8B5CF6"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 16,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Plus size={20} color="#FFFFFF" strokeWidth={2.5} />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>

          <View className="px-6 py-4 border-t border-white/5">
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={!title.trim() || isSubmitting}
              style={{ opacity: title.trim() ? 1 : 0.5 }}
            >
              <LinearGradient
                colors={["#00D4FF", "#8B5CF6"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  paddingVertical: 16,
                  borderRadius: 16,
                  alignItems: "center",
                }}
              >
                <Text className="text-white text-base font-bold">
                  {isSubmitting ? "Creating..." : "Create Todo"}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
});

// ─── CompletionWorkflowModal ────────────────────────────────
interface CompletionWorkflowModalProps {
  visible: boolean;
  todo: Todo | null;
  onClose: () => void;
  onRepeat: () => void;
  onArchive: () => void;
  onSaveTemplate: () => void;
  onDelete: () => void;
}

const CompletionWorkflowModal = React.memo(
  function CompletionWorkflowModal({
    visible,
    todo,
    onClose,
    onRepeat,
    onArchive,
    onSaveTemplate,
    onDelete,
  }: CompletionWorkflowModalProps) {
    if (!todo) return null;

    return (
      <Modal
        visible={visible}
        animationType="slide"
        transparent
        onRequestClose={onClose}
      >
        <View
          className="flex-1 justify-end"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
        >
          <View
            className="rounded-t-3xl p-6"
            style={{ backgroundColor: "#0D1117" }}
          >
            <View className="items-center mb-6">
              <View
                className="rounded-full items-center justify-center mb-4"
                style={{
                  width: 80,
                  height: 80,
                  backgroundColor: "rgba(0, 212, 255, 0.1)",
                }}
              >
                <CheckCircle2
                  size={40}
                  color="#00D4FF"
                  strokeWidth={2}
                />
              </View>
              <Text className="text-white text-2xl font-bold mb-2">
                Todo Completed!
              </Text>
              <Text className="text-white/50 text-sm text-center">
                What would you like to do with &ldquo;{todo.title}&rdquo;?
              </Text>
            </View>

            <View className="gap-3 mb-4">
              <TouchableOpacity
                onPress={onRepeat}
                activeOpacity={0.8}
                className="rounded-2xl overflow-hidden"
              >
                <LinearGradient
                  colors={[
                    "rgba(0, 212, 255, 0.2)",
                    "rgba(139, 92, 246, 0.2)",
                  ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    padding: 16,
                    flexDirection: "row",
                    alignItems: "center",
                    borderWidth: 1,
                    borderColor: "rgba(0, 212, 255, 0.3)",
                  }}
                >
                  <View
                    className="rounded-full items-center justify-center mr-4"
                    style={{
                      width: 48,
                      height: 48,
                      backgroundColor: "rgba(0, 212, 255, 0.2)",
                    }}
                  >
                    <Repeat size={24} color="#00D4FF" strokeWidth={2} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-white text-base font-bold mb-1">
                      Repeat
                    </Text>
                    <Text className="text-white/50 text-xs">
                      Create a new todo with the same details
                    </Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={onArchive}
                activeOpacity={0.8}
                className="rounded-2xl overflow-hidden"
              >
                <View
                  style={{
                    padding: 16,
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: "rgba(30, 35, 45, 0.5)",
                    borderWidth: 1,
                    borderColor: "rgba(255, 255, 255, 0.1)",
                  }}
                >
                  <View
                    className="rounded-full items-center justify-center mr-4"
                    style={{
                      width: 48,
                      height: 48,
                      backgroundColor: "rgba(139, 92, 246, 0.2)",
                    }}
                  >
                    <Archive size={24} color="#8B5CF6" strokeWidth={2} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-white text-base font-bold mb-1">
                      Archive
                    </Text>
                    <Text className="text-white/50 text-xs">
                      Move to archive (keeps it clutter-free)
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={onSaveTemplate}
                activeOpacity={0.8}
                className="rounded-2xl overflow-hidden"
              >
                <View
                  style={{
                    padding: 16,
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: "rgba(30, 35, 45, 0.5)",
                    borderWidth: 1,
                    borderColor: "rgba(255, 255, 255, 0.1)",
                  }}
                >
                  <View
                    className="rounded-full items-center justify-center mr-4"
                    style={{
                      width: 48,
                      height: 48,
                      backgroundColor: "rgba(255, 0, 229, 0.2)",
                    }}
                  >
                    <Save size={24} color="#FF00E5" strokeWidth={2} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-white text-base font-bold mb-1">
                      Save as Template
                    </Text>
                    <Text className="text-white/50 text-xs">
                      Reuse this todo structure later
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={onDelete}
                activeOpacity={0.8}
                className="rounded-2xl overflow-hidden"
              >
                <View
                  style={{
                    padding: 16,
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: "rgba(30, 35, 45, 0.5)",
                    borderWidth: 1,
                    borderColor: "rgba(255, 255, 255, 0.1)",
                  }}
                >
                  <View
                    className="rounded-full items-center justify-center mr-4"
                    style={{
                      width: 48,
                      height: 48,
                      backgroundColor: "rgba(255, 0, 0, 0.2)",
                    }}
                  >
                    <Trash2 size={24} color="#FF4444" strokeWidth={2} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-white text-base font-bold mb-1">
                      Delete
                    </Text>
                    <Text className="text-white/50 text-xs">
                      Permanently remove this todo
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={onClose}
              className="py-4 items-center"
              activeOpacity={0.8}
            >
              <Text className="text-white/60 text-base font-semibold">
                Keep as Completed
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }
);

export { AddTodoModal, CompletionWorkflowModal };
export type { AddTodoModalProps, CompletionWorkflowModalProps };
