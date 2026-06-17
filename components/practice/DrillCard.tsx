import ArrowRotate from "@/assets/icons/arrow-rotate.svg";
import { DrillBookmarkToggle } from "@/components/practice/DrillBookmarkToggle";
import { AppText } from "@/components/ui";
import tw from "@/lib/tw";
import { useSemanticTheme } from "@/hooks/useSemanticTheme";
import { Drill, getDrillCategory, getEstimatedTime } from "@/types/drill.types";
import { Ionicons } from "@expo/vector-icons";
import { Image, TouchableOpacity, View } from "react-native";

interface DrillCardProps {
  drill: Drill;
  onPress: (drill: Drill) => void;
  locked?: boolean;
  isCompleted?: boolean;
  thumbnail?: any;
  /** When set, shows bookmark toggle (does not navigate on tap). */
  drillId?: string;
  hasBookmarks?: boolean;
  showBookmark?: boolean;
  /** When true, shows an "In progress" pill on the card. */
  isInProgress?: boolean;
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
  thumbnail,
  drillId,
  hasBookmarks = false,
  showBookmark = false,
  isInProgress = false,
}: DrillCardProps) {
  const { colors: c } = useSemanticTheme();
  const category = getDrillCategory(drill.type);
  const estimatedTime = getEstimatedTime(drill.type);
  const categoryColor = getCategoryColor(category);
  const bookmarkDrillId = drillId ?? drill._id;

  return (
    <View
      style={[
        tw`rounded-2xl mb-3 flex-row items-center p-3`,
        {
          backgroundColor: c.card,
          borderColor: c.border,
          borderWidth: 1,
          opacity: locked ? 0.85 : 1,
        },
      ]}
    >
      <TouchableOpacity
        onPress={() => onPress(drill)}
        style={tw`flex-1 flex-row items-center`}
        activeOpacity={0.7}
      >
        {/* Thumbnail */}
        <View
          style={[
            tw`w-16 h-16 rounded-xl overflow-hidden mr-3`,
            { backgroundColor: c.muted },
          ]}
        >
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
          <AppText style={[tw`text-base font-semibold mb-1`, { color: c.textPrimary }]}>
            {drill.title}
          </AppText>
          {isInProgress ? (
            <View
              style={tw`self-start mb-1 px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40`}
            >
              <AppText style={tw`text-xs font-semibold text-blue-800 dark:text-blue-200`}>
                In progress
              </AppText>
            </View>
          ) : null}
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
            <Ionicons name="time-outline" size={14} color={c.textLight} />
            <AppText style={[tw`text-sm`, { color: c.textSecondary }]}>{estimatedTime}</AppText>
          </View>
        </View>
      </TouchableOpacity>

      {/* Trailing: bookmark + status icon */}
      <View style={tw`flex-row items-center gap-2 ml-2`}>
        {showBookmark && bookmarkDrillId ? (
          <DrillBookmarkToggle drillId={bookmarkDrillId} hasBookmarks={hasBookmarks} />
        ) : null}
        {locked ? (
          <Ionicons name="lock-closed" size={20} color={c.textLight} />
        ) : isCompleted ? (
          <ArrowRotate width={20} height={20} />
        ) : (
          <Ionicons name="chevron-forward" size={20} color={c.textLight} />
        )}
      </View>
    </View>
  );
}
