import React from "react";
import { View, TouchableOpacity, Modal, ScrollView } from "react-native";
import { router } from "expo-router";
import tw from "@/lib/tw";
import { AppText } from "@/components/ui/AppText";
import TargetIcon from "@/assets/icons/target-arrow-green.svg"

interface Props {
  visible: boolean;
  onClose: () => void;
  isCompletedState?: boolean;
}

const BenefitItem = ({ text }: { text: string }) => (
  <View style={tw`flex-row items-start py-3 gap-3`}>
    <TargetIcon />
    <AppText style={tw`flex-1 text-base text-neutral-800 dark:text-neutral-200 leading-snug`}>
      {text}
    </AppText>
  </View>
);

export function PlanOnboardingGate({ visible, onClose, isCompletedState }: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={tw`flex-1 z-50 bg-black/50 justify-end`}>
        <View style={tw`bg-white dark:bg-neutral-900 rounded-t-3xl px-6 pt-5 pb-8`}>
          {/* Close button - only show if NOT completed state */}
          {!isCompletedState && (
          <TouchableOpacity
            onPress={onClose}
            style={tw`absolute top-5 right-5 w-8 h-8 items-center justify-center`}
            activeOpacity={0.7}
          >
            <AppText style={tw`text-neutral-800 dark:text-neutral-200 text-xl font-light`}>✕</AppText>
          </TouchableOpacity>
          )}

          {/* Title - depends on completed state */}
          <AppText style={tw`text-xl font-bold text-neutral-900 dark:text-white mb-4 ${!isCompletedState ? 'pr-8' : ''}`}>
            {isCompletedState ? "Still Translating In Your Head Before You Speak?" : "Let's Build Your Speaking Plan"}
          </AppText>

          {/* Description */}
          {isCompletedState ? (
            <AppText style={tw`text-base text-neutral-800 dark:text-neutral-200 mb-4 leading-relaxed`}>
              You've finished your free drills! Book a call with our English Coaching team. We'll identify what's holding you back and give you a clear roadmap to natural fluency.
            </AppText>
          ) : (
            <>
              <AppText style={tw`text-base text-neutral-800 dark:text-neutral-200 mb-1`}>
                These drills are assigned after a Performance Review.
              </AppText>
              <AppText style={tw`text-base text-neutral-800 dark:text-neutral-200 mb-4`}>
                Before designing your plan, we assess:
              </AppText>
              <BenefitItem text="Where you pause because you translate in your head" />
              <BenefitItem text="How long it takes your English to come out in live Q&A after your presentations" />
              <BenefitItem text="How you respond when interrupted" />
              <BenefitItem text="The high-stakes situations you regularly face" />

              <View style={tw`bg-yellow-50 dark:bg-yellow-500/10 rounded-2xl px-4 py-4 mt-3 mb-6`}>
                <AppText style={tw`text-base text-neutral-700 dark:text-neutral-300 leading-relaxed`}>
                  This allows us to design a structured speaking plan, so you can think and speak in English without delay.
                </AppText>
              </View>
            </>
          )}

          {/* CTA button */}
          <TouchableOpacity
            style={tw`w-full bg-green-700 rounded-full py-4 ${!isCompletedState ? 'mb-10' : 'mb-3'} items-center`}
            activeOpacity={0.85}
            onPress={() => {
              onClose();
              router.push("/book-call");
            }}
          >
            <AppText style={tw`text-white font-semibold text-base`}>
              {isCompletedState ? "Book My Performance Review" : "Book My Fluency Review"}
            </AppText>
          </TouchableOpacity>

          {/* Go home button - for completed state */}
          {isCompletedState && (
            <TouchableOpacity
              style={tw`w-full items-center py-2 mb-4`}
              activeOpacity={0.7}
              onPress={() => {
                onClose();
                router.push("/");
              }}
            >
              <AppText style={tw`text-green-700 dark:text-green-500 font-medium text-base`}>
                Back Home
              </AppText>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}