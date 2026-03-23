# Lesson Planning Tool

A comprehensive web-based lesson planning tool that helps teachers manage their timetable and create detailed lesson plans with real-time Firebase synchronization.

## Features

✨ **Dashboard View**: See all your week's lessons at a glance
📅 **ICS Calendar Integration**: Import your schedule from ICS files
✏️ **Detailed Lesson Planning**: Create rich lesson plans with:
  - Learning objectives
  - Lesson content with formatting
  - Resource links management
  - Assignment tracking
  - Additional notes

🔐 **Google Sign-In**: Secure authentication with your Google account
☁️ **Cloud Storage**: All data stored securely with Firebase
💼 **Access Anywhere**: Web-based app accessible from any device
📱 **Responsive Design**: Works seamlessly on desktop, tablet, and mobile
🔍 **Smart Filtering**: Filter lessons by type or search by name
⏱️ **Week Navigation**: Easy navigation between weeks

## Setup Instructions

### 1. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" and follow the setup wizard
3. Name your project (e.g., "lesson-planner")
4. Enable Google Analytics (optional)

### 2. Set Up Firebase Services

#### Authentication
1. In Firebase Console, go to **Authentication**
2. Click **Get Started**
3. Enable **Google** provider:
   - Click "Google"
   - Toggle "Enable"
   - Configure your support email
   - Click "Save"

#### Firestore Database
1. Go to **Firestore Database** in Firebase Console
2. Click **Create Database**
3. Start in **Production mode**
4. Choose a location (close to where you are)
5. Wait for Firestore to initialize

### 3. Set Firestore Security Rules

1. In Firestore Database, go to **Rules** tab
2. Replace the default rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
      match /lessonPlans/{document=**} {
        allow read, write: if request.auth.uid == userId;
      }
      match /calendars/{document=**} {
        allow read, write: if request.auth.uid == userId;
      }
    }
  }
}
```

3. Click **Publish**

### 4. Get Your Firebase Credentials

1. Go to **Project Settings** (gear icon)
2. Click **General** tab
3. Scroll down to **Your apps** section
4. Click on the web icon `</>` to create a web app
5. Copy the configuration object

### 5. Configure the Application

1. Open `js/firebase-config.js`
2. Replace the placeholder values with your Firebase credentials:

```javascript
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID",
    measurementId: "YOUR_MEASUREMENT_ID"
};
```

### 6. Run the Application

1. Open `index.html` in your web browser
2. Or use a local server: `python -m http.server 8000` and visit `http://localhost:8000`

## How to Use

### Getting Started
1. Sign in or create an account using your Google account
2. Once authenticated, you'll see the main dashboard

### Uploading Your Calendar
1. Click the "Upload ICS File" button
2. Select your calendar file (exported from your school calendar system)
3. The app will parse all events and display them by week

### Viewing Lessons
- Use the **Previous Week** and **Next Week** buttons to navigate
- Filter lessons using the filter buttons (All, Physics, Practical, Meetings)
- Search for specific lessons using the search box

### Creating Lesson Plans
1. Click on any lesson card to open its details
2. Fill in the lesson plan information:
   - **Title**: Name of the lesson
   - **Learning Objectives**: What students should learn
   - **Content/Notes**: Main lesson content
   - **Resources & Links**: Add useful links using the "+ Add Resource Link" button
   - **Assignment**: Homework or tasks
   - **Additional Notes**: Any other relevant information

3. Use the toolbar buttons to:
   - **B**: Make text bold
   - **I**: Make text italic
   - **🔗**: Insert a link
   - **≡**: Create a bullet list

4. Click "Save Lesson Plan" to store your plan

### Managing Resources
1. In the lesson plan editor, click "+ Add Resource Link"
2. Enter the resource name and URL
3. Resources appear as clickable links in your lesson plan
4. Click "Delete" to remove a resource

## Storage Information

Your data is stored securely in Firebase with the following structure:

```
database
└── users
    └── {userId}
        ├── lessonPlans
        │   └── {lessonId}
        │       ├── title
        │       ├── objectives
        │       ├── content
        │       ├── assignment
        │       ├── notes
        │       ├── resources: [{name, url}, ...]
        │       └── updatedAt
        └── calendars
            └── default
                ├── name
                ├── icsContent
                ├── eventCount
                ├── lastUpdated
                └── events

```

## Browser Compatibility

- ✅ Chrome (recommended)
- ✅ Firefox
- ✅ Safari
- ✅ Edge
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

## Tips & Tricks

1. **Offline Access**: The app supports offline persistence with Firebase (if permitted by browser)
2. **Weekly Planning**: Plan a whole week's lessons efficiently with the week view
3. **Resource Organization**: Use descriptive names for resources to quickly identify them later
4. **Markdown Support**: The content editor supports basic markdown formatting
5. **Regular Backup**: Your data is automatically backed up to Firebase

## Troubleshooting

### "Please configure Firebase credentials"
- Make sure you've updated `js/firebase-config.js` with your Firebase credentials
- Check that all fields are filled correctly

### "User not authenticated"
- Try logging out and logging back in
- Clear your browser cache and cookies
- Check that email/password authentication is enabled in Firebase

### ICS File Not Loading
- Ensure the file is a valid ICS/iCalendar format
- Check that the file is not corrupted
- Try exporting the calendar again from your calendar system

### Data Not Syncing
- Check your internet connection
- Ensure the Firestore security rules are correctly configured
- Try refreshing the page

## File Structure

```
lesson-planner/
├── index.html              # Main HTML file
├── css/
│   ├── style.css          # Main stylesheet
│   └── modal.css          # Modal styles
├── js/
│   ├── app.js             # Main application logic
│   ├── firebase-config.js  # Firebase configuration
│   ├── firebase-service.js # Firebase operations
│   ├── ui.js              # UI interactions
│   └── ics-parser.js      # ICS file parsing
├── data/                  # Data directory for future use
└── README.md             # This file
```

## Support

For help with:
- **Firebase Issues**: Visit [Firebase Documentation](https://firebase.google.com/docs)
- **ICS File Export**: Check your calendar application's export settings
- **App Issues**: Check the browser console for error messages

## License

This tool is provided as-is for educational and personal use.

## Version

Version 1.0.0 - March 2026
