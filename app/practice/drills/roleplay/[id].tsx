import AITutorMessage from "@/components/drills/AITutorMessage";
import DrillCompletedScreen from "@/components/drills/DrillCompletedScreen";
import SpeechAnalysisReview from "@/components/drills/SpeechAnalysisReview";
import type { AnalysisResult } from "@/components/drills/SpeechAnalysisReview";
import DrillHeader from "@/components/drills/DrillHeader";
import RecordButton from "@/components/drills/RecordButton";
import UserMessage from "@/components/drills/UserMessage";
import AudioButton from "@/components/drills/AudioButton";
import { AppText, Loader } from "@/components/ui";
import tw from "@/lib/tw";
import { Drill } from "@/types/drill.types";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState, useRef } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, View, TouchableOpacity } from "react-native";
import { Alert } from '@/utils/alert';
import { setAudioModeSafely } from '@/utils/audio';
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system/legacy";

import { getDrillById, completeDrill } from "@/services/drill.service";
import { useSaveDrill } from "@/hooks/useSaveDrill";
import { useActivityStore } from "@/store/activity-store";
import { speechaceService, extractTextScore, extractQualityScore } from "@/services/speechace.service";
import { logger } from "@/utils/logger";

interface Message {
  id: string;
  type: "ai" | "user";
  content: string;
  needsRetry?: boolean;
  feedback?: string;
  pronunciationScore?: number;
}

export default function RoleplayDrill() {
  const params = useLocalSearchParams();
  const drillId = params.id as string;
  const assignmentId = params.assignmentId as string | undefined;

  const { drillProgress, updateDrillProgress, addRecentActivity, clearDrillProgress } = useActivityStore();
  const startTimeRef = useRef(Date.now());
  const scrollViewRef = useRef<ScrollView>(null);
  const timeoutRefs = useRef<ReturnType<typeof setTimeout>[]>([]);

  const [drill, setDrill] = useState<Drill | null>(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentStep, setCurrentStep] = useState(1);
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [currentDialogueIndex, setCurrentDialogueIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [showYourTurn, setShowYourTurn] = useState(true);
  const [currentPrompt, setCurrentPrompt] = useState("");
  const { isSaved, handleSave, handleUnsave } = useSaveDrill(drillId);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordedAudioUri, setRecordedAudioUri] = useState<string | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [permissionResponse, requestPermission] = Audio.usePermissions();
  const [isDrillCompleted, setIsDrillCompleted] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult[]>([]);

  // Restore progress if available
  useEffect(() => {
    if (drillId && drillProgress[drillId]) {
      const saved = drillProgress[drillId];
      if (saved.data?.messages) {
        setMessages(saved.data.messages);
      }
      if (saved.currentStep) {
        setCurrentStep(saved.currentStep);
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

  // Save progress on change
  useEffect(() => {
    if (drill && messages.length > 0) {
      updateDrillProgress({
        drillId,
        title: drill.title,
        type: drill.type,
        currentStep,
        totalSteps: drill.roleplay_scenes?.reduce((total, scene) => {
          return total + (scene.dialogue?.filter(d => d.speaker === "student").length || 0);
        }, 0) || 5,
        answers: [],
        data: { messages },
        startTime: startTimeRef.current,
        lastUpdated: Date.now(),
      });
    }
  }, [currentStep, messages, drill]);

  // Auto-scroll when messages change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [messages, showYourTurn, isListening, recordedAudioUri]);

  // Cleanup sound on unmount
  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
      if (recording) {
        stopRecording();
      }
    };
  }, [sound, recording]);

  useEffect(() => {
    loadDrill();
  }, [drillId]);

  const loadDrill = async () => {
    try {
      setLoading(true);
      logger.log('🔄 Loading drill:', drillId, assignmentId ? `with assignment ${assignmentId}` : '');
      const drillData = await getDrillById(drillId, assignmentId);
      logger.log('✅ Drill loaded:', drillData.title);

      setDrill(drillData);

      // Only initialize messages if we didn't restore them
      if (messages.length === 0) {
        const scenes = drillData.roleplay_scenes || [];
        if (scenes.length > 0 && scenes[0]) {
          const firstScene = scenes[0];
          const dialogueArray = firstScene?.dialogue || [];

          // Find first AI dialogue (usually index 0)
          const firstAIDialogue = dialogueArray.find((d) => d.speaker !== "student");

          if (firstAIDialogue) {
            const initialMessages: Message[] = [{
              id: `ai-${Date.now()}-0`,
              type: "ai" as const,
              content: firstAIDialogue.text,
            }];
            setMessages(initialMessages);

            // Find the first student response (the one that comes after the first AI message)
            const firstAIIndex = dialogueArray.findIndex(d => d.speaker !== "student");
            const firstStudentResponse = dialogueArray.find((d, i) =>
              i > firstAIIndex && d.speaker === "student"
            );

            if (firstStudentResponse) {
              setCurrentPrompt(firstStudentResponse.text);
              // Set the dialogue index to the student response
              setCurrentDialogueIndex(dialogueArray.findIndex(d => d === firstStudentResponse));
            }
          }
        }
      }

    } catch (error) {
      logger.error('❌ Failed to load drill:', error);
    } finally {
      setLoading(false);
    }
  };

  async function startRecording() {
    try {
      if (permissionResponse?.status !== 'granted') {
        logger.log('Requesting permission..');
        await requestPermission();
      }

      await setAudioModeSafely({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      logger.log('Starting recording..');
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
      setIsRecording(true);
      setShowYourTurn(false);
      setRecordedAudioUri(null); // Clear any previous recording
      logger.log('Recording started');
    } catch (err) {
      logger.error('Failed to start recording', err);
      Alert.alert("Error", "Failed to start recording. Please check microphone permissions.");
    }
  }

  async function stopRecording() {
    logger.log('Stopping recording..');
    if (!recording) {
      logger.log('No recording to stop');
      setIsRecording(false);
      return;
    }

    // Store reference before clearing state
    const recordingToStop = recording;
    setRecording(null);
    setIsRecording(false);

    try {
      // Check if recording still exists and has the method
      if (recordingToStop && typeof recordingToStop.stopAndUnloadAsync === 'function') {
        await recordingToStop.stopAndUnloadAsync();
        const uri = recordingToStop.getURI();
        logger.log('Recording stopped and stored at', uri);

        if (uri) {
          setRecordedAudioUri(uri);
          setShowYourTurn(true); // Show the preview UI
        }
      } else {
        logger.warn('Recording object is invalid or already stopped');
        setShowYourTurn(true);
      }
    } catch (error: any) {
      logger.error('Error stopping recording:', error);
      // Don't show alert for "Recorder does not exist" - it's usually harmless
      if (error?.message?.includes('Recorder does not exist')) {
        logger.log('Recording was already stopped or cleaned up');
        setShowYourTurn(true);
      } else {
        Alert.alert("Error", "Failed to stop recording. Please try again.");
      }
    }
  }

  async function playRecordingPreview() {
    if (!recordedAudioUri) return;

    try {
      // Unload previous sound if any
      if (sound) {
        await sound.unloadAsync();
      }

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: recordedAudioUri },
        { shouldPlay: true }
      );

      setSound(newSound);
      setIsPlayingPreview(true);

      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setIsPlayingPreview(false);
        }
      });
    } catch (error) {
      logger.error('Error playing preview:', error);
      Alert.alert("Error", "Failed to play recording preview.");
    }
  }

  async function deleteRecording() {
    if (sound) {
      await sound.unloadAsync();
      setSound(null);
    }
    setRecordedAudioUri(null);
    setIsPlayingPreview(false);
  }

  async function submitRecording() {
    if (!recordedAudioUri || !currentPrompt) return;

    setIsListening(true);
    setProcessing(true);
    setShowYourTurn(false);

    try {
      // Convert to base64 using legacy API
      const base64 = await FileSystem.readAsStringAsync(recordedAudioUri, {
        encoding: (FileSystem as any).EncodingType?.Base64 || 'base64',
      });

      logger.log('Analyzing pronunciation for:', currentPrompt);

      // Call SpeechAce
      const result = await speechaceService.scorePronunciation(currentPrompt, base64);
      logger.log('SpeechAce Result:', result);

      // Check for "No speech detected" error
      if (result.status === 'error' && result.short_message === 'error_no_speech') {
        setIsListening(false);
        setProcessing(false);
        setRecordedAudioUri(null);
        Alert.alert(
          "No Speech Detected",
          "We couldn't detect any speech in your recording. Please try again and speak clearly.",
          [{ text: "OK", onPress: () => setShowYourTurn(true) }]
        );
        return;
      }

      // Extract full text score for analysis review
      const textScore = extractTextScore(result);
      const qualityScore = extractQualityScore(result);

      logger.log('Final Quality Score:', qualityScore);

      // Save analysis result for the review screen
      setAnalysisResults((prev) => [
        ...prev,
        { text: currentPrompt, score: qualityScore, textScore },
      ]);

      setIsListening(false);
      setProcessing(false);
      setRecordedAudioUri(null);

      if (qualityScore >= 80) {
        handleSuccess(qualityScore);
      } else {
        handleFailure(qualityScore);
      }
    } catch (error) {
      logger.error('Error processing audio:', error);
      setIsListening(false);
      setProcessing(false);
      setRecordedAudioUri(null);
      Alert.alert("Error", "Failed to process audio. Please try again.");
    }
  }

  const handleSuccess = (score: number) => {
    // Add user message
    const userMessage: Message = {
      id: `user-${Date.now()}-${currentStep}`,
      type: "user",
      content: currentPrompt || "User response from recording",
      pronunciationScore: score,
    };
    setMessages(prev => [...prev, userMessage]);
    setShowYourTurn(false);

    // Add AI response after delay
    // Store timeout ID for cleanup if component unmounts
    const timeoutId = setTimeout(() => {
      const scenes = drill?.roleplay_scenes || [];
      if (scenes.length === 0 || !scenes[currentSceneIndex]) {
        handleDrillComplete();
        return;
      }

      // Use a local variable to track scene changes
      let workingSceneIndex = currentSceneIndex;
      let currentScene = scenes[workingSceneIndex];
      if (!currentScene) {
        handleDrillComplete();
        return;
      }
      let dialogueArray = currentScene?.dialogue || [];
      let nextDialogueIndex = currentDialogueIndex + 1;

      // Find next AI dialogue in current scene
      let nextAIDialogue = dialogueArray.find((d, i) =>
        i > currentDialogueIndex && d.speaker !== "student"
      );

      // If no more AI dialogues in current scene, move to next scene
      if (!nextAIDialogue && workingSceneIndex < scenes.length - 1) {
        const nextSceneIndex = workingSceneIndex + 1;
        const nextScene = scenes[nextSceneIndex];
        if (!nextScene) {
          handleDrillComplete();
          return;
        }
        dialogueArray = nextScene?.dialogue || [];
        workingSceneIndex = nextSceneIndex;

        // Find first AI dialogue in next scene
        nextAIDialogue = dialogueArray.find((d) => d.speaker !== "student");
        nextDialogueIndex = dialogueArray.findIndex(d => d === nextAIDialogue);

        if (nextAIDialogue) {
          setCurrentSceneIndex(nextSceneIndex);
          setCurrentDialogueIndex(nextDialogueIndex);

          // Add scene context message if available
          if (nextScene.context) {
            const contextMessage: Message = {
              id: `context-${Date.now()}`,
              type: "ai",
              content: `[${nextScene.scene_name || `Scene ${nextSceneIndex + 1}`}]: ${nextScene.context}`,
            };
            setMessages(prev => [...prev, contextMessage]);
          }
        }
      } else if (nextAIDialogue) {
        // Update dialogue index to the AI dialogue
        nextDialogueIndex = dialogueArray.findIndex(d => d === nextAIDialogue);
        setCurrentDialogueIndex(nextDialogueIndex);
      }

      if (nextAIDialogue) {
        const aiMessage: Message = {
          id: `ai-${Date.now()}-${currentStep + 1}`,
          type: "ai",
          content: nextAIDialogue.text,
        };
        setMessages(prev => [...prev, aiMessage]);
        setCurrentStep(prev => prev + 1);

        // Find next student response after this AI dialogue
        const nextStudentResponse = dialogueArray.find((d, i) =>
          i > nextDialogueIndex && d.speaker === "student"
        );

        if (nextStudentResponse) {
          setCurrentPrompt(nextStudentResponse.text);
          setCurrentDialogueIndex(dialogueArray.findIndex(d => d === nextStudentResponse));
          setShowYourTurn(true);
        } else {
          // Check if there's a student response in the next scene
          // Use workingSceneIndex which reflects any scene changes we just made
          if (workingSceneIndex < scenes.length - 1) {
            const nextScene = scenes[workingSceneIndex + 1];
            const nextSceneDialogue = nextScene?.dialogue || [];
            const firstStudentInNextScene = nextSceneDialogue.find((d) => d.speaker === "student");

            if (firstStudentInNextScene) {
              // We'll get this in the next iteration after moving to the scene
              setCurrentPrompt("");
              setShowYourTurn(false);
            } else {
              // No more student turns - drill complete
              setShowYourTurn(false);
              handleDrillComplete();
            }
          } else {
            // No more scenes - drill complete
            setShowYourTurn(false);
            handleDrillComplete();
          }
        }
      } else {
        // No more dialogues - drill complete
        setShowYourTurn(false);
        handleDrillComplete();
      }
    }, 1500);
  };

  const handleFailure = (score: number) => {
    // Add user message with retry flag
    const userMessage: Message = {
      id: `user-${Date.now()}-${currentStep}`,
      type: "user",
      content: currentPrompt || "User's attempt (needs improvement)",
      needsRetry: true,
      feedback: `Score: ${score}. You need 80+ to proceed. Keep practicing!`,
    };
    setMessages(prev => [...prev, userMessage]);

    // Add AI feedback message
    const feedbackTimeoutId = setTimeout(() => {
      const feedbackMessage: Message = {
        id: `ai-feedback-${Date.now()}`,
        type: "ai",
        content: `Score: ${score}. You need 80+ to proceed. Keep practicing!`,
      };
      setMessages(prev => [...prev, feedbackMessage]);
      setShowYourTurn(true);
    }, 1000);

    timeoutRefs.current.push(feedbackTimeoutId);
  };

  const handleDrillComplete = async () => {
    logger.log("Drill completed!");

    if (drill) {
      const durationSeconds = (Date.now() - startTimeRef.current) / 1000;

      try {
        // Calculate average pronunciation score from all successful user messages
        const userMessages = messages.filter(m => m.type === "user" && m.pronunciationScore !== undefined);
        const avgPronunciationScore = userMessages.length > 0
          ? Math.round(userMessages.reduce((sum, m) => sum + (m.pronunciationScore || 0), 0) / userMessages.length)
          : 0;

        // Calculate score based on successful turns across all scenes
        const totalStudentTurns = drill.roleplay_scenes?.reduce((total, scene) => {
          return total + (scene.dialogue?.filter(d => d.speaker === "student").length || 0);
        }, 0) || 1;
        const completionScore = Math.round((currentStep / totalStudentTurns) * 100);

        // Calculate scene scores for all completed scenes
        const sceneScores = drill.roleplay_scenes?.map((scene, index) => {
          const sceneStudentTurns = scene.dialogue?.filter(d => d.speaker === "student").length || 0;
          // Calculate how many turns were completed in this scene
          // This is a simplified calculation - you might want to track per-scene progress
          const sceneProgress = Math.min(currentStep, sceneStudentTurns);
          const sceneScore = sceneStudentTurns > 0
            ? Math.round((sceneProgress / sceneStudentTurns) * 100)
            : 0;

          return {
            sceneName: scene.scene_name || `Scene ${index + 1}`,
            score: sceneScore,
            pronunciationScore: avgPronunciationScore,
            fluencyScore: avgPronunciationScore,
          };
        }) || [];

        // Submit completion
        await completeDrill(drillId, {
          drillAssignmentId: assignmentId,
          score: completionScore,
          timeSpent: durationSeconds,
          answers: [],
          roleplayResults: {
            sceneScores,
          },
        });

        clearDrillProgress(drillId);
        addRecentActivity({
          id: drill._id,
          title: drill.title,
          type: drill.type,
          durationSeconds,
          score: completionScore,
        });

        setShowReview(true);
      } catch (error) {
        logger.error('Failed to submit drill:', error);
        Alert.alert("Error", "Drill completed but failed to submit. Please try again.");
      }
    }
  };

  const handleRecord = () => {
    if (isRecording) {
      stopRecording();
    } else if (recordedAudioUri) {
      submitRecording();
    } else {
      startRecording();
    }
  };

  const handleRetry = (messageId: string) => {
    // Remove the failed message and feedback
    setMessages(prev => prev.filter(m =>
      m.id !== messageId && !m.id.startsWith('ai-feedback')
    ));
    setShowYourTurn(true);
  };

  const totalSteps = drill?.roleplay_scenes?.reduce((total, scene) => {
    return total + (scene.dialogue?.filter(d => d.speaker === "student").length || 0);
  }, 0) || 5;

  // ── Speech Analysis Review Screen ──
  if (showReview && !isDrillCompleted && drill) {
    return (
      <SpeechAnalysisReview
        analysisResults={analysisResults}
        drillType="roleplay"
        onDone={() => setIsDrillCompleted(true)}
        onPracticeAgain={() => {
          // Reset drill to start over
          setShowReview(false);
          setMessages([]);
          setCurrentStep(1);
          setCurrentSceneIndex(0);
          setCurrentDialogueIndex(0);
          setCurrentPrompt("");
          setShowYourTurn(true);
          setRecordedAudioUri(null);
          setAnalysisResults([]);
          startTimeRef.current = Date.now();
          // Re-initialise first scene messages
          loadDrill();
        }}
      />
    );
  }

  // ── Completion Screen ──
  if (isDrillCompleted && drill) {
    return (
      <DrillCompletedScreen
        variant="progress"
        completed={totalSteps}
        total={totalSteps}
        title="Lesson completed"
        message={`Great job! You communicated clearly and stayed professional throughout the conversation.`}
        onContinue={() => router.back()}
        onClose={() => router.back()}
      />
    );
  }

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

  return (
    <SafeAreaView style={tw`flex-1 bg-white`} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={tw`flex-1`}
      >
        <DrillHeader
          title={drill.title}
          currentStep={currentStep}
          totalSteps={totalSteps}
          drillId={drillId}
          isSaved={isSaved}
          onSave={handleSave}
          onUnsave={handleUnsave}
        />

        <ScrollView
          ref={scrollViewRef}
          style={tw`flex-1 px-5`}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={tw`pb-6`}
        >
          {messages.map((message) =>
            message.type === "ai" ? (
              <AITutorMessage
                key={message.id}
                message={message.content}
                showAudio={true}
              />
            ) : (
              <View key={message.id}>
                <UserMessage
                  message={message.content}
                  showAudio={true}
                  isError={message.needsRetry}
                />
                {message.needsRetry && (
                  <TouchableOpacity
                    onPress={() => handleRetry(message.id)}
                    style={tw`ml-auto mr-4 mb-4`}
                  >
                    <View style={tw`flex-row items-center gap-1`}>
                      <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                        <Path
                          d="M4 12a8 8 0 018-8V0l4 4-4 4V4a6 6 0 100 12 6 6 0 006-6h2a8 8 0 01-8 8 8 8 0 01-8-8z"
                          fill="#EF4444"
                        />
                      </Svg>
                      <AppText style={tw`text-red-500 text-sm font-medium`}>Retry</AppText>
                    </View>
                  </TouchableOpacity>
                )}
              </View>
            )
          )}

          {showYourTurn && !isRecording && !isListening && !recordedAudioUri && (
            <View style={tw`items-center my-8`}>
              <AppText style={tw`text-2xl font-bold text-green-700 mb-4`}>
                Your Turn !
              </AppText>
              <View style={tw`bg-gray-50 rounded-2xl px-6 py-4 mb-2`}>
                <AppText style={tw`text-base text-gray-600 text-center leading-6`}>
                  {currentPrompt}
                </AppText>
              </View>
              <View style={tw`flex-row items-center gap-2 mt-2`}>
                <AudioButton
                  text={currentPrompt || ""}
                  size={20}
                />
              </View>
            </View>
          )}

          {(isListening || processing) && (
            <View style={tw`items-center my-8`}>
              <View style={tw`w-20 h-20 rounded-full bg-green-600 items-center justify-center mb-3`}>
                <ActivityIndicator size="large" color="white" />
              </View>
              <AppText style={tw`text-base text-gray-600`}>
                {processing ? "Analyzing pronunciation..." : "Listening..."}
              </AppText>
            </View>
          )}

          {isRecording && (
            <View style={tw`items-center my-8`}>
              <AppText style={tw`text-base text-gray-500 text-center mb-4`}>
                Tap to say this aloud
              </AppText>
              <View style={tw`bg-gray-50 rounded-2xl px-6 py-4 mb-2`}>
                <AppText style={tw`text-base text-gray-600 text-center leading-6`}>
                  {currentPrompt}
                </AppText>
              </View>
              <View style={tw`flex-row items-center gap-2 mt-2`}>
                <AudioButton
                  text={currentPrompt || ""}
                  size={20}
                />
              </View>
            </View>
          )}

          {recordedAudioUri && !isListening && !processing && (
            <View style={tw`items-center my-8`}>
              <View style={tw`bg-gray-50 rounded-2xl px-6 py-4 mb-2`}>
                <AppText style={tw`text-base text-gray-600 text-center leading-6`}>
                  {currentPrompt}
                </AppText>
              </View>

              <AppText style={tw`text-sm text-gray-500 mt-4 mb-3`}>
                preview your recording using the play button
              </AppText>

              {/* Audio Preview Player */}
              <View style={tw`w-full px-4`}>
                <View style={tw`flex-row items-center gap-3 bg-white rounded-lg px-4 py-3 shadow-sm`}>
                  <TouchableOpacity
                    onPress={playRecordingPreview}
                    disabled={isPlayingPreview}
                    style={tw`w-10 h-10 items-center justify-center`}
                  >
                    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                      <Path
                        d="M8 5v14l11-7L8 5z"
                        fill={isPlayingPreview ? "#9CA3AF" : "#15803D"}
                      />
                    </Svg>
                  </TouchableOpacity>

                  {/* Waveform visualization */}
                  <View style={tw`flex-1 h-12 flex-row items-center gap-0.5`}>
                    {Array.from({ length: 50 }).map((_, i) => (
                      <View
                        key={i}
                        style={[
                          tw`flex-1 bg-green-600 rounded-full`,
                          { height: Math.random() * 32 + 8 }
                        ]}
                      />
                    ))}
                  </View>

                  <AppText style={tw`text-sm text-gray-600 w-12 text-right`}>
                    0:16
                  </AppText>

                  <TouchableOpacity
                    onPress={deleteRecording}
                    style={tw`w-10 h-10 items-center justify-center`}
                  >
                    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                      <Path
                        d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z"
                        stroke="#9CA3AF"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </Svg>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        <View style={tw`px-5 pb-6 items-center`}>
          <RecordButton
            onPress={handleRecord}
            isRecording={isRecording}
            isListening={isListening || processing}
            hasRecording={!!recordedAudioUri}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}