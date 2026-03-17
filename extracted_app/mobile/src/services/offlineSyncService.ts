/**
 * Offline Sync Service
 * Queues API requests when offline and syncs them when connection is restored
 */

import NetInfo, { NetInfoState } from "@react-native-community/netinfo";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "@/lib/api";

const QUEUE_STORAGE_KEY = "@offline_sync_queue";
const MAX_QUEUE_SIZE = 100;
const MAX_RETRY_ATTEMPTS = 3;

export interface QueuedRequest {
  id: string;
  timestamp: number;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  path: string;
  body?: object;
  retryCount: number;
  priority: "high" | "medium" | "low"; // High = habit completions, Medium = updates, Low = analytics
}

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  queueLength: number;
  lastSyncTime: number | null;
  failedRequests: number;
}

class OfflineSyncService {
  private queue: QueuedRequest[] = [];
  private isOnline: boolean = true;
  private isSyncing: boolean = false;
  private listeners: Set<(status: SyncStatus) => void> = new Set();
  private lastSyncTime: number | null = null;
  private failedRequests: number = 0;

  constructor() {
    this.initialize();
  }

  /**
   * Initialize the service - load queue and setup network listener
   */
  private async initialize() {
    // Load persisted queue
    await this.loadQueue();

    // Listen for network changes
    NetInfo.addEventListener((state: NetInfoState) => {
      const wasOffline = !this.isOnline;
      this.isOnline = state.isConnected ?? false;

      console.log(`📡 Network status: ${this.isOnline ? "Online" : "Offline"}`);

      // If we just came back online, start syncing
      if (wasOffline && this.isOnline) {
        console.log("🔄 Connection restored, starting sync...");
        this.syncQueue();
      }

      this.notifyListeners();
    });

    // Get initial network state
    const state = await NetInfo.fetch();
    this.isOnline = state.isConnected ?? false;
    console.log(`📡 Initial network status: ${this.isOnline ? "Online" : "Offline"}`);
  }

  /**
   * Load queue from AsyncStorage
   */
  private async loadQueue() {
    try {
      const queueJson = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
      if (queueJson) {
        this.queue = JSON.parse(queueJson);
        console.log(`📥 Loaded ${this.queue.length} queued requests from storage`);
      }
    } catch (error) {
      console.error("❌ Failed to load sync queue:", error);
    }
  }

  /**
   * Save queue to AsyncStorage
   */
  private async saveQueue() {
    try {
      await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      console.error("❌ Failed to save sync queue:", error);
    }
  }

  /**
   * Add a request to the queue
   */
  async queueRequest(
    method: QueuedRequest["method"],
    path: string,
    body?: object,
    priority: QueuedRequest["priority"] = "medium"
  ): Promise<string> {
    // Generate unique ID
    const id = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const request: QueuedRequest = {
      id,
      timestamp: Date.now(),
      method,
      path,
      body,
      retryCount: 0,
      priority,
    };

    // Add to queue (high priority first)
    if (priority === "high") {
      this.queue.unshift(request);
    } else {
      this.queue.push(request);
    }

    // Enforce max queue size
    if (this.queue.length > MAX_QUEUE_SIZE) {
      // Remove oldest low-priority items
      const lowPriorityIndex = this.queue.findIndex((r) => r.priority === "low");
      if (lowPriorityIndex !== -1) {
        this.queue.splice(lowPriorityIndex, 1);
      } else {
        this.queue.shift(); // Remove oldest
      }
    }

    await this.saveQueue();
    this.notifyListeners();

    console.log(`📝 Queued ${method} ${path} (Priority: ${priority}, Queue size: ${this.queue.length})`);

    return id;
  }

  /**
   * Sync all queued requests
   */
  async syncQueue(): Promise<void> {
    if (!this.isOnline) {
      console.log("⚠️ Cannot sync - device is offline");
      return;
    }

    if (this.isSyncing) {
      console.log("⚠️ Sync already in progress");
      return;
    }

    if (this.queue.length === 0) {
      console.log("✅ Queue is empty, nothing to sync");
      return;
    }

    this.isSyncing = true;
    this.failedRequests = 0;
    this.notifyListeners();

    console.log(`🔄 Starting sync of ${this.queue.length} requests...`);

    // Sort by priority
    this.queue.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    // Process queue
    const results: Array<{ success: boolean; request: QueuedRequest }> = [];

    for (const request of [...this.queue]) {
      try {
        // Execute the request
        await this.executeRequest(request);
        results.push({ success: true, request });

        // Remove from queue on success
        this.queue = this.queue.filter((r) => r.id !== request.id);

        console.log(`✅ Synced ${request.method} ${request.path}`);
      } catch (error) {
        console.error(`❌ Failed to sync ${request.method} ${request.path}:`, error);

        // Increment retry count
        request.retryCount++;

        if (request.retryCount >= MAX_RETRY_ATTEMPTS) {
          // Remove after max retries
          this.queue = this.queue.filter((r) => r.id !== request.id);
          this.failedRequests++;
          console.log(`⚠️ Removed ${request.method} ${request.path} after ${MAX_RETRY_ATTEMPTS} failed attempts`);
        }

        results.push({ success: false, request });
      }
    }

    await this.saveQueue();
    this.lastSyncTime = Date.now();
    this.isSyncing = false;
    this.notifyListeners();

    const successCount = results.filter((r) => r.success).length;
    const failedCount = results.filter((r) => !r.success).length;

    console.log(`🔄 Sync complete: ${successCount} successful, ${failedCount} failed`);
  }

  /**
   * Execute a queued request
   */
  private async executeRequest(request: QueuedRequest): Promise<any> {
    const { method, path, body } = request;

    switch (method) {
      case "GET":
        return api.get(path);
      case "POST":
        return api.post(path, body);
      case "PUT":
        return api.put(path, body);
      case "PATCH":
        return api.patch(path, body);
      case "DELETE":
        return api.delete(path);
      default:
        throw new Error(`Unsupported method: ${method}`);
    }
  }

  /**
   * Clear the entire queue
   */
  async clearQueue(): Promise<void> {
    this.queue = [];
    await this.saveQueue();
    this.notifyListeners();
    console.log("🗑️ Queue cleared");
  }

  /**
   * Remove a specific request from the queue
   */
  async removeRequest(id: string): Promise<void> {
    this.queue = this.queue.filter((r) => r.id !== id);
    await this.saveQueue();
    this.notifyListeners();
  }

  /**
   * Get current sync status
   */
  getStatus(): SyncStatus {
    return {
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      queueLength: this.queue.length,
      lastSyncTime: this.lastSyncTime,
      failedRequests: this.failedRequests,
    };
  }

  /**
   * Check if device is online
   */
  isDeviceOnline(): boolean {
    return this.isOnline;
  }

  /**
   * Get queued requests
   */
  getQueue(): QueuedRequest[] {
    return [...this.queue];
  }

  /**
   * Subscribe to status changes
   */
  subscribe(listener: (status: SyncStatus) => void): () => void {
    this.listeners.add(listener);
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners of status change
   */
  private notifyListeners() {
    const status = this.getStatus();
    this.listeners.forEach((listener) => listener(status));
  }

  /**
   * Force a manual sync
   */
  async forceSyncNow(): Promise<void> {
    console.log("🔄 Manual sync triggered");
    await this.syncQueue();
  }
}

// Export singleton instance
export const offlineSyncService = new OfflineSyncService();
