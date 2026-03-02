import CheckIcon from "@/assets/icons/check.svg";
import { AppText, BoldText } from "@/components/ui";
import tw from '@/lib/tw';
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { router } from "expo-router";
import React, { forwardRef, useCallback, useMemo, useRef } from 'react';
import { Dimensions, TouchableOpacity, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get("window");

interface SuccessSheetProps {
  onDismiss?: () => void;
  onContinue?: () => void;
}

const SuccessSheet = forwardRef<BottomSheetModal, SuccessSheetProps>(({ onDismiss, onContinue }, ref) => {
  const snapPoints = useMemo(() => ['50%'], []);
  const insets = useSafeAreaInsets();
  const confettiRef = useRef<ConfettiCannon>(null);

  const handleSheetChanges = useCallback((index: number) => {
    if (index === 0) {
      // Start confetti when sheet opens
      confettiRef.current?.start();
    }
    if (index === -1 && onDismiss) {
      onDismiss();
    }
  }, [onDismiss]);

    const renderBackdrop = useCallback(
      (props: any) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
        />
      ),
      []
    );

  return (
    <BottomSheetModal
      ref={ref}
      index={0}
      snapPoints={snapPoints}
      onChange={handleSheetChanges}
      enablePanDownToClose
      handleIndicatorStyle={tw`bg-neutral-300 w-12`}
      backgroundStyle={tw`bg-white rounded-t-3xl`}
      backdropComponent={renderBackdrop}
    >
      <BottomSheetView style={[tw`flex-1 px-6 py-10 items-center`, { paddingBottom: insets.bottom + 20 }]}>
        <ConfettiCannon
          count={200}
          origin={{x: width / 2, y: -20}}
          autoStart={false}
          ref={confettiRef}
          fadeOut={true}
          fallSpeed={3000}
        />
        
        {/* Icon */}
        <View style={tw`bg-primary-500 p-6 rounded-full mb-4`}>
          <CheckIcon width={40} height={40} />
        </View>

        <BoldText style={tw`text-2xl font-bold text-neutral-900 mb-2`}>
          Account created successful
        </BoldText>

        <AppText style={tw`text-neutral-500 mb-8`}>
          Let's get to know better
        </AppText>

        <TouchableOpacity
          onPress={() => {
            if (onContinue) {
              onContinue();
            } else {
              router.replace("/(profile-setup)");
            }
          }}
          style={tw`bg-primary-500 rounded-full py-4 w-full items-center`}
        >
          <AppText weight="bold" style={tw`text-white font-semibold text-lg`}>
            Continue
          </AppText>
        </TouchableOpacity>
      </BottomSheetView>
    </BottomSheetModal>
  );
});

export default SuccessSheet;
