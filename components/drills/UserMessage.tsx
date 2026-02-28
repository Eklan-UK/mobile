import { AppText, BoldText } from "@/components/ui";
import tw from "@/lib/tw";
import { View, TouchableOpacity, Image } from "react-native";
import Svg, { Path } from "react-native-svg";

interface UserMessageProps {
  message: string;
  showAudio?: boolean;
  isError?: boolean;
}

export default function UserMessage({ message, showAudio = false, isError = false }: UserMessageProps) {
  return (
    <View style={tw` items-end justify-end mb-4`}>
      <View style={tw`w-10 h-10 rounded-full ml-4 mb-4 ${isError ? 'bg-red-100' : 'bg-pink-100'} items-center justify-center overflow-hidden`}>
        <AppText style={tw`${isError ? 'text-red-500' : 'text-pink-500'} font-semibold text-sm`}>
          A
        </AppText>
      </View>
      <View style={tw`flex-row items-start gap-2 max-w-[85%]`}>
        <View
          style={tw`${isError ? 'bg-red-50 border-red-200' : 'bg-green-50/50 border-green-200'
            } border rounded-2xl px-4 py-3 rounded-tr-sm`}
        >
          <BoldText weight="medium" style={tw`${isError ? 'text-red-900' : 'text-gray-900'} text-base leading-6`}>
            {message}
          </BoldText>
          {showAudio && (
            <View style={tw`flex-row items-center gap-2 mt-2`}>
              <TouchableOpacity style={tw`w-6 h-6 items-center justify-center`}>
                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"
                    fill={isError ? "#EF4444" : "#6B7280"}
                  />
                </Svg>
              </TouchableOpacity>
              <TouchableOpacity style={tw`w-6 h-6 items-center justify-center`}>
                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"
                    fill="#6B7280"
                  />
                </Svg>
              </TouchableOpacity>
            </View>
          )}
        </View>
    
      </View>
    </View>
  );
}