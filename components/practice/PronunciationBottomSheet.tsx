import { AppText } from "@/components/ui";
import tw from "@/lib/tw";
import { Ionicons } from "@expo/vector-icons";
import type { BottomSheetBackdropProps } from "@gorhom/bottom-sheet";
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from "@gorhom/bottom-sheet";
import React, { useCallback, useMemo, useState } from "react";
import { TouchableOpacity, View } from "react-native";

interface PronunciationBottomSheetProps {
  bottomSheetRef: React.RefObject<any>;
  onStartPractice: (topicId: string) => void;
  onChange?: (index: number) => void;
}

const TOPICS = [
  {
    id: "sounds",
    title: "Sounds",
    subtitle: "Practice individual sounds like R/L, TH, V/W",
    icon: "🔊",
    bgColor: "bg-primary-100",
    iconBg: "bg-primary-500",
  },
  {
    id: "words",
    title: "Words",
    subtitle: "Work on clear pronunciation of common words",
    icon: "T",
    bgColor: "bg-primary-100",
    iconBg: "bg-primary-500",
  },
  {
    id: "sentences",
    title: "Sentences",
    subtitle: "Practice natural rhythm and flow",
    icon: "💬",
    bgColor: "bg-primary-100",
    iconBg: "bg-primary-500",
  },
];

export default function PronunciationBottomSheet({
  bottomSheetRef,
  onStartPractice,
  onChange,
}: PronunciationBottomSheetProps) {
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const snapPoints = useMemo(() => ["65%"], []);

  const handleTopicSelect = (topicId: string) => {
    setSelectedTopic(topicId);
  };

  const handleStartPractice = () => {
    if (selectedTopic) {
      onStartPractice(selectedTopic);
      setSelectedTopic(null);
      bottomSheetRef.current?.close();
    }
  };

  const handleClose = () => {
    setSelectedTopic(null);
    bottomSheetRef.current?.close();
  };

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={0.5}
      />
    ),
    []
  );

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={tw`bg-white`}
      handleIndicatorStyle={tw`bg-gray-300`}
      onChange={onChange}
    >
      <BottomSheetView style={tw`flex-1`}>
        {/* Close Button */}
        <View style={tw`flex-row justify-end px-5 mb-2`}>
          <TouchableOpacity
            onPress={handleClose}
            style={tw`w-8 h-8 bg-gray-100 rounded-full items-center justify-center`}
          >
            <Ionicons name="close" size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={tw`px-5 pb-8 flex-1`}>
          {/* Title */}
          <AppText style={tw`text-xl font-bold text-gray-900 mb-2`}>
            What would you like to practice?
          </AppText>
          <AppText style={tw`text-sm text-gray-500 mb-6`}>
            Choose a pronunciation focus area
          </AppText>

          {/* Topic Cards */}
          <View style={tw`mb-6`}>
            {TOPICS.map((topic) => (
              <TouchableOpacity
                key={topic.id}
                style={tw`border ${
                  selectedTopic === topic.id
                    ? "border-primary-600 bg-primary-50"
                    : "border-gray-200 bg-white"
                } rounded-2xl p-4 mb-3 flex-row items-center`}
                activeOpacity={0.7}
                onPress={() => handleTopicSelect(topic.id)}
              >
                <View style={tw`w-12 h-12 ${topic.iconBg} rounded-xl items-center justify-center mr-3`}>
                  <AppText style={tw`${topic.icon === 'T' ? 'text-2xl font-bold text-white' : 'text-2xl'}`}>
                    {topic.icon}
                  </AppText>
                </View>
                <View style={tw`flex-1`}>
                  <AppText style={tw`text-base font-semibold text-gray-900`}>
                    {topic.title}
                  </AppText>
                  {topic.subtitle && (
                    <AppText style={tw`text-sm text-gray-500 mt-0.5`}>
                      {topic.subtitle}
                    </AppText>
                  )}
                </View>
                {selectedTopic === topic.id && (
                  <Ionicons name="checkmark-circle" size={24} style={tw`text-primary-500`} />
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Start Button */}
          <TouchableOpacity
            style={tw`bg-green-600 rounded-full py-4 items-center ${
              !selectedTopic ? "opacity-50" : ""
            }`}
            activeOpacity={0.8}
            disabled={!selectedTopic}
            onPress={handleStartPractice}
          >
            <AppText style={tw`text-white text-base font-semibold`}>
              Start talking
            </AppText>
          </TouchableOpacity>
        </View>
      </BottomSheetView>
    </BottomSheet>
  );
}
