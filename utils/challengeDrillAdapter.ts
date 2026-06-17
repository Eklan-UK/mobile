import type { Drill } from '@/types/drill.types';
import type {
  ChallengeDrillItem,
  FillBlankGeneratedContent,
} from '@/types/weekly-challenge.types';

// ─── Drill type display info ──────────────────────────────────────────────────

const DRILL_TYPE_TITLE: Record<string, string> = {
  pronunciation: 'Pronunciation',
  vocabulary: 'Vocabulary',
  roleplay: 'Role-play',
  key_phrases: 'Key Phrases',
  fill_blank: 'Fill in the Blank',
};

export const DRILL_TYPE_EMOJI: Record<string, string> = {
  pronunciation: '🎙️',
  vocabulary: '📚',
  roleplay: '💬',
  fill_blank: '📋',
  key_phrases: '🗝️',
};

export const DRILL_TYPE_BADGE: Record<string, string> = {
  pronunciation: 'Pronunciation',
  vocabulary: 'Fill-in-the-Blank',
  roleplay: 'Role-play',
  fill_blank: 'Fill-in-the-Blank',
  key_phrases: 'Key Phrases',
};

// Thumbnail gradient colors per drill type (LinearGradient start → end)
export const DRILL_TYPE_GRADIENT: Record<string, [string, string]> = {
  vocabulary: ['#A7F3D0', '#6EE7B7'],
  pronunciation: ['#A7F3D0', '#86EFAC'],
  roleplay: ['#BAE6FD', '#93C5FD'],
  fill_blank: ['#DDD6FE', '#C4B5FD'],
  key_phrases: ['#FDE68A', '#FEF08A'],
};

// Badge text color per drill type
export const DRILL_TYPE_BADGE_COLOR: Record<string, string> = {
  pronunciation: '#047857',
  vocabulary: '#7C3AED',
  roleplay: '#0284C7',
  fill_blank: '#7C3AED',
  key_phrases: '#B45309',
};

// ─── Adapter ──────────────────────────────────────────────────────────────────

/**
 * Maps a ChallengeDrillItem → a Drill-shaped object compatible with existing drill screens.
 * vocabulary uses MCQ fill-in-the-blank format — mapped to fill_blank component.
 */
export function toDrillShape(
  item: ChallengeDrillItem,
  challengeId: string,
  index: number,
): Drill {
  const title = DRILL_TYPE_TITLE[item.drillType] ?? item.targetWeakness.label;
  const syntheticId = `${challengeId}-${index}`;

  // vocabulary uses fill_blank format — map generatedContent accordingly
  if (item.drillType === 'vocabulary') {
    const content = item.generatedContent as FillBlankGeneratedContent & {
      vocabulary_items?: FillBlankGeneratedContent['fill_blank_items'];
    };
    return {
      _id: syntheticId,
      type: 'fill_blank',
      title,
      difficulty: 'medium',
      date: new Date().toISOString(),
      duration_days: 1,
      assigned_to: [],
      fill_blank_items: content.vocabulary_items ?? content.fill_blank_items ?? [],
    } as unknown as Drill;
  }

  // Roleplay: spread generated content fields (student_character_name, ai_character_names, roleplay_scenes, etc.)
  return {
    _id: syntheticId,
    type: item.drillType,
    title,
    difficulty: 'medium',
    date: new Date().toISOString(),
    duration_days: 1,
    assigned_to: [],
    ...item.generatedContent,
  } as unknown as Drill;
}

// ─── URL encoding for weekStartDate ──────────────────────────────────────────

/**
 * Encode ISO datetime for use in route params (: → %3A).
 */
export function encodeWeekStartDate(weekStartDate: string): string {
  return encodeURIComponent(weekStartDate);
}

/**
 * Decode an encoded weekStartDate route param back to ISO datetime.
 */
export function decodeWeekStartDate(encoded: string): string {
  return decodeURIComponent(encoded);
}

// ─── Summary message helper ───────────────────────────────────────────────────

/**
 * Override generic summary messages with a user-friendly fallback.
 */
export function formatSummaryMessage(summaryMessage: string): string {
  if (summaryMessage.startsWith('This week focus on:')) {
    return 'Personalized to address your weakest areas';
  }
  return summaryMessage;
}

// ─── Week label helper ────────────────────────────────────────────────────────

/**
 * Format the week start date into a short human-readable label, e.g. "Jun 2, 2026".
 */
export function formatWeekDate(weekStartDate: string): string {
  try {
    return new Date(weekStartDate).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return weekStartDate;
  }
}
