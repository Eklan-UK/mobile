import { AppText } from "@/components/ui";
import tw from "@/lib/tw";
import { View } from "react-native";

interface Props {
  sceneName: string;
  sceneIndex: number;
  totalScenes: number;
}

export default function RoleplaySceneHeader({ sceneName, sceneIndex, totalScenes }: Props) {
  return (
    <View style={tw`flex-row items-center justify-between mb-3`}>
      <View style={tw`flex-1`}>
        <AppText style={tw`text-[10px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wide mb-0.5`}>
          Current Scene
        </AppText>
        <AppText style={tw`text-sm font-bold text-neutral-800 dark:text-neutral-200`} numberOfLines={1}>
          {sceneName}
        </AppText>
      </View>
      {totalScenes > 1 && (
        <View style={tw`bg-neutral-200 dark:bg-neutral-700 rounded-full px-2.5 py-1 ml-2`}>
          <AppText style={tw`text-xs font-semibold text-neutral-600 dark:text-neutral-300`}>
            Scene {sceneIndex + 1} of {totalScenes}
          </AppText>
        </View>
      )}
    </View>
  );
}
