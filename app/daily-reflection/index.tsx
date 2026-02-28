import { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText, Button, Loader } from '@/components/ui';
import tw from '@/lib/tw';
import { router } from 'expo-router';
import { reflectionService, DailyReflection } from '@/services/reflection.service';
import { logger } from '@/utils/logger';
import BookmarkCheck from '@/assets/icons/bookmark-check.svg';
import StreakBadge from '@/assets/icons/badge.svg';
const MOOD_EMOJIS: Record<string, string> = {
  comfortable: '😌',
  okay: '🙂',
  uncertain: '😐',
  nervous: '😟',
  struggled: '😣',
  happy: '😊',
  neutral: '😐',
  sad: '😢',
  excited: '🤩',
  tired: '😴',
  motivated: '💪',
};

export default function DailyReflectionListScreen() {
  const [reflections, setReflections] = useState<DailyReflection[]>([]);
  const [streakCount] = useState(22); // TODO: Calculate actual streak
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchReflections = async () => {
    try {
      const response = await reflectionService.getReflections({ limit: 50 });
      setReflections(response.reflections);
    } catch (error: any) {
      logger.error('Error fetching reflections:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReflections();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchReflections();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Check if it's today
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    }
    // Check if it's yesterday
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }

    // Format for past dates
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
    return `${Math.floor(diffInDays / 30)} months ago`;
  };

  const getCurrentDate = () => {
    const today = new Date();
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    };
    return today.toLocaleDateString('en-US', options);
  };

  if (loading) {
    return (
      <SafeAreaView style={tw`flex-1 bg-[#f8f8f8] items-center justify-center`}>
        <Loader />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={tw`flex-1 bg-[#f8f8f8]`} edges={['top']}>
      {/* Header */}
      <View style={tw`px-5 py-4 bg-[#f8f8f8] flex-row items-center justify-between`}>
        <View style={tw`flex-row items-center flex-1`}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={tw`mr-4`}
          >
            <AppText style={tw`text-2xl text-neutral-900`}>←</AppText>
          </TouchableOpacity>
          <AppText style={tw`text-xl font-bold text-neutral-900`}>
            Daily Reflection
          </AppText>
        </View>

        {/* Streak Badge */}
        <View style={tw`flex-row items-center gap-1`}>
          <View style={tw`w-9 h-9 rounded-full bg-orange-100 items-center justify-center`}>
            <StreakBadge />
          </View>
          <View style={tw`bg-yellow-400 rounded-full px-3 py-1.5 border-2 border-yellow-500`}>
            <AppText style={tw`text-sm font-bold text-neutral-900`}>
              🔥 {streakCount}
            </AppText>
          </View>
        </View>
      </View>

      {reflections.length === 0 ? (
        // Empty State - Matches the design from Journal.png
        <View style={tw`flex-1 items-center justify-center px-6`}>
          <View style={tw`items-center`}>
            {/* Bookmark Icon */}
            <View style={tw`mb-6`}>
              <BookmarkCheck />
            </View>

            {/* Date */}
            <AppText style={tw`text-base text-neutral-500 mb-3`}>
              {getCurrentDate()}
            </AppText>

            {/* Message */}
            <AppText style={tw`text-base text-neutral-500 text-center mb-8`}>
              All your journal entry will be save here
            </AppText>

            {/* CTA Button */}
            <TouchableOpacity
              onPress={() => router.push('/daily-reflection/create')}
              activeOpacity={0.7}
            >
              <AppText style={tw`text-base text-blue-500 font-medium`}>
                Record Journal Entry
              </AppText>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        // List View with Reflections
        <ScrollView
          style={tw`flex-1`}
          contentContainerStyle={tw`px-5 pb-6`}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Check if today's reflection exists */}
          {(() => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todaysReflection = reflections.find((r) => {
              const reflectionDate = new Date(r.createdAt);
              reflectionDate.setHours(0, 0, 0, 0);
              return reflectionDate.getTime() === today.getTime();
            });

            if (!todaysReflection) {
              return (
                <View style={tw`mt-4 mb-4`}>
                  <View style={tw`flex-row items-center justify-between mb-4`}>
                    <AppText style={tw`text-2xl font-bold text-neutral-900`}>
                      Recent reflections
                    </AppText>
                    <TouchableOpacity
                      onPress={() => router.push('/daily-reflection/create')}
                      style={tw`w-10 h-10 rounded-full bg-green-600 items-center justify-center`}
                      activeOpacity={0.7}
                    >
                      <AppText style={tw`text-white text-2xl font-bold`}>+</AppText>
                    </TouchableOpacity>
                  </View>
                  <View style={tw`bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4`}>
                    <AppText style={tw`text-sm text-yellow-800 font-medium mb-1`}>
                      📝 Today's reflection not created yet
                    </AppText>
                    <AppText style={tw`text-xs text-yellow-700`}>
                      Tap the + button to create today's reflection
                    </AppText>
                  </View>
                </View>
              );
            }

            return (
              <View style={tw`mt-4 mb-4`}>
                <View style={tw`flex-row items-center justify-between`}>
                  <AppText style={tw`text-2xl font-bold text-neutral-900`}>
                    Recent reflections
                  </AppText>
                </View>
              </View>
            );
          })()}

          {/* Reflections List */}
          <View style={tw`gap-4`}>
            {reflections.map((reflection) => (
              <ReflectionCard
                key={reflection._id}
                reflection={reflection}
                formatDate={formatDate}
              />
            ))}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function ReflectionCard({
  reflection,
  formatDate
}: {
  reflection: DailyReflection;
  formatDate: (dateString: string) => string;
}) {
  const getContentPreview = (reflection: DailyReflection, maxLength: number = 150) => {
    // Prefer content (second input), fall back to answer (first input)
    const text = reflection.content?.trim() || reflection.answer?.trim() || '';

    if (!text) return 'No content';

    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <TouchableOpacity
      onPress={() => {
        router.push(`/daily-reflection/${reflection._id}`);
      }}
      style={tw`bg-white rounded-2xl p-4 flex-row items-center border border-neutral-200`}
      activeOpacity={0.7}
    >
      {/* Emoji */}
      <View style={tw`w-12 h-12 rounded-full bg-neutral-100 items-center justify-center mr-4`}>
        <AppText style={tw`text-2xl`}>
          {MOOD_EMOJIS[reflection.mood] || '😐'}
        </AppText>
      </View>

      {/* Content */}
      <View style={tw`flex-1`}>
        <AppText style={tw`text-sm text-neutral-500 mb-1`}>
          {formatDate(reflection.createdAt)}
        </AppText>
        <AppText
          style={tw`text-base text-neutral-900`}
          numberOfLines={2}
        >
          {getContentPreview(reflection)}
        </AppText>
      </View>

      {/* Chevron */}
      <AppText style={tw`text-xl text-neutral-400 ml-2`}>›</AppText>
    </TouchableOpacity>
  );
}