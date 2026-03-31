/**
 * Suggestions Page — suggestions list rendering and interaction for CatchUp.
 *
 * Owns: suggestion loading, filtering, rendering, accept/dismiss/snooze
 * actions, group modify menu, contact tooltips on suggestion avatars,
 * and calendar event count display.
 *
 * @module suggestions-page
 */

import {
  escapeHtml,
  showToast,
  hideToast,
  API_BASE,
  formatDateTime,
} from './utils.js';

import {
  registerPage,
  getAuthToken,
  getCurrentUser,
  navigateTo,
} from './app-shell.js';

// ---------------------------------------------------------------------------
// Module-level state
// ---------------------------------------------------------------------------

let suggestions = [];
let allSuggestions = [];
let currentSuggestionFilter = 'all';
let currentGroupModifyMenu = null;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Shorthand for userId from app-shell. */
function _userId() {
  return getCurrentUser().userId;
}

/** Shorthand for authToken from app-shell. */
function _authToken() {
  return getAuthToken();
}

function showError(containerId, message) {
  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = `<div class="error">${escapeHtml(message)}</div>`;
  }
}

// ---------------------------------------------------------------------------
// Load suggestions
// ---------------------------------------------------------------------------

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
    const userId = _userId();
    const authToken = _authToken();
    const url = `${API_BASE}/suggestions/all?userId=${userId}`;

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    if (response.status === 401) {
      if (typeof window.logout === 'function') window.logout();
      return;
    }

    if (!response.ok) throw new Error('Failed to load suggestions');

    allSuggestions = await response.json();

    // Update pending suggestions badge
    const pendingCount = allSuggestions.filter((s) => s.status === 'pending').length;
    if (typeof window.updatePendingSuggestionsCount === 'function') {
      window.updatePendingSuggestionsCount(pendingCount);
    }

    // Apply the current filter
    filterSuggestions(currentSuggestionFilter);
  } catch (error) {
    console.error('Error loading suggestions:', error);
    showError('suggestions-list', 'Failed to load suggestions');
  }
}

// ---------------------------------------------------------------------------
// Filter suggestions
// ---------------------------------------------------------------------------

function filterSuggestions(status) {
  currentSuggestionFilter = status;

  // Update active button state
  document.querySelectorAll('.filter-btn').forEach((btn) => {
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
    suggestions = allSuggestions.filter((s) => s.status === status);
  }

  renderSuggestions(suggestions);
}

// ---------------------------------------------------------------------------
// Enrichment context for suggestion cards (Task 32.1)
// ---------------------------------------------------------------------------

function renderEnrichmentContext(suggestion, contacts) {
  const enrichmentContext = suggestion.enrichmentContext || suggestion.enrichment_context;
  if (!enrichmentContext) return '';

  const parts = [];

  if (enrichmentContext.totalMessages && enrichmentContext.platform && contacts.length > 0) {
    const contactName = contacts[0].name || 'them';
    const platform = enrichmentContext.platform;
    const msgs = enrichmentContext.totalMessages;
    const period = enrichmentContext.period || 'recently';
    const lastContact = enrichmentContext.daysSinceLastContact;

    let text = `You exchanged ${msgs} ${escapeHtml(platform)} messages with ${escapeHtml(contactName)}`;
    if (period) text += ` ${escapeHtml(period)}`;
    if (lastContact) text += `, but haven't talked in ${lastContact} days`;

    parts.push(text);
  }

  if (enrichmentContext.frequencyTrend === 'declining') {
    parts.push('Communication frequency is declining');
  }

  if (enrichmentContext.sentiment === 'negative') {
    parts.push('Recent sentiment trend is negative');
  }

  if (enrichmentContext.topTopics && enrichmentContext.topTopics.length > 0) {
    parts.push(`Common topics: ${enrichmentContext.topTopics.slice(0, 3).map(t => escapeHtml(t)).join(', ')}`);
  }

  if (parts.length === 0) return '';

  return `
    <div style="margin-top:8px;padding:10px;background:var(--status-info-bg);border-radius:8px;border-left:3px solid var(--color-primary);">
      <div style="font-size:12px;font-weight:600;color:var(--text-primary);margin-bottom:4px;">📊 Enrichment Insights</div>
      ${parts.map(p => `<div style="font-size:12px;color:var(--text-secondary);margin-top:2px;">${p}</div>`).join('')}
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Render suggestions
// ---------------------------------------------------------------------------

function renderSuggestions(suggestionsList) {
  const container = document.getElementById('suggestions-list');
  const contacts = window.contacts || [];
  const groups = window.groups || [];

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
    const filterText =
      currentSuggestionFilter === 'all' ? '' : ` with status "${currentSuggestionFilter}"`;
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

  const suggestionsHtml = sortedSuggestions
    .map((suggestion) => {
      const isGroup = suggestion.type === 'group';

      // Get contacts for this suggestion
      let suggestionContacts = [];
      if (isGroup && suggestion.contacts && suggestion.contacts.length > 0) {
        suggestionContacts = suggestion.contacts;
      } else if (suggestion.contactId) {
        const contact = contacts.find((c) => c.id === suggestion.contactId);
        if (contact) {
          suggestionContacts = [contact];
        }
      }

      if (suggestionContacts.length === 0) {
        suggestionContacts = [{ id: 'unknown', name: 'Unknown', groups: [], tags: [] }];
      }

      // Status badge styling — warm tones
      const statusColors = {
        pending: '#f59e0b',
        accepted: '#10b981',
        dismissed: '#78716C',
        snoozed: '#3b82f6',
      };
      const statusColor = statusColors[suggestion.status] || '#78716C';

      // Build contact names display
      let contactNamesHtml = '';
      if (isGroup) {
        const names = suggestionContacts.map((c) => escapeHtml(c.name));
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

      // Build avatars display with warm pastel colors
      let avatarsHtml = '';
      if (isGroup) {
        avatarsHtml = `
          <div class="suggestion-avatars-group" style="display: flex; align-items: center;">
            ${suggestionContacts
              .map((contact, idx) => {
                const initials = contact.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase()
                  .substring(0, 2);
                const warmColors = [
                  { bg: '#d1fae5', text: '#065f46' },
                  { bg: '#fef3c7', text: '#92400e' },
                  { bg: '#fce7f3', text: '#9d174d' },
                  { bg: '#e7e5e4', text: '#44403c' },
                  { bg: '#e9d5ff', text: '#6b21a8' },
                ];
                const colorPair = warmColors[idx % warmColors.length];
                return `
                <div class="suggestion-avatar"
                     style="background: ${colorPair.bg}; color: ${colorPair.text}; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 14px; border: 2px solid var(--bg-surface); z-index: ${10 - idx}; margin-left: ${idx > 0 ? '-12px' : '0'};"
                     data-contact-id="${contact.id}"
                     title="${escapeHtml(contact.name)}">
                  ${initials}
                </div>
              `;
              })
              .join('')}
          </div>
        `;
      } else {
        const initials = suggestionContacts[0].name
          .split(' ')
          .map((n) => n[0])
          .join('')
          .toUpperCase()
          .substring(0, 2);
        avatarsHtml = `
          <div class="suggestion-avatar"
               style="background: #d1fae5; color: #065f46; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 14px;"
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
        let badgeDetails = [];

        if (context.factors.commonGroups && context.factors.commonGroups.length > 0) {
          badgeDetails.push(
            `${context.factors.commonGroups.length} common group${context.factors.commonGroups.length > 1 ? 's' : ''}`
          );
        }
        if (context.factors.sharedTags && context.factors.sharedTags.length > 0) {
          badgeDetails.push(
            `${context.factors.sharedTags.length} shared interest${context.factors.sharedTags.length > 1 ? 's' : ''}`
          );
        }
        if (context.factors.coMentionedInVoiceNotes > 0) {
          badgeDetails.push(
            `mentioned together ${context.factors.coMentionedInVoiceNotes} time${context.factors.coMentionedInVoiceNotes > 1 ? 's' : ''}`
          );
        }

        const badgeText =
          badgeDetails.length > 0 ? `🤝 ${badgeDetails.join(', ')}` : '🤝 Shared Context';

        sharedContextBadge = `
          <div class="shared-context-badge" style="color: var(--text-secondary); font-size: 13px; margin-top: 4px;" title="Shared context score: ${context.score}">
            ${badgeText}
          </div>
        `;
      }

      // Type badge
      const typeBadge = isGroup
        ? '<span class="suggestion-type-badge group-badge-type" style="color: var(--text-secondary); font-size: 12px; font-weight: 500;">Group Catchup</span>'
        : '<span class="suggestion-type-badge individual-badge-type" style="color: var(--text-secondary); font-size: 12px; font-weight: 500;">One-on-One</span>';

      // Actions based on status
      let actions = '';

      if (suggestion.status === 'pending') {
        if (isGroup) {
          actions = `
            <button class="btn-primary" onclick="acceptSuggestion('${suggestion.id}')">Accept Group Catchup</button>
            <button class="btn-secondary" onclick="showGroupModifyMenu('${suggestion.id}', event)">Modify Group ▼</button>
            <button class="btn-secondary" onclick="dismissSuggestion('${suggestion.id}')">Dismiss</button>
          `;
        } else {
          actions = `
            <button class="btn-primary" onclick="acceptSuggestion('${suggestion.id}')">Accept</button>
            <button class="btn-secondary" onclick="dismissSuggestion('${suggestion.id}')">Dismiss</button>
            <button class="btn-secondary" onclick="snoozeSuggestion('${suggestion.id}')">Snooze</button>
          `;
        }
      } else {
        actions = `
          <span style="color: var(--text-secondary); font-size: 13px;">No actions available</span>
        `;
      }

      // Common groups / interests info
      let commonInfoHtml = '';
      if (isGroup && suggestion.sharedContext) {
        const context = suggestion.sharedContext;

        if (context.factors.commonGroups && context.factors.commonGroups.length > 0) {
          commonInfoHtml += `
            <div style="margin-top: 12px;">
              <p style="margin: 0 0 6px 0; color: var(--text-primary);"><strong>Common Groups:</strong></p>
              <div class="contact-groups">
                ${context.factors.commonGroups.map((name) => `<span class="group-badge">${escapeHtml(name)}</span>`).join('')}
              </div>
            </div>
          `;
        }

        if (context.factors.sharedTags && context.factors.sharedTags.length > 0) {
          commonInfoHtml += `
            <div style="margin-top: 12px;">
              <p style="margin: 0 0 6px 0; color: var(--text-primary);"><strong>Shared Interests:</strong></p>
              <div class="contact-tags">
                ${context.factors.sharedTags.map((tag) => `<span class="tag-badge">${escapeHtml(tag)}</span>`).join('')}
              </div>
            </div>
          `;
        }
      } else if (!isGroup) {
        const contact = suggestionContacts[0];

        if (contact && contact.groups && contact.groups.length > 0) {
          const groupNames = contact.groups
            .map((groupId) => {
              const group = groups.find((g) => g.id === groupId);
              return group ? group.name : null;
            })
            .filter((name) => name !== null);

          if (groupNames.length > 0) {
            commonInfoHtml += `
              <div style="margin-top: 12px;">
                <p style="margin: 0 0 6px 0; color: var(--text-primary);"><strong>Member of:</strong></p>
                <div class="contact-groups">
                  ${groupNames.map((name) => `<span class="group-badge">${escapeHtml(name)}</span>`).join('')}
                </div>
              </div>
            `;
          }
        }

        if (contact.tags && contact.tags.length > 0) {
          commonInfoHtml += `
            <div style="margin-top: 12px;">
              <p style="margin: 0 0 6px 0; color: var(--text-primary);"><strong>Interests:</strong></p>
              <div class="contact-tags">
                ${contact.tags.map((tag) => `<span class="tag-badge">${escapeHtml(tag.text)}</span>`).join('')}
              </div>
            </div>
          `;
        }
      }

      return `
        <div class="card suggestion-card ${isGroup ? 'suggestion-card-group' : 'suggestion-card-individual'}" style="background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: 12px; padding: 16px;">
          <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
            <div style="display: flex; align-items: center; gap: 12px; flex: 1;">
              ${avatarsHtml}
              <div style="flex: 1;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                  <h3 style="margin: 0; color: var(--text-primary);">Catch up with ${contactNamesHtml}</h3>
                  ${typeBadge}
                </div>
                ${sharedContextBadge}
              </div>
            </div>
            <span style="background: ${statusColor}; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; text-transform: capitalize;">
              ${suggestion.status}
            </span>
          </div>
          <p style="color: var(--text-primary);"><strong>Why:</strong> ${escapeHtml(suggestion.reasoning)}</p>
          ${renderEnrichmentContext(suggestion, suggestionContacts)}
          ${commonInfoHtml}
          ${suggestion.snoozedUntil ? `<p style="color: var(--text-primary);"><strong>Snoozed until:</strong> ${formatDateTime(suggestion.snoozedUntil)}</p>` : ''}
          ${suggestion.dismissalReason ? `<p style="color: var(--text-primary);"><strong>Dismissal reason:</strong> ${escapeHtml(suggestion.dismissalReason)}</p>` : ''}
          <div class="card-actions">
            ${actions}
          </div>
        </div>
      `;
    })
    .join('');

  container.innerHTML = filterButtonsHtml + suggestionsHtml;

  // Add event listeners for contact tooltips
  addContactTooltipListeners();

  // Fetch calendar event counts for each suggestion (async, non-blocking)
  loadCalendarEventCounts(suggestionsList);
}

// ---------------------------------------------------------------------------
// Group modify menu
// ---------------------------------------------------------------------------

function showGroupModifyMenu(suggestionId, event) {
  event.stopPropagation();

  // Close existing menu
  if (currentGroupModifyMenu) {
    currentGroupModifyMenu.remove();
    currentGroupModifyMenu = null;
  }

  const suggestion = suggestions.find((s) => s.id === suggestionId);
  if (!suggestion || !suggestion.contacts || suggestion.contacts.length === 0) {
    return;
  }

  // Create menu
  const menu = document.createElement('div');
  menu.className = 'group-modify-menu';

  let menuHtml =
    '<div style="padding: 8px 16px; font-weight: 600; font-size: 12px; color: #6b7280; text-transform: uppercase;">Remove Contact</div>';

  suggestion.contacts.forEach((contact) => {
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

// ---------------------------------------------------------------------------
// Remove contact from group suggestion
// ---------------------------------------------------------------------------

async function removeContactFromGroup(suggestionId, contactId) {
  closeGroupModifyMenu();

  const loadingToastId = showToast('Updating group suggestion...', 'loading');

  try {
    const userId = _userId();
    const authToken = _authToken();

    const response = await fetch(`${API_BASE}/suggestions/${suggestionId}/remove-contact`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ userId, contactId }),
    });

    if (response.status === 401) {
      if (typeof window.logout === 'function') window.logout();
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

// ---------------------------------------------------------------------------
// Accept / Dismiss / Snooze
// ---------------------------------------------------------------------------

async function acceptSuggestion(id) {
  const loadingToastId = showToast('Accepting suggestion...', 'loading');

  try {
    const userId = _userId();
    const authToken = _authToken();

    const response = await fetch(`${API_BASE}/suggestions/${id}/accept`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ userId }),
    });

    if (response.status === 401) {
      if (typeof window.logout === 'function') window.logout();
      return;
    }

    if (!response.ok) throw new Error('Failed to accept suggestion');

    hideToast(loadingToastId);
    showToast('Suggestion accepted!', 'success');

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
    const userId = _userId();
    const authToken = _authToken();

    const response = await fetch(`${API_BASE}/suggestions/${id}/dismiss`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ userId, reason }),
    });

    if (response.status === 401) {
      if (typeof window.logout === 'function') window.logout();
      return;
    }

    if (!response.ok) throw new Error('Failed to dismiss suggestion');

    hideToast(loadingToastId);
    showToast('Suggestion dismissed!', 'success');

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

  const hours = parseInt(days) * 24;

  const loadingToastId = showToast('Snoozing suggestion...', 'loading');

  try {
    const userId = _userId();
    const authToken = _authToken();

    const response = await fetch(`${API_BASE}/suggestions/${id}/snooze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ userId, duration: hours }),
    });

    if (response.status === 401) {
      if (typeof window.logout === 'function') window.logout();
      return;
    }

    if (!response.ok) throw new Error('Failed to snooze suggestion');

    hideToast(loadingToastId);
    showToast(`Suggestion snoozed for ${days} day(s)!`, 'success');

    loadSuggestions();
  } catch (error) {
    console.error('Error snoozing suggestion:', error);
    hideToast(loadingToastId);
    showToast('Failed to snooze suggestion', 'error');
  }
}

// ---------------------------------------------------------------------------
// Contact tooltip listeners
// ---------------------------------------------------------------------------

function addContactTooltipListeners() {
  const avatars = document.querySelectorAll('.suggestion-avatar');
  let tooltip = null;
  const contacts = window.contacts || [];

  avatars.forEach((avatar) => {
    avatar.addEventListener('mouseenter', (e) => {
      const contactId = avatar.dataset.contactId;
      const contact = contacts.find((c) => c.id === contactId);

      if (!contact) return;

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

// ---------------------------------------------------------------------------
// Calendar event counts (stub — async, non-blocking)
// ---------------------------------------------------------------------------

function loadCalendarEventCounts(suggestionsList) {
  // Stub: async fetch of calendar event counts per suggestion day.
  // Will be implemented when calendar enrichment integration is wired up.
}

// ---------------------------------------------------------------------------
// Register with app-shell
// ---------------------------------------------------------------------------

registerPage('suggestions', { load: loadSuggestions });

// ---------------------------------------------------------------------------
// Expose on window for backward compatibility with onclick handlers in HTML
// ---------------------------------------------------------------------------

window.loadSuggestions = loadSuggestions;
window.filterSuggestions = filterSuggestions;
window.renderSuggestions = renderSuggestions;
window.showGroupModifyMenu = showGroupModifyMenu;
window.closeGroupModifyMenu = closeGroupModifyMenu;
window.removeContactFromGroup = removeContactFromGroup;
window.acceptSuggestion = acceptSuggestion;
window.dismissSuggestion = dismissSuggestion;
window.snoozeSuggestion = snoozeSuggestion;
window.addContactTooltipListeners = addContactTooltipListeners;
window.loadCalendarEventCounts = loadCalendarEventCounts;
