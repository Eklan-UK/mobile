import tw from "@/lib/tw";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
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

    const snapPoints = useMemo(() => ["75%"], []);
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
        handleIndicatorStyle={tw`bg-neutral-300 w-12`}
        backgroundStyle={tw`bg-white rounded-t-3xl`}
      >
        <BottomSheetView
          style={[
            tw`flex-1 px-6 pt-2 pb-8`,
            { paddingBottom: Math.max(insets.bottom, 20) },
          ]}
        >
          <OtpVerification
            ref={otpRef}
            email={email}
            onVerify={handleVerify}
            onResend={handleResend}
            autoStartCountdown={false}
          />
        </BottomSheetView>
      </BottomSheetModal>
    );
  }
);

export default VerifyEmailOtpSheet;
