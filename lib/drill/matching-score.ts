export const MATCHING_PASS_THRESHOLD = 70;

export function computeMatchingScore(
  pairsMatched: number,
  incorrectCount: number
): number {
  const totalAttempts = pairsMatched + incorrectCount;
  if (totalAttempts === 0) return 0;
  return Math.round((pairsMatched / totalAttempts) * 100);
}
