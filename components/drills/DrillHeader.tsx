import { AppText } from "@/components/ui";
import tw from "@/lib/tw";
import { router } from "expo-router";
import { TouchableOpacity, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import ArrowLeftIcon from "@/assets/icons/arrow-left.svg";
import BookMarkIcon from "@/assets/icons/bookmark.svg";
import BookMarkCheck from "@/assets/icons/bookmark-check.svg";

interface DrillHeaderProps {
  title: string;
  currentStep: number;
  totalSteps: number;
  onBack?: () => void;
  drillId?: string;
  isSaved?: boolean;
  onSave?: () => void;
  onUnsave?: () => void;
  /** Hide the built-in progress bar (e.g. when the screen renders its own progress block) */
  hideProgress?: boolean;
  /** Optional step label shown to the right of the title, e.g. "1 of 2" */
  stepLabel?: string;
}

function BackArrowIcon() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M15 19l-7-7 7-7"
        stroke="#1F2937"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export default function DrillHeader({
  title,
  currentStep,
  totalSteps,
  onBack,
  drillId,
  isSaved = false,
  onSave,
  onUnsave,
  hideProgress = false,
  stepLabel,
}: DrillHeaderProps) {
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  const handleSave = () => {
    if (isSaved && onUnsave) {
      onUnsave();
    } else if (!isSaved && onSave) {
      onSave();
    }
  };

  const progress = (currentStep / totalSteps) * 100;

  return (
    <View style={tw`px-5 pt-4 pb-3`}>
      {/* Back button, title, and bookmark */}
      <View style={tw`flex-row items-center justify-between mb-3`}>
        <TouchableOpacity
          onPress={handleBack}
          style={tw`w-[40px] h-[40px] bg-neutral-100 rounded-full items-center justify-center -ml-2`}
        >
          <ArrowLeftIcon />
        </TouchableOpacity>

        <View style={tw`flex-1 mx-3`}>
          <View style={tw`flex-row items-center justify-between mb-2`}>
            <AppText
              style={tw`text-base text-[14px] font-bold text-gray-900 flex-1`}
              numberOfLines={1}
            >
              {title}
            </AppText>
            {stepLabel != null && (
              <AppText style={tw`text-[14px] text-[#6a7282] ml-2 shrink-0`}>
                {stepLabel}
              </AppText>
            )}
          </View>

          {/* Progress bar */}
          {!hideProgress && (
            <View style={tw`h-2 bg-gray-200 rounded-full overflow-hidden`}>
              <View
                style={[
                  tw`h-full bg-green-600 rounded-full`,
                  { width: `${progress}%` },
                ]}
              />
            </View>
          )}
        </View>

        {(onSave || onUnsave) && (
          <TouchableOpacity
            onPress={handleSave}
            style={tw`w-10 h-10 items-center justify-center -mr-2`}
          >
            {isSaved ? <BookMarkCheck /> : <BookMarkIcon />}
           
             
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}