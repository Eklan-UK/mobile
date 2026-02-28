import { AppText, Button } from "@/components/ui";
import tw from "@/lib/tw";
import type { BottomSheetBackdropProps } from "@gorhom/bottom-sheet";
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from "@gorhom/bottom-sheet";
import React, { useCallback, useMemo } from "react";

interface CoachingRequiredBottomSheetProps {
  bottomSheetRef: React.RefObject<any>;
  onTalkToCoach: () => void;
  onKeepPracticing: () => void;
  onChange?: (index: number) => void;
}

export default function CoachingRequiredBottomSheet({
  bottomSheetRef,
  onTalkToCoach,
  onKeepPracticing,
  onChange,
}: CoachingRequiredBottomSheetProps) {
  const snapPoints = useMemo(() => ["30%"], []);

  const handleTalkToCoach = () => {
    bottomSheetRef.current?.close();
    onTalkToCoach();
  };

  const handleKeepPracticing = () => {
    bottomSheetRef.current?.close();
    onKeepPracticing();
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
      <BottomSheetView style={tw`flex-1 px-6 pt-2`}>
        {/* Title */}
        <AppText style={tw`text-xl font-bold text-gray-900 mb-3`}>
          This practice works best with a coach
        </AppText>

        {/* Description */}
        <AppText style={tw`text-base text-gray-600 mb-8 leading-6`}>
          This exercise is designed using patterns a human coach listens for things AI can't fully catch yet.
        </AppText>

        {/* Talk to a coach button */}
        <Button
          style={tw`bg-green-700 rounded-full py-4 items-center mb-4`}
          onPress={handleTalkToCoach}
        >
         
            Talk to a coach
      
        </Button>

        {/* Keep practicing with AI button */}
        <Button
          style={tw`py-3 items-center`}
          onPress={handleKeepPracticing}
          variant="ghost"
        >
          <AppText style={tw`text-gray-700 text-base font-medium`}>
            Keep practicing with AI
          </AppText>
        </Button>
      </BottomSheetView>
    </BottomSheet>
  );
}