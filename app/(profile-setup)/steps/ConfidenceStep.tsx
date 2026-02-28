import { AppText, BoldText, Button } from "@/components/ui";
import tw from "@/lib/tw";
import { useRef, useState, useEffect } from "react";
import { Animated, PanResponder, Switch, TouchableOpacity, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { StepProps } from "./types";
import Img1 from "@/assets/images/gif/confidence/beginner.gif";
import Img2 from "@/assets/images/gif/confidence/comfortable.gif";
import Img3 from "@/assets/images/gif/confidence/fluent.gif";
import { Image } from "expo-image";

function BackArrowIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M15 19l-7-7 7-7"
        stroke="#1F2937"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ProgressDots({ current, total }: { current: number; total: number }) {
  return (
    <View style={tw`flex-row items-center justify-center gap-2`}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            tw`h-2 rounded-full`,
            i < current
              ? tw`w-2 bg-green-400`
              : i === current
                ? tw`w-8 bg-green-700`
                : tw`w-2 bg-gray-200`,
          ]}
        />
      ))}
    </View>
  );
}

export default function ConfidenceStep({ data, onUpdate, onNext, onBack, currentStep, totalSteps }: StepProps) {
  const [loading, setLoading] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);
  const sliderWidth = useRef(0);
  const pan = useRef(new Animated.Value(data.confidence)).current;
  const previousLevelRef = useRef<number | null>(null);

  const getCurrentLevel = () => {
    if (data.confidence < 0.33) return { value: 0, label: "Beginner", source: Img1 };
    if (data.confidence < 0.67) return { value: 0.5, label: "Comfortable", source: Img2 };
    return { value: 1, label: "Fluent", source: Img3 };
  };

  const currentLevel = getCurrentLevel();

  // Restart GIF animation when confidence level changes
  useEffect(() => {
    const currentLevelValue = currentLevel.value;
    if (previousLevelRef.current !== null && previousLevelRef.current !== currentLevelValue) {
      setAnimationKey(prev => prev + 1);
    }
    previousLevelRef.current = currentLevelValue;
  }, [currentLevel.value]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        if (sliderWidth.current > 0) {
          const newValue = Math.max(0, Math.min(1, gestureState.moveX / sliderWidth.current));

          // Calculate old and new levels based on current and new values
          const getLevelValue = (value: number) => {
            if (value < 0.33) return 0;
            if (value < 0.67) return 0.5;
            return 1;
          };

          const oldLevelValue = getLevelValue(data.confidence);
          const newLevelValue = getLevelValue(newValue);

          onUpdate({ confidence: newValue });
          pan.setValue(newValue);

          // Restart animation if we crossed a threshold
          if (oldLevelValue !== newLevelValue) {
            setAnimationKey(prev => prev + 1);
          }
        }
      },
    })
  ).current;

  const handleContinue = async () => {
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 300));
    setLoading(false);
    onNext();
  };

  return (
    <View style={tw`flex-1 bg-white px-6 pt-5`}>
      {/* Header */}
      <View style={tw`flex-row items-center mb-8`}>
        <TouchableOpacity
          onPress={onBack}
          style={tw`w-10 h-10 rounded-full bg-gray-100 items-center justify-center`}
        >
          <BackArrowIcon />
        </TouchableOpacity>
        <View style={tw`flex-1 items-center`}>
          <ProgressDots current={currentStep} total={totalSteps} />
        </View>
      </View>

      {/* Title */}
      <BoldText style={tw`text-2xl text-gray-900 mb-2`}>
        How confident do you feel speaking English?
      </BoldText>
      <AppText style={tw`text-base text-gray-500 mb-8`}>
        There's no wrong answer, just where we'll start from.
      </AppText>

      {/* Emoji Display */}
      <View style={tw`items-center mb-8`}>
        <View style={tw`w-24 h-24 items-center justify-center`}>
          <Image
            key={`confidence-gif-${currentLevel.value}-${animationKey}`}
            source={currentLevel.source}
            style={tw`w-24 h-24`}
          />
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
              tw`h-2 bg-green-700 rounded-full absolute`,
              { width: `${data.confidence * 100}%` },
            ]}
          />
          <Animated.View
            style={[
              tw`w-6 h-6 bg-green-700 rounded-full absolute -top-2 shadow-lg`,
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
          {[
            { value: 0, label: "Beginner" },
            { value: 0.5, label: "Comfortable" },
            { value: 1, label: "Fluent" },
          ].map((level) => (
            <TouchableOpacity
              key={level.value}
              onPress={() => {
                onUpdate({ confidence: level.value });
                pan.setValue(level.value);
                // Restart animation when level is clicked
                setAnimationKey(prev => prev + 1);
              }}
            >
              <AppText
                style={tw`text-sm ${Math.abs(data.confidence - level.value) < 0.17
                    ? "text-green-700 font-bold"
                    : "text-gray-500"
                  }`}
              >
                {level.label}
              </AppText>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Translation Toggle */}
      <View style={tw`bg-white rounded-2xl p-4 border-2 border-gray-200 mb-8`}>
        <View style={tw`flex-row items-center justify-between`}>
          <View style={tw`flex-1 mr-4`}>
            <AppText style={tw`text-base text-gray-900 font-medium mb-1`}>
              Show Korean translations during practice
            </AppText>
            <AppText style={tw`text-sm text-gray-500`}>
              You can change this anytime
            </AppText>
          </View>
          <Switch
            value={data.showTranslations}
            onValueChange={(showTranslations) => onUpdate({ showTranslations })}
            trackColor={{ false: "#E5E7EB", true: "#10B981" }}
            thumbColor={data.showTranslations ? "#FFFFFF" : "#F3F4F6"}
          />
        </View>
      </View>

      {/* Spacer */}
      <View style={tw`flex-1`} />

      {/* Continue Button */}
      <View style={tw`mb-2`}>
        <Button
          onPress={handleContinue}
          loading={loading}
          size="lg"
          style={tw`rounded-full bg-green-700`}
        >
          Continue
        </Button>
      </View>
    </View>
  );
}
