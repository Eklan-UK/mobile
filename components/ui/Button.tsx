import tw from '@/lib/tw';
import React from 'react';
import { ActivityIndicator, TouchableOpacity, View } from 'react-native';
import { AppText } from './AppText';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'dark' | 'ghost' | 'destructive';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  children: React.ReactNode;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  style?: any;
}

const variantStyles: Record<ButtonVariant, { container: string; text: string }> = {
  primary: {
    container: 'bg-primary-500',
    text: 'text-white',
  },
  secondary: {
    container: 'bg-white border border-neutral-200',
    text: 'text-neutral-900',
  },
  outline: {
    container: 'bg-transparent border border-primary-500',
    text: 'text-primary-500',
  },
  dark: {
    container: 'bg-neutral-900',
    text: 'text-white',
  },
  ghost: {
    container: 'bg-transparent',
    text: 'text-primary-500',
  },
  destructive: {
    container: 'bg-red-600',
    text: 'text-white',
  },
};

const sizeStyles: Record<ButtonSize, { container: string; text: string }> = {
  sm: {
    container: 'py-2 px-4 rounded-lg',
    text: 'text-sm',
  },
  md: {
    container: 'py-3.5 px-6 rounded-xl',
    text: 'text-base',
  },
  lg: {
    container: 'py-4 px-8 rounded-2xl',
    text: 'text-lg',
  },
};

export function Button({
  children,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = true,
  style,
}: ButtonProps) {
  const variantStyle = variantStyles[variant];
  const sizeStyle = sizeStyles[size];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        tw`${variantStyle.container} ${sizeStyle.container} flex-row items-center justify-center ${fullWidth ? 'w-full' : ''} ${disabled ? 'opacity-50' : ''}`,
        style,
      ]}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' || variant === 'dark' || variant === 'destructive' ? '#fff' : '#2E7D32'}
          size="small"
        />
      ) : (
        <View style={tw`flex-row items-center gap-2`}>
          {icon && iconPosition === 'left' && icon}
          <AppText weight="bold" style={tw`${variantStyle.text} ${sizeStyle.text} font-semibold`}>
            {children}
          </AppText>
          {icon && iconPosition === 'right' && icon}
        </View>
      )}
    </TouchableOpacity>
  );
}

