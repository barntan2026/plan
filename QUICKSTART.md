# Quick Start Guide

Get your Lesson Planning Tool up and running in under 5 minutes!

## Pre-requisites
- Google account (for Firebase)
- An ICS file from your calendar system
- A modern web browser

## 1️⃣ Set Up Firebase (2 minutes)

### Quick Steps:
1. Go to https://console.firebase.google.com/
2. Click "Add project" → name it "lessonplans"
3. Go to **Authentication** → Enable "Email/Password" AND "Google"
4. Go to **Firestore Database** → Create database in production mode
5. Go to **Firestore Rules** → replace with [security rules](FIREBASE_SETUP.md#32-set-up-security-rules)
6. Go to **Project Settings** (⚙️) → Create web app
7. Copy your Firebase config

## 2️⃣ Configure the App (1 minute)

1. Open `js/firebase-config.js`
2. Replace the placeholder values with your Firebase config
3. Save the file

Example:
```javascript
const firebaseConfig = {
    apiKey: "AIzaSyD-YOUR-KEY-HERE",
    authDomain: "your-project-id.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project-id.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abc123def456"
};
```

## 3️⃣ Run the App (1 minute)

**Option A: Direct (easiest)**
- Double-click `index.html`
- Done! ✨

**Option B: Local Server (recommended)**
```bash
cd /path/to/lesson-planner
python -m http.server 8000
# Open http://localhost:8000
```

## 4️⃣ First Time Use

1. **Sign In**
   - Click "Sign in with Google"
   - Authorize the app with your Google account

2. **Upload Calendar**
   - Click "Upload ICS File"
   - Select your calendar file (`.ics`)

3. **Create Lesson Plan**
   - Click on any lesson card
   - Fill in the plan details
   - Click "Save Lesson Plan"

4. **Access Anywhere**
   - Deploy to Firebase Hosting (optional)
   - Or use a cloud storage service
   - Access the same `index.html` from anywhere!

## File Structure

```
lesson-planner/
├── index.html               ← Open this!
├── README.md                ← Full documentation
├── FIREBASE_SETUP.md        ← Detailed setup guide
├── js/
│   └── firebase-config.js   ← Edit this with your config
├── css/
│   ├── style.css
│   └── modal.css
└── js/ (other files)
```

## Features at a Glance

| Feature | How to Use |
|---------|-----------|
| 📅 View Week | Use ← and → buttons to navigate weeks |
| 🔍 Search | Type in search box to find lessons |
| 🏷️ Filter | Click filter buttons (All, Physics, etc.) |
| ✏️ Plan | Click lesson card → fill form → Save |
| 🔗 Links | Click "Add Resource Link" in lesson plan |
| ☁️ Sync | All data automatically saved to Firebase |

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Enter (in login) | Sign in |
| Enter (in lesson form) | No shortcut, use Save button |

## Troubleshooting Quick Fixes

| Problem | Solution |
|---------|----------|
| "Please configure Firebase" | Update `firebase-config.js` with your credentials |
| Page shows blank | Try hard refresh (Ctrl+Shift+R or Cmd+Shift+R) |
| Can't sign in | Check Internet connection, verify Firebase setup |
| ICS file not loading | Make sure file is `.ics` format and not corrupted |
| Lesson plans not saving | Check browser console (F12) for errors |

## Deploy to Internet (Optional)

Make your app accessible from anywhere:

### Option 1: Firebase Hosting (Free!)
```bash
npm install -g firebase-tools
firebase login
firebase init hosting
firebase deploy
```

### Option 2: GitHub Pages
1. Push your files to GitHub
2. Enable Pages in repository settings
3. Access at `https://username.github.io/lesson-planner`

### Option 3: Simple Cloud Storage
- Upload files to Dropbox / Google Drive / OneDrive
- Create shareable link

## Next Steps

1. ✅ Set up Firebase
2. ✅ Configure app
3. ✅ Upload ICS calendar
4. 📚 Start planning lessons!

## Need Help?

- **Firebase Issues?** → See [FIREBASE_SETUP.md](FIREBASE_SETUP.md)
- **Full Documentation?** → See [README.md](README.md)
- **Browser Console?** → Press F12 to see error messages

---

**You're all set!** Start planning your lessons! 🎓
