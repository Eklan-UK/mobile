import tw from "@/lib/tw";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <BottomSheetModalProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: tw`bg-cream-100`,
          animation: "slide_from_bottom",
        }}
      >
        {/* Entry to auth flow */}
        <Stack.Screen name="auth" />

        <Stack.Screen name="verify-code" />

        {/* Password reset flow */}
        <Stack.Screen
          name="forgot-password"
          options={{
            presentation: "transparentModal",
            animation: "fade",
          }}
        />
        <Stack.Screen
          name="forgot-password-sent"
          options={{
            presentation: "transparentModal",
            animation: "fade",
          }}
        />
      </Stack>
    </BottomSheetModalProvider>
  );
}
