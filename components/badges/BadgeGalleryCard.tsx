import { AppText, BoldText } from '@/components/ui';
import { useSemanticTheme } from '@/hooks/useSemanticTheme';
import tw from '@/lib/tw';
import type { BadgeView } from '@/types/badge.types';
import { format } from 'date-fns';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

interface BadgeGalleryCardProps {
  badge: BadgeView;
}

function ProgressBar({ current, target }: { current: number; target: number }) {
  const { colors: c } = useSemanticTheme();
  const pct = target > 0 ? Math.min(100, (current / target) * 100) : 0;

  return (
    <View style={tw`mt-3`}>
      <View style={tw`flex-row justify-between mb-1.5`}>
        <AppText style={[tw`text-xs`, { color: c.mutedForeground }]}>Progress</AppText>
        <AppText style={[tw`text-xs font-semibold`, { color: c.foreground }]}>
          {current} / {target}
        </AppText>
      </View>
      <View style={[tw`h-2 rounded-full overflow-hidden`, { backgroundColor: c.muted }]}>
        <View
          style={[
            tw`h-full rounded-full`,
            { width: `${pct}%`, backgroundColor: '#F97316' },
          ]}
        />
      </View>
    </View>
  );
}

export const BadgeGalleryCard = memo(function BadgeGalleryCard({ badge }: BadgeGalleryCardProps) {
  const { colors: c } = useSemanticTheme();
  const unlocked = badge.unlocked;

  return (
    <View
      style={[
        tw`rounded-2xl p-4 mb-3`,
        {
          backgroundColor: c.card,
          borderColor: c.border,
          borderWidth: StyleSheet.hairlineWidth,
        },
      ]}
    >
      <View style={tw`flex-row items-start gap-3`}>
        <View
          style={[
            tw`w-14 h-14 rounded-xl items-center justify-center`,
            {
              backgroundColor: unlocked ? '#FFF5EB' : c.muted,
              opacity: unlocked ? 1 : 0.65,
            },
          ]}
        >
          <AppText style={[tw`text-3xl`, !unlocked && tw`opacity-60`]}>{badge.icon}</AppText>
        </View>

        <View style={tw`flex-1`}>
          <View style={tw`flex-row items-center justify-between gap-2`}>
            <BoldText style={[tw`text-base flex-1`, { color: c.foreground }]}>
              {badge.badgeName}
            </BoldText>
            <View
              style={[
                tw`px-2.5 py-0.5 rounded-full`,
                unlocked ? tw`bg-green-100` : { backgroundColor: c.muted },
              ]}
            >
              <AppText
                style={[
                  tw`text-xs font-semibold`,
                  unlocked ? tw`text-green-700` : { color: c.mutedForeground },
                ]}
              >
                {unlocked ? 'Unlocked' : 'Locked'}
              </AppText>
            </View>
          </View>

          {unlocked ? (
            <View style={tw`mt-2 gap-1`}>
              <AppText style={[tw`text-sm`, { color: c.foreground }]}>{badge.afterOutcome}</AppText>
              <AppText style={[tw`text-sm italic`, { color: c.mutedForeground }]}>
                {badge.humorousLine}
              </AppText>
              {badge.unlockedAt ? (
                <AppText style={[tw`text-xs mt-1`, { color: c.mutedForeground }]}>
                  Unlocked {format(new Date(badge.unlockedAt), 'MMM d, yyyy')}
                </AppText>
              ) : null}
            </View>
          ) : (
            <View style={tw`mt-2`}>
              <AppText style={[tw`text-sm`, { color: c.mutedForeground }]}>
                {badge.beforeDescription}
              </AppText>
              {badge.progress ? (
                <ProgressBar
                  current={badge.progress.current}
                  target={badge.progress.target}
                />
              ) : null}
            </View>
          )}
        </View>
      </View>
    </View>
  );
});
