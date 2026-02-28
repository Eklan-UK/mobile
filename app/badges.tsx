import { AppText, BoldText } from "@/components/ui";
import tw from "@/lib/tw";
import { router } from "expo-router";
import { ScrollView, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path, Rect } from "react-native-svg";

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

function LockIcon() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Rect
        x={5}
        y={11}
        width={14}
        height={10}
        rx={2}
        stroke="#525252"
        strokeWidth={2}
      />
      <Path
        d="M7 11V7a5 5 0 0110 0v4"
        stroke="#525252"
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

// Badge data with colors and icons
const badgesData = [
  // Row 1 - Unlocked
  {
    id: 1,
    icon: "🌟",
    color: "bg-green-100",
    borderColor: "border-green-500",
    unlocked: true,
    name: "First Steps",
  },
  {
    id: 2,
    icon: "🏆",
    color: "bg-orange-100",
    borderColor: "border-orange-500",
    unlocked: true,
    name: "Champion",
  },
  {
    id: 3,
    icon: "🔔",
    color: "bg-blue-100",
    borderColor: "border-blue-500",
    unlocked: true,
    name: "Notification Pro",
  },
  {
    id: 4,
    icon: "🎯",
    color: "bg-orange-200",
    borderColor: "border-orange-400",
    unlocked: false,
    name: "Goal Setter",
  },
  {
    id: 5,
    icon: "💎",
    color: "bg-primary-100",
    borderColor: "border-primary-500",
    unlocked: false,
    name: "Diamond",
  },
  // Row 2 - Mostly locked
  {
    id: 6,
    icon: "⚡",
    color: "bg-yellow-100",
    borderColor: "border-yellow-500",
    unlocked: false,
    name: "Lightning",
  },
  {
    id: 7,
    icon: "🌊",
    color: "bg-blue-200",
    borderColor: "border-blue-400",
    unlocked: false,
    name: "Wave Master",
  },
  {
    id: 8,
    icon: "🎨",
    color: "bg-cyan-100",
    borderColor: "border-cyan-500",
    unlocked: false,
    name: "Creative",
  },
  {
    id: 9,
    icon: "🚀",
    color: "bg-teal-100",
    borderColor: "border-teal-500",
    unlocked: false,
    name: "Rocket",
  },
  {
    id: 10,
    icon: "🌈",
    color: "bg-sky-100",
    borderColor: "border-sky-500",
    unlocked: false,
    name: "Rainbow",
  },
  // Row 3
  {
    id: 11,
    icon: "🎭",
    color: "bg-indigo-100",
    borderColor: "border-indigo-500",
    unlocked: false,
    name: "Theater",
  },
  {
    id: 12,
    icon: "🎪",
    color: "bg-violet-100",
    borderColor: "border-violet-500",
    unlocked: false,
    name: "Circus",
  },
  {
    id: 13,
    icon: "🎢",
    color: "bg-primary-200",
    borderColor: "border-primary-400",
    unlocked: false,
    name: "Adventure",
  },
  {
    id: 14,
    icon: "🎠",
    color: "bg-fuchsia-100",
    borderColor: "border-fuchsia-500",
    unlocked: false,
    name: "Carousel",
  },
  {
    id: 15,
    icon: "🎡",
    color: "bg-pink-100",
    borderColor: "border-pink-500",
    unlocked: false,
    name: "Ferris Wheel",
  },
  // Row 4
  {
    id: 16,
    icon: "🌸",
    color: "bg-rose-100",
    borderColor: "border-rose-500",
    unlocked: false,
    name: "Blossom",
  },
  {
    id: 17,
    icon: "🌺",
    color: "bg-red-100",
    borderColor: "border-red-500",
    unlocked: false,
    name: "Hibiscus",
  },
  {
    id: 18,
    icon: "🌻",
    color: "bg-amber-100",
    borderColor: "border-amber-500",
    unlocked: false,
    name: "Sunflower",
  },
  {
    id: 19,
    icon: "🌼",
    color: "bg-lime-100",
    borderColor: "border-lime-500",
    unlocked: false,
    name: "Daisy",
  },
  {
    id: 20,
    icon: "🌷",
    color: "bg-emerald-100",
    borderColor: "border-emerald-500",
    unlocked: false,
    name: "Tulip",
  },
  // Row 5
  {
    id: 21,
    icon: "🍀",
    color: "bg-green-200",
    borderColor: "border-green-400",
    unlocked: false,
    name: "Lucky",
  },
  {
    id: 22,
    icon: "🌿",
    color: "bg-teal-200",
    borderColor: "border-teal-400",
    unlocked: false,
    name: "Nature",
  },
  {
    id: 23,
    icon: "🍃",
    color: "bg-cyan-200",
    borderColor: "border-cyan-400",
    unlocked: false,
    name: "Leaf",
  },
  {
    id: 24,
    icon: "🌱",
    color: "bg-primary-100",
    borderColor: "border-primary-500",
    unlocked: true,
    name: "Sprout",
  },
  {
    id: 25,
    icon: "🌴",
    color: "bg-blue-300",
    borderColor: "border-blue-500",
    unlocked: false,
    name: "Palm",
  },
  // Row 6
  {
    id: 26,
    icon: "🌵",
    color: "bg-green-300",
    borderColor: "border-green-600",
    unlocked: false,
    name: "Cactus",
  },
  {
    id: 27,
    icon: "🌾",
    color: "bg-yellow-200",
    borderColor: "border-yellow-600",
    unlocked: false,
    name: "Wheat",
  },
  {
    id: 28,
    icon: "🍁",
    color: "bg-orange-300",
    borderColor: "border-orange-600",
    unlocked: false,
    name: "Maple",
  },
  {
    id: 29,
    icon: "🍂",
    color: "bg-amber-200",
    borderColor: "border-amber-600",
    unlocked: false,
    name: "Autumn",
  },
  {
    id: 30,
    icon: "🌲",
    color: "bg-emerald-200",
    borderColor: "border-emerald-600",
    unlocked: false,
    name: "Pine",
  },
];

// Badge Component
function BadgeItem({
  icon,
  color,
  borderColor,
  unlocked,
}: {
  icon: string;
  color: string;
  borderColor: string;
  unlocked: boolean;
}) {
  return (
    <View style={tw`items-center mb-4`}>
      <View
        style={tw`w-16 h-16 rounded-2xl ${unlocked ? `${color} border-2 ${borderColor}` : "bg-neutral-100"
          } items-center justify-center shadow-sm`}
      >
        {unlocked ? (
          <AppText style={tw`text-3xl`}>{icon}</AppText>
        ) : (
          <View style={tw`opacity-50`}>
            <LockIcon />
          </View>
        )}
      </View>
    </View>
  );
}

export default function BadgesScreen() {
  const handleBack = () => {
    router.back();
  };

  // Calculate stats
  const totalBadges = badgesData.length;
  const unlockedBadges = badgesData.filter((b) => b.unlocked).length;

  return (
    <SafeAreaView style={tw`flex-1 bg-cream-100`} edges={["top", "bottom"]}>
      {/* Header */}
      <View style={tw`px-6 pt-4 pb-4 flex-row items-center`}>
        <TouchableOpacity onPress={handleBack}>
          <BackIcon />
        </TouchableOpacity>
        <AppText style={tw`flex-1 text-center text-xl font-bold text-neutral-900`}>
          Badges
        </AppText>
        <View style={tw`w-6`} />
      </View>

      {/* Stats */}
      <View style={tw`px-6 pb-4`}>
        <AppText style={tw`text-sm text-neutral-500 text-center`}>
          {unlockedBadges} of {totalBadges} badges unlocked
        </AppText>
      </View>

      <ScrollView
        style={tw`flex-1`}
        contentContainerStyle={tw`px-6 pb-6`}
        showsVerticalScrollIndicator={false}
      >
        {/* Badge Grid */}
        <View style={tw`flex-row flex-wrap justify-between`}>
          {badgesData.map((badge) => (
            <View key={badge.id} style={tw`w-[20%] mb-2`}>
              <BadgeItem
                icon={badge.icon}
                color={badge.color}
                borderColor={badge.borderColor}
                unlocked={badge.unlocked}
              />
            </View>
          ))}
        </View>

        {/* Info Card */}
        <View
          style={tw`bg-primary-50 rounded-xl px-4 py-4 mt-4 border border-primary-200`}
        >
          <View style={tw`flex-row items-start`}>
            <AppText style={tw`text-primary-500 mr-2 text-lg`}>💡</AppText>
            <View style={tw`flex-1`}>
              <AppText style={tw`text-primary-800 font-bold mb-1`}>
                How to unlock badges?
              </AppText>
              <AppText style={tw`text-primary-700 text-sm`}>
                Complete daily lessons, maintain streaks, and achieve milestones
                to unlock new badges and showcase your progress!
              </AppText>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
