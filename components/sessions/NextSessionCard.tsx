import { AppText, BoldText } from '@/components/ui';
import tw from '@/lib/tw';
import { LearnerClassListItem } from '@/types/session.types';
import { router } from 'expo-router';
import { useRecordAttendance } from '@/hooks/useLearnerClasses';
import { formatRelativeTime, formatSessionDateTime } from '@/utils/sessionFormatters';
import { useState } from 'react';
import { Linking, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import JoiningSessionModal from './JoiningSessionModal';

const CARD_BG = '#2a602c';
const CTA_YELLOW = '#fbd100';

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
      <View
        style={[
          tw`rounded-[32px] p-6`,
          {
            backgroundColor: CARD_BG,
            boxShadow: '0px 20px 25px -5px rgba(0,0,0,0.1), 0px 8px 10px -6px rgba(0,0,0,0.1)',
          },
        ]}
      >
        <View style={tw`flex-row items-center justify-between`}>
          <View style={tw`flex-row items-center gap-1.5 bg-white/20 rounded-full px-3 py-1`}>
            <Ionicons name="star" size={12} color="#fff" />
            <BoldText
              style={tw`text-white text-[10px] font-bold uppercase tracking-[1px] leading-[15px]`}
            >
              Upcoming Session
            </BoldText>
          </View>
          {startsInLabel ? (
            <View style={tw`flex-row items-center bg-white/20 rounded-full px-2.5 py-1 gap-1`}>
              <Ionicons name="time-outline" size={14} color="#fff" />
              <AppText style={tw`text-white text-xs font-medium`}>{startsInLabel}</AppText>
            </View>
          ) : null}
        </View>

        {hasSession && session.nextSessionIsReschedule ? (
          <View style={tw`mt-2 self-start bg-[#FBD100] rounded-full px-2 py-0.5`}>
            <AppText style={tw`text-[#171717] text-xs font-medium`}>Rescheduled</AppText>
          </View>
        ) : null}

        {hasSession ? (
          <>
            <BoldText style={tw`text-white text-xl font-medium leading-7 pt-3`}>
              {dateLabel
                ? `${dateLabel}${timeLabel ? ` • ${timeLabel}` : ''}`
                : 'Upcoming session'}
            </BoldText>
            <View style={tw`flex-row items-center flex-wrap gap-2 mt-0.5`}>
              <AppText style={tw`text-white/80 text-sm leading-5`}>
                {session.tutorName}
                {sessionLabel ? ` • ${sessionLabel}` : ''}
              </AppText>
            </View>
          </>
        ) : (
          <>
            <BoldText style={tw`text-white text-xl font-medium leading-7 pt-3`}>
              Session Status
            </BoldText>
            <AppText style={tw`text-white/80 text-sm leading-5 mt-0.5`}>
              No upcoming session scheduled. When your tutor adds one, it will appear here.
            </AppText>
          </>
        )}

        <View style={tw`gap-3 pt-7`}>
          <TouchableOpacity
            style={[
              tw`w-full rounded-full py-4 items-center`,
              {
                backgroundColor: CTA_YELLOW,
                boxShadow: '0px 10px 15px -3px rgba(0,0,0,0.1), 0px 4px 6px -4px rgba(0,0,0,0.1)',
              },
            ]}
            onPress={() => router.push('/sessions')}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="View all Sessions"
          >
            <BoldText style={tw`text-[#171717] text-base font-bold`}>
              View all Sessions
            </BoldText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              tw`w-full rounded-full py-[17px] items-center flex-row justify-center gap-2 border`,
              canJoin
                ? tw`bg-white/15 border-white/20`
                : tw`bg-white/10 border-white/5`,
            ]}
            onPress={handleJoin}
            disabled={!canJoin}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityState={{ disabled: !canJoin }}
            accessibilityLabel="Join Session"
          >
            <Ionicons
              name="videocam"
              size={16}
              color={canJoin ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0.4)'}
            />
            <BoldText
              style={[
                tw`text-base font-bold`,
                { color: canJoin ? '#fff' : 'rgba(255,255,255,0.4)' },
              ]}
            >
              Join Session
            </BoldText>
          </TouchableOpacity>
        </View>
      </View>

      <JoiningSessionModal visible={joiningVisible} />
    </>
  );
}
