/**
 * Shared accent → ElevenLabs voice map for student lesson preferences and
 * client TTS fallback. Must stay aligned with web:
 * eklana-ai-frontend/src/services/tts-accent-voices.ts
 *
 * Prefer server-side accent resolution via /api/v1/tts (voice omitted/default)
 * and /api/v1/ai/free-talk/tts — do not send voiceId for those paths.
 */

export const ACCENT_VOICE_KEYS = [
  'aanu_afolabi',
  'american_male',
  'american_female',
  'british_male',
  'british_female',
  'australian_male',
  'australian_female',
] as const;

export type AccentVoiceKey = (typeof ACCENT_VOICE_KEYS)[number];

export interface AccentVoiceOption {
  key: AccentVoiceKey;
  label: string;
  voiceId: string;
}

/** Default student lesson accent when unset / new. */
export const DEFAULT_ENGLISH_ACCENT: AccentVoiceKey = 'british_female';

export const ACCENT_VOICE_OPTIONS: AccentVoiceOption[] = [
  { key: 'aanu_afolabi', label: 'Aanu Afolabi', voiceId: 'JXNr0OLVF2ZRyBK6ZXkK' },
  { key: 'american_male', label: 'American (male)', voiceId: 'Z2fsAwk7IblvPhYzfslC' },
  { key: 'american_female', label: 'American (female)', voiceId: 'DXFkLCBUTmvXpp2QwZjA' },
  { key: 'british_male', label: 'British (male)', voiceId: 'JZ5PEPqtr05GbBRBqPhz' },
  { key: 'british_female', label: 'British (female)', voiceId: 'LZAcK8Cx5QjdQhfBsJQZ' },
  { key: 'australian_male', label: 'Australian (male)', voiceId: 'hIreuBly94QFepU63yel' },
  { key: 'australian_female', label: 'Australian (female)', voiceId: 'VyyyOgRmsqOzaZXnKWnI' },
];

const VOICE_ID_BY_KEY = Object.fromEntries(
  ACCENT_VOICE_OPTIONS.map((o) => [o.key, o.voiceId]),
) as Record<AccentVoiceKey, string>;

const KEY_SET = new Set<string>(ACCENT_VOICE_KEYS);

/** Legacy lesson preference values → current accent key map. */
const LEGACY_ACCENT_MAP: Record<string, AccentVoiceKey> = {
  british: 'british_female',
  american: 'american_female',
  indian_male: 'british_female',
  indian_female: 'british_female',
};

export function isAccentVoiceKey(key: unknown): key is AccentVoiceKey {
  return typeof key === 'string' && KEY_SET.has(key);
}

/**
 * Normalize stored englishAccent (including legacy british/american/indian) to a current key.
 * Returns undefined when empty / unknown.
 */
export function normalizeEnglishAccent(
  key?: string | null,
): AccentVoiceKey | undefined {
  if (!key || !key.trim()) return undefined;
  const trimmed = key.trim();
  if (isAccentVoiceKey(trimmed)) return trimmed;
  return LEGACY_ACCENT_MAP[trimmed];
}

/**
 * Resolve an accent key to an ElevenLabs voice ID.
 * Returns undefined for empty/unknown keys.
 */
export function resolveAccentVoiceId(key?: string | null): string | undefined {
  const normalized = normalizeEnglishAccent(key);
  if (!normalized) return undefined;
  return VOICE_ID_BY_KEY[normalized];
}
