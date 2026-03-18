import { useState, useEffect, useCallback, useRef } from "react";
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

  const isMountedRef = useRef(true);

  const subscriptionTier = useAppStore((state) => state.subscriptionTier);
  const integrity = useAppStore((s) => s.integrity);
  const setIntegrity = useAppStore((s) => s.setIntegrity);

  // Keep refs to latest values so callbacks stay stable
  const subscriptionTierRef = useRef(subscriptionTier);
  subscriptionTierRef.current = subscriptionTier;

  const setIntegrityRef = useRef(setIntegrity);
  setIntegrityRef.current = setIntegrity;

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadBriefing = useCallback(async () => {
    setLoadingCount((c) => c + 1);
    try {
      const response = await habitApi.getDailyBriefing();
      if (!isMountedRef.current) return;
      // Show briefing if we have focus blocks (even without habits)
      if (response.briefing && response.briefing.focusBlocks && response.briefing.focusBlocks.length > 0) {
        setBriefing(response.briefing);
      } else {
        setBriefing(null);
      }
    } catch (error) {
      console.log("No briefing data available");
      if (!isMountedRef.current) return;
      setBriefing(null);
    } finally {
      if (isMountedRef.current) {
        setLoadingCount((c) => c - 1);
      }
    }
  }, []);

  const loadCerebraMessage = useCallback(async () => {
    const tier = subscriptionTierRef.current;
    if (tier !== "pro" && tier !== "elite") {
      if (isMountedRef.current) setCerebraMessage(null);
      return;
    }

    setLoadingCount((c) => c + 1);
    try {
      const response = await habitApi.queryCerebra("What should I focus on today?");
      if (!isMountedRef.current) return;
      setCerebraMessage(response.response);
    } catch (error) {
      console.log("Cerebra not available");
      if (!isMountedRef.current) return;
      setCerebraMessage(null);
    } finally {
      if (isMountedRef.current) {
        setLoadingCount((c) => c - 1);
      }
    }
  }, []);

  const loadHabits = useCallback(async () => {
    setLoadingCount((c) => c + 1);
    try {
      const response = await habitApi.getHabits();
      if (!isMountedRef.current) return;
      const allHabits = response.habits || [];
      // Only limit preview tier users; paid users see all habits
      const isPreview = subscriptionTierRef.current === "preview";
      setHabits(isPreview ? allHabits.slice(0, 3) : allHabits);
    } catch (error) {
      console.log("No habits data available");
      if (!isMountedRef.current) return;
      setHabits([]);
    } finally {
      if (isMountedRef.current) {
        setLoadingCount((c) => c - 1);
      }
    }
  }, []);

  const loadTodos = useCallback(async () => {
    setLoadingCount((c) => c + 1);
    try {
      const response = await todosApi.getTodos();
      if (!isMountedRef.current) return;
      const incomplete = response.todos?.filter((t: Todo) => !t.completed) || [];
      // Only limit preview tier users; paid users see all todos
      const isPreview = subscriptionTierRef.current === "preview";
      setTodos(isPreview ? incomplete.slice(0, 3) : incomplete);
    } catch (error) {
      console.log("No todos data available");
      if (!isMountedRef.current) return;
      setTodos([]);
    } finally {
      if (isMountedRef.current) {
        setLoadingCount((c) => c - 1);
      }
    }
  }, []);

  const loadEmotionalDashboard = useCallback(async () => {
    setLoadingCount((c) => c + 1);
    try {
      const response = await habitApi.getEmotionalDashboard();
      if (!isMountedRef.current) return;
      setEmotionalDashboard(response);
    } catch (error) {
      console.log("No emotional dashboard data available");
      if (!isMountedRef.current) return;
      setEmotionalDashboard(null);
    } finally {
      if (isMountedRef.current) {
        setLoadingCount((c) => c - 1);
      }
    }
  }, []);

  const loadIntegrity = useCallback(async () => {
    setLoadingCount((c) => c + 1);
    try {
      const response = await api.get<any>("/api/protocol/integrity");
      if (!isMountedRef.current) return;
      if (response?.integrity !== undefined) {
        setIntegrityRef.current(response.integrity);
      }
    } catch (error) {
      console.log("No integrity data available");
    } finally {
      if (isMountedRef.current) {
        setLoadingCount((c) => c - 1);
      }
    }
  }, []);

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
    if (isMountedRef.current) {
      setRefreshing(false);
    }
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
