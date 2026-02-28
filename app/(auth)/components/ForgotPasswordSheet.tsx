import Lock from "@/assets/icons/lock.svg";
import EmailOutline from "@/assets/icons/mail-outline.svg";
import { AppText, BoldText, Button } from "@/components/ui";
import tw from "@/lib/tw";
import { Ionicons } from "@expo/vector-icons";
import {
    BottomSheetBackdrop,
    BottomSheetModal,
    BottomSheetView,
} from "@gorhom/bottom-sheet";
import React, {
    forwardRef,
    useCallback,
    useEffect,
    useImperativeHandle,
    useMemo,
    useRef,
    useState,
} from "react";
import { ActivityIndicator, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SheetInput } from "./SheetInput";
import { passwordResetService } from "@/services/password-reset.service";
import { Alert } from "@/utils/alert";
import { logger } from "@/utils/logger";

interface ForgotPasswordSheetProps {
  onDismiss?: () => void;
  onSuccess?: () => void;
}

type Step = "email" | "otp" | "reset" | "success";

const ForgotPasswordSheet = forwardRef<BottomSheetModal, ForgotPasswordSheetProps>(
  ({ onDismiss, onSuccess }, ref) => {
    const bottomSheetRef = useRef<BottomSheetModal>(null);
    const [currentStep, setCurrentStep] = useState<Step>("email");
    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState(["", "", "", "", "", ""]);
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [countdown, setCountdown] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const otpInputRefs = useRef<(TextInput | null)[]>([]);
    const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

    const snapPoints = useMemo(() => ["75%"], []);
    const insets = useSafeAreaInsets();

    useImperativeHandle(ref, () => bottomSheetRef.current as BottomSheetModal);

    const handleSheetChanges = useCallback(
      (index: number) => {
        if (index === -1) {
          setCurrentStep("email");
          setEmail("");
          setOtp(["", "", "", "", "", ""]);
          setPassword("");
          setConfirmPassword("");
          setCountdown(0);
          setError("");
          setIsLoading(false);
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
          }
          if (onDismiss) onDismiss();
        }
      },
      [onDismiss]
    );

    // Countdown timer effect
    useEffect(() => {
      if (countdown > 0) {
        countdownIntervalRef.current = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              if (countdownIntervalRef.current) {
                clearInterval(countdownIntervalRef.current);
                countdownIntervalRef.current = null;
              }
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }
      }

      return () => {
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }
      };
    }, [countdown]);

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
        setCountdown(600); // 10 minutes in seconds
        setOtp(["", "", "", "", "", ""]);
        // Focus first OTP input
        setTimeout(() => {
          otpInputRefs.current[0]?.focus();
        }, 100);
      } catch (error: any) {
        logger.error('Failed to send OTP:', error);
        setError(error.message || "Failed to send OTP. Please try again.");
        Alert.alert("Error", error.message || "Failed to send OTP. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    const handleVerifyOTP = async () => {
      const otpCode = otp.join("");
      if (otpCode.length !== 6) return;

      setIsLoading(true);
      setError("");

      try {
        await passwordResetService.verifyOTP(email, otpCode);
        setCurrentStep("reset");
      } catch (error: any) {
        logger.error('Failed to verify OTP:', error);
        setError(error.message || "Invalid OTP. Please try again.");
        Alert.alert("Error", error.message || "Invalid OTP. Please try again.");
        // Clear OTP inputs on error
        setOtp(["", "", "", "", "", ""]);
        otpInputRefs.current[0]?.focus();
      } finally {
        setIsLoading(false);
      }
    };

    const handleResetPassword = async () => {
      if (!password || password !== confirmPassword) return;

      if (password.length < 8) {
        Alert.alert("Error", "Password must be at least 8 characters long.");
        return;
      }

      setIsLoading(true);
      setError("");

      try {
        const otpCode = otp.join("");
        await passwordResetService.resetPassword(email, otpCode, password);
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

    const handleOtpChange = (index: number, value: string) => {
      if (value.length <= 1) {
        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);

        // Auto-focus next input
        if (value && index < 5) {
          otpInputRefs.current[index + 1]?.focus();
        }

        // Auto-verify when all 6 digits are entered
        if (value && index === 5) {
          const otpCode = newOtp.join("");
          if (otpCode.length === 6) {
            // Small delay to ensure state is updated, then verify
            setTimeout(async () => {
              setIsLoading(true);
              setError("");

              try {
                await passwordResetService.verifyOTP(email, otpCode);
                setCurrentStep("reset");
              } catch (error: any) {
                logger.error('Failed to verify OTP:', error);
                setError(error.message || "Invalid OTP. Please try again.");
                Alert.alert("Error", error.message || "Invalid OTP. Please try again.");
                // Clear OTP inputs on error
                setOtp(["", "", "", "", "", ""]);
                otpInputRefs.current[0]?.focus();
              } finally {
                setIsLoading(false);
              }
            }, 300);
          }
        }
      }
    };

    const handleOtpKeyPress = (index: number, key: string) => {
      if (key === "Backspace" && !otp[index] && index > 0) {
        otpInputRefs.current[index - 1]?.focus();
      }
    };

    const handleResend = async () => {
      if (countdown > 0) return; // Can't resend if countdown is active

      setIsLoading(true);
      setError("");

      try {
        await passwordResetService.sendOTP(email);
        setCountdown(600); // 10 minutes in seconds
        setOtp(["", "", "", "", "", ""]);
        // Focus first OTP input
        setTimeout(() => {
          otpInputRefs.current[0]?.focus();
        }, 100);
      } catch (error: any) {
        logger.error('Failed to resend OTP:', error);
        Alert.alert("Error", error.message || "Failed to resend OTP. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    const handleEditEmail = () => {
      setCurrentStep("email");
    };

    return (
      <BottomSheetModal
        ref={bottomSheetRef}
        index={0}
        snapPoints={snapPoints}
        onChange={handleSheetChanges}
        enablePanDownToClose={currentStep !== "success"}
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
          {/* Step 1: Email Entry */}
          {currentStep === "email" && (
            <>
              {/* Back Button */}
              <TouchableOpacity
                onPress={handleBack}
                style={tw`flex-row items-center mb-6`}
              >
                <Ionicons name="arrow-back" size={24} color="#1F2937" />
                <AppText style={tw`ml-2 text-base text-gray-900`}>Back</AppText>
              </TouchableOpacity>

              {/* Header */}
              <View style={tw`mb-6`}>
                <BoldText style={tw`text-2xl font-bold text-neutral-900 mb-2`}>
                  Forget password
                </BoldText>
                <AppText style={tw`text-neutral-500 text-center`}>
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
                style={tw`${
                  email && !isLoading ? "bg-primary-500" : "bg-gray-300"
                } rounded-full py-4 items-center`}
                disabled={!email || isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <AppText
                    weight="bold"
                    style={tw`${
                      email ? "text-white" : "text-gray-500"
                    } font-semibold text-lg`}
                  >
                    Send OTP
                  </AppText>
                )}
              </Button>
            </>
          )}

          {/* Step 2: OTP Verification */}
          {currentStep === "otp" && (
            <>
              {/* Header */}
              <View style={tw`mb-8`}>
                <BoldText style={tw`text-2xl font-bold text-neutral-900 mb-2`}>
                  Verify your email
                </BoldText>
                <AppText style={tw`text-neutral-500 text-center`}>
                  We sent a 6-digit code has been sent to {email}. Please enter
                  it below.
                </AppText>
              </View>

              {/* OTP Input */}
              <View style={tw`flex-row justify-between mb-4`}>
                {otp.map((digit, index) => (
                  <TextInput
                    key={index}
                    ref={(el) => {
                      otpInputRefs.current[index] = el;
                    }}
                    style={tw`w-12 h-14 border-2 ${
                      digit ? "border-primary-500" : "border-gray-300"
                    } rounded-xl text-center text-xl font-bold text-gray-900`}
                    value={digit}
                    onChangeText={(value) => handleOtpChange(index, value)}
                    onKeyPress={({ nativeEvent: { key } }) =>
                      handleOtpKeyPress(index, key)
                    }
                    keyboardType="number-pad"
                    maxLength={1}
                  />
                ))}
              </View>

              {/* Resend */}
              <View style={tw`flex-row justify-center mb-8`}>
                <AppText style={tw`text-neutral-500`}>Didn't get it? </AppText>
                <TouchableOpacity 
                  onPress={handleResend}
                  disabled={countdown > 0 || isLoading}
                >
                  <AppText 
                    weight="bold" 
                    style={tw`${
                      countdown > 0 || isLoading 
                        ? "text-gray-400" 
                        : "text-primary-500"
                    } font-bold`}
                  >
                    Resend
                  </AppText>
                </TouchableOpacity>
                {countdown > 0 && (
                  <AppText style={tw`text-neutral-500`}>
                    {" "}({Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')})
                  </AppText>
                )}
              </View>

              {/* Error Message */}
              {error && (
                <AppText style={tw`text-red-500 text-sm mb-4 text-center`}>
                  {error}
                </AppText>
              )}

              {/* Verify Button */}
              <Button
                onPress={handleVerifyOTP}
                style={tw`${
                  otp.every((d) => d) && !isLoading ? "bg-primary-500" : "bg-gray-300"
                } rounded-full py-4 items-center mb-4`}
                disabled={!otp.every((d) => d) || isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <AppText
                    weight="bold"
                    style={tw`${
                      otp.every((d) => d) ? "text-white" : "text-gray-500"
                    } font-semibold text-lg`}
                  >
                    Verify
                  </AppText>
                )}
              </Button>

              {/* Edit Email */}
              <TouchableOpacity onPress={handleEditEmail}>
                <AppText style={tw`text-center text-neutral-500`}>
                  Wrong email? Edit
                </AppText>
              </TouchableOpacity>
            </>
          )}

          {/* Step 3: Reset Password */}
          {currentStep === "reset" && (
            <>
              {/* Back Button */}
              <TouchableOpacity
                onPress={handleBack}
                style={tw`flex-row items-center mb-6`}
              >
                <Ionicons name="arrow-back" size={24} color="#1F2937" />
                <AppText style={tw`ml-2 text-base text-gray-900`}>Back</AppText>
              </TouchableOpacity>

              {/* Header */}
              <View style={tw`mb-6`}>
                <BoldText style={tw`text-2xl font-bold text-neutral-900 mb-2`}>
                  Reset password
                </BoldText>
                <AppText style={tw`text-neutral-500 text-center`}>
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
                style={tw`${
                  password && confirmPassword && password === confirmPassword && !isLoading
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
                    style={tw`${
                      password && confirmPassword && password === confirmPassword
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
              <BoldText style={tw`text-2xl font-bold text-neutral-900 mb-2`}>
                Password updated successfully
              </BoldText>
              <AppText style={tw`text-neutral-500 text-center`}>
                You can now sign in with your new password.
              </AppText>
            </View>
          )}
        </BottomSheetView>
      </BottomSheetModal>
    );
  }
);

export default ForgotPasswordSheet;
