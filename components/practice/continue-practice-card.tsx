import { AppText, BoldText } from "@/components/ui";
import { DrillAssignment, DrillType } from "@/types/drill.types";
import { resolveDrillTopicTitle } from "@/utils/drillAssignment";
import { isInProgressPlanItem } from "@/utils/learnerAssignedPlan";
import { LinearGradient } from "expo-linear-gradient";
import { memo } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import Svg, { Path } from "react-native-svg";

const DRILL_TYPE_LABELS: Record<string, string> = {
  roleplay: "Roleplay",
  vocabulary: "Vocabulary",
  grammar: "Grammar",
  matching: "Matching",
  definition: "Definition",
  sentence_writing: "Sentence Building",
  fill_blank: "Fill-in-the-Blank",
  key_phrases: "Key Phrases",
  summary: "Reading",
  listening: "Listening",
  sentence: "Sentence",
};

const DRILL_ESTIMATED_DURATION_LABEL = "5–15 minutes";

function PlayIconSmall() {
  return (
    <Svg width={10} height={10} viewBox="0 0 24 24" fill="#A7F3D0">
      <Path d="M5 3l14 9-14 9V3z" />
    </Svg>
  );
}

export interface ContinuePracticeCardProps {
  assignment: DrillAssignment;
  onPress: () => void;
  /** When true, CTA promotes Pro upgrade instead of starting the drill. */
  subscriptionLocked?: boolean;
}

/**
 * Surfaces the learner's next open assignment when there is no daily focus.
 * Resume vs start is derived from assignment status.
 */
export const ContinuePracticeCard = memo(function ContinuePracticeCard({
  assignment,
  onPress,
  subscriptionLocked = false,
}: ContinuePracticeCardProps) {
  const { drill } = assignment;
  const isResume = isInProgressPlanItem(assignment);
  const typeLabel = DRILL_TYPE_LABELS[drill.type as DrillType] ?? drill.type;
  const topicTitle = resolveDrillTopicTitle(drill);

  return (
    <View style={[styles.outer, subscriptionLocked && { opacity: 0.92 }]}>
      <LinearGradient
        colors={["#059669", "#047857"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <View style={styles.pill}>
          <PlayIconSmall />
          <AppText style={styles.pillText}>
            {isResume ? "CONTINUE PRACTICE" : "START PRACTICE"}
          </AppText>
        </View>

        {topicTitle ? (
          <BoldText style={styles.topicTitle} numberOfLines={2}>
            {topicTitle}
          </BoldText>
        ) : null}

        <BoldText style={styles.title} numberOfLines={2}>
          {drill.title}
        </BoldText>

        <View style={styles.metaRow}>
          <AppText style={styles.meta}>{typeLabel}</AppText>
          <AppText style={styles.meta}>{DRILL_ESTIMATED_DURATION_LABEL}</AppText>
        </View>

        <TouchableOpacity
          style={[styles.cta, subscriptionLocked && styles.ctaLocked]}
          onPress={onPress}
          activeOpacity={0.88}
          accessibilityRole="button"
          accessibilityLabel={
            subscriptionLocked
              ? "Upgrade to Pro to practice"
              : isResume
                ? "Resume practice"
                : "Start practice"
          }
        >
          <BoldText style={[styles.ctaText, subscriptionLocked && styles.ctaTextLocked]}>
            {subscriptionLocked ? "Upgrade to Pro" : isResume ? "Resume" : "Start"}
          </BoldText>
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );
});

const styles = StyleSheet.create({
  outer: {
    marginBottom: 0,
  },
  card: {
    borderRadius: 24,
    padding: 20,
    boxShadow: "0px 10px 15px rgba(0, 0, 0, 0.12)",
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: "rgba(6, 78, 59, 0.5)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 12,
  },
  pillText: {
    color: "#D1FAE5",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
  },
  topicTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
    marginBottom: 6,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
    lineHeight: 26,
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  meta: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 14,
    fontWeight: "400",
    textTransform: "capitalize",
  },
  cta: {
    width: "100%",
    backgroundColor: "#FACC15",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaText: {
    color: "#064E3B",
    fontSize: 16,
    fontWeight: "700",
  },
  ctaLocked: {
    backgroundColor: "#16a34a",
  },
  ctaTextLocked: {
    color: "#FFFFFF",
  },
});
