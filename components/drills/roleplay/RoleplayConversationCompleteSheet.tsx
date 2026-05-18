/**
 * RoleplayConversationCompleteSheet — full-screen scrim + white rounded-top sheet.
 * Figma node 186534: dim overlay, partying icon, "Conversation Completed!",
 * student character name, Review Performance (filled) + Switch Role (outline, disabled).
 */

import { AppText } from "@/components/ui";
import { Modal, TouchableOpacity, View } from "react-native";

interface RoleplayConversationCompleteSheetProps {
  visible: boolean;
  studentCharacterName?: string | null;
  bottomInset?: number;
  onReviewPerformance: () => void;
}

export default function RoleplayConversationCompleteSheet({
  visible,
  studentCharacterName,
  bottomInset = 0,
  onReviewPerformance,
}: RoleplayConversationCompleteSheetProps) {
  return (
    <Modal transparent animationType="fade" visible={visible} statusBarTranslucent>
      {/* Dim scrim */}
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.55)",
          justifyContent: "flex-end",
        }}
      >
        {/* White bottom sheet */}
        <View
          style={{
            backgroundColor: "white",
            borderTopLeftRadius: 32,
            borderTopRightRadius: 32,
            paddingHorizontal: 24,
            paddingTop: 28,
            paddingBottom: bottomInset + 20,
            boxShadow: "0 -4px 20px rgba(0,0,0,0.12)",
          }}
        >
          {/* Drag handle */}
          <View
            style={{
              width: 40, height: 4, borderRadius: 2,
              backgroundColor: "rgba(0,0,0,0.12)",
              alignSelf: "center",
              marginBottom: 24,
            }}
          />

          {/* Partying icon */}
          <AppText style={{ fontSize: 52, textAlign: "center", marginBottom: 16 }}>
            🎉
          </AppText>

          {/* Headline */}
          <AppText
            style={{
              fontSize: 22,
              fontWeight: "700",
              color: "#171717",
              textAlign: "center",
              marginBottom: 8,
            }}
          >
            Conversation Completed!
          </AppText>

          {/* Subtitle */}
          <AppText
            style={{
              fontSize: 14,
              color: "#6a7282",
              textAlign: "center",
              marginBottom: 28,
              lineHeight: 20,
            }}
          >
            {studentCharacterName
              ? `Great work as ${studentCharacterName}! Review how you did and level up your skills.`
              : "Great work! Review how you did and level up your skills."}
          </AppText>

          {/* Review Performance (primary) */}
          <TouchableOpacity
            onPress={onReviewPerformance}
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
              Review Performance
            </AppText>
          </TouchableOpacity>

          {/* Switch Role (disabled outline — coming soon) */}
          <TouchableOpacity
            disabled
            activeOpacity={0.5}
            style={{
              borderWidth: 1.5,
              borderColor: "#d1d5db",
              borderRadius: 35,
              paddingVertical: 14,
              alignItems: "center",
              opacity: 0.45,
            }}
          >
            <AppText style={{ color: "#6a7282", fontSize: 15, fontWeight: "600" }}>
              Switch Role & Practice as Patient
            </AppText>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
