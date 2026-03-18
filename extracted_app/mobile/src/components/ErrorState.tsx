import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { AlertTriangle, RefreshCw } from 'lucide-react-native';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

function ErrorStateComponent({ message = 'Something went wrong', onRetry }: ErrorStateProps) {
  return (
    <View className="flex-1 items-center justify-center px-8">
      <AlertTriangle size={48} color="#FF4444" />
      <Text className="text-white text-lg font-semibold mt-4 text-center">{message}</Text>
      <Text className="text-gray-400 text-sm mt-2 text-center">
        Please check your connection and try again.
      </Text>
      {onRetry && (
        <Pressable
          onPress={onRetry}
          className="mt-6 px-6 py-3 bg-cyan-500/20 rounded-xl border border-cyan-500/30 flex-row items-center"
        >
          <RefreshCw size={18} color="#00D4FF" />
          <Text className="text-cyan-400 font-semibold ml-2">Try Again</Text>
        </Pressable>
      )}
    </View>
  );
}

export const ErrorState = React.memo(ErrorStateComponent);
