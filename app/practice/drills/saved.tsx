import DrillCard from "@/components/practice/DrillCard";
import { DrillCardSkeletonList } from "@/components/drills/DrillCardSkeleton";
import { AppText, BoldText } from "@/components/ui";
import tw from "@/lib/tw";
import { navigateToDrill } from "@/utils/drillNavigation";
import { Ionicons } from "@expo/vector-icons";
import React, { useState, useEffect } from "react";
import { ScrollView, TouchableOpacity, View, RefreshControl } from "react-native";
import { Alert } from '@/utils/alert';
import { SafeAreaView } from "react-native-safe-area-context";
import { getSavedDrills, unsaveDrill, getDrillById } from "@/services/drill.service";
import { Drill } from "@/types/drill.types";
import { logger } from "@/utils/logger";
import { router } from "expo-router";

// Empty State Component
function EmptyState() {
  return (
    <View style={tw`flex-1 items-center justify-center py-20`}>
      <AppText style={tw`text-6xl mb-4`}>📚</AppText>
      <BoldText style={tw`text-xl text-gray-900 mb-2`}>No saved drills</BoldText>
      <AppText style={tw`text-base text-gray-500 text-center px-8`}>
        Save drills you want to practice later
      </AppText>
    </View>
  );
}

// Error State Component
function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <View style={tw`flex-1 items-center justify-center py-20`}>
      <AppText style={tw`text-6xl mb-4`}>⚠️</AppText>
      <BoldText style={tw`text-xl text-gray-900 mb-2`}>
        Failed to load saved drills
      </BoldText>
      <AppText style={tw`text-base text-gray-500 text-center px-8 mb-6`}>
        Please check your connection and try again
      </AppText>
      <TouchableOpacity
        style={tw`bg-green-700 px-6 py-3 rounded-full`}
        onPress={onRetry}
        activeOpacity={0.8}
      >
        <AppText style={tw`text-white font-semibold`}>Retry</AppText>
      </TouchableOpacity>
    </View>
  );
}

interface SavedDrillItem {
  _id: string;
  drillId: string;
  drill?: Drill;
  createdAt: string;
}

// Main Screen
export default function SavedDrillsScreen() {
  const [savedDrills, setSavedDrills] = useState<SavedDrillItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadSavedDrills = async () => {
    try {
      setError(false);
      const bookmarks = await getSavedDrills();
      
      // Fetch drill details for each bookmark
      const drillsWithDetails = await Promise.all(
        bookmarks
          .filter((bookmark: any) => bookmark.drillId) // Only process bookmarks with valid drillId
          .map(async (bookmark: any) => {
            try {
              const drill = await getDrillById(bookmark.drillId);
              return {
                _id: bookmark._id || bookmark.id,
                drillId: bookmark.drillId,
                drill,
                createdAt: bookmark.createdAt || bookmark.created_date,
              };
            } catch (err) {
              logger.error(`Failed to load drill ${bookmark.drillId}:`, err);
              return null;
            }
          })
      );

      // Filter out null values (failed loads)
      const validDrills = drillsWithDetails.filter((item): item is SavedDrillItem => item !== null);
      setSavedDrills(validDrills);
    } catch (err: any) {
      logger.error('Failed to load saved drills:', err);
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadSavedDrills();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSavedDrills();
  };

  const handleDrillPress = (item: SavedDrillItem) => {
    if (item.drill) {
      navigateToDrill(
        {
          drill: item.drill,
          assignmentId: undefined,
          status: 'pending',
        } as any,
        undefined
      );
    }
  };

  const handleUnsave = async (bookmarkId: string, drillTitle: string) => {
    Alert.alert(
      "Unsave Drill",
      `Remove "${drillTitle}" from your saved drills?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Unsave",
          style: "destructive",
          onPress: async () => {
            try {
              await unsaveDrill(bookmarkId);
              setSavedDrills(prev => prev.filter(item => item._id !== bookmarkId));
            } catch (err: any) {
              Alert.alert("Error", "Failed to unsave drill. Please try again.");
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`} edges={['top']}>
      {/* Header */}
      <View style={tw`px-5 pt-4 pb-4 bg-white`}>
        <View style={tw`flex-row items-center mb-3`}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={tw`mr-4`}
            activeOpacity={0.7}
          >
            <AppText style={tw`text-2xl text-neutral-900`}>←</AppText>
          </TouchableOpacity>
          <View style={tw`flex-1`}>
            <BoldText style={tw`text-2xl font-bold text-gray-900 mb-1`}>
              Saved Drills
            </BoldText>
            <AppText style={tw`text-base text-gray-500`}>
              Drills you've saved for later
            </AppText>
          </View>
        </View>
      </View>

      {/* Content */}
      <ScrollView
        style={tw`flex-1`}
        contentContainerStyle={tw`px-5 py-4`}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#15803D"
            colors={["#15803D"]}
          />
        }
      >
        {loading ? (
          <DrillCardSkeletonList count={4} />
        ) : error ? (
          <ErrorState onRetry={loadSavedDrills} />
        ) : savedDrills.length === 0 ? (
          <EmptyState />
        ) : (
          savedDrills
            .filter((item) => item.drill) // Only render items with valid drills
            .map((item) => (
              <View key={item._id} style={tw`mb-4 relative`}>
                <DrillCard
                  drill={item.drill!}
                  onPress={() => handleDrillPress(item)}
                  locked={false}
                  isCompleted={false}
                  thumbnail={require("@/assets/images/thumbnail.png")}
                />
                <TouchableOpacity
                  onPress={() => handleUnsave(item._id, item.drill?.title || "Drill")}
                  style={tw`absolute top-2 right-2 w-10 h-10 items-center justify-center bg-white/90 rounded-full shadow-sm`}
                  activeOpacity={0.7}
                >
                  <Ionicons name="bookmark" size={20} color="#166534" />
                </TouchableOpacity>
              </View>
            ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

