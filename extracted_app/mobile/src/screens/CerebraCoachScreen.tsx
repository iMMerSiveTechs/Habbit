import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { ArrowLeft, Send, Trash2, Brain } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useNavigation } from "@react-navigation/native";
import { useCerebraStore, type ChatMessage } from "@/state/cerebraStore";
import { api } from "@/lib/api";
import type { ClaudeChatResponse } from "@/shared/contracts";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";

const QUICK_PROMPTS = [
  "How am I doing today?",
  "What should I focus on?",
  "I need motivation",
  "Help me plan tomorrow",
];

export default function CerebraCoachScreen() {
  const navigation = useNavigation();
  const [inputText, setInputText] = useState("");
  const flatListRef = useRef<FlatList>(null);

  const chatMessages = useCerebraStore((s) => s.chatMessages);
  const chatLoading = useCerebraStore((s) => s.chatLoading);
  const addChatMessage = useCerebraStore((s) => s.addChatMessage);
  const clearChat = useCerebraStore((s) => s.clearChat);
  const setChatLoading = useCerebraStore((s) => s.setChatLoading);

  const scrollToBottom = useCallback(() => {
    if (flatListRef.current && chatMessages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [chatMessages.length]);

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages.length, scrollToBottom]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || chatLoading) return;

    const userMessage = text.trim();
    setInputText("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Add user message
    addChatMessage({ role: "user", content: userMessage });

    // Build conversation history for context
    const history = chatMessages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    setChatLoading(true);

    try {
      const response = await api.post<ClaudeChatResponse & { usingAI?: boolean }>("/api/claude/chat", {
        message: userMessage,
        conversationHistory: history,
      });

      addChatMessage({
        role: "assistant",
        content: response.reply,
        usingAI: response.usingAI,
      });
    } catch (error) {
      console.error("Cerebra chat error:", error);
      addChatMessage({
        role: "assistant",
        content: "I'm having trouble connecting right now. Check your connection and try again.",
      });
    } finally {
      setChatLoading(false);
    }
  };

  const handleClearChat = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    clearChat();
  };

  const renderMessage = ({ item, index }: { item: ChatMessage; index: number }) => {
    const isUser = item.role === "user";

    return (
      <Animated.View
        entering={FadeInDown.duration(300).delay(50)}
        className={`px-5 mb-3 ${isUser ? "items-end" : "items-start"}`}
      >
        {!isUser && (
          <View className="flex-row items-center mb-1.5 ml-1">
            <Brain size={12} color="#8B5CF6" />
            <Text className="text-white/40 text-xs ml-1.5 font-medium">Cerebra</Text>
          </View>
        )}

        <View
          className={`max-w-[85%] rounded-2xl px-4 py-3 ${
            isUser
              ? "rounded-br-md"
              : "rounded-bl-md"
          }`}
          style={{
            backgroundColor: isUser ? "#00D4FF" : "rgba(255,255,255,0.07)",
          }}
        >
          <Text
            className={`text-base leading-6 ${
              isUser ? "text-black font-medium" : "text-white/90"
            }`}
          >
            {item.content}
          </Text>
        </View>

        <Text className={`text-white/25 text-xs mt-1 ${isUser ? "mr-2" : "ml-2"}`}>
          {new Date(item.timestamp).toLocaleTimeString([], {
            hour: "numeric",
            minute: "2-digit",
          })}
        </Text>
      </Animated.View>
    );
  };

  const renderEmptyState = () => (
    <View className="flex-1 justify-center items-center px-8">
      <Animated.View entering={FadeInUp.duration(500)} className="items-center">
        <View className="mb-6">
          <LinearGradient
            colors={["#8B5CF6", "#00D4FF"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Brain size={40} color="#FFF" />
          </LinearGradient>
        </View>

        <Text className="text-white text-2xl font-bold text-center mb-3">
          Cerebra Coach
        </Text>
        <Text className="text-white/50 text-center text-base mb-8 leading-6">
          Your AI accountability partner. Ask about your habits, get coaching, or plan your day.
        </Text>

        <View className="w-full gap-3">
          {QUICK_PROMPTS.map((prompt) => (
            <Pressable
              key={prompt}
              onPress={() => sendMessage(prompt)}
              className="active:scale-[0.97]"
            >
              <View
                className="border border-white/10 rounded-2xl px-5 py-3.5"
                style={{ backgroundColor: "rgba(255,255,255,0.04)" }}
              >
                <Text className="text-white/70 text-base">{prompt}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      </Animated.View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#050813" }}>
      <LinearGradient
        colors={["#050813", "#0A0F1C", "#0D1117"]}
        style={{ flex: 1 }}
      >
        <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
          {/* Header */}
          <View className="flex-row items-center justify-between px-5 py-3 border-b border-white/5">
            <View className="flex-row items-center">
              <Pressable
                onPress={() => navigation.goBack()}
                hitSlop={12}
                className="mr-4 active:opacity-60"
              >
                <ArrowLeft size={24} color="#FFFFFF" />
              </Pressable>
              <View className="flex-row items-center">
                <View
                  className="w-8 h-8 rounded-full items-center justify-center mr-2.5"
                  style={{ backgroundColor: "rgba(139,92,246,0.2)" }}
                >
                  <Brain size={16} color="#8B5CF6" />
                </View>
                <View>
                  <Text className="text-white text-lg font-semibold">Cerebra</Text>
                  <Text className="text-white/40 text-xs">AI Coach</Text>
                </View>
              </View>
            </View>

            {chatMessages.length > 0 && (
              <Pressable
                onPress={handleClearChat}
                hitSlop={12}
                className="active:opacity-60"
              >
                <Trash2 size={20} color="rgba(255,255,255,0.3)" />
              </Pressable>
            )}
          </View>

          {/* Messages */}
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={0}
          >
            {chatMessages.length === 0 ? (
              renderEmptyState()
            ) : (
              <FlatList
                ref={flatListRef}
                data={chatMessages}
                renderItem={renderMessage}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ paddingTop: 16, paddingBottom: 8 }}
                showsVerticalScrollIndicator={false}
                onContentSizeChange={scrollToBottom}
                ListFooterComponent={
                  chatLoading ? (
                    <View className="px-5 mb-3 items-start">
                      <View className="flex-row items-center mb-1.5 ml-1">
                        <Brain size={12} color="#8B5CF6" />
                        <Text className="text-white/40 text-xs ml-1.5 font-medium">
                          Cerebra
                        </Text>
                      </View>
                      <View
                        className="rounded-2xl rounded-bl-md px-5 py-4"
                        style={{ backgroundColor: "rgba(255,255,255,0.07)" }}
                      >
                        <View className="flex-row items-center gap-2">
                          <ActivityIndicator size="small" color="#8B5CF6" />
                          <Text className="text-white/50 text-sm">Thinking...</Text>
                        </View>
                      </View>
                    </View>
                  ) : null
                }
              />
            )}

            {/* Input */}
            <View className="px-4 pb-4 pt-2 border-t border-white/5">
              {/* Quick prompt chips when in conversation */}
              {chatMessages.length > 0 && !chatLoading && (
                <FlatList
                  horizontal
                  data={QUICK_PROMPTS}
                  renderItem={({ item }) => (
                    <Pressable
                      onPress={() => sendMessage(item)}
                      className="mr-2 active:scale-95"
                    >
                      <View
                        className="border border-white/10 rounded-full px-3.5 py-1.5"
                        style={{ backgroundColor: "rgba(255,255,255,0.03)" }}
                      >
                        <Text className="text-white/50 text-xs">{item}</Text>
                      </View>
                    </Pressable>
                  )}
                  keyExtractor={(item) => item}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: 8 }}
                />
              )}

              <View className="flex-row items-end gap-2">
                <View
                  className="flex-1 rounded-2xl px-4 py-3 min-h-[48px] justify-center"
                  style={{ backgroundColor: "rgba(255,255,255,0.06)" }}
                >
                  <TextInput
                    value={inputText}
                    onChangeText={setInputText}
                    placeholder="Ask Cerebra anything..."
                    placeholderTextColor="rgba(255,255,255,0.25)"
                    className="text-white text-base"
                    style={{ maxHeight: 120 }}
                    multiline
                    returnKeyType="default"
                    editable={!chatLoading}
                    onSubmitEditing={() => {
                      if (inputText.trim() && !inputText.includes("\n")) {
                        sendMessage(inputText);
                      }
                    }}
                  />
                </View>

                <Pressable
                  onPress={() => sendMessage(inputText)}
                  disabled={!inputText.trim() || chatLoading}
                  className="active:scale-90"
                >
                  <LinearGradient
                    colors={
                      inputText.trim() && !chatLoading
                        ? ["#8B5CF6", "#00D4FF"]
                        : ["#333", "#333"]
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 24,
                      alignItems: "center",
                      justifyContent: "center",
                      opacity: inputText.trim() && !chatLoading ? 1 : 0.4,
                    }}
                  >
                    <Send size={20} color="#FFF" />
                  </LinearGradient>
                </Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}
