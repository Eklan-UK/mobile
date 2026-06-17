import type { DialogueTurn, Drill, RoleplayScene } from '@/types/drill.types';
import type { TurnProgressMap } from '@/types/roleplay-progress.types';

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
  const line = dialogue[dialogueIndex];
  if (!line) {
    const firstAi = findFirstAiInScene(scene);
    return {
      aiLine: firstAi,
      studentPrompt: findStudentAfterAi(scene, firstAi),
      dialogueIndex: firstAi ? dialogue.indexOf(firstAi) : 0,
    };
  }

  if (line.speaker === 'student') {
    let aiLine: DialogueTurn | null = null;
    for (let i = dialogueIndex - 1; i >= 0; i -= 1) {
      if (dialogue[i].speaker !== 'student') {
        aiLine = dialogue[i];
        break;
      }
    }
    return { aiLine, studentPrompt: line, dialogueIndex };
  }

  const studentPrompt = findStudentAfterAi(scene, line);
  return { aiLine: line, studentPrompt, dialogueIndex };
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
