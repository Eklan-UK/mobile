import { AppText, BoldText } from "@/components/ui";
import { ContinuePracticeCard } from "@/components/practice/continue-practice-card";
import { ProgressCircle } from "@/components/ui/ProgressCircle";
import { useAuth } from "@/hooks/useAuth";
import { useIsSubscribed } from "@/hooks/useIsSubscribed";
import { useConfidence } from "@/hooks/useConfidence";
import { useDailyFocusToday } from "@/hooks/useDailyFocusToday";
import { useHomeProgress } from "@/hooks/useHomeProgress";
import { useDrills } from "@/hooks/useDrills";
import { usePrefetch } from "@/hooks/usePrefetch";
import { usePronunciation } from "@/hooks/usePronunciation";
import { useUserStreakCount } from "@/hooks/useUserStreakCount";
import { DrillAssignment, DrillType, getDrillCategory } from "@/types/drill.types";
import { navigateToDrill } from "@/utils/drillNavigation";
import { format } from "date-fns";
import tw from "@/lib/tw";
import BellIcon from "@/assets/icons/bell.svg";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, memo, useMemo } from "react";
import type { ComponentProps } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path, Circle } from "react-native-svg";
import { useSemanticTheme } from "@/hooks/useSemanticTheme";
import { brandColors } from "@/constants/theme-tokens";

/* ─── Category metadata ─────────────────────────────────── */

const CATEGORY_COLORS: Record<DrillType, string> = {
  roleplay: "#0088FF",
  vocabulary: "#FF8D28",
  grammar: "#CB30E0",
  listening: "#00C0E8",
  summary: "#34C759",
  matching: "#FF8D28",
  definition: "#6155F5",
  sentence_writing: "#6155F5",
  sentence: "#6155F5",
  fill_blank: "#00C0E8",
  pronunciation: "#6155F5",
};

/* ─── Small SVG icons ─────────────────────────────────────── */

const FlameIcon = () => (
  <Ionicons name="flame" size={14} color="#EA580C" />
);

const StarIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="#FFFFFF">
    <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </Svg>
);

const ChevronRightIcon = ({ size = 16, stroke = "#9CA3AF" }: { size?: number; stroke?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M9 18l6-6-6-6"
      stroke={stroke}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const TrendingUpIcon = ({ color = "#4CAF50" }: { color?: string }) => (
  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3 17l5-5 4 4 8-8"
      stroke={color}
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M14 9h5v5"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const TrendingDownIcon = ({ color = "#EF4444" }: { color?: string }) => (
  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3 7l5 5 4-4 8 8"
      stroke={color}
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M14 15h5v-5"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

/** Ring + accent colours aligned with product reference cards */
const METRIC_CONFIDENCE_RING = "#E8A317";
const METRIC_PRONUNCIATION_RING = "#34C759";
const METRIC_ACCURATE_SENTENCE_RING = "#0EA5E9";
const METRIC_RESPONSE_SPEED_RING = "#8B5CF6";

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

const ClockIcon = () => (
  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
    <Circle cx={12} cy={12} r={9} stroke="#9CA3AF" strokeWidth={1.5} />
    <Path d="M12 7v5l3 3" stroke="#9CA3AF" strokeWidth={1.5} strokeLinecap="round" />
  </Svg>
);

/* ─── Metric Row (full-width, Figma design) ───────────────── */

interface MetricRowProps {
  variant: "confidence" | "pronunciation" | "accurateSentence" | "responseSpeed";
  label: string;
  weeklyChange: number;
  score: number;
  circleColor: string;
  /** Colour for the value inside the ring (reference: gold for confidence, black for others). */
  valueColor: string;
  displayValue: string;
  isLoading: boolean;
}

const METRIC_VARIANT_STYLES_LIGHT: Record<
  MetricRowProps["variant"],
  { iconBoxBg: string; iconColor: string; icon: ComponentProps<typeof Ionicons>["name"] }
> = {
  confidence: {
    iconBoxBg: "#FEF9C3",
    iconColor: "#CA8A04",
    icon: "trending-up",
  },
  pronunciation: {
    iconBoxBg: "#F0FDF4",
    iconColor: "#16A34A",
    icon: "mic-outline",
  },
  accurateSentence: {
    iconBoxBg: "#EFF6FF",
    iconColor: "#2563EB",
    icon: "chatbox-ellipses-outline",
  },
  responseSpeed: {
    iconBoxBg: "#F5F3FF",
    iconColor: "#7C3AED",
    icon: "flash-outline",
  },
};

const METRIC_VARIANT_STYLES_DARK: Record<
  MetricRowProps["variant"],
  { iconBoxBg: string; iconColor: string; icon: ComponentProps<typeof Ionicons>["name"] }
> = {
  confidence: {
    iconBoxBg: "#3F3524",
    iconColor: "#FACC15",
    icon: "trending-up",
  },
  pronunciation: {
    iconBoxBg: "#1A2E1F",
    iconColor: "#4ADE80",
    icon: "mic-outline",
  },
  accurateSentence: {
    iconBoxBg: "#1E293B",
    iconColor: "#60A5FA",
    icon: "chatbox-ellipses-outline",
  },
  responseSpeed: {
    iconBoxBg: "#2E1065",
    iconColor: "#C4B5FD",
    icon: "flash-outline",
  },
};

type HomePalette = {
  isDark: boolean;
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
  metricRowBg: string;
  metricRowBorder: string;
  metricRowLabel: string;
  metricRingTrack: string;
  metricCircleNeutral: string;
  savedDrillsRowBg: string;
  savedDrillsRowBorder: string;
  savedDrillsText: string;
  seeAllText: string;
  drillCardBg: string;
  drillCardBorder: string;
  drillTitle: string;
  drillMeta: string;
  drillMetaDot: string;
  drillSmallIcon: string;
  overdueBannerBg: string;
  overdueBannerBorder: string;
  overdueText: string;
  drillAssignedBy: string;
  emptyStateBg: string;
  emptyStateText: string;
  chevronStroke: string;
};

function useHomePalette(): HomePalette {
  const { isDark, colors: c } = useSemanticTheme();
  return useMemo(
    () => ({
      isDark,
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
      metricRowBg: c.card,
      metricRowBorder: c.border,
      metricRowLabel: c.textPrimary,
      metricRingTrack: c.progressBg,
      metricCircleNeutral: c.textPrimary,
      savedDrillsRowBg: c.muted,
      savedDrillsRowBorder: c.border,
      savedDrillsText: c.textPrimary,
      seeAllText: brandColors.primaryLight,
      drillCardBg: c.card,
      drillCardBorder: c.border,
      drillTitle: c.textPrimary,
      drillMeta: c.textSecondary,
      drillMetaDot: c.textLight,
      drillSmallIcon: c.textSecondary,
      overdueBannerBg: isDark ? "rgba(239,68,68,0.14)" : "rgba(239,68,68,0.08)",
      overdueBannerBorder: isDark ? "rgba(248,113,113,0.35)" : "rgba(239,68,68,0.25)",
      overdueText: isDark ? "#FCA5A5" : "#991B1B",
      drillAssignedBy: c.textSecondary,
      emptyStateBg: c.muted,
      emptyStateText: c.textSecondary,
      chevronStroke: c.textLight,
    }),
    [isDark, c]
  );
}

const MetricRow = memo(
  ({
    variant,
    label,
    weeklyChange,
    score,
    circleColor,
    valueColor,
    displayValue,
    isLoading,
  }: MetricRowProps) => {
    const p = useHomePalette();
    const vs = (p.isDark ? METRIC_VARIANT_STYLES_DARK : METRIC_VARIANT_STYLES_LIGHT)[variant];
    const changeText = isLoading
      ? "..."
      : `${weeklyChange >= 0 ? "+" : ""}${weeklyChange}% this week`;
    const changePositive = weeklyChange >= 0;
    const changeColor = changePositive ? "#4CAF50" : "#DC2626";

    return (
      <View
        style={[
          styles.metricRow,
          { backgroundColor: p.metricRowBg, borderColor: p.metricRowBorder },
        ]}
      >
        <View style={[styles.metricIconBox, { backgroundColor: vs.iconBoxBg }]}>
          <Ionicons name={vs.icon} size={20} color={vs.iconColor} />
        </View>
        <View style={styles.metricRowTextCol}>
          <AppText style={[styles.metricRowLabel, { color: p.metricRowLabel }]}>{label}</AppText>
          <View style={tw`flex-row items-center gap-1`}>
            {changePositive ? (
              <TrendingUpIcon color={changeColor} />
            ) : (
              <TrendingDownIcon color={changeColor} />
            )}
            <AppText style={[styles.metricRowChange, { color: changeColor }]}>
              {changeText}
            </AppText>
          </View>
        </View>
        <ProgressCircle
          progress={Math.max(0, Math.min(100, score))}
          size={36}
          strokeWidth={3}
          color={circleColor}
          backgroundColor={p.metricRingTrack}
        >
          <AppText style={[styles.metricCircleText, { color: valueColor }]}>
            {isLoading ? "–" : displayValue}
          </AppText>
        </ProgressCircle>
      </View>
    );
  }
);

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

/* ─── Drill Card ─────────────────────────────────────────── */

const DRILL_EMOJI: Record<DrillType, string> = {
  roleplay: "🎭",
  vocabulary: "📚",
  grammar: "✏️",
  listening: "🎧",
  summary: "📰",
  matching: "🔗",
  definition: "📖",
  sentence_writing: "✍️",
  sentence: "💬",
  fill_blank: "📝",
  pronunciation: "🗣️",
};

/** Pronunciation cards use a sky-blue mic (matches web / design ref), not the generic emoji. */
function DrillCardThumb({ type }: { type: DrillType }) {
  if (type === "pronunciation") {
    return <Ionicons name="mic" size={24} color="#38BDF8" />;
  }
  const emoji = DRILL_EMOJI[type] ?? "📝";
  return <AppText style={tw`text-xl`}>{emoji}</AppText>;
}

const DRILL_ICON_BG: Record<DrillType, string> = {
  roleplay: "#EBF5FF",
  vocabulary: "#FFF5EB",
  grammar: "#FDF0FF",
  listening: "#E5FAFF",
  summary: "#EDFAF2",
  matching: "#FFF5EB",
  definition: "#F0EFFE",
  sentence_writing: "#F0EFFE",
  sentence: "#F0EFFE",
  fill_blank: "#E5FAFF",
  pronunciation: "#E8F4FC",
};

const DRILL_ICON_BG_DARK: Record<DrillType, string> = {
  roleplay: "#1E3A52",
  vocabulary: "#3D2E1F",
  grammar: "#2D1F3D",
  listening: "#0F2A32",
  summary: "#142620",
  matching: "#3D2E1F",
  definition: "#252040",
  sentence_writing: "#252040",
  sentence: "#252040",
  fill_blank: "#0F2A32",
  pronunciation: "#153243",
};

type DrillStatus = "completed" | "missed" | "ongoing" | "active";

function getDrillStatus(assignment: DrillAssignment): DrillStatus {
  const { status, completedAt, dueDate } = assignment as any;
  if (completedAt || status === "completed") return "completed";
  const deadline = dueDate ? new Date(dueDate) : null;
  if (deadline && deadline < new Date() && !completedAt) return "missed";
  if (status === "in_progress") return "ongoing";
  return "active";
}

const STATUS_BADGE: Record<
  DrillStatus,
  { label: string; bg: string; color: string }
> = {
  completed: { label: "Completed", bg: "#D1FAE5", color: "#065F46" },
  missed:    { label: "Missed",    bg: "#FEE2E2", color: "#991B1B" },
  ongoing:   { label: "Ongoing",   bg: "#DBEAFE", color: "#1E40AF" },
  active:    { label: "Active",    bg: "#DBEAFE", color: "#1E40AF" },
};

const DrillCard = memo(
  ({ assignment, onPress }: { assignment: DrillAssignment; onPress: () => void }) => {
    const p = useHomePalette();
    const isSubscribed = useIsSubscribed();
    const { drill } = assignment;
    const drillStatus = getDrillStatus(assignment);
    const isCompleted = drillStatus === "completed";
    const isMissed = drillStatus === "missed";
    const badge = STATUS_BADGE[drillStatus];
    const iconBg = p.isDark
      ? (DRILL_ICON_BG_DARK[drill.type] ?? "#262626")
      : (DRILL_ICON_BG[drill.type] ?? "#F3F4F6");
    const category = getDrillCategory(drill.type);
    const difficulty = (drill as any).difficulty as string | undefined;

    const rawDueDate = (assignment as any).dueDate ?? (drill as any).date;
    const dueDateStr = rawDueDate
      ? format(new Date(rawDueDate), "MMM d, yyyy")
      : null;

    const score = (assignment as any).latestAttempt?.score as number | undefined;
    const assignedBy = (assignment as any).assignedBy as
      | { firstName?: string; lastName?: string }
      | undefined;
    const assignedByName = assignedBy
      ? `${assignedBy.firstName ?? ""} ${assignedBy.lastName ?? ""}`.trim()
      : null;

    return (
      <View
        style={[
          styles.drillCard,
          { backgroundColor: p.drillCardBg, borderColor: p.drillCardBorder },
        ]}
      >
        {/* Top row: icon + title + badge */}
        <View style={tw`flex-row items-start gap-3`}>
          <View style={[styles.drillThumb, { backgroundColor: iconBg }]}>
            <DrillCardThumb type={drill.type} />
          </View>
          <View style={tw`flex-1`}>
            <View style={tw`flex-row items-center justify-between gap-2`}>
              <BoldText style={[styles.drillTitle, { color: p.drillTitle }]} numberOfLines={2}>
                {drill.title}
              </BoldText>
              <View style={[styles.drillBadge, { backgroundColor: badge.bg }]}>
                {isCompleted && (
                  <Ionicons name="checkmark-circle" size={11} color={badge.color} />
                )}
                <AppText style={[styles.drillBadgeText, { color: badge.color }]}>
                  {badge.label}
                </AppText>
              </View>
            </View>

            {/* Type + difficulty */}
            <View style={tw`flex-row items-center gap-1 mt-1`}>
              <AppText style={[styles.drillMeta, { color: p.drillMeta }]}>{category}</AppText>
              {difficulty && (
                <>
                  <AppText style={[styles.drillMetaDot, { color: p.drillMetaDot }]}>•</AppText>
                  <Ionicons name="target" size={11} color={p.drillSmallIcon} />
                  <AppText style={[styles.drillMeta, { color: p.drillMeta }]}>{difficulty}</AppText>
                </>
              )}
            </View>
          </View>
        </View>

        {/* Overdue banner */}
        {isMissed && (
          <View
            style={[
              styles.overdueBanner,
              {
                backgroundColor: p.overdueBannerBg,
                borderColor: p.overdueBannerBorder,
              },
            ]}
          >
            <AppText style={[styles.overdueText, { color: p.overdueText }]}>
              This drill is overdue
            </AppText>
          </View>
        )}

        {/* Due date + score */}
        <View style={tw`flex-row items-center gap-3 mt-2`}>
          {dueDateStr && (
            <View style={tw`flex-row items-center gap-1`}>
              <Ionicons name="calendar-outline" size={13} color={p.drillSmallIcon} />
              <AppText style={[styles.drillMeta, { color: p.drillMeta }]}>Due: {dueDateStr}</AppText>
            </View>
          )}
          {score !== undefined && (
            <View style={tw`flex-row items-center gap-1`}>
              <Ionicons name="checkmark-circle-outline" size={13} color="#16A34A" />
              <AppText style={[styles.drillMeta, { color: "#16A34A" }]}>
                Score: {score}%
              </AppText>
            </View>
          )}
        </View>

        {/* Footer: assigned by + CTA */}
        <View style={tw`flex-row items-center justify-between mt-3`}>
          {assignedByName ? (
            <AppText style={[styles.drillAssignedBy, { color: p.drillAssignedBy }]} numberOfLines={1}>
              Assigned by: {assignedByName}
            </AppText>
          ) : (
            <View />
          )}
          <TouchableOpacity
            style={[styles.drillCta, !isSubscribed && styles.drillCtaLocked]}
            onPress={() => {
              if (!isSubscribed) {
                router.push("/premium");
                return;
              }
              onPress();
            }}
            activeOpacity={0.85}
          >
            {!isSubscribed ? (
              <View style={tw`flex-row items-center gap-1`}>
                <Ionicons name="lock-closed" size={12} color="#fff" />
                <BoldText style={styles.drillCtaTextLocked}>Pro</BoldText>
              </View>
            ) : (
              <BoldText style={styles.drillCtaText}>
                {isCompleted ? "View Results" : "Start"}
              </BoldText>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }
);

/* ─── Home Screen ────────────────────────────────────────── */

export default function HomeScreen() {
  const { user } = useAuth();
  const isSubscribed = useIsSubscribed();
  const firstName = user?.firstName ?? "there";

  const { prefetchDrill } = usePrefetch();
  const { data: streakCount = 0 } = useUserStreakCount();

  const { data: pronunciation, isLoading: pronunciationLoading, weeklyChange: weeklyPronunciation } =
    usePronunciation();
  const { data: confidence, isLoading: confidenceLoading, weeklyChange: weeklyConfidence } =
    useConfidence();
  const { data: homeProgress, isLoading: progressLoading } = useHomeProgress();

  const {
    data: dailyFocus,
    isPending: isDailyFocusPending,
    isError: isDailyFocusError,
  } = useDailyFocusToday();

  const { data: drillsData, isLoading: isDrillsLoading } = useDrills(undefined, 50);

  const assignedDrills = useMemo(() => {
    const list = drillsData?.drills ?? [];
    return [...list]
      .sort((a, b) => {
        const aDate = (a as any).assignedAt ?? (a.drill as any)?.date ?? "";
        const bDate = (b as any).assignedAt ?? (b.drill as any)?.date ?? "";
        return bDate.localeCompare(aDate);
      })
      .slice(0, 4);
  }, [drillsData]);

  const continuePracticeAssignment = useMemo(() => {
    const list = drillsData?.drills ?? [];
    const open = list.filter(d => d.status !== "completed");
    const inProgress = open.find(d => d.status === "in_progress");
    if (inProgress) return inProgress;
    return open.find(d => d.status === "pending") ?? null;
  }, [drillsData]);

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
      const drillStatus = getDrillStatus(assignment);
      if (drillStatus === "completed") {
        router.push(
          `/practice/drills/results?drillId=${assignment.drill._id}&assignmentId=${assignment.assignmentId}` as any
        );
        return;
      }
      prefetchDrill(assignment.drill._id);
      navigateToDrill(assignment);
    },
    [prefetchDrill, isSubscribed]
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
            <TouchableOpacity
              onPress={() => router.push("/(tabs)/profile")}
              activeOpacity={0.85}
              accessibilityLabel="Profile"
            >
              <LinearGradient
                colors={["#FF9F43", "#FF6B35", "#E85D04"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.starBtnGradient}
              >
                <StarIcon />
              </LinearGradient>
            </TouchableOpacity>
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
                prefetchDrill(continuePracticeAssignment.drill._id);
                navigateToDrill(continuePracticeAssignment);
              }}
            />
          )}

          {/* ── VIEW SESSIONS ───────────────────────────────── */}
          <ViewSessionsButton />

          {/* ── YOUR PROGRESS ──────────────────────────────── */}
          <View>
            <AppText style={[styles.sectionTitle, { color: p.sectionTitle }]}>Your Progress</AppText>
            <View style={tw`gap-2 mt-2`}>
              <MetricRow
                variant="confidence"
                label="Confidence"
                weeklyChange={weeklyConfidence}
                score={confidence?.confidenceScore ?? 0}
                circleColor={METRIC_CONFIDENCE_RING}
                valueColor={METRIC_CONFIDENCE_RING}
                displayValue={`${Math.round(confidence?.confidenceScore ?? 0)}%`}
                isLoading={confidenceLoading}
              />
              <MetricRow
                variant="pronunciation"
                label="Pronunciation"
                weeklyChange={weeklyPronunciation}
                score={pronunciation?.overallScore ?? 0}
                circleColor={METRIC_PRONUNCIATION_RING}
                valueColor={p.metricCircleNeutral}
                displayValue={`${Math.round(pronunciation?.overallScore ?? 0)}`}
                isLoading={pronunciationLoading}
              />
              <MetricRow
                variant="accurateSentence"
                label="Accurate Sentence Usage"
                weeklyChange={homeProgress?.sentenceWeeklyChange ?? 0}
                score={homeProgress?.accurateSentenceUsage ?? 0}
                circleColor={METRIC_ACCURATE_SENTENCE_RING}
                valueColor={p.metricCircleNeutral}
                displayValue={`${Math.round(homeProgress?.accurateSentenceUsage ?? 0)}`}
                isLoading={progressLoading}
              />
              <MetricRow
                variant="responseSpeed"
                label="Response Speed"
                weeklyChange={homeProgress?.speedWeeklyChange ?? 0}
                score={homeProgress?.responseSpeed ?? 0}
                circleColor={METRIC_RESPONSE_SPEED_RING}
                valueColor={p.metricCircleNeutral}
                displayValue={`${Math.round(homeProgress?.responseSpeed ?? 0)}`}
                isLoading={progressLoading}
              />
            </View>
          </View>

          {/* ── SAVED DRILLS ───────────────────────────────── */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push("/bookmarks")}
            style={[
              styles.savedDrillsRow,
              {
                backgroundColor: p.savedDrillsRowBg,
                borderColor: p.savedDrillsRowBorder,
              },
            ]}
          >
            <View style={tw`flex-row items-center gap-3`}>
              <View style={styles.savedDrillsIconBox}>
                <AppText style={styles.savedDrillsEmoji} accessibilityLabel="Saved drills">
                  📘
                </AppText>
              </View>
              <AppText style={[styles.savedDrillsText, { color: p.savedDrillsText }]}>
                Saved Drills
              </AppText>
            </View>
            <ChevronRightIcon size={20} stroke={p.chevronStroke} />
          </TouchableOpacity>

          {/* ── ASSIGNED DRILLS ────────────────────────────── */}
          <View>
            <View style={tw`flex-row items-center justify-between`}>
              <View style={tw`flex-row items-center gap-2 flex-1 mr-2 flex-wrap`}>
                <AppText style={[styles.sectionTitle, { color: p.sectionTitle }]}>
                  Assigned Drills
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
                  <AppText style={[styles.seeAllText, { color: p.seeAllText }]}>See All →</AppText>
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
              {isDrillsLoading ? (
                <View style={[styles.emptyState, { backgroundColor: p.emptyStateBg }]}>
                  <AppText style={[tw`text-sm`, { color: p.emptyStateText }]}>Loading drills…</AppText>
                </View>
              ) : assignedDrills.length === 0 ? (
                <View style={[styles.emptyState, { backgroundColor: p.emptyStateBg }]}>
                  <AppText style={[tw`text-sm`, { color: p.emptyStateText }]}>
                    No drills assigned yet
                  </AppText>
                </View>
              ) : (
                assignedDrills.map((assignment) => (
                  <DrillCard
                    key={assignment.assignmentId}
                    assignment={assignment}
                    onPress={() => handleDrillPress(assignment)}
                  />
                ))
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

  starBtnGradient: {
    width: 38,
    height: 38,
    borderRadius: 11,
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

  // Metric rows
  metricRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 0.5,
    borderColor: "rgba(231,234,237,0.5)",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    minHeight: 64,
    boxShadow: "0px 1px 2px rgba(0,0,0,0.04)",
  },
  metricIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  metricRowTextCol: {
    flex: 1,
    flexDirection: "column",
    gap: 4,
    minWidth: 0,
    marginRight: 4,
  },
  metricRowLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1b1b1b",
    lineHeight: 20,
  },
  metricRowChange: {
    fontSize: 12,
    fontWeight: "400",
    lineHeight: 16,
  },
  metricCircleText: {
    fontSize: 9,
    fontWeight: "600",
  },

  // Saved drills row
  savedDrillsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FAFAFA",
    borderWidth: 0.5,
    borderColor: "rgba(231,234,237,0.5)",
    borderRadius: 16,
    padding: 16,
  },
  savedDrillsIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#FFEDDD",
    alignItems: "center",
    justifyContent: "center",
  },
  savedDrillsText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#171717",
  },
  savedDrillsEmoji: {
    fontSize: 20,
    lineHeight: 24,
  },

  // Drill cards
  seeAllText: {
    fontSize: 13,
    color: "#22C55E",
    fontWeight: "600",
  },
  drillCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 0.5,
    borderColor: "rgba(231,234,237,0.6)",
    borderRadius: 16,
    padding: 14,
    boxShadow: "0px 1px 3px rgba(0,0,0,0.05)",
  },
  drillThumb: {
    width: 42,
    height: 42,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  drillTitle: {
    flex: 1,
    fontSize: 14,
    color: "#111827",
    letterSpacing: -0.2,
    lineHeight: 20,
  },
  drillBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    flexShrink: 0,
  },
  drillBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  drillMeta: {
    fontSize: 12,
    color: "#6B7280",
    lineHeight: 18,
  },
  drillMetaDot: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  overdueBanner: {
    backgroundColor: "rgba(239,68,68,0.08)",
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.25)",
    borderRadius: 8,
    padding: 8,
    marginTop: 10,
  },
  overdueText: {
    fontSize: 12,
    color: "#991B1B",
  },
  drillAssignedBy: {
    flex: 1,
    fontSize: 12,
    color: "#6B7280",
    marginRight: 8,
  },
  drillCta: {
    backgroundColor: "#22C55E",
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
  },
  drillCtaText: {
    fontSize: 13,
    color: "#FFFFFF",
  },
  drillCtaLocked: {
    backgroundColor: "#16a34a",
  },
  drillCtaTextLocked: {
    fontSize: 13,
    color: "#FFFFFF",
  },

  emptyState: {
    paddingVertical: 24,
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
  },
});
