import { AppText, BoldText, Button } from "@/components/ui";
import tw from "@/lib/tw";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ScrollView, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Progress dots component
function ProgressDots({ current, total }: { current: number; total: number }) {
  return (
    <View style={tw`flex-row items-center justify-center gap-2 mb-8`}>
      {Array.from({ length: total }).map((_, index) => (
        <View
          key={index}
          style={tw`${index <= current ? "bg-primary-500 w-6" : "bg-neutral-200 w-2"} h-2 rounded-full`}
        />
      ))}
    </View>
  );
}

const goals = [
  {
    id: "conversations",
    name: "Speak naturally in conversations",
    icon: "💬",
  },
  {
    id: "professional",
    name: "Sound professional at work",
    icon: "💼",
  },
  {
    id: "travel",
    name: "Travel confidently",
    icon: "✈️",
  },
  {
    id: "interviews",
    name: "Prepare for Interviews",
    icon: "📊",
  },
];

export default function GoalsScreen() {
  const params = useLocalSearchParams<{
    name: string;
    role: string;
  }>();
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);



  const handleContinue = async () => {
    if (!selected) return;

    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    setLoading(false);

    router.push({
      pathname: "/(profile-setup)/daily-goal",
      params: { ...params, goal: selected },
    });
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-cream-100`} edges={["top", "bottom"]}>
      <View style={tw`flex-1`}>
        <View style={tw`px-6 pt-8`}>
          {/* Progress: step 3 of 6 */}
          <ProgressDots current={2} total={6} />

          {/* Title */}
          <BoldText
            style={tw`text-2xl font-bold text-neutral-900 mb-6`}
          >
            Why are you learning English?
          </BoldText>
        </View>

        <ScrollView
          style={tw`flex-1`}
          contentContainerStyle={tw`px-6 pb-6`}
          showsVerticalScrollIndicator={false}
        >
          {/* Goal Options */}
          <View style={tw`gap-3`}>
            {goals.map((goal) => (
              <TouchableOpacity
                key={goal.id}
                onPress={() => setSelected(goal.id)}
                style={tw`flex-row items-center p-4 rounded-2xl border-2 ${selected === goal.id ? "border-primary-500 bg-primary-50" : "border-neutral-200 bg-white"}`}
              >
                <AppText style={tw`text-2xl mr-3`}>{goal.icon}</AppText>
                <AppText style={tw`text-base text-neutral-900 font-medium flex-1`}>
                  {goal.name}
                </AppText>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Bottom Button */}
        <View style={tw`px-6 pb-4 pt-4 bg-cream-100`}>
          <Button
            onPress={handleContinue}
            loading={loading}
            disabled={!selected}
          >
            Continue
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
}
