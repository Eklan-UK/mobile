import AITutorMessage from "@/components/drills/AITutorMessage";
import CheckpointScreen from "@/components/drills/CheckpointScreen";
import DrillCompletedScreen from "@/components/drills/DrillCompletedScreen";
import DrillHeader from "@/components/drills/DrillHeader";
import { AppText, Loader } from "@/components/ui";
import { invalidateDrillCaches } from "@/hooks/useDrills";
import { useDrillCheckpoint } from "@/hooks/useDrillCheckpoint";
import tw from "@/lib/tw";
import { completeDrill, getDrillById } from "@/services/drill.service";
import { useActivityStore } from "@/store/activity-store";
import { Drill, type DrillCompletionEffects } from "@/types/drill.types";
import { DrillCheckpointType } from "@/types/drill-checkpoint.types";
import { logger } from "@/utils/logger";
import { useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

export default function DefinitionDrill() {
  const params = useLocalSearchParams();
  const drillId = params.id as string;
  const assignmentId = params.assignmentId as string | undefined;
  const isRedo = params.redo === "true";

  const { drillProgress, updateDrillProgress, addRecentActivity, clearDrillProgress } = useActivityStore();
  const queryClient = useQueryClient();
  const startTimeRef = useRef(Date.now());
  const insets = useSafeAreaInsets();

  const [drill, setDrill] = useState<Drill | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [completionScore, setCompletionScore] = useState(0);
  const [celebrationEffects, setCelebrationEffects] = useState<DrillCompletionEffects | undefined>();
  const [completePassed, setCompletePassed] = useState(false);

  const totalItems = drill?.definition_items?.length ?? 0;

  const initFreshState = useCallback(() => {
    setCurrentIndex(0);
    setAnswers({});
  }, []);

  const hydrateFromCheckpoint = useCallback(
    (checkpoint: {
      resumeFromIndex: number;
      partialResults: { answers: Record<number, string> };
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
    drillType: DrillCheckpointType.definition,
    isRedo,
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
      updateDrillProgress({
        drillId,
        title: drill.title,
        type: drill.type,
        currentStep: currentIndex + 1,
        totalSteps: drill.definition_items?.length || 1,
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
      const drillData = await getDrillById(drillId, assignmentId);
      setDrill(drillData);
    } catch (error) {
      logger.error('❌ Failed to load drill:', error);
    } finally {
      setLoading(false);
    }
  };

  const items = drill?.definition_items || [];
  const currentItem = items[currentIndex];
  const currentAnswer = answers[currentIndex] || "";
  const hasAnswer = currentAnswer.trim().length > 0;
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === items.length - 1;

  const handleAnswerChange = (value: string) => {
    setAnswers({
      ...answers,
      [currentIndex]: value,
    });
  };

  const handlePrevious = () => {
    if (!isFirst) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (!hasAnswer) {
      return;
    }
    if (!isLast) {
      const completedCount = currentIndex + 1;
      void saveCheckpointAtBoundary({ answers }, completedCount, currentIndex);
      setCurrentIndex(currentIndex + 1);
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    if (!drill) return;

    setIsSubmitting(true);
    try {
      const totalQuestions = items.length;
      const answeredCount = items.filter((_, idx) => {
        const answer = answers[idx];
        return answer && answer.trim().length > 0;
      }).length;
      const score = Math.round((answeredCount / totalQuestions) * 100);
      const timeSpent = Math.floor((Date.now() - startTimeRef.current) / 1000);

      const definitionResults = items.map((item, index) => ({
        word: item.word,
        definition: answers[index] || "",
        hint: item.hint || "",
      }));

      const result = await completeDrill(drillId, {
        drillAssignmentId: assignmentId,
        score,
        timeSpent,
        answers: [],
        definitionResults: {
          definitions: definitionResults,
        },
      });
      setCelebrationEffects(result.effects);
      setCompletePassed(result.passed);
      clearCheckpoint();
      await invalidateDrillCaches(queryClient);

      setCompletionScore(score);
      setIsCompleted(true);
      addRecentActivity({
        id: drill._id,
        title: drill.title,
        type: drill.type,
        durationSeconds: timeSpent,
        score,
      });
      clearDrillProgress(drillId);
    } catch (error: any) {
      logger.error('Failed to submit drill:', error);
    } finally {
      setIsSubmitting(false);
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

  if (isCompleted) {
    const items = drill?.definition_items ?? [];
    const answeredCount = items.filter((_, idx) => {
      const answer = answers[idx];
      return answer && answer.trim().length > 0;
    }).length;
    const celebrateThreshold = completionScore >= 70;

    if (celebrateThreshold) {
      return (
        <DrillCompletedScreen
          variant="progress"
          completed={answeredCount}
          total={items.length}
          passed={celebrateThreshold}
          celebrate={celebrateThreshold && completePassed && !!celebrationEffects}
          celebrationEffects={celebrationEffects}
          title="You passed!"
          message="Great job! Your definitions have been submitted."
          onContinue={() => router.back()}
          onClose={() => router.back()}
        />
      );
    }

    return (
      <DrillCompletedScreen
        variant="submitted"
        passed={false}
        celebrate={false}
        title="Definition submitted"
        message="Your definitions have been submitted for review. You'll be notified when they have been reviewed."
        onContinue={() => router.back()}
        onClose={() => router.back()}
      />
    );
  }

  return (
    <SafeAreaView style={tw`flex-1 bg-white`} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        behavior="padding"
        style={tw`flex-1`}
        keyboardVerticalOffset={Platform.OS === "ios" ? -20 : -insets.bottom}
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
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          <AITutorMessage
            message={`Write the definition for: "${currentItem.word}"`}
            showAudio={true}
          />

          {currentItem.hint && (
            <View style={tw`bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-4`}>
              <AppText style={tw`text-sm text-blue-700`}>
                💡 Hint: {currentItem.hint}
              </AppText>
            </View>
          )}

          <View style={tw`bg-white border border-gray-200 rounded-2xl p-4 mb-4`}>
            <AppText style={tw`text-base font-semibold text-gray-900 mb-2`}>
              Your Definition
            </AppText>
            <TextInput
              value={currentAnswer}
              onChangeText={handleAnswerChange}
              placeholder="Type your definition here..."
              multiline
              numberOfLines={4}
              style={tw`bg-gray-50 rounded-xl p-3 text-sm text-gray-900 min-h-24`}
              textAlignVertical="top"
            />
            <AppText style={tw`text-xs text-gray-500 mt-2`}>
              {currentAnswer.length} characters
            </AppText>
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
            disabled={!hasAnswer || isSubmitting}
            style={[
              tw`px-6 py-3 rounded-full`,
              hasAnswer && !isSubmitting
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
                  hasAnswer && !isSubmitting
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

