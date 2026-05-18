import { AppText } from "@/components/ui";
import tw from "@/lib/tw";
import { View } from "react-native";
import Svg, { Path } from "react-native-svg";

interface Props {
  context: string;
}

function LeafIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Path
        d="M17 8C8 10 5.9 16.17 3.82 19.1c-.83 1.17-2.29.85-2.82-.33C.35 17.63 0 15.8 0 14c0-7.73 6.27-14 14-14 1.8 0 3.63.35 4.77.95C19.96 1.48 20.28 2.94 19.1 3.77c-2.07 1.11-5.14 1.94-2.1 4.23z"
        fill="#059669"
      />
    </Svg>
  );
}

export default function RoleplayScenarioBlock({ context }: Props) {
  return (
    <View
      style={tw`bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 rounded-xl px-3 py-2.5 mb-3`}
    >
      <View style={tw`flex-row items-center gap-1.5 mb-1`}>
        <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
          <Path
            d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
            stroke="#059669"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
        <AppText style={tw`text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide`}>
          Scenario
        </AppText>
      </View>
      <AppText style={tw`text-sm text-emerald-800 dark:text-emerald-300 leading-5`}>
        {context}
      </AppText>
    </View>
  );
}
