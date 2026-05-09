import { AppText, Button } from "@/components/ui";
import tw from "@/lib/tw";
import { router } from "expo-router";
import { useState, useMemo } from "react";
import { FlatList, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { Alert } from "@/utils/alert";
import { useUserCurrent, useUpdatePreferences } from "@/hooks/useSettings";
import { NATIONALITY_OPTIONS } from "@/constants/settings-options";

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

export default function NationalityScreen() {
  const insets = useSafeAreaInsets();
  const { data: me } = useUserCurrent();
  const mutation = useUpdatePreferences();

  const initialId = useMemo(() => {
    const saved = me?.profile?.nationality;
    if (!saved) return '';
    // Match by name (stored as name string) or id
    const match = NATIONALITY_OPTIONS.find(
      (n) => n.name === saved || n.id === saved
    );
    return match?.id ?? '';
  }, [me]);

  const [selected, setSelected] = useState<string>(initialId);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return NATIONALITY_OPTIONS;
    return NATIONALITY_OPTIONS.filter(
      (n) => n.name.toLowerCase().includes(q) || n.native.toLowerCase().includes(q)
    );
  }, [search]);

  const handleDone = async () => {
    const nation = NATIONALITY_OPTIONS.find((n) => n.id === selected);
    if (!nation) {
      Alert.alert("Select nationality", "Please select your nationality before continuing.");
      return;
    }
    try {
      // Save nationality by display name to stay consistent with how the server stores it
      await mutation.mutateAsync({ nationality: nation.name });
      router.back();
    } catch {
      Alert.alert("Error", "Could not save your nationality. Please try again.");
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
          What's your nationality?
        </AppText>
      </View>

      {/* Search */}
      <View style={tw`px-6 pb-4`}>
        <View style={tw`flex-row items-center bg-neutral-100 dark:bg-neutral-800 rounded-xl px-4 py-3`}>
          <TextInput
            placeholder="Search…"
            value={search}
            onChangeText={setSearch}
            placeholderTextColor="#a3a3a3"
            style={tw`flex-1 text-base text-neutral-900 dark:text-white`}
          />
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={tw`px-6 pb-6`}
        renderItem={({ item }) => {
          const isSelected = selected === item.id;
          return (
            <TouchableOpacity
              onPress={() => setSelected(item.id)}
              style={tw`flex-row items-center justify-between p-4 mb-3 rounded-2xl border ${
                isSelected
                  ? "border-green-400 dark:border-green-500 bg-green-50/50 dark:bg-green-900/30"
                  : "border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800"
              }`}
            >
              <View style={tw`flex-row items-center gap-3`}>
                <AppText style={tw`text-xl`}>{item.flag}</AppText>
                <AppText style={tw`text-base text-neutral-900 dark:text-white font-medium`}>
                  {item.name}
                </AppText>
              </View>
              <AppText style={tw`text-base text-neutral-600 dark:text-neutral-400`}>
                {item.native}
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
