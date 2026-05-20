import type { DrillAssignment } from '@/types/drill.types';
import type { FreeTalkScenarioSummary } from '@/types/free-talk';

export type AssignedPracticeFeedItem =
  | { kind: 'drill'; assignment: DrillAssignment; sortKey: string }
  | { kind: 'free_talk'; scenario: FreeTalkScenarioSummary; sortKey: string };

function drillSortKey(assignment: DrillAssignment): string {
  return assignment.assignedAt ?? assignment.drill?.date ?? '';
}

function scenarioSortKey(scenario: FreeTalkScenarioSummary): string {
  return scenario.assignedAt ?? '';
}

/** Merge drills and Free Talk scenarios, newest first. */
export function buildAssignedPracticeFeed(
  drills: DrillAssignment[],
  scenarios: FreeTalkScenarioSummary[]
): AssignedPracticeFeedItem[] {
  const items: AssignedPracticeFeedItem[] = [
    ...drills.map((assignment) => ({
      kind: 'drill' as const,
      assignment,
      sortKey: drillSortKey(assignment),
    })),
    ...scenarios.map((scenario) => ({
      kind: 'free_talk' as const,
      scenario,
      sortKey: scenarioSortKey(scenario),
    })),
  ];

  return items.sort((a, b) => {
    const cmp = b.sortKey.localeCompare(a.sortKey);
    if (cmp !== 0) return cmp;
    const titleA =
      a.kind === 'drill' ? a.assignment.drill.title : a.scenario.title;
    const titleB =
      b.kind === 'drill' ? b.assignment.drill.title : b.scenario.title;
    return titleA.localeCompare(titleB);
  });
}

export function takeAssignedPracticeFeed(
  feed: AssignedPracticeFeedItem[],
  limit: number
): AssignedPracticeFeedItem[] {
  return feed.slice(0, limit);
}
