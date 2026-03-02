import DrillCompletedScreen from "@/components/drills/DrillCompletedScreen";
import DrillHeader from "@/components/drills/DrillHeader";
import AudioButton from "@/components/drills/AudioButton";
import { AppText, Loader } from "@/components/ui";
import { getDrillById, completeDrill } from "@/services/drill.service";
import { useSaveDrill } from "@/hooks/useSaveDrill";
import { Drill } from "@/types/drill.types";
import tw from "@/lib/tw";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState, useRef } from "react";
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
import Svg, { Path } from "react-native-svg";
import { logger } from "@/utils/logger";

type SectionType = 'intro' | 'definition' | 'sentences';

type WordProgress = {
  word: string;
  phonetic: string;
  definition: string;
  sentence1: string;
  sentence2: string;
};

export default function SentenceWritingDrill() {
  const params = useLocalSearchParams();
  const drillId = params.id as string;
  const assignmentId = params.assignmentId as string | undefined;

  const { drillProgress, updateDrillProgress, addRecentActivity, clearDrillProgress } = useActivityStore();
  const startTimeRef = useRef(Date.now());
  const { isSaved, handleSave, handleUnsave } = useSaveDrill(drillId);

  const [drill, setDrill] = useState<Drill | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Paging state
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [currentSection, setCurrentSection] = useState<SectionType>('intro');
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
        data: { wordProgressList, currentWordIndex, currentSection },
        startTime: startTimeRef.current,
        lastUpdated: Date.now(),
      });
    }
  }, [wordProgressList, currentWordIndex, currentSection, drill]);

  useEffect(() => {
    loadDrill();
  }, [drillId]);

  const loadDrill = async () => {
    try {
      setLoading(true);
      const drillData = await getDrillById(drillId, assignmentId);
      setDrill(drillData);

      // Initialize word progress list
      // Priority: sentence_writing_items (for sentence_writing drills) > target_sentences (fallback)
      let words: any[] = [];

      if (drillData.sentence_writing_items && drillData.sentence_writing_items.length > 0) {
        // Use sentence_writing_items (has word and optional hint)
        words = drillData.sentence_writing_items;
      } else if (drillData.target_sentences && drillData.target_sentences.length > 0) {
        // Fallback to target_sentences (for backward compatibility)
        words = drillData.target_sentences;
      }

      const initialProgress: WordProgress[] = words.map((item: any) => {
        // Handle sentence_writing_items structure: { word: string, hint?: string }
        // Handle target_sentences structure: { word?: string, text?: string, phonetic?: string, ... }
        const word = item.word || item.text?.split(' ')[0] || "Word";
        const phonetic = item.phonetic || "/ˈwɜːrd/"; // Default phonetic if not provided

        return {
          word,
          phonetic,
          definition: '',
          sentence1: '',
          sentence2: '',
        };
      });

      if (initialProgress.length === 0) {
        logger.warn('⚠️ No words found in sentence_writing drill');
      }

      setWordProgressList(initialProgress);
    } catch (error) {
      logger.error('❌ Failed to load drill:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateCurrentWord = (updates: Partial<WordProgress>) => {
    setWordProgressList(prev => {
      const newList = [...prev];
      newList[currentWordIndex] = { ...newList[currentWordIndex], ...updates };
      return newList;
    });
  };

  const handleContinueFromIntro = () => {
    setCurrentSection('definition');
  };

  const handleNextFromDefinition = () => {
    const currentWord = wordProgressList[currentWordIndex];
    if (!currentWord.definition.trim()) {
      Alert.alert("Required", "Please write the word definition before continuing.");
      return;
    }
    setCurrentSection('sentences');
  };

  const handleSubmitSentences = async () => {
    const currentWord = wordProgressList[currentWordIndex];

    if (!currentWord.sentence1.trim() || !currentWord.sentence2.trim()) {
      Alert.alert("Required", "Please write both sentences before submitting.");
      return;
    }

    // Move to next word or complete drill
    if (currentWordIndex < wordProgressList.length - 1) {
      setCurrentWordIndex(prev => prev + 1);
      setCurrentSection('intro'); // Reset to intro for next word
    } else {
      // All words completed - submit drill
      await submitDrill();
    }
  };

  const submitDrill = async () => {
    if (!drill) return;

    setIsSubmitting(true);
    try {
      const timeSpent = Math.floor((Date.now() - startTimeRef.current) / 1000);

      // Build sentenceResults structure matching backend schema
      // The schema expects: word, definition, sentences[], words[], reviewStatus
      if (wordProgressList.length === 0) {
        Alert.alert("Error", "No words to submit. Please try again.");
        setIsSubmitting(false);
        return;
      }

      const firstWord = wordProgressList[0];
      const sentenceResults = {
        // Legacy single word format (required)
        word: firstWord?.word || "",
        definition: firstWord?.definition?.trim() || "",
        sentences: firstWord ? [
          { text: firstWord.sentence1?.trim() || "", index: 0 },
          { text: firstWord.sentence2?.trim() || "", index: 1 },
        ] : [],
        // Multiple words format (required)
        words: wordProgressList.map((wp) => ({
          word: wp.word,
          definition: wp.definition.trim() || "",
          sentences: [
            { text: wp.sentence1.trim() || "", index: 0 },
            { text: wp.sentence2.trim() || "", index: 1 },
          ],
        })),
        // Review status (required)
        reviewStatus: "pending" as const,
      };

      await completeDrill(drillId, {
        drillAssignmentId: assignmentId,
        score: 0, // Score will be set after review
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
        score: 0, // Pending review
      });

      clearDrillProgress(drillId);
    } catch (error: any) {
      logger.error('Failed to submit drill:', error);
      Alert.alert("Error", "Failed to submit. Please try again.");
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

  if (!drill) {
    return (
      <SafeAreaView style={tw`flex-1 bg-white items-center justify-center px-5`}>
        <AppText style={tw`text-gray-600 text-center`}>Drill not found</AppText>
      </SafeAreaView>
    );
  }

  // Check if no words are available
  if (wordProgressList.length === 0) {
    return (
      <SafeAreaView style={tw`flex-1 bg-white items-center justify-center px-5`}>
        <AppText style={tw`text-gray-600 text-center mb-2`}>
          No words found in this drill
        </AppText>
        <AppText style={tw`text-sm text-gray-500 text-center`}>
          This drill may not be configured correctly. Please contact your tutor.
        </AppText>
      </SafeAreaView>
    );
  }

  // Success Screen
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

  // INTRO SECTION - Show word with phonetic
  if (currentSection === 'intro') {
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
              Hello Amy 👋!
            </AppText>
            <AppText style={tw`text-gray-600 text-base`}>
              Take a moment to understand the word before writing.
            </AppText>
          </View>

          <View style={tw`items-center my-16`}>
            <AppText style={tw`text-[34px] font-bold text-gray-900 mb-3`}>
              {currentWord?.word}
            </AppText>

            <AppText style={tw`text-gray-500 text-lg mb-6`}>
              {currentWord?.phonetic}
            </AppText>

            <View style={tw`flex-row items-center gap-3`}>
              <TouchableOpacity style={tw`w-8 h-8 items-center justify-center`}>
                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M12.87 15.07l-2.54-2.51.03-.03A6.002 6.002 0 007 6.5 6 6 0 1019 6.5c0 1.64-.66 3.12-1.73 4.19l.03.03-2.54 2.51L12 15.99l-2.76-2.76 2.5-2.5A4 4 0 0017 6.5a4 4 0 10-8 0c0 1.3.62 2.45 1.58 3.19l2.5 2.5-2.76 2.76L12 12.19z"
                    fill="#6B7280"
                  />
                </Svg>
              </TouchableOpacity>
              <AudioButton
                text={currentWord?.word || ""}
                size={24}
              />
            </View>
          </View>
        </ScrollView>

        <View style={tw`px-5 pb-6`}>
          <TouchableOpacity
            onPress={handleContinueFromIntro}
            style={tw`bg-green-700 rounded-full py-4 items-center`}
          >
            <AppText style={tw`text-white text-base font-semibold`}>
              Continue
            </AppText>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // DEFINITION SECTION
  if (currentSection === 'definition') {
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
                    Explain the meaning in your own words. You can use a dictionary or the web for definition.
                  </AppText>
                </View>

                <View style={tw`items-center my-12`}>
                  <AppText style={tw`text-[34px] font-bold text-gray-900 mb-3`}>
                    {currentWord?.word}
                  </AppText>

                  <AppText style={tw`text-gray-500 text-base mb-6`}>
                    {currentWord?.phonetic}
                  </AppText>

                  <View style={tw`flex-row items-center gap-3`}>
                    <TouchableOpacity style={tw`w-8 h-8 items-center justify-center`}>
                      <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                        <Path
                          d="M12.87 15.07l-2.54-2.51.03-.03A6.002 6.002 0 007 6.5 6 6 0 1019 6.5c0 1.64-.66 3.12-1.73 4.19l.03.03-2.54 2.51L12 15.99l-2.76-2.76 2.5-2.5A4 4 0 0017 6.5a4 4 0 10-8 0c0 1.3.62 2.45 1.58 3.19l2.5 2.5-2.76 2.76L12 12.19z"
                          fill="#6B7280"
                        />
                      </Svg>
                    </TouchableOpacity>
                    <AudioButton
                      text={currentWord?.word || ""}
                      size={24}
                    />
                  </View>
                </View>

                <TextInput
                  value={currentWord?.definition || ''}
                  onChangeText={(text) => updateCurrentWord({ definition: text })}
                  placeholder="Type the meaning here..."
                  multiline
                  numberOfLines={6}
                  style={tw`bg-gray-50 rounded-2xl p-4 text-base text-gray-900 min-h-40 mb-4`}
                  textAlignVertical="top"
                />

                <AppText style={tw`text-sm text-gray-600`}>
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

  // SENTENCES SECTION
  if (currentSection === 'sentences') {
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
                      size={24}
                    />
                  </View>
                </View>

                <View style={tw`mb-6`}>
                  <AppText style={tw`text-base font-medium text-gray-900 mb-2`}>
                    Sentence 1
                  </AppText>
                  <TextInput
                    value={currentWord?.sentence1 || ''}
                    onChangeText={(text) => updateCurrentWord({ sentence1: text })}
                    placeholder="Type your sentence here..."
                    multiline
                    numberOfLines={4}
                    style={tw`bg-white border ${hasSentence1 ? 'border-green-500' : 'border-gray-200'} rounded-2xl p-4 text-base text-gray-900 min-h-28`}
                    textAlignVertical="top"
                  />
                </View>

                <View style={tw`mb-6`}>
                  <AppText style={tw`text-base font-medium text-gray-900 mb-2`}>
                    Sentence 2
                  </AppText>
                  <TextInput
                    value={currentWord?.sentence2 || ''}
                    onChangeText={(text) => updateCurrentWord({ sentence2: text })}
                    placeholder="Type your sentence here..."
                    multiline
                    numberOfLines={4}
                    style={tw`bg-white border ${hasSentence2 ? 'border-green-500' : 'border-gray-200'} rounded-2xl p-4 text-base text-gray-900 min-h-28`}
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
                      {isLastWord ? 'Submit' : 'Next'}
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