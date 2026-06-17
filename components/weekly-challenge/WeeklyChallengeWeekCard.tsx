import { AppText } from "@/components/ui";
import tw from "@/lib/tw";
import { useSemanticTheme } from "@/hooks/useSemanticTheme";
import { formatSummaryMessage, formatWeekDate } from "@/utils/challengeDrillAdapter";
import type { WeeklyChallengeListResponse } from "@/types/weekly-challenge.types";
import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, TouchableOpacity, View } from "react-native";

interface WeeklyChallengeWeekCardProps {
  challenge: WeeklyChallengeListResponse;
  weekNumber: number;
  onPress: () => void;
}

// ─── Status badge ──────────────────────────────────────────────────────────────

interface BadgeConfig {
  label: string;
  bg: string;
  text: string;
  spinning?: boolean;
}

function getStatusBadge(challenge: WeeklyChallengeListResponse): BadgeConfig {
  const completedCount = challenge.drillSequence.filter((d) => d.completed).length;
  const total = challenge.drillSequence.length;
  const isCompleted = completedCount > 0 && completedCount === total;
  const isOngoing = completedCount > 0 && completedCount < total;

  if (challenge.status === "generating") {
    return { label: "Generating", bg: "#FEF3C7", text: "#B45309", spinning: true };
  }
  if (challenge.status === "failed") {
    return { label: "Failed", bg: "#FEE2E2", text: "#B91C1C" };
  }
  if (isCompleted) {
    return { label: "Completed", bg: "#D1FAE5", text: "#047857" };
  }
  if (isOngoing) {
    return { label: "Ongoing", bg: "#DBEAFE", text: "#1D4ED8" };
  }
  return { label: "Ready", bg: "#D1FAE5", text: "#047857" };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function WeeklyChallengeWeekCard({
  challenge,
  weekNumber,
  onPress,
}: WeeklyChallengeWeekCardProps) {
  const { colors: c } = useSemanticTheme();
  const badge = getStatusBadge(challenge);
  const completedCount = challenge.drillSequence.filter((d) => d.completed).length;
  const totalDrills = challenge.drillSequence.length;
  const summaryText = formatSummaryMessage(challenge.summaryMessage);
  const dateLabel = challenge.generatedAt
    ? `Generated ${formatWeekDate(challenge.generatedAt)}`
    : `Week of ${formatWeekDate(challenge.weekStartDate)}`;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[
        tw`rounded-2xl p-3 flex-row items-center gap-3 border`,
        { backgroundColor: c.card, borderColor: c.border },
      ]}
    >
      {/* Thumbnail */}
      <View
        style={tw`h-14 w-14 shrink-0 items-center justify-center rounded-xl`}
        // Emerald gradient expressed as flat color (LinearGradient not available without expo-linear-gradient import)
      >
        <View
          style={[
            tw`h-14 w-14 items-center justify-center rounded-xl`,
            { backgroundColor: "#047857" },
          ]}
        >
          <Ionicons name="trophy" size={26} color="#fff" />
        </View>
      </View>

      {/* Content */}
      <View style={tw`flex-1 gap-0.5`}>
        {/* Title + badge row */}
        <View style={tw`flex-row items-center gap-2 flex-wrap`}>
          <AppText style={[tw`text-sm font-bold flex-shrink`, { color: c.textPrimary }]}>
            Week {weekNumber} Challenge
          </AppText>
          <View
            style={[
              tw`flex-row items-center gap-1 px-2 py-0.5 rounded-full`,
              { backgroundColor: badge.bg },
            ]}
          >
            {badge.spinning && (
              <ActivityIndicator size={10} color={badge.text} style={tw`mr-0.5`} />
            )}
            <AppText style={[tw`text-xs font-semibold`, { color: badge.text }]}>
              {badge.label}
            </AppText>
          </View>
        </View>

        {/* Date */}
        <AppText style={[tw`text-xs`, { color: c.textTertiary }]}>{dateLabel}</AppText>

        {/* Summary */}
        <AppText
          style={[tw`text-xs mt-0.5`, { color: c.textSecondary }]}
          numberOfLines={2}
        >
          {summaryText}
        </AppText>

        {/* Meta row */}
        <View style={tw`flex-row items-center gap-3 mt-1`}>
          <AppText style={[tw`text-xs`, { color: c.textTertiary }]}>
            {totalDrills} {totalDrills === 1 ? "drill" : "drills"}
          </AppText>
          <AppText style={[tw`text-xs`, { color: c.textTertiary }]}>·</AppText>
          <AppText style={[tw`text-xs`, { color: c.textTertiary }]}>
            {challenge.totalEstimatedMinutes} min
          </AppText>
          <AppText style={[tw`text-xs`, { color: c.textTertiary }]}>·</AppText>
          <AppText style={[tw`text-xs`, { color: c.textTertiary }]}>
            {completedCount}/{totalDrills} completed
          </AppText>
        </View>
      </View>

      {/* Chevron */}
      <Ionicons name="chevron-forward" size={16} color={c.textTertiary} />
    </TouchableOpacity>
  );
}
