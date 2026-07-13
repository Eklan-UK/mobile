import { describe, expect, it } from 'vitest';
import type { Drill, RoleplayScene } from '@/types/drill.types';
import {
  findFirstPlayablePosition,
  findNextSceneWithContent,
  findSceneEntryPosition,
  resolveAdvanceAfterAiLine,
  resolveAdvanceAfterStudentPass,
  resolveAdvanceAfterStudentPassByIndex,
  shouldSkipPassSheetAfterStudentPass,
  simulateRoleplaySession,
  skipToNextPlayablePosition,
} from './roleplaySceneHelpers';

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

describe('findSceneEntryPosition', () => {
  it('returns AI opener when scene starts with AI', () => {
    const s = scene('S1', [
      { speaker: 'ai_0', text: 'Hello' },
      { speaker: 'student', text: 'Hi' },
    ]);
    const pos = findSceneEntryPosition(s);
    expect(pos.aiLine?.text).toBe('Hello');
    expect(pos.studentPrompt?.text).toBe('Hi');
    expect(pos.dialogueIndex).toBe(0);
  });

  it('returns student-first position when scene has no AI', () => {
    const s = scene('S1', [
      { speaker: 'student', text: 'Line 1' },
      { speaker: 'student', text: 'Line 2' },
    ]);
    const pos = findSceneEntryPosition(s);
    expect(pos.aiLine).toBeNull();
    expect(pos.studentPrompt?.text).toBe('Line 1');
    expect(pos.dialogueIndex).toBe(0);
  });
});

describe('resolveAdvanceAfterStudentPass', () => {
  it('advances to next student when consecutive student lines have no AI between', () => {
    const d = drill([
      scene('S1', [
        { speaker: 'ai_0', text: 'Q' },
        { speaker: 'student', text: 'A1' },
        { speaker: 'student', text: 'A2' },
      ]),
    ]);
    const result = resolveAdvanceAfterStudentPassByIndex(d, 0, 1);
    expect(result.kind).toBe('next_turn_same_scene');
    expect(result.phase).toBe('your_turn');
    expect(result.studentPrompt?.text).toBe('A2');
    expect(result.dialogueIndex).toBe(2);
  });

  it('does not complete early when more student lines remain', () => {
    const d = drill([
      scene('S1', [
        { speaker: 'ai_0', text: 'Q' },
        { speaker: 'student', text: 'A1' },
        { speaker: 'student', text: 'A2' },
        { speaker: 'ai_0', text: 'Thanks' },
        { speaker: 'student', text: 'A3' },
      ]),
    ]);
    const result = resolveAdvanceAfterStudentPassByIndex(d, 0, 1);
    expect(result.kind).not.toBe('complete');
    expect(result.studentPrompt?.text).toBe('A2');
  });

  it('enters scene_break at end of multi-scene drill', () => {
    const d = drill([
      scene('S1', [
        { speaker: 'ai_0', text: 'Hi' },
        { speaker: 'student', text: 'Bye' },
      ]),
      scene('S2', [
        { speaker: 'ai_0', text: 'Next' },
        { speaker: 'student', text: 'Ok' },
      ]),
    ]);
    const result = resolveAdvanceAfterStudentPass(d, 0, d.roleplay_scenes![0].dialogue![1]);
    expect(result.kind).toBe('scene_break');
    expect(result.sceneBreak).toEqual({ completedSceneIndex: 0, nextSceneIndex: 1 });
  });

  it('completes when last student line in single-scene drill', () => {
    const d = drill([
      scene('S1', [
        { speaker: 'ai_0', text: 'Hi' },
        { speaker: 'student', text: 'Bye' },
      ]),
    ]);
    const result = resolveAdvanceAfterStudentPass(d, 0, d.roleplay_scenes![0].dialogue![1]);
    expect(result.kind).toBe('complete');
  });
});

describe('shouldSkipPassSheetAfterStudentPass', () => {
  it('skips pass sheet when drill is complete', () => {
    expect(
      shouldSkipPassSheetAfterStudentPass({
        kind: 'complete',
        sceneIndex: 0,
        aiLine: null,
        studentPrompt: null,
        dialogueIndex: 1,
        phase: 'your_turn',
      })
    ).toBe(true);
  });

  it('skips pass sheet for trailing AI-only closing', () => {
    expect(
      shouldSkipPassSheetAfterStudentPass({
        kind: 'next_turn_same_scene',
        sceneIndex: 0,
        aiLine: { speaker: 'ai_0', text: 'Thanks' },
        studentPrompt: null,
        dialogueIndex: 2,
        phase: 'ai_speaking',
      })
    ).toBe(true);
  });

  it('shows pass sheet when another student turn follows', () => {
    expect(
      shouldSkipPassSheetAfterStudentPass({
        kind: 'next_turn_same_scene',
        sceneIndex: 0,
        aiLine: { speaker: 'ai_0', text: 'Next' },
        studentPrompt: { speaker: 'student', text: 'Reply' },
        dialogueIndex: 2,
        phase: 'ai_speaking',
      })
    ).toBe(false);
  });
});

describe('resolveAdvanceAfterAiLine', () => {
  it('A4 — chains trailing AI to scene break / complete', () => {
    const d = drill([
      scene('S1', [
        { speaker: 'ai_0', text: 'Hi' },
        { speaker: 'student', text: 'Bye' },
        { speaker: 'ai_0', text: 'Thanks' },
      ]),
    ]);
    const passResult = resolveAdvanceAfterStudentPassByIndex(d, 0, 1);
    expect(passResult.phase).toBe('ai_speaking');
    expect(passResult.studentPrompt).toBeNull();

    const afterAi = resolveAdvanceAfterAiLine(d, 0, 2);
    expect(afterAi.kind).toBe('complete');
    expect(afterAi.phase).toBe('your_turn');
    expect(afterAi.studentPrompt).toBeNull();
  });

  it('A7 — chains to next AI when no student follows', () => {
    const d = drill([
      scene('S1', [
        { speaker: 'ai_0', text: 'A' },
        { speaker: 'ai_1', text: 'B' },
        { speaker: 'student', text: 'C' },
      ]),
    ]);
    const afterFirstAi = resolveAdvanceAfterAiLine(d, 0, 0);
    expect(afterFirstAi.phase).toBe('ai_speaking');
    expect(afterFirstAi.aiLine?.text).toBe('B');
    expect(afterFirstAi.dialogueIndex).toBe(1);
  });

  it('returns your_turn when student follows AI', () => {
    const d = drill([
      scene('S1', [
        { speaker: 'ai_0', text: 'Hi' },
        { speaker: 'student', text: 'Hello' },
      ]),
    ]);
    const result = resolveAdvanceAfterAiLine(d, 0, 0);
    expect(result.phase).toBe('your_turn');
    expect(result.studentPrompt?.text).toBe('Hello');
  });
});

describe('findNextSceneWithContent', () => {
  it('skips empty scenes', () => {
    const scenes = [
      scene('Empty', []),
      scene('S2', [{ speaker: 'student', text: 'Start' }]),
    ];
    const next = findNextSceneWithContent(scenes, 0);
    expect(next?.sceneIndex).toBe(1);
    expect(next?.position.studentPrompt?.text).toBe('Start');
    expect(next?.position.aiLine).toBeNull();
  });

  it('skips AI-only scenes', () => {
    const scenes = [
      scene('S1', [{ speaker: 'ai_0', text: 'Done' }]),
      scene('S2', [{ speaker: 'student', text: 'Your line' }]),
    ];
    const next = findNextSceneWithContent(scenes, 0);
    expect(next?.sceneIndex).toBe(1);
    expect(next?.position.studentPrompt?.text).toBe('Your line');
  });
});

describe('findFirstPlayablePosition', () => {
  it('A6 — skips empty first scene', () => {
    const d = drill([
      scene('Empty', []),
      scene('S2', [{ speaker: 'student', text: 'Start' }]),
    ]);
    const first = findFirstPlayablePosition(d);
    expect(first?.sceneIndex).toBe(1);
    expect(first?.position.studentPrompt?.text).toBe('Start');
  });

  it('A5 — skips AI-only first scene', () => {
    const d = drill([
      scene('AI', [{ speaker: 'ai_0', text: 'Monologue' }]),
      scene('S2', [
        { speaker: 'ai_0', text: 'Hi' },
        { speaker: 'student', text: 'Hello' },
      ]),
    ]);
    const first = findFirstPlayablePosition(d);
    expect(first?.sceneIndex).toBe(1);
  });

  it('returns null when no playable scenes', () => {
    const d = drill([scene('AI', [{ speaker: 'ai_0', text: 'x' }])]);
    expect(findFirstPlayablePosition(d)).toBeNull();
  });
});

describe('skipToNextPlayablePosition', () => {
  it('recovers from stuck index with no line', () => {
    const d = drill([
      scene('S1', [
        { speaker: 'ai_0', text: 'Hi' },
        { speaker: 'student', text: 'Hello' },
      ]),
    ]);
    const result = skipToNextPlayablePosition(d, 0, 99);
    expect(result.studentPrompt?.text).toBe('Hello');
    expect(result.phase).toBe('your_turn');
  });
});

describe('simulateRoleplaySession', () => {
  const patterns: Array<{ name: string; scenes: RoleplayScene[]; expectedTurns: number }> = [
    {
      name: 'A1 normal alternation',
      scenes: [
        scene('S1', [
          { speaker: 'ai_0', text: 'Hi' },
          { speaker: 'student', text: 'Hello' },
          { speaker: 'ai_0', text: 'Bye' },
          { speaker: 'student', text: 'See you' },
        ]),
      ],
      expectedTurns: 2,
    },
    {
      name: 'A2 consecutive students',
      scenes: [
        scene('S1', [
          { speaker: 'ai_0', text: 'Q' },
          { speaker: 'student', text: 'A1' },
          { speaker: 'student', text: 'A2' },
        ]),
      ],
      expectedTurns: 2,
    },
    {
      name: 'A3 student-first',
      scenes: [scene('S1', [{ speaker: 'student', text: 'Start' }, { speaker: 'student', text: 'Next' }])],
      expectedTurns: 2,
    },
    {
      name: 'A4 trailing AI closing',
      scenes: [
        scene('S1', [
          { speaker: 'ai_0', text: 'Hi' },
          { speaker: 'student', text: 'Bye' },
          { speaker: 'ai_0', text: 'Thanks' },
        ]),
      ],
      expectedTurns: 1,
    },
    {
      name: 'A5 AI-only between student scenes',
      scenes: [
        scene('S1', [
          { speaker: 'ai_0', text: 'Hi' },
          { speaker: 'student', text: 'A' },
        ]),
        scene('AI', [{ speaker: 'ai_0', text: 'skip' }]),
        scene('S3', [{ speaker: 'student', text: 'B' }]),
      ],
      expectedTurns: 2,
    },
    {
      name: 'A6 empty then content',
      scenes: [scene('Empty', []), scene('S2', [{ speaker: 'student', text: 'Hi' }])],
      expectedTurns: 1,
    },
    {
      name: 'A7 multiple AI before student',
      scenes: [
        scene('S1', [
          { speaker: 'ai_0', text: 'A' },
          { speaker: 'ai_1', text: 'B' },
          { speaker: 'student', text: 'C' },
        ]),
      ],
      expectedTurns: 1,
    },
    {
      name: 'A9 multi-scene',
      scenes: [
        scene('S1', [
          { speaker: 'ai_0', text: 'Hi' },
          { speaker: 'student', text: 'Bye' },
        ]),
        scene('S2', [
          { speaker: 'ai_0', text: 'Next' },
          { speaker: 'student', text: 'Ok' },
        ]),
      ],
      expectedTurns: 2,
    },
  ];

  for (const { name, scenes, expectedTurns } of patterns) {
    it(`never sticks — ${name}`, () => {
      const d = drill(scenes);
      const { finalState, stuckAtStep } = simulateRoleplaySession(d);
      expect(stuckAtStep).toBeNull();
      expect(finalState.phase).toBe('complete');
      expect(finalState.completedStudentTurns).toBe(expectedTurns);
    });
  }

  it('A10 — unplayable drill completes with zero turns', () => {
    const d = drill([scene('Empty', [])]);
    const { finalState, stuckAtStep } = simulateRoleplaySession(d);
    expect(stuckAtStep).toBeNull();
    expect(finalState.completedStudentTurns).toBe(0);
  });
});
