import { AppText } from "@/components/ui";
import tw from "@/lib/tw";
import { Tabs, useRouter } from "expo-router";
import { View, useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import HomeIcon from "@/assets/icons/home.svg";
import HomeFillIcon from "@/assets/icons/home-fill.svg";
import PracticeIcon from "@/assets/icons/practice.svg";
import TargetArrowIcon from "@/assets/icons/target-arrow.svg";
import ProfileIcon from "@/assets/icons/profile.svg";
import ProfileActiveIcon from "@/assets/icons/user-fill.svg";
import PracticeActiveIcon from "@/assets/icons/practice-grey.svg";
import TargetArrowActiveIcon from "@/assets/icons/target-arrow-green.svg";
import { useThemeStore } from "@/store/theme-store";
import { useTranslation } from "@/contexts/LanguageContext";
import { useIsSubscribed } from "@/hooks/useIsSubscribed";
import { Ionicons } from "@expo/vector-icons";
import { useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuthStore } from "@/store/auth-store";

const NOTIF_PROMPT_SHOWN_KEY = '@notif_prompt_shown';

function TabIcon({
  icon: Icon,
  focusedIcon: FocusedIcon,
  label,
  focused,
  locked = false,
}: {
  icon: any;
  focusedIcon?: any;
  label: string;
  focused: boolean;
  /** Pro-only tab: show lock badge for free users */
  locked?: boolean;
}) {
  const IconComponent = focused && FocusedIcon ? FocusedIcon : Icon;

  return (
    <View style={tw`items-center justify-center min-w-16 pt-3 gap-1.5`}>
      <View style={tw`relative`}>
        <IconComponent width={24} height={24} />
        {locked ? (
          <View
            style={tw`absolute -right-1 -top-0.5 w-[18px] h-[18px] rounded-full bg-green-600 items-center justify-center border-2 border-white dark:border-neutral-900`}
            accessibilityLabel="Locked — Pro only"
          >
            <Ionicons name="lock-closed" size={10} color="#fff" />
          </View>
        ) : null}
      </View>
      <AppText
        style={tw`text-xs ${
          focused ? "text-green-800 dark:text-green-400 font-medium" : "text-neutral-400 dark:text-neutral-500"
        }`}
        numberOfLines={1}
      >
        {label}
      </AppText>
    </View>
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { theme } = useThemeStore();
  const systemColorScheme = useColorScheme();
  const { t } = useTranslation();
  const router = useRouter();
  const isSubscribed = useIsSubscribed();
  const planLocked = !isSubscribed;
  const { isAuthenticated } = useAuthStore();

  // Show the notification permission prompt once, on first authenticated tab visit
  useEffect(() => {
    if (!isAuthenticated) return;
    AsyncStorage.getItem(NOTIF_PROMPT_SHOWN_KEY).then((seen) => {
      if (!seen) {
        AsyncStorage.setItem(NOTIF_PROMPT_SHOWN_KEY, 'true');
        router.push('/notifications-permission');
      }
    });
  }, [isAuthenticated]);

  // Calculate effective theme (reactive - will cause re-render when theme changes)
  const isDark = (theme === "system" ? systemColorScheme : theme) === "dark";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: isDark ? "#171717" : "#ffffff",
          borderTopWidth: 1,
          borderTopColor: isDark ? "#262626" : "#F3F4F6",
          height: 50 + insets.bottom,
          paddingBottom: insets.bottom,
          padding: 14, 
        },
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.home'),
          tabBarIcon: ({ focused }) => (
            <TabIcon 
              icon={HomeIcon} 
              focusedIcon={HomeFillIcon} 
              label={t('tabs.home')} 
              focused={focused} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="practice"
        options={{
          title: t('tabs.practice'),
          tabBarIcon: ({ focused }) => (
            <TabIcon focusedIcon={PracticeIcon} icon={PracticeActiveIcon} label={t('tabs.practice')} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="plan"
        listeners={{
          tabPress: (e) => {
            if (planLocked) {
              e.preventDefault();
              router.push("/premium" as never);
            }
          },
        }}
        options={{
          title: t('tabs.plan'),
          tabBarIcon: ({ focused }) => (
            <TabIcon
              icon={TargetArrowIcon}
              focusedIcon={TargetArrowActiveIcon}
              label={t('tabs.plan')}
              focused={focused}
              locked={planLocked}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile'),
          tabBarIcon: ({ focused }) => (
            <TabIcon icon={ProfileIcon} focusedIcon={ProfileActiveIcon} label={t('tabs.profile')} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
