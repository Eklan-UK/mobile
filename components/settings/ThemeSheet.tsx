import React, { useCallback, useState, useEffect } from "react";
import { View, TouchableOpacity, useColorScheme } from "react-native";
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetView } from "@gorhom/bottom-sheet";
import tw from "@/lib/tw";
import { AppText, Button } from "@/components/ui";
import Svg, { Circle, Path } from "react-native-svg";
import { useThemeStore } from "@/store/theme-store";
import * as Updates from "expo-updates";

// Helper hook to get the effective theme (reactive)
function useEffectiveTheme() {
  const { theme } = useThemeStore();
  const systemColorScheme = useColorScheme();
  return theme === "system" ? (systemColorScheme || "light") : theme;
}

function CloseIcon({ size = 24 }: { size?: number }) {
  const isDark = useEffectiveTheme() === "dark";
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M18 6L6 18M6 6l12 12"
        stroke={isDark ? "#F9FAFB" : "#171717"}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function SystemIcon() {
  const isDark = useEffectiveTheme() === "dark";
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={9} stroke={isDark ? "#F9FAFB" : "#171717"} strokeWidth={2} />
      <Path d="M12 3v18" stroke={isDark ? "#F9FAFB" : "#171717"} strokeWidth={2} />
      <Path d="M12 3a9 9 0 000 18" fill={isDark ? "#F9FAFB" : "#171717"} />
    </Svg>
  );
}

function LightIcon() {
  const isDark = useEffectiveTheme() === "dark";
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={5} stroke={isDark ? "#A3A3A3" : "#737373"} strokeWidth={2} />
      <Path
        d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"
        stroke={isDark ? "#A3A3A3" : "#737373"}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function DarkIcon() {
  const isDark = useEffectiveTheme() === "dark";
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"
        stroke={isDark ? "#A3A3A3" : "#737373"}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

interface ThemeSheetProps {}

export const ThemeSheet = React.forwardRef<BottomSheetModal, ThemeSheetProps>(
  (props, ref) => {
    const snapPoints = React.useMemo(() => ["45%"], []);
    const { theme, setTheme } = useThemeStore();
    const [localTheme, setLocalTheme] = useState(theme);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
      setLocalTheme(theme);
    }, [theme]);

    const renderBackdrop = useCallback(
      (props: any) => (
        <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.5} />
      ),
      []
    );

    const handleSave = async () => {
      const previousTheme = theme;
      setTheme(localTheme);
      handleClose();
      
      // Only reload if theme actually changed
      if (previousTheme !== localTheme) {
        setLoading(true);
        // Small delay to ensure state is saved to AsyncStorage
        setTimeout(async () => {
          try {
            // Reload the app to apply theme changes everywhere
            await Updates.reloadAsync();
          } catch (error) {
            // If reload fails (e.g., in dev mode), just continue
            // The theme will still be saved and apply on next app start
            console.log('Theme saved. App will reload on next start.');
            setLoading(false);
          }
        }, 200);
      }
    };

    const handleOptionSelect = (selectedTheme: typeof theme) => {
      setLocalTheme(selectedTheme);
    };

    const handleClose = () => {
      if (ref && "current" in ref) {
        ref.current?.dismiss();
      }
    };

    return (
      <BottomSheetModal
        ref={ref}
        index={0}
        snapPoints={snapPoints}
        backdropComponent={renderBackdrop}
        handleComponent={null}
        backgroundStyle={tw`bg-white dark:bg-neutral-900 rounded-t-[32px]`}
        onDismiss={() => setLocalTheme(theme)}
      >
        <BottomSheetView style={tw`flex-1 px-6 pt-6 pb-8`}>
          {/* Header */}
          <View style={tw`flex-row items-center justify-between mb-6`}>
            <AppText style={tw`text-[20px] font-bold text-neutral-900 dark:text-white`}>Theme setting</AppText>
            <TouchableOpacity onPress={handleClose} style={tw`w-10 h-10 items-center justify-center rounded-full border border-neutral-100 dark:border-neutral-800`}>
              <CloseIcon size={20} />
            </TouchableOpacity>
          </View>

          {/* Subtitle */}
          <AppText style={tw`text-[15px] font-medium text-neutral-900 dark:text-white mb-1`}>Theme colour</AppText>
          <AppText style={tw`text-sm text-neutral-500 dark:text-neutral-400 mb-6 leading-5`}>
            Turn on dark mode or let eklan visually match your device settings
          </AppText>

          {/* Options */}
          <View style={tw`flex-row gap-3 mb-auto`}>
            {[
              { id: "system", icon: <SystemIcon />, label: "System" },
              { id: "light", icon: <LightIcon />, label: "Light" },
              { id: "dark", icon: <DarkIcon />, label: "Dark" },
            ].map((option) => {
              const selected = localTheme === option.id;
              return (
                <TouchableOpacity
                  key={option.id}
                  onPress={() => handleOptionSelect(option.id as any)}
                  style={tw`flex-1 rounded-2xl p-4 border ${
                    selected ? "border-primary-500 bg-white dark:bg-neutral-900" : "border-transparent bg-[#FAFAFA] dark:bg-neutral-800"
                  }`}
                >
                  <View style={tw`mb-8`}>{option.icon}</View>
                  <AppText style={tw`text-[15px] font-medium ${selected ? "text-neutral-900 dark:text-white" : "text-neutral-500 dark:text-neutral-400"}`}>
                    {option.label}
                  </AppText>
                </TouchableOpacity>
              )
            })}
          </View>

          {/* Save Action */}
          <View style={tw`mt-6`}>
            <Button onPress={handleSave} loading={loading}>
              Save settings
            </Button>
          </View>
        </BottomSheetView>
      </BottomSheetModal>
    );
  }
);
