import { describe, expect, it } from 'vitest';
import type { DrillAssignment } from '@/types/drill.types';
import {
  isCompletedPlanItem,
  pickNextPracticeDrill,
  sortAssignedPlanItems,
} from './learnerAssignedPlan';

function assignment(
  overrides: Partial<DrillAssignment> & Pick<DrillAssignment, 'assignmentId' | 'assignedAt'>,
): DrillAssignment {
  return {
    drill: {
      _id: 'drill-1',
      title: 'Test Drill',
      type: 'vocabulary',
    } as DrillAssignment['drill'],
    assignedBy: 'admin',
    status: 'pending',
    ...overrides,
  };
}

describe('pickNextPracticeDrill', () => {
  it('prefers in-progress drill B over older pending drill A', () => {
    const drillA = assignment({
      assignmentId: 'a',
      assignedAt: '2026-06-01T09:00:00.000Z',
      status: 'pending',
    });
    const drillB = assignment({
      assignmentId: 'b',
      assignedAt: '2026-06-02T09:00:00.000Z',
      status: 'in_progress',
    });

    expect(pickNextPracticeDrill([drillB, drillA])?.assignmentId).toBe('b');
    expect(pickNextPracticeDrill([drillA, drillB])?.assignmentId).toBe('b');
  });

  it('excludes completed drills including via latestAttempt.completedAt', () => {
    const completed = assignment({
      assignmentId: 'done',
      assignedAt: '2026-06-01T09:00:00.000Z',
      status: 'pending',
      latestAttempt: { completedAt: '2026-06-03T12:00:00.000Z' } as DrillAssignment['latestAttempt'],
    });
    const pending = assignment({
      assignmentId: 'open',
      assignedAt: '2026-06-02T09:00:00.000Z',
      status: 'pending',
    });

    expect(isCompletedPlanItem(completed)).toBe(true);
    expect(pickNextPracticeDrill([completed, pending])?.assignmentId).toBe('open');
  });

  it('picks oldest assignedAt when none are in-progress', () => {
    const older = assignment({
      assignmentId: 'older',
      assignedAt: '2026-06-01T09:00:00.000Z',
      status: 'pending',
    });
    const newer = assignment({
      assignmentId: 'newer',
      assignedAt: '2026-06-05T09:00:00.000Z',
      status: 'pending',
    });

    expect(pickNextPracticeDrill([newer, older])?.assignmentId).toBe('older');
    expect(sortAssignedPlanItems([newer, older]).map((d) => d.assignmentId)).toEqual([
      'older',
      'newer',
    ]);
  });
});
