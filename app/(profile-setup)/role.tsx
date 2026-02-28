import { AppText, BoldText, Button } from "@/components/ui";
import tw from "@/lib/tw";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { TouchableOpacity, View } from "react-native";
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

const roles = [
  {
    id: "professional",
    name: "Professional",
    icon: "💼",
  },
  {
    id: "student",
    name: "Student",
    icon: "🎓",
  },
  {
    id: "exploring",
    name: "Just exploring",
    icon: "🧭",
  },
];

export default function RoleScreen() {
  const params = useLocalSearchParams<{ name: string }>();
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    if (!selected) return;

    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    setLoading(false);

    router.push({
      pathname: "/(profile-setup)/goals",
      params: { ...params, role: selected },
    });
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-cream-100`} edges={["top", "bottom"]}>
      <View style={tw`flex-1 px-6 pt-8`}>
        {/* Progress: step 2 of 6 */}
        <ProgressDots current={1} total={6} />

        {/* Title */}
        <BoldText style={tw`text-2xl font-bold text-neutral-900 mb-6`}>
          Who will be using Eklan today?
        </BoldText>

        {/* Role Options */}
        <View style={tw`gap-3`}>
          {roles.map((role) => (
            <TouchableOpacity
              key={role.id}
              onPress={() => setSelected(role.id)}
              style={tw`flex-row items-center p-4 rounded-2xl border-2 ${selected === role.id ? "border-primary-500 bg-primary-50" : "border-neutral-200 bg-white"}`}
            >
              <AppText style={tw`text-2xl mr-3`}>{role.icon}</AppText>
              <AppText style={tw`text-base text-neutral-900 font-medium flex-1`}>
                {role.name}
              </AppText>
            </TouchableOpacity>
          ))}
        </View>

        {/* Spacer */}
        <View style={tw`flex-1`} />

        {/* Continue Button */}
        <View style={tw`pb-4`}>
          <Button onPress={handleContinue} loading={loading} disabled={!selected}>
            Continue
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
}
