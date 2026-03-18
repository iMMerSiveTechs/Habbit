import React from 'react';
import { View, Text } from 'react-native';
import { Inbox } from 'lucide-react-native';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

function EmptyStateComponent({ icon, title, subtitle, action }: EmptyStateProps) {
  return (
    <View className="flex-1 items-center justify-center px-8 py-12">
      {icon ?? <Inbox size={48} color="#555" />}
      <Text className="text-white text-lg font-semibold mt-4 text-center">{title}</Text>
      {subtitle && (
        <Text className="text-gray-400 text-sm mt-2 text-center">{subtitle}</Text>
      )}
      {action && <View className="mt-4">{action}</View>}
    </View>
  );
}

export const EmptyState = React.memo(EmptyStateComponent);
