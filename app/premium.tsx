import { AppText, BoldText, Button } from "@/components/ui";
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
        stroke="#171717"
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
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
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
    <View style={tw`flex-row items-center py-4 border-b border-neutral-100`}>
      <AppText style={tw`flex-1 text-base text-neutral-700`}>{label}</AppText>
      <View style={tw`w-20 items-center`}>
        {freeIncluded ? <CheckIcon color="#22c55e" /> : <View style={tw`w-5 h-0.5 bg-neutral-300`} />}
      </View>
      <View style={tw`w-24 items-center`}>
        {premiumIncluded ? <CheckIcon color="#22c55e" /> : <View style={tw`w-5 h-0.5 bg-neutral-300`} />}
      </View>
    </View>
  );
}

export default function PremiumScreen() {
  const handleClose = () => {
    router.back();
  };

  const handleStartTrial = () => {
    // TODO: Implement subscription flow
    logger.log("Start trial");
    router.back();
  };

  const handleSkip = () => {
    router.back();
  };

  const features = [
    { label: "Learning content", freeIncluded: true, premiumIncluded: true },
    { label: "Offline learning", freeIncluded: false, premiumIncluded: true },
    { label: "Premium content", freeIncluded: false, premiumIncluded: true },
    { label: "Unlimited Chatbot Access", freeIncluded: false, premiumIncluded: true },
    { label: "Ad-free experience", freeIncluded: false, premiumIncluded: true },
    { label: "Priority support", freeIncluded: false, premiumIncluded: true },
    { label: "Advanced analytics", freeIncluded: false, premiumIncluded: true },
  ];

  return (
    <SafeAreaView style={tw`flex-1 bg-cream-100`} edges={["top", "bottom"]}>
      {/* Header */}
      <View style={tw`px-6 pt-4 flex-row justify-end`}>
        <TouchableOpacity onPress={handleClose}>
          <CloseIcon />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={tw`flex-1`}
        contentContainerStyle={tw`px-6 pb-6`}
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <View style={tw`py-6`}>
          <AppText style={tw`text-2xl font-bold text-neutral-900`}>
            Elevate your English learning{"\n"}experience with
          </AppText>
        </View>

        {/* Comparison Table */}
        <View style={tw`bg-white rounded-2xl px-4 shadow-sm`}>
          {/* Table Header */}
          <View style={tw`flex-row items-center py-4 border-b border-neutral-100`}>
            <View style={tw`flex-1`} />
            <View style={tw`w-20 items-center`}>
              <AppText style={tw`text-base font-semibold text-neutral-900`}>FREE</AppText>
            </View>
            <View style={tw`w-24 items-center`}>
              <View style={tw`flex-row items-center bg-primary-50 px-3 py-1.5 rounded-full`}>
                <AppText style={tw`text-base font-semibold text-primary-600 mr-1`}>Premium</AppText>
                <CrownIcon />
              </View>
            </View>
          </View>

          {/* Feature Rows */}
          {features.map((feature, index) => (
            <FeatureRow key={index} {...feature} />
          ))}
        </View>

        {/* Benefits Section */}
        <View style={tw`mt-8`}>
          <AppText style={tw`text-lg font-bold text-neutral-900 mb-4`}>Why go Premium?</AppText>
          
          <View style={tw`gap-3`}>
            <View style={tw`flex-row items-start gap-3`}>
              <View style={tw`w-8 h-8 rounded-full bg-primary-100 items-center justify-center`}>
                <AppText>🚀</AppText>
              </View>
              <View style={tw`flex-1`}>
                <AppText style={tw`text-base font-medium text-neutral-900`}>Learn faster</AppText>
                <AppText style={tw`text-sm text-neutral-500`}>
                  Access premium lessons and accelerate your progress
                </AppText>
              </View>
            </View>

            <View style={tw`flex-row items-start gap-3`}>
              <View style={tw`w-8 h-8 rounded-full bg-amber-100 items-center justify-center`}>
                <AppText>💬</AppText>
              </View>
              <View style={tw`flex-1`}>
                <AppText style={tw`text-base font-medium text-neutral-900`}>Unlimited AI practice</AppText>
                <AppText style={tw`text-sm text-neutral-500`}>
                  Practice conversations anytime with our AI tutor
                </AppText>
              </View>
            </View>

            <View style={tw`flex-row items-start gap-3`}>
              <View style={tw`w-8 h-8 rounded-full bg-blue-100 items-center justify-center`}>
                <AppText>📱</AppText>
              </View>
              <View style={tw`flex-1`}>
                <AppText style={tw`text-base font-medium text-neutral-900`}>Learn offline</AppText>
                <AppText style={tw`text-sm text-neutral-500`}>
                  Download lessons and practice without internet
                </AppText>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Actions */}
      <View style={tw`px-6 pb-4 pt-2`}>
        <Button onPress={handleStartTrial}>Try 7 days for free</Button>
        <TouchableOpacity onPress={handleSkip} style={tw`py-3 items-center`}>
          <AppText style={tw`text-base text-neutral-600 font-medium`}>Skip</AppText>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

