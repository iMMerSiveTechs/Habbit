import { useState, useEffect, useCallback } from "react";
import { api as habitApi } from "@/lib/habitApi";
import { api } from "@/lib/api";
import { todosApi } from "@/lib/todosApi";
import { useAppStore } from "@/state/appStore";
import type { Todo } from "@/shared/contracts";

export function useTodayData(session: any) {
  const [refreshing, setRefreshing] = useState(false);
  const [briefing, setBriefing] = useState<any>(null);
  const [cerebraMessage, setCerebraMessage] = useState<string | null>(null);
  const [habits, setHabits] = useState<any[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [emotionalDashboard, setEmotionalDashboard] = useState<any>(null);
  const [loadingCount, setLoadingCount] = useState(0);

  const subscriptionTier = useAppStore((state) => state.subscriptionTier);
  const integrity = useAppStore((s) => s.integrity);
  const setIntegrity = useAppStore((s) => s.setIntegrity);

  const loadBriefing = useCallback(async () => {
    setLoadingCount((c) => c + 1);
    try {
      const response = await habitApi.getDailyBriefing();
      // Show briefing if we have focus blocks (even without habits)
      if (response.briefing && response.briefing.focusBlocks && response.briefing.focusBlocks.length > 0) {
        setBriefing(response.briefing);
      } else {
        setBriefing(null);
      }
    } catch (error) {
      console.log("No briefing data available");
      setBriefing(null);
    } finally {
      setLoadingCount((c) => c - 1);
    }
  }, []);

  const loadCerebraMessage = useCallback(async () => {
    if (subscriptionTier !== "pro" && subscriptionTier !== "elite") {
      setCerebraMessage(null);
      return;
    }

    setLoadingCount((c) => c + 1);
    try {
      const response = await habitApi.queryCerebra("What should I focus on today?");
      setCerebraMessage(response.response);
    } catch (error) {
      console.log("Cerebra not available");
      setCerebraMessage(null);
    } finally {
      setLoadingCount((c) => c - 1);
    }
  }, [subscriptionTier]);

  const loadHabits = useCallback(async () => {
    setLoadingCount((c) => c + 1);
    try {
      const response = await habitApi.getHabits();
      const allHabits = response.habits || [];
      // Only limit preview tier users; paid users see all habits
      const isPreview = subscriptionTier === "preview";
      setHabits(isPreview ? allHabits.slice(0, 3) : allHabits);
    } catch (error) {
      console.log("No habits data available");
      setHabits([]);
    } finally {
      setLoadingCount((c) => c - 1);
    }
  }, [subscriptionTier]);

  const loadTodos = useCallback(async () => {
    setLoadingCount((c) => c + 1);
    try {
      const response = await todosApi.getTodos();
      const incomplete = response.todos?.filter((t: Todo) => !t.completed) || [];
      // Only limit preview tier users; paid users see all todos
      const isPreview = subscriptionTier === "preview";
      setTodos(isPreview ? incomplete.slice(0, 3) : incomplete);
    } catch (error) {
      console.log("No todos data available");
      setTodos([]);
    } finally {
      setLoadingCount((c) => c - 1);
    }
  }, [subscriptionTier]);

  const loadEmotionalDashboard = useCallback(async () => {
    setLoadingCount((c) => c + 1);
    try {
      const response = await habitApi.getEmotionalDashboard();
      setEmotionalDashboard(response);
    } catch (error) {
      console.log("No emotional dashboard data available");
      setEmotionalDashboard(null);
    } finally {
      setLoadingCount((c) => c - 1);
    }
  }, []);

  const loadIntegrity = useCallback(async () => {
    setLoadingCount((c) => c + 1);
    try {
      const response = await api.get<any>("/api/protocol/integrity");
      if (response?.integrity !== undefined) {
        setIntegrity(response.integrity);
      }
    } catch (error) {
      console.log("No integrity data available");
    } finally {
      setLoadingCount((c) => c - 1);
    }
  }, [setIntegrity]);

  useEffect(() => {
    if (!session) return; // Don't fire API calls until session is confirmed
    loadBriefing();
    loadCerebraMessage();
    loadHabits();
    loadTodos();
    loadEmotionalDashboard();
    loadIntegrity();
  }, [session, loadBriefing, loadCerebraMessage, loadHabits, loadTodos, loadEmotionalDashboard, loadIntegrity]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadBriefing(), loadCerebraMessage(), loadHabits(), loadTodos(), loadEmotionalDashboard()]);
    setRefreshing(false);
  }, [loadBriefing, loadCerebraMessage, loadHabits, loadTodos, loadEmotionalDashboard]);

  return {
    briefing,
    cerebraMessage,
    setCerebraMessage,
    habits,
    todos,
    emotionalDashboard,
    integrity,
    refreshing,
    refresh,
    loading: loadingCount > 0,
    // Expose individual loaders needed by the screen
    loadHabits,
    loadCerebraMessage,
  };
}
