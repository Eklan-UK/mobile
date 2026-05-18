import { useQuery } from '@tanstack/react-query';
import { fetchUserStreak, StreakData, userStreakQueryKey } from '@/services/metrics.service';
import { useMemo } from 'react';

/**
 * Derives a 7-boolean Sun→Sat weekly activity array from the API response.
 *
 * The API returns `weeklyActivity` with index 0 = Monday (Mon–Sun).
 * The UI shows Sun first (S S M T W T F), so we rearrange:
 *   display[0] = Sun  → api[6]
 *   display[1] = Mon  → api[0]
 *   ...
 *   display[6] = Sat  → (not in Mon-indexed array; treat as false)
 *
 * If weeklyActivity is absent, the last `currentStreak` days are marked active.
 */
function deriveWeeklyDisplay(data: StreakData): boolean[] {
  if (data.weeklyActivity && data.weeklyActivity.length >= 7) {
    // API: [Mon, Tue, Wed, Thu, Fri, Sat, Sun]
    // Display: [Sun, Mon, Tue, Wed, Thu, Fri, Sat]
    const api = data.weeklyActivity;
    return [api[6], api[0], api[1], api[2], api[3], api[4], api[5]];
  }

  // Fallback: mark the last `currentStreak` days (ending today) as active
  const today = new Date().getDay(); // 0=Sun, 1=Mon, ...6=Sat
  const streak = Math.min(data.currentStreak, 7);
  const display = [false, false, false, false, false, false, false];
  for (let i = 0; i < streak; i++) {
    const dayIdx = (today - i + 7) % 7;
    display[dayIdx] = true;
  }
  return display;
}

export function useStreak() {
  const query = useQuery<StreakData>({
    queryKey: userStreakQueryKey,
    queryFn: fetchUserStreak,
    staleTime: 60_000, // 1 minute
    retry: false, // endpoint may not exist yet — fail silently, UI falls back to zeros
  });

  const weeklyDisplay = useMemo(
    () =>
      query.data
        ? deriveWeeklyDisplay(query.data)
        : [false, false, false, false, false, false, false],
    [query.data]
  );

  return { ...query, weeklyDisplay };
}
