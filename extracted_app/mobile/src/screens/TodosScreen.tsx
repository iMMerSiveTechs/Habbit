import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import {
  Plus,
  Camera,
  ArrowUpDown,
} from "lucide-react-native";
import { useTodosStore } from "@/state/todosStore";
import { todosApi } from "@/lib/todosApi";
import type { Todo } from "@/shared/contracts";
import { EditTodoModal } from "@/components/EditTodoModal";
import { useSession } from "@/lib/useSession";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/types";
import * as Haptics from "expo-haptics";
import { AdaptiveIntelligenceService } from "@/services/adaptiveIntelligence";

// Extracted sub-components
import { PhotoTaskExtractorModal } from "@/components/todos/PhotoTaskExtractor";
import { TodoListSection } from "@/components/todos/TodoListSection";
import { AddTodoModal, CompletionWorkflowModal } from "@/components/todos/AddEditTodoForm";

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

  // ─── Data Loading ───────────────────────────────────────────
  useEffect(() => {
    console.log("[TodosScreen] Auth state:", {
      isSessionLoading,
      hasSession: !!session,
      userEmail: session?.user?.email,
    });

    if (!isSessionLoading && session) {
      console.log("[TodosScreen] Loading todos for user:", session.user?.email);
      loadTodos();
    } else if (!isSessionLoading && !session) {
      console.log("[TodosScreen] No session, clearing todos");
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

  // ─── Handlers ───────────────────────────────────────────────
  const handleTasksExtracted = useCallback(async () => {
    // Reload todos after photo extraction creates them
    await loadTodos();
  }, [session]);

  const handleToggleTodo = useCallback(async (todo: Todo) => {
    try {
      const newCompleted = !todo.completed;
      toggleTodoComplete(todo.id);
      await todosApi.completeTodo(todo.id, newCompleted);

      if (newCompleted) {
        AdaptiveIntelligenceService.logTodoComplete(todo.id);
        setCompletedTodo(todo);
        setShowCompletionModal(true);
      }
    } catch (error) {
      console.error("Failed to toggle todo:", error);
      toggleTodoComplete(todo.id);
    }
  }, [toggleTodoComplete]);

  const handleToggleItem = useCallback(async (todo: Todo, itemId: string) => {
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
  }, [toggleItemComplete]);

  const handleDeleteTodo = useCallback(async (id: string) => {
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
  }, [removeTodo]);

  const handleEditTodo = useCallback((todo: Todo) => {
    setEditingTodo(todo);
    setShowEditModal(true);
  }, []);

  const handleUpdateTodo = useCallback(async (todoId: string, data: any) => {
    try {
      const response = await todosApi.updateTodo(todoId, data);
      setTodos(todos.map((t) => (t.id === todoId ? response.todo : t)));
      console.log("[TodosScreen] Todo updated successfully");
    } catch (error) {
      console.error("[TodosScreen] Failed to update todo:", error);
      throw error;
    }
  }, [todos, setTodos]);

  const toggleExpanded = useCallback((todoId: string) => {
    console.log("[TodosScreen] Toggling expanded state for todo:", todoId);
    setExpandedTodos((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(todoId)) {
        newSet.delete(todoId);
      } else {
        newSet.add(todoId);
      }
      return newSet;
    });
  }, []);

  // ─── Reorder ────────────────────────────────────────────────
  const incompleteTodos = todos.filter((t) => !t.completed);
  const completedTodos = todos.filter((t) => t.completed);

  const enterReorderMode = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setReorderList([...incompleteTodos]);
    setIsReorderMode(true);
  }, [incompleteTodos]);

  const exitReorderMode = useCallback(async () => {
    try {
      const orderedIds = reorderList.map((t) => t.id);
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
      await loadTodos();
    }
    setIsReorderMode(false);
  }, [reorderList, todos, setTodos]);

  const moveItem = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (toIndex < 0 || toIndex >= reorderList.length) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setReorderList((prev) => {
        const newList = [...prev];
        const [removed] = newList.splice(fromIndex, 1);
        newList.splice(toIndex, 0, removed);
        return newList;
      });
    },
    [reorderList.length]
  );

  // ─── Completion workflow handlers ───────────────────────────
  const closeCompletionModal = useCallback(() => {
    setShowCompletionModal(false);
    setCompletedTodo(null);
  }, []);

  const handleRepeat = useCallback(async () => {
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
    closeCompletionModal();
  }, [completedTodo, addTodo, closeCompletionModal]);

  const handleArchive = useCallback(async () => {
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
    closeCompletionModal();
  }, [completedTodo, removeTodo, closeCompletionModal]);

  const handleSaveTemplate = useCallback(async () => {
    if (completedTodo) {
      try {
        await todosApi.saveAsTemplate(completedTodo.id, "general");
        Alert.alert(
          "Success",
          "Saved as template! Check templates when creating new todos."
        );
      } catch (error) {
        console.error("Failed to save template:", error);
        Alert.alert("Error", "Failed to save as template");
      }
    }
    closeCompletionModal();
  }, [completedTodo, closeCompletionModal]);

  const handleCompletionDelete = useCallback(async () => {
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
    closeCompletionModal();
  }, [completedTodo, removeTodo, closeCompletionModal]);

  // ─── Render ─────────────────────────────────────────────────
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
                      <ArrowUpDown
                        size={22}
                        color="#8B5CF6"
                        strokeWidth={2.5}
                      />
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
                      <Text className="text-white text-sm font-bold">
                        Done
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </View>

        {/* Todo List */}
        <TodoListSection
          todos={todos}
          onToggle={handleToggleTodo}
          onEdit={handleEditTodo}
          onDelete={handleDeleteTodo}
          onToggleItem={handleToggleItem}
          expandedTodos={expandedTodos}
          onToggleExpand={toggleExpanded}
          isReorderMode={isReorderMode}
          reorderList={reorderList}
          onMoveItem={moveItem}
          refreshing={refreshing}
          onRefresh={onRefresh}
          isLoading={isLoading}
          isSessionLoading={isSessionLoading}
          hasSession={!!session}
          onNavigateLogin={() => navigation.navigate("LoginModalScreen")}
        />
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
      <PhotoTaskExtractorModal
        visible={showPhotoExtractor}
        onTasksExtracted={handleTasksExtracted}
        onClose={() => setShowPhotoExtractor(false)}
      />

      {/* Completion Workflow Modal */}
      <CompletionWorkflowModal
        visible={showCompletionModal}
        todo={completedTodo}
        onClose={closeCompletionModal}
        onRepeat={handleRepeat}
        onArchive={handleArchive}
        onSaveTemplate={handleSaveTemplate}
        onDelete={handleCompletionDelete}
      />
    </View>
  );
}
