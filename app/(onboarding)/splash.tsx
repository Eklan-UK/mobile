import English from "@/assets/icons/en.svg";
import { AppText, BoldText } from "@/components/ui";
import tw from "@/lib/tw";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  ImageBackground,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
const { width } = Dimensions.get("window");

const slides = [
  {
    title: "Speak fluently\nfaster.",
    subtitle:
      "Personalised speaking practice powered by AI and guided by real human coaches.",
    image: require("@/assets/images/onboarding/1.png"),
  },
  {
    title: "A smarter way\nto learn.",
    subtitle:
      "We start with a real conversation, then design daily practice around your real goals.",
    image: require("@/assets/images/onboarding/2.png"),
  },
  {
    title: "We'll start by\nunderstanding you.",
    subtitle:
      "A short in-app conversation helps us understand your goals and tailor your daily practice.",
    image: require("@/assets/images/onboarding/3.png"),
  },
];

export default function OnboardingScreen() {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<any>(null);
  const autoScrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    startAutoScroll();
    return () => {
      if (autoScrollTimer.current) {
        clearTimeout(autoScrollTimer.current);
      }
    };
  }, [activeIndex]);

  const startAutoScroll = () => {
    if (autoScrollTimer.current) {
      clearTimeout(autoScrollTimer.current);
    }

    autoScrollTimer.current = setTimeout(() => {
      const nextIndex = (activeIndex + 1) % slides.length;
      scrollToIndex(nextIndex);
    }, 6000);
  };

  const scrollToIndex = (index: number) => {
    scrollViewRef.current?.scrollTo({
      x: index * width,
      animated: true,
    });
    setActiveIndex(index);
  };

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    {
      useNativeDriver: false,
      listener: (event: any) => {
        const offsetX = event.nativeEvent.contentOffset.x;
        const index = Math.round(offsetX / width);
        if (index !== activeIndex) {
          setActiveIndex(index);
        }
      },
    }
  );

  return (
    <View style={tw`flex-1`}>
      {/* Carousel */}
      <Animated.ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        decelerationRate="fast"
        contentContainerStyle={tw`flex-grow`}
      >
        {slides.map((slide, index) => (
          <View key={index} style={[tw`flex-1`, { width }]}>
            <ImageBackground
              source={slide.image}
              resizeMode="cover"
              style={tw`flex-1 w-full`}
            >
              <LinearGradient
                colors={[
                  "rgba(0,0,0,0.05)",
                  "rgba(0,0,0,0.25)",
                  "rgba(15,90,50,0.85)",
                ]}
                locations={[0, 0.45, 1]}
                style={tw`flex-1`}
              >
                <SafeAreaView style={tw`flex-1`}>
                  {/* Language selector */}
                  <View style={tw`items-end px-6 pt-2`}>
                    <View style={[tw`bg-white px-4 flex-row items-center gap-2 py-2 rounded-full`, { opacity: 0.25 }]}>
                      <English />
                      <AppText style={tw`text-lg font-semibold`}>En</AppText>
                    </View>
                  </View>

                  {/* Center content */}
                  <View style={tw`flex-1 justify-center px-8`}>
                    <Animated.View
                      style={{
                        opacity: scrollX.interpolate({
                          inputRange: [
                            (index - 1) * width,
                            index * width,
                            (index + 1) * width,
                          ],
                          outputRange: [0.3, 1, 0.3],
                          extrapolate: "clamp",
                        }),
                        transform: [
                          {
                            translateY: scrollX.interpolate({
                              inputRange: [
                                (index - 1) * width,
                                index * width,
                                (index + 1) * width,
                              ],
                              outputRange: [40, 0, 40],
                              extrapolate: "clamp",
                            }),
                          },
                        ],
                      }}
                    >
                      <BoldText
                        weight="extrabold"
                        style={tw`text-white text-[38px]  text-center leading-tight`}
                      >
                        {slide.title}
                      </BoldText>

                      <AppText
                        style={tw`text-white/90 text-base text-center mt-6 leading-relaxed`}
                      >
                        {slide.subtitle}
                      </AppText>
                    </Animated.View>
                  </View>
                </SafeAreaView>
              </LinearGradient>
            </ImageBackground>
          </View>
        ))}
      </Animated.ScrollView>

      {/* Bottom Overlay */}
      <View
        style={tw`absolute bottom-0 left-0 right-0 pb-8`}
        pointerEvents="box-none"
      >
        <SafeAreaView edges={["bottom"]} style={tw`px-6`}>
          {/* Pagination */}
          <View style={tw`flex-row justify-center mb-6`}>
            {slides.map((_, i) => {
              const inputRange = [
                (i - 1) * width,
                i * width,
                (i + 1) * width,
              ];

              const dotWidth = scrollX.interpolate({
                inputRange,
                outputRange: [10, 24, 10],
                extrapolate: "clamp",
              });

              const opacity = scrollX.interpolate({
                inputRange,
                outputRange: [0.4, 1, 0.4],
                extrapolate: "clamp",
              });

              return (
                <TouchableOpacity
                  key={i}
                  onPress={() => scrollToIndex(i)}
                  activeOpacity={0.8}
                >
                  <Animated.View
                    style={[
                      tw`h-2.5 mx-1 rounded-full bg-white`,
                      { width: dotWidth, opacity },
                    ]}
                  />
                </TouchableOpacity>
              );
            })}
          </View>

          {/* CTA Buttons */}
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => router.replace("/(auth)/auth?mode=signup")}
            style={tw`bg-white rounded-full py-4 items-center mb-4 shadow-lg`}
          >
            <AppText weight="bold" style={tw`text-green-900 font-semibold text-lg`}>
              Get Started
            </AppText>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => router.replace("/(auth)/auth?mode=login")}
            style={tw`border-2 border-white/80 rounded-full py-4 items-center`}
          >
            <AppText weight="medium" style={tw`text-white font-medium text-base`}>
              I already have an account
            </AppText>
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    </View>
  );
}
