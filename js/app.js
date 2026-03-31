// Main Application
class LessonPlannerApp {
    
    constructor() {
        this.adminEmail = 'tan_seng_kwang@moe.edu.sg';
        this.isAdmin = false;
        this.allEvents = [];
        this.expandedEvents = [];
        this.currentWeekStart = this.getMondayOfCurrentWeek();
        this.allLessonPlans = {};
        this.currentFilter = 'all';
        this.authUnsubscribe = null;
        this.plansUnsubscribe = null;
        this.manualLessonsUnsubscribe = null;
        this.deletedLessonsUnsubscribe = null;
        this.membersUnsubscribe = null;
        this.deletedLessonIds = new Set();
        this.mobileDayOffset = 0; // 0 = Monday, 1 = Tuesday, etc.
        this.currentTimeUpdateInterval = null;
        this.compressedMode = true;
        this.currentSearchTerm = '';
        // Set initial toggle button text to 'Full View' since compressed is default
        window.addEventListener('DOMContentLoaded', () => {
            const btn = document.getElementById('viewToggleBtn');
            if (btn) btn.textContent = 'Full View';
        });
    }

    getDeletedLessonsStorageKey() {
        const user = FirebaseService.getCurrentUser();
        return user ? `deletedLessons_${user.uid}` : 'deletedLessons_guest';
    }

    loadDeletedLessonsFromLocalStorage() {
        try {
            const raw = localStorage.getItem(this.getDeletedLessonsStorageKey());
            if (!raw) return;
            const ids = JSON.parse(raw);
            if (Array.isArray(ids)) {
                this.deletedLessonIds = new Set(ids);
            }
        } catch (error) {
            console.warn('Failed to load deleted lessons from localStorage:', error);
        }
    }

    saveDeletedLessonsToLocalStorage() {
        try {
            localStorage.setItem(
                this.getDeletedLessonsStorageKey(),
                JSON.stringify(Array.from(this.deletedLessonIds))
            );
        } catch (error) {
            console.warn('Failed to save deleted lessons to localStorage:', error);
        }
    }

    updateClearRangeToggleUI(isOpen) {
        const clearRangeToggleBtn = document.getElementById('clearRangeToggleBtn');
        if (!clearRangeToggleBtn) return;
        clearRangeToggleBtn.innerHTML = isOpen
            ? '<i class="bi bi-x-circle"></i> Hide Delete'
            : '<i class="bi bi-trash"></i> Delete';
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
            this.loadDeletedLessonsFromLocalStorage();

            const normalizedEmail = FirebaseService.normalizeEmail(user.email);
            this.isAdmin = normalizedEmail === this.adminEmail;

            const hasAccess = await FirebaseService.canUserAccessApp(this.adminEmail, normalizedEmail);
            if (!hasAccess) {
                UIService.showToast('Access denied. Please contact the administrator.', 'error');
                await FirebaseService.logout();
                return;
            }

            // Hide auth section, show main section
            document.getElementById('authSection').style.display = 'none';
            document.getElementById('mainSection').style.display = 'block';
            document.getElementById('userEmail').textContent = normalizedEmail;
            document.getElementById('userEmail').style.display = 'inline';
            document.getElementById('logoutBtn').style.display = 'block';
            document.getElementById('addLessonBtn').style.display = 'block';
            const clearRangeToggleBtn = document.getElementById('clearRangeToggleBtn');
            if (clearRangeToggleBtn) {
                clearRangeToggleBtn.style.display = 'block';
                this.updateClearRangeToggleUI(false);
            }

            // Show/hide admin panel and bootstrap admin profile.
            const adminPanel = document.getElementById('adminPanel');
            if (adminPanel) {
                adminPanel.style.display = this.isAdmin ? 'block' : 'none';
            }
            const adminPageLink = document.getElementById('adminPageLink');
            if (adminPageLink) {
                adminPageLink.style.display = this.isAdmin ? 'inline-block' : 'none';
            }
            if (this.isAdmin) {
                try {
                    await FirebaseService.ensureAdminProfile();
                } catch (adminProfileError) {
                    console.warn('Admin profile setup warning:', adminProfileError);
                    UIService.showToast('Admin profile setup needs updated Firestore rules', 'warning');
                }
                this.setupMembersListener();
            }
            
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

            // Watch for deleted ICS lesson occurrences
            this.setupDeletedLessonsListener();
            
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
        const clearRangeToggleBtn = document.getElementById('clearRangeToggleBtn');
        if (clearRangeToggleBtn) {
            clearRangeToggleBtn.style.display = 'none';
            this.updateClearRangeToggleUI(false);
        }
        const rangeClearPanel = document.getElementById('rangeClearPanel');
        if (rangeClearPanel) {
            rangeClearPanel.setAttribute('hidden', 'hidden');
        }
        const adminPageLink = document.getElementById('adminPageLink');
        if (adminPageLink) {
            adminPageLink.style.display = 'none';
        }
        
        // Unsubscribe from listeners
        if (this.plansUnsubscribe) {
            this.plansUnsubscribe();
        }
        if (this.manualLessonsUnsubscribe) {
            this.manualLessonsUnsubscribe();
        }
        if (this.deletedLessonsUnsubscribe) {
            this.deletedLessonsUnsubscribe();
        }
        if (this.membersUnsubscribe) {
            this.membersUnsubscribe();
        }
        
        // Clear data
        this.allEvents = [];
        this.expandedEvents = [];
        this.allLessonPlans = {};
        this.deletedLessonIds = new Set();
        this.isAdmin = false;
        const adminPanel = document.getElementById('adminPanel');
        if (adminPanel) {
            adminPanel.style.display = 'none';
        }
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
        const uploadBtn = document.getElementById('uploadBtn');
        const icsFileInput = document.getElementById('icsFileInput');
        uploadBtn.addEventListener('click', () => {
            const user = FirebaseService.getCurrentUser();
            if (!user) {
                UIService.showToast('Please sign in before uploading ICS files.', 'warning');
                return;
            }

            // Reset value so selecting the same file again still triggers change.
            icsFileInput.value = '';
            try {
                if (typeof icsFileInput.showPicker === 'function') {
                    icsFileInput.showPicker();
                } else {
                    icsFileInput.click();
                }
            } catch (pickerError) {
                // Fallback for browsers where showPicker exists but is restricted.
                try {
                    icsFileInput.click();
                } catch (clickError) {
                    console.error('ICS picker open error:', clickError);
                    UIService.showToast('Could not open file picker. Please try again.', 'error');
                }
            }
        });
        icsFileInput.addEventListener('change', async (e) => {
            if (e.target.files.length > 0) {
                try {
                    await this.handleFileUpload(e.target.files[0]);
                } finally {
                    // Ensure repeated uploads always trigger change events.
                    e.target.value = '';
                }
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
        document.getElementById('filterInput').addEventListener('input', (e) => {
            this.currentSearchTerm = e.target.value;
            this.filterLessons(this.currentSearchTerm);
        });
        
        // View toggle
        document.getElementById('viewToggleBtn').addEventListener('click', () => this.toggleViewMode());
        
        // Mobile navigation
        document.getElementById('mobilePrevDayBtn').addEventListener('click', () => this.mobilePreviousDay());
        document.getElementById('mobileNextDayBtn').addEventListener('click', () => this.mobileNextDay());

        // Clear events by date range
        const clearRangeToggleBtn = document.getElementById('clearRangeToggleBtn');
        const rangeClearPanel = document.getElementById('rangeClearPanel');
        if (clearRangeToggleBtn && rangeClearPanel) {
            clearRangeToggleBtn.addEventListener('click', () => {
                const isHidden = rangeClearPanel.hasAttribute('hidden');
                if (isHidden) {
                    rangeClearPanel.removeAttribute('hidden');
                    this.updateClearRangeToggleUI(true);
                } else {
                    rangeClearPanel.setAttribute('hidden', 'hidden');
                    this.updateClearRangeToggleUI(false);
                }
            });
        }

        const clearRangeBtn = document.getElementById('clearRangeBtn');
        if (clearRangeBtn) {
            clearRangeBtn.addEventListener('click', () => this.handleClearEventsRange());
        }

        // Admin member management
        const addMemberBtn = document.getElementById('addMemberBtn');
        const memberEmailInput = document.getElementById('memberEmailInput');
        if (addMemberBtn && memberEmailInput) {
            addMemberBtn.addEventListener('click', () => this.handleAddMember());
            memberEmailInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.handleAddMember();
                }
            });
        }
    }

    setupMembersListener() {
        if (this.membersUnsubscribe) {
            this.membersUnsubscribe();
        }
        this.membersUnsubscribe = FirebaseService.watchMembers((members) => {
            this.renderMembersList(members);
        });
    }

    async handleAddMember() {
        if (!this.isAdmin) {
            UIService.showToast('Only administrator can add members', 'error');
            return;
        }

        const emailInput = document.getElementById('memberEmailInput');
        const email = (emailInput.value || '').trim().toLowerCase();

        if (!email) {
            UIService.showToast('Please enter a member email', 'error');
            return;
        }

        if (!/^\S+@\S+\.\S+$/.test(email)) {
            UIService.showToast('Please enter a valid email', 'error');
            return;
        }

        try {
            await FirebaseService.addMemberByEmail(email);
            UIService.showToast('Member added', 'success');
            emailInput.value = '';
        } catch (error) {
            console.error('Add member error:', error);
            UIService.showToast(error.message, 'error');
        }
    }

    async handleRemoveMember(memberId, memberEmail) {
        if (!this.isAdmin) return;
        if (!confirm('Remove this member?')) return;

        try {
            await FirebaseService.removeMember(memberId, memberEmail);
            UIService.showToast('Member removed', 'success');
        } catch (error) {
            console.error('Remove member error:', error);
            UIService.showToast(error.message, 'error');
        }
    }

    renderMembersList(members) {
        const container = document.getElementById('membersList');
        if (!container) return;

        if (!members || members.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>No members added yet.</p></div>';
            return;
        }

        container.innerHTML = '';
        members.forEach(member => {
            const item = document.createElement('div');
            item.className = 'member-item';

            const left = document.createElement('div');
            left.innerHTML = `
                <div class="member-email">${uiService.escapeHtml(member.email || '')}</div>
                <div class="member-meta">Added by ${uiService.escapeHtml(member.addedBy || 'admin')}</div>
            `;

            const removeBtn = document.createElement('button');
            removeBtn.className = 'btn btn-danger btn-sm';
            removeBtn.textContent = 'Remove';
            removeBtn.addEventListener('click', () => this.handleRemoveMember(member.id, member.email || ''));

            item.appendChild(left);
            item.appendChild(removeBtn);
            container.appendChild(item);
        });
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
            if (!file.name.toLowerCase().endsWith('.ics')) {
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
            
            // Expand recurring events locally for display
            this.expandedEvents = ICSParser.expandRecurrence(events);
            this.allEvents = [...this.expandedEvents];
            
            // Save to Firebase
            const user = FirebaseService.getCurrentUser();
            if (user) {
                try {
                    // Save compact source events (with RRULE) to avoid Firestore doc-size overflow.
                    await FirebaseService.saveCalendarData(file.name, events);
                } catch (saveError) {
                    console.error('Calendar save warning:', saveError);
                    UIService.showToast('Calendar loaded locally, but cloud save failed. You can still use the planner.', 'warning');
                }
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

    async handleClearEventsRange() {
        const startInput = document.getElementById('clearStartDate');
        const endInput = document.getElementById('clearEndDate');
        if (!startInput || !endInput) return;

        if (!startInput.value || !endInput.value) {
            UIService.showToast('Please select both start and end dates.', 'error');
            return;
        }

        const startDate = new Date(`${startInput.value}T00:00:00`);
        const endDate = new Date(`${endInput.value}T23:59:59`);
        if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || startDate > endDate) {
            UIService.showToast('Please choose a valid date range.', 'error');
            return;
        }

        const inRange = (lesson) => lesson.dtstart >= startDate && lesson.dtstart <= endDate;
        const manualLessons = this.expandedEvents.filter((l) => l.isManual && inRange(l));
        const icsLessons = this.expandedEvents.filter((l) => !l.isManual && inRange(l) && !this.isLessonDeleted(l));

        if (manualLessons.length === 0 && icsLessons.length === 0) {
            UIService.showToast('No events found in that date range.', 'info');
            return;
        }

        const confirmMsg = `Clear ${manualLessons.length + icsLessons.length} events from ${startInput.value} to ${endInput.value}?`;
        if (!confirm(confirmMsg)) return;

        const manualIds = manualLessons.map((l) => l.uid);
        const icsOccurrenceIds = icsLessons.map((l) => this.getLessonPlanId(l));

        // Optimistic update for faster UX
        icsOccurrenceIds.forEach((id) => this.deletedLessonIds.add(id));
        this.saveDeletedLessonsToLocalStorage();
        this.expandedEvents = this.expandedEvents.filter((l) => {
            if (l.isManual) {
                return !manualIds.includes(l.uid);
            }
            return !inRange(l);
        });
        this.showLessonsForWeek();

        try {
            await FirebaseService.deleteLessonsByIds(manualIds);
            await FirebaseService.markLessonOccurrencesDeletedByIds(icsOccurrenceIds);
            await FirebaseService.deleteLessonPlansByIds([...manualIds, ...icsOccurrenceIds]);
            UIService.showToast('Events cleared successfully.', 'success');
        } catch (error) {
            console.error('Clear range error:', error);
            UIService.showToast('Events cleared locally, but cloud sync failed.', 'warning');
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

    getLessonPlanId(lesson) {
        // Manual lessons already have unique IDs per lesson, so use them directly.
        if (lesson.isManual) {
            return this.sanitizeFirestoreId(lesson.uid);
        }

        // Use local date (not UTC) so Singapore-timezone dates are correct.
        const year = lesson.dtstart.getFullYear();
        const month = String(lesson.dtstart.getMonth() + 1).padStart(2, '0');
        const day   = String(lesson.dtstart.getDate()).padStart(2, '0');
        const datePart = `${year}-${month}-${day}`;
        const timePart = `${String(lesson.dtstart.getHours()).padStart(2, '0')}${String(lesson.dtstart.getMinutes()).padStart(2, '0')}`;
        // Sanitize uid — ICS UIDs can contain '/' which is illegal in Firestore doc IDs.
        const safeUid = this.sanitizeFirestoreId(lesson.uid);
        return `${safeUid}_${datePart}_${timePart}`;
    }

    sanitizeFirestoreId(id) {
        // Firestore doc IDs cannot contain '/' and must not be empty.
        return (id || 'unknown').replace(/\//g, '_').replace(/\.\./g, '__');
    }

    getLessonPlanForLesson(lesson) {
        const occurrencePlanId = this.getLessonPlanId(lesson);
        return this.allLessonPlans[occurrencePlanId] || this.allLessonPlans[lesson.uid] || null;
    }

    isLessonDeleted(lesson) {
        if (lesson.isManual) return false;
        return this.deletedLessonIds.has(this.getLessonPlanId(lesson));
    }

    previousWeek() {
        this.currentWeekStart.setDate(this.currentWeekStart.getDate() - 7);
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
            let title = '';
            let metaText = '';
            const titleEl = card.querySelector('.lesson-title');
            if (titleEl) title = titleEl.textContent.toLowerCase();
            card.querySelectorAll('.lesson-meta-item').forEach(meta => {
                metaText += ' ' + meta.textContent.toLowerCase();
            });
            const visible = title.includes(search) || metaText.includes(search);
            card.style.display = visible ? '' : 'none';
        });
    }
    
    toggleViewMode() {
        this.compressedMode = !this.compressedMode;
        const btn = document.getElementById('viewToggleBtn');
        btn.textContent = this.compressedMode ? 'Full View' : 'Compressed View';
        this.showLessonsForWeek();
    }
    
    showLessonsForWeek() {
        const weekLessons = ICSParser
            .getWeekLessons(this.expandedEvents, this.currentWeekStart)
            .filter(lesson => !this.isLessonDeleted(lesson));
        let filteredLessons = this.applyFilter(weekLessons);
        
        uiService.updateWeekDisplay(this.currentWeekStart);
        uiService.renderLessonsGrid(filteredLessons, (lesson) => this.getLessonPlanForLesson(lesson), this.compressedMode);
        
        // Also render mobile view
        this.renderMobileView();
        this.startCurrentTimeUpdater();
        // Reapply search filter if any
        if (this.currentSearchTerm) {
            this.filterLessons(this.currentSearchTerm);
            const input = document.getElementById('filterInput');
            if (input) input.value = this.currentSearchTerm;
        }
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
        uiService.currentLessonPlanId = this.getLessonPlanId(lesson);
        uiService.openLessonModal(lesson, existingPlan);
    }
    
    async saveLessonPlan() {
        try {
            if (!uiService.currentLessonId) {
                UIService.showToast('No lesson selected', 'error');
                return;
            }
            
            const planData = uiService.getLessonPlanData();
            
            const lessonPlanId = uiService.currentLessonPlanId || uiService.currentLessonId;
            await FirebaseService.saveLessonPlan(lessonPlanId, planData);
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
            const storedEvents = calendarData.events.map(e => ({
                uid: e.uid,
                summary: e.summary,
                location: e.location,
                description: e.description,
                dtstart: e.dtstart?.toDate ? e.dtstart.toDate() : (typeof e.dtstart === 'string' ? new Date(e.dtstart) : e.dtstart),
                dtend: e.dtend?.toDate ? e.dtend.toDate() : (typeof e.dtend === 'string' ? new Date(e.dtend) : e.dtend),
                rrule: e.rrule,
                isManual: false
            }));
            
            // Expand recurring events on the client to keep Firestore payload compact.
            this.expandedEvents = ICSParser.expandRecurrence(storedEvents);
            this.allEvents = [...this.expandedEvents];
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

    setupDeletedLessonsListener() {
        this.deletedLessonsUnsubscribe = FirebaseService.watchDeletedLessonOccurrences((deletedIds) => {
            this.deletedLessonIds = new Set(deletedIds);
            this.saveDeletedLessonsToLocalStorage();
            this.showLessonsForWeek();
        });
    }

    async handleAddLesson() {
        // Open modal in lesson creation mode using the global uiService
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

    async deleteIcsLesson(lesson) {
        const occurrenceId = this.getLessonPlanId(lesson);

        // Optimistic local delete so the card disappears immediately.
        this.deletedLessonIds.add(occurrenceId);
        this.saveDeletedLessonsToLocalStorage();
        this.showLessonsForWeek();
        uiService.closeLessonModal();

        try {
            await FirebaseService.markLessonOccurrenceDeleted(occurrenceId, {
                summary: lesson.summary,
                dtstart: lesson.dtstart,
                location: lesson.location || ''
            });

            // If notes existed for this occurrence, remove them as part of deletion.
            await FirebaseService.deleteLessonPlan(occurrenceId);

            UIService.showToast('Lesson deleted successfully', 'success');
        } catch (error) {
            console.error('Delete ICS lesson sync warning:', error);
            UIService.showToast('Lesson deleted locally, but cloud sync failed. Please update Firestore rules.', 'warning');
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
            if (this.isLessonDeleted(event)) return false;
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
                card.style.borderLeftColor = uiService.getColorForClass(lesson.description);
                
                const duration = (lesson.dtend - lesson.dtstart) / 60000;
                const existingPlan = this.getLessonPlanForLesson(lesson);
                
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
                    const freshPlan = this.getLessonPlanForLesson(lesson);
                    UIService.app?.openLessonDetail(lesson, freshPlan);
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
