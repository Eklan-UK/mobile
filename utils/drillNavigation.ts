import { Drill, DrillType, DrillAssignment } from "@/types/drill.types";
import { router } from "expo-router";

// Route mapping for drill types
const DRILL_ROUTE_MAP: Record<DrillType, string> = {
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
};

/**
 * Navigate to the appropriate drill interface based on drill type
 * Supports both Drill and DrillAssignment objects
 */
export const navigateToDrill = (drillOrAssignment: Drill | DrillAssignment, assignmentId?: string) => {
  // Extract drill and assignmentId
  const drill = 'drill' in drillOrAssignment ? drillOrAssignment.drill : drillOrAssignment;
  const finalAssignmentId = assignmentId || ('assignmentId' in drillOrAssignment ? drillOrAssignment.assignmentId : undefined);
  
  const route = DRILL_ROUTE_MAP[drill.type];
  if (!route) {
    console.error(`No route mapping found for drill type: ${drill.type}`);
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
export const isDrillTypeSupported = (type: DrillType): boolean => {
  return type in DRILL_ROUTE_MAP;
};

/**
 * Get the route for a specific drill type
 */
export const getDrillRoute = (type: DrillType): string | null => {
  return DRILL_ROUTE_MAP[type] || null;
};
