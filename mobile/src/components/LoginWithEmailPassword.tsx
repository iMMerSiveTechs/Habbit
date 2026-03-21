import React, { useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import * as SecureStore from "expo-secure-store";
import { GlassCard } from "@/components/GlassCard";
import { PasswordInput } from "@/components/PasswordInput";
import { authClient } from "@/lib/authClient";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/types";
import { CheckSquare, Square } from "lucide-react-native";

export default function LoginWithEmailPassword() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  // Load saved credentials on mount
  React.useEffect(() => {
    const loadSavedCredentials = async () => {
      try {
        const savedEmail = await SecureStore.getItemAsync("saved_email");
        const savedRememberMe = await SecureStore.getItemAsync("remember_me");

        if (savedEmail && savedRememberMe === "true") {
          setEmail(savedEmail);
          setRememberMe(true);
        }
      } catch (error) {
        console.error("Failed to load saved credentials:", error);
      }
    };

    loadSavedCredentials();
  }, []);

  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter email and password");
      return;
    }

    setIsLoading(true);
    try {
      const result = await authClient.signIn.email({
        email,
        password,
      });

      if (result.error) {
        Alert.alert("Sign In Failed", result.error.message || "Please check your credentials");
      } else {
        // Save credentials if remember me is checked
        if (rememberMe) {
          await SecureStore.setItemAsync("saved_email", email);
          await SecureStore.setItemAsync("remember_me", "true");
        } else {
          await SecureStore.deleteItemAsync("saved_email");
          await SecureStore.deleteItemAsync("remember_me");
        }

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        // Clear inputs - RootNavigator will route reactively based on session
        setEmail("");
        setPassword("");
      }
    } catch (error) {
      Alert.alert("Error", "An unexpected error occurred");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!email || !password || !name) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    setIsLoading(true);
    try {
      const result = await authClient.signUp.email({
        email,
        password,
        name,
      });

      if (result.error) {
        Alert.alert("Sign Up Failed", result.error.message || "Please try again");
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert("Success", "Account created! Please sign in.");
        setEmail("");
        setPassword("");
        setName("");
        setIsSignUp(false);
      }
    } catch (error) {
      Alert.alert("Error", "An unexpected error occurred");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await authClient.signOut();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Success", "Signed out successfully!");
    } catch (error) {
      Alert.alert("Error", "Failed to sign out");
      console.error(error);
    }
  };

  return (
    <LinearGradient colors={["#050813", "#0A0F1C", "#0D1929"]} style={{ flex: 1 }}>
      <KeyboardAwareScrollView contentContainerStyle={{ paddingVertical: 40 }}>
        <View className="px-6 gap-6">
          <View className="items-center mb-4">
            <Text className="text-white text-3xl font-bold mb-2">
              {isSignUp ? "Create Account" : "Welcome Back"}
            </Text>
            <Text className="text-white/60 text-base text-center">
              {isSignUp ? "Sign up to get started with Habit" : "Sign in to continue to your account"}
            </Text>
          </View>

          <GlassCard className="p-6 gap-5">
            {isSignUp && (
              <View>
                <Text className="text-white text-sm font-medium mb-2">Name</Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Enter your name"
                  placeholderTextColor="rgba(255, 255, 255, 0.3)"
                  className="border border-white/20 rounded-xl p-4 bg-white/5 text-white"
                  autoCapitalize="words"
                  editable={!isLoading}
                />
              </View>
            )}

            <View>
              <Text className="text-white text-sm font-medium mb-2">Email</Text>
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

            <View>
              <View className="flex-row justify-between items-center mb-2">
                <Text className="text-white text-sm font-medium">Password</Text>
                {!isSignUp && (
                  <Pressable
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      navigation.navigate("ForgotPassword");
                    }}
                    disabled={isLoading}
                    className="active:scale-95"
                  >
                    <Text className="text-cyan text-xs font-medium">Forgot Password?</Text>
                  </Pressable>
                )}
              </View>
              <PasswordInput
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                editable={!isLoading}
                className="border border-white/20 rounded-xl p-4 bg-white/5 text-white"
              />
            </View>

            {/* Remember Me Checkbox (Sign In only) */}
            {!isSignUp && (
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setRememberMe(!rememberMe);
                }}
                disabled={isLoading}
                className="flex-row items-center gap-3 active:scale-95"
              >
                {rememberMe ? (
                  <CheckSquare size={20} color="#00D4FF" />
                ) : (
                  <Square size={20} color="rgba(255, 255, 255, 0.4)" />
                )}
                <Text className="text-white/70 text-sm">Remember my email</Text>
              </Pressable>
            )}

            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                isSignUp ? handleSignUp() : handleSignIn();
              }}
              disabled={isLoading}
              className="rounded-xl items-center mt-2 active:scale-95"
              style={{
                backgroundColor: isLoading ? "rgba(0, 212, 255, 0.5)" : "#00D4FF",
                padding: 16,
              }}
            >
              <Text className="font-bold text-base" style={{ color: "#0A0F1C" }}>
                {isLoading ? "Loading..." : isSignUp ? "Create Account" : "Sign In"}
              </Text>
            </Pressable>
          </GlassCard>

          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setIsSignUp(!isSignUp);
            }}
            disabled={isLoading}
            className="items-center py-2 active:scale-95"
          >
            <Text className="text-cyan text-sm font-medium">
              {isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
            </Text>
          </Pressable>
        </View>
      </KeyboardAwareScrollView>
    </LinearGradient>
  );
}
