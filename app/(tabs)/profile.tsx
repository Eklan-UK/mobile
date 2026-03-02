import { AppText, Button, Card, Loader } from "@/components/ui";
import tw from "@/lib/tw";
import { router } from "expo-router";
import { Image, ScrollView, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Path } from "react-native-svg";
import { useAuthStore } from "@/store/auth-store";

/* ================= ICONS ================= */

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

function ChevronRightIcon({ color = "#2E7D32" }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
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

/* ================= COMPONENTS ================= */

function StatCard({
  icon,
  value,
  label,
  bg,
}: {
  bg: string;
  icon: string;
  value: string;
  label: string;
}) {
  return (
    <View style={tw`flex-1 ${bg} rounded-[24px] py-6 px-1 items-center shadow-sm`}>
      <AppText style={tw`text-2xl mb-2`}>{icon}</AppText>
      <AppText style={tw`text-xl font-bold text-neutral-900 dark:text-white mb-1`}>{value}</AppText>
      <AppText style={tw`text-[11px] text-neutral-500 dark:text-neutral-400 text-center`}>{label}</AppText>
    </View>
  );
}

function StreakCard() {
  return (
    <Card variant="outlined" padding="lg">
      <View style={tw`flex-row justify-between items-center mb-4`}>
        <AppText style={tw`text-lg font-bold text-neutral-900 dark:text-white`}>Streak</AppText>
        <TouchableOpacity
          style={tw`flex-row items-center`}
          onPress={() => router.push("/streak")}
        >
          <AppText style={tw`text-neutral-500 dark:text-neutral-400 mr-1`}>calendar</AppText>
          <ChevronRightIcon color="#16a34a" />
        </TouchableOpacity>
      </View>

      <View style={tw`flex-row justify-between mb-4`}>
        <AppText style={tw`font-medium text-neutral-900 dark:text-white`}>30 Days challenge</AppText>
        <AppText style={tw`text-neutral-400 dark:text-neutral-500`}>Day 22 of 30</AppText>
      </View>

      {/* PROGRESS */}
      <View style={tw`flex-row justify-between mb-6`}>
        {[21, 22, 23, 24].map((day, index) => {
          const active = day <= 22;
          const current = day === 22;

          return (
            <View key={day} style={tw`items-center flex-1`}>
              <View style={tw`flex-row items-center w-full`}>
                {index !== 0 && (
                  <View
                    style={tw`flex-1 h-0.5 ${active ? "bg-yellow-400" : "bg-neutral-200 dark:bg-neutral-700"
                      }`}
                  />
                )}
                <View
                  style={tw`w-6 h-6 rounded-full ${active ? "bg-yellow-400" : "bg-neutral-200 dark:bg-neutral-700"
                    } items-center justify-center`}
                >
                  {current && (
                    <View style={tw`w-2 h-2 bg-white rounded-full`} />
                  )}
                </View>
              </View>

              <View
                style={tw`mt-2 px-2 py-1 rounded-full ${current ? "bg-yellow-400" : ""
                  }`}
              >
                <AppText
                  style={tw`text-xs ${current ? "text-white font-semibold" : "text-neutral-400"
                    }`}
                >
                  Day {day}
                </AppText>
              </View>
            </View>
          );
        })}
      </View>

      {/* MOTIVATION */}
      <View style={tw`bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 mb-4 flex-row gap-2`}>
        <AppText style={tw`text-xl`}>🔥</AppText>
        <View style={tw`flex-1`}>
          <AppText style={tw`font-bold mb-1 text-neutral-900 dark:text-white`}>Just 4 days left!</AppText>
          <AppText style={tw`text-sm text-neutral-600 dark:text-neutral-400`}>
            Keep your daily learning streak going and earn a badge when you
            practice or complete a lesson every day.
          </AppText>
        </View>
      </View>

      <Button onPress={() => router.push("/practice")}>
        Continue Practice
      </Button>
    </Card>
  );
}

/* ================= SCREEN ================= */

export default function ProfileScreen() {
  const { user: authUser, isLoading: authLoading } = useAuthStore();

  // Format user name from firstName and lastName
  const userName = authUser
    ? `${authUser.firstName || ""} ${authUser.lastName || ""}`.trim() || authUser.username || authUser.email?.split("@")[0] || "User"
    : "User";

  // Default to Freemium if no subscription data available
  // TODO: Add subscription/plan data to user model or fetch from API
  const userPlan = authUser?.isSubscribed ? "Premium" : "Freemium";
  const planExpiry = null; // TODO: Get from subscription API when available

  // Show loading state
  if (authLoading) {
    return (
      <SafeAreaView style={tw`flex-1 bg-[#F6F7F3] dark:bg-neutral-900 items-center justify-center`} edges={["top"]}>
        <Loader />
      </SafeAreaView>
    );
  }

  // Show placeholder if no user
  if (!authUser) {
    return (
      <SafeAreaView style={tw`flex-1 bg-[#F6F7F3] dark:bg-neutral-900`} edges={["top"]}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={tw`bg-primary-500 px-6 pt-4 pb-20 rounded-b-[48px]`}>
            <View style={tw`flex-row justify-between items-center mb-6`}>
              <AppText style={tw`text-white text-xl font-semibold`}>Profile</AppText>
              <TouchableOpacity onPress={() => router.push("/settings")}>
                <SettingsIcon />
              </TouchableOpacity>
            </View>
            <View style={tw`items-center py-8`}>
              <AppText style={tw`text-white text-lg`}>Please sign in to view your profile</AppText>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={tw`flex-1 bg-[#F6F7F3] dark:bg-neutral-900`} edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* HEADER */}
        <View style={tw`bg-primary-500 px-6 pt-4 pb-20 rounded-b-[48px]`}>
          <View style={tw`flex-row justify-between items-center mb-6`}>
            <AppText style={tw`text-white text-xl font-semibold`}>Profile</AppText>
            <TouchableOpacity onPress={() => router.push("/settings")}>
              <SettingsIcon />
            </TouchableOpacity>
          </View>

          <View style={tw`flex-row items-center gap-4`}>
            <View style={tw`w-20 h-20 rounded-full border-2 border-white dark:border-primary-500 bg-white p-0.5 shadow-sm`}>
              <View
                style={tw`flex-1 bg-neutral-100 dark:bg-neutral-800 rounded-full items-center justify-center overflow-hidden`}
              >
                {authUser.avatar ? (
                  <Image
                    source={{ uri: authUser.avatar }}
                    style={tw`w-full h-full rounded-full`}
                    resizeMode="cover"
                  />
                ) : (
                  <AppText style={tw`text-3xl`}>👩‍🎨</AppText>
                )}
              </View>
            </View>

            <View>
              <AppText style={tw`text-white text-xl font-bold`}>{userName}</AppText>
              <AppText style={tw`text-white/80 text-sm`}>{authUser.email}</AppText>

              <View
                style={tw`bg-yellow-400 self-start px-3 py-1 rounded-full mt-2`}
              >
                <AppText style={tw`text-xs font-semibold`}>{userPlan}</AppText>
              </View>
            </View>
          </View>
        </View>

        {/* CONTENT */}
        <View style={tw`px-6 -mt-16`}>
          {/* STATS */}
          <View style={tw`flex-row gap-3 mb-8`}>
            <StatCard
              icon="💪"
              value="+12%"
              label="Confidence"
              bg="bg-[#F2F7ED] dark:bg-green-900/30"
            />
            <StatCard
              icon="🎤"
              value="+9%"
              label="Pronunciation"
              bg="bg-[#F3EFFF] dark:bg-blue-900/30"
            />
            <StatCard
              icon="⏱️"
              value="145m"
              label="Time Studied"
              bg="bg-[#FFF8E7] dark:bg-orange-900/30"
            />
          </View>

          {/* STREAK */}
          <View style={tw`mb-8`}>
            <StreakCard />
          </View>

          {/* BADGES */}
          <View style={tw`mb-8`}>
            <View style={tw`flex-row justify-between items-center mb-6`}>
              <AppText style={tw`text-xl font-bold text-neutral-900 dark:text-white`}>Badges</AppText>
              <TouchableOpacity
                style={tw`flex-row items-center`}
                onPress={() => router.push("/badges")}
              >
                <AppText style={tw`text-primary-600 dark:text-primary-400 font-medium mr-1`}>See All</AppText>
                <ChevronRightIcon />
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={tw`-mx-6 px-6`} contentContainerStyle={tw`pb-4`}>
              {[
                { icon: "🌟", color: "bg-green-100 dark:bg-green-900/30", border: "border-green-500" },
                { icon: "🏆", color: "bg-orange-100 dark:bg-orange-900/30", border: "border-orange-500" },
                { icon: "🔔", color: "bg-blue-100 dark:bg-blue-900/30", border: "border-blue-500" },
                { icon: "💎", color: "bg-primary-100 dark:bg-primary-900/30", border: "border-primary-500" },
                { icon: "🎯", color: "bg-amber-100 dark:bg-amber-900/30", border: "border-amber-500" },
              ].map((badge, i) => (
                <View key={i} style={tw`w-16 h-16 ${badge.color} rounded-full mr-4 items-center justify-center border-2 ${badge.border}`}>
                  <AppText style={tw`text-2xl`}>{badge.icon}</AppText>
                </View>
              ))}
              <View style={tw`w-4`} />
            </ScrollView>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
