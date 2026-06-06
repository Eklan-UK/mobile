import DrillCompletedScreen from "@/components/drills/DrillCompletedScreen";
import DrillHeader from "@/components/drills/DrillHeader";
import SpeechAnalysisReview from "@/components/drills/SpeechAnalysisReview";
import type { AnalysisResult } from "@/components/drills/SpeechAnalysisReview";
import RoleplayAiBubble, { BotAvatar } from "@/components/drills/roleplay/RoleplayAiBubble";
import RoleplayUserLineBubble from "@/components/drills/roleplay/RoleplayUserLineBubble";
import RoleplayYourTurnSection from "@/components/drills/roleplay/RoleplayYourTurnSection";
import RoleplayMicDock from "@/components/drills/roleplay/RoleplayMicDock";
import RoleplayPassSheet from "@/components/drills/roleplay/RoleplayPassSheet";
import RoleplayFailSheet from "@/components/drills/roleplay/RoleplayFailSheet";
import RoleplayConversationCompleteSheet from "@/components/drills/roleplay/RoleplayConversationCompleteSheet";
import RoleplaySceneHeader from "@/components/drills/roleplay/RoleplaySceneHeader";
import RoleplayYourLinesProgress from "@/components/drills/roleplay/RoleplayYourLinesProgress";
import { AppText, BoldText, Loader } from "@/components/ui";
import tw from "@/lib/tw";
import { completeDrill, getDrillById } from "@/services/drill.service";
import { speechaceService, extractTextScore, extractQualityScore } from "@/services/speechace.service";
import { ttsService } from "@/services/tts.service";
import { useActivityStore } from "@/store/activity-store";
import { Drill, DialogueTurn } from "@/types/drill.types";
import { Alert } from "@/utils/alert";
import { setAudioModeSafely } from "@/utils/audio";
import { logger } from "@/utils/logger";
import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from "expo-av";
import * as FileSystem from "expo-file-system/legacy";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useSaveDrill } from "@/hooks/useSaveDrill";

// ─── Types ────────────────────────────────────────────────────────────────────

type SessionPhase =
  | "intro"          // Pre-start: show context/roles + "Let's Get Started"
  | "ai_speaking"    // AI's current line playing/loading
  | "your_turn"      // Student must record
  | "recording"      // Actively recording
  | "preview"        // Clip recorded, awaiting submit or delete
  | "analyzing"      // Speechace in-flight
  | "score_pass"     // Speechace passed — show celebration, await Continue
  | "score_fail"     // Speechace failed — show retry card
  | "complete_banner"// Whole drill done — emerald banner
  | "review";        // SpeechAnalysisReview

interface CompletedMessage {
  id: string;
  type: "ai" | "user";
  text: string;
  translation?: string;
  score?: number;
}

// ─── Pass threshold ───────────────────────────────────────────────────────────
// NOTE: vocabulary / pronunciation drills use 65; roleplay keeps 80 for stricter
// spoken line evaluation. Change centrally if product aligns thresholds.
const PASS_THRESHOLD = 80;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function totalStudentTurns(drill: Drill): number {
  return (
    drill.roleplay_scenes?.reduce(
      (n, scene) => n + (scene.dialogue?.filter((d) => d.speaker === "student").length ?? 0),
      0
    ) ?? 0
  );
}

/** Collapse back-to-back AI bubbles with identical text (Strict Mode / batching / bad saves). */
function dedupeConsecutiveAiSameText(messages: CompletedMessage[]): CompletedMessage[] {
  const out: CompletedMessage[] = [];
  for (const m of messages) {
    const prev = out[out.length - 1];
    if (m.type === "ai" && prev?.type === "ai" && prev.text === m.text) continue;
    out.push(m);
  }
  return out;
}

/** Plain-text greeting for the intro screen (display + TTS). */
function buildRoleplayIntroGreeting(drill: Drill): string {
  const aiNames: string[] = drill.ai_character_names?.length
    ? drill.ai_character_names
    : drill.ai_character_name
    ? [drill.ai_character_name]
    : [];
  const studentPart = drill.student_character_name
    ? `You'll be playing ${drill.student_character_name}`
    : "You'll be the student";
  const aiPart = aiNames.length
    ? `and I'll play ${aiNames.join(" and ")}`
    : "and I'll be your conversation partner";
  const contextPart = drill.context ? ` ${drill.context}` : "";
  return `Hi! Ready for a roleplay? ${studentPart} ${aiPart}.${contextPart} Let's practice together — tap Let's Get Started when you're ready!`;
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function RoleplayDrill() {
  const params = useLocalSearchParams();
  const drillId = params.id as string;
  const assignmentId = params.assignmentId as string | undefined;
  const insets = useSafeAreaInsets();

  const { addRecentActivity, clearDrillProgress } = useActivityStore();
  const { isSaved, handleSave, handleUnsave } = useSaveDrill(drillId);

  const startTimeRef = useRef(Date.now());
  const transcriptScrollRef = useRef<ScrollView>(null);
  /** Cancels stale AI-line TTS if `currentAiLine` / phase changes (e.g. Strict Mode). */
  const aiSpeakingRunIdRef = useRef(0);
  /** Ensures we only append one transcript bubble per dialogue turn (Strict Mode runs effects twice). */
  const aiTurnAppendSigRef = useRef<string | null>(null);
  const timeoutRefs = useRef<ReturnType<typeof setTimeout>[]>([]);
  /** Cancels stale intro TTS if deps change (e.g. React Strict Mode remount). */
  const introTtsRunIdRef = useRef(0);

  // ── Drill data ──
  const [drill, setDrill] = useState<Drill | null>(null);
  const [loading, setLoading] = useState(true);

  // ── Session state ──
  const [phase, setPhase] = useState<SessionPhase>("intro");
  const [completedMessages, setCompletedMessages] = useState<CompletedMessage[]>([]);

  // ── Scene / dialogue tracking ──
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [currentDialogueIndex, setCurrentDialogueIndex] = useState(0);
  const [currentAiLine, setCurrentAiLine] = useState<DialogueTurn | null>(null);
  const [currentPrompt, setCurrentPrompt] = useState<DialogueTurn | null>(null);

  // ── Student turn count for "Your lines" progress ──
  const [completedStudentTurns, setCompletedStudentTurns] = useState(0);

  // ── Recording ──
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordedAudioUri, setRecordedAudioUri] = useState<string | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [previewSound, setPreviewSound] = useState<Audio.Sound | null>(null);
  const [permissionResponse, requestPermission] = Audio.usePermissions();

  // ── Speechace result ──
  const [lastScore, setLastScore] = useState(0);
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult[]>([]);

  // ── Recording elapsed timer ──
  const [recordingElapsed, setRecordingElapsed] = useState(0);
  const recordingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Drill complete ──
  const [isDrillCompleted, setIsDrillCompleted] = useState(false);

  // ─── Computed ───
  const totalTurns = drill ? totalStudentTurns(drill) : 0;
  const currentScene = drill?.roleplay_scenes?.[currentSceneIndex] ?? null;
  const totalScenes = drill?.roleplay_scenes?.length ?? 0;

  // ─── Load drill ──────────────────────────────────────────────────────────

  useEffect(() => { loadDrill(); }, [drillId]);

  const loadDrill = async () => {
    try {
      setLoading(true);
      // Stop any audio left over from a previous screen before rendering intro
      await ttsService.stopAudio();
      const drillData = await getDrillById(drillId, assignmentId);
      setDrill(drillData);

      // Roleplay always starts fresh: do not resume mid-conversation after leaving the screen.
      clearDrillProgress(drillId);
      aiTurnAppendSigRef.current = null;
      setCompletedMessages([]);
      setCompletedStudentTurns(0);
      setCurrentSceneIndex(0);
      setCurrentDialogueIndex(0);
      setCurrentAiLine(null);
      setCurrentPrompt(null);

      // Always show the intro / "Let's Get Started" gate until the user continues
      setPhase("intro");
    } catch (e) {
      logger.error("Failed to load roleplay drill:", e);
    } finally {
      setLoading(false);
    }
  };

  // ─── Auto TTS for intro greeting ("Let's Get Started" page) ───────────────

  useEffect(() => {
    if (phase !== "intro" || !drill || loading) return;

    const runId = ++introTtsRunIdRef.current;
    const text = buildRoleplayIntroGreeting(drill);
    let cancelled = false;

    (async () => {
      try {
        await setAudioModeSafely({ allowsRecordingIOS: false, playsInSilentModeIOS: true });
        await ttsService.stopAudio();
        const uri = await ttsService.generateTTS({ text });
        if (cancelled || runId !== introTtsRunIdRef.current || !uri?.trim()) return;
        await ttsService.playAudio(uri);
      } catch (e) {
        logger.warn("Intro greeting TTS failed:", e);
      }
    })();

    return () => {
      cancelled = true;
      void ttsService.stopAudio();
    };
  }, [phase, drill, loading]);

  // ─── Auto-TTS on each AI dialogue line ────────────────────────────────────
  // Append at most once per dialogue turn (ref + dedupe; Strict Mode runs setup twice).

  useEffect(() => {
    if (phase !== "ai_speaking" || !currentAiLine) return;

    const line = currentAiLine;
    const key = line.text.trim();
    const turnSig = `${currentSceneIndex}:${currentDialogueIndex}:${key}`;

    const skipAppend = aiTurnAppendSigRef.current === turnSig;
    if (!skipAppend) {
      aiTurnAppendSigRef.current = turnSig;
      setCompletedMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.type === "ai" && last.text.trim() === key) return prev;
        return [
          ...prev,
          {
            id: `ai-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            type: "ai",
            text: line.text,
            translation: line.translation,
          },
        ];
      });
    }

    const runId = ++aiSpeakingRunIdRef.current;
    let cancelled = false;

    (async () => {
      try {
        if (cancelled || runId !== aiSpeakingRunIdRef.current) return;
        await setAudioModeSafely({ allowsRecordingIOS: false, playsInSilentModeIOS: true });
        await ttsService.stopAudio();
        if (cancelled || runId !== aiSpeakingRunIdRef.current) return;
        const uri = await ttsService.generateTTS({ text: line.text });
        if (cancelled || runId !== aiSpeakingRunIdRef.current) return;
        if (!uri?.trim()) {
          if (runId === aiSpeakingRunIdRef.current) setPhase("your_turn");
          return;
        }
        await ttsService.playAudio(uri);
        if (!cancelled && runId === aiSpeakingRunIdRef.current) {
          setPhase("your_turn");
        }
      } catch (e) {
        logger.error("Auto-speak AI line failed:", e);
        if (!cancelled && runId === aiSpeakingRunIdRef.current) {
          setPhase("your_turn");
        }
      }
    })();

    return () => {
      cancelled = true;
      void ttsService.stopAudio();
    };
  }, [phase, currentSceneIndex, currentDialogueIndex, currentAiLine]);

  // ─── Auto-scroll transcript ───────────────────────────────────────────────
  // Fires on new messages AND on phase transitions so "Your Turn" prompt is
  // always fully visible above the mic dock.

  useEffect(() => {
    const delay = phase === "your_turn" ? 120 : 80;
    const id = setTimeout(() => transcriptScrollRef.current?.scrollToEnd({ animated: true }), delay);
    return () => clearTimeout(id);
  }, [completedMessages, phase]);

  // ─── Cleanup ──────────────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      timeoutRefs.current.forEach(clearTimeout);
      if (previewSound) previewSound.unloadAsync().catch(() => {});
      void ttsService.stopAudio();
    };
  }, []);

  const transcriptForDisplay = useMemo(
    () => dedupeConsecutiveAiSameText(completedMessages),
    [completedMessages]
  );

  // ─── "Let's Get Started" ──────────────────────────────────────────────────

  const handleStart = () => {
    const scenes = drill?.roleplay_scenes ?? [];
    if (scenes.length === 0) return;

    // Stop intro greeting TTS and invalidate any in-flight intro generation
    introTtsRunIdRef.current += 1;
    void ttsService.stopAudio();

    const firstScene = scenes[0];
    const dialogue = firstScene.dialogue ?? [];
    const firstAi = dialogue.find((d) => d.speaker !== "student") ?? null;
    const firstStudent = dialogue.find((d, i) =>
      i > (firstAi ? dialogue.indexOf(firstAi) : -1) && d.speaker === "student"
    ) ?? null;

    setCurrentAiLine(firstAi);
    setCurrentPrompt(firstStudent);
    setCurrentSceneIndex(0);
    setCurrentDialogueIndex(firstAi ? dialogue.indexOf(firstAi) : 0);
    setPhase("ai_speaking");
  };

  // ─── Recording controls ───────────────────────────────────────────────────

  const startRecording = async () => {
    try {
      let micStatus = permissionResponse?.status;
      if (micStatus !== "granted") {
        const req = await requestPermission();
        micStatus = req.status;
      }
      if (micStatus !== "granted") {
        Alert.alert(
          "Microphone needed",
          "Please allow microphone access in Settings to record your line."
        );
        return;
      }

      // Release playback (TTS) and any preview player — a loaded Sound blocks recording on iOS.
      await ttsService.stopAudio();
      if (previewSound) {
        try {
          await previewSound.unloadAsync();
        } catch {
          /* ignore */
        }
        setPreviewSound(null);
      }
      setIsPlayingPreview(false);

      if (recording) {
        try {
          await recording.stopAndUnloadAsync();
        } catch {
          /* ignore */
        }
        setRecording(null);
      }

      await setAudioModeSafely({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      const { recording: rec } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(rec);
      setPhase("recording");
      setRecordedAudioUri(null);
      setRecordingElapsed(0);
      recordingIntervalRef.current = setInterval(() => {
        setRecordingElapsed((s) => s + 1);
      }, 1000);
    } catch (e) {
      logger.error("Failed to start recording:", e ?? "(unknown error)");
      Alert.alert("Error", "Could not start recording. Please check microphone permissions.");
    }
  };

  const stopRecording = async () => {
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
    if (!recording) { setPhase("your_turn"); return; }
    const rec = recording;
    setRecording(null);
    try {
      await rec.stopAndUnloadAsync();
      const uri = rec.getURI();
      if (uri) {
        setRecordedAudioUri(uri);
        setPhase("preview");
      } else {
        setPhase("your_turn");
      }
    } catch (e: any) {
      logger.error("Error stopping recording:", e);
      if (!e?.message?.includes("Recorder does not exist")) {
        Alert.alert("Error", "Failed to stop recording. Please try again.");
      }
      setPhase("your_turn");
    }
  };

  const deleteRecording = async () => {
    if (previewSound) { await previewSound.unloadAsync(); setPreviewSound(null); }
    setRecordedAudioUri(null);
    setIsPlayingPreview(false);
    setPhase("your_turn");
  };

  const playPreview = async () => {
    if (!recordedAudioUri || isPlayingPreview) return;
    if (previewSound) { await previewSound.unloadAsync(); setPreviewSound(null); }
    const { sound } = await Audio.Sound.createAsync({ uri: recordedAudioUri }, { shouldPlay: true });
    setPreviewSound(sound);
    setIsPlayingPreview(true);
    sound.setOnPlaybackStatusUpdate((s) => {
      if (s.isLoaded && s.didJustFinish) { setIsPlayingPreview(false); }
    });
  };

  const submitRecording = async () => {
    if (!recordedAudioUri || !currentPrompt) return;
    setPhase("analyzing");

    try {
      const base64 = await FileSystem.readAsStringAsync(recordedAudioUri, {
        encoding: (FileSystem as any).EncodingType?.Base64 || "base64",
      });

      const result = await speechaceService.scorePronunciation(currentPrompt.text, base64);

      if (result.status === "error" && result.short_message === "error_no_speech") {
        setPhase("your_turn");
        setRecordedAudioUri(null);
        Alert.alert(
          "No Speech Detected",
          "We couldn't detect any speech. Please try again and speak clearly.",
          [{ text: "OK" }]
        );
        return;
      }

      const textScore = extractTextScore(result);
      const qualityScore = extractQualityScore(result);

      setAnalysisResults((prev) => [
        ...prev,
        { text: currentPrompt.text, score: qualityScore, textScore },
      ]);
      setLastScore(qualityScore);
      setRecordedAudioUri(null);

      if (qualityScore >= PASS_THRESHOLD) {
        setPhase("score_pass");
      } else {
        setPhase("score_fail");
      }
    } catch (e) {
      logger.error("Error processing audio:", e);
      setPhase("your_turn");
      setRecordedAudioUri(null);
      Alert.alert("Error", "Failed to process audio. Please try again.");
    }
  };

  // ─── Advance after pass ───────────────────────────────────────────────────

  const handleContinue = () => {
    if (!currentPrompt || !drill) return;

    // Commit the student's line to history
    const userEntry: CompletedMessage = {
      id: `user-${Date.now()}`,
      type: "user",
      text: currentPrompt.text,
      translation: currentPrompt.translation,
      score: lastScore,
    };

    const scenes = drill.roleplay_scenes ?? [];
    const scene = scenes[currentSceneIndex];
    const dialogue = scene?.dialogue ?? [];

    // Find the next AI line after the current student line
    const studentIdx = dialogue.findIndex((d) => d === currentPrompt);

    let nextAi: DialogueTurn | null =
      dialogue.find((d, i) => i > studentIdx && d.speaker !== "student") ?? null;
    let newSceneIdx = currentSceneIndex;
    let newDialogueArr = dialogue;

    if (!nextAi && currentSceneIndex < scenes.length - 1) {
      newSceneIdx = currentSceneIndex + 1;
      newDialogueArr = scenes[newSceneIdx]?.dialogue ?? [];
      nextAi = newDialogueArr.find((d) => d.speaker !== "student") ?? null;
      if (nextAi) setCurrentSceneIndex(newSceneIdx);
    }

    const nextStudent: DialogueTurn | null = nextAi
      ? newDialogueArr.find((d, i) => i > newDialogueArr.indexOf(nextAi!) && d.speaker === "student") ?? null
      : null;

    // AI line was already added to the transcript when this AI turn started; only append the student line.
    setCompletedMessages((prev) => [...prev, userEntry]);
    setCompletedStudentTurns((n) => n + 1);

    if (nextAi) {
      setCurrentAiLine(nextAi);
      setCurrentPrompt(nextStudent);
      setCurrentDialogueIndex(newDialogueArr.indexOf(nextAi));
      setPhase("ai_speaking");
    } else {
      // No more AI lines — drill complete
      completeDrillAsync();
    }
  };

  const handleRetry = () => {
    setPhase("your_turn");
    setRecordedAudioUri(null);
  };

  // Retry scene from pass sheet: discard pass, re-attempt current student turn
  const handleRetryScene = () => {
    setPhase("your_turn");
    setRecordedAudioUri(null);
    setLastScore(0);
  };

  // ─── Drill complete ───────────────────────────────────────────────────────

  const completeDrillAsync = async () => {
    if (!drill) return;
    const durationSeconds = (Date.now() - startTimeRef.current) / 1000;
    const score = totalTurns > 0 ? Math.round((completedStudentTurns / totalTurns) * 100) : 0;

    try {
      await completeDrill(drillId, {
        drillAssignmentId: assignmentId,
        score,
        timeSpent: durationSeconds,
        answers: [],
        roleplayResults: {
          sceneScores: drill.roleplay_scenes?.map((s, i) => ({
            sceneName: s.scene_name ?? `Scene ${i + 1}`,
            score,
            pronunciationScore: score,
            fluencyScore: score,
          })) ?? [],
        },
      });
      clearDrillProgress(drillId);
      addRecentActivity({ id: drill._id, title: drill.title, type: drill.type, durationSeconds, score });
    } catch (e) {
      logger.error("Failed to submit drill:", e);
    }

    setPhase("complete_banner");
  };

  const handleRestart = () => {
    clearDrillProgress(drillId);
    aiSpeakingRunIdRef.current += 1;
    aiTurnAppendSigRef.current = null;
    timeoutRefs.current.forEach(clearTimeout);
    setCompletedMessages([]);
    setCompletedStudentTurns(0);
    setCurrentSceneIndex(0);
    setCurrentDialogueIndex(0);
    setCurrentAiLine(null);
    setCurrentPrompt(null);
    setRecordedAudioUri(null);
    setLastScore(0);
    setAnalysisResults([]);
    setIsDrillCompleted(false);
    startTimeRef.current = Date.now();
    setPhase("intro");
    loadDrill();
  };

  // ─── Mic dock handler ─────────────────────────────────────────────────────

  const handleMicPress = () => {
    if (phase === "recording") { stopRecording(); }
    else if (phase === "preview") { submitRecording(); }
    else if (phase === "your_turn") { startRecording(); }
  };

  // ─── Full-screen branches ─────────────────────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView style={tw`flex-1 bg-white dark:bg-neutral-900 items-center justify-center`}>
        <Loader />
      </SafeAreaView>
    );
  }

  if (!drill) {
    return (
      <SafeAreaView style={tw`flex-1 bg-white dark:bg-neutral-900 items-center justify-center px-6`}>
        <AppText style={tw`text-gray-600 dark:text-gray-400 text-center`}>Drill not found.</AppText>
      </SafeAreaView>
    );
  }

  if (phase === "review") {
    return (
      <SpeechAnalysisReview
        analysisResults={analysisResults}
        drillType="roleplay"
        onDone={() => setIsDrillCompleted(true)}
        onPracticeAgain={handleRestart}
      />
    );
  }

  if (isDrillCompleted) {
    return (
      <DrillCompletedScreen
        variant="progress"
        completed={totalTurns}
        total={totalTurns}
        passed={true}
        title="You passed!"
        message="Great job! You communicated clearly throughout the conversation."
        onContinue={() => router.back()}
        onClose={() => router.back()}
      />
    );
  }

  // ─── Bottom inset: keep transcript / “Your turn” scrollable above dock & sheets ─
  const dockBottom = insets.bottom;
  const micDockVisible =
    phase === "your_turn" || phase === "recording" || phase === "preview";
  const micDockSheetHeight =
    phase === "preview" ? 200 : phase === "recording" ? 176 : 148;
  // Pass/fail sheets are taller than the mic dock; add scroll padding so chat isn’t trapped under them.
  const scoreSheetScrollPad = phase === "score_pass" ? 420 : phase === "score_fail" ? 320 : 0;
  // Extra padding when the prompt card is shown so it clears the mic dock with
  // space to spare (the card is ~100px; add 40px breathing room on top of dock).
  const yourTurnExtraPad = phase === "your_turn" ? 140 : 0;
  const transcriptScrollPaddingBottom =
    dockBottom +
    24 +
    (micDockVisible ? micDockSheetHeight + 16 : 0) +
    yourTurnExtraPad +
    scoreSheetScrollPad;

  // Show complete sheet as modal overlay (phase === complete_banner)
  const showCompleteSheet = phase === "complete_banner";

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={tw`flex-1 bg-white`} edges={["top", "bottom"]}>
      {/* ── Header ── */}
      <DrillHeader
        title={drill.title}
        currentStep={completedStudentTurns + 1}
        totalSteps={totalTurns || 5}
        drillId={drillId}
        isSaved={isSaved}
        onSave={handleSave}
        onUnsave={handleUnsave}
        stepLabel={totalScenes > 1 ? `${currentSceneIndex + 1} of ${totalScenes}` : undefined}
      />

      {/* ── PRE-START SCREEN ── */}
      {phase === "intro" && (
        <View style={tw`flex-1`}>
          <ScrollView
            style={tw`flex-1`}
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: dockBottom + 100 }}
            showsVerticalScrollIndicator={false}
          >
            {/* AI greeting bubble — explains scenario + roles */}
            {(() => {
              const aiNames: string[] = drill.ai_character_names?.length
                ? drill.ai_character_names
                : drill.ai_character_name
                ? [drill.ai_character_name]
                : [];

              const greeting = buildRoleplayIntroGreeting(drill);

              return (
                <View style={{ marginBottom: 20 }}>
                  <BotAvatar size={44} />
                  <View
                    style={{
                      marginTop: 10,
                      backgroundColor: "rgba(252,252,252,0.9)",
                      borderWidth: 0.5,
                      borderColor: "rgba(231,234,237,0.6)",
                      borderRadius: 24,
                      borderTopLeftRadius: 2,
                      padding: 16,
                    }}
                  >
                    {/* Role pills */}
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                      {drill.student_character_name ? (
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 6,
                            backgroundColor: "#f0fdf4",
                            borderRadius: 20,
                            paddingHorizontal: 10,
                            paddingVertical: 5,
                            borderWidth: 0.5,
                            borderColor: "rgba(59,136,62,0.2)",
                          }}
                        >
                          <View
                            style={{
                              width: 20, height: 20, borderRadius: 10,
                              backgroundColor: "#dcfce7",
                              alignItems: "center", justifyContent: "center",
                            }}
                          >
                            <AppText style={{ fontSize: 9, fontWeight: "700", color: "#3b883e" }}>You</AppText>
                          </View>
                          <AppText style={{ fontSize: 13, color: "#171717", fontWeight: "600" }}>
                            {drill.student_character_name}
                          </AppText>
                        </View>
                      ) : null}
                      {aiNames.map((name) => (
                        <View
                          key={name}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 6,
                            backgroundColor: "#f0fdf4",
                            borderRadius: 20,
                            paddingHorizontal: 10,
                            paddingVertical: 5,
                            borderWidth: 0.5,
                            borderColor: "rgba(59,136,62,0.2)",
                          }}
                        >
                          <BotAvatar size={20} />
                          <AppText style={{ fontSize: 13, color: "#171717", fontWeight: "600" }}>{name}</AppText>
                        </View>
                      ))}
                    </View>

                    {/* Greeting text */}
                    <AppText style={{ fontSize: 14, color: "#3b883e", lineHeight: 20, fontWeight: "700" }}>
                      {greeting}
                    </AppText>
                  </View>
                </View>
              );
            })()}
          </ScrollView>

          {/* Fixed CTA */}
          <View
            style={{
              position: "absolute",
              left: 0, right: 0,
              bottom: dockBottom,
              paddingHorizontal: 24,
              paddingBottom: 4,
              backgroundColor: "rgba(255,255,255,0.92)",
            }}
          >
            <AppText
              onPress={handleStart}
              style={{
                backgroundColor: "#3b883e",
                borderRadius: 35,
                paddingVertical: 16,
                textAlign: "center",
                color: "#fafafa",
                fontSize: 16,
                fontWeight: "700",
                overflow: "hidden",
              }}
            >
              Let's Get Started
            </AppText>
          </View>
        </View>
      )}

      {/* ── ACTIVE SESSION ── */}
      {phase !== "intro" && (phase as string) !== "review" && !isDrillCompleted && (
        <View style={tw`flex-1`}>
          <ScrollView
            ref={transcriptScrollRef}
            style={tw`flex-1`}
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingTop: 8,
              paddingBottom: transcriptScrollPaddingBottom,
            }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Progress + scene info */}
            <RoleplayYourLinesProgress completed={completedStudentTurns} total={totalTurns} />

            {currentScene && (
              <RoleplaySceneHeader
                sceneName={currentScene.scene_name}
                sceneIndex={currentSceneIndex}
                totalScenes={totalScenes}
              />
            )}

            {/* Transcript — AI bubbles left, user bubbles right */}
            {transcriptForDisplay.length === 0 && phase !== "ai_speaking" ? (
              <AppText style={{ fontSize: 12, color: "#d1d5db", textAlign: "center", marginBottom: 16 }}>
                Conversation will appear here.
              </AppText>
            ) : (
              transcriptForDisplay.map((msg) =>
                msg.type === "ai" ? (
                  <RoleplayAiBubble
                    key={msg.id}
                    text={msg.text}
                    translation={msg.translation}
                  />
                ) : (
                  <RoleplayUserLineBubble
                    key={msg.id}
                    text={msg.text}
                    translation={msg.translation}
                    score={msg.score}
                  />
                )
              )
            )}

            {/* Your turn prompt */}
            {(phase === "your_turn" || phase === "recording" || phase === "preview") && currentPrompt && (
              <RoleplayYourTurnSection
                promptText={currentPrompt.text}
                promptTranslation={currentPrompt.translation}
              />
            )}

            {/* Analyzing spinner */}
            {phase === "analyzing" && (
              <View style={{ alignItems: "center", paddingVertical: 32 }}>
                <ActivityIndicator size="large" color="#3b883e" />
                <AppText style={{ fontSize: 13, color: "#6a7282", marginTop: 12 }}>
                  Analyzing pronunciation…
                </AppText>
              </View>
            )}
          </ScrollView>

          {/* ── BOTTOM DOCK ── */}
          {(phase === "your_turn" || phase === "recording" || phase === "preview") && (
            <RoleplayMicDock
              phase={phase}
              promptText={currentPrompt?.text}
              recordedAudioUri={recordedAudioUri}
              isPlayingPreview={isPlayingPreview}
              elapsedSeconds={recordingElapsed}
              bottomInset={dockBottom}
              onMicPress={handleMicPress}
              onStopPress={stopRecording}
              onPlayPreview={playPreview}
              onDeleteRecording={deleteRecording}
              onSubmit={submitRecording}
            />
          )}

          {/* ── PASS SHEET ── */}
          {phase === "score_pass" && (
            <RoleplayPassSheet
              score={lastScore}
              passThreshold={PASS_THRESHOLD}
              bottomInset={dockBottom}
              onContinue={handleContinue}
              onRetryScene={handleRetryScene}
            />
          )}

          {/* ── FAIL SHEET ── */}
          {phase === "score_fail" && (
            <RoleplayFailSheet
              score={lastScore}
              passThreshold={PASS_THRESHOLD}
              bottomInset={dockBottom}
              onTryAgain={handleRetry}
            />
          )}
        </View>
      )}

      {/* ── CONVERSATION COMPLETE SHEET (modal overlay) ── */}
      <RoleplayConversationCompleteSheet
        visible={showCompleteSheet}
        studentCharacterName={drill.student_character_name}
        bottomInset={dockBottom}
        onReviewPerformance={() => setPhase("review")}
      />
    </SafeAreaView>
  );
}
