/**
 * RoleplayTypingBubble — shown during ai_speaking while TTS is loading.
 * Right-aligns a user animoji (40px circle #B190B6 + person emoji) above the chat,
 * then shows the bot typing indicator with three pulsing dots (Figma 186495).
 */

import { BotAvatar } from "./RoleplayAiBubble";
import { AppText } from "@/components/ui";
import { useEffect, useRef } from "react";
import { Animated, View, ActivityIndicator } from "react-native";

function PulsingDot({ delay }: { delay: number }) {
  const anim = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.3, duration: 400, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);
  return (
    <Animated.View
      style={{
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: "#2a602c",
        opacity: anim,
      }}
    />
  );
}

interface RoleplayTypingBubbleProps {
  characterName?: string;
}

export default function RoleplayTypingBubble({ characterName }: RoleplayTypingBubbleProps) {
  return (
    <View style={{ marginBottom: 16 }}>
      {/* Bot avatar + "is speaking" label */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <BotAvatar size={40} />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <ActivityIndicator size="small" color="#3b883e" />
          <AppText style={{ fontSize: 12, fontWeight: "600", color: "#3b883e" }}>
            {characterName ? `${characterName} is speaking…` : "Speaking…"}
          </AppText>
        </View>
      </View>

      {/* Three pulsing dots bubble */}
      <View
        style={{
          backgroundColor: "rgba(252, 252, 252, 0.85)",
          borderWidth: 0.5,
          borderColor: "rgba(231, 234, 237, 0.5)",
          borderRadius: 24,
          borderTopLeftRadius: 2,
          paddingHorizontal: 20,
          paddingVertical: 16,
          alignSelf: "flex-start",
        }}
      >
        <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
          <PulsingDot delay={0} />
          <PulsingDot delay={150} />
          <PulsingDot delay={300} />
        </View>
      </View>
    </View>
  );
}
