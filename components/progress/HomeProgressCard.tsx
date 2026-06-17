import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { AppText } from '@/components/ui';
import tw from '@/lib/tw';
import { useSemanticTheme } from '@/hooks/useSemanticTheme';

// ── Trend arrows as inline SVG ────────────────────────────────

function ArrowUp({ color }: { color: string }) {
  return (
    <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 19V5M5 12l7-7 7 7"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ArrowDown({ color }: { color: string }) {
  return (
    <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 5v14M19 12l-7 7-7-7"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// ── Ring ──────────────────────────────────────────────────────

function ProgressRing({
  score,
  ringColor,
  trackColor,
  size = 56,
  strokeWidth = 5,
}: {
  score: number;
  ringColor: string;
  trackColor: string;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedScore = Math.max(0, Math.min(100, score));
  const strokeDashoffset = circumference - (clampedScore / 100) * circumference;
  const center = size / 2;

  return (
    <View style={{ width: size, height: size }}>
      {/* Rotate so the arc starts at the top */}
      <Svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ transform: [{ rotate: '-90deg' }] }}
      >
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={ringColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
        />
      </Svg>
      <View style={[StyleSheet.absoluteFill, tw`items-center justify-center`]}>
        <AppText style={[tw`text-sm font-extrabold`, { lineHeight: 18 }]}>
          {clampedScore}
        </AppText>
      </View>
    </View>
  );
}

// ── Loading skeleton ──────────────────────────────────────────

function Skeleton() {
  const { colors: c } = useSemanticTheme();
  return (
    <View
      style={[
        tw`rounded-2xl p-5 flex-row items-center`,
        { backgroundColor: c.card, borderColor: c.border, borderWidth: StyleSheet.hairlineWidth },
      ]}
    >
      <View style={[tw`w-12 h-12 rounded-xl mr-4`, { backgroundColor: c.muted }]} />
      <View style={[tw`flex-1 gap-2 mr-4`, { minWidth: 0 }]}>
        <View style={[tw`h-4 w-28 rounded`, { backgroundColor: c.muted }]} />
        <View style={[tw`h-3 w-24 rounded`, { backgroundColor: c.muted }]} />
      </View>
      <View style={[tw`w-14 h-14 rounded-full shrink-0`, { backgroundColor: c.muted }]} />
    </View>
  );
}

// ── Props ─────────────────────────────────────────────────────

export interface HomeProgressCardProps {
  label: string;
  score: number;
  weeklyChange: number;
  ringColor: string;
  /** 48×48 icon element rendered inside the rounded square */
  icon: React.ReactNode;
  isLoading?: boolean;
  /** When true, hides the weekly arrow and shows "No data yet" */
  noData?: boolean;
}

// ── Card ──────────────────────────────────────────────────────

export function HomeProgressCard({
  label,
  score,
  weeklyChange,
  ringColor,
  icon,
  isLoading = false,
  noData = false,
}: HomeProgressCardProps) {
  const { colors: c } = useSemanticTheme();

  if (isLoading) return <Skeleton />;

  const clampedScore = Math.max(0, Math.min(100, score));
  const isPositive = weeklyChange >= 0;
  const absChange = Math.abs(weeklyChange);
  const changeColor = isPositive ? '#16a34a' : '#ef4444';

  return (
    <View
      style={[
        tw`rounded-2xl p-5 flex-row items-center min-h-[88px]`,
        { backgroundColor: c.card, borderColor: c.border, borderWidth: StyleSheet.hairlineWidth },
      ]}
    >
      {/* Icon — 48×48 */}
      <View
        style={[
          tw`w-12 h-12 rounded-xl items-center justify-center mr-4`,
          { backgroundColor: `${ringColor}1A` },
        ]}
      >
        {icon}
      </View>

      {/* Label + weekly change */}
      <View style={[tw`flex-1 mr-4`, { minWidth: 0 }]}>
        <AppText style={[tw`text-sm font-bold`, { color: c.textPrimary }]}>
          {label}
        </AppText>

        {noData ? (
          <AppText style={[tw`text-xs mt-1`, { color: c.textSecondary }]}>
            No data yet
          </AppText>
        ) : (
          <View style={tw`flex-row items-center gap-1 mt-1`}>
            {isPositive ? (
              <ArrowUp color={changeColor} />
            ) : (
              <ArrowDown color={changeColor} />
            )}
            <AppText style={[tw`text-xs font-medium`, { color: changeColor }]}>
              {isPositive ? '+' : '-'}{absChange}% this week
            </AppText>
          </View>
        )}
      </View>

      {/* Ring — 56×56, fixed on the right */}
      <View style={tw`shrink-0`}>
        <ProgressRing
          score={clampedScore}
          ringColor={ringColor}
          trackColor={c.progressBg ?? (c.muted as string)}
        />
      </View>
    </View>
  );
}
