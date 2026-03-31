// Firebase Service - Handles all Firebase operations
class FirebaseService {

    static normalizeEmail(email) {
        return (email || '').trim().toLowerCase();
    }

    static emailToDocId(email) {
        return this.normalizeEmail(email).replace(/[^a-z0-9]/g, '_');
    }
    
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
     * Ensure current user has an admin profile record.
     */
    static async ensureAdminProfile() {
        try {
            const user = auth.currentUser;
            if (!user) throw new Error('User not authenticated');

            await db.collection('users').doc(user.uid)
                .collection('profile').doc('role')
                .set({
                    role: 'admin',
                    email: this.normalizeEmail(user.email),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });

            return true;
        } catch (error) {
            throw new Error('Failed to ensure admin profile: ' + error.message);
        }
    }

    /**
     * Check whether an email is allowed to use the app.
     */
    static async canUserAccessApp(adminEmail, userEmail) {
        const normalizedUserEmail = this.normalizeEmail(userEmail);
        const normalizedAdminEmail = this.normalizeEmail(adminEmail);

        if (!normalizedUserEmail) return false;
        if (normalizedUserEmail === normalizedAdminEmail) return true;

        try {
            const accessDoc = await db.collection('memberAccess')
                .doc(this.emailToDocId(normalizedUserEmail)).get();

            if (!accessDoc.exists) return false;
            const data = accessDoc.data() || {};
            return data.active === true;
        } catch (error) {
            throw new Error('Failed to verify member access: ' + error.message);
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
            // Surface the real Firebase error code so the user can diagnose it.
            const detail = error.code ? `[${error.code}] ${error.message}` : error.message;
            throw new Error('Failed to save lesson plan: ' + detail);
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
                    description: e.description || '',
                    rrule: e.rrule || ''
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
                const data = calendarDoc.data();
                // Ensure events array exists
                if (data.events && Array.isArray(data.events)) {
                    // Convert Firestore Timestamp objects to Date objects
                    data.events = data.events.map(e => ({
                        ...e,
                        dtstart: e.dtstart?.toDate ? e.dtstart.toDate() : new Date(e.dtstart),
                        dtend: e.dtend?.toDate ? e.dtend.toDate() : new Date(e.dtend)
                    }));
                }
                return data;
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

    /**
     * Create a new manual lesson
     */
    static async createLesson(lessonData) {
        try {
            const user = auth.currentUser;
            if (!user) throw new Error('User not authenticated');

            // Generate unique ID for the lesson
            const lessonId = db.collection('users').doc(user.uid)
                .collection('lessons').doc().id;

            const lessonsRef = db.collection('users').doc(user.uid)
                .collection('lessons').doc(lessonId);

            await lessonsRef.set({
                uid: lessonId,
                summary: lessonData.summary,
                dtstart: new Date(lessonData.dtstart),
                dtend: new Date(lessonData.dtend),
                location: lessonData.location || '',
                description: lessonData.description || '',
                isManual: true,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            return lessonId;
        } catch (error) {
            throw new Error('Failed to create lesson: ' + error.message);
        }
    }

    /**
     * Update an existing lesson
     */
    static async updateLesson(lessonId, lessonData) {
        try {
            const user = auth.currentUser;
            if (!user) throw new Error('User not authenticated');

            const lessonsRef = db.collection('users').doc(user.uid)
                .collection('lessons').doc(lessonId);

            await lessonsRef.set({
                summary: lessonData.summary,
                dtstart: new Date(lessonData.dtstart),
                dtend: new Date(lessonData.dtend),
                location: lessonData.location || '',
                description: lessonData.description || '',
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });

            return lessonId;
        } catch (error) {
            throw new Error('Failed to update lesson: ' + error.message);
        }
    }

    /**
     * Delete a lesson
     */
    static async deleteLesson(lessonId) {
        try {
            const user = auth.currentUser;
            if (!user) throw new Error('User not authenticated');

            await db.collection('users').doc(user.uid)
                .collection('lessons').doc(lessonId).delete();

            return true;
        } catch (error) {
            throw new Error('Failed to delete lesson: ' + error.message);
        }
    }

    /**
     * Get all manual lessons
     */
    static async getManualLessons() {
        try {
            const user = auth.currentUser;
            if (!user) return [];

            const snapshot = await db.collection('users').doc(user.uid)
                .collection('lessons').get();

            const lessons = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                lessons.push({
                    ...data,
                    uid: doc.id,
                    dtstart: this.timestampToDate(data.dtstart),
                    dtend: this.timestampToDate(data.dtend)
                });
            });

            return lessons;
        } catch (error) {
            if (error.code === 'permission-denied') {
                return [];
            }
            console.error('Failed to get manual lessons:', error.message);
            return [];
        }
    }

    /**
     * Watch for real-time updates to manual lessons
     */
    static watchManualLessons(callback) {
        try {
            const user = auth.currentUser;
            if (!user) {
                callback([]);
                return null;
            }

            return db.collection('users').doc(user.uid)
                .collection('lessons')
                .onSnapshot(snapshot => {
                    const lessons = [];
                    snapshot.forEach(doc => {
                        const data = doc.data();
                        lessons.push({
                            ...data,
                            uid: doc.id,
                            dtstart: this.timestampToDate(data.dtstart),
                            dtend: this.timestampToDate(data.dtend)
                        });
                    });
                    callback(lessons);
                }, error => {
                    if (error.code === 'permission-denied') {
                        callback([]);
                        return;
                    }
                    console.error('Error watching manual lessons:', error);
                });
        } catch (error) {
            console.error('Failed to watch manual lessons:', error.message);
            return null;
        }
    }

    /**
     * Mark a specific ICS lesson occurrence as deleted
     */
    static async markLessonOccurrenceDeleted(occurrenceId, metadata = {}) {
        try {
            const user = auth.currentUser;
            if (!user) throw new Error('User not authenticated');

            await db.collection('users').doc(user.uid)
                .collection('deletedLessons').doc(occurrenceId)
                .set({
                    occurrenceId,
                    ...metadata,
                    deletedAt: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });

            return true;
        } catch (error) {
            throw new Error('Failed to delete ICS lesson: ' + error.message);
        }
    }

    /**
     * Watch for deleted ICS lesson occurrences
     */
    static watchDeletedLessonOccurrences(callback) {
        try {
            const user = auth.currentUser;
            if (!user) {
                callback([]);
                return null;
            }

            return db.collection('users').doc(user.uid)
                .collection('deletedLessons')
                .onSnapshot(snapshot => {
                    const deletedIds = [];
                    snapshot.forEach(doc => {
                        deletedIds.push(doc.id);
                    });
                    callback(deletedIds);
                }, error => {
                    if (error.code === 'permission-denied') {
                        callback([]);
                        return;
                    }
                    console.error('Error watching deleted lessons:', error);
                });
        } catch (error) {
            console.error('Failed to watch deleted lessons:', error.message);
            return null;
        }
    }

    /**
     * Add or update a member email under current admin user.
     */
    static async addMemberByEmail(email) {
        try {
            const user = auth.currentUser;
            if (!user) throw new Error('User not authenticated');

            const normalizedEmail = this.normalizeEmail(email);
            if (!normalizedEmail) throw new Error('Email is required');

            const memberId = this.emailToDocId(normalizedEmail);
            await db.collection('users').doc(user.uid)
                .collection('members').doc(memberId)
                .set({
                    email: normalizedEmail,
                    addedBy: this.normalizeEmail(user.email),
                    active: true,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });

            await db.collection('memberAccess').doc(memberId)
                .set({
                    email: normalizedEmail,
                    active: true,
                    addedBy: this.normalizeEmail(user.email),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });

            return memberId;
        } catch (error) {
            throw new Error('Failed to add member: ' + error.message);
        }
    }

    /**
     * Remove member by document ID.
     */
    static async removeMember(memberId, memberEmail = '') {
        try {
            const user = auth.currentUser;
            if (!user) throw new Error('User not authenticated');

            await db.collection('users').doc(user.uid)
                .collection('members').doc(memberId).delete();

            const accessDocId = memberEmail
                ? this.emailToDocId(memberEmail)
                : memberId;
            await db.collection('memberAccess').doc(accessDocId).delete();

            return true;
        } catch (error) {
            throw new Error('Failed to remove member: ' + error.message);
        }
    }

    /**
     * Watch members for current admin user.
     */
    static watchMembers(callback) {
        try {
            const user = auth.currentUser;
            if (!user) {
                callback([]);
                return null;
            }

            return db.collection('users').doc(user.uid)
                .collection('members')
                .onSnapshot(snapshot => {
                    const members = [];
                    snapshot.forEach(doc => {
                        members.push({ id: doc.id, ...doc.data() });
                    });
                    members.sort((a, b) => (a.email || '').localeCompare(b.email || ''));
                    callback(members);
                }, error => {
                    if (error.code === 'permission-denied') {
                        callback([]);
                        return;
                    }
                    console.error('Error watching members:', error);
                });
        } catch (error) {
            console.error('Failed to watch members:', error.message);
            return null;
        }
    }

    static async deleteLessonsByIds(lessonIds) {
        try {
            const user = auth.currentUser;
            if (!user) throw new Error('User not authenticated');

            const uniqueIds = Array.from(new Set((lessonIds || []).filter(Boolean)));
            if (uniqueIds.length === 0) return true;

            for (let i = 0; i < uniqueIds.length; i += 400) {
                const chunk = uniqueIds.slice(i, i + 400);
                const batch = db.batch();
                chunk.forEach((id) => {
                    const ref = db.collection('users').doc(user.uid)
                        .collection('lessons').doc(id);
                    batch.delete(ref);
                });
                await batch.commit();
            }

            return true;
        } catch (error) {
            throw new Error('Failed to delete lessons by range: ' + error.message);
        }
    }

    static async markLessonOccurrencesDeletedByIds(occurrenceIds) {
        try {
            const user = auth.currentUser;
            if (!user) throw new Error('User not authenticated');

            const uniqueIds = Array.from(new Set((occurrenceIds || []).filter(Boolean)));
            if (uniqueIds.length === 0) return true;

            for (let i = 0; i < uniqueIds.length; i += 400) {
                const chunk = uniqueIds.slice(i, i + 400);
                const batch = db.batch();
                chunk.forEach((id) => {
                    const ref = db.collection('users').doc(user.uid)
                        .collection('deletedLessons').doc(id);
                    batch.set(ref, {
                        occurrenceId: id,
                        deletedAt: firebase.firestore.FieldValue.serverTimestamp()
                    }, { merge: true });
                });
                await batch.commit();
            }

            return true;
        } catch (error) {
            throw new Error('Failed to mark lessons deleted by range: ' + error.message);
        }
    }

    static async deleteLessonPlansByIds(planIds) {
        try {
            const user = auth.currentUser;
            if (!user) throw new Error('User not authenticated');

            const uniqueIds = Array.from(new Set((planIds || []).filter(Boolean)));
            if (uniqueIds.length === 0) return true;

            for (let i = 0; i < uniqueIds.length; i += 400) {
                const chunk = uniqueIds.slice(i, i + 400);
                const batch = db.batch();
                chunk.forEach((id) => {
                    const ref = db.collection('users').doc(user.uid)
                        .collection('lessonPlans').doc(id);
                    batch.delete(ref);
                });
                await batch.commit();
            }

            return true;
        } catch (error) {
            throw new Error('Failed to delete lesson plans by range: ' + error.message);
        }
    }
}
