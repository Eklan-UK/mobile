import AsyncStorage from '@react-native-async-storage/async-storage';
import type { FreeTalkHistoryEntryV1, FreeTalkAttempt, FreeTalkAttemptGradeResult } from '@/types/free-talk';

const STORAGE_PREFIX = 'eklana-free-talk-history:v1:';

function storageKey(userId: string) {
  return `${STORAGE_PREFIX}${userId}`;
}

function isValidEntry(entry: unknown): entry is FreeTalkHistoryEntryV1 {
  if (!entry || typeof entry !== 'object') return false;
  const e = entry as any;
  return e.v === 1 && typeof e.id === 'string' && typeof e.scenarioId === 'string';
}

export async function loadFreeTalkHistory(userId: string): Promise<FreeTalkHistoryEntryV1[]> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(userId));
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    const valid = arr.filter(isValidEntry);
    return valid.sort((a, b) =>
      new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
    );
  } catch {
    return [];
  }
}

export async function appendFreeTalkHistoryEntry(
  userId: string,
  entry: Omit<FreeTalkHistoryEntryV1, 'v' | 'id' | 'completedAt'>
): Promise<void> {
  const existing = await loadFreeTalkHistory(userId);
  const newEntry: FreeTalkHistoryEntryV1 = {
    v: 1,
    id: `local-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    completedAt: new Date().toISOString(),
    ...entry,
  };
  await AsyncStorage.setItem(
    storageKey(userId),
    JSON.stringify([newEntry, ...existing])
  );
}

export function mapFreeTalkAttemptToHistoryEntry(attempt: FreeTalkAttempt): FreeTalkHistoryEntryV1 {
  return {
    v: 1,
    id: attempt.id,
    scenarioId: attempt.scenarioId,
    scenarioTitle: attempt.scenarioTitle,
    scenarioType: attempt.scenarioType,
    completedAt: attempt.completedAt,
    feedbackText: attempt.feedbackText ?? '',
    gradeResult: attempt.gradeResult ?? null,
    audioUrl: attempt.audioUrl ?? null,
    durationMs: attempt.durationMs ?? null,
    usedVoice: attempt.usedVoice ?? false,
  };
}

/**
 * Merge server attempts + local history, deduplicating by scenarioId|completedAt.
 */
export function mergeFreeTalkHistory(
  serverAttempts: FreeTalkAttempt[],
  localEntries: FreeTalkHistoryEntryV1[]
): FreeTalkHistoryEntryV1[] {
  const serverKeys = new Set(
    serverAttempts.map((a) => `${a.scenarioId}|${a.completedAt}`)
  );
  const extras = localEntries.filter(
    (e) => !serverKeys.has(`${e.scenarioId}|${e.completedAt}`)
  );
  const serverMapped = serverAttempts.map(mapFreeTalkAttemptToHistoryEntry);
  const merged = [...serverMapped, ...extras];
  return merged.sort(
    (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
  );
}
