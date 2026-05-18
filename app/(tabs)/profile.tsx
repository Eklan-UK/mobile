import React, { useMemo } from "react";
import { Image, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";

import { AppText, Button, Loader, ProgressCircle } from "@/components/ui";
import tw from "@/lib/tw";
import { useSemanticTheme } from "@/hooks/useSemanticTheme";
import { brandColors } from "@/constants/theme-tokens";
import { useUserCurrent } from "@/hooks/useSettings";
import { usePronunciation } from "@/hooks/usePronunciation";
import { useConfidence } from "@/hooks/useConfidence";
import { useStreak } from "@/hooks/useStreak";
import { getMyDrills } from "@/services/drill.service";
import { DrillAssignment } from "@/types/drill.types";
import { getPlanLabel, getPlanTagline } from "@/utils/plan";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(user: {
  firstName?: string;
  lastName?: string;
  email?: string;
}): string {
  return (
    ((user.firstName?.[0] ?? "") + (user.lastName?.[0] ?? "")).toUpperCase() ||
    user.email?.[0]?.toUpperCase() ||
    "?"
  );
}

function formatStudyTime(totalSeconds: number): string {
  if (!totalSeconds || totalSeconds <= 0) return "0m";
  if (totalSeconds < 60) return "<1m";
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function getTrendLabel(trend?: string): string {
  if (trend === "improving") return "Improving";
  if (trend === "declining") return "Declining";
  return "Stable";
}

function getTrendColor(trend?: string): string {
  if (trend === "improving") return "#16a34a";
  if (trend === "declining") return "#ef4444";
  return "#f59e0b";
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function SettingsIcon() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={3} stroke="#fff" strokeWidth={2} />
      <Path
        d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82A1.65 1.65 0 003 14H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.6h.09A1.65 1.65 0 0010 3.09V3a2 2 0 014 0v.09A1.65 1.65 0 0015 4.6h.09a1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9c0 .68.39 1.3 1 1.51H21a2 2 0 010 4h-.09c-.61.21-1.51.83-1.51 1.49z"
        stroke="#fff"
        strokeWidth={2}
      />
    </Svg>
  );
}

function BookmarkIcon({ color = "#8B5CF6" }: { color?: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function MicIcon({ color = "#22C55E" }: { color?: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ClockIcon({ color = "#3B82F6" }: { color?: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={10} stroke={color} strokeWidth={2} />
      <Path
        d="M12 6v6l4 2"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ChevronRightIcon({ color = "#16a34a" }: { color?: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 18l6-6-6-6"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function CalendarStreakIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Rect x={3} y={4} width={18} height={18} rx={2} stroke="#16a34a" strokeWidth={2} />
      <Path
        d="M16 2v4M8 2v4M3 10h18"
        stroke="#16a34a"
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function InlineBar({
  label,
  value,
  color = "#16a34a",
  decimalPlaces,
}: {
  label: string;
  value: number;
  color?: string;
  decimalPlaces?: number;
}) {
  const { colors: c } = useSemanticTheme();
  const pct = Math.min(Math.max(value, 0), 100);
  const pctLabel =
    decimalPlaces !== undefined ? `${pct.toFixed(decimalPlaces)}%` : `${Math.round(pct)}%`;
  return (
    <View style={tw`mb-3`}>
      <View style={tw`flex-row justify-between mb-1`}>
        <AppText style={[tw`text-xs`, { color: c.textSecondary }]}>{label}</AppText>
        <AppText style={[tw`text-xs font-semibold`, { color }]}>{pctLabel}</AppText>
      </View>
      <View style={[tw`h-1.5 rounded-full`, { backgroundColor: c.progressBg }]}>
        <View
          style={[
            tw`h-1.5 rounded-full`,
            { width: `${pct}%` as any, backgroundColor: color },
          ]}
        />
      </View>
    </View>
  );
}

function ConfidenceIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={10} stroke="#16a34a" strokeWidth={2} />
      <Circle cx={12} cy={12} r={6} stroke="#16a34a" strokeWidth={2} />
      <Circle cx={12} cy={12} r={2} fill="#16a34a" />
    </Svg>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const { isDark, colors: c } = useSemanticTheme();
  const { data: currentData, isLoading: userLoading } = useUserCurrent();
  const { data: pronData } = usePronunciation();
  const { data: confData } = useConfidence();
  const { data: streakData, weeklyDisplay } = useStreak();

  // Fetch drills to compute total time studied — limit 200 matches web app
  const { data: drillsData, isPending: drillsPending } = useQuery({
    queryKey: ["learner-drills-profile"],
    queryFn: () => getMyDrills({ limit: 200 }),
    staleTime: 1000 * 60 * 5,
    retry: false,
  });

  const user = currentData?.user;

  const displayName = useMemo(() => {
    if (!user) return "User";
    return (
      `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() ||
      user.username ||
      user.email?.split("@")[0] ||
      "User"
    );
  }, [user]);

  const initials = useMemo(() => (user ? getInitials(user) : "?"), [user]);

  const planLabel = useMemo(
    () => (user ? getPlanLabel(user) : "Free"),
    [user]
  );
  const planTagline = useMemo(() => getPlanTagline(planLabel), [planLabel]);

  const totalStudySeconds = useMemo(() => {
    if (!drillsData?.drills) return 0;
    return (drillsData.drills as DrillAssignment[]).reduce(
      (sum, d) => sum + (d.latestAttempt?.timeSpent ?? 0),
      0
    );
  }, [drillsData]);

  const studyTimeLabel = drillsPending ? "—" : formatStudyTime(totalStudySeconds);

  const pronScore = Math.round(pronData?.overallScore ?? 0);
  const confScore = Math.round(confData?.confidenceScore ?? 0);
  const confLabel = confData?.label ?? "—";
  const confTrend = confData?.trend;
  const trendLabel = getTrendLabel(confTrend);
  const trendColor = getTrendColor(confTrend);

  const currentStreak = streakData?.currentStreak ?? 0;
  const longestStreak = streakData?.longestStreak ?? 0;

  // Weekly dot labels: Sun Mon Tue Wed Thu Fri Sat → display as S M T W T F S
  const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

  // Mask out future days within the current ISO Mon–Sun week so they never
  // show as active even if the backend includes them.
  // Display order [S M T W T F S] → ISO-week indices [6 0 1 2 3 4 5]
  const DISPLAY_TO_ISO = [6, 0, 1, 2, 3, 4, 5];
  const todayIso = (() => { const d = new Date().getDay(); return d === 0 ? 6 : d - 1; })();
  const maskedWeekly = weeklyDisplay.map(
    (active, idx) => active && DISPLAY_TO_ISO[idx] <= todayIso
  );

  const cardSurface = useMemo(
    () => ({
      backgroundColor: c.card,
      borderColor: c.border,
      borderWidth: StyleSheet.hairlineWidth,
    }),
    [c.card, c.border]
  );

  if (userLoading) {
    return (
      <SafeAreaView
        style={[tw`flex-1 items-center justify-center`, { backgroundColor: c.background }]}
        edges={["top"]}
      >
        <Loader />
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={tw`flex-1 bg-primary-500`} edges={["top"]}>
        <View style={tw`flex-row justify-between items-center px-6 pt-4 pb-6`}>
          <AppText style={tw`text-white text-xl font-semibold`}>Profile</AppText>
          <TouchableOpacity onPress={() => router.push("/settings")}>
            <SettingsIcon />
          </TouchableOpacity>
        </View>
        <View style={tw`items-center py-12`}>
          <AppText style={tw`text-white text-base`}>
            Please sign in to view your profile
          </AppText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[tw`flex-1`, { backgroundColor: c.background }]} edges={["top"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={{ backgroundColor: c.background }}
        contentContainerStyle={{ backgroundColor: c.background }}
      >
        {/* ── GREEN HEADER (no rounded bottom) ─────────────────────── */}
        <View style={tw`bg-primary-500 px-6 pt-4 pb-8`}>
          {/* Title row */}
          <View style={tw`flex-row justify-between items-center mb-6`}>
            <AppText style={tw`text-white text-xl font-semibold`}>
              Profile
            </AppText>
            <TouchableOpacity
              onPress={() => router.push("/settings")}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <SettingsIcon />
            </TouchableOpacity>
          </View>

          {/* Avatar + info + plan badge */}
          <View style={tw`flex-row items-center gap-4`}>
            <TouchableOpacity
              onPress={() => router.push("/edit-profile")}
              activeOpacity={0.85}
            >
              <View
                style={tw`w-20 h-20 rounded-full border-2 border-white items-center justify-center`}
              >
                {user.avatar ? (
                  <Image
                    source={{ uri: user.avatar }}
                    style={tw`w-[76px] h-[76px] rounded-full`}
                    resizeMode="cover"
                  />
                ) : (
                  <View
                    style={tw`w-[76px] h-[76px] rounded-full bg-white/20 items-center justify-center`}
                  >
                    <AppText
                      style={tw`text-white text-2xl font-bold`}
                    >
                      {initials}
                    </AppText>
                  </View>
                )}
              </View>
            </TouchableOpacity>

            <View style={tw`flex-1`}>
              <AppText style={tw`text-white text-xl font-bold mb-0.5`}>
                {displayName}
              </AppText>
              <AppText style={tw`text-white/75 text-sm mb-2`}>
                {user.email}
              </AppText>
              {/* Plan pill on white chip */}
              <View
                style={tw`bg-white self-start px-3 py-1 rounded-full flex-row items-center gap-1.5`}
              >
                <View style={tw`w-2 h-2 rounded-full bg-primary-500`} />
                <AppText style={tw`text-primary-700 text-xs font-semibold`}>
                  {planLabel}
                </AppText>
              </View>
            </View>
          </View>
        </View>

        <View style={tw`px-4 py-4 gap-4`}>
          {/* ── STATS ROW (three separate cards — design reference) ───────── */}
          <View style={tw`flex-row gap-3`}>
            <TouchableOpacity
              style={[tw`flex-1 rounded-2xl py-4 px-2 items-center shadow-sm`, cardSurface]}
              onPress={() => router.push("/bookmarks" as any)}
              activeOpacity={0.75}
            >
              <View style={tw`mb-3`}>
                <BookmarkIcon />
              </View>
              <AppText style={[tw`text-sm font-bold mb-1`, { color: c.textPrimary }]}>
                Bookmarks
              </AppText>
              <AppText style={[tw`text-xs`, { color: c.textSecondary }]}>
                View Saved
              </AppText>
            </TouchableOpacity>

            <View style={[tw`flex-1 rounded-2xl py-4 px-2 items-center shadow-sm`, cardSurface]}>
              <View style={tw`mb-3`}>
                <MicIcon />
              </View>
              {pronData ? (
                <AppText style={[tw`text-2xl font-bold mb-1`, { color: c.textPrimary }]}>
                  {pronScore}
                </AppText>
              ) : (
                <AppText
                  style={[
                    tw`text-2xl font-bold mb-1`,
                    { color: c.textLight },
                  ]}
                >
                  —
                </AppText>
              )}
              <AppText style={[tw`text-xs`, { color: c.textSecondary }]}>
                Pronunciation
              </AppText>
            </View>

            <View style={[tw`flex-1 rounded-2xl py-4 px-2 items-center shadow-sm`, cardSurface]}>
              <View style={tw`mb-3`}>
                <ClockIcon />
              </View>
              <AppText
                style={[tw`text-xl font-bold mb-1`, { color: c.textPrimary }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.75}
              >
                {studyTimeLabel}
              </AppText>
              <AppText style={[tw`text-xs`, { color: c.textSecondary }]}>
                Time Studied
              </AppText>
            </View>
          </View>

          {/* ── CONFIDENCE SCORE CARD ────────────────────────────────── */}
          {confData && (
            <View style={[tw`rounded-2xl p-5 shadow-sm`, cardSurface]}>
              {/* Header */}
              <View style={tw`flex-row items-center gap-2 mb-4`}>
                <ConfidenceIcon />
                <AppText
                  style={[
                    tw`text-xs font-bold tracking-widest uppercase`,
                    { color: c.textPrimary },
                  ]}
                >
                  Confidence Score
                </AppText>
              </View>

              <View style={tw`flex-row items-start gap-5 mb-4`}>
                {/* Circle */}
                <ProgressCircle
                  progress={confScore}
                  size={90}
                  strokeWidth={9}
                  color="#f59e0b"
                  backgroundColor={isDark ? "#422006" : "#fef3c7"}
                >
                  <View style={tw`items-center`}>
                    <AppText style={[tw`text-xl font-bold`, { color: c.textPrimary }]}>
                      {confScore}
                    </AppText>
                    <AppText style={[tw`text-[10px]`, { color: c.textSecondary }]}>
                      /100
                    </AppText>
                  </View>
                </ProgressCircle>

                <View style={tw`flex-1`}>
                  {/* Status label + trend pill */}
                  <View style={tw`flex-row items-center gap-2 mb-1`}>
                    <AppText style={[tw`text-base font-semibold`, { color: "#ea580c" }]}>
                      {confLabel}
                    </AppText>
                    <View
                      style={[
                        tw`px-2 py-0.5 rounded-full`,
                        { backgroundColor: c.muted },
                      ]}
                    >
                      <AppText
                        style={[tw`text-[10px] font-semibold`, { color: c.textSecondary }]}
                      >
                        — {trendLabel}
                      </AppText>
                    </View>
                  </View>

                  <AppText style={[tw`text-xs mb-3`, { color: c.textSecondary }]}>
                    {confData.drillsCompleted ?? 0} of {confData.drillsAssigned ?? 0} Drills Completed
                  </AppText>

                  <InlineBar
                    label="Pronunciation"
                    value={confData.qualityScore ?? 0}
                    color="#16a34a"
                    decimalPlaces={1}
                  />
                  <InlineBar
                    label="Completion"
                    value={(confData.completionRate ?? 0) * 100}
                    color="#3B82F6"
                  />
                </View>
              </View>

              <View
                style={[
                  tw`pt-3 flex-row justify-between items-center border-t`,
                  { borderTopColor: c.border },
                ]}
              >
                <AppText style={[tw`text-[11px]`, { color: c.textSecondary }]}>
                  Completion 40% + Quality 60%
                </AppText>
                <AppText style={[tw`text-[11px]`, { color: c.textSecondary }]}>
                  Based on Speechace Scores
                </AppText>
              </View>
            </View>
          )}

          {/* ── PRONUNCIATION PERFORMANCE CARD ──────────────────────── */}
          {pronData && (
            <View style={[tw`rounded-2xl p-5 shadow-sm`, cardSurface]}>
              <AppText style={[tw`text-base font-bold mb-4`, { color: c.textPrimary }]}>
                Pronunciation Performance
              </AppText>

              <View style={tw`flex-row items-center gap-5`}>
                <ProgressCircle
                  progress={pronScore}
                  size={90}
                  strokeWidth={9}
                  color="#16a34a"
                  backgroundColor={isDark ? "#142318" : "#dcfce7"}
                >
                  <View style={tw`items-center`}>
                    <AppText style={[tw`text-xl font-bold`, { color: c.textPrimary }]}>
                      {pronScore}
                    </AppText>
                    <AppText style={[tw`text-[10px]`, { color: c.textSecondary }]}>
                      /100
                    </AppText>
                  </View>
                </ProgressCircle>

                <View style={tw`flex-1`}>
                  <AppText
                    style={[
                      tw`text-[10px] font-bold uppercase tracking-widest mb-1`,
                      { color: c.textSecondary },
                    ]}
                  >
                    Total Words Analyzed
                  </AppText>
                  <AppText style={[tw`text-3xl font-bold mb-1`, { color: c.textPrimary }]}>
                    {(pronData.totalWordsPronounced ?? 0).toLocaleString()}
                  </AppText>
                  <AppText style={[tw`text-xs`, { color: c.textSecondary }]}>
                    Across All Practice Sessions
                  </AppText>
                </View>
              </View>
            </View>
          )}

          {/* ── CURRENT PLAN CARD ────────────────────────────────────── */}
          <TouchableOpacity
            style={[tw`rounded-2xl p-5 shadow-sm`, cardSurface]}
            onPress={() => router.push("/premium")}
            activeOpacity={0.7}
          >
            <View style={tw`flex-row items-center justify-between`}>
              <View style={tw`flex-1`}>
                <View
                  style={tw`bg-primary-100 dark:bg-primary-900/40 self-start px-3 py-1 rounded-full mb-2`}
                >
                  <AppText
                    style={tw`text-primary-700 dark:text-primary-300 text-[11px] font-semibold`}
                  >
                    Current Plan
                  </AppText>
                </View>
                <AppText style={[tw`text-base font-bold mb-1`, { color: c.textPrimary }]}>
                  {planLabel} Plan
                </AppText>
                <AppText style={[tw`text-xs leading-5`, { color: c.textSecondary }]}>
                  {planTagline}
                </AppText>
              </View>
              <View style={tw`ml-4`}>
                <ChevronRightIcon color={isDark ? brandColors.primaryLight : "#16a34a"} />
              </View>
            </View>
          </TouchableOpacity>

          {/* ── STREAK SECTION ───────────────────────────────────────── */}
          <View style={[tw`rounded-2xl p-5 shadow-sm mb-4`, cardSurface]}>
            {/* Header: "Streak" + calendar icon + "View Streak >" */}
            <View style={tw`flex-row justify-between items-center mb-3`}>
              <AppText style={[tw`text-base font-bold`, { color: c.textPrimary }]}>
                Streak
              </AppText>
              <TouchableOpacity
                onPress={() => router.push("/streak" as any)}
                style={tw`flex-row items-center gap-1`}
              >
                <CalendarStreakIcon />
                <AppText
                  style={[tw`text-xs font-medium`, { color: brandColors.primaryLight }]}
                >
                  View Streak
                </AppText>
                <ChevronRightIcon color={isDark ? brandColors.primaryLight : "#16a34a"} />
              </TouchableOpacity>
            </View>

            {/* Streak count + best on same row */}
            <View style={tw`flex-row justify-between items-baseline mb-4`}>
              <AppText style={[tw`text-sm font-semibold`, { color: c.textPrimary }]}>
                {currentStreak > 0 ? `${currentStreak}-Day Streak` : "No Streak Yet"}
              </AppText>
              <AppText style={[tw`text-xs`, { color: c.textSecondary }]}>
                Best: {longestStreak} Days
              </AppText>
            </View>

            {/* 7-dot weekly grid — letters inside circles, future days grey */}
            <View style={tw`flex-row justify-between mb-4`}>
              {DAY_LABELS.map((label, idx) => {
                const active = maskedWeekly[idx];
                return (
                  <View key={idx} style={tw`items-center`}>
                    <View
                      style={[
                        tw`w-9 h-9 rounded-full items-center justify-center`,
                        active
                          ? { backgroundColor: "#16a34a" }
                          : { backgroundColor: c.progressBg },
                      ]}
                    >
                      <AppText
                        style={[
                          tw`text-sm font-semibold`,
                          active ? tw`text-white` : { color: c.textSecondary },
                        ]}
                      >
                        {label}
                      </AppText>
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Motivational amber box — matches web copy */}
            <View
              style={[
                tw`rounded-xl p-4 mb-4 flex-row gap-3 border`,
                isDark
                  ? { backgroundColor: "rgba(251, 191, 36, 0.08)", borderColor: "rgba(251, 191, 36, 0.25)" }
                  : tw`bg-amber-50 border-amber-100`,
              ]}
            >
              <AppText style={tw`text-base`}>🔥</AppText>
              <View style={tw`flex-1`}>
                <AppText style={[tw`text-sm font-bold mb-1`, { color: c.textPrimary }]}>
                  {currentStreak > 0 ? "Keep It Going" : "Start a Streak"}
                </AppText>
                <AppText style={[tw`text-xs leading-5`, { color: c.textSecondary }]}>
                  Complete daily focus and lessons on consecutive days to grow
                  your streak. Open the streak page for a full view.
                </AppText>
              </View>
            </View>

            {/* CTA */}
            <Button onPress={() => router.push("/practice" as any)}>
              Continue Practice
            </Button>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
