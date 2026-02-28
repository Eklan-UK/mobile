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

// Privacy Policy Data
const sections = [
  {
    title: "Who Is Responsible for Your Personal Data?",
    content:
      "Eklan is the data controller responsible for your personal data. We determine how and why your personal information is processed. If you have any questions about this Privacy Policy or our data practices, please contact us at hello@eklan.ai.",
  },
  {
    title: "Types of Information We Collect & Legal Basis for Processing",
    content:
      "We collect information you provide directly (name, email, voice recordings), data from your device (device type, operating system), and usage data (lesson progress, app interactions). Our legal basis includes contract performance, legitimate interests, and consent where applicable.",
  },
  {
    title: "Cookies, Pixels & Web Beacons",
    content:
      "We use cookies and similar technologies to enhance your experience, analyze usage patterns, and deliver personalized content. You can manage cookie preferences through your browser settings. Essential cookies are required for basic functionality.",
  },
  {
    title: "Information Sharing & Disclosure",
    content:
      "We do not sell your personal information. We may share data with service providers who help operate our services, when required by law, or with your consent. All third parties are contractually bound to protect your data.",
  },
  {
    title: "Data Retention",
    content:
      "We retain your personal data for as long as your account is active or as needed to provide services. You can request deletion of your data at any time. Some data may be retained longer for legal or legitimate business purposes.",
  },
  {
    title: "Your Data Protection Rights",
    content:
      "You have the right to access, correct, delete, or port your data. You can also object to processing or withdraw consent. To exercise these rights, contact us at hello@eklan.ai or through the app settings.",
  },
  {
    title: "Data Security",
    content:
      "We implement industry-standard security measures including encryption, secure servers, and access controls. While no system is 100% secure, we continuously improve our security practices to protect your information.",
  },
  {
    title: "Third-Party Websites & Apps",
    content:
      "Our app may contain links to third-party services. This Privacy Policy does not apply to those services. We encourage you to review the privacy policies of any third-party services you access.",
  },
  {
    title: "Payments & Affiliates",
    content:
      "Payment processing is handled by secure third-party providers. We do not store complete payment card details. Transaction records are kept for accounting and legal compliance purposes.",
  },
  {
    title: "Children's Privacy",
    content:
      "Our services are not directed to children under 13. We do not knowingly collect data from children. If you believe we have inadvertently collected such data, please contact us for immediate deletion.",
  },
  {
    title: "Changes to This Policy",
    content:
      "We may update this Privacy Policy periodically. We will notify you of significant changes through the app or email. Continued use after changes constitutes acceptance of the updated policy.",
  },
];

export default function PrivacyPolicyScreen() {
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
        <AppText style={tw`text-xl font-bold text-neutral-900`}>Privacy Policy</AppText>
      </View>

      <ScrollView
        style={tw`flex-1`}
        contentContainerStyle={tw`px-6 pb-6`}
        showsVerticalScrollIndicator={false}
      >
        {/* Intro */}
        <View style={tw`mb-6`}>
          <AppText style={tw`text-2xl font-bold text-neutral-900 mb-4`}>Privacy Policy</AppText>
          <AppText style={tw`text-base text-neutral-600 leading-6`}>
            Eklan ("Eklan", "we", "our", or "us") respects your privacy and is
            committed to protecting the personal information you share with us.
            This Privacy Policy explains how we collect, use, store, and disclose
            your information when you use our website or our AI-powered language
            learning application designed to help you build English fluency (the
            "App" or the "Services").
          </AppText>
          <AppText style={tw`text-base text-neutral-600 leading-6 mt-4`}>
            By accessing our website or using our Services, you agree to the
            practices described in this Privacy Policy.
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
            Questions about our Privacy Policy? Contact us at{" "}
            <AppText style={tw`font-bold`}>hello@eklan.ai</AppText>
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

