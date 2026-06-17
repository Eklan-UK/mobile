import { BadgeGalleryCard } from '@/components/badges/BadgeGalleryCard';
import { AppText, BoldText, Button, Loader } from '@/components/ui';
import { useBadges } from '@/hooks/useBadges';
import { useSemanticTheme } from '@/hooks/useSemanticTheme';
import tw from '@/lib/tw';
import { router } from 'expo-router';
import { FlatList, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

function BackIcon({ stroke }: { stroke: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M19 12H5M12 19l-7-7 7-7"
        stroke={stroke}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export default function BadgesScreen() {
  const { colors: c } = useSemanticTheme();
  const { data, isLoading, isError, refetch, isRefetching } = useBadges();

  const badges = data?.badges ?? [];
  const unlockedCount = badges.filter((b) => b.unlocked).length;
  const totalCount = badges.length;

  return (
    <SafeAreaView style={[tw`flex-1`, { backgroundColor: c.background }]} edges={['top', 'bottom']}>
      <View style={tw`px-5 pt-4 pb-4 flex-row items-center`}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <BackIcon stroke={c.foreground} />
        </TouchableOpacity>
        <BoldText style={[tw`flex-1 text-center text-xl`, { color: c.foreground }]}>
          Badges
        </BoldText>
        <View style={tw`w-6`} />
      </View>

      {isLoading ? (
        <View style={tw`flex-1 items-center justify-center`}>
          <Loader />
        </View>
      ) : isError ? (
        <View style={tw`flex-1 items-center justify-center px-6 gap-4`}>
          <AppText style={[tw`text-center`, { color: c.mutedForeground }]}>
            Could not load badges. Please try again.
          </AppText>
          <Button onPress={() => refetch()} loading={isRefetching}>
            Retry
          </Button>
        </View>
      ) : (
        <>
          <View style={tw`px-5 pb-4`}>
            <AppText style={[tw`text-sm text-center`, { color: c.mutedForeground }]}>
              {unlockedCount} of {totalCount} badges earned
            </AppText>
          </View>

          <FlatList
            data={badges}
            keyExtractor={(item) => item.badgeId}
            renderItem={({ item }) => <BadgeGalleryCard badge={item} />}
            contentContainerStyle={tw`px-5 pb-6`}
            showsVerticalScrollIndicator={false}
          />
        </>
      )}
    </SafeAreaView>
  );
}
