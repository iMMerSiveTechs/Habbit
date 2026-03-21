/**
 * Offline-Aware API Client
 * Automatically queues requests when offline and uses regular API when online
 */

import { api } from "@/lib/api";
import { offlineSyncService } from "@/services/offlineSyncService";

/**
 * Wrapper around the regular API client that adds offline support
 *
 * Usage:
 * - Use offlineApi instead of api for requests that should be queued when offline
 * - Habit completions, todo updates, etc. will be queued automatically
 * - Read operations (GET) always go through immediately (fail fast if offline)
 */
export const offlineApi = {
  /**
   * GET - Always executes immediately (no queueing for reads)
   */
  get: async <T>(path: string): Promise<T> => {
    if (!offlineSyncService.isDeviceOnline()) {
      throw new Error("Cannot fetch data while offline. Please check your connection.");
    }
    return api.get<T>(path);
  },

  /**
   * POST - Queue when offline, execute immediately when online
   */
  post: async <T>(path: string, body?: object, priority: "high" | "medium" | "low" = "medium"): Promise<T> => {
    if (!offlineSyncService.isDeviceOnline()) {
      console.log(`📴 Device offline - queueing POST ${path}`);
      await offlineSyncService.queueRequest("POST", path, body, priority);
      // Return a placeholder response for optimistic UI updates
      return { queued: true, message: "Request will be synced when online" } as T;
    }
    return api.post<T>(path, body);
  },

  /**
   * PUT - Queue when offline, execute immediately when online
   */
  put: async <T>(path: string, body?: object, priority: "high" | "medium" | "low" = "medium"): Promise<T> => {
    if (!offlineSyncService.isDeviceOnline()) {
      console.log(`📴 Device offline - queueing PUT ${path}`);
      await offlineSyncService.queueRequest("PUT", path, body, priority);
      return { queued: true, message: "Request will be synced when online" } as T;
    }
    return api.put<T>(path, body);
  },

  /**
   * PATCH - Queue when offline, execute immediately when online
   */
  patch: async <T>(path: string, body?: object, priority: "high" | "medium" | "low" = "medium"): Promise<T> => {
    if (!offlineSyncService.isDeviceOnline()) {
      console.log(`📴 Device offline - queueing PATCH ${path}`);
      await offlineSyncService.queueRequest("PATCH", path, body, priority);
      return { queued: true, message: "Request will be synced when online" } as T;
    }
    return api.patch<T>(path, body);
  },

  /**
   * DELETE - Queue when offline, execute immediately when online
   */
  delete: async <T>(path: string, priority: "high" | "medium" | "low" = "medium"): Promise<T> => {
    if (!offlineSyncService.isDeviceOnline()) {
      console.log(`📴 Device offline - queueing DELETE ${path}`);
      await offlineSyncService.queueRequest("DELETE", path, undefined, priority);
      return { queued: true, message: "Request will be synced when online" } as T;
    }
    return api.delete<T>(path);
  },
};
