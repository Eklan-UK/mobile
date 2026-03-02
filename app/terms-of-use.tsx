import { AppText } from "@/components/ui";
import tw from "@/lib/tw";
import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

function BackIcon() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M19 12H5M12 19l-7-7 7-7"
        stroke={tw.prefixMatch('dark') ? "#F9FAFB" : "#171717"}
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
    <View style={tw`bg-white dark:bg-neutral-800 rounded-[16px] border border-neutral-200 dark:border-neutral-700 mb-3 overflow-hidden`}>
      <TouchableOpacity
        onPress={onToggle}
        style={tw`flex-row items-center justify-between p-5`}
      >
        <AppText style={tw`text-[15px] font-medium text-neutral-900 dark:text-white flex-1 pr-4`}>
          {number}. {title}
        </AppText>
        {isExpanded ? <MinusIcon /> : <PlusIcon />}
      </TouchableOpacity>
      {isExpanded && (
        <View style={tw`px-5 pb-5`}>
          <AppText style={tw`text-[15px] text-neutral-600 dark:text-neutral-400 leading-[22px]`}>{content}</AppText>
        </View>
      )}
    </View>
  );
}

const sections = [
  {
    title: "The App and Services",
    content: "We grant you a personal, worldwide, royalty-free, non-assignable, nonexclusive, revocable, and non-sublicensable license to access and use our Services. This license is for the sole purpose of letting you use and enjoy the Services' benefits.",
  },
  {
    title: "Registration",
    content: "To use Certain features of the Services, you must register for an account. By registering, you agree to provide accurate, current, and complete information.",
  },
  {
    title: "Payments",
    content: "Certain Services require payment in advance. We use third-party payment processors to process transactions. You agree to pay all applicable fees related to your account.",
  },
  {
    title: "Intellectual Property and License",
    content: "All content, features, and functionality of our Services are owned by Eklan and are protected by international copyright, trademark, patent, trade secret, and other intellectual property or proprietary rights laws.",
  },
  {
    title: "User Content and Generated Content",
    content: "You retain all rights to your content. By submitting content through our Services, you grant us a worldwide, non-exclusive, royalty-free license to use, copy, reproduce, process, adapt, modify, publish, transmit, display, and distribute such content.",
  },
];

export default function TermsOfUseScreen() {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

  const handleBack = () => router.back();
  const handleToggle = (index: number) => setExpandedIndex(expandedIndex === index ? null : index);

  return (
    <SafeAreaView style={tw`flex-1 bg-white dark:bg-neutral-900`} edges={["top", "bottom"]}>
      {/* Header */}
      <View style={tw`px-6 pt-4 pb-4 flex-row items-center gap-4`}>
        <TouchableOpacity onPress={handleBack} style={tw`w-10 h-10 rounded-full border border-neutral-200 dark:border-neutral-700 items-center justify-center`}>
          <BackIcon />
        </TouchableOpacity>
        <AppText style={tw`text-lg font-bold text-neutral-900 dark:text-white`}>Terms of use</AppText>
      </View>

      <ScrollView contentContainerStyle={tw`px-6 pb-6 pt-2`} showsVerticalScrollIndicator={false}>
        {/* Intro */}
        <View style={tw`mb-8`}>
          <AppText style={tw`text-[28px] font-bold text-neutral-900 dark:text-white mb-4`}>Terms of use</AppText>
          <AppText style={tw`text-[15px] text-neutral-900 dark:text-neutral-300 leading-[22px]`}>
            These terms and conditions ("Terms and Conditions")
            constitute a legally binding agreement between you, the
            user who will be utilizing Eklan AI's webapp (referenced
            below as "You" or "User"), and Eklan AI Ltd., a company
            incorporated under the laws of Canada ("Eklan", "We", or
            "Us"), with respect to your use of Eklan's services (as
            defined below) which are available via Eklan's webapp
            and mobile applications (the "App").
          </AppText>
          <AppText style={tw`text-[15px] text-neutral-900 dark:text-neutral-300 leading-[22px] mt-4`}>
            By accessing or using the App and/or Services you
            accept and agree to be bound by these Terms and
            Conditions and our Privacy Policy, which is incorporated
            herein by reference. Eklan reserves the right, in its sole
            discretion, to modify these Terms and Conditions
            (including any other policies incorporated herein) at any
            time by posting the modified provisions at https://
            www.eklan.ai/. Any such modifications shall become
            effective immediately upon posting. IF YOU DO NOT
            AGREE TO ALL OF THESE TERMS AND CONDITIONS,
            DO NOT ACCESS OR USE ANY PART OF THE APP OR
            SERVICES.
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
      </ScrollView>
    </SafeAreaView>
  );
}
