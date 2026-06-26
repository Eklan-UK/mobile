import { HomeBadgeButton } from '@/components/badges/HomeBadgeButton';
import { AppText, BoldText } from '@/components/ui';
import BellIcon from '@/assets/icons/bell.svg';
import tw from '@/lib/tw';
import { useUserStreakCount } from '@/hooks/useUserStreakCount';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { memo } from 'react';
import { TouchableOpacity, View } from 'react-native';

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
 * My Plan screen header — title/subtitle left; featured badge, streak pill, bell right.
 * Badge and streak use the same hooks as Home (useBadges, useUserStreakCount).
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
          <HomeBadgeButton />

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
