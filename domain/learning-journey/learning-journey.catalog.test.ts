import { describe, expect, it } from 'vitest';
import {
  deriveMissionStates,
  MISSION_COMPLETED_COLOR,
  railSegmentColor,
  type LearningJourneyPartId,
  type PartProgressInput,
} from './learning-journey.catalog';

function progressMap(
  partial: Partial<Record<LearningJourneyPartId, PartProgressInput>>
): Partial<Record<LearningJourneyPartId, PartProgressInput>> {
  return partial;
}

describe('deriveMissionStates', () => {
  it('marks all missions locked when nothing is enrolled', () => {
    const states = deriveMissionStates([], progressMap({}));
    expect(states).toHaveLength(5);
    expect(states.every((s) => s.status === 'locked')).toBe(true);
    expect(states.every((s) => !s.isCurrent)).toBe(true);
  });

  it('marks only the lowest incomplete enrolled mission as current', () => {
    const states = deriveMissionStates(
      [1, 2],
      progressMap({
        1: { completed: 2, total: 10 },
        2: { completed: 1, total: 5 },
      })
    );
    expect(states[0].status).toBe('active');
    expect(states[0].isCurrent).toBe(true);
    expect(states[1].status).toBe('active');
    expect(states[1].isCurrent).toBe(false);
    expect(states[2].status).toBe('locked');
  });

  it('puts journeyComplete on highest enrolled when all enrolled are done', () => {
    const states = deriveMissionStates(
      [1, 2],
      progressMap({
        1: { completed: 10, total: 10 },
        2: { completed: 8, total: 8 },
      })
    );
    expect(states[0].status).toBe('completed');
    expect(states[1].status).toBe('journeyComplete');
    expect(states[2].status).toBe('locked');
    expect(states[3].status).toBe('locked');
    expect(states[4].status).toBe('locked');
    expect(states.every((s) => !s.isCurrent)).toBe(true);
  });

  it('sets M5 to journeyComplete when all five missions are done', () => {
    const full: PartProgressInput = { completed: 1, total: 1 };
    const states = deriveMissionStates(
      [1, 2, 3, 4, 5],
      progressMap({ 1: full, 2: full, 3: full, 4: full, 5: full })
    );
    expect(states.slice(0, 4).every((s) => s.status === 'completed')).toBe(
      true
    );
    expect(states[4].status).toBe('journeyComplete');
    expect(states.every((s) => !s.isCurrent)).toBe(true);
  });

  it('does not show trophy on M5 when only earlier enrolled missions are complete', () => {
    const states = deriveMissionStates(
      [1, 2],
      progressMap({
        1: { completed: 5, total: 5 },
        2: { completed: 4, total: 4 },
      })
    );
    expect(states[4].status).toBe('locked');
    expect(states[1].status).toBe('journeyComplete');
  });

  it('treats enrolled mission with no drills (total 0) as complete at 100%', () => {
    const states = deriveMissionStates(
      [1],
      progressMap({ 1: { completed: 0, total: 0 } })
    );
    expect(states[0].status).toBe('journeyComplete');
    expect(states[0].percent).toBe(100);
    expect(states[0].isCurrent).toBe(false);
    expect(states.slice(1).every((s) => s.status === 'locked')).toBe(true);
  });

  it('sets journeyComplete on highest enrolled when only no-drill missions are assigned', () => {
    const empty: PartProgressInput = { completed: 0, total: 0 };
    const states = deriveMissionStates(
      [1, 2],
      progressMap({ 1: empty, 2: empty })
    );
    expect(states[0].status).toBe('completed');
    expect(states[0].percent).toBe(100);
    expect(states[1].status).toBe('journeyComplete');
    expect(states[1].percent).toBe(100);
    expect(states.slice(2).every((s) => s.status === 'locked')).toBe(true);
    expect(states.every((s) => !s.isCurrent)).toBe(true);
    expect(states.every((s) => s.ctaLabel === null)).toBe(true);
  });

  it('sets Start CTA on every active mission when all enrolled at 0%', () => {
    const zero: PartProgressInput = { completed: 0, total: 5 };
    const states = deriveMissionStates(
      [1, 2, 3, 4, 5],
      progressMap({ 1: zero, 2: zero, 3: zero, 4: zero, 5: zero })
    );
    expect(states.every((s) => s.status === 'active')).toBe(true);
    expect(states.every((s) => s.ctaLabel === 'start')).toBe(true);
    expect(states.every((s) => s.percent === 0)).toBe(true);
    expect(states[0].isCurrent).toBe(true);
    expect(states.slice(1).every((s) => !s.isCurrent)).toBe(true);
  });

  it('sets Continue CTA on every active mission for non-sequential enrollment', () => {
    const states = deriveMissionStates(
      [2, 4],
      progressMap({
        2: { completed: 2, total: 8 },
        4: { completed: 1, total: 8 },
      })
    );
    expect(states[0].status).toBe('locked');
    expect(states[0].ctaLabel).toBeNull();
    expect(states[1].status).toBe('active');
    expect(states[1].ctaLabel).toBe('continue');
    expect(states[1].isCurrent).toBe(true);
    expect(states[2].status).toBe('locked');
    expect(states[3].status).toBe('active');
    expect(states[3].ctaLabel).toBe('continue');
    expect(states[3].isCurrent).toBe(false);
    expect(states[4].status).toBe('locked');
  });

  it('sets Start vs Continue by percent on the current active mission', () => {
    const startStates = deriveMissionStates(
      [1],
      progressMap({ 1: { completed: 0, total: 10 } })
    );
    expect(startStates[0].ctaLabel).toBe('start');

    const continueStates = deriveMissionStates(
      [1],
      progressMap({ 1: { completed: 3, total: 10 } })
    );
    expect(continueStates[0].ctaLabel).toBe('continue');
  });
});

describe('railSegmentColor', () => {
  it('returns green for completed / journeyComplete, accent for active, gray for locked', () => {
    expect(railSegmentColor('completed', '#3b82f6')).toBe(MISSION_COMPLETED_COLOR);
    expect(railSegmentColor('journeyComplete', '#ff7a00')).toBe(
      MISSION_COMPLETED_COLOR
    );
    expect(railSegmentColor('active', '#a855f7')).toBe('#a855f7');
    expect(railSegmentColor('locked', '#3b82f6')).toBe('#e0e0e0');
  });
});
