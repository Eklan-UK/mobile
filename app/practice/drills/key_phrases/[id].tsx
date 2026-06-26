import AudioButton from "@/components/drills/AudioButton";
import CheckpointScreen from "@/components/drills/CheckpointScreen";
import DrillHeader from "@/components/drills/DrillHeader";
import DrillLineReviewAccordion from "@/components/drills/DrillLineReviewAccordion";
import RecordButton from "@/components/drills/RecordButton";
import type { AnalysisResult } from "@/components/drills/SpeechAnalysisReview";
import SpeechAnalysisReview from "@/components/drills/SpeechAnalysisReview";
import { AppText, Loader } from "@/components/ui";
import { useDrillCheckpoint } from "@/hooks/useDrillCheckpoint";
import { invalidateDrillCaches } from "@/hooks/useDrills";
import { completeWeeklyChallengeItemAndRefetch } from "@/hooks/useWeeklyChallenge";
import { playPracticeFeedback } from "@/lib/practice-feedback";
import tw from "@/lib/tw";
import {
    completeDrill,
    DrillNotFoundError,
    getDrillById,
    getMyDrills,
} from "@/services/drill.service";
import {
    extractQualityScore,
    extractTextScore,
    speechaceService,
} from "@/services/speechace.service";
import { useActivityStore } from "@/store/activity-store";
import type { Drill, KeyPhraseItem, PerformanceReviewAnalyticsRow } from "@/types/drill.types";
import { DrillCheckpointType } from "@/types/drill-checkpoint.types";
import { Alert } from "@/utils/alert";
import { setAudioModeSafely } from "@/utils/audio";
import { decodeWeekStartDate, encodeWeekStartDate } from "@/utils/challengeDrillAdapter";
import { resolveDrillIdsFromListing } from "@/utils/drillAssignment";
import { drillForUi } from "@/utils/drillPracticeType";
import {
    buildKeyPhrasesResults,
    buildPerformanceReviewSnapshot,
    KEY_PHRASES_PASS_THRESHOLD,
    textScoreToRecord,
    type KeyPhraseItemResult,
} from "@/utils/keyPhrasesCompletion";
import { logger } from "@/utils/logger";
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

const PASS_THRESHOLD = KEY_PHRASES_PASS_THRESHOLD;
const MAX_RECORDING_SECONDS = 120;

function optionLabel(index: number): string {
  return String.fromCharCode(65 + index);
}

function previewPrompt(prompt: string, maxLen = 40): string {
  const t = prompt.trim();
  if (t.length <= maxLen) return t;
  return `${t.slice(0, maxLen)}…`;
}

function buildItemResultsMap(
  results: Array<KeyPhraseItemResult | undefined>
): Record<string, KeyPhraseItemResult> {
  const map: Record<string, KeyPhraseItemResult> = {};
  results.forEach((entry, index) => {
    if (entry) {
      map[String(index)] = entry;
    }
  });
  return map;
}

async function resolveDrillAndAssignmentIds(
  routeId: string,
  assignmentId?: string
): Promise<{ drillId: string; assignmentId?: string }> {
  if (assignmentId) {
    return { drillId: routeId, assignmentId };
  }
  try {
    const { drills } = await getMyDrills({ limit: 200 });
    return resolveDrillIdsFromListing(routeId, drills, assignmentId);
  } catch (e) {
    logger.warn("Failed to resolve drill ids from my-drills", e);
    return { drillId: routeId, assignmentId: undefined };
  }
}

export default function KeyPhrasesDrillScreen() {
  const params = useLocalSearchParams();
  const drillId = params.id as string;
  const paramAssignmentId = params.assignmentId as string | undefined;
  const isRedo = params.redo === "true";

  // Weekly challenge mode params
  const wcSource = params.source as string | undefined;
  const isWeeklyChallenge = wcSource === "weekly_challenge";
  const wcItemId = params.wcItemId as string | undefined;
  const wcWeekStartDateRaw = params.weekStartDate as string | undefined;
  const wcWeekStartDate = wcWeekStartDateRaw
    ? decodeWeekStartDate(wcWeekStartDateRaw)
    : undefined;

  const queryClient = useQueryClient();
  const { updateDrillProgress, addRecentActivity, clearDrillProgress } = useActivityStore();
  const startTimeRef = useRef(Date.now());
  const scrollRef = useRef<ScrollView>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [drill, setDrill] = useState<Drill | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [resolvedAssignmentId, setResolvedAssignmentId] = useState<string | undefined>(
    paramAssignmentId
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [itemResults, setItemResults] = useState<
    Array<KeyPhraseItemResult | undefined>
  >([]);
  const [questionAttempts, setQuestionAttempts] = useState(0);
  const [sessionReviewAnalytics, setSessionReviewAnalytics] = useState<
    PerformanceReviewAnalyticsRow[]
  >([]);
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult[]>([]);

  const [isRecording, setIsRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [permissionResponse, requestPermission] = Audio.usePermissions();
  const [hasScoredCurrent, setHasScoredCurrent] = useState(false);

  const [showReview, setShowReview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitPromiseRef = useRef<Promise<boolean> | null>(null);

  const items = drill?.key_phrase_items ?? [];
  const currentItem: KeyPhraseItem | undefined = items[currentIndex];
  const currentResult = itemResults[currentIndex];
  const totalItems = items.length;

  const initFreshState = useCallback(() => {
    setCurrentIndex(0);
    setSelectedOption(null);
    setItemResults([]);
    setQuestionAttempts(0);
    setSessionReviewAnalytics([]);
    setAnalysisResults([]);
    setHasScoredCurrent(false);
  }, []);

  const hydrateFromCheckpoint = useCallback(
    (checkpoint: {
      resumeFromIndex: number;
      partialResults: {
        itemResults: Record<string, KeyPhraseItemResult>;
        sessionReviewAnalytics: PerformanceReviewAnalyticsRow[];
      };
    }) => {
      const count = items.length;
      const restored: Array<KeyPhraseItemResult | undefined> = Array.from(
        { length: count },
        () => undefined
      );
      for (const [key, value] of Object.entries(
        checkpoint.partialResults.itemResults ?? {}
      )) {
        const index = Number(key);
        if (index >= 0 && index < count) {
          restored[index] = value;
        }
      }
      setItemResults(restored);
      setSessionReviewAnalytics(
        checkpoint.partialResults.sessionReviewAnalytics ?? []
      );
      setCurrentIndex(
        Math.min(Math.max(checkpoint.resumeFromIndex, 0), Math.max(count - 1, 0))
      );
      setSelectedOption(null);
      setQuestionAttempts(0);
      setHasScoredCurrent(false);
      setAnalysisResults([]);
    },
    [items.length]
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
    assignmentId: resolvedAssignmentId,
    drillType: DrillCheckpointType.key_phrases,
    isRedo,
    isWeeklyChallenge,
    isDrillReady: !!drill && totalItems > 0,
    totalItems,
    onHydrate: hydrateFromCheckpoint,
    onFreshStart: initFreshState,
  });

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setLoadError(null);

        // WC mode: load pre-adapted drill from cache
        if (isWeeklyChallenge) {
          const cached = getCachedWCDrill(drillId);
          if (cached) {
            if (mounted) {
              setDrill(drillForUi(cached));
            }
            return;
          }
          logger.warn("[KeyPhrasesDrill] WC drill not in cache:", drillId);
          router.back();
          return;
        }

        const { drillId: resolvedDrillId, assignmentId: aid } =
          await resolveDrillAndAssignmentIds(drillId, paramAssignmentId);
        if (mounted) setResolvedAssignmentId(aid);
        const data = await getDrillById(resolvedDrillId, aid);
        if (!mounted) return;
        const uiDrill = drillForUi(data);
        setDrill(uiDrill);
      } catch (e) {
        logger.error("Failed to load key phrases drill:", e);
        if (mounted) {
          setDrill(null);
          setLoadError(
            e instanceof DrillNotFoundError
              ? "This drill could not be found. Open it from My Plan and try again."
              : "Unable to load this drill. Check your connection and try again."
          );
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
      if (recordingTimerRef.current) clearTimeout(recordingTimerRef.current);
    };
  }, [drillId, paramAssignmentId]);

  useEffect(() => {
    if (!drill) return;
    updateDrillProgress({
      drillId,
      title: drill.title,
      type: "key_phrases",
      currentStep: currentIndex + 1,
      totalSteps: totalItems || 1,
      answers: [],
      data: { currentIndex, selectedOption, itemResults },
      startTime: startTimeRef.current,
      lastUpdated: Date.now(),
    });
  }, [currentIndex, selectedOption, itemResults, drill, drillId, totalItems]);

  const clearRecordingTimer = () => {
    if (recordingTimerRef.current) {
      clearTimeout(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  };

  async function startRecording() {
    if (!selectedOption) {
      Alert.alert("Select a response", "Choose an option before recording.");
      return;
    }
    try {
      if (permissionResponse?.status !== "granted") {
        await requestPermission();
      }
      await setAudioModeSafely({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const { recording: rec } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(rec);
      setIsRecording(true);
      clearRecordingTimer();
      recordingTimerRef.current = setTimeout(() => {
        Alert.alert("Time limit", "2 minute limit reached");
        stopRecording();
      }, MAX_RECORDING_SECONDS * 1000);
    } catch (err) {
      logger.error("Failed to start recording:", err);
      Alert.alert("Error", "Failed to start recording. Check microphone permissions.");
    }
  }

  async function stopRecording() {
    clearRecordingTimer();
    if (!recording) {
      setIsRecording(false);
      setProcessing(false);
      return;
    }
    const rec = recording;
    setRecording(null);
    setIsRecording(false);
    setProcessing(true);
    try {
      await rec.stopAndUnloadAsync();
      const uri = rec.getURI();
      if (uri) {
        const base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: (FileSystem as any).EncodingType?.Base64 || "base64",
        });
        await analyzeRecording(base64);
      }
    } catch (error: unknown) {
      logger.error("Error stopping recording:", error);
      Alert.alert("Error", "Failed to process audio. Please try again.");
    } finally {
      setProcessing(false);
    }
  }

  const analyzeRecording = async (base64: string) => {
    if (!currentItem || !selectedOption) return;

    try {
      const result = await speechaceService.scorePronunciation(selectedOption, base64);

      if (result.status === "error" && result.short_message === "error_no_speech") {
        Alert.alert(
          "No Speech Detected",
          "We couldn't detect any speech. Please try again and speak clearly."
        );
        return;
      }

      const textScore = extractTextScore(result);
      const pronunciation = extractQualityScore(result);
      const isCorrect = selectedOption === currentItem.correctAnswer;
      const itemScore = isCorrect ? pronunciation : 0;
      const passed = isCorrect && pronunciation >= PASS_THRESHOLD;
      const attempts = questionAttempts + 1;

      setQuestionAttempts(attempts);
      setHasScoredCurrent(true);

      const row: PerformanceReviewAnalyticsRow = {
        sceneIndex: currentIndex,
        turnIndex: 0,
        text: selectedOption,
        score: itemScore,
        textScore: textScoreToRecord(textScore) ?? null,
        attempts,
      };

      setSessionReviewAnalytics((prev) => {
        const next = prev.filter(
          (r) => !(r.sceneIndex === currentIndex && r.turnIndex === 0)
        );
        return [...next, row];
      });

      setAnalysisResults((prev) => [
        ...prev.filter((r) => r.itemIndex !== currentIndex),
        {
          text: selectedOption,
          score: itemScore,
          textScore,
          itemIndex: currentIndex,
        },
      ]);

      const resultEntry: KeyPhraseItemResult = {
        prompt: currentItem.prompt,
        selectedAnswer: selectedOption,
        correctAnswer: currentItem.correctAnswer,
        isCorrect,
        pronunciationScore: itemScore,
        textScore: textScoreToRecord(textScore),
        attempts,
      };
      setItemResults((prev) => {
        const next = [...prev];
        next[currentIndex] = resultEntry;
        return next;
      });

      void playPracticeFeedback(passed ? "success" : "failure");

      if (!isCorrect) {
        Alert.alert(
          "Incorrect",
          `The correct answer is: "${currentItem.correctAnswer}"`
        );
      } else if (passed) {
        Alert.alert("Great job!", `Pronunciation score: ${Math.round(pronunciation)}%`);
      } else {
        Alert.alert(
          "Keep trying",
          `Score: ${Math.round(pronunciation)}%. You need ${PASS_THRESHOLD}%+ to continue.`
        );
      }
    } catch (error) {
      logger.error("Speechace analysis failed:", error);
      Alert.alert("Error", "Failed to analyze pronunciation. Please try again.");
    }
  };

  const handleSelectOption = (option: string) => {
    if (hasScoredCurrent) return;
    setSelectedOption(option);
    setHasScoredCurrent(false);
  };

  const handleTryAgain = () => {
    const wasWrong = currentResult && !currentResult.isCorrect;
    setHasScoredCurrent(false);
    setQuestionAttempts(0);
    setItemResults((prev) => {
      const next = [...prev];
      next[currentIndex] = undefined;
      return next;
    });
    setSessionReviewAnalytics((prev) =>
      prev.filter((r) => !(r.sceneIndex === currentIndex && r.turnIndex === 0))
    );
    setAnalysisResults((prev) => prev.filter((r) => r.itemIndex !== currentIndex));
    if (wasWrong) {
      setSelectedOption(null);
    }
  };

  const canAdvance =
    !!currentResult?.isCorrect &&
    (currentResult.pronunciationScore ?? 0) >= PASS_THRESHOLD;

  const handleNext = () => {
    if (!canAdvance) return;
    const completedCount = currentIndex + 1;
    const isLast = currentIndex >= totalItems - 1;
    if (!isLast) {
      void saveCheckpointAtBoundary(
        {
          itemResults: buildItemResultsMap(itemResults),
          sessionReviewAnalytics,
        },
        completedCount,
        currentIndex
      );
    }
    setSelectedOption(null);
    setHasScoredCurrent(false);
    setQuestionAttempts(0);
    if (isLast) {
      setShowReview(true);
    } else {
      setCurrentIndex((i) => i + 1);
    }
  };

  const handlePracticeAgain = () => {
    submitPromiseRef.current = null;
    setShowReview(false);
    setCurrentIndex(0);
    setSelectedOption(null);
    setItemResults([]);
    setQuestionAttempts(0);
    setSessionReviewAnalytics([]);
    setAnalysisResults([]);
    setHasScoredCurrent(false);
    startTimeRef.current = Date.now();
  };

  const doSubmit = useCallback(async (): Promise<boolean> => {
    if (!drill || totalItems === 0) return false;

    try {
      const filledResults: KeyPhraseItemResult[] = items.map((item, idx) => {
        const r = itemResults[idx];
        return (
          r ?? {
            prompt: item.prompt,
            selectedAnswer: "",
            correctAnswer: item.correctAnswer,
            isCorrect: false,
            pronunciationScore: 0,
            attempts: 0,
          }
        );
      });
      const keyPhrasesResults = buildKeyPhrasesResults(items, filledResults);
      const timeSpent = Math.floor((Date.now() - startTimeRef.current) / 1000);

      if (isWeeklyChallenge && wcItemId && wcWeekStartDate) {
        await completeWeeklyChallengeItemAndRefetch(queryClient, wcItemId, {
          score: keyPhrasesResults.score,
          weekStartDate: wcWeekStartDate,
        });
      } else {
        const assignmentId = resolvedAssignmentId;
        if (!assignmentId) {
          Alert.alert(
            "Cannot submit",
            "Assignment ID is missing. Open this drill from My Plan and try again."
          );
          return false;
        }

        const performanceReviewSnapshot = buildPerformanceReviewSnapshot({
          analytics: sessionReviewAnalytics,
          items,
          itemResults: filledResults,
        });

        await completeDrill(drill._id, {
          drillAssignmentId: assignmentId,
          score: keyPhrasesResults.score,
          timeSpent,
          platform: Platform.OS === "ios" ? "ios" : "android",
          keyPhrasesResults,
          performanceReviewSnapshot,
        });
        clearCheckpoint();
      }

      clearDrillProgress(drillId);
      void invalidateDrillCaches(queryClient);

      addRecentActivity({
        id: drill._id,
        title: drill.title,
        type: drill.type,
        durationSeconds: timeSpent,
        score: keyPhrasesResults.score,
      });

      return true;
    } catch (error) {
      logger.error("Failed to submit key phrases drill:", error);
      Alert.alert("Error", "Failed to submit results. Please try again.");
      return false;
    }
  }, [
    drill,
    totalItems,
    items,
    itemResults,
    isWeeklyChallenge,
    wcItemId,
    wcWeekStartDate,
    queryClient,
    resolvedAssignmentId,
    sessionReviewAnalytics,
    drillId,
    clearDrillProgress,
    clearCheckpoint,
    addRecentActivity,
  ]);

  // Start submission while the user reads their feedback
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

  const handleRecord = () => {
    if (processing) return;
    if (isRecording) stopRecording();
    else startRecording();
  };

  const latestAnalysis = analysisResults.find((r) => r.itemIndex === currentIndex);
  const correctItems = itemResults.filter((r) => r?.isCorrect).length;
  const scored = hasScoredCurrent && currentResult != null;

  useEffect(() => {
    if (processing) return;
    if (!scored || !latestAnalysis?.textScore) return;
    const id = setTimeout(
      () => scrollRef.current?.scrollToEnd({ animated: true }),
      100
    );
    return () => clearTimeout(id);
  }, [processing, scored, latestAnalysis, currentIndex]);

  if (showCheckpointScreen && drill) {
    return (
      <CheckpointScreen
        completedCount={checkpointCompletedCount}
        totalItems={totalItems}
        onContinue={dismissCheckpoint}
      />
    );
  }

  if (showReview && drill) {
    const avgReviewScore =
      analysisResults.length > 0
        ? Math.round(
            analysisResults.reduce((sum, r) => sum + r.score, 0) / analysisResults.length
          )
        : 0;
    const reviewPassed =
      (totalItems > 0 && correctItems === totalItems) || avgReviewScore >= PASS_THRESHOLD;

    return (
      <SpeechAnalysisReview
        analysisResults={analysisResults}
        drillType="key_phrases"
        totalItems={totalItems}
        passedItems={correctItems}
        itemTitles={items.map((item) => previewPrompt(item.prompt))}
        statsLine={`${correctItems} of ${totalItems} correct · ${sessionReviewAnalytics.length} scored attempts`}
        passed={reviewPassed}
        onDone={() => { void handleDoneForToday(); }}
        submitting={isSubmitting}
        onPracticeAgain={handlePracticeAgain}
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
      <SafeAreaView style={tw`flex-1 bg-white items-center justify-center px-5`}>
        <AppText style={tw`text-gray-600 text-center`}>
          {loadError ?? "Drill not found"}
        </AppText>
        <TouchableOpacity onPress={() => router.back()} style={tw`mt-4`}>
          <AppText style={tw`text-primary-500 font-semibold`}>Go back</AppText>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (totalItems === 0) {
    return (
      <SafeAreaView style={tw`flex-1 bg-white items-center justify-center px-5`}>
        <AppText style={tw`text-gray-600 text-center`}>
          No key phrase items found for this drill.
        </AppText>
        <TouchableOpacity onPress={() => router.back()} style={tw`mt-4`}>
          <AppText style={tw`text-primary-500 font-semibold`}>Go back</AppText>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (!currentItem) {
    return null;
  }

  const speakerLabel =
    currentItem.respondentName?.trim() || "Speaker";

  return (
    <SafeAreaView style={tw`flex-1 bg-white`} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={tw`flex-1`}
      >
        <DrillHeader
          title={drill.title}
          currentStep={currentIndex + 1}
          totalSteps={totalItems}
          onBack={() => router.back()}
        />

        <ScrollView
          ref={scrollRef}
          style={tw`flex-1`}
          contentContainerStyle={tw`px-5 pb-8`}
          keyboardShouldPersistTaps="handled"
        >
          <AppText style={tw`text-sm text-gray-500 mb-2`}>
            Question {currentIndex + 1} of {totalItems}
          </AppText>

          <View style={tw`bg-gray-50 rounded-2xl p-4 mb-4 border border-gray-100`}>
            <AppText style={tw`text-xs font-semibold text-gray-500 uppercase mb-1`}>
              {speakerLabel} says
            </AppText>
            <AppText style={tw`text-base text-gray-900 mb-3`}>{currentItem.prompt}</AppText>
            <AudioButton
              text={currentItem.prompt}
              audioUri={currentItem.promptAudioUrl}
            />
          </View>

          <AppText style={tw`text-sm font-semibold text-gray-800 mb-2`}>
            Your response
          </AppText>

          {currentItem.options.map((option, idx) => {
            const isSelected = selectedOption === option;
            const isCorrectOption = option === currentItem.correctAnswer;
            let cardStyle = "border-gray-200 bg-white";
            if (scored) {
              if (isCorrectOption) cardStyle = "border-green-500 bg-green-50";
              else if (isSelected) cardStyle = "border-red-400 bg-red-50";
              else cardStyle = "border-gray-100 bg-gray-50 opacity-60";
            } else if (isSelected) {
              cardStyle = "border-primary-500 bg-primary-50";
            }

            return (
              <TouchableOpacity
                key={`${idx}-${option}`}
                onPress={() => handleSelectOption(option)}
                disabled={scored}
                activeOpacity={0.7}
                style={tw`flex-row items-center border rounded-xl px-4 py-4 mb-2 min-h-[60px] ${cardStyle}`}
              >
                <View
                  style={tw`w-8 h-8 rounded-full bg-gray-100 items-center justify-center mr-3`}
                >
                  <AppText style={tw`text-sm font-bold text-gray-700`}>
                    {optionLabel(idx)}
                  </AppText>
                </View>
                <AppText style={tw`flex-1 text-base text-gray-900`}>{option}</AppText>
              </TouchableOpacity>
            );
          })}

          {selectedOption ? (
            <View style={tw`mt-4 mb-2`}>
              <AppText style={tw`text-sm text-gray-600 mb-1`}>
                Read your chosen response aloud:
              </AppText>
              <AppText style={tw`text-base font-medium text-gray-900`}>
                &ldquo;{selectedOption}&rdquo;
              </AppText>
            </View>
          ) : null}

          <View style={tw`items-center my-4`}>
            {processing ? (
              <ActivityIndicator size="large" color="#22C55E" />
            ) : (
              <RecordButton
                isRecording={isRecording}
                onPress={handleRecord}
              />
            )}
          </View>

          {scored && latestAnalysis?.textScore ? (
            <DrillLineReviewAccordion
              step="sentence"
              text={selectedOption ?? ""}
              score={currentResult?.pronunciationScore ?? 0}
              textScore={latestAnalysis.textScore}
              attempts={currentResult?.attempts ?? 1}
              passThreshold={PASS_THRESHOLD}
            />
          ) : null}

          {scored ? (
            <View style={tw`gap-3 mt-4`}>
              {!canAdvance ? (
                <TouchableOpacity
                  onPress={handleTryAgain}
                  style={tw`bg-gray-100 rounded-full py-4 items-center`}
                  activeOpacity={0.8}
                >
                  <AppText style={tw`text-gray-800 font-semibold`}>Try again</AppText>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={handleNext}
                  style={tw`bg-primary-500 rounded-full py-4 items-center`}
                  activeOpacity={0.8}
                >
                  <AppText style={tw`text-white font-semibold`}>
                    {currentIndex >= totalItems - 1 ? "Review" : "Next Question"}
                  </AppText>
                </TouchableOpacity>
              )}
            </View>
          ) : null}

          {isSubmitting ? (
            <View style={tw`items-center mt-4`}>
              <ActivityIndicator color="#22C55E" />
              <AppText style={tw`text-gray-500 mt-2`}>Submitting…</AppText>
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
