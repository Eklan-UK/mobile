/**
 * RoleplayFailSheet — bottom sheet shown on score_fail.
 * Figma node 186573: red-tinted bg rgba(255,59,59,0.1), pleading face, score, Try Again.
 */

import { AppText } from "@/components/ui";
import { TouchableOpacity, View } from "react-native";

interface RoleplayFailSheetProps {
  score: number;
  passThreshold: number;
  bottomInset?: number;
  onTryAgain: () => void;
}

export default function RoleplayFailSheet({
  score,
  passThreshold,
  bottomInset = 0,
  onTryAgain,
}: RoleplayFailSheetProps) {
  return (
    <View
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(255, 59, 59, 0.1)",
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        boxShadow: "0 -4px 16px rgba(239,68,68,0.1)",
        paddingBottom: bottomInset + 16,
        paddingTop: 28,
        paddingHorizontal: 24,
      }}
    >
      {/* Drag handle */}
      <View
        style={{
          width: 40, height: 4, borderRadius: 2,
          backgroundColor: "rgba(0,0,0,0.12)",
          alignSelf: "center",
          marginBottom: 20,
        }}
      />

      {/* Pleading face */}
      <AppText style={{ fontSize: 48, textAlign: "center", marginBottom: 12 }}>🥺</AppText>

      {/* Headline */}
      <AppText
        style={{
          fontSize: 20,
          fontWeight: "700",
          color: "#b91c1c",
          textAlign: "center",
          marginBottom: 6,
        }}
      >
        You scored {score}%
      </AppText>

      {/* Body */}
      <AppText
        style={{
          fontSize: 14,
          color: "#7f1d1d",
          textAlign: "center",
          marginBottom: 24,
          lineHeight: 20,
        }}
      >
        You need {passThreshold}% to continue. Keep practicing — you've got
        this!
      </AppText>

      {/* Try Again (primary red) */}
      <TouchableOpacity
        onPress={onTryAgain}
        activeOpacity={0.86}
        style={{
          backgroundColor: "#ef4444",
          borderRadius: 35,
          paddingVertical: 16,
          alignItems: "center",
        }}
      >
        <AppText style={{ color: "white", fontSize: 16, fontWeight: "700" }}>
          Try Again
        </AppText>
      </TouchableOpacity>
    </View>
  );
}
