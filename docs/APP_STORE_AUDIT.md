# App Store readiness audit (branch)

**Audit date:** 2026-05-29  
**Target:** Eklan **1.2.6** (iOS build **5**) — post crash-remediation

## Verdict

| Area | Status | Notes |
|------|--------|-------|
| OTA / error recovery (Type A) | **PASS** | No startup `reloadAsync`; `checkAutomatically: NEVER`; boot window + cooldown |
| Runtime config | **PASS** | `runtimeVersion` policy `appVersion`; `newArchEnabled: false`; `reactCompiler: false` |
| Error containment | **PASS** | Root boundary, global handlers, `reportError` (duplicate export fixed) |
| Startup hardening | **PASS** | Auth-gated language fetch; index routing try/catch |
| TypeScript (stability files) | **PASS** | No errors in OTA/error modules |
| TypeScript (whole repo) | **WARN** | Pre-existing errors in oauth, auth-store, etc. — not introduced by this branch |
| ESLint (whole repo) | **WARN** | Pre-existing errors — not blocking native build |
| Manual QA on device | **REQUIRED** | Cannot be automated in CI |
| Production OTA audit | **REQUIRED** | Run `eas update:list` before submit |

**Recommendation:** Proceed to **`eas build --profile preview-device`** → iPad QA → **`production`** build → submit. Not guaranteed Apple approval, but the **known review crash causes are addressed**.

---

## Automated checks run

```bash
npx expo config --type public   # version 1.2.6, newArch false, checkAutomatically NEVER, runtimeVersion appVersion
npx tsc --noEmit                # stability modules clean; repo has legacy TS debt
npx expo lint                   # legacy lint debt unrelated to stability PR
```

---

## Code review checklist

- [x] Single OTA entry: `services/ota-updates.ts` + `OtaUpdateCoordinator`
- [x] No other `Updates.reloadAsync` except OTA policy + manual boundary restart
- [x] `Updates.isEmergencyLaunch` respected in OTA + boundary restart
- [x] `runtimeVersion` in `app.json` only (`appVersion` policy — not in `eas.json` build profiles)
- [x] Android `gradle.properties` `newArchEnabled=false`
- [x] `LanguageProvider` uses `enabled: isAuthenticated`
- [x] IAP init only on `app/premium.tsx` (not root)

---

## Fixes applied during audit

1. Removed duplicate `reportError` export in `utils/logger.ts` (TS build break).
2. Restored `runtimeVersion: { policy: "appVersion" }` in `app.json`.
3. `RootErrorBoundary`: skip `reloadAsync` on `isEmergencyLaunch`.
4. `global-error-handlers`: production fatals do not chain default crash handler.
5. Added EAS `preview-device` profile for iPad device testing.

---

## Pre-submit manual steps (you must do)

1. **Rollback stale OTAs** (runtime `1.1.0` on production):
   ```bash
   eas update:list --branch production
   eas update:rollback --channel production   # if needed
   ```

2. **Preview device build:**
   ```bash
   eas build --platform ios --profile preview-device
   ```

3. **iPad QA** — see checklist in [APP_STORE_STABILITY.md](./APP_STORE_STABILITY.md).

4. **Production build + submit:**
   ```bash
   eas build --platform ios --profile production
   eas submit --platform ios --profile production --latest
   ```

5. **Production OTA** only after binary **1.2.6** is live.

---

## Remaining risks (honest)

- Hermes/native-module edge cases (IAP, camera) — mitigated by disabling New Arch, not eliminated.
- Legacy TS/lint issues elsewhere — unlikely to crash at runtime but should be cleaned over time.
- Apple Review environment (iPadOS 26.x) — validate on physical iPad release build.

## Confidence for resubmission

| Crash type | Confidence |
|------------|------------|
| Type A (OTA / error recovery) | **High** |
| Type B (Hermes / New Arch) | **Medium–high** |
| Overall approval | **Good** after device QA passes |
