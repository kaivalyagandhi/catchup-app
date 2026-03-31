/**
 * Directory Page — contacts directory orchestrator module for CatchUp.
 *
 * Owns: tab switching (contacts/circles/groups/tags/archived), contact CRUD,
 * tag/group management within contacts, delegation to external component
 * scripts (contacts-table.js, groups-table.js, tags-table.js,
 * archived-contacts-view.js, circular-visualizer.js), and badge counts.
 *
 * Heavy rendering is delegated to the external component scripts that define
 * global functions (e.g. `renderContactsTable`, `renderGroupsTable`). This
 * module checks for those globals with `typeof` before calling them and falls
 * back to simple built-in renderers when they are unavailable.
 *
 * @module directory-page
 */

import {
  escapeHtml,
  showToast,
  showConfirm,
  fetchWithAuth,
  API_BASE,
  formatRelativeTime,
  hideToast,
} from './utils.js';

import {
  registerPage,
  getAuthToken,
  getCurrentUser,
  navigateTo,
  checkOnboardingStatus,
} from './app-shell.js';

// ---------------------------------------------------------------------------
// Module-level state
// ---------------------------------------------------------------------------

let contacts = [];
let groups = [];
let allGroups = [];
let allTags = [];
let currentDirectoryTab = 'contacts';
let currentContactTags = [];
let originalContactTags = [];
let currentContactGroups = [];
let currentContactFilter = 'all';
let archivedContactsView = null;
let circlesVisualizer = null;

// ---------------------------------------------------------------------------
// Helpers — auth & fetch
// ---------------------------------------------------------------------------

/** Shorthand to get userId from app-shell. */
function _userId() {
  return getCurrentUser().userId;
}

/** Shorthand to get authToken from app-shell. */
function _authToken() {
  return getAuthToken();
}

/**
 * Fetch wrapper with retry logic (exponential back-off, max 2 retries).
 * Handles 401 (logout), 404, 409, 400, and 5xx.
 */
async function fetchWithRetry(url, options = {}, maxRetries = 2) {
  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      if (response.status === 401) {
        if (typeof window.logout === 'function') window.logout();
        throw new Error('Session expired. Please log in again.');
      }
      if (response.status === 404) {
        const d = await response.json().catch(() => ({ error: 'Resource not found' }));
        throw new Error(d.error || 'The requested resource was not found');
      }
      if (response.status === 409) {
        const d = await response.json().catch(() => ({ error: 'Conflict' }));
        throw new Error(d.error || 'A conflict occurred with the current state');
      }
      if (response.status === 400) {
        const d = await response.json().catch(() => ({ error: 'Invalid request' }));
        throw new Error(d.error || 'Invalid request data');
      }
      if (response.status >= 500) {
        const d = await response.json().catch(() => ({ error: 'Server error' }));
        throw new Error(d.error || 'Server error occurred');
      }
      return response;
    } catch (error) {
      lastError = error;
      if (
        error.message.includes('Session expired') ||
        error.message.includes('not found') ||
        error.message.includes('Invalid request') ||
        error.message.includes('Conflict')
      ) {
        throw error;
      }
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 1000));
        continue;
      }
      throw new Error(error.message || 'Network error. Please check your connection and try again.');
    }
  }
  throw lastError;
}

// Concurrency control for operations
const operationQueue = new Map();

async function executeWithConcurrencyControl(key, operation) {
  if (operationQueue.has(key)) {
    try { await operationQueue.get(key); } catch (_) { /* ignore */ }
  }
  const promise = operation();
  operationQueue.set(key, promise);
  try {
    return await promise;
  } finally {
    operationQueue.delete(key);
  }
}

// ---------------------------------------------------------------------------
// Circle info helper
// ---------------------------------------------------------------------------

/**
 * Return circle metadata (name, emoji, color, description) for a Dunbar circle id.
 * @param {string} circleId
 * @returns {{ name: string, emoji: string, color: string, description: string }}
 */
function getCircleInfo(circleId) {
  const circles = {
    inner: {
      name: 'Inner Circle',
      emoji: '💎',
      color: '#8b5cf6',
      description: "Your closest confidants—people you'd call in a crisis (up to 10 people)",
    },
    close: {
      name: 'Close Friends',
      emoji: '🌟',
      color: '#3b82f6',
      description: 'Good friends you regularly share life updates with (up to 25 people)',
    },
    active: {
      name: 'Active Friends',
      emoji: '✨',
      color: '#10b981',
      description: 'People you want to stay connected with regularly (up to 50 people)',
    },
    casual: {
      name: 'Casual Network',
      emoji: '🤝',
      color: '#f59e0b',
      description: 'Acquaintances you keep in touch with occasionally (up to 100 people)',
    },
  };
  return (
    circles[circleId] || {
      name: 'Uncategorized',
      emoji: '❓',
      color: '#9ca3af',
      description: 'Not yet assigned to a circle',
    }
  );
}

// ---------------------------------------------------------------------------
// Error helpers
// ---------------------------------------------------------------------------

function showError(containerId, message) {
  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = `<div class="error">${escapeHtml(message)}</div>`;
  }
}

function showModalError(errorId, message) {
  const errorEl = document.getElementById(errorId);
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.classList.remove('hidden');
  }
}

// ---------------------------------------------------------------------------
// Data helpers
// ---------------------------------------------------------------------------

function getAvailableTags() {
  const tags = new Set();
  if (contacts && Array.isArray(contacts)) {
    contacts.forEach((contact) => {
      if (contact.tags && Array.isArray(contact.tags)) {
        contact.tags.forEach((tag) => {
          const tagText = typeof tag === 'string' ? tag : tag.text || '';
          if (tagText) tags.add(tagText);
        });
      }
    });
  }
  return Array.from(tags).sort();
}

function getUniqueLocations() {
  const locations = new Set();
  if (contacts && Array.isArray(contacts)) {
    contacts.forEach((contact) => {
      if (contact.location) locations.add(contact.location);
    });
  }
  return Array.from(locations).sort();
}

// ---------------------------------------------------------------------------
// Directory page — load & tab switching
// ---------------------------------------------------------------------------

function loadDirectory() {
  const hash = window.location.hash;
  const tabMatch = hash.match(/#directory\/(contacts|circles|groups|tags|archived)/);

  if (tabMatch) {
    currentDirectoryTab = tabMatch[1];
  } else {
    const savedTab = localStorage.getItem('currentDirectoryTab');
    if (savedTab && ['contacts', 'circles', 'groups', 'tags', 'archived'].includes(savedTab)) {
      currentDirectoryTab = savedTab;
    }
  }
  switchDirectoryTab(currentDirectoryTab);
}

function switchDirectoryTab(tab) {
  currentDirectoryTab = tab;
  localStorage.setItem('currentDirectoryTab', tab);
  window.history.replaceState(null, '', `#directory/${tab}`);

  // Update active tab button
  document.querySelectorAll('.directory-tab').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });

  // Hide all tab contents
  document.querySelectorAll('.directory-tab-content').forEach((content) => {
    content.classList.add('hidden');
  });

  // Show selected tab content
  const tabEl = document.getElementById(`directory-${tab}-tab`);
  if (tabEl) tabEl.classList.remove('hidden');

  // Mark group mappings page as visited when user navigates to groups tab
  if (tab === 'groups') {
    const uid = _userId();
    if (uid) {
      localStorage.setItem(`group-mappings-visited-${uid}`, 'true');
      checkAndCompleteGroupMappingsStep();
    }
  }

  // Load tab data
  switch (tab) {
    case 'contacts':
      loadContacts();
      break;
    case 'circles':
      loadCirclesVisualization();
      break;
    case 'groups':
      loadGroupsManagement();
      break;
    case 'tags':
      loadTagsManagement();
      break;
    case 'archived':
      loadArchivedContacts();
      break;
  }
}

/**
 * Check if group mappings step should be auto-completed.
 */
async function checkAndCompleteGroupMappingsStep() {
  if (!window.onboardingController || !window.onboardingController.isOnboardingActive()) return;
  try {
    const uid = _userId();
    const token = _authToken();
    if (!uid || !token) return;

    const response = await fetch(`${API_BASE}/contacts/google/group-mappings?userId=${uid}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return;

    const data = await response.json();
    const mappings = data.mappings || [];
    if (mappings.length === 0) {
      await window.onboardingController.markStepComplete('group-mappings');
      await window.onboardingController.saveProgress();
      if (window.onboardingIndicator) {
        const currentState = window.onboardingIndicator.state;
        currentState.steps.groupMappings.complete = true;
        window.onboardingIndicator.updateState(currentState);
      }
    }
  } catch (error) {
    console.error('Error checking group mappings step:', error);
  }
}

// ---------------------------------------------------------------------------
// Contacts — load, render, search, filter
// ---------------------------------------------------------------------------

async function loadContacts() {
  const container = document.getElementById('contacts-list');
  if (!container) return;

  container.innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      <p>Loading contacts...</p>
    </div>
  `;

  const userId = _userId();
  const authToken = _authToken();

  try {
    // Load groups first
    const groupsResponse = await fetch(`${API_BASE}/contacts/groups?userId=${userId}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (groupsResponse.status === 401) { if (typeof window.logout === 'function') window.logout(); return; }
    if (groupsResponse.ok) {
      groups = await groupsResponse.json();
      window.groups = groups;
    }

    // Load contacts
    const response = await fetch(`${API_BASE}/contacts?userId=${userId}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (response.status === 401) { if (typeof window.logout === 'function') window.logout(); return; }
    if (!response.ok) throw new Error('Failed to load contacts');

    contacts = await response.json();
    window.contacts = contacts;

    // Delegate to external contacts-table component if available
    if (typeof renderContactsTable === 'function') {
      renderContactsTable(contacts);
    } else {
      renderContacts(contacts);
    }

    // Check onboarding status after contacts are loaded
    setTimeout(() => { checkOnboardingStatus(); }, 500);
  } catch (error) {
    console.error('Error loading contacts:', error);
    showError('contacts-list', 'Failed to load contacts');
  }
}

/**
 * Fallback card-based renderer when contacts-table.js is not loaded.
 */
function renderContacts(contactsList) {
  const container = document.getElementById('contacts-list');
  if (!container) return;

  // Expose for contact detail panel click handler
  window._directoryContacts = contactsList;

  if (contactsList.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <h3>No contacts yet</h3>
        <p>Add your first contact to get started</p>
      </div>
    `;
    return;
  }

  container.innerHTML = contactsList
    .map((contact) => {
      let tagsHtml = '';
      if (contact.tags && contact.tags.length > 0) {
        tagsHtml = `<div class="contact-tags">${contact.tags.map((tag) => `<span class="tag-badge">${escapeHtml(tag.text)}</span>`).join('')}</div>`;
      }

      let groupsHtml = '';
      if (contact.groups && contact.groups.length > 0) {
        const groupNames = contact.groups
          .map((gid) => { const g = groups.find((gr) => gr.id === gid); return g ? g.name : null; })
          .filter(Boolean);
        if (groupNames.length > 0) {
          groupsHtml = `<div class="contact-groups">${groupNames.map((n) => `<span class="group-badge">${escapeHtml(n)}</span>`).join('')}</div>`;
        }
      }

      let sourceBadge = '';
      if (contact.source === 'google') {
        sourceBadge = `<span style="display:inline-flex;align-items:center;gap:4px;background:#4285f4;color:white;padding:4px 8px;border-radius:12px;font-size:11px;font-weight:600;margin-bottom:8px;"><img src="https://www.gstatic.com/marketing-cms/assets/images/ff/21/95f22bf94e35bea3ec097d3f4720/contacts.png" alt="Google" style="width:12px;height:12px;">Google</span>`;
      }

      let lastSyncInfo = '';
      if (contact.source === 'google' && contact.lastSyncedAt) {
        const timeAgo = formatRelativeTime(new Date(contact.lastSyncedAt));
        lastSyncInfo = `<p style="font-size:11px;color:var(--text-secondary);margin-top:4px;"><span style="margin-right:4px;">🔄</span>Last synced: ${timeAgo}</p>`;
      }

      let circleHtml = '';
      if (contact.dunbarCircle) {
        const ci = getCircleInfo(contact.dunbarCircle);
        circleHtml = `
          <div style="margin-top:12px;padding:8px;background:${ci.color}15;border-left:3px solid ${ci.color};border-radius:4px;">
            <p style="font-size:12px;font-weight:600;color:${ci.color};margin:0;"><span style="margin-right:6px;">${ci.emoji}</span>${ci.name}</p>
            ${contact.circleConfidence ? `<p style="font-size:11px;color:var(--text-secondary);margin:4px 0 0 0;">Confidence: ${Math.round(contact.circleConfidence * 100)}%</p>` : ''}
          </div>`;
      }

      const idx = contactsList.indexOf(contact);
      return `
        <div class="card" style="cursor:pointer;" onclick="if(event.target.tagName!=='BUTTON')window.openContactDetail&&window.openContactDetail(window._directoryContacts[${idx}],window._directoryContacts,${idx})">
          ${sourceBadge}
          <h3>${escapeHtml(contact.name)}</h3>
          <p><span style="font-size:16px;margin-right:8px;">📞</span><strong>Phone:</strong> ${contact.phone || 'N/A'}</p>
          <p><span style="font-size:16px;margin-right:8px;">✉️</span><strong>Email:</strong> ${contact.email || 'N/A'}</p>
          <p><span style="font-size:16px;margin-right:8px;">📍</span><strong>Location:</strong> ${contact.location || 'N/A'}</p>
          ${contact.timezone ? `<p><span style="font-size:16px;margin-right:8px;">🌍</span><strong>Timezone:</strong> ${contact.timezone}</p>` : ''}
          ${contact.frequencyPreference ? `<p><span style="font-size:16px;margin-right:8px;">📅</span><strong>Frequency:</strong> ${contact.frequencyPreference}</p>` : ''}
          ${contact.customNotes ? `<p><span style="font-size:16px;margin-right:8px;">📝</span><strong>Notes:</strong> ${escapeHtml(contact.customNotes)}</p>` : ''}
          ${lastSyncInfo}
          ${circleHtml}
          ${tagsHtml}
          ${groupsHtml}
          <div class="card-actions">
            <button onclick="editContact('${contact.id}')">Edit</button>
            <button class="secondary" onclick="deleteContact('${contact.id}')">Delete</button>
          </div>
        </div>`;
    })
    .join('');
}

function searchContacts() {
  const input = document.getElementById('contact-search');
  const query = input ? input.value.toLowerCase() : '';
  let filtered = contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(query) ||
      (c.email && c.email.toLowerCase().includes(query)) ||
      (c.phone && c.phone.includes(query))
  );
  if (currentContactFilter !== 'all') {
    filtered = filtered.filter((c) => c.source === currentContactFilter);
  }
  renderContacts(filtered);
}

function filterContactsBySource(source) {
  currentContactFilter = source;
  document.querySelectorAll('.filter-btn').forEach((btn) => btn.classList.remove('active'));
  const btn = document.getElementById(`filter-${source}`);
  if (btn) btn.classList.add('active');
  searchContacts();
}

// ---------------------------------------------------------------------------
// Contact CRUD — modals, save, delete
// ---------------------------------------------------------------------------

function showAddContactModal() {
  document.getElementById('contact-modal-title').textContent = 'Add Contact';
  document.getElementById('contact-form').reset();
  document.getElementById('contact-id').value = '';
  currentContactTags = [];
  originalContactTags = [];
  currentContactGroups = [];
  renderContactTags();
  renderContactGroups();
  populateGroupDropdown();
  document.getElementById('contact-modal').classList.remove('hidden');
}

function editContact(id) {
  const contact = contacts.find((c) => c.id === id);
  if (!contact) return;

  document.getElementById('contact-modal-title').textContent = 'Edit Contact';
  document.getElementById('contact-id').value = contact.id;
  document.getElementById('contact-name').value = contact.name;
  document.getElementById('contact-phone').value = contact.phone || '';
  document.getElementById('contact-email').value = contact.email || '';
  document.getElementById('contact-location').value = contact.location || '';
  document.getElementById('contact-frequency').value = contact.frequencyPreference || '';
  document.getElementById('contact-notes').value = contact.customNotes || '';

  currentContactTags = contact.tags || [];
  originalContactTags = JSON.parse(JSON.stringify(contact.tags || []));
  currentContactGroups = contact.groups || [];
  renderContactTags();
  renderContactGroups();
  populateGroupDropdown();
  document.getElementById('contact-modal').classList.remove('hidden');
}

function closeContactModal() {
  document.getElementById('contact-modal').classList.add('hidden');
  document.getElementById('contact-modal-error').classList.add('hidden');
}

async function saveContact(event) {
  event.preventDefault();

  const userId = _userId();
  const authToken = _authToken();
  const id = document.getElementById('contact-id').value;
  const data = {
    userId,
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
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="loading-spinner"></span> Saving...';

    let response;
    let contactId = id;

    if (id) {
      response = await fetch(`${API_BASE}/contacts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify(data),
      });
    } else {
      response = await fetch(`${API_BASE}/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify(data),
      });
    }

    if (response.status === 401) { if (typeof window.logout === 'function') window.logout(); return; }
    if (!response.ok) throw new Error('Failed to save contact');

    const savedContact = await response.json();
    contactId = savedContact.id;

    await syncContactTags(contactId, originalContactTags);
    await syncContactGroups(contactId, savedContact.groups || []);

    showToast(id ? 'Contact updated successfully!' : 'Contact created successfully!', 'success');
    closeContactModal();
    loadContacts();

    if (currentDirectoryTab === 'groups' || currentDirectoryTab === 'tags') {
      await loadGroupsTagsManagement();
    }
  } catch (error) {
    console.error('Error saving contact:', error);
    showModalError('contact-modal-error', 'Failed to save contact');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
}

async function deleteContact(id) {
  const confirmed = await showConfirm('Are you sure you want to delete this contact?', {
    title: 'Delete Contact',
    confirmText: 'Delete',
    type: 'danger',
  });
  if (!confirmed) return;

  const userId = _userId();
  const authToken = _authToken();
  const loadingToastId = showToast('Deleting contact...', 'loading');

  try {
    const response = await fetch(`${API_BASE}/contacts/${id}?userId=${userId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (response.status === 401) { if (typeof window.logout === 'function') window.logout(); return; }
    if (!response.ok) throw new Error('Failed to delete contact');

    hideToast(loadingToastId);
    showToast('Contact deleted successfully!', 'success');
    loadContacts();

    if (currentDirectoryTab === 'groups' || currentDirectoryTab === 'tags') {
      await loadGroupsTagsManagement();
    }
  } catch (error) {
    console.error('Error deleting contact:', error);
    hideToast(loadingToastId);
    showToast('Failed to delete contact', 'error');
  }
}

// ---------------------------------------------------------------------------
// Tag / group sync for contact modal
// ---------------------------------------------------------------------------

async function syncContactTags(contactId, existingTags) {
  const userId = _userId();
  const authToken = _authToken();
  try {
    const tagsToAdd = currentContactTags.filter(
      (ct) => !existingTags.some((et) => et.text.toLowerCase() === ct.text.toLowerCase())
    );
    const tagsToRemove = existingTags.filter(
      (et) => !currentContactTags.some((ct) => ct.text.toLowerCase() === et.text.toLowerCase())
    );

    for (const tag of tagsToAdd) {
      await fetch(`${API_BASE}/contacts/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ userId, contactId, text: tag.text, source: 'manual' }),
      });
    }
    for (const tag of tagsToRemove) {
      await fetch(`${API_BASE}/contacts/tags/${tag.id}?userId=${userId}&contactId=${contactId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` },
      });
    }
  } catch (error) {
    console.error('Error syncing tags:', error);
    throw error;
  }
}

async function syncContactGroups(contactId, existingGroups) {
  const userId = _userId();
  const authToken = _authToken();
  try {
    const groupsToAdd = currentContactGroups.filter((gid) => !existingGroups.includes(gid));
    const groupsToRemove = existingGroups.filter((gid) => !currentContactGroups.includes(gid));

    for (const groupId of groupsToAdd) {
      await fetch(`${API_BASE}/contacts/bulk/groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ userId, contactIds: [contactId], groupId, action: 'add' }),
      });
    }
    for (const groupId of groupsToRemove) {
      await fetch(`${API_BASE}/contacts/bulk/groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ userId, contactIds: [contactId], groupId, action: 'remove' }),
      });
    }
  } catch (error) {
    console.error('Error syncing groups:', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Tag / group UI within contact modal
// ---------------------------------------------------------------------------

function populateGroupDropdown() {
  const select = document.getElementById('contact-group-select');
  if (!select) return;
  select.innerHTML = '<option value="">Select a group...</option>';
  groups.forEach((group) => {
    const option = document.createElement('option');
    option.value = group.id;
    option.textContent = group.name;
    select.appendChild(option);
  });
}

function renderContactTags() {
  const container = document.getElementById('contact-tags-list');
  if (!container) return;
  if (currentContactTags.length === 0) {
    container.innerHTML = '<span style="color:#9ca3af;font-size:12px;">No tags added</span>';
    return;
  }
  container.innerHTML = currentContactTags
    .map(
      (tag, index) => `
      <div class="tag-item">
        <span>${escapeHtml(tag.text)}</span>
        <button type="button" class="remove-btn" onclick="removeTagFromContact(${index})" title="Remove tag">×</button>
      </div>`
    )
    .join('');
}

function renderContactGroups() {
  const container = document.getElementById('contact-groups-list');
  if (!container) return;
  if (currentContactGroups.length === 0) {
    container.innerHTML = '<span style="color:#9ca3af;font-size:12px;">No groups assigned</span>';
    return;
  }
  container.innerHTML = currentContactGroups
    .map((groupId, index) => {
      const group = groups.find((g) => g.id === groupId);
      const groupName = group ? group.name : 'Unknown';
      return `
        <div class="group-item">
          <span>${escapeHtml(groupName)}</span>
          <button type="button" class="remove-btn" onclick="removeGroupFromContact(${index})" title="Remove group">×</button>
        </div>`;
    })
    .join('');
}

function addTagToContact() {
  const input = document.getElementById('contact-tag-input');
  const text = input ? input.value.trim() : '';
  if (!text) { showToast('Please enter a tag', 'error'); return; }
  if (currentContactTags.some((tag) => tag.text.toLowerCase() === text.toLowerCase())) {
    showToast('This tag already exists', 'error');
    return;
  }
  currentContactTags.push({ text, source: 'manual', id: null });
  if (input) input.value = '';
  renderContactTags();
}

function removeTagFromContact(index) {
  currentContactTags.splice(index, 1);
  renderContactTags();
}

function assignGroupToContact() {
  const select = document.getElementById('contact-group-select');
  const groupId = select ? select.value : '';
  if (!groupId) { showToast('Please select a group', 'error'); return; }
  if (currentContactGroups.includes(groupId)) {
    showToast('This group is already assigned', 'error');
    return;
  }
  currentContactGroups.push(groupId);
  if (select) select.value = '';
  renderContactGroups();
}

function removeGroupFromContact(index) {
  currentContactGroups.splice(index, 1);
  renderContactGroups();
}

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

async function seedTestData() {
  const confirmed = await showConfirm(
    'This will create test contacts, groups, tags, and suggestions. Continue?',
    { title: 'Seed Test Data', confirmText: 'Create Test Data', type: 'info' }
  );
  if (!confirmed) return;

  const authToken = _authToken();
  const loadingToastId = showToast('Loading test data...', 'loading');

  try {
    const response = await fetch(`${API_BASE}/test-data/seed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ contactCount: 10, includeCalendarEvents: false, includeSuggestions: true, includeVoiceNotes: true }),
    });
    if (response.status === 401) { if (typeof window.logout === 'function') window.logout(); return; }
    if (!response.ok) { const err = await response.json(); throw new Error(err.message || 'Failed to seed test data'); }

    const result = await response.json();
    hideToast(loadingToastId);
    showToast(
      `Test data loaded! Created ${result.contactsCreated} contacts, ${result.groupsCreated || 0} groups, ${result.tagsCreated || 0} tags, ${result.suggestionsCreated || 0} suggestions`,
      'success'
    );

    if (currentDirectoryTab === 'contacts') loadContacts();
    else if (currentDirectoryTab === 'groups' || currentDirectoryTab === 'tags') loadGroupsTagsManagement();
  } catch (error) {
    console.error('Error seeding test data:', error);
    hideToast(loadingToastId);
    showToast(error.message || 'Failed to load test data', 'error');
  }
}

async function clearTestData() {
  const confirmed = await showConfirm(
    'This will delete ALL your contacts, groups, tags, suggestions, and edits. This cannot be undone. Continue?',
    { title: 'Clear All Data', confirmText: 'Delete Everything', type: 'danger' }
  );
  if (!confirmed) return;

  const authToken = _authToken();
  const loadingToastId = showToast('Clearing all data...', 'loading');

  try {
    const response = await fetch(`${API_BASE}/test-data/clear`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
    });
    if (response.status === 401) { if (typeof window.logout === 'function') window.logout(); return; }
    if (!response.ok) { const err = await response.json(); throw new Error(err.message || 'Failed to clear test data'); }

    const result = await response.json();
    hideToast(loadingToastId);
    showToast(
      `All data cleared! Deleted ${result.contactsDeleted} contacts, ${result.groupsDeleted || 0} groups, ${result.tagsDeleted || 0} tags, ${result.suggestionsDeleted || 0} suggestions`,
      'success'
    );

    if (currentDirectoryTab === 'contacts') loadContacts();
    else if (currentDirectoryTab === 'groups' || currentDirectoryTab === 'tags') loadGroupsTagsManagement();
  } catch (error) {
    console.error('Error clearing test data:', error);
    hideToast(loadingToastId);
    showToast(error.message || 'Failed to clear data', 'error');
  }
}

// ---------------------------------------------------------------------------
// Groups management
// ---------------------------------------------------------------------------

async function loadGroupsTagsManagement() {
  await loadGroupsList();
  await loadTags();
  await loadGroupMappingsSection();
}

let _groupsBannerRendering = false;

async function renderGroupsBanner() {
  if (_groupsBannerRendering) return;
  _groupsBannerRendering = true;

  // Remove ALL existing banners (not just by ID — catch duplicates)
  document.querySelectorAll('#groups-organize-banner').forEach(el => el.remove());

  const authToken = _authToken();
  const userId = _userId();

  try {
    const response = await fetch(`${API_BASE}/contacts/ungrouped-count`, {
      headers: { Authorization: `Bearer ${authToken}`, 'x-user-id': userId },
    });
    if (!response.ok) return;

    const data = await response.json();
    const ungroupedCount = data.count || 0;
    if (ungroupedCount <= 0) return;

    const groupsTab = document.getElementById('directory-groups-tab');
    if (!groupsTab) return;

    const bannerContainer = document.createElement('div');
    bannerContainer.id = 'groups-organize-banner';
    bannerContainer.className = 'circles-organize-banner';
    bannerContainer.innerHTML = `
      <div class="circles-organize-banner__content">
        <div class="circles-organize-banner__icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
        </div>
        <div class="circles-organize-banner__text">
          <strong>${ungroupedCount} contact${ungroupedCount === 1 ? '' : 's'}</strong> not in any group — Organize now
        </div>
        <button class="circles-organize-banner__button accent" id="organize-groups-btn">Organize Groups</button>
      </div>
    `;

    const groupsList = document.getElementById('groups-list');
    if (groupsList) groupsTab.insertBefore(bannerContainer, groupsList);
    else groupsTab.prepend(bannerContainer);

    const organizeBtn = document.getElementById('organize-groups-btn');
    if (organizeBtn) {
      organizeBtn.addEventListener('click', () => { openManageCirclesFromDirectory('groups'); });
    }
  } catch (error) {
    console.error('[Groups] Error rendering groups banner:', error);
  } finally {
    _groupsBannerRendering = false;
  }
}

async function loadGroupsManagement() {
  if (!contacts || contacts.length === 0) await loadContacts();
  if (typeof window.initializeStep3Handler === 'function') await window.initializeStep3Handler();
  await renderGroupsBanner();
  await loadGroupsList();
  await loadGroupMappingsSection();
}

async function loadTagsManagement() {
  if (!contacts || contacts.length === 0) await loadContacts();
  await loadTags();
}

async function loadGroupMappingsSection() {
  if (typeof loadAllGroupMappings !== 'function') return;
  const authToken = _authToken();
  try {
    const statusResponse = await fetch(`${API_BASE}/contacts/oauth/status`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (!statusResponse.ok) return;
    const status = await statusResponse.json();
    if (!status.connected) return;
    await loadAllGroupMappings();
  } catch (error) {
    console.error('Error loading group mappings section:', error);
  }
}

async function loadGroupsList() {
  const container = document.getElementById('groups-list');
  if (!container) return;
  container.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>Loading groups...</p></div>';

  const userId = _userId();
  const authToken = _authToken();

  try {
    const response = await fetchWithRetry(`${API_BASE}/groups-tags/groups?userId=${userId}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (!response.ok) throw new Error('Failed to load groups');
    allGroups = await response.json();

    if (typeof renderGroupsTable === 'function') {
      renderGroupsTable(allGroups, contacts);
    } else {
      renderGroupsList(allGroups);
    }
  } catch (error) {
    console.error('Error loading groups:', error);
    container.innerHTML = `<div class="error-state"><h3>Failed to load groups</h3><p>${escapeHtml(error.message)}</p><button onclick="loadGroupsList()" class="retry-btn">Retry</button></div>`;
  }
}

function renderGroupsList(groupsList) {
  const container = document.getElementById('groups-list');
  if (!container) return;
  if (groupsList.length === 0) {
    container.innerHTML = '<div class="empty-state"><h3>No groups yet</h3><p>Create your first group to organize contacts</p></div>';
    return;
  }
  container.innerHTML = groupsList
    .map(
      (group) => `
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
      </div>`
    )
    .join('');
}

// ---------------------------------------------------------------------------
// Tags management
// ---------------------------------------------------------------------------

async function loadTags() {
  const container = document.getElementById('tags-list');
  if (!container) return;
  container.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>Loading tags...</p></div>';

  const authToken = _authToken();

  try {
    const response = await fetchWithRetry(`${API_BASE}/groups-tags/tags`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (!response.ok) throw new Error('Failed to load tags');
    allTags = await response.json();

    if (typeof renderTagsTable === 'function') {
      renderTagsTable(allTags, contacts);
    } else {
      renderTags(allTags);
    }
  } catch (error) {
    console.error('Error loading tags:', error);
    container.innerHTML = `<div class="error-state"><h3>Failed to load tags</h3><p>${escapeHtml(error.message)}</p><button onclick="loadTags()" class="retry-btn">Retry</button></div>`;
  }
}

function renderTags(tagsList) {
  const container = document.getElementById('tags-list');
  if (!container) return;
  if (tagsList.length === 0) {
    container.innerHTML = '<div class="empty-state"><h3>No tags yet</h3><p>Create your first tag to label contacts</p></div>';
    return;
  }
  container.innerHTML = tagsList
    .map(
      (tag) => `
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
      </div>`
    )
    .join('');
}

// ---------------------------------------------------------------------------
// Circles visualization
// ---------------------------------------------------------------------------

function handleCircleContactClick(data) {
  const { contactId } = data;
  if (contactId) editContact(contactId);
}

async function openManageCirclesFlow() {
  try {
    const existingOverlay = document.querySelector('.manage-circles-overlay');
    if (existingOverlay || window.isOpeningManageCircles) return;
    window.isOpeningManageCircles = true;

    if (typeof ManageCirclesFlow === 'undefined') {
      showToast('Manage Circles feature is not available', 'error');
      window.isOpeningManageCircles = false;
      return;
    }

    await loadContacts();
    const currentAssignments = {};
    contacts.forEach((c) => { if (c.circle) currentAssignments[c.id] = c.circle; });

    const manageCirclesFlow = new ManageCirclesFlow(contacts, currentAssignments, {
      isOnboarding: false,
      onSave: async () => {
        showToast('Circle assignments saved successfully', 'success');
        await loadCirclesVisualization();
      },
      onSkip: () => {},
      onClose: () => { loadCirclesVisualization(); },
    });
    manageCirclesFlow.mount();
    setTimeout(() => { window.isOpeningManageCircles = false; }, 1000);
  } catch (error) {
    console.error('Error opening Manage Circles flow:', error);
    showToast('Failed to open Manage Circles', 'error');
    window.isOpeningManageCircles = false;
  }
}

async function openManageCirclesFromDirectory(entryContext = 'circles') {
  try {
    const existingOverlay = document.querySelector('.manage-circles-overlay');
    const existingFlowContainer = document.getElementById('onboarding-flow-container');
    if (existingOverlay || existingFlowContainer) return;
    window.isOpeningManageCircles = false;

    if (typeof Step2CirclesHandler === 'undefined') {
      showToast('Circle assignment feature is not available', 'error');
      return;
    }

    await loadContacts();
    const savedState =
      typeof OnboardingStepIndicator !== 'undefined'
        ? OnboardingStepIndicator.loadState()
        : { currentStep: 2, isComplete: false };

    const handler = new Step2CirclesHandler(savedState || { currentStep: 2, isComplete: false });
    await handler.openManageCirclesFlow(entryContext);
  } catch (error) {
    console.error('Error opening Manage Circles from Directory:', error);
    showToast('Failed to open circle assignment', 'error');
    window.isOpeningManageCircles = false;
  }
}

async function loadCirclesVisualization() {
  const container = document.getElementById('circles-visualizer-container');
  if (!container) return;

  container.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>Loading circles visualization...</p></div>';

  const userId = _userId();
  const authToken = _authToken();

  try {
    await loadContacts();
    if (typeof window.initializeStep2Handler === 'function') window.initializeStep2Handler();

    if (groups.length === 0) {
      const gr = await fetch(`${API_BASE}/contacts/groups?userId=${userId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (gr.ok) groups = await gr.json();
    }

    const uncategorizedCount = contacts.filter(
      (c) =>
        (!c.circle || c.circle === 'uncategorized') &&
        (!c.dunbarCircle || c.dunbarCircle === 'uncategorized')
    ).length;

    if (typeof CircularVisualizer !== 'undefined') {
      container.innerHTML = '';

      // Uncategorized banner
      if (uncategorizedCount > 0) {
        const bannerContainer = document.createElement('div');
        bannerContainer.className = 'circles-organize-banner';
        bannerContainer.innerHTML = `
          <div class="circles-organize-banner__content">
            <div class="circles-organize-banner__icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
              </svg>
            </div>
            <div class="circles-organize-banner__text">
              <strong>${uncategorizedCount} contact${uncategorizedCount === 1 ? '' : 's'}</strong> not in any circle — Organize now
            </div>
            <button class="circles-organize-banner__button accent" id="continue-organizing-btn">Organize Circles</button>
          </div>
        `;
        container.appendChild(bannerContainer);
        const continueBtn = document.getElementById('continue-organizing-btn');
        if (continueBtn) continueBtn.addEventListener('click', () => { openManageCirclesFromDirectory(); });
      }

      // SearchFilterBar
      const searchFilterContainer = document.createElement('div');
      searchFilterContainer.id = 'circles-search-filter-container';
      searchFilterContainer.style.marginBottom = '16px';
      container.appendChild(searchFilterContainer);

      let filteredContacts = [...contacts];

      if (typeof SearchFilterBar !== 'undefined') {
        const circlesSearchFilter = new SearchFilterBar(searchFilterContainer, {
          placeholder: 'Search contacts or use filters (tag:, group:, location:, source:)',
          mode: 'visualizer',
          visibleFilters: ['tag', 'group', 'frequency', 'location', 'source'],
          data: contacts,
          onFetchTags: () => getAvailableTags(),
          onFetchGroups: () => groups,
          onGetLocations: () => {
            const locs = [...new Set(contacts.map((c) => c.location).filter(Boolean))];
            return locs.sort();
          },
          onFilteredData: (filtered) => {
            filteredContacts = filtered;
            if (circlesVisualizer) circlesVisualizer.render(filteredContacts, groups);
          },
        });
        circlesSearchFilter.render();
        window.circlesSearchFilter = circlesSearchFilter;
      }

      // Controls row
      const controlsRow = document.createElement('div');
      controlsRow.className = 'circles-controls-row';
      controlsRow.innerHTML = `
        <div class="circles-legend">
          <div class="legend-item legend-item--clickable legend-item--active" data-circle="inner"><span class="legend-dot" style="background:#8b5cf6;"></span><span class="legend-label">Inner Circle</span><span class="legend-count" id="inner-count">0/10</span></div>
          <div class="legend-item legend-item--clickable legend-item--active" data-circle="close"><span class="legend-dot" style="background:#3b82f6;"></span><span class="legend-label">Close Friends</span><span class="legend-count" id="close-count">0/25</span></div>
          <div class="legend-item legend-item--clickable legend-item--active" data-circle="active"><span class="legend-dot" style="background:#10b981;"></span><span class="legend-label">Active Friends</span><span class="legend-count" id="active-count">0/50</span></div>
          <div class="legend-item legend-item--clickable legend-item--active" data-circle="casual"><span class="legend-dot" style="background:#f59e0b;"></span><span class="legend-label">Casual Network</span><span class="legend-count" id="casual-count">0/100</span></div>
        </div>
        <button id="manage-circles-btn" class="accent" onclick="openManageCirclesFromDirectory()" style="padding:10px 20px;font-size:14px;">Manage Circles</button>
      `;
      container.appendChild(controlsRow);

      // Zoom controls
      const zoomRow = document.createElement('div');
      zoomRow.className = 'circles-zoom-row';
      zoomRow.innerHTML = `
        <div class="circles-zoom-controls" id="circles-zoom-controls">
          <button class="zoom-btn" id="circles-zoom-in" title="Zoom In">+</button>
          <span class="zoom-level" id="circles-zoom-level">100%</span>
          <button class="zoom-btn" id="circles-zoom-out" title="Zoom Out">−</button>
          <button class="zoom-btn" id="circles-zoom-reset" title="Reset Zoom">↺</button>
        </div>
      `;
      container.appendChild(zoomRow);

      // Legend toggle logic
      let visibleCircles = new Set(['inner', 'close', 'active', 'casual']);
      controlsRow.querySelectorAll('.legend-item--clickable').forEach((item) => {
        item.addEventListener('click', () => {
          const circle = item.dataset.circle;
          if (visibleCircles.has(circle)) {
            if (visibleCircles.size === 1) {
              visibleCircles = new Set(['inner', 'close', 'active', 'casual']);
              controlsRow.querySelectorAll('.legend-item--clickable').forEach((i) => i.classList.add('legend-item--active'));
            } else {
              visibleCircles.delete(circle);
              item.classList.remove('legend-item--active');
            }
          } else {
            visibleCircles.add(circle);
            item.classList.add('legend-item--active');
          }
          if (circlesVisualizer) circlesVisualizer.setVisibleCircles(Array.from(visibleCircles));
        });
      });

      // Update legend counts
      const circleCounts = {
        inner: contacts.filter((c) => c.circle === 'inner' || c.dunbarCircle === 'inner').length,
        close: contacts.filter((c) => c.circle === 'close' || c.dunbarCircle === 'close').length,
        active: contacts.filter((c) => c.circle === 'active' || c.dunbarCircle === 'active').length,
        casual: contacts.filter((c) => c.circle === 'casual' || c.dunbarCircle === 'casual').length,
      };
      document.getElementById('inner-count').textContent = `${circleCounts.inner}/10`;
      document.getElementById('close-count').textContent = `${circleCounts.close}/25`;
      document.getElementById('active-count').textContent = `${circleCounts.active}/50`;
      document.getElementById('casual-count').textContent = `${circleCounts.casual}/100`;

      // Visualizer
      const visualizerDiv = document.createElement('div');
      visualizerDiv.id = 'circles-visualizer';
      visualizerDiv.style.width = '100%';
      container.appendChild(visualizerDiv);

      circlesVisualizer = new CircularVisualizer('circles-visualizer');

      // Wire zoom controls
      const zoomInBtn = document.getElementById('circles-zoom-in');
      const zoomOutBtn = document.getElementById('circles-zoom-out');
      const zoomResetBtn = document.getElementById('circles-zoom-reset');
      const zoomLevelDisplay = document.getElementById('circles-zoom-level');
      if (zoomInBtn) zoomInBtn.addEventListener('click', () => { circlesVisualizer.zoomIn(); zoomLevelDisplay.textContent = Math.round(circlesVisualizer.zoomLevel * 100) + '%'; });
      if (zoomOutBtn) zoomOutBtn.addEventListener('click', () => { circlesVisualizer.zoomOut(); zoomLevelDisplay.textContent = Math.round(circlesVisualizer.zoomLevel * 100) + '%'; });
      if (zoomResetBtn) zoomResetBtn.addEventListener('click', () => { circlesVisualizer.resetZoom(); zoomLevelDisplay.textContent = '100%'; });

      circlesVisualizer.render(contacts, groups);
      circlesVisualizer.on('contactClick', handleCircleContactClick);
    } else {
      container.innerHTML = `
        <div class="empty-state">
          <h3>Circles Visualization</h3>
          <p>The circles visualization shows your contacts organized by relationship tier.</p>
          <p>Use the "Manage Circles" button to assign contacts to circles.</p>
        </div>
      `;
    }
  } catch (error) {
    console.error('Error loading circles visualization:', error);
    container.innerHTML = `
      <div class="error-state">
        <h3>Failed to load circles</h3>
        <p>${escapeHtml(error.message)}</p>
        <button onclick="loadCirclesVisualization()" class="retry-btn">Retry</button>
      </div>
    `;
  }
}

// ---------------------------------------------------------------------------
// Archived contacts
// ---------------------------------------------------------------------------

async function loadArchivedContacts() {
  const container = document.getElementById('archived-contacts-list');
  if (!container) return;

  container.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>Loading archived contacts...</p></div>';

  try {
    if (!archivedContactsView) {
      archivedContactsView = new ArchivedContactsView(container, {
        onRestore: () => {
          if (currentDirectoryTab === 'contacts') loadContacts();
          updateArchivedCountBadge();
        },
        onBulkRestore: () => {
          if (currentDirectoryTab === 'contacts') loadContacts();
          updateArchivedCountBadge();
        },
      });
    }
    await archivedContactsView.loadArchivedContacts();
    updateArchivedCountBadge();
  } catch (error) {
    console.error('Error loading archived contacts:', error);
    container.innerHTML = `
      <div class="error-state">
        <p>Failed to load archived contacts</p>
        <button onclick="loadArchivedContacts()">Retry</button>
      </div>
    `;
  }
}

async function updateArchivedCountBadge() {
  try {
    const token = _authToken();
    if (!token) return;

    const response = await fetch('/api/contacts/archived', {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
    if (response.ok) {
      const result = await response.json();
      const count = result.count || 0;
      window.archivedContactsCount = count;
      const badge = document.getElementById('archived-count-badge');
      if (badge) badge.style.display = 'none';
    }
  } catch (error) {
    console.error('Error updating archived count badge:', error);
  }
}

// ---------------------------------------------------------------------------
// Badge counts
// ---------------------------------------------------------------------------

async function loadPendingEditsCount() {
  const authToken = _authToken();
  const userId = _userId();
  try {
    const response = await fetch(`${API_BASE}/edits/pending`, {
      headers: { Authorization: `Bearer ${authToken}`, 'x-user-id': userId },
    });
    if (response.ok) {
      const data = await response.json();
      const count = (data.edits || []).length;
      updatePendingEditCounts(count);
    }
  } catch (error) {
    console.error('Error loading pending edits count:', error);
  }
}

function updatePendingEditCounts(count) {
  const badge = document.getElementById('edits-badge');
  if (badge) {
    if (count > 0) { badge.textContent = count > 99 ? '99+' : count; badge.classList.remove('hidden'); }
    else badge.classList.add('hidden');
  }
  const mobileBadge = document.getElementById('mobile-edits-badge');
  if (mobileBadge) {
    if (count > 0) { mobileBadge.textContent = count > 99 ? '99+' : count; mobileBadge.classList.remove('hidden'); }
    else mobileBadge.classList.add('hidden');
  }
}

async function loadPendingSuggestionsCount() {
  const authToken = _authToken();
  const userId = _userId();
  try {
    const response = await fetch(`${API_BASE}/suggestions/all?userId=${userId}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (response.ok) {
      const suggestions = await response.json();
      const pendingCount = suggestions.filter((s) => s.status === 'pending').length;
      updatePendingSuggestionsCount(pendingCount);
    }
  } catch (error) {
    console.error('Error loading pending suggestions count:', error);
  }
}

function updatePendingSuggestionsCount(count) {
  const badge = document.getElementById('suggestions-badge');
  if (badge) {
    if (count > 0) { badge.textContent = count > 99 ? '99+' : count; badge.classList.remove('hidden'); }
    else badge.classList.add('hidden');
  }
  const mobileBadge = document.getElementById('mobile-suggestions-badge');
  if (mobileBadge) {
    if (count > 0) { mobileBadge.textContent = count > 99 ? '99+' : count; mobileBadge.classList.remove('hidden'); }
    else mobileBadge.classList.add('hidden');
  }
}

async function loadUncategorizedCount() {
  const authToken = _authToken();
  const userId = _userId();
  try {
    const response = await fetch(`${API_BASE}/contacts?userId=${userId}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (response.ok) {
      const allContacts = await response.json();
      const uncategorized = allContacts.filter((c) => !c.circle && !c.dunbarCircle);
      updateUncategorizedCount(uncategorized.length);
    }
  } catch (error) {
    console.error('Error loading uncategorized count:', error);
  }
}

function updateUncategorizedCount(count) {
  window.uncategorizedContactsCount = count;
  const directoryTab = document.querySelector('[data-tab="circles"]');
  if (directoryTab) {
    const badge = directoryTab.querySelector('.tab-badge');
    if (badge) badge.remove();
  }
}

// ---------------------------------------------------------------------------
// Register page with app-shell
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Enrichment columns — health indicator, last interaction, source icons
// ---------------------------------------------------------------------------

/** Compute health indicator color based on frequency preference and last interaction. */
function getHealthIndicator(contact) {
  if (!contact.frequencyPreference || !contact.lastContactDate) return { color: '#9ca3af', label: 'No data' };

  const freqDays = { daily: 1, weekly: 7, biweekly: 14, monthly: 30, quarterly: 90 };
  const windowDays = freqDays[contact.frequencyPreference] || 30;
  const daysSince = Math.floor((Date.now() - new Date(contact.lastContactDate).getTime()) / 86400000);

  if (daysSince <= windowDays) return { color: '#10b981', label: 'On track' };
  if (daysSince <= windowDays * 1.5) return { color: '#f59e0b', label: 'Attention' };
  return { color: '#ef4444', label: 'Overdue' };
}

/** Render platform source icons for a contact. */
function renderSourceIcons(contact) {
  const sources = contact.sources || (contact.source ? [contact.source] : []);
  const labels = { google: 'G', apple: 'A', whatsapp: 'WA', instagram: 'IG', facebook: 'FB', twitter: 'X', google_messages: 'SMS', chat_import: 'Chat', voice_note: 'Voice', calendar: 'Cal' };
  const colors = { google: '#4285f4', apple: '#555', whatsapp: '#25d366', instagram: '#e1306c', facebook: '#1877f2', twitter: '#1da1f2', google_messages: '#1a73e8', chat_import: '#f59e0b', voice_note: '#10b981', calendar: '#ea4335' };
  return sources.map(s => `<span class="source-pill" style="background:${colors[s] || '#78716c'};" title="${escapeHtml(s)}">${labels[s] || s.charAt(0).toUpperCase()}</span>`).join(' ');
}

// ---------------------------------------------------------------------------
// Multi-select and bulk operations
// ---------------------------------------------------------------------------

let selectedContactIds = new Set();
let multiSelectMode = false;

function toggleMultiSelect() {
  multiSelectMode = !multiSelectMode;
  selectedContactIds.clear();
  renderBulkToolbar();
  // Re-render contacts to show/hide checkboxes
  if (typeof renderContactsTable === 'function') {
    renderContactsTable(contacts);
  } else {
    renderContacts(contacts);
  }
}

function toggleContactSelection(contactId) {
  if (selectedContactIds.has(contactId)) {
    selectedContactIds.delete(contactId);
  } else {
    selectedContactIds.add(contactId);
  }
  renderBulkToolbar();
}

function renderBulkToolbar() {
  let toolbar = document.getElementById('bulk-action-toolbar');
  if (!multiSelectMode || selectedContactIds.size === 0) {
    if (toolbar) toolbar.remove();
    return;
  }

  if (!toolbar) {
    toolbar = document.createElement('div');
    toolbar.id = 'bulk-action-toolbar';
    toolbar.style.cssText = 'position:sticky;top:0;z-index:50;background:var(--bg-primary);border:1px solid var(--border-primary);border-radius:8px;padding:10px 16px;margin-bottom:12px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;';
    const contactsList = document.getElementById('contacts-list');
    if (contactsList) contactsList.parentNode.insertBefore(toolbar, contactsList);
  }

  toolbar.innerHTML = `
    <span style="font-size:13px;font-weight:600;color:var(--text-primary);">${selectedContactIds.size} selected</span>
    <button class="btn-secondary" style="font-size:12px;padding:6px 12px;" onclick="window.bulkAction('archive')">Archive</button>
    <button class="btn-secondary" style="font-size:12px;padding:6px 12px;" onclick="window.bulkAction('add_tag')">Add Tag</button>
    <button class="btn-secondary" style="font-size:12px;padding:6px 12px;" onclick="window.bulkAction('assign_group')">Assign Group</button>
    <button class="btn-secondary" style="font-size:12px;padding:6px 12px;" onclick="window.bulkAction('assign_circle')">Assign Circle</button>
    <button class="btn-secondary" style="font-size:12px;padding:6px 12px;" onclick="window.toggleMultiSelect()">Cancel</button>
  `;
}

async function bulkAction(operation) {
  if (selectedContactIds.size === 0) return;

  const contactIds = Array.from(selectedContactIds);
  let params = {};

  if (operation === 'add_tag') {
    const tag = prompt('Enter tag name:');
    if (!tag) return;
    params = { tag };
  } else if (operation === 'assign_group') {
    const groupName = prompt('Enter group name:');
    if (!groupName) return;
    params = { groupName };
  } else if (operation === 'assign_circle') {
    const circle = prompt('Enter circle (inner, close, active, casual):');
    if (!circle) return;
    params = { circle };
  }

  try {
    const response = await fetchWithAuth(`${API_BASE}/contacts/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contactIds, operation, params }),
    });

    if (response.ok) {
      showToast(`Bulk ${operation} applied to ${contactIds.length} contacts`, 'success');
      selectedContactIds.clear();
      multiSelectMode = false;
      renderBulkToolbar();
      loadContacts();
    } else {
      const err = await response.json().catch(() => ({}));
      showToast(err.error || 'Bulk operation failed', 'error');
    }
  } catch (e) {
    showToast('Bulk operation failed', 'error');
  }
}

// ---------------------------------------------------------------------------
// Source filter
// ---------------------------------------------------------------------------

function filterBySource(source) {
  currentContactFilter = source;
  searchContacts();
}

// ---------------------------------------------------------------------------
// Pending enrichments badge
// ---------------------------------------------------------------------------

async function loadPendingEnrichmentsCount() {
  try {
    const response = await fetchWithAuth(`${API_BASE}/enrichments/pending`);
    if (response.ok) {
      const data = await response.json();
      const items = Array.isArray(data) ? data : (data.items || []);
      const count = items.filter(i => i.status === 'pending').length;
      const badge = document.getElementById('pending-enrichments-badge');
      if (badge) {
        badge.textContent = count;
        badge.style.display = count > 0 ? 'inline-block' : 'none';
      }
    }
  } catch (e) { /* silent */ }
}

// ---------------------------------------------------------------------------
// Pending enrichment review UI (Task 30.2)
// ---------------------------------------------------------------------------

let pendingEnrichments = [];

async function loadPendingEnrichments() {
  const container = document.getElementById('contacts-list');
  if (!container) return;

  container.innerHTML = `<div class="loading-state"><div class="spinner"></div><p>Loading pending enrichments...</p></div>`;

  try {
    const response = await fetchWithAuth(`${API_BASE}/enrichments/pending`);
    if (!response.ok) throw new Error('Failed to load');
    const data = await response.json();
    pendingEnrichments = Array.isArray(data) ? data : (data.items || []);
    renderPendingEnrichments(pendingEnrichments.filter(e => e.status === 'pending'));
  } catch (error) {
    showError('contacts-list', 'Failed to load pending enrichments');
  }
}

function renderPendingEnrichments(items) {
  const container = document.getElementById('contacts-list');
  if (!container) return;

  if (items.length === 0) {
    container.innerHTML = `<div class="empty-state"><h3>No pending enrichments</h3><p>All enrichments have been resolved</p></div>`;
    return;
  }

  // Group by import
  const grouped = {};
  items.forEach(item => {
    const key = item.importRecordId || item.import_record_id || 'unknown';
    if (!grouped[key]) grouped[key] = { platform: item.platform, items: [] };
    grouped[key].items.push(item);
  });

  let html = `<div style="margin-bottom:12px;"><button class="btn-secondary" onclick="window.loadContacts()" style="font-size:12px;">← Back to Contacts</button></div>`;

  Object.entries(grouped).forEach(([importId, group]) => {
    html += `
      <div style="margin-bottom:20px;">
        <h3 style="font-size:14px;color:var(--text-secondary);margin-bottom:8px;">${escapeHtml(group.platform || 'Unknown')} Import</h3>
        ${group.items.map(item => {
          const name = item.participantDisplayName || item.participant_display_name || item.participantIdentifier || item.participant_identifier || 'Unknown';
          const msgCount = item.messageCount || item.message_count || 0;
          const topics = item.topics || [];
          const sentiment = item.sentiment;

          return `
            <div class="card" style="margin-bottom:8px;">
              <div style="display:flex;justify-content:space-between;align-items:start;flex-wrap:wrap;gap:8px;">
                <div style="flex:1;min-width:200px;">
                  <h4 style="margin:0 0 4px 0;color:var(--text-primary);">${escapeHtml(name)}</h4>
                  <div style="font-size:12px;color:var(--text-secondary);">
                    ${msgCount} messages · ${escapeHtml(item.platform || '')}
                    ${item.firstMessageDate || item.first_message_date ? ` · ${new Date(item.firstMessageDate || item.first_message_date).toLocaleDateString()} — ${new Date(item.lastMessageDate || item.last_message_date).toLocaleDateString()}` : ''}
                  </div>
                  ${topics.length > 0 ? `<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:6px;">${topics.slice(0, 3).map(t => `<span class="tag-badge">${escapeHtml(typeof t === 'string' ? t : '')}</span>`).join('')}</div>` : ''}
                  ${sentiment ? `<div style="margin-top:4px;font-size:12px;">Sentiment: ${sentiment === 'positive' ? '😊' : sentiment === 'negative' ? '😟' : '😐'} ${escapeHtml(sentiment)}</div>` : ''}
                </div>
                <div style="display:flex;gap:6px;flex-shrink:0;">
                  <button class="btn-primary" style="font-size:11px;padding:4px 10px;" onclick="window.linkPendingEnrichment('${item.id}')">Link to Contact</button>
                  <button class="btn-secondary" style="font-size:11px;padding:4px 10px;" onclick="window.createFromPending('${item.id}')">Create Contact</button>
                  <button class="btn-secondary" style="font-size:11px;padding:4px 10px;" onclick="window.dismissPendingEnrichment('${item.id}')">Dismiss</button>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  });

  container.innerHTML = html;
}

async function linkPendingEnrichment(enrichmentId) {
  const contactName = prompt('Search for contact (enter name):');
  if (!contactName) return;

  const match = contacts.find(c => c.name.toLowerCase().includes(contactName.toLowerCase()));
  if (!match) { showToast('No matching contact found', 'error'); return; }

  try {
    const response = await fetchWithAuth(`${API_BASE}/enrichments/pending/${enrichmentId}/link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contactId: match.id }),
    });
    if (response.ok) { showToast(`Linked to ${match.name}`, 'success'); loadPendingEnrichments(); }
    else { showToast('Failed to link', 'error'); }
  } catch (e) { showToast('Failed to link', 'error'); }
}

async function createFromPending(enrichmentId) {
  try {
    const response = await fetchWithAuth(`${API_BASE}/enrichments/pending/${enrichmentId}/create-contact`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
    });
    if (response.ok) { showToast('Contact created', 'success'); loadPendingEnrichments(); }
    else { showToast('Failed to create contact', 'error'); }
  } catch (e) { showToast('Failed to create contact', 'error'); }
}

async function dismissPendingEnrichment(enrichmentId) {
  try {
    const response = await fetchWithAuth(`${API_BASE}/enrichments/pending/${enrichmentId}/dismiss`, { method: 'POST' });
    if (response.ok) { showToast('Dismissed', 'success'); loadPendingEnrichments(); }
    else { showToast('Failed to dismiss', 'error'); }
  } catch (e) { showToast('Failed to dismiss', 'error'); }
}

// ---------------------------------------------------------------------------
// Match review UI (Task 30.3)
// ---------------------------------------------------------------------------

async function loadMatchReview(importId) {
  const container = document.getElementById('contacts-list');
  if (!container) return;

  container.innerHTML = `<div class="loading-state"><div class="spinner"></div><p>Loading matches...</p></div>`;

  try {
    const response = await fetchWithAuth(`${API_BASE}/imports/${importId}/matches`);
    if (!response.ok) throw new Error('Failed to load');
    const data = await response.json();
    const matches = Array.isArray(data) ? data : (data.matches || []);
    renderMatchReview(matches);
  } catch (error) {
    showError('contacts-list', 'Failed to load matches');
  }
}

function renderMatchReview(matches) {
  const container = document.getElementById('contacts-list');
  if (!container) return;

  if (matches.length === 0) {
    container.innerHTML = `<div class="empty-state"><h3>No matches to review</h3><p>All matches have been resolved</p></div>`;
    return;
  }

  let html = `<div style="margin-bottom:12px;"><button class="btn-secondary" onclick="window.loadContacts()" style="font-size:12px;">← Back to Contacts</button></div>`;

  html += matches.map(match => {
    const participantName = match.participantDisplayName || match.participant_display_name || match.participantIdentifier || 'Unknown';
    const suggestedName = match.suggestedContactName || match.contactName || 'Unknown';
    const confidence = match.confidence ? Math.round(match.confidence * 100) : 0;
    const reason = match.matchReason || match.match_reason || '';
    const msgCount = match.messageCount || match.message_count || 0;
    const isHighFreq = match.smartSuggestion || false;

    return `
      <div class="card" style="margin-bottom:8px;">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
          <div style="flex:1;min-width:200px;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
              <strong style="color:var(--text-primary);">${escapeHtml(participantName)}</strong>
              <span style="color:var(--text-tertiary);">→</span>
              <strong style="color:var(--color-primary);">${escapeHtml(suggestedName)}</strong>
              <span style="font-size:11px;color:var(--text-secondary);background:var(--bg-secondary);padding:2px 6px;border-radius:4px;">${confidence}%</span>
            </div>
            <div style="font-size:12px;color:var(--text-secondary);">${escapeHtml(reason)}</div>
            ${isHighFreq ? `<div style="font-size:12px;color:var(--color-warning);margin-top:4px;">⚡ ${escapeHtml(participantName)} sent you ${msgCount} messages — create a contact or link to someone?</div>` : ''}
          </div>
          <div style="display:flex;gap:6px;flex-shrink:0;">
            <button class="btn-primary" style="font-size:11px;padding:4px 10px;" onclick="window.confirmMatch('${match.id}')">Confirm</button>
            <button class="btn-secondary" style="font-size:11px;padding:4px 10px;" onclick="window.rejectMatch('${match.id}')">Reject</button>
            <button class="btn-secondary" style="font-size:11px;padding:4px 10px;" onclick="window.skipMatch('${match.id}')">Skip</button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = html;
}

async function confirmMatch(matchId) {
  try {
    const response = await fetchWithAuth(`${API_BASE}/imports/matches/${matchId}/confirm`, { method: 'POST' });
    if (response.ok) { showToast('Match confirmed', 'success'); }
    else { showToast('Failed', 'error'); }
  } catch (e) { showToast('Failed', 'error'); }
}

async function rejectMatch(matchId) {
  try {
    const response = await fetchWithAuth(`${API_BASE}/imports/matches/${matchId}/reject`, { method: 'POST' });
    if (response.ok) { showToast('Match rejected', 'success'); }
    else { showToast('Failed', 'error'); }
  } catch (e) { showToast('Failed', 'error'); }
}

async function skipMatch(matchId) {
  try {
    const response = await fetchWithAuth(`${API_BASE}/imports/matches/${matchId}/skip`, { method: 'POST' });
    if (response.ok) { showToast('Match skipped', 'success'); }
    else { showToast('Failed', 'error'); }
  } catch (e) { showToast('Failed', 'error'); }
}

registerPage('directory', { load: loadDirectory });

// ---------------------------------------------------------------------------
// Listen for custom events from app-shell
// ---------------------------------------------------------------------------

window.addEventListener('app:switchDirectoryTab', (event) => {
  const tab = event.detail && event.detail.tab;
  if (tab && ['contacts', 'circles', 'groups', 'tags', 'archived'].includes(tab)) {
    switchDirectoryTab(tab);
  }
});

window.addEventListener('app:ready', () => {
  loadPendingEditsCount();
  loadPendingSuggestionsCount();
  loadUncategorizedCount();
});

// ---------------------------------------------------------------------------
// Expose all functions on window for backward compatibility with onclick
// ---------------------------------------------------------------------------

// Core directory
window.loadDirectory = loadDirectory;
window.switchDirectoryTab = switchDirectoryTab;

// Contacts
window.loadContacts = loadContacts;
window.renderContacts = renderContacts;
window.searchContacts = searchContacts;
window.filterContactsBySource = filterContactsBySource;

// Contact CRUD
window.showAddContactModal = showAddContactModal;
window.editContact = editContact;
window.closeContactModal = closeContactModal;
window.saveContact = saveContact;
window.deleteContact = deleteContact;

// Tag/group sync
window.syncContactTags = syncContactTags;
window.syncContactGroups = syncContactGroups;

// Tag/group UI in contact modal
window.populateGroupDropdown = populateGroupDropdown;
window.renderContactTags = renderContactTags;
window.renderContactGroups = renderContactGroups;
window.addTagToContact = addTagToContact;
window.removeTagFromContact = removeTagFromContact;
window.assignGroupToContact = assignGroupToContact;
window.removeGroupFromContact = removeGroupFromContact;

// Groups management
window.loadGroupsTagsManagement = loadGroupsTagsManagement;
window.loadGroupsManagement = loadGroupsManagement;
window.loadTagsManagement = loadTagsManagement;
window.loadGroupsList = loadGroupsList;
window.renderGroupsList = renderGroupsList;
window.loadGroupMappingsSection = loadGroupMappingsSection;

// Tags management
window.loadTags = loadTags;
window.loadTagsList = loadTags; // backward compat alias
window.renderTags = renderTags;
window.renderTagsList = renderTags; // backward compat alias

// Circles
window.loadCirclesVisualization = loadCirclesVisualization;
window.handleCircleContactClick = handleCircleContactClick;
window.openManageCirclesFlow = openManageCirclesFlow;
window.openManageCirclesFromDirectory = openManageCirclesFromDirectory;

// Archived
window.loadArchivedContacts = loadArchivedContacts;
window.updateArchivedCountBadge = updateArchivedCountBadge;

// Test data
window.seedTestData = seedTestData;
window.clearTestData = clearTestData;

// Helpers
window.getCircleInfo = getCircleInfo;
window.showError = showError;
window.showModalError = showModalError;
window.getAvailableTags = getAvailableTags;
window.getUniqueLocations = getUniqueLocations;

// Badge updates
window.loadPendingEditsCount = loadPendingEditsCount;
window.updatePendingEditCounts = updatePendingEditCounts;
window.loadPendingSuggestionsCount = loadPendingSuggestionsCount;
window.updatePendingSuggestionsCount = updatePendingSuggestionsCount;
window.loadUncategorizedCount = loadUncategorizedCount;
window.updateUncategorizedCount = updateUncategorizedCount;

// Fetch helpers (used by groups/tags management modals in app.js)
window.fetchWithRetry = fetchWithRetry;
window.executeWithConcurrencyControl = executeWithConcurrencyControl;

// Enrichment columns
window.getHealthIndicator = getHealthIndicator;
window.renderSourceIcons = renderSourceIcons;
window.toggleMultiSelect = toggleMultiSelect;
window.toggleContactSelection = toggleContactSelection;
window.bulkAction = bulkAction;
window.filterBySource = filterBySource;
window.loadPendingEnrichmentsCount = loadPendingEnrichmentsCount;

// Pending enrichment review
window.loadPendingEnrichments = loadPendingEnrichments;
window.linkPendingEnrichment = linkPendingEnrichment;
window.createFromPending = createFromPending;
window.dismissPendingEnrichment = dismissPendingEnrichment;

// Match review
window.loadMatchReview = loadMatchReview;
window.confirmMatch = confirmMatch;
window.rejectMatch = rejectMatch;
window.skipMatch = skipMatch;
