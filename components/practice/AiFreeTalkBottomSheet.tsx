import { AppText } from "@/components/ui";
import tw from "@/lib/tw";
import { Ionicons } from "@expo/vector-icons";
import type { BottomSheetBackdropProps } from "@gorhom/bottom-sheet";
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from "@gorhom/bottom-sheet";
import React, { useCallback, useMemo, useState } from "react";
import { TouchableOpacity, View } from "react-native";

interface AiFreeTalkBottomSheetProps {
  bottomSheetRef: React.RefObject<BottomSheet>;
  onStartConversation: (topicId: string) => void;
  onChange?: (index: number) => void;
}

const TOPICS = [
  {
    id: "daily-life",
    title: "Daily Life",
    subtitle: "Everyday conversations",
    icon: "☕",
    bgColor: "bg-primary-500",
  },
  {
    id: "work-school",
    title: "Work / school",
    subtitle: "Meetings & presentations",
    icon: "💼",
    bgColor: "bg-primary-600",
  },
  {
    id: "on-mind",
    title: "Something on your mind",
    icon: "🤔",
    bgColor: "bg-green-800",
  },
  {
    id: "surprise",
    title: "Surprise me",
    icon: "✨",
    bgColor: "bg-green-700",
  },
];

export default function AiFreeTalkBottomSheet({
  bottomSheetRef,
  onStartConversation,
  onChange,
}: AiFreeTalkBottomSheetProps) {
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const snapPoints = useMemo(() => ["75%"], []);

  const handleTopicSelect = (topicId: string) => {
    setSelectedTopic(topicId);
  };

  const handleStartTalking = () => {
    if (selectedTopic) {
      onStartConversation(selectedTopic);
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
            What do you want to talk about?
          </AppText>
          <AppText style={tw`text-sm text-gray-500 mb-6`}>
            Choose what feels natural today
          </AppText>

          {/* Topic Cards */}
          <View style={tw`mb-6`}>
            {TOPICS.map((topic) => (
              <TouchableOpacity
                key={topic.id}
                style={tw`border ${selectedTopic === topic.id
                  ? "border-green-600 bg-green-50"
                  : "border-gray-200 bg-white"
                  } rounded-2xl p-4 mb-3 flex-row items-center`}
                activeOpacity={0.7}
                onPress={() => handleTopicSelect(topic.id)}
              >
                <View style={tw`w-10 h-10 ${topic.bgColor} rounded-xl items-center justify-center mr-3`}>
                  <AppText style={tw`text-xl`}>{topic.icon}</AppText>
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
                  <Ionicons name="checkmark-circle" size={24} color="#16A34A" />
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Start Button */}
          <TouchableOpacity
            style={tw`bg-green-700 rounded-full py-4 items-center ${!selectedTopic ? "opacity-50" : ""
              }`}
            activeOpacity={0.8}
            disabled={!selectedTopic}
            onPress={handleStartTalking}
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