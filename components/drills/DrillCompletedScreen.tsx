import { AppText } from "@/components/ui";
import tw from "@/lib/tw";
import { router } from "expo-router";
import { TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Path } from "react-native-svg";

// ─── Close icon (X) ────────────────────────────────────────────
function CloseIcon() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M18 6L6 18M6 6l12 12"
        stroke="#171717"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// ─── Checkmark icon (white ✓ inside circle) ────────────────────
function CheckmarkIcon() {
  return (
    <Svg width={48} height={48} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20 6L9 17L4 12"
        stroke="white"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// ─── Progress Ring ──────────────────────────────────────────────
function ProgressRing({
  completed,
  total,
  size = 220,
  strokeWidth = 18,
}: {
  completed: number;
  total: number;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;

  // The ring has a gap at the bottom (~300° visible arc)
  const gapAngle = 60; // degrees of gap at the bottom
  const visibleArc = 360 - gapAngle;
  const visibleCircumference = (visibleArc / 360) * circumference;
  const gapDashOffset = circumference - visibleCircumference;

  // Progress within the visible arc
  const progress = total > 0 ? Math.min(completed / total, 1) : 0;
  const progressDashOffset =
    visibleCircumference - progress * visibleCircumference;

  // Rotate so gap is at the bottom center
  const rotateAngle = 90 + gapAngle / 2;

  return (
    <View style={tw`items-center justify-center`}>
      <Svg width={size} height={size}>
        {/* Background track */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#e5e5e5"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={`${visibleCircumference} ${gapDashOffset}`}
          strokeLinecap="round"
          transform={`rotate(${rotateAngle} ${size / 2} ${size / 2})`}
        />
        {/* Progress arc */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#3B883E"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={`${progress * visibleCircumference} ${circumference - progress * visibleCircumference}`}
          strokeLinecap="round"
          transform={`rotate(${rotateAngle} ${size / 2} ${size / 2})`}
        />
      </Svg>
      {/* Center text */}
      <View style={tw`absolute items-center justify-center`}>
        <AppText style={tw`text-5xl font-bold text-neutral-900`}>
          {completed}/{total}
        </AppText>
        <AppText style={tw`text-lg text-neutral-500 mt-1`}>Lesson</AppText>
      </View>
    </View>
  );
}

// ─── Props ───────────────────────────────────────────────────────

interface DrillCompletedProgressProps {
  /** "progress" variant: shows a circular progress ring */
  variant: "progress";
  /** Number of lessons / items completed */
  completed: number;
  /** Total lessons / items */
  total: number;
  /** Bold heading — defaults to "Lesson completed" */
  title?: string;
  /** Congratulatory body text */
  message?: string;
  /** Button label — defaults to "Continue" */
  buttonLabel?: string;
  /** Called when the main button is pressed */
  onContinue?: () => void;
  /** Called when the close (X) icon is pressed */
  onClose?: () => void;
}

interface DrillCompletedSubmittedProps {
  /** "submitted" variant: shows a green checkmark circle */
  variant: "submitted";
  /** Bold heading — e.g. "Summary submitted" */
  title?: string;
  /** Body text */
  message?: string;
  /** Button label — defaults to "Continue" */
  buttonLabel?: string;
  /** Called when the main button is pressed */
  onContinue?: () => void;
  /** Called when the close (X) icon is pressed */
  onClose?: () => void;
}

type DrillCompletedScreenProps =
  | DrillCompletedProgressProps
  | DrillCompletedSubmittedProps;

// ─── Component ──────────────────────────────────────────────────

export default function DrillCompletedScreen(
  props: DrillCompletedScreenProps
) {
  const {
    variant,
    title,
    message,
    buttonLabel = "Continue",
    onContinue,
    onClose,
  } = props;

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      router.back();
    }
  };

  const handleContinue = () => {
    if (onContinue) {
      onContinue();
    } else {
      router.back();
    }
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-cream-100`} edges={["top", "bottom"]}>
      {/* Close Button */}
      <View style={tw`px-6 pt-4 flex-row justify-end`}>
        <TouchableOpacity onPress={handleClose} hitSlop={8}>
          <CloseIcon />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={tw`flex-1 px-6 items-center justify-center`}>
        {variant === "progress" ? (
          <>
            {/* Progress Ring */}
            <ProgressRing
              completed={(props as DrillCompletedProgressProps).completed}
              total={(props as DrillCompletedProgressProps).total}
              size={220}
              strokeWidth={18}
            />

            {/* Celebration */}
            <View style={tw`items-center mt-8`}>
              <AppText style={tw`text-4xl mb-2`}>🎉</AppText>
              <AppText
                style={tw`text-2xl font-bold text-neutral-900 mb-3 text-center`}
              >
                {title || "Lesson completed"}
              </AppText>
              {message ? (
                <AppText
                  style={tw`text-base text-neutral-600 text-center leading-6`}
                >
                  {message}
                </AppText>
              ) : null}
            </View>
          </>
        ) : (
          <>
            {/* Green checkmark circle with glow */}
            <View
              style={tw`w-32 h-32 rounded-full bg-primary-50 items-center justify-center mb-6`}
            >
              <View
                style={tw`w-24 h-24 rounded-full bg-primary-500 items-center justify-center`}
              >
                <CheckmarkIcon />
              </View>
            </View>

            {/* Title & message */}
            <AppText
              style={tw`text-2xl font-bold text-neutral-900 mb-3 text-center`}
            >
              {title || "Drill submitted"}
            </AppText>
            {message ? (
              <AppText
                style={tw`text-base text-neutral-600 text-center leading-6 px-2`}
              >
                {message}
              </AppText>
            ) : null}
          </>
        )}
      </View>

      {/* Bottom Button */}
      <View style={tw`px-6 pb-6`}>
        <TouchableOpacity
          onPress={handleContinue}
          style={tw`w-full bg-primary-500 rounded-full py-4 items-center`}
          activeOpacity={0.8}
        >
          <AppText style={tw`text-white text-base font-semibold`}>
            {buttonLabel}
          </AppText>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}






