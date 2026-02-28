import { AppText, BoldText } from "@/components/ui";
import tw from "@/lib/tw";
import { router } from "expo-router";
import { TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

// Icons
function BackIcon() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M19 12H5M12 19l-7-7 7-7"
        stroke="#171717"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ChevronRightIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 18l6-6-6-6"
        stroke="#a3a3a3"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// Menu Item Component
function MenuItem({
  label,
  onPress,
  showDivider = true,
}: {
  label: string;
  onPress: () => void;
  showDivider?: boolean;
}) {
  return (
    <>
      <TouchableOpacity
        onPress={onPress}
        style={tw`flex-row items-center justify-between py-4`}
      >
        <AppText style={tw`text-base text-neutral-900`}>{label}</AppText>
        <ChevronRightIcon />
      </TouchableOpacity>
      {showDivider && <View style={tw`h-px bg-neutral-100`} />}
    </>
  );
}

export default function HelpScreen() {
  const handleBack = () => {
    router.back();
  };

  const handleFAQ = () => {
    router.push("/faq");
  };

  const handleContactUs = () => {
    router.push("/contact");
  };

  const handleFeedback = () => {
    router.push("/feedback");
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-cream-100`} edges={["top", "bottom"]}>
      {/* Header */}
      <View style={tw`px-6 pt-4 pb-4 flex-row items-center gap-4`}>
        <TouchableOpacity onPress={handleBack}>
          <BackIcon />
        </TouchableOpacity>
        <AppText style={tw`text-xl font-bold text-neutral-900`}>Help & feedback</AppText>
      </View>

      {/* Menu Items */}
      <View style={tw`px-6`}>
        <View style={tw`bg-white rounded-xl px-4`}>
          <MenuItem label="Frequently Asked Questions" onPress={handleFAQ} />
          <MenuItem label="Contact Us" onPress={handleContactUs} />
          <MenuItem label="Feedback" onPress={handleFeedback} showDivider={false} />
        </View>
      </View>

      {/* Support Info */}
      <View style={tw`px-6 mt-8`}>
        <View style={tw`bg-primary-50 rounded-xl p-4 border border-primary-200`}>
          <View style={tw`flex-row items-start gap-3`}>
            <AppText style={tw`text-2xl`}>💬</AppText>
            <View style={tw`flex-1`}>
              <AppText style={tw`text-base font-bold text-primary-800 mb-1`}>
                Need help right away?
              </AppText>
              <AppText style={tw`text-sm text-primary-700`}>
                Our support team is available Monday - Friday, 9am - 6pm (KST).
                We typically respond within 24 hours.
              </AppText>
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

