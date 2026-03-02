import Lock from "@/assets/icons/lock.svg";
import EmailOutline from "@/assets/icons/mail-outline.svg";
import { AppText, BoldText, Button } from "@/components/ui";
import tw from "@/lib/tw";
import { Ionicons } from "@expo/vector-icons";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { ActivityIndicator, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SheetInput } from "./SheetInput";
import { passwordResetService } from "@/services/password-reset.service";
import { Alert } from "@/utils/alert";
import { logger } from "@/utils/logger";
import OtpVerification, { OtpVerificationHandle } from "./OtpVerification";

interface ForgotPasswordSheetProps {
  onDismiss?: () => void;
  onSuccess?: () => void;
}

type Step = "email" | "otp" | "reset" | "success";

const ForgotPasswordSheet = forwardRef<BottomSheetModal, ForgotPasswordSheetProps>(
  ({ onDismiss, onSuccess }, ref) => {
    const bottomSheetRef = useRef<BottomSheetModal>(null);
    const otpRef = useRef<OtpVerificationHandle>(null);
    const [currentStep, setCurrentStep] = useState<Step>("email");
    const [email, setEmail] = useState("");
    const [verifiedOtpCode, setVerifiedOtpCode] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    const snapPoints = useMemo(() => ["100%"], []);
    const insets = useSafeAreaInsets();

    useImperativeHandle(ref, () => bottomSheetRef.current as BottomSheetModal);

    const handleSheetChanges = useCallback(
      (index: number) => {
        if (index === -1) {
          setCurrentStep("email");
          setEmail("");
          setVerifiedOtpCode("");
          setPassword("");
          setConfirmPassword("");
          setError("");
          setIsLoading(false);
          if (onDismiss) onDismiss();
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
        />
      ),
      []
    );

    const handleBack = () => {
      if (currentStep === "email") {
        bottomSheetRef.current?.dismiss();
      } else if (currentStep === "otp") {
        setCurrentStep("email");
      } else if (currentStep === "reset") {
        setCurrentStep("otp");
      }
    };

    const handleSendOTP = async () => {
      if (!email) return;

      setIsLoading(true);
      setError("");

      try {
        await passwordResetService.sendOTP(email);
        setCurrentStep("otp");
      } catch (error: any) {
        logger.error('Failed to send OTP:', error);
        setError(error.message || "Failed to send OTP. Please try again.");
        Alert.alert("Error", error.message || "Failed to send OTP. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    const handleOtpVerify = useCallback(
      async (otpCode: string) => {
        await passwordResetService.verifyOTP(email, otpCode);
        setVerifiedOtpCode(otpCode);
        setCurrentStep("reset");
      },
      [email]
    );

    const handleOtpResend = useCallback(async () => {
      await passwordResetService.sendOTP(email);
    }, [email]);

    const handleEditEmail = useCallback(() => {
      setCurrentStep("email");
    }, []);

    const handleResetPassword = async () => {
      if (!password || password !== confirmPassword) return;

      if (password.length < 8) {
        Alert.alert("Error", "Password must be at least 8 characters long.");
        return;
      }

      setIsLoading(true);
      setError("");

      try {
        await passwordResetService.resetPassword(email, verifiedOtpCode, password);
        setCurrentStep("success");
        setTimeout(() => {
          bottomSheetRef.current?.dismiss();
          if (onSuccess) onSuccess();
        }, 2000);
      } catch (error: any) {
        logger.error('Failed to reset password:', error);
        setError(error.message || "Failed to reset password. Please try again.");
        Alert.alert("Error", error.message || "Failed to reset password. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    return (
      <BottomSheetModal
        ref={bottomSheetRef}
        index={0}
        snapPoints={snapPoints}
        onChange={handleSheetChanges}
        enablePanDownToClose={currentStep !== "success"}
        backdropComponent={renderBackdrop}
        handleIndicatorStyle={tw`bg-neutral-300 dark:bg-neutral-600 w-12`}
        backgroundStyle={tw`bg-white dark:bg-neutral-900 rounded-t-3xl`}
        keyboardBehavior="fillParent"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
      >
        <BottomSheetScrollView
          contentContainerStyle={[
            tw`px-6 pt-2 pb-8 mt-10`,
            { paddingBottom: Math.max(insets.bottom, 20) },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          {/* Step 1: Email Entry */}
          {currentStep === "email" && (
            <>
              {/* Back Button */}
              <TouchableOpacity
                onPress={handleBack}
                style={tw`flex-row items-center mb-6`}
              >
                <Ionicons name="arrow-back" size={24} color={tw.prefixMatch('dark') ? '#F9FAFB' : '#1F2937'} />
                <AppText style={tw`ml-2 text-base text-gray-900 dark:text-white`}>Back</AppText>
              </TouchableOpacity>

              {/* Header */}
              <View style={tw`mb-6 items-center `}>
                <BoldText style={tw`text-2xl font-bold text-neutral-900 dark:text-white mb-2`}>
                  Forget password
                </BoldText>
                <AppText style={tw`text-neutral-500 dark:text-neutral-400 text-[16px] text-center`}>
                  Please enter the email address associated with this account
                </AppText>
              </View>

              {/* Email Input */}
              <SheetInput
                label="Email"
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                icon={<EmailOutline width={20} height={20} />}
                variant="outline"
                size="sm"
                containerStyle={tw`mb-6`}
                value={email}
                onChangeText={setEmail}
              />

              {/* Error Message */}
              {error && (
                <AppText style={tw`text-red-500 text-sm mb-4 text-center`}>
                  {error}
                </AppText>
              )}

              {/* Send OTP Button */}
              <Button
                onPress={handleSendOTP}
                style={tw`${email && !isLoading ? "bg-primary-500" : "bg-gray-300"
                  } rounded-full py-4 items-center`}
                disabled={!email || isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <AppText
                    weight="bold"
                    style={tw`${email ? "text-white" : "text-gray-500"
                      } font-semibold text-lg`}
                  >
                    Send OTP
                  </AppText>
                )}
              </Button>
            </>
          )}

          {/* Step 2: OTP Verification — shared component */}
          {currentStep === "otp" && (
            <OtpVerification
              ref={otpRef}
              email={email}
              onVerify={handleOtpVerify}
              onResend={handleOtpResend}
              onEditEmail={handleEditEmail}
              autoStartCountdown
            />
          )}

          {/* Step 3: Reset Password */}
          {currentStep === "reset" && (
            <>
              {/* Back Button */}
              <TouchableOpacity
                onPress={handleBack}
                style={tw`flex-row items-center mb-6`}
              >
                <Ionicons name="arrow-back" size={24} color={tw.prefixMatch('dark') ? '#F9FAFB' : '#1F2937'} />
                <AppText style={tw`ml-2 text-base text-gray-900 dark:text-white`}>Back</AppText>
              </TouchableOpacity>

              {/* Header */}
              <View style={tw`mb-6`}>
                <BoldText style={tw`text-2xl font-bold text-neutral-900 dark:text-white mb-2`}>
                  Reset password
                </BoldText>
                <AppText style={tw`text-neutral-500 dark:text-neutral-400 text-center`}>
                  Welcome back, you have been missed 🥳
                </AppText>
              </View>

              {/* Password Input */}
              <SheetInput
                label="Password"
                placeholder="Enter new password"
                secureTextEntry
                icon={<Lock width={20} height={20} />}
                variant="outline"
                size="sm"
                containerStyle={tw`mb-4`}
                value={password}
                onChangeText={setPassword}
              />

              {/* Confirm Password Input */}
              <SheetInput
                label="Confirm Password"
                placeholder="Confirm new password"
                secureTextEntry
                icon={<Lock width={20} height={20} />}
                variant="outline"
                size="sm"
                containerStyle={tw`mb-6`}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />

              {/* Error Message */}
              {error && (
                <AppText style={tw`text-red-500 text-sm mb-4 text-center`}>
                  {error}
                </AppText>
              )}

              {/* Reset Button */}
              <Button
                onPress={handleResetPassword}
                style={tw`${password && confirmPassword && password === confirmPassword && !isLoading
                    ? "bg-primary-500"
                    : "bg-gray-300"
                  } rounded-full py-4 items-center`}
                disabled={
                  !password || !confirmPassword || password !== confirmPassword || isLoading
                }
              >
                {isLoading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <AppText
                    weight="bold"
                    style={tw`${password && confirmPassword && password === confirmPassword
                        ? "text-white"
                        : "text-gray-500"
                      } font-semibold text-lg`}
                  >
                    Reset Password
                  </AppText>
                )}
              </Button>
            </>
          )}

          {/* Step 4: Success */}
          {currentStep === "success" && (
            <View style={tw`flex-1 items-center justify-center`}>
              {/* Success Icon */}
              <View style={tw`relative mb-6`}>
                <View
                  style={tw`w-24 h-24 bg-primary-500 rounded-full items-center justify-center`}
                >
                  <Ionicons name="checkmark" size={48} color="white" />
                </View>
                <AppText style={tw`text-3xl absolute -top-2 -right-2`}>
                  ✨
                </AppText>
              </View>

              {/* Success Message */}
              <BoldText style={tw`text-2xl font-bold text-neutral-900 dark:text-white mb-2`}>
                Password updated successfully
              </BoldText>
              <AppText style={tw`text-neutral-500 dark:text-neutral-400 text-center`}>
                You can now sign in with your new password.
              </AppText>
            </View>
          )}
        </BottomSheetScrollView>
      </BottomSheetModal>
    );
  }
);

export default ForgotPasswordSheet;
