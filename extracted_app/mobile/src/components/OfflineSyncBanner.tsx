/**
 * Offline Sync Status Banner
 * Shows connection status and pending sync queue
 */

import { View, Text, Pressable, Animated } from "react-native";
import { useEffect, useState, useRef } from "react";
import { WifiOff, Wifi, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react-native";
import { offlineSyncService, SyncStatus } from "@/services/offlineSyncService";
import * as Haptics from "expo-haptics";

export function OfflineSyncBanner() {
  const [status, setStatus] = useState<SyncStatus>(offlineSyncService.getStatus());
  const [showBanner, setShowBanner] = useState(false);
  const slideAnim = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    // Subscribe to status changes
    const unsubscribe = offlineSyncService.subscribe((newStatus) => {
      setStatus(newStatus);

      // Show banner when offline or syncing
      const shouldShow = !newStatus.isOnline || newStatus.isSyncing || newStatus.queueLength > 0;

      if (shouldShow !== showBanner) {
        setShowBanner(shouldShow);

        // Animate banner in/out
        Animated.spring(slideAnim, {
          toValue: shouldShow ? 0 : -100,
          useNativeDriver: true,
          tension: 50,
          friction: 7,
        }).start();
      }
    });

    // Initial check
    const initialStatus = offlineSyncService.getStatus();
    const shouldShow = !initialStatus.isOnline || initialStatus.isSyncing || initialStatus.queueLength > 0;
    if (shouldShow) {
      setShowBanner(true);
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start();
    }

    return unsubscribe;
  }, []);

  const handleSyncPress = async () => {
    if (status.isOnline && !status.isSyncing && status.queueLength > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await offlineSyncService.forceSyncNow();
    }
  };

  // Don't render if banner shouldn't be shown
  if (!showBanner) return null;

  // Determine banner color and icon
  let bgColor = "bg-gray-800/95";
  let textColor = "text-white";
  let IconComponent = Wifi;
  let iconColor = "#10B981";
  let message = "Connected";

  if (!status.isOnline) {
    bgColor = "bg-orange-500/90";
    textColor = "text-white";
    IconComponent = WifiOff;
    iconColor = "#FFFFFF";
    message = "Offline Mode";
  } else if (status.isSyncing) {
    bgColor = "bg-cyan-500/90";
    textColor = "text-white";
    IconComponent = RefreshCw;
    iconColor = "#FFFFFF";
    message = `Syncing ${status.queueLength} item${status.queueLength !== 1 ? "s" : ""}...`;
  } else if (status.queueLength > 0) {
    bgColor = "bg-yellow-500/90";
    textColor = "text-white";
    IconComponent = AlertCircle;
    iconColor = "#FFFFFF";
    message = `${status.queueLength} pending sync${status.queueLength !== 1 ? "s" : ""}`;
  } else if (status.lastSyncTime) {
    bgColor = "bg-green-500/90";
    textColor = "text-white";
    IconComponent = CheckCircle2;
    iconColor = "#FFFFFF";
    message = "All synced";

    // Auto-hide success banner after 3 seconds
    setTimeout(() => {
      setShowBanner(false);
      Animated.spring(slideAnim, {
        toValue: -100,
        useNativeDriver: true,
      }).start();
    }, 3000);
  }

  return (
    <Animated.View
      style={{
        transform: [{ translateY: slideAnim }],
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
      }}
    >
      <Pressable
        onPress={handleSyncPress}
        disabled={!status.isOnline || status.isSyncing || status.queueLength === 0}
        className={`${bgColor} px-4 py-3 flex-row items-center justify-between shadow-lg`}
      >
        <View className="flex-row items-center flex-1">
          <View className={status.isSyncing ? "animate-spin" : ""}>
            <IconComponent size={20} color={iconColor} />
          </View>
          <Text className={`${textColor} text-sm font-semibold ml-3`}>{message}</Text>
        </View>

        {status.queueLength > 0 && !status.isSyncing && status.isOnline && (
          <View className="bg-white/20 px-3 py-1 rounded-full">
            <Text className="text-white text-xs font-bold">Tap to sync</Text>
          </View>
        )}

        {!status.isOnline && status.queueLength > 0 && (
          <View className="bg-white/20 px-3 py-1 rounded-full">
            <Text className="text-white text-xs font-semibold">{status.queueLength} queued</Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}
