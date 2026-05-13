import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { useThemeStore, type ColorTheme } from '@/store/theme-store';
import { useUserCurrent } from '@/hooks/useSettings';

function isThemeValue(v: unknown): v is ColorTheme {
  return v === 'system' || v === 'light' || v === 'dark';
}

/**
 * After auth, mirrors web `StudentIntlProvider`: apply `profile.theme` from
 * `GET /api/v1/users/current` to the local theme store when the server sends it.
 */
export function ProfileThemeSync() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const setTheme = useThemeStore((s) => s.setTheme);
  const { data } = useUserCurrent({ enabled: isAuthenticated });
  const lastApplied = useRef<ColorTheme | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      lastApplied.current = null;
      return;
    }
    const t = data?.profile?.theme;
    if (!isThemeValue(t)) return;
    if (lastApplied.current === t) return;
    lastApplied.current = t;
    setTheme(t);
  }, [isAuthenticated, data?.profile?.theme, setTheme]);

  return null;
}
