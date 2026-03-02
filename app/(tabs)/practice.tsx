import HeadPhone from "@/assets/icons/headphone.svg";
import LogoYellow from "@/assets/icons/logo-yellow.svg";
import Mic from "@/assets/icons/mic.svg";
import CoachingRequiredBottomSheet from "@/components/practice/CoachinRequiredBottomSheet";
import PronunciationBottomSheet from "@/components/practice/PronunciationBottomSheet";
import { AppText } from "@/components/ui";
import tw from "@/lib/tw";
import { Ionicons } from "@expo/vector-icons";
import { AiLimitSoftGate } from "@/components/gating/AiLimitSoftGate";
import { AiLimitHardGate } from "@/components/gating/AiLimitHardGate";
import BottomSheet from "@gorhom/bottom-sheet";
import { router } from "expo-router";
import React, { useRef, useEffect, useState } from "react";
import {
  ScrollView,
  TouchableOpacity,
  View,
  BackHandler,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getDrillCategory, getEstimatedTime } from "@/types/drill.types";
import { navigateToDrill } from "@/utils/drillNavigation";
import { logger } from "@/utils/logger";
import { usePrefetch } from "@/hooks/usePrefetch";
import { useActivityStore } from "@/store/activity-store";
import { useAiUsageStore } from "@/store/ai-usage-store";
import { useAuth } from "@/hooks/useAuth";
import { Drill } from "@/types/drill.types";

export default function PracticeScreen() {
  const coachingRequiredBottomSheetRef = useRef<any>(null);
  const pronunciationBottomSheetRef = useRef<any>(null);

  // Track which sheets are open
  const [openSheets, setOpenSheets] = React.useState<Set<string>>(new Set());

  // Get last active drill for continue practice
  const { lastActiveDrill } = useActivityStore();
  const { user } = useAuth();
  const isFreeUser = !user?.isSubscribed;

  const { freeTurnsUsed, freeTurnLimit } = useAiUsageStore();
  const aiUsageRatio =
    freeTurnLimit > 0 ? freeTurnsUsed / freeTurnLimit : 0;

  const [showFreeTalkSoftGate, setShowFreeTalkSoftGate] = useState(false);
  const [showFreeTalkHardGate, setShowFreeTalkHardGate] = useState(false);

  const { prefetchDrill, prefetchDrills } = usePrefetch();

  const handleOpenAiFreeTalk = () => {
    // Premium users go straight in
    if (!isFreeUser) {
      router.push("/practice/ai");
      return;
    }

    // Free users: apply soft/hard gating based on local turn usage
    if (aiUsageRatio >= 1) {
      // Hard gate: all free sessions used
      setShowFreeTalkHardGate(true);
      return;
    }

    if (aiUsageRatio >= 0.75) {
      // Soft gate: warn user they're near the limit
      setShowFreeTalkSoftGate(true);
      return;
    }

    router.push("/practice/ai");
  };

  const handleOpenCoachingRequired = () => {
    coachingRequiredBottomSheetRef.current?.expand();
    setOpenSheets(prev => new Set(prev).add('coachingRequired'));
  };

  const handleOpenPronunciation = () => {
    pronunciationBottomSheetRef.current?.expand();
    setOpenSheets(prev => new Set(prev).add('pronunciation'));
  };

  // Handlers for when sheets close
  const handleSheetClose = (sheetName: string) => {
    setOpenSheets(prev => {
      const next = new Set(prev);
      next.delete(sheetName);
      return next;
    });
  };

  const handleStartConversation = (topicId: string) => {
    logger.log("Starting conversation with topic:", topicId);
    // Navigate to AI talk screen with the selected topic
    router.push("/practice/ai-talk");
  };

  const handleStartPronunciation = (topicId: string) => {
    logger.log("Starting pronunciation practice with topic:", topicId);
    // Map topic IDs to backend types
    const typeMap: Record<string, 'word' | 'sound' | 'sentence'> = {
      'sounds': 'sound',
      'words': 'word',
      'sentences': 'sentence',
    };

    const type = typeMap[topicId] || 'word';
    // Navigate to problem list filtered by type
    router.push(`/practice/pronunciation/list?type=${type}`);
  };

  const handleTalkToCoach = () => {
    logger.log("Navigating to talk to coach");
    router.push("/book-call");
  };

  const handleKeepPracticing = () => {
    logger.log("Continue with AI practice");
    // Navigate to AI practice screen anyway
  };

  const handleContinuePractice = () => {
    if (lastActiveDrill) {
      // Prefetch drill data before navigation for instant loading
      if (lastActiveDrill.drillId) {
        prefetchDrill(lastActiveDrill.drillId);
      }
      navigateToDrill({ _id: lastActiveDrill.drillId, type: lastActiveDrill.type } as Drill);
    }
  };

  // Handle back button to close bottom sheets or navigate back
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      // Check if any sheet is open and close it
      if (openSheets.size > 0) {
        // Close the most recently opened sheet (or all if needed)
        if (openSheets.has('pronunciation') && pronunciationBottomSheetRef.current) {
          pronunciationBottomSheetRef.current.close();
          handleSheetClose('pronunciation');
          return true; // Prevent navigation
        }
        if (openSheets.has('coachingRequired') && coachingRequiredBottomSheetRef.current) {
          coachingRequiredBottomSheetRef.current.close();
          handleSheetClose('coachingRequired');
          return true; // Prevent navigation
        }
      }

      // No sheets open, allow normal navigation
      return false;
    });

    return () => backHandler.remove();
  }, [openSheets]);

  return (
    <SafeAreaView edges={["top"]} style={tw`flex-1 bg-white dark:bg-neutral-900`}>
      <ScrollView style={tw`flex-1`} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={tw`px-5 pt-4 pb-3 flex-row items-center justify-between`}>
          <AppText style={tw`text-2xl font-bold text-gray-900 dark:text-white`}>Practice</AppText>
          <View style={tw`flex-row items-center bg-orange-50 dark:bg-orange-900/20 rounded-full px-3 py-1.5`}>
            <AppText style={tw`text-lg mr-1`}>🔥</AppText>
            <AppText style={tw`text-base font-semibold text-gray-900 dark:text-white`}>22</AppText>
          </View>
        </View>

        {/* Continue Practice Card */}
        {lastActiveDrill && (
          <View style={tw`px-5 mb-6`}>
            <View style={tw`bg-primary-500 rounded-3xl p-5 shadow-lg`}>
              {/* Badge */}
              <View style={tw`self-start bg-primary-800 rounded-full px-3 py-1 mb-3`}>
                <AppText style={tw`text-blue-200 text-xs font-semibold`}>
                  ▶ CONTINUE PRACTICE
                </AppText>
              </View>

              {/* Title */}
              <AppText style={tw`text-white text-xl font-bold mb-2`}>
                {lastActiveDrill.title}
              </AppText>

              {/* Progress Info */}
              <View style={tw`flex-row gap-4 my-2 flex-wrap`}>
                <View style={tw`flex-row items-center gap-1`}>
                  <AppText style={tw`text-white/90 text-sm capitalize`}>
                    {lastActiveDrill.type}
                  </AppText>
                </View>
                <View style={tw`flex-row items-center gap-1`}>
                  <AppText style={tw`text-white/90 text-sm`}>
                    Step {lastActiveDrill.currentStep} / {lastActiveDrill.totalSteps}
                  </AppText>
                </View>
              </View>

              {/* Progress Bar */}
              <View style={tw`mb-4`}>
                <View style={tw`h-2 bg-primary-800 rounded-full overflow-hidden`}>
                  <View
                    style={[
                      tw`h-full bg-white rounded-full`,
                      {
                        width: `${(lastActiveDrill.currentStep / lastActiveDrill.totalSteps) * 100}%`,
                      },
                    ]}
                  />
                </View>
              </View>

              {/* Continue Button */}
              <TouchableOpacity
                onPress={handleContinuePractice}
                style={tw`bg-yellow-400 rounded-2xl py-4 items-center`}
                activeOpacity={0.8}
              >
                <AppText style={tw`text-green-900 text-base font-semibold`}>
                  Resume
                </AppText>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Practice Freely Section */}
        <View style={tw`px-5 mb-6`}>
          <AppText style={tw`text-xl font-bold text-gray-900 dark:text-white mb-4`}>
            Practice freely
          </AppText>

          {/* AI Free Talk */}
          <TouchableOpacity
            style={tw`bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-2xl p-4 mb-3 flex-row items-center`}
            activeOpacity={0.7}
            onPress={handleOpenAiFreeTalk}
          >
            <View style={tw`w-12 h-12 bg-green-600 rounded-xl items-center justify-center mr-4`}>
              <LogoYellow />
            </View>
            <View style={tw`flex-1`}>
              <AppText style={tw`text-base font-semibold text-gray-900 dark:text-white mb-0.5`}>
                Eklan Free Talk
              </AppText>
              <AppText style={tw`text-sm text-gray-600 dark:text-neutral-400 mb-1`}>
                Speak about anything
              </AppText>
              <View style={tw`flex-row items-center`}>
                <AppText style={tw`text-xs text-gray-400 dark:text-neutral-500 mr-3`}>5–10 mins</AppText>
                <AppText style={tw`text-xs text-gray-400 dark:text-neutral-500`}>No pressure</AppText>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
          </TouchableOpacity>

          {/* Pronunciation */}
          <TouchableOpacity
            onPress={handleOpenPronunciation}
            style={tw`bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-2xl p-4 mb-3 flex-row items-center`}
            activeOpacity={0.7}
          >
            <View style={tw`w-12 h-12 bg-primary-500 rounded-xl items-center justify-center mr-4`}>
              <HeadPhone />
            </View>
            <View style={tw`flex-1`}>
              <AppText style={tw`text-base font-semibold text-gray-900 dark:text-white mb-0.5`}>
                Pronunciation
              </AppText>
              <AppText style={tw`text-sm font-satoshi text-gray-600 dark:text-neutral-400 mb-1`}>
                Practice sounds and words at your own pace.
              </AppText>
              <AppText style={tw`text-xs text-gray-400 dark:text-neutral-500`}>3–5 mins</AppText>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
          </TouchableOpacity>

          {/* Listening */}
          <TouchableOpacity
            style={tw`bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-2xl p-4 mb-3 flex-row items-center`}
            activeOpacity={0.7}
          >
            <View style={tw`w-12 h-12 bg-blue-500 rounded-xl items-center justify-center mr-4`}>
              <Mic />
            </View>
            <View style={tw`flex-1`}>
              <AppText style={tw`text-base font-semibold text-gray-900 dark:text-white mb-0.5`}>
                Listening
              </AppText>
              <AppText style={tw`text-sm text-gray-600 dark:text-neutral-400 mb-1`}>
                Listen, repeat, and improve natural rhythm.
              </AppText>
              <View style={tw`flex-row items-center`}>
                <AppText style={tw`text-xs text-gray-400 dark:text-neutral-500 mr-3`}>5–10 mins</AppText>
                <AppText style={tw`text-xs text-gray-400 dark:text-neutral-500`}>No pressure</AppText>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
          </TouchableOpacity>
        </View>


       
      </ScrollView>

      {/* Bottom Sheets */}

      <CoachingRequiredBottomSheet
        bottomSheetRef={coachingRequiredBottomSheetRef}
        onTalkToCoach={handleTalkToCoach}
        onKeepPracticing={handleKeepPracticing}
        onChange={(index: number) => {
          if (index === -1) {
            handleSheetClose('coachingRequired');
          } else if (index >= 0) {
            setOpenSheets(prev => new Set(prev).add('coachingRequired'));
          }
        }}
      />

      <PronunciationBottomSheet
        bottomSheetRef={pronunciationBottomSheetRef}
        onStartPractice={handleStartPronunciation}
        onChange={(index: number) => {
          if (index === -1) {
            handleSheetClose('pronunciation');
          } else if (index >= 0) {
            setOpenSheets(prev => new Set(prev).add('pronunciation'));
          }
        }}
      />

      {/* Free Talk Gates */}
      <AiLimitSoftGate visible={showFreeTalkSoftGate} onClose={() => setShowFreeTalkSoftGate(false)} />
      <AiLimitHardGate visible={showFreeTalkHardGate} onClose={() => setShowFreeTalkHardGate(false)} />
    </SafeAreaView>
  );
}