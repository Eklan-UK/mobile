import tw from '@/lib/tw';
import React from 'react';
import { View, ViewProps } from 'react-native';

interface CardProps extends ViewProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'outlined';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  style?: any;
}

const paddingStyles = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

const variantStyles = {
  default: 'bg-white dark:bg-neutral-800 rounded-2xl',
  elevated: 'bg-white dark:bg-neutral-800 rounded-2xl shadow-md',
  outlined: 'bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700',
};

export function Card({
  children,
  variant = 'default',
  padding = 'md',
  style,
  ...props
}: CardProps) {
  return (
    <View
      style={[tw`${variantStyles[variant]} ${paddingStyles[padding]}`, style]}
      {...props}
    >
      {children}
    </View>
  );
}

import { LinearGradient } from "expo-linear-gradient";

// Specialized card for the green "Today's Focus" style
export function FocusCard({
  children,
  style,
  ...props
}: Omit<CardProps, 'variant'>) {
  return (
    <LinearGradient
      colors={["#4ade80", "#3B883E"]} // light green to brand green
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[tw`rounded-2xl p-4`, style]}
      {...props}
    >
      {children}
    </LinearGradient>
  );
}

