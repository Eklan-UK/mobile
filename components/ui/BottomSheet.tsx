import tw from "@/lib/tw";
import { KeyboardAvoidingView, Platform, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface BottomSheetProps {
  children: React.ReactNode;
  onDismiss?: () => void;
}

export function BottomSheet({ children, onDismiss }: BottomSheetProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={tw`flex-1 bg-black/40`}>
      {/* Backdrop - dismissible */}
      {onDismiss && (
        <TouchableOpacity
          style={tw`absolute inset-0`}
          activeOpacity={1}
          onPress={onDismiss}
        />
      )}
      <KeyboardAvoidingView
        style={tw`flex-1 justify-end`}
        behavior={Platform.OS === "ios" ? "padding" : "position"}
        keyboardVerticalOffset={insets.top}
      >
        <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
          <View
            style={[
              tw`bg-white rounded-t-3xl px-6 pt-6`,
              { paddingBottom: Math.max(insets.bottom, 8) + 8 },
            ]}
          >
            {children}
          </View>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </View>
  );
}

