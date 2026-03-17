import { View, Text, ScrollView, Pressable, RefreshControl } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useState, useEffect } from "react";
import { Calendar, ChevronLeft, ChevronRight, CheckCircle2, Circle, Clock } from "lucide-react-native";
import { GlassCard } from "../components/GlassCard";
import * as Haptics from "expo-haptics";
import { todosApi } from "../lib/todosApi";
import { api as habitApi } from "../lib/habitApi";
import type { Todo } from "@/shared/contracts";
import type { Habit } from "@/shared/contracts";

interface CalendarEvent {
  id: string;
  title: string;
  type: "habit" | "todo";
  completed: boolean;
  time?: string;
  priority?: "low" | "medium" | "high";
  color?: string;
}

export function CalendarScreen() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [todos, setTodos] = useState<Todo[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [events, setEvents] = useState<Record<string, CalendarEvent[]>>({});
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("[CalendarScreen] Component mounted");
    loadData();
  }, []);

  useEffect(() => {
    console.log("[CalendarScreen] Data changed, regenerating events");
    generateEvents();
  }, [todos, habits, currentMonth]);

  const loadData = async () => {
    try {
      console.log("[CalendarScreen] Loading calendar data...");
      setLoading(true);
      const [todosRes, habitsRes] = await Promise.all([
        todosApi.getTodos(),
        habitApi.getHabits(),
      ]);
      console.log("[CalendarScreen] Todos loaded:", todosRes.todos?.length || 0);
      console.log("[CalendarScreen] Habits loaded:", habitsRes.habits?.length || 0);
      setTodos(todosRes.todos || []);
      setHabits(habitsRes.habits || []);
    } catch (error) {
      console.error("[CalendarScreen] Error loading calendar data:", error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const generateEvents = () => {
    console.log("[CalendarScreen] Generating events for month:", currentMonth.toISOString());
    const eventsMap: Record<string, CalendarEvent[]> = {};
    const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

    console.log("[CalendarScreen] Processing todos:", todos.length);
    // Process todos with due dates and recurring schedules
    todos.forEach((todo) => {
      if (todo.dueDate) {
        const dueDate = new Date(todo.dueDate);
        const dateKey = formatDateKey(dueDate);
        if (!eventsMap[dateKey]) eventsMap[dateKey] = [];
        eventsMap[dateKey].push({
          id: todo.id,
          title: todo.title,
          type: "todo",
          completed: todo.completed,
          time: todo.reminderTime || undefined,
          priority: todo.priority,
        });
      }

      // Handle recurring todos
      if (todo.recurringType && todo.recurringType !== "none" && todo.reminderEnabled) {
        console.log("[CalendarScreen] Processing recurring todo:", todo.title, todo.recurringType);
        const recurringDates = generateRecurringDates(
          startOfMonth,
          endOfMonth,
          todo.recurringType,
          todo.recurringInterval,
          todo.recurringDays
        );

        recurringDates.forEach((date) => {
          const dateKey = formatDateKey(date);
          if (!eventsMap[dateKey]) eventsMap[dateKey] = [];
          eventsMap[dateKey].push({
            id: `${todo.id}-${dateKey}`,
            title: todo.title,
            type: "todo",
            completed: false,
            time: todo.reminderTime || undefined,
            priority: todo.priority,
          });
        });
      }
    });

    console.log("[CalendarScreen] Processing habits:", habits.length);
    // Process habits with recurring schedules
    habits.forEach((habit: any) => {
      if (habit.recurringType && habit.reminderEnabled) {
        console.log("[CalendarScreen] Processing recurring habit:", habit.title, habit.recurringType);
        const recurringDates = generateRecurringDates(
          startOfMonth,
          endOfMonth,
          habit.recurringType,
          habit.recurringInterval,
          habit.recurringDays
        );

        recurringDates.forEach((date) => {
          const dateKey = formatDateKey(date);
          if (!eventsMap[dateKey]) eventsMap[dateKey] = [];
          eventsMap[dateKey].push({
            id: `${habit.id}-${dateKey}`,
            title: habit.title,
            type: "habit",
            completed: false,
            time: habit.reminderTime || undefined,
            color: habit.color,
          });
        });
      }
    });

    console.log("[CalendarScreen] Generated events for", Object.keys(eventsMap).length, "days");
    setEvents(eventsMap);
  };

  const generateRecurringDates = (
    start: Date,
    end: Date,
    recurringType: string,
    interval: number | null,
    recurringDays: string | null
  ): Date[] => {
    const dates: Date[] = [];
    const current = new Date(start);

    while (current <= end) {
      let shouldInclude = false;

      switch (recurringType) {
        case "daily":
          shouldInclude = true;
          break;
        case "weekdays":
          shouldInclude = current.getDay() >= 1 && current.getDay() <= 5;
          break;
        case "weekends":
          shouldInclude = current.getDay() === 0 || current.getDay() === 6;
          break;
        case "weekly":
          if (recurringDays) {
            try {
              const days = JSON.parse(recurringDays) as number[];
              shouldInclude = days.includes(current.getDay());
            } catch (e) {
              console.error("Error parsing recurring days:", e);
            }
          }
          break;
        case "custom":
          if (interval) {
            const daysDiff = Math.floor((current.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
            shouldInclude = daysDiff % interval === 0;
          }
          break;
      }

      if (shouldInclude) {
        dates.push(new Date(current));
      }

      current.setDate(current.getDate() + 1);
    }

    return dates;
  };

  const formatDateKey = (date: Date): string => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  };

  const getDaysInMonth = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];

    // Add empty slots for days before the month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add all days in the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const changeMonth = (direction: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + direction);
    setCurrentMonth(newMonth);
  };

  const isToday = (date: Date | null): boolean => {
    if (!date) return false;
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isSelectedDate = (date: Date | null): boolean => {
    if (!date) return false;
    return (
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
    );
  };

  const getEventsForDate = (date: Date | null): CalendarEvent[] => {
    if (!date) return [];
    const dateKey = formatDateKey(date);
    return events[dateKey] || [];
  };

  const selectedDateEvents = getEventsForDate(selectedDate);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const priorityColors = {
    high: "#FF00E5",
    medium: "#00D4FF",
    low: "#8B5CF6",
  };

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={["#050813", "#0D1929"]}
        style={{ flex: 1 }}
      >
        {loading ? (
          <View className="flex-1 items-center justify-center">
            <Text className="text-white/60 text-lg">Loading calendar...</Text>
          </View>
        ) : (
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingBottom: 100 }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00D4FF" />
            }
          >
          {/* Header */}
          <View className="px-5 pt-4 pb-6">
            <Text className="text-white text-3xl font-semibold">Calendar</Text>
            <Text className="text-white/60 text-base mt-1">Track your habits and todos across time</Text>
          </View>

          {/* Month Navigator */}
          <GlassCard className="mx-5 mb-5 p-4">
            <View className="flex-row items-center justify-between">
              <Pressable
                onPress={() => changeMonth(-1)}
                className="p-2 active:scale-90"
              >
                <ChevronLeft size={24} color="#00D4FF" />
              </Pressable>

              <Text className="text-white text-xl font-bold">
                {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
              </Text>

              <Pressable
                onPress={() => changeMonth(1)}
                className="p-2 active:scale-90"
              >
                <ChevronRight size={24} color="#00D4FF" />
              </Pressable>
            </View>
          </GlassCard>

          {/* Calendar Grid */}
          <GlassCard className="mx-5 mb-5 p-4">
            {/* Day names */}
            <View className="flex-row mb-2">
              {dayNames.map((day) => (
                <View key={day} className="flex-1 items-center">
                  <Text className="text-white/50 text-xs font-semibold">{day}</Text>
                </View>
              ))}
            </View>

            {/* Calendar days */}
            <View className="flex-row flex-wrap">
              {getDaysInMonth().map((date, index) => {
                const dayEvents = getEventsForDate(date);
                const hasEvents = dayEvents.length > 0;
                const isTodayDate = isToday(date);
                const isSelected = isSelectedDate(date);

                return (
                  <Pressable
                    key={index}
                    onPress={() => {
                      if (date) {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setSelectedDate(date);
                      }
                    }}
                    disabled={!date}
                    className={`w-[14.28%] aspect-square items-center justify-center mb-2 ${
                      !date ? "opacity-0" : ""
                    }`}
                  >
                    <View
                      className={`w-10 h-10 rounded-full items-center justify-center ${
                        isSelected
                          ? "bg-neon-cyan"
                          : isTodayDate
                          ? "bg-neon-cyan/20 border-2 border-neon-cyan"
                          : ""
                      }`}
                    >
                      <Text
                        className={`font-semibold ${
                          isSelected
                            ? "text-obsidian-dark"
                            : isTodayDate
                            ? "text-neon-cyan"
                            : "text-white"
                        }`}
                      >
                        {date?.getDate()}
                      </Text>
                    </View>
                    {hasEvents && !isSelected && (
                      <View className="flex-row gap-1 mt-1">
                        {dayEvents.slice(0, 3).map((_, i) => (
                          <View key={i} className="w-1 h-1 rounded-full bg-neon-magenta" />
                        ))}
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </GlassCard>

          {/* Selected Date Events */}
          <GlassCard className="mx-5 mb-5 p-4">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-white text-xl font-bold">
                {selectedDate.toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric"
                })}
              </Text>
              {selectedDateEvents.length > 0 && (
                <View className="bg-neon-cyan/20 px-3 py-1 rounded-full">
                  <Text className="text-neon-cyan font-semibold text-sm">
                    {selectedDateEvents.length} event{selectedDateEvents.length !== 1 ? "s" : ""}
                  </Text>
                </View>
              )}
            </View>

            {selectedDateEvents.length === 0 ? (
              <View className="items-center py-8">
                <Circle size={48} color="#ffffff" opacity={0.2} />
                <Text className="text-white/40 mt-4 text-center">
                  No events scheduled for this day
                </Text>
              </View>
            ) : (
              <View className="gap-3">
                {selectedDateEvents
                  .sort((a, b) => {
                    if (a.time && b.time) return a.time.localeCompare(b.time);
                    if (a.time) return -1;
                    if (b.time) return 1;
                    return 0;
                  })
                  .map((event) => (
                    <View
                      key={event.id}
                      className="flex-row items-center p-3 bg-white/5 rounded-xl border border-white/10"
                    >
                      {event.completed ? (
                        <CheckCircle2 size={20} color="#00FFB3" />
                      ) : (
                        <Circle size={20} color={event.type === "habit" && event.color ? event.color : priorityColors[event.priority || "medium"]} />
                      )}

                      <View className="flex-1 ml-3">
                        <Text className={`text-white font-semibold ${event.completed ? "line-through opacity-50" : ""}`}>
                          {event.title}
                        </Text>
                        <View className="flex-row items-center gap-2 mt-1">
                          <Text className={`text-xs ${event.type === "habit" ? "text-neon-cyan" : "text-neon-magenta"}`}>
                            {event.type === "habit" ? "Habit" : "Todo"}
                          </Text>
                          {event.time && (
                            <>
                              <Text className="text-white/30">•</Text>
                              <View className="flex-row items-center">
                                <Clock size={12} color="#ffffff" opacity={0.5} />
                                <Text className="text-white/50 text-xs ml-1">{event.time}</Text>
                              </View>
                            </>
                          )}
                        </View>
                      </View>

                      {event.priority && event.type === "todo" && (
                        <View
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: priorityColors[event.priority] }}
                        />
                      )}
                    </View>
                  ))}
              </View>
            )}
          </GlassCard>
        </ScrollView>
        )}
      </LinearGradient>
    </View>
  );
}
