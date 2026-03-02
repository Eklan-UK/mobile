import { LinearGradient } from "expo-linear-gradient";
import Apple from "@/assets/icons/apple.svg";
import Google from "@/assets/icons/google.svg";
import Mail from "@/assets/icons/mail.svg";
import EklanLogo from "@/assets/images/auth_logo.svg";
import { AppText, BoldText, Button, Loader } from "@/components/ui";
import tw from "@/lib/tw";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { router, useLocalSearchParams } from "expo-router";
import React, { useRef, useState, useEffect } from "react";
import { TouchableOpacity, View, Platform, BackHandler, ImageBackground, StyleSheet } from "react-native";
import { Alert } from '@/utils/alert';
import { SafeAreaView } from "react-native-safe-area-context";
import ForgotPasswordSheet from "./components/ForgotPasswordSheet";
import LoadingSheet from "./components/LoadingSheet";
import LoginSheet from "./components/LoginSheet";
import SignupSheet from "./components/SignupSheet";
import SuccessSheet from "./components/SuccessSheet";
import VerifyEmailOtpSheet from "./components/VerifyEmailOtpSheet";
import { useAuth } from "@/hooks/useAuth";
import Logo from "@/assets/icons/icon-logo.svg";
import { SignupFormData } from "./components/SignupSheet";
import apiClient from "@/lib/api";
import { logger } from "@/utils/logger";

export default function AccessGatewayScreen() {
  const params = useLocalSearchParams<{ mode?: string }>();
  const mode = params.mode || 'signup'; // Default to signup if no mode specified

  const loginSheetRef = useRef<BottomSheetModal>(null);
  const signupSheetRef = useRef<BottomSheetModal>(null);
  const loadingSheetRef = useRef<BottomSheetModal>(null);
  const successSheetRef = useRef<BottomSheetModal>(null);
  const forgotPasswordSheetRef = useRef<BottomSheetModal>(null);
  const verifyEmailOtpSheetRef = useRef<BottomSheetModal>(null);

  const { signInWithGoogle, signInWithApple, register, isLoading, user, isAuthenticated } = useAuth();
  const [oauthLoading, setOauthLoading] = useState(false);
  const [signupEmail, setSignupEmail] = useState("");
  const [showLoaderOverlay, setShowLoaderOverlay] = useState(false);

  const handleEmailSignup = () => {
    if (mode === 'login') {
      loginSheetRef.current?.present();
    } else {
      signupSheetRef.current?.present();
    }
  };

  const handleLoginPress = () => {
    loginSheetRef.current?.present();
  };

  /**
   * Full signup flow:
   * 1. Dismiss SignupSheet
   * 2. Show LoadingSheet ("Setting up your account…")
   * 3. Call register() — creates account & stores token
   * 4. Send verification OTP to user's email
   * 5. Dismiss LoadingSheet → show VerifyEmailOtpSheet
   * 6. User enters OTP → verify → handleOtpVerified
   * 7. Show LoadingSheet briefly → show SuccessSheet
   * 8. User taps Continue → loader overlay → navigate to profile-setup
   */
  const handleSignupSubmit = async (data: SignupFormData) => {
    signupSheetRef.current?.dismiss();
    setSignupEmail(data.email);

    // Small delay so the signup sheet can begin animating out
    setTimeout(async () => {
      loadingSheetRef.current?.present();

      try {
        // Step 1: Create the account
        await register(data);

        // Step 2: Send verification OTP
        logger.log("📧 Sending verification OTP...");
        await apiClient.post("/api/v1/auth/email/send-verification-otp");
        logger.log("✅ Verification OTP sent");

        // Step 3: Dismiss loading → show OTP sheet
        loadingSheetRef.current?.dismiss();
        setTimeout(() => {
          verifyEmailOtpSheetRef.current?.present();
        }, 300);
      } catch (err: any) {
        loadingSheetRef.current?.dismiss();
        setTimeout(() => {
          Alert.alert("Signup Failed", err?.message || "An error occurred. Please try again.");
          // Re-open signup sheet so user can try again
          signupSheetRef.current?.present();
        }, 300);
      }
    }, 300);
  };

  /**
   * Called after OTP is successfully verified.
   * Dismiss OTP sheet → Loading sheet → Success sheet → Loader overlay → Profile setup
   */
  const handleOtpVerified = () => {
    verifyEmailOtpSheetRef.current?.dismiss();

    setTimeout(() => {
      // Show loading sheet briefly
      loadingSheetRef.current?.present();

      setTimeout(() => {
        loadingSheetRef.current?.dismiss();

        setTimeout(() => {
          // Show success sheet
          successSheetRef.current?.present();
        }, 300);
      }, 1500);
    }, 300);
  };

  const handleForgotPassword = () => {
    loginSheetRef.current?.dismiss();
    setTimeout(() => {
      forgotPasswordSheetRef.current?.present();
    }, 300);
  };

  const openLoginSheet = () => {
    signupSheetRef.current?.dismiss();
    setTimeout(() => {
      loginSheetRef.current?.present();
    }, 200);
  };

  const openSignupSheet = () => {
    loginSheetRef.current?.dismiss();
    setTimeout(() => {
      signupSheetRef.current?.present();
    }, 200);
  };

  const handleGoogleAuth = async () => {
    try {
      setOauthLoading(true);
      await signInWithGoogle();
      // Navigation handled by auth store
    } catch (error: any) {
      // Error already handled by auth store
      // Only show alert if there's an actual error (not cancellation)
      if (error.message && !error.message.includes('cancel')) {
        Alert.alert('Google Sign-In Failed', error.message);
      }
    } finally {
      setOauthLoading(false);
    }
  };

  const handleAppleAuth = async () => {
    try {
      setOauthLoading(true);
      await signInWithApple();
      // Navigation handled by auth store
    } catch (error: any) {
      // Error already handled by auth store
      // Only show alert if there's an actual error (not cancellation)
      if (error.message && !error.message.includes('cancel')) {
        Alert.alert('Apple Sign-In Failed', error.message);
      }
    } finally {
      setOauthLoading(false);
    }
  };

  // If we are in "verify-email" mode (e.g. user reopened app while unverified),
  // automatically show the verify-email OTP sheet and send a fresh OTP.
  useEffect(() => {
    if (mode !== 'verify-email') return;

    // Require an authenticated user with an email
    if (!isAuthenticated || !user?.email) {
      // Fallback: go back to default auth entry
      router.replace("/(auth)/auth");
      return;
    }

    setSignupEmail(user.email);

    const openVerifyFlow = async () => {
      try {
        logger.log("📧 Sending verification OTP (re-entry into verify-email flow)...");
        await apiClient.post("/api/v1/auth/email/send-verification-otp");
        logger.log("✅ Verification OTP sent (verify-email mode)");
      } catch (err: any) {
        logger.error("❌ Failed to send verification OTP in verify-email mode:", {
          message: err?.message,
          response: err?.response?.data,
        });
        Alert.alert(
          "Verification Error",
          err?.message || "Failed to send verification email. Please try again."
        );
        return;
      }

      // Open the OTP sheet after a small delay for smoother UX
      setTimeout(() => {
        verifyEmailOtpSheetRef.current?.present();
      }, 300);
    };

    openVerifyFlow();
  }, [mode, isAuthenticated, user]);

  // Handle back button to close bottom sheets
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      // Close sheets in reverse order of likely visibility
      if (forgotPasswordSheetRef.current) {
        forgotPasswordSheetRef.current.dismiss();
        return true;
      }
      if (successSheetRef.current) {
        successSheetRef.current.dismiss();
        return true;
      }
      if (loadingSheetRef.current) {
        // Don't allow closing during loading
        return true;
      }
      if (signupSheetRef.current) {
        signupSheetRef.current.dismiss();
        return true;
      }
      if (loginSheetRef.current) {
        loginSheetRef.current.dismiss();
        return true;
      }
      return false;
    });

    return () => backHandler.remove();
  }, []);

  return (
    <ImageBackground
      source={require("@/assets/images/auth-bg.jpeg")}
      style={styles.bgImage}
      resizeMode="cover"
    >
      <LinearGradient
        colors={["rgba(255, 255, 255, 0.2)", "rgba(255, 255, 255, 1)", "#ffffff"]}
        locations={[0, 0.5, 1]}
        style={styles.overlay}
      />
      <SafeAreaView style={tw`flex-1`} edges={["top", "bottom"]}>
        <View style={tw`flex-1 justify-around px-6`}>

          {/* Logo */}
          <View style={tw`items-center mt-24 gap-2`}>
            <Logo width={100} height={130} />
          </View>


          <View style={tw`items-center mt-20`}>
            <BoldText weight="extrabold" style={tw`text-[32px]  mb-3`}>
              Hello there!
            </BoldText>
            <AppText style={tw`text-base  text-center`}>
              Let's make English speaking feel natural.
            </AppText>
          </View>

          {/* Buttons */}
          <View style={tw` mb-[12px]`}>
            <View style={tw` gap-[16px]`}>

              {/* Email */}
              <Button
                onPress={handleEmailSignup}
                style={tw`px-[40px] py-[16] rounded-[25px]`}
                icon={<Mail />}
                disabled={oauthLoading || isLoading}
              >
                Continue with Email
              </Button>

              {/* Google */}
              <Button
                onPress={handleGoogleAuth}
                variant="secondary"
                style={tw`px-[40px] py-[16] rounded-[25px] border-[#E7EAED]`}
                icon={<Google />}
                disabled={oauthLoading || isLoading}
              >
                {oauthLoading ? 'Signing in...' : 'Continue with Google'}
              </Button>

              {/* Apple - iOS only */}

              <Button
                onPress={handleAppleAuth}
                variant="dark"
                style={tw`px-[40px] py-[16] rounded-full`}
                icon={<Apple />}
                disabled={oauthLoading || isLoading}
              >
                {oauthLoading ? 'Signing in...' : 'Continue with Apple'}
              </Button>


            </View>

            {/* Footer */}
            <AppText style={tw`text-base  text-center mt-2 px-4`}>
              We'll never post or share anything without permission.
            </AppText>
{/* 
            <View style={tw`flex-row justify-center mt-3`}>
              <AppText style={tw`text-neutral-500 text-base`}>Already have an account? </AppText>
              <TouchableOpacity onPress={handleLoginPress}>
                <AppText weight="bold" style={tw`text-primary-500 font-bold text-base`}>Log in</AppText>
              </TouchableOpacity>
            </View> */}
          </View>
        </View>
      </SafeAreaView>

      {/* Bottom Sheets */}
      <LoginSheet
        ref={loginSheetRef}
        onForgotPassword={handleForgotPassword}
        onGoToSignup={openSignupSheet}
      />
      <SignupSheet
        ref={signupSheetRef}
        onSignup={handleSignupSubmit}
        onGoToLogin={openLoginSheet}
      />
      <LoadingSheet
        ref={loadingSheetRef}
      />
      <VerifyEmailOtpSheet
        ref={verifyEmailOtpSheetRef}
        email={signupEmail}
        onVerified={handleOtpVerified}
      />
      <SuccessSheet
        ref={successSheetRef}
        onContinue={() => {
          successSheetRef.current?.dismiss();
          setShowLoaderOverlay(true);
          setTimeout(() => {
            router.replace("/(profile-setup)");
          }, 1500);
        }}
      />
      <ForgotPasswordSheet ref={forgotPasswordSheetRef} />

      {/* Full-screen loader overlay (shown after success → before profile setup) */}
      {showLoaderOverlay && (
        <View
          style={[
            StyleSheet.absoluteFillObject,
            tw`bg-white dark:bg-neutral-900 flex items-center justify-center`,
            { zIndex: 999 },
          ]}
        >
          <Loader size={120} />
          <AppText style={tw`text-neutral-500 dark:text-neutral-400 mt-4`}>Just a moment…</AppText>
        </View>
      )}
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bgImage: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
});
