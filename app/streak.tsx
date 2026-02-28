import { AppText, BoldText, Card } from "@/components/ui";
import tw from "@/lib/tw";
import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from "react-native-svg";

// Icons
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

function ChevronLeftIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M15 18l-6-6 6-6"
        stroke="#a3a3a3"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ChevronRightIcon({ color = "#a3a3a3" }: { color?: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
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

function CheckIcon({ size = 16 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20 6L9 17l-5-5"
        stroke="white"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// Fire Icon with gradient
function FireIcon({ size = 120, grayscale = false }: { size?: number; grayscale?: boolean }) {
  return (
    <Svg width={size} height={size * 1.2} viewBox="0 0 100 120" fill="none">
      <Defs>
        <LinearGradient id="fireGradient" x1="50%" y1="100%" x2="50%" y2="0%">
          <Stop offset="0%" stopColor={grayscale ? "#d4d4d4" : "#f97316"} />
          <Stop offset="50%" stopColor={grayscale ? "#e5e5e5" : "#fb923c"} />
          <Stop offset="100%" stopColor={grayscale ? "#f5f5f5" : "#fbbf24"} />
        </LinearGradient>
        <LinearGradient id="fireInner" x1="50%" y1="100%" x2="50%" y2="0%">
          <Stop offset="0%" stopColor={grayscale ? "#a3a3a3" : "#fbbf24"} />
          <Stop offset="100%" stopColor={grayscale ? "#d4d4d4" : "#fef08a"} />
        </LinearGradient>
      </Defs>
      {/* Main flame */}
      <Path
        d="M50 10C50 10 20 45 20 70C20 95 35 110 50 110C65 110 80 95 80 70C80 45 50 10 50 10Z"
        fill="url(#fireGradient)"
      />
      {/* Inner flame */}
      <Path
        d="M50 50C50 50 35 70 35 82C35 94 42 100 50 100C58 100 65 94 65 82C65 70 50 50 50 50Z"
        fill="url(#fireInner)"
      />
      {/* Small sparks */}
      <Circle cx={35} cy={20} r={4} fill={grayscale ? "#e5e5e5" : "#fbbf24"} />
      <Circle cx={65} cy={15} r={3} fill={grayscale ? "#e5e5e5" : "#fb923c"} />
    </Svg>
  );
}

// Badge Component
function Badge({
  icon,
  color,
  unlocked,
}: {
  icon: string;
  color: string;
  unlocked: boolean;
}) {
  return (
    <View
      style={tw`w-14 h-14 rounded-2xl ${unlocked ? color : "bg-neutral-200"} items-center justify-center`}
    >
      {unlocked ? (
        <AppText style={tw`text-2xl`}>{icon}</AppText>
      ) : (
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
          <Rect x={6} y={10} width={12} height={10} rx={2} stroke="#737373" strokeWidth={2} />
          <Path
            d="M8 10V7a4 4 0 118 0v3"
            stroke="#737373"
            strokeWidth={2}
            strokeLinecap="round"
          />
        </Svg>
      )}
    </View>
  );
}

// Calendar Day Component
function CalendarDay({
  day,
  completed,
  isToday,
  isPast,
}: {
  day: number;
  completed: boolean;
  isToday: boolean;
  isPast: boolean;
}) {
  return (
    <View style={tw`items-center flex-1`}>
      <View
        style={tw`w-9 h-9 rounded-full items-center justify-center ${completed
            ? "bg-primary-500"
            : isToday
              ? "border-2 border-neutral-400"
              : "border border-neutral-200"
          }`}
      >
        {completed ? (
          <CheckIcon size={14} />
        ) : (
          <View style={tw`w-2 h-2 rounded-full ${isToday ? "bg-neutral-400" : ""}`} />
        )}
      </View>
      <AppText style={tw`text-sm mt-1 ${isToday ? "font-medium text-neutral-900" : "text-neutral-500"}`}>
        {day}
      </AppText>
    </View>
  );
}

// Challenge Progress Component
function ChallengeProgress({
  title,
  current,
  total,
  milestones,
}: {
  title: string;
  current: number;
  total: number;
  milestones: number[];
}) {
  const progress = (current / total) * 100;

  return (
    <Card variant="outlined" padding="lg" style={tw`mb-4`}>
      <View style={tw`flex-row items-center justify-between mb-4`}>
        <AppText style={tw`text-base font-semibold text-neutral-900`}>{title}</AppText>
        <AppText style={tw`text-sm text-neutral-500`}>
          Day {current} of {total}
        </AppText>
      </View>

      {/* Progress Line */}
      <View style={tw`relative mb-2`}>
        <View style={tw`h-1 bg-neutral-200 rounded-full`} />
        <View
          style={[tw`absolute top-0 h-1 bg-amber-400 rounded-full`, { width: `${progress}%` }]}
        />
        {/* Milestone markers */}
        <View style={tw`absolute top-0 left-0 right-0 flex-row justify-between`}>
          {milestones.map((milestone, index) => {
            const position = (milestone / total) * 100;
            const reached = current >= milestone;
            return (
              <View
                key={index}
                style={[
                  tw`w-5 h-5 rounded-full ${reached ? "bg-amber-400" : "bg-neutral-200"} items-center justify-center -mt-2`,
                  { position: "absolute", left: `${position}%`, marginLeft: -10 },
                ]}
              >
                {reached && current === milestone && (
                  <View style={tw`w-2 h-2 rounded-full bg-white`} />
                )}
                {reached && current > milestone && <CheckIcon size={10} />}
              </View>
            );
          })}
        </View>
      </View>

      {/* Milestone labels */}
      <View style={tw`flex-row justify-between mt-4`}>
        {milestones.map((milestone, index) => (
          <AppText
            key={index}
            style={tw`text-xs ${current >= milestone ? "text-amber-500 font-medium" : "text-neutral-400"}`}
          >
            Day {milestone}
          </AppText>
        ))}
      </View>
    </Card>
  );
}

export default function StreakScreen() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const streakCount = 22;
  const currentDay = 4;

  // Mock data for completed days
  const completedDays = [2, 3, 4, 5];

  // Calendar data
  const daysOfWeek = ["S", "M", "T", "W", "T", "F", "S"];
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return { firstDay, daysInMonth };
  };

  const { firstDay, daysInMonth } = getDaysInMonth(currentMonth);

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const handleBack = () => {
    router.back();
  };

  const handleSeeBadges = () => {
    router.push("/badges");
  };

  // Sample badges
  const badges = [
    { icon: "🌟", color: "bg-green-100", unlocked: true },
    { icon: "🏆", color: "bg-orange-100", unlocked: true },
    { icon: "🔔", color: "bg-blue-100", unlocked: true },
    { icon: "🎯", color: "bg-orange-200", unlocked: false },
    { icon: "💎", color: "bg-primary-100", unlocked: false },
    { icon: "⚡", color: "bg-yellow-100", unlocked: false },
  ];

  return (
    <SafeAreaView style={tw`flex-1 bg-cream-100`} edges={["top", "bottom"]}>
      {/* Header */}
      <View style={tw`px-6 pt-4 pb-2 flex-row items-center`}>
        <TouchableOpacity onPress={handleBack}>
          <BackIcon />
        </TouchableOpacity>
        <AppText style={tw`flex-1 text-center text-xl font-bold text-neutral-900`}>Streak</AppText>
        <View style={tw`w-6`} />
      </View>

      <ScrollView
        style={tw`flex-1`}
        contentContainerStyle={tw`px-6 pb-6`}
        showsVerticalScrollIndicator={false}
      >
        {/* Streak Count */}
        <View style={tw`items-center py-6`}>
          <View style={tw`flex-row items-end`}>
            <AppText style={tw`text-6xl font-bold text-neutral-900`}>{streakCount}</AppText>
            <View style={tw`ml-4 mb-2`}>
              <FireIcon size={80} grayscale={streakCount === 0} />
            </View>
          </View>
          <AppText style={tw`text-lg text-neutral-600 mt-2`}>days streak</AppText>
        </View>

        {/* Motivation Banner */}
        <View style={tw`bg-amber-50 rounded-xl px-4 py-3 mb-6 flex-row items-center`}>
          <AppText style={tw`text-amber-600 mr-2`}>💡</AppText>
          <AppText style={tw`text-sm text-neutral-700 flex-1`}>
            Grow your streak daily to unlock new rewards and point boosters
          </AppText>
        </View>

        {/* Challenge Progress */}
        <AppText style={tw`text-lg font-bold text-neutral-900 mb-3`}>Streak</AppText>
        <ChallengeProgress
          title="7 Day challenge"
          current={currentDay}
          total={7}
          milestones={[1, 7, 14, 30]}
        />

        {/* Motivation Card */}
        <View style={tw`bg-primary-500 rounded-xl px-4 py-3 mb-6`}>
          <View style={tw`flex-row items-start`}>
            <AppText style={tw`text-white mr-2`}>🏆</AppText>
            <View style={tw`flex-1`}>
              <AppText style={tw`text-white font-bold mb-1`}>Just 4 days left!</AppText>
              <AppText style={tw`text-white/80 text-sm`}>
                Continue practicing to unlock your a Badge.
              </AppText>
            </View>
          </View>
        </View>

        {/* Calendar */}
        <Card variant="outlined" padding="lg" style={tw`mb-6`}>
          {/* Month Navigation */}
          <View style={tw`flex-row items-center justify-between mb-4`}>
            <AppText style={tw`text-base font-bold text-neutral-900`}>
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </AppText>
            <View style={tw`flex-row items-center gap-2`}>
              <TouchableOpacity onPress={handlePrevMonth} style={tw`p-1`}>
                <ChevronLeftIcon />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleNextMonth} style={tw`p-1`}>
                <ChevronRightIcon />
              </TouchableOpacity>
            </View>
          </View>

          {/* Day Headers */}
          <View style={tw`flex-row mb-2`}>
            {daysOfWeek.map((day, index) => (
              <View key={index} style={tw`flex-1 items-center`}>
                <AppText style={tw`text-sm font-medium text-neutral-500`}>{day}</AppText>
              </View>
            ))}
          </View>

          {/* Calendar Grid */}
          <View style={tw`flex-row flex-wrap`}>
            {/* Empty cells for days before the 1st */}
            {Array.from({ length: firstDay }).map((_, index) => (
              <View key={`empty-${index}`} style={tw`w-[14.28%] h-12`} />
            ))}
            {/* Days of the month */}
            {Array.from({ length: daysInMonth }).map((_, index) => {
              const day = index + 1;
              const isCompleted = completedDays.includes(day);
              const isToday = day === 17; // Mock today
              const isPast = day < 17;

              return (
                <View key={day} style={tw`w-[14.28%] h-12 items-center justify-center`}>
                  <View
                    style={tw`w-9 h-9 rounded-full items-center justify-center ${isCompleted
                        ? "bg-primary-500"
                        : isToday
                          ? "border-2 border-neutral-400 bg-neutral-100"
                          : ""
                      }`}
                  >
                    {isCompleted ? (
                      <CheckIcon size={14} />
                    ) : (
                      <AppText
                        style={tw`text-sm ${isToday ? "font-bold text-neutral-900" : "text-neutral-600"
                          }`}
                      >
                        {day}
                      </AppText>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </Card>

        {/* Badges Section */}
        <Card variant="outlined" padding="lg">
          <View style={tw`flex-row items-center justify-between mb-4`}>
            <AppText style={tw`text-lg font-bold text-neutral-900`}>Badges</AppText>
            <TouchableOpacity onPress={handleSeeBadges} style={tw`flex-row items-center`}>
              <AppText style={tw`text-primary-500 font-medium mr-1`}>See all</AppText>
              <ChevronRightIcon color="#2E7D32" />
            </TouchableOpacity>
          </View>

          <View style={tw`flex-row justify-between`}>
            {badges.map((badge, index) => (
              <Badge key={index} {...badge} />
            ))}
          </View>

          {/* Badge Info */}
          <View style={tw`bg-primary-500 rounded-xl px-4 py-3 mt-4`}>
            <AppText style={tw`text-white font-bold mb-1`}>Unlock the Qule Expert Badge!</AppText>
            <AppText style={tw`text-white/80 text-sm`}>
              Complete a continuous study streak for the unlocking of a Abendal Master Badge
            </AppText>
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

