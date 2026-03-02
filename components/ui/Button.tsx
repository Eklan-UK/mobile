import tw from '@/lib/tw';
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, TouchableOpacity, View } from 'react-native';
import { AppText } from './AppText';
import Logo from '@/assets/icons/logo-white.svg';

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
  textStyle?: any;
}

const variantStyles: Record<ButtonVariant, { container: string; text: string }> = {
  primary: {
    container: 'bg-primary-500',
    text: 'text-white',
  },
  secondary: {
    container: 'bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700',
    text: 'text-neutral-900 dark:text-white',
  },
  outline: {
    container: 'bg-transparent border border-primary-500 dark:border-primary-400',
    text: 'text-primary-500 dark:text-primary-400',
  },
  dark: {
    container: 'bg-neutral-900 dark:bg-white',
    text: 'text-white dark:text-neutral-900',
  },
  ghost: {
    container: 'bg-transparent',
    text: 'text-primary-500 dark:text-primary-400',
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

/** Spinning logo shown inside the button while loading */
function SpinningLogo({ size = 20 }: { size?: number }) {
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const spin = Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    spin.start();
    return () => spin.stop();
  }, [rotation]);

  const rotate = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View style={{ transform: [{ rotate }], width: size, height: size }}>
      <Logo width={size} height={size} />
    </Animated.View>
  );
}

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
  textStyle,
}: ButtonProps) {
  const variantStyle = variantStyles[variant];
  const sizeStyle = sizeStyles[size];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        tw`${variantStyle.container} ${sizeStyle.container} flex-row items-center justify-center ${fullWidth ? 'w-full' : ''} ${disabled ? 'opacity-70' : ''}`,
        style,
      ]}
      activeOpacity={0.8}
    >
      {loading ? (
        <View style={tw`flex-row items-center gap-2`}>
          <SpinningLogo size={22} />
          <AppText weight="bold" style={[tw`${variantStyle.text} ${sizeStyle.text} font-semibold`, textStyle]}>
            {children}
          </AppText>
        </View>
      ) : (
        <View style={tw`flex-row items-center gap-2`}>
          {icon && iconPosition === 'left' && icon}
          <AppText weight="bold" style={[tw`${variantStyle.text} ${sizeStyle.text} font-semibold`, textStyle]}>
            {children}
          </AppText>
          {icon && iconPosition === 'right' && icon}
        </View>
      )}
    </TouchableOpacity>
  );
}
