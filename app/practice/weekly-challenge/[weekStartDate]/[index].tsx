/**
 * Weekly Challenge drill adapter screen.
 *
 * Fetches the challenge item, transforms it with toDrillShape, stores it in the
 * module-level WC drill cache, then navigates to the appropriate existing drill
 * screen with WC meta params. Shows a full-screen spinner while loading.
 */
import { AppText, Loader } from "@/components/ui";
import { useWeeklyChallengeItem } from "@/hooks/useWeeklyChallenge";
import { useSemanticTheme } from "@/hooks/useSemanticTheme";
import tw from "@/lib/tw";
import { decodeWeekStartDate } from "@/utils/challengeDrillAdapter";
import { toDrillShape } from "@/utils/challengeDrillAdapter";
import { setCachedWCDrill } from "@/utils/weeklyChallengeDrillCache";
import { navigateToWeeklyChallengeItem } from "@/utils/drillNavigation";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef } from "react";
import { TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function WeeklyChallengeItemAdapterScreen() {
  const { colors: c } = useSemanticTheme();
  const params = useLocalSearchParams<{
    weekStartDate: string;
    index: string;
  }>();
  const weekStartDate = decodeWeekStartDate(params.weekStartDate ?? "");
  const index = parseInt(params.index ?? "0", 10);

  // Track whether we've already navigated to avoid re-navigation on re-renders
  const hasNavigatedRef = useRef(false);

  const {
    data: itemData,
    isLoading,
    isError,
  } = useWeeklyChallengeItem(index, weekStartDate, {
    enabled: index >= 0 && !!weekStartDate,
  });

  useEffect(() => {
    if (!itemData || hasNavigatedRef.current) return;
    if (!itemData.challengeId || !itemData.item) return;

    hasNavigatedRef.current = true;

    // Build the adapted drill and store in cache
    const drill = toDrillShape(itemData.item, itemData.challengeId, itemData.index);
    setCachedWCDrill(drill._id, drill);

    // Navigate to the appropriate drill screen
    navigateToWeeklyChallengeItem({
      syntheticDrillId: drill._id,
      challengeId: itemData.challengeId,
      challengeItemIndex: itemData.index,
      itemId: itemData.itemId,
      weekStartDate: itemData.weekStartDate,
      drillType: itemData.item.drillType,
    });
  }, [itemData]);

  if (isError) {
    return (
      <SafeAreaView
        edges={["top"]}
        style={[tw`flex-1 items-center justify-center px-8`, { backgroundColor: c.background }]}
      >
        <AppText style={[tw`text-center mb-4`, { color: c.textSecondary }]}>
          Could not load drill. Please go back and try again.
        </AppText>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[tw`px-5 py-3 rounded-2xl`, { backgroundColor: "#047857" }]}
        >
          <AppText style={tw`text-white font-semibold`}>Go Back</AppText>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      edges={["top"]}
      style={[tw`flex-1 items-center justify-center`, { backgroundColor: c.background }]}
    >
      <Loader />
      <AppText style={[tw`text-sm mt-3`, { color: c.textSecondary }]}>
        Loading drill…
      </AppText>
    </SafeAreaView>
  );
}
