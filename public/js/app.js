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
    // Initialize theme before anything else to ensure proper styling
    if (typeof themeManager !== 'undefined') {
        themeManager.initializeTheme();
        updateThemeIcon();
    }
    
    checkAuth();
    setupNavigation();
    
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
    
    // Show loading state
    container.innerHTML = `
        <div class="loading-state">
            <div class="spinner"></div>
            <p>Loading suggestions...</p>
        </div>
    `;
    
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
    
    // Sort by priority (higher priority first)
    const sortedSuggestions = [...suggestionsList].sort((a, b) => b.priority - a.priority);
    
    container.innerHTML = sortedSuggestions.map(suggestion => {
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
        if (suggestion.status === 'pending') {
            if (isGroup) {
                actions = `
                    <button onclick="acceptSuggestion('${suggestion.id}')">Accept Group Catchup</button>
                    <button class="secondary" onclick="showGroupModifyMenu('${suggestion.id}', event)">Modify Group ▼</button>
                    <button class="secondary" onclick="dismissSuggestion('${suggestion.id}')">Dismiss</button>
                `;
            } else {
                actions = `
                    <button onclick="acceptSuggestion('${suggestion.id}')">Accept</button>
                    <button class="secondary" onclick="dismissSuggestion('${suggestion.id}')">Dismiss</button>
                    <button class="secondary" onclick="snoozeSuggestion('${suggestion.id}')">Snooze</button>
                `;
            }
        } else {
            actions = `<span style="color: #6b7280; font-size: 14px;">No actions available</span>`;
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
            
            if (contact.groups && contact.groups.length > 0) {
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
                <p><strong>Time:</strong> ${formatDateTime(suggestion.proposedTimeslot.start)}</p>
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
    
    // Add event listeners for contact tooltips
    addContactTooltipListeners();
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
