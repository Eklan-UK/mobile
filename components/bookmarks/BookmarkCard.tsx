import { AppText, BoldText } from "@/components/ui";
import tw from "@/lib/tw";
import type { LearnerBookmark } from "@/types/bookmark.types";
import { brandColors } from "@/constants/theme-tokens";
import { useSemanticTheme } from "@/hooks/useSemanticTheme";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { TouchableOpacity, View } from "react-native";
import { deleteBookmark } from "@/services/bookmark.service";
import { getDrillById } from "@/services/drill.service";
import { navigateToDrill } from "@/utils/drillNavigation";
import { logger } from "@/utils/logger";
import { Alert } from "@/utils/alert";

interface BookmarkCardProps {
  bookmark: LearnerBookmark;
  onDeleted: (id: string) => void;
}

function formatShortDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString();
}

export default function BookmarkCard({ bookmark, onDeleted }: BookmarkCardProps) {
  const { colors: c, isDark } = useSemanticTheme();
  const isSentence = bookmark.type === "sentence";
  const chipBg = isSentence ? "rgba(16, 185, 129, 0.12)" : "rgba(34, 197, 94, 0.12)";
  const chipText = isSentence ? "#059669" : brandColors.primaryDark;

  const openPractice = () => {
    router.push(`/practice/bookmark/${bookmark._id}` as any);
  };

  const onGoToDrill = async () => {
    try {
      const drill = await getDrillById(bookmark.drillId);
      navigateToDrill(drill);
    } catch (e) {
      logger.error("BookmarkCard: go to drill failed", e);
      Alert.alert("Unavailable", "Could not open this drill. It may have been removed.");
    }
  };

  const onDelete = () => {
    Alert.alert(
      "Remove bookmark",
      `Remove "${bookmark.content.slice(0, 80)}${bookmark.content.length > 80 ? "…" : ""}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteBookmark(bookmark._id);
              onDeleted(bookmark._id);
            } catch (err) {
              logger.error("delete bookmark", err);
              Alert.alert("Error", "Could not remove this bookmark.");
            }
          },
        },
      ]
    );
  };

  return (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={openPractice}
      style={[
        tw`rounded-2xl border p-4 mb-4`,
        {
          backgroundColor: c.card,
          borderColor: c.border,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: isDark ? 0.35 : 0.06,
          shadowRadius: 6,
          elevation: 2,
        },
      ]}
    >
      <View style={tw`flex-row items-start justify-between mb-3`}>
        <View style={tw`flex-row items-center flex-1 pr-2`}>
          <View
            style={[
              tw`w-9 h-9 rounded-full items-center justify-center mr-2`,
              { backgroundColor: chipBg },
            ]}
          >
            <Ionicons
              name={isSentence ? "chatbubble-ellipses-outline" : "document-text-outline"}
              size={18}
              color={chipText}
            />
          </View>
          <View style={[tw`px-2.5 py-1 rounded-full`, { backgroundColor: chipBg }]}>
            <AppText style={[tw`text-xs font-semibold`, { color: chipText }]}>
              {isSentence ? "Sentence" : "Word"}
            </AppText>
          </View>
        </View>
        <View style={tw`flex-row items-center`}>
          <Ionicons name="calendar-outline" size={12} color={c.textLight} />
          <AppText style={[tw`text-[10px] ml-1`, { color: c.textLight }]}>
            {formatShortDate(bookmark.createdAt)}
          </AppText>
        </View>
      </View>

      <BoldText
        numberOfLines={1}
        style={[tw`text-lg mb-1`, { color: c.textPrimary }]}
      >
        {bookmark.content}
      </BoldText>
      {bookmark.translation ? (
        <AppText
          numberOfLines={2}
          style={[tw`text-sm mb-4`, { color: c.textSecondary }]}
        >
          {bookmark.translation}
        </AppText>
      ) : (
        <View style={tw`mb-4`} />
      )}

      <View style={tw`flex-row items-center justify-between pt-1`}>
        <View style={tw`flex-row items-center gap-4`}>
          <TouchableOpacity onPress={onDelete} hitSlop={10} accessibilityLabel="Delete bookmark">
            <Ionicons name="trash-outline" size={22} color={c.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onGoToDrill}
            hitSlop={10}
            style={tw`flex-row items-center gap-1`}
            accessibilityLabel="Go to drill"
          >
            <AppText style={[tw`text-sm`, { color: c.textSecondary }]}>Go to Drill</AppText>
            <Ionicons name="book-outline" size={18} color={c.textSecondary} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          onPress={openPractice}
          style={[
            tw`flex-row items-center px-4 py-2 rounded-full`,
            { backgroundColor: isDark ? brandColors.primary : brandColors.primaryDark },
          ]}
          activeOpacity={0.85}
        >
          <AppText style={tw`text-white text-sm font-semibold mr-1`}>Practice</AppText>
          <Ionicons name="arrow-forward" size={16} color="#fff" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}
