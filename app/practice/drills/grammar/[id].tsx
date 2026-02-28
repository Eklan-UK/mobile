import AITutorMessage from "@/components/drills/AITutorMessage";
import AudioButton from "@/components/drills/AudioButton";
import DrillHeader from "@/components/drills/DrillHeader";
import { AppText, Loader } from "@/components/ui";
import tw from "@/lib/tw";
import { completeDrill, getDrillById } from "@/services/drill.service";
import { useActivityStore } from "@/store/activity-store";
import { Drill } from "@/types/drill.types";
import { logger } from "@/utils/logger";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

interface PatternAnswer {
  sentence1: string;
  sentence2: string;
}

export default function GrammarDrill() {
  const params = useLocalSearchParams();
  const drillId = params.id as string;
  const assignmentId = params.assignmentId as string | undefined;

  const { drillProgress, updateDrillProgress, addRecentActivity, clearDrillProgress } = useActivityStore();
  const startTimeRef = useRef(Date.now());
  const insets = useSafeAreaInsets();

  const [drill, setDrill] = useState<Drill | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, PatternAnswer>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  // Restore progress
  useEffect(() => {
    if (drillId && drillProgress[drillId]) {
      const saved = drillProgress[drillId];
      if (saved.data?.currentIndex !== undefined) {
        setCurrentIndex(saved.data.currentIndex);
      }
      if (saved.data?.answers) {
        setAnswers(saved.data.answers);
      }
    }
  }, [drillId]);

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
        totalSteps: drill.grammar_items?.length || 1,
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

  const items = drill?.grammar_items || [];
  const currentItem = items[currentIndex];
  const currentAnswer = answers[currentIndex] || {
    sentence1: "",
    sentence2: "",
  };
  const isComplete = currentAnswer.sentence1.trim().length > 0 && currentAnswer.sentence2.trim().length > 0;
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === items.length - 1;

  const updateAnswer = (field: keyof PatternAnswer, value: string) => {
    setAnswers({
      ...answers,
      [currentIndex]: {
        ...currentAnswer,
        [field]: value,
      },
    });
  };

  const handlePrevious = () => {
    if (!isFirst) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (!isComplete) {
      return;
    }
    if (!isLast) {
      setCurrentIndex(currentIndex + 1);
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    if (!drill) return;

    setIsSubmitting(true);
    try {
      const timeSpent = Math.floor((Date.now() - startTimeRef.current) / 1000);

      const grammarResults = {
        patterns: items.map((item, idx) => ({
          pattern: item.pattern,
          example: item.example,
          hint: item.hint || "",
          sentences: [
            { text: answers[idx]?.sentence1.trim() || "", index: 0 },
            { text: answers[idx]?.sentence2.trim() || "", index: 1 },
          ],
        })),
        reviewStatus: "pending",
      };

      await completeDrill(drillId, {
        drillAssignmentId: assignmentId,
        score: 100, // Grammar drills are reviewed, so score is set after review
        timeSpent,
        answers: [],
        grammarResults,
      });

      setIsCompleted(true);
      addRecentActivity({
        id: drill._id,
        title: drill.title,
        type: drill.type,
        durationSeconds: timeSpent,
        score: 0, // Pending review
      });
      clearDrillProgress(drillId);
    } catch (error: any) {
      logger.error('Failed to submit drill:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
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
    return (
      <SafeAreaView style={tw`flex-1 bg-white`} edges={["top", "bottom"]}>
        <View style={tw`flex-1 items-center justify-center px-5`}>
          <AppText style={tw`text-2xl font-bold text-gray-900 mb-2`}>Great Job!</AppText>
          <AppText style={tw`text-gray-600 text-center mb-6`}>
            Your grammar drill has been submitted for review.
          </AppText>
          <TouchableOpacity
            onPress={() => router.back()}
            style={tw`bg-green-700 rounded-full px-6 py-3`}
          >
            <AppText style={tw`text-white font-semibold`}>Continue</AppText>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
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
            message={`Write two sentences using the pattern: "${currentItem.pattern}"`}
            showAudio={true}
          />

          {currentItem.example && (
            <View style={tw`bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-4`}>
              <AppText style={tw`text-sm font-semibold text-blue-900 mb-1`}>
                Example:
              </AppText>
              <AppText style={tw`text-sm text-blue-700`}>
                {currentItem.example}
              </AppText>
              <View style={tw`mt-2`}>
                <AudioButton text={currentItem.example} size={18} />
              </View>
            </View>
          )}

          {currentItem.hint && (
            <View style={tw`bg-yellow-50 border border-yellow-200 rounded-2xl p-4 mb-4`}>
              <AppText style={tw`text-sm text-yellow-700`}>
                💡 Hint: {currentItem.hint}
              </AppText>
            </View>
          )}

          <View style={tw`bg-white border border-gray-200 rounded-2xl p-4 mb-4`}>
            <AppText style={tw`text-base font-semibold text-gray-900 mb-3`}>
              Sentence 1
            </AppText>
            <TextInput
              value={currentAnswer.sentence1}
              onChangeText={(value) => updateAnswer("sentence1", value)}
              placeholder="Write your first sentence here..."
              multiline
              numberOfLines={2}
              style={tw`bg-gray-50 rounded-xl p-3 text-sm text-gray-900 min-h-16`}
              textAlignVertical="top"
            />
          </View>

          <View style={tw`bg-white border border-gray-200 rounded-2xl p-4 mb-4`}>
            <AppText style={tw`text-base font-semibold text-gray-900 mb-3`}>
              Sentence 2
            </AppText>
            <TextInput
              value={currentAnswer.sentence2}
              onChangeText={(value) => updateAnswer("sentence2", value)}
              placeholder="Write your second sentence here..."
              multiline
              numberOfLines={2}
              style={tw`bg-gray-50 rounded-xl p-3 text-sm text-gray-900 min-h-16`}
              textAlignVertical="top"
            />
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
            disabled={!isComplete || isSubmitting}
            style={[
              tw`px-6 py-3 rounded-full`,
              isComplete && !isSubmitting
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
                  isComplete && !isSubmitting
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

