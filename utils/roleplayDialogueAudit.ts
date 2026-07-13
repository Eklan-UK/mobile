import type { DialogueTurn, Drill, RoleplayScene } from '@/types/drill.types';
import { countStudentTurnsInScene } from './roleplaySceneHelpers';

/** Dialogue pattern catalog — expected navigation outcomes for audit/tests. */
export const ROLEPLAY_PATTERN_CATALOG = {
  A1: 'AI → student → AI → student (normal alternation)',
  A2: 'AI → student → student (second student your_turn)',
  A3: 'student → student, no AI (student-first your_turn)',
  A4: 'student (last) → AI closing (auto-chain to scene break/complete)',
  A5: 'AI-only scene (skip scene)',
  A6: 'Empty scene (skip scene)',
  A7: 'Multiple AI before first student (play AI chain → first student)',
  A8: 'Invalid speaker typos (warn / normalize)',
  A9: 'Multi-scene, last student in scene 1 (scene_break)',
  A10: 'All scenes empty / no student lines (block start)',
} as const;

export type RoleplayPatternId = keyof typeof ROLEPLAY_PATTERN_CATALOG;

export interface RoleplayAuditIssue {
  code: string;
  patternId?: RoleplayPatternId;
  sceneIndex?: number;
  dialogueIndex?: number;
  message: string;
}

export interface RoleplayAuditResult {
  issues: RoleplayAuditIssue[];
  warnings: RoleplayAuditIssue[];
  detectedPatterns: RoleplayPatternId[];
  isPlayable: boolean;
  totalStudentTurns: number;
  playableSceneCount: number;
}

const AI_SPEAKER_PATTERN = /^ai_\d+$/;

export function isValidRoleplaySpeaker(speaker: string): boolean {
  return speaker === 'student' || AI_SPEAKER_PATTERN.test(speaker);
}

/** Normalize common speaker typos; returns null if unrecoverable. */
export function normalizeRoleplaySpeaker(speaker: string): DialogueTurn['speaker'] | null {
  if (speaker === 'student' || AI_SPEAKER_PATTERN.test(speaker)) {
    return speaker as DialogueTurn['speaker'];
  }
  const trimmed = speaker.trim();
  const lower = trimmed.toLowerCase();
  if (lower === 'student') return 'student';
  if (lower === 'ai' || lower === 'ai_0') return 'ai_0';
  const aiMatch = lower.match(/^ai[_-]?(\d+)$/);
  if (aiMatch) {
    const n = Number(aiMatch[1]);
    if (n >= 0 && n <= 3) return `ai_${n}` as DialogueTurn['speaker'];
  }
  return null;
}

/** @alias normalizeRoleplaySpeaker */
export const normalizeSpeakerValue = normalizeRoleplaySpeaker;

function detectScenePatterns(
  scene: RoleplayScene,
  sceneIndex: number,
  totalScenes: number
): RoleplayPatternId[] {
  const patterns = new Set<RoleplayPatternId>();
  const dialogue = scene.dialogue ?? [];
  if (dialogue.length === 0) {
    patterns.add('A6');
    return [...patterns];
  }

  const studentCount = dialogue.filter((d) => d.speaker === 'student').length;
  if (studentCount === 0) {
    patterns.add('A5');
    return [...patterns];
  }

  for (const line of dialogue) {
    if (!isValidRoleplaySpeaker(line.speaker)) {
      patterns.add('A8');
    }
  }

  const firstStudentIdx = dialogue.findIndex((d) => d.speaker === 'student');
  const aiBeforeFirst = dialogue
    .slice(0, firstStudentIdx)
    .filter((d) => d.speaker !== 'student').length;
  if (aiBeforeFirst > 1) patterns.add('A7');
  if (dialogue[0]?.speaker === 'student') patterns.add('A3');
  if (
    dialogue[0]?.speaker !== 'student' &&
    dialogue[1]?.speaker === 'student' &&
    dialogue[2]?.speaker === 'student'
  ) {
    patterns.add('A2');
  }

  const lastStudentIdx = dialogue.reduce(
    (last, d, i) => (d.speaker === 'student' ? i : last),
    -1
  );
  const trailingAi = dialogue.slice(lastStudentIdx + 1).some((d) => d.speaker !== 'student');
  if (trailingAi) patterns.add('A4');

  if (studentCount >= 2 && dialogue[0]?.speaker !== 'student') {
    patterns.add('A1');
  }

  if (totalScenes > 1 && sceneIndex < totalScenes - 1 && lastStudentIdx >= 0) {
    patterns.add('A9');
  }

  return [...patterns];
}

export function auditRoleplayScenes(drill: Drill): RoleplayAuditResult {
  const scenes = drill.roleplay_scenes ?? [];
  const issues: RoleplayAuditIssue[] = [];
  const warnings: RoleplayAuditIssue[] = [];
  const detectedPatterns = new Set<RoleplayPatternId>();

  let totalStudentTurns = 0;
  let playableSceneCount = 0;

  if (scenes.length === 0) {
    issues.push({
      code: 'no_scenes',
      patternId: 'A10',
      message: 'Roleplay has no scenes.',
    });
    detectedPatterns.add('A10');
    return {
      issues,
      warnings,
      detectedPatterns: [...detectedPatterns],
      isPlayable: false,
      totalStudentTurns: 0,
      playableSceneCount: 0,
    };
  }

  for (let sceneIndex = 0; sceneIndex < scenes.length; sceneIndex += 1) {
    const scene = scenes[sceneIndex];
    const dialogue = scene?.dialogue ?? [];
    const studentCount = countStudentTurnsInScene(scene);

    for (const patternId of detectScenePatterns(scene, sceneIndex, scenes.length)) {
      detectedPatterns.add(patternId);
    }

    if (dialogue.length === 0) {
      warnings.push({
        code: 'empty_scene',
        patternId: 'A6',
        sceneIndex,
        message: `Scene "${scene?.scene_name ?? sceneIndex + 1}" has no dialogue and will be skipped.`,
      });
      continue;
    }

    let invalidSpeakers = 0;
    for (let dialogueIndex = 0; dialogueIndex < dialogue.length; dialogueIndex += 1) {
      const line = dialogue[dialogueIndex];
      if (!isValidRoleplaySpeaker(line.speaker)) {
        invalidSpeakers += 1;
        const normalized = normalizeRoleplaySpeaker(line.speaker);
        if (normalized) {
          warnings.push({
            code: 'invalid_speaker_normalized',
            patternId: 'A8',
            sceneIndex,
            dialogueIndex,
            message: `Scene ${sceneIndex + 1} line ${dialogueIndex + 1}: speaker "${line.speaker}" can be normalized to "${normalized}".`,
          });
        } else {
          issues.push({
            code: 'invalid_speaker',
            patternId: 'A8',
            sceneIndex,
            dialogueIndex,
            message: `Scene ${sceneIndex + 1} line ${dialogueIndex + 1}: unrecognized speaker "${line.speaker}".`,
          });
        }
      }
    }

    if (studentCount === 0) {
      warnings.push({
        code: 'ai_only_scene',
        patternId: 'A5',
        sceneIndex,
        message: `Scene "${scene?.scene_name ?? sceneIndex + 1}" has no student lines and will be skipped.`,
      });
      continue;
    }

    if (invalidSpeakers > 0 && invalidSpeakers === dialogue.length) {
      continue;
    }

    totalStudentTurns += studentCount;
    playableSceneCount += 1;
  }

  if (playableSceneCount === 0 || totalStudentTurns === 0) {
    issues.push({
      code: 'no_playable_content',
      patternId: 'A10',
      message: 'Roleplay has no student lines to practice.',
    });
    detectedPatterns.add('A10');
  }

  return {
    issues,
    warnings,
    detectedPatterns: [...detectedPatterns],
    isPlayable: issues.length === 0 && totalStudentTurns > 0,
    totalStudentTurns,
    playableSceneCount,
  };
}
