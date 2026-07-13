import { SavedDrillsList } from '@/components/learning-journey/SavedDrillsList';
import { BoldText } from '@/components/ui';
import { useLearnerDrills } from '@/hooks/useLearnerDrills';
import { useSemanticTheme } from '@/hooks/useSemanticTheme';
import { brandColors } from '@/constants/theme-tokens';
import tw from '@/lib/tw';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function BookmarksScreen() {
  const { colors: c } = useSemanticTheme();
  const { refetch } = useLearnerDrills();
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={[tw`flex-1`, { backgroundColor: c.background }]} edges={['top']}>
      <View
        style={[
          tw`px-5 pt-4 pb-4 border-b flex-row items-center`,
          { backgroundColor: c.card, borderBottomColor: c.border },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={tw`mr-3`} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={c.textPrimary} />
        </TouchableOpacity>
        <BoldText style={[tw`text-xl flex-1`, { color: c.textPrimary }]}>
          My Bookmarks
        </BoldText>
      </View>

      <ScrollView
        style={tw`flex-1`}
        contentContainerStyle={tw`px-5 py-4 pb-8`}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={brandColors.primary}
            colors={[brandColors.primary]}
          />
        }
      >
        <SavedDrillsList />
      </ScrollView>
    </SafeAreaView>
  );
}
