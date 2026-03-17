import React, { useState } from 'react';
import { View, Text, Modal, Pressable, TextInput, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { X } from 'lucide-react-native';
import { SonicPentagram } from './SonicPentagram';
import { LinearGradient } from 'expo-linear-gradient';

interface ScoreProfile {
  lyricism: number;
  production: number;
  vocals: number;
  flow: number;
  vibe: number;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onSubmit: (scores: ScoreProfile, comment?: string) => void;
  track: {
    title: string;
    artist: string;
    imageUrl?: string;
  };
}

export function TrackRatingModal({ visible, onClose, onSubmit, track }: Props) {
  const [scores, setScores] = useState<ScoreProfile>({
    lyricism: 0.5,
    production: 0.5,
    vocals: 0.5,
    flow: 0.5,
    vibe: 0.5,
  });
  const [comment, setComment] = useState('');

  const handleSubmit = () => {
    // Convert 0-1 to 0-100 for backend
    const intScores: ScoreProfile = {
      lyricism: scores.lyricism,
      production: scores.production,
      vocals: scores.vocals,
      flow: scores.flow,
      vibe: scores.vibe,
    };
    onSubmit(intScores, comment || undefined);

    // Reset
    setScores({
      lyricism: 0.5,
      production: 0.5,
      vocals: 0.5,
      flow: 0.5,
      vibe: 0.5,
    });
    setComment('');
  };

  const totalScore = Math.round(
    (Object.values(scores).reduce((a, b) => a + b, 0) / 5) * 100
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <View className="flex-1 bg-black/95">
          <ScrollView
            contentContainerStyle={{ flexGrow: 1 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View className="px-6 pt-16 pb-4">
              <View className="flex-row justify-between items-start mb-8">
                <View className="flex-1">
                  <Text className="text-[10px] tracking-[0.3em] text-yellow-500 font-bold mb-2">
                    RDM CRITIQUE PROTOCOL
                  </Text>
                  <Text className="text-2xl font-light text-white mb-1">{track.title}</Text>
                  <Text className="text-base text-neutral-400">{track.artist}</Text>
                </View>
                <Pressable onPress={onClose} className="p-2">
                  <X size={24} color="#fff" />
                </Pressable>
              </View>

              <Text className="text-sm text-neutral-500 text-center mb-6">
                Drag the nodes to rate the track
              </Text>
            </View>

            {/* Pentagram */}
            <View className="items-center justify-center py-8">
              <SonicPentagram
                initialScores={scores}
                onChange={setScores}
                showScore={true}
              />
            </View>

            {/* Comment Section */}
            <View className="px-6 mt-4">
              <Text className="text-xs text-neutral-400 mb-2 tracking-wider">
                OPTIONAL CRITIQUE (PUBLIC)
              </Text>
              <TextInput
                value={comment}
                onChangeText={setComment}
                placeholder="Share your thoughts on this track..."
                placeholderTextColor="#555"
                multiline
                numberOfLines={3}
                className="bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-3 text-white text-sm"
                style={{ textAlignVertical: 'top' }}
              />
            </View>

            {/* Submit Button */}
            <View className="px-6 py-8">
              <Pressable
                onPress={handleSubmit}
                className="active:scale-95"
              >
                <LinearGradient
                  colors={['#D4AF37', '#C9A332']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{
                    paddingVertical: 16,
                    paddingHorizontal: 32,
                    borderRadius: 999,
                    shadowColor: '#D4AF37',
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.4,
                    shadowRadius: 20,
                  }}
                >
                  <Text className="text-black font-bold text-center text-base tracking-wider">
                    SUBMIT RATING
                  </Text>
                </LinearGradient>
              </Pressable>

              <Text className="text-xs text-neutral-600 text-center mt-4">
                Your taste profile will be updated based on this critique
              </Text>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
