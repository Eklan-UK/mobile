import {
  LEARNING_JOURNEY_PARTS,
  type LearningJourneyPartId,
} from '@/domain/learning-journey/learning-journey.catalog';

function normalizeTitle(value: string): string {
  return value
    .toLowerCase()
    .replace(/[''`]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

/** Scenario name is the drill title before the " - Type" suffix. */
function extractScenarioTitle(drillTitle: string): string {
  const dashIndex = drillTitle.indexOf(' - ');
  return (dashIndex >= 0 ? drillTitle.slice(0, dashIndex) : drillTitle).trim();
}

/**
 * When my-drills omits learning_journey_part/topic, infer placement from the
 * drill title prefix against catalog topic titles (longest match wins).
 */
export function inferJourneyFromDrillTitle(
  drillTitle: string
): { part: LearningJourneyPartId; topicId: string; scenarioType?: string } | null {
  const normalizedScenario = normalizeTitle(extractScenarioTitle(drillTitle));
  if (!normalizedScenario) return null;

  let best: {
    part: LearningJourneyPartId;
    topicId: string;
    scenarioType?: string;
    score: number;
  } | null = null;

  for (const partDef of LEARNING_JOURNEY_PARTS) {
    for (const topic of partDef.topics) {
      const normalizedTopic = normalizeTitle(topic.title);
      const matches =
        normalizedScenario === normalizedTopic ||
        normalizedScenario.startsWith(normalizedTopic) ||
        normalizedTopic.startsWith(normalizedScenario);
      if (!matches) continue;

      const score = normalizedTopic.length;
      if (!best || score > best.score) {
        best = {
          part: partDef.part,
          topicId: topic.id,
          scenarioType: topic.freeTalkScenarioType,
          score,
        };
      }
    }
  }

  return best
    ? { part: best.part, topicId: best.topicId, scenarioType: best.scenarioType }
    : null;
}
