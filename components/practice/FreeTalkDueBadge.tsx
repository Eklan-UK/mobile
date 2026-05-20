import { AppText } from '@/components/ui';
import tw from '@/lib/tw';
import { formatFreeTalkDueLabel } from '@/utils/freeTalkScenarioCompletion';
import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

type Props = {
  completionDate: string;
  compact?: boolean;
};

export const FreeTalkDueBadge = memo(function FreeTalkDueBadge({
  completionDate,
  compact = false,
}: Props) {
  return (
    <View style={[styles.badge, compact && styles.badgeCompact]}>
      <Ionicons name="alert-circle-outline" size={compact ? 10 : 11} color="#92400E" />
      <AppText style={[styles.text, compact && styles.textCompact]}>
        Due {formatFreeTalkDueLabel(completionDate)}
      </AppText>
    </View>
  );
});

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    flexShrink: 0,
  },
  badgeCompact: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
    color: '#92400E',
  },
  textCompact: {
    fontSize: 10,
  },
});
