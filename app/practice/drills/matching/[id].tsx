import DrillHeader from "@/components/drills/DrillHeader";
import { AppText, Loader } from "@/components/ui";
import { getDrillById } from "@/services/drill.service";
import { Drill } from "@/types/drill.types";
import tw from "@/lib/tw";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState, useRef } from "react";
import { ScrollView, TouchableOpacity, View, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useActivityStore } from "@/store/activity-store";
import { logger } from "@/utils/logger";

interface MatchPair {
  id: string;
  left: string;
  right: string;
}

export default function MatchingDrill() {
  const params = useLocalSearchParams();
  const drillId = params.id as string;
  const assignmentId = params.assignmentId as string | undefined;

  const { drillProgress, updateDrillProgress, addRecentActivity, clearDrillProgress } = useActivityStore();
  const startTimeRef = useRef(Date.now());

  const [drill, setDrill] = useState<Drill | null>(null);
  const [loading, setLoading] = useState(true);
  const [pairs, setPairs] = useState<MatchPair[]>([]);
  const [shuffledRightPairs, setShuffledRightPairs] = useState<MatchPair[]>([]);
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [selectedRight, setSelectedRight] = useState<string | null>(null);
  const [matchedPairs, setMatchedPairs] = useState<Set<string>>(new Set());

  // Restore progress
  useEffect(() => {
    if (drillId && drillProgress[drillId]) {
      const saved = drillProgress[drillId];
      if (saved.data?.matchedPairs) {
        setMatchedPairs(new Set(saved.data.matchedPairs));
      }
    }
  }, [drillId]);

  // Track activity on unmount
  useEffect(() => {
    return () => {
      const durationSeconds = (Date.now() - startTimeRef.current) / 1000;
      if (drill && durationSeconds >= 5 * 60) {
        addRecentActivity({
          id: drill._id,
          title: drill.title,
          type: drill.type,
          durationSeconds,
          score: 0,
        });
      }
    };
  }, [drill]);

  // Save progress
  useEffect(() => {
    if (drill) {
      updateDrillProgress({
        drillId,
        title: drill.title,
        type: drill.type,
        currentStep: matchedPairs.size,
        totalSteps: pairs.length,
        answers: [],
        data: { matchedPairs: Array.from(matchedPairs) },
        startTime: startTimeRef.current,
        lastUpdated: Date.now(),
      });
    }
  }, [matchedPairs, pairs.length, drill]);

  useEffect(() => {
    loadDrill();
  }, [drillId]);

  const loadDrill = async () => {
    try {
      setLoading(true);
      const drillData = await getDrillById(drillId, assignmentId);
      setDrill(drillData);

      // Transform data into pairs
      let loadedPairs: MatchPair[] = [];

      if (drillData.matching_pairs && drillData.matching_pairs.length > 0) {
        loadedPairs = drillData.matching_pairs.map((p, i) => ({
          id: `pair-${i}`,
          left: p.left,
          right: p.right
        }));
      } else if (drillData.grammar_items && drillData.grammar_items.length > 0) {
        // Fallback for grammar drills: Match Pattern to Example
        loadedPairs = drillData.grammar_items.map((p, i) => ({
          id: `grammar-${i}`,
          left: p.pattern,
          right: p.example
        }));
      }

      setPairs(loadedPairs);

      // Shuffle the right column items
      const shuffled = [...loadedPairs].sort(() => Math.random() - 0.5);
      setShuffledRightPairs(shuffled);
    } catch (error) {
      logger.error('❌ Failed to load drill:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLeftSelect = (id: string) => {
    if (matchedPairs.has(id)) return;

    setSelectedLeft(id);

    // Check if right is selected
    if (selectedRight) {
      checkMatch(id, selectedRight);
    }
  };

  const handleRightSelect = (id: string) => {
    if (matchedPairs.has(id)) return;

    setSelectedRight(id);

    // Check if left is selected
    if (selectedLeft) {
      checkMatch(selectedLeft, id);
    }
  };

  const checkMatch = (leftId: string, rightId: string) => {
    if (leftId === rightId) {
      // Match found!
      const newMatched = new Set([...matchedPairs, leftId]);
      setMatchedPairs(newMatched);
      setSelectedLeft(null);
      setSelectedRight(null);

      // Check for completion
      if (newMatched.size === pairs.length) {
        if (drill) {
          const durationSeconds = (Date.now() - startTimeRef.current) / 1000;
          addRecentActivity({
            id: drill._id,
            title: drill.title,
            type: drill.type,
            durationSeconds,
            score: 100,
          });
          clearDrillProgress(drillId);
        }
      }

    } else {
      // No match, deselect after delay
      // Note: Short timeout, component likely still mounted
      setTimeout(() => {
        setSelectedLeft(null);
        setSelectedRight(null);
      }, 500);
    }
  };

  const isComplete = pairs.length > 0 && matchedPairs.size === pairs.length;

  if (loading) {
    return (
      <SafeAreaView style={tw`flex-1 bg-white items-center justify-center`}>
        <Loader />
      </SafeAreaView>
    );
  }

  if (!drill) {
    return (
      <SafeAreaView style={tw`flex-1 bg-white items-center justify-center`}>
        <AppText>Drill not found</AppText>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={tw`flex-1 bg-white`} edges={["top", "bottom"]}>
      <DrillHeader
        title={drill.title}
        currentStep={matchedPairs.size}
        totalSteps={pairs.length}
      />

      <ScrollView
        style={tw`flex-1 px-5`}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={tw`pb-6`}
      >
        <AppText style={tw`text-lg font-semibold text-gray-900 mb-6`}>
          Match the pairs
        </AppText>

        {/* Left Column */}
        <View style={tw`flex-row gap-3 mb-3`}>
          <View style={tw`flex-1 gap-3`}>
            {pairs.map((pair) => {
              const isMatched = matchedPairs.has(pair.id);
              const isSelected = selectedLeft === pair.id;

              return (
                <TouchableOpacity
                  key={`left-${pair.id}`}
                  onPress={() => handleLeftSelect(pair.id)}
                  disabled={isMatched}
                  style={[
                    tw`rounded-2xl px-4 py-3 border-2`,
                    isMatched
                      ? tw`bg-green-100 border-green-500`
                      : isSelected
                        ? tw`bg-yellow-50 border-yellow-400`
                        : tw`bg-white border-gray-200`,
                  ]}
                >
                  <AppText
                    style={[
                      tw`text-center font-medium`,
                      isMatched ? tw`text-green-700` : tw`text-gray-900`,
                    ]}
                  >
                    {pair.left}
                  </AppText>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Right Column - Shuffled */}
          <View style={tw`flex-1 gap-3`}>
            {shuffledRightPairs.map((pair) => {
              const isMatched = matchedPairs.has(pair.id);
              const isSelected = selectedRight === pair.id;

              return (
                <TouchableOpacity
                  key={`right-${pair.id}`}
                  onPress={() => handleRightSelect(pair.id)}
                  disabled={isMatched}
                  style={[
                    tw`rounded-2xl px-4 py-3 border-2`,
                    isMatched
                      ? tw`bg-green-100 border-green-500`
                      : isSelected
                        ? tw`bg-yellow-50 border-yellow-400`
                        : tw`bg-white border-gray-200`,
                  ]}
                >
                  <AppText
                    style={[
                      tw`text-center font-medium`,
                      isMatched ? tw`text-green-700` : tw`text-gray-900`,
                    ]}
                  >
                    {pair.right}
                  </AppText>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
