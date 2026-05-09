import { useEffect } from "react";
import { useUserCurrent } from "@/hooks/useSettings";

/**
 * Debug-only: logs profile.language for ingest (session 83f2a9). Remove after locale/i18n verification.
 */
export function LocalePreferenceProbe() {
  const { data } = useUserCurrent();
  const lang = data?.profile?.language;

  useEffect(() => {
    // #region agent log
    fetch("http://127.0.0.1:7624/ingest/74037ddc-a470-40c1-9b13-02763f9ac390", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "83f2a9" },
      body: JSON.stringify({
        sessionId: "83f2a9",
        location: "LocalePreferenceProbe.tsx",
        message: "React Query user-current profile.language",
        data: {
          profileLanguage: lang ?? null,
          note: "If this updates after Done but UI strings stay English, no i18n binds to profile.language",
        },
        timestamp: Date.now(),
        hypothesisId: "H1",
      }),
    }).catch(() => {});
    // #endregion
  }, [lang]);

  return null;
}
