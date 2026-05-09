import { AppText, Button } from "@/components/ui";
import tw from "@/lib/tw";
import { router } from "expo-router";
import { useState, useMemo, useEffect } from "react";
import { FlatList, TouchableOpacity, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { Alert } from "@/utils/alert";
import { useUserCurrent, useUpdatePreferences } from "@/hooks/useSettings";
import { LANGUAGE_OPTIONS } from "@/constants/settings-options";

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

export default function AppLanguageScreen() {
  const insets = useSafeAreaInsets();
  const { data: me } = useUserCurrent();
  const mutation = useUpdatePreferences();

  // Language is stored on the profile as a display name string (e.g. "Korean")
  const initialName = useMemo(() => {
    const saved = me?.profile?.language;
    if (!saved) return '';
    const match = LANGUAGE_OPTIONS.find((l) => l.name === saved || l.locale === saved);
    return match?.name ?? saved;
  }, [me]);

  const [selected, setSelected] = useState<string>(initialName);

  useEffect(() => {
    if (initialName) setSelected(initialName);
  }, [initialName]);

  const handleDone = async () => {
    if (!selected) {
      Alert.alert("Select language", "Please select a language before continuing.");
      return;
    }
    try {
      // §8.4: save the display name, not the locale code
      await mutation.mutateAsync({ language: selected });
      // #region agent log
      fetch("http://127.0.0.1:7624/ingest/74037ddc-a470-40c1-9b13-02763f9ac390", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "83f2a9" },
        body: JSON.stringify({
          sessionId: "83f2a9",
          location: "app-language.tsx:handleDone",
          message: "language preference mutateAsync resolved",
          data: { selectedDisplayName: selected },
          timestamp: Date.now(),
          hypothesisId: "H2",
        }),
      }).catch(() => {});
      // #endregion
      router.back();
    } catch {
      // #region agent log
      fetch("http://127.0.0.1:7624/ingest/74037ddc-a470-40c1-9b13-02763f9ac390", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "83f2a9" },
        body: JSON.stringify({
          sessionId: "83f2a9",
          location: "app-language.tsx:handleDone",
          message: "language preference mutateAsync rejected",
          data: {},
          timestamp: Date.now(),
          hypothesisId: "H2",
        }),
      }).catch(() => {});
      // #endregion
      Alert.alert("Error", "Could not save your language preference. Please try again.");
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
          What language should the app use?
        </AppText>
      </View>

      <FlatList
        data={LANGUAGE_OPTIONS}
        keyExtractor={(item) => item.locale}
        contentContainerStyle={tw`px-6 pb-6`}
        renderItem={({ item }) => {
          const isSelected = selected === item.name;
          return (
            <TouchableOpacity
              onPress={() => setSelected(item.name)}
              style={tw`flex-row items-center justify-between p-5 mb-3 rounded-[24px] border ${
                isSelected
                  ? "border-green-400 dark:border-green-500 bg-green-50/50 dark:bg-green-900/30"
                  : "border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800"
              }`}
            >
              <AppText style={tw`text-base text-neutral-900 dark:text-white font-medium`}>
                {item.name}
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
