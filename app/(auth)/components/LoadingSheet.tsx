
import { AppText, BoldText } from "@/components/ui";
import { Loader } from "@/components/ui/Loader";
import tw from '@/lib/tw';
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import React, { forwardRef, useCallback, useMemo } from 'react';

interface LoadingSheetProps {
  onDismiss?: () => void;
}

/**
 * LoadingSheet — shows indefinitely while the signup API call is in-flight.
 * Parent (auth.tsx) is responsible for dismissing it when the API resolves.
 */
const LoadingSheet = forwardRef<BottomSheetModal, LoadingSheetProps>(({ onDismiss }, ref) => {
  const snapPoints = useMemo(() => ['40%'], []);

  const handleSheetChanges = useCallback((index: number) => {
    if (index === -1 && onDismiss) onDismiss();
  }, [onDismiss]);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
        pressBehavior="none" // Prevent closing while loading
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
      enablePanDownToClose={false}
      handleIndicatorStyle={tw`bg-neutral-300 w-12`}
      backgroundStyle={tw`bg-white rounded-t-3xl`}
      backdropComponent={renderBackdrop}
    >
      <BottomSheetView style={tw`flex-1 px-6 py-10 items-center`}>
        <Loader />

        <BoldText style={tw`text-xl font-semibold text-neutral-900 mt-6`}>
          Setting up your account...
        </BoldText>

        <AppText style={tw`text-neutral-500 mb-10 mt-2`}>
          Just a moment
        </AppText>
      </BottomSheetView>
    </BottomSheetModal>
  );
});

export default LoadingSheet;
