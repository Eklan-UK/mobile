# Mobile (Expo) — Billing & Subscriptions

> **Audience:** Expo / React Native team.  
> **Backend:** This Next.js repo (`/api/v1/*`). The mobile app lives in a separate repo.  
> **Rule:** One account, one server-side entitlement (`isSubscribed`). Two payment rails by platform.

---

## Overview

Eklan Pro is a **digital subscription**. Apple requires In-App Purchase on iOS; Google Play and the web use Stripe. The mobile app must **never** mix rails on the wrong platform.

### Platform matrix

| Platform | Payment rail | Client must use |
|----------|--------------|-----------------|
| **iOS (Expo)** | StoreKit / Apple IAP (auto-renewable subscription) | `POST /api/v1/apple/verify` after purchase or restore |
| **Android (Expo)** | Stripe (hosted Checkout + Billing Portal) | `POST /api/v1/stripe/checkout`, `POST /api/v1/stripe/portal` |
| **Web** | Stripe | Same as Android (not in Expo doc scope) |

| Platform | Must **not** use for Pro |
|----------|---------------------------|
| **iOS** | Stripe Checkout URL, Billing Portal URL, Safari to `checkout.stripe.com`, “pay on website” CTAs for the same digital Pro SKU |
| **Android** | StoreKit, `expo-in-app-purchases` / IAP libraries for Pro |

After either rail activates premium on the server, **every** signed-in client sees `user.isSubscribed === true` on the next `GET /api/v1/users/current` (iOS purchase → Android login works without client-side merging).

```
                    ┌─────────────────────────────────────┐
                    │     GET /api/v1/users/current       │
                    │  isSubscribed (single gate)       │
                    └─────────────────┬───────────────────┘
                                      │
              ┌───────────────────────┴───────────────────────┐
              │                                               │
        iOS (StoreKit)                              Android (Stripe)
              │                                               │
   POST /api/v1/apple/verify                      POST /api/v1/stripe/checkout
   (renewals: POST /webhooks/apple)               POST /api/v1/webhooks/stripe
```

Deep dive for Apple server setup, App Store Connect, and compliance: [APPLE_IAP_IOS_IMPLEMENTATION.md](./APPLE_IAP_IOS_IMPLEMENTATION.md).  
Stripe checkout, portal, polling, and Android patterns: [stripe-implementation.md](./stripe-implementation.md).

---

## Prerequisites

### API base URL

- Point the Expo app at the correct API host per build flavor (development, staging, production).
- Align with backend env: `NEXT_PUBLIC_API_URL` / `BETTER_AUTH_URL` (backend repo `.env.example`). Mobile client vars: [`.env.example`](./.env.example).
- **Do not** embed Apple App Store Connect API keys, `.p8` private keys, shared secrets, or `STRIPE_SECRET_KEY` in the mobile bundle. Only the **public API host** and normal auth credentials belong on the client.

### Authentication

All billing endpoints require the same auth as other `/api/v1` routes (Better Auth session cookie and/or Bearer token). Unauthenticated calls return 401.

### Product identifiers

| What | Where it lives | Mobile usage |
|------|----------------|--------------|
| Apple subscription **product ID** | Server: `APPLE_PRO_MONTHLY_PRODUCT_ID` (must match App Store Connect) | Hard-code or remote-config the **same** product ID string in the iOS app for StoreKit `requestPurchase`. Not a secret, but must match the server. |
| Stripe **price** | Server only: `STRIPE_PREMIUM_MONTHLY_PRICE_ID` | Android never sends a price ID; backend creates Checkout from env. |

### Central `billing` module

Branch every upgrade, restore, and manage action on `Platform.OS` (see [APPLE_IAP_IOS_IMPLEMENTATION.md §3](./APPLE_IAP_IOS_IMPLEMENTATION.md#3-mobile-app-responsibilities)):

| Function | iOS | Android |
|----------|-----|---------|
| `startUpgrade()` | StoreKit purchase for Pro monthly product ID | `POST /api/v1/stripe/checkout` → open `{ url }` |
| `manageSubscription()` | Apple Manage Subscriptions UI (StoreKit 2) | `POST /api/v1/stripe/portal` → open `{ url }` |
| `restorePurchases()` | StoreKit restore → `POST /api/v1/apple/verify` per entitlement | Refresh `GET /api/v1/users/current` only |

---

## Shared (iOS + Android)

### Entitlement: trust the server

- [x] On app launch and after any purchase flow, call `GET /api/v1/users/current`.
- [x] Gate Pro features with **`user.isSubscribed` only**. Do not recompute expiry from `subscriptionExpiresAt` or interpret `appleSubscriptionStatus` / `stripeSubscriptionStatus` for gating unless product explicitly asks for diagnostic UI.
- [x] On premium API `402` with `code: "SubscriptionRequired"`, show paywall → subscriptions screen; iOS paywall must use StoreKit only.

### Poll after purchase

Web and Stripe mobile flows use **2 seconds × 5 attempts (~10 s)** after success before showing a “still activating” message. Use the same pattern on both platforms:

1. Complete platform payment (StoreKit success or return from Stripe deep link).
2. iOS: call `POST /api/v1/apple/verify` immediately with transaction payload.
3. Poll `GET /api/v1/users/current` until `user.isSubscribed === true`.
4. If still false after 5 attempts, show: payment is confirmed; access should appear shortly (refresh / retry).

Renewals and cancellations are driven by **webhooks** on the server (`/webhooks/apple`, `/webhooks/stripe`). The app does not need to listen for renewals; refresh profile on foreground is enough.

- [x] Poll pattern implemented in `services/billing.ts` (`pollUntilSubscribed`).
- [x] Foreground profile refresh via `checkSession()` in `BackgroundPrefetcher`.

---

## iOS implementation checklist (StoreKit only)

Matches backend checklist items **12–16** in [APPLE_IAP_IOS_IMPLEMENTATION.md §8](./APPLE_IAP_IOS_IMPLEMENTATION.md#8-implementation-checklist).

### Architecture

- [x] `Platform.OS === "ios"` branches in `billing.ts` and subscriptions / paywall screens.
- [x] **No** `POST /api/v1/stripe/checkout`, **no** `checkout.stripe.com`, **no** Stripe Billing Portal on iOS for digital Pro.
- [x] Primary CTA when not subscribed: **Subscribe** → StoreKit purchase (not “Upgrade via Stripe”).
- [x] **Restore purchases** visible and wired to restore + verify.
- [x] When subscribed: **Manage subscription** → Apple subscription management UI only.

### StoreKit libraries (Expo)

There is **no** mobile app in this workspace; pick a library that supports **auto-renewable subscriptions** and **StoreKit 2** transaction payloads (JWS), and works with your EAS / dev-client setup:

| Package | Notes |
|---------|--------|
| **`react-native-iap`** | Common choice with Expo dev client / prebuild; StoreKit 2 APIs, purchase listeners, restore. Evaluate against your Expo SDK version and iOS deployment target. |
| **`expo-in-app-purchases`** | Older Expo module; confirm StoreKit 2 / subscription support before committing. |
| **Native StoreKit 2** | Via config plugin or custom native module if you need `showManageSubscriptions` and latest APIs directly. |

Server verification uses the **App Store Server API** and optional JWS from the device — the app sends IDs/JWS to `POST /api/v1/apple/verify`; it does **not** unlock Pro based on client-only receipt trust.

### Purchase flow

- [x] Initialize IAP connection when subscriptions screen mounts (iOS only).
- [x] Load product metadata for the configured monthly Pro product ID (same string as server `APPLE_PRO_MONTHLY_PRODUCT_ID`).
- [x] On successful purchase (or `purchaseUpdated` listener), collect:
  - `transactionId`
  - `originalTransactionId`
  - `productId`
  - `signedTransactionInfo` (StoreKit 2 JWS) when the library exposes it
- [x] `POST /api/v1/apple/verify` with auth headers (see [API reference](#api-reference)).
- [x] On verify `200` with `isSubscribed: true`, still poll `GET /api/v1/users/current` for consistency with web Stripe flow.
- [x] Finish / acknowledge the transaction per library docs after verify succeeds.

### Restore flow

- [x] User taps **Restore purchases** → StoreKit restore completed transactions.
- [x] For each active entitlement, call `POST /api/v1/apple/verify` (same body shape as purchase).
- [x] Poll `GET /api/v1/users/current` until `isSubscribed` is true or show clear failure message.

### Manage subscription

- [x] Use StoreKit 2 **Manage Subscriptions** sheet (`showManageSubscriptions` in native APIs, or equivalent exposed by your IAP library), or Settings deep link as fallback.
- [x] Do not open Stripe portal URLs on iOS.

### App Review (iOS)

- [ ] No external payment links or copy that bypass IAP for digital Pro ([APPLE_IAP §7](./APPLE_IAP_IOS_IMPLEMENTATION.md#7-app-review--compliance)).
- [ ] Optional copy: same account works on Android/web; payment method may differ; entitlement is shared via sign-in.

---

## Android implementation checklist (Stripe)

Follow [stripe-implementation.md §16](./stripe-implementation.md#16-mobile-implementation-checklist). Summary for Expo:

### Subscriptions screen

- [x] Load `GET /api/v1/users/current` on mount (`isSubscribed`, `subscriptionPlan`, optional `subscriptionExpiresAt` for display only).
- [x] Not subscribed: **Upgrade to Pro** → `POST /api/v1/stripe/checkout` (no body) → open returned `url` in `WebBrowser` / Chrome Custom Tabs.
- [x] Subscribed: **Manage subscription** → `POST /api/v1/stripe/portal` → open `url` (only if user already has Stripe billing — server returns 400 if no `stripeCustomerId`).
- [x] Loading and error states (spinner, toast).

### Deep links (coordinate with backend)

Checkout `success_url` / `cancel_url` and portal `return_url` are built from server `NEXT_PUBLIC_APP_URL` today (web paths). For Android you need backend or env support for mobile deep links, e.g.:

- `elkan://subscription/success?checkout=success` (matches `scheme` in `app.json`)
- `elkan://subscription/cancel`
- Portal return → subscriptions route in app

- [x] Register URL scheme / intent filters in Expo config (`scheme: "elkan"`; Android manifest from prebuild).
- [x] On success deep link: navigate to subscriptions screen and start polling (2 s × 5).
- [x] On `isSubscribed === true`: success toast; unlock UI.

### Feature gating

- [x] Mirror web allowlist: free users can reach home, profile, subscriptions, settings, practice hub (locked), drills list (locked), etc.; Pro-only routes redirect to subscriptions.
- [x] Locked controls navigate to subscriptions, not Stripe directly from random screens.

### What Android must not do

- [x] Do not integrate Play Billing / IAP for this Pro SKU (Stripe rail only per product decision).
- [x] Do not call `POST /api/v1/apple/verify` on Android.

---

## API reference

Base path: `{API_HOST}/api/v1`. All examples assume JSON and session/Bearer auth.

### `GET /api/v1/users/current`

**Purpose:** Profile + subscription state (single source of truth for gating).

**Response `user` fields (subscription-relevant):**

```json
{
  "user": {
    "subscriptionPlan": "free",
    "subscriptionActivatedAt": null,
    "subscriptionExpiresAt": null,
    "stripeSubscriptionStatus": null,
    "appleSubscriptionStatus": null,
    "isSubscribed": false
  }
}
```

| Field | Use on mobile |
|-------|----------------|
| `isSubscribed` | **Primary gate** for Pro UI and navigation |
| `subscriptionPlan` | Display (“Free” / “Pro”) |
| `subscriptionExpiresAt` | Optional display; do not use alone for gating |
| `stripeSubscriptionStatus` | Android diagnostics; server uses for `isUserSubscribed` |
| `appleSubscriptionStatus` | iOS diagnostics (`active`, `billing_grace`, `billing_retry`, `expired`, etc.); server uses for Apple-paid users |

Admin-only fields (`subscriptionPaymentMethod`, Stripe customer IDs, Apple transaction IDs) are **not** returned to the client.

---

### `POST /api/v1/apple/verify` (iOS only)

**Purpose:** Immediate unlock after purchase or restore. Renewals also arrive via `POST /api/v1/webhooks/apple` (no mobile action).

**Request body** (at least one identifier required):

```json
{
  "transactionId": "2000000123456789",
  "originalTransactionId": "2000000123456789",
  "productId": "com.eklan.ai.pro.monthly",
  "signedTransactionInfo": "<StoreKit 2 JWS when available>"
}
```

| Field | Required | Notes |
|-------|----------|--------|
| `transactionId` | One of three | Latest transaction id from StoreKit |
| `originalTransactionId` | One of three | Stable id across renewals |
| `signedTransactionInfo` | One of three | Preferred when library provides JWS |
| `productId` | Recommended | Must match server `APPLE_PRO_MONTHLY_PRODUCT_ID` if sent |

**Success (200):**

```json
{
  "success": true,
  "isSubscribed": true,
  "subscriptionPlan": "premium",
  "subscriptionExpiresAt": "2026-06-25T12:00:00.000Z"
}
```

**Errors:**

| Status | `code` | Meaning |
|--------|--------|---------|
| 400 | `ValidationError` | Body/schema or invalid `productId` |
| 400 | `VerificationFailed` | Apple validation failed |
| 401 | — | Not authenticated |
| 500 | `ConfigError` | Apple IAP not configured on server |

Then poll `GET /api/v1/users/current` as in [Shared](#shared-ios--android).

---

### `POST /api/v1/stripe/checkout` (Android only)

**Request:** empty body.  
**Response (200):** `{ "url": "https://checkout.stripe.com/..." }`  
Open `url` in browser; handle return via deep link; poll current user.

Errors: `ConfigError` (500), `NotFoundError` (404). See [stripe-implementation.md](./stripe-implementation.md).

---

### `POST /api/v1/stripe/portal` (Android only)

**Request:** empty body.  
**Response (200):** `{ "url": "https://billing.stripe.com/..." }`  
**Error (400):** No `stripeCustomerId` — user has not subscribed via Stripe yet.

---

## What NOT to do on iOS

| Do not | Why |
|--------|-----|
| Open Stripe Checkout or Billing Portal for Pro | App Store Guideline 3.1.1 — digital subscriptions in-app |
| Link to “subscribe on our website” for the same Pro SKU | Bypasses IAP |
| Set `isSubscribed` locally from StoreKit alone | Server validates with App Store Server API |
| Ship Apple `.p8`, issuer ID, or shared secret in the app | Server-only; see `.env.example` Apple section |
| Call `POST /api/v1/stripe/checkout` when `Platform.OS === "ios"` | Wrong rail; review rejection risk |

Stripe on iOS is still fine for **non-digital** flows if the product adds them later; the **Pro digital subscription** must stay on IAP.

---

## Testing

### iOS (sandbox)

Follow [APPLE_IAP_IOS_IMPLEMENTATION.md §9](./APPLE_IAP_IOS_IMPLEMENTATION.md#9-local-testing):

1. Create a **Sandbox Apple ID** in App Store Connect.
2. On device: Settings → App Store → Sandbox Account.
3. Point the app API at **staging** (or tunneled dev server with Apple env `sandbox`).
4. Purchase Pro in sandbox; confirm StoreKit returns a transaction.
5. Confirm app calls `POST /api/v1/apple/verify` and `GET /api/v1/users/current` returns `isSubscribed: true`.
6. Optional: sign in on Android with same account → Pro without a new purchase.

Apple Server Notifications require a **public HTTPS** URL (staging or ngrok); mobile does not test webhooks directly.

### Android (Stripe test mode)

- Use Stripe **test** keys on staging backend.
- `stripe listen --forward-to …/api/v1/webhooks/stripe` for local backend dev ([STRIPE_PAYMENTS_AND_KEYS.md](./STRIPE_PAYMENTS_AND_KEYS.md)).
- Complete test Checkout; verify polling reaches `isSubscribed: true`.

### Cross-platform QA

- [ ] iOS sandbox purchase → Android login shows Pro (`isSubscribed` on current user).
- [ ] Android Stripe subscribe → iOS login shows Pro (no second payment on iOS for access).
- [ ] App Review build: iOS paywall is IAP-only.

---

## Related documentation (this repo)

| Document | Contents |
|----------|----------|
| [APPLE_IAP_IOS_IMPLEMENTATION.md](./APPLE_IAP_IOS_IMPLEMENTATION.md) | Path A, platform matrix, verify/webhook design, App Store Connect, sandbox testing §9, checklist 12–16 |
| [stripe-implementation.md](./stripe-implementation.md) | Stripe endpoints, polling, deep links, Android mobile checklist §16 |
| [STRIPE_PAYMENTS_AND_KEYS.md](./STRIPE_PAYMENTS_AND_KEYS.md) | Stripe env vars, webhook forwarding |
| [`.env.example`](./.env.example) | Mobile `EXPO_PUBLIC_*` templates (API URL, Apple product ID, optional Stripe paths) |

Backend implementation references:

- `src/app/api/v1/apple/verify/route.ts`
- `src/app/api/v1/webhooks/apple/route.ts`
- `src/app/api/v1/stripe/checkout/route.ts`
- `src/app/api/v1/stripe/portal/route.ts`
- `src/app/api/v1/users/current/route.ts`
- `src/lib/api/user-subscription.ts`

---

## Implementation status (mobile repo)

Last audited against this checklist in the mobile Expo app (`/home/vahalla/Desktop/mobile`).

### Done in client (JS/TS)

| Area | Files / behavior |
|------|------------------|
| Central billing API | `services/billing.ts` — `startUpgrade`, `manageSubscription`, `restorePurchases`, `pollUntilSubscribed` (2 s × 5) |
| iOS StoreKit | `services/apple-iap.service.ts`, `constants/apple-iap.ts`, `types/apple-iap.ts`, `react-native-iap` + plugin in `app.json` |
| Android Stripe | `services/stripe.service.ts` (iOS guard), `expo-web-browser` checkout/portal |
| Subscriptions UI | `app/premium.tsx` — platform CTAs, restore (iOS), post-purchase poll |
| Deep links | `components/subscription/SubscriptionDeepLinkHandler.tsx` (Android only), `constants/subscription-deeplinks.ts` |
| Entitlement gating | `utils/subscription.ts`, `hooks/useIsSubscribed.ts`, plan/sessions/home locks → `/premium` |
| 402 paywall | `lib/api.ts` interceptor → `/premium` |
| Foreground refresh | `components/BackgroundPrefetcher.tsx` — `checkSession()` on app active |
| Env template | `.env.example` — `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_APPLE_PRO_MONTHLY_PRODUCT_ID`, optional Stripe paths |

### Requires native rebuild (EAS / dev client)

- Install `react-native-iap` + `react-native-nitro-modules` (already in `package.json`) and run a **new iOS/Android dev client or store build** after `app.json` plugin / `deploymentTarget` changes. **Expo Go will not work** for IAP.
- iOS: StoreKit 2 needs **iOS 15+** (`expo-build-properties` `deploymentTarget: "15.0"` in `app.json`).

### Requires backend / App Store Connect (not in mobile repo)

- [ ] App Store Connect: auto-renewable subscription product matching `EXPO_PUBLIC_APPLE_PRO_MONTHLY_PRODUCT_ID` / server `APPLE_PRO_MONTHLY_PRODUCT_ID`.
- [ ] Backend: `POST /api/v1/apple/verify`, Apple Server API env, `POST /webhooks/apple` (public HTTPS).
- [ ] Backend: Stripe checkout `success_url` / `cancel_url` / portal `return_url` → `elkan://subscription/...` for Android (today may still use web URLs).
- [ ] Sandbox / TestFlight purchase QA; cross-platform entitlement QA (checklist in [Testing](#testing)).
- [ ] App Review: no external payment copy for digital Pro on iOS ([App Review](#app-review-ios) items remain process/compliance, not code).
