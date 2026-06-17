import { DrillCardSkeletonList } from "@/components/drills/DrillCardSkeleton";
import { MyPlanHeader } from "@/components/plan/MyPlanHeader";
import { AssignedFreeTalkPlanCard } from "@/components/practice/AssignedFreeTalkHomeCard";
import DrillCard from "@/components/practice/DrillCard";
import { NextSessionCard } from "@/components/sessions/NextSessionCard";
import { AppText, BoldText } from "@/components/ui";
import { MY_DRILLS_FULL_LIST_LIMIT, useDrills } from "@/hooks/useDrills";
import { useFreeTalkCompletedScenarioIds } from "@/hooks/useFreeTalkCompletedScenarioIds";
import { useFreeTalkScenarios } from "@/hooks/useFreeTalkScenarios";
import {
  buildAssignedPracticeFeed,
  type AssignedPracticeFeedItem,
} from "@/utils/assignedPracticeFeed";
import { useIsSubscribed } from "@/hooks/useIsSubscribed";
import { useLearnerClasses } from "@/hooks/useLearnerClasses";
import tw from "@/lib/tw";
import { DrillAssignment } from "@/types/drill.types";
import { navigateToDrill } from "@/utils/drillNavigation";
import { categorizeDrillsByPlanTab } from "@/utils/drillPlanTab";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Types
type TabType = "ongoing" | "reviewed" | "completed";

// Tab Button Component
function TabButton({
  label,
  count,
  isActive,
  onPress,
}: {
  label: string;
  count: number;
  isActive: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={tw`px-3 py-2.5 rounded-full ${
        isActive ? "bg-green-700" : "bg-white dark:bg-neutral-700"
      }`}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={tw`flex-row items-center gap-2`}>
        <AppText
          style={tw`text-base font-semibold ${
            isActive ? "text-white" : "text-gray-700 dark:text-neutral-200"
          }`}
        >
          {label}
        </AppText>
        <View
          style={tw`min-w-6 h-6 rounded-full items-center justify-center ${
            isActive ? "bg-white/20" : "bg-gray-100 dark:bg-neutral-600"
          }`}
        >
          <AppText
            style={tw`text-sm font-semibold ${
              isActive ? "text-white" : "text-gray-600 dark:text-neutral-300"
            }`}
          >
            {count}
          </AppText>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// Empty State Component
function EmptyState({ tab }: { tab: TabType }) {
  const messages = {
    ongoing: {
      emoji: "📚",
      title: "No ongoing drills",
      subtitle: "Your assigned drills will appear here",
    },
    reviewed: {
      emoji: "✍️",
      title: "No reviewed drills yet",
      subtitle:
        "When your tutor marks a completed drill as reviewed, it shows up here (see docs/MOBILE_MY_PLAN.md §7).",
    },
    completed: {
      emoji: "🎉",
      title: "No completed drills yet",
      subtitle: "Complete drills to see them here",
    },
  };

  const message = messages[tab];

  return (
    <View style={tw`flex-1 items-center justify-center py-20`}>
      <AppText style={tw`text-6xl mb-4`}>{message.emoji}</AppText>
      <BoldText style={tw`text-xl text-gray-900 dark:text-white mb-2`}>{message.title}</BoldText>
      <AppText style={tw`text-base text-gray-500 dark:text-neutral-400 text-center px-8`}>
        {message.subtitle}
      </AppText>
    </View>
  );
}

// Error State Component
function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <View style={tw`flex-1 items-center justify-center py-20`}>
      <AppText style={tw`text-6xl mb-4`}>⚠️</AppText>
      <BoldText style={tw`text-xl text-gray-900 dark:text-white mb-2`}>
        Failed to load drills
      </BoldText>
      <AppText style={tw`text-base text-gray-500 dark:text-neutral-400 text-center px-8 mb-6`}>
        Please check your connection and try again
      </AppText>
      <TouchableOpacity
        style={tw`bg-green-700 px-6 py-3 rounded-full`}
        onPress={onRetry}
        activeOpacity={0.8}
      >
        <AppText style={tw`text-white font-semibold`}>Retry</AppText>
      </TouchableOpacity>
    </View>
  );
}

// Main Screen
export default function MyPlanScreen() {
  const [activeTab, setActiveTab] = useState<TabType>("ongoing");
  const isSubscribed = useIsSubscribed();

  // Fetch drills for My Plan — docs/MOBILE_MY_PLAN.md §4: high `limit` for main listing (see MY_DRILLS_FULL_LIST_LIMIT)
  const { data, isLoading, isError, refetch: refetchDrills } = useDrills(
    undefined,
    MY_DRILLS_FULL_LIST_LIMIT
  );
  const {
    data: freeTalkScenarios = [],
    isLoading: isFreeTalkLoading,
    refetch: refetchFreeTalk,
  } = useFreeTalkScenarios(isSubscribed);
  const { data: completedFreeTalkIds } = useFreeTalkCompletedScenarioIds(isSubscribed);
  // Fetch learner classes for Next Session card
  const { nextSession } = useLearnerClasses();

  // Categorize drills — docs/MOBILE_MY_PLAN.md §7: Reviewed = completed + latestAttempt.reviewStatus === 'reviewed' (see utils/drillPlanTab.ts)
  const categorizedDrills = useMemo(() => {
    if (!data?.drills) {
      return { ongoing: [], reviewed: [], completed: [] };
    }
    return categorizeDrillsByPlanTab(data.drills);
  }, [data?.drills]);

  const currentDrills = categorizedDrills[activeTab];

  const ongoingPracticeFeed = useMemo(() => {
    return buildAssignedPracticeFeed(categorizedDrills.ongoing, freeTalkScenarios);
  }, [categorizedDrills.ongoing, freeTalkScenarios]);

  const ongoingTabCount = categorizedDrills.ongoing.length + freeTalkScenarios.length;

  const handleDrillPress = (assignment: DrillAssignment) => {
    navigateToDrill(assignment, assignment.assignmentId);
  };

  const handleFreeTalkPress = (scenarioId: string) => {
    router.push({
      pathname: "/practice/free-talk/session",
      params: { scenarioId },
    });
  };

  useFocusEffect(
    useCallback(() => {
      void refetchDrills();
      if (isSubscribed) {
        void refetchFreeTalk();
      }
    }, [refetchDrills, isSubscribed, refetchFreeTalk])
  );

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    const tasks: Promise<unknown>[] = [refetchDrills()];
    if (isSubscribed) {
      tasks.push(refetchFreeTalk());
    }
    await Promise.all(tasks);
    setRefreshing(false);
  };

  useEffect(() => {
    if (!isSubscribed) {
      router.replace("/premium" as never);
    }
  }, [isSubscribed, router]);

  if (!isSubscribed) {
    return (
      <SafeAreaView
        edges={["top"]}
        style={tw`flex-1 bg-gray-50 dark:bg-neutral-900 items-center justify-center`}
      >
        <ActivityIndicator size="large" color="#15803D" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={tw`flex-1 bg-gray-50 dark:bg-neutral-900`}>
      <MyPlanHeader />

      {/* Next Session Card — always visible; empty state when no upcoming class */}
      <View style={tw`bg-white dark:bg-neutral-900 pt-3`}>
        <NextSessionCard session={nextSession} />
      </View>

      {/* Assigned Drills label + Tabs */}
      <View style={tw`bg-white dark:bg-neutral-900`}>
        <View style={tw`px-5 pt-4 pb-2`}>
          <BoldText style={tw`text-base font-bold text-gray-900 dark:text-white`}>
            Assigned Drills
          </BoldText>
        </View>
        <View style={tw`p-[8px] border-solid`}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={tw`gap-2`}
            style={tw`border rounded-full p-[8px] border-gray-200 dark:border-neutral-800`}
          >
            <TabButton
              label="Ongoing"
              count={ongoingTabCount}
              isActive={activeTab === "ongoing"}
              onPress={() => setActiveTab("ongoing")}
            />
            <TabButton
              label="Reviewed"
              count={categorizedDrills.reviewed.length}
              isActive={activeTab === "reviewed"}
              onPress={() => setActiveTab("reviewed")}
            />
            <TabButton
              label="Completed"
              count={categorizedDrills.completed.length}
              isActive={activeTab === "completed"}
              onPress={() => setActiveTab("completed")}
            />
          </ScrollView>
        </View>
      </View>

      {/* Content */}
      <ScrollView
        style={tw`flex-1`}
        contentContainerStyle={tw`px-5 py-4`}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#15803D"
            colors={["#15803D"]}
          />
        }
      >
        {isLoading || (activeTab === "ongoing" && isFreeTalkLoading) ? (
          <DrillCardSkeletonList count={4} />
        ) : isError ? (
          <ErrorState onRetry={() => refetchDrills()} />
        ) : activeTab === "ongoing" ? (
          ongoingPracticeFeed.length === 0 ? (
            <EmptyState tab={activeTab} />
          ) : (
            ongoingPracticeFeed.map((item: AssignedPracticeFeedItem) =>
              item.kind === "drill" ? (
                <DrillCard
                  key={item.assignment.assignmentId}
                  drill={item.assignment.drill}
                  onPress={() => handleDrillPress(item.assignment)}
                  locked={false}
                  isCompleted={false}
                  thumbnail={require("@/assets/images/thumbnail.png")}
                />
              ) : (
                <AssignedFreeTalkPlanCard
                  key={`free-talk-${item.scenario.id}`}
                  scenario={item.scenario}
                  completed={completedFreeTalkIds?.has(item.scenario.id)}
                  onPress={() => handleFreeTalkPress(item.scenario.id)}
                />
              )
            )
          )
        ) : currentDrills.length === 0 ? (
          <EmptyState tab={activeTab} />
        ) : (
          currentDrills.map((assignment) => (
            <DrillCard
              key={assignment.assignmentId}
              drill={assignment.drill}
              onPress={() => handleDrillPress(assignment)}
              locked={false}
              isCompleted={activeTab === "completed"}
              thumbnail={require("@/assets/images/thumbnail.png")}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}