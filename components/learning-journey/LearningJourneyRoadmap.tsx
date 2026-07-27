import { LearningJourneyPartCard } from '@/components/learning-journey/LearningJourneyPartCard';
import { BoldText } from '@/components/ui';
import {
  getMissionTheme,
  MISSION_COMPLETED_COLOR,
  railSegmentColor,
  railSegmentFillRatio,
  resolveViewDetailsPart,
  type LearningJourneyPartId,
  type MissionIconKey,
  type MissionState,
  type MissionVisualStatus,
} from '@/domain/learning-journey/learning-journey.catalog';
import { useTranslation } from '@/contexts/LanguageContext';
import { useSemanticTheme } from '@/hooks/useSemanticTheme';
import tw from '@/lib/tw';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  TouchableOpacity,
  View,
} from 'react-native';

const NODE_SIZE = 52;
const RAIL_WIDTH = 4;
const STEP_RAIL_MS = 380;
const STEP_NODE_PAUSE_MS = 120;
const MAX_SEGMENTS = 4;

export type LearningJourneyRoadmapProps = {
  states: MissionState[];
  onOpenPart: (part: LearningJourneyPartId) => void;
};

function MissionNodeIcon({
  iconKey,
  color,
  size = 22,
}: {
  iconKey: MissionIconKey;
  color: string;
  size?: number;
}) {
  switch (iconKey) {
    case 'stethoscope':
      return (
        <MaterialCommunityIcons name="stethoscope" size={size} color={color} />
      );
    case 'people':
      return <Ionicons name="people" size={size} color={color} />;
    case 'message':
      return <Ionicons name="chatbubbles" size={size} color={color} />;
    case 'clipboard':
      return <Ionicons name="clipboard" size={size} color={color} />;
    case 'star':
      return <Ionicons name="star" size={size} color={color} />;
    default:
      return <Ionicons name="ellipse" size={size} color={color} />;
  }
}

function nodeBackground(status: MissionVisualStatus, accent: string): string {
  if (status === 'locked') return '#e5e7eb';
  if (status === 'completed' || status === 'journeyComplete') {
    return MISSION_COMPLETED_COLOR;
  }
  return accent;
}

function isCompletedLike(status: MissionVisualStatus): boolean {
  return status === 'completed' || status === 'journeyComplete';
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Animate a 0–1 fill ratio (maps to % height of the flex rail connector). */
function animateFillRatio(
  value: Animated.Value,
  toValue: number,
  duration: number
): Promise<void> {
  return new Promise((resolve) => {
    Animated.timing(value, {
      toValue,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start(({ finished }) => {
      resolve();
      void finished;
    });
  });
}

function TimelineNode({
  status,
  accent,
  iconKey,
  animateUnlock,
  animateCheckIn,
  isCurrent,
}: {
  status: MissionVisualStatus;
  accent: string;
  iconKey: MissionIconKey;
  animateUnlock: boolean;
  animateCheckIn: boolean;
  isCurrent: boolean;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const iconOpacity = useRef(new Animated.Value(status === 'locked' ? 0 : 1)).current;
  const lockOpacity = useRef(new Animated.Value(status === 'locked' ? 1 : 0)).current;
  const prevStatus = useRef(status);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const reduceMotion = await AccessibilityInfo.isReduceMotionEnabled();
      if (cancelled) return;

      const prev = prevStatus.current;
      const wasLocked = prev === 'locked';
      const nowUnlocked = status !== 'locked';
      const becameComplete =
        !isCompletedLike(prev) && isCompletedLike(status);
      prevStatus.current = status;

      if (wasLocked && nowUnlocked && animateUnlock && !reduceMotion) {
        lockOpacity.setValue(1);
        iconOpacity.setValue(0);
        scale.setValue(0.75);
        Animated.parallel([
          Animated.sequence([
            Animated.timing(scale, {
              toValue: 1.12,
              duration: 220,
              useNativeDriver: true,
            }),
            Animated.timing(scale, {
              toValue: 1,
              duration: 180,
              useNativeDriver: true,
            }),
          ]),
          Animated.timing(lockOpacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(iconOpacity, {
            toValue: 1,
            duration: 280,
            useNativeDriver: true,
          }),
        ]).start();
      } else if (becameComplete && animateCheckIn && !reduceMotion) {
        scale.setValue(0.85);
        iconOpacity.setValue(0.4);
        lockOpacity.setValue(0);
        Animated.parallel([
          Animated.sequence([
            Animated.timing(scale, {
              toValue: 1.14,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(scale, {
              toValue: 1,
              duration: 160,
              useNativeDriver: true,
            }),
          ]),
          Animated.timing(iconOpacity, {
            toValue: 1,
            duration: 220,
            useNativeDriver: true,
          }),
        ]).start();
      } else {
        scale.setValue(1);
        lockOpacity.setValue(status === 'locked' ? 1 : 0);
        iconOpacity.setValue(status === 'locked' ? 0 : 1);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [status, animateUnlock, animateCheckIn, scale, iconOpacity, lockOpacity]);

  const bg = nodeBackground(status, accent);
  const emphasisRing =
    isCurrent && status === 'active'
      ? `0px 0px 0px 2px ${accent}33, 0px 10px 15px rgba(0,0,0,0.1)`
      : status === 'locked'
        ? '0px 4px 6px rgba(0,0,0,0.1)'
        : `0px 0px 0px 2px ${bg}33, 0px 10px 15px rgba(0,0,0,0.1)`;

  return (
    <Animated.View
      style={[
        tw`items-center justify-center rounded-full border-4 border-white`,
        {
          width: NODE_SIZE,
          height: NODE_SIZE,
          backgroundColor: bg,
          transform: [{ scale }],
          boxShadow: emphasisRing,
        },
      ]}
    >
      <Animated.View style={[tw`absolute`, { opacity: lockOpacity }]}>
        <Ionicons name="lock-closed" size={18} color="#6b7280" />
      </Animated.View>

      <Animated.View style={{ opacity: iconOpacity }}>
        {status === 'journeyComplete' ? (
          <Ionicons name="trophy" size={22} color="#fff" />
        ) : status === 'completed' ? (
          <Ionicons name="checkmark" size={24} color="#fff" />
        ) : status !== 'locked' ? (
          <MissionNodeIcon iconKey={iconKey} color="#fff" />
        ) : null}
      </Animated.View>
    </Animated.View>
  );
}

export const LearningJourneyRoadmap = memo(function LearningJourneyRoadmap({
  states,
  onOpenPart,
}: LearningJourneyRoadmapProps) {
  const { t } = useTranslation();
  const { colors: c } = useSemanticTheme();
  const prevEnrolledRef = useRef<Set<LearningJourneyPartId> | null>(null);
  const [justUnlocked, setJustUnlocked] = useState<Set<LearningJourneyPartId>>(
    () => new Set()
  );
  /** Last mission index revealed during load anim (-1 = none yet). */
  const [revealedThrough, setRevealedThrough] = useState(-1);
  const [animReady, setAnimReady] = useState(false);

  /** Per-segment fill ratio 0–1 (progress-aware; not always full). */
  const segmentAnims = useRef(
    Array.from({ length: MAX_SEGMENTS }, () => new Animated.Value(0))
  ).current;
  const statesRef = useRef(states);
  statesRef.current = states;

  const segmentCount = Math.max(0, states.length - 1);

  useEffect(() => {
    const enrolledNow = new Set(
      states.filter((s) => s.isEnrolled).map((s) => s.part)
    );
    const prev = prevEnrolledRef.current;
    if (prev) {
      const unlocked = new Set<LearningJourneyPartId>();
      for (const part of enrolledNow) {
        if (!prev.has(part)) unlocked.add(part);
      }
      setJustUnlocked(unlocked);
    }
    prevEnrolledRef.current = enrolledNow;
  }, [states]);

  const viewDetailsPart = useMemo(
    () => resolveViewDetailsPart(states),
    [states]
  );

  const segmentColors = useMemo(
    () =>
      states.slice(0, -1).map((state) => {
        const theme = getMissionTheme(state.part);
        return railSegmentColor(state.status, theme.accent);
      }),
    [states]
  );

  // Progression load animation on each My Plan focus (not mid-scroll within visit).
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      setAnimReady(false);
      setRevealedThrough(-1);
      for (const anim of segmentAnims) anim.setValue(0);

      const snapFinal = (snapshot: MissionState[]) => {
        const segs = Math.max(0, snapshot.length - 1);
        for (let i = 0; i < MAX_SEGMENTS; i++) {
          const state = snapshot[i];
          segmentAnims[i].setValue(
            i < segs && state
              ? railSegmentFillRatio(state.status, state.percent)
              : 0
          );
        }
        setRevealedThrough(snapshot.length - 1);
        setAnimReady(true);
      };

      const play = async () => {
        const reduceMotion = await AccessibilityInfo.isReduceMotionEnabled();
        if (cancelled) return;

        const snapshot = statesRef.current;
        const segs = Math.max(0, snapshot.length - 1);

        if (reduceMotion) {
          snapFinal(snapshot);
          return;
        }

        setRevealedThrough(-1);
        for (const anim of segmentAnims) anim.setValue(0);
        setAnimReady(true);

        for (let i = 0; i < snapshot.length; i++) {
          if (cancelled) return;
          setRevealedThrough(i);
          await sleep(STEP_NODE_PAUSE_MS);
          if (cancelled) return;

          if (i < segs) {
            const state = snapshot[i];
            const target = state
              ? railSegmentFillRatio(state.status, state.percent)
              : 0;
            await animateFillRatio(segmentAnims[i], target, STEP_RAIL_MS);
          }
        }
      };

      void play();

      return () => {
        cancelled = true;
        for (const anim of segmentAnims) anim.stopAnimation();
      };
    }, [segmentAnims])
  );

  // Keep segment fill ratios in sync when progress/enrollment changes after anim.
  useEffect(() => {
    if (!animReady) return;
    for (let i = 0; i < MAX_SEGMENTS; i++) {
      const state = states[i];
      segmentAnims[i].setValue(
        i < segmentCount && state
          ? railSegmentFillRatio(state.status, state.percent)
          : 0
      );
    }
  }, [animReady, segmentCount, states, segmentAnims]);

  const displayStatus = (state: MissionState, index: number): MissionVisualStatus => {
    if (!animReady) {
      if (isCompletedLike(state.status)) return 'active';
      return state.status;
    }
    if (isCompletedLike(state.status) && index > revealedThrough) {
      return 'active';
    }
    return state.status;
  };

  return (
    <View>
      <View style={tw`flex-row items-center justify-between px-1 mb-4`}>
        <BoldText style={[tw`text-base`, { color: c.textPrimary }]}>
          {t('journey.title')}
        </BoldText>
        <TouchableOpacity
          onPress={() => {
            if (viewDetailsPart != null) onOpenPart(viewDetailsPart);
          }}
          disabled={viewDetailsPart == null}
          accessibilityRole="button"
          accessibilityState={{ disabled: viewDetailsPart == null }}
          accessibilityLabel={t('journey.viewDetails')}
          hitSlop={8}
        >
          <BoldText
            style={[
              tw`text-[13px]`,
              {
                color:
                  viewDetailsPart == null
                    ? c.textLight
                    : MISSION_COMPLETED_COLOR,
              },
            ]}
          >
            {t('journey.viewDetails')}
          </BoldText>
        </TouchableOpacity>
      </View>

      {/*
        Rail connectors live BETWEEN nodes (web pattern). No absolute track past
        the last mission — the line ends at the final star / trophy node.
      */}
      <View>
        {states.map((state, index) => {
          const theme = getMissionTheme(state.part);
          const canOpen = state.isEnrolled;
          const visualStatus = displayStatus(state, index);
          const barRevealed = animReady && index <= revealedThrough;
          const showCta = state.status === 'active' && state.ctaLabel != null;
          const hasNext = index < states.length - 1;
          const segmentColor = segmentColors[index] ?? '#e0e0e0';
          return (
            <View
              key={state.part}
              style={tw`flex-row items-stretch`}
            >
              <View
                style={{
                  width: NODE_SIZE,
                  alignItems: 'center',
                  zIndex: 1,
                }}
              >
                <TimelineNode
                  status={visualStatus}
                  accent={theme.accent}
                  iconKey={theme.iconKey}
                  animateUnlock={justUnlocked.has(state.part)}
                  animateCheckIn={isCompletedLike(state.status)}
                  isCurrent={state.isCurrent}
                />
                {hasNext ? (
                  <View
                    pointerEvents="none"
                    style={{
                      width: RAIL_WIDTH,
                      flex: 1,
                      minHeight: 20,
                      borderRadius: 2,
                      backgroundColor: '#e0e0e0',
                      overflow: 'hidden',
                    }}
                  >
                    <Animated.View
                      style={{
                        width: RAIL_WIDTH,
                        borderRadius: 2,
                        backgroundColor: segmentColor,
                        height: segmentAnims[index].interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0%', '100%'],
                        }),
                      }}
                    />
                  </View>
                ) : null}
              </View>
              <View
                style={[
                  tw`flex-1 ml-6 pt-1`,
                  hasNext ? tw`pb-8` : null,
                ]}
              >
                <LearningJourneyPartCard
                  part={state.part}
                  state={state}
                  accent={theme.accent}
                  barRevealed={barRevealed}
                  onPress={
                    canOpen ? () => onOpenPart(state.part) : undefined
                  }
                  onContinue={
                    showCta ? () => onOpenPart(state.part) : undefined
                  }
                />
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
});
