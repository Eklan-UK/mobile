import { describe, expect, it } from 'vitest';
import type { Drill, RoleplayScene } from '@/types/drill.types';
import { sceneHasStudentLines } from './roleplaySceneHelpers';
import {
  auditRoleplayScenes,
  isValidRoleplaySpeaker,
  normalizeRoleplaySpeaker,
  normalizeSpeakerValue,
  ROLEPLAY_PATTERN_CATALOG,
} from './roleplayDialogueAudit';

function scene(name: string, dialogue: RoleplayScene['dialogue']): RoleplayScene {
  return { scene_name: name, dialogue };
}

function drill(scenes: RoleplayScene[]): Drill {
  return {
    _id: 'd1',
    title: 'Test',
    type: 'roleplay',
    roleplay_scenes: scenes,
  } as Drill;
}

describe('ROLEPLAY_PATTERN_CATALOG', () => {
  it('defines all patterns A1 through A10', () => {
    for (const id of ['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'A9', 'A10']) {
      expect(ROLEPLAY_PATTERN_CATALOG[id as keyof typeof ROLEPLAY_PATTERN_CATALOG]).toBeDefined();
    }
  });
});

describe('isValidRoleplaySpeaker', () => {
  it('accepts student and ai_N', () => {
    expect(isValidRoleplaySpeaker('student')).toBe(true);
    expect(isValidRoleplaySpeaker('ai_0')).toBe(true);
    expect(isValidRoleplaySpeaker('ai_3')).toBe(true);
  });

  it('rejects typos and character names', () => {
    expect(isValidRoleplaySpeaker('Student')).toBe(false);
    expect(isValidRoleplaySpeaker('ai')).toBe(false);
    expect(isValidRoleplaySpeaker('Nurse')).toBe(false);
  });
});

describe('normalizeSpeakerValue', () => {
  it('normalizes common typos', () => {
    expect(normalizeSpeakerValue('Student')).toBe('student');
    expect(normalizeRoleplaySpeaker('AI_0')).toBe('ai_0');
    expect(normalizeSpeakerValue('ai-1')).toBe('ai_1');
  });
});

describe('auditRoleplayScenes', () => {
  it('A1 — detects normal alternation', () => {
    const result = auditRoleplayScenes(
      drill([
        scene('S1', [
          { speaker: 'ai_0', text: 'Hi' },
          { speaker: 'student', text: 'Hello' },
          { speaker: 'ai_0', text: 'Bye' },
          { speaker: 'student', text: 'See you' },
        ]),
      ])
    );
    expect(result.isPlayable).toBe(true);
    expect(result.detectedPatterns).toContain('A1');
  });

  it('A2 — detects consecutive student lines', () => {
    const result = auditRoleplayScenes(
      drill([
        scene('S1', [
          { speaker: 'ai_0', text: 'Q' },
          { speaker: 'student', text: 'A1' },
          { speaker: 'student', text: 'A2' },
        ]),
      ])
    );
    expect(result.detectedPatterns).toContain('A2');
  });

  it('A3 — detects student-first scene', () => {
    const result = auditRoleplayScenes(
      drill([scene('S1', [{ speaker: 'student', text: 'Start' }])])
    );
    expect(result.detectedPatterns).toContain('A3');
  });

  it('A4 — detects trailing AI closing', () => {
    const result = auditRoleplayScenes(
      drill([
        scene('S1', [
          { speaker: 'ai_0', text: 'Hi' },
          { speaker: 'student', text: 'Bye' },
          { speaker: 'ai_0', text: 'Thanks' },
        ]),
      ])
    );
    expect(result.detectedPatterns).toContain('A4');
  });

  it('A5 — warns on AI-only scene', () => {
    const result = auditRoleplayScenes(
      drill([
        scene('AI only', [{ speaker: 'ai_0', text: 'Monologue' }]),
        scene('Playable', [{ speaker: 'student', text: 'Line' }]),
      ])
    );
    expect(result.isPlayable).toBe(true);
    expect(result.detectedPatterns).toContain('A5');
    expect(result.warnings.some((w) => w.patternId === 'A5')).toBe(true);
  });

  it('A6 — warns on empty scene', () => {
    const result = auditRoleplayScenes(
      drill([scene('Empty', []), scene('S2', [{ speaker: 'student', text: 'Hi' }])])
    );
    expect(result.detectedPatterns).toContain('A6');
  });

  it('A7 — detects multiple AI before first student', () => {
    const result = auditRoleplayScenes(
      drill([
        scene('S1', [
          { speaker: 'ai_0', text: 'A' },
          { speaker: 'ai_1', text: 'B' },
          { speaker: 'student', text: 'C' },
        ]),
      ])
    );
    expect(result.detectedPatterns).toContain('A7');
  });

  it('A8 — warns on invalid speakers', () => {
    const result = auditRoleplayScenes(
      drill([
        scene('S1', [
          { speaker: 'Student' as 'student', text: 'Hi' },
          { speaker: 'student', text: 'Ok' },
        ]),
      ])
    );
    expect(result.detectedPatterns).toContain('A8');
    expect(result.warnings.some((w) => w.patternId === 'A8')).toBe(true);
  });

  it('A9 — detects multi-scene last student', () => {
    const result = auditRoleplayScenes(
      drill([
        scene('S1', [
          { speaker: 'ai_0', text: 'Hi' },
          { speaker: 'student', text: 'Bye' },
        ]),
        scene('S2', [{ speaker: 'student', text: 'Next' }]),
      ])
    );
    expect(result.detectedPatterns).toContain('A9');
  });

  it('A10 — blocks drill with no student lines', () => {
    const result = auditRoleplayScenes(
      drill([scene('Empty', []), scene('AI', [{ speaker: 'ai_0', text: 'Only AI' }])])
    );
    expect(result.isPlayable).toBe(false);
    expect(result.detectedPatterns).toContain('A10');
    expect(result.issues.some((i) => i.patternId === 'A10')).toBe(true);
  });
});

describe('sceneHasStudentLines', () => {
  it('returns false for AI-only and empty scenes', () => {
    expect(sceneHasStudentLines(scene('AI', [{ speaker: 'ai_0', text: 'x' }]))).toBe(false);
    expect(sceneHasStudentLines(scene('Empty', []))).toBe(false);
  });
});
