import ArrowRotate from "@/assets/icons/arrow-rotate.svg";
import { AppText } from "@/components/ui";
import tw from "@/lib/tw";
import { Drill, getDrillCategory, getEstimatedTime } from "@/types/drill.types";
import { Ionicons } from "@expo/vector-icons";
import { Image, TouchableOpacity, View } from "react-native";

interface DrillCardProps {
  drill: Drill;
  onPress: (drill: Drill) => void;
  locked?: boolean;
  isCompleted?: boolean;
  thumbnail?: any;
}

// Category color mapping
const getCategoryColor = (category: string): string => {
  const colors: Record<string, string> = {
    Scenario: "#3b82f6",
    Vocabulary: "#f59e0b",
    Matching: "#8b5cf6",
    Listening: "#06b6d4",
    Reading: "#eab308",
    Grammar: "#ec4899",
    Writing: "#10b981",
    Sentence: "#f59e0b",
    Definition: "#8b5cf6",
  };
  return colors[category] || "#6B7280";
};

export default function DrillCard({ 
  drill, 
  onPress, 
  locked = false, 
  isCompleted = false,
  thumbnail 
}: DrillCardProps) {
  const category = getDrillCategory(drill.type);
  const estimatedTime = getEstimatedTime(drill.type);
  const categoryColor = getCategoryColor(category);

  return (
    <TouchableOpacity
      onPress={() => onPress(drill)}
      disabled={locked}
      style={tw`bg-white rounded-2xl mb-3 flex-row items-center p-3 border border-gray-100`}
      activeOpacity={0.7}
    >
      {/* Thumbnail */}
      <View style={tw`w-16 h-16 rounded-xl overflow-hidden mr-3 bg-gray-100`}>
        {thumbnail ? (
          <Image
            source={thumbnail}
            style={tw`w-full h-full`}
            resizeMode="cover"
          />
        ) : (
          <View style={tw`w-full h-full items-center justify-center`}>
            <AppText style={tw`text-2xl`}>📚</AppText>
          </View>
        )}
      </View>

      {/* Content */}
      <View style={tw`flex-1`}>
        <AppText style={tw`text-base font-semibold text-gray-900 mb-1`}>
          {drill.title}
        </AppText>
        <View style={tw`flex-row items-center gap-2`}>
          <View style={tw`flex-row items-center gap-1`}>
            <View
              style={[
                tw`w-1.5 h-1.5 rounded-full`,
                { backgroundColor: categoryColor },
              ]}
            />
            <AppText
              style={[tw`text-sm font-medium`, { color: categoryColor }]}
            >
              {category}
            </AppText>
          </View>
        </View>
        <View style={tw`flex-row items-center gap-1 mt-1`}>
          <Ionicons name="time-outline" size={14} color="#9CA3AF" />
          <AppText style={tw`text-sm text-gray-500`}>{estimatedTime}</AppText>
        </View>
      </View>

      {/* Right Icon */}
      <View>
        {locked ? (
          <Ionicons name="lock-closed" size={20} color="#9CA3AF" />
        ) : isCompleted ? (
          <ArrowRotate width={20} height={20} />
        ) : (
          <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
        )}
      </View>
    </TouchableOpacity>
  );
}
