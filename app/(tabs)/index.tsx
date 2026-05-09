import { AppText, BoldText, Card } from "@/components/ui";
import { ProgressCircle } from "@/components/ui/ProgressCircle";
import tw from "@/lib/tw";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Dimensions, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, memo } from "react";
import { useQuery } from "@tanstack/react-query";
import { dailyFocusService } from "@/services/daily-focus.service";
import { usePronunciation } from "@/hooks/usePronunciation";
import { useConfidence } from "@/hooks/useConfidence";
import { useAuth } from "@/hooks/useAuth";
import BellIcon from "@/assets/icons/bell.svg";
import MicIcon from "@/assets/icons/mic-outline.svg";
import { useDrills } from "@/hooks/useDrills";
import { Drill, DrillAssignment, DrillType, getDrillCategory } from "@/types/drill.types";
import { navigateToDrill } from "@/utils/drillNavigation";
import { usePrefetch } from "@/hooks/usePrefetch";
import apiClient from "@/lib/api";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const isSmallScreen = SCREEN_WIDTH < 375;

/* ─── Streak (fetched from backend) ─────────────────────── */

async function fetchStreak(): Promise<number> {
  try {
    const res = await apiClient.get("/api/v1/users/current");
    const user = res.data?.data?.user ?? res.data?.user ?? res.data;
    const fromCount = user?.streakCount;
    if (typeof fromCount === "number" && !Number.isNaN(fromCount)) return fromCount;
    const streak = user?.streak;
    if (typeof streak === "number" && !Number.isNaN(streak)) return streak;
    if (streak && typeof streak === "object" && typeof streak.currentStreak === "number") {
      return streak.currentStreak;
    }
    return 0;
  } catch {
    return 0;
  }
}

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
};

const CATEGORY_BG: Record<DrillType, string> = {
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
};

const CATEGORY_EMOJI: Record<DrillType, string> = {
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
};

/* ─── Inline icons ───────────────────────────────────────── */

const StarIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="white">
    <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </Svg>
);

const ChevronRightIcon = () => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Path d="M9 18l6-6-6-6" stroke="#9CA3AF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const CalendarIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Rect x={3} y={4} width={18} height={18} rx={2} stroke="#22c55e" strokeWidth={2} />
    <Path d="M16 2v4M8 2v4M3 10h18" stroke="#22c55e" strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

const TrendUpIcon = ({ color = "#4CAF50" }: { color?: string }) => (
  <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
    <Path d="M3 17l5-5 4 4 8-8" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const PlayIcon = () => (
  <Svg width={10} height={10} viewBox="0 0 24 24" fill="#bbf7d0">
    <Path d="M5 3l14 9-14 9V3z" />
  </Svg>
);

/** Outlined flame — Ionicons matches reference (golden-orange stroke) */
const FlameOutlineIcon = () => (
  <Ionicons name="flame-outline" size={18} color="#EA580C" />
);

const ClockIcon = () => (
  <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
    <Circle cx={12} cy={12} r={10} stroke="rgba(255,255,255,0.6)" strokeWidth={2} />
    <Path d="M12 6v6l4 2" stroke="rgba(255,255,255,0.6)" strokeWidth={2} />
  </Svg>
);

// Colored metric icons
const TrendUpBoxIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path d="M3 17l5-5 4 4 8-8" stroke="#F97316" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M16 9h3v3" stroke="#F97316" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const ChatIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="#3B82F6" strokeWidth={2} strokeLinejoin="round" />
  </Svg>
);

const ZapIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="#8B5CF6" strokeWidth={2} strokeLinejoin="round" />
  </Svg>
);

/* ─── Streak pill (always visible; count from API) ─────── */

const StreakPill = memo(({ count }: { count: number }) => (
  <View style={styles.streakPill} accessibilityLabel={`Streak: ${count} days`} accessibilityRole="text">
    <FlameOutlineIcon />
    <AppText style={styles.streakText} allowFontScaling>
      {count}
    </AppText>
  </View>
));

/* ─── Practice Card ──────────────────────────────────────── */

interface PracticeCardProps {
  title: string;
  focusType: string;
  estimatedMinutes: number;
  currentStep: number;
  totalSteps: number;
  hasProgress: boolean;
  onPress: () => void;
}

const PracticeCard = memo(
  ({ title, focusType, estimatedMinutes, currentStep, totalSteps, hasProgress, onPress }: PracticeCardProps) => {
    const pct = totalSteps > 0 ? Math.round((currentStep / totalSteps) * 100) : 0;
    const label = hasProgress ? "ONGOING PRACTICE" : "START PRACTICE";

    return (
      <View style={styles.practiceCard}>
        {/* Badge */}
        <View style={styles.practiceBadge}>
          <PlayIcon />
          <AppText style={styles.practiceBadgeText}>{label}</AppText>
        </View>

        {/* Title */}
        <BoldText style={styles.practiceTitle} numberOfLines={2}>
          {title}
        </BoldText>

        {/* Meta row */}
        <View style={tw`flex-row items-center gap-3 mb-1`}>
          <AppText style={styles.practiceMeta}>
            {focusType}
          </AppText>
          <View style={tw`flex-row items-center gap-1`}>
            <ClockIcon />
            <AppText style={styles.practiceMeta}>
              {estimatedMinutes < 10 ? `5–${estimatedMinutes} minutes` : `${estimatedMinutes} minutes`}
            </AppText>
          </View>
        </View>

        {/* Progress row (only when in progress) */}
        {hasProgress && totalSteps > 0 && (
          <View style={tw`mb-3`}>
            <View style={tw`flex-row justify-between mb-1.5`}>
              <AppText style={styles.progressLabel}>{currentStep} of {totalSteps}</AppText>
              <AppText style={styles.progressPct}>{pct}%</AppText>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.min(100, pct)}%` }]} />
            </View>
          </View>
        )}

        {/* CTA */}
        <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={styles.practiceBtn}>
          <BoldText style={styles.practiceBtnText}>
            {hasProgress ? "Continue" : "Start"}
          </BoldText>
        </TouchableOpacity>
      </View>
    );
  }
);

/* ─── View Sessions Button ───────────────────────────────── */

const ViewSessionsButton = memo(() => (
  <TouchableOpacity
    style={styles.sessionsBtn}
    onPress={() => router.push("/(tabs)/practice")}
    activeOpacity={0.75}
  >
    <CalendarIcon />
    <AppText style={styles.sessionsBtnText}>View your sessions</AppText>
  </TouchableOpacity>
));

/* ─── Progress Metric Card ───────────────────────────────── */

interface MetricCardProps {
  title: string;
  change: string;
  changePositive: boolean;
  score: number;
  circleColor: string;
  displayValue: string;
  iconBg: string;
  icon: React.ReactNode;
  isLoading: boolean;
}

const MetricCard = memo(
  ({ title, change, changePositive, score, circleColor, displayValue, iconBg, icon, isLoading }: MetricCardProps) => (
    <Card variant="outlined" padding="md" style={tw`flex-1`}>
      <View style={tw`flex-row justify-between items-center`}>
        {/* Left: icon + title + trend */}
        <View style={tw`flex-1 mr-2`}>
          <View style={[styles.metricIconBox, { backgroundColor: iconBg }]}>
            {icon}
          </View>
          <AppText style={styles.metricTitle} numberOfLines={2}>{title}</AppText>
          <View style={tw`flex-row items-center gap-1 mt-0.5`}>
            <TrendUpIcon color={changePositive ? "#4CAF50" : "#EF4444"} />
            <AppText style={[styles.metricChange, { color: changePositive ? "#4CAF50" : "#EF4444" }]}>
              {isLoading ? "..." : change}
            </AppText>
          </View>
        </View>

        {/* Right: circle */}
        <ProgressCircle
          progress={Math.max(0, Math.min(100, score))}
          size={isSmallScreen ? 46 : 52}
          strokeWidth={4}
          color={circleColor}
          backgroundColor="#e5e7eb"
        >
          <AppText style={[styles.metricCircleText, { color: circleColor }]}>
            {isLoading ? "–" : displayValue}
          </AppText>
        </ProgressCircle>
      </View>
    </Card>
  )
);

/* ─── Drill Card ─────────────────────────────────────────── */

const DrillCard = memo(({ assignment, onPress }: { assignment: DrillAssignment; onPress: () => void }) => {
  const { drill } = assignment;
  const category = getDrillCategory(drill.type);
  const dotColor = CATEGORY_COLORS[drill.type] ?? "#9CA3AF";
  const bgColor = CATEGORY_BG[drill.type] ?? "#F3F4F6";
  const emoji = CATEGORY_EMOJI[drill.type] ?? "📝";
  const estTime = (["roleplay", "listening", "summary"] as DrillType[]).includes(drill.type)
    ? "7–10 min"
    : "5–7 min";

  return (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress}>
      <Card variant="outlined" padding="md">
        <View style={tw`flex-row items-center gap-3`}>
          <View style={[styles.drillThumb, { backgroundColor: bgColor }]}>
            <AppText style={tw`text-xl`}>{emoji}</AppText>
          </View>
          <View style={tw`flex-1`}>
            <AppText style={tw`text-sm font-medium text-neutral-900 dark:text-white mb-0.5`} numberOfLines={1}>
              {drill.title}
            </AppText>
            <View style={tw`flex-row items-center gap-2`}>
              <AppText style={[tw`text-xs font-medium`, { color: dotColor }]}>• {category}</AppText>
              <AppText style={tw`text-xs text-neutral-400`}>· {estTime}</AppText>
            </View>
          </View>
          <ChevronRightIcon />
        </View>
      </Card>
    </TouchableOpacity>
  );
});

/* ─── Home Screen ────────────────────────────────────────── */

export default function HomeScreen() {
  const { user } = useAuth();
  const firstName = user?.firstName ?? "there";

  const { prefetchDrill } = usePrefetch();

  // Streak count from /users/current (separate cache key from Profile's /users/streak object query)
  const { data: streakCount = 0 } = useQuery({
    queryKey: ["user-streak-count"],
    queryFn: fetchStreak,
    staleTime: 5 * 60 * 1000,
  });

  // Metrics
  const { data: pronunciation, isLoading: pronunciationLoading, weeklyChange: weeklyPronunciation } = usePronunciation();
  const { data: confidence, isLoading: confidenceLoading, weeklyChange: weeklyConfidence } = useConfidence();

  // Today's focus
  const {
    data: todaysFocus,
    isLoading: isLoadingFocus,
    isError: isFocusError,
    refetch: refetchFocus,
  } = useQuery({
    queryKey: ["daily-focus", "today"],
    queryFn: () => dailyFocusService.getToday(),
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

  // Progress for today's focus
  const { data: focusProgress, isLoading: isLoadingProgress } = useQuery({
    queryKey: ["daily-focus-progress", todaysFocus?._id],
    queryFn: () => dailyFocusService.getProgress(todaysFocus!._id),
    enabled: !!todaysFocus?._id,
    staleTime: 60 * 1000,
  });

  // Assigned drills
  const { data: drillsData, isLoading: isDrillsLoading } = useDrills("pending", 5);
  const assignedDrills = drillsData?.drills ?? [];

  const isCardLoading = isLoadingFocus || (!!todaysFocus?._id && isLoadingProgress);
  const currentStep = focusProgress?.currentQuestionIndex ?? 0;
  const totalSteps = todaysFocus?.totalQuestions ?? 0;
  const hasProgress = currentStep > 0;

  const handleStartFocus = useCallback(() => {
    if (todaysFocus) router.push(`/daily-focus/${todaysFocus._id}`);
  }, [todaysFocus]);

  const handleDrillPress = useCallback(
    (assignment: DrillAssignment) => {
      prefetchDrill(assignment.drill._id);
      navigateToDrill(assignment.drill as Drill);
    },
    [prefetchDrill]
  );

  // Format focus type label
  const focusTypeLabel = todaysFocus
    ? todaysFocus.focusType.charAt(0).toUpperCase() + todaysFocus.focusType.slice(1)
    : "";

  // Weekly change string helpers
  const pctChange = (val: number) => `${val >= 0 ? "+" : ""}${val}% this week`;

  const completionPct = Math.round(confidence?.completionRate ?? 0);
  const qualityPct = Math.round(confidence?.qualityScore ?? 0);
  const completionWeekly = confidenceLoading ? 0 : completionPct > 0 ? 0 : 0; // no weekly API for these
  const qualityWeekly = confidenceLoading ? 0 : qualityPct > 0 ? 0 : 0;

  return (
    <SafeAreaView edges={["top"]} style={tw`flex-1 bg-white dark:bg-neutral-900`}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={tw`pb-8`}>

        {/* ── HEADER ─────────────────────────────────── */}
        <View style={tw`px-5 pt-4 pb-2 flex-row justify-between items-center`}>
          <View style={tw`flex-1 mr-3`}>
            <BoldText style={tw`text-${isSmallScreen ? "xl" : "2xl"} font-bold text-neutral-900 dark:text-white`}>
              Hello, {firstName}! 👋
            </BoldText>
            <AppText style={tw`text-neutral-500 dark:text-neutral-400 text-sm mt-0.5`}>
              Good to see you again
            </AppText>
          </View>

          <View style={tw`flex-row items-center gap-2`}>
            {/* Star / badge button */}
            <TouchableOpacity
              onPress={() => router.push("/(tabs)/profile")}
              activeOpacity={0.85}
              accessibilityLabel="Profile"
            >
              <LinearGradient
                colors={["#FF9F43", "#FF6B35", "#E85D04"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.starBtnGradient}
              >
                <StarIcon />
              </LinearGradient>
            </TouchableOpacity>

            <StreakPill count={streakCount} />

            {/* Bell */}
            <TouchableOpacity
              style={tw`w-9 h-9 rounded-full bg-neutral-100 dark:bg-neutral-800 items-center justify-center`}
              onPress={() => router.push("/notifications")}
            >
              <BellIcon width={18} height={18} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── PRACTICE CARD ──────────────────────────── */}
        <View style={tw`px-5 mt-3 mb-4`}>
          {isCardLoading ? (
            <View style={[styles.practiceCard, tw`items-center justify-center min-h-[160px]`]}>
              <AppText style={tw`text-white/60 text-sm`}>Loading…</AppText>
            </View>
          ) : isFocusError ? (
            <View style={styles.practiceCard}>
              <View style={styles.practiceBadge}>
                <PlayIcon />
                <AppText style={styles.practiceBadgeText}>START PRACTICE</AppText>
              </View>
              <BoldText style={styles.practiceTitle}>Couldn't load today's practice</BoldText>
              <AppText style={styles.practiceMeta}>Check your connection and try again</AppText>
              <TouchableOpacity
                onPress={() => refetchFocus()}
                activeOpacity={0.85}
                style={[styles.practiceBtn, tw`mt-4`]}
              >
                <BoldText style={styles.practiceBtnText}>Retry</BoldText>
              </TouchableOpacity>
            </View>
          ) : todaysFocus ? (
            <PracticeCard
              title={todaysFocus.title}
              focusType={focusTypeLabel}
              estimatedMinutes={todaysFocus.estimatedMinutes}
              currentStep={currentStep}
              totalSteps={totalSteps}
              hasProgress={hasProgress}
              onPress={handleStartFocus}
            />
          ) : (
            <View style={styles.practiceCard}>
              <View style={styles.practiceBadge}>
                <PlayIcon />
                <AppText style={styles.practiceBadgeText}>START PRACTICE</AppText>
              </View>
              <BoldText style={styles.practiceTitle}>No practice today</BoldText>
              <AppText style={styles.practiceMeta}>Check the Practice tab for drills</AppText>
              <TouchableOpacity
                onPress={() => router.push("/(tabs)/practice")}
                activeOpacity={0.85}
                style={[styles.practiceBtn, tw`mt-4`]}
              >
                <BoldText style={styles.practiceBtnText}>Browse Practice</BoldText>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ── VIEW SESSIONS ──────────────────────────── */}
        <View style={tw`px-5 mb-5`}>
          <ViewSessionsButton />
        </View>

        {/* ── YOUR PROGRESS ──────────────────────────── */}
        <View style={tw`px-5 mb-5`}>
          <BoldText style={tw`text-lg font-bold mb-3 text-neutral-900 dark:text-white`}>
            Your Progress
          </BoldText>
          <View style={tw`flex-row gap-3 mb-3`}>
            <MetricCard
              title="Confidence"
              change={pctChange(weeklyConfidence)}
              changePositive={weeklyConfidence >= 0}
              score={confidence?.confidenceScore ?? 0}
              circleColor="#F97316"
              displayValue={`${Math.round(confidence?.confidenceScore ?? 0)}%`}
              iconBg="#FFF7ED"
              icon={<TrendUpBoxIcon />}
              isLoading={confidenceLoading}
            />
            <MetricCard
              title="Pronunciation"
              change={pctChange(weeklyPronunciation)}
              changePositive={weeklyPronunciation >= 0}
              score={pronunciation?.overallScore ?? 0}
              circleColor="#22c55e"
              displayValue={`${Math.round(pronunciation?.overallScore ?? 0)}`}
              iconBg="#F0FDF4"
              icon={<MicIcon width={20} height={20} color="#22c55e" />}
              isLoading={pronunciationLoading}
            />
          </View>
          <View style={tw`flex-row gap-3`}>
            <MetricCard
              title="Accurate Sentence Usage"
              change={pctChange(completionWeekly)}
              changePositive
              score={completionPct}
              circleColor="#3B82F6"
              displayValue={`${completionPct}`}
              iconBg="#EFF6FF"
              icon={<ChatIcon />}
              isLoading={confidenceLoading}
            />
            <MetricCard
              title="Response Speed"
              change={pctChange(qualityWeekly)}
              changePositive
              score={qualityPct}
              circleColor="#8B5CF6"
              displayValue={`${qualityPct}`}
              iconBg="#F5F3FF"
              icon={<ZapIcon />}
              isLoading={confidenceLoading}
            />
          </View>
        </View>

        {/* ── ASSIGNED DRILLS ────────────────────────── */}
        <View style={tw`px-5`}>
          <BoldText style={tw`text-lg font-bold mb-3 text-neutral-900 dark:text-white`}>
            Assigned drills
          </BoldText>
          <View style={tw`gap-3`}>
            {isDrillsLoading ? (
              <View style={tw`py-6 items-center bg-gray-50 dark:bg-neutral-800 rounded-2xl`}>
                <AppText style={tw`text-neutral-400 text-sm`}>Loading drills…</AppText>
              </View>
            ) : assignedDrills.length === 0 ? (
              <View style={tw`py-6 items-center bg-gray-50 dark:bg-neutral-800 rounded-2xl`}>
                <AppText style={tw`text-neutral-400 text-sm`}>No drills assigned yet</AppText>
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
      </ScrollView>
    </SafeAreaView>
  );
}

/* ─── Styles ─────────────────────────────────────────────── */

const styles = StyleSheet.create({
  // Header — gradient star + cream streak chip (design reference)
  starBtnGradient: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  streakPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFF9E5",
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 999,
    minHeight: 34,
  },
  streakText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#171717",
    letterSpacing: -0.2,
    includeFontPadding: false,
  },

  // Practice card
  practiceCard: {
    backgroundColor: "#166534",
    borderRadius: 20,
    padding: 20,
  },
  practiceBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 12,
  },
  practiceBadgeText: {
    color: "#bbf7d0",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  practiceTitle: {
    color: "#fff",
    fontSize: isSmallScreen ? 18 : 22,
    fontWeight: "700",
    marginBottom: 6,
  },
  practiceMeta: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 13,
  },
  progressLabel: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 12,
  },
  progressPct: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 12,
    fontWeight: "600",
  },
  progressTrack: {
    height: 5,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 999,
    overflow: "hidden",
  },
  progressFill: {
    height: 5,
    backgroundColor: "#fff",
    borderRadius: 999,
  },
  practiceBtn: {
    marginTop: 16,
    backgroundColor: "#FBBF24",
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
  },
  practiceBtnText: {
    color: "#1a1a1a",
    fontSize: 16,
    fontWeight: "700",
  },

  // Sessions button
  sessionsBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    paddingVertical: 14,
    backgroundColor: "#fff",
  },
  sessionsBtnText: {
    color: "#22c55e",
    fontSize: 15,
    fontWeight: "600",
  },

  // Metric cards
  metricIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  metricTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
    lineHeight: 18,
  },
  metricChange: {
    fontSize: 11,
    fontWeight: "500",
  },
  metricCircleText: {
    fontSize: isSmallScreen ? 10 : 11,
    fontWeight: "700",
  },

  // Drill card
  drillThumb: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
});
