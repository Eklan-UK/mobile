import { AppText, Button, Card } from "@/components/ui";
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
import { useRef, useState, useEffect } from 'react';
import { FutureSelfBottomSheet, FutureSelfBottomSheetRef } from '@/components/FutureSelfBottomSheet';
import { futureSelfService } from '@/services/future-self.service';
import { useQuery } from '@tanstack/react-query';
import { usePrefetch } from '@/hooks/usePrefetch';
import { reflectionService } from '@/services/reflection.service';
import { dailyFocusService } from '@/services/daily-focus.service';
import VideoIcon from '@/assets/icons/file-video.svg';
import VideoIconWhite from '@/assets/icons/File-type-icon.svg';
import { Loader } from '@/components/ui';
import BellIcon from '@/assets/icons/bell.svg';
import { useAuth } from "@/hooks/useAuth";
import CallToActionCarousel from "@/components/CallToActionCarousel";
import Phone from "@/assets/icons/phone.svg";
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
}) => (
  <Card variant="outlined" padding="md" style={tw`flex-1`}>
    <View style={tw`flex-row justify-between items-center`}>
      <View style={tw`flex-1 mr-2`}>
        <AppText style={tw`font-semibold text-base`}>{title}</AppText>
        <AppText style={tw`text-sm text-green-600 mt-1`}>{change}</AppText>
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

const SavedDrillsCard = () => (
  <Card variant="outlined" padding="md" style={tw`flex-1`}>
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
        <AppText style={tw`font-semibold flex-1`} numberOfLines={1}>
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
          <AppText style={tw`font-medium text-base mb-1`} numberOfLines={1}>
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
  console.log(user);
  const { recentActivities } = useActivityStore();

  // Bottom sheet ref
  const futureSelfBottomSheetRef = useRef<FutureSelfBottomSheetRef>(null);

  // Prefetching utilities
  const { prefetchDrill, prefetchCommonData } = usePrefetch();

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

  // Prefetch common data on mount
  useEffect(() => {
    prefetchCommonData();
  }, [prefetchCommonData]);

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

  return (
    <SafeAreaView edges={["top"]} style={tw`flex-1  bg-white`}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={tw`pb-6`}
      >
        {/* HEADER */}
        <View style={tw`px-${isSmallScreen ? "4" : "6"} mb-6`}>
          <CallToActionCarousel
            items={[
              {
                id: 'book-call',
                title: 'Book a call',
                subtitle: 'Speak to an English language expert',
                iconBackgroundColor: "#FFFFFF",
                gradientAngle: 135,
                icon: <Phone />,
                gradientColors: ['#3C8CE7', '#00EAFF'], // Blue to cyan gradient
                onPress: () => {
                  // Navigate to book call page or show modal
                  // router.push('/book-call');
                  console.log('Book a call pressed');
                },
              },
              {
                id: 'future-self',
                title: 'Upload your video',
                subtitle: 'Write a message to your future self',
                icon: <VideoIconWhite width={24} height={24} />,
                gradientColors: ['#FF96F9', '#C32BAC'], // Pink gradient
                onPress: handleFutureSelfPress,
              },
            ]}
          />
        </View>
        <View
          style={tw`px-${isSmallScreen ? "4" : "6"} pt-4 pb-6 flex-row justify-between items-center`}
        >
          <View style={tw`flex-1 mr-4`}>
            <AppText style={tw`text-${isSmallScreen ? "xl" : "2xl"} font-bold`}>
              Hello, {name}! 👋
            </AppText>
            <AppText style={tw`text-neutral-500 text-${isSmallScreen ? "sm" : "base"} mt-1`}>
              Good to see you again.
            </AppText>
          </View>

          <View style={tw`flex-row items-center gap-3 flex-shrink-0`}>
            {/* <View style={tw`bg-orange-100 px-3 py-1 rounded-full`}>
              <AppText style={tw`text-orange-600 font-semibold text-sm`}>
                🔥 22
              </AppText>
            </View> */}
            <TouchableOpacity style={tw`w-[40px] h-[40px] bg-neutral-100 rounded-full items-center justify-center`}>
              <BellIcon width={20} height={20} />
            </TouchableOpacity>
          </View>
        </View>

        {/* TODAY'S FOCUS */}
        <View style={tw`px-${isSmallScreen ? "4" : "6"} mb-6`}>
          {isLoadingFocus ? (
            <View style={tw`bg-green-900 rounded-2xl p-${isSmallScreen ? "4" : "5"} items-center justify-center min-h-[200px]`}>
              <Loader />
            </View>
          ) : todaysFocus ? (
            <View style={tw`bg-green-900 rounded-2xl p-${isSmallScreen ? "4" : "5"}`}>
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
            <View style={tw`bg-gray-100 rounded-2xl p-${isSmallScreen ? "4" : "5"} items-center justify-center min-h-[150px]`}>
              <AppText style={tw`text-gray-500 text-center`}>
                No focus available for today
              </AppText>
            </View>
          )}
        </View>

        {/* PROGRESS */}
        <View style={tw`px-${isSmallScreen ? "4" : "6"} mb-6`}>
          <AppText style={tw`text-lg font-bold mb-3`}>Your Progress</AppText>
          <View style={tw`flex-row gap-3`}>
            <ProgressCard
              title="Confidence"
              change="+5% this week"
              progress={74}
              color="#2563eb"
            />
            <ProgressCard
              title="Pronunciation"
              change="+3% this week"
              progress={78}
              color="#22c55e"
            />
          </View>
        </View>

        {/* DAILY REFLECTION + SAVED DRILLS + FUTURE SELF */}
        <View style={tw`px-${isSmallScreen ? "4" : "6"} mb-6`}>
          <View style={tw`flex-row gap-3`}>
            {/* LEFT: Daily Reflection */}
            <Card variant="outlined" padding="md" style={tw`flex-1 bg-neutral-100`}>
              <AppText style={tw`font-semibold mb-1 text-base`}>
                📘 Daily Reflection
              </AppText>
              <AppText style={tw`text-sm text-neutral-500 mb-3`}>
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
                        style={tw`bg-gray-50 rounded-lg p-2.5 border border-gray-100`}
                        activeOpacity={0.7}
                      >
                        <View style={tw`flex-row items-center justify-between mb-1`}>
                          <AppText style={tw`text-xs text-gray-600 font-medium`}>
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
                          style={tw`text-xs text-gray-700`}
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
                style={tw`border border-neutral-200 rounded-full py-2.5 items-center mt-auto`}
              >
                <AppText style={tw`font-medium text-sm`}>
                  Record Journal Entry
                </AppText>
              </TouchableOpacity>
            </Card>

            {/* RIGHT: Saved Drills + Future Self */}
            <View style={tw`flex-1  gap-3`}>
              {/* Saved Drills */}
              <SavedDrillsCard />

              {/* Future Self */}
              <TouchableOpacity onPress={handleFutureSelfPress}>
                <Card variant="outlined" padding="md" style={tw`bg-neutral-100`}>
                  <View style={tw`flex-row items-center gap-2 mb-1`}>
                    <AppText style={tw`text-lg`}>
                      '🎥'
                    </AppText>
                    <AppText style={tw`font-semibold flex-1`} numberOfLines={1}>
                      Future Self
                    </AppText>
                  </View>
                  <AppText style={tw`text-sm text-neutral-500`} numberOfLines={2}>


                    A message you recorded for yourself
                  </AppText>
                  {futureSelfVideo ? <View style={tw`flex-row items-center gap-1`}><VideoIcon />
                    <View>

                      <AppText>
                        Dear Future Self

                      </AppText>
                      <AppText>
                        Video uploaded
                      </AppText>
                    </View>
                  </View> : ""}
                </Card>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* RECENT ACTIVITY */}
        <View style={tw`px-${isSmallScreen ? "4" : "6"}`}>
          <View style={tw`flex-row justify-between items-center mb-3`}>
            <AppText style={tw`text-lg font-bold`}>Recent Activity</AppText>
            <TouchableOpacity>
              <AppText style={tw`text-green-600 font-medium text-sm`}>
                See All
              </AppText>
            </TouchableOpacity>
          </View>

          <View style={tw`gap-3`}>
            {recentActivities.length === 0 ? (
              <View style={tw`items-center py-6 bg-gray-50 rounded-2xl`}>
                <AppText style={tw`text-gray-400`}>No recent activity</AppText>
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
                  iconBg={activity.type === 'roleplay' ? 'bg-blue-50' : 'bg-green-50'}
                  onPress={() => handleRedo(activity)}
                />
              ))
            )}
          </View>
        </View>
      </ScrollView>

      {/* Future Self Bottom Sheet */}
      <FutureSelfBottomSheet ref={futureSelfBottomSheetRef} />
    </SafeAreaView>
  );
}