import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { WifiOff } from 'lucide-react-native';

function OfflineBannerComponent() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOffline(!(state.isConnected && state.isInternetReachable !== false));
    });
    return () => unsubscribe();
  }, []);

  if (!isOffline) return null;

  return (
    <View className="bg-amber-500/20 border-b border-amber-500/30 px-4 py-2 flex-row items-center justify-center">
      <WifiOff size={14} color="#F59E0B" />
      <Text className="text-amber-400 text-xs font-medium ml-2">
        You're offline — changes will sync when connected
      </Text>
    </View>
  );
}

export const OfflineBanner = React.memo(OfflineBannerComponent);
