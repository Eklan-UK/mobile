import { AppText, BoldText, Button } from "@/components/ui";
import tw from "@/lib/tw";
import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, TouchableOpacity, View, KeyboardAvoidingView, Platform, TextInput } from "react-native";
import { Alert } from '@/utils/alert';
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
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

// Rating Star Component
function RatingStar({
  filled,
  onPress,
}: {
  filled: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity onPress={onPress} style={tw`p-1`}>
      <AppText style={tw`text-4xl`}>{filled ? "⭐" : "☆"}</AppText>
    </TouchableOpacity>
  );
}

// Feedback Category Component
function FeedbackCategory({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={tw`px-4 py-2 rounded-full mr-2 mb-2 ${
        selected ? "bg-primary-500" : "bg-white border border-neutral-200"
      }`}
    >
      <AppText
        style={tw`text-sm font-medium ${
          selected ? "text-white" : "text-neutral-700"
        }`}
      >
        {label}
      </AppText>
    </TouchableOpacity>
  );
}

export default function FeedbackScreen() {
  const [rating, setRating] = useState(0);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);
  const insets = useSafeAreaInsets();

  const categories = [
    "App Experience",
    "Lessons Quality",
    "AI Feedback",
    "Performance",
    "Design",
    "Feature Request",
    "Bug Report",
    "Other",
  ];

  const handleBack = () => {
    router.back();
  };

  const toggleCategory = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert("Rating Required", "Please give us a star rating");
      return;
    }

    setLoading(true);
    // TODO: Implement feedback submission
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setLoading(false);

    Alert.alert(
      "Thank You! 🎉",
      "Your feedback helps us improve Eklan for everyone.",
      [{ text: "Done", onPress: () => router.back() }]
    );
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-cream-100`} edges={["top"]}>
      <KeyboardAvoidingView
        style={tw`flex-1`}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? insets.top : 0}
      >
        {/* Header */}
        <View style={tw`px-6 pt-4 pb-4 flex-row items-center gap-4`}>
          <TouchableOpacity onPress={handleBack}>
            <BackIcon />
          </TouchableOpacity>
          <AppText style={tw`text-xl font-bold text-neutral-900`}>Feedback</AppText>
        </View>

        <ScrollView
          style={tw`flex-1`}
          contentContainerStyle={tw`px-6 pb-6`}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
        {/* Rating Section */}
        <View style={tw`items-center py-6`}>
          <AppText style={tw`text-2xl font-bold text-neutral-900 mb-2`}>
            How's your experience?
          </AppText>
          <AppText style={tw`text-base text-neutral-500 mb-6 text-center`}>
            Your feedback helps us make Eklan better
          </AppText>

          <View style={tw`flex-row items-center`}>
            {[1, 2, 3, 4, 5].map((star) => (
              <RatingStar
                key={star}
                filled={star <= rating}
                onPress={() => setRating(star)}
              />
            ))}
          </View>

          {rating > 0 && (
            <AppText style={tw`text-base text-primary-500 mt-3 font-medium`}>
              {rating === 5
                ? "Excellent! 🎉"
                : rating === 4
                ? "Great! 😊"
                : rating === 3
                ? "Good 👍"
                : rating === 2
                ? "Could be better 🤔"
                : "We'll improve! 💪"}
            </AppText>
          )}
        </View>

        {/* Categories */}
        <View style={tw`mb-6`}>
          <AppText style={tw`text-base font-semibold text-neutral-900 mb-3`}>
            What's this feedback about? (Optional)
          </AppText>
          <View style={tw`flex-row flex-wrap`}>
            {categories.map((category) => (
              <FeedbackCategory
                key={category}
                label={category}
                selected={selectedCategories.includes(category)}
                onPress={() => toggleCategory(category)}
              />
            ))}
          </View>
        </View>

        {/* Feedback Text */}
        <View style={tw`mb-6`}>
          <AppText style={tw`text-base font-semibold text-neutral-900 mb-3`}>
            Tell us more (Optional)
          </AppText>
          <View style={tw`bg-white border border-neutral-200 rounded-xl px-4 py-3`}>
            <TextInput
              placeholder="Share your thoughts, suggestions, or report any issues..."
              value={feedback}
              onChangeText={setFeedback}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              style={tw`text-base text-neutral-900 min-h-[150px]`}
              placeholderTextColor="#a3a3a3"
            />
          </View>
        </View>

        {/* Privacy Note */}
        <View style={tw`bg-neutral-100 rounded-xl p-4`}>
          <AppText style={tw`text-sm text-neutral-600 text-center`}>
            Your feedback is anonymous and helps us improve. We never share your
            personal information.
          </AppText>
        </View>
        </ScrollView>

        {/* Submit Button */}
        <View style={[tw`px-6 pb-4 bg-cream-100`, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <Button onPress={handleSubmit} loading={loading}>
            Submit Feedback
          </Button>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

