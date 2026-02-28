import { AppText, BoldText, Button } from "@/components/ui";
import tw from "@/lib/tw";
import { useState } from "react";
import { ScrollView, TouchableOpacity, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { StepProps } from "./types";

function BackArrowIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M15 19l-7-7 7-7"
        stroke="#1F2937"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ProgressDots({ current, total }: { current: number; total: number }) {
  return (
    <View style={tw`flex-row items-center justify-center gap-2`}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            tw`h-2 rounded-full`,
            i < current
              ? tw`w-2 bg-green-400`
              : i === current
                ? tw`w-8 bg-green-700`
                : tw`w-2 bg-gray-200`,
          ]}
        />
      ))}
    </View>
  );
}

const goals = [
  { id: "conversations", name: "Speak naturally in conversations", icon: "💬" },
  { id: "professional", name: "Sound professional at work", icon: "💼" },
  { id: "travel", name: "Travel confidently", icon: "✈️" },
  { id: "interviews", name: "Prepare for Interviews", icon: "📊" },
];

export default function GoalsStep({ data, onUpdate, onNext, onBack, currentStep, totalSteps }: StepProps) {
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    if (!data.goal) return;

    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 300));
    setLoading(false);
    onNext();
  };

  return (
    <View style={tw`flex-1 bg-white`}>
      <ScrollView
        contentContainerStyle={tw`px-6 pt-5 pb-6`}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={tw`flex-row items-center mb-8`}>
          <TouchableOpacity
            onPress={onBack}
            style={tw`w-10 h-10 rounded-full bg-gray-100 items-center justify-center`}
          >
            <BackArrowIcon />
          </TouchableOpacity>
          <View style={tw`flex-1 items-center`}>
            <ProgressDots current={currentStep} total={totalSteps} />
          </View>
        </View>

        {/* Title */}
        <BoldText style={tw`text-2xl text-gray-900 mb-6`}>
          Why are you learning English?
        </BoldText>

        {/* Goal Options */}
        <View style={tw`gap-3 mb-6`}>
          {goals.map((goal) => (
            <TouchableOpacity
              key={goal.id}
              onPress={() => onUpdate({ goal: goal.id })}
              style={[
                tw`flex-row items-center p-4 rounded-2xl border-2`,
                data.goal === goal.id
                  ? tw`border-green-700 bg-green-50`
                  : tw`border-gray-200 bg-white`,
              ]}
            >
              <AppText style={tw`text-2xl mr-3`}>{goal.icon}</AppText>
              <AppText
                style={[
                  tw`text-base`,
                  data.goal === goal.id ? tw`text-gray-900 font-semibold` : tw`text-gray-700`,
                ]}
              >
                {goal.name}
              </AppText>
            </TouchableOpacity>
          ))}
        </View>

        {/* Continue Button */}
        <View style={tw`mt-auto`}>
          <Button
            onPress={handleContinue}
            loading={loading}
            disabled={!data.goal}
            size="lg"
            style={tw`rounded-full bg-green-700`}
          >
            Continue
          </Button>
        </View>
      </ScrollView>
    </View>
  );
}
