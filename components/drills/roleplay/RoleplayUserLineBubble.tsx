/**
 * RoleplayUserLineBubble — right-aligned user message in the transcript.
 * Shows purple animoji avatar (40px, #B190B6) stacked above a green-bordered
 * bubble containing the line text + optional score + speaker / undo icons.
 * Figma node 186510.
 */

import AudioButton from "@/components/drills/AudioButton";
import { AppText } from "@/components/ui";
import { View } from "react-native";
import Svg, { Path } from "react-native-svg";

// ─── User avatar — purple circle + person outline ────────────────────────────

export function UserAvatar({ size = 40 }: { size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: "#B190B6",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Simple person silhouette */}
      <Svg
        width={Math.round(size * 0.5)}
        height={Math.round(size * 0.5)}
        viewBox="0 0 24 24"
        fill="none"
      >
        <Path
          d="M12 12c2.67 0 4.8-2.13 4.8-4.8S14.67 2.4 12 2.4 7.2 4.53 7.2 7.2 9.33 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"
          fill="white"
        />
      </Svg>
    </View>
  );
}

// ─── Score color ──────────────────────────────────────────────────────────────

function scoreColor(score: number) {
  if (score >= 80) return "#3b883e";
  if (score >= 60) return "#f59e0b";
  return "#ef4444";
}

// ─── Bubble ────────────────────────────────────────────────────────────────────

interface RoleplayUserLineBubbleProps {
  text: string;
  translation?: string | null;
  score?: number | null;
}

export default function RoleplayUserLineBubble({
  text,
  translation,
  score,
}: RoleplayUserLineBubbleProps) {
  return (
    <View style={{ marginBottom: 16, alignItems: "flex-end" }}>
      {/* Avatar right-aligned */}
      <UserAvatar size={40} />

      {/* Bubble */}
      <View
        style={{
          marginTop: 6,
          maxWidth: "88%",
          backgroundColor: "white",
          borderWidth: 1,
          borderColor: "rgba(59, 136, 62, 0.25)",
          borderRadius: 24,
          borderTopRightRadius: 2,
          padding: 14,
          boxShadow: "0 2px 8px rgba(59,136,62,0.08)",
        }}
      >
        <AppText style={{ fontSize: 14, color: "#171717", lineHeight: 20 }}>
          {text}
        </AppText>

        {translation ? (
          <AppText
            style={{ fontSize: 12, color: "#737373", fontStyle: "italic", marginTop: 4 }}
          >
            {translation}
          </AppText>
        ) : null}

        {score != null ? (
          <AppText
            style={{ fontSize: 12, fontWeight: "700", marginTop: 4, color: scoreColor(score) }}
          >
            {score}%
          </AppText>
        ) : null}

        {/* Speaker icon */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10, justifyContent: "flex-end" }}>
          <AudioButton text={text} size={15} />
        </View>
      </View>
    </View>
  );
}
