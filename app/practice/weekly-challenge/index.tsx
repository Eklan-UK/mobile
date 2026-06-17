import WeeklyChallengeWeekCard from "@/components/weekly-challenge/WeeklyChallengeWeekCard";
import { AppText, BoldText, Loader } from "@/components/ui";
import { useWeeklyChallengeHistory } from "@/hooks/useWeeklyChallenge";
import { useIsSubscribed } from "@/hooks/useIsSubscribed";
import { useSemanticTheme } from "@/hooks/useSemanticTheme";
import tw from "@/lib/tw";
import { encodeWeekStartDate } from "@/utils/challengeDrillAdapter";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect } from "react";
import { RefreshControl, ScrollView, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function WeeklyChallengeHistoryScreen() {
  const { colors: c } = useSemanticTheme();
  const isSubscribed = useIsSubscribed();

  // Subscription gate
  useEffect(() => {
    if (isSubscribed === false) {
      router.replace("/premium");
    }
  }, [isSubscribed]);

  const {
    data: challenges = [],
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useWeeklyChallengeHistory({ enabled: isSubscribed !== false });

  // Only show challenges that have drills
  const visibleChallenges = challenges.filter((c) => c.drillSequence.length > 0);

  const handleCardPress = (weekStartDate: string) => {
    router.push(
      `/practice/weekly-challenge/${encodeWeekStartDate(weekStartDate)}` as never
    );
  };

  return (
    <SafeAreaView edges={["top"]} style={[tw`flex-1`, { backgroundColor: c.background }]}>
      {/* Header */}
      <View
        style={[
          tw`px-5 pt-4 pb-4 flex-row items-center border-b`,
          { backgroundColor: c.card, borderBottomColor: c.border },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={tw`mr-3`} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={c.textPrimary} />
        </TouchableOpacity>
        <BoldText style={[tw`text-xl flex-1`, { color: c.textPrimary }]}>
          Eklan Weekly Challenge
        </BoldText>
      </View>

      {/* Body */}
      {isLoading ? (
        <View style={tw`flex-1 items-center justify-center`}>
          <Loader />
        </View>
      ) : isError ? (
        <View style={tw`flex-1 items-center justify-center px-6`}>
          <AppText style={[tw`text-center mb-4`, { color: c.textSecondary }]}>
            Could not load your challenges. Pull to refresh.
          </AppText>
          <TouchableOpacity
            onPress={() => refetch()}
            style={[tw`px-5 py-3 rounded-2xl`, { backgroundColor: "#047857" }]}
          >
            <AppText style={tw`text-white font-semibold`}>Retry</AppText>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={tw`flex-1`}
          contentContainerStyle={[
            tw`px-5 py-5`,
            visibleChallenges.length === 0 && tw`flex-1`,
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
          }
        >
          {visibleChallenges.length === 0 ? (
            <EmptyState />
          ) : (
            <View style={tw`gap-3`}>
              {visibleChallenges.map((challenge, idx) => (
                <WeeklyChallengeWeekCard
                  key={challenge.weekStartDate}
                  challenge={challenge}
                  weekNumber={idx + 1}
                  onPress={() => handleCardPress(challenge.weekStartDate)}
                />
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function EmptyState() {
  const { colors: c } = useSemanticTheme();
  return (
    <View style={tw`flex-1 items-center justify-center px-8`}>
      <View
        style={[
          tw`h-16 w-16 rounded-full items-center justify-center mb-4`,
          { backgroundColor: "#D1FAE5" },
        ]}
      >
        <Ionicons name="trophy" size={32} color="#047857" />
      </View>
      <BoldText style={[tw`text-xl text-center mb-2`, { color: c.textPrimary }]}>
        No weekly challenges yet
      </BoldText>
      <AppText style={[tw`text-sm text-center leading-5`, { color: c.textSecondary }]}>
        Your personalized weekly challenges will appear here after your first Sunday unlock.
      </AppText>
    </View>
  );
}
