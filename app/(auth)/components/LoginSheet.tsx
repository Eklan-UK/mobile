
import CheckBox from '@/assets/icons/checkbox.svg';
import tw from '@/lib/tw';
import { Alert } from '@/utils/alert';
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import React, { forwardRef, useCallback, useEffect, useMemo, useState } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SheetInput } from './SheetInput';

import Lock from '@/assets/icons/lock.svg';
import EmailOutline from '@/assets/icons/mail-outline.svg';
import { AppText, BoldText, Button } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { logger } from "@/utils/logger";
import CheckBoxActive from '@/assets/icons/checkbox-active.svg';

interface LoginSheetProps {
  onDismiss?: () => void;
  onForgotPassword?: () => void;
  onGoToSignup?: () => void;
}

const LoginSheet = forwardRef<BottomSheetModal, LoginSheetProps>(({ onDismiss, onForgotPassword, onGoToSignup }, ref) => {
  const { login, isLoading, error, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  // variables
  const snapPoints = useMemo(() => ['75%'], []);
  const insets = useSafeAreaInsets();

  // callbacks
  const handleSheetChanges = useCallback((index: number) => {
    if (index === -1) {
      clearError();
      if (onDismiss) {
        onDismiss();
      }
    }
  }, [onDismiss, clearError]);

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

  const handleLogin = async () => {
    // Basic validation
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    try {
      await login(email, password, rememberMe);
      // Navigation is handled in the auth store
      // Close the sheet
      if (ref && typeof ref !== 'function' && ref.current) {
        ref.current.dismiss();
      }
    } catch (err: any) {
      // Error is already set in the store
      Alert.alert('Login Failed', error || 'An error occurred. Please try again.');
      logger.log(err)
    }
  };

  // Auto-clear error after 3 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        clearError();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

  return (
    <BottomSheetModal
      ref={ref}
      index={0}
      snapPoints={snapPoints}
      onChange={handleSheetChanges}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      handleIndicatorStyle={tw`bg-neutral-300 w-12`}
      backgroundStyle={tw`bg-white rounded-t-3xl`}
    >
      <BottomSheetView style={[tw`flex-1 px-6 pt-2 pb-8`, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        {/* Header */}
        <View style={tw`mb-6`}>
          <BoldText style={tw`text-2xl font-bold text-neutral-900 mb-1`}>
            Let's sign you in
          </BoldText>
          <AppText style={tw`text-neutral-500`}>
            Welcome back, you have been missed 🥳
          </AppText>
        </View>

        {/* Email */}
        <SheetInput
          label="Email"
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          icon={<EmailOutline width={20} height={20} />}
          variant="outline"
          size="sm"
          containerStyle={tw`mb-2`}
          value={email}
          onChangeText={setEmail}
          editable={!isLoading}
        />

        {/* Password */}
        <SheetInput
          label="Password"
          placeholder="Enter password"
          secureTextEntry
          icon={<Lock width={20} height={20} />}
          variant="outline"
          size="sm"
          containerStyle={tw`mb-4`}
          value={password}
          onChangeText={setPassword}
          editable={!isLoading}
        />

        {/* Remember / Forgot */}
        <View style={tw`flex-row justify-between items-center mb-6`}>

          <TouchableOpacity
            onPress={() => setRememberMe(!rememberMe)}
            style={tw`flex-row items-center`}
          >

            {rememberMe ? (
              <CheckBoxActive 
                width={20}
                height={20}
              />
            ) : (
              <CheckBox 
                width={20}
                height={20}
              />
            )}
            <AppText style={tw`text-sm text-neutral-500`}>Remember me</AppText>
          </TouchableOpacity>
          <TouchableOpacity onPress={onForgotPassword}>
            <AppText weight="medium" style={tw`text-sm text-primary-500 font-medium`}>
              Forgot password
            </AppText>
          </TouchableOpacity>
        </View>

        {/* Error Message */}
        {error && (
          <View style={tw`mb-4 p-3 bg-red-50 rounded-lg`}>
            <AppText style={tw`text-red-600 text-sm`}>{error}</AppText>
          </View>
        )}

        {/* CTA */}
        <Button
          onPress={handleLogin}
          style={tw`bg-primary-500 rounded-full mb-4 py-4 items-center`}
          disabled={isLoading}
        >
          <AppText weight="bold" style={tw`text-white font-semibold text-lg`}>
            {isLoading ? 'Logging in...' : 'Log in'}
          </AppText>
        </Button>

        {/* Switch to Signup */}
        <View style={tw`flex-row justify-center`}>
          <AppText style={tw`text-sm text-neutral-500`}>
            Don&apos;t have an account?{' '}
          </AppText>
          <TouchableOpacity onPress={onGoToSignup}>
            <AppText weight="bold" style={tw`text-sm text-primary-500 font-semibold`}>
              Sign up
            </AppText>
          </TouchableOpacity>
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
});

export default LoginSheet;
