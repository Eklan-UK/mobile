import { AppText } from "@/components/ui";
import tw from "@/lib/tw";
import { router } from "expo-router";
import { useState } from "react";
import { Linking, ScrollView, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

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

function PlusIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 5v14M5 12h14"
        stroke="#22c55e"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function MinusIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 12h14"
        stroke="#22c55e"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// FAQ Item Component
function FAQItem({
  number,
  question,
  answer,
  isExpanded,
  onToggle,
}: {
  number: number;
  question: string;
  answer: string;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <View style={tw`bg-white rounded-xl mb-3 overflow-hidden`}>
      <TouchableOpacity
        onPress={onToggle}
        style={tw`flex-row items-center justify-between p-4`}
      >
        <AppText style={tw`text-base text-neutral-900 flex-1 pr-4`}>
          {number}. {question}
        </AppText>
        {isExpanded ? <MinusIcon /> : <PlusIcon />}
      </TouchableOpacity>
      {isExpanded && (
        <View style={tw`px-4 pb-4`}>
          <View style={tw`h-px bg-neutral-100 mb-3`} />
          <AppText style={tw`text-sm text-neutral-600 leading-5`}>{answer}</AppText>
        </View>
      )}
    </View>
  );
}

// FAQ Data
const faqData = [
  {
    question: "What is Eklan?",
    answer:
      "Eklan is an AI-powered English learning application designed to help you improve your pronunciation, speaking confidence, and overall English fluency through personalized lessons and real-time feedback.",
  },
  {
    question: "Who can use eklan?",
    answer:
      "Eklan is designed for anyone looking to improve their English skills, from beginners to advanced learners. It's particularly helpful for non-native speakers who want to work on their pronunciation and speaking confidence.",
  },
  {
    question: "How does eklan improve my pronunciation?",
    answer:
      "Eklan uses advanced AI speech recognition technology to analyze your pronunciation in real-time. It identifies specific sounds you need to work on and provides targeted exercises and feedback to help you improve.",
  },
  {
    question: "What makes eklan different from other English learning apps?",
    answer:
      "Eklan focuses specifically on pronunciation and speaking confidence, using AI to provide personalized feedback. Unlike other apps that focus on vocabulary or grammar, we help you sound more natural and confident when speaking English.",
  },
  {
    question: "Do I need to be fluent in English to use eklan?",
    answer:
      "No! Eklan is designed for learners at all levels. Whether you're just starting out or looking to refine your advanced skills, our AI adapts to your level and provides appropriate exercises.",
  },
  {
    question: "Does Eklan work on mobile and web?",
    answer:
      "Yes, Eklan is available on both iOS and Android mobile devices, as well as through our web application. Your progress syncs across all platforms.",
  },
  {
    question: "Do I need a subscription to use Eklan?",
    answer:
      "Eklan offers both free and premium tiers. The free version includes basic lessons and features, while premium unlocks unlimited AI practice, offline access, and advanced content.",
  },
  {
    question: "How do I start a lesson?",
    answer:
      "Simply open the app, go to the Practice tab, and select a drill or scenario you'd like to work on. You can also start with the daily recommended practice from your home screen.",
  },
  {
    question: "Can the AI understand different accents?",
    answer:
      "Yes! Our AI is trained on a diverse range of accents and can understand and provide feedback for speakers from various linguistic backgrounds.",
  },
  {
    question: "Does Eklan store my voice recordings?",
    answer:
      "Your voice recordings are processed in real-time to provide feedback and are not permanently stored. We take your privacy seriously and you can review our privacy policy for more details.",
  },
  {
    question: "Is my data safe?",
    answer:
      "Absolutely. We use industry-standard encryption and security measures to protect your data. Your personal information is never shared with third parties without your consent.",
  },
];

export default function FAQScreen() {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const handleBack = () => {
    router.back();
  };

  const handleToggle = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  const handleContactSupport = () => {
    Linking.openURL("mailto:hello@eklan.aiAI.com");
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-cream-100`} edges={["top", "bottom"]}>
      {/* Header */}
      <View style={tw`px-6 pt-4 pb-4 flex-row items-center gap-4`}>
        <TouchableOpacity onPress={handleBack}>
          <BackIcon />
        </TouchableOpacity>
        <AppText style={tw`text-xl font-bold text-neutral-900`}>
          Frequently Asked Questions
        </AppText>
      </View>

      <ScrollView
        style={tw`flex-1`}
        contentContainerStyle={tw`px-6 pb-6`}
        showsVerticalScrollIndicator={false}
      >
        {/* Intro */}
        <View style={tw`mb-6`}>
          <AppText style={tw`text-2xl font-bold text-neutral-900 mb-3`}>FAQs</AppText>
          <AppText style={tw`text-base text-neutral-600 leading-6`}>
            We've answered some of the questions you might have. Can't find what
            you're looking for? Reach out anytime at{" "}
            <AppText
              style={tw`text-blue-500`}
              onPress={handleContactSupport}
            >
              hello@eklan.aiAI.com
            </AppText>{" "}
            we're here to help!
          </AppText>
        </View>

        {/* FAQ List */}
        {faqData.map((faq, index) => (
          <FAQItem
            key={index}
            number={index + 1}
            question={faq.question}
            answer={faq.answer}
            isExpanded={expandedIndex === index}
            onToggle={() => handleToggle(index)}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

