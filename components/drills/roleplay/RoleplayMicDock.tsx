/**
 * RoleplayMicDock — bottom sheet rendered over the chat for your_turn / recording / preview.
 *
 * Figma nodes:
 *  186444 — your_turn:  white sheet (rounded top 32, md shadow) + 86px concentric mic button only
 *  186461 — recording:  taller sheet + waveform strip + timer + stop button
 *  186478 — preview:    help text + play / waveform / duration / delete row + send button
 */

import AudioButton from "@/components/drills/AudioButton";
import { AppText } from "@/components/ui";
import tw from "@/lib/tw";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Path, Rect } from "react-native-svg";

// ─── Icon atoms ───────────────────────────────────────────────────────────────

function MicIcon() {
  return (
    <Svg width={40} height={40} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 1a4 4 0 014 4v7a4 4 0 01-8 0V5a4 4 0 014-4z"
        fill="white"
      />
      <Path
        d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8"
        stroke="white"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function StopSquareIcon() {
  return (
    <Svg width={40} height={40} viewBox="0 0 24 24" fill="none">
      <Rect x={5} y={5} width={14} height={14} rx={2} fill="white" />
    </Svg>
  );
}

function SendIcon() {
  return (
    <Svg width={36} height={36} viewBox="0 0 24 24" fill="none">
      <Path
        d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z"
        stroke="white"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function PlayIcon({ active }: { active: boolean }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M8 5v14l11-7L8 5z" fill={active ? "#9CA3AF" : "#3b883e"} />
    </Svg>
  );
}

function DeleteIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z"
        stroke="#9CA3AF"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// ─── Waveform bars ────────────────────────────────────────────────────────────

const BAR_HEIGHTS = [8, 14, 20, 16, 24, 18, 12, 22, 10, 26, 16, 14, 20, 28, 18, 12, 22, 16, 10, 24, 14, 18, 12, 20];

function WaveformBars() {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 2, height: 32, flex: 1 }}>
      {BAR_HEIGHTS.map((h, i) => (
        <View
          key={i}
          style={{ flex: 1, height: h, backgroundColor: "#3b883e", borderRadius: 4, opacity: 0.7 }}
        />
      ))}
    </View>
  );
}

// ─── Pulsing animation for recording indicator ─────────────────────────────────

function RecordingPulse() {
  const anim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1.12, duration: 600, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);
  return (
    <Animated.View
      style={{
        width: 8, height: 8, borderRadius: 4,
        backgroundColor: "#ef4444",
        transform: [{ scale: anim }],
        marginRight: 6,
      }}
    />
  );
}

// ─── Concentric mic button (86px outer, matching Figma ring design) ───────────

interface MicRingButtonProps {
  onPress: () => void;
  icon: React.ReactNode;
  color?: string;
  size?: number;
  pulse?: boolean;
}

function MicRingButton({ onPress, icon, color = "#3b883e", size = 86, pulse = false }: MicRingButtonProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (pulse) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, { toValue: 1.12, duration: 700, useNativeDriver: true }),
          Animated.timing(scaleAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    } else {
      scaleAnim.setValue(1);
    }
  }, [pulse]);

  const innerSize = Math.round(size * 0.885);
  const coreSize = Math.round(size * 0.795);

  return (
    <Animated.View
      style={[
        {
          width: size, height: size, borderRadius: size / 2,
          backgroundColor: "rgba(76,175,80,0.1)",
          alignItems: "center", justifyContent: "center",
        },
        pulse ? { transform: [{ scale: scaleAnim }] } : {},
      ]}
    >
      {/* Middle ring */}
      <View
        style={{
          width: innerSize, height: innerSize, borderRadius: innerSize / 2,
          backgroundColor: "rgba(76,175,80,0.1)",
          alignItems: "center", justifyContent: "center",
        }}
      >
        {/* Core button */}
        <TouchableOpacity
          onPress={onPress}
          activeOpacity={0.8}
          style={{
            width: coreSize, height: coreSize, borderRadius: coreSize / 2,
            backgroundColor: color,
            alignItems: "center", justifyContent: "center",
          }}
        >
          {icon}
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

// ─── Main dock ────────────────────────────────────────────────────────────────

export type DockPhase = "your_turn" | "recording" | "preview";

interface RoleplayMicDockProps {
  phase: DockPhase;
  promptText?: string;
  recordedAudioUri?: string | null;
  isPlayingPreview?: boolean;
  elapsedSeconds?: number;
  bottomInset?: number;
  onMicPress: () => void;
  onStopPress: () => void;
  onPlayPreview: () => void;
  onDeleteRecording: () => void;
  onSubmit: () => void;
}

function formatTime(secs: number) {
  const m = Math.floor(secs / 60).toString().padStart(2, "0");
  const s = Math.floor(secs % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function RoleplayMicDock({
  phase,
  promptText,
  recordedAudioUri,
  isPlayingPreview = false,
  elapsedSeconds = 0,
  bottomInset = 0,
  onMicPress,
  onStopPress,
  onPlayPreview,
  onDeleteRecording,
  onSubmit,
}: RoleplayMicDockProps) {
  const sheetHeight = phase === "preview" ? 200 : phase === "recording" ? 176 : 148;

  return (
    <View
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        height: sheetHeight + bottomInset,
        backgroundColor: "white",
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        boxShadow: "0 -4px 12px rgba(0,0,0,0.08)",
        alignItems: "center",
        paddingBottom: bottomInset,
        paddingTop: 20,
      }}
    >
      {/* ── Preview row ── */}
      {phase === "preview" && recordedAudioUri && (
        <>
          <AppText
            style={{ fontSize: 12, color: "#606060", marginBottom: 12, fontWeight: "500" }}
          >
            preview your recording using the play button
          </AppText>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              width: "88%",
              backgroundColor: "#fafafa",
              borderRadius: 24,
              borderWidth: 0.5,
              borderColor: "rgba(76,175,80,0.05)",
              paddingHorizontal: 10,
              paddingVertical: 6,
              marginBottom: 16,
              gap: 8,
            }}
          >
            {/* Play button */}
            <TouchableOpacity
              onPress={onPlayPreview}
              disabled={isPlayingPreview}
              style={{
                width: 24, height: 24, borderRadius: 12,
                backgroundColor: "rgba(201,201,201,0.18)",
                alignItems: "center", justifyContent: "center",
              }}
            >
              <PlayIcon active={isPlayingPreview} />
            </TouchableOpacity>

            {/* Waveform */}
            <WaveformBars />

            {/* Duration */}
            <AppText style={{ fontSize: 10, color: "#171717", fontWeight: "400" }}>
              {formatTime(elapsedSeconds)}
            </AppText>

            {/* Delete */}
            <TouchableOpacity
              onPress={onDeleteRecording}
              style={{
                width: 24, height: 24, borderRadius: 12,
                backgroundColor: "rgba(201,201,201,0.18)",
                alignItems: "center", justifyContent: "center",
              }}
            >
              <DeleteIcon />
            </TouchableOpacity>
          </View>

          {/* Send button */}
          <MicRingButton
            onPress={onSubmit}
            icon={<SendIcon />}
            color="#3b883e"
          />
        </>
      )}

      {/* ── Recording row ── */}
      {phase === "recording" && (
        <>
          {/* Waveform + timer */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              width: "88%",
              backgroundColor: "#fafafa",
              borderRadius: 24,
              borderWidth: 0.5,
              borderColor: "rgba(76,175,80,0.05)",
              paddingHorizontal: 12,
              paddingVertical: 6,
              marginBottom: 16,
              gap: 8,
            }}
          >
            <WaveformBars />
            <AppText style={{ fontSize: 10, color: "#171717", fontWeight: "400" }}>
              {formatTime(elapsedSeconds)}
            </AppText>
          </View>

          {/* Stop button */}
          <MicRingButton
            onPress={onStopPress}
            icon={<StopSquareIcon />}
            color="#3b883e"
            pulse
          />
        </>
      )}

      {/* ── Idle mic ── */}
      {phase === "your_turn" && (
        <MicRingButton
          onPress={onMicPress}
          icon={<MicIcon />}
          color="#3b883e"
        />
      )}
    </View>
  );
}
