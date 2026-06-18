import { getPlanDrillStatus } from '@/domain/learning-journey/group-journey-drills';
import type { DrillAssignment } from '@/types/drill.types';
import { resolveFreeTalkScenarioId } from '@/utils/drillAssignment';
import { navigateToDrill } from '@/utils/drillNavigation';
import { router } from 'expo-router';

/** Navigate from PlanDrillRow — completed drills open results when assignmentId is present. */
export function navigatePlanDrillRow(item: DrillAssignment, onNavigate?: () => void) {
  onNavigate?.();
  const status = getPlanDrillStatus(item);
  if (status === 'completed' && item.assignmentId) {
    router.push(
      `/practice/drills/results?drillId=${item.drill._id}&assignmentId=${item.assignmentId}` as never
    );
    return;
  }
  navigateToDrill(item, item.assignmentId);
}

/** Navigate from PlanFreeTalkRow — locked users go to subscription. */
export function navigatePlanFreeTalkRow(item: DrillAssignment, locked: boolean) {
  if (locked) {
    router.push('/premium' as never);
    return;
  }
  const scenarioId = resolveFreeTalkScenarioId(item.drill, item.assignmentId);
  router.push({
    pathname: '/practice/free-talk/session',
    params: { scenarioId },
  });
}

export function navigatePlanFreeTalkByScenarioId(scenarioId: string, locked: boolean) {
  if (locked) {
    router.push('/premium' as never);
    return;
  }
  router.push({
    pathname: '/practice/free-talk/session',
    params: { scenarioId },
  });
}
