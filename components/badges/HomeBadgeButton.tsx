import { AppText } from '@/components/ui';
import { useBadges } from '@/hooks/useBadges';
import { useSemanticTheme } from '@/hooks/useSemanticTheme';
import tw from '@/lib/tw';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { memo } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

const GRADIENT_COLORS = ['#FF9F43', '#FF6B35', '#E85D04'] as const;

function BadgeButtonSkeleton() {
  const { colors: c } = useSemanticTheme();
  return (
    <View
      style={[
        styles.button,
        { backgroundColor: c.muted },
      ]}
    />
  );
}

function BadgeButtonContent({
  icon,
  locked,
}: {
  icon: string;
  locked: boolean;
}) {
  return (
    <LinearGradient
      colors={[...GRADIENT_COLORS]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={[styles.button, locked && styles.lockedButton]}
    >
      <AppText style={tw`text-lg`}>{icon}</AppText>
      {locked ? (
        <View style={styles.lockOverlay}>
          <Ionicons name="lock-closed" size={10} color="#FFFFFF" />
        </View>
      ) : null}
    </LinearGradient>
  );
}

export const HomeBadgeButton = memo(function HomeBadgeButton() {
  const { data, isLoading, isError } = useBadges();
  const featured = data?.featuredBadge;

  const handlePress = () => {
    router.push('/badges');
  };

  if (isLoading) {
    return <BadgeButtonSkeleton />;
  }

  const icon = featured?.icon ?? '🏅';
  const badgeName = featured?.badgeName ?? 'Achievement';
  const statusLabel = featured?.unlocked ? 'Unlocked' : 'Locked';
  const accessibilityLabel = `${badgeName} badge. ${statusLabel}. View all badges`;

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.85}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
    >
      <BadgeButtonContent
        icon={icon}
        locked={!isError && !!featured && !featured.unlocked}
      />
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  button: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockedButton: {
    opacity: 0.8,
  },
  lockOverlay: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
