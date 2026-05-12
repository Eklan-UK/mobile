/**
 * RoleplayPassSheet — bottom sheet shown on score_pass.
 * Figma node 186556: green #ecffed bg, partying face, score %, Continue + Retry Scene.
 */

import { AppText } from "@/components/ui";
import { TouchableOpacity, View } from "react-native";

interface RoleplayPassSheetProps {
  score: number;
  passThreshold: number;
  bottomInset?: number;
  onContinue: () => void;
  onRetryScene: () => void;
}

export default function RoleplayPassSheet({
  score,
  passThreshold,
  bottomInset = 0,
  onContinue,
  onRetryScene,
}: RoleplayPassSheetProps) {
  return (
    <View
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "#ecffed",
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        boxShadow: "0 -4px 16px rgba(59,136,62,0.12)",
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

      {/* Partying face */}
      <AppText style={{ fontSize: 48, textAlign: "center", marginBottom: 12 }}>🎉</AppText>

      {/* Headline */}
      <AppText
        style={{
          fontSize: 20,
          fontWeight: "700",
          color: "#2a602c",
          textAlign: "center",
          marginBottom: 6,
        }}
      >
        You scored {score}% - Passed!
      </AppText>

      {/* Body */}
      <AppText
        style={{
          fontSize: 14,
          color: "#3d5c3e",
          textAlign: "center",
          marginBottom: 24,
          lineHeight: 20,
        }}
      >
        Great job! You met the {passThreshold}% target. Continue to the next
        line or try this scene again for a higher score.
      </AppText>

      {/* Continue (primary) */}
      <TouchableOpacity
        onPress={onContinue}
        activeOpacity={0.86}
        style={{
          backgroundColor: "#3b883e",
          borderRadius: 35,
          paddingVertical: 16,
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <AppText style={{ color: "#fafafa", fontSize: 16, fontWeight: "700" }}>
          Continue
        </AppText>
      </TouchableOpacity>

      {/* Retry scene (outline) */}
      <TouchableOpacity
        onPress={onRetryScene}
        activeOpacity={0.86}
        style={{
          borderWidth: 1.5,
          borderColor: "#3b883e",
          borderRadius: 35,
          paddingVertical: 14,
          alignItems: "center",
        }}
      >
        <AppText style={{ color: "#3b883e", fontSize: 15, fontWeight: "600" }}>
          Retry Scene
        </AppText>
      </TouchableOpacity>
    </View>
  );
}
