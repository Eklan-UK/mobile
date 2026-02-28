# Backend OAuth Setup Guide

This guide will help you configure OAuth credentials for Google and Apple Sign-In in your backend.

## Prerequisites

- Backend server running (Next.js with Better Auth)
- Access to Google Cloud Console
- Access to Apple Developer Portal (for Apple Sign-In)

## 1. Google OAuth Setup

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select an existing one
3. Enable the **Google+ API**

### Step 2: Create OAuth 2.0 Credentials

1. Navigate to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **OAuth 2.0 Client ID**
3. Configure the consent screen if prompted:
   - User Type: External
   - App name: Elkan
   - User support email: your-email@example.com
   - Developer contact: your-email@example.com
4. Create OAuth Client ID:
   - Application type: **Web application**
   - Name: Elkan Backend
   - Authorized redirect URIs:
     ```
     http://localhost:3000/api/v1/auth/callback/google
     https://yourdomain.com/api/v1/auth/callback/google
     ```
5. Click **Create**
6. Copy the **Client ID** and **Client Secret**

### Step 3: Add to Backend .env

Add these to `/home/lord/Elkan-project/front-end/.env`:

```env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
```

## 2. Apple OAuth Setup

### Step 1: Create App ID

1. Go to [Apple Developer Portal](https://developer.apple.com/account)
2. Navigate to **Certificates, Identifiers & Profiles**
3. Click **Identifiers** > **+** (Add)
4. Select **App IDs** > Continue
5. Configure:
   - Description: Elkan
   - Bundle ID: `com.yourcompany.elkan`
   - Capabilities: Check **Sign in with Apple**
6. Click **Continue** > **Register**

### Step 2: Create Service ID

1. Click **Identifiers** > **+** (Add)
2. Select **Services IDs** > Continue
3. Configure:
   - Description: Elkan Web Service
   - Identifier: `com.yourcompany.elkan.service`
   - Check **Sign in with Apple**
4. Click **Continue** > **Register**
5. Click on the Service ID you just created
6. Click **Configure** next to Sign in with Apple
7. Configure:
   - Primary App ID: Select the App ID created in Step 1
   - Domains and Subdomains:
     ```
     localhost
     yourdomain.com
     ```
   - Return URLs:
     ```
     http://localhost:3000/api/v1/auth/callback/apple
     https://yourdomain.com/api/v1/auth/callback/apple
     ```
8. Click **Save** > **Continue** > **Register**

### Step 3: Create Private Key

1. Navigate to **Keys** > **+** (Add)
2. Configure:
   - Key Name: Elkan Sign in with Apple Key
   - Check **Sign in with Apple**
   - Click **Configure** > Select Primary App ID
3. Click **Continue** > **Register**
4. **Download the .p8 file** (you can only download once!)
5. Note the **Key ID** displayed

### Step 4: Get Team ID

1. Go to **Membership** in the sidebar
2. Copy your **Team ID**

### Step 5: Add to Backend .env

Add these to `/home/lord/Elkan-project/front-end/.env`:

```env
APPLE_CLIENT_ID=com.yourcompany.elkan.service
APPLE_TEAM_ID=YOUR_TEAM_ID
APPLE_KEY_ID=YOUR_KEY_ID
APPLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
YOUR_PRIVATE_KEY_CONTENT_HERE
-----END PRIVATE KEY-----"
```

**Note:** Better Auth will automatically generate the `APPLE_CLIENT_SECRET` JWT token from these credentials.

## 3. Verify Backend Configuration

### Check Better Auth Config

The backend should already have OAuth configured in `front-end/src/lib/api/better-auth.ts`:

```typescript
socialProviders: {
  google: {
    clientId: config.GOOGLE_CLIENT_ID || "",
    clientSecret: config.GOOGLE_CLIENT_SECRET || "",
    enabled: !!config.GOOGLE_CLIENT_ID && !!config.GOOGLE_CLIENT_SECRET,
  },
  apple: {
    clientId: config.APPLE_CLIENT_ID || "",
    clientSecret: config.APPLE_CLIENT_SECRET || "",
    enabled: !!(config.APPLE_CLIENT_ID && config.APPLE_CLIENT_SECRET),
  },
}
```

### Restart Backend

After adding environment variables:

```bash
cd /home/lord/Elkan-project/front-end
# Stop the current server (Ctrl+C)
yarn dev
```

### Test OAuth Endpoints

You can test if OAuth is configured correctly:

**Google:**
```bash
curl http://localhost:3000/api/v1/auth/google
```

**Apple:**
```bash
curl http://localhost:3000/api/v1/auth/apple
```

Both should redirect to their respective OAuth providers (or return an error if credentials are missing).

## 4. Mobile App Configuration

The mobile app is already configured with:
- OAuth scheme: `elkan`
- Redirect URI: `elkan://auth/callback`
- Google and Apple OAuth buttons
- PKCE security implementation

No additional mobile configuration needed!

## 5. Testing

### Test Google OAuth

1. Start backend: `cd front-end && yarn dev`
2. Start mobile app: `cd mobile && yarn start`
3. Open app on iOS Simulator or Android Emulator
4. Tap "Continue with Google"
5. Sign in with Google account
6. Verify redirect back to app
7. Verify user is logged in

### Test Apple OAuth (iOS only)

1. Start backend and mobile app
2. Open app on iOS Simulator
3. Tap "Continue with Apple"
4. Sign in with Apple ID
5. Verify redirect back to app
6. Verify user is logged in

## Troubleshooting

### "Invalid client" Error
- Check `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are correct
- Verify credentials are for "Web application" type

### "Invalid redirect URI" Error
- Verify redirect URI in Google Console matches exactly:
  `http://localhost:3000/api/v1/auth/callback/google`
- Check for trailing slashes or typos

### Apple OAuth Not Working
- Verify all Apple credentials are correct
- Check private key is properly formatted with newlines
- Ensure Service ID is configured with correct return URLs
- Verify Team ID and Key ID are correct

### Backend Not Starting
- Check `.env` file syntax
- Ensure private key is properly escaped
- Check backend logs for detailed errors

## Production Deployment

### Google OAuth
1. Add production domain to authorized redirect URIs:
   ```
   https://yourdomain.com/api/v1/auth/callback/google
   ```
2. Verify consent screen for production use
3. Submit for verification if using sensitive scopes

### Apple OAuth
1. Add production domain to Service ID configuration
2. Add production return URL:
   ```
   https://yourdomain.com/api/v1/auth/callback/apple
   ```
3. Ensure App ID is configured for production

### Mobile App
1. Update backend URL in mobile `.env`:
   ```env
   EXPO_PUBLIC_API_URL=https://yourdomain.com
   ```
2. Build production app with correct scheme
3. Test OAuth flow with production backend

## Security Checklist

- [ ] OAuth credentials stored in `.env` (not committed to git)
- [ ] Redirect URIs use HTTPS in production
- [ ] Google consent screen verified
- [ ] Apple private key secured
- [ ] Backend validates all OAuth responses
- [ ] Mobile app uses PKCE for Google OAuth
- [ ] Session tokens stored securely in mobile app
- [ ] OAuth errors don't expose sensitive information

## Summary

Once you've completed this setup:
1. ✅ Google OAuth will work on iOS and Android
2. ✅ Apple OAuth will work on iOS
3. ✅ Users can sign in with one tap
4. ✅ Sessions persist across app restarts
5. ✅ Onboarding flow works for new OAuth users

The OAuth integration provides a seamless, secure authentication experience for your users!
