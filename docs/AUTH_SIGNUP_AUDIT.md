# Auth Sign-Up / Login Audit (Google & Apple OAuth)

**Actionable fixes:** [AUTH_SIGNUP_SOLUTIONS.md](./AUTH_SIGNUP_SOLUTIONS.md)

**Date:** 2026-05-26  
**Scope:** Mobile app (`/home/vahalla/Desktop/mobile`) — native Google/Apple OAuth, email sign-up/login, Better Auth backend integration.

---

## Architecture summary

The app uses **native OAuth** (not `expo-auth-session` browser redirects):

| Step | Google (Android/iOS) | Apple (iOS only) |
|------|----------------------|------------------|
| UI | `app/(auth)/auth.tsx` → `useAuth()` | Same |
| Store | `store/auth-store.ts` → `signInWithGoogle` / `signInWithApple` | Same |
| Service | `services/oauth.service.ts` → `@react-native-google-signin/google-signin` | `expo-apple-authentication` |
| Backend | `POST /api/v1/auth/verify-id-token` `{ idToken, provider }` | Same (+ optional `firstName`/`lastName`) |
| Storage | `lib/secure-storage.ts` (token in SecureStore, user in AsyncStorage) | Same |
| Navigation | Auth store → `/(profile-setup)` or `/(tabs)` based on `hasProfile` | Same |

**Not used for current OAuth:** deep links (`elkan://auth/callback`), PKCE, `expo-auth-session` (still in `package.json` but unused in `oauth.service.ts`).

Entry points:

- Onboarding: `app/(onboarding)/splash.tsx` → `/(auth)/auth?mode=signup` or `?mode=login`
- Email: bottom sheets `LoginSheet.tsx`, `SignupSheet.tsx`
- Session bootstrap: `app/index.tsx` → `hydrate()` → optional `checkSession()` → route by `hasProfile` / `emailVerified`

---

## Google sign-up / sign-in flow

1. User taps **Continue with Google** on `app/(auth)/auth.tsx`.
2. `auth-store.signInWithGoogle()` clears stale tokens (fix applied 2026-05-26), then dynamic-imports `oauth.service`.
3. `signInWithGoogle()`:
   - Requires `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` (Web OAuth client ID, `*.apps.googleusercontent.com`).
   - `GoogleSignin.configure({ webClientId })` at module load.
   - Android: `hasPlayServices()`, optional Expo Go guard.
   - `GoogleSignin.signOut()` then `signIn()` for fresh ID token.
   - Parses `userInfo.data.idToken` (v16 response shape); fallback `getTokens()`.
4. `POST {API_BASE_URL}/api/v1/auth/verify-id-token` with `{ idToken, provider: 'google' }`.
5. Expects `{ user, token, session? }` in `response.data` or `response.data.data`.
6. Stores token/user, sets Zustand state, `router.replace` to profile setup or tabs.

**Android native requirements (outside JS):**

- SHA-1 of signing keystore registered on **Android OAuth client** in Google Cloud Console (`com.eklan.ai`).
- EAS production builds use a **different** keystore than local debug — both SHA-1 fingerprints must be registered.
- No `google-services.json` in repo; plugin not in `app.json` (see bugs below).

**iOS native requirements:**

- Web Client ID in env (for ID token).
- **URL scheme** for Google Sign-In callback: typically `com.googleusercontent.apps.{CLIENT_ID}` via `@react-native-google-signin/google-signin` config plugin — **not configured** in `app.json` today (see bugs).

---

## Apple sign-up / sign-in flow

1. User taps **Continue with Apple** (iOS only after UI fix).
2. `AppleAuthentication.signInAsync()` with email + full name scopes.
3. `POST /api/v1/auth/verify-id-token` with `{ idToken, provider: 'apple', firstName?, lastName? }`.
4. Same storage/navigation as Google.

**iOS native requirements:**

- App ID capability: Sign in with Apple (`app.json` → `ios.usesAppleSignIn: true` added 2026-05-26).
- Backend must verify Apple JWT (audience = app bundle / service ID per server config).

Apple has **no** mobile env vars; verification is server-side (`APPLE_*` on backend).

---

## Bugs found

### Critical

| ID | Issue | Steps to reproduce | Likely cause | Suggested fix |
|----|--------|-------------------|--------------|---------------|
| C1 | **Production builds hit `localhost` API** | Install EAS production/preview build; attempt Google/Apple/email login | `EXPO_PUBLIC_API_URL` defaults to `http://localhost:3000` in `lib/api.ts`; `eas.json` has **no** `env` / secrets reference | Set `EXPO_PUBLIC_API_URL` in EAS Secrets for all build profiles; rebuild |
| C2 | **Google Sign-In fails on EAS builds without Web Client ID** | Production build → Continue with Google → immediate error or “not configured” | `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` missing at build time (not baked into binary) | EAS Secret + rebuild; must be **Web application** client ID |
| C3 | **Android release: DEVELOPER_ERROR / no ID token** | Google sign-in on Play Store / release APK | Release SHA-1 not added to Google Cloud Android OAuth client for `com.eklan.ai` | Register EAS/production SHA-1; match package name |
| C4 | **Backend `verify-id-token` missing or misconfigured** | Native picker succeeds; alert “Invalid response” or network 404/401 | Endpoint not deployed, wrong `GOOGLE_CLIENT_ID` vs mobile Web Client ID, Apple keys wrong | Align backend with `docs/NATIVE_OAUTH_SETUP.md`; server logs on verify |
| C5 | **Stale Bearer token breaks OAuth** | User with expired session taps Google; login fails or session cleared mid-flow | `apiClient` attaches cached token to `verify-id-token`; 401 interceptor may `clearAll()` | **Fixed:** clear tokens + `invalidateTokenCache()` at start of `signInWithGoogle` / `signInWithApple` in `auth-store.ts` |

### High

| ID | Issue | Steps to reproduce | Likely cause | Suggested fix |
|----|--------|-------------------|--------------|---------------|
| H1 | **iOS Google: missing URL scheme** | Google sign-in on iOS device after EAS build | `@react-native-google-signin/google-signin` plugin not in `app.json`; no `iosUrlScheme` / no `GoogleService-Info.plist` | **Fixed:** `app.config.js` adds config plugin; scheme from `EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME` or derived from Web Client ID — **new native build required** |
| H2 | **iOS Apple: entitlement may be missing on older builds** | Apple button errors / not available on TestFlight build | `usesAppleSignIn` was not set | **Fixed** in `app.json`; requires **new native build** |
| H3 | **Post-login 401 logout (“logged in then kicked out”)** | OAuth succeeds briefly, then returned to splash | `checkSession()` → `GET /api/v1/users/current` returns 401/403 → `clearAll()` | Ensure verify endpoint returns valid JWT; confirm `Authorization: Bearer` accepted; check token expiry |
| H4 | **Refresh token never stored** | Access token expires; APIs 401; user must re-login | `login` / `register` / OAuth only call `setToken`, never `setRefreshToken` | **Fixed:** `auth-store` + `oauth.service` persist `refreshToken` when API returns it |

### Medium

| ID | Issue | Steps to reproduce | Likely cause | Suggested fix |
|----|--------|-------------------|--------------|---------------|
| M1 | **Apple button shown on Android** | Android → Continue with Apple → error | No `Platform.OS` guard (comment said iOS only) | **Fixed** in `auth.tsx` |
| M2 | **Documentation contradicts code** | Devs follow `BETTER_AUTH_INTEGRATION.md` / `OAUTH_SETUP.md` | Docs describe browser OAuth + `elkan://auth/callback`; code uses native ID tokens | Treat `NATIVE_OAUTH_SETUP.md` as source of truth; update stale docs |
| M3 | **`DEBUG_LOGIN.md` wrong endpoint** | Dev searches logs for `/api/v1/auth/sign-in` | Doc outdated; app uses `/api/v1/auth/sign-in/email` | **Fixed** in `docs/DEBUG_LOGIN.md` |
| M4 | **Origin header on mobile requests** | Intermittent 403 on auth (backend-dependent) | `lib/api.ts` sets `Origin` to `API_BASE_URL` | Backend should trust app origins; or set `Origin: elkan://` if required by Better Auth |
| M5 | **Expo Go / no dev client** | `expo start` in Expo Go → Google on Android | Native module unavailable | Use `expo-dev-client` / `eas build --profile development` (message already in `oauth.service.ts`) |
| M6 | **No `.env.example` in repo** | New devs omit required vars | File referenced in `MOBILE_EXPO_BILLING.md` but missing | Add `.env.example` (variable names only) |

### Low

| ID | Issue | Notes |
|----|--------|--------|
| L1 | `expo-auth-session` dependency unused | Safe to remove later; not blocking |
| L2 | `mode=login` does not auto-open login sheet | User still sees OAuth + email; email opens login sheet — UX only | **Fixed:** `auth.tsx` presents login sheet on mount when `mode=login` |
| L3 | OAuth skips email verification redirect | OAuth users with `emailVerified: true` from backend go straight to profile/tabs — expected for social |

---

## Env / config checklist

### Mobile (must be present at **build** time for `EXPO_PUBLIC_*`)

| Variable | Required for | Notes |
|----------|----------------|-------|
| `EXPO_PUBLIC_API_URL` | All auth | Production API origin; **no** trailing `/api` (see `normalizeApiBaseUrl` in `lib/api.ts`) |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Google OAuth | Web application OAuth client ID |
| `EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME` | iOS Google (optional) | Override reversed client ID; if unset, derived from Web Client ID in `app.config.js` |
| `EXPO_PUBLIC_PROJECT_ID` / `EXPO_PUBLIC_EAS_PROJECT_ID` | Push only | Not auth-blocking |

**Apple:** no mobile env vars.

**EAS:** configure secrets in Expo dashboard (see [EAS build environment](#eas-build-environment) below). Do not commit secret values in `eas.json`.

### Backend (not in mobile repo — required for verify-id-token)

| Variable | Purpose |
|----------|---------|
| `GOOGLE_CLIENT_ID` | Must match mobile **Web** Client ID |
| `GOOGLE_CLIENT_SECRET` | Server verification |
| `APPLE_CLIENT_ID` | Service ID / bundle (per server setup) |
| `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY` | Apple JWT verification |

### Native / console

- [ ] Google Cloud: Web client ID → mobile env
- [ ] Google Cloud: Android OAuth client + SHA-1 (debug + release)
- [ ] Google Cloud: iOS OAuth client + URL scheme in native project
- [ ] Apple Developer: Sign in with Apple on App ID `com.eklan.ai`
- [ ] EAS Secrets for production/preview builds
- [ ] Rebuild native app after `app.json` / plugin changes

---

## EAS build environment

Expo injects **EAS Secrets** (Project → Secrets) as environment variables during `eas build`. Names must match exactly (including `EXPO_PUBLIC_` prefix). Do not store secrets in the repo or in `eas.json` `env` values.

| Secret name | Required for | Notes |
|-------------|----------------|-------|
| `EXPO_PUBLIC_API_URL` | All auth / API | Production API origin; no trailing `/api` |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Google OAuth | Web application OAuth client ID |
| `EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME` | iOS Google (optional) | e.g. `com.googleusercontent.apps.XXXX`; auto-derived from Web Client ID if omitted |

`eas.json` includes empty `"env": {}` placeholders on `preview` / `production` profiles as a reminder that non-secret overrides can go there; **secrets belong in the Expo dashboard**.

After changing `app.config.js` / Google plugin: run a **new native build** (`eas build`), not only OTA update.

---

## Manual QA steps

### Preflight

1. Confirm backend running and `POST /api/v1/auth/verify-id-token` exists (curl with test token or server logs).
2. Local dev: set `EXPO_PUBLIC_API_URL` to machine IP (not `localhost` on physical device).
3. Use **development build**, not Expo Go, for Google on Android.

### Google — Android

1. Open `/(auth)/auth` → **Continue with Google**.
2. Pick account → expect navigation to profile setup (new) or tabs (existing profile).
3. Kill app → reopen → should stay logged in (`app/index.tsx` hydrate).
4. If failure: logcat for `GoogleSignin`, DEVELOPER_ERROR, SHA-1 hints.

### Google — iOS

1. Same as Android on TestFlight/dev client build.
2. If sign-in UI fails to return to app: check iOS URL schemes (H1).

### Apple — iOS device

1. **Continue with Apple** (button visible only on iOS).
2. Complete Apple ID flow → same navigation as Google.
3. Test on real device (simulator limitations for Apple ID).

### Email (regression)

1. Sign up with email → OTP sheet → verify → profile setup.
2. Log in via splash → **I already have an account** → login sheet.
3. Wrong password → error message (not silent failure).

### Session / 401

1. After OAuth, background app → foreground (`BackgroundPrefetcher` calls `checkSession`).
2. Should **not** bounce to splash unless token invalid.

---

## Code changes from this audit

| File | Change |
|------|--------|
| `app/(auth)/auth.tsx` | Hide Apple button unless `Platform.OS === 'ios'`; auto-present login sheet when `mode=login` |
| `app.json` | `ios.usesAppleSignIn: true` |
| `app.config.js` | **New** — `@react-native-google-signin/google-signin` plugin with `iosUrlScheme` from env |
| `store/auth-store.ts` | Clear tokens before OAuth; persist `refreshToken` on login/register/OAuth |
| `services/oauth.service.ts` | Return and store `refreshToken` from verify-id-token response |
| `eas.json` | `_comment_env` + empty `env` on preview/production (secrets via dashboard) |
| `.env.example` | Document required `EXPO_PUBLIC_*` names |
| `docs/DEBUG_LOGIN.md` | Sign-in path → `/api/v1/auth/sign-in/email` |
| `docs/AUTH_SIGNUP_AUDIT.md` | This document |
| `docs/AUTH_SIGNUP_SOLUTIONS.md` | Actionable fixes companion |

**Still requires ops/backend (not code-only):** EAS secrets for production/preview, Google Android SHA-1 (release), backend `verify-id-token` alignment, **new EAS native build** after `app.config.js` plugin change.

---

## Related docs

| Doc | Status |
|-----|--------|
| `docs/NATIVE_OAUTH_SETUP.md` | ✅ Matches implementation |
| `docs/OAUTH_SETUP.md` | ⚠️ Web OAuth / redirect URIs — legacy |
| `docs/BETTER_AUTH_INTEGRATION.md` | ⚠️ Browser flow — legacy |
| `docs/DEBUG_LOGIN.md` | ✅ Sign-in path updated |
