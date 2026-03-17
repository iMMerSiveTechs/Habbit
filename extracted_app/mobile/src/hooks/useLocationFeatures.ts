import { useEffect, useRef } from "react";
import { AppState, AppStateStatus } from "react-native";
import { GeofenceService } from "@/services/geofenceService";
import { NotificationService } from "@/services/notificationService";
import { api } from "@/lib/habitApi";
import * as Notifications from "expo-notifications";

/**
 * Hook to initialize and manage location-based features
 */
export function useLocationFeatures() {
  const appState = useRef(AppState.currentState);
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    // Initialize notification service
    NotificationService.configure();

    // Load and start monitoring geofences
    const initializeGeofences = async () => {
      try {
        const hasPermissions = await GeofenceService.hasPermissions();
        if (hasPermissions) {
          await GeofenceService.refreshGeofences();
          console.log("Geofence monitoring started");
        }
      } catch (error) {
        console.error("Failed to initialize geofences:", error);
      }
    };

    initializeGeofences();

    // Set up notification listeners
    notificationListener.current = NotificationService.addNotificationReceivedListener(
      (notification) => {
        console.log("Notification received:", notification);
      }
    );

    responseListener.current = NotificationService.addNotificationResponseListener((response) => {
      console.log("Notification tapped:", response);
      // Handle notification tap - could navigate to specific screen based on data
      const data = response.notification.request.content.data;
      if (data.type === "habit_reminder") {
        // Navigate to habits screen
        console.log("Navigate to habit:", data.habitTitle);
      } else if (data.type === "focus_complete") {
        // Navigate to focus screen
        console.log("Focus session complete:", data.taskName);
      } else if (data.geofenceId) {
        // Handle geofence notification
        console.log("Geofence notification for:", data.geofenceId);
      }
    });

    // Handle app state changes
    const subscription = AppState.addEventListener("change", (nextAppState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextAppState === "active") {
        // App has come to the foreground - refresh geofences
        GeofenceService.refreshGeofences().catch(console.error);
      }
      appState.current = nextAppState;
    });

    // Cleanup
    return () => {
      subscription.remove();
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);
}

/**
 * Hook to manage geofences
 */
export function useGeofences() {
  const addGeofence = async (
    name: string,
    category: string,
    latitude: number,
    longitude: number,
    options?: {
      radius?: number;
      linkedHabits?: string[];
      onEnter?: string;
      onExit?: string;
    }
  ) => {
    try {
      // Create geofence on server
      const response = await api.createGeofence({
        name,
        category,
        latitude,
        longitude,
        radius: options?.radius,
        linkedHabits: options?.linkedHabits,
        onEnter: options?.onEnter,
        onExit: options?.onExit,
      });

      // Add to monitoring
      await GeofenceService.addGeofence(response.geofence);

      return response.geofence;
    } catch (error) {
      console.error("Failed to add geofence:", error);
      throw error;
    }
  };

  const removeGeofence = async (geofenceId: string) => {
    try {
      // Delete from server
      await api.deleteGeofence(geofenceId);
      // Remove from local monitoring
      await GeofenceService.removeGeofence(geofenceId);
    } catch (error) {
      console.error("Failed to remove geofence:", error);
      throw error;
    }
  };

  const refreshGeofences = async () => {
    try {
      await GeofenceService.refreshGeofences();
    } catch (error) {
      console.error("Failed to refresh geofences:", error);
      throw error;
    }
  };

  const getCurrentLocation = async () => {
    try {
      return await GeofenceService.getCurrentLocation();
    } catch (error) {
      console.error("Failed to get current location:", error);
      return null;
    }
  };

  return {
    addGeofence,
    removeGeofence,
    refreshGeofences,
    getCurrentLocation,
  };
}
