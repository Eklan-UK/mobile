import { AppText, BoldText } from '@/components/ui';
import {
  getPartById,
  MISSION_COMPLETED_COLOR,
  type LearningJourneyPartId,
  type MissionState,
  type MissionVisualStatus,
} from '@/domain/learning-journey/learning-journey.catalog';
import { useTranslation } from '@/contexts/LanguageContext';
import { useSemanticTheme } from '@/hooks/useSemanticTheme';
import tw from '@/lib/tw';
import { Ionicons } from '@expo/vector-icons';
import { memo, useEffect, useRef } from 'react';
import {
  AccessibilityInfo,
  Animated,
  TouchableOpacity,
  View,
} from 'react-native';

export type LearningJourneyPartCardProps = {
  part: LearningJourneyPartId;
  state: MissionState;
  accent: string;
  onPress?: () => void;
  onContinue?: () => void;
  /** When false during load anim, progress bar stays at 0 until revealed. */
  barRevealed?: boolean;
};

function progressLabel(
  status: MissionVisualStatus,
  completed: number,
  total: number,
  t: (key: string, opts?: Record<string, unknown>) => string
): string {
  if (status === 'locked' && total === 0) {
    return t('journey.notEnrolledYet');
  }
  if (total > 0) {
    return t('journey.progress', { completed, total });
  }
  return t('journey.noDrillsAssigned');
}

export const LearningJourneyPartCard = memo(function LearningJourneyPartCard({
  part,
  state,
  accent,
  onPress,
  onContinue,
  barRevealed = true,
}: LearningJourneyPartCardProps) {
  const { t } = useTranslation();
  const { colors: c, isDark } = useSemanticTheme();
  const partDef = getPartById(part);
  const title = partDef?.title ?? '';
  const { status, percent, completed, total, ctaLabel } = state;
  const isLocked = status === 'locked';
  const isCompleted = status === 'completed' || status === 'journeyComplete';
  const showCta = status === 'active' && ctaLabel != null;
  const ctaText =
    ctaLabel === 'start' ? t('journey.start') : t('journey.continue');

  const labelColor = isLocked
    ? '#9ca3af'
    : isCompleted
      ? MISSION_COMPLETED_COLOR
      : accent;
  const barColor = isCompleted ? MISSION_COMPLETED_COLOR : accent;
  const borderColor = isLocked
    ? isDark
      ? c.border
      : '#e0e0e0'
    : isCompleted
      ? `${MISSION_COMPLETED_COLOR}33`
      : `${accent}33`;

  const progressText = progressLabel(status, completed, total, t);
  // Incomplete missions keep their real percent — never animate a full bar.
  const displayPercent = isCompleted
    ? 100
    : Math.min(100, Math.max(0, percent));
  const targetBarPercent = barRevealed ? displayPercent : 0;

  const opacity = useRef(new Animated.Value(isLocked ? 0.6 : 1)).current;
  const barWidth = useRef(new Animated.Value(0)).current;
  const prevStatus = useRef(status);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const reduceMotion = await AccessibilityInfo.isReduceMotionEnabled();
      if (cancelled) return;

      const unlocked = prevStatus.current === 'locked' && status !== 'locked';
      prevStatus.current = status;

      if (unlocked && !reduceMotion) {
        opacity.setValue(0.4);
        Animated.timing(opacity, {
          toValue: 1,
          duration: 380,
          useNativeDriver: true,
        }).start();
      } else {
        opacity.setValue(isLocked ? 0.6 : 1);
      }

      if (reduceMotion) {
        barWidth.setValue(targetBarPercent);
      } else {
        Animated.timing(barWidth, {
          toValue: targetBarPercent,
          duration: 450,
          useNativeDriver: false,
        }).start();
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [status, targetBarPercent, isLocked, opacity, barWidth]);

  const footerRow = (
    <View style={tw`flex-row items-center justify-between w-full mt-1.5 gap-2`}>
      <AppText
        style={[
          tw`text-[10px] flex-1`,
          { color: isLocked ? '#9ca3af' : c.textPrimary },
        ]}
        numberOfLines={1}
      >
        {progressText}
      </AppText>
      {showCta ? (
        <TouchableOpacity
          onPress={onContinue ?? onPress}
          activeOpacity={0.7}
          style={tw`flex-row items-center shrink-0`}
          accessibilityRole="button"
          accessibilityLabel={ctaText}
          hitSlop={8}
        >
          <BoldText style={[tw`text-[11px]`, { color: accent }]}>
            {ctaText}
          </BoldText>
          <Ionicons
            name="chevron-forward"
            size={14}
            color={accent}
            style={tw`ml-0.5`}
          />
        </TouchableOpacity>
      ) : null}
    </View>
  );

  const cardBody = (
    <>
      <View style={tw`flex-row items-start justify-between w-full`}>
        <AppText
          style={[
            tw`text-[10px] font-bold uppercase tracking-wide`,
            { color: labelColor },
          ]}
        >
          {t('journey.mission', { part })}
        </AppText>
        {!isLocked ? (
          <BoldText style={[tw`text-[11px]`, { color: labelColor }]}>
            {displayPercent}%
          </BoldText>
        ) : null}
      </View>

      <BoldText
        style={[
          tw`text-sm mt-1`,
          { color: isLocked ? (isDark ? c.textSecondary : '#6b7280') : c.textPrimary },
        ]}
        numberOfLines={2}
      >
        {title}
      </BoldText>

      {!isLocked ? (
        <View
          style={[
            tw`h-2 rounded-full w-full mt-2 overflow-hidden`,
            { backgroundColor: isDark ? c.progressBg : '#f3f4f6' },
          ]}
        >
          <Animated.View
            style={{
              height: '100%',
              borderRadius: 9999,
              backgroundColor: barColor,
              width: barWidth.interpolate({
                inputRange: [0, 100],
                outputRange: ['0%', '100%'],
              }),
            }}
          />
        </View>
      ) : null}

      {footerRow}
    </>
  );

  const containerStyle = [
    tw`rounded-2xl w-full`,
    {
      backgroundColor: c.card,
      borderWidth: isLocked ? 1 : 2,
      borderStyle: isLocked ? ('dashed' as const) : ('solid' as const),
      borderColor,
      paddingHorizontal: isLocked ? 17 : 18,
      paddingTop: isLocked ? 24 : 18,
      paddingBottom: isLocked ? 17 : 18,
      boxShadow: isLocked ? undefined : '0px 4px 10px rgba(0,0,0,0.05)',
      gap: isLocked ? 1 : 0,
    },
  ];

  if (isLocked) {
    return (
      <Animated.View
        style={[{ opacity }, ...containerStyle]}
        accessibilityRole="text"
        accessibilityState={{ disabled: true }}
        accessibilityLabel={`${t('journey.mission', { part })}, ${title}, ${progressText}`}
      >
        {cardBody}
      </Animated.View>
    );
  }

  return (
    <Animated.View style={{ opacity }}>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.75}
        style={containerStyle}
        accessibilityRole="button"
        accessibilityLabel={`${t('journey.mission', { part })}, ${title}, ${progressText}${
          showCta ? ` — ${ctaText}` : ''
        }`}
      >
        {cardBody}
      </TouchableOpacity>
    </Animated.View>
  );
});
