import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Modal,
  Platform,
  ScrollView,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import Svg, { Circle } from 'react-native-svg';

import { AppText, BoldText } from '@/components/ui';
import tw from '@/lib/tw';
import { playPracticeFeedback } from '@/lib/practice-feedback';
import { aiService } from '@/services/ai.service';
import { invalidateLearnerActivityCaches } from '@/hooks/invalidateLearnerActivityCaches';
import { useAuthStore } from '@/store/auth-store';
import {
  appendFreeTalkHistoryEntry,
} from '@/store/free-talk-store';
import {
  formatScenarioType,
  freeTalkStringListToMultiline,
  getScoreColor,
  type FreeTalkScenario,
  type FreeTalkScenarioSummary,
  type FreeTalkAttemptGradeResult,
  type FreeTalkSessionPhase,
} from '@/types/free-talk';
import { useQueryClient } from '@tanstack/react-query';
import { logger } from '@/utils/logger';
import { setAudioModeSafely } from '@/utils/audio';

// ─── Progress bar phase slots ─────────────────────────────────────────────────

function getSituationTtsText(scenario: FreeTalkScenario): string {
  const situation = scenario.situation?.trim();
  if (situation) return situation;
  const parts = [scenario.background?.trim(), scenario.task?.trim()].filter(Boolean);
  return parts.join('\n\n');
}

const PHASE_PROGRESS: Record<FreeTalkSessionPhase, number> = {
  loading: 0.06,
  ready: 0.2,
  responding: 0.5,
  grading: 0.78,
  result: 1.0,
};

// ─── Score Ring ───────────────────────────────────────────────────────────────

function ScoreRing({ score }: { score: number }) {
  const size = 120;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  const color = getScoreColor(score);

  return (
    <View style={tw`items-center justify-center my-4`}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#E5E7EB"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={tw`absolute items-center`}>
        <BoldText style={[tw`text-2xl font-bold`, { color }]}>{score}</BoldText>
        <AppText style={tw`text-xs text-[#777]`}>/ 100</AppText>
      </View>
    </View>
  );
}

// ─── Accordion ────────────────────────────────────────────────────────────────

function Accordion({
  title,
  content,
}: {
  title: string;
  content: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View style={tw`bg-neutral-50 dark:bg-neutral-800 rounded-xl mb-3 overflow-hidden`}>
      <TouchableOpacity
        style={tw`flex-row items-center justify-between p-4`}
        activeOpacity={0.7}
        onPress={() => setOpen((v) => !v)}
      >
        <BoldText style={tw`text-sm font-bold text-[#171717] dark:text-white`}>{title}</BoldText>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color="#9CA3AF" />
      </TouchableOpacity>
      {open && (
        <View style={tw`px-4 pb-4`}>
          <AppText style={tw`text-sm text-[#555] dark:text-neutral-300 leading-relaxed`}>
            {content}
          </AppText>
        </View>
      )}
    </View>
  );
}

// ─── Session Screen ───────────────────────────────────────────────────────────

export default function FreeTalkSessionScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ scenarioId?: string }>();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const scrollRef = useRef<ScrollView>(null);

  // Session state
  const [phase, setPhase] = useState<FreeTalkSessionPhase>('loading');
  const [scenarios, setScenarios] = useState<FreeTalkScenarioSummary[]>([]);
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [scenario, setScenario] = useState<FreeTalkScenario | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // TTS
  const ttsSoundRef = useRef<Audio.Sound | null>(null);
  const ttsRunIdRef = useRef(0);
  const autoTtsRunIdRef = useRef(0);
  const prefetchedTtsUriRef = useRef<string | null>(null);
  const prefetchedTtsTextRef = useRef<string | null>(null);
  const loadScenarioRunIdRef = useRef(0);
  const [ttsPlaying, setTtsPlaying] = useState(false);
  const [hintTtsPlaying, setHintTtsPlaying] = useState(false);

  // Recording
  const recordingRef = useRef<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzingVoice, setIsAnalyzingVoice] = useState(false);
  const recordingStartTimeRef = useRef<number>(0);
  const recordingUriRef = useRef<string | null>(null);

  // Text input
  const [showTextInput, setShowTextInput] = useState(false);
  const [userTextInput, setUserTextInput] = useState('');

  // Grading / result
  const [feedbackText, setFeedbackText] = useState('');
  const [gradeResult, setGradeResult] = useState<FreeTalkAttemptGradeResult | null>(null);

  // Leave modal
  const [showLeaveModal, setShowLeaveModal] = useState(false);

  // Abort controller
  const abortRef = useRef<AbortController | null>(null);
  const feedbackPlayedRef = useRef(false);

  // ─── Progress bar ──────────────────────────────────────────────────────────

  const progressPercent = useMemo(() => {
    const total = scenarios.length || 1;
    const phaseSlot = PHASE_PROGRESS[phase];
    return ((scenarioIndex + phaseSlot) / total) * 100;
  }, [phase, scenarioIndex, scenarios.length]);

  function clearPrefetchedTts() {
    prefetchedTtsUriRef.current = null;
    prefetchedTtsTextRef.current = null;
  }

  function takePrefetchedSituationTtsUri(text: string): string | null {
    const trimmed = text.trim();
    if (
      trimmed &&
      prefetchedTtsTextRef.current === trimmed &&
      prefetchedTtsUriRef.current
    ) {
      const uri = prefetchedTtsUriRef.current;
      clearPrefetchedTts();
      return uri;
    }
    return null;
  }

  // ─── Load scenario ─────────────────────────────────────────────────────────

  const loadScenario = useCallback(async (index: number, list: FreeTalkScenarioSummary[]) => {
    if (list.length === 0) return;
    const target = list[index];
    const loadRunId = ++loadScenarioRunIdRef.current;

    setPhase('loading');
    setScenario(null);
    setFeedbackText('');
    setGradeResult(null);
    feedbackPlayedRef.current = false;
    setLoadError(null);
    setShowTextInput(false);
    setUserTextInput('');
    clearPrefetchedTts();

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    try {
      const scenarioData = await aiService.fetchFreeTalkScenario({
        scenarioId: target.id,
        signal: abortRef.current.signal,
      });
      if (loadRunId !== loadScenarioRunIdRef.current) return;

      const ttsText = getSituationTtsText(scenarioData).trim();
      if (ttsText) {
        try {
          const uri = await aiService.fetchFreeTalkTtsUri(ttsText);
          if (loadRunId !== loadScenarioRunIdRef.current) return;
          if (uri?.trim()) {
            prefetchedTtsUriRef.current = uri;
            prefetchedTtsTextRef.current = ttsText;
          }
        } catch (err) {
          if (loadRunId !== loadScenarioRunIdRef.current) return;
          logger.warn('Free Talk TTS prefetch failed:', err);
        }
      }

      if (loadRunId !== loadScenarioRunIdRef.current) return;
      setScenario(scenarioData);
      setPhase('ready');
    } catch (err: any) {
      if (loadRunId !== loadScenarioRunIdRef.current) return;
      if (err?.name === 'AbortError' || err?.message === 'canceled') return;
      const msg =
        err?.message === 'Subscription required'
          ? 'A Pro subscription is required to use Free Talk.'
          : 'Failed to load scenario. Please try again.';
      setLoadError(msg);
      setPhase('loading');
    }
  }, []);

  // ─── Initialize ────────────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        const list = await aiService.fetchFreeTalkScenarioSummaries();
        if (cancelled) return;
        setScenarios(list);

        let startIndex = 0;
        if (params.scenarioId) {
          const idx = list.findIndex((s) => s.id === params.scenarioId);
          if (idx !== -1) startIndex = idx;
        }
        setScenarioIndex(startIndex);
        await loadScenario(startIndex, list);
      } catch (err: any) {
        if (cancelled) return;
        const msg =
          err?.message === 'Subscription required'
            ? 'A Pro subscription is required to use Free Talk.'
            : 'Failed to load scenarios. Please try again.';
        setLoadError(msg);
      }
    }
    init();
    return () => {
      cancelled = true;
      loadScenarioRunIdRef.current += 1;
      abortRef.current?.abort();
      clearPrefetchedTts();
      stopAndUnloadTts();
    };
  }, []);

  // Auto-play situation TTS when session becomes ready (roleplay intro pattern; separate run id)
  useEffect(() => {
    if (phase !== 'ready' || !scenario) return;

    const autoTtsText = getSituationTtsText(scenario).trim();
    if (!autoTtsText) return;

    const runId = ++autoTtsRunIdRef.current;
    let cancelled = false;

    (async () => {
      try {
        await setAudioModeSafely({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
        });
        await stopAndUnloadTts();
        if (cancelled || runId !== autoTtsRunIdRef.current) return;

        let audioUri = takePrefetchedSituationTtsUri(autoTtsText);
        if (!audioUri?.trim()) {
          audioUri = await aiService.fetchFreeTalkTtsUri(autoTtsText);
        }
        if (cancelled || runId !== autoTtsRunIdRef.current || !audioUri?.trim()) return;

        setTtsPlaying(true);
        const { sound } = await Audio.Sound.createAsync({ uri: audioUri });
        if (cancelled || runId !== autoTtsRunIdRef.current) {
          await sound.unloadAsync().catch(() => {});
          return;
        }

        ttsSoundRef.current = sound;
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) {
            sound.setOnPlaybackStatusUpdate(null);
            sound.unloadAsync().catch(() => {});
            if (ttsSoundRef.current === sound) ttsSoundRef.current = null;
            setTtsPlaying(false);
          }
        });
        await sound.playAsync();
        logger.log('✅ Free Talk auto TTS playing');
      } catch (err) {
        if (!cancelled && runId === autoTtsRunIdRef.current) {
          setTtsPlaying(false);
        }
        logger.error('Free Talk auto TTS error:', err);
      }
    })();

    return () => {
      cancelled = true;
      void stopAndUnloadTts();
    };
  }, [phase, scenario?.id]);

  // ─── TTS helpers ──────────────────────────────────────────────────────────

  async function stopAndUnloadTts() {
    if (ttsSoundRef.current) {
      try {
        await ttsSoundRef.current.stopAsync();
        await ttsSoundRef.current.unloadAsync();
      } catch {}
      ttsSoundRef.current = null;
      setTtsPlaying(false);
      setHintTtsPlaying(false);
    }
  }

  async function playTts(text: string, type: 'situation' | 'hint') {
    const trimmed = text.trim();
    if (!trimmed) {
      logger.warn('Free Talk TTS skipped: empty text');
      return;
    }

    const runId = ++ttsRunIdRef.current;
    await stopAndUnloadTts();
    try {
      await setAudioModeSafely({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });
      let audioUri =
        type === 'situation' ? takePrefetchedSituationTtsUri(trimmed) : null;
      if (!audioUri?.trim()) {
        audioUri = await aiService.fetchFreeTalkTtsUri(trimmed);
      }
      if (runId !== ttsRunIdRef.current) return;

      if (type === 'situation') setTtsPlaying(true);
      else setHintTtsPlaying(true);

      const { sound } = await Audio.Sound.createAsync({ uri: audioUri });
      if (runId !== ttsRunIdRef.current) {
        await sound.unloadAsync().catch(() => {});
        return;
      }

      ttsSoundRef.current = sound;
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.setOnPlaybackStatusUpdate(null);
          sound.unloadAsync().catch(() => {});
          if (ttsSoundRef.current === sound) ttsSoundRef.current = null;
          setTtsPlaying(false);
          setHintTtsPlaying(false);
        }
      });
      await sound.playAsync();
    } catch (err) {
      if (runId === ttsRunIdRef.current) {
        setTtsPlaying(false);
        setHintTtsPlaying(false);
      }
      logger.error('TTS playback error:', err);
    }
  }

  async function toggleTts(text: string, type: 'situation' | 'hint') {
    const isPlaying = type === 'situation' ? ttsPlaying : hintTtsPlaying;
    if (isPlaying) {
      await stopAndUnloadTts();
    } else {
      playTts(text, type).catch(() => {});
    }
  }

  // ─── Recording ────────────────────────────────────────────────────────────

  async function startRecording() {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        setShowTextInput(true);
        return;
      }
      await stopAndUnloadTts();
      await setAudioModeSafely({ allowsRecordingIOS: true, playsInSilentModeIOS: true });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
      recordingStartTimeRef.current = Date.now();
      setIsRecording(true);
    } catch (err: any) {
      logger.error('Start recording error:', err);
      setShowTextInput(true);
    }
  }

  async function stopRecording() {
    if (!recordingRef.current) return;
    const durationMs = Date.now() - recordingStartTimeRef.current;
    setIsRecording(false);
    setIsAnalyzingVoice(true);

    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;
      await setAudioModeSafely({ allowsRecordingIOS: false, playsInSilentModeIOS: true });

      if (!uri) throw new Error('No recording URI');
      recordingUriRef.current = uri;

      const transcript = await aiService.transcribeFreeTalkAudio(uri, 'audio/m4a');
      setIsAnalyzingVoice(false);

      if (!transcript.trim()) {
        Alert.alert('No speech detected', 'We could not detect any speech. Please try again or type your response.');
        setShowTextInput(true);
        return;
      }

      await submitResponse(transcript, { uri, mimeType: 'audio/m4a', durationMs });
    } catch (err: any) {
      logger.error('Stop recording error:', err);
      setIsAnalyzingVoice(false);
      Alert.alert('Error', 'Failed to process recording. Please type your response instead.');
      setShowTextInput(true);
    }
  }

  // ─── Submit response ──────────────────────────────────────────────────────

  async function submitResponse(
    userResponse: string,
    audio?: { uri: string; mimeType: string; durationMs: number } | null
  ) {
    if (!scenario) return;
    setPhase('grading');
    setFeedbackText('');
    setGradeResult(null);
    feedbackPlayedRef.current = false;
    scrollRef.current?.scrollTo({ y: 0, animated: true });

    let finalFeedback = '';
    let finalGrade: FreeTalkAttemptGradeResult | null = null;
    let receivedMetadata = false;

    try {
      await aiService.streamFreeTalkGrading(
        { userResponse, scenarioId: scenario.id },
        (chunk) => {
          if (chunk.type === 'text') {
            finalFeedback += chunk.data;
            setFeedbackText((prev) => prev + chunk.data);
          } else if (chunk.type === 'metadata') {
            finalFeedback = chunk.data.fullText;
            finalGrade = chunk.data.grade;
            receivedMetadata = true;
            setFeedbackText(chunk.data.fullText);
            setGradeResult(chunk.data.grade);
            setPhase('result');
            if (!feedbackPlayedRef.current && chunk.data.grade) {
              feedbackPlayedRef.current = true;
              void playPracticeFeedback(
                chunk.data.grade.overallScore >= 60 ? 'success' : 'failure'
              );
            }
          } else if (chunk.type === 'error') {
            throw new Error((chunk.data as any).message ?? 'Grading error');
          }
        }
      );

      // If stream ended without metadata
      if (!receivedMetadata) {
        setPhase('result');
      }
    } catch (err: any) {
      logger.error('Grading error:', err);
      setPhase('result');
    }

    // Persist attempt
    await persistAttempt(finalFeedback, finalGrade, audio);
  }

  async function persistAttempt(
    feedbackText: string,
    gradeResult: FreeTalkAttemptGradeResult | null,
    audio?: { uri: string; mimeType: string; durationMs: number } | null
  ) {
    if (!scenario || !user?.id) return;

    const payload = {
      scenarioId: scenario.id,
      scenarioTitle: scenario.title,
      scenarioType: scenario.scenarioType,
      feedbackText,
      gradeResult,
      durationMs: audio?.durationMs ?? 0,
      usedVoice: !!audio,
    };

    try {
      await aiService.saveFreeTalkAttempt(
        payload,
        audio ? { uri: audio.uri, mimeType: audio.mimeType } : null
      );
      await invalidateLearnerActivityCaches(queryClient);
      await queryClient.invalidateQueries({ queryKey: ['free-talk', 'completed-scenario-ids'] });
    } catch (err) {
      logger.warn('saveFreeTalkAttempt failed, saving locally', err);
      await appendFreeTalkHistoryEntry(user.id, {
        scenarioId: scenario.id,
        scenarioTitle: scenario.title,
        scenarioType: scenario.scenarioType,
        feedbackText,
        gradeResult,
        durationMs: audio?.durationMs ?? null,
        usedVoice: !!audio,
      });
    }
  }

  // ─── Navigation ───────────────────────────────────────────────────────────

  function handleBack() {
    if (phase === 'result' || phase === 'loading' || phase === 'ready') {
      router.back();
    } else {
      setShowLeaveModal(true);
    }
  }

  function handleLeave() {
    setShowLeaveModal(false);
    loadScenarioRunIdRef.current += 1;
    abortRef.current?.abort();
    clearPrefetchedTts();
    stopAndUnloadTts();
    if (recordingRef.current) {
      recordingRef.current.stopAndUnloadAsync().catch(() => {});
      recordingRef.current = null;
    }
    router.back();
  }

  function handleNext() {
    const nextIndex = (scenarioIndex + 1) % scenarios.length;
    setScenarioIndex(nextIndex);
    loadScenario(nextIndex, scenarios);
  }

  function handleTryAgain() {
    loadScenario(scenarioIndex, scenarios);
  }

  function handleDone() {
    router.back();
  }

  // ─── Submit text ──────────────────────────────────────────────────────────

  async function handleSendText() {
    if (!userTextInput.trim()) return;
    const text = userTextInput.trim();
    setUserTextInput('');
    setShowTextInput(false);
    await submitResponse(text, null);
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <SafeAreaView edges={['top']} style={tw`flex-1 bg-white dark:bg-neutral-900`}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={tw`px-5 pt-3 pb-2 flex-row items-center gap-3`}>
        <TouchableOpacity
          onPress={handleBack}
          style={tw`w-9 h-9 rounded-full bg-neutral-100 dark:bg-neutral-800 items-center justify-center shrink-0`}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={18} color="#374151" />
        </TouchableOpacity>
        <View style={tw`flex-1`}>
          {scenario && (
            <AppText style={tw`text-xs text-[#777] dark:text-neutral-400 mb-0.5`}>
              {formatScenarioType(scenario.scenarioType)}
            </AppText>
          )}
          {/* Progress bar */}
          <View style={tw`h-1.5 bg-neutral-100 dark:bg-neutral-700 rounded-full overflow-hidden`}>
            <View
              style={[
                tw`h-full bg-[#4CAF50] rounded-full`,
                { width: `${Math.min(progressPercent, 100)}%` },
              ]}
            />
          </View>
        </View>
        {scenarios.length > 0 && (
          <AppText style={tw`text-xs text-[#777] dark:text-neutral-400 shrink-0`}>
            {scenarioIndex + 1}/{scenarios.length}
          </AppText>
        )}
      </View>

      {/* ── Loading phase ── */}
      {(phase === 'loading' && !loadError) && (
        <View style={tw`flex-1 items-center justify-center px-6`}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <AppText style={tw`text-sm text-[#777] dark:text-neutral-400 mt-4`}>
            Preparing your scenario…
          </AppText>
        </View>
      )}

      {/* ── Load error ── */}
      {loadError && (
        <View style={tw`flex-1 items-center justify-center px-8`}>
          <Ionicons name="alert-circle-outline" size={40} color="#F44336" />
          <AppText style={tw`text-sm text-[#555] dark:text-neutral-300 text-center mt-3`}>
            {loadError}
          </AppText>
          <TouchableOpacity
            style={tw`mt-4 bg-[#4CAF50] px-5 py-2.5 rounded-xl`}
            onPress={() => loadScenario(scenarioIndex, scenarios)}
          >
            <AppText style={tw`text-sm text-white font-bold`}>Retry</AppText>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Ready / Responding phases ── */}
      {(phase === 'ready' || phase === 'responding') && scenario && (
        <ScrollView
          ref={scrollRef}
          style={tw`flex-1`}
          contentContainerStyle={[
            tw`px-5 pb-8`,
            phase === 'responding' && { paddingBottom: 100 + insets.bottom },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Background Card */}
          <View style={tw`bg-neutral-50 dark:bg-neutral-800 rounded-2xl p-4 mb-3`}>
            <View style={tw`flex-row items-start justify-between mb-2`}>
              <BoldText style={tw`text-base font-bold text-[#4CAF50] flex-1 pr-3`}>
                {scenario.title}
              </BoldText>
              <View style={tw`flex-row gap-2`}>
                <TouchableOpacity
                  onPress={() => toggleTts(getSituationTtsText(scenario), 'situation')}
                  style={tw`w-8 h-8 rounded-full bg-white dark:bg-neutral-700 items-center justify-center`}
                >
                  <Ionicons
                    name={ttsPlaying ? 'stop' : 'volume-medium-outline'}
                    size={16}
                    color="#4CAF50"
                  />
                </TouchableOpacity>
                <View style={tw`w-8 h-8 rounded-full bg-white dark:bg-neutral-700 items-center justify-center opacity-40`}>
                  <Ionicons name="language-outline" size={16} color="#6B7280" />
                </View>
              </View>
            </View>
            <AppText style={tw`text-sm text-[#555] dark:text-neutral-300 leading-relaxed`}>
              {scenario.situation}
            </AppText>
          </View>

          {/* Include accordion */}
          {scenario.include.length > 0 && (
            <Accordion
              title="Include"
              content={freeTalkStringListToMultiline(scenario.include)}
            />
          )}

          {/* Useful Phrases accordion */}
          {scenario.usefulPhrases.length > 0 && (
            <Accordion
              title="Useful phrases"
              content={freeTalkStringListToMultiline(scenario.usefulPhrases)}
            />
          )}

          {/* Your Turn card */}
          <View style={tw`bg-[#4CAF50]/10 dark:bg-[#4CAF50]/20 border border-[#4CAF50]/30 rounded-2xl p-4 mb-3`}>
            <View style={tw`flex-row items-start justify-between mb-2`}>
              <BoldText style={tw`text-sm font-bold text-[#2A602C] dark:text-[#86EFAC] flex-1 pr-3 text-center`}>
                {scenario.hint || scenario.task}
              </BoldText>
              <TouchableOpacity
                onPress={() => toggleTts(scenario.hint || scenario.task, 'hint')}
                style={tw`w-8 h-8 rounded-full bg-white dark:bg-neutral-700 items-center justify-center shrink-0`}
              >
                <Ionicons
                  name={hintTtsPlaying ? 'stop' : 'volume-medium-outline'}
                  size={16}
                  color="#4CAF50"
                />
              </TouchableOpacity>
            </View>

            {!showTextInput && (
              <TouchableOpacity onPress={() => setShowTextInput(true)}>
                <AppText style={tw`text-xs text-[#4CAF50] text-center underline mt-1`}>
                  Can't use the microphone? Type your response
                </AppText>
              </TouchableOpacity>
            )}
          </View>

          {/* Got it button (ready phase) */}
          {phase === 'ready' && (
            <TouchableOpacity
              style={tw`bg-[#4CAF50] rounded-2xl py-4 items-center mt-2`}
              activeOpacity={0.8}
              onPress={() => setPhase('responding')}
            >
              <BoldText style={tw`text-base font-bold text-white`}>Got it — I'm ready</BoldText>
            </TouchableOpacity>
          )}

          {/* Text input (responding phase) */}
          {phase === 'responding' && showTextInput && (
            <View style={tw`mt-3 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl p-4`}>
              <TextInput
                style={[
                  tw`text-sm text-[#171717] dark:text-white`,
                  { minHeight: 80, textAlignVertical: 'top' },
                ]}
                multiline
                numberOfLines={4}
                placeholder="Type your response here…"
                placeholderTextColor="#9CA3AF"
                value={userTextInput}
                onChangeText={setUserTextInput}
                autoFocus
              />
              <View style={tw`flex-row justify-end gap-3 mt-3`}>
                <TouchableOpacity
                  style={tw`px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-600`}
                  onPress={() => { setShowTextInput(false); setUserTextInput(''); }}
                >
                  <AppText style={tw`text-sm text-[#777]`}>Cancel</AppText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={tw`px-4 py-2 rounded-xl bg-[#4CAF50]`}
                  onPress={handleSendText}
                  disabled={!userTextInput.trim()}
                >
                  <AppText style={tw`text-sm text-white font-bold`}>Send</AppText>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
      )}

      {/* ── Grading phase ── */}
      {phase === 'grading' && (
        <ScrollView
          ref={scrollRef}
          style={tw`flex-1`}
          contentContainerStyle={tw`px-5 pb-8`}
          showsVerticalScrollIndicator={false}
        >
          <View style={tw`items-center pt-6 pb-4`}>
            <ActivityIndicator size="large" color="#4CAF50" />
            <AppText style={tw`text-sm text-[#777] dark:text-neutral-400 mt-3`}>
              Analysing your response…
            </AppText>
          </View>
          {!!feedbackText && (
            <View style={tw`bg-neutral-50 dark:bg-neutral-800 rounded-2xl p-4 mt-2`}>
              <AppText style={tw`text-sm text-[#555] dark:text-neutral-300 leading-relaxed`}>
                {feedbackText}
              </AppText>
            </View>
          )}
        </ScrollView>
      )}

      {/* ── Result phase ── */}
      {phase === 'result' && (
        <ScrollView
          ref={scrollRef}
          style={tw`flex-1`}
          contentContainerStyle={[tw`px-5 pb-8`, { paddingBottom: 24 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Score ring + competency */}
          {gradeResult ? (
            <>
              <ScoreRing score={gradeResult.overallScore} />
              <BoldText style={tw`text-lg font-bold text-[#171717] dark:text-white text-center mb-1`}>
                {gradeResult.competencyLevel}
              </BoldText>
              <View style={tw`items-center mb-4`}>
                <View style={tw`bg-neutral-100 dark:bg-neutral-800 rounded-full px-3 py-1`}>
                  <AppText style={tw`text-xs text-[#777] dark:text-neutral-400`}>
                    {gradeResult.rawScore} / {gradeResult.maxScore} pts
                  </AppText>
                </View>
              </View>
            </>
          ) : (
            <View style={tw`py-6 items-center`}>
              <Ionicons name="checkmark-circle-outline" size={48} color="#4CAF50" />
              <BoldText style={tw`text-lg font-bold text-[#171717] dark:text-white text-center mt-2`}>
                Response Submitted
              </BoldText>
            </View>
          )}

          {/* Feedback */}
          {!!feedbackText && (
            <View style={tw`bg-neutral-50 dark:bg-neutral-800 rounded-2xl p-4 mb-4`}>
              <BoldText style={tw`text-sm font-bold text-[#171717] dark:text-white mb-2`}>Feedback</BoldText>
              <AppText style={tw`text-sm text-[#555] dark:text-neutral-300 leading-relaxed`}>
                {feedbackText}
              </AppText>
            </View>
          )}

          {/* Behaviours */}
          {gradeResult && gradeResult.behaviours.length > 0 && (
            <View style={tw`bg-neutral-50 dark:bg-neutral-800 rounded-2xl p-4 mb-4`}>
              <BoldText style={tw`text-sm font-bold text-[#171717] dark:text-white mb-3`}>
                Clinical Communication Behaviours
              </BoldText>
              {gradeResult.behaviours.map((b) => (
                <View key={b.id} style={tw`flex-row items-center gap-3 mb-2.5`}>
                  <Ionicons
                    name={
                      b.result === 'full'
                        ? 'checkmark-circle'
                        : b.result === 'partial'
                        ? 'remove-circle'
                        : 'close-circle'
                    }
                    size={20}
                    color={
                      b.result === 'full' ? '#4CAF50' : b.result === 'partial' ? '#FF9800' : '#F44336'
                    }
                  />
                  <AppText style={tw`text-sm text-[#555] dark:text-neutral-300 flex-1`}>
                    {b.name}
                  </AppText>
                  <AppText style={tw`text-xs text-[#777] dark:text-neutral-400 shrink-0`}>
                    {b.score === 1 ? '1 pt' : b.score === 0.5 ? '½ pt' : '0 pts'}
                  </AppText>
                </View>
              ))}
            </View>
          )}

          {/* Action buttons */}
          <View style={tw`gap-3 mt-2`}>
            {scenarios.length > 1 && (
              <TouchableOpacity
                style={tw`bg-[#4CAF50] rounded-2xl py-4 items-center`}
                activeOpacity={0.8}
                onPress={handleNext}
              >
                <BoldText style={tw`text-base font-bold text-white`}>Next scenario</BoldText>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={tw`bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl py-4 items-center`}
              activeOpacity={0.8}
              onPress={handleTryAgain}
            >
              <BoldText style={tw`text-base font-bold text-[#4CAF50]`}>Try again</BoldText>
            </TouchableOpacity>
            <TouchableOpacity
              style={tw`rounded-2xl py-4 items-center`}
              activeOpacity={0.8}
              onPress={handleDone}
            >
              <AppText style={tw`text-base text-[#777] dark:text-neutral-400`}>Done</AppText>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* ── Mic button (responding phase, not typing) ── */}
      {phase === 'responding' && !showTextInput && (
        <View
          style={[
            tw`absolute left-0 right-0 items-center`,
            { bottom: Math.max(24, insets.bottom) },
          ]}
        >
          {isAnalyzingVoice ? (
            <View style={tw`bg-white dark:bg-neutral-800 rounded-full px-5 py-3 shadow-md flex-row items-center gap-2`}>
              <ActivityIndicator size="small" color="#4CAF50" />
              <AppText style={tw`text-sm text-[#777]`}>Analysing voice…</AppText>
            </View>
          ) : (
            <TouchableOpacity
              onPress={isRecording ? stopRecording : startRecording}
              style={[
                tw`w-20 h-20 rounded-full items-center justify-center shadow-lg`,
                { backgroundColor: isRecording ? '#F44336' : '#4CAF50' },
              ]}
              activeOpacity={0.85}
            >
              <Ionicons
                name={isRecording ? 'stop' : 'mic'}
                size={32}
                color="#fff"
              />
            </TouchableOpacity>
          )}
          {isRecording && (
            <View style={tw`mt-2 bg-red-50 dark:bg-red-900/20 rounded-full px-4 py-1`}>
              <AppText style={tw`text-xs text-red-500`}>Recording… tap to stop</AppText>
            </View>
          )}
        </View>
      )}

      {/* ── Leave modal ── */}
      <Modal
        visible={showLeaveModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLeaveModal(false)}
      >
        <View style={tw`flex-1 bg-black/50 items-center justify-center px-8`}>
          <View style={tw`bg-white dark:bg-neutral-800 rounded-3xl p-6 w-full`}>
            <BoldText style={tw`text-lg font-bold text-[#171717] dark:text-white text-center mb-2`}>
              Leave this session?
            </BoldText>
            <AppText style={tw`text-sm text-[#777] dark:text-neutral-400 text-center mb-6`}>
              Your progress won't be saved.
            </AppText>
            <View style={tw`gap-3`}>
              <TouchableOpacity
                style={tw`bg-[#F44336] rounded-2xl py-3.5 items-center`}
                activeOpacity={0.8}
                onPress={handleLeave}
              >
                <BoldText style={tw`text-base font-bold text-white`}>Leave</BoldText>
              </TouchableOpacity>
              <TouchableOpacity
                style={tw`bg-neutral-100 dark:bg-neutral-700 rounded-2xl py-3.5 items-center`}
                activeOpacity={0.8}
                onPress={() => setShowLeaveModal(false)}
              >
                <AppText style={tw`text-base text-[#171717] dark:text-white`}>Keep going</AppText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
