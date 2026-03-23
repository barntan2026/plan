// Main Application
class LessonPlannerApp {
    
    constructor() {
        this.allEvents = [];
        this.expandedEvents = [];
        this.currentWeekStart = this.getMondayOfCurrentWeek();
        this.allLessonPlans = {};
        this.currentFilter = 'all';
        this.authUnsubscribe = null;
        this.plansUnsubscribe = null;
    }
    
    async init() {
        try {
            // Setup authentication listener
            this.setupAuthListener();
            
            // Setup UI event listeners
            this.setupEventListeners();
            
        } catch (error) {
            console.error('Initialization error:', error);
            UIService.showToast('Failed to initialize app', 'error');
        }
    }
    
    setupAuthListener() {
        this.authUnsubscribe = FirebaseService.onAuthStateChanged(async (user) => {
            if (user) {
                // User is signed in
                this.onUserSignedIn(user);
            } else {
                // User is signed out
                this.onUserSignedOut();
            }
        });
    }
    
    async onUserSignedIn(user) {
        try {
            // Hide auth section, show main section
            document.getElementById('authSection').style.display = 'none';
            document.getElementById('mainSection').style.display = 'block';
            document.getElementById('userEmail').textContent = user.email;
            document.getElementById('logoutBtn').style.display = 'block';
            document.getElementById('addLessonBtn').style.display = 'block';
            
            // Load calendar data if exists
            const calendarData = await FirebaseService.getCalendarData();
            if (calendarData && calendarData.icsContent) {
                this.loadCalendarFromFirebase(calendarData);
            } else {
                this.showLessonsForWeek();
            }
            
            // Watch for lesson plan updates
            this.setupPlansListener();
            
            // Watch for manual lesson updates
            this.setupManualLessonsListener();
            
        } catch (error) {
            console.error('Sign in error:', error);
            UIService.showToast('Error loading user data', 'error');
        }
    }
    
    onUserSignedOut() {
        // Show auth section, hide main section
        document.getElementById('authSection').style.display = 'flex';
        document.getElementById('mainSection').style.display = 'none';
        document.getElementById('userEmail').textContent = '';
        document.getElementById('logoutBtn').style.display = 'none';
        
        // Unsubscribe from plans listener
        if (this.plansUnsubscribe) {
            this.plansUnsubscribe();
        }
        
        // Clear data
        this.allEvents = [];
        this.expandedEvents = [];
        this.allLessonPlans = {};
    }
    
    setupPlansListener() {
        this.plansUnsubscribe = FirebaseService.watchLessonPlans((plans) => {
            this.allLessonPlans = plans;
            // Refresh current view
            this.showLessonsForWeek();
        });
    }
    
    setupEventListeners() {
        // Auth
        document.getElementById('googleSignInBtn').addEventListener('click', () => this.handleGoogleSignIn());
        document.getElementById('logoutBtn').addEventListener('click', () => this.handleLogout());
        
        // File upload
        document.getElementById('uploadBtn').addEventListener('click', () => {
            document.getElementById('icsFileInput').click();
        });
        document.getElementById('icsFileInput').addEventListener('change', async (e) => {
            if (e.target.files.length > 0) {
                await this.handleFileUpload(e.target.files[0]);
            }
        });
        
        // Add lesson
        document.getElementById('addLessonBtn').addEventListener('click', () => this.handleAddLesson());
        
        // Week navigation
        document.getElementById('prevWeekBtn').addEventListener('click', () => this.previousWeek());
        document.getElementById('nextWeekBtn').addEventListener('click', () => this.nextWeek());
        
        // Filter
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.setFilter(e.target.dataset.filter));
        });
        
        // Search
        document.getElementById('filterInput').addEventListener('input', (e) => this.filterLessons(e.target.value));
    }
    
    
    async handleGoogleSignIn() {
        try {
            await FirebaseService.signInWithGoogle();
            UIService.showToast('Successfully signed in', 'success');
        } catch (error) {
            console.error('Google sign-in error:', error);
            UIService.showToast(error.message, 'error');
        }
    }
    
    async handleLogout() {
        try {
            await FirebaseService.logout();
            UIService.showToast('Logged out', 'success');
        } catch (error) {
            UIService.showToast(error.message, 'error');
        }
    }
    
    async handleFileUpload(file) {
        try {
            if (!file.name.endsWith('.ics')) {
                UIService.showToast('Please upload an ICS file', 'error');
                return;
            }
            
            UIService.showToast('Processing ICS file...', 'info');
            
            const content = await this.readFile(file);
            const events = ICSParser.parse(content);
            
            if (events.length === 0) {
                UIService.showToast('No events found in ICS file', 'error');
                return;
            }
            
            // Expand recurring events
            this.allEvents = ICSParser.expandRecurrence(events);
            this.expandedEvents = [...this.allEvents];
            
            // Save to Firebase
            const user = FirebaseService.getCurrentUser();
            if (user) {
                await FirebaseService.saveCalendarData(file.name, this.expandedEvents);
                UIService.showToast(`Loaded ${this.expandedEvents.length} events`, 'success');
            }
            
            // Show current week
            this.currentWeekStart = this.getMondayOfCurrentWeek();
            this.showLessonsForWeek();
            
            // Clear file input for next upload
            document.getElementById('icsFileInput').value = '';
            
        } catch (error) {
            console.error('File upload error:', error);
            UIService.showToast('Error uploading ICS file: ' + error.message, 'error');
        }
    }
    
    readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }
    
    getMondayOfCurrentWeek() {
        const today = new Date();
        const day = today.getDay();
        const diff = today.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(today.setDate(diff));
        monday.setHours(0, 0, 0, 0);
        return monday;
    }

    isWeekInPast(weekStartDate) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const weekEndDate = new Date(weekStartDate);
        weekEndDate.setDate(weekEndDate.getDate() + 7); // End of week (next Monday)
        return weekEndDate <= today; // Week is past if it ends on or before today
    }
    
    previousWeek() {
        const newWeekStart = new Date(this.currentWeekStart);
        newWeekStart.setDate(newWeekStart.getDate() - 7);
        
        // Prevent navigating to past weeks
        if (this.isWeekInPast(newWeekStart)) {
            UIService.showToast('Cannot view past weeks', 'warning');
            return;
        }
        
        this.currentWeekStart = newWeekStart;
        this.showLessonsForWeek();
    }
    
    nextWeek() {
        this.currentWeekStart.setDate(this.currentWeekStart.getDate() + 7);
        this.showLessonsForWeek();
    }
    
    setFilter(filter) {
        this.currentFilter = filter;
        document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-filter="${filter}"]`).classList.add('active');
        this.showLessonsForWeek();
    }
    
    filterLessons(searchTerm) {
        const search = searchTerm.toLowerCase();
        document.querySelectorAll('.lesson-card').forEach(card => {
            const title = card.querySelector('.lesson-title').textContent.toLowerCase();
            const venue = card.querySelector('.lesson-meta-item:nth-child(2) span').textContent.toLowerCase();
            const visible = title.includes(search) || venue.includes(search);
            card.style.display = visible ? '' : 'none';
        });
    }
    
    showLessonsForWeek() {
        const weekLessons = ICSParser.getWeekLessons(this.expandedEvents, this.currentWeekStart);
        let filteredLessons = this.applyFilter(weekLessons);
        
        uiService.updateWeekDisplay(this.currentWeekStart);
        uiService.renderLessonsGrid(filteredLessons, this.allLessonPlans);
    }
    
    applyFilter(lessons) {
        if (this.currentFilter === 'all') return lessons;
        
        return lessons.filter(lesson => {
            const summary = lesson.summary.toLowerCase();
            switch (this.currentFilter) {
                case 'physics':
                    return summary.includes('physics') && !summary.includes('(p)');
                case 'practical':
                    return summary.includes('(p)');
                case 'meeting':
                    return summary.includes('ltt') || summary.includes('assembly') || summary.includes('ta');
                default:
                    return true;
            }
        });
    }
    
    openLessonDetail(lesson, existingPlan = null) {
        uiService.openLessonModal(lesson, existingPlan);
    }
    
    async saveLessonPlan() {
        try {
            if (!this.uiService?.currentLessonId) {
                UIService.showToast('No lesson selected', 'error');
                return;
            }
            
            const planData = uiService.getLessonPlanData();
            
            if (!planData.title.trim()) {
                UIService.showToast('Please enter a lesson plan title', 'error');
                return;
            }
            
            await FirebaseService.saveLessonPlan(uiService.currentLessonId, planData);
            UIService.showToast('Lesson plan saved successfully', 'success');
            uiService.closeLessonModal();
            
        } catch (error) {
            console.error('Save error:', error);
            UIService.showToast(error.message, 'error');
        }
    }
    
    loadCalendarFromFirebase(calendarData) {
        try {
            // Parse stored events - handle Firestore Timestamps and Date objects
            this.expandedEvents = calendarData.events.map(e => ({
                uid: e.uid,
                summary: e.summary,
                location: e.location,
                description: e.description,
                dtstart: e.dtstart?.toDate ? e.dtstart.toDate() : new Date(e.dtstart),
                dtend: e.dtend?.toDate ? e.dtend.toDate() : new Date(e.dtend),
                rrule: e.rrule
            }));
            
            this.showLessonsForWeek();
        } catch (error) {
            console.error('Error loading calendar from Firebase:', error);
            this.showLessonsForWeek();
        }
    }

    setupManualLessonsListener() {
        this.manualLessonsUnsubscribe = FirebaseService.watchManualLessons((lessons) => {
            // Merge manual lessons with ICS lessons
            this.expandedEvents = [...this.allEvents, ...lessons];
            this.showLessonsForWeek();
        });
    }

    async handleAddLesson() {
        // Open modal in lesson creation mode
        const uiService = new UIService();
        uiService.openLessonModalForCreate();
    }

    async updateLesson(lessonId, lessonData) {
        try {
            await FirebaseService.updateLesson(lessonId, lessonData);
            UIService.showToast('Lesson updated successfully', 'success');
            uiService.closeLessonModal();
        } catch (error) {
            console.error('Update error:', error);
            UIService.showToast(error.message, 'error');
        }
    }

    async deleteLesson(lessonId) {
        try {
            if (confirm('Are you sure you want to delete this lesson?')) {
                await FirebaseService.deleteLesson(lessonId);
                UIService.showToast('Lesson deleted successfully', 'success');
                uiService.closeLessonModal();
            }
        } catch (error) {
            console.error('Delete error:', error);
            UIService.showToast(error.message, 'error');
        }
    }
}

// Initialize app when DOM is ready
let appInstance;

document.addEventListener('DOMContentLoaded', () => {
    appInstance = new LessonPlannerApp();
    window.UIService = UIService; // Make available globally for inline handlers
    window.uiService = uiService;
    window.app = appInstance; // Make app instance globally available
    UIService.app = appInstance;
    appInstance.init();
});
