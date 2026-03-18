import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import * as Notifications from "expo-notifications";
import { api } from "@/lib/habitApi";

const GEOFENCE_TASK = "GEOFENCE_MONITORING_TASK";

// Deduplication: track recent geofence events
const recentEvents = new Map<string, number>(); // geofenceId -> timestamp
const DEDUP_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

function isDuplicate(geofenceId: string): boolean {
  const now = Date.now();
  const lastEvent = recentEvents.get(geofenceId);
  if (lastEvent && now - lastEvent < DEDUP_WINDOW_MS) {
    return true;
  }
  recentEvents.set(geofenceId, now);
  // Clean old entries
  for (const [key, time] of recentEvents) {
    if (now - time > DEDUP_WINDOW_MS) recentEvents.delete(key);
  }
  return false;
}

export interface Geofence {
  id: string;
  name: string;
  category: string;
  latitude: number;
  longitude: number;
  radius: number;
  linkedHabits?: string[];
  onEnter?: string;
  onExit?: string;
}

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Define the geofencing task
TaskManager.defineTask(GEOFENCE_TASK, async ({ data, error }) => {
  if (error) {
    console.error("Geofence task error:", error);
    return;
  }

  if (data) {
    const { eventType, region } = data as {
      eventType: Location.GeofencingEventType;
      region: Location.LocationRegion;
    };

    console.log(`Geofence event: ${eventType} for region ${region.identifier}`);

    if (isDuplicate(region.identifier)) {
      console.log(`[Geofence] Duplicate event for ${region.identifier}, skipping`);
      return;
    }

    try {
      // Parse the region identifier which contains geofence data
      const geofenceData = JSON.parse(region.identifier || "{}") as {
        id: string;
        name: string;
        onEnter?: string;
        onExit?: string;
      };

      // Record the visit
      if (eventType === Location.GeofencingEventType.Enter) {
        await api.recordLocationVisit({
          geofenceId: geofenceData.id,
          arrivedAt: new Date().toISOString(),
        });

        // Fetch active reminders for this geofence
        try {
          const remindersResponse = await api.getLocationReminders();
          const reminders = remindersResponse.reminders?.filter(
            (r: any) => r.geofenceId === geofenceData.id &&
                      r.isActive &&
                      (r.triggerType === "on_enter")
          ) || [];

          // Show reminder notifications
          for (const reminder of reminders) {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: reminder.title,
                body: reminder.message,
                data: {
                  type: "location_reminder",
                  reminderId: reminder.id,
                  geofenceId: geofenceData.id,
                  linkedHabitId: reminder.linkedHabitId,
                  linkedTodoId: reminder.linkedTodoId,
                },
                priority: reminder.priority === "high" ? "high" : "default",
              },
              trigger: null,
            });
          }
        } catch (err) {
          console.error("Failed to fetch/show reminders:", err);
        }

        // Show notification if onEnter action is defined
        if (geofenceData.onEnter) {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: `📍 ${geofenceData.name}`,
              body: geofenceData.onEnter,
              data: { geofenceId: geofenceData.id },
            },
            trigger: null, // Show immediately
          });
        }
      } else if (eventType === Location.GeofencingEventType.Exit) {
        // Fetch active reminders for this geofence
        try {
          const remindersResponse = await api.getLocationReminders();
          const reminders = remindersResponse.reminders?.filter(
            (r: any) => r.geofenceId === geofenceData.id &&
                      r.isActive &&
                      (r.triggerType === "on_exit")
          ) || [];

          // Show reminder notifications
          for (const reminder of reminders) {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: reminder.title,
                body: reminder.message,
                data: {
                  type: "location_reminder",
                  reminderId: reminder.id,
                  geofenceId: geofenceData.id,
                  linkedHabitId: reminder.linkedHabitId,
                  linkedTodoId: reminder.linkedTodoId,
                },
                priority: reminder.priority === "high" ? "high" : "default",
              },
              trigger: null,
            });
          }
        } catch (err) {
          console.error("Failed to fetch/show reminders:", err);
        }

        // Show notification if onExit action is defined
        if (geofenceData.onExit) {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: `👋 Leaving ${geofenceData.name}`,
              body: geofenceData.onExit,
              data: { geofenceId: geofenceData.id },
            },
            trigger: null,
          });
        }
      }
    } catch (err) {
      console.error("Failed to handle geofence event:", err);
    }
  }
});

export class GeofenceService {
  /**
   * Check if location permissions are granted
   */
  static async hasPermissions(): Promise<boolean> {
    const { status: foregroundStatus } = await Location.getForegroundPermissionsAsync();
    const { status: backgroundStatus } = await Location.getBackgroundPermissionsAsync();
    return foregroundStatus === "granted" && backgroundStatus === "granted";
  }

  /**
   * Request notification permissions
   */
  static async requestNotificationPermissions(): Promise<boolean> {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    return finalStatus === "granted";
  }

  /**
   * Start monitoring geofences
   */
  static async startMonitoring(geofences: Geofence[]): Promise<void> {
    try {
      // Check permissions
      const hasPerms = await this.hasPermissions();
      if (!hasPerms) {
        console.log("Location permissions not granted, skipping geofence monitoring");
        return; // Fail silently instead of throwing
      }

      // Request notification permissions
      await this.requestNotificationPermissions();

      // Stop existing geofencing if any
      const isTaskDefined = await TaskManager.isTaskDefined(GEOFENCE_TASK);
      if (isTaskDefined) {
        const hasStarted = await Location.hasStartedGeofencingAsync(GEOFENCE_TASK);
        if (hasStarted) {
          await Location.stopGeofencingAsync(GEOFENCE_TASK);
        }
      }

      // Convert geofences to Location.Region format
      const regions: Location.LocationRegion[] = geofences.map((geofence) => ({
        identifier: JSON.stringify({
          id: geofence.id,
          name: geofence.name,
          onEnter: geofence.onEnter,
          onExit: geofence.onExit,
        }),
        latitude: geofence.latitude,
        longitude: geofence.longitude,
        radius: geofence.radius,
        notifyOnEnter: true,
        notifyOnExit: true,
      }));

      // Start geofencing
      if (regions.length > 0) {
        await Location.startGeofencingAsync(GEOFENCE_TASK, regions);
        console.log(`Started monitoring ${regions.length} geofences`);
      }
    } catch (error) {
      console.log("Failed to start geofence monitoring:", error);
      // Fail silently - don't throw to avoid blocking app functionality
    }
  }

  /**
   * Stop monitoring geofences
   */
  static async stopMonitoring(): Promise<void> {
    try {
      const isTaskDefined = await TaskManager.isTaskDefined(GEOFENCE_TASK);
      if (isTaskDefined) {
        const hasStarted = await Location.hasStartedGeofencingAsync(GEOFENCE_TASK);
        if (hasStarted) {
          await Location.stopGeofencingAsync(GEOFENCE_TASK);
          console.log("Stopped geofence monitoring");
        }
      }
    } catch (error) {
      console.error("Failed to stop geofence monitoring:", error);
      throw error;
    }
  }

  /**
   * Get current location
   */
  static async getCurrentLocation(): Promise<Location.LocationObject | null> {
    try {
      const hasPerms = await this.hasPermissions();
      if (!hasPerms) {
        return null;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      return location;
    } catch (error) {
      console.error("Failed to get current location:", error);
      return null;
    }
  }

  /**
   * Add a new geofence to monitoring
   */
  static async addGeofence(geofence: Geofence): Promise<void> {
    try {
      // Get currently monitored geofences
      const response = await api.getGeofences();
      const allGeofences = [...(response.geofences || []), geofence];

      // Restart monitoring with the new geofence
      await this.startMonitoring(allGeofences as Geofence[]);
    } catch (error) {
      console.error("Failed to add geofence:", error);
      throw error;
    }
  }

  /**
   * Remove a geofence from monitoring
   */
  static async removeGeofence(geofenceId: string): Promise<void> {
    try {
      // Get currently monitored geofences
      const response = await api.getGeofences();
      const filteredGeofences = (response.geofences || []).filter((g: any) => g.id !== geofenceId);

      // Restart monitoring without the removed geofence
      await this.startMonitoring(filteredGeofences as Geofence[]);
    } catch (error) {
      console.error("Failed to remove geofence:", error);
      throw error;
    }
  }

  /**
   * Refresh all geofences from server
   */
  static async refreshGeofences(): Promise<void> {
    try {
      const response = await api.getGeofences();
      const geofences = response.geofences || [];

      if (geofences.length > 0) {
        await this.startMonitoring(geofences as Geofence[]);
      } else {
        await this.stopMonitoring();
      }
    } catch (error) {
      console.log("Geofences not available, skipping monitoring setup");
      // Don't throw - fail silently to avoid blocking app startup
    }
  }
}
