/**
 * RoleplayAiBubble — frosted-glass AI message bubble with avatar stacked above.
 * Left-aligned. Matches Figma nodes 186427, 186510.
 *
 * Translate toggle and speaker TTS button appear beneath the text.
 */

import AudioButton from "@/components/drills/AudioButton";
import { AppText } from "@/components/ui";
import { useState } from "react";
import { TouchableOpacity, View } from "react-native";
import Svg, { Path } from "react-native-svg";

// ─── Eklan AI avatar ─────────────────────────────────────────────────────────

export function BotAvatar({ size = 40 }: { size?: number }) {
  const iconSize = Math.round(size * 0.55);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: "#dcfce7",
        alignItems: "center",
        justifyContent: "center",
        paddingTop: size * 0.18,
        paddingHorizontal: size * 0.18,
      }}
    >
      <Svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none">
        <Path
          d="M12 2C7.8 2 4 5.8 4 10c0 3.5 2.1 6.5 5.2 7.8V22h1.6v-4.2c.4.1.8.2 1.2.2 4.4 0 8-3.6 8-8S16.4 2 12 2z"
          fill="#3b883e"
        />
        <Path
          d="M12 6v8M9 9l3-3 3 3"
          stroke="white"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}

// ─── Translate icon ────────────────────────────────────────────────────────────

function TranslateIcon({ size = 16, color = "#6b7280" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12.87 15.07l-2.54-2.51.03-.03A17.52 17.52 0 0014.07 6H17V4h-7V2H8v2H1v2h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z"
        fill={color}
      />
    </Svg>
  );
}

// ─── Bubble ────────────────────────────────────────────────────────────────────

interface RoleplayAiBubbleProps {
  text: string;
  translation?: string | null;
  showTypingFallback?: boolean;
  voiceId?: string;
}

export default function RoleplayAiBubble({
  text,
  translation,
  voiceId,
}: RoleplayAiBubbleProps) {
  const [showTranslation, setShowTranslation] = useState(false);

  return (
    <View style={{ marginBottom: 16 }}>
      <BotAvatar size={40} />
      <View
        style={{
          marginTop: 8,
          backgroundColor: "rgba(252, 252, 252, 0.85)",
          borderWidth: 0.5,
          borderColor: "rgba(231, 234, 237, 0.5)",
          borderRadius: 24,
          borderTopLeftRadius: 2,
          padding: 16,
        }}
      >
        <AppText
          style={{ fontSize: 14, lineHeight: 20, color: "#3b883e", fontWeight: "700" }}
        >
          {text}
        </AppText>

        {showTranslation && translation ? (
          <AppText
            style={{ fontSize: 12, color: "#737373", fontStyle: "italic", marginTop: 6 }}
          >
            {translation}
          </AppText>
        ) : null}

        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 12 }}>
          {translation ? (
            <TouchableOpacity
              hitSlop={8}
              onPress={() => setShowTranslation((v) => !v)}
            >
              <TranslateIcon
                size={16}
                color={showTranslation ? "#3b883e" : "#6b7280"}
              />
            </TouchableOpacity>
          ) : null}
          <AudioButton text={text} size={16} voiceId={voiceId} />
        </View>
      </View>
    </View>
  );
}
