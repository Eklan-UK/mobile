import { AppText, BoldText, Card } from "@/components/ui";
import tw from "@/lib/tw";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Image,
  ScrollView,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { useAuthStore } from "@/store/auth-store";

// Types
type RecordingState = "idle" | "recording" | "analyzing" | "success" | "error";

interface Message {
  id: string;
  type: "ai" | "user";
  content: string;
  word?: string;
  phonetic?: string;
  syllables?: string;
  sentence?: string;
  showAudioControls?: boolean;
  isCorrect?: boolean;
}

// Icons
function BackIcon() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M19 12H5M12 19l-7-7 7-7"
        stroke="#171717"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function SpeakerIcon({ color = "#737373" }: { color?: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M11 5L6 9H2v6h4l5 4V5z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M15.54 8.46a5 5 0 010 7.07"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function SlowIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={10} stroke="#737373" strokeWidth={2} />
      <Path
        d="M12 6v6l3 3"
        stroke="#737373"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function KeyboardIcon() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Rect
        x={2}
        y={4}
        width={20}
        height={16}
        rx={2}
        stroke="#737373"
        strokeWidth={2}
      />
      <Path
        d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M8 16h8"
        stroke="#737373"
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function MicIcon({ size = 32, color = "white" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"
        fill={color}
        stroke={color}
        strokeWidth={2}
      />
      <Path
        d="M19 10v2a7 7 0 01-14 0v-2"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Path
        d="M12 19v4M8 23h8"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function StopIcon({ size = 32 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={6} y={6} width={12} height={12} rx={2} fill="white" />
    </Svg>
  );
}

function RetryIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M1 4v6h6M23 20v-6h-6"
        stroke="#737373"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15"
        stroke="#737373"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// AI Avatar Component
function AIAvatar() {
  return (
    <View
      style={tw`w-10 h-10 rounded-full bg-primary-100 items-center justify-center`}
    >
      <AppText style={tw`text-lg`}>✨</AppText>
    </View>
  );
}

// User Avatar Component
function UserAvatar() {
  const { user } = useAuthStore();

  return (
    <View
      style={tw`w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-primary-500 items-center justify-center overflow-hidden`}
    >
      {user?.avatar ? (
        <Image
          source={{ uri: user.avatar }}
          style={tw`w-full h-full rounded-full`}
          resizeMode="cover"
        />
      ) : (
        <AppText style={tw`text-lg`}>👩‍🎨</AppText>
      )}
    </View>
  );
}

// AI Message Bubble Component
function AIBubble({
  message,
  onPlayAudio,
}: {
  message: Message;
  onPlayAudio?: () => void;
}) {
  return (
    <View style={tw`mb-4`}>
      <AIAvatar />
      <View style={tw`mt-2 ml-0`}>
        <Card variant="outlined" padding="md" style={tw`border-neutral-200`}>
          <AppText style={tw`text-base text-neutral-900`}>{message.content}</AppText>
          {message.word && (
            <AppText style={tw`text-lg font-bold text-primary-500 mt-2`}>
              {message.word}
            </AppText>
          )}
          {message.syllables && (
            <AppText style={tw`text-lg font-bold text-primary-500 mt-2`}>
              {message.syllables}
              {message.phonetic && (
                <AppText style={tw`text-base font-normal text-neutral-500`}>
                  {" "}
                  = {message.phonetic}
                </AppText>
              )}
            </AppText>
          )}
          {message.sentence && (
            <View style={tw`mt-2`}>
              <AppText style={tw`text-base text-neutral-600`}>
                Here is an example with the word "{message.word}":
              </AppText>
              <AppText style={tw`text-base text-neutral-900 mt-1`}>
                👉
                <AppText style={tw`text-primary-500 font-semibold`}>
                  {message.sentence.split(message.word || "")[0]}
                </AppText>
                {message.word}
                {message.sentence.split(message.word || "")[1]}
              </AppText>
            </View>
          )}
          {message.showAudioControls && (
            <View style={tw`flex-row items-center gap-4 mt-3`}>
              <TouchableOpacity>
                <SlowIcon />
              </TouchableOpacity>
              <TouchableOpacity onPress={onPlayAudio}>
                <SpeakerIcon />
              </TouchableOpacity>
            </View>
          )}
        </Card>
      </View>
    </View>
  );
}

// User Message Bubble Component
function UserBubble({
  message,
  onPlayAudio,
  onRetry,
}: {
  message: Message;
  onPlayAudio?: () => void;
  onRetry?: () => void;
}) {
  const isCorrect = message.isCorrect;
  const borderColor = isCorrect === undefined
    ? "border-primary-300"
    : isCorrect
      ? "border-primary-400"
      : "border-red-400";
  const textColor = isCorrect === false ? "text-red-500" : "text-primary-600";

  return (
    <View style={tw`mb-4 items-end`}>
      <View style={tw`flex-row items-start gap-2`}>
        <Card
          variant="outlined"
          padding="md"
          style={tw`${borderColor} bg-white max-w-[75%]`}
        >
          <AppText style={tw`text-base ${textColor} font-medium`}>
            {message.content}
          </AppText>
          <View style={tw`flex-row items-center gap-4 mt-2`}>
            <TouchableOpacity onPress={onPlayAudio}>
              <SpeakerIcon color={isCorrect === false ? "#ef4444" : "#737373"} />
            </TouchableOpacity>
            <TouchableOpacity onPress={onRetry}>
              <RetryIcon />
            </TouchableOpacity>
          </View>
        </Card>
        <UserAvatar />
      </View>
    </View>
  );
}

// User Recording Placeholder
function UserRecordingPlaceholder({ state }: { state: RecordingState }) {
  const text =
    state === "recording"
      ? "Listening..."
      : state === "analyzing"
        ? "Analysing..."
        : "Tap to record";

  return (
    <View style={tw`mb-4 items-end`}>
      <View style={tw`flex-row items-start gap-2`}>
        <Card
          variant="outlined"
          padding="md"
          style={tw`border-primary-300 bg-white`}
        >
          <AppText style={tw`text-base text-neutral-500`}>{text}</AppText>
          <View style={tw`flex-row items-center gap-2 mt-2`}>
            <MicIcon size={16} color="#737373" />
          </View>
        </Card>
        <UserAvatar />
      </View>
    </View>
  );
}

// Progress Bar Component
function ProgressBar({ progress }: { progress: number }) {
  return (
    <View style={tw`h-1.5 bg-neutral-200 rounded-full overflow-hidden`}>
      <View
        style={[tw`h-full bg-primary-500 rounded-full`, { width: `${progress}%` }]}
      />
    </View>
  );
}

// Confetti Animation Component
function Confetti({ visible }: { visible: boolean }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.delay(1500),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, fadeAnim]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        tw`absolute inset-0 items-center justify-center`,
        { opacity: fadeAnim },
      ]}
      pointerEvents="none"
    >
      <AppText style={tw`text-6xl`}>🎉</AppText>
    </Animated.View>
  );
}

export default function LessonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      type: "ai",
      content: "Hello Amy 👋! I'm Eklan, your AI English tutor.\n\nToday, we'll practice how to pronounce the word",
      word: "River",
      showAudioControls: true,
    },
    {
      id: "2",
      type: "ai",
      content:
        "Here is a breakdown on how to pronounce the word, when you are done listening, let's hear what you got",
      syllables: "Ri • ver",
      showAudioControls: true,
    },
  ]);
  const [showConfetti, setShowConfetti] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const currentSentence = 1;
  const totalSentences = 3;
  const progress = (currentSentence / totalSentences) * 100;

  const handleBack = () => {
    router.back();
  };

  const handleMicPress = () => {
    if (recordingState === "idle") {
      setRecordingState("recording");

      // Simulate recording for 3 seconds
      setTimeout(() => {
        setRecordingState("analyzing");

        // Simulate analysis
        setTimeout(() => {
          // Simulate incorrect attempt first
          const userMessage: Message = {
            id: `user-${Date.now()}`,
            type: "user",
            content: "Riber",
            isCorrect: false,
          };
          setMessages((prev) => [...prev, userMessage]);

          // AI feedback
          setTimeout(() => {
            const aiMessage: Message = {
              id: `ai-${Date.now()}`,
              type: "ai",
              content: "Don't worry Amy, take your time,",
              syllables: "Ri • ver",
              phonetic: "/ˈrɪvə/",
              showAudioControls: true,
            };
            setMessages((prev) => [...prev, aiMessage]);
            setRecordingState("idle");

            // Scroll to bottom
            setTimeout(() => {
              scrollViewRef.current?.scrollToEnd({ animated: true });
            }, 100);
          }, 500);
        }, 2000);
      }, 3000);
    } else if (recordingState === "recording") {
      setRecordingState("analyzing");

      // Simulate successful pronunciation
      setTimeout(() => {
        const userMessage: Message = {
          id: `user-${Date.now()}`,
          type: "user",
          content: "River",
          isCorrect: true,
        };
        setMessages((prev) => [...prev, userMessage]);
        setShowConfetti(true);

        // AI congratulation
        setTimeout(() => {
          const aiMessage: Message = {
            id: `ai-${Date.now()}`,
            type: "ai",
            content:
              "You got it right! 👍\nLet's take it a step further by using the word in a sentence.",
            word: "river",
            sentence: "We crossed the river on an old wooden bridge.",
            showAudioControls: true,
          };
          setMessages((prev) => [...prev, aiMessage]);
          setRecordingState("idle");
          setShowConfetti(false);

          // Scroll to bottom
          setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
          }, 100);
        }, 1500);
      }, 2000);
    }
  };

  const getPromptText = () => {
    switch (recordingState) {
      case "idle":
        return "Ready? 😊";
      case "recording":
        return "Tap the mic to respond\n👇";
      case "analyzing":
        return "Analysing...";
      default:
        return "Ready? 😊";
    }
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-cream-100`} edges={["top", "bottom"]}>
      {/* Header */}
      <View style={tw`px-6 pt-4 pb-2`}>
        <View style={tw`flex-row items-center justify-between mb-3`}>
          <TouchableOpacity onPress={handleBack} style={tw`p-1`}>
            <BackIcon />
          </TouchableOpacity>
          <AppText style={tw`text-base font-medium text-neutral-900`}>
            Sentence {currentSentence} of {totalSentences}
          </AppText>
          <AppText style={tw`text-base font-medium text-neutral-500`}>
            {Math.round(progress)}%
          </AppText>
        </View>
        <ProgressBar progress={progress} />
      </View>

      {/* Chat Area */}
      <ScrollView
        ref={scrollViewRef}
        style={tw`flex-1`}
        contentContainerStyle={tw`px-6 py-4`}
        showsVerticalScrollIndicator={false}
      >
        {messages.map((message) =>
          message.type === "ai" ? (
            <AIBubble key={message.id} message={message} />
          ) : (
            <UserBubble key={message.id} message={message} />
          )
        )}

        {/* Show recording placeholder when actively recording or analyzing */}
        {(recordingState === "recording" || recordingState === "analyzing") && (
          <UserRecordingPlaceholder state={recordingState} />
        )}
      </ScrollView>

      {/* Confetti */}
      <Confetti visible={showConfetti} />

      {/* Bottom Recording Area */}
      <View style={tw`px-6 pb-4 pt-2`}>
        <AppText style={tw`text-center text-neutral-500 mb-4`}>
          {getPromptText()}
        </AppText>

        <View style={tw`flex-row items-center justify-center gap-4`}>
          {/* Keyboard Button */}
          <TouchableOpacity
            style={tw`w-14 h-14 rounded-full bg-white border border-neutral-200 items-center justify-center shadow-sm`}
          >
            <KeyboardIcon />
          </TouchableOpacity>

          {/* Mic Button */}
          <TouchableOpacity
            onPress={handleMicPress}
            style={tw`w-20 h-20 rounded-full ${recordingState === "recording" ? "bg-primary-600" : "bg-primary-500"
              } items-center justify-center shadow-lg`}
          >
            {recordingState === "recording" ? (
              <StopIcon size={32} />
            ) : (
              <MicIcon size={32} />
            )}
          </TouchableOpacity>

          {/* Placeholder for symmetry */}
          <View style={tw`w-14 h-14`} />
        </View>
      </View>
    </SafeAreaView>
  );
}
