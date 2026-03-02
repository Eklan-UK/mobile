import { useRef, forwardRef, useImperativeHandle, useEffect, useState } from 'react';
import { View, TouchableOpacity, BackHandler } from 'react-native';
import { Alert } from '@/utils/alert';
import {
    BottomSheetModal,
    BottomSheetBackdrop,
    BottomSheetView,
    BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Button } from '@/components/ui';
import tw from '@/lib/tw';
import { router } from 'expo-router';
import { useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { logger } from '@/utils/logger';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FutureSelfBottomSheetRef {
    present: () => void;
}

interface FutureSelfBottomSheetProps {
    onSelectVideo?: (uri: string) => void;
    onRecordVideo?: () => void;
}

// ─── Shared header ────────────────────────────────────────────────────────────

const BottomSheetHeader = ({
    title,
    onClose,
}: {
    title: string;
    onClose: () => void;
}) => (
    <View style={tw`flex-row items-center justify-between`}>
        <AppText style={tw`text-xl font-bold text-gray-900`}>{title}</AppText>
        <TouchableOpacity onPress={onClose} style={tw`p-2`} activeOpacity={0.7}>
            <Ionicons name="close" size={28} color="#000" />
        </TouchableOpacity>
    </View>
);

// ─── Component ────────────────────────────────────────────────────────────────

export const FutureSelfBottomSheet = forwardRef<
    FutureSelfBottomSheetRef,
    FutureSelfBottomSheetProps
>(({ onSelectVideo, onRecordVideo }, ref) => {
    const instructionSheetRef = useRef<BottomSheetModal>(null);
    const optionsSheetRef = useRef<BottomSheetModal>(null);

    const [permission, requestPermission] = useCameraPermissions();
    const [isInstructionOpen, setIsInstructionOpen] = useState(false);
    const [isOptionsOpen, setIsOptionsOpen] = useState(false);

    // ── Expose present() ──────────────────────────────────────────────────────

    useImperativeHandle(ref, () => ({
        present: () => instructionSheetRef.current?.present(),
    }));

    // ── Android back button ───────────────────────────────────────────────────

    useEffect(() => {
        const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
            if (isOptionsOpen) {
                optionsSheetRef.current?.dismiss();
                return true;
            }
            if (isInstructionOpen) {
                instructionSheetRef.current?.dismiss();
                return true;
            }
            return false;
        });
        return () => backHandler.remove();
    }, [isInstructionOpen, isOptionsOpen]);

    // ── Step transitions ──────────────────────────────────────────────────────

    /** Instruction → Options */
    const handleInstructionOkay = () => {
        instructionSheetRef.current?.dismiss();
        setTimeout(() => optionsSheetRef.current?.present(), 300);
    };

    // ── Gallery picker ────────────────────────────────────────────────────────

    const handleSelectVideo = async () => {
        try {
            optionsSheetRef.current?.dismiss();

            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert(
                    'Permission Required',
                    'Please grant access to your media library to select videos.',
                );
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Videos,
                allowsEditing: true,
                quality: 1,
                videoMaxDuration: 300,
            });

            if (!result.canceled && result.assets?.[0]) {
                const uri = result.assets[0].uri;

                if (onSelectVideo) {
                    // Parent handles the rest of the flow
                    onSelectVideo(uri);
                } else {
                    // Hand off to the existing future-self screen in preview mode.
                    // PreviewSheet → UploadProgressSheet flow runs entirely there.
                    router.push({
                        pathname: '/future-self',
                        params: { mode: 'preview', uri },
                    });
                }
            }
        } catch (error: any) {
            logger.error('Error selecting video:', error);
            Alert.alert('Error', 'Failed to select video');
        }
    };

    // ── Camera ────────────────────────────────────────────────────────────────

    const handleRecordVideo = async () => {
        optionsSheetRef.current?.dismiss();

        // Ensure camera permission before navigating
        if (!permission?.granted) {
            const { granted } = await requestPermission();
            if (!granted) {
                Alert.alert(
                    'Permission Required',
                    'Camera access is needed to record a video.',
                );
                return;
            }
        }

        if (onRecordVideo) {
            // Parent handles the rest of the flow
            onRecordVideo();
        } else {
            // Hand off to the existing future-self screen in camera mode.
            // CameraSheet → PreviewSheet → UploadProgressSheet flow runs entirely there.
            router.push({
                pathname: '/future-self',
                params: { mode: 'camera' },
            });
        }
    };

    // ── Render ────────────────────────────────────────────────────────────────

    const backdrop = (props: any) => (
        <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
    );

    return (
        <>
            {/* ── Sheet 1: Instructions ──────────────────────────────────── */}
            <BottomSheetModal
                ref={instructionSheetRef}
                index={0}
                snapPoints={['75%']}
                enablePanDownToClose
                enableDynamicSizing={false}
                onChange={(index) => setIsInstructionOpen(index >= 0)}
                backdropComponent={backdrop}
            >
                <BottomSheetScrollView
                    style={tw`flex-1`}
                    contentContainerStyle={tw`px-6 pb-10`}
                    showsVerticalScrollIndicator={false}
                >
                    <BottomSheetHeader
                        title="Message to your future self"
                        onClose={() => instructionSheetRef.current?.dismiss()}
                    />

                    {/* Description */}
                    <AppText style={tw`text-base text-gray-700 leading-6 mb-6`}>
                        Record a short video introducing yourself to your future self. This helps us
                        tailor your practice to you and gives you a way to see your progress over time.
                    </AppText>

                    {/* What to say */}
                    <AppText style={tw`text-lg font-bold text-gray-900 mb-4`}>What to say:</AppText>

                    <View style={tw`gap-2 mb-6`}>
                        {[
                            'Start with your name',
                            'Say this is your first day learning with Eklan AI',
                            'Share why improving your English matters to you',
                            'Use the script provided if you prefer',
                        ].map((item) => (
                            <View key={item} style={tw`flex-row items-start`}>
                                <AppText style={tw`text-base text-gray-700 mr-2`}>•</AppText>
                                <AppText style={tw`flex-1 text-base text-gray-700 leading-6`}>
                                    {item}
                                </AppText>
                            </View>
                        ))}
                    </View>

                    {/* Tip */}
                    <View style={[tw`rounded-xl p-4 mb-8`, { backgroundColor: '#E8F5E9' }]}>
                        <AppText style={[tw`text-sm leading-5`, { color: '#2E7D32' }]}>
                            <AppText style={tw`font-bold`}>Tip:</AppText> Don't worry about mistakes,
                            this is for your growth, not perfection.
                        </AppText>
                    </View>

                    <Button
                        variant="primary"
                        size="lg"
                        style={tw`mb-6`}
                        fullWidth
                        onPress={handleInstructionOkay}
                    >
                        Okay
                    </Button>
                </BottomSheetScrollView>
            </BottomSheetModal>

            {/* ── Sheet 2: Record or Gallery options ────────────────────── */}
            <BottomSheetModal
                ref={optionsSheetRef}
                index={0}
                snapPoints={['35%']}
                enablePanDownToClose
                enableDynamicSizing={false}
                onChange={(index) => setIsOptionsOpen(index >= 0)}
                backdropComponent={backdrop}
            >
                <BottomSheetView style={tw`flex-1 px-6 pb-6`}>
                    <BottomSheetHeader
                        title="Video update"
                        onClose={() => optionsSheetRef.current?.dismiss()}
                    />

                    <View style={tw`flex-row gap-4`}>
                        {/* Record → /future-self?mode=camera → CameraSheet → PreviewSheet → UploadProgressSheet */}
                        <TouchableOpacity
                            onPress={handleRecordVideo}
                            style={tw`flex-1 items-center justify-center py-8`}
                            activeOpacity={0.7}
                        >
                            <View style={tw`w-16 h-16 items-center justify-center mb-1`}>
                                <Ionicons name="camera-outline" size={48} color="#9CA3AF" />
                            </View>
                            <AppText style={tw`text-sm text-gray-700 text-center`}>
                                Record a video
                            </AppText>
                        </TouchableOpacity>

                        {/* Gallery → /future-self?mode=preview&uri=... → PreviewSheet → UploadProgressSheet */}
                        <TouchableOpacity
                            onPress={handleSelectVideo}
                            style={tw`flex-1 items-center justify-center py-8`}
                            activeOpacity={0.7}
                        >
                            <View style={tw`w-16 h-16 items-center justify-center mb-1`}>
                                <Ionicons name="image-outline" size={48} color="#9CA3AF" />
                            </View>
                            <AppText style={tw`text-sm text-gray-700 text-center`}>
                                Choose from gallery
                            </AppText>
                        </TouchableOpacity>
                    </View>
                </BottomSheetView>
            </BottomSheetModal>
        </>
    );
});

FutureSelfBottomSheet.displayName = 'FutureSelfBottomSheet';