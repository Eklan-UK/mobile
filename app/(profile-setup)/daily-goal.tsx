import { AppText, BoldText, Button } from "@/components/ui";
import tw from "@/lib/tw";
import { router, useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import { Animated, PanResponder, Switch, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Progress dots component
function ProgressDots({ current, total }: { current: number; total: number }) {
  return (
    <View style={tw`flex-row items-center justify-center gap-2 mb-8`}>
      {Array.from({ length: total }).map((_, index) => (
        <View
          key={index}
          style={tw`${index <= current ? "bg-primary-500 w-6" : "bg-neutral-200 w-2"} h-2 rounded-full`}
        />
      ))}
    </View>
  );
}

const confidenceLevels = [
  { value: 0, label: "Beginner", emoji: "😊" },
  { value: 0.5, label: "Comfortable", emoji: "😀" },
  { value: 1, label: "Fluent", emoji: "😎" },
];

export default function ConfidenceLevelScreen() {
  const params = useLocalSearchParams();
  const [confidence, setConfidence] = useState(0.5);
  const [showTranslations, setShowTranslations] = useState(false);
  const [loading, setLoading] = useState(false);
  const sliderWidth = useRef(0);
  const pan = useRef(new Animated.Value(0.5)).current;

  const getCurrentLevel = () => {
    if (confidence < 0.33) return confidenceLevels[0];
    if (confidence < 0.67) return confidenceLevels[1];
    return confidenceLevels[2];
  };

  const currentLevel = getCurrentLevel();

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {},
      onPanResponderMove: (_, gestureState) => {
        if (sliderWidth.current > 0) {
          const newValue = Math.max(0, Math.min(1, gestureState.moveX / sliderWidth.current));
          setConfidence(newValue);
          pan.setValue(newValue);
        }
      },
      onPanResponderRelease: () => {},
    })
  ).current;

  const handleContinue = async () => {
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    setLoading(false);

    router.push({
      pathname: "/(profile-setup)/nationality",
      params: { ...params, confidence: confidence.toString(), showTranslations: showTranslations.toString() },
    });
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-cream-100`} edges={["top", "bottom"]}>
      <View style={tw`flex-1 px-6 pt-8`}>
        {/* Progress: step 4 of 6 */}
        <ProgressDots current={3} total={6} />

        {/* Title */}
        <BoldText style={tw`text-2xl font-bold text-neutral-900 mb-2`}>
          How confident do you feel speaking English?
        </BoldText>
        <AppText style={tw`text-base text-neutral-500 mb-8`}>
          There's no wrong answer, just where we'll start from.
        </AppText>

        {/* Emoji Display */}
        <View style={tw`items-center mb-8`}>
          <View style={tw`w-24 h-24 rounded-full bg-yellow-400 items-center justify-center shadow-lg`}>
            <AppText style={tw`text-5xl`}>{currentLevel.emoji}</AppText>
          </View>
        </View>

        {/* Slider */}
        <View style={tw`mb-4`}>
          <View
            style={tw`h-2 bg-gray-200 rounded-full mb-4 relative`}
            onLayout={(event) => {
              sliderWidth.current = event.nativeEvent.layout.width;
            }}
            {...panResponder.panHandlers}
          >
            <View
              style={[
                tw`h-2 bg-primary-500 rounded-full absolute`,
                { width: `${confidence * 100}%` },
              ]}
            />
            <Animated.View
              style={[
                tw`w-6 h-6 bg-primary-500 rounded-full absolute -top-2 shadow-lg`,
                {
                  left: pan.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                  marginLeft: -12,
                },
              ]}
            />
          </View>
          {/* Labels */}
          <View style={tw`flex-row justify-between mt-2`}>
            <TouchableOpacity onPress={() => {
              setConfidence(0);
              pan.setValue(0);
            }}>
              <AppText style={tw`text-sm ${confidence < 0.33 ? "text-primary-500 font-bold" : "text-neutral-500"}`}>
                Beginner
              </AppText>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => {
              setConfidence(0.5);
              pan.setValue(0.5);
            }}>
              <AppText style={tw`text-sm ${confidence >= 0.33 && confidence < 0.67 ? "text-primary-500 font-bold" : "text-neutral-500"}`}>
                Comfortable
              </AppText>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => {
              setConfidence(1);
              pan.setValue(1);
            }}>
              <AppText style={tw`text-sm ${confidence >= 0.67 ? "text-primary-500 font-bold" : "text-neutral-500"}`}>
                Fluent
              </AppText>
            </TouchableOpacity>
          </View>
        </View>

        {/* Translation Toggle */}
        <View style={tw`bg-white rounded-2xl p-4 border-2 border-neutral-200 mb-8`}>
          <View style={tw`flex-row items-center justify-between`}>
            <View style={tw`flex-1 mr-4`}>
              <AppText style={tw`text-base text-neutral-900 font-medium mb-1`}>
                Show Korean translations during practice
              </AppText>
              <AppText style={tw`text-sm text-neutral-500`}>
                You can change this anytime
              </AppText>
            </View>
            <Switch
              value={showTranslations}
              onValueChange={setShowTranslations}
              trackColor={{ false: "#E5E7EB", true: "#10B981" }}
              thumbColor={showTranslations ? "#FFFFFF" : "#F3F4F6"}
            />
          </View>
        </View>

        {/* Spacer */}
        <View style={tw`flex-1`} />

        {/* Continue Button */}
        <View style={tw`pb-4`}>
          <Button onPress={handleContinue} loading={loading}>
            Continue
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
}
