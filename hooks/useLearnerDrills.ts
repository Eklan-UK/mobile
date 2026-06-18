import { useDrills } from '@/hooks/useDrills';

/** Recommended limit for learning journey, saved drills, and plan screens. */
export const LEARNER_DRILLS_LIMIT = 100;

/** Fetches all assigned drills for learning journey views. */
export function useLearnerDrills() {
  return useDrills(undefined, LEARNER_DRILLS_LIMIT);
}
