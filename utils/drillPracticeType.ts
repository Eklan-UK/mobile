import type { Drill, DrillType } from "@/types/drill.types";

const KEY_PHRASES_ALIASES = new Set([
  "key_phrases",
  "key-phrases",
  "key phrases",
  "keyphrases",
]);

/** Normalize raw API `drill.type` (lowercase, underscores). */
export function normalizeDrillType(raw: unknown): string | null {
  if (raw == null) return null;
  const s = String(raw).trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (KEY_PHRASES_ALIASES.has(s) || KEY_PHRASES_ALIASES.has(String(raw).trim().toLowerCase())) {
    return "key_phrases";
  }
  return s || null;
}

function hasKeyPhraseItems(drill: { key_phrase_items?: unknown[] | null }): boolean {
  return Array.isArray(drill.key_phrase_items) && drill.key_phrase_items.length > 0;
}

/**
 * Effective practice type for routing and runner dispatch (KEY_PHRASES_DRILL §3.3).
 */
export function resolveDrillPracticeType(
  drill: { type?: unknown; key_phrase_items?: unknown[] | null } | null | undefined
): string | null {
  if (!drill) return null;

  const normalized = normalizeDrillType(drill.type);
  if (normalized === "key_phrases") return "key_phrases";

  if (hasKeyPhraseItems(drill)) return "key_phrases";

  return normalized ?? (drill.type != null ? String(drill.type) : null);
}

/** Merge inferred `key_phrases` type for UI when items are present. */
export function drillForUi<T extends Drill>(drill: T): T {
  const practiceType = resolveDrillPracticeType(drill);
  if (practiceType === "key_phrases" && drill.type !== "key_phrases") {
    return { ...drill, type: "key_phrases" as DrillType };
  }
  return drill;
}

export function isKeyPhrasesDrillType(
  drill: { type?: unknown; key_phrase_items?: unknown[] | null } | null | undefined
): boolean {
  return resolveDrillPracticeType(drill) === "key_phrases";
}
