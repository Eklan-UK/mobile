import React, { createContext, useContext, useEffect, useMemo } from 'react';
import { i18n, resolveLocale } from '@/lib/i18n';
import { useUserCurrent } from '@/hooks/useSettings';
import { useAuthStore } from '@/store/auth-store';

// ─── Context ──────────────────────────────────────────────────────────────────

interface LanguageContextValue {
  locale: string;
  t: (scope: string, options?: Record<string, unknown>) => string;
}

const LanguageContext = createContext<LanguageContextValue>({
  locale: 'en',
  t: (scope, options) => i18n.t(scope, options),
});

// ─── Provider ─────────────────────────────────────────────────────────────────

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { data: me } = useUserCurrent({ enabled: isAuthenticated });

  const locale = useMemo(
    () => resolveLocale(me?.profile?.language),
    [me?.profile?.language]
  );

  useEffect(() => {
    i18n.locale = locale;
  }, [locale]);

  const value = useMemo<LanguageContextValue>(
    () => ({
      locale,
      t: (scope, options) => i18n.t(scope, options),
    }),
    // Re-derive t whenever locale changes so consumers re-render
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [locale]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useTranslation() {
  return useContext(LanguageContext);
}
