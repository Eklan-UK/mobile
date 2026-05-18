import DrillCompletedScreen from "@/components/drills/DrillCompletedScreen";
import DrillHeader from "@/components/drills/DrillHeader";
import AudioButton from "@/components/drills/AudioButton";
import { AppText, Loader } from "@/components/ui";
import { getDrillById, completeDrill } from "@/services/drill.service";
import { useSaveDrill } from "@/hooks/useSaveDrill";
import { useAuth } from "@/hooks/useAuth";
import { Drill } from "@/types/drill.types";
import tw from "@/lib/tw";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
  TouchableOpacity,
  View,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { Alert } from "@/utils/alert";
import { SafeAreaView } from "react-native-safe-area-context";
import { useActivityStore } from "@/store/activity-store";
import { logger } from "@/utils/logger";

type SectionType = "intro" | "definition" | "sentences";

type WordProgress = {
  word: string;
  hint?: string;
  audioUrl?: string;
  definition: string;
  sentence1: string;
  sentence2: string;
};

export default function SentenceWritingDrill() {
  const params = useLocalSearchParams();
  const drillId = params.id as string;
  const assignmentId = params.assignmentId as string | undefined;

  const { drillProgress, updateDrillProgress, addRecentActivity, clearDrillProgress } =
    useActivityStore();
  const startTimeRef = useRef(Date.now());
  const { isSaved, handleSave, handleUnsave } = useSaveDrill(drillId);
  const { user } = useAuth();

  const [drill, setDrill] = useState<Drill | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showContext, setShowContext] = useState(false);

  // Paging state
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [currentSection, setCurrentSection] = useState<SectionType>("intro");
  const [wordProgressList, setWordProgressList] = useState<WordProgress[]>([]);

  // Restore progress
  useEffect(() => {
    if (drillId && drillProgress[drillId]) {
      const saved = drillProgress[drillId];
      if (saved.data?.wordProgressList) {
        setWordProgressList(saved.data.wordProgressList);
      }
      if (saved.data?.currentWordIndex !== undefined) {
        setCurrentWordIndex(saved.data.currentWordIndex);
      }
      if (saved.data?.currentSection) {
        setCurrentSection(saved.data.currentSection);
      }
      if (saved.data?.showContext !== undefined) {
        setShowContext(saved.data.showContext);
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
        currentStep: currentWordIndex + 1,
        totalSteps: wordProgressList.length,
        answers: [],
        data: { wordProgressList, currentWordIndex, currentSection, showContext },
        startTime: startTimeRef.current,
        lastUpdated: Date.now(),
      });
    }
  }, [wordProgressList, currentWordIndex, currentSection, showContext, drill]);

  useEffect(() => {
    loadDrill();
  }, [drillId]);

  const loadDrill = async () => {
    try {
      setLoading(true);
      const drillData = await getDrillById(drillId, assignmentId);
      setDrill(drillData);

      // Word resolution order (per spec):
      // 1. sentence_writing_items
      // 2. sentence_drill_word (legacy single word)
      // 3. target_sentences with a word field
      let rawWords: Array<{ word: string; hint?: string; audioUrl?: string }> = [];

      if (drillData.sentence_writing_items && drillData.sentence_writing_items.length > 0) {
        rawWords = drillData.sentence_writing_items.map((item) => ({
          word: item.word,
          hint: item.hint,
          audioUrl: item.audioUrl,
        }));
      } else if (drillData.sentence_drill_word) {
        rawWords = [
          {
            word: drillData.sentence_drill_word,
            audioUrl: drillData.sentence_drill_audio_url,
          },
        ];
      } else if (drillData.target_sentences && drillData.target_sentences.length > 0) {
        rawWords = drillData.target_sentences
          .filter((s) => s.word)
          .map((s) => ({ word: s.word! }));
      }

      const initialProgress: WordProgress[] = rawWords.map((item) => ({
        word: item.word,
        hint: item.hint,
        audioUrl: item.audioUrl,
        definition: "",
        sentence1: "",
        sentence2: "",
      }));

      if (initialProgress.length === 0) {
        logger.warn("No words found in sentence_writing drill");
      }

      setWordProgressList(initialProgress);

      // Show context screen first if the drill has a context field
      if (drillData.context && !drillProgress[drillId]) {
        setShowContext(true);
      }
    } catch (error) {
      logger.error("Failed to load drill:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateCurrentWord = (updates: Partial<WordProgress>) => {
    setWordProgressList((prev) => {
      const newList = [...prev];
      newList[currentWordIndex] = { ...newList[currentWordIndex], ...updates };
      return newList;
    });
  };

  const handleDismissContext = () => {
    setShowContext(false);
  };

  const handleContinueFromIntro = () => {
    setCurrentSection("definition");
  };

  const handleNextFromDefinition = () => {
    const currentWord = wordProgressList[currentWordIndex];
    if (!currentWord.definition.trim()) {
      Alert.alert("Required", "Please write the word definition before continuing.");
      return;
    }
    setCurrentSection("sentences");
  };

  const handleSubmitSentences = async () => {
    const currentWord = wordProgressList[currentWordIndex];

    if (!currentWord.sentence1.trim() || !currentWord.sentence2.trim()) {
      Alert.alert("Required", "Please write both sentences before submitting.");
      return;
    }

    if (currentWordIndex < wordProgressList.length - 1) {
      setCurrentWordIndex((prev) => prev + 1);
      setCurrentSection("intro");
    } else {
      // Pre-submit completeness check across all words
      const firstIncomplete = wordProgressList.findIndex(
        (wp) =>
          !wp.definition.trim() || !wp.sentence1.trim() || !wp.sentence2.trim()
      );
      if (firstIncomplete !== -1) {
        Alert.alert(
          "Incomplete",
          `Word ${firstIncomplete + 1} ("${wordProgressList[firstIncomplete].word}") is missing some fields. Please complete it first.`,
          [
            {
              text: "Go there",
              onPress: () => {
                setCurrentWordIndex(firstIncomplete);
                setCurrentSection("definition");
              },
            },
          ]
        );
        return;
      }
      await submitDrill();
    }
  };

  const submitDrill = async () => {
    if (!drill) return;

    setIsSubmitting(true);
    try {
      const timeSpent = Math.floor((Date.now() - startTimeRef.current) / 1000);

      if (wordProgressList.length === 0) {
        Alert.alert("Error", "No words to submit. Please try again.");
        setIsSubmitting(false);
        return;
      }

      const firstWord = wordProgressList[0];
      const sentenceResults = {
        word: firstWord?.word || "",
        definition: firstWord?.definition?.trim() || "",
        sentences: firstWord
          ? [
              { text: firstWord.sentence1?.trim() || "", index: 0 },
              { text: firstWord.sentence2?.trim() || "", index: 1 },
            ]
          : [],
        words: wordProgressList.map((wp, idx) => ({
          word: wp.word,
          definition: wp.definition.trim() || "",
          sentences: [
            { text: wp.sentence1.trim() || "", index: idx * 2 },
            { text: wp.sentence2.trim() || "", index: idx * 2 + 1 },
          ],
        })),
        reviewStatus: "pending" as const,
      };

      await completeDrill(drillId, {
        drillAssignmentId: assignmentId,
        score: 0,
        timeSpent,
        answers: [],
        sentenceResults,
      });

      setShowSuccess(true);

      addRecentActivity({
        id: drill._id,
        title: drill.title,
        type: drill.type,
        durationSeconds: timeSpent,
        score: 0,
      });

      clearDrillProgress(drillId);
    } catch (error: any) {
      logger.error("Failed to submit drill:", error);
      Alert.alert("Error", "Failed to submit. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Loading / Error screens ──────────────────────────────────────────────

  if (loading) {
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

  if (wordProgressList.length === 0) {
    return (
      <SafeAreaView style={tw`flex-1 bg-white items-center justify-center px-5`}>
        <AppText style={tw`text-gray-600 text-center mb-2`}>No words found in this drill</AppText>
        <AppText style={tw`text-sm text-gray-500 text-center`}>
          This drill may not be configured correctly. Please contact your tutor.
        </AppText>
      </SafeAreaView>
    );
  }

  if (showSuccess) {
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

  const currentWord = wordProgressList[currentWordIndex];
  const totalWords = wordProgressList.length;

  // ── CONTEXT SCREEN ──────────────────────────────────────────────────────
  if (showContext && drill.context) {
    return (
      <SafeAreaView style={tw`flex-1 bg-white`} edges={["top", "bottom"]}>
        <DrillHeader
          title={drill.title}
          currentStep={1}
          totalSteps={totalWords}
          drillId={drillId}
          isSaved={isSaved}
          onSave={handleSave}
          onUnsave={handleUnsave}
        />
        <ScrollView
          style={tw`flex-1 px-5`}
          contentContainerStyle={tw`pb-6`}
          showsVerticalScrollIndicator={false}
        >
          <View style={tw`mt-6 mb-4`}>
            <AppText style={tw`text-2xl font-bold text-gray-900 mb-2`}>
              Drill Context
            </AppText>
            <AppText style={tw`text-gray-500 text-base`}>
              Read the context below before starting.
            </AppText>
          </View>
          <View style={tw`bg-green-50 border border-green-200 rounded-2xl p-5`}>
            <AppText style={tw`text-gray-800 text-base leading-6`}>
              {drill.context}
            </AppText>
          </View>
        </ScrollView>
        <View style={tw`px-5 pb-6`}>
          <TouchableOpacity
            onPress={handleDismissContext}
            style={tw`bg-green-700 rounded-full py-4 items-center`}
          >
            <AppText style={tw`text-white text-base font-semibold`}>
              Got it, let's start
            </AppText>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── INTRO SECTION ────────────────────────────────────────────────────────
  if (currentSection === "intro") {
    const greeting = user?.firstName ? `Hello ${user.firstName}!` : "Let's practice!";

    return (
      <SafeAreaView style={tw`flex-1 bg-white`} edges={["top", "bottom"]}>
        <DrillHeader
          title={drill.title}
          currentStep={currentWordIndex + 1}
          totalSteps={totalWords}
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
          <View style={tw`mb-6`}>
            <AppText style={tw`text-green-700 font-medium mb-1`}>
              {greeting}
            </AppText>
            <AppText style={tw`text-gray-600 text-base`}>
              Take a moment to understand the word before writing.
            </AppText>
          </View>

          <View style={tw`items-center my-16`}>
            <AppText style={tw`text-[34px] font-bold text-gray-900 mb-6`}>
              {currentWord?.word}
            </AppText>

            <AudioButton
              text={currentWord?.word || ""}
              audioUri={currentWord?.audioUrl}
              size={28}
            />
          </View>

          {currentWord?.hint ? (
            <View style={tw`bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 mb-4`}>
              <AppText style={tw`text-amber-800 text-sm font-semibold mb-1`}>Hint</AppText>
              <AppText style={tw`text-amber-700 text-sm leading-5`}>{currentWord.hint}</AppText>
            </View>
          ) : null}
        </ScrollView>

        <View style={tw`px-5 pb-6`}>
          <TouchableOpacity
            onPress={handleContinueFromIntro}
            style={tw`bg-green-700 rounded-full py-4 items-center`}
          >
            <AppText style={tw`text-white text-base font-semibold`}>Continue</AppText>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── DEFINITION SECTION ───────────────────────────────────────────────────
  if (currentSection === "definition") {
    const hasDefinition = currentWord?.definition?.trim().length > 0;

    return (
      <SafeAreaView style={tw`flex-1 bg-white`} edges={["top"]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={tw`flex-1`}
          keyboardVerticalOffset={0}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={tw`flex-1`}>
              <DrillHeader
                title={drill.title}
                currentStep={currentWordIndex + 1}
                totalSteps={totalWords}
                drillId={drillId}
                isSaved={isSaved}
                onSave={handleSave}
                onUnsave={handleUnsave}
              />

              <ScrollView
                style={tw`flex-1 px-5`}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={tw`pb-6`}
                keyboardShouldPersistTaps="handled"
              >
                <View style={tw`mb-6`}>
                  <AppText style={tw`text-2xl font-bold text-gray-900 mb-3`}>
                    What does this word mean?
                  </AppText>
                  <AppText style={tw`text-gray-600 text-base`}>
                    Explain the meaning in your own words.
                  </AppText>
                </View>

                <View style={tw`items-center my-10`}>
                  <AppText style={tw`text-[34px] font-bold text-gray-900 mb-4`}>
                    {currentWord?.word}
                  </AppText>
                  <AudioButton
                    text={currentWord?.word || ""}
                    audioUri={currentWord?.audioUrl}
                    size={24}
                  />
                </View>

                {currentWord?.hint ? (
                  <View
                    style={tw`bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 mb-4`}
                  >
                    <AppText style={tw`text-amber-800 text-sm font-semibold mb-1`}>Hint</AppText>
                    <AppText style={tw`text-amber-700 text-sm leading-5`}>
                      {currentWord.hint}
                    </AppText>
                  </View>
                ) : null}

                <TextInput
                  value={currentWord?.definition || ""}
                  onChangeText={(text) => updateCurrentWord({ definition: text })}
                  placeholder="Type the meaning here..."
                  multiline
                  numberOfLines={6}
                  style={tw`bg-gray-50 rounded-2xl p-4 text-base text-gray-900 min-h-40 mb-4`}
                  textAlignVertical="top"
                />

                <AppText style={tw`text-sm text-gray-500`}>
                  Write how you understand the word.
                </AppText>
              </ScrollView>

              <View style={tw`px-5 pb-6 bg-white`}>
                <TouchableOpacity
                  onPress={handleNextFromDefinition}
                  disabled={!hasDefinition}
                  style={[
                    tw`rounded-full py-4 items-center`,
                    hasDefinition ? tw`bg-green-700` : tw`bg-gray-200`,
                  ]}
                >
                  <AppText
                    style={[
                      tw`text-base font-semibold`,
                      hasDefinition ? tw`text-white` : tw`text-gray-400`,
                    ]}
                  >
                    Next
                  </AppText>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ── SENTENCES SECTION ────────────────────────────────────────────────────
  if (currentSection === "sentences") {
    const hasSentence1 = currentWord?.sentence1?.trim().length > 0;
    const hasSentence2 = currentWord?.sentence2?.trim().length > 0;
    const canSubmit = hasSentence1 && hasSentence2;
    const isLastWord = currentWordIndex === totalWords - 1;

    return (
      <SafeAreaView style={tw`flex-1 bg-white`} edges={["top"]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={tw`flex-1`}
          keyboardVerticalOffset={0}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={tw`flex-1`}>
              <DrillHeader
                title={drill.title}
                currentStep={currentWordIndex + 1}
                totalSteps={totalWords}
                drillId={drillId}
                isSaved={isSaved}
                onSave={handleSave}
                onUnsave={handleUnsave}
              />

              <ScrollView
                style={tw`flex-1 px-5`}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={tw`pb-6`}
                keyboardShouldPersistTaps="handled"
              >
                <View style={tw`mb-6`}>
                  <AppText style={tw`text-2xl font-bold text-gray-900 mb-3`}>
                    Use the word in a sentence
                  </AppText>
                  <AppText style={tw`text-gray-600 text-base`}>
                    Write two sentences using the word naturally.
                  </AppText>
                </View>

                <View style={tw`items-center my-8`}>
                  <View style={tw`flex-row items-center gap-3`}>
                    <AppText style={tw`text-[34px] font-bold text-gray-900`}>
                      {currentWord?.word}
                    </AppText>
                    <AudioButton
                      text={currentWord?.word || ""}
                      audioUri={currentWord?.audioUrl}
                      size={24}
                    />
                  </View>
                </View>

                <View style={tw`mb-6`}>
                  <AppText style={tw`text-base font-medium text-gray-900 mb-2`}>
                    Sentence 1
                  </AppText>
                  <TextInput
                    value={currentWord?.sentence1 || ""}
                    onChangeText={(text) => updateCurrentWord({ sentence1: text })}
                    placeholder="Type your sentence here..."
                    multiline
                    numberOfLines={4}
                    style={tw`bg-white border ${
                      hasSentence1 ? "border-green-500" : "border-gray-200"
                    } rounded-2xl p-4 text-base text-gray-900 min-h-28`}
                    textAlignVertical="top"
                  />
                </View>

                <View style={tw`mb-6`}>
                  <AppText style={tw`text-base font-medium text-gray-900 mb-2`}>
                    Sentence 2
                  </AppText>
                  <TextInput
                    value={currentWord?.sentence2 || ""}
                    onChangeText={(text) => updateCurrentWord({ sentence2: text })}
                    placeholder="Type your sentence here..."
                    multiline
                    numberOfLines={4}
                    style={tw`bg-white border ${
                      hasSentence2 ? "border-green-500" : "border-gray-200"
                    } rounded-2xl p-4 text-base text-gray-900 min-h-28`}
                    textAlignVertical="top"
                  />
                </View>
              </ScrollView>

              <View style={tw`px-5 pb-6 bg-white`}>
                <TouchableOpacity
                  onPress={handleSubmitSentences}
                  disabled={!canSubmit || isSubmitting}
                  style={[
                    tw`rounded-full py-4 items-center`,
                    canSubmit && !isSubmitting ? tw`bg-green-700` : tw`bg-gray-200`,
                  ]}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <AppText
                      style={[
                        tw`text-base font-semibold`,
                        canSubmit ? tw`text-white` : tw`text-gray-400`,
                      ]}
                    >
                      {isLastWord ? "Submit" : "Next"}
                    </AppText>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return null;
}
