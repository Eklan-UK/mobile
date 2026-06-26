import AITutorMessage from "@/components/drills/AITutorMessage";
import CheckpointScreen from "@/components/drills/CheckpointScreen";
import DrillCompletedScreen from "@/components/drills/DrillCompletedScreen";
import DrillHeader from "@/components/drills/DrillHeader";
import { AppText, Loader } from "@/components/ui";
import { invalidateDrillCaches } from "@/hooks/useDrills";
import { useDrillCheckpoint } from "@/hooks/useDrillCheckpoint";
import { useDrillScoreCelebration } from "@/hooks/useDrillScoreCelebration";
import { completeWeeklyChallengeItemAndRefetch } from "@/hooks/useWeeklyChallenge";
import {
  registerDrillConfettiTrigger,
  unregisterDrillConfettiTrigger,
  unloadDrillCelebrationSound,
} from "@/lib/drill-celebration";
import tw from "@/lib/tw";
import { completeDrill, getDrillById } from "@/services/drill.service";
import { useActivityStore } from "@/store/activity-store";
import { Drill } from "@/types/drill.types";
import { DrillCheckpointType } from "@/types/drill-checkpoint.types";
import { decodeWeekStartDate, encodeWeekStartDate } from "@/utils/challengeDrillAdapter";
import { logger } from "@/utils/logger";
import { getCachedWCDrill } from "@/utils/weeklyChallengeDrillCache";
import { useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Dimensions, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity, View } from "react-native";
import ConfettiCannon from "react-native-confetti-cannon";
import { SafeAreaView } from "react-native-safe-area-context";

interface BlankAnswer {
  position: number;
  selectedAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
}

function countSubmittedFillBlankItems(
  items: NonNullable<Drill['fill_blank_items']>,
  answerMap: Record<number, Record<number, string>>
): number {
  return items.filter((item, itemIndex) => {
    const itemAnswers = answerMap[itemIndex] || {};
    return item.blanks?.every(
      (_, blankIndex) => (itemAnswers[blankIndex] ?? '').trim() !== ''
    );
  }).length;
}

function computeFillBlankScore(
  items: NonNullable<Drill['fill_blank_items']>,
  answerMap: Record<number, Record<number, string>>
): { totalBlanks: number; correctBlanks: number; score: number } {
  const totalBlanks = items.reduce((sum, item) => sum + (item.blanks?.length || 0), 0);
  const correctBlanks = items.reduce((sum, item, itemIndex) => {
    const itemAnswers = answerMap[itemIndex] || {};
    return (
      sum +
      (item.blanks?.filter((blank, blankIndex) =>
        itemAnswers[blankIndex] === blank.correctAnswer
      ).length || 0)
    );
  }, 0);
  const score = totalBlanks > 0 ? Math.round((correctBlanks / totalBlanks) * 100) : 0;
  return { totalBlanks, correctBlanks, score };
}

function buildFillBlankResults(
  items: NonNullable<Drill['fill_blank_items']>,
  answerMap: Record<number, Record<number, string>>
) {
  return {
    items: items.map((item, itemIndex) => {
      const itemAnswers = answerMap[itemIndex] || {};
      return {
        sentence: item.sentence,
        blanks: item.blanks.map((blank, blankIndex) => {
          const selectedAnswer = itemAnswers[blankIndex] || "";
          return {
            position: blank.position,
            selectedAnswer,
            correctAnswer: blank.correctAnswer,
            isCorrect: selectedAnswer === blank.correctAnswer,
          };
        }),
      };
    }),
  };
}

const { width: FILL_BLANK_SCREEN_WIDTH, height: FILL_BLANK_SCREEN_HEIGHT } =
  Dimensions.get("window");

const FILL_BLANK_CONFETTI_COLORS = [
  "#3B883E",
  "#D1FAE5",
  "#86EFAC",
  "#4ADE80",
  "#22C55E",
  "#166534",
];

function FillBlankResultsView({
  passed,
  correctBlanks,
  totalBlanks,
  isWeeklyChallenge,
  onContinue,
}: {
  passed: boolean;
  correctBlanks: number;
  totalBlanks: number;
  isWeeklyChallenge: boolean;
  onContinue: () => void;
}) {
  const confettiRef = useRef<ConfettiCannon>(null);

  useEffect(() => {
    registerDrillConfettiTrigger(() => confettiRef.current?.start());
    return () => {
      unregisterDrillConfettiTrigger();
      void unloadDrillCelebrationSound();
    };
  }, []);

  useDrillScoreCelebration(passed);

  return (
    <>
      {passed ? (
        <ConfettiCannon
          ref={confettiRef}
          count={150}
          origin={{
            x: FILL_BLANK_SCREEN_WIDTH / 2,
            y: FILL_BLANK_SCREEN_HEIGHT * 0.55,
          }}
          autoStart={false}
          fadeOut
          fallSpeed={3000}
          explosionSpeed={350}
          colors={FILL_BLANK_CONFETTI_COLORS}
        />
      ) : null}
      <DrillCompletedScreen
        variant="progress"
        completed={correctBlanks}
        total={totalBlanks}
        passed={passed}
        celebrate={false}
        title={passed ? "You passed!" : "Keep practicing"}
        message={
          passed
            ? `Great job! You answered all ${totalBlanks} blanks correctly.`
            : `You answered ${correctBlanks} out of ${totalBlanks} blanks correctly.`
        }
        buttonLabel={isWeeklyChallenge ? "Back to Challenge" : "Continue"}
        onContinue={onContinue}
        onClose={onContinue}
      />
    </>
  );
}

export default function FillBlankDrill() {
  const params = useLocalSearchParams();
  const drillId = params.id as string;
  const assignmentId = params.assignmentId as string | undefined;
  const isRedo = params.redo === "true";

  // Weekly challenge mode params
  const wcSource = params.source as string | undefined;
  const isWeeklyChallenge = wcSource === "weekly_challenge";
  const wcChallengeId = params.challengeId as string | undefined;
  const wcItemIndex = params.challengeItemIndex
    ? parseInt(params.challengeItemIndex as string, 10)
    : undefined;
  const wcItemId = params.wcItemId as string | undefined;
  const wcWeekStartDate = params.weekStartDate
    ? decodeWeekStartDate(params.weekStartDate as string)
    : undefined;

  const { drillProgress, updateDrillProgress, addRecentActivity, clearDrillProgress } = useActivityStore();
  const queryClient = useQueryClient();
  const startTimeRef = useRef(Date.now());

  const [drill, setDrill] = useState<Drill | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, Record<number, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  const totalItems = drill?.fill_blank_items?.length ?? 0;

  const initFreshState = useCallback(() => {
    setCurrentIndex(0);
    setAnswers({});
  }, []);

  const hydrateFromCheckpoint = useCallback(
    (checkpoint: {
      resumeFromIndex: number;
      partialResults: {
        answers: Record<number, Record<number, string>>;
        submittedCount: number;
      };
    }) => {
      setAnswers(checkpoint.partialResults.answers ?? {});
      setCurrentIndex(checkpoint.resumeFromIndex);
    },
    []
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
    drillType: DrillCheckpointType.fill_blank,
    isRedo,
    isWeeklyChallenge,
    isDrillReady: !!drill && totalItems > 0,
    totalItems,
    onHydrate: hydrateFromCheckpoint,
    onFreshStart: initFreshState,
  });

  // Restore progress
  useEffect(() => {
    if (skipLocalRestore) return;
    if (drillId && drillProgress[drillId]) {
      const saved = drillProgress[drillId];
      if (saved.data?.currentIndex !== undefined) {
        setCurrentIndex(saved.data.currentIndex);
      }
      if (saved.data?.answers) {
        setAnswers(saved.data.answers);
      }
    }
  }, [drillId, skipLocalRestore]);

  // Track activity on unmount
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
      const items = drill.fill_blank_items || [];
      const totalBlanks = items.reduce((sum, item) => sum + (item.blanks?.length || 0), 0);
      const answeredBlanks = Object.values(answers).reduce(
        (sum, itemAnswers) => sum + Object.keys(itemAnswers).length,
        0
      );
      
      updateDrillProgress({
        drillId,
        title: drill.title,
        type: drill.type,
        currentStep: currentIndex + 1,
        totalSteps: items.length,
        answers: [],
        data: { currentIndex, answers },
        startTime: startTimeRef.current,
        lastUpdated: Date.now(),
      });
    }
  }, [currentIndex, answers, drill]);

  useEffect(() => {
    loadDrill();
  }, [drillId]);

  const loadDrill = async () => {
    try {
      setLoading(true);
      // In WC mode, load the pre-adapted drill from the module-level cache
      if (isWeeklyChallenge) {
        const cached = getCachedWCDrill(drillId);
        if (cached) {
          setDrill(cached);
          return;
        }
        // Cache miss — the adapter screen should have populated it; go back
        logger.warn('[FillBlankDrill] WC drill not in cache:', drillId);
        router.back();
        return;
      }
      const drillData = await getDrillById(drillId, assignmentId);
      setDrill(drillData);
    } catch (error) {
      logger.error('❌ Failed to load drill:', error);
    } finally {
      setLoading(false);
    }
  };

  const items = drill?.fill_blank_items || [];
  const currentItem = items[currentIndex];
  const currentAnswers = answers[currentIndex] || {};
  const allBlanksAnswered = currentItem?.blanks?.every(
    (_, blankIndex) => currentAnswers[blankIndex] && currentAnswers[blankIndex].trim() !== ""
  ) || false;
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === items.length - 1;

  const handleAnswerChange = (blankIndex: number, value: string) => {
    setAnswers({
      ...answers,
      [currentIndex]: {
        ...currentAnswers,
        [blankIndex]: value,
      },
    });
  };

  const handlePrevious = () => {
    if (!isFirst) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (!allBlanksAnswered) {
      return;
    }
    if (!isLast) {
      const completedCount = currentIndex + 1;
      void saveCheckpointAtBoundary(
        {
          answers,
          submittedCount: countSubmittedFillBlankItems(items, answers),
        },
        completedCount,
        currentIndex
      );
      setCurrentIndex(currentIndex + 1);
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if (!drill) return;
    setIsSubmitting(true);
    setIsCompleted(true);
    setIsSubmitting(false);
  };

  const handleCompleteAndContinue = async () => {
    if (!drill || isCompleting) return;

    setIsCompleting(true);
    try {
      const itemsList = drill.fill_blank_items ?? [];
      const fillBlankResults = buildFillBlankResults(itemsList, answers);
      const { totalBlanks, correctBlanks, score } = computeFillBlankScore(itemsList, answers);
      const timeSpent = Math.floor((Date.now() - startTimeRef.current) / 1000);

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
          fillBlankResults: {
            ...fillBlankResults,
            totalBlanks,
            correctBlanks,
            score,
          },
        });
        clearCheckpoint();
        await invalidateDrillCaches(queryClient);
      }

      addRecentActivity({
        id: drill._id,
        title: drill.title,
        type: drill.type,
        durationSeconds: timeSpent,
        score,
      });
      clearDrillProgress(drillId);

      if (isWeeklyChallenge && wcWeekStartDate) {
        router.replace(
          `/practice/weekly-challenge/${encodeWeekStartDate(wcWeekStartDate)}` as never
        );
      } else {
        router.back();
      }
    } catch (error: unknown) {
      logger.error('Failed to submit drill:', error);
    } finally {
      setIsCompleting(false);
    }
  };

  if (showCheckpointScreen && drill) {
    return (
      <CheckpointScreen
        completedCount={checkpointCompletedCount}
        totalItems={totalItems}
        onContinue={dismissCheckpoint}
      />
    );
  }

  // Render sentence with blanks as selectable buttons
  const renderSentence = () => {
    if (!currentItem) return null;

    const sentence = currentItem.sentence;
    const blanks = currentItem.blanks || [];
    
    // Display sentence text
    return (
      <View style={tw`mb-4`}>
        <AppText style={tw`text-base text-gray-900 leading-6 mb-4`}>
          {sentence}
        </AppText>
        
        {/* Render blanks as selectable options */}
        <View style={tw`gap-3`}>
          {blanks.map((blank, blankIndex) => {
            const selectedValue = currentAnswers[blankIndex] || "";
            const isSelected = selectedValue !== "";
            
            return (
              <View key={blankIndex} style={tw`mb-3`}>
                <AppText style={tw`text-sm font-semibold text-gray-700 mb-2`}>
                  Blank {blankIndex + 1}:
                </AppText>
                {blank.hint && (
                  <View style={tw`bg-yellow-50 border border-yellow-200 rounded-lg p-2 mb-2`}>
                    <AppText style={tw`text-xs text-yellow-700`}>
                      💡 Hint: {blank.hint}
                    </AppText>
                  </View>
                )}
                <View style={tw`flex-row flex-wrap gap-2`}>
                  {blank.options.map((option: string, optIdx: number) => {
                    const isOptionSelected = selectedValue === option;
                    return (
                      <TouchableOpacity
                        key={optIdx}
                        onPress={() => handleAnswerChange(blankIndex, option)}
                        style={[
                          tw`px-4 py-3 rounded-xl border-2`,
                          isOptionSelected
                            ? tw`bg-green-100 border-green-500`
                            : tw`bg-white border-gray-300`,
                        ]}
                        activeOpacity={0.7}
                      >
                        <AppText
                          style={[
                            tw`font-medium text-center`,
                            isOptionSelected ? tw`text-green-700` : tw`text-gray-900`,
                          ]}
                        >
                          {option}
                        </AppText>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                {isSelected && (
                  <AppText style={tw`text-xs text-green-600 mt-1`}>
                    ✓ Selected: {selectedValue}
                  </AppText>
                )}
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  if (loading || isLoadingCheckpoint) {
    return (
      <SafeAreaView style={tw`flex-1 bg-white items-center justify-center`}>
        <Loader />
      </SafeAreaView>
    );
  }

  if (!drill || items.length === 0) {
    return (
      <SafeAreaView style={tw`flex-1 bg-white items-center justify-center px-5`}>
        <AppText style={tw`text-gray-600 text-center`}>Drill not found or has no items</AppText>
      </SafeAreaView>
    );
  }

  if (isCompleted && drill) {
    const itemsList = drill.fill_blank_items ?? [];
    const { totalBlanks, correctBlanks, score } = computeFillBlankScore(itemsList, answers);
    const passed = score >= 70;

    return (
      <FillBlankResultsView
        passed={passed}
        correctBlanks={correctBlanks}
        totalBlanks={totalBlanks}
        isWeeklyChallenge={isWeeklyChallenge}
        onContinue={() => { void handleCompleteAndContinue(); }}
      />
    );
  }

  return (
    <SafeAreaView style={tw`flex-1 bg-white`} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={tw`flex-1`}
      >
        <DrillHeader
          title={drill.title}
          currentStep={currentIndex + 1}
          totalSteps={items.length}
        />

        <ScrollView
          style={tw`flex-1 px-5`}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={tw`pb-6`}
        >
          <AITutorMessage
            message={`Fill in the blanks to complete the sentence.`}
            showAudio={true}
          />

          {currentItem.translation && (
            <View style={tw`bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-4`}>
              <AppText style={tw`text-sm text-blue-700`}>
                Translation: {currentItem.translation}
              </AppText>
            </View>
          )}

          <View style={tw`bg-white border border-gray-200 rounded-2xl p-4 mb-4`}>
            <AppText style={tw`text-base font-semibold text-gray-900 mb-4`}>
              Complete the sentence:
            </AppText>
            
            {renderSentence()}
            
            {currentItem.blanks?.map((blank, blankIndex) => {
              if (blank.hint) {
                return (
                  <View key={blankIndex} style={tw`mt-2 bg-yellow-50 border border-yellow-200 rounded-lg p-2`}>
                    <AppText style={tw`text-xs text-yellow-700`}>
                      💡 Hint for blank {blankIndex + 1}: {blank.hint}
                    </AppText>
                  </View>
                );
              }
              return null;
            })}
          </View>
        </ScrollView>

        <View style={tw`px-5 pb-6 flex-row items-center justify-between`}>
          <TouchableOpacity
            onPress={handlePrevious}
            disabled={isFirst}
            style={[
              tw`px-6 py-3 rounded-full`,
              isFirst ? tw`bg-gray-100` : tw`bg-gray-200`,
            ]}
          >
            <AppText
              style={[
                tw`font-semibold`,
                isFirst ? tw`text-gray-400` : tw`text-gray-700`,
              ]}
            >
              Previous
            </AppText>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleNext}
            disabled={!allBlanksAnswered || isSubmitting}
            style={[
              tw`px-6 py-3 rounded-full`,
              allBlanksAnswered && !isSubmitting
                ? tw`bg-green-700`
                : tw`bg-gray-200`,
            ]}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <AppText
                style={[
                  tw`font-semibold`,
                  allBlanksAnswered && !isSubmitting
                    ? tw`text-white`
                    : tw`text-gray-400`,
                ]}
              >
                {isLast ? "Submit" : "Next"}
              </AppText>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

