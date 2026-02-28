import { AppText, BoldText, Button } from "@/components/ui";
import tw from "@/lib/tw";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ScrollView, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

function BackIcon() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M15 18l-6-6 6-6"
        stroke="#171717"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

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

export default function NationalityScreen() {
  const params = useLocalSearchParams();
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    if (!selected) return;

    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    setLoading(false);

    router.push({
      pathname: "/(profile-setup)/voice-calibration",
      params: { ...params, nationality: selected },
    });
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-cream-100`} edges={["top", "bottom"]}>
      <View style={tw`flex-1`}>
        {/* Header */}
        <View style={tw`px-6 pt-4`}>
          <TouchableOpacity onPress={handleBack} style={tw`mb-4`}>
            <BackIcon />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={tw`flex-1`}
          contentContainerStyle={tw`px-6 pb-6`}
          showsVerticalScrollIndicator={false}
        >
          {/* Progress: step 5 of 6 */}
          <ProgressDots current={4} total={6} />

          {/* Title */}
          <BoldText style={tw`text-2xl font-bold text-neutral-900 mb-2`}>
            What's your nationality?
          </BoldText>
          <AppText style={tw`text-base text-neutral-500 mb-6`}>
            This is to give us more insight on how to help you achieve your goal
          </AppText>

          {/* Nationality List */}
          <View style={tw`gap-3`}>
            {nationalities.map((nationality) => (
              <TouchableOpacity
                key={nationality.id}
                onPress={() => setSelected(nationality.id)}
                style={tw`flex-row items-center justify-between p-4 rounded-xl border ${selected === nationality.id ? "border-primary-500 bg-primary-50" : "border-neutral-200 bg-white"}`}
              >
                <View style={tw`flex-row items-center gap-3`}>
                  <AppText style={tw`text-2xl`}>{nationality.flag}</AppText>
                  <AppText style={tw`text-base text-neutral-900 font-medium`}>
                    {nationality.name}
                  </AppText>
                </View>
                <AppText style={tw`text-base text-neutral-500`}>
                  {nationality.native}
                </AppText>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Bottom Button */}
        <View style={tw`px-6 pb-4 pt-4 bg-cream-100`}>
          <Button onPress={handleContinue} loading={loading} disabled={!selected}>
            Done
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
}
