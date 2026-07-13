import type { DialogueTurn, Drill, RoleplayScene } from '@/types/drill.types';
import type { TurnProgressMap } from '@/types/roleplay-progress.types';

export function sceneHasStudentLines(scene: RoleplayScene | null | undefined): boolean {
  return countStudentTurnsInScene(scene) > 0;
}

export function turnKey(sceneIndex: number, studentTurnIndex: number): string {
  return `${sceneIndex}-${studentTurnIndex}`;
}

export function countStudentTurnsInScene(scene: RoleplayScene | null | undefined): number {
  return scene?.dialogue?.filter((d) => d.speaker === 'student').length ?? 0;
}

/** Index among student-only turns in a scene (0-based). */
export function studentTurnIndexInScene(scene: RoleplayScene, prompt: DialogueTurn): number {
  const dialogue = scene.dialogue ?? [];
  let idx = 0;
  for (const line of dialogue) {
    if (line === prompt) return idx;
    if (line.speaker === 'student') idx += 1;
  }
  return idx;
}

export function isStudentTurn(turn: DialogueTurn | null | undefined): boolean {
  return turn?.speaker === 'student';
}

export function findFirstAiInScene(scene: RoleplayScene): DialogueTurn | null {
  return scene.dialogue?.find((d) => d.speaker !== 'student') ?? null;
}

export function findStudentAfterAi(scene: RoleplayScene, aiLine: DialogueTurn | null): DialogueTurn | null {
  const dialogue = scene.dialogue ?? [];
  if (!aiLine) {
    return dialogue.find((d) => d.speaker === 'student') ?? null;
  }
  const aiIdx = dialogue.indexOf(aiLine);
  return dialogue.find((d, i) => i > aiIdx && d.speaker === 'student') ?? null;
}

export function findNextAiAfterStudent(
  scene: RoleplayScene,
  studentPrompt: DialogueTurn
): DialogueTurn | null {
  const dialogue = scene.dialogue ?? [];
  const studentIdx = dialogue.indexOf(studentPrompt);
  if (studentIdx < 0) return null;
  return dialogue.find((d, i) => i > studentIdx && d.speaker !== 'student') ?? null;
}

/** Next student line after `afterPrompt` within the same scene. */
export function findNextStudentInScene(
  scene: RoleplayScene,
  afterPrompt: DialogueTurn
): DialogueTurn | null {
  const dialogue = scene.dialogue ?? [];
  const idx = dialogue.indexOf(afterPrompt);
  if (idx < 0) return null;
  return dialogue.find((d, i) => i > idx && d.speaker === 'student') ?? null;
}

/** First playable position when entering a scene (AI opener or student-first). */
export function findSceneEntryPosition(scene: RoleplayScene): DialoguePosition {
  const dialogue = scene.dialogue ?? [];
  const firstAi = findFirstAiInScene(scene);
  if (firstAi) {
    return {
      aiLine: firstAi,
      studentPrompt: findStudentAfterAi(scene, firstAi),
      dialogueIndex: dialogue.indexOf(firstAi),
    };
  }
  const firstStudent = dialogue.find((d) => d.speaker === 'student') ?? null;
  if (firstStudent) {
    return {
      aiLine: null,
      studentPrompt: firstStudent,
      dialogueIndex: dialogue.indexOf(firstStudent),
    };
  }
  return { aiLine: null, studentPrompt: null, dialogueIndex: 0 };
}

/** Advance from `startIndex` to the next scene that has student lines and playable dialogue. */
export function findNextSceneWithContent(
  scenes: RoleplayScene[],
  startIndex: number
): { sceneIndex: number; position: DialoguePosition } | null {
  for (let i = startIndex; i < scenes.length; i += 1) {
    const scene = scenes[i];
    if (!scene || !sceneHasStudentLines(scene)) continue;
    const position = findSceneEntryPosition(scene);
    if (position.aiLine || position.studentPrompt) {
      return { sceneIndex: i, position };
    }
  }
  return null;
}

/** First playable scene/position for session start (skips empty and AI-only scenes). */
export function findFirstPlayablePosition(
  drill: Drill
): { sceneIndex: number; position: DialoguePosition } | null {
  return findNextSceneWithContent(drill.roleplay_scenes ?? [], 0);
}

function studentIndexAfterDialogueIndex(
  dialogue: DialogueTurn[],
  afterIndex: number
): number {
  for (let i = afterIndex + 1; i < dialogue.length; i += 1) {
    if (dialogue[i].speaker === 'student') return i;
  }
  return -1;
}

function nextAiIndexAfter(dialogue: DialogueTurn[], afterIndex: number): number {
  for (let i = afterIndex + 1; i < dialogue.length; i += 1) {
    if (dialogue[i].speaker !== 'student') return i;
  }
  return -1;
}

function resolveEndOfSceneAdvance(
  drill: Drill,
  sceneIndex: number,
  dialogueIndex: number
): AdvanceAfterPassResult {
  const scenes = drill.roleplay_scenes ?? [];
  const hasMoreScenes = sceneIndex < scenes.length - 1;

  if (scenes.length > 1 && hasMoreScenes) {
    return {
      kind: 'scene_break',
      sceneIndex,
      aiLine: null,
      studentPrompt: null,
      dialogueIndex,
      phase: 'your_turn',
      sceneBreak: { completedSceneIndex: sceneIndex, nextSceneIndex: sceneIndex + 1 },
    };
  }

  if (hasMoreScenes) {
    const next = findNextSceneWithContent(scenes, sceneIndex + 1);
    if (next) {
      const { position } = next;
      return {
        kind: 'next_scene',
        sceneIndex: next.sceneIndex,
        aiLine: position.aiLine,
        studentPrompt: position.studentPrompt,
        dialogueIndex: position.dialogueIndex,
        phase: position.aiLine ? 'ai_speaking' : 'your_turn',
      };
    }
  }

  return {
    kind: 'complete',
    sceneIndex,
    aiLine: null,
    studentPrompt: null,
    dialogueIndex,
    phase: 'your_turn',
  };
}

export type AdvanceAfterPassKind =
  | 'next_turn_same_scene'
  | 'scene_break'
  | 'next_scene'
  | 'complete';

export interface AdvanceAfterPassResult {
  kind: AdvanceAfterPassKind;
  sceneIndex: number;
  aiLine: DialogueTurn | null;
  studentPrompt: DialogueTurn | null;
  dialogueIndex: number;
  phase: 'ai_speaking' | 'your_turn';
  sceneBreak?: { completedSceneIndex: number; nextSceneIndex: number };
}

/** Skip the pass-sheet Continue when the drill is ending or only AI closing lines remain. */
export function shouldSkipPassSheetAfterStudentPass(
  advance: AdvanceAfterPassResult
): boolean {
  if (advance.kind === 'complete') return true;
  return (
    advance.kind === 'next_turn_same_scene' &&
    advance.phase === 'ai_speaking' &&
    advance.studentPrompt === null
  );
}

/**
 * Resolve the next dialogue position after a passed student turn.
 * Handles consecutive student lines, student-first scenes, and empty scenes.
 */
export function resolveAdvanceAfterStudentPassByIndex(
  drill: Drill,
  sceneIndex: number,
  studentDialogueIndex: number
): AdvanceAfterPassResult {
  const scenes = drill.roleplay_scenes ?? [];
  const currentScene = scenes[sceneIndex];
  if (!currentScene) {
    return {
      kind: 'complete',
      sceneIndex,
      aiLine: null,
      studentPrompt: null,
      dialogueIndex: 0,
      phase: 'your_turn',
    };
  }

  const dialogue = currentScene.dialogue ?? [];
  const studentPrompt = dialogue[studentDialogueIndex];
  if (!studentPrompt || studentPrompt.speaker !== 'student') {
    return resolveEndOfSceneAdvance(drill, sceneIndex, Math.max(0, studentDialogueIndex));
  }

  const nextStudentIdx = studentIndexAfterDialogueIndex(dialogue, studentDialogueIndex);
  if (nextStudentIdx >= 0) {
    const nextStudentSameScene = dialogue[nextStudentIdx];
    const aiBetween = dialogue
      .slice(studentDialogueIndex + 1, nextStudentIdx)
      .some((d) => d.speaker !== 'student');
    if (!aiBetween) {
      let aiLine: DialogueTurn | null = null;
      for (let i = nextStudentIdx - 1; i >= 0; i -= 1) {
        if (dialogue[i].speaker !== 'student') {
          aiLine = dialogue[i];
          break;
        }
      }
      return {
        kind: 'next_turn_same_scene',
        sceneIndex,
        aiLine,
        studentPrompt: nextStudentSameScene,
        dialogueIndex: nextStudentIdx,
        phase: 'your_turn',
      };
    }
  }

  const nextAiIdx = nextAiIndexAfter(dialogue, studentDialogueIndex);
  if (nextAiIdx >= 0) {
    const nextAi = dialogue[nextAiIdx];
    const nextStudentIdxAfterAi = studentIndexAfterDialogueIndex(dialogue, nextAiIdx);
    const nextStudent =
      nextStudentIdxAfterAi >= 0 ? dialogue[nextStudentIdxAfterAi] : null;
    return {
      kind: 'next_turn_same_scene',
      sceneIndex,
      aiLine: nextAi,
      studentPrompt: nextStudent,
      dialogueIndex: nextAiIdx,
      phase: 'ai_speaking',
    };
  }

  return resolveEndOfSceneAdvance(drill, sceneIndex, studentDialogueIndex);
}

/** @deprecated Prefer resolveAdvanceAfterStudentPassByIndex with dialogue index. */
export function resolveAdvanceAfterStudentPass(
  drill: Drill,
  sceneIndex: number,
  studentPrompt: DialogueTurn
): AdvanceAfterPassResult {
  const dialogue = drill.roleplay_scenes?.[sceneIndex]?.dialogue ?? [];
  const promptIdx = dialogue.indexOf(studentPrompt);
  if (promptIdx >= 0) {
    return resolveAdvanceAfterStudentPassByIndex(drill, sceneIndex, promptIdx);
  }
  const fallbackIdx = dialogue.findIndex(
    (d) => d.speaker === 'student' && d.text === studentPrompt.text
  );
  return resolveAdvanceAfterStudentPassByIndex(
    drill,
    sceneIndex,
    fallbackIdx >= 0 ? fallbackIdx : 0
  );
}

/**
 * Resolve navigation after an AI line finishes (chains trailing AI-only closings).
 */
export function resolveAdvanceAfterAiLine(
  drill: Drill,
  sceneIndex: number,
  aiDialogueIndex: number
): AdvanceAfterPassResult {
  const scenes = drill.roleplay_scenes ?? [];
  const currentScene = scenes[sceneIndex];
  if (!currentScene) {
    return {
      kind: 'complete',
      sceneIndex,
      aiLine: null,
      studentPrompt: null,
      dialogueIndex: 0,
      phase: 'your_turn',
    };
  }

  const dialogue = currentScene.dialogue ?? [];
  const line = dialogue[aiDialogueIndex];
  if (!line || line.speaker === 'student') {
    return resolveEndOfSceneAdvance(drill, sceneIndex, aiDialogueIndex);
  }

  const nextAiIdx = nextAiIndexAfter(dialogue, aiDialogueIndex);
  const nextStudentIdx = studentIndexAfterDialogueIndex(dialogue, aiDialogueIndex);

  if (nextAiIdx >= 0 && (nextStudentIdx < 0 || nextAiIdx < nextStudentIdx)) {
    const nextAi = dialogue[nextAiIdx];
    const studentAfterNextAi = studentIndexAfterDialogueIndex(dialogue, nextAiIdx);
    return {
      kind: 'next_turn_same_scene',
      sceneIndex,
      aiLine: nextAi,
      studentPrompt: studentAfterNextAi >= 0 ? dialogue[studentAfterNextAi] : null,
      dialogueIndex: nextAiIdx,
      phase: 'ai_speaking',
    };
  }

  if (nextStudentIdx >= 0) {
    return {
      kind: 'next_turn_same_scene',
      sceneIndex,
      aiLine: line,
      studentPrompt: dialogue[nextStudentIdx],
      dialogueIndex: nextStudentIdx,
      phase: 'your_turn',
    };
  }

  return resolveEndOfSceneAdvance(drill, sceneIndex, aiDialogueIndex);
}

/** Skip from a stuck position to the next playable dialogue or complete. */
export function skipToNextPlayablePosition(
  drill: Drill,
  sceneIndex: number,
  dialogueIndex: number
): AdvanceAfterPassResult {
  const scenes = drill.roleplay_scenes ?? [];
  const scene = scenes[sceneIndex];
  if (!scene) {
    return {
      kind: 'complete',
      sceneIndex,
      aiLine: null,
      studentPrompt: null,
      dialogueIndex: 0,
      phase: 'your_turn',
    };
  }

  const dialogue = scene.dialogue ?? [];
  const line = dialogue[dialogueIndex];

  if (!line) {
    const pos = positionAtDialogueIndex(scene, dialogueIndex);
    if (pos.studentPrompt) {
      return {
        kind: 'next_turn_same_scene',
        sceneIndex,
        aiLine: pos.aiLine,
        studentPrompt: pos.studentPrompt,
        dialogueIndex: pos.dialogueIndex,
        phase: 'your_turn',
      };
    }
    if (pos.aiLine) {
      return resolveAdvanceAfterAiLine(drill, sceneIndex, pos.dialogueIndex);
    }
  }

  if (line?.speaker === 'student') {
    return {
      kind: 'next_turn_same_scene',
      sceneIndex,
      aiLine: null,
      studentPrompt: line,
      dialogueIndex,
      phase: 'your_turn',
    };
  }

  if (line && line.speaker !== 'student') {
    return resolveAdvanceAfterAiLine(drill, sceneIndex, dialogueIndex);
  }

  const nextInScene = findNextSceneWithContent(scenes, sceneIndex);
  if (nextInScene && nextInScene.sceneIndex === sceneIndex) {
    const { position } = nextInScene;
    return {
      kind: 'next_turn_same_scene',
      sceneIndex,
      aiLine: position.aiLine,
      studentPrompt: position.studentPrompt,
      dialogueIndex: position.dialogueIndex,
      phase: position.aiLine ? 'ai_speaking' : 'your_turn',
    };
  }

  const nextScene = findNextSceneWithContent(scenes, sceneIndex + 1);
  if (nextScene) {
    const { position } = nextScene;
    return {
      kind: 'next_scene',
      sceneIndex: nextScene.sceneIndex,
      aiLine: position.aiLine,
      studentPrompt: position.studentPrompt,
      dialogueIndex: position.dialogueIndex,
      phase: position.aiLine ? 'ai_speaking' : 'your_turn',
    };
  }

  return {
    kind: 'complete',
    sceneIndex,
    aiLine: null,
    studentPrompt: null,
    dialogueIndex,
    phase: 'your_turn',
  };
}

export function isLastStudentTurnInScene(scene: RoleplayScene, studentPrompt: DialogueTurn): boolean {
  const dialogue = scene.dialogue ?? [];
  const studentIdx = dialogue.indexOf(studentPrompt);
  if (studentIdx < 0) return false;
  return !dialogue.some((d, i) => i > studentIdx && d.speaker === 'student');
}

export function sceneNameAt(drill: Drill, index: number): string {
  return drill.roleplay_scenes?.[index]?.scene_name ?? `Scene ${index + 1}`;
}

export function countCompletedStudentTurns(turnProgress: TurnProgressMap): number {
  return Object.values(turnProgress).filter((e) => e.passed).length;
}

export interface DialoguePosition {
  aiLine: DialogueTurn | null;
  studentPrompt: DialogueTurn | null;
  dialogueIndex: number;
}

/** Resolve AI + student prompt at a dialogue index within a scene. */
export function positionAtDialogueIndex(scene: RoleplayScene, dialogueIndex: number): DialoguePosition {
  const dialogue = scene.dialogue ?? [];
  const clampedIndex = Math.max(0, Math.min(dialogueIndex, Math.max(0, dialogue.length - 1)));
  const line = dialogue[clampedIndex];

  if (!line) {
    if (dialogue.length === 0) {
      return { aiLine: null, studentPrompt: null, dialogueIndex: 0 };
    }
    const firstStudentIdx = dialogue.findIndex((d) => d.speaker === 'student');
    if (firstStudentIdx >= 0) {
      return {
        aiLine: null,
        studentPrompt: dialogue[firstStudentIdx],
        dialogueIndex: firstStudentIdx,
      };
    }
    const firstAi = findFirstAiInScene(scene);
    return {
      aiLine: firstAi,
      studentPrompt: findStudentAfterAi(scene, firstAi),
      dialogueIndex: firstAi ? dialogue.indexOf(firstAi) : 0,
    };
  }

  if (line.speaker === 'student') {
    let aiLine: DialogueTurn | null = null;
    for (let i = clampedIndex - 1; i >= 0; i -= 1) {
      if (dialogue[i].speaker !== 'student') {
        aiLine = dialogue[i];
        break;
      }
    }
    return { aiLine, studentPrompt: line, dialogueIndex: clampedIndex };
  }

  const studentPrompt = findStudentAfterAi(scene, line);
  return { aiLine: line, studentPrompt, dialogueIndex: clampedIndex };
}

export interface CompletedTranscriptLine {
  id: string;
  type: 'ai' | 'user';
  text: string;
  translation?: string;
  score?: number;
}

/** Rebuild transcript bubbles from scenes up to (excluding) active dialogue index. */
export function rebuildTranscriptBeforePosition(
  drill: Drill,
  sceneIndex: number,
  dialogueIndex: number,
  turnProgress: TurnProgressMap
): CompletedTranscriptLine[] {
  const scenes = drill.roleplay_scenes ?? [];
  const messages: CompletedTranscriptLine[] = [];

  for (let s = 0; s <= sceneIndex; s += 1) {
    const scene = scenes[s];
    if (!scene) continue;
    const dialogue = scene.dialogue ?? [];
    const endIdx = s === sceneIndex ? dialogueIndex : dialogue.length;
    let studentTurnIdx = 0;

    for (let i = 0; i < endIdx; i += 1) {
      const line = dialogue[i];
      if (line.speaker === 'student') {
        const key = turnKey(s, studentTurnIdx);
        const progress = turnProgress[key];
        messages.push({
          id: `user-${s}-${studentTurnIdx}`,
          type: 'user',
          text: line.text,
          translation: line.translation,
          score: progress?.score,
        });
        studentTurnIdx += 1;
      } else {
        messages.push({
          id: `ai-${s}-${i}`,
          type: 'ai',
          text: line.text,
          translation: line.translation,
        });
      }
    }
  }

  return messages;
}

export function totalStudentTurnsInDrill(drill: Drill): number {
  return (
    drill.roleplay_scenes?.reduce(
      (n, scene) => n + countStudentTurnsInScene(scene),
      0
    ) ?? 0
  );
}

export interface SimulatedSessionState {
  sceneIndex: number;
  dialogueIndex: number;
  phase: 'ai_speaking' | 'your_turn' | 'scene_break' | 'complete';
  aiLine: DialogueTurn | null;
  studentPrompt: DialogueTurn | null;
  completedStudentTurns: number;
  kind?: AdvanceAfterPassKind;
}

function isStuckState(state: SimulatedSessionState): boolean {
  if (state.phase === 'complete' || state.phase === 'scene_break') return false;
  if (state.phase === 'your_turn' && !state.studentPrompt) return true;
  if (state.phase === 'ai_speaking' && !state.aiLine) return true;
  return false;
}

function applyAdvanceToState(
  advance: AdvanceAfterPassResult,
  completedStudentTurns: number
): SimulatedSessionState {
  if (advance.kind === 'scene_break') {
    return {
      sceneIndex: advance.sceneIndex,
      dialogueIndex: advance.dialogueIndex,
      phase: 'scene_break',
      aiLine: null,
      studentPrompt: null,
      completedStudentTurns,
      kind: advance.kind,
    };
  }
  if (advance.kind === 'complete') {
    return {
      sceneIndex: advance.sceneIndex,
      dialogueIndex: advance.dialogueIndex,
      phase: 'complete',
      aiLine: null,
      studentPrompt: null,
      completedStudentTurns,
      kind: advance.kind,
    };
  }
  return {
    sceneIndex: advance.sceneIndex,
    dialogueIndex: advance.dialogueIndex,
    phase: advance.phase,
    aiLine: advance.aiLine,
    studentPrompt: advance.studentPrompt,
    completedStudentTurns,
    kind: advance.kind,
  };
}

/**
 * Walk an entire roleplay script using navigation helpers only.
 * Asserts the session never reaches a stuck state before completion.
 */
export function simulateRoleplaySession(drill: Drill): {
  finalState: SimulatedSessionState;
  steps: SimulatedSessionState[];
  stuckAtStep: number | null;
} {
  const steps: SimulatedSessionState[] = [];
  const totalTurns = totalStudentTurnsInDrill(drill);
  const start = findFirstPlayablePosition(drill);

  if (!start) {
    const finalState: SimulatedSessionState = {
      sceneIndex: 0,
      dialogueIndex: 0,
      phase: 'complete',
      aiLine: null,
      studentPrompt: null,
      completedStudentTurns: 0,
      kind: 'complete',
    };
    return { finalState, steps, stuckAtStep: null };
  }

  let state: SimulatedSessionState = {
    sceneIndex: start.sceneIndex,
    dialogueIndex: start.position.dialogueIndex,
    phase: start.position.aiLine ? 'ai_speaking' : 'your_turn',
    aiLine: start.position.aiLine,
    studentPrompt: start.position.studentPrompt,
    completedStudentTurns: 0,
  };
  steps.push({ ...state });

  let guard = 0;
  const maxSteps = totalTurns * 20 + 50;

  while (state.phase !== 'complete' && guard < maxSteps) {
    guard += 1;

    if (isStuckState(state)) {
      return { finalState: state, steps, stuckAtStep: steps.length - 1 };
    }

    if (state.phase === 'ai_speaking') {
      const advance = resolveAdvanceAfterAiLine(drill, state.sceneIndex, state.dialogueIndex);
      if (advance.phase === 'ai_speaking' && advance.aiLine) {
        state = applyAdvanceToState(advance, state.completedStudentTurns);
      } else if (advance.kind === 'scene_break' || advance.kind === 'complete' || advance.kind === 'next_scene') {
        state = applyAdvanceToState(advance, state.completedStudentTurns);
        if (advance.kind === 'next_scene') continue;
        if (advance.kind === 'scene_break') {
          const scenes = drill.roleplay_scenes ?? [];
          const next = findNextSceneWithContent(scenes, (advance.sceneBreak?.nextSceneIndex ?? state.sceneIndex + 1));
          if (!next) {
            state = {
              sceneIndex: state.sceneIndex,
              dialogueIndex: 0,
              phase: 'complete',
              aiLine: null,
              studentPrompt: null,
              completedStudentTurns: state.completedStudentTurns,
              kind: 'complete',
            };
          } else {
            state = {
              sceneIndex: next.sceneIndex,
              dialogueIndex: next.position.dialogueIndex,
              phase: next.position.aiLine ? 'ai_speaking' : 'your_turn',
              aiLine: next.position.aiLine,
              studentPrompt: next.position.studentPrompt,
              completedStudentTurns: state.completedStudentTurns,
              kind: 'next_scene',
            };
          }
        }
      } else {
        state = {
          ...state,
          phase: 'your_turn',
          studentPrompt: advance.studentPrompt,
          dialogueIndex: advance.dialogueIndex,
        };
      }
      steps.push({ ...state });
      continue;
    }

    if (state.phase === 'scene_break') {
      const scenes = drill.roleplay_scenes ?? [];
      const next = findNextSceneWithContent(scenes, state.sceneIndex + 1);
      if (!next) {
        state = {
          sceneIndex: state.sceneIndex,
          dialogueIndex: 0,
          phase: 'complete',
          aiLine: null,
          studentPrompt: null,
          completedStudentTurns: state.completedStudentTurns,
          kind: 'complete',
        };
      } else {
        state = {
          sceneIndex: next.sceneIndex,
          dialogueIndex: next.position.dialogueIndex,
          phase: next.position.aiLine ? 'ai_speaking' : 'your_turn',
          aiLine: next.position.aiLine,
          studentPrompt: next.position.studentPrompt,
          completedStudentTurns: state.completedStudentTurns,
          kind: 'next_scene',
        };
      }
      steps.push({ ...state });
      continue;
    }

    if (state.phase === 'your_turn' && state.studentPrompt) {
      const scene = drill.roleplay_scenes?.[state.sceneIndex];
      const dialogue = scene?.dialogue ?? [];
      const studentIdx =
        state.dialogueIndex >= 0 && dialogue[state.dialogueIndex]?.speaker === 'student'
          ? state.dialogueIndex
          : dialogue.indexOf(state.studentPrompt);
      const advance = resolveAdvanceAfterStudentPassByIndex(drill, state.sceneIndex, studentIdx);
      const nextCompleted = state.completedStudentTurns + 1;
      state = applyAdvanceToState(advance, nextCompleted);
      if (advance.kind === 'scene_break') {
        const scenes = drill.roleplay_scenes ?? [];
        const next = findNextSceneWithContent(scenes, (advance.sceneBreak?.nextSceneIndex ?? state.sceneIndex + 1));
        if (!next) {
          state = {
            sceneIndex: state.sceneIndex,
            dialogueIndex: 0,
            phase: 'complete',
            aiLine: null,
            studentPrompt: null,
            completedStudentTurns: nextCompleted,
            kind: 'complete',
          };
        } else {
          state = {
            sceneIndex: next.sceneIndex,
            dialogueIndex: next.position.dialogueIndex,
            phase: next.position.aiLine ? 'ai_speaking' : 'your_turn',
            aiLine: next.position.aiLine,
            studentPrompt: next.position.studentPrompt,
            completedStudentTurns: nextCompleted,
            kind: 'next_scene',
          };
        }
      }
      steps.push({ ...state });
      continue;
    }

    return { finalState: state, steps, stuckAtStep: steps.length - 1 };
  }

  if (state.phase !== 'complete') {
    return { finalState: state, steps, stuckAtStep: steps.length - 1 };
  }

  return { finalState: state, steps, stuckAtStep: null };
}
