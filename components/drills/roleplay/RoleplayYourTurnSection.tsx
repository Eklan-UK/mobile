/**
 * RoleplayYourTurnSection — "Your Turn !" heading + grey quoted prompt card.
 * Figma nodes 186444 / 186461 / 186478 middle block.
 */

import AudioButton from "@/components/drills/AudioButton";
import { AppText } from "@/components/ui";
import { View } from "react-native";

interface RoleplayYourTurnSectionProps {
  promptText: string;
  promptTranslation?: string | null;
  voiceId?: string;
}

export default function RoleplayYourTurnSection({
  promptText,
  promptTranslation,
  voiceId,
}: RoleplayYourTurnSectionProps) {
  return (
    <View style={{ marginBottom: 16 }}>
      {/* Heading */}
      <AppText
        style={{
          fontSize: 20,
          fontWeight: "700",
          color: "#2a602c",
          marginBottom: 12,
          fontFamily: "Nunito-Bold",
        }}
      >
        Your Turn !
      </AppText>

      {/* Quoted prompt card — grey, rounded 24 all corners except TL */}
      <View
        style={{
          backgroundColor: "#f4f4f4",
          borderRadius: 24,
          borderTopLeftRadius: 2,
          padding: 16,
          borderWidth: 0.5,
          borderColor: "rgba(0,0,0,0.06)",
        }}
      >
        {/* Prompt text row */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <AppText
            style={{
              fontSize: 15,
              color: "#171717",
              lineHeight: 22,
              flex: 1,
              fontStyle: "italic",
            }}
          >
            "{promptText}"
          </AppText>
          <AudioButton text={promptText} size={18} voiceId={voiceId} />
        </View>

        {promptTranslation ? (
          <AppText
            style={{
              fontSize: 12,
              color: "#9ca3af",
              fontStyle: "italic",
              marginTop: 6,
            }}
          >
            {promptTranslation}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}
