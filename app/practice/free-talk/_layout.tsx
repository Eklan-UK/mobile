import { Stack } from 'expo-router';
import React from 'react';

export default function FreeTalkLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="session" options={{ headerShown: false, gestureEnabled: false }} />
    </Stack>
  );
}
