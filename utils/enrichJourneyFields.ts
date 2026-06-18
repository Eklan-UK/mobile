import { inferJourneyFromDrillTitle } from '@/domain/learning-journey/infer-journey-from-title';
import apiClient from '@/lib/api';
import type { DrillAssignment } from '@/types/drill.types';
import { isFreeTalkDrillType } from '@/types/drill.types';
import { readJourneyFields, shouldFetchDrillDetail } from '@/utils/drillAssignment';
import { isAxiosError } from 'axios';

const DETAIL_FETCH_CONCURRENCY = 8;

function hasJourneyPlacement(item: DrillAssignment): boolean {
  const { part, topic } = readJourneyFields(item.drill as Record<string, unknown>);
  return part != null && topic != null;
}

async function fetchDrillJourneyFields(
  assignment: DrillAssignment
): Promise<{ part?: 1 | 2 | 3 | 4; topic?: string } | null> {
  if (!shouldFetchDrillDetail(assignment.drill)) return null;
  const url = assignment.assignmentId
    ? `/api/v1/drills/${assignment.drill._id}?assignmentId=${assignment.assignmentId}`
    : `/api/v1/drills/${assignment.drill._id}`;
  try {
    const response = await apiClient.get(url);
    const data = response.data.data || response.data;
    const drill = data.drill || data;
    return readJourneyFields(drill as Record<string, unknown>);
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 404) return null;
    return null;
  }
}

async function mapWithConcurrency<T>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<void>
): Promise<void> {
  let index = 0;
  async function worker() {
    while (index < items.length) {
      const current = index++;
      await fn(items[current]);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker())
  );
}

/**
 * my-drills listing may omit learning_journey_part/topic. Prefer full drill
 * detail when available; otherwise infer from drill title + catalog.
 */
export async function enrichAssignmentsWithJourneyFields(
  assignments: DrillAssignment[]
): Promise<DrillAssignment[]> {
  const missing = assignments.filter((item) => !hasJourneyPlacement(item));
  if (missing.length === 0) return assignments;

  const uniqueByDrillId = new Map<string, DrillAssignment>();
  for (const item of missing) {
    if (!uniqueByDrillId.has(item.drill._id)) {
      uniqueByDrillId.set(item.drill._id, item);
    }
  }
  const uniqueAssignments = [...uniqueByDrillId.values()];

  const detailFieldsByDrillId = new Map<
    string,
    { part: 1 | 2 | 3 | 4; topic: string }
  >();

  const probe = await fetchDrillJourneyFields(uniqueAssignments[0]);
  if (probe?.part != null && probe.topic != null) {
    await mapWithConcurrency(uniqueAssignments, DETAIL_FETCH_CONCURRENCY, async (item) => {
      const fields = await fetchDrillJourneyFields(item);
      if (fields?.part != null && fields.topic != null) {
        detailFieldsByDrillId.set(item.drill._id, {
          part: fields.part,
          topic: fields.topic,
        });
      }
    });
  }

  for (const item of assignments) {
    if (hasJourneyPlacement(item)) continue;

    const fromApi = detailFieldsByDrillId.get(item.drill._id);
    if (fromApi) {
      item.drill.learning_journey_part = fromApi.part;
      item.drill.learning_journey_topic = fromApi.topic;
      continue;
    }

    const inferred = inferJourneyFromDrillTitle(item.drill.title);
    if (inferred) {
      item.drill.learning_journey_part = inferred.part;
      item.drill.learning_journey_topic = inferred.topicId;
      if (
        isFreeTalkDrillType(item.drill.type) &&
        inferred.scenarioType &&
        !item.drill.scenarioType
      ) {
        item.drill.scenarioType = inferred.scenarioType;
      }
    }
  }

  return assignments;
}
