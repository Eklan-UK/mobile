import type { DrillAssignment } from '@/types/drill.types';
import { isFreeTalkDrillType } from '@/types/drill.types';
import type { FreeTalkScenarioSummary } from '@/types/free-talk';
import { resolveDrillPracticeType } from '@/utils/drillPracticeType';

export type AssignedPracticeFeedItem =
  | { kind: 'drill'; assignment: DrillAssignment; sortKey: string }
  | { kind: 'free_talk'; scenario: FreeTalkScenarioSummary; sortKey: string };

function drillSortKey(assignment: DrillAssignment): string {
  return assignment.assignedAt ?? assignment.drill?.date ?? '';
}

function scenarioSortKey(scenario: FreeTalkScenarioSummary): string {
  return scenario.assignedAt ?? '';
}

function feedItemTitle(item: AssignedPracticeFeedItem): string {
  if (item.kind === 'drill') {
    return item.assignment.drill?.title ?? '';
  }
  return item.scenario.title ?? '';
}

/** Merge drills and Free Talk scenarios, newest first. */
export function buildAssignedPracticeFeed(
  drills: DrillAssignment[],
  scenarios: FreeTalkScenarioSummary[] | null | undefined
): AssignedPracticeFeedItem[] {
  const safeDrills = drills.filter((assignment) => {
    if (!assignment?.assignmentId || !assignment.drill?.title) return false;
    const practiceType = resolveDrillPracticeType(assignment.drill);
    return !isFreeTalkDrillType(practiceType ?? undefined);
  });
  const safeScenarios = Array.isArray(scenarios)
    ? scenarios.filter((scenario) => scenario?.id && scenario?.title)
    : [];

  const items: AssignedPracticeFeedItem[] = [
    ...safeDrills.map((assignment) => ({
      kind: 'drill' as const,
      assignment,
      sortKey: drillSortKey(assignment),
    })),
    ...safeScenarios.map((scenario) => ({
      kind: 'free_talk' as const,
      scenario,
      sortKey: scenarioSortKey(scenario),
    })),
  ];

  return items.sort((a, b) => {
    const cmp = b.sortKey.localeCompare(a.sortKey);
    if (cmp !== 0) return cmp;
    return feedItemTitle(a).localeCompare(feedItemTitle(b));
  });
}

export function takeAssignedPracticeFeed(
  feed: AssignedPracticeFeedItem[],
  limit: number
): AssignedPracticeFeedItem[] {
  return feed.slice(0, limit);
}
