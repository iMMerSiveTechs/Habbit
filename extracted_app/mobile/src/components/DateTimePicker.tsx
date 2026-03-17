import React, { useState } from "react";
import { View, Text, Pressable, Platform } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Clock, Calendar } from "lucide-react-native";
import * as Haptics from "expo-haptics";

interface DateTimePickerComponentProps {
  mode: "date" | "time";
  value: Date;
  onChange: (date: Date) => void;
  label?: string;
  minimumDate?: Date;
}

export function DateTimePickerComponent({
  mode,
  value,
  onChange,
  label,
  minimumDate,
}: DateTimePickerComponentProps) {
  const [show, setShow] = useState(false);

  const handleChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setShow(false);
    }
    if (selectedDate) {
      onChange(selectedDate);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const formatTime = (date: Date) => {
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${hours}:${minutes}`;
  };

  const formatDate = (date: Date) => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = months[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();
    return `${month} ${day}, ${year}`;
  };

  const Icon = mode === "time" ? Clock : Calendar;
  const displayValue = mode === "time" ? formatTime(value) : formatDate(value);

  return (
    <View>
      {label && (
        <Text className="text-white/70 text-sm mb-2 font-semibold">{label}</Text>
      )}

      <Pressable
        onPress={() => {
          setShow(true);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }}
        className="flex-row items-center bg-white/10 border border-white/20 rounded-xl px-4 py-3 active:scale-[0.98]"
      >
        <Icon size={20} color="#00D4FF" />
        <Text className="text-white ml-3 flex-1 text-base">{displayValue}</Text>
      </Pressable>

      {show && (
        <DateTimePicker
          value={value}
          mode={mode}
          is24Hour={true}
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={handleChange}
          minimumDate={minimumDate}
          textColor="#FFFFFF"
          themeVariant="dark"
        />
      )}
    </View>
  );
}
