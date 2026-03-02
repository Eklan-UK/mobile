import AITutorMessage from "@/components/drills/AITutorMessage";
import AudioButton from "@/components/drills/AudioButton";
import DrillCompletedScreen from "@/components/drills/DrillCompletedScreen";
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

interface WordAnswer {
  definition: string;
  sentence1: string;
  sentence2: string;
}

export default function SentenceDrill() {
  const params = useLocalSearchParams();
  const drillId = params.id as string;
  const assignmentId = params.assignmentId as string | undefined;

  const { drillProgress, updateDrillProgress, addRecentActivity, clearDrillProgress } = useActivityStore();
  const startTimeRef = useRef(Date.now());
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();

  const [drill, setDrill] = useState<Drill | null>(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<WordAnswer>({
    definition: "",
    sentence1: "",
    sentence2: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  // Restore progress
  useEffect(() => {
    if (drillId && drillProgress[drillId]) {
      const saved = drillProgress[drillId];
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

  // Save progress (debounced to avoid AsyncStorage writes on every keystroke)
  useEffect(() => {
    if (drill) {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        updateDrillProgress({
          drillId,
          title: drill.title,
          type: drill.type,
          currentStep: 1,
          totalSteps: 1,
          answers: [],
          data: { answers },
          startTime: startTimeRef.current,
          lastUpdated: Date.now(),
        });
      }, 1500); // Only persist after 1.5s of inactivity
    }

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [answers, drill]);

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

  // Get word from drill
  const word = drill?.sentence_drill_word || drill?.target_sentences?.[0]?.word || "";

  const isComplete =
    answers.definition.trim().length > 0 &&
    answers.sentence1.trim().length > 0 &&
    answers.sentence2.trim().length > 0;

  const updateAnswer = (field: keyof WordAnswer, value: string) => {
    setAnswers({
      ...answers,
      [field]: value,
    });
  };

  const handleSubmit = async () => {
    if (!drill || !word) return;

    if (!isComplete) {
      return;
    }

    setIsSubmitting(true);
    try {
      const timeSpent = Math.floor((Date.now() - startTimeRef.current) / 1000);

      const sentenceResults = {
        word: word,
        definition: answers.definition.trim(),
        sentences: [
          { text: answers.sentence1.trim(), index: 0 },
          { text: answers.sentence2.trim(), index: 1 },
        ],
        reviewStatus: "pending",
      };

      await completeDrill(drillId, {
        drillAssignmentId: assignmentId,
        score: 100, // Sentence drills are reviewed
        timeSpent,
        answers: [],
        sentenceResults,
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

  if (!drill || !word) {
    return (
      <SafeAreaView style={tw`flex-1 bg-white items-center justify-center px-5`}>
        <AppText style={tw`text-gray-600 text-center`}>Drill not found or has no word</AppText>
      </SafeAreaView>
    );
  }

  if (isCompleted) {
    return (
      <DrillCompletedScreen
        variant="submitted"
        title="Sentence submitted"
        message="Your submission has been submitted for review. You'll be notified when your sentences have been reviewed."
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
          currentStep={1}
          totalSteps={1}
        />

        <ScrollView
          style={tw`flex-1 px-5`}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={tw`pb-6`}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          <AITutorMessage
            message={`For the word "${word}", provide a definition and write two sentences using it.`}
            showAudio={true}
          />

          <View style={tw`bg-white border border-gray-200 rounded-2xl p-4 mb-4 items-center`}>
            <AppText style={tw`text-3xl font-bold text-gray-900 mb-2`}>
              {word}
            </AppText>
            <AudioButton text={word} size={20} />
          </View>

          <View style={tw`bg-white border border-gray-200 rounded-2xl p-4 mb-4`}>
            <AppText style={tw`text-base font-semibold text-gray-900 mb-2`}>
              Definition
            </AppText>
            <TextInput
              value={answers.definition}
              onChangeText={(value) => updateAnswer("definition", value)}
              placeholder="Enter the definition of the word..."
              multiline
              numberOfLines={2}
              style={tw`bg-gray-50 rounded-xl p-3 text-sm text-gray-900 min-h-16`}
              textAlignVertical="top"
            />
            <AppText style={tw`text-xs text-gray-500 mt-2`}>
              {answers.definition.length} characters
            </AppText>
          </View>

          <View style={tw`bg-white border border-gray-200 rounded-2xl p-4 mb-4`}>
            <AppText style={tw`text-base font-semibold text-gray-900 mb-2`}>
              Sentence 1
            </AppText>
            <TextInput
              value={answers.sentence1}
              onChangeText={(value) => updateAnswer("sentence1", value)}
              placeholder="Write your first sentence here..."
              multiline
              numberOfLines={2}
              style={tw`bg-gray-50 rounded-xl p-3 text-sm text-gray-900 min-h-16`}
              textAlignVertical="top"
            />
          </View>

          <View style={tw`bg-white border border-gray-200 rounded-2xl p-4 mb-4`}>
            <AppText style={tw`text-base font-semibold text-gray-900 mb-2`}>
              Sentence 2
            </AppText>
            <TextInput
              value={answers.sentence2}
              onChangeText={(value) => updateAnswer("sentence2", value)}
              placeholder="Write your second sentence here..."
              multiline
              numberOfLines={2}
              style={tw`bg-gray-50 rounded-xl p-3 text-sm text-gray-900 min-h-16`}
              textAlignVertical="top"
            />
          </View>
        </ScrollView>

        <View style={tw`px-5 pb-6`}>
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={!isComplete || isSubmitting}
            style={[
              tw`rounded-full py-4 items-center`,
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
                  tw`font-semibold text-base`,
                  isComplete && !isSubmitting
                    ? tw`text-white`
                    : tw`text-gray-400`,
                ]}
              >
                Submit
              </AppText>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

