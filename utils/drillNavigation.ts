import {
  Drill,
  DrillAssignment,
  DrillType,
  isFreeTalkDrillType,
} from "@/types/drill.types";
import { resolveFreeTalkScenarioId } from "@/utils/drillAssignment";
import { resolveDrillPracticeType } from "@/utils/drillPracticeType";
import { router } from "expo-router";
import { encodeWeekStartDate } from "@/utils/challengeDrillAdapter";

// Route mapping for drill types
const DRILL_ROUTE_MAP: Partial<Record<DrillType, string>> = {
  vocabulary: "/practice/drills/vocabulary",
  roleplay: "/practice/drills/roleplay",
  matching: "/practice/drills/matching",
  listening: "/practice/drills/listening",
  summary: "/practice/drills/summary",
  definition: "/practice/drills/definition",
  grammar: "/practice/drills/grammar",
  sentence_writing: "/practice/drills/sentence_writing",
  sentence: "/practice/drills/sentence",
  fill_blank: "/practice/drills/fill_blank",
  pronunciation: "/practice/drills/pronunciation",
  key_phrases: "/practice/drills/key_phrases",
  eklan_free_talk: "/practice/free-talk/session",
};

/**
 * Navigate to the appropriate drill interface based on drill type
 * Supports both Drill and DrillAssignment objects
 */
export const navigateToDrill = (drillOrAssignment: Drill | DrillAssignment, assignmentId?: string) => {
  // Extract drill and assignmentId
  const drill = 'drill' in drillOrAssignment ? drillOrAssignment.drill : drillOrAssignment;
  const finalAssignmentId = assignmentId || ('assignmentId' in drillOrAssignment ? drillOrAssignment.assignmentId : undefined);
  
  if (isFreeTalkDrillType(drill.type)) {
    const scenarioId = resolveFreeTalkScenarioId(drill, finalAssignmentId);
    router.push({
      pathname: "/practice/free-talk/session",
      params: scenarioId ? { scenarioId } : {},
    });
    return;
  }

  const practiceType = resolveDrillPracticeType(drill);
  const route = practiceType ? DRILL_ROUTE_MAP[practiceType as DrillType] : undefined;
  if (!route) {
    console.error(`No route mapping found for drill type: ${practiceType ?? drill.type}`);
    return;
  }
  
  // Build URL with optional assignmentId query parameter
  const url = finalAssignmentId
    ? `${route}/${drill._id}?assignmentId=${finalAssignmentId}`
    : `${route}/${drill._id}`;
  
  // Type assertion needed due to dynamic route construction
  router.push(url as any);
};

/**
 * Check if a drill type is supported
 */
export const isDrillTypeSupported = (
  typeOrDrill: DrillType | Drill | DrillAssignment
): boolean => {
  const drill =
    typeof typeOrDrill === "object" && typeOrDrill !== null && "drill" in typeOrDrill
      ? typeOrDrill.drill
      : typeof typeOrDrill === "object" && typeOrDrill !== null && "_id" in typeOrDrill
        ? (typeOrDrill as Drill)
        : null;
  const practiceType = drill
    ? resolveDrillPracticeType(drill)
    : normalizePracticeTypeKey(typeOrDrill as DrillType);
  return !!practiceType && practiceType in DRILL_ROUTE_MAP;
};

function normalizePracticeTypeKey(type: DrillType): string {
  return resolveDrillPracticeType({ type }) ?? type;
}

/**
 * Get the route for a specific drill type
 */
export const getDrillRoute = (type: DrillType): string | null => {
  const key = normalizePracticeTypeKey(type);
  return DRILL_ROUTE_MAP[key as DrillType] || null;
};

export interface WeeklyChallengeRoleplayParams {
  challengeId: string;
  challengeItemIndex: number;
  weekStartDate?: string;
  /** Optional synthetic route id when it differs from challengeId */
  routeDrillId?: string;
}

/**
 * Open a weekly-challenge roleplay drill. API progress uses `challengeId` as drillId.
 */
export function navigateToWeeklyChallengeRoleplay({
  challengeId,
  challengeItemIndex,
  weekStartDate,
  routeDrillId,
}: WeeklyChallengeRoleplayParams): void {
  const id = routeDrillId ?? challengeId;
  router.push({
    pathname: `/practice/drills/roleplay/${id}` as never,
    params: {
      source: "weekly_challenge",
      challengeId,
      challengeItemIndex: String(challengeItemIndex),
      ...(weekStartDate ? { weekStartDate } : {}),
    },
  } as never);
}

export interface WeeklyChallengeItemParams {
  /** Synthetic drill id: "{challengeId}-{index}" */
  syntheticDrillId: string;
  challengeId: string;
  challengeItemIndex: number;
  itemId: string;
  weekStartDate: string;
  drillType: string;
}

const WC_DRILL_ROUTE_MAP: Record<string, string> = {
  fill_blank: "/practice/drills/fill_blank",
  vocabulary: "/practice/drills/fill_blank",
  key_phrases: "/practice/drills/key_phrases",
  pronunciation: "/practice/drills/pronunciation",
};

/**
 * Navigate to the appropriate drill screen for a weekly challenge item.
 * Roleplay uses the dedicated navigateToWeeklyChallengeRoleplay function.
 * All other types navigate to their existing drill screen with WC meta params.
 */
export function navigateToWeeklyChallengeItem({
  syntheticDrillId,
  challengeId,
  challengeItemIndex,
  itemId,
  weekStartDate,
  drillType,
}: WeeklyChallengeItemParams): void {
  if (drillType === "roleplay") {
    navigateToWeeklyChallengeRoleplay({
      challengeId,
      challengeItemIndex,
      weekStartDate,
      routeDrillId: syntheticDrillId,
    });
    return;
  }

  const route = WC_DRILL_ROUTE_MAP[drillType];
  if (!route) {
    console.error(`[navigateToWeeklyChallengeItem] Unsupported drill type: ${drillType}`);
    return;
  }

  router.push({
    pathname: `${route}/${syntheticDrillId}` as never,
    params: {
      source: "weekly_challenge",
      challengeId,
      challengeItemIndex: String(challengeItemIndex),
      wcItemId: itemId,
      weekStartDate,
    },
  } as never);
}

/**
 * Build the navigation path back to the week screen after completing a WC drill.
 */
export function getWeekScreenPath(weekStartDate: string): string {
  return `/practice/weekly-challenge/${encodeWeekStartDate(weekStartDate)}`;
}
