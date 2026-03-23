// UI Service - Handles all UI interactions
class UIService {
    
    constructor() {
        this.currentLessonId = null;
        this.resourceModal = null;
        this.initModals();
    }
    
    initModals() {
        // Main lesson modal
        this.lessonModal = document.getElementById('lessonModal');
        this.closeModalBtn = document.getElementById('closeModalBtn');
        this.modalClose = this.lessonModal.querySelector('.close');
        
        // Resource modal
        this.resourceModal = document.getElementById('resourceModal');
        this.resourceClose = this.resourceModal.querySelector('.close');
        
        // Initialize button states
        const saveLessonBtn = document.getElementById('saveLessonBtn');
        saveLessonBtn.dataset.mode = 'plan';
        
        // Setup event listeners
        this.setupModalListeners();
        this.setupEditorToolbar();
        this.setupDeleteLessonHandler();
        this.setupSaveLessonHandler();
    }
    
    setupModalListeners() {
        // Lesson modal close
        this.closeModalBtn.addEventListener('click', () => this.closeLessonModal());
        this.modalClose.addEventListener('click', () => this.closeLessonModal());
        window.addEventListener('click', (e) => {
            if (e.target === this.lessonModal) this.closeLessonModal();
        });
        
        // Resource modal close
        this.resourceClose.addEventListener('click', () => this.closeResourceModal());
        document.getElementById('cancelResourceBtn').addEventListener('click', () => this.closeResourceModal());
        window.addEventListener('click', (e) => {
            if (e.target === this.resourceModal) this.closeResourceModal();
        });
        
        // Add resource button
        document.getElementById('addResourceBtn').addEventListener('click', () => this.openResourceModal());
        document.getElementById('saveResourceBtn').addEventListener('click', () => this.saveResource());
    }
    
    setupEditorToolbar() {
        const toolbarBtns = document.querySelectorAll('.toolbar-btn');
        
        toolbarBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const action = btn.dataset.action;
                this.executeEditorAction(action);
            });
        });
    }
    
    executeEditorAction(action) {
        const textarea = document.getElementById('planContent');
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = textarea.value.substring(start, end);
        let insertText = '';
        
        switch (action) {
            case 'bold':
                insertText = `**${selectedText || 'bold text'}**`;
                break;
            case 'italic':
                insertText = `*${selectedText || 'italic text'}*`;
                break;
            case 'link':
                insertText = `[${selectedText || 'link text'}](https://example.com)`;
                break;
            case 'list':
                const lines = selectedText.split('\n');
                insertText = lines.map(line => `• ${line}`).join('\n');
                break;
        }
        
        if (insertText) {
            const newText = textarea.value.substring(0, start) + insertText + 
                           textarea.value.substring(end);
            textarea.value = newText;
            textarea.focus();
            textarea.setSelectionRange(start + insertText.length, start + insertText.length);
        }
    }
    
    openLessonModal(lesson, existingPlan = null) {
        this.currentLessonId = lesson.uid;
        this.currentLesson = lesson;
        
        const isManual = lesson.isManual === true;
        const readOnlySection = document.getElementById('readOnlyLessonInfo');
        const editableSection = document.getElementById('editableLessonInfo');
        const deleteBtn = document.getElementById('deleteLessonBtn');
        const saveLessonBtn = document.getElementById('saveLessonBtn');
        
        if (isManual) {
            // Show editable fields for manual lessons
            readOnlySection.style.display = 'none';
            editableSection.style.display = 'block';
            deleteBtn.style.display = 'block';
            saveLessonBtn.textContent = 'Update Lesson';
            saveLessonBtn.dataset.mode = 'edit';
            
            // Populate editable fields
            document.getElementById('lessonSummary').value = lesson.summary;
            document.getElementById('lessonDate').value = lesson.dtstart.toISOString().split('T')[0];
            document.getElementById('lessonStartTime').value = 
                `${String(lesson.dtstart.getHours()).padStart(2, '0')}:${String(lesson.dtstart.getMinutes()).padStart(2, '0')}`;
            document.getElementById('lessonEndTime').value = 
                `${String(lesson.dtend.getHours()).padStart(2, '0')}:${String(lesson.dtend.getMinutes()).padStart(2, '0')}`;
            document.getElementById('lessonLocation').value = lesson.location || '';
            document.getElementById('lessonDescription').value = lesson.description || '';
        } else {
            // Show read-only fields for ICS lessons
            readOnlySection.style.display = 'block';
            editableSection.style.display = 'none';
            deleteBtn.style.display = 'none';
            saveLessonBtn.textContent = 'Save Lesson Plan';
            saveLessonBtn.dataset.mode = 'plan';
            
            // Set lesson info (read-only)
            document.getElementById('lessonName').textContent = lesson.summary;
            document.getElementById('lessonDateTime').textContent = 
                `${lesson.dtstart.toLocaleDateString()} ${lesson.dtstart.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - ${lesson.dtend.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
            document.getElementById('lessonVenue').textContent = lesson.location || 'Not specified';
            document.getElementById('lessonClass').textContent = lesson.description || 'N/A';
        }
        
        // Load existing plan if available
        if (existingPlan) {
            document.getElementById('planTitle').value = existingPlan.title || '';
            document.getElementById('planObjectives').value = existingPlan.objectives || '';
            document.getElementById('planContent').value = existingPlan.content || '';
            document.getElementById('planAssignment').value = existingPlan.assignment || '';
            document.getElementById('planNotes').value = existingPlan.notes || '';
            
            // Load resources
            this.loadResources(existingPlan.resources || []);
        } else {
            // Clear form for new plan
            document.getElementById('planTitle').value = '';
            document.getElementById('planObjectives').value = '';
            document.getElementById('planContent').value = '';
            document.getElementById('planAssignment').value = '';
            document.getElementById('planNotes').value = '';
            document.getElementById('resourcesList').innerHTML = '';
        }
        
        this.lessonModal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }

    openLessonModalForCreate() {
        this.currentLessonId = null;
        this.currentLesson = null;
        
        const readOnlySection = document.getElementById('readOnlyLessonInfo');
        const editableSection = document.getElementById('editableLessonInfo');
        const deleteBtn = document.getElementById('deleteLessonBtn');
        const saveLessonBtn = document.getElementById('saveLessonBtn');
        
        // Show editable fields for new lesson creation
        readOnlySection.style.display = 'none';
        editableSection.style.display = 'block';
        deleteBtn.style.display = 'none';
        
        // Set default values
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        document.getElementById('lessonSummary').value = '';
        document.getElementById('lessonDate').value = tomorrow.toISOString().split('T')[0];
        document.getElementById('lessonStartTime').value = '09:00';
        document.getElementById('lessonEndTime').value = '10:00';
        document.getElementById('lessonLocation').value = '';
        document.getElementById('lessonDescription').value = '';
        
        // Clear lesson plan section
        document.getElementById('planTitle').value = '';
        document.getElementById('planObjectives').value = '';
        document.getElementById('planContent').value = '';
        document.getElementById('planAssignment').value = '';
        document.getElementById('planNotes').value = '';
        document.getElementById('resourcesList').innerHTML = '';
        
        // Change button text temporarily
        const originalBtn = saveLessonBtn.textContent;
        saveLessonBtn.textContent = 'Create Lesson';
        saveLessonBtn.dataset.mode = 'create';
        
        this.lessonModal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }
    
    closeLessonModal() {
        this.lessonModal.classList.remove('show');
        document.body.style.overflow = 'auto';
        this.currentLessonId = null;
        this.currentLesson = null;
        
        // Reset button text and mode
        const saveLessonBtn = document.getElementById('saveLessonBtn');
        saveLessonBtn.textContent = 'Save Lesson Plan';
        saveLessonBtn.dataset.mode = 'plan';
    }
    
    getLessonPlanData() {
        return {
            title: document.getElementById('planTitle').value,
            objectives: document.getElementById('planObjectives').value,
            content: document.getElementById('planContent').value,
            assignment: document.getElementById('planAssignment').value,
            notes: document.getElementById('planNotes').value,
            resources: this.getResources()
        };
    }
    
    openResourceModal() {
        document.getElementById('resourceName').value = '';
        document.getElementById('resourceUrl').value = '';
        this.resourceModal.classList.add('show');
    }
    
    closeResourceModal() {
        this.resourceModal.classList.remove('show');
    }
    
    saveResource() {
        const name = document.getElementById('resourceName').value.trim();
        const url = document.getElementById('resourceUrl').value.trim();
        
        if (!name || !url) {
            UIService.showToast('Please fill in all resource fields', 'error');
            return;
        }
        
        // Validate URL
        try {
            new URL(url);
        } catch {
            UIService.showToast('Please enter a valid URL', 'error');
            return;
        }
        
        this.addResource(name, url);
        this.closeResourceModal();
    }
    
    addResource(name, url) {
        const resourcesList = document.getElementById('resourcesList');
        const resourceId = 'resource-' + Date.now();
        
        const resourceItem = document.createElement('div');
        resourceItem.className = 'resource-item';
        resourceItem.dataset.resourceId = resourceId;
        resourceItem.innerHTML = `
            <div class="resource-link">
                <a href="${url}" target="_blank" class="resource-name">${name}</a>
                <a href="${url}" target="_blank" class="resource-url">${url}</a>
            </div>
            <button class="resource-delete" onclick="uiService.removeResource('${resourceId}')">Delete</button>
        `;
        
        resourcesList.appendChild(resourceItem);
    }
    
    removeResource(resourceId) {
        const item = document.querySelector(`[data-resource-id="${resourceId}"]`);
        if (item) item.remove();
    }
    
    loadResources(resources) {
        const resourcesList = document.getElementById('resourcesList');
        resourcesList.innerHTML = '';
        
        for (const resource of resources) {
            this.addResource(resource.name, resource.url);
        }
    }
    
    getResources() {
        const resources = [];
        document.querySelectorAll('.resource-item').forEach(item => {
            const link = item.querySelector('.resource-name');
            const url = item.querySelector('.resource-url');
            if (link && url) {
                resources.push({
                    name: link.textContent,
                    url: url.href
                });
            }
        });
        return resources;
    }
    
    renderLessonsGrid(lessons, existingPlans = {}) {
        const container = document.getElementById('lessonsContainer');
        
        if (lessons.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="grid-column: 1/-1;">
                    <h3>No lessons this week</h3>
                    <p>Upload an ICS file to get started or navigate to another week.</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = '';
        
        lessons.forEach(lesson => {
            const card = this.createLessonCard(lesson, existingPlans[lesson.uid]);
            container.appendChild(card);
        });
    }
    
    createLessonCard(lesson, existingPlan) {
        const card = document.createElement('div');
        card.className = 'lesson-card';
        
        // Add type badge
        const isPractical = lesson.summary.includes('(P)');
        const isMeeting = lesson.summary.includes('LTT') || lesson.summary.includes('Assembly') || lesson.summary.includes('TA');
        const isAssembly = lesson.summary.includes('Assembly');
        
        if (isPractical) card.classList.add('practical');
        if (isMeeting) card.classList.add('meeting');
        if (isAssembly) card.classList.add('assembly');
        
        const duration = (lesson.dtend - lesson.dtstart) / 60000; // minutes
        const isPlanned = !!existingPlan;
        
        let badgeHTML = '';
        if (isPractical) badgeHTML = '<span class="lesson-badge badge-practical">Practical</span>';
        if (isMeeting) badgeHTML = '<span class="lesson-badge badge-meeting">Meeting</span>';
        if (isAssembly) badgeHTML = '<span class="lesson-badge badge-assembly">Assembly</span>';
        
        card.innerHTML = `
            <div class="lesson-card-header">
                <span class="lesson-title">${this.escapeHtml(lesson.summary)}</span>
                ${badgeHTML}
            </div>
            <div class="lesson-meta">
                <div class="lesson-meta-item">
                    <strong>🕐</strong>
                    <span>${lesson.dtstart.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} (${duration}m)</span>
                </div>
                <div class="lesson-meta-item">
                    <strong>📍</strong>
                    <span>${this.escapeHtml(lesson.location || 'N/A')}</span>
                </div>
                <div class="lesson-meta-item">
                    <strong>👥</strong>
                    <span>${this.escapeHtml(lesson.description || 'N/A')}</span>
                </div>
            </div>
            ${isPlanned ? '<div class="lesson-status planned">✓ Lesson plan created</div>' : '<div class="lesson-status">Click to create plan</div>'}
        `;
        
        card.addEventListener('click', () => {
            UIService.app?.openLessonDetail(lesson, existingPlan);
        });
        
        return card;
    }
    
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    static showToast(message, type = 'info', duration = 3000) {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = `toast show ${type}`;
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, duration);
    }
    
    updateWeekDisplay(weekStart) {
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        
        const options = { weekday: 'short', month: 'short', day: 'numeric' };
        const startStr = weekStart.toLocaleDateString('en-US', options);
        const endStr = weekEnd.toLocaleDateString('en-US', options);
        
        document.getElementById('weekDisplay').textContent = `Week of ${startStr} - ${endStr}`;
    }

    getLessonData() {
        return {
            summary: document.getElementById('lessonSummary').value,
            location: document.getElementById('lessonLocation').value,
            description: document.getElementById('lessonDescription').value,
            dtstart: new Date(`${document.getElementById('lessonDate').value}T${document.getElementById('lessonStartTime').value}`),
            dtend: new Date(`${document.getElementById('lessonDate').value}T${document.getElementById('lessonEndTime').value}`)
        };
    }

    setupDeleteLessonHandler() {
        const deleteBtn = document.getElementById('deleteLessonBtn');
        deleteBtn.removeEventListener('click', this.deleteLessonHandler);
        this.deleteLessonHandler = async () => {
            if (this.currentLessonId && this.currentLesson?.isManual) {
                await appInstance.deleteLesson(this.currentLessonId);
            }
        };
        deleteBtn.addEventListener('click', this.deleteLessonHandler);
    }

    setupSaveLessonHandler() {
        const saveBtn = document.getElementById('saveLessonBtn');
        saveBtn.removeEventListener('click', this.saveLessonHandler);
        this.saveLessonHandler = async () => {
            if (saveBtn.dataset.mode === 'create') {
                // Create new lesson
                const lessonData = this.getLessonData();
                if (!lessonData.summary.trim()) {
                    UIService.showToast('Lesson name is required', 'error');
                    return;
                }
                try {
                    const lessonId = await FirebaseService.createLesson(lessonData);
                    UIService.showToast('Lesson created successfully', 'success');
                    uiService.closeLessonModal();
                } catch (error) {
                    console.error('Create error:', error);
                    UIService.showToast(error.message, 'error');
                }
            } else if (saveBtn.dataset.mode === 'edit') {
                // Update existing lesson
                const lessonData = this.getLessonData();
                if (!lessonData.summary.trim()) {
                    UIService.showToast('Lesson name is required', 'error');
                    return;
                }
                await appInstance.updateLesson(this.currentLessonId, lessonData);
            } else {
                // Save lesson plan (original behavior)
                await appInstance.saveLessonPlan();
            }
        };
        saveBtn.addEventListener('click', this.saveLessonHandler);
    }
}

// Create global UI service instance
const uiService = new UIService();
