/**
 * Semantic colors aligned with web `globals.css` / CSS variables.
 * Brand primaries and accents are identical in light and dark (not overridden in `.dark`).
 */

export const brandColors = {
  primary: '#3B883E',
  primaryDark: '#256427',
  primaryLight: '#4ade80',
  accentYellow: '#fbbf24',
  accentOrange: '#fb923c',
  accentRed: '#ef4444',
} as const;

/** Light mode — `:root` on web */
export const lightSemantic = {
  background: '#ffffff',
  foreground: '#171717',
  muted: '#f3f4f6',
  mutedForeground: '#6b7280',
  textLight: '#9ca3af',
  card: '#ffffff',
  border: '#e5e7eb',
  progressBg: '#f3f4f6',
  textPrimary: '#171717',
  textSecondary: '#6b7280',
} as const;

/** Dark mode — `.dark` overrides on web */
export const darkSemantic = {
  background: '#0c0e0d',
  foreground: '#f0f2f1',
  muted: '#1a1d1c',
  mutedForeground: '#9aa39e',
  textLight: '#6b7270',
  card: '#131614',
  border: '#2a2e2c',
  progressBg: '#1a1d1c',
  textPrimary: '#f0f2f1',
  textSecondary: '#9aa39e',
} as const;

export type SemanticColors = typeof lightSemantic;

export function getSemanticColors(scheme: 'light' | 'dark'): SemanticColors {
  return scheme === 'dark' ? darkSemantic : lightSemantic;
}
