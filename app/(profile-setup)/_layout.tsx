import tw from "@/lib/tw";
import { Stack } from "expo-router";

export default function ProfileSetupLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: tw`bg-white`,
        animation: "none",
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="welcome-complete" />
    </Stack>
  );
}
