import AITutorMessage from "@/components/drills/AITutorMessage";
import CheckpointScreen from "@/components/drills/CheckpointScreen";
import DrillCompletedScreen from "@/components/drills/DrillCompletedScreen";
import DrillHeader from "@/components/drills/DrillHeader";
import { AppText, Loader } from "@/components/ui";
import { useNotificationToast } from "@/contexts/NotificationToastContext";
import { invalidateDrillCaches } from "@/hooks/useDrills";
import { useDrillCheckpoint } from "@/hooks/useDrillCheckpoint";
import { computeMatchingScore, MATCHING_PASS_THRESHOLD } from "@/lib/drill/matching-score";
import {
  buildIncorrectPairEntry,
  buildMatchedPairKey,
  evaluateMatch,
  restoreMatchedCanonicalIndices,
  type MatchingTileItem,
} from "@/lib/drill/matching-validation";
import { playPracticeFeedback } from "@/lib/practice-feedback";
import tw from "@/lib/tw";
import {
  completeDrill,
  getDrillById,
  getMyDrills,
} from "@/services/drill.service";
import { useActivityStore } from "@/store/activity-store";
import {
  Drill,
  MatchingPair,
  type DrillCompletionEffects,
} from "@/types/drill.types";
import { DrillCheckpointType } from "@/types/drill-checkpoint.types";
import { Alert } from "@/utils/alert";
import { resolveDrillIdsFromListing } from "@/utils/drillAssignment";
import { logger } from "@/utils/logger";
import { useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const MAX_INCORRECT_PAIRS = 50;
const MAX_PAIR_MATCH_EVENTS = 100;
const INCORRECT_FLASH_MS = 1000;

function shuffleItems<T>(items: T[]): T[] {
  return [...items].sort(() => Math.random() - 0.5);
}

function buildTileItems(pairs: MatchingPair[]): {
  leftItems: MatchingTileItem[];
  rightItems: MatchingTileItem[];
} {
  const leftItems = pairs.map((pair, index) => ({
    id: index,
    text: pair.left,
    translation: pair.leftTranslation,
  }));
  const rightItems = pairs.map((pair, index) => ({
    id: index,
    text: pair.right,
    translation: pair.rightTranslation,
  }));

  return {
    leftItems: shuffleItems(leftItems),
    rightItems: shuffleItems(rightItems),
  };
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
  } catch (error) {
    logger.warn("Failed to resolve drill ids from my-drills", error);
    return { drillId: routeId, assignmentId: undefined };
  }
}

function isTileMatched(
  tileId: number,
  matchedCanonical: Set<number>
): boolean {
  return matchedCanonical.has(tileId);
}

export default function MatchingDrill() {
  const params = useLocalSearchParams();
  const drillId = params.id as string;
  const paramAssignmentId = params.assignmentId as string | undefined;
  const isRedo = params.redo === "true";

  const { addRecentActivity } = useActivityStore();
  const queryClient = useQueryClient();
  const { showToast } = useNotificationToast();
  const startTimeRef = useRef(Date.now());
  const lastMatchTimeRef = useRef(Date.now());
  const incorrectPairsRef = useRef<
    Array<{ left: string; right: string; attemptedMatch: string }>
  >([]);
  const pairMatchEventsRef = useRef<
    Array<{ durationSec: number; left: string; right: string }>
  >([]);
  const isSubmittingRef = useRef(false);

  const [drill, setDrill] = useState<Drill | null>(null);
  const [loading, setLoading] = useState(true);
  const [resolvedAssignmentId, setResolvedAssignmentId] = useState<
    string | undefined
  >(paramAssignmentId);
  const [pairs, setPairs] = useState<MatchingPair[]>([]);
  const [leftItems, setLeftItems] = useState<MatchingTileItem[]>([]);
  const [rightItems, setRightItems] = useState<MatchingTileItem[]>([]);
  const [matchedPairKeys, setMatchedPairKeys] = useState<Set<string>>(
    new Set()
  );
  const [matchedCanonical, setMatchedCanonical] = useState<Set<number>>(
    new Set()
  );
  const [selectedLeftIndex, setSelectedLeftIndex] = useState<number | null>(
    null
  );
  const [selectedRightIndex, setSelectedRightIndex] = useState<number | null>(
    null
  );
  const [incorrectAttempts, setIncorrectAttempts] = useState<Set<string>>(
    new Set()
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [completionScore, setCompletionScore] = useState(0);
  const [celebrationEffects, setCelebrationEffects] = useState<
    DrillCompletionEffects | undefined
  >();

  const totalItems = pairs.length;
  const pairsMatched = matchedCanonical.size;
  const allMatched = totalItems > 0 && pairsMatched === totalItems;

  const initShuffledColumns = useCallback((canonicalPairs: MatchingPair[]) => {
    const { leftItems: nextLeft, rightItems: nextRight } =
      buildTileItems(canonicalPairs);
    setLeftItems(nextLeft);
    setRightItems(nextRight);
  }, []);

  const initFreshState = useCallback(() => {
    setMatchedPairKeys(new Set());
    setMatchedCanonical(new Set());
    setSelectedLeftIndex(null);
    setSelectedRightIndex(null);
    setIncorrectAttempts(new Set());
    incorrectPairsRef.current = [];
    pairMatchEventsRef.current = [];
    lastMatchTimeRef.current = Date.now();
    initShuffledColumns(pairs);
  }, [initShuffledColumns, pairs]);

  const hydrateFromCheckpoint = useCallback(
    (checkpoint: {
      partialResults: { matchedPairKeys: string[] };
    }) => {
      const restoredKeys = checkpoint.partialResults.matchedPairKeys ?? [];
      const restoredKeySet = new Set(restoredKeys);
      const restoredCanonical = restoreMatchedCanonicalIndices(
        pairs,
        restoredKeys,
        leftItems,
        rightItems
      );

      setMatchedPairKeys(restoredKeySet);
      setMatchedCanonical(restoredCanonical);
      setSelectedLeftIndex(null);
      setSelectedRightIndex(null);
      setIncorrectAttempts(new Set());
      lastMatchTimeRef.current = Date.now();
    },
    [leftItems, pairs, rightItems]
  );

  const {
    isLoadingCheckpoint,
    showCheckpointScreen,
    checkpointCompletedCount,
    dismissCheckpoint,
    saveCheckpointAtBoundary,
    clearCheckpoint,
  } = useDrillCheckpoint({
    drillId,
    assignmentId: resolvedAssignmentId,
    drillType: DrillCheckpointType.matching,
    isRedo,
    isDrillReady: !!drill && totalItems > 0 && leftItems.length > 0,
    totalItems,
    onHydrate: hydrateFromCheckpoint,
    onFreshStart: initFreshState,
  });

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoading(true);
        const { drillId: resolvedDrillId, assignmentId } =
          await resolveDrillAndAssignmentIds(drillId, paramAssignmentId);
        if (mounted) {
          setResolvedAssignmentId(assignmentId);
        }

        const drillData = await getDrillById(resolvedDrillId, assignmentId);
        if (!mounted) return;

        setDrill(drillData);
        const loadedPairs = drillData.matching_pairs ?? [];
        setPairs(loadedPairs);
        initShuffledColumns(loadedPairs);
        startTimeRef.current = Date.now();
        lastMatchTimeRef.current = Date.now();
      } catch (error) {
        logger.error("Failed to load matching drill:", error);
        if (mounted) {
          setDrill(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [drillId, paramAssignmentId, initShuffledColumns]);

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
  }, [addRecentActivity, drill]);

  const recordPairMatchEvent = useCallback(
    (canonicalIndex: number) => {
      const now = Date.now();
      const durationSec = Math.max(
        0,
        Math.round(((now - lastMatchTimeRef.current) / 1000) * 100) / 100
      );
      lastMatchTimeRef.current = now;

      const pair = pairs[canonicalIndex];
      if (!pair) return;

      pairMatchEventsRef.current.push({
        durationSec,
        left: pair.left,
        right: pair.right,
      });
      if (pairMatchEventsRef.current.length > MAX_PAIR_MATCH_EVENTS) {
        pairMatchEventsRef.current = pairMatchEventsRef.current.slice(
          -MAX_PAIR_MATCH_EVENTS
        );
      }
    },
    [pairs]
  );

  const checkMatch = useCallback(
    (leftVisualIndex: number, rightVisualIndex: number) => {
      const leftItem = leftItems[leftVisualIndex];
      const rightItem = rightItems[rightVisualIndex];
      if (!leftItem || !rightItem) return;

      const attemptKey = `${leftVisualIndex}-${rightVisualIndex}`;
      const { correct, canonicalIndex } = evaluateMatch(
        pairs,
        leftItem,
        rightItem,
        matchedCanonical
      );

      if (correct) {
        void playPracticeFeedback("success");

        const pairKey = buildMatchedPairKey(leftItem.id, rightItem.id);
        const nextMatchedKeys = new Set([...matchedPairKeys, pairKey]);
        const nextMatchedCanonical = new Set([...matchedCanonical, canonicalIndex]);

        setMatchedPairKeys(nextMatchedKeys);
        setMatchedCanonical(nextMatchedCanonical);
        setSelectedLeftIndex(null);
        setSelectedRightIndex(null);

        recordPairMatchEvent(canonicalIndex);

        const newCount = nextMatchedCanonical.size;
        const isLastPair = newCount === pairs.length;

        if (isLastPair) {
          showToast({
            title: "All pairs matched! Press Submit to finish.",
            body: "",
          });
        } else {
          showToast({
            title: "Correct match! ✓",
            body: "",
          });
          if (newCount < pairs.length) {
            void saveCheckpointAtBoundary(
              { matchedPairKeys: Array.from(nextMatchedKeys) },
              newCount,
              newCount - 1
            );
          }
        }
        return;
      }

      void playPracticeFeedback("failure");

      const incorrectEntry = buildIncorrectPairEntry(pairs, leftItem, rightItem);
      incorrectPairsRef.current.push(incorrectEntry);
      if (incorrectPairsRef.current.length > MAX_INCORRECT_PAIRS) {
        incorrectPairsRef.current = incorrectPairsRef.current.slice(
          -MAX_INCORRECT_PAIRS
        );
      }

      setIncorrectAttempts((prev) => new Set([...prev, attemptKey]));
      setTimeout(() => {
        setIncorrectAttempts((prev) => {
          const next = new Set(prev);
          next.delete(attemptKey);
          return next;
        });
      }, INCORRECT_FLASH_MS);

      setSelectedLeftIndex(null);
      setSelectedRightIndex(null);

      showToast({
        title: "Incorrect match. Try again!",
        body: "",
      });
    },
    [
      leftItems,
      matchedCanonical,
      matchedPairKeys,
      pairs,
      recordPairMatchEvent,
      rightItems,
      saveCheckpointAtBoundary,
      showToast,
    ]
  );

  const handleLeftSelect = useCallback(
    (visualIndex: number) => {
      const leftItem = leftItems[visualIndex];
      if (!leftItem || isTileMatched(leftItem.id, matchedCanonical)) return;

      if (selectedLeftIndex === visualIndex) {
        setSelectedLeftIndex(null);
        return;
      }

      setSelectedLeftIndex(visualIndex);

      if (selectedRightIndex !== null) {
        checkMatch(visualIndex, selectedRightIndex);
      }
    },
    [
      checkMatch,
      leftItems,
      matchedCanonical,
      selectedLeftIndex,
      selectedRightIndex,
    ]
  );

  const handleRightSelect = useCallback(
    (visualIndex: number) => {
      const rightItem = rightItems[visualIndex];
      if (!rightItem || isTileMatched(rightItem.id, matchedCanonical)) return;

      if (selectedRightIndex === visualIndex) {
        setSelectedRightIndex(null);
        return;
      }

      setSelectedRightIndex(visualIndex);

      if (selectedLeftIndex !== null) {
        checkMatch(selectedLeftIndex, visualIndex);
      }
    },
    [
      checkMatch,
      matchedCanonical,
      rightItems,
      selectedLeftIndex,
      selectedRightIndex,
    ]
  );

  const handleSubmit = useCallback(async () => {
    if (isSubmittingRef.current) return;

    if (!resolvedAssignmentId) {
      Alert.alert(
        "Cannot submit",
        "Assignment ID is missing. Cannot submit drill."
      );
      return;
    }

    if (pairs.length === 0) {
      Alert.alert("Cannot submit", "This drill has no matching pairs.");
      return;
    }

    if (matchedCanonical.size !== pairs.length) {
      Alert.alert(
        "Not finished",
        "Please match all pairs before submitting."
      );
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      const incorrectPairs = [...incorrectPairsRef.current];
      const pairMatchEvents = [...pairMatchEventsRef.current];
      const accuracy = computeMatchingScore(pairsMatched, incorrectPairs.length);
      const timeSpent = Math.floor(
        (Date.now() - startTimeRef.current) / 1000
      );

      const result = await completeDrill(drillId, {
        drillAssignmentId: resolvedAssignmentId,
        score: accuracy,
        timeSpent,
        platform: Platform.OS === "ios" ? "ios" : "android",
        matchingResults: {
          pairsMatched,
          totalPairs: pairs.length,
          accuracy,
          ...(incorrectPairs.length ? { incorrectPairs } : {}),
          ...(pairMatchEvents.length ? { pairMatchEvents } : {}),
        },
      });

      addRecentActivity({
        id: drill!._id,
        title: drill!.title,
        type: drill!.type,
        durationSeconds: timeSpent,
        score: accuracy,
      });

      setCelebrationEffects(result.effects);
      setCompletionScore(accuracy);
      clearCheckpoint();
      await invalidateDrillCaches(queryClient);
      setIsCompleted(true);

      showToast({
        title: "Drill completed! Great job!",
        body: "",
      });
    } catch (error) {
      logger.error("Failed to submit matching drill:", error);
      Alert.alert(
        "Submission failed",
        "Failed to submit drill. Please try again."
      );
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  }, [
    addRecentActivity,
    clearCheckpoint,
    drill,
    drillId,
    matchedCanonical.size,
    pairs.length,
    pairsMatched,
    queryClient,
    resolvedAssignmentId,
    showToast,
  ]);

  const renderTile = (
    item: MatchingTileItem,
    visualIndex: number,
    side: "left" | "right"
  ) => {
    const isMatched = isTileMatched(item.id, matchedCanonical);
    const isSelected =
      side === "left"
        ? selectedLeftIndex === visualIndex
        : selectedRightIndex === visualIndex;
    const isIncorrect = [...incorrectAttempts].some((key) => {
      const [leftIdx, rightIdx] = key.split("-").map(Number);
      return side === "left"
        ? leftIdx === visualIndex
        : rightIdx === visualIndex;
    });

    return (
      <TouchableOpacity
        key={`${side}-${visualIndex}-${item.id}`}
        onPress={() =>
          side === "left"
            ? handleLeftSelect(visualIndex)
            : handleRightSelect(visualIndex)
        }
        disabled={isMatched || isSubmitting}
        style={[
          tw`rounded-2xl px-4 py-3 border-2`,
          isMatched
            ? tw`bg-green-100 border-green-500`
            : isIncorrect
              ? tw`bg-red-50 border-red-400`
              : isSelected
                ? tw`bg-yellow-50 border-yellow-400`
                : tw`bg-white border-gray-200`,
        ]}
      >
        <AppText
          style={[
            tw`text-center font-medium`,
            isMatched ? tw`text-green-700` : tw`text-gray-900`,
          ]}
        >
          {item.text}
        </AppText>
        {item.translation ? (
          <AppText style={tw`text-center text-xs text-gray-500 mt-1`}>
            {item.translation}
          </AppText>
        ) : null}
      </TouchableOpacity>
    );
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

  if (isCompleted && drill) {
    const passed = completionScore >= MATCHING_PASS_THRESHOLD;

    return (
      <DrillCompletedScreen
        variant="progress"
        completed={pairsMatched}
        total={pairs.length}
        passed={passed}
        celebrate={true}
        celebrationEffects={celebrationEffects}
        title={passed ? "You passed!" : "Keep practicing"}
        message={
          passed
            ? `Great job! You matched all ${pairs.length} pairs with ${completionScore}% accuracy.`
            : `You matched all ${pairs.length} pairs with ${completionScore}% accuracy. Keep practicing to reach 70%.`
        }
        onContinue={() => router.back()}
        onClose={() => router.back()}
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

  if (pairs.length === 0) {
    return (
      <SafeAreaView style={tw`flex-1 bg-white items-center justify-center px-5`}>
        <AppText style={tw`text-gray-600 text-center`}>
          This drill has no matching pairs.
        </AppText>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={tw`flex-1 bg-white`} edges={["top", "bottom"]}>
      <DrillHeader
        title={drill.title}
        currentStep={pairsMatched}
        totalSteps={pairs.length}
      />

      <ScrollView
        style={tw`flex-1 px-5`}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={tw`pb-6`}
      >
        <AITutorMessage message="Tap the Matching pairs" showAudio={true} />

        {drill.context ? (
          <View style={tw`bg-green-50 border border-green-200 rounded-2xl p-4 mb-4`}>
            <AppText style={tw`text-sm text-gray-800 leading-5`}>
              {drill.context}
            </AppText>
          </View>
        ) : null}

        <View style={tw`flex-row gap-3 mb-3`}>
          <View style={tw`flex-1 gap-3`}>
            {leftItems.map((item, index) => renderTile(item, index, "left"))}
          </View>

          <View style={tw`flex-1 gap-3`}>
            {rightItems.map((item, index) => renderTile(item, index, "right"))}
          </View>
        </View>
      </ScrollView>

      <View style={tw`px-5 pb-6`}>
        <TouchableOpacity
          onPress={() => {
            void handleSubmit();
          }}
          disabled={isSubmitting || !allMatched}
          style={[
            tw`rounded-full py-4 items-center flex-row justify-center gap-2`,
            isSubmitting || !allMatched ? tw`bg-gray-300` : tw`bg-green-700`,
          ]}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : null}
          <AppText style={tw`text-white font-semibold text-base`}>
            {isSubmitting ? "Submitting…" : "Submit"}
          </AppText>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
