import { useState, useEffect, useRef } from "react";
import { View, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { AppText, Loader, Button } from "@/components/ui";
import tw from "@/lib/tw";
import { dailyFocusService, DailyFocus } from "@/services/daily-focus.service";
import { logger } from "@/utils/logger";
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import { LinearGradient } from "expo-linear-gradient";

type QuestionType = "fillInBlank" | "matching" | "multipleChoice" | "vocabulary";

interface UserAnswer {
  type: QuestionType;
  index: number;
  answer: string | number;
  isCorrect?: boolean;
}

interface Question {
  type: QuestionType;
  data: any;
  index: number;
}

export default function DailyFocusPracticeScreen() {
  const { id } = useLocalSearchParams();
  const focusId = id as string;

  const [dailyFocus, setDailyFocus] = useState<DailyFocus | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<UserAnswer[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState<string>("");
  const [showHint, setShowHint] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [isPracticeMode, setIsPracticeMode] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isSubmittingCompletion, setIsSubmittingCompletion] = useState(false);
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [startTime] = useState(Date.now());
  const [badgeUnlocked, setBadgeUnlocked] = useState<any>(null);
  const [selectedMatching, setSelectedMatching] = useState<string | null>(null);
  const [selectedMultipleChoice, setSelectedMultipleChoice] = useState<number | null>(null);

  const audioRef = useRef<Audio.Sound | null>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    fetchDailyFocus();
    
    // Cleanup audio on unmount
    return () => {
      if (audioRef.current) {
        audioRef.current.unloadAsync().catch(() => {});
        audioRef.current = null;
      }
    };
  }, [focusId]);

  // Load cached progress on mount
  useEffect(() => {
    if (dailyFocus && focusId) {
      loadProgress();
    }
  }, [dailyFocus, focusId]);

  // Auto-save progress when answers change
  useEffect(() => {
    if (dailyFocus && answers.length > 0 && !isCompleted) {
      const timeoutId = setTimeout(() => {
        saveProgress();
      }, 2000); // Save 2 seconds after last change

      return () => clearTimeout(timeoutId);
    }
  }, [answers, currentQuestionIndex, dailyFocus, isCompleted]);

  const fetchDailyFocus = async () => {
    try {
      setLoading(true);
      const data = await dailyFocusService.getById(focusId);
      setDailyFocus(data);

      // Build flat question list
      const questions: Question[] = [];

      data.fillInBlankQuestions?.forEach((q: any, i: number) => {
        questions.push({ type: "fillInBlank", data: q, index: i });
      });

      data.matchingQuestions?.forEach((q: any, i: number) => {
        questions.push({ type: "matching", data: q, index: i });
      });

      data.multipleChoiceQuestions?.forEach((q: any, i: number) => {
        questions.push({ type: "multipleChoice", data: q, index: i });
      });

      data.vocabularyQuestions?.forEach((q: any, i: number) => {
        questions.push({ type: "vocabulary", data: q, index: i });
      });

      setAllQuestions(questions);
    } catch (error: any) {
      logger.error("Failed to fetch daily focus:", error);
      Alert.alert("Error", error.message || "Failed to load practice");
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const loadProgress = async () => {
    try {
      const progress = await dailyFocusService.getProgress(focusId);

      if (progress && !progress.isCompleted) {
        setCurrentQuestionIndex(progress.currentQuestionIndex || 0);
        const restoredAnswers: UserAnswer[] = progress.answers.map((a: any) => ({
          type: a.questionType as QuestionType,
          index: a.questionIndex,
          answer: a.userAnswer,
          isCorrect: a.isCorrect,
        }));
        setAnswers(restoredAnswers);

        // Set current answer if exists
        const currentAnswerData = progress.answers.find(
          (a: any) => a.questionIndex === progress.currentQuestionIndex && !a.isSubmitted
        );
        if (currentAnswerData) {
          setCurrentAnswer(currentAnswerData.userAnswer || "");
        }
      } else if (progress?.isCompleted) {
        setIsCompleted(true);
        setIsPracticeMode(true);
        Alert.alert("Practice Mode", "You've already completed this today. This is practice mode.");
      }
    } catch (error: any) {
      logger.log("No cached progress found");
    }
  };

  const saveProgress = async () => {
    if (!dailyFocus || isCompleted) return;

    try {
      const progressAnswers = allQuestions.map((q, idx) => {
        const answer = answers.find((a) => a.index === q.index && a.type === q.type);
        return {
          questionType: q.type,
          questionIndex: q.index,
          userAnswer: answer?.answer || (idx === currentQuestionIndex ? currentAnswer : ""),
          isCorrect: answer?.isCorrect,
          isSubmitted: !!answer,
        };
      });

      await dailyFocusService.saveProgress(focusId, {
        currentQuestionIndex,
        answers: progressAnswers,
        isCompleted: false,
      });
    } catch (error: any) {
      logger.error("Failed to save progress:", error);
    }
  };

  const playAudio = async (audioUrl: string | undefined, id: string) => {
    if (!audioUrl) {
      Alert.alert("Audio not available");
      return;
    }

    try {
      // Stop current audio if playing
      if (audioRef.current) {
        await audioRef.current.unloadAsync();
        audioRef.current = null;
      }

      setPlayingAudio(id);
      const { sound } = await Audio.Sound.createAsync({ uri: audioUrl });
      audioRef.current = sound;

      await sound.playAsync();

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setPlayingAudio(null);
          sound.unloadAsync();
          audioRef.current = null;
        }
      });
    } catch (error: any) {
      logger.error("Failed to play audio:", error);
      setPlayingAudio(null);
      Alert.alert("Error", "Failed to play audio");
    }
  };

  const currentQuestion = allQuestions[currentQuestionIndex];
  const totalQuestions = allQuestions.length;
  const progress = totalQuestions > 0 ? ((currentQuestionIndex + 1) / totalQuestions) * 100 : 0;

  const handleSubmitAnswer = () => {
    if (!currentQuestion) return;

    let isCorrect = false;
    const { type, data, index } = currentQuestion;

    if (type === "fillInBlank") {
      isCorrect = currentAnswer.toLowerCase().trim() === data.correctAnswer.toLowerCase().trim();
    } else if (type === "multipleChoice") {
      isCorrect = selectedMultipleChoice === data.correctIndex;
    } else if (type === "matching") {
      // Use currentAnswer if selectedMatching is not set (text input mode)
      const answerToCheck = selectedMatching || currentAnswer;
      isCorrect = answerToCheck.toLowerCase().trim() === data.right.toLowerCase().trim();
    } else if (type === "vocabulary") {
      // For vocabulary, check if they can recall the definition
      isCorrect = currentAnswer.toLowerCase().includes(data.definition.toLowerCase().substring(0, 20));
    }

    const newAnswer: UserAnswer = {
      type,
      index,
      answer: type === "multipleChoice" ? selectedMultipleChoice! : (selectedMatching || currentAnswer),
      isCorrect,
    };

    // Remove existing answer if any
    const filteredAnswers = answers.filter((a) => !(a.index === index && a.type === type));
    setAnswers([...filteredAnswers, newAnswer]);
    setIsSubmitted(true);
    saveProgress();
  };

  const handleNext = () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      const nextIndex = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIndex);
      
      // Check if there's an existing answer for the next question
      const nextQuestion = allQuestions[nextIndex];
      if (nextQuestion) {
        const existingAnswer = answers.find(
          (a) => a.index === nextQuestion.index && a.type === nextQuestion.type
        );
        
        if (existingAnswer) {
          // Restore existing answer
          if (nextQuestion.type === "multipleChoice") {
            setSelectedMultipleChoice(existingAnswer.answer as number);
            setCurrentAnswer("");
          } else {
            setCurrentAnswer(existingAnswer.answer as string);
            if (nextQuestion.type === "matching") {
              setSelectedMatching(existingAnswer.answer as string);
            }
          }
          setIsSubmitted(true);
        } else {
          // Reset for new question
          setCurrentAnswer("");
          setSelectedMatching(null);
          setSelectedMultipleChoice(null);
          setIsSubmitted(false);
        }
      } else {
        // Reset if no next question found
        setCurrentAnswer("");
        setSelectedMatching(null);
        setSelectedMultipleChoice(null);
        setIsSubmitted(false);
      }
      
      setShowHint(false);
      saveProgress();
    } else {
      setShowResults(true);
    }
  };

  const handleComplete = async () => {
    if (!dailyFocus) return;

    const correctCount = answers.filter((a) => a.isCorrect).length;
    const score = Math.round((correctCount / totalQuestions) * 100);
    const timeSpent = Math.floor((Date.now() - startTime) / 1000);

    if (answers.length !== totalQuestions) {
      Alert.alert("Error", "Please answer all questions before submitting");
      return;
    }

    if (score < 70) {
      Alert.alert("Keep Practicing", "You need at least 70% to complete the daily focus. Keep practicing!");
      return;
    }

    if (isPracticeMode || isCompleted) {
      Alert.alert("Practice Mode", "You've already completed this today. This is practice mode.");
      return;
    }

    setIsSubmittingCompletion(true);

    try {
      const result = await dailyFocusService.complete(focusId, {
        score,
        correctAnswers: correctCount,
        totalQuestions,
        timeSpent,
        answers: answers.map((a) => ({
          questionType: a.type,
          questionIndex: a.index,
          userAnswer: a.answer,
          isCorrect: a.isCorrect,
        })),
      });

      if (result?.streakUpdated) {
        Alert.alert("Success", "Daily focus completed! Your streak has been updated! 🔥");
      } else {
        Alert.alert("Success", "Daily focus completed!");
      }

      if (result?.badgeUnlocked) {
        setBadgeUnlocked(result.badgeUnlocked);
        Alert.alert(
          "🎉 Badge Unlocked!",
          `${result.badgeUnlocked.badgeName}!`,
          [{ text: "OK" }]
        );
      }

      setIsCompleted(true);
    } catch (error: any) {
      logger.error("Failed to submit completion:", error);
      Alert.alert("Error", error.message || "Failed to submit completion");
    } finally {
      setIsSubmittingCompletion(false);
    }
  };

  const renderQuestion = () => {
    if (!currentQuestion) return null;

    const { type, data, index } = currentQuestion;
    const existingAnswer = answers.find((a) => a.index === index && a.type === type);

    switch (type) {
      case "fillInBlank":
        const sentenceParts = data.sentence.split("___");
        return (
          <View style={tw`space-y-4`}>
            <View style={tw`bg-gray-50 rounded-2xl p-4 mb-4`}>
              <View style={tw`flex-row flex-wrap items-center`}>
                {sentenceParts.map((part: string, i: number) => (
                  <View key={i} style={tw`flex-row items-center`}>
                    <AppText style={tw`text-base text-gray-900`}>{part}</AppText>
                    {i < sentenceParts.length - 1 && (
                      <View style={tw`mx-2 border-b-2 border-green-500 min-w-[80px]`}>
                        <TextInput
                          value={isSubmitted ? (existingAnswer?.answer as string) || "" : currentAnswer}
                          onChangeText={setCurrentAnswer}
                          placeholder="?"
                          editable={!isSubmitted}
                          style={tw`text-base text-gray-900 text-center py-1`}
                        />
                      </View>
                    )}
                  </View>
                ))}
                {data.sentenceAudioUrl && (
                  <TouchableOpacity
                    onPress={() => playAudio(data.sentenceAudioUrl, `fib-sentence-${currentQuestion.index}`)}
                    style={tw`ml-2 bg-green-600 rounded-full w-10 h-10 items-center justify-center`}
                  >
                    {playingAudio === `fib-sentence-${currentQuestion.index}` ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <Ionicons name="volume-high" size={20} color="white" />
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {data.options && data.options.length > 0 && (
              <View style={tw`flex-row flex-wrap gap-2 mb-4`}>
                {data.options.map((option: string, optIdx: number) => {
                  const isSelected = currentAnswer === option;
                  return (
                    <TouchableOpacity
                      key={optIdx}
                      onPress={() => !isSubmitted && setCurrentAnswer(option)}
                      style={[
                        tw`px-4 py-3 rounded-xl border-2`,
                        isSelected
                          ? tw`bg-green-100 border-green-500`
                          : tw`bg-white border-gray-300`,
                        isSubmitted && tw`opacity-60`,
                      ]}
                      disabled={isSubmitted}
                    >
                      <AppText
                        style={[
                          tw`font-medium`,
                          isSelected ? tw`text-green-700` : tw`text-gray-900`,
                        ]}
                      >
                        {option}
                      </AppText>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {data.hint && (
              <TouchableOpacity
                onPress={() => setShowHint(!showHint)}
                style={tw`bg-yellow-50 border border-yellow-200 rounded-xl p-3`}
              >
                <AppText style={tw`text-sm text-yellow-700`}>
                  💡 {showHint ? data.hint : "Show Hint"}
                </AppText>
              </TouchableOpacity>
            )}

            {isSubmitted && existingAnswer && (
              <View
                style={[
                  tw`rounded-xl p-4`,
                  existingAnswer.isCorrect ? tw`bg-green-50` : tw`bg-red-50`,
                ]}
              >
                <AppText
                  style={[
                    tw`font-semibold mb-2`,
                    existingAnswer.isCorrect ? tw`text-green-700` : tw`text-red-700`,
                  ]}
                >
                  {existingAnswer.isCorrect ? "✓ Correct!" : "✗ Incorrect"}
                </AppText>
                {data.explanation && (
                  <AppText
                    style={[
                      tw`text-sm`,
                      existingAnswer.isCorrect ? tw`text-green-600` : tw`text-red-600`,
                    ]}
                  >
                    {data.explanation}
                  </AppText>
                )}
              </View>
            )}
          </View>
        );

      case "multipleChoice":
        return (
          <View style={tw`space-y-4`}>
            <View style={tw`bg-gray-50 rounded-2xl p-4 mb-4`}>
              <AppText style={tw`text-base text-gray-900 font-semibold mb-2`}>
                {data.question}
              </AppText>
              {data.questionAudioUrl && (
                <TouchableOpacity
                  onPress={() => playAudio(data.questionAudioUrl, `question-${currentQuestionIndex}`)}
                  style={tw`bg-green-600 rounded-full w-10 h-10 items-center justify-center mt-2`}
                >
                  {playingAudio === `question-${currentQuestionIndex}` ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Ionicons name="volume-high" size={20} color="white" />
                  )}
                </TouchableOpacity>
              )}
            </View>

            <View style={tw`gap-2 mb-4`}>
              {data.options.map((option: string, optIdx: number) => {
                const isSelected = selectedMultipleChoice === optIdx;
                const isCorrect = optIdx === data.correctIndex;
                const showResult = isSubmitted && existingAnswer;

                return (
                  <TouchableOpacity
                    key={optIdx}
                    onPress={() => !isSubmitted && setSelectedMultipleChoice(optIdx)}
                    style={[
                      tw`px-4 py-4 rounded-xl border-2`,
                      isSelected && !showResult
                        ? tw`bg-green-100 border-green-500`
                        : showResult && isCorrect
                        ? tw`bg-green-50 border-green-500`
                        : showResult && isSelected && !isCorrect
                        ? tw`bg-red-50 border-red-500`
                        : tw`bg-white border-gray-300`,
                      isSubmitted && tw`opacity-60`,
                    ]}
                    disabled={isSubmitted}
                  >
                    <View style={tw`flex-row items-center justify-between`}>
                      <AppText
                        style={[
                          tw`font-medium flex-1`,
                          isSelected ? tw`text-green-700` : tw`text-gray-900`,
                        ]}
                      >
                        {option}
                      </AppText>
                      {showResult && isCorrect && (
                        <Ionicons name="checkmark-circle" size={24} color="#22c55e" />
                      )}
                      {showResult && isSelected && !isCorrect && (
                        <Ionicons name="close-circle" size={24} color="#ef4444" />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {data.hint && (
              <TouchableOpacity
                onPress={() => setShowHint(!showHint)}
                style={tw`bg-yellow-50 border border-yellow-200 rounded-xl p-3`}
              >
                <AppText style={tw`text-sm text-yellow-700`}>
                  💡 {showHint ? data.hint : "Show Hint"}
                </AppText>
              </TouchableOpacity>
            )}

            {isSubmitted && existingAnswer && data.explanation && (
              <View style={tw`bg-blue-50 rounded-xl p-4`}>
                <AppText style={tw`text-sm text-blue-700`}>{data.explanation}</AppText>
              </View>
            )}
          </View>
        );

      case "matching":
        // For matching, we need to show the left item and provide options
        // In a real implementation, you might have multiple options to choose from
        // For now, we'll show the left item and a text input or single option
        return (
          <View style={tw`space-y-4`}>
            <View style={tw`bg-gray-50 rounded-2xl p-4 mb-4`}>
              <AppText style={tw`text-base text-gray-900 font-semibold mb-2`}>
                Match the following:
              </AppText>
              <View style={tw`flex-row items-center justify-between`}>
                <AppText style={tw`text-lg text-gray-900 flex-1`}>{data.left}</AppText>
                {data.leftAudioUrl && (
                  <TouchableOpacity
                    onPress={() => playAudio(data.leftAudioUrl, `left-${currentQuestionIndex}`)}
                    style={tw`ml-2 bg-green-600 rounded-full w-10 h-10 items-center justify-center`}
                  >
                    {playingAudio === `left-${currentQuestionIndex}` ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <Ionicons name="volume-high" size={20} color="white" />
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <View style={tw`mb-4`}>
              <AppText style={tw`text-sm font-semibold text-gray-700 mb-2`}>
                What matches with "{data.left}"?
              </AppText>
              <TextInput
                value={isSubmitted ? (existingAnswer?.answer as string) || "" : (selectedMatching || currentAnswer)}
                onChangeText={(text) => {
                  setCurrentAnswer(text);
                  setSelectedMatching(text);
                }}
                placeholder="Type the matching word/phrase..."
                editable={!isSubmitted}
                style={tw`bg-white border border-gray-300 rounded-xl p-4 text-base text-gray-900`}
              />
            </View>

            {data.hint && (
              <TouchableOpacity
                onPress={() => setShowHint(!showHint)}
                style={tw`bg-yellow-50 border border-yellow-200 rounded-xl p-3`}
              >
                <AppText style={tw`text-sm text-yellow-700`}>
                  💡 {showHint ? data.hint : "Show Hint"}
                </AppText>
              </TouchableOpacity>
            )}

            {isSubmitted && existingAnswer && (
              <View
                style={[
                  tw`rounded-xl p-4`,
                  existingAnswer.isCorrect ? tw`bg-green-50` : tw`bg-red-50`,
                ]}
              >
                <AppText
                  style={[
                    tw`font-semibold mb-2`,
                    existingAnswer.isCorrect ? tw`text-green-700` : tw`text-red-700`,
                  ]}
                >
                  {existingAnswer.isCorrect ? "✓ Correct!" : "✗ Incorrect"}
                </AppText>
                {data.explanation && (
                  <AppText
                    style={[
                      tw`text-sm`,
                      existingAnswer.isCorrect ? tw`text-green-600` : tw`text-red-600`,
                    ]}
                  >
                    {data.explanation}
                  </AppText>
                )}
              </View>
            )}
          </View>
        );

      case "vocabulary":
        return (
          <View style={tw`space-y-4`}>
            <View style={tw`bg-gray-50 rounded-2xl p-4 mb-4`}>
              <View style={tw`flex-row items-center justify-between mb-2`}>
                <AppText style={tw`text-xl font-bold text-gray-900`}>{data.word}</AppText>
                {data.wordAudioUrl && (
                  <TouchableOpacity
                    onPress={() => playAudio(data.wordAudioUrl, `word-${currentQuestionIndex}`)}
                    style={tw`bg-green-600 rounded-full w-10 h-10 items-center justify-center`}
                  >
                    {playingAudio === `word-${currentQuestionIndex}` ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <Ionicons name="volume-high" size={20} color="white" />
                    )}
                  </TouchableOpacity>
                )}
              </View>
              {data.pronunciation && (
                <AppText style={tw`text-sm text-gray-600 mb-2`}>
                  {data.pronunciation}
                </AppText>
              )}
              {data.exampleSentence && (
                <AppText style={tw`text-sm text-gray-700 italic`}>
                  Example: {data.exampleSentence}
                </AppText>
              )}
            </View>

            <View style={tw`mb-4`}>
              <AppText style={tw`text-sm font-semibold text-gray-700 mb-2`}>
                What is the definition?
              </AppText>
              <TextInput
                value={isSubmitted ? (existingAnswer?.answer as string) || "" : currentAnswer}
                onChangeText={setCurrentAnswer}
                placeholder="Type the definition..."
                editable={!isSubmitted}
                multiline
                style={tw`bg-white border border-gray-300 rounded-xl p-4 min-h-[100px] text-base text-gray-900`}
              />
            </View>

            {data.hint && (
              <TouchableOpacity
                onPress={() => setShowHint(!showHint)}
                style={tw`bg-yellow-50 border border-yellow-200 rounded-xl p-3`}
              >
                <AppText style={tw`text-sm text-yellow-700`}>
                  💡 {showHint ? data.hint : "Show Hint"}
                </AppText>
              </TouchableOpacity>
            )}

            {isSubmitted && existingAnswer && (
              <View style={tw`bg-blue-50 rounded-xl p-4`}>
                <AppText style={tw`text-sm font-semibold text-blue-700 mb-2`}>
                  Definition: {data.definition}
                </AppText>
                {data.explanation && (
                  <AppText style={tw`text-sm text-blue-600`}>{data.explanation}</AppText>
                )}
              </View>
            )}
          </View>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={tw`flex-1 bg-white items-center justify-center`}>
        <Loader />
      </SafeAreaView>
    );
  }

  if (!dailyFocus) {
    return (
      <SafeAreaView style={tw`flex-1 bg-white items-center justify-center px-5`}>
        <AppText style={tw`text-gray-600 text-center`}>
          Daily focus not found
        </AppText>
      </SafeAreaView>
    );
  }

  if (showResults) {
    const correctCount = answers.filter((a) => a.isCorrect).length;
    const score = Math.round((correctCount / totalQuestions) * 100);

    return (
      <SafeAreaView style={tw`flex-1 bg-white`} edges={["top", "bottom"]}>
        <ScrollView style={tw`flex-1`} contentContainerStyle={tw`px-5 py-6`}>
          <View style={tw`items-center mb-6`}>
            <AppText style={tw`text-3xl font-bold text-gray-900 mb-2`}>
              {score >= 70 ? "🎉 Great Job!" : "Keep Practicing!"}
            </AppText>
            <AppText style={tw`text-2xl font-semibold text-gray-700 mb-4`}>
              Score: {score}%
            </AppText>
            <AppText style={tw`text-base text-gray-600`}>
              {correctCount} out of {totalQuestions} correct
            </AppText>
          </View>

          {score >= 70 && !isPracticeMode && (
            <Button
              onPress={handleComplete}
              variant="primary"
              disabled={isSubmittingCompletion}
              loading={isSubmittingCompletion}
              style={tw`w-full mb-4`}
            >
              <AppText style={tw`text-white font-semibold text-base`}>
                Complete Daily Focus
              </AppText>
            </Button>
          )}

          <Button
            onPress={() => router.back()}
            variant="outline"
            style={tw`w-full`}
          >
            <AppText style={tw`text-gray-700 font-semibold text-base`}>
              Back to Home
            </AppText>
          </Button>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={tw`flex-1 bg-white`} edges={["top"]}>
      <KeyboardAvoidingView
        style={tw`flex-1`}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? insets.top : 0}
      >
        {/* Header */}
        <LinearGradient
        colors={['#16a34a', '#10b981']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={tw`px-5 py-4`}
      >
        <View style={tw`flex-row items-center justify-between mb-3`}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <View style={tw`flex-1 ml-4`}>
            <AppText style={tw`text-sm text-green-100`}>Today's Focus</AppText>
            <AppText style={tw`text-lg font-bold text-white`}>
              {dailyFocus.title}
            </AppText>
          </View>
        </View>

        {/* Progress bar */}
        <View style={tw`flex-row items-center gap-3`}>
          <View style={tw`flex-1 bg-white/20 rounded-full h-2`}>
            <View
              style={[
                tw`bg-white rounded-full h-2`,
                { width: `${progress}%` },
              ]}
            />
          </View>
          <AppText style={tw`text-sm font-medium text-white`}>
            {currentQuestionIndex + 1}/{totalQuestions}
          </AppText>
        </View>
      </LinearGradient>

        <ScrollView
          style={tw`flex-1`}
          contentContainerStyle={tw`px-5 py-6`}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          {renderQuestion()}
        </ScrollView>

        {/* Footer Actions */}
        <View style={[tw`px-5 bg-white border-t border-gray-200`, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        {!isSubmitted ? (
          <Button
            onPress={handleSubmitAnswer}
            variant="primary"
            disabled={
              currentQuestion?.type === "fillInBlank" && !currentAnswer.trim() ||
              currentQuestion?.type === "vocabulary" && !currentAnswer.trim() ||
              currentQuestion?.type === "matching" && !currentAnswer.trim() && !selectedMatching ||
              currentQuestion?.type === "multipleChoice" && selectedMultipleChoice === null
            }
            style={tw`w-full`}
          >
            <AppText style={tw`text-white font-semibold text-base`}>
              Submit Answer
            </AppText>
          </Button>
        ) : (
          <Button
            onPress={handleNext}
            variant="primary"
            style={tw`w-full`}
          >
            <AppText style={tw`text-white font-semibold text-base`}>
              {currentQuestionIndex < totalQuestions - 1 ? "Next Question" : "View Results"}
            </AppText>
          </Button>
        )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

