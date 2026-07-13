import { AppText, BoldText } from "@/components/ui";
import type { DailyFocus } from "@/services/daily-focus.service";
import { LinearGradient } from "expo-linear-gradient";
import { memo } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import Svg, { Path } from "react-native-svg";

const FOCUS_TYPE_LABELS: Record<DailyFocus["focusType"], string> = {
  grammar: "Grammar",
  vocabulary: "Vocabulary",
  matching: "Matching",
  pronunciation: "Pronunciation",
  general: "General",
};

function FocusIconSmall() {
  return (
    <Svg width={10} height={10} viewBox="0 0 24 24" fill="#A7F3D0">
      <Path d="M12 2l2.4 7.4H22l-6 4.6 2.3 7L12 17.8 5.7 21l2.3-7-6-4.6h7.6L12 2z" />
    </Svg>
  );
}

export interface TodaysFocusCardProps {
  dailyFocus: DailyFocus;
  onPress: () => void;
  subscriptionLocked?: boolean;
}

export const TodaysFocusCard = memo(function TodaysFocusCard({
  dailyFocus,
  onPress,
  subscriptionLocked = false,
}: TodaysFocusCardProps) {
  const focusLabel = FOCUS_TYPE_LABELS[dailyFocus.focusType] ?? dailyFocus.focusType;
  const durationLabel = `${dailyFocus.estimatedMinutes} min`;

  return (
    <View style={[styles.outer, subscriptionLocked && { opacity: 0.92 }]}>
      <LinearGradient
        colors={["#059669", "#047857"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <View style={styles.pill}>
          <FocusIconSmall />
          <AppText style={styles.pillText}>FOCUS TODAY</AppText>
        </View>

        <BoldText style={styles.title} numberOfLines={2}>
          {dailyFocus.title}
        </BoldText>

        <View style={styles.metaRow}>
          <AppText style={styles.meta}>{focusLabel}</AppText>
          <AppText style={styles.meta}>{durationLabel}</AppText>
        </View>

        <TouchableOpacity
          style={[styles.cta, subscriptionLocked && styles.ctaLocked]}
          onPress={onPress}
          activeOpacity={0.88}
          accessibilityRole="button"
          accessibilityLabel={
            subscriptionLocked ? "Upgrade to Pro for today's focus" : "Start today's focus"
          }
        >
          <BoldText style={[styles.ctaText, subscriptionLocked && styles.ctaTextLocked]}>
            {subscriptionLocked ? "Upgrade to Pro" : "Start"}
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
