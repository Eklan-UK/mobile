import { AppText, BoldText } from '@/components/ui';
import tw from '@/lib/tw';
import {
  useConfirmReschedule,
  useRescheduleOptions,
  useReserveRescheduleSlot,
} from '@/hooks/useLearnerClasses';
import { RescheduleSlot } from '@/types/session.types';
import { formatSessionDateTime } from '@/utils/sessionFormatters';
import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface RescheduleModalProps {
  visible: boolean;
  sessionId: string;
  tutorName: string;
  currentStartUtc: string;
  currentEndUtc: string;
  onClose: () => void;
  onSuccess: (newStartUtc: string) => void;
}

// ─── Step 1: Slot Selection ───────────────────────────────────────────────────

function SlotItem({
  slot,
  selected,
  onPress,
}: {
  slot: RescheduleSlot;
  selected: boolean;
  onPress: () => void;
}) {
  const { dateLabel, timeLabel } = formatSessionDateTime(slot.newStartUtc, slot.newEndUtc);

  if (!slot.isAvailable) {
    return (
      <View
        style={tw`bg-[#FAFAFA] border border-[rgba(231,234,237,0.5)] rounded-2xl px-3 py-3 mb-2 flex-row items-center`}
      >
        <View style={tw`flex-1`}>
          <AppText style={tw`text-[#BBB] text-sm font-medium`}>{dateLabel}</AppText>
          <AppText style={tw`text-[#A4A4A4] text-xs mt-0.5`}>{timeLabel}</AppText>
        </View>
        <AppText style={tw`text-[#A4A4A4] text-xs`}>Unavailable</AppText>
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={[
        tw`border rounded-2xl px-3 py-3 mb-2 flex-row items-center`,
        selected
          ? tw`bg-[#F6FFF7] border-[#3B883E]`
          : tw`bg-[#FCFCFC] border-[rgba(231,234,237,0.5)]`,
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={tw`flex-1`}>
        <AppText
          style={[
            tw`text-sm font-medium`,
            selected ? tw`text-[#1B1B1B]` : tw`text-[#1B1B1B]`,
          ]}
        >
          {dateLabel}
        </AppText>
        <AppText style={tw`text-[#777] text-xs mt-0.5`}>{timeLabel}</AppText>
      </View>
      {selected && <AppText style={tw`text-[#3B883E] text-lg`}>✓</AppText>}
    </TouchableOpacity>
  );
}

// ─── Step 2: Confirm ──────────────────────────────────────────────────────────

interface ConfirmStepProps {
  tutorName: string;
  newStartUtc: string;
  newEndUtc: string;
  isLoading: boolean;
  onBack: () => void;
  onConfirm: () => void;
}

function ConfirmStep({
  tutorName,
  newStartUtc,
  newEndUtc,
  isLoading,
  onBack,
  onConfirm,
}: ConfirmStepProps) {
  const insets = useSafeAreaInsets();
  const { dateLabel, timeLabel } = formatSessionDateTime(newStartUtc, newEndUtc);

  return (
    <View style={tw`flex-1`}>
      {/* Icon + title */}
      <View style={tw`items-center mb-6`}>
        <View style={tw`bg-[#DBEAFE] rounded-full w-[60px] h-[60px] items-center justify-center mb-4`}>
          <AppText style={tw`text-2xl`}>📅</AppText>
        </View>
        <BoldText style={tw`text-[#101828] text-xl font-bold text-center`}>
          Confirm Your New Time
        </BoldText>
        <AppText style={tw`text-[#4A5565] text-sm text-center mt-1`}>
          Your session will be rescheduled to:
        </AppText>
      </View>

      {/* New session card */}
      <View style={tw`bg-[rgba(20,71,230,0.9)] rounded-3xl p-4 mb-4`}>
        <AppText style={tw`text-white text-sm mb-1`}>New Session</AppText>
        <BoldText style={tw`text-white text-xl font-bold mb-2`}>{tutorName}</BoldText>
        <AppText style={tw`text-white text-sm`}>
          {dateLabel} • {timeLabel}
        </AppText>
      </View>

      {/* Warning note */}
      <View
        style={tw`bg-[rgba(254,252,232,0.32)] border border-[rgba(255,240,133,0.28)] rounded-2xl p-4 mb-6`}
      >
        <AppText style={tw`text-[#733E0A] text-sm`}>
          <BoldText style={tw`text-[#733E0A] text-sm font-bold`}>Note: </BoldText>
          Your tutor will be notified of this change. You'll receive a confirmation email shortly.
        </AppText>
      </View>

      {/* Buttons */}
      <View style={[tw`flex-row gap-3`, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        <TouchableOpacity
          style={tw`flex-1 border border-[#E7EAED] rounded-full py-4 items-center`}
          onPress={onBack}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          <AppText style={tw`text-[#171717] text-base font-medium`}>Back</AppText>
        </TouchableOpacity>
        <TouchableOpacity
          style={tw`flex-1 bg-[#3B883E] rounded-full py-4 items-center ${isLoading ? 'opacity-60' : ''}`}
          onPress={onConfirm}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          {isLoading ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <AppText style={tw`text-white text-base font-medium`}>Confirm</AppText>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function RescheduleModal({
  visible,
  sessionId,
  tutorName,
  currentStartUtc,
  currentEndUtc,
  onClose,
  onSuccess,
}: RescheduleModalProps) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<'select' | 'confirm'>('select');
  const [selectedSlot, setSelectedSlot] = useState<RescheduleSlot | null>(null);
  const [reservation, setReservation] = useState<{
    reservationId: string;
    reservationToken: string;
  } | null>(null);

  const { data: optionsData, isLoading: loadingOptions } = useRescheduleOptions(
    visible ? sessionId : null
  );
  const { mutateAsync: reserveSlot, isPending: reserving } = useReserveRescheduleSlot();
  const { mutateAsync: confirmRescheduleMutation, isPending: confirming } = useConfirmReschedule();

  const { dateLabel: currentDate, timeLabel: currentTime } = formatSessionDateTime(
    currentStartUtc,
    currentEndUtc
  );

  const handleClose = () => {
    setStep('select');
    setSelectedSlot(null);
    setReservation(null);
    onClose();
  };

  const handleContinue = async () => {
    if (!selectedSlot) return;
    try {
      const res = await reserveSlot({
        sessionId,
        newStartUtc: selectedSlot.newStartUtc,
        newEndUtc: selectedSlot.newEndUtc,
      });
      setReservation({ reservationId: res.reservationId, reservationToken: res.reservationToken });
      setStep('confirm');
    } catch {
      // error handled by mutation
    }
  };

  const handleConfirm = async () => {
    if (!selectedSlot || !reservation) return;
    try {
      await confirmRescheduleMutation({
        sessionId,
        newStartUtc: selectedSlot.newStartUtc,
        newEndUtc: selectedSlot.newEndUtc,
        reservationId: reservation.reservationId,
        reservationToken: reservation.reservationToken,
      });
      handleClose();
      onSuccess(selectedSlot.newStartUtc);
    } catch {
      // error handled by mutation
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent>
      <View style={tw`flex-1 bg-[rgba(45,50,56,0.8)]`}>
        {/* Backdrop tap to close */}
        <TouchableOpacity style={tw`flex-1`} activeOpacity={1} onPress={handleClose} />

        {/* Sheet */}
        <View
          style={[
            tw`bg-white rounded-t-[35px] overflow-hidden`,
            { maxHeight: '85%' },
          ]}
        >
          {/* Header */}
          <View style={tw`flex-row items-center justify-between px-5 pt-6 pb-3`}>
            <BoldText style={tw`text-[#121217] text-xl font-bold`}>
              {step === 'select' ? 'Reschedule Session' : 'Confirm Reschedule'}
            </BoldText>
            <TouchableOpacity
              style={tw`w-7 h-7 border border-[rgba(208,217,226,0.3)] rounded-full items-center justify-center`}
              onPress={handleClose}
              activeOpacity={0.8}
            >
              <AppText style={tw`text-base leading-none`}>✕</AppText>
            </TouchableOpacity>
          </View>

          {step === 'select' ? (
            <>
              <ScrollView
                style={tw`px-5`}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={tw`pb-4`}
              >
                {/* Current session info */}
                <View style={tw`bg-[#F9FAFB] rounded-3xl p-4 mb-4`}>
                  <AppText style={tw`text-[#4A5565] text-sm mb-2`}>Current Session</AppText>
                  <BoldText style={tw`text-[#101828] text-base font-semibold mb-2`}>
                    {tutorName}
                  </BoldText>
                  <View style={tw`flex-row gap-4`}>
                    <View style={tw`flex-row items-center gap-1`}>
                      <AppText style={tw`text-sm`}>📅</AppText>
                      <AppText style={tw`text-[#4A5565] text-sm`}>{currentDate}</AppText>
                    </View>
                    <View style={tw`flex-row items-center gap-1`}>
                      <AppText style={tw`text-sm`}>🕐</AppText>
                      <AppText style={tw`text-[#4A5565] text-sm`}>{currentTime}</AppText>
                    </View>
                  </View>
                </View>

                {/* Same-week note */}
                <View
                  style={tw`bg-[rgba(239,246,255,0.32)] border border-[rgba(190,219,255,0.28)] rounded-[19px] p-4 mb-4 flex-row gap-3`}
                >
                  <AppText style={tw`text-sm`}>ℹ️</AppText>
                  <AppText style={tw`text-[#1C398E] text-sm flex-1`}>
                    You can only reschedule to another time slot within the same week.
                  </AppText>
                </View>

                {/* Slots */}
                <BoldText style={tw`text-[#1C1917] text-base font-bold mb-3`}>
                  Available time slot
                </BoldText>

                {loadingOptions ? (
                  <ActivityIndicator color="#3B883E" style={tw`my-4`} />
                ) : (
                  optionsData?.slots.map((slot, i) => (
                    <SlotItem
                      key={i}
                      slot={slot}
                      selected={
                        selectedSlot?.newStartUtc === slot.newStartUtc
                      }
                      onPress={() => setSelectedSlot(slot)}
                    />
                  ))
                )}
              </ScrollView>

              {/* Continue button */}
              <View
                style={[
                  tw`px-5 pt-3 bg-white`,
                  { paddingBottom: Math.max(insets.bottom, 8) + 8 },
                ]}
              >
                <TouchableOpacity
                  style={[
                    tw`rounded-full py-4 items-center`,
                    selectedSlot
                      ? tw`bg-[#3B883E]`
                      : tw`bg-[#E8E8E8]`,
                  ]}
                  onPress={handleContinue}
                  disabled={!selectedSlot || reserving}
                  activeOpacity={0.8}
                >
                  {reserving ? (
                    <ActivityIndicator color={selectedSlot ? 'white' : '#C2CAD3'} size="small" />
                  ) : (
                    <AppText
                      style={[
                        tw`text-base font-medium`,
                        selectedSlot ? tw`text-white` : tw`text-[#C2CAD3]`,
                      ]}
                    >
                      Continue
                    </AppText>
                  )}
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <View style={tw`px-5 flex-1`}>
              <ConfirmStep
                tutorName={tutorName}
                newStartUtc={selectedSlot!.newStartUtc}
                newEndUtc={selectedSlot!.newEndUtc}
                isLoading={confirming}
                onBack={() => setStep('select')}
                onConfirm={handleConfirm}
              />
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}
