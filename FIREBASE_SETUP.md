# Firebase Setup Guide

A detailed step-by-step guide to set up Firebase for the Lesson Planning Tool.

## Step 1: Create a Firebase Project

### 1.1 Go to Firebase Console
- Visit https://console.firebase.google.com/
- Sign in with your Google account (create one if needed)

### 1.2 Create a New Project
- Click the "**Add project**" button
- Enter your project name: `lesson-planner` (or any name you prefer)
- Uncheck "Enable Google Analytics for this project" (optional but recommended)
- Click "**Create project**"
- Wait 1-2 minutes for Firebase to provision your project

## Step 2: Set Up Google Authentication

1. In the left sidebar, click **Authentication**
2. Click **Get Started**
3. In the "Sign-in methods" tab, click **Google**
4. Toggle the switch to **Enable**
5. Select a project support email from the dropdown (usually auto-filled)
6. Add your app name to the "Public-facing name" field
7. Click **Save**

Your users can now sign in with their Google accounts!

## Step 3: Create Firestore Database

### 3.1 Initialize Firestore
1. In the left sidebar, click **Firestore Database**
2. Click **Create database**
3. For security rules, select **Start in production mode**
4. Choose the location closest to you:
   - North America: `us-central1`
   - Europe: `europe-west1`
   - Asia: `asia-southeast1` (recommended for Singapore/Asia)
5. Click **Create**
6. Wait 1-2 minutes for the database to initialize

### 3.2 Set Up Security Rules

**IMPORTANT**: Configure security rules to protect user data.

1. In Firestore Database, click the **Rules** tab
2. Delete the existing rules
3. Copy and paste this security rule:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Global member access list (readable by authenticated users)
    match /memberAccess/{memberId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null
        && exists(/databases/$(database)/documents/users/$(request.auth.uid)/profile/role)
        && get(/databases/$(database)/documents/users/$(request.auth.uid)/profile/role).data.role == 'admin';
    }

    // Only authenticated users can access their own data
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;

      // User profile/role subcollection
      match /profile/{document=**} {
        allow read, write: if request.auth.uid == userId;
      }

      // Admin-managed members list under own user scope
      match /members/{document=**} {
        allow read, write: if request.auth.uid == userId;
      }
      
      // Lesson plans subcollection
      match /lessonPlans/{document=**} {
        allow read, write: if request.auth.uid == userId;
      }
      
      // Calendar data subcollection
      match /calendars/{document=**} {
        allow read, write: if request.auth.uid == userId;
      }

      // Manually created lessons subcollection
      match /lessons/{document=**} {
        allow read, write: if request.auth.uid == userId;
      }

      // Deleted ICS lesson occurrences subcollection
      match /deletedLessons/{document=**} {
        allow read, write: if request.auth.uid == userId;
      }
    }
  }
}
```

4. Click **Publish**

These rules ensure that:
- Only authenticated users can access the database
- Users can only see/modify their own data
- Lesson plans are protected at the user level

## Step 4: Get Firebase Configuration

### 4.1 Access Project Settings
1. Click the **gear icon** (⚙️) in the top-left corner of Firebase Console
2. Select **Project Settings**

### 4.2 Create Web App
1. Scroll down to "Your apps" section
2. Click the **Web icon** `</>`
3. Enter app nickname: `lesson-planner` (or any name)
4. Check "Also set up Firebase Hosting for this app" (optional)
5. Click **Register app**

### 4.3 Copy Firebase Config
You'll see a code snippet like:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyD...",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef1234567890",
  measurementId: "G-XXXXXXXXXX"
};
```

Copy all six/seven key-value pairs.

## Step 5: Configure the Application

### 5.1 Open Configuration File
1. In your lesson planner project folder, open: `js/firebase-config.js`

### 5.2 Paste Your Credentials
Replace the placeholder values with your copied Firebase config:

```javascript
const firebaseConfig = {
    apiKey: "AIzaSyD...",                    // Your API Key
    authDomain: "your-project-id.firebaseapp.com",  // Your Auth Domain
    projectId: "your-project-id",           // Your Project ID
    storageBucket: "your-project-id.appspot.com",   // Your Storage Bucket
    messagingSenderId: "1234567890",        // Your Messaging Sender ID
    appId: "1:1234567890:web:abcdef...",    // Your App ID
    measurementId: "G-XXXXXXXXXX"           // Your Measurement ID (optional)
};
```

### 5.3 Save the File
Save the file with Ctrl+S (or Cmd+S on Mac)

## Step 6: Enable Optional Features (Recommended)

### 6.1 Enable Offline Persistence
The app already supports offline persistence, but it depends on browser permissions:
- Desktop browsers: Generally allowed
- Mobile browsers: May require user permission
- Incognito/Private mode: Usually not allowed

### 6.2 Set Up Firestore Indexes (if needed)
- If you encounter index creation prompts, Firebase will automatically create them
- No manual action needed

## Step 7: Test the Setup

### 7.1 Run the Application
Option 1: Direct file access
- Open `index.html` in your web browser

Option 2: Local server (recommended)
```bash
# If you have Python 3 installed:
cd /path/to/lesson-planner
python -m http.server 8000

# Then open: http://localhost:8000
```

Option 3: If using Node.js / npm
```bash
# Install a simple server
npm install -g http-server

# Run from the project folder
http-server

# Then open: http://localhost:8080
```

### 7.2 Sign Up Test
1. Enter an email address
2. Enter a strong password (at least 6 characters)
3. Click "Login / Sign Up"
4. You should see the main dashboard
5. If successful, Firebase is configured correctly!

## Verification Checklist

- [ ] Firebase project created
- [ ] Google authentication enabled
- [ ] Firestore database created in production mode
- [ ] Security rules published
- [ ] Web app registered and config copied
- [ ] `firebase-config.js` updated with credentials
- [ ] Test sign-up successful with Google account
- [ ] Dashboard loads after login

## Common Issues & Solutions

### Issue: "Firebase initialization error"
**Solution**:
1. Check all values in `firebase-config.js` are correct
2. Make sure you have the right project ID and API Key
3. Try refreshing the page
4. Check browser console for specific errors (F12 > Console tab)

### Issue: "User not authenticated"
**Solution**:
1. Verify email/password authentication is enabled in Firebase Console
2. Try logging out and signing in again
3. Check security rules include the user access path

### Issue: "Permission denied" when saving lesson plan
**Solution**:
1. Verify security rules are correctly published
2. Make sure you're signed in (check top of app)
3. Try refreshing the page to re-authenticate

### Issue: "Cannot create accounts"
**Solution**:
1. Check that email/password provider is enabled
2. Ensure password is at least 6 characters
3. Check if email is already registered

## Security Best Practices

1. **Never share your credentials**: Keep `firebase-config.js` private
2. **API Key restrictions** (recommended for production):
   - Go to Google Cloud Console
   - Enable API key restrictions to your app domain
3. **Backup your data**: Download Firestore data regularly
4. **Monitor usage**: Check Firebase Console for unusual activity

## Next Steps

1. Upload your ICS calendar file
2. Start creating lesson plans
3. Share the app URL with yourself to access from anywhere

## Support

If you encounter issues:
1. Check the browser console: Press F12 and look at the "Console" tab
2. Check Firebase Console for error logs
3. Verify all credentials match between Firebase Console and `firebase-config.js`
4. Try incognito/private browsing to rule out cache issues

---

**Your app is now ready to use!** 🎉
