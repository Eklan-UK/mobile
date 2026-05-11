import { AppText, BoldText } from '@/components/ui';
import tw from '@/lib/tw';
import { LearnerClassListItem } from '@/types/session.types';
import { router } from 'expo-router';
import { Linking } from 'react-native';
import { useRecordAttendance } from '@/hooks/useLearnerClasses';
import { formatRelativeTime, formatSessionDateTime } from '@/utils/sessionFormatters';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { TouchableOpacity, View } from 'react-native';
import JoiningSessionModal from './JoiningSessionModal';

interface NextSessionCardProps {
  /** When null, shows an empty state but keeps the same card layout. */
  session: LearnerClassListItem | null;
}

export function NextSessionCard({ session }: NextSessionCardProps) {
  const [joiningVisible, setJoiningVisible] = useState(false);
  const { mutate: recordAttendance } = useRecordAttendance();

  const hasSession = session != null;
  const canJoin = !!session?.meetingUrl;
  const startsInLabel =
    session?.nextSessionStartUtc != null
      ? formatRelativeTime(session.nextSessionStartUtc)
      : null;

  const { dateLabel, timeLabel } =
    session?.nextSessionStartUtc != null
      ? formatSessionDateTime(session.nextSessionStartUtc, session.nextSessionEndUtc)
      : { dateLabel: '', timeLabel: '' };

  const sessionLabel =
    session &&
    session.sequenceNumber &&
    session.totalSessionsPlanned
      ? `Session ${session.sequenceNumber} of ${session.totalSessionsPlanned}`
      : null;

  const handleJoin = async () => {
    if (!session || !canJoin || !session.meetingUrl || !session.nextSessionId) return;
    setJoiningVisible(true);
    try {
      await Linking.openURL(session.meetingUrl);
      recordAttendance(session.nextSessionId);
    } finally {
      setTimeout(() => setJoiningVisible(false), 2000);
    }
  };

  return (
    <>
      <LinearGradient
        colors={['#3EC6E0', '#2196F3']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={tw`mx-4 mb-4 rounded-3xl p-4`}
      >
        {/* Top row */}
        <View style={tw`flex-row items-center justify-between mb-3`}>
          <View style={tw`flex-row items-center gap-2`}>
            <AppText style={tw`text-white text-sm`}>📹</AppText>
            <AppText style={tw`text-white text-sm font-medium`}>Next Session</AppText>
          </View>
          {startsInLabel && (
            <View style={tw`flex-row items-center bg-white/20 rounded-full px-3 py-1 gap-1`}>
              <AppText style={tw`text-white text-xs`}>🕐</AppText>
              <AppText style={tw`text-white text-xs font-medium`}>{startsInLabel}</AppText>
            </View>
          )}
        </View>

        {/* Date / time */}
        <BoldText style={tw`text-white text-2xl font-bold mb-1`}>
          {hasSession && dateLabel
            ? `${dateLabel}${timeLabel ? ` • ${timeLabel}` : ''}`
            : 'No class scheduled'}
        </BoldText>

        {/* Tutor + session label */}
        <View style={tw`flex-row items-center flex-wrap gap-2 mb-4`}>
          {hasSession ? (
            <>
              <BoldText style={tw`text-white text-sm font-semibold`}>
                {session.tutorName}
              </BoldText>
              {sessionLabel && (
                <>
                  <AppText style={tw`text-white/70 text-sm`}>•</AppText>
                  <AppText style={tw`text-white/70 text-sm`}>{sessionLabel}</AppText>
                </>
              )}
              {session.nextSessionIsReschedule && (
                <View style={tw`bg-yellow-400 rounded-full px-2 py-0.5`}>
                  <AppText style={tw`text-yellow-900 text-xs font-medium`}>Rescheduled</AppText>
                </View>
              )}
            </>
          ) : (
            <AppText style={tw`text-white/90 text-sm leading-5`}>
              When you’re enrolled in a class, your next live session will show here.
            </AppText>
          )}
        </View>

        {/* Action buttons */}
        <View style={tw`flex-row gap-3`}>
          <TouchableOpacity
            style={tw`flex-1 bg-white/20 rounded-full py-3 items-center`}
            onPress={() => router.push('/sessions')}
            activeOpacity={0.8}
          >
            <AppText style={tw`text-white text-sm font-medium`}>View all Sessions</AppText>
          </TouchableOpacity>

          <TouchableOpacity
            style={tw`flex-1 bg-white rounded-full py-3 items-center ${!canJoin ? 'opacity-50' : ''}`}
            onPress={handleJoin}
            disabled={!canJoin}
            activeOpacity={0.8}
          >
            <BoldText style={tw`text-gray-900 text-sm font-bold`}>Join Session</BoldText>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <JoiningSessionModal visible={joiningVisible} />
    </>
  );
}
