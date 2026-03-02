import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface AiUsageState {
  // Number of AI free-talk turns used in current period
  freeTurnsUsed: number;
  // Maximum free turns before hard gate
  freeTurnLimit: number;

  incrementTurn: () => void;
  resetUsage: () => void;
}

export const useAiUsageStore = create<AiUsageState>()(
  persist(
    (set, get) => ({
      freeTurnsUsed: 0,
      freeTurnLimit: 3, // 10 turns per free account

      incrementTurn: () => {
        const { freeTurnsUsed, freeTurnLimit } = get();
        if (freeTurnsUsed < freeTurnLimit) {
          set({ freeTurnsUsed: freeTurnsUsed + 1 });
        }
      },

      resetUsage: () => {
        set({ freeTurnsUsed: 0 });
      },
    }),
    {
      name: "eklan-ai-usage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);


