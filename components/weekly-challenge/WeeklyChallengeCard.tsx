import { AppText, BoldText } from "@/components/ui";
import { formatSummaryMessage } from "@/utils/challengeDrillAdapter";
import type { WeeklyChallengeListResponse } from "@/types/weekly-challenge.types";
import { LinearGradient } from "expo-linear-gradient";
import { memo } from "react";
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export interface WeeklyChallengeCardProps {
  challenge: WeeklyChallengeListResponse;
  onPress: () => void;
  subscriptionLocked?: boolean;
}

export const WeeklyChallengeCard = memo(function WeeklyChallengeCard({
  challenge,
  onPress,
  subscriptionLocked = false,
}: WeeklyChallengeCardProps) {
  const completedCount = challenge.drillSequence.filter((d) => d.completed).length;
  const totalDrills = challenge.drillSequence.length;
  const isResume = completedCount > 0 && completedCount < totalDrills;
  const summaryText = formatSummaryMessage(challenge.summaryMessage);

  if (challenge.status === "generating") {
    return (
      <View style={[styles.outer, subscriptionLocked && { opacity: 0.92 }]}>
        <LinearGradient
          colors={["#059669", "#047857"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.card}
        >
          <View style={styles.pill}>
            <Ionicons name="trophy" size={12} color="#A7F3D0" />
            <AppText style={styles.pillText}>WEEKLY CHALLENGE</AppText>
          </View>
          <BoldText style={styles.title}>Building your challenge…</BoldText>
          <View style={styles.generatingRow}>
            <ActivityIndicator size="small" color="#D1FAE5" />
            <AppText style={styles.meta}>Personalizing drills from your progress</AppText>
          </View>
        </LinearGradient>
      </View>
    );
  }

  if (challenge.status === "failed") {
    return (
      <View style={[styles.outer, subscriptionLocked && { opacity: 0.92 }]}>
        <LinearGradient
          colors={["#059669", "#047857"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.card}
        >
          <View style={styles.pill}>
            <Ionicons name="trophy" size={12} color="#A7F3D0" />
            <AppText style={styles.pillText}>WEEKLY CHALLENGE</AppText>
          </View>
          <BoldText style={styles.title}>Couldn&apos;t load your challenge</BoldText>
          <AppText style={[styles.meta, styles.failedCopy]}>
            Tap to retry — we&apos;ll try generating your drills again.
          </AppText>
          <TouchableOpacity
            style={[styles.cta, subscriptionLocked && styles.ctaLocked]}
            onPress={onPress}
            activeOpacity={0.88}
            accessibilityRole="button"
            accessibilityLabel={subscriptionLocked ? "Upgrade to Pro" : "Retry weekly challenge"}
          >
            <BoldText style={[styles.ctaText, subscriptionLocked && styles.ctaTextLocked]}>
              {subscriptionLocked ? "Upgrade to Pro" : "Retry"}
            </BoldText>
          </TouchableOpacity>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={[styles.outer, subscriptionLocked && { opacity: 0.92 }]}>
      <LinearGradient
        colors={["#059669", "#047857"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <View style={styles.pill}>
          <Ionicons name="trophy" size={12} color="#A7F3D0" />
          <AppText style={styles.pillText}>WEEKLY CHALLENGE</AppText>
        </View>

        <BoldText style={styles.title} numberOfLines={2}>
          Your weekly challenge is ready
        </BoldText>

        {summaryText ? (
          <AppText style={[styles.meta, styles.summary]} numberOfLines={2}>
            {summaryText}
          </AppText>
        ) : null}

        <View style={styles.metaRow}>
          <AppText style={styles.meta}>
            {totalDrills} {totalDrills === 1 ? "drill" : "drills"}
          </AppText>
          <AppText style={styles.meta}>{challenge.totalEstimatedMinutes} min</AppText>
        </View>

        <TouchableOpacity
          style={[styles.cta, subscriptionLocked && styles.ctaLocked]}
          onPress={onPress}
          activeOpacity={0.88}
          accessibilityRole="button"
          accessibilityLabel={
            subscriptionLocked
              ? "Upgrade to Pro for weekly challenge"
              : isResume
                ? "Resume weekly challenge"
                : "Start weekly challenge"
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
  title: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
    lineHeight: 26,
    marginBottom: 10,
  },
  summary: {
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
  },
  generatingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 4,
  },
  failedCopy: {
    marginBottom: 18,
    lineHeight: 20,
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
