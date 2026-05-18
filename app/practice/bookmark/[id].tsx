import AudioButton from "@/components/drills/AudioButton";
import DrillLineReviewAccordion from "@/components/drills/DrillLineReviewAccordion";
import RecordButton from "@/components/drills/RecordButton";
import { AppText, BoldText } from "@/components/ui";
import { useNotificationToast } from "@/contexts/NotificationToastContext";
import { brandColors } from "@/constants/theme-tokens";
import { useSemanticTheme } from "@/hooks/useSemanticTheme";
import tw from "@/lib/tw";
import { getBookmarkById } from "@/services/bookmark.service";
import {
  extractQualityScore,
  extractTextScore,
  speechaceService,
  type TextScore,
} from "@/services/speechace.service";
import type { LearnerBookmark } from "@/types/bookmark.types";
import { setAudioModeSafely } from "@/utils/audio";
import { logger } from "@/utils/logger";
import { Alert } from "@/utils/alert";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system/legacy";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

const PASS_THRESHOLD = 65;

export default function BookmarkPracticeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors: c, isDark } = useSemanticTheme();
  const { showToast } = useNotificationToast();

  const [bookmark, setBookmark] = useState<LearnerBookmark | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [isRecording, setIsRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [permissionResponse, requestPermission] = Audio.usePermissions();

  const [attempts, setAttempts] = useState(0);
  const [resultText, setResultText] = useState<string | null>(null);
  const [resultScore, setResultScore] = useState(0);
  const [textScore, setTextScore] = useState<TextScore | null>(null);

  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    let rec = recording;
    return () => {
      if (rec) {
        rec.stopAndUnloadAsync().catch(() => {});
      }
    };
  }, [recording]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const b = await getBookmarkById(String(id));
        if (!cancelled && mounted.current) setBookmark(b);
      } catch (e) {
        logger.error("bookmark practice load", e);
        if (!cancelled && mounted.current) setLoadError("Could not load this bookmark.");
      } finally {
        if (!cancelled && mounted.current) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function startRecording() {
    try {
      if (permissionResponse?.status !== "granted") {
        await requestPermission();
      }
      await setAudioModeSafely({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const { recording: rec } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(rec);
      setIsRecording(true);
    } catch (err) {
      logger.error("bookmark practice: start record", err);
      Alert.alert("Error", "Failed to start recording. Check microphone permissions.");
    }
  }

  async function stopRecording() {
    if (!recording) {
      setIsRecording(false);
      setProcessing(false);
      return;
    }
    const toStop = recording;
    setRecording(null);
    setIsRecording(false);
    setProcessing(true);

    try {
      if (typeof toStop.stopAndUnloadAsync === "function") {
        await toStop.stopAndUnloadAsync();
        const uri = toStop.getURI();
        if (uri) {
          const base64 = await FileSystem.readAsStringAsync(uri, {
            encoding: (FileSystem as any).EncodingType?.Base64 || "base64",
          });
          await analyzeRecording(base64);
        }
      }
    } catch (error: any) {
      logger.error("bookmark practice: stop record", error);
      if (!error?.message?.includes("Recorder does not exist")) {
        Alert.alert("Error", "Failed to process audio. Please try again.");
      }
    } finally {
      setProcessing(false);
    }
  }

  async function analyzeRecording(base64: string) {
    if (!bookmark?.content) return;
    const referenceText = bookmark.content;
    try {
      const ace = await speechaceService.scorePronunciation(referenceText, base64);
      if (ace.status === "error" && ace.short_message === "error_no_speech") {
        Alert.alert(
          "No Speech Detected",
          "We couldn't detect any speech. Please try again and speak clearly."
        );
        return;
      }
      const ts = extractTextScore(ace);
      const quality = extractQualityScore(ace);
      setResultText(referenceText);
      setResultScore(quality);
      setTextScore(ts);
      setAttempts((a) => a + 1);

      if (quality >= 80) {
        showToast({
          title: "Nice work!",
          body: "Excellent pronunciation! 🎉",
          variant: "dark",
        });
      } else if (quality >= 60) {
        showToast({
          title: "Good progress",
          body: "Good job! Keep practicing.",
          variant: "dark",
        });
      } else {
        showToast({
          title: "Keep going",
          body: "Try again to improve your score.",
          variant: "dark",
        });
      }
    } catch (e) {
      logger.error("bookmark practice: speechace", e);
      Alert.alert("Error", "Failed to analyze pronunciation. Please try again.");
    }
  }

  const handleRecord = () => {
    if (isRecording) {
      void stopRecording();
    } else {
      void startRecording();
    }
  };

  const step: "word" | "sentence" =
    bookmark?.type === "sentence" ? "sentence" : "word";

  const pageTint = isDark ? c.background : "#f0fdf4";

  if (loading) {
    return (
      <SafeAreaView style={[tw`flex-1 items-center justify-center`, { backgroundColor: pageTint }]}>
        <ActivityIndicator size="large" color={brandColors.primary} />
        <AppText style={[tw`mt-3`, { color: c.textSecondary }]}>Loading…</AppText>
      </SafeAreaView>
    );
  }

  if (loadError || !bookmark) {
    return (
      <SafeAreaView style={[tw`flex-1 px-6`, { backgroundColor: pageTint }]} edges={["top"]}>
        <TouchableOpacity onPress={() => router.back()} style={tw`pt-4 mb-6`} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={c.textPrimary} />
        </TouchableOpacity>
        <AppText style={{ color: c.textSecondary }}>{loadError ?? "Bookmark not found."}</AppText>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[tw`flex-1`, { backgroundColor: pageTint }]} edges={["top"]}>
      <KeyboardAvoidingView
        style={tw`flex-1`}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View
          style={[
            tw`px-5 pt-3 pb-3 flex-row items-center border-b`,
            { backgroundColor: c.card, borderBottomColor: c.border },
          ]}
        >
          <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="chevron-back" size={26} color={c.textPrimary} />
          </TouchableOpacity>
          <BoldText style={[tw`text-lg ml-2 flex-1`, { color: c.textPrimary }]} numberOfLines={1}>
            Practice Bookmark
          </BoldText>
        </View>

        <ScrollView
          style={tw`flex-1`}
          contentContainerStyle={tw`px-5 pb-10 pt-6`}
          keyboardShouldPersistTaps="handled"
        >
          <View
            style={[
              tw`rounded-2xl border p-6 mb-6`,
              { backgroundColor: c.card, borderColor: c.border },
            ]}
          >
            <View style={tw`items-center mb-4`}>
              <View
                style={[
                  tw`w-16 h-16 rounded-full items-center justify-center mb-3`,
                  { backgroundColor: isDark ? "rgba(59, 136, 62, 0.25)" : "rgba(34, 197, 94, 0.15)" },
                ]}
              >
                <Ionicons name="bookmark" size={32} color={brandColors.primaryDark} />
              </View>
              <BoldText
                style={[tw`text-3xl font-bold text-center mb-2`, { color: c.textPrimary }]}
              >
                {bookmark.content}
              </BoldText>
              {bookmark.translation ? (
                <AppText style={[tw`text-center text-base mb-4`, { color: c.textSecondary }]}>
                  {bookmark.translation}
                </AppText>
              ) : null}
              <AudioButton text={bookmark.content} size={28} />
            </View>

            {bookmark.context ? (
              <View
                style={[
                  tw`mt-2 pt-4 border-t flex-row gap-2`,
                  { borderTopColor: c.border, backgroundColor: isDark ? c.muted : "#f9fafb" },
                ]}
              >
                <Ionicons name="information-circle-outline" size={22} color={c.textSecondary} />
                <AppText style={[tw`flex-1 text-sm leading-5`, { color: c.textSecondary }]}>
                  {bookmark.context}
                </AppText>
              </View>
            ) : null}
          </View>

          <View style={tw`items-center mb-2`}>
            <RecordButton
              onPress={handleRecord}
              isRecording={isRecording}
              isListening={processing}
            />
            {isRecording ? (
              <AppText style={[tw`text-sm font-semibold mt-3`, { color: "#dc2626" }]}>
                Recording…
              </AppText>
            ) : null}
            {processing ? (
              <AppText style={[tw`text-sm mt-3`, { color: c.textSecondary }]}>
                Analyzing…
              </AppText>
            ) : null}
          </View>

          {resultText != null && !processing && (
            <DrillLineReviewAccordion
              key={`bm-${attempts}`}
              step={step}
              text={resultText}
              score={resultScore}
              textScore={textScore}
              passThreshold={PASS_THRESHOLD}
              attempts={attempts}
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
