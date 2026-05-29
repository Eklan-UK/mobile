# App Store stability (Apple Review crash remediation)

## Summary

iPad App Review crashes on **Eklan 1.2.5 (build 4)** were traced to aggressive startup OTA reloads (Expo error recovery SIGABRT) and compounding config/runtime issues (Hermes SIGSEGV on New Architecture paths). **1.2.6 (build 5)** addresses these with production-safe OTA policy, hardened config, and error containment.

## Root causes

| Crash | Signal | Timing | Likely cause |
|-------|--------|--------|--------------|
| Type A | SIGABRT on `expo.controller.errorRecoveryQueue` | ~5–8s after launch | `Updates.reloadAsync()` during fragile boot after fetch; incompatible OTA + recovery loop |
| Type B | SIGSEGV in Hermes `Function.prototype.bind` | ~30–40s | New Architecture + TurboModule exception; possible 401 storm from unauthenticated `/users/current` |

### Contributing factors (fixed in 1.2.6)

- Root `_layout` ran `checkForUpdateAsync` → `fetchUpdateAsync` → **`reloadAsync()` on every cold start**
- `updates.checkAutomatically` defaulted to **ON_LOAD** (native + JS double update path)
- **`runtimeVersion` `1.1.0`** while app **version `1.2.5`** — OTA/native mismatch risk
- **`newArchEnabled: true`** + **`reactCompiler: true`**
- `LanguageProvider` called `useUserCurrent()` while logged out

## Fixes shipped

### OTA (`services/ota-updates.ts`, `components/OtaUpdateCoordinator.tsx`)

- **No reload during boot window** (~55s after first paint)
- **No cold-start `reloadAsync`** — download only; reload on foreground when safe
- Deferred initial check: `InteractionManager.runAfterInteractions` + 3s delay
- Reload only when `AppState === 'active'`, auth hydrated, shell ready, **≥10 min** since last reload
- Skip when `Updates.isEmergencyLaunch`
- **Never reload on fetch/check failure**
- `app.json`: `checkAutomatically: "NEVER"`, `fallbackToCacheTimeout: 0`

### Runtime / native build

- `newArchEnabled: false` (`app.json`, `android/gradle.properties`)
- `experiments.reactCompiler: false`
- `eas.json` production: `runtimeVersion.policy: "appVersion"` (tracks `expo.version`, e.g. `1.2.6`)
- Version **1.2.6**, iOS build **5**

### Error containment

- `components/RootErrorBoundary.tsx` — fallback UI; **manual** restart via `Updates.reloadAsync()` only
- `lib/global-error-handlers.ts` — global handler + unhandled rejection logging
- `utils/logger.reportError()` — always `console.error` in production

### Startup

- `LanguageProvider`: `useUserCurrent({ enabled: isAuthenticated })`
- `app/index.tsx`: single hydrate via ref; routing wrapped in try/catch

## OTA strategy (going forward)

1. **Native build first** when changing `runtimeVersion`, native modules, or New Arch flags.
2. Publish OTAs only to matching runtime (e.g. `1.2.6` after this binary).
3. Use **`preview`** channel + iPad TestFlight/internal QA before **`production`**.
4. After publish: `eas update:insights <groupId>` — rollback if crash rate &gt; 0.
5. Prefer **download on foreground, reload when policy allows** — never startup reload.

## Validation checklist (pre-submit)

Run on **physical iPad** (or iPad simulator) with a **release** build:

- [ ] Cold launch ×10 — no crash, no reload in first 60s
- [ ] Airplane mode cold launch — usable on embedded bundle
- [ ] Test OTA on `preview` — download without auto-reload on cold start
- [ ] Foreground OTA after 2+ min background — reload only if policy allows
- [ ] Logged-out launch — no 401 spam / crash
- [ ] Logged-in → tabs → practice/premium — no SIGSEGV at ~30–40s
- [ ] `eas update:insights` on preview group — crash rate 0 before production OTA
- [ ] Binary `runtimeVersion` matches EAS update target (`eas update:list`)

## Rollback instructions

### Bad OTA on production channel

```bash
# List recent production updates
eas update:list --branch production

# Roll back to previous published update (interactive)
eas update:rollback --channel production
```

**Before shipping 1.2.6 binary:** audit production updates still targeting **`runtimeVersion` `1.1.0`**. Those payloads must **not** apply to the new binary. Roll back or republish only after the new native build is live.

### Emergency in-app behavior

- `Updates.isEmergencyLaunch` — OTA coordinator skips fetch/reload; app stays on recovery bundle.
- User can tap **Restart app** in `RootErrorBoundary` (manual `reloadAsync` only).

## Release steps

1. Confirm config: `checkAutomatically: NEVER`, `newArchEnabled: false`, `reactCompiler: false`.
2. `eas build --platform ios --profile production`
3. iPad release QA (checklist above).
4. Submit to App Store.
5. **Do not** publish production OTA until binary is approved **or** updates target only `1.2.6` runtime.

## Confidence

| Area | Confidence |
|------|------------|
| Type A (error recovery / OTA loop) | **High** — startup reload removed; native auto-check disabled |
| Type B (Hermes / New Arch) | **Medium–high** — New Arch/compiler off + auth-gated user fetch |
| Resubmission readiness | **Ready after native 1.2.6 passes iPad release QA** |

## OTA rollback audit (pre-submit ops)

**Action required (no automated run in repo):**

1. `eas update:list --branch production` — note any update with `runtimeVersion` **1.1.0** still active on `production`.
2. If suspect bundle exists: `eas update:rollback --channel production` **before** or immediately when shipping **1.2.6** so reviewers do not receive incompatible JS.
3. After 1.2.6 is live, publish OTAs only with runtime **1.2.6** (`appVersion` policy).
