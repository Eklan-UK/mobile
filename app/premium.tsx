import { AppText, Button } from "@/components/ui";
import tw from "@/lib/tw";
import { router } from "expo-router";
import { ScrollView, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { logger } from "@/utils/logger";

// Icons
function CloseIcon() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M18 6L6 18M6 6l12 12"
        stroke={tw.prefixMatch('dark') ? "#F9FAFB" : "#171717"}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function CheckIcon({ color = "#22c55e" }: { color?: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20 6L9 17l-5-5"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function CrownIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M2 17l3-12 7 4 7-4 3 12H2z"
        fill="#fbbf24"
        stroke="#f59e0b"
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      <Path
        d="M5 21h14"
        stroke="#f59e0b"
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </Svg>
  );
}

// Feature Row Component
function FeatureRow({
  label,
  freeIncluded,
  premiumIncluded,
}: {
  label: string;
  freeIncluded: boolean;
  premiumIncluded: boolean;
}) {
  return (
    <View style={tw`flex-row items-center py-5 border-b border-[#f5f5f5] dark:border-neutral-800`}>
      <AppText style={tw`flex-1 text-[15px] font-medium text-neutral-900 dark:text-white`}>{label}</AppText>
      <View style={tw`w-20 items-center`}>
        {freeIncluded && <CheckIcon color="#22c55e" />}
      </View>
      <View style={tw`w-28 items-center`}>
        {premiumIncluded && <CheckIcon color="#22c55e" />}
      </View>
    </View>
  );
}

export default function PremiumScreen() {
  const handleClose = () => {
    router.back();
  };

  const handleStartTrial = () => {
    logger.log("Start trial -> book call");
    router.push("/book-call");
  };

  const handleSkip = () => {
    router.back();
  };

  const features = [
    { label: "Learning content", freeIncluded: true, premiumIncluded: true },
    { label: "Offline learning", freeIncluded: false, premiumIncluded: true },
    { label: "Premium content", freeIncluded: false, premiumIncluded: true },
    { label: "Unlimited Chatbot Access", freeIncluded: false, premiumIncluded: true },
  ];

  return (
    <SafeAreaView style={tw`flex-1 bg-white dark:bg-neutral-900`} edges={["top", "bottom"]}>
      {/* Header */}
      <View style={tw`px-6 pt-4 flex-row justify-end`}>
        <TouchableOpacity onPress={handleClose} style={tw`w-10 h-10 items-center justify-center rounded-full bg-neutral-50 dark:bg-neutral-800`}>
          <CloseIcon />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={tw`flex-1`}
        contentContainerStyle={tw`px-6 pt-6 pb-6`}
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <View style={tw`mb-10`}>
          <AppText style={tw`text-[32px] font-bold text-neutral-900 dark:text-white leading-[40px]`}>
            Elevate your English learning{"\n"}experience with
          </AppText>
        </View>

        {/* Comparison Table */}
        <View style={tw`bg-white dark:bg-neutral-900`}>
          {/* Table Header */}
          <View style={tw`flex-row items-end pb-4 border-b border-[#f5f5f5] dark:border-neutral-800`}>
            <View style={tw`flex-1`} />
            <View style={tw`w-20 items-center pb-2`}>
              <AppText style={tw`text-sm font-bold text-neutral-900 dark:text-white tracking-wider`}>FREE</AppText>
            </View>
            <View style={tw`w-28 items-center relative`}>
              <View style={tw`flex-row items-center bg-[#E8F5E9] dark:bg-green-900/30 px-4 py-2 rounded-2xl`}>
                <AppText style={tw`text-[17px] font-bold text-primary-600 dark:text-primary-400 mr-1`}>Premium</AppText>
                <View style={tw`absolute -top-3 -right-2`}>
                  <CrownIcon />
                </View>
              </View>
            </View>
          </View>

          {/* Feature Rows */}
          {features.map((feature, index) => (
            <FeatureRow key={index} {...feature} />
          ))}
        </View>
      </ScrollView>

      {/* Bottom Actions */}
      <View style={tw`px-6 pb-6 pt-4`}>
        <Button onPress={handleStartTrial}>Try 7days for free</Button>
        <TouchableOpacity onPress={handleSkip} style={tw`py-4 items-center mt-3`}>
          <AppText style={tw`text-[17px] text-[#ca8a04] dark:text-yellow-500 font-bold`}>Skip</AppText>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
