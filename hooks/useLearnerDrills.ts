import { useDrills } from '@/hooks/useDrills';

/** Recommended limit for learning journey, saved drills, and plan screens. */
export const LEARNER_DRILLS_LIMIT = 1000;

/** Limit for home hero selection and assigned-drills preview (spec §3.4). */
export const HOME_LEARNER_DRILLS_LIMIT = 100;

/** Fetches all assigned drills for learning journey views. */
export function useLearnerDrills() {
  return useDrills(undefined, LEARNER_DRILLS_LIMIT);
}

/** Fetches assigned drills for the home screen (hero + assigned list). */
export function useHomeLearnerDrills() {
  return useDrills(undefined, HOME_LEARNER_DRILLS_LIMIT);
}
