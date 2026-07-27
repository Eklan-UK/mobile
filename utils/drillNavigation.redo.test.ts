import { describe, expect, it } from 'vitest';
import { buildDrillPracticeUrl, isRedoSearchParam } from './drillNavigation';

describe('buildDrillPracticeUrl', () => {
  it('appends assignmentId and redo=true', () => {
    expect(
      buildDrillPracticeUrl('/practice/drills/vocabulary', 'drill1', {
        assignmentId: 'asg1',
        redo: true,
      })
    ).toBe('/practice/drills/vocabulary/drill1?assignmentId=asg1&redo=true');
  });

  it('omits redo when not requested', () => {
    expect(
      buildDrillPracticeUrl('/practice/drills/roleplay', 'drill2', {
        assignmentId: 'asg2',
      })
    ).toBe('/practice/drills/roleplay/drill2?assignmentId=asg2');
  });
});

describe('isRedoSearchParam', () => {
  it('accepts true / 1 and array forms', () => {
    expect(isRedoSearchParam('true')).toBe(true);
    expect(isRedoSearchParam('1')).toBe(true);
    expect(isRedoSearchParam(['true'])).toBe(true);
    expect(isRedoSearchParam('false')).toBe(false);
    expect(isRedoSearchParam(undefined)).toBe(false);
  });
});
