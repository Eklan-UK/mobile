import { AppText, BoldText } from "@/components/ui";
import tw from "@/lib/tw";
import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, TouchableOpacity, View } from "react-native";
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

// Section Item Component
function SectionItem({
  number,
  title,
  content,
  isExpanded,
  onToggle,
}: {
  number: number;
  title: string;
  content: string;
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
          {number}. {title}
        </AppText>
        {isExpanded ? <MinusIcon /> : <PlusIcon />}
      </TouchableOpacity>
      {isExpanded && (
        <View style={tw`px-4 pb-4`}>
          <View style={tw`h-px bg-neutral-100 mb-3`} />
          <AppText style={tw`text-sm text-neutral-600 leading-5`}>{content}</AppText>
        </View>
      )}
    </View>
  );
}

// Terms Data
const sections = [
  {
    title: "Acceptance of Terms",
    content:
      "By accessing or using Eklan's services, you agree to be bound by these Terms of Use. If you do not agree to these terms, please do not use our services. These terms constitute a legally binding agreement between you and Eklan.",
  },
  {
    title: "Description of Services",
    content:
      "Eklan provides an AI-powered English learning platform that includes pronunciation practice, speaking exercises, and personalized feedback. Our services are available through mobile applications and web platforms. Features may vary based on subscription level.",
  },
  {
    title: "User Accounts",
    content:
      "You must create an account to access our services. You are responsible for maintaining the confidentiality of your account credentials. You agree to provide accurate information and update it as necessary. One account per person is permitted.",
  },
  {
    title: "Subscription & Payments",
    content:
      "Some features require a paid subscription. Subscriptions automatically renew unless cancelled. Refunds are available within 7 days of purchase for annual plans. You can manage your subscription through your app store account settings.",
  },
  {
    title: "User Content & Conduct",
    content:
      "You retain ownership of content you create. By using our services, you grant us a license to use your voice recordings for providing feedback. You agree not to use the service for illegal purposes, harassment, or any activity that could harm other users.",
  },
  {
    title: "Intellectual Property",
    content:
      "All content, features, and functionality of Eklan are owned by us and protected by copyright, trademark, and other intellectual property laws. You may not copy, modify, distribute, or create derivative works without our written permission.",
  },
  {
    title: "Privacy & Data",
    content:
      "Your use of our services is also governed by our Privacy Policy. By using Eklan, you consent to our collection and use of data as described in the Privacy Policy. We take reasonable measures to protect your personal information.",
  },
  {
    title: "Disclaimers",
    content:
      "Our services are provided 'as is' without warranties of any kind. We do not guarantee specific learning outcomes. While we strive for accuracy, AI-generated feedback may occasionally be imperfect. Use your judgment when applying our suggestions.",
  },
  {
    title: "Limitation of Liability",
    content:
      "To the maximum extent permitted by law, Eklan shall not be liable for any indirect, incidental, special, or consequential damages. Our total liability shall not exceed the amount you paid for our services in the past 12 months.",
  },
  {
    title: "Termination",
    content:
      "We may terminate or suspend your account for violations of these terms. You may delete your account at any time through the app settings. Upon termination, your right to use the service ceases immediately.",
  },
  {
    title: "Changes to Terms",
    content:
      "We reserve the right to modify these terms at any time. We will provide notice of significant changes through the app or email. Your continued use after changes constitutes acceptance of the modified terms.",
  },
  {
    title: "Governing Law",
    content:
      "These terms are governed by the laws of the Republic of Korea. Any disputes shall be resolved in the courts of Seoul, Korea. You agree to submit to the personal jurisdiction of such courts.",
  },
  {
    title: "Contact Information",
    content:
      "For questions about these Terms of Use, please contact us at legal@eklanAI.com or through the Help section in the app. We aim to respond to all inquiries within 48 hours.",
  },
];

export default function TermsOfUseScreen() {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const handleBack = () => {
    router.back();
  };

  const handleToggle = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-cream-100`} edges={["top", "bottom"]}>
      {/* Header */}
      <View style={tw`px-6 pt-4 pb-4 flex-row items-center gap-4`}>
        <TouchableOpacity onPress={handleBack}>
          <BackIcon />
        </TouchableOpacity>
        <AppText style={tw`text-xl font-bold text-neutral-900`}>Terms of Use</AppText>
      </View>

      <ScrollView
        style={tw`flex-1`}
        contentContainerStyle={tw`px-6 pb-6`}
        showsVerticalScrollIndicator={false}
      >
        {/* Intro */}
        <View style={tw`mb-6`}>
          <AppText style={tw`text-2xl font-bold text-neutral-900 mb-4`}>Terms of Use</AppText>
          <AppText style={tw`text-base text-neutral-600 leading-6`}>
            Welcome to Eklan. These Terms of Use ("Terms") govern your access
            to and use of our AI-powered English learning platform, including our
            mobile applications, websites, and related services (collectively, the
            "Services").
          </AppText>
          <AppText style={tw`text-base text-neutral-600 leading-6 mt-4`}>
            Please read these Terms carefully before using our Services. By using
            Eklan, you acknowledge that you have read, understood, and agree to
            be bound by these Terms.
          </AppText>
        </View>

        {/* Sections */}
        {sections.map((section, index) => (
          <SectionItem
            key={index}
            number={index + 1}
            title={section.title}
            content={section.content}
            isExpanded={expandedIndex === index}
            onToggle={() => handleToggle(index)}
          />
        ))}

        {/* Contact */}
        <View style={tw`bg-primary-50 rounded-xl p-4 mt-4 border border-primary-200`}>
          <AppText style={tw`text-sm text-primary-800`}>
            Questions about our Terms of Use? Contact us at{" "}
            <AppText style={tw`font-bold`}>legal@eklanAI.com</AppText>
          </AppText>
        </View>

        {/* Last Updated */}
        <AppText style={tw`text-sm text-neutral-400 text-center mt-6`}>
          Last updated: January 2026
        </AppText>
      </ScrollView>
    </SafeAreaView>
  );
}

