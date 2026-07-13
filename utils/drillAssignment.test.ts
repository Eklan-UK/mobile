import { describe, expect, it } from 'vitest';
import { normalizeDrillAssignment, readJourneyFields, resolveDrillTopicTitle } from './drillAssignment';

describe('resolveDrillTopicTitle', () => {
  it('returns trimmed topic when present', () => {
    expect(resolveDrillTopicTitle({ topicTitle: '  Handling Emergency  ' } as never)).toBe(
      'Handling Emergency'
    );
  });

  it('returns null when missing or empty', () => {
    expect(resolveDrillTopicTitle(null)).toBeNull();
    expect(resolveDrillTopicTitle({ topicTitle: '' } as never)).toBeNull();
    expect(resolveDrillTopicTitle({ topicTitle: '   ' } as never)).toBeNull();
  });
});

describe('normalizeDrillAssignment topicTitle', () => {
  it('preserves topicTitle from nested drill object', () => {
    const row = normalizeDrillAssignment({
      assignmentId: 'a1',
      drill: {
        _id: 'd1',
        title: 'ICU Emergency Vocabulary',
        type: 'vocabulary',
        topicTitle: 'Handling Emergency/Critical Situation',
      },
      assignedAt: '2026-06-01T09:00:00.000Z',
      status: 'pending',
    });

    expect(row?.drill.topicTitle).toBe('Handling Emergency/Critical Situation');
    expect(resolveDrillTopicTitle(row?.drill)).toBe('Handling Emergency/Critical Situation');
  });

  it('reads topic_title snake_case on drill', () => {
    const row = normalizeDrillAssignment({
      assignmentId: 'a2',
      drill: {
        _id: 'd2',
        title: 'ICU Emergency Free Talk',
        type: 'eklan_free_talk',
        scenarioType: 'icu_emergency',
        topic_title: 'Handling Emergency/Critical Situation',
      },
      assignedAt: '2026-06-10T09:00:00.000Z',
      status: 'pending',
      itemType: 'free_talk_scenario',
    });

    expect(row?.drill.topicTitle).toBe('Handling Emergency/Critical Situation');
  });

  it('omits topic line when topicTitle is null', () => {
    const row = normalizeDrillAssignment({
      assignmentId: 'a3',
      drill: {
        _id: 'd3',
        title: 'Unmapped Drill',
        type: 'vocabulary',
        topicTitle: null,
      },
      assignedAt: '2026-06-01T09:00:00.000Z',
      status: 'pending',
    });

    expect(resolveDrillTopicTitle(row?.drill)).toBeNull();
  });
});

describe('readJourneyFields', () => {
  it('accepts learning_journey_part 5', () => {
    expect(readJourneyFields({ learning_journey_part: 5, learning_journey_topic: 'grammar' })).toEqual({
      part: 5,
      topic: 'grammar',
    });
  });

  it('rejects invalid part numbers', () => {
    expect(readJourneyFields({ learning_journey_part: 6 })).toEqual({});
    expect(readJourneyFields({ learning_journey_part: 0 })).toEqual({});
  });
});

describe('normalizeDrillAssignment learning_journey_part 5', () => {
  it('preserves part 5 on drill', () => {
    const row = normalizeDrillAssignment({
      assignmentId: 'a5',
      drill: {
        _id: 'd5',
        title: 'Grammar Drill',
        type: 'vocabulary',
        learning_journey_part: 5,
        learning_journey_topic: 'grammar',
      },
      assignedAt: '2026-06-01T09:00:00.000Z',
      status: 'pending',
    });

    expect(row?.drill.learning_journey_part).toBe(5);
    expect(row?.drill.learning_journey_topic).toBe('grammar');
  });
});
