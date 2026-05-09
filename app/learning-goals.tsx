import { AppText, Button } from "@/components/ui";
import tw from "@/lib/tw";
import { router } from "expo-router";
import { useState, useMemo } from "react";
import { FlatList, TouchableOpacity, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { Alert } from "@/utils/alert";
import { useUserCurrent, useUpdatePreferences } from "@/hooks/useSettings";
import { LEARNING_GOAL_ITEMS } from "@/constants/settings-options";

function BackIcon() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M19 12H5M12 19l-7-7 7-7"
        stroke={tw.prefixMatch('dark') ? "#F9FAFB" : "#171717"}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export default function LearningGoalsScreen() {
  const insets = useSafeAreaInsets();
  const { data: me } = useUserCurrent();
  const mutation = useUpdatePreferences();

  const initialGoal = useMemo(() => {
    return (
      me?.profile?.learningGoal ??
      me?.profile?.learningGoals?.[0] ??
      ''
    );
  }, [me]);

  const [selected, setSelected] = useState<string>(initialGoal);

  const handleDone = async () => {
    if (!selected) {
      Alert.alert("Select a goal", "Please select a learning goal before continuing.");
      return;
    }
    try {
      // §8.5: send both learningGoal and learningGoals
      await mutation.mutateAsync({
        learningGoal: selected,
        learningGoals: [selected],
      });
      router.back();
    } catch {
      Alert.alert("Error", "Could not save your learning goal. Please try again.");
    }
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-white dark:bg-neutral-900`} edges={["top"]}>
      {/* Header */}
      <View style={tw`px-6 pt-4 pb-2 flex-row items-center`}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={tw`w-10 h-10 rounded-full border border-neutral-200 dark:border-neutral-700 items-center justify-center`}
        >
          <BackIcon />
        </TouchableOpacity>
      </View>

      <View style={tw`px-6 pt-2 pb-4`}>
        <AppText style={tw`text-2xl font-bold text-neutral-900 dark:text-white`}>
          Why are you learning English?
        </AppText>
      </View>

      <FlatList
        data={LEARNING_GOAL_ITEMS}
        keyExtractor={(item) => item.id}
        contentContainerStyle={tw`px-6 pb-6`}
        renderItem={({ item }) => {
          const isSelected = selected === item.id;
          return (
            <TouchableOpacity
              onPress={() => setSelected(item.id)}
              style={tw`flex-row items-center p-5 mb-4 rounded-[24px] border ${
                isSelected
                  ? "border-green-400 dark:border-green-500 bg-green-50/50 dark:bg-green-900/30"
                  : "border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800"
              }`}
            >
              <AppText style={tw`text-2xl mr-4`}>{item.icon}</AppText>
              <AppText style={tw`text-base text-neutral-900 dark:text-white font-medium flex-1`}>
                {item.text}
              </AppText>
            </TouchableOpacity>
          );
        }}
      />

      {/* Footer */}
      <View
        style={[
          tw`px-6 pt-4 bg-white dark:bg-neutral-900 border-t border-neutral-100 dark:border-neutral-800`,
          { paddingBottom: Math.max(insets.bottom, 16) },
        ]}
      >
        <Button onPress={handleDone} loading={mutation.isPending} disabled={!selected}>
          Done
        </Button>
      </View>
    </SafeAreaView>
  );
}
