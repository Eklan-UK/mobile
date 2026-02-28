import { AppText, Button, Card, Loader } from "@/components/ui";
import tw from "@/lib/tw";
import { router } from "expo-router";
import { Image, ScrollView, TouchableOpacity, View, ActivityIndicator } from "react-native";
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
    <View style={tw`flex-1 ${bg} rounded-2xl py-5 items-center`}>
      <AppText style={tw`text-2xl mb-3`}>{icon}</AppText>
      <AppText style={tw`text-2xl font-bold text-neutral-900`}>{value}</AppText>
      <AppText style={tw`text-sm text-neutral-500 mt-1`}>{label}</AppText>
    </View>
  );
}

function StreakCard() {
  return (
    <Card variant="outlined" padding="lg">
      <View style={tw`flex-row justify-between items-center mb-4`}>
        <AppText style={tw`text-lg font-bold`}>Streak</AppText>
        <TouchableOpacity
          style={tw`flex-row items-center`}
          onPress={() => router.push("/streak")}
        >
          <AppText style={tw`text-neutral-500 mr-1`}>calendar</AppText>
          <ChevronRightIcon color="#16a34a" />
        </TouchableOpacity>
      </View>

      <View style={tw`flex-row justify-between mb-4`}>
        <AppText style={tw`font-medium`}>30 Days challenge</AppText>
        <AppText style={tw`text-neutral-400`}>Day 22 of 30</AppText>
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
                    style={tw`flex-1 h-0.5 ${active ? "bg-yellow-400" : "bg-neutral-200"
                      }`}
                  />
                )}
                <View
                  style={tw`w-6 h-6 rounded-full ${active ? "bg-yellow-400" : "bg-neutral-200"
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
      <View style={tw`bg-amber-50 rounded-xl p-4 mb-4 flex-row gap-2`}>
        <AppText style={tw`text-xl`}>🔥</AppText>
        <View style={tw`flex-1`}>
          <AppText style={tw`font-bold mb-1`}>Just 4 days left!</AppText>
          <AppText style={tw`text-sm text-neutral-600`}>
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
  const userPlan = "Freemium";
  const planExpiry = null; // TODO: Get from subscription API when available

  // Show loading state
  if (authLoading) {
    return (
      <SafeAreaView style={tw`flex-1 bg-[#F6F7F3] items-center justify-center`} edges={["top"]}>
        <Loader />
      </SafeAreaView>
    );
  }

  // Show placeholder if no user
  if (!authUser) {
    return (
      <SafeAreaView style={tw`flex-1 bg-[#F6F7F3]`} edges={["top"]}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={tw`bg-primary-500 px-6 pt-4 pb-14 rounded-b-[32px]`}>
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
    <SafeAreaView style={tw`flex-1 bg-[#F6F7F3]`} edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* HEADER */}
        <View style={tw`bg-primary-500 px-6 pt-4 pb-14 rounded-b-[32px]`}>
          <View style={tw`flex-row justify-between items-center mb-6`}>
            <AppText style={tw`text-white text-xl font-semibold`}>Profile</AppText>
            <TouchableOpacity onPress={() => router.push("/settings")}>
              <SettingsIcon />
            </TouchableOpacity>
          </View>

          <View style={tw`flex-row items-center gap-4`}>
            <View style={tw`w-20 h-20 rounded-full bg-white p-1`}>
              <View
                style={tw`flex-1 bg-neutral-100 rounded-full items-center justify-center overflow-hidden`}
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
        <View style={tw`px-6 -mt-10`}>
          {/* STATS */}
          <View style={tw`flex-row gap-4 mb-6`}>
            <StatCard
              icon="💪"
              value="+12%"
              label="Confidence"
              bg="bg-green-100"
            />
            <StatCard
              icon="🎤"
              value="+9%"
              label="Pronunciation"
              bg="bg-primary-100"
            />
            <StatCard
              icon="⏱️"
              value="145m"
              label="Time Studied"
              bg="bg-amber-100"
            />
          </View>

          {/* PLAN */}
          <Card variant="outlined" padding="md" style={tw`mb-6`}>
            <TouchableOpacity
              style={tw`flex-row justify-between items-center`}
            // onPress={() => router.push("/subscription")}
            >
              <View>
                <View style={tw`bg-primary-500 px-3 py-1 rounded-full mb-2`}>
                  <AppText style={tw`text-white text-xs font-semibold`}>
                    Current Plan
                  </AppText>
                </View>
                <AppText style={tw`text-lg font-bold`}>{userPlan}</AppText>
                {planExpiry ? (
                  <AppText style={tw`text-sm text-neutral-500`}>
                    Expires on{" "}
                    <AppText style={tw`text-primary-500 font-medium`}>
                      {planExpiry}
                    </AppText>
                  </AppText>
                ) : (
                  <AppText style={tw`text-sm text-neutral-500`}>
                    No expiration date
                  </AppText>
                )}
              </View>
              <ChevronRightIcon />
            </TouchableOpacity>
          </Card>

          {/* STREAK */}
          <StreakCard />

          {/* SAVED DRILLS */}
          <Card variant="outlined" padding="md" style={tw`mb-6`}>
            <TouchableOpacity
              style={tw`flex-row justify-between items-center`}
              onPress={() => router.push("/practice/drills/saved")}
            >
              <View style={tw`flex-row items-center gap-3`}>
                <View style={tw`w-10 h-10 bg-green-100 rounded-full items-center justify-center`}>
                  <AppText style={tw`text-lg`}>📚</AppText>
                </View>
                <View>
                  <AppText style={tw`text-base font-semibold`}>Saved Drills</AppText>
                  <AppText style={tw`text-sm text-neutral-500`}>
                    View your saved drills
                  </AppText>
                </View>
              </View>
              <ChevronRightIcon />
            </TouchableOpacity>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
