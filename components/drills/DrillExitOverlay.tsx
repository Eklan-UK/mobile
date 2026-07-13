import { AppText, Loader } from "@/components/ui";
import tw from "@/lib/tw";
import { StyleSheet, View } from "react-native";

interface DrillExitOverlayProps {
  message?: string;
}

export default function DrillExitOverlay({
  message = "Saving progress...",
}: DrillExitOverlayProps) {
  return (
    <View
      style={[StyleSheet.absoluteFill, tw`bg-cream-100 items-center justify-center z-50`]}
      pointerEvents="auto"
    >
      <Loader size={120} />
      {message ? (
        <AppText style={tw`text-base text-neutral-600 mt-4`}>{message}</AppText>
      ) : null}
    </View>
  );
}
