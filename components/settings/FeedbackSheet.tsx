import React, { useCallback, useState } from "react";
import { View, TouchableOpacity, TextInput } from "react-native";
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetScrollView } from "@gorhom/bottom-sheet";
import tw from "@/lib/tw";
import { AppText, Button } from "@/components/ui";
import Svg, { Path, Circle } from "react-native-svg";
import { useAuth } from "@/hooks/useAuth";
import { Alert } from "@/utils/alert";

function UserIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={8} r={4} stroke="#737373" strokeWidth={1.5} />
      <Path
        d="M4 20c0-4 4-6 8-6s8 2 8 6"
        stroke="#737373"
        strokeWidth={1.5}
        strokeLinecap="round"
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
    <TouchableOpacity onPress={onPress} style={tw`p-1 mx-1`}>
      <AppText style={tw`text-[32px]`}>{filled ? "⭐" : "☆"}</AppText>
    </TouchableOpacity>
  );
}

interface FeedbackSheetProps {}

export const FeedbackSheet = React.forwardRef<BottomSheetModal, FeedbackSheetProps>(
  (props, ref) => {
    const snapPoints = React.useMemo(() => ["90%"], []);
    const { user } = useAuth();
    const [rating, setRating] = useState(0);
    const [name, setName] = useState(user ? `${user.firstName} ${user.lastName}`.trim() : "");
    const [feedback, setFeedback] = useState("");
    const [loading, setLoading] = useState(false);

    const renderBackdrop = useCallback(
      (props: any) => (
        <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.5} />
      ),
      []
    );

    const handleSubmit = async () => {
      if (rating === 0) {
        Alert.alert("Rating Required", "Please give us a star rating");
        return;
      }

      setLoading(true);
      // TODO: Implement feedback submission to server
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setLoading(false);

      Alert.alert(
        "Thank You! 🎉",
        "Your feedback helps us improve Eklan for everyone.",
        [{ text: "Done", onPress: () => {
          if (ref && "current" in ref) ref.current?.dismiss();
        } }]
      );
    };

    return (
      <BottomSheetModal
        ref={ref}
        index={0}
        snapPoints={snapPoints}
        backdropComponent={renderBackdrop}
        handleComponent={null}
        backgroundStyle={tw`bg-transparent`} // Making bottom sheet background transparent to allow custom header design
      >
        <View style={tw`flex-1 relative`}>
          {/* Custom Header Graphic */}
          <View style={tw`absolute top-0 left-0 right-0 h-32 bg-[#D1FAE5] rounded-t-[32px] border-b-0 overflow-hidden`}>
            {/* Some decorative background curves can go here using SVG, simplified for now */}
            <View style={tw`absolute -top-10 -left-10 w-40 h-40 rounded-full bg-[#16a34a] opacity-10`} />
            <View style={tw`absolute top-10 -right-20 w-60 h-60 rounded-full bg-[#16a34a] opacity-10`} />
          </View>
          
          <BottomSheetScrollView
            style={tw`flex-1 mt-10`}
            contentContainerStyle={tw`bg-white rounded-t-[32px] px-6 pt-16 pb-8 min-h-full`}
            keyboardShouldPersistTaps="handled"
          >
            {/* Emoji Avatar Bubble */}
            <View style={tw`absolute top-[-36px] left-1/2 -ml-[36px] w-[72px] h-[72px] rounded-full bg-white items-center justify-center border-2 border-yellow-400 z-10 shadow-sm`}>
              <AppText style={tw`text-[40px]`}>🥺</AppText>
            </View>

            {/* Title */}
            <AppText style={tw`text-[22px] font-bold text-neutral-900 text-center mb-2`}>
              How is it going, {user?.firstName || "Amy"}?
            </AppText>

            {/* Subtitle */}
            <AppText style={tw`text-[15px] text-neutral-500 text-center mb-6 px-4`}>
              Enjoying your experience with <AppText style={tw`text-primary-600 font-bold`}>eklan?</AppText> give us a rating
            </AppText>

            {/* Rating Stars */}
            <View style={tw`flex-row justify-center mb-8`}>
              {[1, 2, 3, 4, 5].map((star) => (
                <RatingStar
                  key={star}
                  filled={star <= rating}
                  onPress={() => setRating(star)}
                />
              ))}
            </View>

            {/* Form */}
            <View style={tw`mb-5`}>
              <AppText style={tw`text-sm text-neutral-500 mb-2`}>Name</AppText>
              <View style={tw`flex-row items-center border border-neutral-200 rounded-xl px-4 py-3 bg-white`}>
                <UserIcon />
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Enter your name"
                  style={tw`flex-1 ml-3 text-base text-neutral-900`}
                  placeholderTextColor="#a3a3a3"
                />
              </View>
            </View>

            <View style={tw`mb-6`}>
              <AppText style={tw`text-sm text-neutral-500 mb-2`}>Tell us what you want us to improve</AppText>
              <TextInput
                value={feedback}
                onChangeText={setFeedback}
                placeholder="Tell us how we can improve your experience..."
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                style={tw`border border-neutral-200 rounded-xl px-4 py-4 text-base text-neutral-900 bg-white min-h-[120px]`}
                placeholderTextColor="#a3a3a3"
              />
            </View>

            <AppText style={tw`text-[13px] text-neutral-400 text-center mb-6`}>
              Your feedback helps us improve and serve you better.
            </AppText>

            {/* Submit Button */}
            <Button
              onPress={handleSubmit}
              loading={loading}
              disabled={rating === 0}
            >
              Submit feedback
            </Button>
          </BottomSheetScrollView>
        </View>
      </BottomSheetModal>
    );
  }
);
