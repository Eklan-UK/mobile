import { AppText, BoldText } from "@/components/ui";
import tw from "@/lib/tw";
import { getAssignmentAttempts } from "@/services/drill.service";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { router, useLocalSearchParams } from "expo-router";
import { ScrollView, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet } from "react-native";
import { getDrillCategory, type KeyPhrasesResult } from "@/types/drill.types";
import { resolveDrillPracticeType } from "@/utils/drillPracticeType";

export default function DrillResultsScreen() {
  const { drillId, assignmentId } = useLocalSearchParams<{
    drillId: string;
    assignmentId: string;
  }>();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["assignment-attempts", assignmentId],
    queryFn: () => getAssignmentAttempts(assignmentId!),
    enabled: !!assignmentId,
  });

  const assignment = data?.assignment;
  const latest = data?.latestAttempt;
  const drill = assignment?.drill ?? assignment;
  const drillTitle = drill?.title ?? "Drill";
  const drillType = drill?.type ?? "";
  const difficulty = drill?.difficulty ?? "";
  const category = drillType ? getDrillCategory(drillType as any) : "";
  const completedAt = assignment?.completedAt ?? latest?.completedAt;
  const score = latest?.score;
  const timeSpent = latest?.timeSpent;
  const keyPhrasesResults = latest?.keyPhrasesResults as KeyPhrasesResult | undefined;
  const practiceType = drill ? resolveDrillPracticeType(drill) : null;
  const isKeyPhrases =
    !!keyPhrasesResults || practiceType === "key_phrases";
  const runnerType = isKeyPhrases ? "key_phrases" : (drillType || practiceType || "");

  function formatTime(seconds?: number) {
    if (!seconds) return null;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  }

  return (
    <SafeAreaView edges={["top"]} style={tw`flex-1 bg-white`}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={tw`pb-10`}>
        <View style={styles.container}>
          {/* Header */}
          <View style={tw`flex-row items-center gap-3 mb-4`}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backBtn}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={20} color="#111827" />
            </TouchableOpacity>
            <BoldText style={styles.headerTitle}>Results</BoldText>
          </View>

          {isLoading && (
            <View style={styles.centeredMsg}>
              <AppText style={tw`text-neutral-400`}>Loading results…</AppText>
            </View>
          )}

          {isError && (
            <View style={styles.centeredMsg}>
              <AppText style={tw`text-red-500`}>Failed to load results.</AppText>
            </View>
          )}

          {!isLoading && !isError && data && (
            <>
              {/* Drill identity */}
              <View style={styles.card}>
                <BoldText style={styles.drillTitle}>{drillTitle}</BoldText>
                <View style={tw`flex-row items-center gap-2 mt-1`}>
                  <AppText style={styles.metaText}>{category}</AppText>
                  {difficulty ? (
                    <>
                      <AppText style={styles.metaDot}>•</AppText>
                      <Ionicons name="speedometer-outline" size={12} color="#6B7280" />
                      <AppText style={styles.metaText}>{difficulty}</AppText>
                    </>
                  ) : null}
                </View>
              </View>

              {/* Score card */}
              <View style={styles.scoreCard}>
                <BoldText style={styles.scoreCardTitle}>Submission Details</BoldText>
                <View style={tw`gap-3 mt-3`}>
                  {score !== undefined && (
                    <View style={styles.scoreRow}>
                      <View style={tw`flex-row items-center gap-2`}>
                        <Ionicons name="trophy-outline" size={18} color="#22C55E" />
                        <AppText style={styles.scoreLabel}>Overall Score</AppText>
                      </View>
                      <BoldText style={styles.scoreValue}>{score}%</BoldText>
                    </View>
                  )}
                  {timeSpent !== undefined && (
                    <View style={styles.scoreRow}>
                      <View style={tw`flex-row items-center gap-2`}>
                        <Ionicons name="time-outline" size={18} color="#6B7280" />
                        <AppText style={styles.scoreLabel}>Time Spent</AppText>
                      </View>
                      <AppText style={styles.scoreValueNeutral}>{formatTime(timeSpent)}</AppText>
                    </View>
                  )}
                  {difficulty && (
                    <View style={styles.scoreRow}>
                      <View style={tw`flex-row items-center gap-2`}>
                        <Ionicons name="bar-chart-outline" size={18} color="#6B7280" />
                        <AppText style={styles.scoreLabel}>Difficulty</AppText>
                      </View>
                      <AppText style={styles.scoreValueNeutral}>{difficulty}</AppText>
                    </View>
                  )}
                  {completedAt && (
                    <View style={styles.scoreRow}>
                      <View style={tw`flex-row items-center gap-2`}>
                        <Ionicons name="calendar-outline" size={18} color="#6B7280" />
                        <AppText style={styles.scoreLabel}>Completed On</AppText>
                      </View>
                      <AppText style={styles.scoreValueNeutral}>
                        {format(new Date(completedAt), "MMM d, yyyy")}
                      </AppText>
                    </View>
                  )}
                </View>
              </View>

              {isKeyPhrases && keyPhrasesResults ? (
                <View style={styles.scoreCard}>
                  <BoldText style={styles.scoreCardTitle}>Key Phrases Summary</BoldText>
                  <View style={tw`gap-3 mt-3`}>
                    <View style={styles.scoreRow}>
                      <AppText style={styles.scoreLabel}>Correct</AppText>
                      <BoldText style={styles.scoreValue}>
                        {keyPhrasesResults.correctItems}
                      </BoldText>
                    </View>
                    <View style={styles.scoreRow}>
                      <AppText style={styles.scoreLabel}>Questions</AppText>
                      <AppText style={styles.scoreValueNeutral}>
                        {keyPhrasesResults.totalItems}
                      </AppText>
                    </View>
                    <View style={styles.scoreRow}>
                      <AppText style={styles.scoreLabel}>Score</AppText>
                      <BoldText style={styles.scoreValue}>
                        {Math.round(keyPhrasesResults.score)}%
                      </BoldText>
                    </View>
                  </View>
                  <AppText style={tw`text-xs text-gray-400 mt-3`}>
                    Reviewed — no tutor review required for key phrases drills.
                  </AppText>
                </View>
              ) : null}

              {isKeyPhrases && keyPhrasesResults?.items?.length ? (
                <View style={styles.card}>
                  <BoldText style={styles.scoreCardTitle}>Your answers</BoldText>
                  <View style={tw`gap-4 mt-3`}>
                    {keyPhrasesResults.items.map((item, idx) => (
                      <View
                        key={`${idx}-${item.prompt.slice(0, 20)}`}
                        style={tw`border-b border-gray-100 pb-3`}
                      >
                        <AppText style={tw`text-xs text-gray-500 mb-1`}>
                          Question {idx + 1}
                        </AppText>
                        <AppText style={tw`text-sm text-gray-800 mb-1`}>{item.prompt}</AppText>
                        <AppText style={tw`text-sm text-gray-600`}>
                          Your answer: {item.selectedAnswer || "—"}
                        </AppText>
                        {!item.isCorrect ? (
                          <AppText style={tw`text-sm text-red-600 mt-1`}>
                            Correct: {item.correctAnswer}
                          </AppText>
                        ) : null}
                        <AppText style={tw`text-sm text-gray-500 mt-1`}>
                          Pronunciation: {Math.round(item.pronunciationScore ?? 0)}%
                        </AppText>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}

              {/* Total attempts info */}
              {data.attempts.length > 0 && (
                <AppText style={styles.attemptsInfo}>
                  {data.attempts.length} attempt{data.attempts.length !== 1 ? "s" : ""} submitted
                </AppText>
              )}

              {/* Actions */}
              <View style={tw`gap-3 mt-4`}>
                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={() => router.back()}
                  activeOpacity={0.85}
                >
                  <BoldText style={styles.primaryBtnText}>Back to My Drills</BoldText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.secondaryBtn}
                  onPress={() =>
                    router.push(
                      `/practice/drills/${runnerType}/${drillId}?assignmentId=${assignmentId}` as any
                    )
                  }
                  activeOpacity={0.85}
                >
                  <AppText style={styles.secondaryBtnText}>View Drill Again</AppText>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    color: "#111827",
  },
  centeredMsg: {
    paddingVertical: 48,
    alignItems: "center",
  },
  card: {
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  drillTitle: {
    fontSize: 17,
    color: "#111827",
    lineHeight: 24,
  },
  metaText: {
    fontSize: 13,
    color: "#6B7280",
  },
  metaDot: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  scoreCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(231,234,237,0.8)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    boxShadow: "0px 1px 3px rgba(0,0,0,0.05)",
  },
  scoreCardTitle: {
    fontSize: 15,
    color: "#111827",
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  scoreLabel: {
    fontSize: 14,
    color: "#374151",
  },
  scoreValue: {
    fontSize: 15,
    color: "#22C55E",
  },
  scoreValueNeutral: {
    fontSize: 14,
    color: "#374151",
  },
  attemptsInfo: {
    fontSize: 13,
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 4,
    marginBottom: 4,
  },
  primaryBtn: {
    backgroundColor: "#22C55E",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  primaryBtnText: {
    fontSize: 15,
    color: "#FFFFFF",
  },
  secondaryBtn: {
    backgroundColor: "#F3F4F6",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  secondaryBtnText: {
    fontSize: 15,
    color: "#374151",
  },
});
