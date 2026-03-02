
import { AppText, BoldText, Button } from '@/components/ui';
import tw from '@/lib/tw';
import { Alert } from '@/utils/alert';
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import React, { forwardRef, useCallback, useMemo, useState } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SheetInput } from './SheetInput';

import Lock from '@/assets/icons/lock.svg';
import EmailOutline from '@/assets/icons/mail-outline.svg';

export interface SignupFormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

interface SignupSheetProps {
  onDismiss?: () => void;
  onSignup?: (data: SignupFormData) => void;
  onGoToLogin?: () => void;
}

const SignupSheet = forwardRef<BottomSheetModal, SignupSheetProps>(({ onDismiss, onSignup, onGoToLogin }, ref) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const snapPoints = useMemo(() => ['85%'], []);
  const insets = useSafeAreaInsets();

  const handleSheetChanges = useCallback((index: number) => {
    if (index === -1) {
      onDismiss?.();
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

  const handleSignup = () => {
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

    // Prevent double-submit
    if (submitted) return;
    setSubmitted(true);

    // Hand off to auth.tsx immediately — it will show LoadingSheet and call the API
    onSignup?.({ firstName, lastName, email, password });
  };

  return (
    <BottomSheetModal
      ref={ref}
      index={0}
      snapPoints={snapPoints}
      onChange={handleSheetChanges}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      handleIndicatorStyle={tw`bg-neutral-300 dark:bg-neutral-600 w-12`}
      backgroundStyle={tw`bg-white dark:bg-neutral-900 rounded-t-3xl`}
      onDismiss={() => setSubmitted(false)}
    >
      <BottomSheetScrollView contentContainerStyle={[tw`px-6 pt-2 pb-8`, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        {/* Header */}
        <View style={tw`mb-6`}>
          <BoldText style={tw`text-2xl font-bold text-neutral-900 dark:text-white mb-2`}>
            Create your account
          </BoldText>
          <AppText style={tw`text-neutral-900 dark:text-neutral-300`}>
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
          editable={!submitted}
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
          editable={!submitted}
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
          editable={!submitted}
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
          editable={!submitted}
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
          editable={!submitted}
        />

        {/* Terms */}
        <AppText style={tw`text-[14px] text-neutral-500 dark:text-neutral-400 mb-6`}>
          By clicking create account, you agree to Eklan's{' '}
          <AppText weight="medium" style={tw`text-primary-500 font-medium`}>
            Terms of Service
          </AppText>{' '}
          and{' '}
          <AppText weight="medium" style={tw`text-primary-500 text-[14px] font-medium`}>
            Privacy Policy
          </AppText>.
        </AppText>

        {/* CTA */}
        <Button
          onPress={handleSignup}
          style={tw`rounded-full mb-4`}
          disabled={submitted}
        >
          Create account
        </Button>

        {/* Switch to Login */}
        <View style={tw`flex-row justify-center mb-2`}>
          <AppText style={tw`text-sm text-neutral-500 dark:text-neutral-400`}>
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
