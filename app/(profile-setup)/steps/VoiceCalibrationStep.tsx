import { AppText, BoldText, Button } from "@/components/ui";
import tw from "@/lib/tw";
import { useEffect, useState } from "react";
import { Animated, Text, TouchableOpacity, View } from "react-native";
import Svg, { Path, Rect } from "react-native-svg";
import { StepProps } from "./types";

function BackArrowIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M15 19l-7-7 7-7"
        stroke="#1F2937"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function MicIcon({ size = 30, color = "white" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" fill={color} />
      <Path
        d="M19 10v2a7 7 0 01-14 0v-2"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Path d="M12 19v4M8 23h8" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function StopIcon({ size = 26, color = "white" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={4} y={4} width={16} height={16} rx={3} fill={color} />
    </Svg>
  );
}

function ProgressDots({ current, total }: { current: number; total: number }) {
  return (
    <View style={tw`flex-row items-center justify-center gap-2`}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            tw`h-2 rounded-full`,
            i < current
              ? tw`w-2 bg-green-400`
              : i === current
                ? tw`w-8 bg-green-700`
                : tw`w-2 bg-gray-200`,
          ]}
        />
      ))}
    </View>
  );
}

function WaveformAnimation() {
  const [anims] = useState(() =>
    Array.from({ length: 7 }).map(() => new Animated.Value(0.2))
  );

  useEffect(() => {
    const loops = anims.map((a, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 70),
          Animated.timing(a, { toValue: 1, duration: 380, useNativeDriver: true }),
          Animated.timing(a, { toValue: 0.2, duration: 380, useNativeDriver: true }),
        ])
      )
    );
    Animated.parallel(loops).start();
  }, []);

  return (
    <View style={tw`flex-row items-center justify-center gap-1`}>
      {anims.map((a, i) => (
        <Animated.View
          key={i}
          style={[
            tw`w-1 rounded-full bg-green-500`,
            {
              height: 24,
              transform: [
                {
                  scaleY: a.interpolate({
                    inputRange: [0.2, 1],
                    outputRange: [0.2, 1],
                  }),
                },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
}

type Phase = "idle" | "recording" | "analyzing" | "result";

const getFeedback = (score: number) => {
  if (score >= 70)
    return "You sound clear and confident. Let's make this feel even more natural.";
  if (score >= 50)
    return "You're expressing yourself clearly. Let's smooth out your flow and rhythm.";
  if (score >= 30)
    return "You're getting your ideas across now let's work on clarity and confidence together.";
  return "Speaking out loud takes courage. We'll help you build confidence step by step.";
};

const getSubtitle = (phase: Phase, score: number | null) => {
  if (phase === "result" && score !== null) {
    if (score < 50) return "Thanks for giving that a try. Here's where we'll begin.";
    return "I've finished analysing your voice. Here's what we're starting with.";
  }
  return "Repeat this phrase to personalise your experience";
};

export default function VoiceCalibrationStep({
  data,
  onUpdate,
  onNext,
  onBack,
  currentStep,
  totalSteps,
}: StepProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [loading, setLoading] = useState(false);
  const [pulseAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    if (phase === "recording") {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.1, duration: 650, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 650, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [phase]);

  const handleMicPress = () => setPhase("recording");

  const handleStopPress = () => {
    setPhase("analyzing");
    setTimeout(() => {
      const score = Math.floor(Math.random() * 100);
      onUpdate({ confidenceScore: score });
      setPhase("result");
    }, 3000);
  };

  const handleContinue = async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 300));
    setLoading(false);
    onNext();
  };

  const renderPhrase = () => (
    <Text style={tw`text-base text-gray-700 leading-7`}>
      <Text>{"\u201cI\u2019m really excited to improve my English speaking with "}</Text>
      <Text style={tw`font-bold`}>{"Eklan,"}</Text>
      <Text>
        {" so I can express myself clearly and connect better with people around the world.\u201d"}
      </Text>
    </Text>
  );

  return (
    <View style={tw`flex-1 bg-white px-6 pt-5 flex-col`}>
      {/* Header */}
      <View style={tw`flex-row items-center mb-8`}>
        <TouchableOpacity
          onPress={onBack}
          style={tw`w-10 h-10 rounded-full bg-gray-100 items-center justify-center`}
        >
          <BackArrowIcon />
        </TouchableOpacity>
        <View style={tw`flex-1 items-center`}>
          <ProgressDots current={currentStep} total={totalSteps} />
        </View>
      </View>

      {/* Title */}
      <BoldText style={tw`text-2xl text-gray-900 mb-2`}>Let's hear your voice.</BoldText>

      {/* Subtitle */}
      <AppText style={tw`text-base text-gray-500 mb-6`}>
        {getSubtitle(phase, data.confidenceScore)}
      </AppText>

      {/* PRE-RESULT STATES */}
      {phase !== "result" && (
        <>
          {/* Phrase card */}
          <View style={tw`bg-gray-50 border border-gray-100 rounded-2xl p-5 mb-6`}>
            {renderPhrase()}
          </View>

          <View style={tw`flex-1`} />

          {/* Mic / Stop button */}
          <View style={tw`items-center`}>
            <Animated.View
              style={[phase === "recording" ? { transform: [{ scale: pulseAnim }] } : {}]}
            >
              <TouchableOpacity
                onPress={phase === "idle" ? handleMicPress : handleStopPress}
                style={tw`w-24 h-24 rounded-full bg-green-700 items-center justify-center shadow-lg`}
                activeOpacity={0.85}
              >
                {phase === "idle" ? (
                  <MicIcon size={32} color="white" />
                ) : (
                  <StopIcon size={26} color="white" />
                )}
              </TouchableOpacity>
            </Animated.View>

            {/* Waveform */}
            <View style={tw`h-10 items-center justify-center mt-3`}>
              {(phase === "recording" || phase === "analyzing") && <WaveformAnimation />}
            </View>

            {/* Label */}
            <AppText style={tw`text-base text-gray-400 mt-2`}>
              {phase === "idle"
                ? "Tap to start recording"
                : phase === "recording"
                  ? "Listening..."
                  : "Analyzing pronunciation..."}
            </AppText>
          </View>

          {/* Disabled Continue button */}
          <View style={tw`mt-6 mb-2`}>
            <TouchableOpacity disabled style={tw`w-full py-4 rounded-full bg-gray-200 items-center`}>
              <AppText style={tw`text-base text-gray-400 font-medium`}>Continue</AppText>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* RESULT STATE */}
      {phase === "result" && data.confidenceScore !== null && (
        <>
          {/* Score card */}
          <View style={tw`bg-white border border-gray-100 rounded-2xl p-6 items-center`}>
            <View style={tw`w-28 h-28 rounded-full bg-green-50 items-center justify-center mb-4`}>
              <BoldText style={tw`text-5xl text-green-700`}>{data.confidenceScore}</BoldText>
            </View>

            <AppText style={tw`text-xs text-gray-400 text-center mb-4`}>
              This is just a starting point, your score will change as you practice.
            </AppText>

            <AppText style={tw`text-base text-gray-800 text-center leading-6`}>
              {getFeedback(data.confidenceScore)}
            </AppText>
          </View>

          <View style={tw`flex-1`} />

          {/* Active Continue button */}
          <View style={tw`mb-2`}>
            <Button
              onPress={handleContinue}
              loading={loading}
              size="lg"
              style={tw`rounded-full bg-green-700`}
            >
              Continue
            </Button>
          </View>
        </>
      )}
    </View>
  );
}
