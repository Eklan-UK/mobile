// Shared types for all step components

export interface FormData {
  name: string;
  role: string;
  goal: string;
  confidence: number;
  showTranslations: boolean;
  nationality: string;
  confidenceScore: number | null;
}

export interface StepProps {
  data: FormData;
  onUpdate: (updates: Partial<FormData>) => void;
  onNext: () => void;
  onBack: () => void;
  isFirst: boolean;
  isLast: boolean;
  currentStep: number;
  totalSteps: number;
}
