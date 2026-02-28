import AITutorMessage from "@/components/drills/AITutorMessage";
import AudioButton from "@/components/drills/AudioButton";
import DrillHeader from "@/components/drills/DrillHeader";
import { AppText, Loader } from "@/components/ui";
import tw from "@/lib/tw";
import { completeDrill, getAssignmentAttempts, getDrillById } from "@/services/drill.service";
import { useActivityStore } from "@/store/activity-store";
import { Drill } from "@/types/drill.types";
import { logger } from "@/utils/logger";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

export default function SummaryDrill() {
  const params = useLocalSearchParams();
  const drillId = params.id as string;
  const assignmentId = params.assignmentId as string | undefined;

  const { drillProgress, updateDrillProgress, addRecentActivity, clearDrillProgress } = useActivityStore();
  const startTimeRef = useRef(Date.now());
  const insets = useSafeAreaInsets();

  const [drill, setDrill] = useState<Drill | null>(null);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState("");
  // Controls post-submission comprehension check screen
  const [showInstructions, setShowInstructions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [attemptLoading, setAttemptLoading] = useState(false);
  const [showQuestions, setShowQuestions] = useState(false);
  const [questionAnswers, setQuestionAnswers] = useState<Record<number, string>>({});

  // Restore progress
  useEffect(() => {
    if (drillId && drillProgress[drillId]) {
      const saved = drillProgress[drillId];
      if (saved.data?.summary) {
        setSummary(saved.data.summary);
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
    if (drill && !showInstructions) {
      updateDrillProgress({
        drillId,
        title: drill.title,
        type: drill.type,
        currentStep: 1,
        totalSteps: 1,
        answers: [],
        data: { summary },
        startTime: startTimeRef.current,
        lastUpdated: Date.now(),
      });
    }
  }, [summary, drill, showInstructions]);

  useEffect(() => {
    loadDrill();
  }, [drillId]);

  // Load existing submission for completed drills (read-only view)
  useEffect(() => {
    if (!assignmentId) return;
    loadExistingSubmission();
  }, [assignmentId, drillId]);

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

  const loadExistingSubmission = async () => {
    try {
      setAttemptLoading(true);
      const result = await getAssignmentAttempts(assignmentId!);
      const latest = result.latestAttempt;

      if (latest?.summaryResults?.summaryProvided) {
        const existingSummary = latest.summaryResults.summary || "";
        setSummary(existingSummary);
        setIsCompleted(true);
        setIsReadOnly(true);
        setShowInstructions(false);
      }
    } catch (error) {
      logger.warn("Failed to load existing summary attempt", error);
    } finally {
      setAttemptLoading(false);
    }
  };

  const handleStart = () => {
    // If there are comprehension questions, show them; otherwise just leave the screen
    if (drill) {
      const rawQuestions: any =
        (drill as any).summary_questions ||
        (drill as any).comprehension_questions ||
        [];
      const hasQuestions =
        Array.isArray(rawQuestions) && rawQuestions.length > 0;

      if (hasQuestions) {
        setShowInstructions(false);
        setShowQuestions(true);
        return;
      }
    }

    // No questions available – just close the comprehension check flow
    setShowInstructions(false);
  };

  const handleSkip = () => {
    router.back();
  };

  const handleSubmit = async () => {
    if (!drill || !summary.trim()) return;

    setIsSubmitting(true);
    try {
      const timeSpent = Math.floor((Date.now() - startTimeRef.current) / 1000);

      const summaryResults = {
        // Required flag for backend validation
        summaryProvided: true,
        articleTitle: drill.article_title || drill.title,
        articleContent: drill.article_content || "",
        summary: summary.trim(),
        wordCount: summary.trim().split(/\s+/).filter(Boolean).length,
        reviewStatus: "pending" as const,
      };

      await completeDrill(drillId, {
        drillAssignmentId: assignmentId,
        score: 100, // Summary drills are reviewed
        timeSpent,
        answers: [],
        summaryResults,
      });

      // Mark drill as completed
      setIsCompleted(true);

      // Only show the comprehension check flow if questions exist for this drill
      const rawQuestions: any =
        (drill as any).summary_questions ||
        (drill as any).comprehension_questions ||
        [];
      const hasQuestions =
        Array.isArray(rawQuestions) && rawQuestions.length > 0;

      if (hasQuestions) {
        setShowInstructions(true);
      } else {
        // No questions configured – simply go back after successful submission
        setShowInstructions(false);
        router.back();
      }
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

  if (loading || attemptLoading) {
    return (
      <SafeAreaView style={tw`flex-1 bg-white items-center justify-center`}>
        <Loader />
      </SafeAreaView>
    );
  }

  if (!drill) {
    return (
      <SafeAreaView style={tw`flex-1 bg-white items-center justify-center px-5`}>
        <AppText style={tw`text-gray-600 text-center`}>Drill not found</AppText>
      </SafeAreaView>
    );
  }

  const articleTitle = drill.article_title || drill.title;
  const articleContent = drill.article_content || "";

  const rawQuestions: any =
    (drill as any).summary_questions ||
    (drill as any).comprehension_questions ||
    [];
  const summaryQuestions: { text: string }[] = Array.isArray(rawQuestions)
    ? rawQuestions.map((q: any) => {
      if (typeof q === "string") {
        return { text: q };
      }
      return {
        text: q.text || q.question || "",
      };
    }).filter((q: { text: string }) => q.text && q.text.length > 0)
    : [];
  const hasQuestions = summaryQuestions.length > 0;

  // Only show the comprehension check intro once the drill has been completed/submitted
  // and only if there are configured questions
  if (isCompleted && showInstructions && hasQuestions) {
    return (
      <SafeAreaView style={tw`flex-1 bg-white`} edges={["top", "bottom"]}>
        <View style={tw`flex-1 px-5`}>
          {/* Close button */}
          <View style={tw`flex-row justify-end pt-4 pb-2`}>
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="close" size={28} color="#1F2937" />
            </TouchableOpacity>
          </View>

          <View style={tw`flex-1 justify-center items-center px-6`}>
            <AppText style={tw`text-2xl font-bold text-gray-900 mb-4 text-center`}>
              Comprehension check
            </AppText>

            <AppText style={tw`text-base text-gray-600 text-center mb-2`}>
              Answer a few quick questions to reflect on how well you understood the passage.
            </AppText>

            <AppText style={tw`text-sm text-gray-500 text-center`}>
              This is for your own understanding—there's no scoring.
            </AppText>
          </View>

          <View style={tw`pb-6 gap-3`}>
            <TouchableOpacity
              onPress={handleStart}
              style={tw`bg-green-700 rounded-full py-4 items-center`}
            >
              <AppText style={tw`text-white text-base font-semibold`}>
                Start check
              </AppText>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleSkip}>
              <AppText style={tw`text-gray-600 text-base text-center`}>
                Skip for now
              </AppText>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // If this is a completed drill opened from the plan/completed tab,
  // show the student's submission in read-only mode
  if (isCompleted && isReadOnly) {
    return (
      <SafeAreaView style={tw`flex-1 bg-white`} edges={["top", "bottom"]}>
        <KeyboardAvoidingView
          behavior="padding"
          style={tw`flex-1`}
          keyboardVerticalOffset={Platform.OS === "ios" ? -20 : -insets.bottom}
        >
          <DrillHeader
            title={articleTitle}
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
              message="Here is your submitted summary for this passage."
              showAudio={false}
            />

            {/* Passage Card */}
            <View style={tw`bg-white border border-gray-200 rounded-2xl p-5 mb-6`}>
              {articleTitle && (
                <AppText style={tw`text-base font-semibold text-gray-900 mb-3`}>
                  {articleTitle}
                </AppText>
              )}
              <AppText style={tw`text-sm text-gray-700 leading-6`}>
                {articleContent}
              </AppText>
              {articleContent && (
                <View style={tw`mt-3`}>
                  <AudioButton text={articleContent} audioUri={drill.article_audio_url} size={18} />
                </View>
              )}
            </View>

            {/* Submitted Summary (read-only) */}
            <AppText style={tw`text-sm font-semibold text-gray-900 mb-2`}>
              Your Summary
            </AppText>
            <View style={tw`bg-white border border-gray-200 rounded-2xl p-4`}>
              <AppText style={tw`text-sm text-gray-800 leading-6`}>
                {summary || "No summary text available."}
              </AppText>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // Question screen after tapping "Start check"
  if (isCompleted && showQuestions && hasQuestions) {
    return (
      <SafeAreaView style={tw`flex-1 bg-white`} edges={["top", "bottom"]}>
        <KeyboardAvoidingView
          behavior="padding"
          style={tw`flex-1`}
          keyboardVerticalOffset={Platform.OS === "ios" ? -20 : -insets.bottom}
        >
          <DrillHeader
            title="Comprehension check"
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
              message="Answer these questions to reflect on how well you understood the passage. This won't affect your score."
              showAudio={false}
            />

            {summaryQuestions.map((q, index) => (
              <View
                key={index}
                style={tw`bg-white border border-gray-200 rounded-2xl p-4 mb-4`}
              >
                <AppText style={tw`text-sm font-semibold text-gray-900 mb-2`}>
                  Question {index + 1}
                </AppText>
                <AppText style={tw`text-sm text-gray-700 mb-3`}>
                  {q.text}
                </AppText>
                <TextInput
                  value={questionAnswers[index] || ""}
                  onChangeText={(value) =>
                    setQuestionAnswers((prev) => ({
                      ...prev,
                      [index]: value,
                    }))
                  }
                  placeholder="Type your answer here..."
                  multiline
                  numberOfLines={3}
                  style={tw`bg-gray-50 rounded-xl p-3 text-sm text-gray-900 min-h-16`}
                  textAlignVertical="top"
                />
              </View>
            ))}
          </ScrollView>

          <View style={tw`px-5 pb-6`}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={tw`rounded-full py-4 items-center bg-green-700`}
            >
              <AppText style={tw`text-base font-semibold text-white`}>
                Finish
              </AppText>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // Default editable summary screen (for new / in-progress drills)
  return (
    <SafeAreaView style={tw`flex-1 bg-white`} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        behavior="padding"
        style={tw`flex-1`}
        keyboardVerticalOffset={Platform.OS === "ios" ? -20 : -insets.bottom}
      >
        <DrillHeader
          title={articleTitle}
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
            message="Read the passage below and write a brief summary:"
            showAudio={true}
          />

          {/* Passage Card */}
          <View style={tw`bg-white border border-gray-200 rounded-2xl p-5 mb-6`}>
            {articleTitle && (
              <AppText style={tw`text-base font-semibold text-gray-900 mb-3`}>
                {articleTitle}
              </AppText>
            )}
            <AppText style={tw`text-sm text-gray-700 leading-6`}>
              {articleContent}
            </AppText>
            {articleContent && (
              <View style={tw`mt-3`}>
                <AudioButton text={articleContent} audioUri={drill.article_audio_url} size={18} />
              </View>
            )}
          </View>

          {/* Summary Input */}
          <AppText style={tw`text-sm font-semibold text-gray-900 mb-2`}>
            Your Summary
          </AppText>
          <TextInput
            value={summary}
            onChangeText={setSummary}
            placeholder="Type your summary here..."
            multiline
            numberOfLines={6}
            editable={!isCompleted && !isReadOnly}
            style={tw`bg-white border border-gray-200 rounded-2xl p-4 text-sm text-gray-900 min-h-32 ${isCompleted || isReadOnly ? "opacity-60" : ""}`}
            textAlignVertical="top"
          />
        </ScrollView>

        <View style={tw`px-5 pb-6`}>
          {!isCompleted && !isReadOnly && (
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={!summary.trim() || isSubmitting}
              style={[
                tw`rounded-full py-4 items-center`,
                summary.trim() && !isSubmitting ? tw`bg-green-700` : tw`bg-gray-200`,
              ]}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <AppText
                  style={[
                    tw`text-base font-semibold`,
                    summary.trim() ? tw`text-white` : tw`text-gray-400`,
                  ]}
                >
                  Submit
                </AppText>
              )}
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
