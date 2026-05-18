import { AppText, BoldText } from "@/components/ui";
import tw from "@/lib/tw";
import { TouchableOpacity, View } from "react-native";
import Svg, { Path } from "react-native-svg";

interface Props {
  studentName?: string;
  aiName?: string;
  onReview: () => void;
  onRestart: () => void;
}

function StarIcon() {
  return (
    <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
        fill="#F59E0B"
        stroke="#F59E0B"
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export default function RoleplayCompleteBanner({ studentName, aiName, onReview, onRestart }: Props) {
  const roleLine = studentName && aiName
    ? `You played ${studentName} opposite ${aiName}.`
    : studentName
    ? `You played ${studentName}.`
    : "Great conversation!";

  return (
    <View style={tw`bg-emerald-600 dark:bg-emerald-700 rounded-2xl p-5 mx-1 my-2`}>
      {/* Icon + heading */}
      <View style={tw`items-center mb-3`}>
        <StarIcon />
        <BoldText style={tw`text-white text-xl font-bold mt-2 text-center`}>
          Conversation Complete!
        </BoldText>
        <AppText style={tw`text-emerald-100 text-sm text-center mt-1`}>
          {roleLine}
        </AppText>
      </View>

      {/* Buttons */}
      <TouchableOpacity
        onPress={onReview}
        style={tw`bg-white rounded-full py-3.5 items-center mb-3`}
        activeOpacity={0.85}
      >
        <BoldText style={tw`text-emerald-700 font-bold text-base`}>
          Review Performance
        </BoldText>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={onRestart}
        style={tw`border-2 border-white/60 rounded-full py-3.5 items-center mb-3`}
        activeOpacity={0.85}
      >
        <AppText style={tw`text-white font-semibold text-base`}>
          Restart Drill
        </AppText>
      </TouchableOpacity>

      {/* Switch Roles — no backend support yet */}
      {/* TODO: enable when API + drill types define role-swap flag */}
      <TouchableOpacity
        disabled
        style={tw`border border-white/30 rounded-full py-3 items-center opacity-40`}
        activeOpacity={1}
      >
        <AppText style={tw`text-white text-sm`}>Switch Roles (coming soon)</AppText>
      </TouchableOpacity>
    </View>
  );
}
