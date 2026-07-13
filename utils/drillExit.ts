import { invalidateDrillCaches } from "@/hooks/useDrills";
import { encodeWeekStartDate } from "@/utils/challengeDrillAdapter";
import type { QueryClient } from "@tanstack/react-query";
import { router } from "expo-router";

export type DrillExitSource = "plan" | "weekly_challenge";

export interface ExitDrillOptions {
  queryClient: QueryClient;
  source?: DrillExitSource;
  weekStartDate?: string;
  beforeExit?: () => Promise<void>;
  invalidateCaches?: boolean;
}

export async function navigateAfterDrillExit(options: {
  source?: DrillExitSource;
  weekStartDate?: string;
}): Promise<void> {
  const { source, weekStartDate } = options;

  if (source === "weekly_challenge" && weekStartDate) {
    router.replace(
      `/practice/weekly-challenge/${encodeWeekStartDate(weekStartDate)}` as never
    );
    return;
  }

  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace("/(tabs)/plan" as never);
  }
}

export async function exitDrillAfterComplete(
  options: ExitDrillOptions
): Promise<void> {
  const {
    queryClient,
    source,
    weekStartDate,
    beforeExit,
    invalidateCaches = true,
  } = options;

  if (beforeExit) {
    await beforeExit();
  }

  if (invalidateCaches) {
    await invalidateDrillCaches(queryClient);
  }

  await navigateAfterDrillExit({ source, weekStartDate });
}
