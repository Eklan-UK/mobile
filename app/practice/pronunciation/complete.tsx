import { AppText } from "@/components/ui";
import tw from "@/lib/tw";
import { Stack, useRouter } from "expo-router";
import React from "react";
import {
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function PronunciationCompleteScreen() {
  const router = useRouter();

  const handleContinue = () => {
    router.push("/(tabs)/practice");
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-gradient-to-b from-green-50 to-white`}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={tw`flex-1 items-center justify-center px-5`}>
        {/* Circular Progress */}
        <View style={tw`w-48 h-48 rounded-full border-8 border-green-600 items-center justify-center mb-8 relative`}>
          <Text style={tw`text-4xl font-bold text-gray-900`}>1/1</Text>
          <Text style={tw`text-base text-gray-600 absolute bottom-12`}>Lesson</Text>
        </View>

        {/* Celebration Icon */}
        <Text style={tw`text-6xl mb-4`}>🎉</Text>

        {/* Title */}
        <AppText style={tw`text-2xl font-bold text-gray-900 mb-2 text-center`}>
          Lesson completed
        </AppText>

        {/* Message */}
        <AppText style={tw`text-base text-gray-600 text-center px-8 mb-12`}>
          Great job, Amy! You're making excellent progress. Keep it up!
        </AppText>

        {/* Confetti decoration */}
        <View style={tw`absolute inset-0 pointer-events-none`}>
          {[...Array(30)].map((_, i) => (
            <View
              key={i}
              style={[
                tw`absolute w-2 h-2 rounded-full`,
                {
                  backgroundColor: ['#10B981', '#34D399', '#6EE7B7', '#A7F3D0'][i % 4],
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  opacity: 0.6,
                }
              ]}
            />
          ))}
        </View>
      </View>

      {/* Continue Button */}
      <View style={tw`px-5 pb-8`}>
        <TouchableOpacity
          onPress={handleContinue}
          style={tw`bg-green-600 rounded-full py-4 items-center`}
          activeOpacity={0.8}
        >
          <AppText style={tw`text-white text-base font-semibold`}>
            Continue
          </AppText>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
