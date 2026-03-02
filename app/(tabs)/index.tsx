import { AppText, BoldText, Button, Card } from "@/components/ui";
import { ProgressCircle } from "@/components/ui/ProgressCircle";
import tw from "@/lib/tw";
import { router } from "expo-router";
import { Dimensions, ScrollView, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Path } from "react-native-svg";
import { useActivityStore } from "@/store/activity-store";
import { navigateToDrill } from "@/utils/drillNavigation";
import { Drill } from "@/types/drill.types";
import { formatTimeAgo } from "@/utils/date";
import { useRef, useState } from 'react';
import { FutureSelfBottomSheet, FutureSelfBottomSheetRef } from '@/components/FutureSelfBottomSheet';
import { futureSelfService } from '@/services/future-self.service';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from "react";
import { usePrefetch } from '@/hooks/usePrefetch';
import { reflectionService } from '@/services/reflection.service';
import { dailyFocusService } from '@/services/daily-focus.service';
import { usePronunciation } from '@/hooks/usePronunciation';
import { useConfidence } from '@/hooks/useConfidence';
import VideoIcon from '@/assets/icons/file-video.svg';
import VideoIconWhite from '@/assets/icons/File-type-icon.svg';
import { Loader } from '@/components/ui';
import { HomeFreeModePopup } from "@/components/gating/HomeFreeModePopup";
import BellIcon from '@/assets/icons/bell.svg';
import { useAuth } from "@/hooks/useAuth";
import CallToActionCard from "@/components/CallToAction";
import Phone from "@/assets/icons/phone.svg";

import { Ionicons } from "@expo/vector-icons";
const { width: SCREEN_WIDTH } = Dimensions.get("window");
const isSmallScreen = SCREEN_WIDTH < 375;
const isMediumScreen = SCREEN_WIDTH >= 375 && SCREEN_WIDTH < 414;

/* ================= ICONS ================= */


const ClockIcon = () => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Circle cx={12} cy={12} r={10} stroke="#fff" strokeWidth={2} />
    <Path d="M12 6v6l4 2" stroke="#fff" strokeWidth={2} />
  </Svg>
);

const TargetIcon = () => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Circle cx={12} cy={12} r={10} stroke="#fff" strokeWidth={2} />
    <Circle cx={12} cy={12} r={6} stroke="#fff" strokeWidth={2} />
    <Circle cx={12} cy={12} r={2} fill="#fff" />
  </Svg>
);

const RedoIcon = () => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Path d="M1 4v6h6" stroke="#2563eb" strokeWidth={2} />
    <Path
      d="M3.51 15a9 9 0 102.13-9.36L1 10"
      stroke="#2563eb"
      strokeWidth={2}
    />
  </Svg>
);

/* ================= REUSABLE CARDS ================= */

const ProgressCard = ({
  title,
  change,
  progress,
  color,
}: {
  title: string;
  change: string;
  progress: number;
  color: string;
}) => {
  const isNegative = change.startsWith('-');
  return (
    <Card variant="outlined" padding="md" style={tw`flex-1`}>
      <View style={tw`flex-row justify-between items-center`}>
        <View style={tw`flex-1 mr-2`}>
          <AppText style={tw`font-semibold text-base text-neutral-900 dark:text-white`}>{title}</AppText>
          <AppText style={tw`text-sm mt-1 ${isNegative ? 'text-red-500' : 'text-green-600'}`}>
            {change}
          </AppText>
        </View>
        <ProgressCircle
          progress={progress}
          size={isSmallScreen ? 42 : 46}
          strokeWidth={4}
          color={color}
          backgroundColor="#e5e7eb"
          showPercentage
        />
      </View>
    </Card>
  );
};


const SavedDrillsCard = () => (
  <Card variant="outlined" padding="md" style={tw`p-3`}>
    <TouchableOpacity
      onPress={() => router.push("/practice/drills/saved")}
      style={tw`flex-row items-center justify-between`}
    >
      <View style={tw`flex-row items-center gap-3 flex-1`}>
        <View
          style={tw`w-10 h-10 rounded-xl bg-orange-100 items-center justify-center`}
        >
          <AppText style={tw`text-lg`}>📘</AppText>
        </View>
        <AppText style={tw`font-semibold flex-1 text-neutral-900 dark:text-white`} numberOfLines={1}>
          Saved Drills
        </AppText>
      </View>
      <AppText style={tw`text-neutral-400 text-lg ml-2`}>›</AppText>
    </TouchableOpacity>
  </Card>
);

const ActivityItem = ({
  icon,
  title,
  tag,
  score,
  time,
  iconBg,
  onPress,
}: {
  icon: string;
  title: string;
  tag: string;
  score: string;
  time: string;
  iconBg: string;
  onPress: () => void;
}) => (
  <Card variant="outlined" padding="md">
    <View style={tw`flex-row justify-between items-center gap-3`}>
      <View style={tw`flex-row items-center gap-3 flex-1`}>
        <View
          style={tw`w-12 h-12 rounded-xl ${iconBg} items-center justify-center flex-shrink-0`}
        >
          <AppText style={tw`text-xl`}>{icon}</AppText>
        </View>

        <View style={tw`flex-1`}>
          <AppText style={tw`font-medium text-base mb-1 text-neutral-900 dark:text-white`} numberOfLines={1}>
            {title}
          </AppText>
          <View style={tw`flex-row items-center gap-2 flex-wrap`}>
            {score && (
              <AppText style={tw`text-sm text-primary-500 font-semibold`}>
                {score}
              </AppText>
            )}
            <AppText style={tw`text-xs text-orange-500 capitalize`}>{tag}</AppText>
            <AppText style={tw`text-sm text-neutral-400`}>• {time}</AppText>
          </View>
        </View>
      </View>

      <TouchableOpacity
        onPress={onPress}
        style={tw`flex-row items-center gap-1 flex-shrink-0 ml-2`}
      >
        <RedoIcon />
        <AppText style={tw`text-blue-600 font-medium text-sm`}>Redo</AppText>
      </TouchableOpacity>
    </View>
  </Card>
);

/* ================= SCREEN ================= */

export default function HomeScreen() {
  const { user } = useAuth();
  const name = user?.firstName + ' ' + user?.lastName || 'User';
  const { recentActivities } = useActivityStore();
  const isFreeUser = !user?.isSubscribed;

  // Metrics
  const { data: pronunciation, isLoading: pronunciationLoading, weeklyChange: weeklyPronunciation } = usePronunciation();
  const { data: confidence, isLoading: confidenceLoading, weeklyChange: weeklyConfidence } = useConfidence();

  // Bottom sheet ref
  const futureSelfBottomSheetRef = useRef<FutureSelfBottomSheetRef>(null);

  // Prefetching utilities (prefetchCommonData is handled by BackgroundPrefetcher in _layout.tsx)
  const { prefetchDrill } = usePrefetch();

  // Fetch future self video with background refetching
  const { data: futureSelfVideo, refetch: refetchFutureSelf } = useQuery({
    queryKey: ['future-self'],
    queryFn: () => futureSelfService.getMyFutureSelf(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    // Enable background refetching - will refetch when data becomes stale
    refetchInterval: false,
  });

  // Fetch recent daily reflections (last 5 days)
  const { data: reflectionsData } = useQuery({
    queryKey: ['daily-reflections', 'recent'],
    queryFn: () => reflectionService.getReflections({ limit: 5 }),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch today's daily focus
  const { data: todaysFocus, isLoading: isLoadingFocus } = useQuery({
    queryKey: ['daily-focus', 'today'],
    queryFn: () => dailyFocusService.getToday(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const recentReflections = reflectionsData?.reflections || [];

  const handleStartTodaysFocus = () => {
    if (todaysFocus) {
      router.push(`/daily-focus/${todaysFocus._id}`);
    }
  };

  const handleRedo = (activity: any) => {
    // Prefetch drill data before navigation for instant loading
    if (activity.id) {
      prefetchDrill(activity.id);
    }
    navigateToDrill({ _id: activity.id, type: activity.type } as Drill);
  };

  const handleFutureSelfPress = () => {
    // If video exists, navigate to future-self screen instead of showing bottom sheet
    if (futureSelfVideo) {
      router.push({
        pathname: '/future-self',
        params: {
          mode: 'player',
          videoId: futureSelfVideo._id,
          videoUrl: futureSelfVideo.videoUrl
        }
      });
    } else {
      // No video exists, show bottom sheet to create one
      futureSelfBottomSheetRef.current?.present();
    }
  };

  const [showHomePopup, setShowHomePopup] = useState(false);

  useEffect(() => {
    if (isFreeUser) {
      setShowHomePopup(true);
    }
  }, [isFreeUser]);

  return (
    <SafeAreaView edges={["top"]} style={tw`flex-1 bg-white dark:bg-neutral-900`}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={tw`pb-6`}
      >
        {/* HEADER */}


        <View
          style={tw`px-${isSmallScreen ? "4" : "6"} pt-4 pb-6 flex-row justify-between items-center`}
        >
          <View style={tw`flex-1 mr-4`}>
            <AppText style={tw`text-${isSmallScreen ? "xl" : "2xl"} font-bold text-neutral-900 dark:text-white`}>
              Hello, {name}! 👋
            </AppText>
            <AppText style={tw`text-neutral-500 dark:text-neutral-400 text-${isSmallScreen ? "sm" : "base"} mt-1`}>
              Good to see you again.
            </AppText>
          </View>

          <View style={tw`flex-row items-center gap-3 flex-shrink-0`}>
            {/* <View style={tw`bg-orange-100 px-3 py-1 rounded-full`}>
              <AppText style={tw`text-orange-600 font-semibold text-sm`}>
                🔥 22
              </AppText>
            </View> */}
            <TouchableOpacity
              style={tw`w-[40px] h-[40px] bg-neutral-100 dark:bg-neutral-800 rounded-full items-center justify-center`}
              onPress={() => router.push('/notifications')}
            >
              <BellIcon width={20} height={20} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={tw`px-${isSmallScreen ? "4" : "6"} mb-6 gap-3`}>
          {isFreeUser && (
            <CallToActionCard
              title="Book a call"
              subtitle="Speak to an English language expert"
              iconBackgroundColor="#FFFFFF"
              gradientAngle={135}
              icon={<Phone />}
              gradientColors={['#3C8CE7', '#00EAFF']}
              onPress={() => {
                router.push('/book-call');
              }}
            />
          )}
          {!isFreeUser && !futureSelfVideo && (
            <CallToActionCard
              title="Upload your video"
              subtitle="Write a message to your future self"
              icon={<VideoIconWhite width={24} height={24} />}
              gradientColors={['#FF96F9', '#C32BAC']}
              onPress={handleFutureSelfPress}
            />
          )}
        </View>
        {/* TODAY'S FOCUS */}
        <View style={tw`px-${isSmallScreen ? "4" : "6"} mb-6`}>
          {isLoadingFocus ? (
            <View style={tw`bg-green-900 rounded-2xl p-${isSmallScreen ? "4" : "5"} items-center justify-center min-h-[200px]`}>
              <Loader />
            </View>
          ) : todaysFocus ? (
            <View style={tw`bg-green-900 rounded-[24px] p-${isSmallScreen ? "4" : "5"}`}>
              <View
                style={tw`bg-green-800 px-4 py-1 rounded-full self-start mb-4`}
              >
                <AppText style={tw`text-green-200 text-xs font-semibold`}>
                  🔥 TODAY'S FOCUS
                </AppText>
              </View>

              <AppText style={tw`text-white text-${isSmallScreen ? "xl" : "2xl"} font-bold mb-2`}>
                {todaysFocus.title}
              </AppText>

              {todaysFocus.description && (
                <AppText style={tw`text-white/80 text-sm mb-4`}>
                  {todaysFocus.description}
                </AppText>
              )}

              <View style={tw`flex-row gap-${isSmallScreen ? "3" : "4"} my-4 flex-wrap`}>
                <View style={tw`flex-row items-center gap-1`}>
                  <ClockIcon />
                  <AppText style={tw`text-white/90 text-sm`}>
                    {todaysFocus.estimatedMinutes} min
                  </AppText>
                </View>
                <View style={tw`flex-row items-center gap-1`}>
                  <TargetIcon />
                  <AppText style={tw`text-white/90 text-sm capitalize`}>
                    {todaysFocus.difficulty}
                  </AppText>
                </View>
                {todaysFocus.totalQuestions > 0 && (
                  <View style={tw`flex-row items-center gap-1`}>
                    <AppText style={tw`text-white/90 text-sm`}>
                      {todaysFocus.totalQuestions} questions
                    </AppText>
                  </View>
                )}
              </View>

              <TouchableOpacity
                onPress={handleStartTodaysFocus}
                style={tw`bg-yellow-400 py-${isSmallScreen ? "3" : "4"} rounded-xl items-center mb-3`}
                activeOpacity={0.8}
              >
                <AppText style={tw`font-semibold text-neutral-900 text-base`}>
                  Start Today's Practice
                </AppText>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={tw`bg-green-900 rounded-2xl p-${isSmallScreen ? "4" : "5"}`}>
              <View
                style={tw`bg-green-800 px-4 py-1 rounded-full self-start mb-4`}
              >
                <AppText style={tw`text-green-200 text-xs font-semibold`}>
                  🔥 TODAY'S FOCUS
                </AppText>
              </View>

              <AppText style={tw`text-white text-${isSmallScreen ? "xl" : "2xl"} font-bold mb-2`}>
                Learn with me
              </AppText>


              <AppText style={tw`text-white/80 text-sm mb-4`}>
                just a test
              </AppText>


              <View style={tw`flex-row gap-${isSmallScreen ? "3" : "4"} my-4 flex-wrap`}>
                <View style={tw`flex-row items-center gap-1`}>
                  <ClockIcon />
                  <AppText style={tw`text-white/90 text-sm`}>
                    5 min
                  </AppText>
                </View>
                <View style={tw`flex-row items-center gap-1`}>
                  <TargetIcon />
                  <AppText style={tw`text-white/90 text-sm capitalize`}>
                    Hard
                  </AppText>
                </View>

                <View style={tw`flex-row items-center gap-1`}>
                  <AppText style={tw`text-white/90 text-sm`}>
                    5questions
                  </AppText>
                </View>

              </View>

              <TouchableOpacity
                onPress={handleStartTodaysFocus}
                style={tw`bg-yellow-400 py-${isSmallScreen ? "3" : "4"} rounded-full items-center mb-3`}
                activeOpacity={0.8}
              >
                <AppText style={tw`font-semibold text-neutral-900 text-base`}>
                  Start Today's Practice
                </AppText>
              </TouchableOpacity>

            </View>
          )}
        </View>

        {/* PROGRESS */}
        <View style={tw`px-${isSmallScreen ? "4" : "6"} mb-6`}>
          <AppText style={tw`text-lg font-bold mb-3 text-neutral-900 dark:text-white`}>Your Progress</AppText>
          <View style={tw`flex-row gap-3`}>
            <ProgressCard
              title="Confidence"
              change={
                confidenceLoading
                  ? 'Loading...'
                  : `${weeklyConfidence >= 0 ? '+' : ''}${weeklyConfidence}% this week`
              }
              progress={Math.max(0, Math.min(100, confidence?.confidenceScore ?? 0))}
              color="#2563eb"
            />
            <ProgressCard
              title="Pronunciation"
              change={
                pronunciationLoading
                  ? 'Loading...'
                  : `${weeklyPronunciation >= 0 ? '+' : ''}${weeklyPronunciation}% this week`
              }
              progress={Math.max(0, Math.min(100, pronunciation?.overallScore ?? 0))}
              color="#22c55e"
            />
          </View>
        </View>

        {/* DAILY REFLECTION + SAVED DRILLS + FUTURE SELF */}
        <View style={tw`px-${isSmallScreen ? "4" : "6"} mb-6`}>
          <View style={tw`flex-row gap-3`}>
            {/* LEFT: Daily Reflection */}
            {!isFreeUser && (
              <Card variant="outlined" padding="md" style={tw`flex-1 bg-neutral-100 dark:bg-neutral-800`}>
                <BoldText style={tw`text-5 mb-1 text-neutral-900 dark:text-white`}>
                  📘 Daily Reflection
                </BoldText>
                <AppText style={tw`text-sm text-neutral-500 dark:text-neutral-400 mb-3`}>
                  Log your experience as you go about learning
                </AppText>

                {/* Previous Reflections */}
                {recentReflections.length > 0 && (
                  <View style={tw`mb-3 gap-2`}>
                    {recentReflections.slice(0, 3).map((reflection) => {
                      const dateLabel = formatTimeAgo(reflection.createdAt);

                      return (
                        <TouchableOpacity
                          key={reflection._id}
                          onPress={() => router.push(`/daily-reflection/${reflection._id}`)}
                          style={tw`bg-gray-50 dark:bg-neutral-800 rounded-lg p-2.5 border border-gray-100 dark:border-neutral-700`}
                          activeOpacity={0.7}
                        >
                          <View style={tw`flex-row items-center justify-between mb-1`}>
                            <AppText style={tw`text-xs text-gray-600 dark:text-gray-400 font-medium`}>
                              {dateLabel}
                            </AppText>
                            {reflection.mood && (
                              <AppText style={tw`text-xs`}>
                                {reflection.mood === 'happy' ? '😊' :
                                  reflection.mood === 'sad' ? '😢' :
                                    reflection.mood === 'excited' ? '🎉' :
                                      reflection.mood === 'tired' ? '😴' :
                                        reflection.mood === 'motivated' ? '💪' : '😐'}
                              </AppText>
                            )}
                          </View>
                          <AppText
                            style={tw`text-xs text-gray-700 dark:text-gray-300`}
                            numberOfLines={2}
                          >
                            {reflection.content || reflection.answer || 'No content'}
                          </AppText>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}

                <TouchableOpacity
                  onPress={() => router.push("/daily-reflection")}
                  style={tw`border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 rounded-full py-2.5 items-center mt-auto`}
                >
                  <AppText style={tw`font-medium text-sm text-neutral-900 dark:text-white`}>
                    Record Journal Entry
                  </AppText>
                </TouchableOpacity>
              </Card>
            )}

            {/* RIGHT: Saved Drills + Future Self */}
            <View style={tw`flex-1  gap-3`}>
              {/* Saved Drills */}
              <SavedDrillsCard />

              {/* Future Self */}
              {!isFreeUser && (
                <TouchableOpacity onPress={handleFutureSelfPress} style={tw`flex-1`}>
                  <Card variant="outlined" padding="md" style={tw`bg-neutral-100 dark:bg-neutral-800 flex-1`}>
                    <View style={tw`flex-row items-center gap-2 mb-1`}>
                      <AppText style={tw`text-lg`}>
                        '🎥'
                      </AppText>
                      <BoldText style={tw`text-5 flex-1 text-neutral-900 dark:text-white`} numberOfLines={1}>
                        Future Self
                      </BoldText>
                    </View>
                    <AppText style={tw`text-sm text-neutral-500 dark:text-neutral-400`} numberOfLines={2}>


                      A message you recorded for yourself
                    </AppText>



                    <View style={tw`flex-row items-center justify-between`}>


                      <AppText style={tw`text-primary-500 dark:text-primary-400 font-bold text-4 my-2`}>
                        Upload
                      </AppText>

                      <Ionicons name="chevron-forward" style={tw`font-bold text-neutral-900 dark:text-white`} />

                    </View>
                    {futureSelfVideo ? <View style={tw`flex-row items-center gap-1`}><VideoIcon />
                      <View>

                        <AppText style={tw`text-neutral-900 dark:text-white`}>
                          Dear Future Self

                        </AppText>
                        <AppText style={tw`text-neutral-500 dark:text-neutral-400`}>
                          Video uploaded
                        </AppText>
                      </View>
                    </View> : ""}
                  </Card>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* RECENT ACTIVITY */}
        <View style={tw`px-${isSmallScreen ? "4" : "6"}`}>
          <View style={tw`flex-row justify-between items-center mb-3`}>
            <AppText style={tw`text-lg font-bold text-neutral-900 dark:text-white`}>Recent Activity</AppText>
            <TouchableOpacity>
              <AppText style={tw`text-primary-500 dark:text-primary-400 font-medium text-sm`}>
                See All
              </AppText>
            </TouchableOpacity>
          </View>

          <View style={tw`gap-3`}>
            {recentActivities.length === 0 ? (
              <View style={tw`items-center py-6 bg-gray-50 dark:bg-neutral-800 rounded-2xl`}>
                <AppText style={tw`text-gray-400 dark:text-neutral-500`}>No recent activity</AppText>
              </View>
            ) : (
              recentActivities.map((activity) => (
                <ActivityItem
                  key={activity.id + activity.timestamp}
                  icon={activity.type === 'roleplay' ? '📞' : activity.type === 'listening' ? '🎧' : '📝'}
                  title={activity.title}
                  score={activity.score ? `${activity.score}%` : ''}
                  tag={activity.type}
                  time={formatTimeAgo(activity.timestamp)}
                  iconBg={activity.type === 'roleplay' ? 'bg-blue-50 dark:bg-blue-900/30' : 'bg-green-50 dark:bg-green-900/30'}
                  onPress={() => handleRedo(activity)}
                />
              ))
            )}
          </View>
        </View>
      </ScrollView>

      {/* Future Self Bottom Sheet */}
      <FutureSelfBottomSheet ref={futureSelfBottomSheetRef} />

      {/* Home subscription popup for free users */}
      <HomeFreeModePopup visible={showHomePopup} onClose={() => setShowHomePopup(false)} />
    </SafeAreaView>
  );
}