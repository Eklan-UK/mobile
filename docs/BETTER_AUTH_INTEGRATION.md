# Better Auth Social Login Integration

## Overview

This document describes the Better Auth social login integration for the mobile app, supporting Google and Apple sign-in.

## Implementation Details

### OAuth Flow

1. **User initiates OAuth**: User taps "Sign in with Google/Apple"
2. **Redirect to Better Auth**: App opens browser with Better Auth OAuth endpoint
3. **Provider Authentication**: User authenticates with Google/Apple
4. **Callback**: Better Auth redirects back to app with callback URL
5. **Session Retrieval**: App gets session from Better Auth `/api/v1/auth/session` endpoint
6. **Token Storage**: Session token is stored securely for future API calls

### Key Components

#### 1. OAuth Service (`mobile/services/oauth.service.ts`)

- `signInWithGoogle()`: Handles Google OAuth flow
- `signInWithApple()`: Handles Apple OAuth flow (iOS only)
- `getSessionFromBetterAuth()`: Retrieves session after OAuth callback
- `validateTokenAndGetUser()`: Fallback token validation

#### 2. Auth Store (`mobile/store/auth-store.ts`)

- `signInWithGoogle()`: Wraps OAuth service and updates app state
- `signInWithApple()`: Wraps OAuth service and updates app state
- Handles navigation after successful OAuth

#### 3. API Client (`mobile/lib/api.ts`)

- Configured with `withCredentials: true` for cookie support
- Automatically attaches Bearer token to requests
- Handles token refresh

### Better Auth Configuration

The backend Better Auth is configured with:

```typescript
socialProviders: {
  google: {
    clientId: config.GOOGLE_CLIENT_ID,
    clientSecret: config.GOOGLE_CLIENT_SECRET,
    enabled: !!config.GOOGLE_CLIENT_ID && !!config.GOOGLE_CLIENT_SECRET,
  },
  apple: {
    clientId: config.APPLE_CLIENT_ID,
    clientSecret: config.APPLE_CLIENT_SECRET,
    enabled: !!(config.APPLE_CLIENT_ID && config.APPLE_CLIENT_SECRET),
  },
}
```

### Mobile App Configuration

#### Redirect URI

The app uses a custom URL scheme for OAuth callbacks:
- **Scheme**: `elkan://`
- **Path**: `auth/callback`
- **Full URI**: `elkan://auth/callback`

This is configured in:
- `app.json`: `"scheme": "elkan"`
- OAuth service: Uses `AuthSession.makeRedirectUri()` with scheme and path

#### Trusted Origins

The backend Better Auth configuration includes mobile app origins:
- `elkan://` (production)
- `exp://` (Expo development)

### OAuth Flow Steps

#### Google Sign-In

1. User taps "Continue with Google"
2. App creates redirect URI: `elkan://auth/callback`
3. Opens browser to: `${API_URL}/api/v1/auth/google?redirect_uri=elkan://auth/callback`
4. User authenticates with Google
5. Better Auth processes OAuth and redirects to: `elkan://auth/callback?code=...` or `elkan://auth/callback?token=...`
6. App receives callback URL
7. App calls `/api/v1/auth/session` to get session (cookies are set)
8. App stores token and user data
9. App navigates to main app

#### Apple Sign-In

1. User taps "Continue with Apple" (iOS only)
2. Same flow as Google, but uses `/api/v1/auth/apple` endpoint
3. Apple Sign-In requires iOS device

### Session Management

After OAuth, the app:

1. **Primary Method**: Calls `/api/v1/auth/session` endpoint
   - Better Auth sets session cookies during OAuth
   - Session endpoint returns session and user data
   - Token is extracted from session object

2. **Fallback Method**: If session endpoint fails
   - Checks callback URL for token parameter
   - Validates token using `/api/v1/users/current`
   - Stores token for future API calls

### Error Handling

- **User Cancellation**: Detected and handled gracefully
- **Network Errors**: Logged and user-friendly error shown
- **Token Validation Failure**: User prompted to try again
- **Session Retrieval Failure**: Falls back to URL token extraction

### Testing Checklist

- [ ] Google sign-in works on Android
- [ ] Google sign-in works on iOS
- [ ] Apple sign-in works on iOS (device only, not simulator)
- [ ] OAuth callback redirects properly
- [ ] Session is retrieved after OAuth
- [ ] Token is stored securely
- [ ] User data is correctly parsed
- [ ] Navigation works after successful OAuth
- [ ] Error handling works for cancellation
- [ ] Error handling works for network failures

### Known Issues / Limitations

1. **Apple Sign-In**: Only available on iOS devices (not simulator)
2. **Cookie Support**: Requires `withCredentials: true` in API client
3. **Redirect URI**: Must match backend configuration
4. **Session Endpoint**: Better Auth must have session endpoint enabled

### Troubleshooting

#### OAuth callback not working

- Check redirect URI matches backend configuration
- Verify URL scheme is registered in `app.json`
- Check backend logs for OAuth errors

#### Session not retrieved

- Verify cookies are being set (check network tab)
- Check if `/api/v1/auth/session` endpoint exists
- Try fallback token validation method

#### Token validation fails

- Check if token format is correct
- Verify `/api/v1/users/current` endpoint works
- Check token expiration

### Environment Variables Required

**Backend**:
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `APPLE_CLIENT_ID`
- `APPLE_CLIENT_SECRET`
- `APPLE_TEAM_ID`
- `APPLE_KEY_ID`
- `APPLE_PRIVATE_KEY`

**Mobile**:
- `EXPO_PUBLIC_API_URL` (backend URL)

### Future Improvements

1. Add more OAuth providers (GitHub, Discord, etc.)
2. Implement token refresh mechanism
3. Add OAuth state parameter for CSRF protection
4. Improve error messages for users
5. Add analytics for OAuth success/failure rates




















