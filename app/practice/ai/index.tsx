;import React from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  Text,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import tw from "@/lib/tw";
import { useDrills } from "@/hooks/useDrills";

const FREE_TOPICS = [
  {
    id: "daily-life",
    title: "Daily Life",
    subtitle: "Everyday conversations",
    emoji: "☕",
    bg: "bg-purple-500",
    bgHex: "#A855F7",
  },
  {
    id: "work-school",
    title: "Work / school",
    subtitle: "Meetings & presentations",
    emoji: "💼",
    bgHex: "#92400E",
    bg: "bg-amber-800",
  },
  {
    id: "on-mind",
    title: "Something on your mind",
    subtitle: null,
    emoji: "🤔",
    bgHex: "#EAB308",
    bg: "bg-yellow-500",
  },
  {
    id: "surprise",
    title: "Surprise me",
    subtitle: null,
    emoji: "✨",
    bgHex: "#059669",
    bg: "bg-emerald-600",
  },
];

export default function AiSelectionScreen() {
  // Pass 'completed' status to filter at API level — matching web's useLearnerDrills({ status: "completed" })
  const { data: drillsData, isLoading } = useDrills("completed", 100);
  const completedScenarioDrills =
    drillsData?.drills.filter((a: any) => {
      const drill = a.drill;
      // API already filters by status=completed; we just need type filtering here
      return drill && (drill.type === "roleplay" || drill.type === "scenario");
    }) || [];

  const hasCompletedDrills = completedScenarioDrills.length > 0;

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header with back button */}
      <View style={tw`flex-row items-center px-4 py-3`}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={tw`w-10 h-10 items-center justify-center -ml-2 rounded-full`}
        >
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={tw`flex-1`}
        contentContainerStyle={tw`px-5 pb-12`}
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <Text style={tw`text-2xl font-bold text-gray-900 mb-1`}>
          Start a Free Talk
        </Text>
        <Text style={tw`text-base text-gray-500 mb-6`}>
          Choose how you'd like to practice today.
        </Text>

        {/* ── Based on Your Drills ── */}
        {isLoading ? (
          <View style={tw`mb-8`}>
            <Text style={tw`text-sm font-bold text-gray-700 mb-3`}>
              Based on Your Drills
            </Text>
            <View style={tw`gap-3`}>
              <View style={tw`bg-white border border-gray-200 rounded-2xl p-4 h-20`} />
              <View style={tw`bg-white border border-gray-200 rounded-2xl p-4 h-20`} />
            </View>
          </View>
        ) : hasCompletedDrills ? (
          <View style={tw`mb-8`}>
            <Text style={tw`text-sm font-bold text-gray-700 mb-3`}>
              Based on Your Drills
            </Text>
            <View style={tw`gap-3`}>
              {completedScenarioDrills.map((assignment: any) => {
                const drill = assignment.drill;
                const drillId = drill._id || assignment.drillId;

                return (
                  <TouchableOpacity
                    key={assignment._id || drillId}
                    activeOpacity={0.75}
                    onPress={() =>
                      router.push({
                        pathname: "/practice/ai-talk",
                        params: { drillId },
                      })
                    }
                    style={tw`w-full bg-white border border-gray-200 rounded-2xl p-4 flex-row items-center gap-4`}
                  >
                    {/* Drill thumbnail */}
                    <View style={tw`w-12 h-12 rounded-xl overflow-hidden flex-shrink-0`}>
                      <Image
                        source={require("@/assets/images/thumbnail.png")}
                        style={tw`w-full h-full`}
                        resizeMode="cover"
                      />
                    </View>

                    {/* Title + meta */}
                    <View style={tw`flex-1`}>
                      <View style={tw`flex-row items-center gap-2 mb-1`}>
                        <Text
                          style={tw`text-base font-bold text-gray-900`}
                          numberOfLines={1}
                        >
                          {drill.title}
                        </Text>
                        <Text style={tw`text-xs text-blue-500 flex-shrink-0`}>
                          • Scenario
                        </Text>
                      </View>
                      <View style={tw`flex-row items-center gap-1`}>
                        <Ionicons name="time-outline" size={14} color="#9CA3AF" />
                        <Text style={tw`text-xs text-gray-400`}>5-7 minutes</Text>
                      </View>
                    </View>

                    {/* Chevron */}
                    <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ) : null}

        {/* ── Free Topics ── */}
        <View>
          <Text style={tw`text-sm font-bold text-gray-700 mb-3`}>
            Free Topics
          </Text>
          <View style={tw`gap-3`}>
            {FREE_TOPICS.map((topicItem, idx) => (
              <TouchableOpacity
                key={topicItem.id}
                activeOpacity={0.75}
                onPress={() =>
                  router.push({
                    pathname: "/practice/ai-talk",
                    params: { topic: topicItem.id },
                  })
                }
                style={[
                  tw`w-full bg-white rounded-2xl p-4 flex-row items-center gap-4`,
                  idx === 0
                    ? tw`border border-emerald-300 shadow-sm`
                    : tw`border border-gray-200`,
                ]}
              >
                {/* Emoji avatar */}
                <View
                  style={[
                    tw`w-12 h-12 rounded-xl items-center justify-center flex-shrink-0`,
                    { backgroundColor: topicItem.bgHex },
                  ]}
                >
                  <Text style={tw`text-xl`}>{topicItem.emoji}</Text>
                </View>

                {/* Title + subtitle */}
                <View style={tw`flex-1`}>
                  <Text style={tw`text-base font-bold text-gray-900`}>
                    {topicItem.title}
                  </Text>
                  {topicItem.subtitle && (
                    <Text style={tw`text-sm text-gray-500`}>
                      {topicItem.subtitle}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
