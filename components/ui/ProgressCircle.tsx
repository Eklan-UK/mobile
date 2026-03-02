import { AppText } from './AppText';
import tw from '@/lib/tw';
import React from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

interface ProgressCircleProps {
  progress: number; // 0-100
  size?: number;
  strokeWidth?: number;
  color?: string;
  backgroundColor?: string;
  children?: React.ReactNode;
  showPercentage?: boolean;
}

export function ProgressCircle({
  progress,
  size = 80,
  strokeWidth = 8,
  color = '#fbbf24', // Yellow accent
  backgroundColor = '#e5e5e5',
  children,
  showPercentage = false,
}: ProgressCircleProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <View style={tw`items-center justify-center`}>
      <Svg width={size} height={size}>
        {/* Background Circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Progress Circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={tw`absolute items-center justify-center`}>
        {children || (showPercentage && (
          <AppText style={tw`text-md text-neutral-900 dark:text-white`}>
            {Math.round(progress)}%
          </AppText>
        ))}
      </View>
    </View>
  );
}

// Simple progress variant for showing minutes/time
export function ProgressRing({
  progress,
  size = 120,
  strokeWidth = 10,
  value,
  label,
}: {
  progress: number;
  size?: number;
  strokeWidth?: number;
  value: string;
  label: string;
}) {
  return (
    <ProgressCircle
      progress={progress}
      size={size}
      strokeWidth={strokeWidth}
      color="#fbbf24"
    >
      <View style={tw`items-center`}>
        <AppText style={tw`text-2xl font-bold text-neutral-900`}>{value}</AppText>
        <AppText style={tw`text-sm text-neutral-500`}>{label}</AppText>
      </View>
    </ProgressCircle>
  );
}

