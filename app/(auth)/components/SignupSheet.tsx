
import { AppText, BoldText, Button } from '@/components/ui';
import tw from '@/lib/tw';
import { Alert } from '@/utils/alert';
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import React, { forwardRef, useCallback, useEffect, useMemo, useState } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SheetInput } from './SheetInput';

import Lock from '@/assets/icons/lock.svg';
import EmailOutline from '@/assets/icons/mail-outline.svg';
import { useAuth } from '@/hooks/useAuth';

interface SignupSheetProps {
  onDismiss?: () => void;
  onSignup?: () => void;
  onGoToLogin?: () => void;
}

const SignupSheet = forwardRef<BottomSheetModal, SignupSheetProps>(({ onDismiss, onSignup, onGoToLogin }, ref) => {
  const { register, isLoading, error, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  // variables
  const snapPoints = useMemo(() => ['85%'], []);
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

  const handleSignup = async () => {
    // Validation
    if (!email || !password || !confirmPassword || !firstName || !lastName) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters long');
      return;
    }

    try {
      await register({
        email,
        password,
        firstName,
        lastName,
      });
      
      // Navigation is handled in the auth store
      // Close the sheet
      if (ref && typeof ref !== 'function' && ref.current) {
        ref.current.dismiss();
      }
      
      // Call onSignup callback if provided
      if (onSignup) {
        onSignup();
      }
    } catch (err: any) {
      // Error is already set in the store
      Alert.alert('Signup Failed', error || 'An error occurred. Please try again.');
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
      <BottomSheetScrollView contentContainerStyle={[tw`px-6 pt-2 pb-8`, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        {/* Header */}
        <View style={tw`mb-6`}>
          <BoldText style={tw`text-2xl font-bold text-neutral-900 mb-2`}>
            Create your account
          </BoldText>
          <AppText style={tw`text-neutral-900`}>
            Start your personalised language journey.
          </AppText>
        </View>

        {/* First Name */}
        <SheetInput
          label="First Name"
          placeholder="John"
          autoCapitalize="words"
          variant="outline"
          size="sm"
          containerStyle={tw`mb-2`}
          value={firstName}
          onChangeText={setFirstName}
          editable={!isLoading}
        />

        {/* Last Name */}
        <SheetInput
          label="Last Name"
          placeholder="Doe"
          autoCapitalize="words"
          variant="outline"
          size="sm"
          containerStyle={tw`mb-2`}
          value={lastName}
          onChangeText={setLastName}
          editable={!isLoading}
        />

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
          containerStyle={tw`mb-2`}
          value={password}
          onChangeText={setPassword}
          editable={!isLoading}
        />

        {/* Confirm Password */}
        <SheetInput
          label="Confirm Password"
          placeholder="Re-enter password"
          secureTextEntry
          icon={<Lock width={20} height={20} />}
          variant="outline"
          size="sm"
          containerStyle={tw`mb-6`}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          editable={!isLoading}
        />

        {/* Error Message */}
        {error && (
          <View style={tw`mb-4 p-3 bg-red-50 rounded-lg`}>
            <AppText style={tw`text-red-600 text-sm`}>{error}</AppText>
          </View>
        )}

        {/* Terms */}
        <AppText style={tw`text-[14px] text-neutral-500 mb-6`}>
          By clicking create account, you agree to Eklan's{" "}
          <AppText weight="medium" style={tw`text-primary-500 font-medium`}>
            Terms of Service
          </AppText>{" "}
          and{" "}
          <AppText weight="medium" style={tw`text-primary-500 text-[14px] font-medium`}>
            Privacy Policy
          </AppText>.
        </AppText>

        {/* CTA */}
        <Button 
          onPress={handleSignup}
          style={tw`rounded-full mb-4`}
          disabled={isLoading}
        >
          {isLoading ? 'Creating account...' : 'Create account'}
        </Button>

        {/* Switch to Login */}
        <View style={tw`flex-row justify-center mb-2`}>
          <AppText style={tw`text-sm text-neutral-500`}>
            Already have an account?{' '}
          </AppText>
          <TouchableOpacity onPress={onGoToLogin}>
            <AppText weight="bold" style={tw`text-sm text-primary-500 font-semibold`}>
              Log in
            </AppText>
          </TouchableOpacity>
        </View>
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
});

export default SignupSheet;
