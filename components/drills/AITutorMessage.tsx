import { AppText } from "@/components/ui";
import tw from "@/lib/tw";
import { View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import AudioButton from "./AudioButton";
import Logo from "@/assets/icons/logo.svg";
interface AITutorMessageProps {
  message: string;
  showAudio?: boolean;
  onPlayAudio?: () => void;
  audioUri?: string;
}


export default function AITutorMessage({ message, showAudio = true, onPlayAudio, audioUri }: AITutorMessageProps) {
  return (
    <View style={tw` justify-start mb-4`}>
      <View style={tw` w-10 h-10 items-center justify-center rounded-full bg-primary-50 p-2 rounded-full  mb-4`}>
        <Logo width={20} height={20} />
      </View>
      <View style={tw` flex-1`}>
        <View style={tw`bg-gray-50 rounded-2xl rounded-tl-sm px-4 py-3`}>
          <AppText style={tw`text-sm text-gray-700 leading-5`}>{message}</AppText>
        </View>
        {showAudio && (
          <View style={tw`flex-row items-center mt-2 ml-1`}>
            {onPlayAudio ? (
              <AudioButton onPress={onPlayAudio} />
            ) : (
              <AudioButton text={message} audioUri={audioUri} />
            )}
          </View>
        )}
      </View>
    </View>
  );
}
