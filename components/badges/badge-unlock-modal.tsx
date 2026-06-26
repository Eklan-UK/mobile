import { AppText, BoldText, Button } from '@/components/ui';
import tw from '@/lib/tw';
import type { BadgeUnlockCelebration } from '@/types/badge.types';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import {
  BackHandler,
  Dimensions,
  Modal,
  Pressable,
  View,
} from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const DIALOG_MAX_WIDTH = Math.min(SCREEN_WIDTH * 0.92, 400);

const GOLD_CONFETTI_COLORS = ['#FBBF24', '#F59E0B', '#D97706', '#92400E'];

interface BadgeUnlockModalProps {
  visible: boolean;
  badge: BadgeUnlockCelebration;
  onDismiss: () => void;
  onViewBadges: () => void;
}

export function BadgeUnlockModal({
  visible,
  badge,
  onDismiss,
  onViewBadges,
}: BadgeUnlockModalProps) {
  const confettiRef = useRef<ConfettiCannon>(null);
  const hapticPlayedRef = useRef(false);

  useEffect(() => {
    if (!visible) {
      hapticPlayedRef.current = false;
      return;
    }

    if (!hapticPlayedRef.current) {
      hapticPlayedRef.current = true;
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => {
          /* best-effort — simulators may not support haptics */
        }
      );
    }

    const id = setTimeout(() => confettiRef.current?.start(), 100);
    return () => clearTimeout(id);
  }, [visible, badge.badgeId]);

  useEffect(() => {
    if (!visible) return;

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onDismiss();
      return true;
    });

    return () => subscription.remove();
  }, [visible, onDismiss]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
      accessibilityViewIsModal
    >
      <Pressable
        style={tw`flex-1 justify-center items-center px-4`}
        onPress={onDismiss}
        accessibilityRole="button"
        accessibilityLabel="Dismiss badge unlock celebration"
      >
        <View
          style={{
            ...tw`absolute inset-0`,
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
          }}
        />

        <ConfettiCannon
          ref={confettiRef}
          count={200}
          origin={{ x: SCREEN_WIDTH / 2, y: SCREEN_HEIGHT * 0.5 }}
          autoStart={false}
          fadeOut
          fallSpeed={3000}
          explosionSpeed={350}
          colors={GOLD_CONFETTI_COLORS}
        />

        <Pressable
          onPress={(event) => event.stopPropagation()}
          style={[
            tw`bg-white rounded-2xl p-6 w-full`,
            {
              maxWidth: DIALOG_MAX_WIDTH,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.15,
              shadowRadius: 24,
              elevation: 12,
            },
          ]}
          accessibilityRole="alert"
          accessibilityLabel={`Badge unlocked: ${badge.badgeName}`}
        >
          <View style={tw`items-center`}>
            <LinearGradient
              colors={['#FBBF24', '#F97316']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={tw`w-20 h-20 rounded-full items-center justify-center mb-4`}
            >
              <AppText style={{ fontSize: 36 }}>{badge.icon}</AppText>
            </LinearGradient>

            <AppText
              style={tw`text-sm font-medium uppercase tracking-widest text-orange-600 mb-2`}
            >
              Badge Unlocked!
            </AppText>

            <BoldText style={tw`text-2xl font-bold text-neutral-900 text-center mb-4`}>
              {badge.badgeName}
            </BoldText>

            <AppText style={tw`text-sm text-neutral-600 text-center leading-5 mb-2`}>
              {badge.afterOutcome}
            </AppText>

            <AppText style={tw`text-sm italic text-neutral-500 text-center leading-5 mb-6`}>
              {badge.humorousLine}
            </AppText>

            <View style={tw`flex-row gap-3 w-full`}>
              <View style={tw`flex-1`}>
                <Button onPress={onDismiss} variant="primary" size="md" fullWidth>
                  Awesome!
                </Button>
              </View>
              <View style={tw`flex-1`}>
                <Button onPress={onViewBadges} variant="secondary" size="md" fullWidth>
                  View badges
                </Button>
              </View>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
