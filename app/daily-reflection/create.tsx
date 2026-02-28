import Img1 from "@/assets/images/gif/daily-reflection/comfortable.gif";
import Img4 from "@/assets/images/gif/daily-reflection/nervous.gif";
import Img2 from "@/assets/images/gif/daily-reflection/okay.gif";
import Img5 from "@/assets/images/gif/daily-reflection/struggle.gif";
import Img3 from "@/assets/images/gif/daily-reflection/uncertain.gif";
import { AppText } from '@/components/ui';
import { Fonts } from '@/constants/fonts';
import tw from '@/lib/tw';
import { reflectionService } from '@/services/reflection.service';
import { Alert } from '@/utils/alert';
import { Image } from "expo-image";
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

// Feeling options with corresponding prompts
const FEELING_OPTIONS = [
  {
    icon: <Image source={Img1} style={tw`w-24 h-24`} />,
    value: 'comfortable',
    label: 'Comfortable',
    prompt: 'What felt easier or more natural today?'
  },
  {
    icon: <Image source={Img2} style={tw`w-24 h-24`} />,
    value: 'okay',
    label: 'Okay',
    prompt: 'What part of speaking felt most manageable today?'
  },
  {
    icon: <Image source={Img3} style={tw`w-24 h-24`} />,
    value: 'uncertain',
    label: 'Uncertain',
    prompt: 'What part made you pause or think more?'
  },
  {
    icon: <Image source={Img4} style={tw`w-24 h-24`} />,
    value: 'nervous',
    label: 'Nervous',
    prompt: 'What made speaking feel uncomfortable today?'
  },
  {
    icon: <Image source={Img5} style={tw`w-24 h-24`} />,
    value: 'struggled',
    label: 'Struggled',
    prompt: 'What felt hardest today?'
  },
];

export default function CreateReflectionScreen() {
  // Default to 'comfortable'
  const [selectedFeeling, setSelectedFeeling] = useState<string>('comfortable');
  const [firstAnswer, setFirstAnswer] = useState('');
  const [secondAnswer, setSecondAnswer] = useState('');
  const [saving, setSaving] = useState(false);
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  const firstInputRef = useRef<TextInput>(null);
  const secondInputRef = useRef<TextInput>(null);

  // Get the current prompt based on selected feeling (auto-determined, not user input)
  const selectedOption = FEELING_OPTIONS.find(f => f.value === selectedFeeling);
  const currentPrompt = selectedOption?.prompt || 'What felt easier or more natural today?';

  const handleSave = async () => {
    if (!firstAnswer.trim() && !secondAnswer.trim()) {
      Alert.alert('Required', 'Please provide at least one answer.');
      return;
    }

    try {
      setSaving(true);

      const selectedOption = FEELING_OPTIONS.find(f => f.value === selectedFeeling);

      await reflectionService.createReflection({
        answer: firstAnswer.trim(),      // First input: answer to prompt
        content: secondAnswer.trim(),    // Second input: sentence/few words
        mood: selectedFeeling,
        prompt: selectedOption?.prompt || '', // Auto-determined from mood
      });

      // Navigate back to list
      router.replace('/daily-reflection');
    } catch (error: any) {
      console.error('Error saving reflection:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to save reflection'
      );
    } finally {
      setSaving(false);
    }
  };

  const isFormValid = firstAnswer.trim() || secondAnswer.trim();

  return (
    <SafeAreaView style={tw`flex-1 bg-[#f8f8f8]`} edges={['top']}>
      <KeyboardAvoidingView
        style={tw`flex-1`}
        behavior="padding"
        keyboardVerticalOffset={Platform.OS === "ios" ? -20 : -insets.bottom}
      >
        {/* Header */}
        <View style={tw`px-5 py-4 bg-[#f8f8f8]`}>
          <View style={tw`flex-row items-center`}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={tw`mr-4`}
            >
              <AppText style={tw`text-2xl text-neutral-900`}>←</AppText>
            </TouchableOpacity>
            <AppText style={tw`text-xl font-bold text-neutral-900`}>
              New Daily Reflection entry
            </AppText>
          </View>
          <AppText style={tw`text-sm text-neutral-500 mt-3`}>
            A moment to notice your progress
          </AppText>
        </View>

        <ScrollView
          ref={scrollViewRef}
          style={tw`flex-1`}
          contentContainerStyle={[tw`px-5 pb-6`, { paddingBottom: 100 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          nestedScrollEnabled={true}
        >
          {/* Question */}
          <View style={tw`mt-6 mb-4`}>
            <AppText style={tw`text-xl font-bold text-neutral-900`}>
              How did speaking feel today?
            </AppText>
          </View>

          {/* Feeling Options */}
          <View style={tw`flex-row justify-between mb-6`}>
            {FEELING_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                onPress={() => setSelectedFeeling(option.value)}
                style={tw`items-center justify-center w-[70px] h-[70px] p-[8px] aspect-square rounded-2xl border-[1px] ${selectedFeeling === option.value
                  ? 'border-green-600 bg-green-50'
                  : 'border-slate-200 bg-white'
                  }`}
                activeOpacity={0.7}
              >
                <AppText style={tw`text-3xl mb-1`}>{option.icon}</AppText>
                <AppText
                  style={tw` text-neutral-700 text-center font-medium`}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {option.label}
                </AppText>
              </TouchableOpacity>
            ))}
          </View>

          {/* Prompt Display (Read-only, auto-determined from mood) */}
          {selectedFeeling && (
            <View style={tw`mb-3`}>
              <AppText style={tw`text-base font-semibold text-neutral-900`}>
                {currentPrompt}
              </AppText>
            </View>
          )}

          {/* First Input Field */}
          <View style={tw`mb-4`}>
            <View
              style={tw`bg-white border border-neutral-300 rounded-2xl px-4 py-3 min-h-[56px]`}
            >
              <TextInput
                ref={firstInputRef}
                value={firstAnswer}
                onChangeText={setFirstAnswer}
                placeholder="Type your answer here..."
                placeholderTextColor="#a3a3a3"
                style={[
                  tw`text-base text-neutral-900`,
                  { fontFamily: Fonts.satoshi.regular }
                ]}
                multiline={false}
              />
            </View>
          </View>

          {/* Second Input Field */}
          <View style={tw`mb-4`}>
            <View
              style={tw`bg-white border border-neutral-300 rounded-2xl px-4 pt-4 pb-20 min-h-[200px]`}
            >
              <TextInput
                ref={secondInputRef}
                value={secondAnswer}
                onChangeText={setSecondAnswer}
                placeholder="You can write a sentence... or just a few words."
                placeholderTextColor="#a3a3a3"
                multiline
                textAlignVertical="top"
                style={[
                  tw`text-base text-neutral-900 flex-1`,
                  { fontFamily: Fonts.satoshi.regular }
                ]}
              />
            </View>
          </View>

          {/* Helper Text */}
          <AppText style={tw`text-sm text-neutral-500 mt-2 mb-4`}>
            Reflection helps your coach personalise your learning.
          </AppText>
        </ScrollView>

        {/* Save Button */}
        <View style={[tw`px-5 py-4 bg-[#f8f8f8]`, { paddingBottom: Math.max(insets.bottom, 10) }]}>
          <TouchableOpacity
            onPress={handleSave}
            disabled={!isFormValid || saving}
            style={tw`w-full py-4 rounded-full items-center justify-center ${isFormValid && !saving
              ? 'bg-green-600'
              : 'bg-neutral-300'
              }`}
            activeOpacity={0.8}
          >
            <AppText
              style={tw`text-base font-semibold ${isFormValid && !saving ? 'text-white' : 'text-neutral-400'
                }`}
            >
              {saving ? 'Saving...' : 'Save reflection'}
            </AppText>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}