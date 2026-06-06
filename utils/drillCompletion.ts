/** True when every item was completed (100% pass). */
export function isDrillPerfectPass(completed: number, total: number): boolean {
  return total > 0 && completed === total;
}

/** True when the drill score is a perfect 100%. */
export function isDrillPerfectScore(score: number): boolean {
  return score === 100;
}
