import { AppText } from "@/components/ui";
import tw from "@/lib/tw";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import React from "react";
import {
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function PronunciationResultScreen() {
  const router = useRouter();

  const handleNext = () => {
    router.push("/practice/pronunciation/complete");
  };

  const handleTryAgain = () => {
    router.back();
  };

  const handleBack = () => {
    router.push("/(tabs)/practice");
  };

  // Sample data - in real app this would come from params/state
  const score = 58;
  const passThreshold = 65;
  const wordScore = 58;
  
  const syllables = [
    { text: "fe", score: 60, stress: 1 },
    { text: "bru", score: 44, stress: 0 },
    { text: "a", score: 60, stress: 0 },
    { text: "ey", score: 60, stress: 1 },
  ];

  const letterFeedback = [
    { letter: "fe", score: 60, color: "text-red-600" },
    { letter: "ah", score: 82, color: "text-yellow-600" },
    { letter: "b", score: 35, color: "text-red-600" },
    { letter: "y", score: 42, color: "text-red-600" },
    { letter: "ah", score: 0, color: "text-red-600" },
    { letter: "w", score: 99, color: "text-green-600" },
    { letter: "ah", score: 35, color: "text-red-600" },
    { letter: "r", score: 95, color: "text-green-600" },
    { letter: "y", score: 95, color: "text-green-600" },
  ];

  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Header */}
      <View style={tw`px-5 pt-4 pb-3`}>
        <View style={tw`flex-row items-center justify-between mb-4`}>
          <TouchableOpacity
            onPress={handleBack}
            style={tw`w-10 h-10 items-center justify-center`}
          >
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={tw`text-base font-semibold text-gray-900`}>
            Words
          </Text>
          <Text style={tw`text-sm text-gray-500`}>
            1 of 1
          </Text>
        </View>

        {/* Progress Bar */}
        <View style={tw`h-2 bg-gray-200 rounded-full overflow-hidden`}>
          <View 
            style={[
              tw`h-full bg-green-600 rounded-full`,
              { width: '100%' }
            ]} 
          />
        </View>
      </View>

      <ScrollView style={tw`flex-1`} showsVerticalScrollIndicator={false}>
        {/* Main Content */}
        <View style={tw`px-5 py-6`}>
          {/* Word */}
          <Text style={tw`text-6xl font-bold text-gray-900 mb-2 text-center`}>
            February
          </Text>

          {/* Phonetic */}
          <Text style={tw`text-lg text-gray-600 mb-8 text-center`}>
            /ˈfebruˌeri/
          </Text>

          {/* Audio Controls */}
          <View style={tw`flex-row items-center justify-center gap-4 mb-12`}>
            <TouchableOpacity style={tw`w-10 h-10 items-center justify-center`}>
              <Ionicons name="volume-high" size={24} color="#374151" />
            </TouchableOpacity>
            <TouchableOpacity style={tw`w-10 h-10 items-center justify-center`}>
              <Ionicons name="reload" size={24} color="#374151" />
            </TouchableOpacity>
          </View>

          {/* Pronunciation Score */}
          <View style={tw`mb-8`}>
            <View style={tw`flex-row items-center justify-between mb-2`}>
              <View>
                <AppText style={tw`text-base font-semibold text-gray-900`}>
                  Pronunciation Score
                </AppText>
                <AppText style={tw`text-sm text-gray-500`}>
                  You need {passThreshold}% score to pass
                </AppText>
              </View>
              <Text style={tw`text-4xl font-bold ${score >= passThreshold ? 'text-green-600' : 'text-yellow-600'}`}>
                {score}
              </Text>
            </View>
          </View>

          {/* Word Quality Score */}
          <View style={tw`mb-8`}>
            <View style={tw`flex-row items-center justify-between mb-4`}>
              <AppText style={tw`text-base font-semibold text-gray-900`}>
                February
              </AppText>
              <Text style={tw`text-2xl font-bold ${wordScore >= passThreshold ? 'text-green-600' : 'text-yellow-600'}`}>
                {wordScore}
              </Text>
            </View>
            <AppText style={tw`text-sm text-gray-600 mb-3`}>
              Pronunciation Quality Score
            </AppText>

            {/* Syllables */}
            <AppText style={tw`text-sm font-semibold text-gray-900 mb-2`}>
              Syllables
            </AppText>
            <View style={tw`flex-row items-center gap-3 mb-6`}>
              {syllables.map((syllable, index) => (
                <View key={index} style={tw`items-center`}>
                  <Text style={tw`text-base font-medium text-gray-900 mb-1`}>
                    {syllable.text}
                  </Text>
                  <Text style={tw`text-sm ${syllable.score >= 50 ? 'text-green-600' : 'text-red-600'}`}>
                    {syllable.score}
                  </Text>
                  <Text style={tw`text-xs text-gray-500`}>
                    stress {syllable.stress}
                  </Text>
                </View>
              ))}
            </View>

            {/* Letter-level Feedback */}
            <AppText style={tw`text-sm font-semibold text-gray-900 mb-2`}>
              Letter-level Feedback
            </AppText>
            <View style={tw`flex-row flex-wrap gap-2`}>
              {letterFeedback.map((item, index) => (
                <View key={index} style={tw`items-center`}>
                  <Text style={tw`text-base font-medium ${item.color}`}>
                    {item.letter}
                  </Text>
                  <Text style={tw`text-xs ${item.color}`}>
                    {item.score}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Actions */}
      <View style={tw`px-5 pb-8 gap-3`}>
        {/* Next Button */}
        <TouchableOpacity
          onPress={handleNext}
          style={tw`bg-green-600 rounded-full py-4 items-center`}
          activeOpacity={0.8}
        >
          <AppText style={tw`text-white text-base font-semibold`}>
            Next
          </AppText>
        </TouchableOpacity>

        {/* Try Again Button */}
        <TouchableOpacity
          onPress={handleTryAgain}
          style={tw`py-4 items-center`}
          activeOpacity={0.8}
        >
          <AppText style={tw`text-gray-700 text-base font-medium`}>
            Try again
          </AppText>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
