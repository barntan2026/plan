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
        this.manualLessonsUnsubscribe = null;
        this.mobileDayOffset = 0; // 0 = Monday, 1 = Tuesday, etc.
        this.currentTimeUpdateInterval = null;
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
            document.getElementById('userEmail').textContent = '';
            document.getElementById('userEmail').style.display = 'none';
            document.getElementById('logoutBtn').style.display = 'block';
            document.getElementById('addLessonBtn').style.display = 'block';
            
            // Load calendar data if exists
            const calendarData = await FirebaseService.getCalendarData();
            if (calendarData && calendarData.events && calendarData.events.length > 0) {
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
        document.getElementById('userEmail').style.display = 'none';
        document.getElementById('logoutBtn').style.display = 'none';
        
        // Unsubscribe from listeners
        if (this.plansUnsubscribe) {
            this.plansUnsubscribe();
        }
        if (this.manualLessonsUnsubscribe) {
            this.manualLessonsUnsubscribe();
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
        
        // Mobile navigation
        document.getElementById('mobilePrevDayBtn').addEventListener('click', () => this.mobilePreviousDay());
        document.getElementById('mobileNextDayBtn').addEventListener('click', () => this.mobileNextDay());
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
        this.mobileDayOffset = 0;
        this.showLessonsForWeek();
    }
    
    nextWeek() {
        this.currentWeekStart.setDate(this.currentWeekStart.getDate() + 7);
        this.mobileDayOffset = 0;
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
        
        // Also render mobile view
        this.renderMobileView();
        this.startCurrentTimeUpdater();
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
            if (!uiService.currentLessonId) {
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
            this.allEvents = calendarData.events.map(e => ({
                uid: e.uid,
                summary: e.summary,
                location: e.location,
                description: e.description,
                dtstart: e.dtstart?.toDate ? e.dtstart.toDate() : (typeof e.dtstart === 'string' ? new Date(e.dtstart) : e.dtstart),
                dtend: e.dtend?.toDate ? e.dtend.toDate() : (typeof e.dtend === 'string' ? new Date(e.dtend) : e.dtend),
                rrule: e.rrule,
                isManual: false
            }));
            
            this.expandedEvents = [...this.allEvents];
            UIService.showToast(`Loaded ${this.allEvents.length} events from ${calendarData.name}`, 'success');
            this.showLessonsForWeek();
        } catch (error) {
            console.error('Error loading calendar from Firebase:', error);
            UIService.showToast('Error loading calendar data', 'error');
            this.showLessonsForWeek();
        }
    }

    setupManualLessonsListener() {
        this.manualLessonsUnsubscribe = FirebaseService.watchManualLessons((lessons) => {
            // Merge manual lessons with ICS lessons (ensure allEvents is set)
            const icsLessons = this.allEvents || [];
            this.expandedEvents = [...icsLessons, ...lessons];
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

    // Mobile Navigation Methods
    mobilePreviousDay() {
        if (this.mobileDayOffset > 0) {
            this.mobileDayOffset--;
            this.renderMobileView();
        }
    }

    mobileNextDay() {
        if (this.mobileDayOffset < 4) { // Only Mon-Fri
            this.mobileDayOffset++;
            this.renderMobileView();
        }
    }

    renderMobileView() {
        const dayDate = new Date(this.currentWeekStart);
        dayDate.setDate(dayDate.getDate() + this.mobileDayOffset);
        
        // Update day display
        const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
        const dateStr = dayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        document.getElementById('mobileDayDisplay').textContent = `${dayNames[this.mobileDayOffset]}, ${dateStr}`;
        
        // Get lessons for this day
        const dayStart = new Date(dayDate);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(dayDate);
        dayEnd.setHours(23, 59, 59, 999);
        
        const dayLessons = this.expandedEvents.filter(event => {
            const eventDate = new Date(event.dtstart);
            eventDate.setHours(0, 0, 0, 0);
            return eventDate.getTime() === dayStart.getTime();
        }).sort((a, b) => a.dtstart - b.dtstart);
        
        // Group by time
        const lessonsByTime = {};
        dayLessons.forEach(lesson => {
            const timeKey = lesson.dtstart.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            if (!lessonsByTime[timeKey]) {
                lessonsByTime[timeKey] = [];
            }
            lessonsByTime[timeKey].push(lesson);
        });
        
        // Render mobile lessons
        const container = document.getElementById('mobileLessonsContainer');
        container.innerHTML = '';
        
        if (dayLessons.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>No lessons on this day</p></div>';
            return;
        }
        
        // Get current time for highlighting
        const now = new Date();
        const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();
        
        Object.keys(lessonsByTime).sort().forEach(timeKey => {
            const lessons = lessonsByTime[timeKey];
            
            // Check if this time is current
            const [hours, minutes] = timeKey.split(':').map(Number);
            const timeMinutes = hours * 60 + minutes;
            const isCurrentTime = dayDate.toDateString() === now.toDateString() &&
                                 timeMinutes <= currentTimeMinutes &&
                                 timeMinutes + 30 > currentTimeMinutes;
            
            const timeHeader = document.createElement('div');
            timeHeader.className = `mobile-time-header ${isCurrentTime ? 'current-time' : ''}`;
            timeHeader.textContent = timeKey;
            container.appendChild(timeHeader);
            
            lessons.forEach(lesson => {
                const card = document.createElement('div');
                card.className = 'mobile-lesson-card';
                
                const duration = (lesson.dtend - lesson.dtstart) / 60000;
                const existingPlan = this.allLessonPlans[lesson.uid];
                
                card.innerHTML = `
                    <div class="mobile-lesson-title">${uiService.escapeHtml(lesson.summary)}</div>
                    ${existingPlan && existingPlan.title ? `<div class="mobile-plan-title">${uiService.escapeHtml(existingPlan.title)}</div>` : ''}
                    <div class="mobile-lesson-meta">
                        ${lesson.dtstart.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} (${duration}m) | ${uiService.escapeHtml(lesson.location || 'N/A')}
                        ${lesson.description ? `<br>${uiService.escapeHtml(lesson.description)}` : ''}
                    </div>
                    ${existingPlan ? '<div class="mobile-lesson-status">✓ Lesson plan created</div>' : ''}
                `;
                
                card.addEventListener('click', () => {
                    UIService.app?.openLessonDetail(lesson, existingPlan);
                });
                
                container.appendChild(card);
            });
        });
        
        // Update button states
        document.getElementById('mobilePrevDayBtn').disabled = this.mobileDayOffset === 0;
        document.getElementById('mobileNextDayBtn').disabled = this.mobileDayOffset === 4;
    }

    startCurrentTimeUpdater() {
        // Update current time highlighting every minute
        if (this.currentTimeUpdateInterval) {
            clearInterval(this.currentTimeUpdateInterval);
        }
        
        this.currentTimeUpdateInterval = setInterval(() => {
            if (document.getElementById('mobileViewContainer').style.display !== 'none') {
                this.renderMobileView();
            }
        }, 60000); // Update every minute
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
