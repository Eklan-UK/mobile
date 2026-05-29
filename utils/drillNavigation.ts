import {
  Drill,
  DrillAssignment,
  DrillType,
  isFreeTalkDrillType,
} from "@/types/drill.types";
import { resolveFreeTalkScenarioId } from "@/utils/drillAssignment";
import { resolveDrillPracticeType } from "@/utils/drillPracticeType";
import { router } from "expo-router";

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
