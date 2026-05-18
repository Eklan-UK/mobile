import { AppText, BoldText } from '@/components/ui';
import { useRecordAttendance } from '@/hooks/useLearnerClasses';
import tw from '@/lib/tw';
import { LearnerClassListItem, PastSession } from '@/types/session.types';
import {
    deriveDisplayStatus,
    formatRelativeTime,
    formatSessionDateTime,
} from '@/utils/sessionFormatters';
import { Ionicons } from '@expo/vector-icons';
import { Linking, TouchableOpacity, View } from 'react-native';

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status, startUtc }: { status: ReturnType<typeof deriveDisplayStatus>; startUtc: string }) {
  if (status === 'live') {
    return (
      <View style={tw`bg-[#EDFFF4] rounded-full px-3 py-1`}>
        <AppText style={tw`text-[#3B883E] text-xs font-medium`}>Live now</AppText>
      </View>
    );
  }
  if (status === 'join_window') {
    const label = formatRelativeTime(startUtc);
    return (
      <View style={tw`flex-row items-center bg-[#E0EFFF] rounded-full px-2 py-1 gap-1`}>
        <AppText style={tw`text-xs`}>🕐</AppText>
        <AppText style={tw`text-[#007AFF] text-xs font-medium`}>{label}</AppText>
      </View>
    );
  }
  if (status === 'upcoming') {
    return (
      <View style={tw`bg-[rgba(0,122,255,0.11)] rounded-full px-3 py-1`}>
        <AppText style={tw`text-[#007AFF] text-xs font-medium`}>Upcoming</AppText>
      </View>
    );
  }
  if (status === 'completed') {
    return (
      <View style={tw`bg-[#F0FDF4] rounded-full px-3 py-1`}>
        <AppText style={tw`text-[#3B883E] text-xs font-semibold`}>Completed</AppText>
      </View>
    );
  }
  if (status === 'missed') {
    return (
      <View style={tw`bg-[#FEF2F2] rounded-full px-3 py-1`}>
        <AppText style={tw`text-[#FF0E0E] text-xs font-medium`}>Missed</AppText>
      </View>
    );
  }
  return null;
}

// ─── Action buttons ───────────────────────────────────────────────────────────

interface ActionRowProps {
  status: ReturnType<typeof deriveDisplayStatus>;
  meetingUrl?: string | null;
  sessionId: string;
  onReschedule: () => void;
  onJoinStart: () => void;
}

function ActionRow({ status, meetingUrl, sessionId, onReschedule, onJoinStart }: ActionRowProps) {
  const { mutate: recordAttendance } = useRecordAttendance();

  const handleJoin = async () => {
    if (!meetingUrl) return;
    onJoinStart();
    try {
      await Linking.openURL(meetingUrl);
      recordAttendance(sessionId);
    } catch {
      // fail silently, URL opening handled by OS
    }
  };

  if (status === 'live') {
    return (
      <TouchableOpacity
        style={tw`bg-[#3B883E] rounded-full py-2.5 items-center`}
        onPress={handleJoin}
        activeOpacity={0.8}
      >
        <AppText style={tw`text-white text-sm font-medium`}>Join Session</AppText>
      </TouchableOpacity>
    );
  }

  if (status === 'join_window') {
    return (
      <View style={tw`flex-row gap-2`}>
        <TouchableOpacity
          style={tw`flex-1 bg-[#FBD100] rounded-full py-2.5 items-center`}
          onPress={handleJoin}
          activeOpacity={0.8}
        >
          <AppText style={tw`text-[#171717] text-sm font-medium`}>Join Session</AppText>
        </TouchableOpacity>
        <TouchableOpacity
          style={tw`flex-1 border border-gray-200 rounded-full py-2.5 items-center`}
          onPress={onReschedule}
          activeOpacity={0.8}
        >
          <BoldText style={tw`text-[#364153] text-sm font-bold`}>Reschedule</BoldText>
        </TouchableOpacity>
      </View>
    );
  }

  if (status === 'upcoming') {
    return (
      <View style={tw`flex-row gap-2`}>
        <View style={tw`flex-1 bg-[#E8E8E8] rounded-full py-2.5 items-center`}>
          <AppText style={tw`text-[#C2CAD3] text-sm font-medium`}>Join Session</AppText>
        </View>
        <TouchableOpacity
          style={tw`flex-1 border border-gray-200 rounded-full py-2.5 items-center`}
          onPress={onReschedule}
          activeOpacity={0.8}
        >
          <BoldText style={tw`text-[#364153] text-sm font-bold`}>Reschedule</BoldText>
        </TouchableOpacity>
      </View>
    );
  }

  if (status === 'completed') {
    return (
      <TouchableOpacity
        style={tw`border border-gray-200 rounded-full py-2.5 items-center`}
        activeOpacity={0.8}
      >
        <BoldText style={tw`text-[#364153] text-sm font-bold`}>View Recording</BoldText>
      </TouchableOpacity>
    );
  }

  if (status === 'missed') {
    return (
      <TouchableOpacity
        style={tw`bg-[#3B883E] rounded-full py-2.5 items-center`}
        onPress={onReschedule}
        activeOpacity={0.8}
      >
        <BoldText style={tw`text-white text-sm font-bold`}>Reschedule</BoldText>
      </TouchableOpacity>
    );
  }

  return null;
}

// ─── Main card ────────────────────────────────────────────────────────────────

interface SessionCardPropsBase {
  onReschedule: () => void;
  onJoinStart: () => void;
}

export type SessionCardProps =
  | (SessionCardPropsBase & { mode: 'upcoming'; item: LearnerClassListItem })
  | (SessionCardPropsBase & { mode: 'past'; item: PastSession });

export function SessionCard(props: SessionCardProps) {
  const { mode, item, onReschedule, onJoinStart } = props;

  let sessionId: string;
  let startUtc: string;
  let endUtc: string;
  let tutorName: string;
  let meetingUrl: string | null | undefined;
  let displayStatus: ReturnType<typeof deriveDisplayStatus>;

  if (mode === 'upcoming') {
    const c = item as LearnerClassListItem;
    sessionId = c.nextSessionId ?? c.classSeriesId;
    startUtc = c.nextSessionStartUtc ?? '';
    endUtc = c.nextSessionEndUtc ?? '';
    tutorName = c.tutorName;
    meetingUrl = c.meetingUrl;
    displayStatus = deriveDisplayStatus({
      sessionStatus: c.status,
      startUtc,
      endUtc,
      meetingUrl,
    });
  } else {
    const p = item as PastSession;
    sessionId = p.sessionId;
    startUtc = p.startUtc;
    endUtc = p.endUtc;
    tutorName = p.tutorName;
    meetingUrl = p.meetingUrl;
    displayStatus = deriveDisplayStatus({
      sessionStatus: p.sessionStatus,
      learnerAttendance: p.learnerAttendance,
      startUtc,
      endUtc,
      meetingUrl,
    });
  }

  const { dateLabel, timeLabel } = formatSessionDateTime(startUtc, endUtc);

  return (
    <View
      style={tw`bg-[#FCFDFF] border border-[#E7EAED] rounded-3xl p-4 mb-3`}
    >
      {/* Info row */}
      <View style={tw`flex-row items-start justify-between mb-4`}>
        <View style={tw`flex-1 gap-2`}>
          {/* Date */}
          <View style={tw`flex-row items-center gap-2`}>
            <Ionicons name="calendar-outline" size={18} color="#6B7280" />
            <BoldText style={tw`text-[#101828] text-sm font-medium`}>{dateLabel}</BoldText>
          </View>
          {/* Time */}
          <View style={tw`flex-row items-center gap-2`}>
            <AppText style={tw`text-sm`}>🕐</AppText>
            <AppText style={tw`text-[#4A5565] text-sm`}>{timeLabel}</AppText>
          </View>
          {/* Tutor */}
          <AppText style={tw`text-[#364153] text-sm`}>{tutorName}</AppText>
        </View>
        <StatusBadge status={displayStatus} startUtc={startUtc} />
      </View>

      {/* Actions */}
      <ActionRow
        status={displayStatus}
        meetingUrl={meetingUrl}
        sessionId={sessionId}
        onReschedule={onReschedule}
        onJoinStart={onJoinStart}
      />
    </View>
  );
}
