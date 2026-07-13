import { Stack } from 'expo-router';

export default function AccountLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="drills/index" />
      <Stack.Screen name="drills/journey/[part]" />
    </Stack>
  );
}
