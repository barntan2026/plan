// calendar-test.js
// Test: Event at 8am appears in 8am row

// Mock lesson at 8am
const lesson8am = {
    uid: 'test-uid',
    summary: 'Test Event',
    dtstart: new Date('2026-04-13T08:00:00'), // Monday 8am
    dtend: new Date('2026-04-13T09:00:00'),
    location: 'Room 1',
    description: 'Test Class',
    isManual: false
};


// Use the global appInstance if available, otherwise mock minimal structure
const testAppInstance = window.appInstance || { currentWeekStart: new Date('2026-04-13T00:00:00') };
const testUiService = window.uiService || new UIService();

// Render grid with only this lesson
testUiService.renderLessonsGrid([lesson8am], {}, false);

// Find the 8am row in the first day column (Monday)

const timetable = document.querySelector('.timetable-wrapper');
const mondayColumn = timetable.querySelectorAll('.day-column')[0];
const timelineSlots = mondayColumn.querySelectorAll('.timeline-slot');

// 8am is slot index 4 (6:00, 6:30, 7:00, 7:30, 8:00)
const slotIndex = 4;
const slot8am = timelineSlots[slotIndex];

// Check if a lesson card is present in the 8am slot
const lessonCardIn8am = slot8am.parentElement.querySelector('.lesson-card');

console.assert(lessonCardIn8am, 'Lesson at 8am should appear in 8am row');

console.log('Test complete: 8am event row check');
