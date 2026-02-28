import AITutorMessage from "@/components/drills/AITutorMessage";
import DrillHeader from "@/components/drills/DrillHeader";
import { AppText, Loader } from "@/components/ui";
import { getDrillById, completeDrill } from "@/services/drill.service";
import { Drill } from "@/types/drill.types";
import tw from "@/lib/tw";
import { useLocalSearchParams, router } from "expo-router";
import { useEffect, useState, useRef } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useActivityStore } from "@/store/activity-store";
import { logger } from "@/utils/logger";

interface BlankAnswer {
  position: number;
  selectedAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
}

export default function FillBlankDrill() {
  const params = useLocalSearchParams();
  const drillId = params.id as string;
  const assignmentId = params.assignmentId as string | undefined;

  const { drillProgress, updateDrillProgress, addRecentActivity, clearDrillProgress } = useActivityStore();
  const startTimeRef = useRef(Date.now());

  const [drill, setDrill] = useState<Drill | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, Record<number, string>>>({});
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
      setCurrentIndex(currentIndex + 1);
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    if (!drill) return;

    setIsSubmitting(true);
    try {
      const fillBlankResults = {
        items: items.map((item, itemIndex) => {
          const itemAnswers = answers[itemIndex] || {};
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

      const totalBlanks = fillBlankResults.items.reduce(
        (sum, item) => sum + item.blanks.length,
        0
      );
      const correctBlanks = fillBlankResults.items.reduce(
        (sum, item) => sum + item.blanks.filter((b) => b.isCorrect).length,
        0
      );
      const score = totalBlanks > 0 ? Math.round((correctBlanks / totalBlanks) * 100) : 0;
      const timeSpent = Math.floor((Date.now() - startTimeRef.current) / 1000);

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
            You've completed the fill-in-the-blank drill.
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

