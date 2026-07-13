import { Alert } from "@/utils/alert";
import {
  exitDrillAfterComplete,
  type DrillExitSource,
} from "@/utils/drillExit";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";

export interface UseDrillExitOptions {
  source?: DrillExitSource;
  weekStartDate?: string;
}

export function useDrillExit(options: UseDrillExitOptions = {}) {
  const queryClient = useQueryClient();
  const [isExiting, setIsExiting] = useState(false);
  const { source, weekStartDate } = options;

  const exitDrill = useCallback(
    async (exitOptions?: {
      beforeExit?: () => Promise<void>;
      invalidateCaches?: boolean;
    }): Promise<boolean> => {
      if (isExiting) return false;

      setIsExiting(true);
      try {
        await exitDrillAfterComplete({
          queryClient,
          source,
          weekStartDate,
          beforeExit: exitOptions?.beforeExit,
          invalidateCaches: exitOptions?.invalidateCaches,
        });
        return true;
      } catch {
        Alert.alert("Error", "Failed to save results. Please try again.");
        setIsExiting(false);
        return false;
      }
    },
    [isExiting, queryClient, source, weekStartDate]
  );

  return { isExiting, exitDrill };
}
