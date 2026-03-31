// Firebase Configuration
// IMPORTANT: Replace these with your Firebase project credentials
// Get these from: https://console.firebase.google.com
// Project Settings > General

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyChe4l5q4JqtsS6hMoIy9A9sO3lw-NqgXs",
    authDomain: "lessonplans-dbdfa.firebaseapp.com",
    projectId: "lessonplans-dbdfa",
    storageBucket: "lessonplans-dbdfa.firebasestorage.app",
    messagingSenderId: "1010879613251",
    appId: "1:1010879613251:web:b6bf8a3750dafbb74147f6",
    measurementId: "G-DYB6YM2J9Y"
};

// Initialize Firebase
let app;
let auth;
let db;

try {
    app = firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();
    db = firebase.firestore();
} catch (error) {
    console.error('Firebase initialization error:', error);
    console.warn('Please configure Firebase credentials in js/firebase-config.js');
}
