import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  Switch,
  Alert,
  Platform,
  UIManager,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Calendar, Repeat, X, Trash2, Plus, Circle, GripVertical } from "lucide-react-native";
import { DateTimePickerComponent } from "./DateTimePicker";
import { todosApi } from "@/lib/todosApi";
import { TodoRemindersManager, type LocalReminder } from "./TodoRemindersManager";
import type { Todo, UpdateTodoRequest } from "@/shared/contracts";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface EditTodoModalProps {
  visible: boolean;
  onClose: () => void;
  onUpdate: (todoId: string, data: UpdateTodoRequest) => Promise<void>;
  todo: Todo | null;
}

const ITEM_HEIGHT = 52;

interface DraggableItemProps {
  item: string;
  index: number;
  total: number;
  onRemove: (index: number) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onDragStart: (index: number) => void;
  onDragEnd: (fromIndex: number, toIndex: number) => void;
  draggingIndex: number | null;
  dragY: Animated.SharedValue<number>;
  dragOriginIndex: number | null;
}

function DraggableItem({
  item,
  index,
  total,
  onRemove,
  onDragStart,
  onDragEnd,
  draggingIndex,
  dragY,
  dragOriginIndex,
}: DraggableItemProps) {
  const isDragging = draggingIndex === index;
  const pressScale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    if (isDragging) {
      return {
        transform: [{ translateY: dragY.value }, { scale: 1.04 }],
        zIndex: 999,
        opacity: 0.95,
        shadowOpacity: 0.4,
        elevation: 10,
      };
    }

    // Shift other items out of the way while dragging
    if (draggingIndex !== null && dragOriginIndex !== null) {
      const fromIdx = dragOriginIndex;
      const approxToIdx = Math.round(fromIdx + dragY.value / ITEM_HEIGHT);
      const clampedTo = Math.max(0, Math.min(total - 1, approxToIdx));

      let shift = 0;
      if (fromIdx < clampedTo && index > fromIdx && index <= clampedTo) {
        shift = -ITEM_HEIGHT;
      } else if (fromIdx > clampedTo && index >= clampedTo && index < fromIdx) {
        shift = ITEM_HEIGHT;
      }

      return {
        transform: [{ translateY: withSpring(shift, { damping: 20, stiffness: 200 }) }, { scale: pressScale.value }],
        zIndex: 1,
        opacity: 1,
      };
    }

    return {
      transform: [{ translateY: withTiming(0, { duration: 200 }) }, { scale: pressScale.value }],
      zIndex: 1,
      opacity: 1,
    };
  });

  const dragGesture = Gesture.Pan()
    .activateAfterLongPress(150)
    .onStart(() => {
      runOnJS(onDragStart)(index);
    })
    .onUpdate((e) => {
      dragY.value = e.translationY;
    })
    .onEnd(() => {
      const fromIdx = dragOriginIndex ?? index;
      const approxToIdx = Math.round(fromIdx + dragY.value / ITEM_HEIGHT);
      const clampedTo = Math.max(0, Math.min(total - 1, approxToIdx));
      dragY.value = withSpring(0, { damping: 25, stiffness: 300 });
      runOnJS(onDragEnd)(fromIdx, clampedTo);
    });

  return (
    <GestureDetector gesture={dragGesture}>
      <Animated.View
        style={[
          animatedStyle,
          {
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 14,
            height: ITEM_HEIGHT,
            borderRadius: 16,
            marginBottom: 8,
            backgroundColor: isDragging ? "rgba(0, 212, 255, 0.12)" : "rgba(30, 35, 45, 0.6)",
            borderWidth: isDragging ? 1.5 : 1,
            borderColor: isDragging ? "rgba(0, 212, 255, 0.5)" : "rgba(255, 255, 255, 0.1)",
          },
        ]}
      >
        {/* Drag handle */}
        <View style={{ paddingRight: 10, opacity: 0.35 }}>
          <GripVertical size={16} color="#ffffff" />
        </View>

        <Circle size={15} color="#00D4FF" strokeWidth={2} />
        <Text
          style={{
            color: "#ffffff",
            fontSize: 14,
            marginLeft: 10,
            flex: 1,
          }}
          numberOfLines={1}
        >
          {item}
        </Text>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={`Remove checklist item: ${item}`}
          onPress={() => onRemove(index)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Trash2 size={15} color="#ffffff30" />
        </TouchableOpacity>
      </Animated.View>
    </GestureDetector>
  );
}

export function EditTodoModal({ visible, onClose, onUpdate, todo }: EditTodoModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Checklist items
  const [checklistItems, setChecklistItems] = useState<string[]>([]);
  const [newItem, setNewItem] = useState("");

  // Drag state
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [dragOriginIndex, setDragOriginIndex] = useState<number | null>(null);
  const dragY = useSharedValue(0);

  // Date/Time/Recurring fields
  const [hasDueDate, setHasDueDate] = useState(false);
  const [dueDate, setDueDate] = useState(new Date());
  const [reminders, setReminders] = useState<LocalReminder[]>([]);
  const [recurringEnabled, setRecurringEnabled] = useState(false);
  const [recurringType, setRecurringType] = useState<"daily" | "weekly" | "weekdays" | "weekends">("daily");
  const [recurringDays, setRecurringDays] = useState<number[]>([]);

  useEffect(() => {
    if (todo) {
      setTitle(todo.title);
      setDescription(todo.description || "");
      setPriority(todo.priority);
      setChecklistItems(todo.items?.map(item => item.title) || []);

      if (todo.dueDate) {
        setHasDueDate(true);
        setDueDate(new Date(todo.dueDate));
      } else {
        setHasDueDate(false);
        setDueDate(new Date());
      }

      if (todo.reminders && todo.reminders.length > 0) {
        setReminders(todo.reminders.map((r) => ({
          id: r.id,
          reminderTime: r.reminderTime,
          recurringType: r.recurringType,
          recurringDays: r.recurringDays,
          enabled: r.enabled,
        })));
      } else if (todo.reminderEnabled && todo.reminderTime) {
        setReminders([{
          id: `legacy_${todo.id}`,
          reminderTime: todo.reminderTime,
          recurringType: "daily",
          recurringDays: null,
          enabled: true,
        }]);
      } else {
        setReminders([]);
      }

      if (todo.recurringType) {
        setRecurringEnabled(true);
        setRecurringType(todo.recurringType as "daily" | "weekly" | "weekdays" | "weekends");
        if (todo.recurringDays) {
          try {
            const days = typeof todo.recurringDays === "string"
              ? JSON.parse(todo.recurringDays)
              : todo.recurringDays;
            setRecurringDays(Array.isArray(days) ? days : []);
          } catch {
            setRecurringDays([]);
          }
        }
      } else {
        setRecurringEnabled(false);
        setRecurringType("daily");
        setRecurringDays([]);
      }
    }
  }, [todo]);

  const addChecklistItem = () => {
    if (newItem.trim()) {
      setChecklistItems([...checklistItems, newItem.trim()]);
      setNewItem("");
    }
  };

  const removeChecklistItem = (index: number) => {
    setChecklistItems(checklistItems.filter((_, i) => i !== index));
  };

  const handleDragStart = (index: number) => {
    setDraggingIndex(index);
    setDragOriginIndex(index);
  };

  const handleDragEnd = (fromIndex: number, toIndex: number) => {
    setDraggingIndex(null);
    setDragOriginIndex(null);
    if (fromIndex !== toIndex) {
      const updated = [...checklistItems];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      setChecklistItems(updated);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim() || !todo) return;

    try {
      setIsSubmitting(true);

      await onUpdate(todo.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        dueDate: hasDueDate ? dueDate.toISOString() : undefined,
        reminderEnabled: reminders.length > 0,
        reminderTime: reminders.length > 0 ? reminders[0]?.reminderTime : undefined,
        recurringType: recurringEnabled ? recurringType : undefined,
        recurringDays: recurringEnabled && recurringType === "weekly" && recurringDays.length > 0 ? recurringDays : undefined,
      });

      const oldReminders = todo.reminders || [];
      const oldReminderIds = new Set(oldReminders.map((r) => r.id));
      const newReminderIds = new Set(reminders.map((r) => r.id));

      for (const oldReminder of oldReminders) {
        if (!newReminderIds.has(oldReminder.id)) {
          try { await todosApi.deleteTodoReminder(todo.id, oldReminder.id); } catch {}
        }
      }

      for (const reminder of reminders) {
        if (!oldReminderIds.has(reminder.id) || reminder.id.startsWith("local_")) {
          try {
            const recurringDaysArr = reminder.recurringDays ? JSON.parse(reminder.recurringDays) : undefined;
            await todosApi.addTodoReminder(todo.id, {
              reminderTime: reminder.reminderTime,
              recurringType: reminder.recurringType as "daily" | "weekdays" | "weekends" | "weekly",
              recurringDays: Array.isArray(recurringDaysArr) ? recurringDaysArr : undefined,
              enabled: reminder.enabled,
            });
          } catch {}
        }
      }

      // Sync checklist items — delete all old, add in new order
      const oldItems = todo.items || [];
      for (const oldItem of oldItems) {
        try { await todosApi.deleteTodoItem(todo.id, oldItem.id); } catch {}
      }
      for (let i = 0; i < checklistItems.length; i++) {
        await todosApi.addTodoItem(todo.id, { title: checklistItems[i], order: i });
      }

      onClose();
    } catch (error) {
      console.error("[EditTodoModal] Failed to update todo:", error);
      Alert.alert("Error", "Failed to update todo. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPriorityColor = (p: string) => {
    switch (p) {
      case "high": return "#FF00E5";
      case "medium": return "#00D4FF";
      case "low": return "#8B5CF6";
      default: return "#00D4FF";
    }
  };

  if (!todo) return null;

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
            <Text className="text-white text-xl font-bold">Edit Todo</Text>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Close edit todo"
              onPress={onClose}
            >
              <X size={24} color="#ffffff" />
            </TouchableOpacity>
          </View>

          <ScrollView
            className="flex-1 px-6 py-6"
            scrollEnabled={draggingIndex === null}
          >
            {/* Title */}
            <View className="mb-4">
              <Text className="text-white/60 text-sm mb-2 font-medium">Title *</Text>
              <TextInput
                accessibilityLabel="Todo title"
                accessibilityHint="Enter the title for this todo"
                value={title}
                onChangeText={setTitle}
                placeholder="What needs to be done?"
                placeholderTextColor="#ffffff30"
                className="text-white px-4 py-3.5 rounded-2xl border"
                style={{ backgroundColor: "rgba(30, 35, 45, 0.5)", borderColor: "rgba(255, 255, 255, 0.1)" }}
              />
            </View>

            {/* Description */}
            <View className="mb-4">
              <Text className="text-white/60 text-sm mb-2 font-medium">Description</Text>
              <TextInput
                accessibilityLabel="Todo description"
                accessibilityHint="Add optional details for this todo"
                value={description}
                onChangeText={setDescription}
                placeholder="Add details..."
                placeholderTextColor="#ffffff30"
                multiline
                numberOfLines={3}
                className="text-white px-4 py-3.5 rounded-2xl border"
                style={{ backgroundColor: "rgba(30, 35, 45, 0.5)", borderColor: "rgba(255, 255, 255, 0.1)" }}
                textAlignVertical="top"
              />
            </View>

            {/* Priority */}
            <View className="mb-4">
              <Text className="text-white/60 text-sm mb-2 font-medium">Priority</Text>
              <View className="flex-row gap-3">
                {(["low", "medium", "high"] as const).map((p) => (
                  <TouchableOpacity
                    key={p}
                    accessibilityRole="button"
                    accessibilityLabel={`${p} priority${priority === p ? ", selected" : ""}`}
                    onPress={() => setPriority(p)}
                    className="flex-1 py-3 rounded-2xl items-center"
                    style={{
                      backgroundColor: priority === p ? `${getPriorityColor(p)}20` : "rgba(30, 35, 45, 0.5)",
                      borderWidth: priority === p ? 1.5 : 1,
                      borderColor: priority === p ? getPriorityColor(p) : "rgba(255, 255, 255, 0.1)",
                    }}
                  >
                    <Text
                      className="text-sm font-semibold capitalize"
                      style={{ color: priority === p ? getPriorityColor(p) : "#ffffff50" }}
                    >
                      {p}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Due Date */}
            <View className="mb-4">
              <View
                className="flex-row items-center justify-between px-4 py-3 rounded-2xl mb-2"
                style={{ backgroundColor: "rgba(30, 35, 45, 0.5)", borderWidth: 1, borderColor: "rgba(255, 255, 255, 0.1)" }}
              >
                <View className="flex-row items-center">
                  <Calendar size={20} color="#00D4FF" />
                  <Text className="text-white font-semibold ml-2">Set Due Date</Text>
                </View>
                <Switch
                  accessibilityRole="switch"
                  accessibilityLabel="Set due date"
                  accessibilityState={{ checked: hasDueDate }}
                  value={hasDueDate}
                  onValueChange={setHasDueDate}
                  trackColor={{ false: "#767577", true: "#00D4FF" }}
                  thumbColor={hasDueDate ? "#ffffff" : "#f4f3f4"}
                />
              </View>
              {hasDueDate && (
                <DateTimePickerComponent mode="date" value={dueDate} onChange={setDueDate} minimumDate={new Date()} />
              )}
            </View>

            {/* Reminders */}
            <TodoRemindersManager reminders={reminders} onRemindersChange={setReminders} />

            {/* Recurring */}
            <View className="mb-4">
              <View
                className="flex-row items-center justify-between px-4 py-3 rounded-2xl mb-2"
                style={{ backgroundColor: "rgba(30, 35, 45, 0.5)", borderWidth: 1, borderColor: "rgba(255, 255, 255, 0.1)" }}
              >
                <View className="flex-row items-center">
                  <Repeat size={20} color="#00D4FF" />
                  <Text className="text-white font-semibold ml-2">Make Recurring</Text>
                </View>
                <Switch
                  accessibilityRole="switch"
                  accessibilityLabel="Make recurring"
                  accessibilityState={{ checked: recurringEnabled }}
                  value={recurringEnabled}
                  onValueChange={setRecurringEnabled}
                  trackColor={{ false: "#767577", true: "#00D4FF" }}
                  thumbColor={recurringEnabled ? "#ffffff" : "#f4f3f4"}
                />
              </View>
              {recurringEnabled && (
                <>
                  <View className="flex-row flex-wrap gap-2 mb-3">
                    {(["daily", "weekdays", "weekends", "weekly"] as const).map((type) => (
                      <TouchableOpacity
                        key={type}
                        accessibilityRole="button"
                        accessibilityLabel={`${type} recurrence${recurringType === type ? ", selected" : ""}`}
                        onPress={() => setRecurringType(type)}
                        className="px-4 py-2 rounded-2xl"
                        style={{
                          backgroundColor: recurringType === type ? "#00D4FF20" : "rgba(30, 35, 45, 0.5)",
                          borderWidth: recurringType === type ? 1.5 : 1,
                          borderColor: recurringType === type ? "#00D4FF" : "rgba(255, 255, 255, 0.1)",
                        }}
                      >
                        <Text className="text-sm font-semibold capitalize" style={{ color: recurringType === type ? "#00D4FF" : "#ffffff50" }}>
                          {type}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {recurringType === "weekly" && (
                    <View className="flex-row gap-2">
                      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, i) => (
                        <TouchableOpacity
                          key={i}
                          accessibilityRole="button"
                          accessibilityLabel={`${day}${recurringDays.includes(i) ? ", selected" : ""}`}
                          onPress={() => {
                            if (recurringDays.includes(i)) {
                              setRecurringDays(recurringDays.filter((d) => d !== i));
                            } else {
                              setRecurringDays([...recurringDays, i].sort());
                            }
                          }}
                          className="flex-1 py-2 rounded-xl items-center"
                          style={{
                            backgroundColor: recurringDays.includes(i) ? "#8B5CF620" : "rgba(30, 35, 45, 0.5)",
                            borderWidth: recurringDays.includes(i) ? 1.5 : 1,
                            borderColor: recurringDays.includes(i) ? "#8B5CF6" : "rgba(255, 255, 255, 0.1)",
                          }}
                        >
                          <Text className="text-xs font-semibold" style={{ color: recurringDays.includes(i) ? "#8B5CF6" : "#ffffff50" }}>
                            {day}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </>
              )}
            </View>

            {/* Checklist Items with drag-to-reorder */}
            <View className="mb-4">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-white/60 text-sm font-medium">Checklist Items (Optional)</Text>
                {checklistItems.length > 1 && (
                  <Text className="text-white/30 text-xs">Hold & drag to reorder</Text>
                )}
              </View>

              <View style={{ minHeight: checklistItems.length * (ITEM_HEIGHT + 8) }}>
                {checklistItems.map((item, index) => (
                  <DraggableItem
                    key={`${item}-${index}`}
                    item={item}
                    index={index}
                    total={checklistItems.length}
                    onRemove={removeChecklistItem}
                    onMoveUp={(i) => {
                      if (i > 0) {
                        const updated = [...checklistItems];
                        [updated[i - 1], updated[i]] = [updated[i], updated[i - 1]];
                        setChecklistItems(updated);
                      }
                    }}
                    onMoveDown={(i) => {
                      if (i < checklistItems.length - 1) {
                        const updated = [...checklistItems];
                        [updated[i], updated[i + 1]] = [updated[i + 1], updated[i]];
                        setChecklistItems(updated);
                      }
                    }}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    draggingIndex={draggingIndex}
                    dragY={dragY}
                    dragOriginIndex={dragOriginIndex}
                  />
                ))}
              </View>

              {/* Add new item */}
              <View className="flex-row items-center gap-2 mt-1">
                <TextInput
                  accessibilityLabel="New checklist item"
                  accessibilityHint="Type a checklist item and press done to add it"
                  value={newItem}
                  onChangeText={setNewItem}
                  placeholder="Add checklist item..."
                  placeholderTextColor="#ffffff30"
                  className="flex-1 text-white px-4 py-3.5 rounded-2xl border"
                  style={{ backgroundColor: "rgba(30, 35, 45, 0.5)", borderColor: "rgba(255, 255, 255, 0.1)" }}
                  onSubmitEditing={addChecklistItem}
                  returnKeyType="done"
                />
                <TouchableOpacity accessibilityRole="button" accessibilityLabel="Add checklist item" onPress={addChecklistItem} disabled={!newItem.trim()} style={{ opacity: newItem.trim() ? 1 : 0.5 }}>
                  <LinearGradient
                    colors={["#00D4FF", "#8B5CF6"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{ width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" }}
                  >
                    <Plus size={20} color="#FFFFFF" strokeWidth={2.5} />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>

          <View className="px-6 py-4 border-t border-white/5">
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={isSubmitting ? "Saving changes" : "Save changes"}
              accessibilityHint="Double tap to save your todo changes"
              accessibilityState={{ disabled: !title.trim() || isSubmitting }}
              onPress={handleSubmit}
              disabled={!title.trim() || isSubmitting}
              className="py-4 rounded-2xl items-center"
              style={{ backgroundColor: title.trim() && !isSubmitting ? "#00D4FF" : "rgba(255, 255, 255, 0.1)" }}
            >
              <Text
                className="font-semibold text-lg"
                style={{ color: title.trim() && !isSubmitting ? "#ffffff" : "#ffffff40" }}
              >
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}
