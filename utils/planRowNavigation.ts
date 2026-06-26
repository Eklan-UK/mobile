import { getPlanDrillStatus } from '@/domain/learning-journey/group-journey-drills';
import { useActivityStore } from '@/store/activity-store';
import type { DrillAssignment } from '@/types/drill.types';
import { resolveFreeTalkScenarioId } from '@/utils/drillAssignment';
import { navigateToDrill } from '@/utils/drillNavigation';
import { router } from 'expo-router';

function trackDrillRowTap(item: DrillAssignment) {
  const store = useActivityStore.getState();
  const existing = store.drillProgress[item.drill._id];
  if (existing) {
    store.updateDrillProgress({
      ...existing,
      lastUpdated: Date.now(),
    });
    return;
  }
  store.updateDrillProgress({
    drillId: item.drill._id,
    title: item.drill.title,
    type: item.drill.type,
    currentStep: 1,
    totalSteps: 1,
    answers: [],
    startTime: Date.now(),
    lastUpdated: Date.now(),
  });
}

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
  trackDrillRowTap(item);
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
