// CatchUp Web Interface

// Configuration
const API_BASE = '/api';

// State
let authToken = null;
let userId = null;
let userEmail = null;
let contacts = [];
let suggestions = [];
let currentPage = 'contacts';
let isLoginMode = true;

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
    
    container.innerHTML = contactsList.map(contact => `
        <div class="card">
            <h3>${escapeHtml(contact.name)}</h3>
            <p><strong>Phone:</strong> ${contact.phone || 'N/A'}</p>
            <p><strong>Email:</strong> ${contact.email || 'N/A'}</p>
            <p><strong>Location:</strong> ${contact.location || 'N/A'}</p>
            ${contact.timezone ? `<p><strong>Timezone:</strong> ${contact.timezone}</p>` : ''}
            ${contact.frequencyPreference ? `<p><strong>Frequency:</strong> ${contact.frequencyPreference}</p>` : ''}
            ${contact.customNotes ? `<p><strong>Notes:</strong> ${escapeHtml(contact.customNotes)}</p>` : ''}
            ${contact.tags && contact.tags.length > 0 ? `<p><strong>Tags:</strong> ${contact.tags.map(t => t.text).join(', ')}</p>` : ''}
            <div class="card-actions">
                <button onclick="editContact('${contact.id}')">Edit</button>
                <button class="secondary" onclick="deleteContact('${contact.id}')">Delete</button>
            </div>
        </div>
    `).join('');
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
        
        closeContactModal();
        loadContacts();
    } catch (error) {
        console.error('Error saving contact:', error);
        showModalError('contact-modal-error', 'Failed to save contact');
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

// Suggestions Management
async function loadSuggestions() {
    try {
        const response = await fetch(`${API_BASE}/suggestions?userId=${userId}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (response.status === 401) {
            logout();
            return;
        }
        
        if (!response.ok) throw new Error('Failed to load suggestions');
        
        suggestions = await response.json();
        renderSuggestions(suggestions);
    } catch (error) {
        console.error('Error loading suggestions:', error);
        showError('suggestions-list', 'Failed to load suggestions');
    }
}

function renderSuggestions(suggestionsList) {
    const container = document.getElementById('suggestions-list');
    
    if (suggestionsList.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>No suggestions yet</h3>
                <p>Suggestions will appear here based on your contacts and calendar</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = suggestionsList.map(suggestion => {
        const contact = contacts.find(c => c.id === suggestion.contactId);
        const contactName = contact ? contact.name : 'Unknown';
        
        return `
            <div class="card">
                <h3>Connect with ${escapeHtml(contactName)}</h3>
                <p><strong>Time:</strong> ${formatDateTime(suggestion.proposedTimeslot.start)}</p>
                <p><strong>Reason:</strong> ${escapeHtml(suggestion.reasoning)}</p>
                <p><strong>Type:</strong> ${suggestion.triggerType}</p>
                <div class="card-actions">
                    <button onclick="acceptSuggestion('${suggestion.id}')">Accept</button>
                    <button class="secondary" onclick="dismissSuggestion('${suggestion.id}')">Dismiss</button>
                    <button class="secondary" onclick="snoozeSuggestion('${suggestion.id}')">Snooze</button>
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
        
        loadSuggestions();
    } catch (error) {
        console.error('Error dismissing suggestion:', error);
        alert('Failed to dismiss suggestion');
    }
}

async function snoozeSuggestion(id) {
    const days = prompt('Snooze for how many days?', '7');
    if (!days) return;
    
    try {
        const response = await fetch(`${API_BASE}/suggestions/${id}/snooze`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ 
                userId: userId, 
                duration: { days: parseInt(days) }
            })
        });
        
        if (response.status === 401) {
            logout();
            return;
        }
        
        if (!response.ok) throw new Error('Failed to snooze suggestion');
        
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
    if (!confirm('This will create 5 test contacts with different scenarios and generate suggestions. Continue?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/suggestions/seed-test-data`, {
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
        
        if (!response.ok) throw new Error('Failed to seed test data');
        
        const data = await response.json();
        
        // Show success message
        document.getElementById('suggestions-info-text').textContent = 
            `Created ${data.contactsCreated} test contacts and ${data.suggestionsCreated} suggestions!`;
        document.getElementById('suggestions-info').style.display = 'block';
        
        // Reload contacts and suggestions
        if (currentPage === 'contacts') {
            loadContacts();
        } else {
            loadSuggestions();
        }
        
        // Hide info after 5 seconds
        setTimeout(() => {
            document.getElementById('suggestions-info').style.display = 'none';
        }, 5000);
        
    } catch (error) {
        console.error('Error seeding test data:', error);
        alert('Failed to seed test data');
    }
}

async function generateSuggestions() {
    if (!confirm('This will generate new suggestions based on your existing contacts. Continue?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/suggestions/generate`, {
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
        
        if (!response.ok) throw new Error('Failed to generate suggestions');
        
        const data = await response.json();
        
        // Show success message
        document.getElementById('suggestions-info-text').textContent = 
            `Generated ${data.suggestionsCreated} new suggestions!`;
        document.getElementById('suggestions-info').style.display = 'block';
        
        // Reload suggestions
        loadSuggestions();
        
        // Hide info after 5 seconds
        setTimeout(() => {
            document.getElementById('suggestions-info').style.display = 'none';
        }, 5000);
        
    } catch (error) {
        console.error('Error generating suggestions:', error);
        alert('Failed to generate suggestions');
    }
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
