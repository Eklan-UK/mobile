import { AppText, Button, Input, Loader } from "@/components/ui";
import tw from "@/lib/tw";
import { router } from "expo-router";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { ScrollView, TouchableOpacity, View, Image, ActivityIndicator } from "react-native";
import { Alert } from '@/utils/alert';
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Path } from "react-native-svg";
import { logger } from "@/utils/logger";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "@/store/auth-store";
import { profileService } from "@/services/profile.service";
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetView } from "@gorhom/bottom-sheet";

// Icons
function BackIcon() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M19 12H5M12 19l-7-7 7-7"
        stroke={tw.prefixMatch('dark') ? "#F9FAFB" : "#171717"}
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
      <Circle cx={12} cy={8} r={4} stroke={tw.prefixMatch('dark') ? "#A3A3A3" : "#737373"} strokeWidth={1.5} />
      <Path
        d="M4 20c0-4 4-6 8-6s8 2 8 6"
        stroke={tw.prefixMatch('dark') ? "#A3A3A3" : "#737373"}
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
        stroke={tw.prefixMatch('dark') ? "#A3A3A3" : "#737373"}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M22 6l-10 7L2 6"
        stroke={tw.prefixMatch('dark') ? "#A3A3A3" : "#737373"}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export default function EditProfileScreen() {
  const { user: authUser, checkSession } = useAuthStore();
  
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const bottomSheetModalRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ["35%"], []);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.5} />
    ),
    []
  );

  // Load user data on mount
  useEffect(() => {
    if (authUser) {
      const fullName = [authUser.firstName, authUser.lastName].filter(Boolean).join(" ");
      setName(fullName || "");
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
      // Split name intelligently
      const nameParts = name.trim().split(" ");
      const newFirstName = nameParts[0] || "";
      const newLastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";

      // Update profile
      await profileService.updateProfile({
        firstName: newFirstName,
        lastName: newLastName,
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

  const handleChangePhoto = () => {
    bottomSheetModalRef.current?.present();
  };

  const handleTakePhoto = async () => {
    bottomSheetModalRef.current?.dismiss();
    try {
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
    } catch (error: any) {
      logger.error("Error picking camera image:", error);
    }
  };

  const handleChooseFromLibrary = async () => {
    bottomSheetModalRef.current?.dismiss();
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "We need access to your photos to set a profile picture."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadAvatar(result.assets[0].uri);
      }
    } catch (error: any) {
      logger.error("Error picking library image:", error);
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

  if (!authUser) {
    return (
      <SafeAreaView style={tw`flex-1 bg-cream-100 dark:bg-neutral-900 items-center justify-center`} edges={["top", "bottom"]}>
        <Loader />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={tw`flex-1 bg-white dark:bg-neutral-900`} edges={["top", "bottom"]}>
      {/* Header */}
      <View style={tw`px-6 pt-4 pb-4 flex-row items-center gap-4`}>
        <TouchableOpacity onPress={handleBack} style={tw`w-10 h-10 rounded-full border border-neutral-200 dark:border-neutral-700 items-center justify-center`}>
          <BackIcon />
        </TouchableOpacity>
        <AppText style={tw`text-xl font-bold text-neutral-900 dark:text-white`}>Edit profile</AppText>
      </View>

      <ScrollView
        style={tw`flex-1`}
        contentContainerStyle={tw`px-6 pb-6 pt-2`}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Photo */}
        <View style={tw`flex-row items-center gap-4 mb-8`}>
          <View
            style={tw`w-20 h-20 rounded-full border-2 border-[#C1F0C0] dark:border-primary-500 items-center justify-center overflow-hidden relative`}
          >
            {uploadingAvatar ? (
              <View style={tw`absolute inset-0 items-center justify-center bg-black/20 z-10`}>
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
              <View style={tw`bg-neutral-100 dark:bg-neutral-800 w-full h-full items-center justify-center`}>
                <AppText style={tw`text-3xl`}>👩‍🎨</AppText>
              </View>
            )}
          </View>
          <TouchableOpacity
            onPress={handleChangePhoto}
            disabled={uploadingAvatar}
            style={tw`px-5 py-2.5 rounded-full border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 ${
              uploadingAvatar ? "opacity-50" : ""
            }`}
          >
            <AppText style={tw`text-sm text-neutral-600 dark:text-neutral-400`}>
              {uploadingAvatar ? "Uploading..." : "Change photo"}
            </AppText>
          </TouchableOpacity>
        </View>

        {/* Form */}
        <View style={tw`gap-5`}>
          <Input
            label="Name"
            placeholder="Enter your name"
            value={name}
            onChangeText={setName}
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

      <BottomSheetModal
        ref={bottomSheetModalRef}
        index={0}
        snapPoints={snapPoints}
        backdropComponent={renderBackdrop}
        handleIndicatorStyle={tw`bg-neutral-300 dark:bg-neutral-600 w-12`}
        backgroundStyle={tw`bg-white dark:bg-neutral-900 rounded-t-3xl`}
      >
        <BottomSheetView style={tw`flex-1 p-6 pb-8`}>
          <View style={tw`flex-row items-center justify-between mb-6`}>
            <AppText style={tw`text-[20px] font-bold text-neutral-900 dark:text-white`}>
              Change Profile Photo
            </AppText>
            <TouchableOpacity onPress={() => bottomSheetModalRef.current?.dismiss()} style={tw`p-2 -mr-2`}>
              <Ionicons name="close" size={24} color={tw.prefixMatch('dark') ? "#f5f5f5" : "#171717"} />
            </TouchableOpacity>
          </View>
          
          <View style={tw`flex-row gap-4`}>
            <TouchableOpacity 
              style={tw`flex-1 items-center justify-center py-8`}
              onPress={handleTakePhoto}
              activeOpacity={0.7}
            >
              <View style={tw`w-16 h-16 items-center justify-center mb-1`}>
                <Ionicons name="camera-outline" size={48} color="#9CA3AF" />
              </View>
              <AppText style={tw`text-sm text-gray-700 dark:text-gray-300 text-center`}>Camera</AppText>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={tw`flex-1 items-center justify-center py-8`}
              onPress={handleChooseFromLibrary}
              activeOpacity={0.7}
            >
              <View style={tw`w-16 h-16 items-center justify-center mb-1`}>
                <Ionicons name="image-outline" size={48} color="#9CA3AF" />
              </View>
              <AppText style={tw`text-sm text-gray-700 dark:text-gray-300 text-center`}>Gallery</AppText>
            </TouchableOpacity>
          </View>
        </BottomSheetView>
      </BottomSheetModal>
    </SafeAreaView>
  );
}

