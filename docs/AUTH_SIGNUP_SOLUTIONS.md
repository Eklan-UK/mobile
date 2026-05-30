# Auth Sign-Up / Login — Solutions Guide

This document is the **actionable companion** to [AUTH_SIGNUP_AUDIT.md](./AUTH_SIGNUP_AUDIT.md). Read the audit for architecture, bug IDs, and reproduction steps; use this guide to fix each issue in order of impact. It covers mobile code that is already merged, EAS/DevOps configuration, Google Cloud / Apple Developer setup, and backend alignment for native OAuth.

---

## Quick fix checklist (highest impact first)

Do these before spending time on lower-priority items:

1. **[C1] EAS secrets:** Set `EXPO_PUBLIC_API_URL` for `preview` and `production` builds → **rebuild** native binaries.
2. **[C2] EAS secrets:** Set `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` (Web application client) and `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` (iOS client) → **rebuild** (iOS URL scheme requires native build).
3. **[C3] Google Cloud:** Register **debug and release** Android SHA-1 fingerprints on the Android OAuth client for `com.eklan.ai`.
4. **[C4] Backend:** Deploy and configure `POST /api/v1/auth/verify-id-token` (`GOOGLE_CLIENT_ID` = same Web Client ID as mobile; Apple keys correct).
5. **[H1] iOS Google:** Set `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` so `app.config.js` adds the correct `iosUrlScheme` → **new EAS iOS build** (OTA alone is not enough).
6. **[H2] Apple:** Confirm `ios.usesAppleSignIn: true` in native build → **new EAS build** for TestFlight/App Store.
7. **[H3] Post-login 401:** After C1/C4, verify JWT from verify-id-token works on `GET /api/v1/users/current`.
8. **Local dev:** Use a **development build**, not Expo Go, for Google on Android; point `EXPO_PUBLIC_API_URL` at your machine’s LAN IP on physical devices.
9. **Code already in repo:** Stale-token clear before OAuth, refresh-token persistence, Apple button iOS-only, login sheet on `mode=login` — no extra mobile change unless regressions appear.

---

## EAS environment variables

### Problem

Production and preview builds bake `EXPO_PUBLIC_*` values at **build** time; missing secrets default the app to `http://localhost:3000` and break all auth (audit **C1**, **C2**).

### Solution steps

1. Open [Expo dashboard](https://expo.dev) → your project → **Secrets**.
2. Create secrets (names must match exactly):
   - `EXPO_PUBLIC_API_URL` — production API origin only (e.g. `https://api.example.com`). **No** trailing `/api`; `lib/api.ts` normalizes the base URL.
   - `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` — **Web application** OAuth client ID (`*.apps.googleusercontent.com`).
   - `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` — **iOS** OAuth client ID for bundle `com.eklan.ai`.
   - `EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME` (optional) — e.g. `com.googleusercontent.apps.XXXX`; if omitted, `app.config.js` derives it from the iOS Client ID.
3. Do **not** commit secret values in the repo or in `eas.json`.
4. Trigger a **new** build for each profile you ship:
   ```bash
   npx eas build --platform all --profile production
   npx eas build --platform all --profile preview
   ```
5. For local development, copy variable **names** into `.env` (see project `.env.example` when present); use your machine’s LAN IP for `EXPO_PUBLIC_API_URL` when testing on a physical device.

### Who owns it

**DevOps** (EAS secrets) + **Mobile** (confirm names in docs / `.env.example`).

### Verification

1. Install the new build on a device (not Expo Go).
2. In Metro or device logs, confirm API requests use the production host, not `localhost`.
3. Email sign-in should hit `{EXPO_PUBLIC_API_URL}/api/v1/auth/sign-in/email` (see [DEBUG_LOGIN.md](./DEBUG_LOGIN.md)).

---

## Google OAuth (Android SHA-1, iOS URL scheme, google-services.json)

### Problem

Google Sign-In fails on release Android (**DEVELOPER_ERROR** / no ID token) or iOS does not return to the app after account picker (**C3**, **H1**).

### Solution steps — Android

1. In [Google Cloud Console](https://console.cloud.google.com) → **APIs & Services** → **Credentials**, open the **Android** OAuth 2.0 client for package `com.eklan.ai`.
2. Add SHA-1 fingerprints for **every** keystore you sign with:
   - **Debug:** `keytool -list -v -keystore ~/.android/debug.keystore` (default password `android`).
   - **EAS / release:** Expo dashboard → project → **Credentials** → Android → copy SHA-1 for the keystore used by `production` / `preview` builds.
3. Ensure the **Web** Client ID (not the Android client ID) is in `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` at build time.
4. **`google-services.json`:** The repo does not require it if SHA-1 + package name are correct on the Android OAuth client. Optional: add `android.googleServicesFile` in `app.json` and place `google-services.json` from Firebase/Google — only if you standardize on Firebase; native Google Sign-In works with SHA-1 alone for this flow.
5. Rebuild and test on a **development client** or release APK — not Expo Go on Android.

### Solution steps — iOS

1. In Google Cloud Console, create an **iOS** OAuth client for bundle ID `com.eklan.ai`.
2. Set in EAS Secrets (or local `.env` for dev builds):
   - `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` (Web client — ID token audience + Android)
   - `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` (iOS client — native sign-in + URL scheme)
3. `app.config.js` adds `@react-native-google-signin/google-signin` with `iosUrlScheme` derived from the **iOS** Client ID, or from `EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME` if set.
4. Run a **new EAS iOS build** after changing env or `app.config.js` (`eas update` cannot change `CFBundleURLTypes`):

   ```bash
   eas secret:create --name EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID --value <ios-client-id>
   eas build --profile development --platform ios
   ```

### Who owns it

**Mobile** (env + `app.config.js`) + **DevOps** (EAS secrets, SHA-1 from EAS credentials) + **Backend** (`GOOGLE_CLIENT_ID` = same Web Client ID).

### Verification

1. Tap **Continue with Google** → account picker → app returns and navigates to profile setup or tabs.
2. Android release/TestFlight: no `DEVELOPER_ERROR` in logcat.
3. iOS: no hang after Google UI; app receives ID token and `POST /api/v1/auth/verify-id-token` returns 200.

---

## Apple Sign In (usesAppleSignIn, backend credentials)

### Problem

Apple button unavailable, entitlement missing on older builds, or verify fails after Apple UI succeeds (**H2**, **C4**).

### Solution steps

1. **App Store Connect / Apple Developer:** Enable **Sign in with Apple** on App ID `com.eklan.ai`.
2. **Mobile:** `app.json` must include `ios.usesAppleSignIn: true` (already set per audit). Ship a **new** native build to TestFlight/App Store after enabling.
3. **Backend:** Configure Apple verification env vars (names only; values in server secret store):
   - `APPLE_CLIENT_ID`
   - `APPLE_TEAM_ID`
   - `APPLE_KEY_ID`
   - `APPLE_PRIVATE_KEY`
4. Align `APPLE_CLIENT_ID` with what the server expects for native ID tokens (bundle ID vs Services ID — match [NATIVE_OAUTH_SETUP.md](./NATIVE_OAUTH_SETUP.md) and server config).
5. **UI:** Apple button is shown only on iOS (`app/(auth)/auth.tsx`); do not test Apple on Android.

### Who owns it

**App Store Connect** / Apple Developer (capability) + **Backend** (JWT verification) + **Mobile** (entitlement in build).

### Verification

1. On a **real iOS device** with a dev client or TestFlight build, tap **Continue with Apple**.
2. Complete Apple ID flow → same navigation as Google (profile setup or tabs).
3. Server logs show successful verify for `provider: 'apple'`.

---

## Backend `verify-id-token` endpoint alignment

### Problem

Native picker succeeds but the app shows “Invalid response”, 404, or 401 (**C4**, **H3**).

### Solution steps

1. Confirm endpoint exists: `POST /api/v1/auth/verify-id-token` with body:
   ```json
   { "idToken": "<jwt>", "provider": "google" | "apple", "firstName?": "...", "lastName?": "..." }
   ```
2. Set backend `GOOGLE_CLIENT_ID` to the **same** Web Client ID as mobile `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`.
3. Set `GOOGLE_CLIENT_SECRET` for server-side Google token verification.
4. Configure Apple variables (see above); test Apple JWT `aud` matches server expectation.
5. Response must include shapes the app accepts: `{ user, token, session? }` at `response.data` or `response.data.data`; optionally `refreshToken` (see auth-store).
6. Ensure `GET /api/v1/users/current` accepts `Authorization: Bearer <token>` returned from verify (fixes “logged in then kicked out”, **H3**).
7. If auth returns 403 intermittently, review backend CORS/origin rules; mobile may send `Origin` derived from API base URL (**M4**).

### Who owns it

**Backend** (primary); **Mobile** confirms request/response contract in `services/oauth.service.ts`.

### Verification

1. `curl` or server integration test: valid Google/Apple ID token → 200 + `user` + `token`.
2. After OAuth in app, `checkSession` / `GET /api/v1/users/current` returns 200; user stays on tabs after backgrounding.
3. See [NATIVE_OAUTH_SETUP.md](./NATIVE_OAUTH_SETUP.md) as source of truth (not legacy [OAUTH_SETUP.md](./OAUTH_SETUP.md) browser flow).

---

## Expo Go vs dev client vs production builds

### Problem

Google Sign-In on Android in **Expo Go** fails because native modules are unavailable (**M5**).

### Solution steps

| Environment | Use for auth testing |
|-------------|----------------------|
| **Expo Go** | Email flows only; avoid Google on Android; Apple limited on simulator |
| **Development build** (`eas build --profile development` or local dev client) | Google + Apple + full native OAuth |
| **Preview / production EAS builds** | Store-like testing; requires EAS secrets (**C1**, **C2**) and correct SHA-1 (**C3**) |

1. Build dev client: `npx eas build --profile development --platform android` (or iOS).
2. Start Metro: `npx expo start --dev-client`.
3. For production issues, always test the **same profile** you ship (`preview` / `production`), not only local `expo start`.

### Who owns it

**Mobile** (document workflow) + **DevOps** (EAS profiles).

### Verification

- Android Google works in dev client; fails in Expo Go with the message from `oauth.service.ts` (expected).
- Production APK/TestFlight uses correct API host (not localhost).

---

## Stale token and auth-store fixes (already implemented)

### Problem

Expired session caused `verify-id-token` to send a stale Bearer token; 401 interceptor cleared storage mid-flow (**C5**). Refresh tokens were not persisted (**H4**).

### What was already done in code

Reference: `store/auth-store.ts`, `services/oauth.service.ts`, `app/(auth)/auth.tsx`.

| Fix | Location | Behavior |
|-----|----------|----------|
| Clear tokens before OAuth | `signInWithGoogle` / `signInWithApple` | `secureStorage.clearTokens()` + `invalidateTokenCache()` before calling `oauth.service` |
| Persist refresh token | `persistRefreshTokenIfPresent`, login/register/OAuth | Stores `refreshToken` when API returns it |
| Hydration cache | `hydrate()` | `invalidateTokenCache()` on app start |
| Apple button | `auth.tsx` | `Platform.OS === 'ios'` only |
| Login deep link | `auth.tsx` | `mode=login` auto-opens login sheet |

### Solution steps (if regressions appear)

1. Do **not** remove pre-OAuth `clearTokens()` — it prevents **C5**.
2. Ensure backend returns `refreshToken` in verify-id-token and email auth responses if you rely on silent refresh later.
3. If users still bounce to splash after OAuth, debug **H3** (invalid JWT or `/users/current`), not token clearing.

### Who owns it

**Mobile** (maintain); **Backend** (valid tokens + refresh token in response).

### Verification

1. Log in, let token expire (or simulate), tap Google again — flow completes without silent `clearAll()` during verify.
2. Inspect secure storage (dev only): refresh token present after login when API supplies it.

---

## Documentation and developer onboarding

### Problem

Stale docs describe browser OAuth (`elkan://auth/callback`) instead of native ID tokens (**M2**, **M3**, **M6**).

### Solution steps

1. Follow [NATIVE_OAUTH_SETUP.md](./NATIVE_OAUTH_SETUP.md) for OAuth setup.
2. Use [DEBUG_LOGIN.md](./DEBUG_LOGIN.md) for email sign-in path `/api/v1/auth/sign-in/email`.
3. Add or maintain `.env.example` with **names only**: `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME` (optional).

### Who owns it

**Mobile**

### Verification

New developer can configure `.env` from `.env.example` and complete Google sign-in on a dev client without reading legacy OAuth docs.

---

## Manual QA script (after fixes)

Run after EAS secrets, native rebuild, Google SHA-1, and backend verify are in place.

### Preflight

- [ ] Backend `POST /api/v1/auth/verify-id-token` reachable from device network.
- [ ] Testing on **dev client** or **preview/production** build with correct env baked in.
- [ ] Physical device: `EXPO_PUBLIC_API_URL` uses LAN IP or production URL (not `localhost`).

### Google sign-up / sign-in

1. Open onboarding → sign up → `/(auth)/auth`.
2. Tap **Continue with Google** → pick account.
3. **New user:** lands on `/(profile-setup)`. **Returning user with profile:** lands on `/(tabs)`.
4. Force-quit app → reopen → still authenticated (`app/index.tsx` hydrate).
5. **Android release only:** repeat on Play/internal APK; no `DEVELOPER_ERROR`.

### Apple sign-up / sign-in (iOS device only)

1. Tap **Continue with Apple** (visible only on iOS).
2. Complete Apple ID → same routing as Google.
3. Background app → foreground → still on tabs (no splash bounce).

### Email sign-up / sign-in (regression)

1. **Sign up:** email + password → OTP → verify → profile setup.
2. **Log in:** splash → “I already have an account” → login sheet (or `?mode=login`).
3. Wrong password → visible error, not silent failure.

### Session stability

1. After OAuth, background 30+ seconds → foreground (`BackgroundPrefetcher` may call `checkSession`).
2. Expect **no** redirect to splash unless token is actually invalid.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|----------------|-----|
| All auth hits `localhost` on device | Missing `EXPO_PUBLIC_API_URL` in EAS build | Set EAS secret; rebuild (**C1**) |
| “Google not configured” / immediate error | Missing `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` at build | EAS secret; rebuild (**C2**) |
| Android `DEVELOPER_ERROR` | Release SHA-1 not in Google Cloud | Add EAS/production SHA-1 to Android OAuth client (**C3**) |
| Google works, then alert “Invalid response” | Backend verify missing or wrong `GOOGLE_CLIENT_ID` | Align backend with Web Client ID (**C4**) |
| Google fails only with old session | Stale Bearer on verify (should be fixed) | Confirm `auth-store` clears tokens before OAuth (**C5**) |
| iOS Google UI does not return to app | URL scheme / plugin not in binary | Set `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`; rebuild iOS (**H1**) |
| iOS “not properly configured” at startup (dev) | Missing iOS client ID in `.env` | Add `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`; rebuild iOS |
| Apple unavailable on TestFlight | Old build without entitlement | `usesAppleSignIn: true`; new EAS build (**H2**) |
| Logged in briefly, then splash | `GET /users/current` 401 | Fix JWT from verify-id-token (**H3**) |
| Google fails in Expo Go Android | No native module | Use dev client (**M5**) |
| Physical device cannot reach API | `localhost` in `.env` | Use LAN IP or production URL |
| 403 on auth endpoints | Backend origin/CORS policy | Backend trusts mobile; review **M4** |
| Apple button on Android | Old build | Update to build with `auth.tsx` iOS guard (**M1**) |

---

## Related docs

| Document | Role |
|----------|------|
| [AUTH_SIGNUP_AUDIT.md](./AUTH_SIGNUP_AUDIT.md) | Problems, architecture, bug IDs |
| [NATIVE_OAUTH_SETUP.md](./NATIVE_OAUTH_SETUP.md) | Native OAuth setup (source of truth) |
| [DEBUG_LOGIN.md](./DEBUG_LOGIN.md) | Email auth logging and endpoints |
| [BUILD_INSTRUCTIONS.md](./BUILD_INSTRUCTIONS.md) | EAS build commands |
