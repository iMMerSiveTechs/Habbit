import React, { useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { GlassCard } from "@/components/GlassCard";
import { authClient } from "@/lib/authClient";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/types";
import { ArrowLeft, Mail, Lock, CheckCircle } from "lucide-react-native";

export default function ForgotPasswordScreen() {
  const [step, setStep] = useState<"email" | "reset">("email");
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const handleRequestReset = async () => {
    if (!email) {
      Alert.alert("Error", "Please enter your email address");
      return;
    }

    setIsLoading(true);
    try {
      await authClient.forgetPassword({
        email,
        redirectTo: "/reset-password",
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        "Reset Code Sent",
        "Check your email for the password reset code. You can also check the backend logs in the LOGS tab for the reset token.",
        [
          {
            text: "OK",
            onPress: () => setStep("reset"),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Failed to send reset code");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!token || !newPassword || !confirmPassword) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }

    setIsLoading(true);
    try {
      await authClient.resetPassword({
        token,
        newPassword,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Success", "Password has been reset successfully!", [
        {
          text: "Sign In",
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Failed to reset password");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <LinearGradient colors={["#050813", "#0A0F1C", "#0D1929"]} style={{ flex: 1 }}>
      <KeyboardAwareScrollView contentContainerStyle={{ paddingVertical: 60 }}>
        <View className="px-6 gap-6">
          {/* Back Button */}
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              navigation.goBack();
            }}
            className="flex-row items-center gap-2 mb-2 active:scale-95"
          >
            <ArrowLeft size={20} color="#00D4FF" />
            <Text className="text-cyan text-sm font-medium">Back to Sign In</Text>
          </Pressable>

          {/* Header */}
          <View className="items-center mb-4">
            <View className="bg-cyan/20 rounded-full p-4 mb-4">
              {step === "email" ? (
                <Mail size={32} color="#00D4FF" />
              ) : (
                <Lock size={32} color="#00D4FF" />
              )}
            </View>
            <Text className="text-white text-3xl font-bold mb-2">
              {step === "email" ? "Forgot Password?" : "Reset Password"}
            </Text>
            <Text className="text-white/60 text-base text-center px-4">
              {step === "email"
                ? "Enter your email address and we'll send you a reset code"
                : "Enter the reset code from your email and your new password"}
            </Text>
          </View>

          {/* Email Step */}
          {step === "email" && (
            <GlassCard className="p-6 gap-5">
              <View>
                <Text className="text-white text-sm font-medium mb-2">Email Address</Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Enter your email"
                  placeholderTextColor="rgba(255, 255, 255, 0.3)"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  className="border border-white/20 rounded-xl p-4 bg-white/5 text-white"
                  editable={!isLoading}
                />
              </View>

              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  handleRequestReset();
                }}
                disabled={isLoading}
                className="rounded-xl items-center mt-2 active:scale-95"
                style={{
                  backgroundColor: isLoading ? "rgba(0, 212, 255, 0.5)" : "#00D4FF",
                  padding: 16,
                }}
              >
                <Text className="font-bold text-base" style={{ color: "#0A0F1C" }}>
                  {isLoading ? "Sending..." : "Send Reset Code"}
                </Text>
              </Pressable>
            </GlassCard>
          )}

          {/* Reset Step */}
          {step === "reset" && (
            <GlassCard className="p-6 gap-5">
              <View>
                <Text className="text-white text-sm font-medium mb-2">Reset Code</Text>
                <TextInput
                  value={token}
                  onChangeText={setToken}
                  placeholder="Enter the code from your email"
                  placeholderTextColor="rgba(255, 255, 255, 0.3)"
                  className="border border-white/20 rounded-xl p-4 bg-white/5 text-white"
                  editable={!isLoading}
                  autoCapitalize="none"
                />
              </View>

              <View>
                <Text className="text-white text-sm font-medium mb-2">New Password</Text>
                <TextInput
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Enter new password"
                  placeholderTextColor="rgba(255, 255, 255, 0.3)"
                  secureTextEntry
                  className="border border-white/20 rounded-xl p-4 bg-white/5 text-white"
                  editable={!isLoading}
                />
              </View>

              <View>
                <Text className="text-white text-sm font-medium mb-2">Confirm Password</Text>
                <TextInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirm new password"
                  placeholderTextColor="rgba(255, 255, 255, 0.3)"
                  secureTextEntry
                  className="border border-white/20 rounded-xl p-4 bg-white/5 text-white"
                  editable={!isLoading}
                />
              </View>

              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  handleResetPassword();
                }}
                disabled={isLoading}
                className="rounded-xl items-center mt-2 active:scale-95"
                style={{
                  backgroundColor: isLoading ? "rgba(0, 212, 255, 0.5)" : "#00D4FF",
                  padding: 16,
                }}
              >
                <Text className="font-bold text-base" style={{ color: "#0A0F1C" }}>
                  {isLoading ? "Resetting..." : "Reset Password"}
                </Text>
              </Pressable>

              {/* Back to Email Step */}
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setStep("email");
                  setToken("");
                  setNewPassword("");
                  setConfirmPassword("");
                }}
                disabled={isLoading}
                className="items-center py-2 active:scale-95"
              >
                <Text className="text-cyan text-sm font-medium">Did not receive code? Try again</Text>
              </Pressable>
            </GlassCard>
          )}

          {/* Info Card */}
          <View className="bg-cyan/10 border border-cyan/30 rounded-xl p-4">
            <View className="flex-row items-start gap-3">
              <CheckCircle size={20} color="#00D4FF" />
              <View className="flex-1">
                <Text className="text-white text-sm font-medium mb-1">Note for Testing</Text>
                <Text className="text-white/70 text-xs">
                  The reset code will be logged in the backend. Check the LOGS tab on the Vibecode app
                  to see your reset token for testing.
                </Text>
              </View>
            </View>
          </View>
        </View>
      </KeyboardAwareScrollView>
    </LinearGradient>
  );
}
