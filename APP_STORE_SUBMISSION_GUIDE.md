# App Store Submission Guide

## Quick Start Checklist

### ✅ Completed
- [x] Microphone permission added to app.json
- [x] App name updated to "Elkan AI"
- [x] Console logs replaced with logger utility
- [x] Bundle identifier configured
- [x] App icons present
- [x] Splash screen configured

### 📋 Before Submission

1. **Update App Store Connect Metadata**
   - Use the content from `APP_STORE_METADATA.md`
   - Fill in your actual URLs (support, privacy policy, marketing)
   - Prepare screenshots for all required device sizes

2. **Build for Production**
   ```bash
   cd mobile
   eas build --platform ios --profile production
   ```

3. **Test on Real Device**
   - Install the production build on a real iPhone
   - Test all features, especially:
     - Microphone permission flow
     - Audio recording
     - All drill types
     - Navigation
     - Error handling

4. **Submit to TestFlight First**
   - Upload build to App Store Connect
   - Add internal/external testers
   - Test thoroughly before App Store submission

5. **Final App Store Submission**
   - Complete all metadata in App Store Connect
   - Upload screenshots
   - Set pricing and availability
   - Submit for review

## Step-by-Step Submission Process

### Step 1: Prepare Your Build

1. **Increment Build Number**
   - Update in `app.json` or EAS build configuration
   - Each submission needs a unique build number

2. **Create Production Build**
   ```bash
   eas build --platform ios --profile production
   ```

3. **Wait for Build to Complete**
   - Check status in EAS dashboard
   - Download and test the build if possible

### Step 2: App Store Connect Setup

1. **Create App Listing** (if not already created)
   - Go to App Store Connect
   - Click "+" to create new app
   - Select bundle identifier: `com.eklan.ai`
   - Choose app name: "Elkan AI"
   - Select primary language
   - Choose bundle ID

2. **Fill App Information**
   - Use content from `APP_STORE_METADATA.md`
   - App description (short and full)
   - Keywords (100 characters max)
   - Support URL (required)
   - Marketing URL (optional)
   - Privacy Policy URL (required)

3. **Upload Screenshots**
   - Minimum 3 screenshots per device size
   - Required sizes:
     - iPhone 6.7" (1290 x 2796)
     - iPhone 6.5" (1242 x 2688)
     - iPhone 5.5" (1242 x 2208)
     - iPad Pro 12.9" (2048 x 2732)

4. **Set App Icon**
   - Upload 1024x1024px icon
   - No transparency, no rounded corners

### Step 3: Upload Build

1. **Archive and Upload**
   - EAS Build will automatically upload to App Store Connect
   - Or manually upload via Xcode/Transporter

2. **Wait for Processing**
   - Apple processes the build (usually 10-30 minutes)
   - You'll receive an email when processing is complete

### Step 4: TestFlight (Recommended)

1. **Add Testers**
   - Internal testers (up to 100)
   - External testers (up to 10,000)
   - Send invitation emails

2. **Test Thoroughly**
   - Test all features
   - Check for crashes
   - Verify permissions work
   - Test on different iOS versions

3. **Collect Feedback**
   - Use TestFlight feedback
   - Fix any critical issues before App Store submission

### Step 5: Submit for Review

1. **Complete App Information**
   - Ensure all required fields are filled
   - Review all metadata for accuracy

2. **Set Version Information**
   - Version number (e.g., 1.0.0)
   - What's new description
   - Promotional text (optional)

3. **Set Pricing**
   - Free or paid
   - In-app purchases (if any)
   - Availability (all countries or specific)

4. **Add Review Information** (if needed)
   - Demo account credentials
   - Special instructions for reviewers
   - Notes about features to test

5. **Submit for Review**
   - Click "Submit for Review"
   - Answer export compliance questions
   - Submit!

### Step 6: Review Process

1. **Wait for Review**
   - Usually takes 24-48 hours
   - Can take up to 7 days
   - You'll receive email updates

2. **If Rejected**
   - Read rejection reason carefully
   - Fix the issue
   - Resubmit with explanation

3. **If Approved**
   - App goes live automatically (if set)
   - Or you can manually release
   - Celebrate! 🎉

## Common Rejection Reasons

1. **Missing Privacy Permissions** ✅ Fixed
2. **Generic App Name** ✅ Fixed
3. **Broken Functionality** - Test thoroughly
4. **Missing Privacy Policy** - Add URL
5. **Incomplete Metadata** - Fill all required fields
6. **Guideline Violations** - Review Apple's guidelines

## Important URLs to Update

Before submission, update these in `APP_STORE_METADATA.md`:

- Support URL: `https://yourwebsite.com/support`
- Privacy Policy URL: `https://yourwebsite.com/privacy-policy`
- Marketing URL: `https://yourwebsite.com` (optional)

## Support Resources

- [Apple App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [App Store Connect Help](https://help.apple.com/app-store-connect/)
- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)

## Notes

- TestFlight builds don't count toward App Store review
- You can submit multiple builds for review
- Metadata can be updated without resubmitting (except name/icon)
- Promotional text can be updated anytime

Good luck with your submission! 🚀



