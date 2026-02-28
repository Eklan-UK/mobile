import { AppText, BoldText, Button } from "@/components/ui";
import tw from "@/lib/tw";
import { router } from "expo-router";
import { useState } from "react";
import { TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Path } from "react-native-svg";

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

function SystemIcon() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={9} stroke="#171717" strokeWidth={2} />
      <Path d="M12 3v18" stroke="#171717" strokeWidth={2} />
      <Path d="M12 3a9 9 0 000 18" fill="#171717" />
    </Svg>
  );
}

function LightIcon() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={5} stroke="#737373" strokeWidth={2} />
      <Path
        d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"
        stroke="#737373"
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function DarkIcon() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"
        stroke="#737373"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// Theme Option Component
function ThemeOption({
  icon,
  label,
  selected,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={tw`flex-1 items-center py-4 rounded-xl mx-1 ${
        selected ? "bg-white border-2 border-primary-500" : "bg-neutral-100 border-2 border-transparent"
      }`}
    >
      <View style={tw`mb-2`}>{icon}</View>
      <AppText
        style={tw`text-sm font-medium ${
          selected ? "text-primary-600" : "text-neutral-600"
        }`}
      >
        {label}
      </AppText>
    </TouchableOpacity>
  );
}

export default function ThemeSettingsScreen() {
  const [selectedTheme, setSelectedTheme] = useState<"system" | "light" | "dark">("system");
  const [loading, setLoading] = useState(false);

  const handleBack = () => {
    router.back();
  };

  const handleSave = async () => {
    setLoading(true);
    // TODO: Save theme preference
    await new Promise((resolve) => setTimeout(resolve, 500));
    setLoading(false);
    router.back();
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-cream-100`} edges={["top", "bottom"]}>
      {/* Header */}
      <View style={tw`px-6 pt-4 pb-4 flex-row items-center gap-4`}>
        <TouchableOpacity onPress={handleBack}>
          <BackIcon />
        </TouchableOpacity>
        <AppText style={tw`text-xl font-bold text-neutral-900`}>Theme</AppText>
      </View>

      <View style={tw`flex-1 px-6`}>
        {/* Theme Card */}
        <View style={tw`bg-white rounded-2xl p-6 shadow-sm`}>
          <AppText style={tw`text-lg font-bold text-neutral-900 mb-2`}>Theme setting</AppText>
          <AppText style={tw`text-sm text-neutral-500 mb-6`}>
            Theme colour{"\n"}Turn on dark mode or let eklan visually match your device settings
          </AppText>

          {/* Theme Options */}
          <View style={tw`flex-row mb-6`}>
            <ThemeOption
              icon={<SystemIcon />}
              label="System"
              selected={selectedTheme === "system"}
              onPress={() => setSelectedTheme("system")}
            />
            <ThemeOption
              icon={<LightIcon />}
              label="Light"
              selected={selectedTheme === "light"}
              onPress={() => setSelectedTheme("light")}
            />
            <ThemeOption
              icon={<DarkIcon />}
              label="Dark"
              selected={selectedTheme === "dark"}
              onPress={() => setSelectedTheme("dark")}
            />
          </View>

          {/* Save Button */}
          <Button onPress={handleSave} loading={loading}>
            Save settings
          </Button>
        </View>

        {/* Info */}
        <View style={tw`mt-6 bg-blue-50 rounded-xl p-4 border border-blue-200`}>
          <View style={tw`flex-row items-start gap-3`}>
            <AppText style={tw`text-lg`}>💡</AppText>
            <View style={tw`flex-1`}>
              <AppText style={tw`text-sm text-blue-800`}>
                <AppText style={tw`font-bold`}>System</AppText> automatically switches between light and dark mode based on your device settings.
              </AppText>
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

