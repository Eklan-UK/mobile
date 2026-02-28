import { AppText } from "@/components/ui";
import tw from "@/lib/tw";
import { Tabs } from "expo-router";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import HomeIcon from "@/assets/icons/home.svg";
import HomeFillIcon from "@/assets/icons/home-fill.svg";
import PracticeIcon from "@/assets/icons/practice.svg";
import TargetArrowIcon from "@/assets/icons/target-arrow.svg";
import ProfileIcon from "@/assets/icons/profile.svg";
import ProfileActiveIcon from "@/assets/icons/user-fill.svg";
import PracticeActiveIcon from "@/assets/icons/practice-grey.svg";
import TargetArrowActiveIcon from "@/assets/icons/target-arrow-green.svg";


function TabIcon({
  icon: Icon,
  focusedIcon: FocusedIcon,
  label,
  focused,
}: {
  icon: any;
  focusedIcon?: any;
  label: string;
  focused: boolean;
}) {
  const IconComponent = focused && FocusedIcon ? FocusedIcon : Icon;
  
  return (
    <View style={tw`items-center justify-center min-w-16 pt-3 gap-1.5`}>
      <IconComponent 
        width={24} 
        height={24} 
        // color={focused ? "#166534" : "none"}
        // stroke={focused ? "#166534" : "none"} // Attempt to stroke if supported
      />
      <AppText
        style={tw`text-xs ${
          focused ? "text-green-800 font-medium" : "text-neutral-400"
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

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#ffffff",
          borderTopWidth: 1,
          borderTopColor: "#F3F4F6",
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
          title: "Home",
          tabBarIcon: ({ focused }) => (
            <TabIcon 
              icon={HomeIcon} 
              focusedIcon={HomeFillIcon} 
              label="Home" 
              focused={focused} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="practice"
        options={{
          title: "",
          tabBarIcon: ({ focused }) => (
            <TabIcon focusedIcon={PracticeIcon} icon={PracticeActiveIcon} label="Practice" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="plan"
        options={{
            title: "My Plan",
          tabBarIcon: ({ focused }) => (
            <TabIcon icon={TargetArrowIcon} focusedIcon={TargetArrowActiveIcon} label="My Plan" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
            title: "Profile",
          tabBarIcon: ({ focused }) => (
            <TabIcon icon={ProfileIcon} focusedIcon={ProfileActiveIcon} label="Profile" focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
