export type MatchingTileItem = {
  id: number;
  text: string;
  translation?: string;
};

export type MatchingPairLabels = {
  left: string;
  right: string;
};

export function normalizeMatchText(s: string): string {
  return s.trim().replace(/\s+/g, ' ');
}

export function buildMatchedPairKey(leftId: number, rightId: number): string {
  return `${leftId}-${rightId}`;
}

export function findUnmatchedCanonicalPairIndex(
  pairs: MatchingPairLabels[],
  leftItem: MatchingTileItem,
  rightItem: MatchingTileItem,
  matchedCanonical: Set<number>
): number {
  const leftText = normalizeMatchText(leftItem.text);
  const rightText = normalizeMatchText(rightItem.text);
  const candidates: number[] = [];

  for (let i = 0; i < pairs.length; i++) {
    if (matchedCanonical.has(i)) continue;
    const pair = pairs[i];
    if (
      normalizeMatchText(pair.left) === leftText &&
      normalizeMatchText(pair.right) === rightText
    ) {
      candidates.push(i);
    }
  }

  if (candidates.length === 0) return -1;
  if (candidates.length === 1) return candidates[0];
  if (candidates.includes(leftItem.id)) return leftItem.id;
  if (candidates.includes(rightItem.id)) return rightItem.id;
  return candidates[0];
}

export function restoreMatchedCanonicalIndices(
  pairs: MatchingPairLabels[],
  restoredKeys: string[],
  leftItems: MatchingTileItem[],
  rightItems: MatchingTileItem[]
): Set<number> {
  const matched = new Set<number>();

  for (const key of restoredKeys) {
    const [leftIdStr, rightIdStr] = key.split('-');
    const leftId = Number(leftIdStr);
    const rightId = Number(rightIdStr);

    if (leftId === rightId) {
      matched.add(leftId);
      continue;
    }

    const leftItem = leftItems.find((item) => item.id === leftId);
    const rightItem = rightItems.find((item) => item.id === rightId);
    if (leftItem && rightItem) {
      const idx = findUnmatchedCanonicalPairIndex(
        pairs,
        leftItem,
        rightItem,
        matched
      );
      if (idx !== -1) {
        matched.add(idx);
      }
    }
  }

  return matched;
}

export function evaluateMatch(
  pairs: MatchingPairLabels[],
  leftItem: MatchingTileItem,
  rightItem: MatchingTileItem,
  matchedCanonical: Set<number>
): { correct: boolean; canonicalIndex: number } {
  if (leftItem.id === rightItem.id) {
    return { correct: true, canonicalIndex: leftItem.id };
  }

  const idx = findUnmatchedCanonicalPairIndex(
    pairs,
    leftItem,
    rightItem,
    matchedCanonical
  );
  if (idx !== -1) {
    return { correct: true, canonicalIndex: idx };
  }

  return { correct: false, canonicalIndex: -1 };
}

export function buildIncorrectPairEntry(
  pairs: MatchingPairLabels[],
  leftItem: MatchingTileItem,
  rightItem: MatchingTileItem
): { left: string; right: string; attemptedMatch: string } {
  const canonical = pairs[leftItem.id];
  const leftMatchesCanonical =
    canonical &&
    normalizeMatchText(canonical.left) === normalizeMatchText(leftItem.text);

  return {
    left: leftItem.text,
    right: leftMatchesCanonical ? canonical.right : '',
    attemptedMatch: rightItem.text,
  };
}
