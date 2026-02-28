import Apple from "@/assets/icons/apple.svg";
import Google from "@/assets/icons/google.svg";
import Mail from "@/assets/icons/mail.svg";
import EklanLogo from "@/assets/images/auth_logo.svg";
import { AppText, BoldText, Button } from "@/components/ui";
import tw from "@/lib/tw";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { router, useLocalSearchParams } from "expo-router";
import React, { useRef, useState, useEffect } from "react";
import { TouchableOpacity, View, Platform, BackHandler } from "react-native";
import { Alert } from '@/utils/alert';
import { SafeAreaView } from "react-native-safe-area-context";
import ForgotPasswordSheet from "./components/ForgotPasswordSheet";
import LoadingSheet from "./components/LoadingSheet";
import LoginSheet from "./components/LoginSheet";
import SignupSheet from "./components/SignupSheet";
import SuccessSheet from "./components/SuccessSheet";
import { useAuth } from "@/hooks/useAuth";
import Logo from "@/assets/icons/icon-logo.svg";

export default function AccessGatewayScreen() {
  const params = useLocalSearchParams<{ mode?: string }>();
  const mode = params.mode || 'signup'; // Default to signup if no mode specified

  const loginSheetRef = useRef<BottomSheetModal>(null);
  const signupSheetRef = useRef<BottomSheetModal>(null);
  const loadingSheetRef = useRef<BottomSheetModal>(null);
  const successSheetRef = useRef<BottomSheetModal>(null);
  const forgotPasswordSheetRef = useRef<BottomSheetModal>(null);

  const { signInWithGoogle, signInWithApple, isLoading } = useAuth();
  const [oauthLoading, setOauthLoading] = useState(false);

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

  const handleSignupSubmit = () => {
    signupSheetRef.current?.dismiss();
    loadingSheetRef.current?.present();
  };

  const handleLoadingComplete = () => {
    loadingSheetRef.current?.dismiss();
    successSheetRef.current?.present();
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
    <View style={tw`flex-1 bg-neutral-50`}>
      <SafeAreaView style={tw`flex-1`} edges={["top", "bottom"]}>
        <View style={tw`flex-1 justify-around px-6`}>

          {/* Logo */}
          <View style={tw`items-center mt-30 gap-2`}>
            <Logo width={150} height={150} />
          </View>


          <View style={tw`items-center`}>
            <BoldText weight="extrabold" style={tw`text-[32px]  text-neutral-900 mb-3`}>
              Hello there!
            </BoldText>
            <AppText style={tw`text-base text-neutral-900 text-center`}>
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
            <AppText style={tw`text-base text-neutral-400 text-center mt-2 px-4`}>
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
        onLoadingComplete={handleLoadingComplete}
      />
      <SuccessSheet ref={successSheetRef} />
      <ForgotPasswordSheet ref={forgotPasswordSheetRef} />
    </View>
  );
}
