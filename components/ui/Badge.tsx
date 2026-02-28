import { AppText } from './AppText';
import tw from '@/lib/tw';
import React from 'react';
import { View } from 'react-native';

type BadgeVariant = 'primary' | 'accent' | 'success' | 'warning' | 'error' | 'neutral';
type BadgeSize = 'sm' | 'md';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  style?: any;
}

const variantStyles: Record<BadgeVariant, { bg: string; text: string }> = {
  primary: { bg: 'bg-primary-100', text: 'text-primary-700' },
  accent: { bg: 'bg-accent-100', text: 'text-accent-700' },
  success: { bg: 'bg-green-100', text: 'text-green-700' },
  warning: { bg: 'bg-amber-100', text: 'text-amber-700' },
  error: { bg: 'bg-red-100', text: 'text-red-700' },
  neutral: { bg: 'bg-neutral-100', text: 'text-neutral-700' },
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-3 py-1 text-sm',
};

export function Badge({
  children,
  variant = 'primary',
  size = 'sm',
  style,
}: BadgeProps) {
  const { bg, text } = variantStyles[variant];

  return (
    <View style={[tw`${bg} rounded-full self-start`, style]}>
      <AppText style={tw`${text} ${sizeStyles[size]} font-medium`}>
        {children}
      </AppText>
    </View>
  );
}

// Fire streak badge with number
export function StreakBadge({ count }: { count: number }) {
  return (
    <View style={tw`flex-row items-center bg-amber-50 rounded-full px-3 py-1 border border-amber-200`}>
      <AppText style={tw`text-base mr-1`}>🔥</AppText>
      <AppText style={tw`text-amber-700 font-semibold`}>{count}</AppText>
    </View>
  );
}

// Points badge
export function PointsBadge({ count }: { count: number }) {
  return (
    <View style={tw`flex-row items-center bg-amber-50 rounded-full px-3 py-1 border border-amber-200`}>
      <AppText style={tw`text-base mr-1`}>💎</AppText>
      <AppText style={tw`text-amber-700 font-semibold`}>{count}</AppText>
    </View>
  );
}

