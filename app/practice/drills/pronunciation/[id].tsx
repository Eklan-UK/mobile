import AITutorMessage from "@/components/drills/AITutorMessage";
import AudioButton from "@/components/drills/AudioButton";
import DrillCompletedScreen from "@/components/drills/DrillCompletedScreen";
import SpeechAnalysisReview from "@/components/drills/SpeechAnalysisReview";
import type { AnalysisResult } from "@/components/drills/SpeechAnalysisReview";
import DrillHeader from "@/components/drills/DrillHeader";
import RecordButton from "@/components/drills/RecordButton";
import { AppText, Loader } from "@/components/ui";
import { getDrillById, completeDrill } from "@/services/drill.service";
import { useSaveDrill } from "@/hooks/useSaveDrill";
import { speechaceService, extractTextScore, extractQualityScore } from "@/services/speechace.service";
import type { PronunciationItem } from "@/types/drill.types";
import { Drill } from "@/types/drill.types";
import tw from "@/lib/tw";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Alert } from "@/utils/alert";
import { setAudioModeSafely } from "@/utils/audio";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { useActivityStore } from "@/store/activity-store";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system/legacy";
import ConfettiCannon from "react-native-confetti-cannon";
import { logger } from "@/utils/logger";
import apiClient from "@/lib/api";

const PASS_THRESHOLD = 65;

type StepType = "word" | "sentence";

type ItemProgress = {
  wordPassed: boolean;
  wordScore: number;
  sentencePassed: boolean;
  sentenceScore: number;
};

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

export default function PronunciationDrill() {
  const params = useLocalSearchParams();
  const drillId = params.id as string;
  const assignmentId = params.assignmentId as string | undefined;

  const { drillProgress, updateDrillProgress, addRecentActivity, clearDrillProgress } =
    useActivityStore();
  const startTimeRef = useRef(Date.now());
  const timeoutRefs = useRef<ReturnType<typeof setTimeout>[]>([]);

  const [drill, setDrill] = useState<Drill | null>(null);
  const [loading, setLoading] = useState(true);

  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [currentStep, setCurrentStep] = useState<StepType>("word");

  const [itemProgress, setItemProgress] = useState<ItemProgress[]>([]);

  const [isRecording, setIsRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [permissionResponse, requestPermission] = Audio.usePermissions();

  const [showSuccess, setShowSuccess] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [isDrillCompleted, setIsDrillCompleted] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult[]>([]);

  const { isSaved, handleSave, handleUnsave } = useSaveDrill(drillId);

  // Restore progress
  useEffect(() => {
    if (drillId && drillProgress[drillId]) {
      const saved = drillProgress[drillId];
      if (saved.data?.currentItemIndex !== undefined) {
        setCurrentItemIndex(saved.data.currentItemIndex);
      }
      if (saved.data?.currentStep) {
        setCurrentStep(saved.data.currentStep);
      }
      if (saved.data?.itemProgress) {
        setItemProgress(saved.data.itemProgress);
      }
    }
  }, [drillId]);

  // Track 5-min duration for recent activity
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
      const totalItems = drill.pronunciation_items?.length || 1;
      updateDrillProgress({
        drillId,
        title: drill.title,
        type: drill.type,
        currentStep: currentItemIndex + 1,
        totalSteps: totalItems,
        answers: [],
        data: { currentItemIndex, currentStep, itemProgress },
        startTime: startTimeRef.current,
        lastUpdated: Date.now(),
      });
    }
  }, [currentItemIndex, currentStep, itemProgress, drill]);

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      try {
        await loadDrill();
      } catch (error) {
        if (isMounted) logger.error("Failed to load drill:", error);
      }
    };
    loadData();
    return () => {
      isMounted = false;
      timeoutRefs.current.forEach(clearTimeout);
      timeoutRefs.current = [];
    };
  }, [drillId]);

  const loadDrill = async () => {
    try {
      setLoading(true);
      const drillData = await getDrillById(drillId, assignmentId);
      setDrill(drillData);

      const totalItems = drillData.pronunciation_items?.length || 0;
      setItemProgress(
        Array.from({ length: totalItems }, () => ({
          wordPassed: false,
          wordScore: 0,
          sentencePassed: false,
          sentenceScore: 0,
        }))
      );
    } catch (error) {
      logger.error("Failed to load drill:", error);
    } finally {
      setLoading(false);
    }
  };

  // ── Recording helpers ──────────────────────────────────────────────────

  async function startRecording() {
    try {
      if (permissionResponse?.status !== "granted") {
        await requestPermission();
      }

      await setAudioModeSafely({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(newRecording);
      setIsRecording(true);
    } catch (err) {
      logger.error("Failed to start recording:", err);
      Alert.alert("Error", "Failed to start recording. Please check microphone permissions.");
    }
  }

  async function stopRecording() {
    if (!recording) {
      setIsRecording(false);
      setProcessing(false);
      return;
    }

    const recordingToStop = recording;
    setRecording(null);
    setIsRecording(false);
    setProcessing(true);

    try {
      if (typeof recordingToStop.stopAndUnloadAsync === "function") {
        await recordingToStop.stopAndUnloadAsync();
        const uri = recordingToStop.getURI();

        if (uri) {
          const base64 = await FileSystem.readAsStringAsync(uri, {
            encoding: (FileSystem as any).EncodingType?.Base64 || "base64",
          });
          await analyzeRecording(base64);
        }
      }
    } catch (error: any) {
      logger.error("Error stopping recording:", error);
      if (!error?.message?.includes("Recorder does not exist")) {
        Alert.alert("Error", "Failed to process audio. Please try again.");
      }
    } finally {
      setProcessing(false);
    }
  }

  const analyzeRecording = async (base64: string) => {
    const currentItem = drill?.pronunciation_items?.[currentItemIndex];
    if (!currentItem) return;

    const referenceText =
      currentStep === "word"
        ? currentItem.word.trim() || ""
        : currentItem.sentence.trim() || "";

    logger.log(`Analyzing ${currentStep} pronunciation for: "${referenceText}"`);

    try {
      const result = await speechaceService.scorePronunciation(referenceText, base64);

      if (result.status === "error" && result.short_message === "error_no_speech") {
        Alert.alert(
          "No Speech Detected",
          "We couldn't detect any speech. Please try again and speak clearly."
        );
        return;
      }

      const textScore = extractTextScore(result);
      const qualityScore = extractQualityScore(result);

      logger.log(`Score for ${currentStep}: ${qualityScore}`);

      setAnalysisResults((prev) => [
        ...prev,
        { text: referenceText, score: qualityScore, textScore },
      ]);

      const passed = qualityScore >= PASS_THRESHOLD;

      if (currentStep === "word") {
        setItemProgress((prev) => {
          const updated = [...prev];
          updated[currentItemIndex] = {
            ...updated[currentItemIndex],
            wordScore: qualityScore,
            wordPassed: passed,
          };
          return updated;
        });

        if (passed) {
          logPronunciationAttempt(referenceText, base64);
          handleWordPassed();
        } else {
          Alert.alert(
            "Keep Trying",
            `Score: ${Math.round(qualityScore)}%. You need ${PASS_THRESHOLD}%+ to continue. Try again!`
          );
        }
      } else {
        setItemProgress((prev) => {
          const updated = [...prev];
          updated[currentItemIndex] = {
            ...updated[currentItemIndex],
            sentenceScore: qualityScore,
            sentencePassed: passed,
          };
          return updated;
        });

        if (passed) {
          logPronunciationAttempt(referenceText, base64);
          handleSentencePassed();
        } else {
          Alert.alert(
            "Keep Trying",
            `Score: ${Math.round(qualityScore)}%. You need ${PASS_THRESHOLD}%+ to continue. Try again!`
          );
        }
      }
    } catch (error) {
      logger.error("Speechace analysis failed:", error);
      Alert.alert("Error", "Failed to analyze pronunciation. Please try again.");
    }
  };

  const logPronunciationAttempt = (text: string, audioBase64: string) => {
    apiClient
      .post("/api/v1/pronunciations/drill-attempt", {
        text,
        audioBase64,
        drillId,
        drillType: "pronunciation",
        passingThreshold: PASS_THRESHOLD,
      })
      .catch((err) => logger.warn("Failed to log pronunciation attempt (non-critical):", err));
  };

  const handleWordPassed = () => {
    setShowSuccess(true);
    setShowConfetti(true);
    const t = setTimeout(() => {
      setShowConfetti(false);
      setShowSuccess(false);
    }, 2000);
    timeoutRefs.current.push(t);
  };

  const handleSentencePassed = () => {
    setShowSuccess(true);
    setShowConfetti(true);

    const totalItems = drill?.pronunciation_items?.length || 1;
    const isLastItem = currentItemIndex >= totalItems - 1;

    const t = setTimeout(() => {
      setShowConfetti(false);
      setShowSuccess(false);

      if (!isLastItem) {
        setCurrentItemIndex((prev) => prev + 1);
        setCurrentStep("word");
        setIsBookmarked(false);
      } else {
        if (drill) {
          const durationSeconds = (Date.now() - startTimeRef.current) / 1000;
          addRecentActivity({
            id: drill._id,
            title: drill.title,
            type: drill.type,
            durationSeconds,
            score: 100,
          });
        }
        setShowReview(true);
      }
    }, 2000);
    timeoutRefs.current.push(t);
  };

  const handleRecord = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleMoveToSentence = () => {
    const progress = itemProgress[currentItemIndex];
    if (!progress?.wordPassed) {
      Alert.alert(
        "Word Step Required",
        `Please pass the word pronunciation (${PASS_THRESHOLD}%+) before continuing to the sentence.`
      );
      return;
    }
    setCurrentStep("sentence");
  };

  const handlePreviousItem = () => {
    if (currentItemIndex > 0 && currentStep === "word") {
      setCurrentItemIndex((prev) => prev - 1);
      setCurrentStep("word");
    }
  };

  // ── Build completion payload and submit ──────────────────────────────────

  const handleSubmitAfterReview = async () => {
    if (!drill) return;

    const items = drill.pronunciation_items || [];
    const totalItems = items.length;
    const passedItems = itemProgress.filter((p) => p.wordPassed && p.sentencePassed).length;
    const score = totalItems > 0 ? Math.round((passedItems / totalItems) * 100) : 0;
    const timeSpent = Math.floor((Date.now() - startTimeRef.current) / 1000);

    const wordScores = items.map((item, idx) => {
      const progress = itemProgress[idx] || {
        wordPassed: false,
        wordScore: 0,
        sentencePassed: false,
        sentenceScore: 0,
      };
      const word = item.word.trim() || `Item ${idx + 1}`;
      const itemScore =
        progress.wordPassed && progress.sentencePassed
          ? Math.round((progress.wordScore + progress.sentenceScore) / 2)
          : 0;
      return {
        word,
        score: itemScore,
        attempts: 1,
        pronunciationScore: itemScore,
      };
    });

    try {
      await completeDrill(drillId, {
        drillAssignmentId: assignmentId,
        score,
        timeSpent,
        answers: [],
        pronunciationResults: { wordScores },
      });
      clearDrillProgress(drillId);
    } catch (error) {
      logger.error("Failed to submit pronunciation drill:", error);
      Alert.alert("Error", "Failed to submit results. Please try again.");
      return;
    }

    setIsDrillCompleted(true);
  };

  // ── Derived data ─────────────────────────────────────────────────────────

  const items = drill?.pronunciation_items || [];
  const totalItems = items.length;
  const currentItem: PronunciationItem | undefined = items[currentItemIndex];
  const currentProgress = itemProgress[currentItemIndex] || {
    wordPassed: false,
    wordScore: 0,
    sentencePassed: false,
    sentenceScore: 0,
  };

  // ── Screens ──────────────────────────────────────────────────────────────

  if (showReview && !isDrillCompleted && drill) {
    return (
      <SpeechAnalysisReview
        analysisResults={analysisResults}
        drillType="pronunciation"
        onDone={handleSubmitAfterReview}
        onPracticeAgain={() => {
          setShowReview(false);
          setCurrentItemIndex(0);
          setCurrentStep("word");
          setShowSuccess(false);
          setShowConfetti(false);
          setAnalysisResults([]);
          setIsBookmarked(false);
          startTimeRef.current = Date.now();
          setItemProgress(
            Array.from({ length: totalItems }, () => ({
              wordPassed: false,
              wordScore: 0,
              sentencePassed: false,
              sentenceScore: 0,
            }))
          );
        }}
      />
    );
  }

  if (isDrillCompleted && drill) {
    return (
      <DrillCompletedScreen
        variant="progress"
        completed={itemProgress.filter((p) => p.wordPassed && p.sentencePassed).length}
        total={totalItems}
        title="Lesson completed"
        message={`Great job! You've practiced pronunciation for all ${totalItems} item${totalItems > 1 ? "s" : ""}.`}
        onContinue={() => router.back()}
        onClose={() => router.back()}
      />
    );
  }

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

  if (items.length === 0) {
    return (
      <SafeAreaView style={tw`flex-1 bg-white items-center justify-center px-5`}>
        <AppText style={tw`text-gray-600 text-center`}>
          No pronunciation items found in this drill.
        </AppText>
      </SafeAreaView>
    );
  }

  // ── WORD STEP ────────────────────────────────────────────────────────────

  if (currentStep === "word") {
    const word = currentItem?.word?.trim() || "";
    const soundFocus = currentItem?.sound?.trim() || "";
    const tutorMessage = `Hello! Today, we'll practice how to pronounce the word "${word}"`;

    return (
      <SafeAreaView style={tw`flex-1 bg-white`} edges={["top", "bottom"]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={tw`flex-1`}
        >
          <DrillHeader
            title={drill.title}
            currentStep={currentItemIndex + 1}
            totalSteps={totalItems}
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
            <AppText style={tw`text-xs font-semibold text-green-600 uppercase tracking-wide mb-3 mt-2`}>
              Step 1 of 2 — Pronounce the Word
            </AppText>

            <AITutorMessage message={tutorMessage} showAudio={true} />

            {/* Word card */}
            {currentItem && (
              <View style={tw`bg-white border border-gray-200 rounded-2xl p-4 mb-4`}>
                <View style={tw`flex-row items-center justify-between w-full mb-2`}>
                  <View style={tw`flex-1`}>
                    <AppText style={tw`text-pink-500 text-base font-semibold mb-1`}>
                      {word}
                    </AppText>
                    {soundFocus ? (
                      <AppText style={tw`text-sm text-gray-500`}>
                        Sound focus: {soundFocus}
                      </AppText>
                    ) : null}
                  </View>
                  <AudioButton
                    text={word}
                    audioUri={currentItem.wordAudioUrl}
                    size={20}
                  />
                </View>
                {currentItem.sentence ? (
                  <View style={tw`mt-3 pt-3 border-t border-gray-100`}>
                    <AppText style={tw`text-sm text-gray-700 mb-1`}>
                      {currentItem.sentence}
                    </AppText>
                    <View style={tw`mt-2`}>
                      <AudioButton
                        text={currentItem.sentence}
                        audioUri={currentItem.sentenceAudioUrl}
                        size={18}
                      />
                    </View>
                  </View>
                ) : null}
              </View>
            )}

            {/* Large word display */}
            <View style={tw`items-center my-8 relative`}>
              {showConfetti && (
                <ConfettiCannon count={200} origin={{ x: -10, y: 0 }} />
              )}
              <AppText style={tw`text-6xl font-bold text-gray-900 mb-2`}>{word}</AppText>
              {soundFocus ? (
                <AppText style={tw`text-base text-indigo-600 mb-4`}>
                  Sound focus: {soundFocus}
                </AppText>
              ) : null}
              <AudioButton
                text={word}
                audioUri={currentItem?.wordAudioUrl}
                size={24}
              />
            </View>

            {currentProgress.wordPassed && (
              <View style={tw`bg-green-50 border border-green-200 rounded-2xl p-4 mb-4`}>
                <AppText style={tw`text-green-700 text-center font-semibold`}>
                  Word passed! Score: {Math.round(currentProgress.wordScore)}% 🎉
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

          {/* Bottom bar */}
          <View style={tw`px-5 pb-6`}>
            {currentProgress.wordPassed ? (
              <TouchableOpacity
                onPress={handleMoveToSentence}
                style={tw`w-full bg-green-700 rounded-full py-4 items-center mb-4`}
                activeOpacity={0.8}
              >
                <AppText style={tw`text-white text-base font-semibold`}>
                  Continue to Sentence
                </AppText>
              </TouchableOpacity>
            ) : null}

            <View style={tw`flex-row items-center justify-center gap-4`}>
              <TouchableOpacity
                style={tw`w-12 h-12 items-center justify-center bg-gray-100 rounded-full ${
                  currentItemIndex > 0 ? "" : "opacity-30"
                }`}
                onPress={handlePreviousItem}
                disabled={currentItemIndex === 0}
              >
                <BookmarkIcon />
              </TouchableOpacity>

              <RecordButton
                onPress={handleRecord}
                isRecording={isRecording}
                isListening={processing}
              />

              <TouchableOpacity
                onPress={handleMoveToSentence}
                disabled={!currentProgress.wordPassed}
                style={tw`w-12 h-12 items-center justify-center ${
                  currentProgress.wordPassed ? "" : "opacity-30"
                }`}
              >
                <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M9 18l6-6-6-6"
                    stroke="#6B7280"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ── SENTENCE STEP ────────────────────────────────────────────────────────

  const word = currentItem?.word?.trim() || "";
  const sentence = currentItem?.sentence?.trim() || "";
  const tutorSentenceMessage = `Great job on the word! Now let's practice the full sentence. Listen carefully and then record yourself.`;

  return (
    <SafeAreaView style={tw`flex-1 bg-white`} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={tw`flex-1`}
      >
        <DrillHeader
          title={drill.title}
          currentStep={currentItemIndex + 1}
          totalSteps={totalItems}
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
          <AppText style={tw`text-xs font-semibold text-green-600 uppercase tracking-wide mb-3 mt-2`}>
            Step 2 of 2 — Pronounce the Sentence
          </AppText>

          <AITutorMessage message={tutorSentenceMessage} showAudio={true} />

          {/* Sentence card */}
          {currentItem && sentence ? (
            <View style={tw`bg-white border border-gray-200 rounded-2xl p-4 mb-4`}>
              <View style={tw`flex-row items-start justify-between w-full`}>
                <View style={tw`flex-1 mr-3`}>
                  <AppText style={tw`text-base text-gray-800 leading-6 mb-1`}>
                    {sentence}
                  </AppText>
                  <AppText style={tw`text-xs text-gray-400`}>
                    Target word: {word}
                  </AppText>
                </View>
                <AudioButton
                  text={sentence}
                  audioUri={currentItem.sentenceAudioUrl}
                  size={20}
                />
              </View>
            </View>
          ) : null}

          {/* Large sentence display */}
          <View style={tw`items-center my-8 relative`}>
            {showConfetti && (
              <ConfettiCannon count={200} origin={{ x: -10, y: 0 }} />
            )}
            <AppText
              style={tw`text-2xl font-bold text-gray-900 text-center mb-4 leading-8`}
            >
              {sentence || word}
            </AppText>
            <AudioButton
              text={sentence || word}
              audioUri={currentItem?.sentenceAudioUrl}
              size={24}
            />
          </View>

          {currentProgress.sentencePassed && (
            <View style={tw`bg-green-50 border border-green-200 rounded-2xl p-4 mb-4`}>
              <AppText style={tw`text-green-700 text-center font-semibold`}>
                Sentence passed! Score: {Math.round(currentProgress.sentenceScore)}% 🎉
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

        {/* Bottom bar */}
        <View style={tw`px-5 pb-6`}>
          <View style={tw`flex-row items-center justify-center gap-4`}>
            <View style={tw`w-12 h-12`} />

            <RecordButton
              onPress={handleRecord}
              isRecording={isRecording}
              isListening={processing}
            />

            <View style={tw`w-12 h-12`} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
