import { AppText } from "@/components/ui";
import tw from "@/lib/tw";
import { View } from "react-native";

interface Props {
  completed: number;
  total: number;
}

export default function RoleplayYourLinesProgress({ completed, total }: Props) {
  const pct = total > 0 ? Math.min((completed / total) * 100, 100) : 0;

  return (
    <View style={tw`mb-3`}>
      <View style={tw`flex-row items-center justify-between mb-1.5`}>
        <AppText style={tw`text-xs font-semibold text-neutral-500 dark:text-neutral-400`}>
          Your lines
        </AppText>
        <AppText style={tw`text-xs font-semibold text-neutral-500 dark:text-neutral-400`}>
          {completed} / {total}
        </AppText>
      </View>
      <View style={tw`h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden`}>
        <View
          style={[tw`h-full bg-green-600 rounded-full`, { width: `${pct}%` }]}
        />
      </View>
    </View>
  );
}
