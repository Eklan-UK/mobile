import { AppText, BoldText, Button } from "@/components/ui";
import tw from "@/lib/tw";
import { useState } from "react";
import { TouchableOpacity, View } from "react-native";
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

const roles = [
  { id: "professional", name: "Professional", icon: "💼" },
  { id: "student", name: "Student", icon: "🎓" },
  { id: "exploring", name: "Just exploring", icon: "🧭" },
];

export default function RoleStep({ data, onUpdate, onNext, onBack, currentStep, totalSteps }: StepProps) {
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    if (!data.role) return;

    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 300));
    setLoading(false);
    onNext();
  };

  return (
    <View style={tw`flex-1 bg-white px-6 pt-5`}>
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
        Who will be using Eklan today?
      </BoldText>

      {/* Role Options */}
      <View style={tw`gap-3 mb-6`}>
        {roles.map((role) => (
          <TouchableOpacity
            key={role.id}
            onPress={() => onUpdate({ role: role.id })}
            style={[
              tw`flex-row items-center p-4 rounded-2xl border-2`,
              data.role === role.id
                ? tw`border-green-700 bg-green-50`
                : tw`border-gray-200 bg-white`,
            ]}
          >
            <AppText style={tw`text-2xl mr-3`}>{role.icon}</AppText>
            <AppText
              style={[
                tw`text-base`,
                data.role === role.id ? tw`text-gray-900 font-semibold` : tw`text-gray-700`,
              ]}
            >
              {role.name}
            </AppText>
          </TouchableOpacity>
        ))}
      </View>

      {/* Spacer */}
      <View style={tw`flex-1`} />

      {/* Continue Button */}
      <View style={tw`mb-2`}>
        <Button
          onPress={handleContinue}
          loading={loading}
          disabled={!data.role}
          size="lg"
          style={tw`rounded-full bg-green-700`}
        >
          Continue
        </Button>
      </View>
    </View>
  );
}
