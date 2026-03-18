/**
 * TodoListSection - Scrollable list of todos with grid layout, reorder mode,
 * and empty state. Includes TodoGridCard and ReorderRow sub-components.
 */

import React, { useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  Check,
  Circle,
  CheckCircle2,
  Trash2,
  Calendar,
  Link,
  ChevronRight,
  LogIn,
  Edit3,
  AlertCircle,
  GripVertical,
  ChevronUp,
  ChevronDown,
} from "lucide-react-native";
import type { Todo } from "@/shared/contracts";
import { LiquidGlassCard } from "@/components/LiquidGlassCard";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_PADDING = 24;
const CARD_GAP = 12;
const CARD_WIDTH = (SCREEN_WIDTH - CARD_PADDING * 2 - CARD_GAP) / 2;

// ─── Utility ────────────────────────────────────────────────
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

// ─── Props ──────────────────────────────────────────────────
interface TodoListSectionProps {
  todos: Todo[];
  onToggle: (todo: Todo) => void;
  onEdit: (todo: Todo) => void;
  onDelete: (id: string) => void;
  onToggleItem: (todo: Todo, itemId: string) => void;
  expandedTodos: Set<string>;
  onToggleExpand: (todoId: string) => void;
  /** Reorder mode state */
  isReorderMode: boolean;
  reorderList: Todo[];
  onMoveItem: (fromIndex: number, toIndex: number) => void;
  /** Pull-to-refresh */
  refreshing: boolean;
  onRefresh: () => void;
  /** Loading / auth */
  isLoading: boolean;
  isSessionLoading: boolean;
  hasSession: boolean;
  onNavigateLogin: () => void;
}

// ─── ReorderRow ─────────────────────────────────────────────
interface ReorderRowProps {
  todo: Todo;
  index: number;
  total: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
  gradientColors: [string, string, string];
}

const ReorderRow = React.memo(function ReorderRow({
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
});

// ─── TodoGridCard ───────────────────────────────────────────
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

const TodoGridCard = React.memo(function TodoGridCard({
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
      isExpanded,
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
      <LiquidGlassCard
        gradientColors={
          isCompleted ? ["#3a3a3a", "#2a2a2a", "#3a3a3a"] : gradientColors
        }
      >
        {/* Header */}
        <View className="flex-row items-start justify-between mb-3">
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              if (!isCompleted) {
                console.log(
                  "[TodoGridCard] Toggle completion button pressed"
                );
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
              <Circle
                size={22}
                color={gradientColors[0]}
                strokeWidth={2.5}
              />
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
              <Trash2
                size={16}
                color={isCompleted ? "#ffffff40" : "#ffffff"}
              />
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
          <Text className="text-white/50 text-xs mb-3" numberOfLines={2}>
            {todo.description}
          </Text>
        )}

        {/* Progress Bar for Checklist Items */}
        {hasItems && (
          <View className="mb-3">
            <View className="flex-row items-center justify-between mb-2">
              <Text
                className={`text-xs font-medium ${
                  isCompleted ? "text-white/30" : "text-white/60"
                }`}
              >
                {completedItems}/{totalItems} done
              </Text>
              <Text
                className={`text-xs font-semibold ${
                  isCompleted
                    ? "text-emerald-600"
                    : completedItems === totalItems
                      ? "text-emerald-400"
                      : "text-white/60"
                }`}
              >
                {Math.round(progress)}%
              </Text>
            </View>
            <View
              className="h-2 rounded-full overflow-hidden"
              style={{ backgroundColor: "rgba(255,255,255,0.08)" }}
            >
              <LinearGradient
                colors={
                  isCompleted
                    ? ["#10B981", "#059669", "#10B981"]
                    : gradientColors
                }
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
              <Text className="text-emerald-400 text-xs font-semibold">
                Completed
              </Text>
            </View>
            {todo.completedAt && (
              <Text className="text-white/25 text-xs">
                {new Date(todo.completedAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
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
                style={{
                  backgroundColor: isOverdue()
                    ? "rgba(255, 59, 48, 0.2)"
                    : "rgba(139, 92, 246, 0.2)",
                }}
              >
                {isOverdue() ? (
                  <AlertCircle
                    size={10}
                    color="#FF3B30"
                    strokeWidth={2.5}
                  />
                ) : (
                  <Calendar size={10} color="#8B5CF6" strokeWidth={2.5} />
                )}
                <Text
                  className={`text-xs ml-1 font-medium ${
                    isOverdue() ? "text-red-500" : "text-white/70"
                  }`}
                >
                  {isOverdue()
                    ? "Overdue"
                    : new Date(todo.dueDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
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
                    console.log(
                      "[TodoGridCard] Checklist item pressed:",
                      item.id
                    );
                    onToggleItem(item.id);
                  }
                }}
                className="flex-row items-center py-1.5"
                activeOpacity={isCompleted ? 1 : 0.7}
                hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
              >
                {item.completed ? (
                  <CheckCircle2
                    size={14}
                    color={isCompleted ? "#10B98160" : "#00D4FF"}
                  />
                ) : (
                  <Circle size={14} color="#ffffff40" strokeWidth={2} />
                )}
                <Text
                  className={`text-xs ml-2 flex-1 ${
                    item.completed
                      ? "line-through opacity-40 text-white"
                      : "text-white"
                  }`}
                  numberOfLines={1}
                >
                  {item.title}
                </Text>
              </TouchableOpacity>
            ))}
            {isCompleted && (
              <Text className="text-white/20 text-xs mt-2 text-center">
                This todo is completed and locked
              </Text>
            )}
          </View>
        )}
      </LiquidGlassCard>
    </TouchableOpacity>
  );
});

// ─── TodoListSection (main export) ──────────────────────────
const TodoListSection = React.memo(function TodoListSection({
  todos,
  onToggle,
  onEdit,
  onDelete,
  onToggleItem,
  expandedTodos,
  onToggleExpand,
  isReorderMode,
  reorderList,
  onMoveItem,
  refreshing,
  onRefresh,
  isLoading,
  isSessionLoading,
  hasSession,
  onNavigateLogin,
}: TodoListSectionProps) {
  const incompleteTodos = todos.filter((t) => !t.completed);
  const completedTodos = todos.filter((t) => t.completed);

  return (
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
              onMoveUp={() => onMoveItem(index, index - 1)}
              onMoveDown={() => onMoveItem(index, index + 1)}
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
              onToggle={() => onToggle(todo)}
              onToggleExpand={() => onToggleExpand(todo.id)}
              onToggleItem={(itemId) => onToggleItem(todo, itemId)}
              onDelete={() => onDelete(todo.id)}
              onEdit={() => onEdit(todo)}
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
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: CARD_GAP,
            }}
          >
            {completedTodos.map((todo) => (
              <TodoGridCard
                key={todo.id}
                todo={todo}
                isExpanded={expandedTodos.has(todo.id)}
                onToggle={() => onToggle(todo)}
                onToggleExpand={() => onToggleExpand(todo.id)}
                onToggleItem={(itemId) => onToggleItem(todo, itemId)}
                onDelete={() => onDelete(todo.id)}
                onEdit={() => onEdit(todo)}
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
          {!hasSession ? (
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
                onPress={onNavigateLogin}
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
  );
});

export { TodoListSection, getPriorityGradient };
export type { TodoListSectionProps };
