import DrillCard from "@/components/practice/DrillCard";
import { DrillCardSkeletonList } from "@/components/drills/DrillCardSkeleton";
import { AppText, BoldText } from "@/components/ui";
import tw from "@/lib/tw";
import { DrillAssignment } from "@/types/drill.types";
import { navigateToDrill } from "@/utils/drillNavigation";
import { Ionicons } from "@expo/vector-icons";
import { useState, useMemo } from "react";
import { ScrollView, TouchableOpacity, View, RefreshControl, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDrills, useRefreshDrills } from "@/hooks/useDrills";
import { logger } from "@/utils/logger";
import { useAuth } from "@/hooks/useAuth";
import { router } from "expo-router";
import { PlanOnboardingGate } from "@/components/gating/PlanOnboardingGate";
import { PlanCompletedGate } from "@/components/gating/PlanCompletedGate";

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
      title: "No reviewed drills",
      subtitle: "Drills awaiting review will appear here",
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
  const { user } = useAuth();
  const isFreeUser = !user?.isSubscribed;
  const [hasSeenPlanGate, setHasSeenPlanGate] = useState(false);

  console.log(user)
  
  // Fetch all drills (we'll filter client-side)
  const { data, isLoading, isError, refetch } = useDrills();
  const refreshDrills = useRefreshDrills();

  // Categorize drills by status
  const categorizedDrills = useMemo(() => {
    if (!data?.drills) {
      return { ongoing: [], reviewed: [], completed: [] };
    }

    logger.log('🔄 Categorizing drills...', {
      totalDrills: data.drills.length,
    });

    const now = new Date();
    
    const { ongoing, reviewed, completed } = data.drills.reduce(
      (acc, assignment) => {
        // 1. Check for REVIEWED status (Highest priority)
        // A drill is reviewed if it has a latest attempt with reviewStatus === 'reviewed'
        const attempt = assignment.latestAttempt;
        const isReviewed = attempt && (
             (attempt.summaryResults?.reviewStatus === 'reviewed') ||
             (attempt.sentenceResults?.reviewStatus === 'reviewed') ||
             (attempt.grammarResults?.reviewStatus === 'reviewed')
        );

        if (isReviewed) {
          acc.reviewed.push(assignment);
          return acc;
        }

        // 2. Check for COMPLETED status
        // A drill is completed if status is 'completed' OR has completedAt date
        if (assignment.status === "completed" || !!assignment.completedAt) {
          acc.completed.push(assignment);
          return acc;
        }

        // 3. Otherwise it's ONGOING
        acc.ongoing.push(assignment);
        return acc;
      },
      { ongoing: [] as DrillAssignment[], reviewed: [] as DrillAssignment[], completed: [] as DrillAssignment[] }
    );

    logger.log('📊 Categorization results:', {
      ongoing: ongoing.length,
      reviewed: reviewed.length,
      completed: completed.length,
    });

    return { ongoing, reviewed, completed };
  }, [data?.drills]);

  const currentDrills = categorizedDrills[activeTab];

  const handleDrillPress = (assignment: DrillAssignment) => {
    navigateToDrill(assignment, assignment.assignmentId);
  };

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  return (
    <SafeAreaView edges={['top']} style={tw`flex-1 bg-gray-50 dark:bg-neutral-900`}>
      {/* Header */}
      <View style={tw`px-5 pt-4 pb-4 bg-white dark:bg-neutral-900 border-b border-gray-100 dark:border-neutral-800`}>
        <View style={tw`flex-row items-start justify-between mb-1`}>
          <View style={tw`flex-1`}>
            <BoldText style={tw`text-2xl font-bold text-gray-900 dark:text-white mb-1`}>
              My plans
            </BoldText>
            <AppText style={tw`text-base text-gray-500 dark:text-neutral-400`}>
              Designed for you, based on your goals
            </AppText>
          </View>
          <View style={tw`flex-row items-end gap-1`}>
            <View style={tw`w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-full items-center justify-center`}>
              <AppText style={tw`text-lg`}>🔆</AppText>
            </View>
            <View style={tw`flex-row items-center bg-orange-50 dark:bg-orange-900/20 rounded-full px-3 py-1.5`}>
              <AppText style={tw`text-base mr-1`}>🔥</AppText>
              <AppText style={tw`text-base font-semibold text-gray-900 dark:text-white`}>22</AppText>
            </View>
            <TouchableOpacity style={tw`w-10 h-10 items-center justify-center`}>
              <Ionicons name="notifications-outline" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Tabs */}
      <View style={tw`p-[8px] bg-white dark:bg-neutral-900 border-solid`}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={tw`gap-2`}
          style={tw`border rounded-full p-[8px] border-gray-200 dark:border-neutral-800`}
        >
          <TabButton
            label="Ongoing"
            count={categorizedDrills.ongoing.length}
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
        {isLoading ? (
          <DrillCardSkeletonList count={4} />
        ) : isError ? (
          <ErrorState onRetry={() => refetch()} />
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

      {/* Plan Gates */}
      {(() => {
        const showOnboarding = isFreeUser && !hasSeenPlanGate;
        const showCompleted = isFreeUser && hasSeenPlanGate && categorizedDrills.ongoing.length === 0 && categorizedDrills.completed.length > 0;
        return (
          <PlanOnboardingGate 
            visible={showOnboarding || showCompleted} 
            isCompletedState={showCompleted}
            onClose={() => {
              if (showOnboarding) {
                setHasSeenPlanGate(true);
              }
            }} 
          />
        );
      })()}
    </SafeAreaView>
  );
}