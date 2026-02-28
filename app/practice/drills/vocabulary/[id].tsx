import AITutorMessage from "@/components/drills/AITutorMessage";
import AudioButton from "@/components/drills/AudioButton";
import DrillHeader from "@/components/drills/DrillHeader";
import RecordButton from "@/components/drills/RecordButton";
import { AppText, Loader } from "@/components/ui";
import { getDrillById, bookmarkWord } from "@/services/drill.service";
import { useSaveDrill } from "@/hooks/useSaveDrill";
import { speechaceService } from "@/services/speechace.service";
import { Drill } from "@/types/drill.types";
import tw from "@/lib/tw";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState, useRef } from "react";
import { Animated, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity, View, ActivityIndicator } from "react-native";
import { Alert } from '@/utils/alert';
import { setAudioModeSafely } from '@/utils/audio';
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { useActivityStore } from "@/store/activity-store";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system/legacy";
import ConfettiCannon from "react-native-confetti-cannon";
import { logger } from "@/utils/logger";


function HintIcon() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
        stroke="#6B7280"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export default function VocabularyDrill() {
  const params = useLocalSearchParams();
  const drillId = params.id as string;
  const assignmentId = params.assignmentId as string | undefined;

  const { drillProgress, updateDrillProgress, addRecentActivity, clearDrillProgress } = useActivityStore();
  const startTimeRef = useRef(Date.now());
  const timeoutRefs = useRef<ReturnType<typeof setTimeout>[]>([]);

  const [drill, setDrill] = useState<Drill | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);
  const [messageIndex, setMessageIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [permissionResponse, requestPermission] = Audio.usePermissions();
  const [isBookmarked, setIsBookmarked] = useState(false);
  const { isSaved, handleSave, handleUnsave } = useSaveDrill(drillId);

  // Restore progress
  useEffect(() => {
    if (drillId && drillProgress[drillId]) {
      const saved = drillProgress[drillId];
      if (saved.data?.messageIndex !== undefined) {
        setMessageIndex(saved.data.messageIndex);
      }
      if (saved.currentStep) {
        setCurrentStep(saved.currentStep);
      }
    }
  }, [drillId]);

  // Track 5m duration
  useEffect(() => {
    return () => {
      const durationSeconds = (Date.now() - startTimeRef.current) / 1000;
      if (drill && durationSeconds >= 5 * 60) {
        addRecentActivity({
          id: drill._id,
          title: drill.title,
          type: drill.type,
          durationSeconds,
          score: 0,
        });
      }
    };
  }, [drill]);

  // Save progress
  useEffect(() => {
    if (drill) {
      updateDrillProgress({
        drillId,
        title: drill.title,
        type: drill.type,
        currentStep,
        totalSteps: drill.target_sentences?.length || 1,
        answers: [],
        data: { messageIndex },
        startTime: startTimeRef.current,
        lastUpdated: Date.now(),
      });
    }
  }, [currentStep, messageIndex, drill]);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        await loadDrill();
      } catch (error) {
        if (isMounted) {
          logger.error('Failed to load drill:', error);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
      // Clear all pending timeouts
      timeoutRefs.current.forEach(timeoutId => clearTimeout(timeoutId));
      timeoutRefs.current = [];
      if (recording) {
        stopRecording();
      }
    };
  }, [drillId]);

  const loadDrill = async () => {
    try {
      setLoading(true);
      const drillData = await getDrillById(drillId, assignmentId);
      setDrill(drillData);
    } catch (error) {
      logger.error('Failed to load drill:', error);
    } finally {
      setLoading(false);
    }
  };

  async function startRecording() {
    try {
      if (permissionResponse?.status !== 'granted') {
        logger.log('Requesting permission..');
        await requestPermission();
      }

      await setAudioModeSafely({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      logger.log('Starting recording..');
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
      setIsRecording(true);
      logger.log('Recording started');
    } catch (err) {
      logger.error('Failed to start recording', err);
    }
  }

  async function stopRecording() {
    logger.log('Stopping recording..');
    if (!recording) {
      logger.log('No recording to stop');
      setIsRecording(false);
      setProcessing(false);
      return;
    }

    // Store reference before clearing state
    const recordingToStop = recording;
    setRecording(null);
    setIsRecording(false); // Stop UI animation immediately
    setProcessing(true); // Show processing state

    try {
      // Check if recording still exists and has the method
      if (recordingToStop && typeof recordingToStop.stopAndUnloadAsync === 'function') {
        await recordingToStop.stopAndUnloadAsync();
        const uri = recordingToStop.getURI();
        logger.log('Recording stopped and stored at', uri);

        if (uri) {
          // Convert to base64 using legacy API
          const base64 = await FileSystem.readAsStringAsync(uri, {
            encoding: (FileSystem as any).EncodingType?.Base64 || 'base64',
          });

          // Get current word
          const currentTarget = drill?.target_sentences?.[messageIndex];
          const targetText = currentTarget?.word || "test";

          logger.log('Analyzing pronunciation for:', targetText);

          // Call SpeechAce
          const result = await speechaceService.scorePronunciation(targetText, base64);
          logger.log('SpeechAce Result:', result);

          // Check score (Threshold: 80)
          let qualityScore = 0;

          if (typeof result.text_score === 'number') {
            qualityScore = result.text_score;
          } else if (result.textScore?.speechace_score?.pronunciation) {
            qualityScore = result.textScore.speechace_score.pronunciation;
          } else if (typeof result.text_score === 'object' && result.text_score.quality_score) {
            qualityScore = result.text_score.quality_score;
          }

          logger.log('Final Quantity Score:', qualityScore);

          if (qualityScore >= 80) {
            handleSuccess();
          } else {
            Alert.alert("Try Again", `Score: ${qualityScore}. You need 80+ to proceed. Keep practicing!`);
          }
        }
      } else {
        logger.warn('Recording object is invalid or already stopped');
      }
    } catch (error: any) {
      logger.error('Error processing audio:', error);
      // Don't show alert for "Recorder does not exist" - it's usually harmless
      if (error?.message?.includes('Recorder does not exist')) {
        logger.log('Recording was already stopped or cleaned up');
      } else {
        Alert.alert("Error", "Failed to process audio. Please try again.");
      }
    } finally {
      // Always reset processing state
      setProcessing(false);
    }
  }

  const handleRecord = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleSuccess = () => {
    setShowSuccess(true);
    setShowConfetti(true);

    // Stop confetti after a few seconds
    setTimeout(() => {
      setShowConfetti(false);
    }, 3000);

    // Move to next word or complete using local variable
    const totalWords = drill?.target_sentences?.length || 1;

    if (totalWords && messageIndex < totalWords - 1) {
      setTimeout(() => {
        setMessageIndex((prev) => prev + 1);
        setCurrentStep((prev) => prev + 1);
        setShowSuccess(false);
        // Reset bookmark state for new word if needed (though global bookmark might be per drill)
        setIsBookmarked(false);
      }, 2000);
    } else {
      // Complete
      if (drill) {
        const durationSeconds = (Date.now() - startTimeRef.current) / 1000;
        addRecentActivity({
          id: drill._id,
          title: drill.title,
          type: drill.type,
          durationSeconds,
          score: 100,
        });
        clearDrillProgress(drillId);
        Alert.alert("Congratulations!", "Drill Completed!");
      }
    }
  };

  const handleBookmark = async () => {
    if (!drill) return;
    try {
      const currentTarget = drill.target_sentences?.[messageIndex];
      const word = currentTarget?.word || drill.title;

      await bookmarkWord(word, drill._id);
      setIsBookmarked(true);
      Alert.alert("Saved", `"${word}" has been bookmarked.`);
    } catch (error) {
      Alert.alert("Error", "Failed to bookmark.");
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={tw`flex-1 bg-white items-center justify-center`}>
        <Loader />
      </SafeAreaView>
    );
  }

  if (!drill) {
    return (
      <SafeAreaView style={tw`flex-1 bg-white items-center justify-center`}>
        <AppText>Drill not found</AppText>
      </SafeAreaView>
    );
  }

  // Derived data
  const currentTargetSentence = drill.target_sentences?.[messageIndex] || drill.target_sentences?.[0];
  const word = currentTargetSentence?.word || currentTargetSentence?.text?.split(' ')[0] || "Word";
  const sentence = currentTargetSentence?.text || "";
  const wordTranslation = currentTargetSentence?.wordTranslation || "";
  const sentenceTranslation = currentTargetSentence?.translation || "";
  const phonetic = "/.../"; // Placeholder or from API if available
  const messages = [
    `Hello! Today, we'll practice how to pronounce the word "${word}"`,
    `Don't worry, take your time.`,
  ];

  return (
    <SafeAreaView style={tw`flex-1 bg-white`} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={tw`flex-1`}
      >
        <DrillHeader
          title={drill.title}
          currentStep={currentStep}
          totalSteps={drill.target_sentences?.length || 1}
          drillId={drillId}
          isSaved={isSaved}
          onSave={handleSave}
          onUnsave={handleUnsave}
        />

        <ScrollView
          style={tw`flex-1 px-5`}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={tw`pb-6`}
        >
          <AITutorMessage
            message={messages[messageIndex] || messages[0]}
            showAudio={true}
            onPlayAudio={() => {
              // TTS will be handled by AudioButton component
            }}
          />

          {messageIndex === 0 && currentTargetSentence && (
            <View style={tw`bg-white border border-gray-200 rounded-2xl p-4 mb-4`}>
              <View style={tw`flex-row items-center justify-between w-full mb-2`}>
                <View style={tw`flex-1`}>
                  <AppText style={tw`text-pink-500 text-base font-semibold mb-1`}>
                    {word}
                  </AppText>
                  {wordTranslation && (
                    <AppText style={tw`text-sm text-gray-500`}>
                      {wordTranslation}
                    </AppText>
                  )}
                </View>
                <View style={tw`flex-row items-center gap-2`}>
                  <AudioButton text={word} audioUri={currentTargetSentence.wordAudioUrl} />
                </View>
              </View>
              {sentence && (
                <View style={tw`mt-3 pt-3 border-t border-gray-100`}>
                  <AppText style={tw`text-sm text-gray-700 mb-1`}>
                    {sentence}
                  </AppText>
                  {sentenceTranslation && (
                    <AppText style={tw`text-xs text-gray-500`}>
                      {sentenceTranslation}
                    </AppText>
                  )}
                  <View style={tw`mt-2`}>
                    <AudioButton text={sentence} audioUri={currentTargetSentence.sentenceAudioUrl} size={18} />
                  </View>
                </View>
              )}
            </View>
          )}

          {messageIndex === 1 && (
            <AITutorMessage
              message={phonetic}
              showAudio={false}
            />
          )}

          {/* Word Card */}
          <View style={tw`items-center my-8 relative`}>
            {showConfetti && (
              <ConfettiCannon count={200} origin={{ x: -10, y: 0 }} />
            )}

            <AppText style={tw`text-6xl font-bold text-gray-900 mb-4`}>
              {word}
            </AppText>

            <View style={tw`flex-row items-center gap-2`}>
              <AudioButton text={word} audioUri={currentTargetSentence?.wordAudioUrl} size={24} />
            </View>
          </View>

          {showSuccess && (
            <View style={tw`bg-green-50 border border-green-200 rounded-2xl p-4 mb-4`}>
              <AppText style={tw`text-green-700 text-center font-semibold`}>
                Great job! 🎉
              </AppText>
            </View>
          )}

          {processing && (
            <View style={tw`bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-4`}>
              <ActivityIndicator size="small" color="#3B82F6" />
              <AppText style={tw`text-blue-700 text-center font-semibold mt-2`}>
                Analyzing pronunciation...
              </AppText>
            </View>
          )}
        </ScrollView>

        <View style={tw`px-5 pb-6 flex-row items-center justify-center gap-4`}>
          <TouchableOpacity
            style={tw`w-12 h-12 items-center justify-center bg-gray-100 rounded-full ${isBookmarked ? 'bg-yellow-100' : ''}`}
            onPress={handleBookmark}
          >
            <BookmarkIcon color={isBookmarked ? "#F59E0B" : "#6B7280"} />
          </TouchableOpacity>

          <RecordButton
            onPress={handleRecord}
            isRecording={isRecording}
          />

          <TouchableOpacity style={tw`w-12 h-12 items-center justify-center`}>
            <HintIcon />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function BookmarkIcon({ color = "#6B7280" }: { color?: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={color !== "#6B7280" ? color : "none"}
      />
    </Svg>
  );
}
