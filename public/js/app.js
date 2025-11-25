// CatchUp Web Interface

// Configuration
const API_BASE = '/api';

// State
let authToken = null;
let userId = null;
let userEmail = null;
let contacts = [];
let suggestions = [];
let groups = []; // Store groups for lookup
let currentPage = 'contacts';
let isLoginMode = true;
let currentContactTags = []; // Tags being edited in the modal
let currentContactGroups = []; // Group IDs being edited in the modal

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    setupNavigation();
});

// Authentication
function checkAuth() {
    authToken = localStorage.getItem('authToken');
    userId = localStorage.getItem('userId');
    userEmail = localStorage.getItem('userEmail');
    
    if (authToken && userId) {
        showMainApp();
    } else {
        showAuthScreen();
    }
}

function showAuthScreen() {
    document.getElementById('auth-screen').classList.remove('hidden');
    document.getElementById('main-app').classList.add('hidden');
}

function showMainApp() {
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('main-app').classList.remove('hidden');
    document.getElementById('user-email').textContent = userEmail;
    loadContacts();
}

function toggleAuthMode() {
    isLoginMode = !isLoginMode;
    
    if (isLoginMode) {
        document.getElementById('auth-title').textContent = 'Login to CatchUp';
        document.getElementById('auth-submit-btn').textContent = 'Login';
        document.getElementById('auth-toggle-text').textContent = "Don't have an account?";
    } else {
        document.getElementById('auth-title').textContent = 'Sign Up for CatchUp';
        document.getElementById('auth-submit-btn').textContent = 'Sign Up';
        document.getElementById('auth-toggle-text').textContent = 'Already have an account?';
    }
    
    document.getElementById('auth-error').classList.add('hidden');
    document.getElementById('auth-success').classList.add('hidden');
}

async function handleAuth(event) {
    event.preventDefault();
    
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    
    const endpoint = isLoginMode ? '/auth/login' : '/auth/register';
    
    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Authentication failed');
        }
        
        // Store auth data
        authToken = data.token;
        userId = data.user.id;
        userEmail = data.user.email;
        
        localStorage.setItem('authToken', authToken);
        localStorage.setItem('userId', userId);
        localStorage.setItem('userEmail', userEmail);
        
        if (!isLoginMode) {
            // Show success message for registration
            document.getElementById('auth-success').textContent = 'Account created successfully! Logging you in...';
            document.getElementById('auth-success').classList.remove('hidden');
            setTimeout(() => {
                showMainApp();
            }, 1000);
        } else {
            showMainApp();
        }
        
    } catch (error) {
        console.error('Auth error:', error);
        const errorMessage = error.message || 'Authentication failed. Please try again.';
        document.getElementById('auth-error').textContent = errorMessage;
        document.getElementById('auth-error').classList.remove('hidden');
        document.getElementById('auth-success').classList.add('hidden');
    }
}

function logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userId');
    localStorage.removeItem('userEmail');
    
    authToken = null;
    userId = null;
    userEmail = null;
    
    showAuthScreen();
    document.getElementById('auth-form').reset();
}

// Navigation
function setupNavigation() {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.dataset.page;
            navigateTo(page);
        });
    });
}

function navigateTo(page) {
    // Update active nav link
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.toggle('active', link.dataset.page === page);
    });
    
    // Hide all pages
    document.querySelectorAll('.page').forEach(p => {
        p.classList.add('hidden');
    });
    
    // Show selected page
    document.getElementById(`${page}-page`).classList.remove('hidden');
    currentPage = page;
    
    // Load page data
    switch(page) {
        case 'contacts':
            loadContacts();
            break;
        case 'suggestions':
            loadSuggestions();
            break;
        case 'calendar':
            loadCalendar();
            break;
        case 'voice':
            loadVoiceNotes();
            break;
        case 'preferences':
            loadPreferences();
            break;
    }
}

// Contacts Management
async function loadContacts() {
    try {
        // Load groups first for lookup
        const groupsResponse = await fetch(`${API_BASE}/contacts/groups?userId=${userId}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (groupsResponse.status === 401) {
            logout();
            return;
        }
        
        if (groupsResponse.ok) {
            groups = await groupsResponse.json();
        }
        
        // Load contacts
        const response = await fetch(`${API_BASE}/contacts?userId=${userId}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (response.status === 401) {
            logout();
            return;
        }
        
        if (!response.ok) throw new Error('Failed to load contacts');
        
        contacts = await response.json();
        renderContacts(contacts);
    } catch (error) {
        console.error('Error loading contacts:', error);
        showError('contacts-list', 'Failed to load contacts');
    }
}

function renderContacts(contactsList) {
    const container = document.getElementById('contacts-list');
    
    if (contactsList.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>No contacts yet</h3>
                <p>Add your first contact to get started</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = contactsList.map(contact => {
        // Render tags
        let tagsHtml = '';
        if (contact.tags && contact.tags.length > 0) {
            tagsHtml = `
                <div class="contact-tags">
                    ${contact.tags.map(tag => `<span class="tag-badge">${escapeHtml(tag.text)}</span>`).join('')}
                </div>
            `;
        }
        
        // Render groups
        let groupsHtml = '';
        if (contact.groups && contact.groups.length > 0) {
            const groupNames = contact.groups
                .map(groupId => {
                    const group = groups.find(g => g.id === groupId);
                    return group ? group.name : null;
                })
                .filter(name => name !== null);
            
            if (groupNames.length > 0) {
                groupsHtml = `
                    <div class="contact-groups">
                        ${groupNames.map(name => `<span class="group-badge">${escapeHtml(name)}</span>`).join('')}
                    </div>
                `;
            }
        }
        
        return `
            <div class="card">
                <h3>${escapeHtml(contact.name)}</h3>
                <p><strong>Phone:</strong> ${contact.phone || 'N/A'}</p>
                <p><strong>Email:</strong> ${contact.email || 'N/A'}</p>
                <p><strong>Location:</strong> ${contact.location || 'N/A'}</p>
                ${contact.timezone ? `<p><strong>Timezone:</strong> ${contact.timezone}</p>` : ''}
                ${contact.frequencyPreference ? `<p><strong>Frequency:</strong> ${contact.frequencyPreference}</p>` : ''}
                ${contact.customNotes ? `<p><strong>Notes:</strong> ${escapeHtml(contact.customNotes)}</p>` : ''}
                ${tagsHtml}
                ${groupsHtml}
                <div class="card-actions">
                    <button onclick="editContact('${contact.id}')">Edit</button>
                    <button class="secondary" onclick="deleteContact('${contact.id}')">Delete</button>
                </div>
            </div>
        `;
    }).join('');
}

function searchContacts() {
    const query = document.getElementById('contact-search').value.toLowerCase();
    const filtered = contacts.filter(c => 
        c.name.toLowerCase().includes(query) ||
        (c.email && c.email.toLowerCase().includes(query)) ||
        (c.phone && c.phone.includes(query))
    );
    renderContacts(filtered);
}

function showAddContactModal() {
    document.getElementById('contact-modal-title').textContent = 'Add Contact';
    document.getElementById('contact-form').reset();
    document.getElementById('contact-id').value = '';
    
    // Clear tags and groups
    currentContactTags = [];
    currentContactGroups = [];
    renderContactTags();
    renderContactGroups();
    
    // Populate group dropdown
    populateGroupDropdown();
    
    document.getElementById('contact-modal').classList.remove('hidden');
}

function editContact(id) {
    const contact = contacts.find(c => c.id === id);
    if (!contact) return;
    
    document.getElementById('contact-modal-title').textContent = 'Edit Contact';
    document.getElementById('contact-id').value = contact.id;
    document.getElementById('contact-name').value = contact.name;
    document.getElementById('contact-phone').value = contact.phone || '';
    document.getElementById('contact-email').value = contact.email || '';
    document.getElementById('contact-location').value = contact.location || '';
    document.getElementById('contact-frequency').value = contact.frequencyPreference || '';
    document.getElementById('contact-notes').value = contact.customNotes || '';
    
    // Load tags and groups
    currentContactTags = contact.tags || [];
    currentContactGroups = contact.groups || [];
    renderContactTags();
    renderContactGroups();
    
    // Populate group dropdown
    populateGroupDropdown();
    
    document.getElementById('contact-modal').classList.remove('hidden');
}

function closeContactModal() {
    document.getElementById('contact-modal').classList.add('hidden');
    document.getElementById('contact-modal-error').classList.add('hidden');
}

async function saveContact(event) {
    event.preventDefault();
    
    const id = document.getElementById('contact-id').value;
    const data = {
        userId: userId,
        name: document.getElementById('contact-name').value,
        phone: document.getElementById('contact-phone').value || undefined,
        email: document.getElementById('contact-email').value || undefined,
        location: document.getElementById('contact-location').value || undefined,
        frequencyPreference: document.getElementById('contact-frequency').value || undefined,
        customNotes: document.getElementById('contact-notes').value || undefined,
    };
    
    try {
        let response;
        let contactId = id;
        
        if (id) {
            // Update existing contact
            response = await fetch(`${API_BASE}/contacts/${id}`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify(data)
            });
        } else {
            // Create new contact
            response = await fetch(`${API_BASE}/contacts`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify(data)
            });
        }
        
        if (response.status === 401) {
            logout();
            return;
        }
        
        if (!response.ok) throw new Error('Failed to save contact');
        
        const savedContact = await response.json();
        contactId = savedContact.id;
        
        // Handle tags
        await syncContactTags(contactId, savedContact.tags || []);
        
        // Handle groups
        await syncContactGroups(contactId, savedContact.groups || []);
        
        closeContactModal();
        loadContacts();
    } catch (error) {
        console.error('Error saving contact:', error);
        showModalError('contact-modal-error', 'Failed to save contact');
    }
}

async function syncContactTags(contactId, existingTags) {
    try {
        // Find tags to add (in currentContactTags but not in existingTags)
        const tagsToAdd = currentContactTags.filter(currentTag => 
            !existingTags.some(existingTag => existingTag.text.toLowerCase() === currentTag.text.toLowerCase())
        );
        
        // Find tags to remove (in existingTags but not in currentContactTags)
        const tagsToRemove = existingTags.filter(existingTag =>
            !currentContactTags.some(currentTag => currentTag.text.toLowerCase() === existingTag.text.toLowerCase())
        );
        
        // Add new tags
        for (const tag of tagsToAdd) {
            await fetch(`${API_BASE}/contacts/tags`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({
                    userId: userId,
                    contactId: contactId,
                    text: tag.text,
                    source: 'manual'
                })
            });
        }
        
        // Remove old tags
        for (const tag of tagsToRemove) {
            await fetch(`${API_BASE}/contacts/tags/${tag.id}?userId=${userId}&contactId=${contactId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });
        }
    } catch (error) {
        console.error('Error syncing tags:', error);
        throw error;
    }
}

async function syncContactGroups(contactId, existingGroups) {
    try {
        // Find groups to add
        const groupsToAdd = currentContactGroups.filter(groupId => 
            !existingGroups.includes(groupId)
        );
        
        // Find groups to remove
        const groupsToRemove = existingGroups.filter(groupId =>
            !currentContactGroups.includes(groupId)
        );
        
        // Add to new groups
        if (groupsToAdd.length > 0) {
            for (const groupId of groupsToAdd) {
                await fetch(`${API_BASE}/contacts/bulk/groups`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authToken}`
                    },
                    body: JSON.stringify({
                        userId: userId,
                        contactIds: [contactId],
                        groupId: groupId,
                        action: 'add'
                    })
                });
            }
        }
        
        // Remove from old groups
        if (groupsToRemove.length > 0) {
            for (const groupId of groupsToRemove) {
                await fetch(`${API_BASE}/contacts/bulk/groups`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authToken}`
                    },
                    body: JSON.stringify({
                        userId: userId,
                        contactIds: [contactId],
                        groupId: groupId,
                        action: 'remove'
                    })
                });
            }
        }
    } catch (error) {
        console.error('Error syncing groups:', error);
        throw error;
    }
}

async function deleteContact(id) {
    if (!confirm('Are you sure you want to delete this contact?')) return;
    
    try {
        const response = await fetch(`${API_BASE}/contacts/${id}?userId=${userId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (response.status === 401) {
            logout();
            return;
        }
        
        if (!response.ok) throw new Error('Failed to delete contact');
        
        loadContacts();
    } catch (error) {
        console.error('Error deleting contact:', error);
        alert('Failed to delete contact');
    }
}

// Tag Management Functions
function populateGroupDropdown() {
    const select = document.getElementById('contact-group-select');
    select.innerHTML = '<option value="">Select a group...</option>';
    
    groups.forEach(group => {
        const option = document.createElement('option');
        option.value = group.id;
        option.textContent = group.name;
        select.appendChild(option);
    });
}

function renderContactTags() {
    const container = document.getElementById('contact-tags-list');
    
    if (currentContactTags.length === 0) {
        container.innerHTML = '<span style="color: #9ca3af; font-size: 12px;">No tags added</span>';
        return;
    }
    
    container.innerHTML = currentContactTags.map((tag, index) => `
        <div class="tag-item">
            <span>${escapeHtml(tag.text)}</span>
            <button type="button" class="remove-btn" onclick="removeTagFromContact(${index})" title="Remove tag">×</button>
        </div>
    `).join('');
}

function renderContactGroups() {
    const container = document.getElementById('contact-groups-list');
    
    if (currentContactGroups.length === 0) {
        container.innerHTML = '<span style="color: #9ca3af; font-size: 12px;">No groups assigned</span>';
        return;
    }
    
    container.innerHTML = currentContactGroups.map((groupId, index) => {
        const group = groups.find(g => g.id === groupId);
        const groupName = group ? group.name : 'Unknown';
        return `
            <div class="group-item">
                <span>${escapeHtml(groupName)}</span>
                <button type="button" class="remove-btn" onclick="removeGroupFromContact(${index})" title="Remove group">×</button>
            </div>
        `;
    }).join('');
}

function addTagToContact() {
    const input = document.getElementById('contact-tag-input');
    const text = input.value.trim();
    
    if (!text) {
        alert('Please enter a tag');
        return;
    }
    
    // Check if tag already exists
    if (currentContactTags.some(tag => tag.text.toLowerCase() === text.toLowerCase())) {
        alert('This tag already exists');
        return;
    }
    
    // Add tag to current list (will be saved when contact is saved)
    currentContactTags.push({
        text: text,
        source: 'manual',
        id: null // Will be assigned by backend
    });
    
    input.value = '';
    renderContactTags();
}

function removeTagFromContact(index) {
    currentContactTags.splice(index, 1);
    renderContactTags();
}

function assignGroupToContact() {
    const select = document.getElementById('contact-group-select');
    const groupId = select.value;
    
    if (!groupId) {
        alert('Please select a group');
        return;
    }
    
    // Check if group already assigned
    if (currentContactGroups.includes(groupId)) {
        alert('This group is already assigned');
        return;
    }
    
    currentContactGroups.push(groupId);
    select.value = '';
    renderContactGroups();
}

function removeGroupFromContact(index) {
    currentContactGroups.splice(index, 1);
    renderContactGroups();
}

// Suggestions Management
let currentSuggestionFilter = 'all';
let allSuggestions = []; // Store all suggestions for filtering

async function loadSuggestions(statusFilter) {
    try {
        // If statusFilter is provided, update the current filter
        if (statusFilter !== undefined) {
            currentSuggestionFilter = statusFilter;
        }
        
        // Use /all endpoint to get all suggestions
        const url = `${API_BASE}/suggestions/all?userId=${userId}`;
        
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (response.status === 401) {
            logout();
            return;
        }
        
        if (!response.ok) throw new Error('Failed to load suggestions');
        
        allSuggestions = await response.json();
        
        // Apply the current filter
        filterSuggestions(currentSuggestionFilter);
    } catch (error) {
        console.error('Error loading suggestions:', error);
        showError('suggestions-list', 'Failed to load suggestions');
    }
}

function filterSuggestions(status) {
    // Update current filter state
    currentSuggestionFilter = status;
    
    // Update active button state
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    const activeButton = document.getElementById(`filter-${status}`);
    if (activeButton) {
        activeButton.classList.add('active');
    }
    
    // Filter suggestions based on status
    if (status === 'all') {
        suggestions = allSuggestions;
    } else {
        suggestions = allSuggestions.filter(s => s.status === status);
    }
    
    // Render filtered suggestions
    renderSuggestions(suggestions);
}

function renderSuggestions(suggestionsList) {
    const container = document.getElementById('suggestions-list');
    
    if (suggestionsList.length === 0) {
        const filterText = currentSuggestionFilter === 'all' ? '' : ` with status "${currentSuggestionFilter}"`;
        container.innerHTML = `
            <div class="empty-state">
                <h3>No suggestions${filterText}</h3>
                <p>Suggestions will appear here based on your contacts and calendar</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = suggestionsList.map(suggestion => {
        const contact = contacts.find(c => c.id === suggestion.contactId);
        const contactName = contact ? contact.name : 'Unknown';
        
        // Status badge styling
        const statusColors = {
            pending: '#f59e0b',
            accepted: '#10b981',
            dismissed: '#6b7280',
            snoozed: '#3b82f6'
        };
        const statusColor = statusColors[suggestion.status] || '#6b7280';
        
        // Show different actions based on status
        let actions = '';
        if (suggestion.status === 'pending') {
            actions = `
                <button onclick="acceptSuggestion('${suggestion.id}')">Accept</button>
                <button class="secondary" onclick="dismissSuggestion('${suggestion.id}')">Dismiss</button>
                <button class="secondary" onclick="snoozeSuggestion('${suggestion.id}')">Snooze</button>
            `;
        } else {
            actions = `<span style="color: #6b7280; font-size: 14px;">No actions available</span>`;
        }
        
        return `
            <div class="card">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
                    <h3 style="margin: 0;">Connect with ${escapeHtml(contactName)}</h3>
                    <span style="background: ${statusColor}; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; text-transform: capitalize;">
                        ${suggestion.status}
                    </span>
                </div>
                <p><strong>Time:</strong> ${formatDateTime(suggestion.proposedTimeslot.start)}</p>
                <p><strong>Reason:</strong> ${escapeHtml(suggestion.reasoning)}</p>
                <p><strong>Type:</strong> ${suggestion.triggerType}</p>
                ${suggestion.snoozedUntil ? `<p><strong>Snoozed until:</strong> ${formatDateTime(suggestion.snoozedUntil)}</p>` : ''}
                ${suggestion.dismissalReason ? `<p><strong>Dismissal reason:</strong> ${escapeHtml(suggestion.dismissalReason)}</p>` : ''}
                <div class="card-actions">
                    ${actions}
                </div>
            </div>
        `;
    }).join('');
}

async function acceptSuggestion(id) {
    try {
        const response = await fetch(`${API_BASE}/suggestions/${id}/accept`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ userId: userId })
        });
        
        if (response.status === 401) {
            logout();
            return;
        }
        
        if (!response.ok) throw new Error('Failed to accept suggestion');
        
        // Reload suggestions maintaining current filter
        loadSuggestions();
    } catch (error) {
        console.error('Error accepting suggestion:', error);
        alert('Failed to accept suggestion');
    }
}

async function dismissSuggestion(id) {
    const reason = prompt('Reason for dismissing (optional):');
    
    try {
        const response = await fetch(`${API_BASE}/suggestions/${id}/dismiss`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ userId: userId, reason })
        });
        
        if (response.status === 401) {
            logout();
            return;
        }
        
        if (!response.ok) throw new Error('Failed to dismiss suggestion');
        
        // Reload suggestions maintaining current filter
        loadSuggestions();
    } catch (error) {
        console.error('Error dismissing suggestion:', error);
        alert('Failed to dismiss suggestion');
    }
}

async function snoozeSuggestion(id) {
    const days = prompt('Snooze for how many days?', '7');
    if (!days) return;
    
    // Convert days to hours (service expects hours)
    const hours = parseInt(days) * 24;
    
    try {
        const response = await fetch(`${API_BASE}/suggestions/${id}/snooze`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ 
                userId: userId, 
                duration: hours
            })
        });
        
        if (response.status === 401) {
            logout();
            return;
        }
        
        if (!response.ok) throw new Error('Failed to snooze suggestion');
        
        // Reload suggestions maintaining current filter
        loadSuggestions();
    } catch (error) {
        console.error('Error snoozing suggestion:', error);
        alert('Failed to snooze suggestion');
    }
}

// Calendar Management
function loadCalendar() {
    const container = document.getElementById('calendar-content');
    container.innerHTML = `
        <div class="empty-state">
            <h3>Calendar Integration</h3>
            <p>Connect your Google Calendar to enable smart scheduling</p>
            <button onclick="connectCalendar()">Connect Google Calendar</button>
        </div>
    `;
}

function connectCalendar() {
    alert('Calendar OAuth flow would be implemented here');
}

// Voice Notes
function loadVoiceNotes() {
    const container = document.getElementById('voice-content');
    container.innerHTML = `
        <div class="empty-state">
            <h3>Voice Notes</h3>
            <p>Record voice notes to quickly add context about your contacts</p>
            <button onclick="recordVoiceNote()">Record Voice Note</button>
        </div>
    `;
}

function recordVoiceNote() {
    alert('Voice recording would be implemented here');
}

// Preferences
function loadPreferences() {
    const container = document.getElementById('preferences-content');
    container.innerHTML = `
        <h3>Notification Preferences</h3>
        <div class="form-group">
            <label>
                <input type="checkbox" checked> Enable SMS notifications
            </label>
        </div>
        <div class="form-group">
            <label>
                <input type="checkbox" checked> Enable email notifications
            </label>
        </div>
        <div class="form-group">
            <label for="batch-day">Batch notification day:</label>
            <select id="batch-day">
                <option value="0" selected>Sunday</option>
                <option value="1">Monday</option>
                <option value="2">Tuesday</option>
                <option value="3">Wednesday</option>
                <option value="4">Thursday</option>
                <option value="5">Friday</option>
                <option value="6">Saturday</option>
            </select>
        </div>
        <div class="form-group">
            <label for="batch-time">Batch notification time:</label>
            <input type="time" id="batch-time" value="09:00">
        </div>
        <button onclick="savePreferences()">Save Preferences</button>
    `;
}

function savePreferences() {
    alert('Preferences saved!');
}

// Test Data Functions
async function seedTestData() {
    if (!confirm('This will create test contacts with tags, groups, calendar events, and suggestions. Continue?')) {
        return;
    }
    
    // Show loading indicator
    showTestDataLoading('Seeding test data...');
    
    try {
        const response = await fetch(`${API_BASE}/test-data/seed`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ 
                contactCount: 10,
                includeCalendarEvents: true,
                includeSuggestions: true
            })
        });
        
        if (response.status === 401) {
            logout();
            return;
        }
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to seed test data');
        }
        
        const data = await response.json();
        
        // Hide loading indicator
        hideTestDataLoading();
        
        // Show success message with counts
        const successMessage = `Created ${data.contactsCreated} contacts, ${data.groupsCreated} groups, ${data.tagsCreated} tags, ${data.calendarEventsCreated} calendar events, and ${data.suggestionsCreated || 0} suggestions!`;
        showTestDataSuccess(successMessage);
        
        // Auto-refresh relevant UI sections
        if (currentPage === 'contacts') {
            loadContacts();
        } else if (currentPage === 'suggestions') {
            loadSuggestions();
        }
        
    } catch (error) {
        console.error('Error seeding test data:', error);
        hideTestDataLoading();
        showTestDataError(error.message || 'Failed to seed test data');
    }
}

async function generateSuggestions() {
    if (!confirm('This will generate new suggestions based on your existing contacts and calendar. Continue?')) {
        return;
    }
    
    // Show loading indicator
    showTestDataLoading('Generating suggestions...');
    
    try {
        const response = await fetch(`${API_BASE}/test-data/generate-suggestions`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ 
                daysAhead: 7
            })
        });
        
        if (response.status === 401) {
            logout();
            return;
        }
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to generate suggestions');
        }
        
        const data = await response.json();
        
        // Hide loading indicator
        hideTestDataLoading();
        
        // Show success message
        showTestDataSuccess(`Generated ${data.suggestionsCreated} new suggestions!`);
        
        // Auto-refresh suggestions
        if (currentPage === 'suggestions') {
            loadSuggestions();
        }
        
    } catch (error) {
        console.error('Error generating suggestions:', error);
        hideTestDataLoading();
        showTestDataError(error.message || 'Failed to generate suggestions');
    }
}

async function clearTestData() {
    if (!confirm('This will delete ALL test data including contacts, groups, tags, calendar events, and suggestions. This action cannot be undone. Continue?')) {
        return;
    }
    
    // Show loading indicator
    showTestDataLoading('Clearing test data...');
    
    try {
        const response = await fetch(`${API_BASE}/test-data/clear`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (response.status === 401) {
            logout();
            return;
        }
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to clear test data');
        }
        
        const data = await response.json();
        
        // Hide loading indicator
        hideTestDataLoading();
        
        // Show success message with counts
        const successMessage = `Cleared ${data.contactsDeleted} contacts, ${data.groupsDeleted} groups, ${data.tagsDeleted} tags, ${data.calendarEventsDeleted} calendar events, and ${data.suggestionsDeleted} suggestions!`;
        showTestDataSuccess(successMessage);
        
        // Auto-refresh relevant UI sections
        if (currentPage === 'contacts') {
            loadContacts();
        } else if (currentPage === 'suggestions') {
            loadSuggestions();
        }
        
    } catch (error) {
        console.error('Error clearing test data:', error);
        hideTestDataLoading();
        showTestDataError(error.message || 'Failed to clear test data');
    }
}

// Helper functions for test data UI feedback
function showTestDataLoading(message) {
    const infoBox = document.getElementById('suggestions-info');
    const infoText = document.getElementById('suggestions-info-text');
    
    infoBox.style.background = '#e0f2fe';
    infoBox.style.display = 'block';
    infoText.innerHTML = `<span style="display: inline-block; animation: spin 1s linear infinite;">⏳</span> ${escapeHtml(message)}`;
}

function hideTestDataLoading() {
    // Loading is hidden when success or error is shown
}

function showTestDataSuccess(message) {
    const infoBox = document.getElementById('suggestions-info');
    const infoText = document.getElementById('suggestions-info-text');
    
    infoBox.style.background = '#d1fae5';
    infoBox.style.display = 'block';
    infoText.innerHTML = `✅ ${escapeHtml(message)}`;
    
    // Hide after 5 seconds
    setTimeout(() => {
        infoBox.style.display = 'none';
    }, 5000);
}

function showTestDataError(message) {
    const infoBox = document.getElementById('suggestions-info');
    const infoText = document.getElementById('suggestions-info-text');
    
    infoBox.style.background = '#fee2e2';
    infoBox.style.display = 'block';
    infoText.innerHTML = `❌ ${escapeHtml(message)}`;
    
    // Hide after 7 seconds (longer for errors)
    setTimeout(() => {
        infoBox.style.display = 'none';
    }, 7000);
}

// Utility functions
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString();
}

function showError(containerId, message) {
    const container = document.getElementById(containerId);
    container.innerHTML = `<div class="error">${escapeHtml(message)}</div>`;
}

function showModalError(errorId, message) {
    const errorEl = document.getElementById(errorId);
    errorEl.textContent = message;
    errorEl.classList.remove('hidden');
}
