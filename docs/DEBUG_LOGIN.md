# Debugging Login Issues - Log Guide

## Overview
I've added comprehensive logging throughout the authentication flow to help debug login failures. All logs use emoji prefixes for easy identification.

## Where to Find Logs

### React Native Debugger
- Open Metro bundler terminal
- Look for console logs with emoji prefixes
- Logs appear in real-time as you attempt login

### Expo Go App
- Shake device/simulator
- Tap "Debug Remote JS"
- Open browser console at `http://localhost:19000/debugger-ui/`

## Log Flow for Email/Password Login

### 1. Login Attempt Started
```
🔐 Login attempt started: { email: "...", rememberMe: true }
```
**What it means:** User tapped login button, auth store received the request

### 2. API Request
```
🔵 API Request: {
  method: "POST",
  url: "/api/v1/auth/sign-in",
  baseURL: "http://localhost:3000",
  fullURL: "http://localhost:3000/api/v1/auth/sign-in"
}
⚠️ No token available
📤 Request data: { email: "...", password: "...", rememberMe: true }
```
**What it means:** Request is being sent to backend
**Check:** Verify the fullURL is correct and backend is running

### 3. Successful Response
```
✅ API Response: {
  status: 200,
  url: "/api/v1/auth/sign-in",
  data: { user: {...}, session: {...}, token: "..." }
}
✅ Login response received: {
  status: 200,
  hasUser: true,
  hasSession: true,
  hasToken: true
}
```
**What it means:** Backend responded successfully with user data

### 4. User Data Received
```
👤 User data: {
  id: "...",
  email: "...",
  firstName: "...",
  lastName: "..."
}
```
**What it means:** User object is valid and contains expected fields

### 5. Storing Credentials
```
💾 Storing credentials...
✅ Credentials stored successfully
```
**What it means:** Token and user data saved to secure storage

### 6. Onboarding Check
```
🔍 Checking onboarding status...
📋 Onboarding status: { hasOnboarded: true/false }
```
**What it means:** Checking if user needs profile setup

### 7. Navigation
```
🚀 Navigating to profile setup...
OR
🏠 Navigating to main app...
```
**What it means:** Redirecting user to appropriate screen

### 8. Success
```
✅ Login completed successfully
```
**What it means:** Login flow completed without errors

## Common Error Patterns

### Network Error
```
❌ API Error: {
  status: undefined,
  url: "/api/v1/auth/sign-in",
  message: "Network Error",
  responseData: undefined
}
```
**Problem:** Cannot reach backend
**Solutions:**
- Check backend is running: `cd front-end && yarn dev`
- Verify EXPO_PUBLIC_API_URL in `.env`
- For iOS Simulator: use `http://localhost:3000`
- For Android Emulator: use `http://10.0.2.2:3000`
- For physical device: use your computer's IP

### 401 Unauthorized
```
❌ API Error: {
  status: 401,
  url: "/api/v1/auth/sign-in",
  message: "Request failed with status code 401",
  responseData: { message: "Invalid credentials" }
}
```
**Problem:** Wrong email or password
**Solutions:**
- Verify email and password are correct
- Check if user exists in database
- Try creating a new account

### 400 Bad Request
```
❌ API Error: {
  status: 400,
  url: "/api/v1/auth/sign-in",
  responseData: { message: "Email is required" }
}
```
**Problem:** Missing or invalid request data
**Solutions:**
- Check request data in logs
- Verify email format is valid
- Ensure password meets requirements

### 500 Server Error
```
❌ API Error: {
  status: 500,
  url: "/api/v1/auth/sign-in",
  responseData: { message: "Internal server error" }
}
```
**Problem:** Backend error
**Solutions:**
- Check backend console for errors
- Verify database is connected
- Check backend environment variables

### No User Data in Response
```
❌ No user data in response
```
**Problem:** Backend returned success but no user object
**Solutions:**
- Check backend response structure
- Verify backend is returning user data
- Check backend logs for errors

## OAuth-Specific Logs

### Google OAuth Flow
```
🔵 Google OAuth: Starting flow...
🔐 Generating PKCE codes...
✅ PKCE codes generated
🔗 Google OAuth Config: { redirectUri: "...", apiUrl: "..." }
🌐 Opening Google OAuth URL: ...
📱 OAuth browser result: { type: "success" }
✅ OAuth redirect received: ...
🔑 Authorization code received: ...
🔄 Exchanging code for session...
✅ Google OAuth completed successfully
```

### Common OAuth Errors
```
⚠️ User cancelled Google sign-in
```
**What it means:** User closed OAuth browser

```
❌ No authorization code in redirect URL
```
**Problem:** OAuth provider didn't return code
**Solutions:**
- Check backend OAuth configuration
- Verify redirect URI matches in Google Console
- Check backend logs

## Debugging Steps

### Step 1: Check Network Connection
Look for:
```
🔵 API Request: { fullURL: "..." }
```
Verify the URL is correct and reachable

### Step 2: Check Backend Response
Look for:
```
✅ API Response: { status: 200, data: {...} }
OR
❌ API Error: { status: ..., responseData: {...} }
```

### Step 3: Check User Data
Look for:
```
👤 User data: { id: "...", email: "..." }
```
Verify all required fields are present

### Step 4: Check Storage
Look for:
```
💾 Storing credentials...
✅ Credentials stored successfully
```

### Step 5: Check Navigation
Look for:
```
🚀 Navigating to profile setup...
OR
🏠 Navigating to main app...
```

## Quick Fixes

### "Login failed" with no other logs
**Problem:** Request not reaching backend
**Fix:**
1. Check `.env` file has correct `EXPO_PUBLIC_API_URL`
2. Restart Expo: `yarn start --clear`
3. Verify backend is running

### Logs show 401 error
**Problem:** Invalid credentials
**Fix:**
1. Double-check email and password
2. Try registering a new account
3. Check backend user database

### Logs show network error
**Problem:** Cannot connect to backend
**Fix:**
1. Verify backend is running: `cd front-end && yarn dev`
2. Check firewall settings
3. Use correct IP for device type (see Network Error section above)

### OAuth logs stop after "Opening Google OAuth URL"
**Problem:** OAuth redirect not working
**Fix:**
1. Verify `app.json` has `"scheme": "elkan"`
2. Rebuild app after changing scheme
3. Check backend OAuth credentials

## Testing Checklist

- [ ] Backend is running (`yarn dev` in front-end folder)
- [ ] `.env` has correct `EXPO_PUBLIC_API_URL`
- [ ] Can reach backend from browser (visit `http://localhost:3000`)
- [ ] User account exists in database
- [ ] Email and password are correct
- [ ] Metro bundler is running
- [ ] Console logs are visible

## Need More Help?

If logs show an error you don't understand:
1. Copy the full error log (especially the `❌ API Error` or `❌ Login failed` logs)
2. Check the `responseData` field for backend error message
3. Check backend console for corresponding errors
4. Share the logs for further debugging

All logs are prefixed with emojis for easy searching:
- 🔵 = Request started
- ✅ = Success
- ❌ = Error
- ⚠️ = Warning
- 🔐 = Security/Auth operation
- 💾 = Storage operation
- 🔍 = Checking/Verifying
- 🚀 = Navigation
