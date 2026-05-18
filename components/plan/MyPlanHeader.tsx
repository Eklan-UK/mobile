import { AppText, BoldText } from '@/components/ui';
import BellIcon from '@/assets/icons/bell.svg';
import tw from '@/lib/tw';
import { useUserStreakCount } from '@/hooks/useUserStreakCount';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { memo } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

const StarIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="white">
    <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </Svg>
);

const FlameOutlineIcon = () => <Ionicons name="flame-outline" size={18} color="#EA580C" />;

const StreakPill = memo(({ count }: { count: number }) => (
  <View
    style={tw`flex-row items-center gap-1.5 bg-[#FFF9E5] dark:bg-neutral-800 px-3 py-2 rounded-full min-h-[34px]`}
    accessibilityLabel={`Streak: ${count} days`}
    accessibilityRole="text"
  >
    <FlameOutlineIcon />
    <AppText
      style={tw`text-sm font-extrabold text-neutral-900 dark:text-white tracking-tight`}
      allowFontScaling
    >
      {count}
    </AppText>
  </View>
));

/**
 * My Plan screen header — title/subtitle left; gradient star (profile), streak pill, bell right.
 * Streak count comes from GET /api/v1/users/current (same as Home).
 */
export function MyPlanHeader() {
  const { data: streakCount = 0 } = useUserStreakCount();

  return (
    <View
      style={tw`px-5 pt-4 pb-4 bg-white dark:bg-neutral-900 border-b border-gray-100 dark:border-neutral-800`}
    >
      <View style={tw`flex-row items-center justify-between`}>
        <View style={tw`flex-1 mr-3`}>
          <BoldText style={tw`text-2xl font-bold text-gray-900 dark:text-white`}>My Plans</BoldText>
          <AppText style={tw`text-base text-gray-500 dark:text-neutral-400 mt-1`}>
            Designed for you, based on your goals
          </AppText>
        </View>

        <View style={tw`flex-row items-center gap-2`}>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/profile')}
            activeOpacity={0.85}
            accessibilityLabel="Profile"
          >
            <LinearGradient
              colors={['#FF9F43', '#FF6B35', '#E85D04']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.starBtnGradient}
            >
              <StarIcon />
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/streak')}
            activeOpacity={0.85}
            accessibilityLabel="View streak"
          >
            <StreakPill count={streakCount} />
          </TouchableOpacity>

          <TouchableOpacity
            style={tw`w-9 h-9 rounded-full bg-neutral-100 dark:bg-neutral-800 items-center justify-center`}
            onPress={() => router.push('/notifications')}
            accessibilityLabel="Notifications"
          >
            <BellIcon width={18} height={18} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  starBtnGradient: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
