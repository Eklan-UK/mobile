import AITutorMessage from "@/components/drills/AITutorMessage";
import DrillCompletedScreen from "@/components/drills/DrillCompletedScreen";
import DrillHeader from "@/components/drills/DrillHeader";
import RecordButton from "@/components/drills/RecordButton";
import AudioButton from "@/components/drills/AudioButton";
import { AppText, Loader } from "@/components/ui";
import { getDrillById, completeDrill } from "@/services/drill.service";
import { Drill } from "@/types/drill.types";
import tw from "@/lib/tw";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, router } from "expo-router";
import { useEffect, useState, useRef } from "react";
import { ScrollView, TouchableOpacity, View, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useActivityStore } from "@/store/activity-store";
import { useTTS } from "@/hooks/useTTS";
import { logger } from "@/utils/logger";

export default function ListeningDrill() {
  const params = useLocalSearchParams();
  const drillId = params.id as string;
  const assignmentId = params.assignmentId as string | undefined;

  const { drillProgress, updateDrillProgress, addRecentActivity, clearDrillProgress } = useActivityStore();
  const startTimeRef = useRef(Date.now());

  const [drill, setDrill] = useState<Drill | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [isRecording, setIsRecording] = useState(false);
  const [hasListened, setHasListened] = useState(false);
  const [isDrillCompleted, setIsDrillCompleted] = useState(false);

  const { playAudio, isGenerating: isGeneratingAudio, isPlaying: isTTSPlaying, stopAudio: stopTTSAudio } = useTTS({
    autoPlay: false,
    onPlayStart: () => {
      setIsPlaying(true);
      setHasListened(true);
    },
    onPlayEnd: () => {
      setIsPlaying(false);
    },
  });

  useEffect(() => {
    loadDrill();
  }, [drillId]);

  const loadDrill = async () => {
    try {
      setLoading(true);
      const drillData = await getDrillById(drillId, assignmentId);
      setDrill(drillData);
    } catch (error) {
      logger.error('❌ Failed to load drill:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayPause = async () => {
    if (isPlaying) {
      stopTTSAudio();
      setIsPlaying(false);
    } else {
      const content = drill?.listening_drill_content || drill?.title || "";
      if (content) {
        await playAudio(content);
      }
    }
  };

  const handleSpeedChange = () => {
    const speeds = [0.5, 0.75, 1.0, 1.25, 1.5];
    const currentIndex = speeds.indexOf(playbackSpeed);
    const nextIndex = (currentIndex + 1) % speeds.length;
    setPlaybackSpeed(speeds[nextIndex]);
    // Note: Speed change would need to be implemented in audio player
  };

  const handleRecord = () => {
    if (isRecording) {
      setIsRecording(false);
      // Complete drill
      if (drill) {
        const durationSeconds = (Date.now() - startTimeRef.current) / 1000;
        addRecentActivity({
          id: drill._id,
          title: drill.title,
          type: drill.type,
          durationSeconds,
          score: 100,
        });
        clearDrillProgress(drillId);
        
        // Submit completion
        completeDrill(drillId, {
          drillAssignmentId: assignmentId,
          score: 100,
          timeSpent: durationSeconds,
          answers: [],
        }).catch(err => logger.warn('Failed to submit completion', err));

        setIsDrillCompleted(true);
      }
    } else {
      setIsRecording(true);
    }
  };

  // ── Completion Screen ──
  if (isDrillCompleted && drill) {
    return (
      <DrillCompletedScreen
        variant="progress"
        completed={1}
        total={1}
        title="Lesson completed"
        message="Great job! You practiced shadowing and improved your listening skills."
        onContinue={() => router.back()}
        onClose={() => router.back()}
      />
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={tw`flex-1 bg-white items-center justify-center`}>
        <Loader />
      </SafeAreaView>
    );
  }

  if (!drill) {
    return (
      <SafeAreaView style={tw`flex-1 bg-white items-center justify-center`}>
        <AppText>Drill not found</AppText>
      </SafeAreaView>
    );
  }

  const contentTitle = drill.listening_drill_title || drill.title;
  const content = drill.listening_drill_content || "";
  const audioUrl = drill.listening_drill_audio_url || "";

  return (
    <SafeAreaView style={tw`flex-1 bg-white`} edges={["top", "bottom"]}>
      <DrillHeader
        title={contentTitle}
        currentStep={1}
        totalSteps={1}
      />

      <ScrollView
        style={tw`flex-1 px-5`}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={tw`pb-6`}
      >
        <AITutorMessage
          message="Listen to the passage and practice shadowing (repeating along with the audio)."
          showAudio={false}
        />

        {/* Passage Card */}
        <View style={tw`bg-white border border-gray-200 rounded-2xl p-5 mb-6`}>
          {contentTitle && (
            <AppText style={tw`text-base font-semibold text-gray-900 mb-3`}>
              {contentTitle}
            </AppText>
          )}
          <AppText style={tw`text-sm text-gray-700 leading-6`}>
            {content}
          </AppText>

          {/* Audio Controls */}
          <View style={tw`mt-4 flex-row items-center justify-between`}>
            <TouchableOpacity
              onPress={handlePlayPause}
              disabled={isGeneratingAudio}
              style={tw`w-12 h-12 bg-green-700 rounded-full items-center justify-center`}
            >
              {isGeneratingAudio ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Ionicons
                  name={isPlaying ? "pause" : "play"}
                  size={24}
                  color="white"
                />
              )}
            </TouchableOpacity>

            {/* Audio Button Alternative */}
            <View style={tw`flex-1 mx-4 items-center`}>
              <AudioButton 
                text={content} 
                audioUri={audioUrl}
                size={20}
              />
            </View>

            {/* Speed Control */}
            <TouchableOpacity
              onPress={handleSpeedChange}
              style={tw`px-3 py-1.5 bg-gray-100 rounded-full`}
            >
              <AppText style={tw`text-xs font-semibold text-gray-700`}>
                {playbackSpeed}x
              </AppText>
            </TouchableOpacity>
          </View>
        </View>

        <AITutorMessage
          message="Now record yourself reading the passage. Try to match the rhythm and intonation."
          showAudio={false}
        />
      </ScrollView>

      <View style={tw`px-5 pb-6 items-center`}>
        <RecordButton onPress={handleRecord} isRecording={isRecording} />
      </View>
    </SafeAreaView>
  );
}
