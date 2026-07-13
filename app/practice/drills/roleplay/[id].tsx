/**
 * Roleplay drill — assigned (`assignmentId`) or weekly challenge (`source=weekly_challenge`,
 * `challengeId`, `challengeItemIndex`, `weekStartDate`). Progress API drillId is `drill._id`
 * for assignments and `challengeId` for weekly challenges.
 */
import DrillCompletedScreen from "@/components/drills/DrillCompletedScreen";
import DrillHeader from "@/components/drills/DrillHeader";
import type { AnalysisResult } from "@/components/drills/SpeechAnalysisReview";
import SpeechAnalysisReview from "@/components/drills/SpeechAnalysisReview";
import RoleplayAiBubble, { BotAvatar } from "@/components/drills/roleplay/RoleplayAiBubble";
import RoleplayConversationCompleteSheet from "@/components/drills/roleplay/RoleplayConversationCompleteSheet";
import RoleplayFailSheet from "@/components/drills/roleplay/RoleplayFailSheet";
import RoleplayMicDock from "@/components/drills/roleplay/RoleplayMicDock";
import RoleplayPassSheet from "@/components/drills/roleplay/RoleplayPassSheet";
import RoleplaySceneBreakPanel from "@/components/drills/roleplay/RoleplaySceneBreakPanel";
import RoleplaySceneHeader from "@/components/drills/roleplay/RoleplaySceneHeader";
import RoleplayUserLineBubble from "@/components/drills/roleplay/RoleplayUserLineBubble";
import RoleplayYourLinesProgress from "@/components/drills/roleplay/RoleplayYourLinesProgress";
import RoleplayYourTurnSection from "@/components/drills/roleplay/RoleplayYourTurnSection";
import { AppText, Loader } from "@/components/ui";
import { useNotificationToast } from "@/contexts/NotificationToastContext";
import { invalidateDrillCaches, syncDrillProgressToLearnerDrills } from "@/hooks/useDrills";
import { useDrillExit } from "@/hooks/useDrillExit";
import { useSaveDrill } from "@/hooks/useSaveDrill";
import { usePreloadDrillCelebration } from "@/hooks/usePreloadDrillCelebration";
import { playPracticeFeedback } from "@/lib/practice-feedback";
import tw from "@/lib/tw";
import { isNetworkError } from "@/lib/api";
import {
    clearRoleplayProgress,
    completeDrill,
    getDrillById,
    getRoleplayProgress,
    saveRoleplayProgress,
} from "@/services/drill.service";
import { extractQualityScore, extractTextScore, speechaceService } from "@/services/speechace.service";
import { ttsService, isTtsTimeoutError } from "@/services/tts.service";
import { useActivityStore } from "@/store/activity-store";
import { DialogueTurn, Drill, type DrillCompletionEffects } from "@/types/drill.types";
import type { RoleplayRoleMode, TurnAnalytics, TurnProgressMap } from "@/types/roleplay-progress.types";
import { Alert } from "@/utils/alert";
import { setAudioModeSafely } from "@/utils/audio";
import { logger } from "@/utils/logger";
import {
  buildRoleplayPerformanceReviewSnapshot,
  textScoreToRecord,
  turnAnalyticsToAnalysisResults,
} from "@/utils/performanceReviewAnalytics";
import {
    buildProgressBody,
    buildProgressQuery,
    checkpointToState,
    parseRoleplayProgressContext,
} from "@/utils/roleplayProgressContext";
import { auditRoleplayScenes } from "@/utils/roleplayDialogueAudit";
import { decodeWeekStartDate } from "@/utils/challengeDrillAdapter";
import type { AdvanceAfterPassResult } from "@/utils/roleplaySceneHelpers";
import {
    countCompletedStudentTurns,
    findFirstPlayablePosition,
    findNextSceneWithContent,
    positionAtDialogueIndex,
    rebuildTranscriptBeforePosition,
    resolveAdvanceAfterAiLine,
    resolveAdvanceAfterStudentPass,
    shouldSkipPassSheetAfterStudentPass,
    sceneNameAt,
    skipToNextPlayablePosition,
    studentTurnIndexInScene,
    turnKey,
} from "@/utils/roleplaySceneHelpers";
import { getCachedWCDrill } from "@/utils/weeklyChallengeDrillCache";
import { useQueryClient } from "@tanstack/react-query";
import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from "expo-av";
import * as FileSystem from "expo-file-system/legacy";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    AppState,
    Platform,
    ScrollView,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

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
  | "complete_error" // Final submit failed — retry
  | "scene_break"    // Between scenes — Continue Later / Next Scene
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
  const routeDrillId = params.id as string;
  const progressCtx = useMemo(
    () =>
      parseRoleplayProgressContext({
        id: routeDrillId,
        assignmentId: params.assignmentId as string | undefined,
        source: params.source as string | undefined,
        challengeId: params.challengeId as string | undefined,
        challengeItemIndex: params.challengeItemIndex as string | undefined,
        weekStartDate: params.weekStartDate as string | undefined,
      }),
    [
      routeDrillId,
      params.assignmentId,
      params.source,
      params.challengeId,
      params.challengeItemIndex,
      params.weekStartDate,
    ]
  );
  const insets = useSafeAreaInsets();
  const { showToast } = useNotificationToast();

  const { addRecentActivity } = useActivityStore();
  const queryClient = useQueryClient();
  const exitWeekStartDate = progressCtx.weekStartDate
    ? decodeWeekStartDate(progressCtx.weekStartDate)
    : undefined;
  const { isExiting, exitDrill } = useDrillExit({
    source: progressCtx.source === "weekly_challenge" ? "weekly_challenge" : "plan",
    weekStartDate: exitWeekStartDate,
  });
  const { isSaved, handleSave, handleUnsave } = useSaveDrill(routeDrillId);

  const startTimeRef = useRef(Date.now());
  const transcriptScrollRef = useRef<ScrollView>(null);
  /** Cancels stale AI-line TTS if `currentAiLine` / phase changes (e.g. Strict Mode). */
  const aiSpeakingRunIdRef = useRef(0);
  /** Ensures we only append one transcript bubble per dialogue turn (Strict Mode runs effects twice). */
  const aiTurnAppendSigRef = useRef<string | null>(null);
  const timeoutRefs = useRef<ReturnType<typeof setTimeout>[]>([]);
  /** Cancels stale intro TTS if deps change (e.g. React Strict Mode remount). */
  const introTtsRunIdRef = useRef(0);
  const checkpointSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [ttsRetryNonce, setTtsRetryNonce] = useState(0);
  const [ttsSessionError, setTtsSessionError] = useState(false);
  const [navigationStall, setNavigationStall] = useState(false);
  const drillRef = useRef<Drill | null>(null);

  // ── Drill data ──
  const [drill, setDrill] = useState<Drill | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoadingProgress, setIsLoadingProgress] = useState(true);
  const [savingLater, setSavingLater] = useState(false);
  const [resumingSession, setResumingSession] = useState(false);

  // ── Session state ──
  const [phase, setPhase] = useState<SessionPhase>("intro");
  const [sessionStarted, setSessionStarted] = useState(false);
  const [startedAtIso, setStartedAtIso] = useState(() => new Date().toISOString());
  const [completedMessages, setCompletedMessages] = useState<CompletedMessage[]>([]);
  const [turnProgress, setTurnProgress] = useState<TurnProgressMap>({});
  const [sessionAnalytics, setSessionAnalytics] = useState<TurnAnalytics[]>([]);
  const [roleMode, setRoleMode] = useState<RoleplayRoleMode>("original");
  const [originalRoleProgress, setOriginalRoleProgress] = useState<TurnProgressMap>({});
  const [swappedRoleProgress, setSwappedRoleProgress] = useState<TurnProgressMap>({});
  const [sceneBreak, setSceneBreak] = useState<{
    completedSceneIndex: number;
    nextSceneIndex: number;
  } | null>(null);

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
  const [completingDrill, setCompletingDrill] = useState(false);
  const [completeError, setCompleteError] = useState<string | null>(null);
  const [celebrationEffects, setCelebrationEffects] = useState<DrillCompletionEffects | undefined>();

  usePreloadDrillCelebration();
  usePreloadDrillCelebration(celebrationEffects);

  // ─── Computed ───
  drillRef.current = drill;

  const totalTurns = drill ? totalStudentTurns(drill) : 0;
  const currentScene = drill?.roleplay_scenes?.[currentSceneIndex] ?? null;
  const totalScenes = drill?.roleplay_scenes?.length ?? 0;
  const showContinueLater =
    progressCtx.source === "assignment"
      ? !!progressCtx.assignmentId
      : progressCtx.source === "weekly_challenge"
        ? !!progressCtx.challengeId
        : false;

  // ─── Load drill + server checkpoint ─────────────────────────────────────

  useEffect(() => {
    void loadDrill();
  }, [progressCtx.progressDrillId, progressCtx.detailDrillId, progressCtx.assignmentId]);

  const resetToIntro = () => {
    aiTurnAppendSigRef.current = null;
    setCompletedMessages([]);
    setCompletedStudentTurns(0);
    setCurrentSceneIndex(0);
    setCurrentDialogueIndex(0);
    setCurrentAiLine(null);
    setCurrentPrompt(null);
    setTurnProgress({});
    setSessionAnalytics([]);
    setRoleMode("original");
    setOriginalRoleProgress({});
    setSwappedRoleProgress({});
    setSceneBreak(null);
    setSessionStarted(false);
    setStartedAtIso(new Date().toISOString());
    startTimeRef.current = Date.now();
    setNavigationStall(false);
    setPhase("intro");
  };

  const applyNavigationAdvance = (
    advance: AdvanceAfterPassResult,
    options?: { completedTurns?: number }
  ) => {
    setNavigationStall(false);
    setTtsSessionError(false);

    if (advance.kind === "scene_break" && advance.sceneBreak) {
      void ttsService.stopAudio();
      if (recording) {
        void recording.stopAndUnloadAsync().catch(() => {});
        setRecording(null);
      }
      setSceneBreak(advance.sceneBreak);
      setPhase("scene_break");
      scheduleMidSceneCheckpoint(advance.sceneBreak.nextSceneIndex, 0);
      return;
    }

    if (advance.kind === "complete") {
      void completeDrillAsync(options?.completedTurns ?? completedStudentTurns);
      return;
    }

    setCurrentSceneIndex(advance.sceneIndex);
    setCurrentDialogueIndex(advance.dialogueIndex);
    setCurrentAiLine(advance.aiLine);
    setCurrentPrompt(advance.studentPrompt);
    setPhase(advance.phase);
    scheduleMidSceneCheckpoint(advance.sceneIndex, advance.dialogueIndex);
  };

  const finishAiLineNavigation = (sceneIndex: number, dialogueIndex: number) => {
    const drillData = drillRef.current;
    if (!drillData) {
      setPhase("your_turn");
      return;
    }

    const advance = resolveAdvanceAfterAiLine(drillData, sceneIndex, dialogueIndex);
    if (advance.phase === "your_turn" && advance.studentPrompt) {
      setCurrentPrompt(advance.studentPrompt);
      setCurrentDialogueIndex(advance.dialogueIndex);
      setCurrentAiLine(advance.aiLine);
      setPhase("your_turn");
      return;
    }

    applyNavigationAdvance(advance);
  };

  const recoverFromStuckNavigation = () => {
    const drillData = drillRef.current;
    if (!drillData) return;

    const advance = skipToNextPlayablePosition(
      drillData,
      currentSceneIndex,
      currentDialogueIndex
    );

    if (advance.kind === "complete") {
      void completeDrillAsync(completedStudentTurns);
      return;
    }

    if (advance.phase === "your_turn" && advance.studentPrompt) {
      applyNavigationAdvance(advance);
      return;
    }

    if (advance.phase === "ai_speaking" && advance.aiLine) {
      applyNavigationAdvance(advance);
      return;
    }

    setNavigationStall(true);
  };

  const applyMidSceneResume = (
    drillData: Drill,
    sceneIndex: number,
    dialogueIndex: number,
    progressMaps: {
      turnProgress: TurnProgressMap;
      sessionAnalytics: TurnAnalytics[];
      roleMode: RoleplayRoleMode;
      originalRoleProgress: TurnProgressMap;
      swappedRoleProgress: TurnProgressMap;
      startedAt: string;
    }
  ) => {
    const scenes = drillData.roleplay_scenes ?? [];
    const audit = auditRoleplayScenes(drillData);
    if (!audit.isPlayable) {
      resetToIntro();
      setLoadError("This roleplay has no lines to practice.");
      return;
    }

    let resolvedSceneIndex = sceneIndex;
    let resolvedDialogueIndex = dialogueIndex;
    let scene = scenes[resolvedSceneIndex];

    if (!scene || !scene.dialogue?.length) {
      const fallback = findNextSceneWithContent(scenes, Math.max(0, sceneIndex));
      if (!fallback) {
        resetToIntro();
        showToast({
          title: "Saved progress could not be restored — starting fresh.",
          body: "",
          variant: "light",
          duration: 4500,
        });
        return;
      }
      resolvedSceneIndex = fallback.sceneIndex;
      resolvedDialogueIndex = fallback.position.dialogueIndex;
      scene = scenes[resolvedSceneIndex];
    }

    const messages = rebuildTranscriptBeforePosition(
      drillData,
      resolvedSceneIndex,
      resolvedDialogueIndex,
      progressMaps.turnProgress
    );
    let pos = positionAtDialogueIndex(scene!, resolvedDialogueIndex);

    if (!pos.aiLine && !pos.studentPrompt) {
      const fallback = findNextSceneWithContent(scenes, resolvedSceneIndex);
      if (!fallback) {
        resetToIntro();
        showToast({
          title: "Saved progress could not be restored — starting fresh.",
          body: "",
          variant: "light",
          duration: 4500,
        });
        return;
      }
      resolvedSceneIndex = fallback.sceneIndex;
      resolvedDialogueIndex = fallback.position.dialogueIndex;
      scene = scenes[resolvedSceneIndex];
      pos = fallback.position;
    }

    setTurnProgress(progressMaps.turnProgress);
    setSessionAnalytics(progressMaps.sessionAnalytics);
    setRoleMode(progressMaps.roleMode);
    setOriginalRoleProgress(progressMaps.originalRoleProgress);
    setSwappedRoleProgress(progressMaps.swappedRoleProgress);
    setStartedAtIso(progressMaps.startedAt);
    startTimeRef.current = new Date(progressMaps.startedAt).getTime();
    setSessionStarted(true);
    setCompletedMessages(messages);
    setCompletedStudentTurns(countCompletedStudentTurns(progressMaps.turnProgress));
    setCurrentSceneIndex(resolvedSceneIndex);
    setCurrentDialogueIndex(pos.dialogueIndex);
    setCurrentAiLine(pos.aiLine);
    setCurrentPrompt(pos.studentPrompt);
    setSceneBreak(null);
    setNavigationStall(false);
    aiTurnAppendSigRef.current = null;

    const line = scene?.dialogue?.[resolvedDialogueIndex];
    if (line?.speaker === "student") {
      setPhase("your_turn");
    } else if (pos.aiLine) {
      setPhase("ai_speaking");
    } else if (pos.studentPrompt) {
      setPhase("your_turn");
    } else {
      setPhase("ai_speaking");
    }

    showToast({
      title: `Welcome back — continuing from ${sceneNameAt(drillData, resolvedSceneIndex)}.`,
      body: "",
      variant: "dark",
      duration: 4000,
    });
  };

  const loadDrill = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      setIsLoadingProgress(true);
      await ttsService.stopAudio();

      let drillData: Drill;

      if (progressCtx.source === "weekly_challenge") {
        const cached = getCachedWCDrill(progressCtx.detailDrillId);
        if (!cached) {
          logger.warn("[RoleplayDrill] WC drill not in cache:", progressCtx.detailDrillId);
          router.back();
          return;
        }
        drillData = cached;
      } else {
        drillData = await getDrillById(
          progressCtx.detailDrillId,
          progressCtx.assignmentId
        );
      }
      setDrill(drillData);

      const audit = auditRoleplayScenes(drillData);
      if (__DEV__ && audit.warnings.length > 0) {
        logger.warn("[RoleplayAudit] warnings:", audit.warnings);
      }
      if (!audit.isPlayable) {
        setLoadError("This roleplay has no lines to practice.");
        return;
      }

      let checkpoint = null;
      try {
        checkpoint = await getRoleplayProgress(
          progressCtx.progressDrillId,
          buildProgressQuery(progressCtx)
        );
      } catch (e) {
        logger.warn("Failed to load roleplay progress:", e);
      }

      const scenes = drillData.roleplay_scenes ?? [];

      if (checkpoint && checkpoint.currentSceneIndex >= scenes.length) {
        try {
          await clearRoleplayProgress(
            progressCtx.progressDrillId,
            buildProgressQuery(progressCtx)
          );
        } catch (e) {
          logger.warn("Failed to clear stale roleplay progress:", e);
        }
        resetToIntro();
        showToast({
          title: "Saved progress was outdated — starting fresh.",
          body: "",
          variant: "light",
          duration: 4500,
        });
        return;
      }

      if (checkpoint) {
        const state = checkpointToState(checkpoint);

        if (state.pausedAtSceneBreak && scenes.length > 1) {
          const completedIdx =
            state.completedSceneIndex ?? Math.max(0, state.currentSceneIndex - 1);
          const nextIdx = state.currentSceneIndex;

          setTurnProgress(state.turnProgress);
          setSessionAnalytics(state.sessionAnalytics);
          setRoleMode(state.roleMode);
          setOriginalRoleProgress(state.originalRoleProgress);
          setSwappedRoleProgress(state.swappedRoleProgress);
          setStartedAtIso(state.startedAt);
          startTimeRef.current = new Date(state.startedAt).getTime();
          setSessionStarted(true);
          setSceneBreak({ completedSceneIndex: completedIdx, nextSceneIndex: nextIdx });
          setCompletedMessages([]);
          setCompletedStudentTurns(countCompletedStudentTurns(state.turnProgress));
          setCurrentSceneIndex(completedIdx);
          setPhase("scene_break");

          showToast({
            title: `Welcome back — ready to continue to ${sceneNameAt(drillData, nextIdx)}.`,
            body: "",
            variant: "dark",
            duration: 4500,
          });
          return;
        }

        applyMidSceneResume(drillData, state.currentSceneIndex, state.currentTurnIndex, {
          turnProgress: state.turnProgress,
          sessionAnalytics: state.sessionAnalytics,
          roleMode: state.roleMode,
          originalRoleProgress: state.originalRoleProgress,
          swappedRoleProgress: state.swappedRoleProgress,
          startedAt: state.startedAt,
        });
        return;
      }

      resetToIntro();
    } catch (e) {
      logger.error("Failed to load roleplay drill:", e);
      if (isNetworkError(e)) {
        setLoadError("Connection problem. Check your network and try again.");
        setDrill(null);
      } else {
        setDrill(null);
      }
    } finally {
      setLoading(false);
      setIsLoadingProgress(false);
    }
  };

  const persistMidSceneCheckpoint = async (
    sceneIndex: number,
    dialogueIndex: number
  ) => {
    if (!drill || !sessionStarted) return;
    if (phase === "intro" || phase === "scene_break" || phase === "complete_banner") return;

    try {
      const body = buildProgressBody(progressCtx, {
        currentSceneIndex: sceneIndex,
        currentTurnIndex: dialogueIndex,
        pausedAtSceneBreak: false,
        turnProgress,
        sessionAnalytics,
        roleMode,
        originalRoleProgress,
        swappedRoleProgress,
        startedAt: startedAtIso,
      });
      await saveRoleplayProgress(progressCtx.progressDrillId, body);
      logger.log("roleplay_resume: mid-scene checkpoint saved", {
        sceneIndex,
        dialogueIndex,
      });
    } catch (e) {
      logger.warn("Failed to save mid-scene roleplay checkpoint:", e);
    }
  };

  const scheduleMidSceneCheckpoint = (sceneIndex: number, dialogueIndex: number) => {
    if (checkpointSaveTimerRef.current) {
      clearTimeout(checkpointSaveTimerRef.current);
    }
    checkpointSaveTimerRef.current = setTimeout(() => {
      void persistMidSceneCheckpoint(sceneIndex, dialogueIndex);
    }, 1500);
  };

  const resumeSession = async () => {
    if (!drill || resumingSession) return;

    setResumingSession(true);
    try {
      const checkpoint = await getRoleplayProgress(
        progressCtx.progressDrillId,
        buildProgressQuery(progressCtx)
      );
      if (!checkpoint) {
        showToast({
          title: "No saved session to resume.",
          body: "",
          variant: "light",
          duration: 3500,
        });
        return;
      }

      const scenes = drill.roleplay_scenes ?? [];
      if (checkpoint.currentSceneIndex >= scenes.length) {
        showToast({
          title: "Saved progress was outdated — starting fresh.",
          body: "",
          variant: "light",
          duration: 4500,
        });
        return;
      }

      const state = checkpointToState(checkpoint);

      if (state.pausedAtSceneBreak && scenes.length > 1) {
        const completedIdx =
          state.completedSceneIndex ?? Math.max(0, state.currentSceneIndex - 1);
        const nextIdx = state.currentSceneIndex;

        setTurnProgress(state.turnProgress);
        setSessionAnalytics(state.sessionAnalytics);
        setRoleMode(state.roleMode);
        setOriginalRoleProgress(state.originalRoleProgress);
        setSwappedRoleProgress(state.swappedRoleProgress);
        setStartedAtIso(state.startedAt);
        startTimeRef.current = new Date(state.startedAt).getTime();
        setSessionStarted(true);
        setSceneBreak({ completedSceneIndex: completedIdx, nextSceneIndex: nextIdx });
        setCompletedMessages([]);
        setCompletedStudentTurns(countCompletedStudentTurns(state.turnProgress));
        setCurrentSceneIndex(completedIdx);
        setPhase("scene_break");
        return;
      }

      applyMidSceneResume(drill, state.currentSceneIndex, state.currentTurnIndex, {
        turnProgress: state.turnProgress,
        sessionAnalytics: state.sessionAnalytics,
        roleMode: state.roleMode,
        originalRoleProgress: state.originalRoleProgress,
        swappedRoleProgress: state.swappedRoleProgress,
        startedAt: state.startedAt,
      });
    } catch (e) {
      logger.error("Failed to resume roleplay session:", e);
      if (isNetworkError(e)) {
        Alert.alert(
          "Connection problem",
          "Could not load your saved session. Check your network and try again."
        );
      } else {
        Alert.alert("Could not resume", "Please try again.");
      }
    } finally {
      setResumingSession(false);
    }
  };

  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState) => {
      if (nextState === "background" || nextState === "inactive") {
        void persistMidSceneCheckpoint(currentSceneIndex, currentDialogueIndex);
      }
    });
    return () => sub.remove();
  }, [currentSceneIndex, currentDialogueIndex, drill, sessionStarted, phase]);

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
        setTtsSessionError(false);
        await setAudioModeSafely({ allowsRecordingIOS: false, playsInSilentModeIOS: true });
        await ttsService.stopAudio();
        if (cancelled || runId !== aiSpeakingRunIdRef.current) return;
        const uri = await ttsService.generateTTS({ text: line.text });
        if (cancelled || runId !== aiSpeakingRunIdRef.current) return;
        if (!uri?.trim()) {
          if (runId === aiSpeakingRunIdRef.current) {
            finishAiLineNavigation(currentSceneIndex, currentDialogueIndex);
          }
          return;
        }
        await ttsService.playAudio(uri);
        if (!cancelled && runId === aiSpeakingRunIdRef.current) {
          finishAiLineNavigation(currentSceneIndex, currentDialogueIndex);
        }
      } catch (e) {
        if (isTtsTimeoutError(e)) {
          logger.warn("roleplay_tts_timeout: AI line TTS timed out");
          if (!cancelled && runId === aiSpeakingRunIdRef.current) {
            setTtsSessionError(true);
          }
          return;
        }
        logger.error("Auto-speak AI line failed:", e);
        if (!cancelled && runId === aiSpeakingRunIdRef.current) {
          finishAiLineNavigation(currentSceneIndex, currentDialogueIndex);
        }
      }
    })();

    return () => {
      cancelled = true;
      void ttsService.stopAudio();
    };
  }, [phase, currentSceneIndex, currentDialogueIndex, currentAiLine, ttsRetryNonce]);

  // ─── Stall watchdog: recover when your_turn has no prompt ─────────────────

  useEffect(() => {
    if (!sessionStarted || phase !== "your_turn" || currentPrompt) {
      setNavigationStall(false);
      return;
    }

    const timer = setTimeout(() => {
      logger.warn("roleplay_navigation_stall", {
        sceneIndex: currentSceneIndex,
        dialogueIndex: currentDialogueIndex,
      });
      recoverFromStuckNavigation();
    }, 2000);

    return () => clearTimeout(timer);
  }, [sessionStarted, phase, currentPrompt, currentSceneIndex, currentDialogueIndex]);

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
      if (checkpointSaveTimerRef.current) {
        clearTimeout(checkpointSaveTimerRef.current);
      }
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
    if (!drill) return;

    const playable = findFirstPlayablePosition(drill);
    if (!playable) {
      Alert.alert(
        "Cannot start",
        "This roleplay has no lines to practice."
      );
      return;
    }

    introTtsRunIdRef.current += 1;
    void ttsService.stopAudio();

    const iso = new Date().toISOString();
    setStartedAtIso(iso);
    startTimeRef.current = Date.now();
    setSessionStarted(true);
    setNavigationStall(false);

    const { sceneIndex, position } = playable;
    setCurrentAiLine(position.aiLine);
    setCurrentPrompt(position.studentPrompt);
    setCurrentSceneIndex(sceneIndex);
    setCurrentDialogueIndex(position.dialogueIndex);
    setPhase(position.aiLine ? "ai_speaking" : "your_turn");
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

      if (currentScene) {
        const studentIdx = studentTurnIndexInScene(currentScene, currentPrompt);
        const key = turnKey(currentSceneIndex, studentIdx);
        const prior = turnProgress[key];
        const attempts = (prior?.attempts ?? 0) + 1;
        const passed = qualityScore >= PASS_THRESHOLD;
        const entry = { passed, score: qualityScore, attempts };

        setTurnProgress((prev) => ({ ...prev, [key]: entry }));

        if (passed) {
          setSessionAnalytics((analytics) => [
            ...analytics,
            {
              sceneIndex: currentSceneIndex,
              turnIndex: studentIdx,
              text: currentPrompt.text,
              score: qualityScore,
              textScore: textScoreToRecord(textScore),
              attempts,
              timestamp: new Date().toISOString(),
            },
          ]);
        }
      }

      if (qualityScore >= PASS_THRESHOLD) {
        const advance = resolveAdvanceAfterStudentPass(
          drill,
          currentSceneIndex,
          currentPrompt
        );
        if (shouldSkipPassSheetAfterStudentPass(advance)) {
          void playPracticeFeedback("success");
          advanceAfterStudentPass(currentPrompt, qualityScore);
          return;
        }
        setPhase("score_pass");
      } else {
        setPhase("score_fail");
      }
      void playPracticeFeedback(qualityScore >= PASS_THRESHOLD ? "success" : "failure");
    } catch (e) {
      logger.error("Error processing audio:", e);
      if (isNetworkError(e)) {
        setPhase("preview");
        Alert.alert(
          "Connection problem",
          "We couldn't send your recording. Your clip is saved — tap Retry to try again.",
          [
            { text: "Retry", onPress: () => void submitRecording() },
            {
              text: "Discard",
              style: "destructive",
              onPress: () => {
                setRecordedAudioUri(null);
                setPhase("your_turn");
              },
            },
          ]
        );
        return;
      }
      setPhase("your_turn");
      setRecordedAudioUri(null);
      Alert.alert("Error", "Failed to process audio. Please try again.");
    }
  };

  // ─── Advance after pass ───────────────────────────────────────────────────

  const advanceAfterStudentPass = (prompt: DialogueTurn, score: number) => {
    if (!drill || !currentScene || completingDrill) return;

    const userEntry: CompletedMessage = {
      id: `user-${Date.now()}`,
      type: "user",
      text: prompt.text,
      translation: prompt.translation,
      score,
    };

    const advance = resolveAdvanceAfterStudentPass(drill, currentSceneIndex, prompt);
    const nextCompletedTurns = completedStudentTurns + 1;

    setCompletedMessages((prev) => [...prev, userEntry]);
    setCompletedStudentTurns(nextCompletedTurns);
    setLastScore(0);

    if (advance.kind === "scene_break" && advance.sceneBreak) {
      void ttsService.stopAudio();
      if (recording) {
        void recording.stopAndUnloadAsync().catch(() => {});
        setRecording(null);
      }
      setSceneBreak(advance.sceneBreak);
      setPhase("scene_break");
      scheduleMidSceneCheckpoint(advance.sceneBreak.nextSceneIndex, 0);
      return;
    }

    if (advance.kind === "complete") {
      setPhase("analyzing");
      void completeDrillAsync(nextCompletedTurns);
      return;
    }

    applyNavigationAdvance(advance, { completedTurns: nextCompletedTurns });
  };

  const handleContinue = () => {
    if (!currentPrompt || !drill || !currentScene || completingDrill) return;
    advanceAfterStudentPass(currentPrompt, lastScore);
  };

  const handleContinueToNextScene = () => {
    if (!drill || !sceneBreak) return;

    const scenes = drill.roleplay_scenes ?? [];
    const next = findNextSceneWithContent(scenes, sceneBreak.nextSceneIndex);
    if (!next) {
      void completeDrillAsync(completedStudentTurns);
      return;
    }

    const autoSaveBody = buildProgressBody(progressCtx, {
      currentSceneIndex: next.sceneIndex,
      currentTurnIndex: next.position.dialogueIndex,
      pausedAtSceneBreak: false,
      completedSceneIndex: sceneBreak.completedSceneIndex,
      turnProgress,
      sessionAnalytics,
      roleMode,
      originalRoleProgress,
      swappedRoleProgress,
      startedAt: startedAtIso,
    });
    void saveRoleplayProgress(progressCtx.progressDrillId, autoSaveBody)
      .then(() => {
        if (progressCtx.source === "assignment" && progressCtx.assignmentId) {
          syncDrillProgressToLearnerDrills(queryClient, progressCtx.assignmentId);
        }
      })
      .catch((e) =>
      logger.warn("Failed to auto-save roleplay progress on scene advance:", e)
    );

    introTtsRunIdRef.current += 1;
    aiTurnAppendSigRef.current = null;
    void ttsService.stopAudio();

    setCompletedMessages([]);
    setCurrentSceneIndex(next.sceneIndex);
    setCurrentDialogueIndex(next.position.dialogueIndex);
    setCurrentAiLine(next.position.aiLine);
    setCurrentPrompt(next.position.studentPrompt);
    setSceneBreak(null);
    setTtsSessionError(false);
    setPhase(next.position.aiLine ? "ai_speaking" : "your_turn");

    showToast({
      title: `Next: ${sceneNameAt(drill, next.sceneIndex)}`,
      body: "",
      variant: "dark",
      duration: 3500,
    });
  };

  const handleContinueLater = async () => {
    if (!drill || !sceneBreak || savingLater || !showContinueLater) return;

    setSavingLater(true);
    try {
      const body = buildProgressBody(progressCtx, {
        currentSceneIndex: sceneBreak.nextSceneIndex,
        currentTurnIndex: 0,
        pausedAtSceneBreak: true,
        completedSceneIndex: sceneBreak.completedSceneIndex,
        turnProgress,
        sessionAnalytics,
        roleMode,
        originalRoleProgress,
        swappedRoleProgress,
        startedAt: startedAtIso,
      });

      await saveRoleplayProgress(progressCtx.progressDrillId, body);
      if (progressCtx.source === "assignment" && progressCtx.assignmentId) {
        syncDrillProgressToLearnerDrills(queryClient, progressCtx.assignmentId);
      } else {
        void invalidateDrillCaches(queryClient);
      }

      if (progressCtx.source === "weekly_challenge") {
        if (progressCtx.weekStartDate) {
          const { encodeWeekStartDate } = await import("@/utils/challengeDrillAdapter");
          router.replace(
            `/practice/weekly-challenge/${encodeWeekStartDate(progressCtx.weekStartDate)}` as never
          );
        } else {
          router.replace("/practice/weekly-challenge" as never);
        }
      } else {
        router.replace("/(tabs)/plan" as never);
      }
    } catch (e) {
      logger.error("Failed to save roleplay progress:", e);
      Alert.alert("Could not save", "Please try again.");
      setSavingLater(false);
    }
  };

  const handleRetry = () => {
    if (currentScene && currentPrompt) {
      const studentIdx = studentTurnIndexInScene(currentScene, currentPrompt);
      const key = turnKey(currentSceneIndex, studentIdx);
      setTurnProgress((prev) => {
        const prior = prev[key];
        return {
          ...prev,
          [key]: {
            passed: false,
            score: lastScore,
            attempts: (prior?.attempts ?? 0) + 1,
          },
        };
      });
    }
    setPhase("your_turn");
    setRecordedAudioUri(null);
  };

  const handleRetryScene = () => {
    if (currentScene && currentPrompt) {
      const studentIdx = studentTurnIndexInScene(currentScene, currentPrompt);
      const key = turnKey(currentSceneIndex, studentIdx);
      setTurnProgress((prev) => {
        const prior = prev[key];
        return {
          ...prev,
          [key]: {
            passed: false,
            score: lastScore,
            attempts: (prior?.attempts ?? 0) + 1,
          },
        };
      });
    }
    setPhase("your_turn");
    setRecordedAudioUri(null);
    setLastScore(0);
  };

  // ─── Drill complete ───────────────────────────────────────────────────────

  const completeDrillAsync = async (passedTurnCount?: number) => {
    if (!drill || completingDrill) return;
    const durationSeconds = (Date.now() - startTimeRef.current) / 1000;
    const turnsDone = passedTurnCount ?? completedStudentTurns;
    const score = totalTurns > 0 ? Math.round((turnsDone / totalTurns) * 100) : 0;

    setCompletingDrill(true);
    setCompleteError(null);

    try {
      if (progressCtx.source === "weekly_challenge" && progressCtx.challengeId && progressCtx.weekStartDate) {
        const { completeWeeklyChallengeItemAndRefetch } = await import("@/hooks/useWeeklyChallenge");
        const itemId = `${progressCtx.challengeId}-${progressCtx.challengeItemIndex ?? 0}`;
        await completeWeeklyChallengeItemAndRefetch(queryClient, itemId, {
          score,
          weekStartDate: progressCtx.weekStartDate,
        });
      } else {
        const performanceReviewSnapshot = buildRoleplayPerformanceReviewSnapshot({
          analytics: sessionAnalytics,
          sceneNames:
            drill.roleplay_scenes?.map((scene) => scene.scene_name ?? "") ?? [],
          completedStudentTurns: turnsDone,
          totalTurns,
          passThreshold: PASS_THRESHOLD,
        });
        const result = await completeDrill(drill._id, {
          drillAssignmentId: progressCtx.assignmentId,
          score,
          timeSpent: durationSeconds,
          answers: [],
          platform: Platform.OS === "ios" ? "ios" : "android",
          roleplayResults: {
            sceneScores: drill.roleplay_scenes?.map((s, i) => ({
              sceneName: s.scene_name ?? `Scene ${i + 1}`,
              score,
              pronunciationScore: score,
              fluencyScore: score,
            })) ?? [],
          },
          performanceReviewSnapshot,
        });
        setCelebrationEffects(result.effects);
        await invalidateDrillCaches(queryClient);
      }
      try {
        await clearRoleplayProgress(
          progressCtx.progressDrillId,
          buildProgressQuery(progressCtx)
        );
      } catch (e) {
        logger.warn("Failed to clear roleplay progress after submit:", e);
      }
      addRecentActivity({ id: drill._id, title: drill.title, type: drill.type, durationSeconds, score });
      setPhase("complete_banner");
    } catch (e) {
      logger.error("Failed to submit drill:", e);
      setCompleteError(
        isNetworkError(e)
          ? "Connection problem. Your progress is saved — tap Retry when you're back online."
          : "Could not submit your results. Please try again."
      );
      setPhase("complete_error");
    } finally {
      setCompletingDrill(false);
    }
  };

  const handleRestart = async () => {
    try {
      await clearRoleplayProgress(
        progressCtx.progressDrillId,
        buildProgressQuery(progressCtx)
      );
    } catch (e) {
      logger.warn("Failed to clear roleplay progress on restart:", e);
    }

    aiSpeakingRunIdRef.current += 1;
    aiTurnAppendSigRef.current = null;
    timeoutRefs.current.forEach(clearTimeout);
    setRecordedAudioUri(null);
    setLastScore(0);
    setAnalysisResults([]);
    setIsDrillCompleted(false);
    setCompleteError(null);
    resetToIntro();
  };

  const handleRetryTts = () => {
    setTtsSessionError(false);
    setTtsRetryNonce((n) => n + 1);
  };

  const handleSkipTts = () => {
    aiSpeakingRunIdRef.current += 1;
    setTtsSessionError(false);
    void ttsService.stopAudio();
    finishAiLineNavigation(currentSceneIndex, currentDialogueIndex);
  };

  const handleSkipStuckNavigation = () => {
    setNavigationStall(false);
    recoverFromStuckNavigation();
  };

  // ─── Mic dock handler ─────────────────────────────────────────────────────

  const handleMicPress = () => {
    if (phase === "recording") { stopRecording(); }
    else if (phase === "preview") { submitRecording(); }
    else if (phase === "your_turn") { startRecording(); }
  };

  // ─── Full-screen branches ─────────────────────────────────────────────────

  if (loading || isLoadingProgress) {
    return (
      <SafeAreaView style={tw`flex-1 bg-white dark:bg-neutral-900 items-center justify-center`}>
        <Loader />
      </SafeAreaView>
    );
  }

  if (loadError) {
    return (
      <SafeAreaView style={tw`flex-1 bg-white dark:bg-neutral-900 items-center justify-center px-6`}>
        <AppText style={tw`text-gray-600 dark:text-gray-400 text-center mb-4`}>{loadError}</AppText>
        <TouchableOpacity
          onPress={() => void loadDrill()}
          style={tw`bg-green-700 rounded-full px-6 py-3`}
        >
          <AppText style={tw`text-white font-semibold`}>Retry</AppText>
        </TouchableOpacity>
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

  if (isDrillCompleted) {
    const handleRoleplayComplete = () => {
      void exitDrill({ invalidateCaches: false });
    };
    return (
      <DrillCompletedScreen
        variant="progress"
        completed={totalTurns}
        total={totalTurns}
        passed={true}
        celebrate={false}
        title="You passed!"
        message="Great job! You communicated clearly throughout the conversation."
        buttonLabel={progressCtx.source === "weekly_challenge" ? "Back to Challenge" : "Continue"}
        exiting={isExiting}
        onContinue={handleRoleplayComplete}
        onClose={handleRoleplayComplete}
      />
    );
  }

  if (phase === "review") {
    const reviewAnalysisResults = turnAnalyticsToAnalysisResults(sessionAnalytics);
    const avgReviewScore =
      reviewAnalysisResults.length > 0
        ? Math.round(
            reviewAnalysisResults.reduce((sum, r) => sum + r.score, 0) /
              reviewAnalysisResults.length
          )
        : 0;
    const reviewPassed = avgReviewScore >= PASS_THRESHOLD;

    return (
      <SpeechAnalysisReview
        analysisResults={reviewAnalysisResults}
        drillType="roleplay"
        passed={reviewPassed}
        celebrationEffects={celebrationEffects}
        onDone={() => setIsDrillCompleted(true)}
        onPracticeAgain={handleRestart}
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

  const showCompleteSheet = phase === "complete_banner";
  const showCompleteError = phase === "complete_error" && !!completeError;
  const showResumeButton =
    sessionStarted &&
    phase !== "intro" &&
    phase !== "complete_banner" &&
    phase !== "complete_error" &&
    !isDrillCompleted;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={tw`flex-1 bg-white`} edges={["top", "bottom"]}>
      {/* ── Header ── */}
      <DrillHeader
        title={drill.title}
        currentStep={completedStudentTurns + 1}
        totalSteps={totalTurns || 5}
        drillId={routeDrillId}
        isSaved={isSaved}
        onSave={handleSave}
        onUnsave={handleUnsave}
        stepLabel={totalScenes > 1 ? `${currentSceneIndex + 1} of ${totalScenes}` : undefined}
      />

      {showResumeButton && (
        <View style={{ paddingHorizontal: 20, paddingBottom: 8, flexDirection: "row", justifyContent: "flex-end" }}>
          <TouchableOpacity
            onPress={() => void resumeSession()}
            disabled={resumingSession}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 16,
              backgroundColor: "rgba(59,136,62,0.1)",
              opacity: resumingSession ? 0.6 : 1,
            }}
          >
            <AppText style={{ fontSize: 13, fontWeight: "600", color: "#3b883e" }}>
              {resumingSession ? "Resuming…" : "Resume session"}
            </AppText>
          </TouchableOpacity>
        </View>
      )}

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

      {/* ── SCENE BREAK ── */}
      {phase === "scene_break" && sceneBreak && (
        <RoleplaySceneBreakPanel
          completedSceneName={sceneNameAt(drill, sceneBreak.completedSceneIndex)}
          nextSceneName={sceneNameAt(drill, sceneBreak.nextSceneIndex)}
          saving={savingLater}
          showContinueLater={showContinueLater}
          bottomInset={dockBottom}
          onContinueNextScene={handleContinueToNextScene}
          onContinueLater={() => void handleContinueLater()}
        />
      )}

      {/* ── ACTIVE SESSION ── */}
      {phase !== "intro" &&
        phase !== "scene_break" &&
        phase !== "complete_error" &&
        (phase as string) !== "review" &&
        !isDrillCompleted && (
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

            {phase === "your_turn" && !currentPrompt && navigationStall && (
              <View
                style={{
                  marginTop: 16,
                  padding: 16,
                  borderRadius: 16,
                  backgroundColor: "#fffbeb",
                  borderWidth: 1,
                  borderColor: "#fde68a",
                }}
              >
                <AppText style={{ fontSize: 14, fontWeight: "600", color: "#92400e", marginBottom: 8 }}>
                  This line couldn&apos;t load
                </AppText>
                <AppText style={{ fontSize: 13, color: "#78350f", marginBottom: 12, lineHeight: 18 }}>
                  Tap Skip to continue to the next line.
                </AppText>
                <TouchableOpacity
                  onPress={handleSkipStuckNavigation}
                  style={{
                    backgroundColor: "#3b883e",
                    borderRadius: 12,
                    paddingVertical: 10,
                    alignItems: "center",
                  }}
                >
                  <AppText style={{ color: "#fff", fontWeight: "600" }}>Skip</AppText>
                </TouchableOpacity>
              </View>
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

            {ttsSessionError && phase === "ai_speaking" && (
              <View
                style={{
                  marginTop: 16,
                  padding: 16,
                  borderRadius: 16,
                  backgroundColor: "#fef2f2",
                  borderWidth: 1,
                  borderColor: "#fecaca",
                }}
              >
                <AppText style={{ fontSize: 14, fontWeight: "600", color: "#991b1b", marginBottom: 8 }}>
                  Audio timed out
                </AppText>
                <AppText style={{ fontSize: 13, color: "#7f1d1d", marginBottom: 12, lineHeight: 18 }}>
                  We couldn't load the AI line. Retry or skip to your turn.
                </AppText>
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <TouchableOpacity
                    onPress={handleRetryTts}
                    style={{
                      flex: 1,
                      backgroundColor: "#3b883e",
                      borderRadius: 12,
                      paddingVertical: 10,
                      alignItems: "center",
                    }}
                  >
                    <AppText style={{ color: "#fff", fontWeight: "600" }}>Retry</AppText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleSkipTts}
                    style={{
                      flex: 1,
                      backgroundColor: "#fff",
                      borderRadius: 12,
                      paddingVertical: 10,
                      alignItems: "center",
                      borderWidth: 1,
                      borderColor: "#d1d5db",
                    }}
                  >
                    <AppText style={{ color: "#374151", fontWeight: "600" }}>Skip</AppText>
                  </TouchableOpacity>
                </View>
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
          {phase === "score_pass" && !completingDrill && (
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

      {showCompleteError && (
        <View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            top: 0,
            backgroundColor: "rgba(0,0,0,0.55)",
            justifyContent: "flex-end",
          }}
        >
          <View
            style={{
              backgroundColor: "white",
              borderTopLeftRadius: 32,
              borderTopRightRadius: 32,
              paddingHorizontal: 24,
              paddingTop: 28,
              paddingBottom: dockBottom + 20,
            }}
          >
            <AppText style={{ fontSize: 22, fontWeight: "700", color: "#171717", textAlign: "center", marginBottom: 8 }}>
              Couldn't submit results
            </AppText>
            <AppText style={{ fontSize: 14, color: "#6a7282", textAlign: "center", marginBottom: 24, lineHeight: 20 }}>
              {completeError}
            </AppText>
            <TouchableOpacity
              onPress={() => void completeDrillAsync(completedStudentTurns)}
              disabled={completingDrill}
              style={{
                backgroundColor: "#3b883e",
                borderRadius: 35,
                paddingVertical: 16,
                alignItems: "center",
                opacity: completingDrill ? 0.7 : 1,
              }}
            >
              <AppText style={{ color: "#fafafa", fontSize: 16, fontWeight: "700" }}>
                {completingDrill ? "Submitting…" : "Retry"}
              </AppText>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}
