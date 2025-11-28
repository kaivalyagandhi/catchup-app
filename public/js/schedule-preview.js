/**
 * Schedule Preview Module
 * 
 * Displays a day-view timeline showing calendar events with the suggested
 * time slot highlighted with a dotted border.
 */

// Schedule Preview State
let schedulePreviewSuggestion = null;
let schedulePreviewEvents = [];

/**
 * Open the schedule preview modal for a suggestion
 * @param {string} suggestionId - The suggestion ID to preview
 */
async function openSchedulePreview(suggestionId) {
    const suggestion = allSuggestions.find(s => s.id === suggestionId);
    if (!suggestion) {
        showToast('Suggestion not found', 'error');
        return;
    }
    
    schedulePreviewSuggestion = suggestion;
    
    // Show modal with loading state
    const modal = document.getElementById('schedule-preview-modal');
    const content = document.getElementById('schedule-preview-content');
    
    content.innerHTML = `
        <div class="loading-state">
            <div class="spinner"></div>
            <p>Loading your schedule...</p>
        </div>
    `;
    
    modal.classList.remove('hidden');
    
    // Get the date from the suggestion's proposed timeslot
    const suggestedDate = new Date(suggestion.proposedTimeslot.start);
    
    // Fetch calendar events for that day
    try {
        const events = await fetchCalendarEventsForDay(suggestedDate);
        schedulePreviewEvents = events;
        renderSchedulePreview(suggestion, events, suggestedDate);
    } catch (error) {
        console.error('Error loading schedule:', error);
        
        if (error.message === 'CALENDAR_NOT_CONNECTED') {
            renderCalendarNotConnected();
        } else {
            content.innerHTML = `
                <div class="error-state">
                    <h3>Failed to load schedule</h3>
                    <p>${escapeHtml(error.message)}</p>
                    <button class="retry-btn" onclick="openSchedulePreview('${suggestionId}')">Try Again</button>
                </div>
            `;
        }
    }
}

/**
 * Fetch calendar events for a specific day
 * @param {Date} date - The date to fetch events for
 * @returns {Promise<Array>} Array of calendar events
 */
async function fetchCalendarEventsForDay(date) {
    // Set start to beginning of day and end to end of day
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    const response = await fetch(
        `${API_BASE}/calendar/api/events?startTime=${startOfDay.toISOString()}&endTime=${endOfDay.toISOString()}`,
        {
            headers: { 'Authorization': `Bearer ${authToken}` }
        }
    );
    
    if (response.status === 401) {
        logout();
        throw new Error('Session expired');
    }
    
    if (response.status === 403) {
        throw new Error('CALENDAR_NOT_CONNECTED');
    }
    
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch calendar events');
    }
    
    const data = await response.json();
    return data.events || [];
}

/**
 * Render the schedule preview timeline
 */
function renderSchedulePreview(suggestion, events, date) {
    const content = document.getElementById('schedule-preview-content');
    
    // Format the date
    const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const formattedDate = date.toLocaleDateString('en-US', dateOptions);
    
    // Get contact names for the suggestion
    let contactNames = 'Unknown';
    if (suggestion.type === 'group' && suggestion.contacts) {
        const names = suggestion.contacts.map(c => c.name);
        if (names.length === 2) {
            contactNames = `${names[0]} & ${names[1]}`;
        } else if (names.length > 2) {
            contactNames = `${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}`;
        } else {
            contactNames = names.join(', ');
        }
    } else if (suggestion.contactId) {
        const contact = contacts.find(c => c.id === suggestion.contactId);
        contactNames = contact ? contact.name : 'Unknown';
    }
    
    // Calculate timeline hours (8 AM to 10 PM by default, adjust based on events)
    const suggestedStart = new Date(suggestion.proposedTimeslot.start);
    const suggestedEnd = new Date(suggestion.proposedTimeslot.end);
    
    let startHour = 8;
    let endHour = 22;
    
    // Adjust based on events and suggestion
    const allTimes = [
        ...events.map(e => new Date(e.start)),
        ...events.map(e => new Date(e.end)),
        suggestedStart,
        suggestedEnd
    ];
    
    allTimes.forEach(time => {
        const hour = time.getHours();
        if (hour < startHour) startHour = Math.max(0, hour - 1);
        if (hour >= endHour) endHour = Math.min(24, hour + 2);
    });
    
    // Calculate total free time
    const totalMinutes = (endHour - startHour) * 60;
    const busyMinutes = events.reduce((total, event) => {
        const eventStart = new Date(event.start);
        const eventEnd = new Date(event.end);
        return total + (eventEnd - eventStart) / (1000 * 60);
    }, 0);
    const freeMinutes = Math.max(0, totalMinutes - busyMinutes);
    const freeHours = Math.floor(freeMinutes / 60);
    const freeRemainingMinutes = Math.round(freeMinutes % 60);
    
    // Build the timeline HTML
    const hourHeight = 60; // pixels per hour
    const timelineHeight = (endHour - startHour) * hourHeight;
    
    // Generate hour markers
    let hourMarkersHtml = '';
    for (let hour = startHour; hour <= endHour; hour++) {
        const top = (hour - startHour) * hourHeight;
        const timeLabel = formatHour(hour);
        hourMarkersHtml += `
            <div class="schedule-hour-marker" style="top: ${top}px;">${timeLabel}</div>
            <div class="schedule-hour-line" style="top: ${top}px;"></div>
        `;
    }
    
    // Generate event blocks
    let eventsHtml = '';
    events.forEach(event => {
        const eventStart = new Date(event.start);
        const eventEnd = new Date(event.end);
        
        const startMinutes = (eventStart.getHours() - startHour) * 60 + eventStart.getMinutes();
        const endMinutes = (eventEnd.getHours() - startHour) * 60 + eventEnd.getMinutes();
        const duration = endMinutes - startMinutes;
        
        const top = (startMinutes / 60) * hourHeight;
        const height = Math.max(20, (duration / 60) * hourHeight - 4);
        
        const timeStr = `${formatTime(eventStart)} - ${formatTime(eventEnd)}`;
        
        eventsHtml += `
            <div class="schedule-event" style="top: ${top}px; height: ${height}px;">
                <div class="schedule-event-title">${escapeHtml(event.title || 'Busy')}</div>
                <div class="schedule-event-time">${timeStr}</div>
            </div>
        `;
    });
    
    // Generate suggested slot block
    const suggestedStartMinutes = (suggestedStart.getHours() - startHour) * 60 + suggestedStart.getMinutes();
    const suggestedEndMinutes = (suggestedEnd.getHours() - startHour) * 60 + suggestedEnd.getMinutes();
    const suggestedDuration = suggestedEndMinutes - suggestedStartMinutes;
    
    const suggestedTop = (suggestedStartMinutes / 60) * hourHeight;
    const suggestedHeight = Math.max(30, (suggestedDuration / 60) * hourHeight - 4);
    const suggestedTimeStr = `${formatTime(suggestedStart)} - ${formatTime(suggestedEnd)}`;
    
    const suggestedSlotHtml = `
        <div class="schedule-event schedule-event-suggested" style="top: ${suggestedTop}px; height: ${suggestedHeight}px;">
            <div class="schedule-event-title">☕ Suggested: ${escapeHtml(contactNames)}</div>
            <div class="schedule-event-time">${suggestedTimeStr}</div>
        </div>
    `;
    
    content.innerHTML = `
        <div class="schedule-preview-header">
            <div class="schedule-preview-date">${formattedDate}</div>
            <div class="schedule-preview-subtitle">Your schedule for the day</div>
        </div>
        
        <div class="schedule-legend">
            <div class="schedule-legend-item">
                <div class="schedule-legend-color existing"></div>
                <span>Existing Events</span>
            </div>
            <div class="schedule-legend-item">
                <div class="schedule-legend-color suggested"></div>
                <span>Suggested Catchup</span>
            </div>
        </div>
        
        <div class="schedule-timeline" style="height: ${timelineHeight + 20}px;">
            ${hourMarkersHtml}
            <div class="schedule-events-container" style="height: ${timelineHeight}px;">
                ${eventsHtml}
                ${suggestedSlotHtml}
            </div>
        </div>
        
        <div class="schedule-preview-footer">
            <div class="schedule-preview-stats">
                <strong>${events.length}</strong> event${events.length !== 1 ? 's' : ''} · 
                <strong>${freeHours}h ${freeRemainingMinutes}m</strong> free time
            </div>
            <div class="schedule-preview-actions">
                <button class="secondary" onclick="closeSchedulePreview()">Close</button>
                ${suggestion.status === 'pending' ? `
                    <button onclick="closeSchedulePreview(); acceptSuggestion('${suggestion.id}')">
                        Accept & Schedule
                    </button>
                ` : ''}
            </div>
        </div>
    `;
}

/**
 * Render the "calendar not connected" state
 */
function renderCalendarNotConnected() {
    const content = document.getElementById('schedule-preview-content');
    
    content.innerHTML = `
        <div class="schedule-no-calendar">
            <h3>📅 Calendar Not Connected</h3>
            <p>Connect your Google Calendar to see your schedule and get better suggestions.</p>
            <button onclick="closeSchedulePreview(); navigateTo('preferences')">
                Connect Calendar
            </button>
        </div>
    `;
}

/**
 * Close the schedule preview modal
 */
function closeSchedulePreview() {
    const modal = document.getElementById('schedule-preview-modal');
    modal.classList.add('hidden');
    schedulePreviewSuggestion = null;
    schedulePreviewEvents = [];
}

/**
 * Format hour for display (e.g., "9 AM", "12 PM")
 */
function formatHour(hour) {
    if (hour === 0) return '12 AM';
    if (hour === 12) return '12 PM';
    if (hour < 12) return `${hour} AM`;
    return `${hour - 12} PM`;
}

/**
 * Format time for display (e.g., "9:30 AM")
 */
function formatTime(date) {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes.toString().padStart(2, '0');
    return `${displayHours}:${displayMinutes} ${ampm}`;
}


/**
 * Load calendar event counts for suggestions and update the UI
 * @param {Array} suggestionsList - List of suggestions to load counts for
 */
async function loadCalendarEventCounts(suggestionsList) {
    // Group suggestions by date to minimize API calls
    const dateMap = new Map();
    
    suggestionsList.forEach(suggestion => {
        if (suggestion.proposedTimeslot && suggestion.proposedTimeslot.start) {
            const date = new Date(suggestion.proposedTimeslot.start);
            const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
            
            if (!dateMap.has(dateKey)) {
                dateMap.set(dateKey, { date, suggestionIds: [] });
            }
            dateMap.get(dateKey).suggestionIds.push(suggestion.id);
        }
    });
    
    // Fetch event counts for each unique date
    for (const [dateKey, { date, suggestionIds }] of dateMap) {
        try {
            const count = await fetchEventCountForDay(date);
            
            // Update all suggestions for this date
            suggestionIds.forEach(suggestionId => {
                const countEl = document.getElementById(`calendar-count-${suggestionId}`);
                if (countEl) {
                    if (count === 0) {
                        countEl.innerHTML = `<span style="color: var(--color-success); font-size: 12px; margin-left: 8px;">📅 Free day!</span>`;
                    } else if (count === 1) {
                        countEl.innerHTML = `<span style="color: var(--text-secondary); font-size: 12px; margin-left: 8px;">📅 1 other event</span>`;
                    } else {
                        countEl.innerHTML = `<span style="color: var(--text-secondary); font-size: 12px; margin-left: 8px;">📅 ${count} other events</span>`;
                    }
                }
            });
        } catch (error) {
            // Silently fail - calendar might not be connected
            console.debug('Could not fetch calendar count for', dateKey, error.message);
            
            // Show "connect calendar" hint if not connected
            if (error.message === 'CALENDAR_NOT_CONNECTED') {
                suggestionIds.forEach(suggestionId => {
                    const countEl = document.getElementById(`calendar-count-${suggestionId}`);
                    if (countEl) {
                        countEl.innerHTML = `<span style="color: var(--text-tertiary); font-size: 12px; margin-left: 8px;">📅 <a href="#" onclick="navigateTo('preferences'); return false;" style="color: var(--color-primary);">Connect calendar</a></span>`;
                    }
                });
            }
        }
    }
}

/**
 * Fetch the count of events for a specific day
 * @param {Date} date - The date to check
 * @returns {Promise<number>} Number of events
 */
async function fetchEventCountForDay(date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    const response = await fetch(
        `${API_BASE}/calendar/api/events?startTime=${startOfDay.toISOString()}&endTime=${endOfDay.toISOString()}`,
        {
            headers: { 'Authorization': `Bearer ${authToken}` }
        }
    );
    
    if (response.status === 403) {
        throw new Error('CALENDAR_NOT_CONNECTED');
    }
    
    if (!response.ok) {
        throw new Error('Failed to fetch');
    }
    
    const data = await response.json();
    return (data.events || []).length;
}
