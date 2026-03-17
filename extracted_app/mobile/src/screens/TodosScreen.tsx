import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  RefreshControl,
  Alert,
  Dimensions,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import {
  Plus,
  Check,
  Circle,
  CheckCircle2,
  Trash2,
  Calendar,
  Link,
  ChevronRight,
  LogIn,
  Repeat,
  Archive,
  Save,
  Sparkles,
  Bell,
  Clock,
  Edit3,
  AlertCircle,
  Camera,
  GripVertical,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
} from "lucide-react-native";
import { useTodosStore } from "@/state/todosStore";
import { todosApi } from "@/lib/todosApi";
import type { Todo } from "@/shared/contracts";
import { LiquidGlassCard } from "@/components/LiquidGlassCard";
import { DateTimePickerComponent } from "@/components/DateTimePicker";
import { EditTodoModal } from "@/components/EditTodoModal";
import { TodoRemindersManager, type LocalReminder } from "@/components/TodoRemindersManager";
import { PhotoTaskExtractor } from "@/components/PhotoTaskExtractor";
import { ImageTaskExtractionService, type ExtractedTask } from "@/services/imageTaskExtractionService";
import { useSession } from "@/lib/useSession";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/types";
import * as Haptics from "expo-haptics";
import { AdaptiveIntelligenceService } from "@/services/adaptiveIntelligence";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_PADDING = 24;
const CARD_GAP = 12;
const CARD_WIDTH = (SCREEN_WIDTH - CARD_PADDING * 2 - CARD_GAP) / 2;

export default function TodosScreen() {
  const {
    todos,
    setTodos,
    addTodo,
    removeTodo,
    toggleTodoComplete,
    toggleItemComplete,
    isLoading,
    setLoading,
  } = useTodosStore();

  const { data: session, isPending: isSessionLoading } = useSession();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPhotoExtractor, setShowPhotoExtractor] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [expandedTodos, setExpandedTodos] = useState<Set<string>>(new Set());
  const [completedTodo, setCompletedTodo] = useState<Todo | null>(null);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [reorderList, setReorderList] = useState<Todo[]>([]);

  // Initialize OpenAI API key from environment
  useEffect(() => {
    const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
    if (apiKey) {
      ImageTaskExtractionService.initialize(apiKey);
    }
  }, []);

  useEffect(() => {
    console.log("[TodosScreen] Auth state:", {
      isSessionLoading,
      hasSession: !!session,
      userEmail: session?.user?.email
    });

    if (!isSessionLoading && session) {
      console.log("[TodosScreen] Loading todos for user:", session.user?.email);
      loadTodos();
    } else if (!isSessionLoading && !session) {
      console.log("[TodosScreen] No session, clearing todos");
      // Clear todos if user is not authenticated
      setTodos([]);
      setLoading(false);
    }
  }, [session, isSessionLoading]);

  const loadTodos = async () => {
    if (!session) {
      console.log("[TodosScreen] loadTodos skipped: no session");
      setLoading(false);
      return;
    }

    try {
      console.log("[TodosScreen] Fetching todos from API...");
      setLoading(true);
      const response = await todosApi.getTodos();
      console.log("[TodosScreen] Loaded todos:", response.todos.length);
      setTodos(response.todos);
    } catch (error) {
      console.error("[TodosScreen] Failed to load todos:", error);
      setTodos([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTodos();
    setRefreshing(false);
  };

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

      // Reload todos to show new ones
      await loadTodos();

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

  const handleToggleTodo = async (todo: Todo) => {
    try {
      const newCompleted = !todo.completed;
      toggleTodoComplete(todo.id);
      await todosApi.completeTodo(todo.id, newCompleted);

      // Log engagement event for smart notifications
      if (newCompleted) {
        AdaptiveIntelligenceService.logTodoComplete(todo.id);
      }

      // Show completion modal when completing a todo
      if (newCompleted) {
        setCompletedTodo(todo);
        setShowCompletionModal(true);
      }
    } catch (error) {
      console.error("Failed to toggle todo:", error);
      toggleTodoComplete(todo.id);
    }
  };

  const handleToggleItem = async (todo: Todo, itemId: string) => {
    console.log("[TodosScreen] Toggling item:", { todoId: todo.id, itemId });
    try {
      const item = todo.items.find((i) => i.id === itemId);
      if (!item) {
        console.log("[TodosScreen] Item not found:", itemId);
        return;
      }

      console.log("[TodosScreen] Current item state:", { completed: item.completed });
      toggleItemComplete(todo.id, itemId);
      await todosApi.updateTodoItem(todo.id, itemId, {
        completed: !item.completed,
      });
      console.log("[TodosScreen] Item toggled successfully");
    } catch (error) {
      console.error("[TodosScreen] Failed to toggle item:", error);
      toggleItemComplete(todo.id, itemId);
    }
  };

  const handleDeleteTodo = async (id: string) => {
    Alert.alert("Delete Todo", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            removeTodo(id);
            await todosApi.deleteTodo(id);
          } catch (error) {
            console.error("Failed to delete todo:", error);
          }
        },
      },
    ]);
  };

  const handleEditTodo = (todo: Todo) => {
    setEditingTodo(todo);
    setShowEditModal(true);
  };

  const handleUpdateTodo = async (todoId: string, data: any) => {
    try {
      const response = await todosApi.updateTodo(todoId, data);
      // Update the todo in the store
      setTodos(todos.map(t => t.id === todoId ? response.todo : t));
      console.log("[TodosScreen] Todo updated successfully");
    } catch (error) {
      console.error("[TodosScreen] Failed to update todo:", error);
      throw error;
    }
  };

  const incompleteTodos = todos.filter((t) => !t.completed);
  const completedTodos = todos.filter((t) => t.completed);

  const toggleExpanded = (todoId: string) => {
    console.log("[TodosScreen] Toggling expanded state for todo:", todoId);
    setExpandedTodos((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(todoId)) {
        console.log("[TodosScreen] Collapsing todo:", todoId);
        newSet.delete(todoId);
      } else {
        console.log("[TodosScreen] Expanding todo:", todoId);
        newSet.add(todoId);
      }
      return newSet;
    });
  };

  const enterReorderMode = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setReorderList([...incompleteTodos]);
    setIsReorderMode(true);
  }, [incompleteTodos]);

  const exitReorderMode = useCallback(async () => {
    // Save the new order to the backend
    try {
      const orderedIds = reorderList.map((t) => t.id);
      // Optimistically update the store with new order values
      const updatedTodos = todos.map((t) => {
        const reorderIndex = orderedIds.indexOf(t.id);
        if (reorderIndex !== -1) {
          return { ...t, order: reorderIndex };
        }
        return t;
      });
      setTodos(updatedTodos);
      await todosApi.reorderTodos(orderedIds);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error("[TodosScreen] Failed to save reorder:", error);
      // Reload to get correct order
      await loadTodos();
    }
    setIsReorderMode(false);
  }, [reorderList, todos, setTodos]);

  const moveItem = useCallback((fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= reorderList.length) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setReorderList((prev) => {
      const newList = [...prev];
      const [removed] = newList.splice(fromIndex, 1);
      newList.splice(toIndex, 0, removed);
      return newList;
    });
  }, [reorderList.length]);

  const getPriorityGradient = (priority: string): [string, string, string] => {
    switch (priority) {
      case "high":
        return ["#FF00E5", "#FF0080", "#FF00E5"];
      case "medium":
        return ["#00D4FF", "#8B5CF6", "#00D4FF"];
      case "low":
        return ["#8B5CF6", "#00D4FF", "#8B5CF6"];
      default:
        return ["#00D4FF", "#8B5CF6", "#FF00E5"];
    }
  };

  return (
    <View className="flex-1" style={{ backgroundColor: "#0D1117" }}>
      <SafeAreaView edges={["top"]} className="flex-1">
        {/* Header */}
        <View className="px-6 py-6">
          <Text className="text-white text-3xl font-bold">Todos</Text>
          <Text className="text-white/50 text-sm mt-2">
            Your personal task management system
          </Text>

          <View className="flex-row items-center justify-between mt-5">
            <Text className="text-white/60 text-sm">
              {incompleteTodos.length} active
              {completedTodos.length > 0 &&
                ` • ${completedTodos.length} done`}
            </Text>
            {session && (
              <View className="flex-row items-center space-x-3">
                {/* Reorder Button */}
                {incompleteTodos.length > 1 && !isReorderMode && (
                  <TouchableOpacity
                    onPress={enterReorderMode}
                    className="rounded-full"
                  >
                    <View
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 24,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: "rgba(139, 92, 246, 0.15)",
                        borderWidth: 1.5,
                        borderColor: "#8B5CF6",
                      }}
                    >
                      <ArrowUpDown size={22} color="#8B5CF6" strokeWidth={2.5} />
                    </View>
                  </TouchableOpacity>
                )}

                {/* Photo Upload Button */}
                {!isReorderMode && (
                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    setShowPhotoExtractor(true);
                  }}
                  className="rounded-full"
                >
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 24,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: "rgba(0, 212, 255, 0.15)",
                      borderWidth: 1.5,
                      borderColor: "#00D4FF",
                    }}
                  >
                    <Camera size={22} color="#00D4FF" strokeWidth={2.5} />
                  </View>
                </TouchableOpacity>
                )}

                {/* Add Todo Button */}
                {!isReorderMode && (
                <TouchableOpacity
                  onPress={() => setShowAddModal(true)}
                  className="rounded-full"
                >
                  <LinearGradient
                    colors={["#00D4FF", "#8B5CF6"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 24,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Plus size={24} color="#FFFFFF" strokeWidth={2.5} />
                  </LinearGradient>
                </TouchableOpacity>
                )}

                {/* Done Reordering Button */}
                {isReorderMode && (
                  <TouchableOpacity onPress={exitReorderMode}>
                    <LinearGradient
                      colors={["#00D4FF", "#8B5CF6"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={{
                        paddingHorizontal: 20,
                        paddingVertical: 12,
                        borderRadius: 20,
                      }}
                    >
                      <Text className="text-white text-sm font-bold">Done</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </View>

        {/* Todos Grid */}
        <ScrollView
          className="flex-1 px-6"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#00D4FF"
            />
          }
          contentContainerStyle={{ paddingBottom: 120 }}
        >
          {/* Reorder Mode */}
          {isReorderMode && (
            <View style={{ marginBottom: 20 }}>
              <Text className="text-white/40 text-xs font-semibold mb-3 uppercase tracking-wider">
                Drag to reorder
              </Text>
              {reorderList.map((todo, index) => (
                <ReorderRow
                  key={todo.id}
                  todo={todo}
                  index={index}
                  total={reorderList.length}
                  onMoveUp={() => moveItem(index, index - 1)}
                  onMoveDown={() => moveItem(index, index + 1)}
                  gradientColors={getPriorityGradient(todo.priority)}
                />
              ))}
            </View>
          )}

          {/* Active Todos - Grid Layout */}
          {!isReorderMode && incompleteTodos.length > 0 && (
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: CARD_GAP,
                marginBottom: 20,
              }}
            >
              {incompleteTodos.map((todo) => (
                <TodoGridCard
                  key={todo.id}
                  todo={todo}
                  isExpanded={expandedTodos.has(todo.id)}
                  onToggle={() => handleToggleTodo(todo)}
                  onToggleExpand={() => toggleExpanded(todo.id)}
                  onToggleItem={(itemId) => handleToggleItem(todo, itemId)}
                  onDelete={() => handleDeleteTodo(todo.id)}
                  onEdit={() => handleEditTodo(todo)}
                  gradientColors={getPriorityGradient(todo.priority)}
                  cardWidth={CARD_WIDTH}
                />
              ))}
            </View>
          )}

          {/* Completed Todos */}
          {!isReorderMode && completedTodos.length > 0 && (
            <View className="mt-4">
              <Text className="text-white/40 text-xs font-semibold mb-3 uppercase tracking-wider">
                Completed
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: CARD_GAP }}>
                {completedTodos.map((todo) => (
                  <TodoGridCard
                    key={todo.id}
                    todo={todo}
                    isExpanded={expandedTodos.has(todo.id)}
                    onToggle={() => handleToggleTodo(todo)}
                    onToggleExpand={() => toggleExpanded(todo.id)}
                    onToggleItem={(itemId) => handleToggleItem(todo, itemId)}
                    onDelete={() => handleDeleteTodo(todo.id)}
                    onEdit={() => handleEditTodo(todo)}
                    gradientColors={["#666", "#444", "#666"]}
                    cardWidth={CARD_WIDTH}
                  />
                ))}
              </View>
            </View>
          )}

          {/* Empty State */}
          {todos.length === 0 && !isLoading && !isSessionLoading && (
            <View className="flex-1 items-center justify-center py-20">
              {!session ? (
                // Not authenticated state
                <>
                  <View
                    className="rounded-full items-center justify-center mb-4"
                    style={{
                      width: 80,
                      height: 80,
                      backgroundColor: "rgba(0, 212, 255, 0.1)",
                    }}
                  >
                    <LogIn size={40} color="#00D4FF" strokeWidth={2} />
                  </View>
                  <Text className="text-white text-lg font-semibold">
                    Sign in to view todos
                  </Text>
                  <Text className="text-white/50 text-sm mt-2 text-center px-8 mb-6">
                    Create an account or sign in to start managing your tasks
                  </Text>
                  <TouchableOpacity
                    onPress={() => navigation.navigate("LoginModalScreen")}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={["#00D4FF", "#8B5CF6"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={{
                        paddingHorizontal: 32,
                        paddingVertical: 14,
                        borderRadius: 16,
                        alignItems: "center",
                      }}
                    >
                      <Text className="text-white text-base font-bold">
                        Sign In
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </>
              ) : (
                // Authenticated but no todos
                <>
                  <View
                    className="rounded-full items-center justify-center mb-4"
                    style={{
                      width: 80,
                      height: 80,
                      backgroundColor: "rgba(0, 212, 255, 0.1)",
                    }}
                  >
                    <Check size={40} color="#00D4FF" strokeWidth={2} />
                  </View>
                  <Text className="text-white text-lg font-semibold">
                    No todos yet
                  </Text>
                  <Text className="text-white/50 text-sm mt-2 text-center px-8">
                    Create your first todo to get started
                  </Text>
                </>
              )}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>

      {/* Add Todo Modal */}
      <AddTodoModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={(newTodo) => {
          addTodo(newTodo);
          setShowAddModal(false);
        }}
      />

      {/* Edit Todo Modal */}
      <EditTodoModal
        visible={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingTodo(null);
        }}
        onUpdate={handleUpdateTodo}
        todo={editingTodo}
      />

      {/* Photo Task Extractor Modal */}
      <Modal
        visible={showPhotoExtractor}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowPhotoExtractor(false)}
      >
        <PhotoTaskExtractor
          onTasksExtracted={handleTasksExtracted}
          onClose={() => setShowPhotoExtractor(false)}
        />
      </Modal>

      {/* Completion Workflow Modal */}
      <CompletionWorkflowModal
        visible={showCompletionModal}
        todo={completedTodo}
        onClose={() => {
          setShowCompletionModal(false);
          setCompletedTodo(null);
        }}
        onRepeat={async () => {
          if (completedTodo) {
            try {
              const response = await todosApi.repeatTodo(completedTodo.id, true);
              addTodo(response.todo);
              Alert.alert("Success", "Todo repeated successfully!");
            } catch (error) {
              console.error("Failed to repeat todo:", error);
              Alert.alert("Error", "Failed to repeat todo");
            }
          }
          setShowCompletionModal(false);
          setCompletedTodo(null);
        }}
        onArchive={async () => {
          if (completedTodo) {
            try {
              await todosApi.archiveTodo(completedTodo.id, true);
              removeTodo(completedTodo.id);
              Alert.alert("Success", "Todo archived!");
            } catch (error) {
              console.error("Failed to archive todo:", error);
              Alert.alert("Error", "Failed to archive todo");
            }
          }
          setShowCompletionModal(false);
          setCompletedTodo(null);
        }}
        onSaveTemplate={async () => {
          if (completedTodo) {
            try {
              await todosApi.saveAsTemplate(completedTodo.id, "general");
              Alert.alert("Success", "Saved as template! Check templates when creating new todos.");
            } catch (error) {
              console.error("Failed to save template:", error);
              Alert.alert("Error", "Failed to save as template");
            }
          }
          setShowCompletionModal(false);
          setCompletedTodo(null);
        }}
        onDelete={async () => {
          if (completedTodo) {
            try {
              await todosApi.deleteTodo(completedTodo.id);
              removeTodo(completedTodo.id);
              Alert.alert("Success", "Todo deleted!");
            } catch (error) {
              console.error("Failed to delete todo:", error);
              Alert.alert("Error", "Failed to delete todo");
            }
          }
          setShowCompletionModal(false);
          setCompletedTodo(null);
        }}
      />
    </View>
  );
}

// Reorder Row Component
interface ReorderRowProps {
  todo: Todo;
  index: number;
  total: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
  gradientColors: [string, string, string];
}

function ReorderRow({
  todo,
  index,
  total,
  onMoveUp,
  onMoveDown,
  gradientColors,
}: ReorderRowProps) {
  const completedItems = todo.items.filter((i) => i.completed).length;
  const totalItems = todo.items.length;

  return (
    <View
      className="flex-row items-center mb-3 rounded-2xl overflow-hidden"
      style={{
        backgroundColor: "rgba(30, 35, 45, 0.6)",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.08)",
      }}
    >
      {/* Grip Handle */}
      <View
        className="items-center justify-center px-3"
        style={{ backgroundColor: "rgba(255, 255, 255, 0.03)" }}
      >
        <GripVertical size={20} color="#ffffff30" />
      </View>

      {/* Priority Indicator */}
      <View
        style={{
          width: 4,
          alignSelf: "stretch",
          backgroundColor: gradientColors[0],
        }}
      />

      {/* Todo Info */}
      <View className="flex-1 py-4 px-4">
        <Text className="text-white text-base font-semibold" numberOfLines={1}>
          {todo.title}
        </Text>
        <View className="flex-row items-center mt-1.5 gap-3">
          {todo.priority && (
            <Text
              className="text-xs font-medium capitalize"
              style={{ color: gradientColors[0] }}
            >
              {todo.priority}
            </Text>
          )}
          {totalItems > 0 && (
            <Text className="text-white/40 text-xs">
              {completedItems}/{totalItems} items
            </Text>
          )}
          {todo.dueDate && (
            <Text className="text-white/40 text-xs">
              {new Date(todo.dueDate).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </Text>
          )}
        </View>
      </View>

      {/* Move Buttons */}
      <View className="flex-row items-center pr-2 gap-1">
        <TouchableOpacity
          onPress={onMoveUp}
          disabled={index === 0}
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor:
              index === 0
                ? "rgba(255, 255, 255, 0.03)"
                : "rgba(0, 212, 255, 0.1)",
          }}
        >
          <ChevronUp
            size={20}
            color={index === 0 ? "#ffffff15" : "#00D4FF"}
            strokeWidth={2.5}
          />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onMoveDown}
          disabled={index === total - 1}
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor:
              index === total - 1
                ? "rgba(255, 255, 255, 0.03)"
                : "rgba(0, 212, 255, 0.1)",
          }}
        >
          <ChevronDown
            size={20}
            color={index === total - 1 ? "#ffffff15" : "#00D4FF"}
            strokeWidth={2.5}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Grid Card Component
interface TodoGridCardProps {
  todo: Todo;
  isExpanded: boolean;
  onToggle: () => void;
  onToggleExpand: () => void;
  onToggleItem: (itemId: string) => void;
  onDelete: () => void;
  onEdit: () => void;
  gradientColors: [string, string, string];
  cardWidth: number;
}

function TodoGridCard({
  todo,
  isExpanded,
  onToggle,
  onToggleExpand,
  onToggleItem,
  onDelete,
  onEdit,
  gradientColors,
  cardWidth,
}: TodoGridCardProps) {
  const completedItems = todo.items.filter((i) => i.completed).length;
  const totalItems = todo.items.length;
  const hasItems = totalItems > 0;
  const progress = hasItems ? (completedItems / totalItems) * 100 : 0;
  const isCompleted = todo.completed;

  const isOverdue = () => {
    if (!todo.dueDate || isCompleted) return false;
    const now = new Date();
    const dueDate = new Date(todo.dueDate);
    return dueDate < now;
  };

  const handleCardPress = () => {
    console.log("[TodoGridCard] Card pressed:", {
      todoId: todo.id,
      hasItems,
      isExpanded
    });
    if (hasItems) {
      onToggleExpand();
    } else if (!isCompleted) {
      onToggle();
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={handleCardPress}
      onLongPress={!isCompleted ? onDelete : undefined}
      style={{ width: cardWidth }}
    >
      <LiquidGlassCard gradientColors={isCompleted ? ["#3a3a3a", "#2a2a2a", "#3a3a3a"] : gradientColors}>
        {/* Header */}
        <View className="flex-row items-start justify-between mb-3">
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              if (!isCompleted) {
                console.log("[TodoGridCard] Toggle completion button pressed");
                onToggle();
              }
            }}
            className="mr-2"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            disabled={isCompleted}
          >
            {isCompleted ? (
              <CheckCircle2 size={22} color="#10B981" />
            ) : (
              <Circle size={22} color={gradientColors[0]} strokeWidth={2.5} />
            )}
          </TouchableOpacity>
          <View className="flex-row gap-2">
            {!isCompleted && (
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  console.log("[TodoGridCard] Edit button pressed");
                  onEdit();
                }}
                className="opacity-60"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Edit3 size={16} color="#ffffff" />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                console.log("[TodoGridCard] Delete button pressed");
                onDelete();
              }}
              className="opacity-60"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Trash2 size={16} color={isCompleted ? "#ffffff40" : "#ffffff"} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Title */}
        <Text
          className={`text-base font-bold mb-2 ${
            isCompleted ? "line-through text-white/40" : "text-white"
          }`}
          numberOfLines={2}
        >
          {todo.title}
        </Text>

        {/* Description */}
        {todo.description && !isCompleted && (
          <Text
            className="text-white/50 text-xs mb-3"
            numberOfLines={2}
          >
            {todo.description}
          </Text>
        )}

        {/* Progress Bar for Checklist Items */}
        {hasItems && (
          <View className="mb-3">
            <View className="flex-row items-center justify-between mb-2">
              <Text className={`text-xs font-medium ${isCompleted ? "text-white/30" : "text-white/60"}`}>
                {completedItems}/{totalItems} done
              </Text>
              <Text className={`text-xs font-semibold ${isCompleted ? "text-emerald-600" : completedItems === totalItems ? "text-emerald-400" : "text-white/60"}`}>
                {Math.round(progress)}%
              </Text>
            </View>
            <View className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.08)" }}>
              <LinearGradient
                colors={isCompleted ? ["#10B981", "#059669", "#10B981"] : gradientColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{
                  width: `${progress}%`,
                  height: "100%",
                }}
              />
            </View>
          </View>
        )}

        {/* Completed badge */}
        {isCompleted && (
          <View className="mb-2 flex-row items-center gap-1.5">
            <View className="bg-emerald-500/15 border border-emerald-500/25 rounded-full px-2.5 py-1 flex-row items-center gap-1">
              <CheckCircle2 size={10} color="#10B981" />
              <Text className="text-emerald-400 text-xs font-semibold">Completed</Text>
            </View>
            {todo.completedAt && (
              <Text className="text-white/25 text-xs">
                {new Date(todo.completedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </Text>
            )}
          </View>
        )}

        {/* Meta Tags */}
        {!isCompleted && (
          <View className="flex-row items-center flex-wrap gap-2">
            {todo.dueDate && (
              <View
                className="flex-row items-center rounded-full px-2 py-1"
                style={{ backgroundColor: isOverdue() ? "rgba(255, 59, 48, 0.2)" : "rgba(139, 92, 246, 0.2)" }}
              >
                {isOverdue() ? (
                  <AlertCircle size={10} color="#FF3B30" strokeWidth={2.5} />
                ) : (
                  <Calendar size={10} color="#8B5CF6" strokeWidth={2.5} />
                )}
                <Text className={`text-xs ml-1 font-medium ${isOverdue() ? "text-red-500" : "text-white/70"}`}>
                  {isOverdue() ? "Overdue" : new Date(todo.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </Text>
              </View>
            )}
            {todo.linkedHabitId && (
              <View
                className="flex-row items-center rounded-full px-2 py-1"
                style={{ backgroundColor: "rgba(255, 0, 229, 0.2)" }}
              >
                <Link size={10} color="#FF00E5" strokeWidth={2.5} />
              </View>
            )}
            {hasItems && !isExpanded && (
              <View
                className="flex-row items-center rounded-full px-2 py-1"
                style={{ backgroundColor: "rgba(0, 212, 255, 0.2)" }}
              >
                <ChevronRight size={12} color="#00D4FF" strokeWidth={2.5} />
              </View>
            )}
          </View>
        )}

        {/* Expanded Checklist */}
        {hasItems && isExpanded && (
          <View className="mt-3 pt-3 border-t border-white/10">
            {todo.items.map((item) => (
              <TouchableOpacity
                key={item.id}
                onPress={(e) => {
                  e.stopPropagation();
                  if (!isCompleted) {
                    console.log("[TodoGridCard] Checklist item pressed:", item.id);
                    onToggleItem(item.id);
                  }
                }}
                className="flex-row items-center py-1.5"
                activeOpacity={isCompleted ? 1 : 0.7}
                hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
              >
                {item.completed ? (
                  <CheckCircle2 size={14} color={isCompleted ? "#10B98160" : "#00D4FF"} />
                ) : (
                  <Circle size={14} color="#ffffff40" strokeWidth={2} />
                )}
                <Text
                  className={`text-xs ml-2 flex-1 ${
                    item.completed ? "line-through opacity-40 text-white" : "text-white"
                  }`}
                  numberOfLines={1}
                >
                  {item.title}
                </Text>
              </TouchableOpacity>
            ))}
            {isCompleted && (
              <Text className="text-white/20 text-xs mt-2 text-center">This todo is completed and locked</Text>
            )}
          </View>
        )}
      </LiquidGlassCard>
    </TouchableOpacity>
  );
}

// Add Todo Modal (keeping existing implementation)
interface AddTodoModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (todo: Todo) => void;
}

function AddTodoModal({ visible, onClose, onAdd }: AddTodoModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [checklistItems, setChecklistItems] = useState<string[]>([]);
  const [newItem, setNewItem] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Date/Time/Recurring fields
  const [hasDueDate, setHasDueDate] = useState(false);
  const [dueDate, setDueDate] = useState(new Date());
  const [reminders, setReminders] = useState<LocalReminder[]>([]);
  const [recurringEnabled, setRecurringEnabled] = useState(false);
  const [recurringType, setRecurringType] = useState<"daily" | "weekly" | "weekdays" | "weekends">("daily");
  const [recurringDays, setRecurringDays] = useState<number[]>([]);

  const handleSubmit = async () => {
    if (!title.trim()) {
      console.log("[TodosScreen] Submit blocked: title is empty");
      return;
    }

    console.log("[TodosScreen] Creating todo:", {
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
        reminderTime: reminders.length > 0 ? reminders[0]?.reminderTime : undefined,
        recurringType: recurringEnabled ? recurringType : undefined,
        recurringDays: recurringEnabled && recurringType === "weekly" && recurringDays.length > 0 ? recurringDays : undefined,
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
            recurringType: reminder.recurringType as "daily" | "weekdays" | "weekends" | "weekly",
            recurringDays: Array.isArray(recurringDaysArr) ? recurringDaysArr : undefined,
            enabled: reminder.enabled,
          });
        } catch (err) {
          console.error("[TodosScreen] Failed to create reminder:", err);
        }
      }

      console.log("[TodosScreen] Todo created successfully:", response.todo.id);
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
      console.error("[TodosScreen] Failed to create todo:", error);
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
                          priority === p ? getPriorityColor(p) : "#ffffff50",
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
              <Text className="text-white/60 text-sm mb-2 font-medium">Due Date</Text>
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
                        backgroundColor: isSelected ? `${color}20` : "rgba(30, 35, 45, 0.5)",
                        borderWidth: isSelected ? 1.5 : 1,
                        borderColor: isSelected ? color : "rgba(255, 255, 255, 0.1)",
                      }}
                    >
                      <Text
                        className="text-xs font-bold"
                        style={{ color: isSelected ? color : "#ffffff50" }}
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
                  <Text className="text-white font-semibold ml-2">Custom Date</Text>
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
              <View className="flex-row items-center justify-between px-4 py-3 rounded-2xl mb-2"
                style={{
                  backgroundColor: "rgba(30, 35, 45, 0.5)",
                  borderWidth: 1,
                  borderColor: "rgba(255, 255, 255, 0.1)",
                }}
              >
                <View className="flex-row items-center">
                  <Repeat size={20} color="#00D4FF" />
                  <Text className="text-white font-semibold ml-2">Make Recurring</Text>
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
                    {(["daily", "weekdays", "weekends", "weekly"] as const).map((type) => (
                      <TouchableOpacity
                        key={type}
                        onPress={() => setRecurringType(type)}
                        className="px-4 py-2 rounded-2xl"
                        style={{
                          backgroundColor: recurringType === type ? "#00D4FF20" : "rgba(30, 35, 45, 0.5)",
                          borderWidth: recurringType === type ? 1.5 : 1,
                          borderColor: recurringType === type ? "#00D4FF" : "rgba(255, 255, 255, 0.1)",
                        }}
                      >
                        <Text
                          className="text-sm font-semibold capitalize"
                          style={{ color: recurringType === type ? "#00D4FF" : "#ffffff50" }}
                        >
                          {type}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {recurringType === "weekly" && (
                    <View className="flex-row gap-2">
                      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, index) => (
                        <TouchableOpacity
                          key={index}
                          onPress={() => {
                            if (recurringDays.includes(index)) {
                              setRecurringDays(recurringDays.filter((d) => d !== index));
                            } else {
                              setRecurringDays([...recurringDays, index].sort());
                            }
                          }}
                          className="flex-1 py-2 rounded-xl items-center"
                          style={{
                            backgroundColor: recurringDays.includes(index) ? "#8B5CF620" : "rgba(30, 35, 45, 0.5)",
                            borderWidth: recurringDays.includes(index) ? 1.5 : 1,
                            borderColor: recurringDays.includes(index) ? "#8B5CF6" : "rgba(255, 255, 255, 0.1)",
                          }}
                        >
                          <Text
                            className="text-xs font-semibold"
                            style={{ color: recurringDays.includes(index) ? "#8B5CF6" : "#ffffff50" }}
                          >
                            {day}
                          </Text>
                        </TouchableOpacity>
                      ))}
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
                  <Text className="text-white text-sm ml-3 flex-1">{item}</Text>
                  <TouchableOpacity onPress={() => removeChecklistItem(index)}>
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
}

// Completion Workflow Modal
interface CompletionWorkflowModalProps {
  visible: boolean;
  todo: Todo | null;
  onClose: () => void;
  onRepeat: () => void;
  onArchive: () => void;
  onSaveTemplate: () => void;
  onDelete: () => void;
}

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
              <CheckCircle2 size={40} color="#00D4FF" strokeWidth={2} />
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
                colors={["rgba(0, 212, 255, 0.2)", "rgba(139, 92, 246, 0.2)"]}
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
