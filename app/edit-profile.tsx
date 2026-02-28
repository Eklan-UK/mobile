import { AppText, Button, Input, Loader } from "@/components/ui";
import tw from "@/lib/tw";
import { router } from "expo-router";
import { useState, useEffect } from "react";
import { ScrollView, TouchableOpacity, View, Image, ActivityIndicator } from "react-native";
import { Alert } from '@/utils/alert';
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Path } from "react-native-svg";
import { logger } from "@/utils/logger";
import * as ImagePicker from "expo-image-picker";
import { useAuthStore } from "@/store/auth-store";
import { profileService } from "@/services/profile.service";

// Icons
function BackIcon() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M19 12H5M12 19l-7-7 7-7"
        stroke="#171717"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function UserIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={8} r={4} stroke="#737373" strokeWidth={1.5} />
      <Path
        d="M4 20c0-4 4-6 8-6s8 2 8 6"
        stroke="#737373"
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function EmailIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"
        stroke="#737373"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M22 6l-10 7L2 6"
        stroke="#737373"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export default function EditProfileScreen() {
  const { user: authUser, checkSession } = useAuthStore();
  
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Load user data on mount
  useEffect(() => {
    if (authUser) {
      setFirstName(authUser.firstName || "");
      setLastName(authUser.lastName || "");
      setEmail(authUser.email || "");
      setAvatarUri(authUser.avatar || null);
    }
  }, [authUser]);

  const handleBack = () => {
    router.back();
  };

  const handleSave = async () => {
    if (!authUser) {
      Alert.alert("Error", "Please sign in to update your profile");
      return;
    }

    setLoading(true);
    try {
      // Update profile
      await profileService.updateProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
      });

      // Refresh user data
      await checkSession();

      Alert.alert("Success", "Profile updated successfully");
      router.back();
    } catch (error: any) {
      logger.error("Failed to update profile:", error);
      Alert.alert("Error", error.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const handleChangePhoto = async () => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "We need access to your photos to set a profile picture."
        );
        return;
      }

      // Show image picker options
      Alert.alert(
        "Change Profile Photo",
        "Choose an option",
        [
          {
            text: "Camera",
            onPress: async () => {
              const cameraStatus = await ImagePicker.requestCameraPermissionsAsync();
              if (cameraStatus.granted) {
                const result = await ImagePicker.launchCameraAsync({
                  mediaTypes: ImagePicker.MediaTypeOptions.Images,
                  allowsEditing: true,
                  aspect: [1, 1],
                  quality: 0.8,
                });

                if (!result.canceled && result.assets[0]) {
                  await uploadAvatar(result.assets[0].uri);
                }
              } else {
                Alert.alert("Permission Required", "We need camera access to take a photo.");
              }
            },
          },
          {
            text: "Photo Library",
            onPress: async () => {
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
              });

              if (!result.canceled && result.assets[0]) {
                await uploadAvatar(result.assets[0].uri);
              }
            },
          },
          {
            text: "Cancel",
            style: "cancel",
          },
        ],
        { cancelable: true }
      );
    } catch (error: any) {
      logger.error("Error picking image:", error);
      Alert.alert("Error", "Failed to pick image");
    }
  };

  const uploadAvatar = async (imageUri: string) => {
    if (!authUser) {
      Alert.alert("Error", "Please sign in to upload an avatar");
      return;
    }

    setUploadingAvatar(true);
    try {
      const avatarUrl = await profileService.uploadAvatar(imageUri);
      setAvatarUri(avatarUrl);
      
      // Refresh user data to get updated avatar
      await checkSession();
      
      Alert.alert("Success", "Profile picture updated successfully");
    } catch (error: any) {
      logger.error("Failed to upload avatar:", error);
      Alert.alert("Error", error.message || "Failed to upload profile picture");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "Are you sure you want to delete your account? This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            // TODO: Implement account deletion flow
            logger.log("Delete account");
            Alert.alert("Not Implemented", "Account deletion is not yet available");
          },
        },
      ]
    );
  };

  // Show loading state if no user data
  if (!authUser) {
    return (
      <SafeAreaView style={tw`flex-1 bg-cream-100 items-center justify-center`} edges={["top", "bottom"]}>
        <Loader />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={tw`flex-1 bg-cream-100`} edges={["top", "bottom"]}>
      {/* Header */}
      <View style={tw`px-6 pt-4 pb-4 flex-row items-center gap-4`}>
        <TouchableOpacity onPress={handleBack}>
          <BackIcon />
        </TouchableOpacity>
        <AppText style={tw`text-xl font-bold text-neutral-900`}>Edit profile</AppText>
      </View>

      <ScrollView
        style={tw`flex-1`}
        contentContainerStyle={tw`px-6 pb-6`}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Photo */}
        <View style={tw`flex-row items-center gap-4 mb-8`}>
          <View
            style={tw`w-24 h-24 rounded-full bg-neutral-100 items-center justify-center overflow-hidden relative`}
          >
            {uploadingAvatar ? (
              <View style={tw`absolute inset-0 items-center justify-center bg-black/20`}>
                <ActivityIndicator size="small" color="#16a34a" />
              </View>
            ) : null}
            {avatarUri ? (
              <Image
                source={{ uri: avatarUri }}
                style={tw`w-full h-full`}
                resizeMode="cover"
              />
            ) : (
              <AppText style={tw`text-4xl`}>👩‍🎨</AppText>
            )}
          </View>
          <TouchableOpacity
            onPress={handleChangePhoto}
            disabled={uploadingAvatar}
            style={tw`px-4 py-2 rounded-lg border border-neutral-300 bg-white ${
              uploadingAvatar ? "opacity-50" : ""
            }`}
          >
            <AppText style={tw`text-sm text-neutral-700`}>
              {uploadingAvatar ? "Uploading..." : "Change photo"}
            </AppText>
          </TouchableOpacity>
        </View>

        {/* Form */}
        <View style={tw`gap-5`}>
          <Input
            label="First Name"
            placeholder="Enter your first name"
            value={firstName}
            onChangeText={setFirstName}
            autoCapitalize="words"
            icon={<UserIcon />}
          />

          <Input
            label="Last Name"
            placeholder="Enter your last name"
            value={lastName}
            onChangeText={setLastName}
            autoCapitalize="words"
            icon={<UserIcon />}
          />

          <Input
            label="Email"
            placeholder="Enter your email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            icon={<EmailIcon />}
          />
        </View>

        {/* Delete Account */}
        <TouchableOpacity onPress={handleDeleteAccount} style={tw`mt-8`}>
          <AppText style={tw`text-base text-error font-medium`}>
            Delete my account
          </AppText>
        </TouchableOpacity>
      </ScrollView>

      {/* Save Button */}
      <View style={tw`px-6 pb-4`}>
        <Button onPress={handleSave} loading={loading}>
          Save Changes
        </Button>
      </View>
    </SafeAreaView>
  );
}

