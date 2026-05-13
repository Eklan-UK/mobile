import { Stack } from "expo-router";
import { useSemanticTheme } from "@/hooks/useSemanticTheme";

export default function DrillsLayout() {
  const { colors: c } = useSemanticTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: c.background },
        animation: "slide_from_right",
      }}
    />
  );
}
