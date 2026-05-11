import { AppText } from '@/components/ui';
import tw from '@/lib/tw';
import { formatSessionDateTime } from '@/utils/sessionFormatters';
import { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';

interface RescheduleSuccessToastProps {
  /** UTC ISO string of the new session start */
  newStartUtc: string;
  onDismiss: () => void;
}

export function RescheduleSuccessToast({ newStartUtc, onDismiss }: RescheduleSuccessToastProps) {
  const opacity = useRef(new Animated.Value(0)).current;

  const { dateLabel, timeLabel } = formatSessionDateTime(newStartUtc);
  // Just show start time for the toast label
  const startTime = new Date(newStartUtc).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  useEffect(() => {
    // Fade in
    Animated.timing(opacity, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start();

    // Auto-dismiss after 3s
    const timer = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => onDismiss());
    }, 3000);

    return () => clearTimeout(timer);
  }, [newStartUtc]);

  return (
    <Animated.View
      style={[
        tw`absolute top-0 left-4 right-4 z-50`,
        { opacity },
      ]}
    >
      <View
        style={tw`bg-white border border-[rgba(231,234,237,0.5)] rounded-2xl px-3 py-4 flex-row items-center gap-3 shadow-md`}
      >
        <AppText style={tw`text-lg`}>✅</AppText>
        <AppText style={tw`text-[#171717] text-sm font-medium flex-1`}>
          Session rescheduled to {dateLabel} at {startTime}
        </AppText>
      </View>
    </Animated.View>
  );
}
