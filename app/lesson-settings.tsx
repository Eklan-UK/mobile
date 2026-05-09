import { AppText } from "@/components/ui";
import tw from "@/lib/tw";
import { router } from "expo-router";
import { useState, useEffect, useRef, useCallback } from "react";
import { ScrollView, Switch, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { useUserCurrent, useUpdatePreferences } from "@/hooks/useSettings";
import { DEFAULT_LESSON_PREFERENCES } from "@/types/settings";
import {
  ENGLISH_ACCENTS,
  VOICE_TONES,
  SPEAKING_SPEEDS,
} from "@/constants/settings-options";
import type { LessonPreferences } from "@/types/settings";

const DEBOUNCE_MS = 500;

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

function ChevronRight() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 18l6-6-6-6"
        stroke={tw.prefixMatch('dark') ? "#525252" : "#a3a3a3"}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function SettingsToggle({
  label,
  value,
  onValueChange,
  showDivider = true,
}: {
  label: string;
  value: boolean;
  onValueChange: (val: boolean) => void;
  showDivider?: boolean;
}) {
  return (
    <>
      <View style={tw`flex-row items-center justify-between py-4`}>
        <AppText style={tw`text-[15px] text-neutral-600 dark:text-neutral-300`}>{label}</AppText>
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: tw.prefixMatch('dark') ? "#404040" : "#e5e5e5", true: "#4ade80" }}
          thumbColor="#ffffff"
          ios_backgroundColor={tw.prefixMatch('dark') ? "#404040" : "#e5e5e5"}
        />
      </View>
      {showDivider && <View style={tw`h-px bg-neutral-100 dark:bg-neutral-800`} />}
    </>
  );
}

function PickerRow({
  label,
  value,
  options,
  onSelect,
  showDivider = true,
}: {
  label: string;
  value: string;
  options: { id: string; label: string }[];
  onSelect: (id: string) => void;
  showDivider?: boolean;
}) {
  const displayLabel = options.find((o) => o.id === value)?.label ?? value;
  const [open, setOpen] = useState(false);

  return (
    <>
      <TouchableOpacity
        onPress={() => setOpen((v) => !v)}
        style={tw`flex-row items-center justify-between py-5`}
      >
        <AppText style={tw`text-[15px] text-neutral-600 dark:text-neutral-300`}>{label}</AppText>
        <View style={tw`flex-row items-center gap-2`}>
          <AppText style={tw`text-[15px] text-neutral-400 dark:text-neutral-500`}>
            {displayLabel}
          </AppText>
          <ChevronRight />
        </View>
      </TouchableOpacity>

      {open && (
        <View style={tw`mb-2 rounded-xl overflow-hidden border border-neutral-100 dark:border-neutral-800`}>
          {options.map((opt) => {
            const selected = opt.id === value;
            return (
              <TouchableOpacity
                key={opt.id}
                onPress={() => {
                  onSelect(opt.id);
                  setOpen(false);
                }}
                style={tw`flex-row items-center justify-between px-4 py-3 ${
                  selected ? "bg-green-50 dark:bg-green-900/30" : "bg-white dark:bg-neutral-800"
                }`}
              >
                <AppText
                  style={tw`text-[15px] ${
                    selected
                      ? "text-green-600 dark:text-green-400 font-semibold"
                      : "text-neutral-900 dark:text-white"
                  }`}
                >
                  {opt.label}
                </AppText>
                {selected && (
                  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                    <Path d="M20 6L9 17l-5-5" stroke="#22c55e" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
                  </Svg>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {showDivider && <View style={tw`h-px bg-neutral-100 dark:bg-neutral-800`} />}
    </>
  );
}

export default function LessonSettingsScreen() {
  const { data: me } = useUserCurrent();
  const mutation = useUpdatePreferences();

  const serverPrefs: LessonPreferences =
    me?.profile?.lessonPreferences ?? DEFAULT_LESSON_PREFERENCES;

  const [prefs, setPrefs] = useState<LessonPreferences>(serverPrefs);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync when profile loads
  useEffect(() => {
    if (me?.profile?.lessonPreferences) {
      setPrefs(me.profile.lessonPreferences);
    }
  }, [me?.profile?.lessonPreferences]);

  const save = useCallback(
    (patch: Partial<LessonPreferences>) => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        mutation.mutate({ lessonPreferences: patch });
      }, DEBOUNCE_MS);
    },
    [mutation]
  );

  const update = useCallback(
    (patch: Partial<LessonPreferences>) => {
      setPrefs((prev) => {
        const next = { ...prev, ...patch };
        save(patch);
        return next;
      });
    },
    [save]
  );

  return (
    <SafeAreaView style={tw`flex-1 bg-white dark:bg-neutral-900`} edges={["top", "bottom"]}>
      {/* Header */}
      <View style={tw`px-6 pt-4 pb-4 flex-row items-center gap-4`}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={tw`w-10 h-10 rounded-full border border-neutral-200 dark:border-neutral-700 items-center justify-center`}
        >
          <BackIcon />
        </TouchableOpacity>
        <AppText style={tw`text-xl font-bold text-neutral-900 dark:text-white`}>Lesson</AppText>
      </View>

      <ScrollView contentContainerStyle={tw`px-6 pt-4 pb-8`}>
        <SettingsToggle
          label="eklan talks"
          value={prefs.eklanTalks ?? true}
          onValueChange={(v) => update({ eklanTalks: v })}
        />
        <SettingsToggle
          label="Chat translation"
          value={prefs.chatTranslation ?? false}
          onValueChange={(v) => update({ chatTranslation: v })}
        />
        <PickerRow
          label="English type / accent"
          value={prefs.englishAccent ?? 'british'}
          options={ENGLISH_ACCENTS}
          onSelect={(v) => update({ englishAccent: v })}
        />
        <PickerRow
          label="eklan's voice"
          value={prefs.voiceTone ?? 'friendly'}
          options={VOICE_TONES}
          onSelect={(v) => update({ voiceTone: v })}
        />
        <PickerRow
          label="Speaking speed"
          value={prefs.speakingSpeed ?? 'normal'}
          options={SPEAKING_SPEEDS}
          onSelect={(v) => update({ speakingSpeed: v })}
          showDivider={false}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
