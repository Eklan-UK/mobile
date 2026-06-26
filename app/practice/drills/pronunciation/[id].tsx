import AITutorMessage from "@/components/drills/AITutorMessage";
import AudioButton from "@/components/drills/AudioButton";
import CheckpointScreen from "@/components/drills/CheckpointScreen";
import DrillHeader from "@/components/drills/DrillHeader";
import DrillLineReviewAccordion from "@/components/drills/DrillLineReviewAccordion";
import RecordButton from "@/components/drills/RecordButton";
import type { AnalysisResult } from "@/components/drills/SpeechAnalysisReview";
import SpeechAnalysisReview from "@/components/drills/SpeechAnalysisReview";
import { AppText, Loader } from "@/components/ui";
import { invalidateDrillCaches } from "@/hooks/useDrills";
import { useDrillCheckpoint } from "@/hooks/useDrillCheckpoint";
import { useSaveDrill } from "@/hooks/useSaveDrill";
import { completeWeeklyChallengeItemAndRefetch } from "@/hooks/useWeeklyChallenge";
import apiClient from "@/lib/api";
import { playPracticeFeedback } from "@/lib/practice-feedback";
import tw from "@/lib/tw";
import { completeDrill, getDrillById } from "@/services/drill.service";
import { extractQualityScore, extractTextScore, speechaceService } from "@/services/speechace.service";
import { useActivityStore } from "@/store/activity-store";
import type { PronunciationItem } from "@/types/drill.types";
import { Drill } from "@/types/drill.types";
import {
  DrillCheckpointType,
  type IndexKeyedWordProgress,
  type VocabularyWordProgressEntry,
} from "@/types/drill-checkpoint.types";
import { Alert } from "@/utils/alert";
import { decodeWeekStartDate, encodeWeekStartDate } from "@/utils/challengeDrillAdapter";
import { logger } from "@/utils/logger";
import {
    ensureMicrophonePermission,
    isRecordingPermissionError,
    prepareAudioForRecording,
    showMicrophonePermissionAlert,
} from "@/utils/microphone";
import { getCachedWCDrill } from "@/utils/weeklyChallengeDrillCache";
import { useQueryClient } from "@tanstack/react-query";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system/legacy";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

const PASS_THRESHOLD = 65;

type StepType = "word" | "sentence";

type ItemProgress = VocabularyWordProgressEntry;

function emptyItemProgress(): ItemProgress {
  return {
    wordPassed: false,
    wordScore: 0,
    sentencePassed: false,
    sentenceScore: 0,
  };
}

function buildWordProgressMap(progress: ItemProgress[]): IndexKeyedWordProgress {
  const map: IndexKeyedWordProgress = {};
  progress.forEach((entry, index) => {
    if (
      entry.wordPassed ||
      entry.sentencePassed ||
      entry.wordScore > 0 ||
      entry.sentenceScore > 0
    ) {
      map[String(index)] = entry;
    }
  });
  return map;
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

export default function PronunciationDrill() {
  const params = useLocalSearchParams();
  const drillId = params.id as string;
  const assignmentId = params.assignmentId as string | undefined;
  const isRedo = params.redo === "true";

  // Weekly challenge mode params
  const wcSource = params.source as string | undefined;
  const isWeeklyChallenge = wcSource === "weekly_challenge";
  const wcItemId = params.wcItemId as string | undefined;
  const wcWeekStartDateRaw = params.weekStartDate as string | undefined;
  const wcWeekStartDate = wcWeekStartDateRaw
    ? decodeWeekStartDate(wcWeekStartDateRaw)
    : undefined;

  const { drillProgress, updateDrillProgress, addRecentActivity, clearDrillProgress } =
    useActivityStore();
  const queryClient = useQueryClient();
  const startTimeRef = useRef(Date.now());
  const scrollRef = useRef<ScrollView>(null);

  const [drill, setDrill] = useState<Drill | null>(null);
  const [loading, setLoading] = useState(true);

  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [currentStep, setCurrentStep] = useState<StepType>("word");

  const [itemProgress, setItemProgress] = useState<ItemProgress[]>([]);

  const [isRecording, setIsRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);

  const [isBookmarked, setIsBookmarked] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult[]>([]);
  const submitPromiseRef = useRef<Promise<boolean> | null>(null);

  const { isSaved, handleSave, handleUnsave } = useSaveDrill(drillId);

  const checkpointTotalItems = drill?.pronunciation_items?.length ?? 0;

  const initFreshState = useCallback(() => {
    const count = drill?.pronunciation_items?.length ?? 0;
    setCurrentItemIndex(0);
    setCurrentStep("word");
    setItemProgress(Array.from({ length: count }, emptyItemProgress));
    setAnalysisResults([]);
  }, [drill?.pronunciation_items?.length]);

  const hydrateFromCheckpoint = useCallback(
    (checkpoint: {
      resumeFromIndex: number;
      partialResults: { wordProgress: IndexKeyedWordProgress };
    }) => {
      const count = drill?.pronunciation_items?.length ?? 0;
      const base = Array.from({ length: count }, emptyItemProgress);
      for (const [key, value] of Object.entries(
        checkpoint.partialResults.wordProgress ?? {}
      )) {
        const index = Number(key);
        if (index >= 0 && index < base.length) {
          base[index] = value;
        }
      }
      setItemProgress(base);
      setCurrentItemIndex(
        Math.min(Math.max(checkpoint.resumeFromIndex, 0), Math.max(count - 1, 0))
      );
      setCurrentStep("word");
    },
    [drill?.pronunciation_items?.length]
  );

  const {
    isLoadingCheckpoint,
    showCheckpointScreen,
    checkpointCompletedCount,
    dismissCheckpoint,
    saveCheckpointAtBoundary,
    clearCheckpoint,
    skipLocalRestore,
  } = useDrillCheckpoint({
    drillId,
    assignmentId,
    drillType: DrillCheckpointType.pronunciation,
    isRedo,
    isWeeklyChallenge,
    isDrillReady: !!drill && checkpointTotalItems > 0,
    totalItems: checkpointTotalItems,
    onHydrate: hydrateFromCheckpoint,
    onFreshStart: initFreshState,
  });

  // Restore progress
  useEffect(() => {
    if (skipLocalRestore) return;
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
  }, [drillId, skipLocalRestore]);

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
    };
  }, [drillId]);

  const loadDrill = async () => {
    try {
      setLoading(true);

      // WC mode: load pre-adapted drill from cache
      if (isWeeklyChallenge) {
        const cached = getCachedWCDrill(drillId);
        if (cached) {
          setDrill(cached);
          const totalItems = cached.pronunciation_items?.length || 0;
          setItemProgress(
            Array.from({ length: totalItems }, () => ({
              wordPassed: false,
              wordScore: 0,
              sentencePassed: false,
              sentenceScore: 0,
            }))
          );
          return;
        }
        logger.warn("[PronunciationDrill] WC drill not in cache:", drillId);
        router.back();
        return;
      }

      const drillData = await getDrillById(drillId, assignmentId);
      setDrill(drillData);
    } catch (error) {
      logger.error("Failed to load drill:", error);
    } finally {
      setLoading(false);
    }
  };

  // ── Recording helpers ──────────────────────────────────────────────────

  async function startRecording() {
    try {
      const status = await ensureMicrophonePermission();
      if (status !== "granted") {
        showMicrophonePermissionAlert(status);
        return;
      }

      await prepareAudioForRecording();

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(newRecording);
      setIsRecording(true);
    } catch (err) {
      logger.error("Failed to start recording:", err);
      if (isRecordingPermissionError(err)) {
        showMicrophonePermissionAlert("blocked");
      } else {
        Alert.alert(
          "Couldn't start recording",
          "Another sound may still be playing. Wait a moment and try again."
        );
      }
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
        { text: referenceText, score: qualityScore, textScore, itemIndex: currentItemIndex, step: currentStep },
      ]);

      const passed = qualityScore >= PASS_THRESHOLD;
      void playPracticeFeedback(passed ? "success" : "failure");

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
    // Skip PronunciationAttempt logging for weekly challenge drills (synthetic IDs)
    if (isWeeklyChallenge) return;
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

  const handleMoveToNextItem = () => {
    const progress = itemProgress[currentItemIndex];
    if (!progress?.sentencePassed) {
      Alert.alert(
        "Sentence Step Required",
        `Please pass the sentence pronunciation (${PASS_THRESHOLD}%+) before continuing.`
      );
      return;
    }

    const total = drill?.pronunciation_items?.length || 1;
    const isLastItem = currentItemIndex >= total - 1;

    if (!isLastItem) {
      const completedCount = currentItemIndex + 1;
      void saveCheckpointAtBoundary(
        {
          wordProgress: buildWordProgressMap(itemProgress),
          sessionReviewAnalytics: [],
        },
        completedCount,
        currentItemIndex
      );
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

  const handleTryAgainWord = () => {
    setItemProgress((prev) => {
      const updated = [...prev];
      updated[currentItemIndex] = {
        ...updated[currentItemIndex],
        wordPassed: false,
        wordScore: 0,
      };
      return updated;
    });
    setAnalysisResults((prev) =>
      prev.filter((r) => !(r.itemIndex === currentItemIndex && r.step === "word"))
    );
  };

  const handleTryAgainSentence = () => {
    setItemProgress((prev) => {
      const updated = [...prev];
      updated[currentItemIndex] = {
        ...updated[currentItemIndex],
        sentencePassed: false,
        sentenceScore: 0,
      };
      return updated;
    });
    setAnalysisResults((prev) =>
      prev.filter((r) => !(r.itemIndex === currentItemIndex && r.step === "sentence"))
    );
  };

  const handlePreviousItem = () => {
    if (currentItemIndex > 0 && currentStep === "word") {
      setCurrentItemIndex((prev) => prev - 1);
      setCurrentStep("word");
    }
  };

  const resetReviewSession = useCallback(() => {
    submitPromiseRef.current = null;
    setShowReview(false);
    setCurrentItemIndex(0);
    setCurrentStep("word");
    setAnalysisResults([]);
    setIsBookmarked(false);
    startTimeRef.current = Date.now();
    setItemProgress(
      Array.from({ length: drill?.pronunciation_items?.length ?? 0 }, () => ({
        wordPassed: false,
        wordScore: 0,
        sentencePassed: false,
        sentenceScore: 0,
      }))
    );
  }, [drill?.pronunciation_items?.length]);

  const doSubmit = useCallback(async (): Promise<boolean> => {
    if (!drill) return false;

    const drillItems = drill.pronunciation_items || [];
    const totalPronItems = drillItems.length;
    const passedItems = itemProgress.filter((p) => p.wordPassed && p.sentencePassed).length;
    const score = totalPronItems > 0 ? Math.round((passedItems / totalPronItems) * 100) : 0;
    const timeSpent = Math.floor((Date.now() - startTimeRef.current) / 1000);

    const wordScores = drillItems.map((item, idx) => {
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
      return { word, score: itemScore, attempts: 1, pronunciationScore: itemScore };
    });

    try {
      if (isWeeklyChallenge && wcItemId && wcWeekStartDate) {
        await completeWeeklyChallengeItemAndRefetch(queryClient, wcItemId, {
          score,
          weekStartDate: wcWeekStartDate,
        });
      } else {
        await completeDrill(drillId, {
          drillAssignmentId: assignmentId,
          score,
          timeSpent,
          answers: [],
          pronunciationResults: { wordScores },
        });
        clearCheckpoint();
      }
      clearDrillProgress(drillId);
      void invalidateDrillCaches(queryClient);
      return true;
    } catch (error) {
      logger.error("Failed to submit pronunciation drill:", error);
      Alert.alert("Error", "Failed to submit results. Please try again.");
      return false;
    }
  }, [
    drill,
    itemProgress,
    isWeeklyChallenge,
    wcItemId,
    wcWeekStartDate,
    queryClient,
    drillId,
    assignmentId,
    clearDrillProgress,
    clearCheckpoint,
  ]);

  useEffect(() => {
    if (!showReview || submitPromiseRef.current) return;
    submitPromiseRef.current = doSubmit();
  }, [showReview, doSubmit]);

  const handleDoneForToday = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const promise =
        submitPromiseRef.current ?? (submitPromiseRef.current = doSubmit());
      const ok = await promise;
      if (!ok) {
        submitPromiseRef.current = null;
        return;
      }
      if (isWeeklyChallenge && wcWeekStartDate) {
        router.replace(
          `/practice/weekly-challenge/${encodeWeekStartDate(wcWeekStartDate)}` as never
        );
      } else {
        router.back();
      }
    } finally {
      setIsSubmitting(false);
    }
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

  // Accordion: latest Speechace result for the current item + step
  const currentWordResult =
    analysisResults
      .filter((r) => r.itemIndex === currentItemIndex && r.step === "word")
      .at(-1) ?? null;
  const currentSentenceResult =
    analysisResults
      .filter((r) => r.itemIndex === currentItemIndex && r.step === "sentence")
      .at(-1) ?? null;
  const wordAttempts = analysisResults.filter(
    (r) => r.itemIndex === currentItemIndex && r.step === "word"
  ).length;
  const sentenceAttempts = analysisResults.filter(
    (r) => r.itemIndex === currentItemIndex && r.step === "sentence"
  ).length;

  useEffect(() => {
    if (processing) return;
    const hasFeedback =
      currentStep === "word" ? !!currentWordResult : !!currentSentenceResult;
    if (!hasFeedback) return;
    const id = setTimeout(
      () => scrollRef.current?.scrollToEnd({ animated: true }),
      100
    );
    return () => clearTimeout(id);
  }, [processing, currentStep, currentWordResult, currentSentenceResult]);

  // ── Screens ──────────────────────────────────────────────────────────────

  if (showCheckpointScreen && drill) {
    return (
      <CheckpointScreen
        completedCount={checkpointCompletedCount}
        totalItems={checkpointTotalItems}
        onContinue={dismissCheckpoint}
      />
    );
  }

  if (showReview && drill) {
    const totalPronItems = drill.pronunciation_items?.length ?? 0;
    const passedCount = itemProgress.filter((p) => p.wordPassed && p.sentencePassed).length;
    const avgReviewScore =
      analysisResults.length > 0
        ? Math.round(
            analysisResults.reduce((sum, r) => sum + r.score, 0) / analysisResults.length
          )
        : 0;
    const reviewPassed =
      (totalPronItems > 0 && passedCount === totalPronItems) ||
      avgReviewScore >= PASS_THRESHOLD;

    return (
      <SpeechAnalysisReview
        analysisResults={analysisResults}
        drillType="pronunciation"
        totalItems={totalPronItems}
        passedItems={passedCount}
        itemTitles={drill.pronunciation_items?.map((i) => i.word) ?? []}
        passed={reviewPassed}
        onDone={() => { void handleDoneForToday(); }}
        submitting={isSubmitting}
        onPracticeAgain={resetReviewSession}
      />
    );
  }

  if (loading || isLoadingCheckpoint) {
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
            ref={scrollRef}
            style={tw`flex-1 px-5`}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={tw`pb-28`}
          >
            <AppText style={tw`text-xs font-semibold text-green-600 uppercase tracking-wide mb-3 mt-2`}>
              Step 1 of 2 — Pronounce the Word
            </AppText>

            <AITutorMessage message={tutorMessage} showAudio={true} />

            {/* Large word display */}
            <View style={tw`items-center my-8 relative`}>
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

            {/* Inline performance accordion */}
            {currentWordResult && !processing && (
              <DrillLineReviewAccordion
                key={`${currentItemIndex}-word-${wordAttempts}`}
                step="word"
                text={currentWordResult.text}
                score={currentWordResult.score}
                textScore={currentWordResult.textScore}
                passThreshold={PASS_THRESHOLD}
                attempts={wordAttempts}
              />
            )}

            {/* Continue + Try Again in scroll (below feedback) */}
            {currentProgress.wordPassed && (
              <TouchableOpacity
                onPress={handleMoveToSentence}
                style={tw`w-full bg-green-700 rounded-full py-4 items-center mb-3`}
                activeOpacity={0.8}
              >
                <AppText style={tw`text-white text-base font-semibold`}>
                  Next
                </AppText>
              </TouchableOpacity>
            )}

            {(currentProgress.wordScore > 0 || currentProgress.wordPassed) && (
              <TouchableOpacity
                onPress={handleTryAgainWord}
                style={tw`w-full border border-gray-300 rounded-full py-3 items-center`}
                activeOpacity={0.7}
              >
                <AppText style={tw`text-gray-600 text-sm font-semibold`}>Try Again</AppText>
              </TouchableOpacity>
            )}
          </ScrollView>

          {/* Bottom bar — mic only */}
          <View style={tw`px-5 pb-6`}>
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

              <View style={tw`w-12 h-12`} />
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
          ref={scrollRef}
          style={tw`flex-1 px-5`}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={tw`pb-28`}
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

          {/* Inline performance accordion */}
          {currentSentenceResult && !processing && (
            <DrillLineReviewAccordion
              key={`${currentItemIndex}-sentence-${sentenceAttempts}`}
              step="sentence"
              text={currentSentenceResult.text}
              score={currentSentenceResult.score}
              textScore={currentSentenceResult.textScore}
              passThreshold={PASS_THRESHOLD}
              attempts={sentenceAttempts}
            />
          )}

          {currentProgress.sentencePassed && (
            <TouchableOpacity
              onPress={handleMoveToNextItem}
              style={tw`w-full bg-green-700 rounded-full py-4 items-center mb-3`}
              activeOpacity={0.8}
            >
              <AppText style={tw`text-white text-base font-semibold`}>
                {currentItemIndex >= totalItems - 1 ? "Review" : "Next Word"}
              </AppText>
            </TouchableOpacity>
          )}

          {/* Try Again in scroll (below feedback) */}
          {(currentProgress.sentenceScore > 0 || currentProgress.sentencePassed) && (
            <TouchableOpacity
              onPress={handleTryAgainSentence}
              style={tw`w-full border border-gray-300 rounded-full py-3 items-center`}
              activeOpacity={0.7}
            >
              <AppText style={tw`text-gray-600 text-sm font-semibold`}>Try Again</AppText>
            </TouchableOpacity>
          )}
        </ScrollView>

        {/* Bottom bar — mic only */}
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
