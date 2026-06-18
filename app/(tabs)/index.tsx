import { AppText, BoldText } from "@/components/ui";
import { ContinuePracticeCard } from "@/components/practice/continue-practice-card";
import { HomeProgressCard } from "@/components/progress/HomeProgressCard";
import { PlanDrillRow } from "@/components/learning-journey/PlanDrillRow";
import { PlanFreeTalkRow } from "@/components/learning-journey/PlanFreeTalkRow";
import { SavedDrillsSection } from "@/components/learning-journey/SavedDrillsSection";
import { useProgressScorecard } from "@/hooks/useProgressScorecard";
import { useAuth } from "@/hooks/useAuth";
import { useIsSubscribed } from "@/hooks/useIsSubscribed";
import { useDailyFocusToday } from "@/hooks/useDailyFocusToday";
import { useLearnerDrills } from "@/hooks/useLearnerDrills";
import { useFreeTalkCompletedScenarioIds } from "@/hooks/useFreeTalkCompletedScenarioIds";
import { useFreeTalkScenarios } from "@/hooks/useFreeTalkScenarios";
import {
  buildAssignedPracticeFeed,
  takeAssignedPracticeFeed,
  type AssignedPracticeFeedItem,
} from "@/utils/assignedPracticeFeed";
import { categorizeDrillsByPlanTab } from "@/utils/drillPlanTab";
import { usePrefetch } from "@/hooks/usePrefetch";
import { useUserStreakCount } from "@/hooks/useUserStreakCount";
import { DrillAssignment } from "@/types/drill.types";
import { pickNextPracticeDrill } from "@/utils/learnerAssignedPlan";
import { navigateToDrill } from "@/utils/drillNavigation";
import {
  navigatePlanDrillRow,
  navigatePlanFreeTalkByScenarioId,
} from "@/utils/planRowNavigation";
import tw from "@/lib/tw";
import BellIcon from "@/assets/icons/bell.svg";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import { useCallback, memo, useMemo } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { useSemanticTheme } from "@/hooks/useSemanticTheme";
import { brandColors } from "@/constants/theme-tokens";
import { HomeBadgeButton } from "@/components/badges/HomeBadgeButton";
import { useTranslation } from "@/contexts/LanguageContext";

/* ─── Small SVG icons ─────────────────────────────────────── */

const FlameIcon = () => (
  <Ionicons name="flame" size={14} color="#EA580C" />
);

const CalendarSessionsIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path
      d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"
      stroke="#15803D"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

type HomePalette = {
  pageBg: string;
  greetingText: string;
  greetingSubtext: string;
  streakPillBg: string;
  streakPillBorder: string;
  streakText: string;
  bellBtnBg: string;
  bellBtnBorder: string;
  viewSessionsBtnBg: string;
  viewSessionsBtnBorder: string;
  viewSessionsBtnText: string;
  sectionTitle: string;
  seeAllText: string;
  emptyStateBg: string;
  emptyStateText: string;
};

function useHomePalette(): HomePalette {
  const { isDark, colors: c } = useSemanticTheme();
  return useMemo(
    () => ({
      pageBg: c.background,
      greetingText: c.textPrimary,
      greetingSubtext: c.mutedForeground,
      streakPillBg: c.card,
      streakPillBorder: c.border,
      streakText: c.textPrimary,
      bellBtnBg: isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.12)",
      bellBtnBorder: c.border,
      viewSessionsBtnBg: c.card,
      viewSessionsBtnBorder: isDark
        ? "rgba(74, 222, 128, 0.45)"
        : "rgba(59, 136, 62, 0.28)",
      viewSessionsBtnText: isDark ? brandColors.primaryLight : brandColors.primaryDark,
      sectionTitle: c.textPrimary,
      seeAllText: brandColors.primaryLight,
      emptyStateBg: c.muted,
      emptyStateText: c.textSecondary,
    }),
    [isDark, c]
  );
}

const ViewSessionsButton = memo(() => {
  const p = useHomePalette();
  const isSubscribed = useIsSubscribed();
  return (
    <TouchableOpacity
      style={[
        styles.viewSessionsBtn,
        {
          backgroundColor: p.viewSessionsBtnBg,
          borderColor: p.viewSessionsBtnBorder,
          opacity: isSubscribed ? 1 : 0.85,
        },
      ]}
      onPress={() => {
        if (!isSubscribed) {
          router.push("/premium");
          return;
        }
        router.push("/sessions");
      }}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={isSubscribed ? "View your sessions" : "Upgrade to Pro to view sessions"}
    >
      <CalendarSessionsIcon />
      <AppText style={[styles.viewSessionsBtnText, { color: p.viewSessionsBtnText }]}>
        View your sessions
      </AppText>
      {!isSubscribed ? (
        <View style={tw`ml-1 flex-row items-center gap-1 bg-green-600 px-2 py-0.5 rounded-full`}>
          <Ionicons name="lock-closed" size={10} color="#fff" />
          <AppText style={tw`text-[10px] font-bold text-white`}>Pro</AppText>
        </View>
      ) : null}
    </TouchableOpacity>
  );
});

const StreakPill = memo(({ count }: { count: number }) => {
  const p = useHomePalette();
  return (
    <View
      style={[
        styles.streakPill,
        {
          backgroundColor: p.streakPillBg,
          borderColor: p.streakPillBorder,
        },
      ]}
      accessibilityLabel={`Streak: ${count} days`}
    >
      <FlameIcon />
      <AppText style={[styles.streakText, { color: p.streakText }]}>{count}</AppText>
    </View>
  );
});

/* ─── Home Screen ────────────────────────────────────────── */

export default function HomeScreen() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const isSubscribed = useIsSubscribed();
  const firstName = user?.firstName ?? "there";

  const { prefetchDrillAssignment } = usePrefetch();
  const { data: streakCount = 0 } = useUserStreakCount();

  const { data: scorecard, isLoading: scorecardLoading } = useProgressScorecard();

  const {
    data: dailyFocus,
    isPending: isDailyFocusPending,
    isError: isDailyFocusError,
  } = useDailyFocusToday();

  const { data: drillsData, isLoading: isDrillsLoading, refetch: refetchDrills } = useLearnerDrills();
  const {
    data: freeTalkScenarios = [],
    isLoading: isFreeTalkLoading,
    refetch: refetchFreeTalk,
  } = useFreeTalkScenarios(isSubscribed);
  const { data: completedFreeTalkIds } = useFreeTalkCompletedScenarioIds(isSubscribed);

  useFocusEffect(
    useCallback(() => {
      void refetchDrills();
      if (isSubscribed) {
        void refetchFreeTalk();
      }
    }, [refetchDrills, isSubscribed, refetchFreeTalk])
  );

  const assignedPracticeFeed = useMemo(() => {
    const { ongoing } = categorizeDrillsByPlanTab(drillsData?.drills ?? []);
    const feed = buildAssignedPracticeFeed(ongoing, freeTalkScenarios);
    return takeAssignedPracticeFeed(feed, 4);
  }, [drillsData?.drills, freeTalkScenarios]);

  const isAssignedPracticeLoading = isDrillsLoading || (isSubscribed && isFreeTalkLoading);

  const handleFreeTalkPress = useCallback(
    (scenarioId: string) => {
      navigatePlanFreeTalkByScenarioId(scenarioId, !isSubscribed);
    },
    [isSubscribed]
  );

  const continuePracticeAssignment = useMemo(
    () => pickNextPracticeDrill(drillsData?.drills ?? []),
    [drillsData]
  );

  const showContinuePracticeCard =
    !isDailyFocusPending &&
    !isDailyFocusError &&
    dailyFocus === null &&
    continuePracticeAssignment !== null;

  const p = useHomePalette();

  const handleDrillPress = useCallback(
    (assignment: DrillAssignment) => {
      if (!isSubscribed) {
        router.push("/premium");
        return;
      }
      prefetchDrillAssignment(assignment);
      navigatePlanDrillRow(assignment);
    },
    [prefetchDrillAssignment, isSubscribed]
  );

  return (
    <SafeAreaView edges={["top"]} style={[tw`flex-1`, { backgroundColor: p.pageBg }]}>
      <ScrollView
        style={{ flex: 1, backgroundColor: p.pageBg }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[tw`pb-10`, { backgroundColor: p.pageBg }]}
      >

        {/* ── HEADER ─────────────────────────────────────── */}
        <View style={tw`px-5 pt-4 pb-3 flex-row justify-between items-start`}>
          <View style={tw`flex-1 mr-3`}>
            <BoldText style={[styles.greetingText, { color: p.greetingText }]}>
              Hello, {firstName}! 👋
            </BoldText>
            <AppText style={[styles.greetingSubtext, { color: p.greetingSubtext }]}>
              Good to see you again.
            </AppText>
          </View>

          <View style={tw`flex-row items-center gap-2 pt-1`}>
            <HomeBadgeButton />
            <StreakPill count={streakCount} />
            <TouchableOpacity
              style={[
                styles.bellBtn,
                { backgroundColor: p.bellBtnBg, borderColor: p.bellBtnBorder },
              ]}
              onPress={() => router.push("/notifications")}
              accessibilityLabel="Notifications"
            >
              <BellIcon width={16} height={16} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={tw`px-5 gap-4`}>

          {/* ── START / CONTINUE PRACTICE (no daily focus + open assignment) ─ */}
          {showContinuePracticeCard && continuePracticeAssignment && (
            <ContinuePracticeCard
              assignment={continuePracticeAssignment}
              subscriptionLocked={!isSubscribed}
              onPress={() => {
                if (!isSubscribed) {
                  router.push("/premium");
                  return;
                }
                prefetchDrillAssignment(continuePracticeAssignment);
                navigateToDrill(continuePracticeAssignment);
              }}
            />
          )}

          {/* ── VIEW SESSIONS ───────────────────────────────── */}
          <ViewSessionsButton />

          {/* ── YOUR PROGRESS ──────────────────────────────── */}
          <View>
            <AppText style={[styles.sectionTitle, { color: p.sectionTitle }]}>
              {t("account.yourProgress")}
            </AppText>
            <View style={tw`gap-3 mt-2`}>
              <HomeProgressCard
                label="Pronunciation"
                score={scorecard?.pronunciation ?? 0}
                weeklyChange={scorecard?.pronunciationWeeklyChange ?? 0}
                ringColor="#22c55e"
                icon={<Ionicons name="mic" size={24} color="#22c55e" />}
                isLoading={scorecardLoading}
                noData={scorecard?.sampleCounts?.pronunciationDrills === 0}
              />
              <HomeProgressCard
                label="Accuracy"
                score={scorecard?.accuracy ?? 0}
                weeklyChange={scorecard?.accuracyWeeklyChange ?? 0}
                ringColor="#0284c7"
                icon={<Ionicons name="checkmark-circle-outline" size={24} color="#0284c7" />}
                isLoading={scorecardLoading}
                noData={scorecard?.sampleCounts?.accuracyDrills === 0}
              />
              <HomeProgressCard
                label="Fluency"
                score={scorecard?.fluency ?? 0}
                weeklyChange={scorecard?.fluencyWeeklyChange ?? 0}
                ringColor="#7c3aed"
                icon={<Ionicons name="chatbubble-outline" size={24} color="#7c3aed" />}
                isLoading={scorecardLoading}
                noData={scorecard?.sampleCounts?.fluencyScenarios === 0}
              />
              <HomeProgressCard
                label="Confidence"
                score={scorecard?.confidence ?? 0}
                weeklyChange={scorecard?.confidenceWeeklyChange ?? 0}
                ringColor="#eab308"
                icon={<Ionicons name="trending-up" size={24} color="#eab308" />}
                isLoading={scorecardLoading}
              />
            </View>
          </View>

          <SavedDrillsSection title={t("account.savedDrills")} />

          {/* ── ASSIGNED DRILLS ────────────────────────────── */}
          <View>
            <View style={tw`flex-row items-center justify-between`}>
              <View style={tw`flex-row items-center gap-2 flex-1 mr-2 flex-wrap`}>
                <AppText style={[styles.sectionTitle, { color: p.sectionTitle }]}>
                  {t("account.assignedDrills")}
                </AppText>
                {!isSubscribed ? (
                  <View style={tw`flex-row items-center gap-1 bg-green-600 pl-1.5 pr-2 py-0.5 rounded-full`}>
                    <Ionicons name="lock-closed" size={10} color="#fff" />
                    <AppText style={tw`text-[10px] font-bold text-white`}>Pro</AppText>
                  </View>
                ) : null}
              </View>
              <TouchableOpacity
                onPress={() => {
                  if (!isSubscribed) {
                    router.push("/premium");
                    return;
                  }
                  router.push("/(tabs)/plan" as any);
                }}
                activeOpacity={0.7}
              >
                <View style={tw`flex-row items-center gap-1`}>
                  <AppText style={[styles.seeAllText, { color: p.seeAllText }]}>
                    {t("account.seeAll")} →
                  </AppText>
                  {!isSubscribed ? (
                    <View style={tw`flex-row items-center gap-1 bg-green-600 px-1.5 pr-2 py-0.5 rounded-full`}>
                      <Ionicons name="lock-closed" size={9} color="#fff" />
                      <AppText style={tw`text-[10px] font-bold text-white`}>Pro</AppText>
                    </View>
                  ) : null}
                </View>
              </TouchableOpacity>
            </View>
            <View style={tw`gap-3 mt-2`}>
              {isAssignedPracticeLoading ? (
                <View style={[styles.emptyState, { backgroundColor: p.emptyStateBg }]}>
                  <AppText style={[tw`text-sm`, { color: p.emptyStateText }]}>Loading drills…</AppText>
                </View>
              ) : assignedPracticeFeed.length === 0 ? (
                <View style={[styles.emptyState, { backgroundColor: p.emptyStateBg }]}>
                  <AppText style={[tw`text-sm`, { color: p.emptyStateText }]}>
                    {t("account.noDrillsYet")}
                  </AppText>
                </View>
              ) : (
                assignedPracticeFeed.map((item: AssignedPracticeFeedItem) =>
                  item.kind === "drill" ? (
                    <PlanDrillRow
                      key={item.assignment.assignmentId}
                      drill={item.assignment.drill}
                      assignmentId={item.assignment.assignmentId}
                      dueDate={item.assignment.dueDate}
                      completedAt={item.assignment.completedAt}
                      status={item.assignment.status}
                      onPress={() => handleDrillPress(item.assignment)}
                      onPressIn={() => prefetchDrillAssignment(item.assignment)}
                    />
                  ) : (
                    <PlanFreeTalkRow
                      key={`free-talk-${item.scenario.id}`}
                      scenarioId={item.scenario.id}
                      title={item.scenario.title}
                      scenarioType={item.scenario.scenarioType}
                      completionDate={item.scenario.completionDate}
                      completedAt={
                        completedFreeTalkIds?.has(item.scenario.id)
                          ? new Date().toISOString()
                          : undefined
                      }
                      locked={!isSubscribed}
                      onPress={() => handleFreeTalkPress(item.scenario.id)}
                    />
                  )
                )
              )}
            </View>
          </View>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ─── Styles ─────────────────────────────────────────────── */

const styles = StyleSheet.create({
  greetingText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#171717",
    lineHeight: 24,
  },
  greetingSubtext: {
    fontSize: 14,
    color: "#777777",
    lineHeight: 20,
    marginTop: 2,
  },

  streakPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FCFCFC",
    borderWidth: 0.5,
    borderColor: "rgba(231,234,237,0.5)",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
  },
  streakText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#000000",
    letterSpacing: -0.1,
  },

  bellBtn: {
    width: 28,
    height: 28,
    borderRadius: 100,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 0.5,
    borderColor: "rgba(231,234,237,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },

  viewSessionsBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "rgba(22, 101, 52, 0.28)",
    borderRadius: 14,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
  },
  viewSessionsBtnText: {
    color: "#15803D",
    fontSize: 15,
    fontWeight: "600",
  },

  // Section title
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1b1b1b",
    lineHeight: 24,
  },

  seeAllText: {
    fontSize: 13,
    color: "#22C55E",
    fontWeight: "600",
  },

  emptyState: {
    paddingVertical: 24,
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
  },
});
