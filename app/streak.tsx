import { AppText } from "@/components/ui";
import { useStreak } from "@/hooks/useStreak";
import tw from "@/lib/tw";
import { router } from "expo-router";
import { ScrollView, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Path, Rect } from "react-native-svg";

// ─── Icons ────────────────────────────────────────────────────────────────────

function BackIcon() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M19 12H5M12 19l-7-7 7-7"
        stroke="#171717"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function FlameIcon() {
  return (
    <Svg width={36} height={36} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2C12 2 6 8 6 14a6 6 0 0012 0c0-3-1.5-5.5-3-7.5C13.5 8.5 13 6 12 2z"
        fill="white"
        opacity={0.95}
      />
      <Path
        d="M12 10c0 0-2 2.5-2 5a2 2 0 004 0c0-2.5-2-5-2-5z"
        fill="#fdba74"
      />
    </Svg>
  );
}

function RibbonIcon() {
  return (
    <Svg width={36} height={36} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={9} r={6} stroke="#16a34a" strokeWidth={1.8} />
      <Path
        d="M8.5 14.5L7 21l5-2 5 2-1.5-6.5"
        stroke="#16a34a"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function CalendarIcon() {
  return (
    <Svg width={36} height={36} viewBox="0 0 24 24" fill="none">
      <Rect x={3} y={4} width={18} height={18} rx={2} stroke="#3B82F6" strokeWidth={1.8} />
      <Path
        d="M16 2v4M8 2v4M3 10h18"
        stroke="#3B82F6"
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </Svg>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

// Each display index maps to its ISO-week day number (Mon=0 … Sun=6).
// Display: [Sun(6), Mon(0), Tue(1), Wed(2), Thu(3), Fri(4), Sat(5)]
const DISPLAY_TO_ISO = [6, 0, 1, 2, 3, 4, 5];

/**
 * Never show a future day within the current ISO Mon–Sun week as active.
 * JS getDay(): 0=Sun … 6=Sat → ISO day: Sun→6, Mon→0 … Sat→5.
 */
function maskFutureDays(display: boolean[]): boolean[] {
  const jsDay = new Date().getDay();
  const todayIso = jsDay === 0 ? 6 : jsDay - 1;
  return display.map((active, idx) => active && DISPLAY_TO_ISO[idx] <= todayIso);
}

export default function StreakScreen() {
  const { data: streakData, weeklyDisplay } = useStreak();

  const currentStreak = streakData?.currentStreak ?? 0;
  const longestStreak = streakData?.longestStreak ?? 0;
  const maskedDisplay = maskFutureDays(weeklyDisplay);

  const motivationText =
    currentStreak > 0 ? "Keep it going! 🔥" : "Start your streak today!";

  return (
    <SafeAreaView style={tw`flex-1 bg-white`} edges={["top"]}>
      {/* Header */}
      <View style={tw`px-5 pt-4 pb-2 flex-row items-center`}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <BackIcon />
        </TouchableOpacity>
        <AppText style={tw`flex-1 text-center text-lg font-bold text-neutral-900`}>
          Streak
        </AppText>
        <View style={tw`w-6`} />
      </View>

      <ScrollView
        style={tw`flex-1`}
        contentContainerStyle={tw`px-4 pt-3 pb-8 gap-3`}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero streak card ─────────────────────────────────── */}
        <View style={tw`bg-[#FFF5E6] rounded-2xl pt-6 pb-5 px-6 items-center`}>
          {/* Fire badge */}
          <View style={tw`items-center mb-3`}>
            <View
              style={[
                tw`w-20 h-20 rounded-full items-center justify-center`,
                { backgroundColor: "#F97316" },
              ]}
            >
              <FlameIcon />
            </View>
            <View
              style={[
                tw`-mt-4 w-8 h-8 rounded-full items-center justify-center`,
                { backgroundColor: "#F97316" },
              ]}
            >
              <AppText style={tw`text-white text-sm font-bold`}>
                {currentStreak}
              </AppText>
            </View>
          </View>

          <AppText style={tw`text-lg font-bold text-neutral-900 mt-1`}>
            Day Streak
          </AppText>
          <AppText style={tw`text-sm text-neutral-500 mt-0.5`}>
            {motivationText}
          </AppText>
        </View>

        {/* ── This Week ────────────────────────────────────────── */}
        <View style={tw`bg-white rounded-2xl p-5 border border-neutral-100 shadow-sm`}>
          <AppText style={tw`text-base font-bold text-neutral-900 mb-4`}>
            This Week
          </AppText>
          <View style={tw`flex-row justify-between`}>
            {DAY_LABELS.map((label, idx) => {
              const active = maskedDisplay[idx];
              return (
                <View key={idx} style={tw`items-center gap-1`}>
                  <View
                    style={[
                      tw`w-10 h-10 rounded-full items-center justify-center`,
                      active ? { backgroundColor: "#16a34a" } : tw`bg-neutral-200`,
                    ]}
                  >
                    <AppText
                      style={[
                        tw`text-sm font-semibold`,
                        active ? tw`text-white` : tw`text-neutral-500`,
                      ]}
                    >
                      {label}
                    </AppText>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* ── Stat cards row ───────────────────────────────────── */}
        <View style={tw`flex-row gap-3`}>
          {/* Longest Streak */}
          <View style={tw`flex-1 bg-white rounded-2xl p-5 border border-neutral-100 shadow-sm items-center`}>
            <RibbonIcon />
            <AppText style={tw`text-3xl font-bold text-neutral-900 mt-2`}>
              {longestStreak}
            </AppText>
            <AppText style={tw`text-xs text-primary-600 mt-0.5 font-medium`}>
              Longest Streak
            </AppText>
          </View>

          {/* Badges */}
          <View style={tw`flex-1 bg-white rounded-2xl p-5 border border-neutral-100 shadow-sm items-center`}>
            <CalendarIcon />
            <AppText style={tw`text-3xl font-bold text-neutral-900 mt-2`}>
              0
            </AppText>
            <AppText style={tw`text-xs text-blue-500 mt-0.5 font-medium`}>
              Badges
            </AppText>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
