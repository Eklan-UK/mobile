import tw from "@/lib/tw";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import apiClient from "@/lib/api";
import { logger } from "@/utils/logger";
import OtpVerification, { OtpVerificationHandle } from "./OtpVerification";

interface VerifyEmailOtpSheetProps {
  email: string;
  onVerified?: () => void;
  onDismiss?: () => void;
}

const VerifyEmailOtpSheet = forwardRef<BottomSheetModal, VerifyEmailOtpSheetProps>(
  ({ email, onVerified, onDismiss }, ref) => {
    const bottomSheetRef = useRef<BottomSheetModal>(null);
    const otpRef = useRef<OtpVerificationHandle>(null);

    const snapPoints = useMemo(() => ["90%"], []);
    const insets = useSafeAreaInsets();

    useImperativeHandle(ref, () => bottomSheetRef.current as BottomSheetModal);

    const handleSheetChanges = useCallback(
      (index: number) => {
        if (index === 0) {
          // Sheet opened — reset & start countdown (OTP was already sent by auth.tsx)
          otpRef.current?.reset(true);
        }
        if (index === -1) {
          otpRef.current?.reset(false);
          onDismiss?.();
        }
      },
      [onDismiss]
    );

    const renderBackdrop = useCallback(
      (props: any) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          pressBehavior="none"
        />
      ),
      []
    );

    const handleVerify = useCallback(
      async (otpCode: string) => {
        await apiClient.post("/api/v1/auth/email/verify-email-otp", {
          otp: otpCode,
        });
        logger.log("✅ Email verified via OTP");
        onVerified?.();
      },
      [onVerified]
    );

    const handleResend = useCallback(async () => {
      await apiClient.post("/api/v1/auth/email/send-verification-otp");
      logger.log("✅ Verification OTP resent");
    }, []);

    return (
      <BottomSheetModal
        ref={bottomSheetRef}
        index={0}
        snapPoints={snapPoints}
        onChange={handleSheetChanges}
        enablePanDownToClose={false}
        backdropComponent={renderBackdrop}
        handleIndicatorStyle={tw`bg-neutral-300 dark:bg-neutral-600 w-12`}
        backgroundStyle={tw`bg-white dark:bg-neutral-900 rounded-t-3xl`}
        // "fillParent" keeps the sheet anchored at its snap point and lets
        // the inner ScrollView scroll content above the keyboard naturally.
        // "interactive" shrinks the sheet itself which fights with a fixed
        // snap point and causes content to be hidden behind the keyboard.
        keyboardBehavior="fillParent"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
      >
        {/* BottomSheetView fills the sheet frame; ScrollView inside handles overflow */}
        <BottomSheetView style={{ flex: 1 }}>
          <BottomSheetScrollView
            contentContainerStyle={[
              tw`px-6 pt-2`,
              { paddingBottom: Math.max(insets.bottom,400) },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <OtpVerification
              ref={otpRef}
              email={email}
              onVerify={handleVerify}
              onResend={handleResend}
              autoStartCountdown={false}
            />
          </BottomSheetScrollView>
        </BottomSheetView>
      </BottomSheetModal>
    );
  }
);

export default VerifyEmailOtpSheet;
