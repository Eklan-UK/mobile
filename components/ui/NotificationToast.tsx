import React, { useEffect, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from './AppText';
import Logo from '@/assets/icons/logo.svg';

export interface NotificationToastProps {
  /** Title shown in bold */
  title: string;
  /** Body text shown below the title */
  body: string;
  /** Visual variant — dark (near-black card) or light (white card) */
  variant?: 'dark' | 'light';
  /** Auto-dismiss after this many ms. 0 = never auto-dismiss. Default: 4000 */
  duration?: number;
  /** Called when the toast finishes animating out */
  onDismiss?: () => void;
  /** Optional emoji override for the icon slot (replaces logo) */
  emoji?: string;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({
  title,
  body,
  variant = 'dark',
  duration = 4000,
  onDismiss,
  emoji,
}) => {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const isDark = variant === 'dark';

  const dismiss = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -120,
        duration: 280,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 280,
        useNativeDriver: true,
      }),
    ]).start(() => onDismiss?.());
  };

  useEffect(() => {
    // Slide in
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        tension: 80,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto-dismiss
    if (duration > 0) {
      const timer = setTimeout(dismiss, duration);
      return () => clearTimeout(timer);
    }
  }, []);

  const cardBg = isDark ? '#1C1C1E' : '#FFFFFF';
  const titleColor = isDark ? '#FFFFFF' : '#111111';
  const bodyColor = isDark ? 'rgba(255,255,255,0.75)' : '#555555';
  const iconBg = isDark ? 'rgba(255,255,255,0.12)' : '#F0FFF4';

  return (
    <Animated.View
      style={[
        styles.wrapper,
        { top: insets.top + 8, transform: [{ translateY }], opacity },
      ]}
    >
      <TouchableOpacity activeOpacity={0.95} onPress={dismiss} style={[styles.card, { backgroundColor: cardBg }, !isDark && styles.cardShadow]}>
        {/* Icon */}
        <View style={[styles.iconContainer, { backgroundColor: iconBg }]}>
          {emoji ? (
            <AppText style={styles.emoji}>{emoji}</AppText>
          ) : (
            <Logo width={22} height={22} />
          )}
        </View>

        {/* Text */}
        <View style={styles.textContainer}>
          <AppText style={[styles.title, { color: titleColor }]} numberOfLines={1}>
            {title}
          </AppText>
          <AppText style={[styles.body, { color: bodyColor }]} numberOfLines={2}>
            {body}
          </AppText>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
  },
  cardShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  emoji: {
    fontSize: 20,
    lineHeight: 24,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontFamily: 'Nunito-Bold',
    marginBottom: 2,
  },
  body: {
    fontSize: 13,
    fontFamily: 'Satoshi-Regular',
    lineHeight: 18,
  },
});
