import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DrillType } from "@/types/drill.types";

export interface RecentActivity {
  id: string; // Drill ID
  title: string;
  type: DrillType;
  score?: number;
  timestamp: string; // ISO string
  durationSeconds: number;
}

export interface DrillProgress {
  drillId: string;
  currentStep: number;
  totalSteps: number;
  answers: any[];
  data?: any; // For complex state like chat history
  startTime: number; // Unix timestamp
  lastUpdated: number; // Unix timestamp
  title: string;
  type: DrillType;
}

interface ActivityState {
  recentActivities: RecentActivity[];
  drillProgress: Record<string, DrillProgress>;
  lastActiveDrill: DrillProgress | null;

  // Actions
  addRecentActivity: (activity: Omit<RecentActivity, "timestamp">) => void;
  updateDrillProgress: (progress: DrillProgress) => void;
  clearDrillProgress: (drillId: string) => void;
}

export const useActivityStore = create<ActivityState>()(
  persist(
    (set, get) => ({
      recentActivities: [],
      drillProgress: {},
      lastActiveDrill: null,

      addRecentActivity: (activity) => {
        const { recentActivities } = get();
        // Only keep top 10 recent activities
        // Filter out if duplicate ID exists to bump it to top? Or just log every completion?
        // Usually "Recent Activity" shows history. If I did Drill A yesterday and today, it should appear twice?
        // Or unique? Let's assume unique items (most recent interaction) for the list view to avoid clutter.
        
        const newActivity = {
          ...activity,
          timestamp: new Date().toISOString(),
        };

        const filtered = recentActivities.filter((a) => a.id !== activity.id);
        
        set({
          recentActivities: [newActivity, ...filtered].slice(0, 10),
        });
      },

      updateDrillProgress: (progress) => {
        set((state) => ({
          drillProgress: {
            ...state.drillProgress,
            [progress.drillId]: progress,
          },
          lastActiveDrill: progress, 
        }));
      },

      clearDrillProgress: (drillId) => {
        set((state) => {
          const newProgress = { ...state.drillProgress };
          delete newProgress[drillId];
          
          // If the cleared drill was the last active one, clear that too? 
          // Or keep it as "Recently completed"? 
          // Usually "Continue Practice" implies INCOMPLETE.
          // So if cleared (completed), we should clear lastActiveDrill if it matches.
          
          const lastActive = state.lastActiveDrill?.drillId === drillId ? null : state.lastActiveDrill;

          return {
            drillProgress: newProgress,
            lastActiveDrill: lastActive,
          };
        });
      },
    }),
    {
      name: "elkan-activity-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
