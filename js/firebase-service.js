// Firebase Service - Handles all Firebase operations
class FirebaseService {
    
    /**
     * Sign up a new user with email and password
     */
    static async signUp(email, password) {
        try {
            const result = await auth.createUserWithEmailAndPassword(email, password);
            return result.user;
        } catch (error) {
            throw new Error(ICSParser.getFirebaseErrorMessage(error.code));
        }
    }
    
    /**
     * Login user with email and password
     */
    static async login(email, password) {
        try {
            const result = await auth.signInWithEmailAndPassword(email, password);
            return result.user;
        } catch (error) {
            throw new Error(this.getFirebaseErrorMessage(error.code));
        }
    }
    
    /**
     * Sign in with Google
     */
    static async signInWithGoogle() {
        try {
            const provider = new firebase.auth.GoogleAuthProvider();
            const result = await auth.signInWithPopup(provider);
            return result.user;
        } catch (error) {
            throw new Error(this.getFirebaseErrorMessage(error.code));
        }
    }
    
    /**
     * Logout current user
     */
    static async logout() {
        try {
            await auth.signOut();
        } catch (error) {
            throw new Error('Failed to logout');
        }
    }
    
    /**
     * Get current user
     */
    static getCurrentUser() {
        return auth.currentUser;
    }
    
    /**
     * Watch for authentication state changes
     */
    static onAuthStateChanged(callback) {
        return auth.onAuthStateChanged(callback);
    }
    
    /**
     * Save lesson plan to Firestore
     */
    static async saveLessonPlan(lessonId, planData) {
        try {
            const user = auth.currentUser;
            if (!user) throw new Error('User not authenticated');
            
            const planRef = db.collection('users').doc(user.uid)
                .collection('lessonPlans').doc(lessonId);
            
            await planRef.set({
                ...planData,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            
            return lessonId;
        } catch (error) {
            throw new Error('Failed to save lesson plan: ' + error.message);
        }
    }
    
    /**
     * Get lesson plan from Firestore
     */
    static async getLessonPlan(lessonId) {
        try {
            const user = auth.currentUser;
            if (!user) throw new Error('User not authenticated');
            
            const planDoc = await db.collection('users').doc(user.uid)
                .collection('lessonPlans').doc(lessonId).get();
            
            if (planDoc.exists) {
                return planDoc.data();
            }
            return null;
        } catch (error) {
            throw new Error('Failed to get lesson plan: ' + error.message);
        }
    }
    
    /**
     * Get all lesson plans for user
     */
    static async getAllLessonPlans() {
        try {
            const user = auth.currentUser;
            if (!user) throw new Error('User not authenticated');
            
            const snapshot = await db.collection('users').doc(user.uid)
                .collection('lessonPlans').get();
            
            const plans = {};
            snapshot.forEach(doc => {
                plans[doc.id] = doc.data();
            });
            return plans;
        } catch (error) {
            throw new Error('Failed to get lesson plans: ' + error.message);
        }
    }
    
    /**
     * Delete lesson plan
     */
    static async deleteLessonPlan(lessonId) {
        try {
            const user = auth.currentUser;
            if (!user) throw new Error('User not authenticated');
            
            await db.collection('users').doc(user.uid)
                .collection('lessonPlans').doc(lessonId).delete();
        } catch (error) {
            throw new Error('Failed to delete lesson plan: ' + error.message);
        }
    }
    
    /**
     * Save ICS calendar data
     */
    static async saveCalendarData(calendarName, events) {
        try {
            const user = auth.currentUser;
            if (!user) throw new Error('User not authenticated');
            
            const calendarRef = db.collection('users').doc(user.uid)
                .collection('calendars').doc('default');
            
            await calendarRef.set({
                name: calendarName,
                eventCount: events.length,
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
                events: events.map(e => ({
                    uid: e.uid,
                    summary: e.summary,
                    dtstart: e.dtstart ? new Date(e.dtstart) : null,
                    dtend: e.dtend ? new Date(e.dtend) : null,
                    location: e.location || '',
                    description: e.description || ''
                }))
            }, { merge: false });
            
            return true;
        } catch (error) {
            console.error('Calendar save error:', error);
            throw new Error('Failed to save calendar: ' + error.message);
        }
    }
    
    /**
     * Get calendar data
     */
    static async getCalendarData() {
        try {
            const user = auth.currentUser;
            if (!user) return null;
            
            const calendarDoc = await db.collection('users').doc(user.uid)
                .collection('calendars').doc('default').get();
            
            if (calendarDoc.exists) {
                return calendarDoc.data();
            }
            return null;
        } catch (error) {
            // This is expected on first login - user hasn't uploaded calendar yet
            if (error.code === 'permission-denied') {
                return null;
            }
            console.error('Failed to get calendar: ' + error.message);
            return null;
        }
    }
    
    /**
     * Convert Firebase Timestamp to JavaScript Date
     */
    static timestampToDate(timestamp) {
        if (!timestamp) return null;
        if (timestamp.toDate) return timestamp.toDate();
        return new Date(timestamp);
    }
    
    /**
     * Get user-friendly Firebase error message
     */
    static getFirebaseErrorMessage(code) {
        const messages = {
            'auth/email-already-in-use': 'This email is already registered.',
            'auth/invalid-email': 'The email address is invalid.',
            'auth/operation-not-allowed': 'Email/password accounts are not enabled.',
            'auth/weak-password': 'The password is too weak. Use at least 6 characters.',
            'auth/user-disabled': 'This user account has been disabled.',
            'auth/user-not-found': 'No user found with this email.',
            'auth/wrong-password': 'The password is incorrect.',
            'auth/too-many-requests': 'Too many failed login attempts. Please try again later.',
            'auth/network-request-failed': 'Network error. Please check your connection.',
        };
        
        return messages[code] || `Authentication error: ${code}`;
    }
    
    /**
     * Watch for real-time updates to lesson plans
     */
    static watchLessonPlans(callback) {
        try {
            const user = auth.currentUser;
            if (!user) throw new Error('User not authenticated');
            
            return db.collection('users').doc(user.uid)
                .collection('lessonPlans')
                .onSnapshot(snapshot => {
                    const plans = {};
                    snapshot.forEach(doc => {
                        plans[doc.id] = doc.data();
                    });
                    callback(plans);
                }, error => {
                    // This is expected on first login - user hasn't created plans yet
                    if (error.code === 'permission-denied') {
                        callback({});
                        return;
                    }
                    console.error('Error watching lesson plans:', error);
                });
        } catch (error) {
            console.error('Failed to watch lesson plans:', error.message);
            return null;
        }
    }
    
    /**
     * Batch update multiple lesson plans
     */
    static async batchUpdateLessonPlans(plansData) {
        try {
            const user = auth.currentUser;
            if (!user) throw new Error('User not authenticated');
            
            const batch = db.batch();
            
            for (const [lessonId, data] of Object.entries(plansData)) {
                const planRef = db.collection('users').doc(user.uid)
                    .collection('lessonPlans').doc(lessonId);
                
                batch.set(planRef, {
                    ...data,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
            }
            
            await batch.commit();
            return true;
        } catch (error) {
            throw new Error('Failed to batch update: ' + error.message);
        }
    }
}
