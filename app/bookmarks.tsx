import BookmarkCard from "@/components/bookmarks/BookmarkCard";
import { AppText, BoldText } from "@/components/ui";
import tw from "@/lib/tw";
import { brandColors } from "@/constants/theme-tokens";
import { useSemanticTheme } from "@/hooks/useSemanticTheme";
import { getWordAndSentenceBookmarks } from "@/services/bookmark.service";
import type { LearnerBookmark } from "@/types/bookmark.types";
import { logger } from "@/utils/logger";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function LoadingState() {
  const { colors: c } = useSemanticTheme();
  return (
    <View style={tw`flex-1 items-center justify-center py-24`}>
      <ActivityIndicator size="large" color={brandColors.primary} />
      <AppText style={[tw`text-base mt-4`, { color: c.textSecondary }]}>
        Loading your bookmarks...
      </AppText>
    </View>
  );
}

function EmptyState() {
  const { colors: c } = useSemanticTheme();
  return (
    <View style={tw`flex-1 items-center justify-center py-20 px-8`}>
      <View
        style={[
          tw`w-20 h-20 rounded-full items-center justify-center mb-4`,
          { backgroundColor: c.muted },
        ]}
      >
        <Ionicons name="bookmark-outline" size={36} color={c.textSecondary} />
      </View>
      <BoldText style={[tw`text-xl mb-2 text-center`, { color: c.textPrimary }]}>
        No bookmarks yet
      </BoldText>
      <AppText style={[tw`text-base text-center`, { color: c.textSecondary }]}>
        Save words or sentences from a drill with the bookmark button. They will show up here for
        quick practice.
      </AppText>
    </View>
  );
}

export default function BookmarksScreen() {
  const { colors: c, isDark } = useSemanticTheme();
  const [items, setItems] = useState<LearnerBookmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const list = await getWordAndSentenceBookmarks();
      setItems(list);
    } catch (e) {
      logger.error("Bookmarks load failed", e);
      setError("Could not load bookmarks.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const onDeleted = (id: string) => {
    setItems((prev) => prev.filter((b) => b._id !== id));
  };

  return (
    <SafeAreaView style={[tw`flex-1`, { backgroundColor: c.background }]} edges={["top"]}>
      <View
        style={[
          tw`px-5 pt-4 pb-4 border-b flex-row items-center`,
          { backgroundColor: c.card, borderBottomColor: c.border },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={tw`mr-3`} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={c.textPrimary} />
        </TouchableOpacity>
        <BoldText style={[tw`text-xl flex-1`, { color: c.textPrimary }]}>My Bookmarks</BoldText>
      </View>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <View style={tw`flex-1 items-center justify-center px-8`}>
          <AppText style={[tw`text-center mb-4`, { color: c.textSecondary }]}>{error}</AppText>
          <TouchableOpacity
            onPress={() => {
              setLoading(true);
              load();
            }}
            style={[
              tw`px-6 py-3 rounded-full`,
              { backgroundColor: isDark ? brandColors.primary : brandColors.primaryDark },
            ]}
          >
            <AppText style={tw`text-white font-semibold`}>Retry</AppText>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={tw`flex-1`}
          contentContainerStyle={[tw`px-5 py-4`, items.length === 0 && tw`flex-grow`]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={brandColors.primary}
              colors={[brandColors.primary]}
            />
          }
        >
          {items.length === 0 ? (
            <EmptyState />
          ) : (
            items.map((b) => <BookmarkCard key={b._id} bookmark={b} onDeleted={onDeleted} />)
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
