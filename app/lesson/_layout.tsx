import { Stack } from "expo-router";

export default function LessonLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#F9FAF5" },
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="[id]" />
      <Stack.Screen name="completed" />
    </Stack>
  );
}

