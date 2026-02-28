import tw from "@/lib/tw";
import { Stack } from "expo-router";

export default function DrillsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: tw`bg-white`,
        animation: "slide_from_right",
      }}
    />
  );
}
