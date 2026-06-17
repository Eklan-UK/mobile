import WeeklyChallengeDrillRow from "@/components/weekly-challenge/WeeklyChallengeDrillRow";
import { AppText, BoldText, Loader } from "@/components/ui";
import { useWeeklyChallengeWeek } from "@/hooks/useWeeklyChallenge";
import { useIsSubscribed } from "@/hooks/useIsSubscribed";
import { useSemanticTheme } from "@/hooks/useSemanticTheme";
import tw from "@/lib/tw";
import {
  decodeWeekStartDate,
  encodeWeekStartDate,
  formatSummaryMessage,
} from "@/utils/challengeDrillAdapter";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function WeeklyChallengeWeekScreen() {
  const { colors: c } = useSemanticTheme();
  const isSubscribed = useIsSubscribed();
  const params = useLocalSearchParams<{ weekStartDate: string }>();
  const weekStartDate = decodeWeekStartDate(params.weekStartDate ?? "");

  // Subscription gate
  useEffect(() => {
    if (isSubscribed === false) {
      router.replace("/premium");
    }
  }, [isSubscribed]);

  const {
    data: challenge,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useWeeklyChallengeWeek(weekStartDate, { enabled: !!weekStartDate && isSubscribed !== false });

  const handleDrillPress = (index: number) => {
    router.push(
      `/practice/weekly-challenge/${encodeWeekStartDate(weekStartDate)}/${index}` as never
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
          Weekly Challenge
        </BoldText>
      </View>

      {/* Body */}
      {isLoading ? (
        <View style={tw`flex-1 items-center justify-center`}>
          <Loader />
        </View>
      ) : (
        <ScrollView
          style={tw`flex-1`}
          contentContainerStyle={tw`pb-8`}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
          }
        >
          {renderBody()}
        </ScrollView>
      )}
    </SafeAreaView>
  );

  function renderBody() {
    if (isError || !challenge) {
      return (
        <View style={tw`flex-1 items-center justify-center px-8 py-16`}>
          <Ionicons name="alert-circle-outline" size={48} color="#9CA3AF" style={tw`mb-4`} />
          <BoldText style={[tw`text-lg text-center mb-2`, { color: c.textPrimary }]}>
            Could not load challenge
          </BoldText>
          <AppText style={[tw`text-sm text-center mb-6`, { color: c.textSecondary }]}>
            Pull to refresh or try again later.
          </AppText>
          <TouchableOpacity
            onPress={() => refetch()}
            style={[tw`px-5 py-3 rounded-2xl`, { backgroundColor: "#047857" }]}
          >
            <AppText style={tw`text-white font-semibold`}>Retry</AppText>
          </TouchableOpacity>
        </View>
      );
    }

    if (challenge.status === "generating") {
      return (
        <View style={tw`flex-1 items-center justify-center px-8 py-16`}>
          <ActivityIndicator size="large" color="#047857" style={tw`mb-4`} />
          <BoldText style={[tw`text-lg text-center mb-2`, { color: c.textPrimary }]}>
            Building your personalized challenge…
          </BoldText>
          <AppText style={[tw`text-sm text-center`, { color: c.textSecondary }]}>
            We're analyzing your practice from this week.
          </AppText>
        </View>
      );
    }

    if (challenge.status === "failed") {
      return (
        <View
          style={[
            tw`mx-5 mt-6 p-5 rounded-2xl border`,
            { borderColor: "#F59E0B", backgroundColor: "#FFFBEB" },
          ]}
        >
          <BoldText style={[tw`text-base mb-2`, { color: "#92400E" }]}>
            Challenge generation failed
          </BoldText>
          <AppText style={[tw`text-sm leading-5`, { color: "#B45309" }]}>
            We couldn't generate your challenge. Pull to refresh or try again later.
          </AppText>
        </View>
      );
    }

    if (challenge.status === "ready" && challenge.drillSequence.length === 0) {
      return (
        <View style={tw`flex-1 items-center justify-center px-8 py-16`}>
          <Ionicons name="calendar-outline" size={48} color="#9CA3AF" style={tw`mb-4`} />
          <BoldText style={[tw`text-lg text-center mb-2`, { color: c.textPrimary }]}>
            No challenge yet
          </BoldText>
          <AppText style={[tw`text-sm text-center leading-5`, { color: c.textSecondary }]}>
            {challenge.isSunday
              ? "Keep practicing this week — your personalized challenge will be ready next Sunday."
              : "Complete drills Monday through Saturday to unlock your personalized challenge on Sunday."}
          </AppText>
        </View>
      );
    }

    if (challenge.status === "unavailable") {
      return (
        <View style={tw`flex-1 items-center justify-center px-8 py-16`}>
          <Ionicons name="lock-closed-outline" size={48} color="#9CA3AF" style={tw`mb-4`} />
          <AppText style={[tw`text-sm text-center`, { color: c.textSecondary }]}>
            This challenge is not available.
          </AppText>
        </View>
      );
    }

    // status === 'ready' && drills present
    const summaryText = formatSummaryMessage(challenge.summaryMessage);

    return (
      <>
        {/* Hero banner */}
        <View
          style={[
            tw`mx-5 mt-5 rounded-2xl p-5`,
            { backgroundColor: "#047857" },
          ]}
        >
          {/* Badge pill */}
          <View style={tw`flex-row items-center gap-1.5 mb-3`}>
            <View
              style={[
                tw`flex-row items-center gap-1.5 px-3 py-1 rounded-full`,
                { backgroundColor: "rgba(255,255,255,0.2)" },
              ]}
            >
              <Ionicons name="trophy" size={14} color="#fff" />
              <AppText style={tw`text-xs font-semibold text-white`}>
                Your Weekly Challenge
              </AppText>
            </View>
          </View>

          <BoldText style={tw`text-lg text-white mb-1`}>{summaryText}</BoldText>
          <AppText style={[tw`text-sm`, { color: "rgba(255,255,255,0.8)" }]}>
            {challenge.totalEstimatedMinutes} min · {challenge.drillSequence.length}{" "}
            {challenge.drillSequence.length === 1 ? "drill" : "drills"}
          </AppText>
        </View>

        {/* Drill list */}
        <View style={tw`px-5 mt-5 gap-3`}>
          {challenge.drillSequence.map((item) => (
            <WeeklyChallengeDrillRow
              key={item.itemId}
              item={item}
              onPress={() => handleDrillPress(item.index)}
            />
          ))}
        </View>
      </>
    );
  }
}
