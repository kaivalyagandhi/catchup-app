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
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize theme before anything else to ensure proper styling
    if (typeof themeManager !== 'undefined') {
        themeManager.initializeTheme();
        updateThemeIcon();
    }
    
    // Check if we're handling a Google SSO redirect
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('auth_success') === 'true' && urlParams.get('token')) {
        // Keep loading screen visible while Google SSO processes the redirect
        // Initialize Google SSO to handle the redirect, then it will reload
        if (typeof initGoogleSSO === 'function') {
            initGoogleSSO();
        }
        return;
    }
    
    // Check auth first and wait for it to complete
    checkAuth();
    setupNavigation();
    
    // Handle calendar success redirect
    if (urlParams.get('calendar_success') === 'true') {
        // Clear URL parameters
        window.history.replaceState({}, document.title, window.location.pathname);
        // Show success message
        setTimeout(() => {
            showToast('Google Calendar connected successfully!', 'success');
            // Refresh preferences if on that page
            if (currentPage === 'preferences') {
                loadPreferences();
            }
        }, 500);
    }
    
    // Handle calendar error redirect
    if (urlParams.get('calendar_error')) {
        const error = urlParams.get('calendar_error');
        window.history.replaceState({}, document.title, window.location.pathname);
        setTimeout(() => {
            showToast(`Failed to connect calendar: ${error}`, 'error');
        }, 500);
    }
    
    // Handle contacts success redirect
    if (urlParams.get('contacts_success') === 'true') {
        window.history.replaceState({}, document.title, window.location.pathname);
        setTimeout(() => {
            showToast('Google Contacts connected successfully! Syncing contacts...', 'success');
            // Refresh preferences if on that page
            if (currentPage === 'preferences') {
                loadPreferences();
            }
            // Refresh contacts if on that page
            if (currentPage === 'contacts') {
                loadContacts();
            }
        }, 500);
    }
    
    // Handle contacts error redirect
    if (urlParams.get('contacts_error')) {
        const error = urlParams.get('contacts_error');
        window.history.replaceState({}, document.title, window.location.pathname);
        setTimeout(() => {
            showToast(`Failed to connect contacts: ${error}`, 'error');
        }, 500);
    }
    
    // Listen for contacts updates from voice notes enrichment
    window.addEventListener('contacts-updated', () => {
        console.log('contacts-updated event received, currentPage:', currentPage);
        
        // Always refresh contacts data since it's used across multiple pages
        console.log('Refreshing contacts list');
        loadContacts();
        
        // Also refresh groups/tags view if visible
        if (currentPage === 'groups-tags') {
            console.log('Refreshing groups and tags');
            loadGroupsAndTags();
        }
    });
});

// Authentication
function checkAuth() {
    // Loading screen is already visible by default
    
    authToken = localStorage.getItem('authToken');
    userId = localStorage.getItem('userId');
    userEmail = localStorage.getItem('userEmail');
    
    if (authToken && userId) {
        showMainApp();
    } else {
        showAuthScreen();
    }
}

function showLoadingScreen() {
    document.getElementById('loading-screen').classList.remove('hidden');
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('main-app').classList.add('hidden');
}

function showAuthScreen() {
    document.getElementById('loading-screen').classList.add('hidden');
    document.getElementById('auth-screen').classList.remove('hidden');
    document.getElementById('main-app').classList.add('hidden');
    
    // Initialize Google SSO when showing auth screen
    if (typeof initGoogleSSO === 'function') {
        initGoogleSSO();
    }
}

function showMainApp() {
    document.getElementById('loading-screen').classList.add('hidden');
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('main-app').classList.remove('hidden');
    document.getElementById('user-email').textContent = userEmail;
    updateThemeIcon();
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

// Theme Toggle
function toggleTheme() {
    if (typeof themeManager !== 'undefined') {
        themeManager.toggleTheme();
        updateThemeIcon();
    } else {
        console.error('Theme manager not available');
    }
}

function updateThemeIcon() {
    const themeIcon = document.getElementById('theme-icon');
    if (themeIcon && typeof themeManager !== 'undefined') {
        const currentTheme = themeManager.getCurrentTheme();
        // Show moon (🌙) when in light mode (to indicate dark mode is available)
        // Show sun (☀️) when in dark mode (to indicate light mode is available)
        themeIcon.textContent = currentTheme === 'light' ? '🌙' : '☀️';
    }
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
        case 'groups-tags':
            loadGroupsTagsManagement();
            break;
        case 'suggestions':
            loadSuggestions();
            break;
        case 'voice':
            loadVoiceNotes();
            break;
        case 'preferences':
            loadPreferences();
            break;
    }
}

// Wrapper function for button navigation (used by Preferences button)
function navigateToPage(page) {
    navigateTo(page);
}

// Contacts Management
async function loadContacts() {
    const container = document.getElementById('contacts-list');
    
    // Show loading state
    container.innerHTML = `
        <div class="loading-state">
            <div class="spinner"></div>
            <p>Loading contacts...</p>
        </div>
    `;
    
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
        
        // Check onboarding status after contacts are loaded
        // Use setTimeout to avoid blocking the UI
        setTimeout(() => {
            checkOnboardingStatus();
        }, 500);
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
        
        // Render source badge
        let sourceBadge = '';
        if (contact.source === 'google') {
            sourceBadge = `
                <span style="display: inline-flex; align-items: center; gap: 4px; background: #4285f4; color: white; padding: 4px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; margin-bottom: 8px;">
                    <img src="https://www.gstatic.com/marketing-cms/assets/images/ff/21/95f22bf94e35bea3ec097d3f4720/contacts.png" alt="Google" style="width: 12px; height: 12px;">
                    Google
                </span>
            `;
        }
        
        // Render last sync timestamp for Google contacts
        let lastSyncInfo = '';
        if (contact.source === 'google' && contact.lastSyncedAt) {
            const syncDate = new Date(contact.lastSyncedAt);
            const now = new Date();
            const diffMs = now - syncDate;
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMs / 3600000);
            const diffDays = Math.floor(diffMs / 86400000);
            
            let timeAgo = '';
            if (diffMins < 1) timeAgo = 'Just now';
            else if (diffMins < 60) timeAgo = `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
            else if (diffHours < 24) timeAgo = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
            else if (diffDays < 7) timeAgo = `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
            else timeAgo = syncDate.toLocaleDateString();
            
            lastSyncInfo = `
                <p style="font-size: 11px; color: var(--text-secondary); margin-top: 4px;">
                    <span style="margin-right: 4px;">🔄</span>Last synced: ${timeAgo}
                </p>
            `;
        }
        
        // Render circle assignment
        let circleHtml = '';
        if (contact.dunbarCircle) {
            const circleInfo = getCircleInfo(contact.dunbarCircle);
            circleHtml = `
                <div style="margin-top: 12px; padding: 8px; background: ${circleInfo.color}15; border-left: 3px solid ${circleInfo.color}; border-radius: 4px;">
                    <p style="font-size: 12px; font-weight: 600; color: ${circleInfo.color}; margin: 0;">
                        <span style="margin-right: 6px;">${circleInfo.emoji}</span>${circleInfo.name}
                    </p>
                    ${contact.circleConfidence ? `<p style="font-size: 11px; color: var(--text-secondary); margin: 4px 0 0 0;">Confidence: ${Math.round(contact.circleConfidence * 100)}%</p>` : ''}
                </div>
            `;
        }
        
        return `
            <div class="card">
                ${sourceBadge}
                <h3>${escapeHtml(contact.name)}</h3>
                <p><span style="font-size: 16px; margin-right: 8px;">📞</span><strong>Phone:</strong> ${contact.phone || 'N/A'}</p>
                <p><span style="font-size: 16px; margin-right: 8px;">✉️</span><strong>Email:</strong> ${contact.email || 'N/A'}</p>
                <p><span style="font-size: 16px; margin-right: 8px;">📍</span><strong>Location:</strong> ${contact.location || 'N/A'}</p>
                ${contact.timezone ? `<p><span style="font-size: 16px; margin-right: 8px;">🌍</span><strong>Timezone:</strong> ${contact.timezone}</p>` : ''}
                ${contact.frequencyPreference ? `<p><span style="font-size: 16px; margin-right: 8px;">📅</span><strong>Frequency:</strong> ${contact.frequencyPreference}</p>` : ''}
                ${contact.customNotes ? `<p><span style="font-size: 16px; margin-right: 8px;">📝</span><strong>Notes:</strong> ${escapeHtml(contact.customNotes)}</p>` : ''}
                ${lastSyncInfo}
                ${circleHtml}
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

// Track current filter
let currentContactFilter = 'all';

function searchContacts() {
    const query = document.getElementById('contact-search').value.toLowerCase();
    let filtered = contacts.filter(c => 
        c.name.toLowerCase().includes(query) ||
        (c.email && c.email.toLowerCase().includes(query)) ||
        (c.phone && c.phone.includes(query))
    );
    
    // Apply source filter
    if (currentContactFilter !== 'all') {
        filtered = filtered.filter(c => c.source === currentContactFilter);
    }
    
    renderContacts(filtered);
}

function filterContactsBySource(source) {
    currentContactFilter = source;
    
    // Update active filter button
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.getElementById(`filter-${source}`).classList.add('active');
    
    // Apply filter
    searchContacts();
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
    
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    
    try {
        // Show loading state
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="loading-spinner"></span> Saving...';
        
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
        
        // Show success toast
        showToast(id ? 'Contact updated successfully!' : 'Contact created successfully!', 'success');
        
        closeContactModal();
        loadContacts();
        
        // Refresh groups and tags management view if it's currently visible
        // This ensures contact counts are updated in the management view
        if (currentPage === 'groups-tags') {
            await loadGroupsTagsManagement();
        }
    } catch (error) {
        console.error('Error saving contact:', error);
        showModalError('contact-modal-error', 'Failed to save contact');
    } finally {
        // Restore button state
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
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
    
    const loadingToastId = showToast('Deleting contact...', 'loading');
    
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
        
        hideToast(loadingToastId);
        showToast('Contact deleted successfully!', 'success');
        
        loadContacts();
        
        // Refresh groups and tags management view if it's currently visible
        // This ensures contact counts are updated in the management view
        if (currentPage === 'groups-tags') {
            await loadGroupsTagsManagement();
        }
    } catch (error) {
        console.error('Error deleting contact:', error);
        hideToast(loadingToastId);
        showToast('Failed to delete contact', 'error');
    }
}

// Test Data Functions
async function seedTestData() {
    if (!confirm('This will create test contacts, groups, tags, and suggestions. Continue?')) return;
    
    const loadingToastId = showToast('Loading test data...', 'loading');
    
    try {
        const response = await fetch(`${API_BASE}/test-data/seed`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                contactCount: 10,
                includeCalendarEvents: false,
                includeSuggestions: true,
                includeVoiceNotes: true
            })
        });
        
        if (response.status === 401) {
            logout();
            return;
        }
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to seed test data');
        }
        
        const result = await response.json();
        
        hideToast(loadingToastId);
        showToast(`Test data loaded! Created ${result.contactsCreated} contacts, ${result.groupsCreated || 0} groups, ${result.tagsCreated || 0} tags, ${result.suggestionsCreated || 0} suggestions`, 'success');
        
        // Reload current page data
        if (currentPage === 'contacts') {
            loadContacts();
        } else if (currentPage === 'groups-tags') {
            loadGroupsTagsManagement();
        } else if (currentPage === 'suggestions') {
            loadSuggestions();
        } else if (currentPage === 'voice') {
            loadVoiceNotes();
        }
    } catch (error) {
        console.error('Error seeding test data:', error);
        hideToast(loadingToastId);
        showToast(error.message || 'Failed to load test data', 'error');
    }
}

async function clearTestData() {
    if (!confirm('This will delete ALL your contacts, groups, tags, suggestions, and voice notes. This cannot be undone. Continue?')) return;
    
    const loadingToastId = showToast('Clearing all data...', 'loading');
    
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
            const error = await response.json();
            throw new Error(error.message || 'Failed to clear test data');
        }
        
        const result = await response.json();
        
        hideToast(loadingToastId);
        showToast(`All data cleared! Deleted ${result.contactsDeleted} contacts, ${result.groupsDeleted || 0} groups, ${result.tagsDeleted || 0} tags, ${result.suggestionsDeleted || 0} suggestions`, 'success');
        
        // Reload current page data
        if (currentPage === 'contacts') {
            loadContacts();
        } else if (currentPage === 'groups-tags') {
            loadGroupsTagsManagement();
        } else if (currentPage === 'suggestions') {
            loadSuggestions();
        } else if (currentPage === 'voice') {
            loadVoiceNotes();
        }
    } catch (error) {
        console.error('Error clearing test data:', error);
        hideToast(loadingToastId);
        showToast(error.message || 'Failed to clear data', 'error');
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

// Groups & Tags Management
let allGroups = [];
let allTags = [];

async function loadGroupsTagsManagement() {
    await loadGroupsList();
    await loadTags();
    await loadGroupMappingsSection();
}

async function loadGroupMappingsSection() {
    // Only show if Google Contacts is connected
    if (typeof loadAllGroupMappings !== 'function') {
        return;
    }
    
    try {
        // Check if user has Google Contacts connected
        const statusResponse = await fetch(`${API_BASE}/contacts/oauth/status`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (!statusResponse.ok) {
            return;
        }
        
        const status = await statusResponse.json();
        if (!status.connected) {
            return;
        }
        
        // Load and render group mappings
        const allMappings = await loadAllGroupMappings();
        const pendingMappings = allMappings.filter(m => m.mappingStatus === 'pending');
        const approvedMappings = allMappings.filter(m => m.mappingStatus === 'approved');
        const rejectedMappings = allMappings.filter(m => m.mappingStatus === 'rejected');
        
        if (allMappings.length > 0 && typeof renderGroupMappingReview === 'function') {
            // Find the groups-tags-page container
            const page = document.getElementById('groups-tags-page');
            if (!page) return;
            
            // Remove existing mapping section if present
            const existingSection = page.querySelector('#google-group-mappings-section');
            if (existingSection) {
                existingSection.remove();
            }
            
            // Create and append new section
            const groupMappingSection = document.createElement('div');
            groupMappingSection.id = 'google-group-mappings-section';
            groupMappingSection.innerHTML = renderGroupMappingReview(pendingMappings, approvedMappings, rejectedMappings);
            page.appendChild(groupMappingSection);
        }
    } catch (error) {
        console.error('Error loading group mappings section:', error);
    }
}

async function loadGroupsList() {
    const container = document.getElementById('groups-list');
    
    // Show loading indicator
    container.innerHTML = `
        <div class="loading-state">
            <div class="spinner"></div>
            <p>Loading groups...</p>
        </div>
    `;
    
    try {
        const response = await fetchWithRetry(`${API_BASE}/groups-tags/groups?userId=${userId}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load groups');
        }
        
        allGroups = await response.json();
        renderGroupsList(allGroups);
    } catch (error) {
        console.error('Error loading groups:', error);
        container.innerHTML = `
            <div class="error-state">
                <h3>Failed to load groups</h3>
                <p>${escapeHtml(error.message)}</p>
                <button onclick="loadGroupsList()" class="retry-btn">Retry</button>
            </div>
        `;
    }
}

// Load tags from API with loading indicator
async function loadTags() {
    const container = document.getElementById('tags-list');
    
    // Show loading indicator
    container.innerHTML = `
        <div class="loading-state">
            <div class="spinner"></div>
            <p>Loading tags...</p>
        </div>
    `;
    
    try {
        const response = await fetchWithRetry(`${API_BASE}/groups-tags/tags`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load tags');
        }
        
        allTags = await response.json();
        renderTags(allTags);
    } catch (error) {
        console.error('Error loading tags:', error);
        container.innerHTML = `
            <div class="error-state">
                <h3>Failed to load tags</h3>
                <p>${escapeHtml(error.message)}</p>
                <button onclick="loadTags()" class="retry-btn">Retry</button>
            </div>
        `;
    }
}

// Alias for backward compatibility
async function loadTagsList() {
    await loadTags();
}

function renderGroupsList(groupsList) {
    const container = document.getElementById('groups-list');
    
    if (groupsList.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>No groups yet</h3>
                <p>Create your first group to organize contacts</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = groupsList.map(group => `
        <div class="management-item" onclick="showGroupContacts('${group.id}')">
            <div class="management-item-header">
                <span class="management-item-name">${escapeHtml(group.name)}</span>
                <span class="management-item-count">${group.contactCount || 0} contacts</span>
            </div>
            <div class="management-item-actions" onclick="event.stopPropagation()">
                <button onclick="showEditGroupModal('${group.id}')">Edit</button>
                <button class="secondary" onclick="deleteGroup('${group.id}')">Delete</button>
                <button class="secondary" onclick="showAddContactsToGroupModal('${group.id}')">Add Contacts</button>
            </div>
        </div>
    `).join('');
}

// Render tags list with contact counts and click handlers
function renderTags(tagsList) {
    const container = document.getElementById('tags-list');
    
    // Display empty state when no tags exist
    if (tagsList.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>No tags yet</h3>
                <p>Create your first tag to label contacts</p>
            </div>
        `;
        return;
    }
    
    // Render tags with contact counts and action buttons
    container.innerHTML = tagsList.map(tag => `
        <div class="management-item" onclick="showTagContacts('${tag.id}')">
            <div class="management-item-header">
                <span class="management-item-name">${escapeHtml(tag.text)}</span>
                <span class="management-item-count">${tag.contactCount || 0} contacts</span>
            </div>
            <div class="management-item-actions" onclick="event.stopPropagation()">
                <button onclick="showEditTagModal('${tag.id}')">Edit</button>
                <button class="secondary" onclick="deleteTag('${tag.id}')">Delete</button>
                <button class="secondary" onclick="showAddContactsToTagModal('${tag.id}')">Add Contacts</button>
            </div>
        </div>
    `).join('');
}

// Alias for backward compatibility
function renderTagsList(tagsList) {
    renderTags(tagsList);
}

function searchGroups() {
    const query = document.getElementById('group-search').value.toLowerCase();
    const filtered = allGroups.filter(g => 
        g.name.toLowerCase().includes(query)
    );
    renderGroupsList(filtered);
}

function searchTags() {
    const query = document.getElementById('tag-search').value.toLowerCase();
    const filtered = allTags.filter(t => 
        t.text.toLowerCase().includes(query)
    );
    renderTags(filtered);
}

// Group Management Modal Functions
function showCreateGroupModal() {
    document.getElementById('group-modal-title').textContent = 'Create Group';
    document.getElementById('group-form').reset();
    document.getElementById('group-id').value = '';
    document.getElementById('group-modal-error').classList.add('hidden');
    document.getElementById('group-modal-success').classList.add('hidden');
    document.getElementById('group-modal').classList.remove('hidden');
}

function showEditGroupModal(groupId) {
    const group = allGroups.find(g => g.id === groupId);
    if (!group) {
        alert('Group not found');
        return;
    }
    
    document.getElementById('group-modal-title').textContent = 'Edit Group';
    document.getElementById('group-id').value = group.id;
    document.getElementById('group-name').value = group.name;
    document.getElementById('group-modal-error').classList.add('hidden');
    document.getElementById('group-modal-success').classList.add('hidden');
    document.getElementById('group-modal').classList.remove('hidden');
}

function closeGroupModal() {
    document.getElementById('group-modal').classList.add('hidden');
    document.getElementById('group-modal-error').classList.add('hidden');
    document.getElementById('group-modal-success').classList.add('hidden');
}

async function saveGroup(event) {
    event.preventDefault();
    
    const id = document.getElementById('group-id').value;
    const rawName = document.getElementById('group-name').value;
    const name = sanitizeInput(rawName);
    
    // Validation: Check if name is empty
    if (!name) {
        showModalError('group-modal-error', 'Group name is required');
        return;
    }
    
    // Validation: Check name length
    if (name.length > 255) {
        showModalError('group-modal-error', 'Group name must be 255 characters or less');
        return;
    }
    
    const submitBtn = document.getElementById('group-submit-btn');
    const originalText = submitBtn.textContent;
    
    // Use concurrency control to prevent duplicate submissions
    const operationKey = `save-group-${id || 'new'}`;
    
    try {
        await executeWithConcurrencyControl(operationKey, async () => {
            // Show loading state
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="loading-spinner"></span> Saving...';
            
            let response;
            
            if (id) {
                // Update existing group
                response = await fetchWithRetry(`${API_BASE}/groups-tags/groups/${id}`, {
                    method: 'PUT',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authToken}`
                    },
                    body: JSON.stringify({ userId, name })
                });
            } else {
                // Create new group
                response = await fetchWithRetry(`${API_BASE}/groups-tags/groups`, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authToken}`
                    },
                    body: JSON.stringify({ userId, name })
                });
            }
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to save group');
            }
            
            // Show success message
            const successEl = document.getElementById('group-modal-success');
            successEl.textContent = id ? 'Group updated successfully!' : 'Group created successfully!';
            successEl.classList.remove('hidden');
            
            // Hide error if it was showing
            document.getElementById('group-modal-error').classList.add('hidden');
            
            // Reload groups list
            await loadGroupsList();
            
            // Refresh contacts view if it's currently visible
            // This ensures group badges are updated in the contacts list
            if (currentPage === 'contacts') {
                await loadContacts();
            }
            
            // Close modal after a short delay
            setTimeout(() => {
                closeGroupModal();
            }, 1000);
        });
    } catch (error) {
        console.error('Error saving group:', error);
        showModalError('group-modal-error', error.message || 'Failed to save group');
    } finally {
        // Restore button state
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
}

async function deleteGroup(groupId) {
    const group = allGroups.find(g => g.id === groupId);
    if (!group) {
        showToast('Group not found', 'error');
        return;
    }
    
    // Confirmation dialog
    const confirmMessage = group.contactCount > 0 
        ? `Are you sure you want to delete "${escapeHtml(group.name)}"? This will remove ${group.contactCount} contact(s) from this group, but the contacts themselves will be preserved.`
        : `Are you sure you want to delete "${escapeHtml(group.name)}"?`;
    
    if (!confirm(confirmMessage)) {
        return;
    }
    
    // Show loading toast
    const loadingToastId = showToast('Deleting group...', 'loading');
    
    // Use concurrency control
    const operationKey = `delete-group-${groupId}`;
    
    try {
        await executeWithConcurrencyControl(operationKey, async () => {
            const response = await fetchWithRetry(`${API_BASE}/groups-tags/groups/${groupId}?userId=${userId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Failed to delete group' }));
                throw new Error(errorData.error || 'Failed to delete group');
            }
            
            // Hide loading toast
            hideToast(loadingToastId);
            
            // Show success message
            showToast('Group deleted successfully!', 'success');
            
            // Reload groups list
            await loadGroupsList();
            
            // Refresh contacts view if it's currently visible
            // This ensures group badges are removed from contacts
            if (currentPage === 'contacts') {
                await loadContacts();
            }
        });
    } catch (error) {
        console.error('Error deleting group:', error);
        hideToast(loadingToastId);
        showToast(error.message || 'Failed to delete group', 'error');
    }
}

// Group Contact Association Management
let currentGroupId = null;
let groupContacts = [];
let availableContactsForGroup = [];
let selectedContactIds = [];

async function showGroupContacts(groupId) {
    currentGroupId = groupId;
    const group = allGroups.find(g => g.id === groupId);
    
    if (!group) {
        alert('Group not found');
        return;
    }
    
    // Update modal title
    document.getElementById('group-contacts-modal-title').textContent = `${group.name} - Contacts`;
    
    // Show loading state
    const container = document.getElementById('group-contacts-list');
    container.innerHTML = `
        <div class="loading-state">
            <div class="spinner"></div>
            <p>Loading contacts...</p>
        </div>
    `;
    
    // Show modal
    document.getElementById('group-contacts-modal').classList.remove('hidden');
    document.getElementById('group-contacts-modal-error').classList.add('hidden');
    document.getElementById('group-contacts-modal-success').classList.add('hidden');
    
    try {
        const response = await fetch(`${API_BASE}/groups-tags/groups/${groupId}/contacts?userId=${userId}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (response.status === 401) {
            logout();
            return;
        }
        
        if (!response.ok) throw new Error('Failed to load group contacts');
        
        groupContacts = await response.json();
        renderGroupContacts();
    } catch (error) {
        console.error('Error loading group contacts:', error);
        container.innerHTML = `<div class="error">Failed to load contacts</div>`;
    }
}

function renderGroupContacts() {
    const container = document.getElementById('group-contacts-list');
    
    if (groupContacts.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>No contacts in this group</h3>
                <p>Add contacts to get started</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = groupContacts.map(contact => `
        <div class="contact-item">
            <div class="contact-item-info">
                <div class="contact-item-name">${escapeHtml(contact.name)}</div>
                <div class="contact-item-details">
                    ${contact.email ? escapeHtml(contact.email) : ''}
                    ${contact.email && contact.phone ? ' • ' : ''}
                    ${contact.phone ? escapeHtml(contact.phone) : ''}
                </div>
            </div>
            <div class="contact-item-actions">
                <button class="secondary" onclick="removeContactFromGroup('${contact.id}')">Remove</button>
            </div>
        </div>
    `).join('');
}

function closeGroupContactsModal() {
    document.getElementById('group-contacts-modal').classList.add('hidden');
    currentGroupId = null;
    groupContacts = [];
}

function showAddContactsToGroupModalFromView() {
    if (!currentGroupId) return;
    showAddContactsToGroupModal(currentGroupId);
}

async function showAddContactsToGroupModal(groupId) {
    currentGroupId = groupId;
    selectedContactIds = [];
    
    const group = allGroups.find(g => g.id === groupId);
    
    if (!group) {
        alert('Group not found');
        return;
    }
    
    // Update modal title
    document.getElementById('add-contacts-to-group-modal-title').textContent = `Add Contacts to ${group.name}`;
    
    // Show loading state
    const container = document.getElementById('available-contacts-list');
    container.innerHTML = `
        <div class="loading-state">
            <div class="spinner"></div>
            <p>Loading available contacts...</p>
        </div>
    `;
    
    // Show modal
    document.getElementById('add-contacts-to-group-modal').classList.remove('hidden');
    document.getElementById('add-contacts-to-group-modal-error').classList.add('hidden');
    document.getElementById('add-contacts-to-group-modal-success').classList.add('hidden');
    document.getElementById('add-contacts-search').value = '';
    
    try {
        // Load all contacts
        const contactsResponse = await fetch(`${API_BASE}/contacts?userId=${userId}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (contactsResponse.status === 401) {
            logout();
            return;
        }
        
        if (!contactsResponse.ok) throw new Error('Failed to load contacts');
        
        const allContacts = await contactsResponse.json();
        
        // Load current group contacts
        const groupContactsResponse = await fetch(`${API_BASE}/groups-tags/groups/${groupId}/contacts?userId=${userId}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (!groupContactsResponse.ok) throw new Error('Failed to load group contacts');
        
        const currentGroupContacts = await groupContactsResponse.json();
        const currentGroupContactIds = currentGroupContacts.map(c => c.id);
        
        // Filter out contacts already in the group
        availableContactsForGroup = allContacts.filter(c => !currentGroupContactIds.includes(c.id));
        
        renderAvailableContacts();
    } catch (error) {
        console.error('Error loading available contacts:', error);
        container.innerHTML = `<div class="error">Failed to load contacts</div>`;
    }
}

function renderAvailableContacts() {
    const container = document.getElementById('available-contacts-list');
    const searchQuery = document.getElementById('add-contacts-search').value.toLowerCase();
    
    // Filter contacts based on search
    const filteredContacts = availableContactsForGroup.filter(contact => {
        if (!searchQuery) return true;
        return contact.name.toLowerCase().includes(searchQuery) ||
               (contact.email && contact.email.toLowerCase().includes(searchQuery)) ||
               (contact.phone && contact.phone.includes(searchQuery));
    });
    
    if (filteredContacts.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>No available contacts</h3>
                <p>${searchQuery ? 'Try a different search' : 'All contacts are already in this group'}</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = filteredContacts.map(contact => `
        <div class="contact-selection-item" onclick="toggleContactSelection('${contact.id}', event)">
            <input type="checkbox" 
                   id="contact-checkbox-${contact.id}" 
                   ${selectedContactIds.includes(contact.id) ? 'checked' : ''}
                   onclick="event.stopPropagation(); toggleContactSelection('${contact.id}', event)">
            <div class="contact-selection-info">
                <div class="contact-selection-name">${escapeHtml(contact.name)}</div>
                <div class="contact-selection-details">
                    ${contact.email ? escapeHtml(contact.email) : ''}
                    ${contact.email && contact.phone ? ' • ' : ''}
                    ${contact.phone ? escapeHtml(contact.phone) : ''}
                </div>
            </div>
        </div>
    `).join('');
}

function filterAvailableContacts() {
    renderAvailableContacts();
}

function toggleContactSelection(contactId, event) {
    if (event) {
        event.stopPropagation();
    }
    
    const checkbox = document.getElementById(`contact-checkbox-${contactId}`);
    
    if (selectedContactIds.includes(contactId)) {
        selectedContactIds = selectedContactIds.filter(id => id !== contactId);
        if (checkbox) checkbox.checked = false;
    } else {
        selectedContactIds.push(contactId);
        if (checkbox) checkbox.checked = true;
    }
}

function closeAddContactsToGroupModal() {
    document.getElementById('add-contacts-to-group-modal').classList.add('hidden');
    selectedContactIds = [];
    availableContactsForGroup = [];
}

async function addSelectedContactsToGroup() {
    if (selectedContactIds.length === 0) {
        showModalError('add-contacts-to-group-modal-error', 'Please select at least one contact');
        return;
    }
    
    if (!currentGroupId) {
        showModalError('add-contacts-to-group-modal-error', 'Group not found');
        return;
    }
    
    const addBtn = document.getElementById('add-contacts-btn');
    const originalText = addBtn.textContent;
    
    try {
        // Show loading state
        addBtn.disabled = true;
        addBtn.innerHTML = '<span class="loading-spinner"></span> Adding...';
        
        const response = await fetch(`${API_BASE}/groups-tags/groups/${currentGroupId}/contacts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                userId: userId,
                contactIds: selectedContactIds
            })
        });
        
        if (response.status === 401) {
            logout();
            return;
        }
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to add contacts to group');
        }
        
        // Show success message
        const successEl = document.getElementById('add-contacts-to-group-modal-success');
        successEl.textContent = `Successfully added ${selectedContactIds.length} contact(s) to group!`;
        successEl.classList.remove('hidden');
        
        // Hide error if it was showing
        document.getElementById('add-contacts-to-group-modal-error').classList.add('hidden');
        
        // Reload groups list to update counts
        await loadGroupsList();
        
        // Refresh contacts view if it's currently visible
        // This ensures group badges are updated in the contacts list
        if (currentPage === 'contacts') {
            await loadContacts();
        }
        
        // If group contacts modal is open, refresh it
        if (!document.getElementById('group-contacts-modal').classList.contains('hidden')) {
            await showGroupContacts(currentGroupId);
        }
        
        // Close modal after a short delay
        setTimeout(() => {
            closeAddContactsToGroupModal();
        }, 1000);
        
    } catch (error) {
        console.error('Error adding contacts to group:', error);
        showModalError('add-contacts-to-group-modal-error', error.message || 'Failed to add contacts to group');
    } finally {
        // Restore button state
        addBtn.disabled = false;
        addBtn.textContent = originalText;
    }
}

async function addContactsToGroup(groupId, contactIds) {
    // This is a programmatic version that can be called from other functions
    try {
        const response = await fetch(`${API_BASE}/groups-tags/groups/${groupId}/contacts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                userId: userId,
                contactIds: contactIds
            })
        });
        
        if (response.status === 401) {
            logout();
            return;
        }
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to add contacts to group');
        }
        
        // Reload groups list to update counts
        await loadGroupsList();
        
    } catch (error) {
        console.error('Error adding contacts to group:', error);
        throw error;
    }
}

async function removeContactFromGroup(contactId) {
    if (!currentGroupId) {
        showModalError('group-contacts-modal-error', 'Group not found');
        return;
    }
    
    const contact = groupContacts.find(c => c.id === contactId);
    if (!contact) {
        showModalError('group-contacts-modal-error', 'Contact not found');
        return;
    }
    
    // Confirmation dialog
    if (!confirm(`Are you sure you want to remove ${escapeHtml(contact.name)} from this group?`)) {
        return;
    }
    
    // Show loading state in the contact list
    const loadingToastId = showToast('Removing contact...', 'loading');
    
    // Use concurrency control
    const operationKey = `remove-contact-from-group-${currentGroupId}-${contactId}`;
    
    try {
        await executeWithConcurrencyControl(operationKey, async () => {
            const response = await fetchWithRetry(`${API_BASE}/groups-tags/groups/${currentGroupId}/contacts/${contactId}?userId=${userId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Failed to remove contact from group' }));
                throw new Error(errorData.error || 'Failed to remove contact from group');
            }
            
            // Hide loading toast
            hideToast(loadingToastId);
            
            // Show success message
            const successEl = document.getElementById('group-contacts-modal-success');
            successEl.textContent = 'Contact removed successfully!';
            successEl.classList.remove('hidden');
            
            // Hide error if it was showing
            document.getElementById('group-contacts-modal-error').classList.add('hidden');
            
            // Reload groups list to update counts
            await loadGroupsList();
            
            // Refresh contacts view if it's currently visible
            // This ensures group badges are updated in the contacts list
            if (currentPage === 'contacts') {
                await loadContacts();
            }
            
            // Refresh the contacts list
            await showGroupContacts(currentGroupId);
            
            // Hide success message after 3 seconds
            setTimeout(() => {
                successEl.classList.add('hidden');
            }, 3000);
        });
    } catch (error) {
        console.error('Error removing contact from group:', error);
        hideToast(loadingToastId);
        showModalError('group-contacts-modal-error', error.message || 'Failed to remove contact from group');
    }
}

// Tag Management Modal Functions
function showCreateTagModal() {
    document.getElementById('tag-modal-title').textContent = 'Create Tag';
    document.getElementById('tag-form').reset();
    document.getElementById('tag-id').value = '';
    document.getElementById('tag-modal-error').classList.add('hidden');
    document.getElementById('tag-modal-success').classList.add('hidden');
    document.getElementById('tag-modal').classList.remove('hidden');
}

function showEditTagModal(tagId) {
    const tag = allTags.find(t => t.id === tagId);
    if (!tag) {
        alert('Tag not found');
        return;
    }
    
    document.getElementById('tag-modal-title').textContent = 'Edit Tag';
    document.getElementById('tag-id').value = tag.id;
    document.getElementById('tag-text').value = tag.text;
    document.getElementById('tag-modal-error').classList.add('hidden');
    document.getElementById('tag-modal-success').classList.add('hidden');
    document.getElementById('tag-modal').classList.remove('hidden');
}

function closeTagModal() {
    document.getElementById('tag-modal').classList.add('hidden');
    document.getElementById('tag-modal-error').classList.add('hidden');
    document.getElementById('tag-modal-success').classList.add('hidden');
}

async function saveTag(event) {
    event.preventDefault();
    
    const id = document.getElementById('tag-id').value;
    const rawText = document.getElementById('tag-text').value;
    const text = sanitizeInput(rawText);
    
    // Validation: Check if text is empty
    if (!text) {
        showModalError('tag-modal-error', 'Tag text is required');
        return;
    }
    
    // Validation: Check word count (1-3 words)
    const wordCount = text.split(/\s+/).filter(word => word.length > 0).length;
    if (wordCount > 3) {
        showModalError('tag-modal-error', 'Tag must be 1-3 words');
        return;
    }
    
    // Validation: Check text length
    if (text.length > 100) {
        showModalError('tag-modal-error', 'Tag text must be 100 characters or less');
        return;
    }
    
    const submitBtn = document.getElementById('tag-submit-btn');
    const originalText = submitBtn.textContent;
    
    // Use concurrency control to prevent duplicate submissions
    const operationKey = `save-tag-${id || 'new'}`;
    
    try {
        await executeWithConcurrencyControl(operationKey, async () => {
            // Show loading state
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="loading-spinner"></span> Saving...';
            
            let response;
            
            if (id) {
                // Update existing tag
                response = await fetchWithRetry(`${API_BASE}/groups-tags/tags/${id}`, {
                    method: 'PUT',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authToken}`
                    },
                    body: JSON.stringify({ text })
                });
            } else {
                // Create new tag
                response = await fetchWithRetry(`${API_BASE}/groups-tags/tags`, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authToken}`
                    },
                    body: JSON.stringify({ text, source: 'manual' })
                });
            }
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to save tag');
            }
            
            // Show success message
            const successEl = document.getElementById('tag-modal-success');
            successEl.textContent = id ? 'Tag updated successfully!' : 'Tag created successfully!';
            successEl.classList.remove('hidden');
            
            // Hide error if it was showing
            document.getElementById('tag-modal-error').classList.add('hidden');
            
            // Reload tags list
            await loadTagsList();
            
            // Refresh contacts view if it's currently visible
            // This ensures tag badges are updated in the contacts list
            if (currentPage === 'contacts') {
                await loadContacts();
            }
            
            // Close modal after a short delay
            setTimeout(() => {
                closeTagModal();
            }, 1000);
        });
    } catch (error) {
        console.error('Error saving tag:', error);
        showModalError('tag-modal-error', error.message || 'Failed to save tag');
    } finally {
        // Restore button state
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
}

async function deleteTag(tagId) {
    const tag = allTags.find(t => t.id === tagId);
    if (!tag) {
        showToast('Tag not found', 'error');
        return;
    }
    
    // Confirmation dialog
    const confirmMessage = tag.contactCount > 0 
        ? `Are you sure you want to delete "${escapeHtml(tag.text)}"? This will remove the tag from ${tag.contactCount} contact(s), but the contacts themselves will be preserved.`
        : `Are you sure you want to delete "${escapeHtml(tag.text)}"?`;
    
    if (!confirm(confirmMessage)) {
        return;
    }
    
    // Show loading toast
    const loadingToastId = showToast('Deleting tag...', 'loading');
    
    // Use concurrency control
    const operationKey = `delete-tag-${tagId}`;
    
    try {
        await executeWithConcurrencyControl(operationKey, async () => {
            const response = await fetchWithRetry(`${API_BASE}/groups-tags/tags/${tagId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Failed to delete tag' }));
                throw new Error(errorData.error || 'Failed to delete tag');
            }
            
            // Hide loading toast
            hideToast(loadingToastId);
            
            // Show success message
            showToast('Tag deleted successfully!', 'success');
            
            // Reload tags list
            await loadTagsList();
            
            // Refresh contacts view if it's currently visible
            // This ensures tag badges are removed from contacts
            if (currentPage === 'contacts') {
                await loadContacts();
            }
        });
    } catch (error) {
        console.error('Error deleting tag:', error);
        hideToast(loadingToastId);
        showToast(error.message || 'Failed to delete tag', 'error');
    }
}

// Tag Contact Association Management
let currentTagId = null;
let tagContacts = [];
let availableContactsForTag = [];
let selectedContactIdsForTag = [];

async function showTagContacts(tagId) {
    currentTagId = tagId;
    const tag = allTags.find(t => t.id === tagId);
    
    if (!tag) {
        alert('Tag not found');
        return;
    }
    
    // Update modal title
    document.getElementById('tag-contacts-modal-title').textContent = `${tag.text} - Contacts`;
    
    // Show loading state
    const container = document.getElementById('tag-contacts-list');
    container.innerHTML = `
        <div class="loading-state">
            <div class="spinner"></div>
            <p>Loading contacts...</p>
        </div>
    `;
    
    // Show modal
    document.getElementById('tag-contacts-modal').classList.remove('hidden');
    document.getElementById('tag-contacts-modal-error').classList.add('hidden');
    document.getElementById('tag-contacts-modal-success').classList.add('hidden');
    
    try {
        const response = await fetch(`${API_BASE}/groups-tags/tags/${tagId}/contacts`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (response.status === 401) {
            logout();
            return;
        }
        
        if (!response.ok) throw new Error('Failed to load tag contacts');
        
        tagContacts = await response.json();
        renderTagContacts();
    } catch (error) {
        console.error('Error loading tag contacts:', error);
        container.innerHTML = `<div class="error">Failed to load contacts</div>`;
    }
}

function renderTagContacts() {
    const container = document.getElementById('tag-contacts-list');
    
    if (tagContacts.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>No contacts with this tag</h3>
                <p>Add contacts to get started</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = tagContacts.map(contact => `
        <div class="contact-item">
            <div class="contact-item-info">
                <div class="contact-item-name">${escapeHtml(contact.name)}</div>
                <div class="contact-item-details">
                    ${contact.email ? escapeHtml(contact.email) : ''}
                    ${contact.email && contact.phone ? ' • ' : ''}
                    ${contact.phone ? escapeHtml(contact.phone) : ''}
                </div>
            </div>
            <div class="contact-item-actions">
                <button class="secondary" onclick="removeContactFromTag('${contact.id}')">Remove</button>
            </div>
        </div>
    `).join('');
}

function closeTagContactsModal() {
    document.getElementById('tag-contacts-modal').classList.add('hidden');
    currentTagId = null;
    tagContacts = [];
}

function showAddContactsToTagModalFromView() {
    if (!currentTagId) return;
    showAddContactsToTagModal(currentTagId);
}

async function showAddContactsToTagModal(tagId) {
    currentTagId = tagId;
    selectedContactIdsForTag = [];
    
    const tag = allTags.find(t => t.id === tagId);
    
    if (!tag) {
        alert('Tag not found');
        return;
    }
    
    // Update modal title
    document.getElementById('add-contacts-to-tag-modal-title').textContent = `Add Contacts to ${tag.text}`;
    
    // Show loading state
    const container = document.getElementById('available-contacts-for-tag-list');
    container.innerHTML = `
        <div class="loading-state">
            <div class="spinner"></div>
            <p>Loading available contacts...</p>
        </div>
    `;
    
    // Show modal
    document.getElementById('add-contacts-to-tag-modal').classList.remove('hidden');
    document.getElementById('add-contacts-to-tag-modal-error').classList.add('hidden');
    document.getElementById('add-contacts-to-tag-modal-success').classList.add('hidden');
    document.getElementById('add-contacts-to-tag-search').value = '';
    
    try {
        // Load all contacts
        const contactsResponse = await fetch(`${API_BASE}/contacts?userId=${userId}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (contactsResponse.status === 401) {
            logout();
            return;
        }
        
        if (!contactsResponse.ok) throw new Error('Failed to load contacts');
        
        const allContacts = await contactsResponse.json();
        
        // Load current tag contacts
        const tagContactsResponse = await fetch(`${API_BASE}/groups-tags/tags/${tagId}/contacts`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (!tagContactsResponse.ok) throw new Error('Failed to load tag contacts');
        
        const currentTagContacts = await tagContactsResponse.json();
        const currentTagContactIds = currentTagContacts.map(c => c.id);
        
        // Filter out contacts already tagged
        availableContactsForTag = allContacts.filter(c => !currentTagContactIds.includes(c.id));
        
        renderAvailableContactsForTag();
    } catch (error) {
        console.error('Error loading available contacts:', error);
        container.innerHTML = `<div class="error">Failed to load contacts</div>`;
    }
}

function renderAvailableContactsForTag() {
    const container = document.getElementById('available-contacts-for-tag-list');
    const searchQuery = document.getElementById('add-contacts-to-tag-search').value.toLowerCase();
    
    // Filter contacts based on search
    const filteredContacts = availableContactsForTag.filter(contact => {
        if (!searchQuery) return true;
        return contact.name.toLowerCase().includes(searchQuery) ||
               (contact.email && contact.email.toLowerCase().includes(searchQuery)) ||
               (contact.phone && contact.phone.includes(searchQuery));
    });
    
    if (filteredContacts.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>No available contacts</h3>
                <p>${searchQuery ? 'Try a different search' : 'All contacts already have this tag'}</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = filteredContacts.map(contact => `
        <div class="contact-selection-item" onclick="toggleContactSelectionForTag('${contact.id}', event)">
            <input type="checkbox" 
                   id="contact-checkbox-tag-${contact.id}" 
                   ${selectedContactIdsForTag.includes(contact.id) ? 'checked' : ''}
                   onclick="event.stopPropagation(); toggleContactSelectionForTag('${contact.id}', event)">
            <div class="contact-selection-info">
                <div class="contact-selection-name">${escapeHtml(contact.name)}</div>
                <div class="contact-selection-details">
                    ${contact.email ? escapeHtml(contact.email) : ''}
                    ${contact.email && contact.phone ? ' • ' : ''}
                    ${contact.phone ? escapeHtml(contact.phone) : ''}
                </div>
            </div>
        </div>
    `).join('');
}

function filterAvailableContactsForTag() {
    renderAvailableContactsForTag();
}

function toggleContactSelectionForTag(contactId, event) {
    if (event) {
        event.stopPropagation();
    }
    
    const checkbox = document.getElementById(`contact-checkbox-tag-${contactId}`);
    
    if (selectedContactIdsForTag.includes(contactId)) {
        selectedContactIdsForTag = selectedContactIdsForTag.filter(id => id !== contactId);
        if (checkbox) checkbox.checked = false;
    } else {
        selectedContactIdsForTag.push(contactId);
        if (checkbox) checkbox.checked = true;
    }
}

function closeAddContactsToTagModal() {
    document.getElementById('add-contacts-to-tag-modal').classList.add('hidden');
    selectedContactIdsForTag = [];
    availableContactsForTag = [];
}

async function addSelectedContactsToTag() {
    if (selectedContactIdsForTag.length === 0) {
        showModalError('add-contacts-to-tag-modal-error', 'Please select at least one contact');
        return;
    }
    
    if (!currentTagId) {
        showModalError('add-contacts-to-tag-modal-error', 'Tag not found');
        return;
    }
    
    const addBtn = document.getElementById('add-contacts-to-tag-btn');
    const originalText = addBtn.textContent;
    
    try {
        // Show loading state
        addBtn.disabled = true;
        addBtn.innerHTML = '<span class="loading-spinner"></span> Adding...';
        
        const response = await fetch(`${API_BASE}/groups-tags/tags/${currentTagId}/contacts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                userId: userId,
                contactIds: selectedContactIdsForTag
            })
        });
        
        if (response.status === 401) {
            logout();
            return;
        }
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to add contacts to tag');
        }
        
        // Show success message
        const successEl = document.getElementById('add-contacts-to-tag-modal-success');
        successEl.textContent = `Successfully added ${selectedContactIdsForTag.length} contact(s) to tag!`;
        successEl.classList.remove('hidden');
        
        // Hide error if it was showing
        document.getElementById('add-contacts-to-tag-modal-error').classList.add('hidden');
        
        // Reload tags list to update counts
        await loadTagsList();
        
        // Refresh contacts view if it's currently visible
        // This ensures tag badges are updated in the contacts list
        if (currentPage === 'contacts') {
            await loadContacts();
        }
        
        // If tag contacts modal is open, refresh it
        if (!document.getElementById('tag-contacts-modal').classList.contains('hidden')) {
            await showTagContacts(currentTagId);
        }
        
        // Close modal after a short delay
        setTimeout(() => {
            closeAddContactsToTagModal();
        }, 1000);
        
    } catch (error) {
        console.error('Error adding contacts to tag:', error);
        showModalError('add-contacts-to-tag-modal-error', error.message || 'Failed to add contacts to tag');
    } finally {
        // Restore button state
        addBtn.disabled = false;
        addBtn.textContent = originalText;
    }
}

async function addContactsToTag(tagId, contactIds) {
    // This is a programmatic version that can be called from other functions
    try {
        const response = await fetch(`${API_BASE}/groups-tags/tags/${tagId}/contacts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                userId: userId,
                contactIds: contactIds
            })
        });
        
        if (response.status === 401) {
            logout();
            return;
        }
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to add contacts to tag');
        }
        
        // Reload tags list to update counts
        await loadTagsList();
        
    } catch (error) {
        console.error('Error adding contacts to tag:', error);
        throw error;
    }
}

async function removeContactFromTag(contactId) {
    if (!currentTagId) {
        showModalError('tag-contacts-modal-error', 'Tag not found');
        return;
    }
    
    const contact = tagContacts.find(c => c.id === contactId);
    if (!contact) {
        showModalError('tag-contacts-modal-error', 'Contact not found');
        return;
    }
    
    // Confirmation dialog
    if (!confirm(`Are you sure you want to remove ${escapeHtml(contact.name)} from this tag?`)) {
        return;
    }
    
    // Show loading state
    const loadingToastId = showToast('Removing contact...', 'loading');
    
    // Use concurrency control
    const operationKey = `remove-contact-from-tag-${currentTagId}-${contactId}`;
    
    try {
        await executeWithConcurrencyControl(operationKey, async () => {
            const response = await fetchWithRetry(`${API_BASE}/groups-tags/tags/${currentTagId}/contacts/${contactId}?userId=${userId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Failed to remove contact from tag' }));
                throw new Error(errorData.error || 'Failed to remove contact from tag');
            }
            
            // Hide loading toast
            hideToast(loadingToastId);
            
            // Show success message
            const successEl = document.getElementById('tag-contacts-modal-success');
            successEl.textContent = 'Contact removed successfully!';
            successEl.classList.remove('hidden');
            
            // Hide error if it was showing
            document.getElementById('tag-contacts-modal-error').classList.add('hidden');
            
            // Reload tags list to update counts
            await loadTagsList();
            
            // Refresh contacts view if it's currently visible
            // This ensures tag badges are updated in the contacts list
            if (currentPage === 'contacts') {
                await loadContacts();
            }
            
            // Refresh the contacts list
            await showTagContacts(currentTagId);
            
            // Hide success message after 3 seconds
            setTimeout(() => {
                successEl.classList.add('hidden');
            }, 3000);
        });
    } catch (error) {
        console.error('Error removing contact from tag:', error);
        hideToast(loadingToastId);
        showModalError('tag-contacts-modal-error', error.message || 'Failed to remove contact from tag');
    }
}

// Suggestions Management
let currentSuggestionFilter = 'all';
let allSuggestions = []; // Store all suggestions for filtering

async function loadSuggestions(statusFilter) {
    const container = document.getElementById('suggestions-list');
    
    // If statusFilter is provided, update the current filter
    if (statusFilter !== undefined) {
        currentSuggestionFilter = statusFilter;
    }
    
    // Show loading state
    container.innerHTML = `
        <div class="loading-state">
            <div class="spinner"></div>
            <p>Loading suggestions...</p>
        </div>
    `;
    
    try {
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
    
    // Build filter buttons
    const filterButtonsHtml = `
        <div class="suggestion-filters" style="margin-bottom: 20px; display: flex; gap: 10px; flex-wrap: wrap;">
            <button id="filter-all" class="filter-btn ${currentSuggestionFilter === 'all' ? 'active' : ''}" onclick="filterSuggestions('all')">All</button>
            <button id="filter-pending" class="filter-btn ${currentSuggestionFilter === 'pending' ? 'active' : ''}" onclick="filterSuggestions('pending')">Pending</button>
            <button id="filter-accepted" class="filter-btn ${currentSuggestionFilter === 'accepted' ? 'active' : ''}" onclick="filterSuggestions('accepted')">Accepted</button>
            <button id="filter-dismissed" class="filter-btn ${currentSuggestionFilter === 'dismissed' ? 'active' : ''}" onclick="filterSuggestions('dismissed')">Dismissed</button>
            <button id="filter-snoozed" class="filter-btn ${currentSuggestionFilter === 'snoozed' ? 'active' : ''}" onclick="filterSuggestions('snoozed')">Snoozed</button>
        </div>
    `;
    
    if (suggestionsList.length === 0) {
        const filterText = currentSuggestionFilter === 'all' ? '' : ` with status "${currentSuggestionFilter}"`;
        container.innerHTML = `
            ${filterButtonsHtml}
            <div class="empty-state">
                <h3>No suggestions${filterText}</h3>
                <p>Suggestions will appear here based on your contacts and calendar</p>
            </div>
        `;
        return;
    }
    
    // Sort by priority (higher priority first)
    const sortedSuggestions = [...suggestionsList].sort((a, b) => b.priority - a.priority);
    
    const suggestionsHtml = sortedSuggestions.map(suggestion => {
        const isGroup = suggestion.type === 'group';
        
        // Get contacts for this suggestion
        let suggestionContacts = [];
        if (isGroup && suggestion.contacts && suggestion.contacts.length > 0) {
            suggestionContacts = suggestion.contacts;
        } else if (suggestion.contactId) {
            const contact = contacts.find(c => c.id === suggestion.contactId);
            if (contact) {
                suggestionContacts = [contact];
            }
        }
        
        if (suggestionContacts.length === 0) {
            suggestionContacts = [{ id: 'unknown', name: 'Unknown', groups: [], tags: [] }];
        }
        
        // Status badge styling
        const statusColors = {
            pending: '#f59e0b',
            accepted: '#10b981',
            dismissed: '#6b7280',
            snoozed: '#3b82f6'
        };
        const statusColor = statusColors[suggestion.status] || '#6b7280';
        
        // Build contact names display
        let contactNamesHtml = '';
        if (isGroup) {
            const names = suggestionContacts.map(c => escapeHtml(c.name));
            if (names.length === 2) {
                contactNamesHtml = `${names[0]} and ${names[1]}`;
            } else if (names.length === 3) {
                contactNamesHtml = `${names[0]}, ${names[1]}, and ${names[2]}`;
            } else {
                contactNamesHtml = names.join(', ');
            }
        } else {
            contactNamesHtml = escapeHtml(suggestionContacts[0].name);
        }
        
        // Build avatars display
        let avatarsHtml = '';
        if (isGroup) {
            // Overlapping avatar circles for group
            avatarsHtml = `
                <div class="suggestion-avatars-group">
                    ${suggestionContacts.map((contact, idx) => {
                        const initials = contact.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
                        const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
                        const bgColor = colors[idx % colors.length];
                        return `
                            <div class="suggestion-avatar" 
                                 style="background: ${bgColor}; z-index: ${10 - idx}; margin-left: ${idx > 0 ? '-12px' : '0'};"
                                 data-contact-id="${contact.id}"
                                 title="${escapeHtml(contact.name)}">
                                ${initials}
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        } else {
            // Single avatar for individual
            const initials = suggestionContacts[0].name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
            avatarsHtml = `
                <div class="suggestion-avatar" 
                     style="background: #3b82f6;"
                     data-contact-id="${suggestionContacts[0].id}"
                     title="${escapeHtml(suggestionContacts[0].name)}">
                    ${initials}
                </div>
            `;
        }
        
        // Shared context badge for group suggestions
        let sharedContextBadge = '';
        if (isGroup && suggestion.sharedContext) {
            const context = suggestion.sharedContext;
            let badgeText = '🤝 Shared Context';
            let badgeDetails = [];
            
            if (context.factors.commonGroups && context.factors.commonGroups.length > 0) {
                badgeDetails.push(`${context.factors.commonGroups.length} common group${context.factors.commonGroups.length > 1 ? 's' : ''}`);
            }
            if (context.factors.sharedTags && context.factors.sharedTags.length > 0) {
                badgeDetails.push(`${context.factors.sharedTags.length} shared interest${context.factors.sharedTags.length > 1 ? 's' : ''}`);
            }
            if (context.factors.coMentionedInVoiceNotes > 0) {
                badgeDetails.push(`mentioned together ${context.factors.coMentionedInVoiceNotes} time${context.factors.coMentionedInVoiceNotes > 1 ? 's' : ''}`);
            }
            
            if (badgeDetails.length > 0) {
                badgeText = `🤝 ${badgeDetails.join(', ')}`;
            }
            
            sharedContextBadge = `
                <div class="shared-context-badge" title="Shared context score: ${context.score}">
                    ${badgeText}
                </div>
            `;
        }
        
        // Type badge
        const typeBadge = isGroup ? 
            '<span class="suggestion-type-badge group-badge-type">Group Catchup</span>' : 
            '<span class="suggestion-type-badge individual-badge-type">One-on-One</span>';
        
        // Show different actions based on status
        let actions = '';
        // View Schedule button is always available
        const viewScheduleBtn = `<button class="secondary" onclick="openSchedulePreview('${suggestion.id}')" title="View your calendar for this day">📅 View Schedule</button>`;
        
        if (suggestion.status === 'pending') {
            if (isGroup) {
                actions = `
                    <button onclick="acceptSuggestion('${suggestion.id}')">Accept Group Catchup</button>
                    ${viewScheduleBtn}
                    <button class="secondary" onclick="showGroupModifyMenu('${suggestion.id}', event)">Modify Group ▼</button>
                    <button class="secondary" onclick="dismissSuggestion('${suggestion.id}')">Dismiss</button>
                `;
            } else {
                actions = `
                    <button onclick="acceptSuggestion('${suggestion.id}')">Accept</button>
                    ${viewScheduleBtn}
                    <button class="secondary" onclick="dismissSuggestion('${suggestion.id}')">Dismiss</button>
                    <button class="secondary" onclick="snoozeSuggestion('${suggestion.id}')">Snooze</button>
                `;
            }
        } else {
            actions = `
                ${viewScheduleBtn}
                <span style="color: #6b7280; font-size: 14px; margin-left: 10px;">No other actions available</span>
            `;
        }
        
        // Extract common groups and interests for group suggestions
        let commonInfoHtml = '';
        if (isGroup && suggestion.sharedContext) {
            const context = suggestion.sharedContext;
            
            if (context.factors.commonGroups && context.factors.commonGroups.length > 0) {
                commonInfoHtml += `
                    <div style="margin-top: 12px;">
                        <p style="margin: 0 0 6px 0;"><strong>Common Groups:</strong></p>
                        <div class="contact-groups">
                            ${context.factors.commonGroups.map(name => `<span class="group-badge">${escapeHtml(name)}</span>`).join('')}
                        </div>
                    </div>
                `;
            }
            
            if (context.factors.sharedTags && context.factors.sharedTags.length > 0) {
                commonInfoHtml += `
                    <div style="margin-top: 12px;">
                        <p style="margin: 0 0 6px 0;"><strong>Shared Interests:</strong></p>
                        <div class="contact-tags">
                            ${context.factors.sharedTags.map(tag => `<span class="tag-badge">${escapeHtml(tag)}</span>`).join('')}
                        </div>
                    </div>
                `;
            }
        } else if (!isGroup) {
            // For individual suggestions, show their groups and interests
            const contact = suggestionContacts[0];
            
            if (contact && contact.groups && contact.groups.length > 0) {
                const groupNames = contact.groups
                    .map(groupId => {
                        const group = groups.find(g => g.id === groupId);
                        return group ? group.name : null;
                    })
                    .filter(name => name !== null);
                
                if (groupNames.length > 0) {
                    commonInfoHtml += `
                        <div style="margin-top: 12px;">
                            <p style="margin: 0 0 6px 0;"><strong>Member of:</strong></p>
                            <div class="contact-groups">
                                ${groupNames.map(name => `<span class="group-badge">${escapeHtml(name)}</span>`).join('')}
                            </div>
                        </div>
                    `;
                }
            }
            
            if (contact.tags && contact.tags.length > 0) {
                commonInfoHtml += `
                    <div style="margin-top: 12px;">
                        <p style="margin: 0 0 6px 0;"><strong>Interests:</strong></p>
                        <div class="contact-tags">
                            ${contact.tags.map(tag => `<span class="tag-badge">${escapeHtml(tag.text)}</span>`).join('')}
                        </div>
                    </div>
                `;
            }
        }
        
        return `
            <div class="card suggestion-card ${isGroup ? 'suggestion-card-group' : 'suggestion-card-individual'}">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
                    <div style="display: flex; align-items: center; gap: 12px; flex: 1;">
                        ${avatarsHtml}
                        <div style="flex: 1;">
                            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                                <h3 style="margin: 0;">Connect with ${contactNamesHtml}</h3>
                                ${typeBadge}
                            </div>
                            ${sharedContextBadge}
                        </div>
                    </div>
                    <span style="background: ${statusColor}; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; text-transform: capitalize;">
                        ${suggestion.status}
                    </span>
                </div>
                <p><strong>Time:</strong> ${formatDateTime(suggestion.proposedTimeslot.start)} <span id="calendar-count-${suggestion.id}" class="calendar-day-count"></span></p>
                <p><strong>Reason:</strong> ${escapeHtml(suggestion.reasoning)}</p>
                ${commonInfoHtml}
                ${suggestion.snoozedUntil ? `<p><strong>Snoozed until:</strong> ${formatDateTime(suggestion.snoozedUntil)}</p>` : ''}
                ${suggestion.dismissalReason ? `<p><strong>Dismissal reason:</strong> ${escapeHtml(suggestion.dismissalReason)}</p>` : ''}
                <div class="card-actions">
                    ${actions}
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = filterButtonsHtml + suggestionsHtml;
    
    // Add event listeners for contact tooltips
    addContactTooltipListeners();
    
    // Fetch calendar event counts for each suggestion (async, non-blocking)
    loadCalendarEventCounts(suggestionsList);
}

let currentGroupModifyMenu = null;

function showGroupModifyMenu(suggestionId, event) {
    event.stopPropagation();
    
    // Close existing menu
    if (currentGroupModifyMenu) {
        currentGroupModifyMenu.remove();
        currentGroupModifyMenu = null;
    }
    
    const suggestion = suggestions.find(s => s.id === suggestionId);
    if (!suggestion || !suggestion.contacts || suggestion.contacts.length === 0) {
        return;
    }
    
    // Create menu
    const menu = document.createElement('div');
    menu.className = 'group-modify-menu';
    
    let menuHtml = '<div style="padding: 8px 16px; font-weight: 600; font-size: 12px; color: #6b7280; text-transform: uppercase;">Remove Contact</div>';
    
    suggestion.contacts.forEach(contact => {
        menuHtml += `
            <div class="group-modify-menu-item" onclick="removeContactFromGroup('${suggestionId}', '${contact.id}')">
                <span>❌</span>
                <span>${escapeHtml(contact.name)}</span>
            </div>
        `;
    });
    
    menuHtml += '<div class="group-modify-menu-divider"></div>';
    menuHtml += `
        <div class="group-modify-menu-item danger" onclick="dismissSuggestion('${suggestionId}')">
            <span>🗑️</span>
            <span>Dismiss Entire Group</span>
        </div>
    `;
    
    menu.innerHTML = menuHtml;
    document.body.appendChild(menu);
    
    // Position menu
    const button = event.target;
    const rect = button.getBoundingClientRect();
    menu.style.position = 'fixed';
    menu.style.left = `${rect.left}px`;
    menu.style.top = `${rect.bottom + 5}px`;
    
    currentGroupModifyMenu = menu;
    
    // Close menu when clicking outside
    setTimeout(() => {
        document.addEventListener('click', closeGroupModifyMenu);
    }, 10);
}

function closeGroupModifyMenu() {
    if (currentGroupModifyMenu) {
        currentGroupModifyMenu.remove();
        currentGroupModifyMenu = null;
    }
    document.removeEventListener('click', closeGroupModifyMenu);
}

// Remove contact from group suggestion (Task 16.3)
async function removeContactFromGroup(suggestionId, contactId) {
    closeGroupModifyMenu();
    
    const loadingToastId = showToast('Updating group suggestion...', 'loading');
    
    try {
        const response = await fetch(`${API_BASE}/suggestions/${suggestionId}/remove-contact`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ 
                userId: userId,
                contactId: contactId
            })
        });
        
        if (response.status === 401) {
            logout();
            return;
        }
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to remove contact from group');
        }
        
        const result = await response.json();
        
        hideToast(loadingToastId);
        
        if (result.convertedToIndividual) {
            showToast('Group converted to individual suggestion', 'success');
        } else {
            showToast('Contact removed from group', 'success');
        }
        
        // Reload suggestions
        loadSuggestions();
    } catch (error) {
        console.error('Error removing contact from group:', error);
        hideToast(loadingToastId);
        showToast(error.message || 'Failed to remove contact from group', 'error');
    }
}

async function acceptSuggestion(id) {
    const loadingToastId = showToast('Accepting suggestion...', 'loading');
    
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
        
        hideToast(loadingToastId);
        showToast('Suggestion accepted!', 'success');
        
        // Reload suggestions maintaining current filter
        loadSuggestions();
    } catch (error) {
        console.error('Error accepting suggestion:', error);
        hideToast(loadingToastId);
        showToast('Failed to accept suggestion', 'error');
    }
}

async function dismissSuggestion(id) {
    const reason = prompt('Reason for dismissing (optional):');
    
    const loadingToastId = showToast('Dismissing suggestion...', 'loading');
    
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
        
        hideToast(loadingToastId);
        showToast('Suggestion dismissed!', 'success');
        
        // Reload suggestions maintaining current filter
        loadSuggestions();
    } catch (error) {
        console.error('Error dismissing suggestion:', error);
        hideToast(loadingToastId);
        showToast('Failed to dismiss suggestion', 'error');
    }
}

async function snoozeSuggestion(id) {
    const days = prompt('Snooze for how many days?', '7');
    if (!days) return;
    
    // Convert days to hours (service expects hours)
    const hours = parseInt(days) * 24;
    
    const loadingToastId = showToast('Snoozing suggestion...', 'loading');
    
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
        
        hideToast(loadingToastId);
        showToast(`Suggestion snoozed for ${days} day(s)!`, 'success');
        
        // Reload suggestions maintaining current filter
        loadSuggestions();
    } catch (error) {
        console.error('Error snoozing suggestion:', error);
        hideToast(loadingToastId);
        showToast('Failed to snooze suggestion', 'error');
    }
}

// Add contact tooltip listeners (Task 16.2)
function addContactTooltipListeners() {
    const avatars = document.querySelectorAll('.suggestion-avatar');
    let tooltip = null;
    
    avatars.forEach(avatar => {
        avatar.addEventListener('mouseenter', (e) => {
            const contactId = avatar.dataset.contactId;
            const contact = contacts.find(c => c.id === contactId);
            
            if (!contact) return;
            
            // Create tooltip
            tooltip = document.createElement('div');
            tooltip.className = 'contact-tooltip';
            
            let tooltipContent = `
                <div class="contact-tooltip-name">${escapeHtml(contact.name)}</div>
            `;
            
            if (contact.email) {
                tooltipContent += `<div class="contact-tooltip-detail">📧 ${escapeHtml(contact.email)}</div>`;
            }
            if (contact.phone) {
                tooltipContent += `<div class="contact-tooltip-detail">📱 ${escapeHtml(contact.phone)}</div>`;
            }
            if (contact.location) {
                tooltipContent += `<div class="contact-tooltip-detail">📍 ${escapeHtml(contact.location)}</div>`;
            }
            if (contact.frequencyPreference) {
                tooltipContent += `<div class="contact-tooltip-detail">🔄 ${escapeHtml(contact.frequencyPreference)}</div>`;
            }
            
            tooltip.innerHTML = tooltipContent;
            document.body.appendChild(tooltip);
            
            // Position tooltip
            const rect = avatar.getBoundingClientRect();
            tooltip.style.left = `${rect.left + rect.width / 2}px`;
            tooltip.style.top = `${rect.bottom + 10}px`;
            tooltip.style.transform = 'translateX(-50%)';
            
            // Show tooltip
            setTimeout(() => {
                tooltip.classList.add('show');
            }, 10);
        });
        
        avatar.addEventListener('mouseleave', () => {
            if (tooltip) {
                tooltip.classList.remove('show');
                setTimeout(() => {
                    if (tooltip && tooltip.parentNode) {
                        tooltip.parentNode.removeChild(tooltip);
                    }
                    tooltip = null;
                }, 200);
            }
        });
    });
}

// Show group modify menu (Task 16.3)
// Suggestion action functions have been removed - all functionality relocated

// Calendar Management
async function loadCalendar() {
    const container = document.getElementById('calendar-content');
    
    try {
        const calendarStatus = await checkCalendarConnection();
        
        if (calendarStatus.connected) {
            const emailDisplay = calendarStatus.email 
                ? `<p class="calendar-email">Connected as: <strong>${calendarStatus.email}</strong></p>` 
                : '<p class="calendar-email" style="color: var(--text-secondary);">Connected</p>';
            container.innerHTML = `
                <div class="calendar-connected">
                    <h3>Google Calendar Connected</h3>
                    <p>Your calendar is synced and ready for smart scheduling</p>
                    ${emailDisplay}
                    <button onclick="disconnectCalendar()" class="btn-secondary">Disconnect Calendar</button>
                </div>
            `;
        } else {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>Calendar Integration</h3>
                    <p>Connect your Google Calendar to enable smart scheduling</p>
                    <button onclick="connectCalendar()">Connect Google Calendar</button>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading calendar:', error);
        container.innerHTML = `
            <div class="error-state">
                <h3>Error Loading Calendar</h3>
                <p>Failed to load calendar status. Please try again.</p>
                <button onclick="loadCalendar()">Retry</button>
            </div>
        `;
    }
}

async function connectCalendar() {
    try {
        // Ensure we have userId
        if (!userId) {
            userId = localStorage.getItem('userId');
        }
        
        if (!userId) {
            alert('You must be logged in to connect Google Calendar');
            return;
        }
        
        // Get the authorization URL from the backend
        const response = await fetch(`/api/calendar/oauth/authorize?userId=${userId}`);
        const data = await response.json();
        
        if (!data.authUrl) {
            alert('Failed to get authorization URL');
            return;
        }
        
        // Redirect user to Google OAuth consent screen
        window.location.href = data.authUrl;
    } catch (error) {
        console.error('Error initiating calendar connection:', error);
        alert('Failed to connect calendar. Please try again.');
    }
}

async function handleCalendarOAuthCallback() {
    try {
        // Get authorization code from URL
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        
        if (!code) {
            console.log('No authorization code in URL');
            return;
        }
        
        // Ensure we have a valid auth token
        let token = authToken;
        if (!token) {
            token = localStorage.getItem('authToken');
            console.log('Retrieved authToken from localStorage');
        }
        
        if (!token) {
            console.error('No authentication token available');
            alert('You must be logged in to connect Google Calendar. Please log in and try again.');
            window.location.href = '/';
            return;
        }
        
        console.log('Exchanging authorization code for tokens...');
        // Exchange code for tokens via backend callback endpoint
        const response = await fetch(`/api/calendar/oauth/callback?code=${code}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            console.error('OAuth callback failed:', data);
            throw new Error(data.details || data.error || 'Failed to complete OAuth flow');
        }
        
        console.log('Calendar connected successfully:', data);
        
        // Clear the code from URL
        window.history.replaceState({}, document.title, window.location.pathname);
        
        // Refresh calendar view
        loadCalendar();
        
        // Refresh preferences UI if currently viewing preferences
        if (currentPage === 'preferences') {
            loadPreferences();
        }
        
        alert('Google Calendar connected successfully!');
    } catch (error) {
        console.error('Error handling OAuth callback:', error);
        alert(`Failed to connect calendar: ${error.message}`);
    }
}

async function checkCalendarConnection() {
    try {
        const response = await fetch('/api/calendar/oauth/status', {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to check calendar connection');
        }
        
        const data = await response.json();
        return {
            connected: data.connected,
            email: data.email,
            expiresAt: data.expiresAt
        };
    } catch (error) {
        console.error('Error checking calendar connection:', error);
        return {
            connected: false,
            email: null,
            expiresAt: null
        };
    }
}

async function refreshCalendar() {
    const btn = document.getElementById('refresh-calendar-btn');
    if (!btn) return;
    
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '⏳ Syncing...';
    
    try {
        const response = await fetch(`${API_BASE}/calendar/api/refresh`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to refresh calendar');
        }
        
        const data = await response.json();
        console.log('Calendar refreshed:', data);
        
        // Show success feedback with event count
        btn.innerHTML = `✓ ${data.eventCount} events`;
        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }, 2000);
        
        // Reload preferences to show updated sync time
        setTimeout(() => {
            loadPreferences();
            // Also refresh calendar view if visible
            if (currentPage === 'calendar') {
                loadCalendar();
            }
        }, 1000);
        
    } catch (error) {
        console.error('Error refreshing calendar:', error);
        btn.innerHTML = '✗ Failed';
        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }, 2000);
        alert(`Failed to refresh calendar: ${error.message}`);
    }
}

async function disconnectCalendar() {
    if (!confirm('Are you sure you want to disconnect Google Calendar?')) {
        return;
    }
    
    try {
        // Ensure we have a valid auth token
        let token = authToken;
        if (!token) {
            token = localStorage.getItem('authToken');
            console.log('Retrieved authToken from localStorage');
        }
        
        if (!token) {
            console.error('No authentication token available');
            alert('You must be logged in to disconnect Google Calendar.');
            return;
        }
        
        console.log('Disconnecting Google Calendar...');
        const response = await fetch('/api/calendar/oauth/disconnect', {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            console.error('Disconnect failed:', data);
            throw new Error(data.details || data.error || 'Failed to disconnect calendar');
        }
        
        console.log('Calendar disconnected successfully');
        loadCalendar();
        
        // Refresh preferences UI if currently viewing preferences
        if (currentPage === 'preferences') {
            loadPreferences();
        }
        
        alert('Google Calendar disconnected successfully!');
    } catch (error) {
        console.error('Error disconnecting calendar:', error);
        alert(`Failed to disconnect calendar: ${error.message}`);
    }
}

async function getCalendarEvents(startTime, endTime) {
    try {
        const response = await fetch(
            `/api/calendar/api/events?startTime=${startTime}&endTime=${endTime}`,
            {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            }
        );
        
        if (!response.ok) {
            throw new Error('Failed to fetch calendar events');
        }
        
        const data = await response.json();
        return data.events || [];
    } catch (error) {
        console.error('Error fetching calendar events:', error);
        return [];
    }
}

async function getAvailableSlots(startTime, endTime, slotDurationMinutes = 30) {
    try {
        const response = await fetch(
            `/api/calendar/api/available-slots?startTime=${startTime}&endTime=${endTime}&slotDurationMinutes=${slotDurationMinutes}`,
            {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            }
        );
        
        if (!response.ok) {
            throw new Error('Failed to fetch available slots');
        }
        
        const data = await response.json();
        return data.slots || [];
    } catch (error) {
        console.error('Error fetching available slots:', error);
        return [];
    }
}

// Voice Notes
function loadVoiceNotes() {
    // Setup tab switching
    setupVoiceNoteTabs();
    
    // Initialize voice notes recorder if available
    if (typeof window.initVoiceNotesPage === 'function') {
        window.initVoiceNotesPage();
    } else {
        // Fallback if voice-notes.js hasn't loaded yet
        const container = document.getElementById('voice-content');
        container.innerHTML = `
            <div class="loading-state">
                <div class="spinner"></div>
                <p>Loading voice notes...</p>
            </div>
        `;
        
        // Try again after a short delay
        setTimeout(() => {
            if (typeof window.initVoiceNotesPage === 'function') {
                window.initVoiceNotesPage();
            } else {
                container.innerHTML = `
                    <div class="error-state">
                        <h3>Failed to Load Voice Notes</h3>
                        <p>Please refresh the page to try again.</p>
                        <button onclick="location.reload()" class="retry-btn">Refresh Page</button>
                    </div>
                `;
            }
        }, 1000);
    }
}

function setupVoiceNoteTabs() {
    const tabs = document.querySelectorAll('.voice-tab');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;
            switchVoiceNoteTab(tabName);
        });
    });
}

function switchVoiceNoteTab(tabName) {
    // Update active tab button
    document.querySelectorAll('.voice-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabName);
    });
    
    // Show/hide tab content
    const recordTab = document.getElementById('voice-record-tab');
    const historyTab = document.getElementById('voice-history-tab');
    
    if (tabName === 'record') {
        recordTab.classList.remove('hidden');
        historyTab.classList.add('hidden');
    } else if (tabName === 'history') {
        recordTab.classList.add('hidden');
        historyTab.classList.remove('hidden');
        
        // Initialize history view if not already done
        if (typeof window.initVoiceNotesHistoryPage === 'function') {
            window.initVoiceNotesHistoryPage();
        }
    }
}

// Preferences
async function loadPreferences() {
    const container = document.getElementById('preferences-content');
    
    // Load calendar connection status
    let calendarStatus = { connected: false, email: null, expiresAt: null };
    try {
        calendarStatus = await checkCalendarConnection();
    } catch (error) {
        console.error('Error checking calendar connection:', error);
    }
    
    const calendarConnected = calendarStatus.connected;
    
    // Load calendar sync status
    let lastSync = null;
    if (calendarConnected) {
        try {
            const syncResponse = await fetch(`${API_BASE}/calendar/api/sync-status`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            if (syncResponse.ok) {
                const syncData = await syncResponse.json();
                lastSync = syncData.lastSync;
            }
        } catch (error) {
            console.error('Error loading sync status:', error);
        }
    }
    
    // Load Google Contacts connection status
    let googleContactsStatus = { connected: false };
    try {
        googleContactsStatus = await loadGoogleContactsStatus();
    } catch (error) {
        console.error('Error loading Google Contacts status:', error);
    }
    
    // Load test data status
    let testDataStatus = null;
    try {
        const response = await fetch(`${API_BASE}/test-data/status`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (response.ok) {
            testDataStatus = await response.json();
        } else {
            console.error('Test data status request failed:', response.status, response.statusText);
        }
    } catch (error) {
        console.error('Error loading test data status:', error);
    }
    
    container.innerHTML = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-top: 20px;">
            <!-- Notifications Section -->
            <div>
                <h3 style="margin-bottom: 20px; border-bottom: 2px solid var(--border-primary); padding-bottom: 10px;">Notifications</h3>
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
            </div>
            
            <!-- Integrations Section -->
            <div>
                <h3 style="margin-bottom: 20px; border-bottom: 2px solid var(--border-primary); padding-bottom: 10px;">Integrations</h3>
                
                <!-- Google Calendar -->
                <div class="card" style="margin-bottom: 15px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <img src="https://www.gstatic.com/marketing-cms/assets/images/d3/d1/e8596a9246608f8fbd72597729c8/calendar.png" alt="Google Calendar" style="width: 24px; height: 24px;">
                            <h4 style="margin: 0;">Google Calendar</h4>
                        </div>
                        <span style="font-size: 12px; padding: 4px 8px; border-radius: 4px; ${calendarConnected ? 'background: var(--status-success-bg); color: var(--status-success-text);' : 'background: var(--status-error-bg); color: var(--status-error-text);'}">
                            ${calendarConnected ? 'Connected' : 'Not Connected'}
                        </span>
                    </div>
                    <p style="margin: 0 0 12px 0; font-size: 13px; color: var(--text-secondary);">
                        Connect your Google Calendar to enable smart scheduling and availability detection.
                    </p>
                    ${calendarConnected ? `
                        ${calendarStatus.email ? `<p style="margin: 0 0 8px 0; font-size: 12px; padding: 8px; background: rgba(34, 197, 94, 0.1); border-radius: 4px;">Connected as: <strong>${calendarStatus.email}</strong></p>` : ''}
                        <div style="margin: 0 0 12px 0; font-size: 12px; padding: 8px; background: var(--bg-secondary); border-radius: 4px; display: flex; justify-content: space-between; align-items: center;">
                            <span style="color: var(--text-secondary);">
                                ${lastSync 
                                    ? `Last synced: <strong style="color: var(--text-primary);">${formatRelativeTime(new Date(lastSync))}</strong>`
                                    : `<strong style="color: var(--text-tertiary);">Not synced yet</strong>`
                                }
                            </span>
                            <button onclick="refreshCalendar()" id="refresh-calendar-btn" class="secondary" style="padding: 4px 12px; font-size: 11px; min-width: auto;">
                                🔄 ${lastSync ? 'Refresh' : 'Sync Now'}
                            </button>
                        </div>
                        <button onclick="disconnectCalendar()" class="secondary" style="width: 100%;">Disconnect</button>
                    ` : `
                        <button onclick="connectCalendar()" style="width: 100%;">Connect Calendar</button>
                    `}
                </div>
                
                <!-- Google Contacts -->
                <div id="google-contacts-card">
                    <!-- Will be populated by loadGoogleContactsStatus() -->
                </div>
            </div>
        </div>
        
        <!-- Account Section -->
        <div style="margin-top: 30px;">
            <h3 style="margin-bottom: 20px; border-bottom: 2px solid var(--border-primary); padding-bottom: 10px;">Account</h3>
            
            <div class="card">
                <div id="account-info-loading" style="text-align: center; padding: 20px;">
                    <div class="loading-spinner" style="margin: 0 auto 10px;"></div>
                    <p style="color: var(--text-secondary); font-size: 14px;">Loading account information...</p>
                </div>
                <div id="account-info-content" style="display: none;">
                    <!-- Account info will be populated here -->
                </div>
            </div>
        </div>
        
        <!-- Developer Section -->
        ${testDataStatus ? `
        <div style="margin-top: 30px;">
            <h3 style="margin-bottom: 20px; border-bottom: 2px solid var(--border-primary); padding-bottom: 10px;">Developer</h3>
            
            <!-- Test Data Management -->
            <div style="margin-bottom: 20px;">
                <h4 style="margin-bottom: 15px; font-size: 14px; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px;">Test Data</h4>
                
                <!-- Status Overview -->
                <div class="card" style="margin-bottom: 15px; background: var(--bg-secondary);">
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px;">
                        <div style="padding: 10px; background: var(--bg-primary); border-radius: 4px;" data-test-data-type="contacts">
                            <div style="font-size: 11px; color: var(--text-secondary); margin-bottom: 5px; font-weight: 600;">CONTACTS</div>
                            <div style="font-size: 13px; font-weight: bold;" data-test-data-counts>
                                <span style="color: var(--status-info-text);">${testDataStatus.contacts.test}</span> / <span style="color: var(--text-secondary);">${testDataStatus.contacts.real}</span>
                            </div>
                        </div>
                        <div style="padding: 10px; background: var(--bg-primary); border-radius: 4px;" data-test-data-type="calendarEvents">
                            <div style="font-size: 11px; color: var(--text-secondary); margin-bottom: 5px; font-weight: 600;">CALENDAR</div>
                            <div style="font-size: 13px; font-weight: bold;" data-test-data-counts>
                                <span style="color: var(--status-info-text);">${testDataStatus.calendarEvents.test}</span> / <span style="color: var(--text-secondary);">${testDataStatus.calendarEvents.real}</span>
                            </div>
                        </div>
                        <div style="padding: 10px; background: var(--bg-primary); border-radius: 4px;" data-test-data-type="suggestions">
                            <div style="font-size: 11px; color: var(--text-secondary); margin-bottom: 5px; font-weight: 600;">SUGGESTIONS</div>
                            <div style="font-size: 13px; font-weight: bold;" data-test-data-counts>
                                <span style="color: var(--status-info-text);">${testDataStatus.suggestions.test}</span> / <span style="color: var(--text-secondary);">${testDataStatus.suggestions.real}</span>
                            </div>
                        </div>
                        <div style="padding: 10px; background: var(--bg-primary); border-radius: 4px;" data-test-data-type="groupSuggestions">
                            <div style="font-size: 11px; color: var(--text-secondary); margin-bottom: 5px; font-weight: 600;">GROUP SUGG.</div>
                            <div style="font-size: 13px; font-weight: bold;" data-test-data-counts>
                                <span style="color: var(--status-info-text);">${testDataStatus.groupSuggestions.test}</span> / <span style="color: var(--text-secondary);">${testDataStatus.groupSuggestions.real}</span>
                            </div>
                        </div>
                        <div style="padding: 10px; background: var(--bg-primary); border-radius: 4px;" data-test-data-type="voiceNotes">
                            <div style="font-size: 11px; color: var(--text-secondary); margin-bottom: 5px; font-weight: 600;">VOICE NOTES</div>
                            <div style="font-size: 13px; font-weight: bold;" data-test-data-counts>
                                <span style="color: var(--status-info-text);">${testDataStatus.voiceNotes.test}</span> / <span style="color: var(--text-secondary);">${testDataStatus.voiceNotes.real}</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Individual Controls -->
                <div class="card">
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px;">
                        <div style="padding: 10px; border: 1px solid var(--border-primary); border-radius: 4px;">
                            <div style="font-size: 12px; font-weight: bold; margin-bottom: 8px;">Contacts</div>
                            <button onclick="generateTestData('contacts')" style="width: 100%; margin-bottom: 6px; padding: 6px; font-size: 12px;">Generate</button>
                            <button onclick="removeTestData('contacts')" class="secondary" style="width: 100%; padding: 6px; font-size: 12px;">Remove</button>
                        </div>
                        <div style="padding: 10px; border: 1px solid var(--border-primary); border-radius: 4px;">
                            <div style="font-size: 12px; font-weight: bold; margin-bottom: 8px;">Calendar Events</div>
                            <button onclick="generateTestData('calendarEvents')" style="width: 100%; margin-bottom: 6px; padding: 6px; font-size: 12px;">Generate</button>
                            <button onclick="removeTestData('calendarEvents')" class="secondary" style="width: 100%; padding: 6px; font-size: 12px;">Remove</button>
                        </div>
                        <div style="padding: 10px; border: 1px solid var(--border-primary); border-radius: 4px;">
                            <div style="font-size: 12px; font-weight: bold; margin-bottom: 8px;">Suggestions</div>
                            <button onclick="generateTestData('suggestions')" style="width: 100%; margin-bottom: 6px; padding: 6px; font-size: 12px;">Generate</button>
                            <button onclick="removeTestData('suggestions')" class="secondary" style="width: 100%; padding: 6px; font-size: 12px;">Remove</button>
                        </div>
                        <div style="padding: 10px; border: 1px solid var(--border-primary); border-radius: 4px;">
                            <div style="font-size: 12px; font-weight: bold; margin-bottom: 8px;">Group Suggestions</div>
                            <button onclick="generateTestData('groupSuggestions')" style="width: 100%; margin-bottom: 6px; padding: 6px; font-size: 12px;">Generate</button>
                            <button onclick="removeTestData('groupSuggestions')" class="secondary" style="width: 100%; padding: 6px; font-size: 12px;">Remove</button>
                        </div>
                        <div style="padding: 10px; border: 1px solid var(--border-primary); border-radius: 4px;">
                            <div style="font-size: 12px; font-weight: bold; margin-bottom: 8px;">Voice Notes</div>
                            <button onclick="generateTestData('voiceNotes')" style="width: 100%; margin-bottom: 6px; padding: 6px; font-size: 12px;">Generate</button>
                            <button onclick="removeTestData('voiceNotes')" class="secondary" style="width: 100%; padding: 6px; font-size: 12px;">Remove</button>
                        </div>
                    </div>
                </div>
            </div>

        </div>
        ` : ''}
    `;
    
    // Add Account section after the main template
    const accountSection = document.createElement('div');
    accountSection.style.marginTop = '30px';
    accountSection.innerHTML = `
        <h4 style="margin-bottom: 15px; font-size: 14px; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px;">Account</h4>
        
        ${testDataStatus ? `
        <!-- User Data Overview -->
        <div style="margin-bottom: 15px; padding: 15px; border: 1px solid var(--border-primary); border-radius: 6px; background: var(--bg-secondary);">
            <div style="margin-bottom: 12px;">
                <div style="font-weight: bold; margin-bottom: 8px; color: var(--text-primary);">User Data</div>
                <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 10px;">
                    <span style="color: var(--status-info-text); font-weight: 600;">Blue</span> = Test data | 
                    <span style="color: var(--text-secondary); font-weight: 600;">Grey</span> = Your data
                </div>
            </div>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 10px; margin-bottom: 12px;">
                <div style="padding: 8px; background: var(--bg-primary); border-radius: 4px;">
                    <div style="font-size: 10px; color: var(--text-secondary); margin-bottom: 4px; font-weight: 600;">CONTACTS</div>
                    <div style="font-size: 12px; font-weight: bold;">
                        <span style="color: var(--status-info-text);">${testDataStatus.contacts.test}</span> / <span style="color: var(--text-secondary);">${testDataStatus.contacts.real}</span>
                    </div>
                </div>
                <div style="padding: 8px; background: var(--bg-primary); border-radius: 4px;">
                    <div style="font-size: 10px; color: var(--text-secondary); margin-bottom: 4px; font-weight: 600;">CALENDAR</div>
                    <div style="font-size: 12px; font-weight: bold;">
                        <span style="color: var(--status-info-text);">${testDataStatus.calendarEvents.test}</span> / <span style="color: var(--text-secondary);">${testDataStatus.calendarEvents.real}</span>
                    </div>
                </div>
                <div style="padding: 8px; background: var(--bg-primary); border-radius: 4px;">
                    <div style="font-size: 10px; color: var(--text-secondary); margin-bottom: 4px; font-weight: 600;">SUGGESTIONS</div>
                    <div style="font-size: 12px; font-weight: bold;">
                        <span style="color: var(--status-info-text);">${testDataStatus.suggestions.test}</span> / <span style="color: var(--text-secondary);">${testDataStatus.suggestions.real}</span>
                    </div>
                </div>
                <div style="padding: 8px; background: var(--bg-primary); border-radius: 4px;">
                    <div style="font-size: 10px; color: var(--text-secondary); margin-bottom: 4px; font-weight: 600;">VOICE NOTES</div>
                    <div style="font-size: 12px; font-weight: bold;">
                        <span style="color: var(--status-info-text);">${testDataStatus.voiceNotes.test}</span> / <span style="color: var(--text-secondary);">${testDataStatus.voiceNotes.real}</span>
                    </div>
                </div>
            </div>
            <div style="display: flex; gap: 10px;">
                <button onclick="bulkAddTestData()" style="flex: 1; padding: 10px 20px; background: var(--status-success-text); color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">Generate Test Data</button>
                <button onclick="clearAllTestData()" style="flex: 1; padding: 10px 20px; background: var(--status-info-text); color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">Clear Test Data</button>
            </div>
        </div>
        ` : ''}
        
        <!-- Clear All User Data -->
        <div class="card" style="border: 2px solid var(--status-error-text); background: rgba(239, 68, 68, 0.05);">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 15px;">
                <div>
                    <div style="font-weight: bold; margin-bottom: 5px; color: var(--status-error-text);">Clear All Data</div>
                    <div style="font-size: 12px; color: var(--text-secondary);">Permanently delete all your data including user-added and test contacts, events, suggestions, and voice notes</div>
                </div>
                <button onclick="deleteAllUserData()" style="background: var(--status-error-text); color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; white-space: nowrap; font-weight: bold;">Clear All</button>
            </div>
        </div>
    `;
    container.appendChild(accountSection);
    
    // Render Google Contacts card
    const googleContactsCard = document.getElementById('google-contacts-card');
    if (googleContactsCard && typeof renderGoogleContactsCard === 'function') {
        googleContactsCard.innerHTML = renderGoogleContactsCard(googleContactsStatus);
    }
    
    // Group mappings moved to Groups & Tags page
    
    // Load account information
    loadAccountInfo();
}

function savePreferences() {
    alert('Preferences saved!');
}

/**
 * Load and display account information
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 */
async function loadAccountInfo() {
    const loadingDiv = document.getElementById('account-info-loading');
    const contentDiv = document.getElementById('account-info-content');
    
    if (!loadingDiv || !contentDiv) {
        return;
    }
    
    try {
        // Fetch user info
        const userResponse = await fetch(`${API_BASE}/auth/me`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (!userResponse.ok) {
            throw new Error('Failed to load user info');
        }
        
        const user = await userResponse.json();
        
        // Fetch last login
        let lastLogin = null;
        try {
            const lastLoginResponse = await fetch(`${API_BASE}/auth/last-login`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            
            if (lastLoginResponse.ok) {
                const data = await lastLoginResponse.json();
                lastLogin = data.lastLogin;
            }
        } catch (error) {
            console.error('Error loading last login:', error);
        }
        
        // Determine authentication method display
        let authMethodDisplay = 'Email/Password';
        let connectionStatus = 'Connected';
        let connectionStatusColor = 'var(--status-success-text)';
        
        if (user.authProvider === 'google') {
            authMethodDisplay = 'Google SSO';
        } else if (user.authProvider === 'both') {
            authMethodDisplay = 'Google SSO + Email/Password';
        }
        
        // Format dates
        const createdDate = new Date(user.createdAt);
        const createdDateStr = createdDate.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
        
        let lastLoginStr = 'This is your first login';
        if (lastLogin) {
            const lastLoginDate = new Date(lastLogin);
            lastLoginStr = formatRelativeTime(lastLoginDate);
        }
        
        // Build the account info HTML
        contentDiv.innerHTML = `
            <div style="display: grid; gap: 15px;">
                <!-- Email -->
                <div class="info-row" style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: var(--bg-secondary); border-radius: 6px;">
                    <div>
                        <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 4px; font-weight: 600;">EMAIL</div>
                        <div style="font-size: 14px; color: var(--text-primary); font-weight: 500;">${escapeHtml(user.email)}</div>
                    </div>
                </div>
                
                <!-- Authentication Method -->
                <div class="info-row" style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: var(--bg-secondary); border-radius: 6px;">
                    <div style="flex: 1;">
                        <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 4px; font-weight: 600;">AUTHENTICATION METHOD</div>
                        <div style="font-size: 14px; color: var(--text-primary); font-weight: 500;">${authMethodDisplay}</div>
                    </div>
                    <div>
                        <span style="font-size: 12px; padding: 4px 10px; border-radius: 12px; background: var(--status-success-bg); color: ${connectionStatusColor}; font-weight: 600;">
                            ${connectionStatus}
                        </span>
                    </div>
                </div>
                
                <!-- Account Created -->
                <div class="info-row" style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: var(--bg-secondary); border-radius: 6px;">
                    <div>
                        <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 4px; font-weight: 600;">MEMBER SINCE</div>
                        <div style="font-size: 14px; color: var(--text-primary); font-weight: 500;">${createdDateStr}</div>
                    </div>
                </div>
                
                <!-- Last Login -->
                <div class="info-row" style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: var(--bg-secondary); border-radius: 6px;">
                    <div>
                        <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 4px; font-weight: 600;">LAST LOGIN</div>
                        <div style="font-size: 14px; color: var(--text-primary); font-weight: 500;">${lastLoginStr}</div>
                    </div>
                </div>
                
                <!-- Sign Out Button -->
                <div style="margin-top: 10px;">
                    <button onclick="logout()" style="width: 100%; padding: 12px; background: var(--color-danger); color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 14px;">
                        Sign Out
                    </button>
                </div>
            </div>
        `;
        
        // Hide loading, show content
        loadingDiv.style.display = 'none';
        contentDiv.style.display = 'block';
        
    } catch (error) {
        console.error('Error loading account info:', error);
        
        // Show error state
        loadingDiv.style.display = 'none';
        contentDiv.style.display = 'block';
        contentDiv.innerHTML = `
            <div style="text-align: center; padding: 20px; color: var(--status-error-text);">
                <p style="margin-bottom: 10px;">Failed to load account information</p>
                <button onclick="loadAccountInfo()" class="secondary" style="padding: 8px 16px; font-size: 13px;">
                    Retry
                </button>
            </div>
        `;
    }
}

// Test Data Management Functions

// Store feedback messages for UI display
let testDataFeedback = {
    message: null,
    type: null, // 'success', 'error', 'loading'
    timestamp: null
};

/**
 * Display feedback message in the UI
 * Requirements: 8.1, 8.2, 8.3
 */
function showTestDataFeedback(message, type = 'info', duration = 5000) {
    const feedbackContainer = document.getElementById('test-data-feedback');
    if (!feedbackContainer) {
        // Create feedback container if it doesn't exist
        const container = document.getElementById('preferences-content');
        const feedback = document.createElement('div');
        feedback.id = 'test-data-feedback';
        feedback.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 16px;
            border-radius: 4px;
            font-size: 14px;
            z-index: 1000;
            animation: slideIn 0.3s ease-out;
            max-width: 400px;
        `;
        document.body.appendChild(feedback);
    }
    
    const feedback = document.getElementById('test-data-feedback');
    
    // Set background color based on type
    let bgColor, textColor, borderColor;
    switch (type) {
        case 'success':
            bgColor = 'var(--status-success-bg)';
            textColor = 'var(--status-success-text)';
            borderColor = 'var(--status-success-text)';
            break;
        case 'error':
            bgColor = 'var(--status-error-bg)';
            textColor = 'var(--status-error-text)';
            borderColor = 'var(--status-error-text)';
            break;
        case 'loading':
            bgColor = 'var(--status-info-bg)';
            textColor = 'var(--status-info-text)';
            borderColor = 'var(--status-info-text)';
            break;
        default:
            bgColor = 'var(--bg-secondary)';
            textColor = 'var(--text-primary)';
            borderColor = 'var(--border-primary)';
    }
    
    feedback.style.backgroundColor = bgColor;
    feedback.style.color = textColor;
    feedback.style.borderLeft = `4px solid ${borderColor}`;
    feedback.textContent = message;
    feedback.style.display = 'block';
    
    // Auto-hide after duration (unless it's a loading message)
    if (type !== 'loading' && duration > 0) {
        setTimeout(() => {
            feedback.style.display = 'none';
        }, duration);
    }
}

/**
 * Refresh test data status counts
 * Requirements: 8.4, 8.5
 * Property 25: Status counts refresh after operations
 */
async function refreshTestDataStatus() {
    try {
        const response = await fetch(`${API_BASE}/test-data/status`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch test data status');
        }
        
        const testDataStatus = await response.json();
        
        // Update status panel with new counts
        const statusCards = document.querySelectorAll('[data-test-data-type]');
        statusCards.forEach(card => {
            const dataType = card.getAttribute('data-test-data-type');
            const counts = testDataStatus[dataType];
            
            if (counts) {
                const countElement = card.querySelector('[data-test-data-counts]');
                if (countElement) {
                    countElement.innerHTML = `
                        <span style="color: var(--status-info-text);">${counts.test}</span> test / 
                        <span style="color: var(--text-secondary);">${counts.real}</span> real
                    `;
                }
            }
        });
        
        return testDataStatus;
    } catch (error) {
        console.error('Error refreshing test data status:', error);
        return null;
    }
}

async function generateTestData(dataType) {
    try {
        const button = event.target;
        const originalText = button.textContent;
        
        // Show loading indicator
        button.disabled = true;
        button.textContent = 'Generating...';
        showTestDataFeedback(`Generating ${dataType}...`, 'loading');
        
        const response = await fetch(`${API_BASE}/test-data/generate/${dataType}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.details || `Failed to generate ${dataType}`);
        }
        
        const result = await response.json();
        
        // Show success message with item count
        showTestDataFeedback(
            `Successfully generated ${result.itemsCreated} ${dataType}`,
            'success',
            5000
        );
        
        // Refresh the status counts after a short delay to ensure database is updated
        setTimeout(() => {
            refreshTestDataStatus();
        }, 500);
    } catch (error) {
        console.error(`Error generating ${dataType}:`, error);
        showTestDataFeedback(
            `Error generating ${dataType}: ${error.message}`,
            'error',
            5000
        );
    } finally {
        if (event.target) {
            event.target.disabled = false;
            event.target.textContent = 'Generate';
        }
    }
}

async function removeTestData(dataType) {
    if (!confirm(`Are you sure you want to remove all test ${dataType}?`)) {
        return;
    }
    
    try {
        const button = event.target;
        const originalText = button.textContent;
        
        // Show loading indicator
        button.disabled = true;
        button.textContent = 'Removing...';
        showTestDataFeedback(`Removing ${dataType}...`, 'loading');
        
        const response = await fetch(`${API_BASE}/test-data/remove/${dataType}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.details || `Failed to remove ${dataType}`);
        }
        
        const result = await response.json();
        
        // Show success message with item count
        showTestDataFeedback(
            `Successfully removed ${result.itemsDeleted} test ${dataType}`,
            'success',
            5000
        );
        
        // Refresh the status counts after a short delay to ensure database is updated
        setTimeout(() => {
            refreshTestDataStatus();
        }, 500);
    } catch (error) {
        console.error(`Error removing ${dataType}:`, error);
        showTestDataFeedback(
            `Error removing ${dataType}: ${error.message}`,
            'error',
            5000
        );
    } finally {
        if (event.target) {
            event.target.disabled = false;
            event.target.textContent = 'Remove';
        }
    }
}

async function clearAllTestData() {
    if (!confirm('Are you sure you want to permanently delete ALL test data? This action cannot be undone.')) {
        return;
    }
    
    if (!confirm('This will delete all test contacts, calendar events, suggestions, and voice notes. Are you absolutely sure?')) {
        return;
    }
    
    try {
        const button = event.target;
        
        // Show loading indicator
        button.disabled = true;
        button.textContent = 'Clearing...';
        showTestDataFeedback('Clearing all test data...', 'loading');
        
        const response = await fetch(`${API_BASE}/test-data/clear`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.details || 'Failed to clear test data');
        }
        
        const result = await response.json();
        
        // Show success message with summary
        const summary = [
            result.contactsDeleted > 0 && `${result.contactsDeleted} contacts`,
            result.calendarEventsDeleted > 0 && `${result.calendarEventsDeleted} calendar events`,
            result.suggestionsDeleted > 0 && `${result.suggestionsDeleted} suggestions`,
            result.voiceNotesDeleted > 0 && `${result.voiceNotesDeleted} voice notes`
        ].filter(Boolean).join(', ');
        
        showTestDataFeedback(
            `Successfully cleared all test data (${summary})`,
            'success',
            5000
        );
        
        // Refresh current view immediately
        if (currentPage === 'contacts') {
            await loadContacts();
        } else if (currentPage === 'suggestions') {
            await loadSuggestions();
        } else if (currentPage === 'groups-tags') {
            await loadGroupsTagsManagement();
        } else if (currentPage === 'voice') {
            await loadVoiceNotes();
        }
        
        // Refresh the status counts
        await refreshTestDataStatus();
    } catch (error) {
        console.error('Error clearing all test data:', error);
        showTestDataFeedback(
            `Error clearing test data: ${error.message}`,
            'error',
            5000
        );
    } finally {
        if (event.target) {
            event.target.disabled = false;
            event.target.textContent = 'Clear All';
        }
    }
}

async function bulkAddTestData() {
    try {
        const button = event.target;
        const originalText = button.textContent;
        
        // Show loading indicator
        button.disabled = true;
        button.textContent = 'Generating...';
        showTestDataFeedback('Generating all test data...', 'loading');
        
        const dataTypes = ['contacts', 'calendarEvents', 'suggestions', 'groupSuggestions', 'voiceNotes'];
        const results = {};
        let totalItemsCreated = 0;
        
        for (const dataType of dataTypes) {
            try {
                const response = await fetch(`${API_BASE}/test-data/generate/${dataType}`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${authToken}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (response.ok) {
                    const result = await response.json();
                    results[dataType] = result.itemsCreated;
                    totalItemsCreated += result.itemsCreated;
                    console.log(`Generated ${result.itemsCreated} ${dataType}`);
                } else {
                    console.warn(`Failed to generate ${dataType}`);
                    results[dataType] = 0;
                }
            } catch (error) {
                console.error(`Error generating ${dataType}:`, error);
                results[dataType] = 0;
            }
            
            // Small delay between requests to avoid overwhelming the server
            await new Promise(resolve => setTimeout(resolve, 300));
        }
        
        // Build summary message
        const summary = [
            results.contacts > 0 && `${results.contacts} contacts`,
            results.calendarEvents > 0 && `${results.calendarEvents} calendar events`,
            results.suggestions > 0 && `${results.suggestions} suggestions`,
            results.groupSuggestions > 0 && `${results.groupSuggestions} group suggestions`,
            results.voiceNotes > 0 && `${results.voiceNotes} voice notes`
        ].filter(Boolean).join(', ');
        
        showTestDataFeedback(
            `Successfully generated all test data (${summary})`,
            'success',
            5000
        );
        
        // Refresh the status counts after a short delay to ensure database is updated
        setTimeout(() => {
            refreshTestDataStatus();
        }, 500);
    } catch (error) {
        console.error('Error in bulk add test data:', error);
        showTestDataFeedback(
            `Error generating test data: ${error.message}`,
            'error',
            5000
        );
    } finally {
        if (event.target) {
            event.target.disabled = false;
            event.target.textContent = 'Bulk Add All Test Data';
        }
    }
}

async function deleteAllUserData() {
    if (!confirm('Are you sure you want to delete all your data? This action cannot be undone.')) {
        return;
    }
    
    if (!confirm('This will permanently delete all your contacts, events, suggestions, and voice notes. Your account will remain active. Are you absolutely sure?')) {
        return;
    }
    
    try {
        const button = event.target;
        
        // Show loading indicator
        button.disabled = true;
        button.textContent = 'Clearing...';
        showTestDataFeedback('Clearing all your data...', 'loading');
        
        const response = await fetch(`${API_BASE}/account/clear-data`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to clear data');
        }
        
        const result = await response.json();
        
        // Build summary message
        const summary = [
            result.contactsDeleted > 0 && `${result.contactsDeleted} contacts`,
            result.calendarEventsDeleted > 0 && `${result.calendarEventsDeleted} calendar events`,
            result.suggestionsDeleted > 0 && `${result.suggestionsDeleted} suggestions`,
            result.voiceNotesDeleted > 0 && `${result.voiceNotesDeleted} voice notes`
        ].filter(Boolean).join(', ');
        
        showTestDataFeedback(
            `All your data has been cleared (${summary})`,
            'success',
            5000
        );
        
        // Clear local state immediately
        contacts = [];
        suggestions = [];
        groups = [];
        allGroups = [];
        allTags = [];
        
        // Refresh current view
        if (currentPage === 'contacts') {
            await loadContacts();
        } else if (currentPage === 'suggestions') {
            await loadSuggestions();
        } else if (currentPage === 'groups-tags') {
            await loadGroupsTagsManagement();
        } else if (currentPage === 'voice') {
            await loadVoiceNotes();
        }
        
        // Also refresh test data counts
        await refreshTestDataStatus();
    } catch (error) {
        console.error('Error clearing user data:', error);
        showTestDataFeedback(
            `Error clearing data: ${error.message}`,
            'error',
            5000
        );
        
        if (event.target) {
            event.target.disabled = false;
            event.target.textContent = 'Clear All';
        }
    } finally {
        // Re-enable button
        if (event.target) {
            event.target.disabled = false;
            event.target.textContent = 'Clear All';
        }
    }
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
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function sanitizeInput(input) {
    if (!input) return '';
    // Remove any HTML tags and trim whitespace
    return input.replace(/<[^>]*>/g, '').trim();
}

// Enhanced error handling with retry logic
async function fetchWithRetry(url, options = {}, maxRetries = 2) {
    let lastError;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const response = await fetch(url, options);
            
            // Handle 401 - Unauthorized
            if (response.status === 401) {
                logout();
                throw new Error('Session expired. Please log in again.');
            }
            
            // Handle 404 - Not Found
            if (response.status === 404) {
                const errorData = await response.json().catch(() => ({ error: 'Resource not found' }));
                throw new Error(errorData.error || 'The requested resource was not found');
            }
            
            // Handle 409 - Conflict
            if (response.status === 409) {
                const errorData = await response.json().catch(() => ({ error: 'Conflict' }));
                throw new Error(errorData.error || 'A conflict occurred with the current state');
            }
            
            // Handle 400 - Bad Request
            if (response.status === 400) {
                const errorData = await response.json().catch(() => ({ error: 'Invalid request' }));
                throw new Error(errorData.error || 'Invalid request data');
            }
            
            // Handle 500 - Server Error (retryable)
            if (response.status >= 500) {
                const errorData = await response.json().catch(() => ({ error: 'Server error' }));
                throw new Error(errorData.error || 'Server error occurred');
            }
            
            return response;
        } catch (error) {
            lastError = error;
            
            // Don't retry on auth errors or client errors
            if (error.message.includes('Session expired') || 
                error.message.includes('not found') ||
                error.message.includes('Invalid request') ||
                error.message.includes('Conflict')) {
                throw error;
            }
            
            // Network errors are retryable
            if (attempt < maxRetries) {
                // Exponential backoff: 1s, 2s, 4s
                const delay = Math.pow(2, attempt) * 1000;
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }
            
            // If we've exhausted retries, throw the last error
            throw new Error(error.message || 'Network error. Please check your connection and try again.');
        }
    }
    
    throw lastError;
}

// Handle concurrent operations with a simple queue
const operationQueue = new Map();

async function executeWithConcurrencyControl(key, operation) {
    // If an operation with this key is already running, wait for it
    if (operationQueue.has(key)) {
        try {
            await operationQueue.get(key);
        } catch (e) {
            // Ignore errors from previous operation
        }
    }
    
    // Execute the new operation
    const promise = operation();
    operationQueue.set(key, promise);
    
    try {
        const result = await promise;
        return result;
    } finally {
        operationQueue.delete(key);
    }
}

function formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString();
}

function formatRelativeTime(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    // For older dates, show the actual date
    return date.toLocaleDateString();
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

function showGroupTagSuccess(message) {
    // Create a temporary success message element
    const successDiv = document.createElement('div');
    successDiv.className = 'success';
    successDiv.textContent = message;
    successDiv.style.position = 'fixed';
    successDiv.style.top = '20px';
    successDiv.style.right = '20px';
    successDiv.style.zIndex = '2000';
    successDiv.style.minWidth = '250px';
    successDiv.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
    
    document.body.appendChild(successDiv);
    
    // Remove after 3 seconds
    setTimeout(() => {
        successDiv.remove();
    }, 3000);
}

// Toast notification system
let toastCounter = 0;
const activeToasts = new Map();

function showToast(message, type = 'info') {
    const toastId = ++toastCounter;
    
    // Create toast element
    const toast = document.createElement('div');
    toast.id = `toast-${toastId}`;
    toast.className = `toast toast-${type}`;
    
    // Add icon based on type
    let icon = '';
    if (type === 'success') {
        icon = '✓';
    } else if (type === 'error') {
        icon = '✕';
    } else if (type === 'loading') {
        icon = '<span class="toast-spinner"></span>';
    } else {
        icon = 'ℹ';
    }
    
    toast.innerHTML = `
        <div class="toast-icon">${icon}</div>
        <div class="toast-message">${escapeHtml(message)}</div>
    `;
    
    // Add to DOM
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        document.body.appendChild(toastContainer);
    }
    
    toastContainer.appendChild(toast);
    activeToasts.set(toastId, toast);
    
    // Trigger animation
    setTimeout(() => {
        toast.classList.add('toast-show');
    }, 10);
    
    // Auto-dismiss for non-loading toasts
    if (type !== 'loading') {
        const duration = type === 'error' ? 5000 : 3000;
        setTimeout(() => {
            hideToast(toastId);
        }, duration);
    }
    
    return toastId;
}

function hideToast(toastId) {
    const toast = activeToasts.get(toastId);
    if (toast) {
        toast.classList.remove('toast-show');
        toast.classList.add('toast-hide');
        
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
            activeToasts.delete(toastId);
        }, 300);
    }
}

// Circle Management Integration
// Helper function to get circle information
function getCircleInfo(circleId) {
    const circles = {
        'inner': {
            name: 'Inner Circle',
            emoji: '💎',
            color: '#8b5cf6',
            description: 'Your closest relationships (up to 5 people)'
        },
        'close': {
            name: 'Close Friends',
            emoji: '🌟',
            color: '#3b82f6',
            description: 'Close friends you see regularly (up to 15 people)'
        },
        'active': {
            name: 'Active Friends',
            emoji: '🤝',
            color: '#10b981',
            description: 'Friends you actively maintain (up to 50 people)'
        },
        'casual': {
            name: 'Casual Network',
            emoji: '👋',
            color: '#f59e0b',
            description: 'Casual acquaintances (up to 150 people)'
        },
        'acquaintance': {
            name: 'Acquaintances',
            emoji: '👤',
            color: '#6b7280',
            description: 'People you know but don\'t interact with often'
        }
    };
    
    return circles[circleId] || {
        name: 'Uncategorized',
        emoji: '❓',
        color: '#9ca3af',
        description: 'Not yet assigned to a circle'
    };
}

// Open onboarding in management mode
async function openOnboardingManagement() {
    try {
        // Initialize onboarding controller if not already done
        if (!window.onboardingController) {
            window.onboardingController = new OnboardingController();
            window.onboardingController.initialize(authToken, userId);
        }
        
        // Check if user has any contacts
        if (contacts.length === 0) {
            const shouldImport = confirm(
                'You don\'t have any contacts yet. Would you like to import contacts from Google first?'
            );
            
            if (shouldImport) {
                // Navigate to preferences page where Google Contacts integration is
                navigateTo('preferences');
                showToast('Connect Google Contacts to import your contacts', 'info');
                return;
            } else {
                showToast('Add some contacts first to organize them into circles', 'info');
                return;
            }
        }
        
        // Start onboarding in management mode
        const loadingToastId = showToast('Opening circle management...', 'loading');
        
        try {
            // Initialize onboarding in 'manage' mode
            await window.onboardingController.initializeOnboarding('manage');
            
            hideToast(loadingToastId);
            
            // Navigate to the circular visualizer view
            // For now, show a message that this feature is being set up
            showToast('Circle management is opening...', 'info');
            
            // TODO: Implement proper onboarding UI integration
            // For now, redirect to the test page as a temporary solution
            setTimeout(() => {
                window.location.href = '/js/circular-visualizer.test.html';
            }, 1000);
            
        } catch (error) {
            hideToast(loadingToastId);
            console.error('Error opening onboarding:', error);
            showToast('Failed to open circle management: ' + error.message, 'error');
        }
    } catch (error) {
        console.error('Error in openOnboardingManagement:', error);
        showToast('An error occurred: ' + error.message, 'error');
    }
}

// Check if user should be prompted for onboarding
async function checkOnboardingStatus() {
    try {
        // Only check if user is authenticated
        if (!authToken || !userId) {
            return;
        }
        
        // Check if onboarding controller is available
        if (typeof OnboardingController === 'undefined') {
            return;
        }
        
        // Initialize onboarding controller if not already done
        if (!window.onboardingController) {
            window.onboardingController = new OnboardingController();
            window.onboardingController.initialize(authToken, userId);
        }
        
        // Get onboarding state
        const state = await window.onboardingController.resumeOnboarding();
        
        // Onboarding popups disabled - users can manually access onboarding via the UI
    } catch (error) {
        console.error('Error checking onboarding status:', error);
        // Silently fail - don't interrupt user experience
    }
}

// Trigger onboarding after Google Contacts sync
async function triggerPostImportOnboarding(contactCount) {
    try {
        // Check if onboarding controller is available
        if (typeof OnboardingController === 'undefined') {
            console.log('Onboarding controller not available');
            return;
        }
        
        // Initialize onboarding controller if not already done
        if (!window.onboardingController) {
            window.onboardingController = new OnboardingController();
            window.onboardingController.initialize(authToken, userId);
        }
        
        // Show prompt to organize imported contacts
        const shouldOrganize = confirm(
            `Successfully imported ${contactCount} contact${contactCount > 1 ? 's' : ''} from Google!\n\nWould you like to organize them into social circles now?`
        );
        
        if (shouldOrganize) {
            const loadingToastId = showToast('Starting contact organization...', 'loading');
            
            try {
                await window.onboardingController.initializeOnboarding('post_import');
                hideToast(loadingToastId);
                showToast('Contact organization started', 'success');
                
                // Open onboarding UI
                alert('Contact Organization\n\nYou can now organize your imported contacts into social circles.\n\nThe full interactive UI with drag-and-drop visualization will guide you through the process.');
                
            } catch (error) {
                hideToast(loadingToastId);
                console.error('Error starting post-import onboarding:', error);
                showToast('Failed to start contact organization', 'error');
            }
        }
    } catch (error) {
        console.error('Error in triggerPostImportOnboarding:', error);
    }
}

// Check for new user onboarding
async function checkNewUserOnboarding() {
    try {
        // Only check if user is authenticated
        if (!authToken || !userId) {
            return;
        }
        
        // Check if onboarding controller is available
        if (typeof OnboardingController === 'undefined') {
            return;
        }
        
        // Wait a bit for contacts to load
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // If user has zero contacts, offer onboarding
        if (contacts.length === 0) {
            const shouldStart = confirm(
                'Welcome to CatchUp!\n\nWould you like to import and organize your contacts to get started?'
            );
            
            if (shouldStart) {
                // Navigate to preferences to connect Google Contacts
                navigateTo('preferences');
                showToast('Connect Google Contacts to import your contacts', 'info');
            }
        }
    } catch (error) {
        console.error('Error checking new user onboarding:', error);
        // Silently fail
    }
}
