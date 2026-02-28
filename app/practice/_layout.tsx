import { Stack } from "expo-router";
import React from "react";

export default function PracticeLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ai-talk/index" options={{headerShown:false }}/>
      <Stack.Screen name="pronunciation/index" options={{headerShown:false }}/>
      <Stack.Screen name="pronunciation/list" options={{headerShown:false }}/>
      <Stack.Screen name="pronunciation/result" options={{headerShown:false }}/>
      <Stack.Screen name="pronunciation/complete" options={{headerShown:false }}/>
    </Stack>
  );
}
