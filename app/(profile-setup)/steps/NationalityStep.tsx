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

const nationalities = [
  { id: "korean", name: "Korean", native: "한국인", flag: "🇰🇷" },
  { id: "spanish", name: "Spanish", native: "Español", flag: "🇪🇸" },
  { id: "chinese", name: "Chinese", native: "中国人", flag: "🇨🇳" },
  { id: "german", name: "German", native: "Deutsch", flag: "🇩🇪" },
  { id: "russian", name: "Russian", native: "Русский", flag: "🇷🇺" },
  { id: "french", name: "French", native: "Français", flag: "🇫🇷" },
  { id: "english", name: "English", native: "English", flag: "🇺🇸" },
  { id: "japanese", name: "Japanese", native: "日本語", flag: "🇯🇵" },
  { id: "portuguese", name: "Portuguese", native: "Português", flag: "🇧🇷" },
  { id: "arabic", name: "Arabic", native: "العربية", flag: "🇸🇦" },
];

export default function NationalityStep({ data, onUpdate, onNext, onBack, currentStep, totalSteps }: StepProps) {
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    if (!data.nationality) return;

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
        <BoldText style={tw`text-2xl text-gray-900 mb-2`}>
          What's your nationality?
        </BoldText>
        <AppText style={tw`text-base text-gray-500 mb-6`}>
          This is to give us more insight on how to help you achieve your goal
        </AppText>

        {/* Nationality List */}
        <View style={tw`gap-3 mb-6`}>
          {nationalities.map((nationality) => (
            <TouchableOpacity
              key={nationality.id}
              onPress={() => onUpdate({ nationality: nationality.id })}
              style={[
                tw`flex-row items-center p-4 rounded-2xl border-2`,
                data.nationality === nationality.id
                  ? tw`border-green-700 bg-green-50`
                  : tw`border-gray-200 bg-white`,
              ]}
            >
              <AppText style={tw`text-2xl mr-3`}>{nationality.flag}</AppText>
              <View style={tw`flex-1`}>
                <AppText
                  style={[
                    tw`text-base`,
                    data.nationality === nationality.id
                      ? tw`text-gray-900 font-semibold`
                      : tw`text-gray-700`,
                  ]}
                >
                  {nationality.name}
                </AppText>
                <AppText style={tw`text-sm text-gray-500`}>{nationality.native}</AppText>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Continue Button */}
        <View style={tw`mt-auto`}>
          <Button
            onPress={handleContinue}
            loading={loading}
            disabled={!data.nationality}
            size="lg"
            style={tw`rounded-full bg-green-700`}
          >
            Done
          </Button>
        </View>
      </ScrollView>
    </View>
  );
}
