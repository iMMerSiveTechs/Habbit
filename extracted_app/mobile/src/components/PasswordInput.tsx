import React, { useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { Eye, EyeOff } from "lucide-react-native";

interface PasswordInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  editable?: boolean;
  className?: string;
}

export function PasswordInput({
  value,
  onChangeText,
  placeholder = "Enter your password",
  editable = true,
  className = "border border-white/20 rounded-xl p-4 bg-white/5 text-white",
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View className="relative">
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="rgba(255, 255, 255, 0.3)"
        secureTextEntry={!showPassword}
        editable={editable}
        className={className}
        style={{ paddingRight: 48 }}
      />
      <Pressable
        onPress={() => setShowPassword(!showPassword)}
        disabled={!editable}
        className="absolute right-4 top-0 bottom-0 justify-center"
      >
        {showPassword ? (
          <Eye size={20} color="rgba(255, 255, 255, 0.6)" />
        ) : (
          <EyeOff size={20} color="rgba(255, 255, 255, 0.6)" />
        )}
      </Pressable>
    </View>
  );
}
