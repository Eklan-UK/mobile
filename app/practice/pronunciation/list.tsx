import React, { useState, useEffect } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { View, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AppText, BoldText } from "@/components/ui";
import tw from "@/lib/tw";
import { pronunciationService, type PronunciationProblem } from "@/services/pronunciation.service";
import { logger } from "@/utils/logger";

export default function PronunciationProblemListScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const type = (params.type as 'word' | 'sound' | 'sentence') || 'word';

  const [problems, setProblems] = useState<PronunciationProblem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProblems = async () => {
      try {
        setIsLoading(true);
        setError(null);
        // Fetch problems filtered by type
        const data = await pronunciationService.getAllProblems({ type, isActive: true });
        setProblems(data);
      } catch (err: any) {
        logger.error('Failed to fetch problems:', err);
        setError('Failed to load pronunciation problems');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProblems();
  }, [type]);

  const getTypeTitle = () => {
    switch (type) {
      case 'sound': return 'Sounds';
      case 'word': return 'Words';
      case 'sentence': return 'Sentences';
      default: return 'Pronunciation';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-700';
      case 'intermediate': return 'bg-yellow-100 text-yellow-700';
      case 'advanced': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={tw`px-5 pt-4 pb-3 border-b border-gray-200`}>
        <View style={tw`flex-row items-center justify-between mb-4`}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={tw`w-10 h-10 items-center justify-center`}
          >
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <BoldText style={tw`text-lg text-gray-900`}>
            {getTypeTitle()}
          </BoldText>
          <View style={tw`w-10`} />
        </View>
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={tw`flex-1 items-center justify-center`}>
          <ActivityIndicator size="large" color="#10B981" />
          <AppText style={tw`text-gray-500 mt-4`}>Loading problems...</AppText>
        </View>
      ) : error ? (
        <View style={tw`flex-1 items-center justify-center px-5`}>
          <Ionicons name="alert-circle" size={48} color="#EF4444" />
          <AppText style={tw`text-red-600 mt-4 text-center`}>{error}</AppText>
          <TouchableOpacity
            onPress={() => router.back()}
            style={tw`mt-6 px-6 py-3 bg-green-600 rounded-full`}
          >
            <AppText style={tw`text-white font-semibold`}>Go Back</AppText>
          </TouchableOpacity>
        </View>
      ) : problems.length === 0 ? (
        <View style={tw`flex-1 items-center justify-center px-5`}>
          <Ionicons name="book-outline" size={48} color="#9CA3AF" />
          <BoldText style={tw`text-gray-900 mt-4 text-center`}>
            No problems available
          </BoldText>
          <AppText style={tw`text-gray-500 mt-2 text-center`}>
            Check back later for new {getTypeTitle().toLowerCase()} practice.
          </AppText>
          <TouchableOpacity
            onPress={() => router.back()}
            style={tw`mt-6 px-6 py-3 bg-green-600 rounded-full`}
          >
            <AppText style={tw`text-white font-semibold`}>Go Back</AppText>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView style={tw`flex-1`} showsVerticalScrollIndicator={false}>
          <View style={tw`px-5 py-4`}>
            {problems.map((problem) => (
              <TouchableOpacity
                key={problem._id}
                onPress={() => router.push(`/practice/pronunciation?slug=${problem.slug}&type=${type}`)}
                style={tw`bg-white border border-gray-200 rounded-2xl p-4 mb-4 shadow-sm`}
                activeOpacity={0.7}
              >
                <View style={tw`flex-row items-start justify-between mb-3`}>
                  <View style={tw`flex-1`}>
                    <BoldText style={tw`text-lg text-gray-900 mb-1`}>
                      {problem.title}
                    </BoldText>
                    {problem.description && (
                      <AppText style={tw`text-sm text-gray-600 mb-2`}>
                        {problem.description}
                      </AppText>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                </View>

                <View style={tw`flex-row items-center gap-3 flex-wrap`}>
                  {/* Type Badge */}
                  {problem.type && (
                    <View style={tw`px-3 py-1 rounded-full bg-primary-100`}>
                      <AppText style={tw`text-xs font-medium text-primary-700 capitalize`}>
                        {problem.type}
                      </AppText>
                    </View>
                  )}

                  {/* Difficulty Badge */}
                  <View style={tw`px-3 py-1 rounded-full ${getDifficultyColor(problem.difficulty)}`}>
                    <AppText style={tw`text-xs font-medium capitalize`}>
                      {problem.difficulty}
                    </AppText>
                  </View>

                  {/* Word Count */}
                  {problem.wordCount !== undefined && (
                    <View style={tw`flex-row items-center gap-1`}>
                      <Ionicons name="book-outline" size={14} color="#6B7280" />
                      <AppText style={tw`text-xs text-gray-600`}>
                        {problem.wordCount} {problem.wordCount === 1 ? 'word' : 'words'}
                      </AppText>
                    </View>
                  )}

                  {/* Time Estimate */}
                  {problem.estimatedTimeMinutes && (
                    <View style={tw`flex-row items-center gap-1`}>
                      <Ionicons name="time-outline" size={14} color="#6B7280" />
                      <AppText style={tw`text-xs text-gray-600`}>
                        {problem.estimatedTimeMinutes} min
                      </AppText>
                    </View>
                  )}
                </View>

                {/* Phonemes */}
                {problem.phonemes && problem.phonemes.length > 0 && (
                  <View style={tw`mt-3`}>
                    <AppText style={tw`text-xs text-gray-500 mb-1`}>Target phonemes:</AppText>
                    <View style={tw`flex-row flex-wrap gap-2`}>
                      {problem.phonemes.map((phoneme, idx) => (
                        <View key={idx} style={tw`px-2 py-1 bg-gray-100 rounded`}>
                          <AppText style={tw`text-xs font-mono text-gray-700`}>
                            /{phoneme}/
                          </AppText>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}






