import { AppText, BoldText } from "@/components/ui";
import tw from "@/lib/tw";
import { View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

interface ComingSoonProps {
  title?: string;
  description: string;
}

export function ComingSoon({
  title = "Coming Soon!",
  description,
}: ComingSoonProps) {
  return (
    <View style={tw`flex-1 items-center justify-center py-20`}>
      <View style={tw`items-center mb-6`}>
        <View style={tw`relative w-48 h-40`}>
          <View
            style={tw`absolute left-6 top-4 w-32 h-32 bg-neutral-100 rounded-2xl items-start justify-center px-4`}
          >
            <View style={tw`w-full`}>
              <View style={tw`h-2 w-16 bg-neutral-800 rounded-full mb-2`} />
              <View style={tw`h-2 w-20 bg-neutral-300 rounded-full mb-2`} />
              <View style={tw`h-2 w-14 bg-neutral-300 rounded-full mb-2`} />
              <View style={tw`h-2 w-18 bg-neutral-300 rounded-full`} />
            </View>
          </View>
          <View style={tw`absolute right-4 bottom-0`}>
            <Svg width={64} height={64} viewBox="0 0 64 64">
              <Circle
                cx={28}
                cy={28}
                r={18}
                stroke="#d4d4d4"
                strokeWidth={4}
                fill="white"
              />
              <Path
                d="M42 42L56 56"
                stroke="#d4d4d4"
                strokeWidth={6}
                strokeLinecap="round"
              />
              <Path
                d="M22 22L34 34M34 22L22 34"
                stroke="#fbbf24"
                strokeWidth={3}
                strokeLinecap="round"
              />
            </Svg>
          </View>
          <View
            style={tw`absolute -left-2 top-0 w-2 h-2 bg-neutral-300 rounded-full`}
          />
          <View
            style={tw`absolute right-16 -top-2 w-3 h-3 bg-neutral-200 rounded-full`}
          />
          <View
            style={tw`absolute right-0 top-4 w-8 h-2 bg-neutral-200 rounded-full`}
          />
        </View>
      </View>
      <AppText style={tw`text-2xl font-bold text-neutral-900 mb-2`}>{title}</AppText>
      <AppText style={tw`text-base text-neutral-500 text-center px-8`}>
        {description}
      </AppText>
    </View>
  );
}

