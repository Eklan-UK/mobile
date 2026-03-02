import { router } from "expo-router";
import { useRef, useState, useEffect } from "react";
import { Dimensions, FlatList, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ConfidenceStep from "./steps/ConfidenceStep";
import GoalsStep from "./steps/GoalsStep";
import NameStep from "./steps/NameStep";
import NationalityStep from "./steps/NationalityStep";
import RoleStep from "./steps/RoleStep";
import { FormData } from "./steps/types";
import VoiceCalibrationStep from "./steps/VoiceCalibrationStep";
import { secureStorage } from "@/lib/secure-storage";
import { useAuthStore } from "@/store/auth-store";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const STEPS = [
  { id: "name", component: NameStep },
  { id: "role", component: RoleStep },
  { id: "goals", component: GoalsStep },
  { id: "confidence", component: ConfidenceStep },
  { id: "nationality", component: NationalityStep },
  { id: "voice", component: VoiceCalibrationStep },
];

export default function ProfileSetupScreen() {
  const flatListRef = useRef<FlatList>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const { user } = useAuthStore();
  
  // Initialize form data with user's name from account creation
  const getInitialName = () => {
    if (user?.firstName || user?.lastName) {
      return `${user.firstName || ""} ${user.lastName || ""}`.trim();
    }
    return "";
  };

  const [formData, setFormData] = useState<FormData>({
    name: getInitialName(),
    role: "",
    goal: "",
    confidence: 0.5,
    showTranslations: false,
    nationality: "",
    confidenceScore: null,
  });

  // Update name if user data becomes available
  useEffect(() => {
    if (user && !formData.name) {
      const fullName = getInitialName();
      if (fullName) {
        setFormData((prev) => ({ ...prev, name: fullName }));
      }
    }
  }, [user]);

  const updateFormData = (updates: Partial<FormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const goNext = async () => {
    if (currentStep < STEPS.length - 1) {
      const nextStep = currentStep + 1;
      flatListRef.current?.scrollToIndex({
        index: nextStep,
        animated: true,
      });
      setCurrentStep(nextStep);
    } else {
      // Last step - store formData and navigate to welcome screen
      // Store formData in AsyncStorage so welcome-complete can access it
      await secureStorage.setItem('profileSetupData', JSON.stringify(formData));
      
      router.push({
        pathname: "/(profile-setup)/welcome-complete",
        params: {
          name: formData.name,
          confidenceScore: formData.confidenceScore?.toString(),
        },
      });
    }
  };

  const goBack = () => {
    if (currentStep > 0) {
      const prevStep = currentStep - 1;
      flatListRef.current?.scrollToIndex({
        index: prevStep,
        animated: true,
      });
      setCurrentStep(prevStep);
    }
  };

  const renderStep = ({ item, index }: { item: typeof STEPS[0]; index: number }) => {
    const StepComponent = item.component;
    return (
      <View style={{ width: SCREEN_WIDTH }}>
        <StepComponent
          data={formData}
          onUpdate={updateFormData}
          onNext={goNext}
          onBack={goBack}
          isFirst={index === 0}
          isLast={index === STEPS.length - 1}
          currentStep={index}
          totalSteps={STEPS.length}
        />
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "white" }} edges={["top", "bottom"]}>
      <FlatList
        ref={flatListRef}
        data={STEPS}
        renderItem={renderStep}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        snapToInterval={SCREEN_WIDTH}
        decelerationRate="fast"
        getItemLayout={(_, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
      />
    </SafeAreaView>
  );
}
