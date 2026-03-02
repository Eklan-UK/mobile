import { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { Alert } from '@/utils/alert';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, Button, Loader } from '@/components/ui';
import tw from '@/lib/tw';
import { router, useLocalSearchParams } from 'expo-router';
import { reflectionService, DailyReflection } from '@/services/reflection.service';
import { Fonts } from '@/constants/fonts';
import { logger } from '@/utils/logger';

// Feeling options with corresponding prompts
const FEELING_OPTIONS = [
  {
    emoji: '😌',
    value: 'comfortable',
    label: 'Comfortable',
    prompt: 'What felt easier or more natural today?'
  },
  {
    emoji: '🙂',
    value: 'okay',
    label: 'Okay',
    prompt: 'What part of speaking felt most manageable today?'
  },
  {
    emoji: '😐',
    value: 'uncertain',
    label: 'Uncertain',
    prompt: 'What part made you pause or think more?'
  },
  {
    emoji: '😟',
    value: 'nervous',
    label: 'Nervous',
    prompt: 'What made speaking feel uncomfortable today?'
  },
  {
    emoji: '😣',
    value: 'struggled',
    label: 'Struggled',
    prompt: 'What felt hardest today?'
  },
];

export default function ViewEditReflectionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [reflection, setReflection] = useState<DailyReflection | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  // Edit state
  const [selectedFeeling, setSelectedFeeling] = useState<string>('comfortable');
  const [firstAnswer, setFirstAnswer] = useState('');
  const [secondAnswer, setSecondAnswer] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (id) {
      loadReflection();
    }
  }, [id]);

  const loadReflection = async () => {
    try {
      setLoading(true);
      const data = await reflectionService.getReflectionById(id!);
      setReflection(data);

      // Use answer and content directly
      setFirstAnswer(data.answer || '');
      setSecondAnswer(data.content || '');

      setSelectedFeeling(data.mood);
    } catch (error: any) {
      logger.error('Error loading reflection:', error);
      Alert.alert('Error', error.message || 'Failed to load reflection');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!firstAnswer.trim() && !secondAnswer.trim()) {
      Alert.alert('Required', 'Please provide at least one answer.');
      return;
    }

    try {
      setSaving(true);

      const selectedOption = FEELING_OPTIONS.find(f => f.value === selectedFeeling);

      await reflectionService.updateReflection(id!, {
        answer: firstAnswer.trim(),      // First input: answer to prompt
        content: secondAnswer.trim(),     // Second input: sentence/few words
        mood: selectedFeeling,
        prompt: selectedOption?.prompt || '',
      });

      Alert.alert('Success', 'Reflection updated successfully', [
        {
          text: 'OK',
          onPress: () => {
            setEditing(false);
            loadReflection();
          },
        },
      ]);
    } catch (error: any) {
      logger.error('Error saving reflection:', error);
      Alert.alert('Error', error.message || 'Failed to update reflection');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Reflection',
      'Are you sure you want to delete this reflection?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await reflectionService.deleteReflection(id!);
              Alert.alert('Success', 'Reflection deleted successfully', [
                {
                  text: 'OK',
                  onPress: () => router.back(),
                },
              ]);
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete reflection');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={tw`flex-1 bg-[#f8f8f8] items-center justify-center`}>
        <Loader />
      </SafeAreaView>
    );
  }

  if (!reflection) {
    return (
      <SafeAreaView style={tw`flex-1 bg-[#f8f8f8] items-center justify-center`}>
        <AppText>Reflection not found</AppText>
      </SafeAreaView>
    );
  }

  const selectedOption = FEELING_OPTIONS.find(f => f.value === (editing ? selectedFeeling : reflection.mood));
  const currentPrompt = selectedOption?.prompt || '';

  return (
    <SafeAreaView style={tw`flex-1 bg-[#f8f8f8]`} edges={['top']}>
      <KeyboardAvoidingView
        style={tw`flex-1`}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? insets.top : 0}
      >
        {/* Header */}
        <View style={tw`px-5 py-4 bg-[#f8f8f8]`}>
        <View style={tw`flex-row items-center justify-between`}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={tw`mr-4`}
          >
            <AppText style={tw`text-2xl text-neutral-900`}>←</AppText>
          </TouchableOpacity>
          <AppText style={tw`text-xl font-bold text-neutral-900`}>
            {editing ? 'Edit Reflection' : 'View Reflection'}
          </AppText>
          {!editing && (
            <View style={tw`flex-row gap-3`}>
              <TouchableOpacity onPress={() => setEditing(true)}>
                <AppText style={tw`text-base text-blue-600 font-medium`}>Edit</AppText>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDelete}>
                <AppText style={tw`text-base text-red-600 font-medium`}>Delete</AppText>
              </TouchableOpacity>
            </View>
          )}
          {editing && (
            <TouchableOpacity onPress={() => {
              setEditing(false);
              loadReflection(); // Reset to original values
            }}>
              <AppText style={tw`text-base text-neutral-600 font-medium`}>Cancel</AppText>
            </TouchableOpacity>
          )}
        </View>
      </View>

        <ScrollView
          style={tw`flex-1`}
          contentContainerStyle={tw`px-5 pb-6`}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
        {/* Question */}
        <View style={tw`mt-6 mb-4`}>
          <AppText style={tw`text-xl font-bold text-neutral-900`}>
            How did speaking feel today?
          </AppText>
        </View>

        {/* Feeling Options */}
        <View style={tw`flex-row justify-between mb-6`}>
          {FEELING_OPTIONS.map((option) => {
            const isSelected = (editing ? selectedFeeling : reflection.mood) === option.value;
            return (
              <TouchableOpacity
                key={option.value}
                onPress={() => editing && setSelectedFeeling(option.value)}
                disabled={!editing}
                style={tw`items-center justify-center w-[18%] aspect-square rounded-2xl border-2 ${isSelected
                    ? 'border-green-600 bg-green-50'
                    : 'border-neutral-300 bg-white'
                  } ${!editing ? 'opacity-60' : ''}`}
                activeOpacity={0.7}
              >
                <AppText style={tw`text-3xl mb-1`}>{option.emoji}</AppText>
                <AppText
                  style={tw`text-[10px] text-neutral-700 text-center font-medium px-1`}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {option.label}
                </AppText>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Prompt Display (Read-only) */}
        <View style={tw`mb-3`}>
          <AppText style={tw`text-base font-semibold text-neutral-900`}>
            {currentPrompt}
          </AppText>
        </View>

        {/* First Input Field */}
        <View style={tw`mb-4`}>
          <View
            style={tw`bg-white border border-neutral-300 rounded-2xl px-4 py-3 min-h-[56px]`}
          >
            {editing ? (
              <TextInput
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
            ) : (
              <AppText style={tw`text-base text-neutral-900`}>
                {firstAnswer || 'No answer provided'}
              </AppText>
            )}
          </View>
        </View>

        {/* Second Input Field */}
        <View style={tw`mb-4`}>
          <View
            style={tw`bg-white border border-neutral-300 rounded-2xl px-4 pt-4 pb-20 min-h-[200px]`}
          >
            {editing ? (
              <TextInput
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
            ) : (
              <AppText style={tw`text-base text-neutral-900`}>
                {secondAnswer || 'No additional thoughts'}
              </AppText>
            )}
          </View>
        </View>

        {/* Date Info */}
        <View style={tw`mb-4`}>
          <AppText style={tw`text-sm text-neutral-500`}>
            Created: {new Date(reflection.createdAt).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </AppText>
          {reflection.updatedAt !== reflection.createdAt && (
            <AppText style={tw`text-sm text-neutral-500 mt-1`}>
              Updated: {new Date(reflection.updatedAt).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </AppText>
          )}
        </View>
        </ScrollView>

        {/* Save Button (only when editing) */}
        {editing && (
          <View style={[tw`px-5 py-4 bg-[#f8f8f8]`, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving || (!firstAnswer.trim() && !secondAnswer.trim())}
            style={tw`w-full py-4 rounded-full items-center justify-center ${(firstAnswer.trim() || secondAnswer.trim()) && !saving
                ? 'bg-green-600'
                : 'bg-neutral-300'
              }`}
            activeOpacity={0.8}
          >
            <AppText
              style={tw`text-base font-semibold ${(firstAnswer.trim() || secondAnswer.trim()) && !saving ? 'text-white' : 'text-neutral-400'
                }`}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </AppText>
          </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

