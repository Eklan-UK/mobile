import { AppText } from "@/components/ui";
import tw from "@/lib/tw";
import { useSemanticTheme } from "@/hooks/useSemanticTheme";
import {
  DRILL_TYPE_BADGE,
  DRILL_TYPE_BADGE_COLOR,
  DRILL_TYPE_EMOJI,
  DRILL_TYPE_GRADIENT,
} from "@/utils/challengeDrillAdapter";
import type { WeeklyChallengeListItem } from "@/types/weekly-challenge.types";
import { Ionicons } from "@expo/vector-icons";
import { TouchableOpacity, View } from "react-native";

interface WeeklyChallengeDrillRowProps {
  item: WeeklyChallengeListItem;
  onPress: () => void;
}

const DRILL_TYPE_TITLE: Record<string, string> = {
  pronunciation: "Pronunciation",
  vocabulary: "Vocabulary",
  roleplay: "Role-play",
  fill_blank: "Fill in the Blank",
  key_phrases: "Key Phrases",
};

export default function WeeklyChallengeDrillRow({
  item,
  onPress,
}: WeeklyChallengeDrillRowProps) {
  const { colors: c } = useSemanticTheme();
  const emoji = DRILL_TYPE_EMOJI[item.drillType] ?? "📋";
  const badge = DRILL_TYPE_BADGE[item.drillType] ?? item.drillType;
  const badgeColor = DRILL_TYPE_BADGE_COLOR[item.drillType] ?? "#6B7280";
  const [gradStart, gradEnd] = DRILL_TYPE_GRADIENT[item.drillType] ?? ["#E5E7EB", "#D1D5DB"];
  const title = DRILL_TYPE_TITLE[item.drillType] ?? item.label;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[
        tw`rounded-2xl p-3 flex-row items-center gap-3 border`,
        { backgroundColor: c.card, borderColor: c.border },
      ]}
    >
      {/* Thumbnail — gradient expressed as a View with matching start color */}
      <View
        style={[
          tw`h-14 w-14 shrink-0 items-center justify-center rounded-xl`,
          { backgroundColor: gradStart },
        ]}
      >
        <AppText style={tw`text-2xl`}>{emoji}</AppText>
      </View>

      {/* Content */}
      <View style={tw`flex-1 gap-0.5`}>
        {/* Title + badge row */}
        <View style={tw`flex-row items-center gap-2 flex-wrap`}>
          <AppText style={[tw`text-sm font-bold`, { color: c.textPrimary }]}>
            {title}
          </AppText>
          <View
            style={[
              tw`px-2 py-0.5 rounded-full`,
              { backgroundColor: gradEnd + "55" },
            ]}
          >
            <AppText style={[tw`text-xs font-semibold`, { color: badgeColor }]}>
              {badge}
            </AppText>
          </View>
        </View>

        {/* Instructions */}
        <AppText
          style={[tw`text-xs mt-0.5`, { color: c.textSecondary }]}
          numberOfLines={2}
        >
          {item.instructions}
        </AppText>

        {/* Est. time */}
        <View style={tw`flex-row items-center gap-1 mt-1`}>
          <Ionicons name="time-outline" size={12} color={c.textTertiary} />
          <AppText style={[tw`text-xs`, { color: c.textTertiary }]}>
            {item.estimatedMinutes} min
          </AppText>
        </View>
      </View>

      {/* Trailing: checkmark if completed, chevron if not */}
      {item.completed ? (
        <View
          style={[
            tw`h-7 w-7 rounded-full items-center justify-center`,
            { backgroundColor: "#D1FAE5" },
          ]}
        >
          <Ionicons name="checkmark" size={16} color="#047857" />
        </View>
      ) : (
        <Ionicons name="chevron-forward" size={16} color={c.textTertiary} />
      )}
    </TouchableOpacity>
  );
}
