import { LEARNING_JOURNEY_PARTS, type LearningJourneyPartId } from '@/domain/learning-journey/learning-journey.catalog';
import type { DrillAssignment } from '@/types/drill.types';
import { isFreeTalkDrillType } from '@/types/drill.types';
import { readJourneyFields } from '@/utils/drillAssignment';
import {
  isCompletedPlanItem,
  sortAssignedPlanItems,
} from '@/utils/learnerAssignedPlan';

export type PartProgress = { completed: number; total: number };

export type JourneyTopicGroup = {
  topicId: string;
  topicTitle: string;
  items: DrillAssignment[];
};

export function isFreeTalkPlanItem(item: DrillAssignment): boolean {
  return item.itemType === 'free_talk_scenario' || isFreeTalkDrillType(item.drill?.type);
}

export function getPlanDrillStatus(
  item: DrillAssignment
): 'completed' | 'in-progress' | 'active' {
  if (isCompletedPlanItem(item)) return 'completed';
  const status =
    typeof item.status === 'string'
      ? item.status.trim().toLowerCase().replace(/-/g, '_')
      : '';
  if (status === 'in_progress') return 'in-progress';
  return 'active';
}

function resolvePartForItem(item: DrillAssignment): LearningJourneyPartId | null {
  if (isFreeTalkPlanItem(item)) {
    const scenarioType = item.drill?.scenarioType;
    if (!scenarioType) return null;
    for (const part of LEARNING_JOURNEY_PARTS) {
      if (part.topics.some((t) => t.freeTalkScenarioType === scenarioType)) {
        return part.part;
      }
    }
    return null;
  }

  const { part } = readJourneyFields(item.drill as Record<string, unknown>);
  return part ?? null;
}

export function groupDrillsByJourney(
  drills: DrillAssignment[]
): Map<number, Map<string, DrillAssignment[]>> {
  const result = new Map<number, Map<string, DrillAssignment[]>>();

  for (const part of LEARNING_JOURNEY_PARTS) {
    const topicMap = new Map<string, DrillAssignment[]>();
    for (const topic of part.topics) {
      topicMap.set(topic.id, []);
    }
    result.set(part.part, topicMap);
  }

  for (const item of drills) {
    if (isFreeTalkPlanItem(item)) {
      const scenarioType = item.drill?.scenarioType;
      if (!scenarioType) continue;
      for (const part of LEARNING_JOURNEY_PARTS) {
        for (const topic of part.topics) {
          if (topic.freeTalkScenarioType === scenarioType) {
            result.get(part.part)?.get(topic.id)?.push(item);
          }
        }
      }
    } else {
      const { part, topic: topicId } = readJourneyFields(
        item.drill as Record<string, unknown>
      );
      if (part != null && topicId != null) {
        result.get(part)?.get(topicId)?.push(item);
      }
    }
  }

  for (const topicMap of result.values()) {
    for (const [topicId, items] of topicMap.entries()) {
      topicMap.set(topicId, sortAssignedPlanItems(items));
    }
  }

  return result;
}

export function getDrillsForPart(
  groupedDrills: Map<number, Map<string, DrillAssignment[]>>,
  part: LearningJourneyPartId
): JourneyTopicGroup[] {
  const partDef = LEARNING_JOURNEY_PARTS.find((p) => p.part === part);
  if (!partDef) return [];

  const topicMap = groupedDrills.get(part) ?? new Map();

  return partDef.topics
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((topic) => ({
      topicId: topic.id,
      topicTitle: topic.title,
      items: topicMap.get(topic.id) ?? [],
    }));
}

export function computePartProgress(
  drills: DrillAssignment[]
): Record<LearningJourneyPartId, PartProgress> {
  const progress: Record<number, PartProgress> = {
    1: { completed: 0, total: 0 },
    2: { completed: 0, total: 0 },
    3: { completed: 0, total: 0 },
    4: { completed: 0, total: 0 },
  };

  for (const item of drills) {
    const part = resolvePartForItem(item);
    if (part == null) continue;
    progress[part].total += 1;
    if (isCompletedPlanItem(item)) {
      progress[part].completed += 1;
    }
  }

  return progress as Record<LearningJourneyPartId, PartProgress>;
}

export function getBookmarkedPlanItems(drills: DrillAssignment[]): DrillAssignment[] {
  return sortAssignedPlanItems(drills.filter((item) => item.hasBookmarks === true));
}
