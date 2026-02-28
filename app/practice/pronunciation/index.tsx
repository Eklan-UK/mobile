import { AppText, BoldText } from "@/components/ui";
import tw from "@/lib/tw";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useState, useEffect, useRef } from "react";
import {
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { pronunciationService, type PronunciationWord, type PronunciationProblem } from "@/services/pronunciation.service";
import { useTTS } from "@/hooks/useTTS";
import { logger } from "@/utils/logger";
import { setAudioModeSafely } from "@/utils/audio";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system/legacy";
import ConfettiCannon from "react-native-confetti-cannon";
import ArrowLeftIcon from "@/assets/icons/arrow-left.svg";
import { aiService } from "@/services/ai.service";

export default function PronunciationPracticeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const slug = params.slug as string;
  const typeFilter = (params.type as "all" | "word" | "sound" | "sentence") || "all";

  const [problem, setProblem] = useState<PronunciationProblem | null>(null);
  const [words, setWords] = useState<PronunciationWord[]>([]);
  const [filteredWords, setFilteredWords] = useState<PronunciationWord[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [permissionResponse, requestPermission] = Audio.usePermissions();
  const { playAudio: playTTS } = useTTS({ autoPlay: false });

  const PASS_THRESHOLD = 70; // Score threshold for passing

  // Fetch problem and words
  useEffect(() => {
    const fetchData = async () => {
      if (!slug) {
        router.back();
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        logger.log('🔄 Fetching pronunciation data for slug:', slug);
        const data = await pronunciationService.getProblemBySlug(slug);

        logger.log('📊 Received Data:', {
          hasProblem: !!data.problem,
          hasWords: !!data.words,
          wordsIsArray: Array.isArray(data.words),
          wordsLength: Array.isArray(data.words) ? data.words.length : 'not an array',
          wordsType: typeof data.words,
          problemTitle: data.problem?.title,
          problemType: data.problem?.type,
          firstWordData: data.words?.[0],
        });

        setProblem(data.problem);
        const wordsArray = Array.isArray(data.words) ? data.words : [];
        logger.log('✅ Setting words:', {
          count: wordsArray.length,
          firstWord: wordsArray[0],
        });
        setWords(wordsArray);
      } catch (err: any) {
        logger.error('❌ Failed to load pronunciation data:', {
          error: err.message,
          stack: err.stack,
          response: err.response?.data,
        });
        setError('Failed to load pronunciation practice');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [slug]);

  // Filter words by type
  useEffect(() => {
    logger.log('🔍 Filtering words:', {
      totalWords: words.length,
      typeFilter,
      problemType: problem?.type,
      wordsTypes: words.map(w => ({ word: w.word, type: w.type })),
    });

    const filtered = typeFilter === "all"
      ? words
      : words.filter(w => {
        // Use word's type if available, otherwise fall back to problem's type
        const wordType = w.type || problem?.type;
        const matches = wordType === typeFilter;
        logger.log(`  Word "${w.word}": word.type=${w.type}, problem.type=${problem?.type}, resolved=${wordType}, filter=${typeFilter}, matches=${matches}`);
        return matches;
      });

    logger.log('✅ Filtered words result:', {
      filteredCount: filtered.length,
      filteredWords: filtered.map(w => ({ word: w.word, type: w.type || problem?.type })),
    });

    setFilteredWords(filtered);
    setCurrentIndex(0);
  }, [words, typeFilter, problem]);

  const currentWord = filteredWords[currentIndex];
  const totalItems = filteredWords.length;
  const progress = totalItems > 0 ? ((currentIndex + 1) / totalItems) * 100 : 0;

  const handleBack = () => {
    router.back();
  };

  // Start recording
  const startRecording = async () => {
    try {
      // Request permissions
      if (!permissionResponse?.granted) {
        const response = await requestPermission();
        if (!response.granted) {
          Alert.alert("Permission Required", "Microphone access is required for pronunciation practice.");
          return;
        }
      }

      await setAudioModeSafely({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      logger.log('Starting recording..');
      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(newRecording);
      setIsRecording(true);
      setShowFeedback(false);
      setScore(null);
      logger.log('Recording started');
    } catch (err: any) {
      logger.error('Failed to start recording', err);
      Alert.alert("Error", "Failed to start recording. Please try again.");
    }
  };

  // Stop recording and analyze
  const stopRecording = async () => {
    logger.log('Stopping recording..');
    if (!recording) {
      logger.log('No recording to stop');
      setIsRecording(false);
      setIsAnalyzing(false);
      return;
    }

    // Store reference before clearing state
    const recordingToStop = recording;
    setRecording(null);
    setIsRecording(false);
    setIsAnalyzing(true);

    try {
      // Check if recording still exists and has the method
      if (recordingToStop && typeof recordingToStop.stopAndUnloadAsync === 'function') {
        await recordingToStop.stopAndUnloadAsync();
        const uri = recordingToStop.getURI();
        logger.log('Recording stopped and stored at', uri);

        if (uri && currentWord) {
          logger.log('Analyzing pronunciation for:', currentWord.word);

          try {
            // Option 1: Try Gemini Native Audio first (new AI-powered analysis)
            const geminiResult = await aiService.analyzePronunciationAudio(
              uri,
              currentWord.word,
              'en-US'
            );

            logger.log('✅ Gemini analysis complete:', {
              accuracy: geminiResult.accuracy,
              transcription: geminiResult.transcription,
            });

            setScore(geminiResult.accuracy);
            setShowFeedback(true);
            setIsAnalyzing(false);

            if (geminiResult.accuracy >= PASS_THRESHOLD) {
              setShowConfetti(true);
              setTimeout(() => setShowConfetti(false), 3000);
            }

            // Also submit to backend for tracking (async, don't wait)
            const base64 = await FileSystem.readAsStringAsync(uri, {
              encoding: (FileSystem as any).EncodingType?.Base64 || 'base64',
            });
            pronunciationService.submitAttempt(
              currentWord._id,
              base64,
              currentWord.word
            ).catch((err) => {
              logger.warn('⚠️ Failed to submit to backend (non-critical):', err);
            });
          } catch (geminiError: any) {
            logger.warn('⚠️ Gemini analysis failed, falling back to backend:', geminiError);
            
            // Option 2: Fallback to existing backend method
            try {
              const base64 = await FileSystem.readAsStringAsync(uri, {
                encoding: (FileSystem as any).EncodingType?.Base64 || 'base64',
              });

              const result = await pronunciationService.submitAttempt(
                currentWord._id,
                base64,
                currentWord.word
              );

              // Extract pronunciation score from attempt result
              let pronunciationScore = 0;
              const attempt = result?.attempt;

              if (attempt) {
                if (typeof attempt.textScore === 'number') {
                  pronunciationScore = attempt.textScore;
                } else if (attempt.textScore?.speechace_score?.pronunciation) {
                  pronunciationScore = attempt.textScore.speechace_score.pronunciation;
                } else if (attempt.textScore?.quality_score) {
                  pronunciationScore = attempt.textScore.quality_score;
                } else if (typeof attempt.fluencyScore === 'number') {
                  pronunciationScore = attempt.fluencyScore;
                }
              }

              if (pronunciationScore === 0 && result?.progress?.bestScore) {
                pronunciationScore = result.progress.bestScore;
              }

              logger.log('Pronunciation Score (backend):', pronunciationScore);

              setScore(pronunciationScore);
              setShowFeedback(true);
              setIsAnalyzing(false);

              if (pronunciationScore >= PASS_THRESHOLD) {
                setShowConfetti(true);
                setTimeout(() => setShowConfetti(false), 3000);
              }
            } catch (backendError: any) {
              logger.error('❌ Backend analysis also failed:', backendError);
              setIsAnalyzing(false);
              Alert.alert("Error", "Failed to analyze pronunciation. Please try again.");
            }
          }
        }
      } else {
        logger.warn('Recording object is invalid or already stopped');
        setIsAnalyzing(false);
      }
    } catch (error: any) {
      logger.error('Error processing audio:', error);
      setIsAnalyzing(false);
      if (error?.message?.includes('Recorder does not exist')) {
        logger.log('Recording was already stopped or cleaned up');
      } else {
        Alert.alert("Error", "Failed to analyze pronunciation. Please try again.");
      }
    }
  };

  // Handle mic press
  const handleMicPress = async () => {
    if (isRecording) {
      await stopRecording();
    } else {
      await startRecording();
    }
  };

  // Play audio (TTS or uploaded)
  const handlePlayAudio = () => {
    if (!currentWord) return;

    if (currentWord.audioUrl) {
      // Play uploaded audio - would need Audio component from expo-av
      logger.log('Playing uploaded audio:', currentWord.audioUrl);
    } else if (currentWord.useTTS) {
      // Use TTS
      playTTS(currentWord.word);
    }
  };

  const handleNext = () => {
    if (currentIndex < filteredWords.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setShowFeedback(false);
      setScore(null);
      setShowConfetti(false); // Reset confetti when moving to next word
    } else {
      // Navigate to results
      router.push("/practice/pronunciation/complete");
    }
  };

  const handleTryAgain = () => {
    setShowFeedback(false);
    setScore(null);
    setShowConfetti(false); // Reset confetti when trying again
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'text-green-600';
      case 'intermediate': return 'text-yellow-600';
      case 'advanced': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView style={tw`flex-1 bg-white`}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={tw`flex-1 items-center justify-center`}>
          <ActivityIndicator size="large" color="#10B981" />
          <AppText style={tw`text-gray-500 mt-4`}>Loading practice...</AppText>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (error || !problem || filteredWords.length === 0) {
    return (
      <SafeAreaView style={tw`flex-1 bg-white`}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={tw`flex-1 items-center justify-center px-5`}>
          <Ionicons name="alert-circle" size={48} color="#EF4444" />
          <BoldText style={tw`text-gray-900 mt-4 text-center`}>
            {error || 'No words available'}
          </BoldText>
          <AppText style={tw`text-gray-500 mt-2 text-center`}>
            {typeFilter === "all"
              ? "This problem doesn't have any words to practice yet."
              : `This problem doesn't have any ${typeFilter} items to practice. Try selecting a different type.`}
          </AppText>
          <TouchableOpacity
            onPress={handleBack}
            style={tw`mt-6 px-6 py-3 bg-green-600 rounded-full`}
          >
            <AppText style={tw`text-white font-semibold`}>Go Back</AppText>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={tw`px-5 pt-4 pb-3`}>
        <View style={tw`flex-row items-center justify-between mb-4`}>
          <TouchableOpacity
            onPress={handleBack}
            style={tw`w-[40px] h-[40px] bg-neutral-100 rounded-full items-center justify-center`}
          >
            <ArrowLeftIcon />
          </TouchableOpacity>
          <BoldText style={tw`text-base text-gray-900`}>
            {problem.title}
          </BoldText>
          <Text style={tw`text-sm text-gray-500`}>
            {currentIndex + 1} of {totalItems}
          </Text>
        </View>

        {/* Progress Bar */}
        <View style={tw`h-2 bg-gray-200 rounded-full overflow-hidden`}>
          <View
            style={[
              tw`h-full bg-green-600 rounded-full`,
              { width: `${progress}%` }
            ]}
          />
        </View>
      </View>

      {/* Main Content */}
      <View style={tw`flex-1 items-center justify-center px-5`}>
        {/* Confetti Effect */}
        {showConfetti && (
          <ConfettiCannon count={200} origin={{ x: -10, y: 0 }} />
        )}

        {/* Main Text */}
        {currentWord && (
          <>
            <Text style={tw`text-6xl font-bold text-gray-900 mb-4 text-center`}>
              {currentWord.word}
            </Text>

            {/* IPA */}
            <Text style={tw`text-lg text-gray-600 mb-2 text-center`}>
              {currentWord.ipa}
            </Text>

            {/* Type Badge */}
            {currentWord.type && (
              <View style={tw`px-3 py-1 rounded-full bg-primary-100 mb-4`}>
                <AppText style={tw`text-xs font-medium text-primary-700 capitalize`}>
                  {currentWord.type}
                </AppText>
              </View>
            )}

            {/* Difficulty */}
            <View style={tw`flex-row items-center gap-2 mb-6`}>
              <Ionicons name="trophy-outline" size={16} color="#6B7280" />
              <AppText style={tw`text-sm ${getDifficultyColor(currentWord.difficulty)} capitalize`}>
                {currentWord.difficulty}
              </AppText>
            </View>

            {/* Audio Controls */}
            <View style={tw`flex-row items-center gap-4 mb-8`}>
              <TouchableOpacity
                onPress={handlePlayAudio}
                style={tw`w-10 h-10 items-center justify-center`}
              >
                <Ionicons name="volume-high" size={24} color="#374151" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handlePlayAudio}
                style={tw`w-10 h-10 items-center justify-center`}
              >
                <Ionicons name="reload" size={24} color="#374151" />
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Score Display */}
        {showFeedback && score !== null && (
          <View style={tw`absolute top-40 right-5`}>
            <View style={tw`w-12 h-12 rounded-full bg-primary-100 items-center justify-center mb-2`}>
              <Text style={tw`text-2xl`}>🤖</Text>
            </View>
            <View style={tw`bg-white border ${score >= 70 ? 'border-green-500' : 'border-yellow-500'} rounded-2xl p-4 shadow-lg min-w-32`}>
              <Text style={tw`text-3xl font-bold ${score >= 70 ? 'text-green-600' : 'text-yellow-600'} text-center mb-1`}>
                {score}%
              </Text>
              <Text style={tw`text-xs text-gray-600 text-center`}>
                {score >= 70 ? 'Great job!' : 'Keep practicing'}
              </Text>
            </View>
          </View>
        )}


        {/* Analyzing Indicator */}
        {isAnalyzing && (
          <View style={tw`absolute top-40`}>
            <View style={tw`bg-white border border-blue-500 rounded-2xl p-4 shadow-lg`}>
              <View style={tw`flex-row items-center gap-3`}>
                <ActivityIndicator size="small" color="#3B82F6" />
                <AppText style={tw`text-sm text-gray-700`}>
                  Analyzing pronunciation...
                </AppText>
              </View>
            </View>
          </View>
        )}
      </View>

      {/* Bottom Actions */}
      {currentWord && (
        <View style={tw`px-5 pb-8`}>
          {!showFeedback && !isAnalyzing ? (
            <View style={tw`flex-row items-center justify-between`}>
              {/* Bookmark */}
              <TouchableOpacity style={tw`w-12 h-12 items-center justify-center`}>
                <Ionicons name="bookmark-outline" size={28} color="#374151" />
              </TouchableOpacity>

              {/* Microphone Button */}
              <TouchableOpacity
                onPress={handleMicPress}
                disabled={isAnalyzing}
                style={tw`w-20 h-20 rounded-full ${isRecording ? 'bg-red-600' : 'bg-green-600'} items-center justify-center shadow-lg ${isAnalyzing ? 'opacity-50' : ''}`}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={isRecording ? "stop" : "mic"}
                  size={36}
                  color="white"
                />
              </TouchableOpacity>

              {/* Settings */}
              <TouchableOpacity style={tw`w-12 h-12 items-center justify-center`}>
                <Ionicons name="settings-outline" size={28} color="#374151" />
              </TouchableOpacity>
            </View>
          ) : showFeedback && score !== null ? (
            <View style={tw`gap-3`}>
              {/* Next Button */}
              <TouchableOpacity
                onPress={handleNext}
                style={tw`bg-green-600 rounded-full py-4 items-center`}
                activeOpacity={0.8}
              >
                <AppText style={tw`text-white text-base font-semibold`}>
                  {currentIndex < filteredWords.length - 1 ? "Next" : "Finish"}
                </AppText>
              </TouchableOpacity>

              {/* Try Again Button */}
              <TouchableOpacity
                onPress={handleTryAgain}
                style={tw`py-4 items-center`}
                activeOpacity={0.8}
              >
                <AppText style={tw`text-gray-700 text-base font-medium`}>
                  Try again
                </AppText>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      )}
    </SafeAreaView>
  );
}