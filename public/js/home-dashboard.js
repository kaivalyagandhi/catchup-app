/**
 * Home Dashboard — default authenticated landing page for CatchUp.
 *
 * Displays action items, relationship insights, quick actions, and
 * contextual nudge cards. Consumes GET /api/dashboard.
 *
 * @module home-dashboard
 */

import {
  escapeHtml,
  showToast,
  fetchWithAuth,
  API_BASE,
  formatRelativeTime,
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

let dashboardData = null;
let currentDashboardTab = 'overview';
const VALID_DASHBOARD_TABS = ['overview', 'suggestions'];
const SUGGESTIONS_PAGE_SIZE = 3;
let suggestionsVisibleCount = SUGGESTIONS_PAGE_SIZE;
let goalFormVisible = false;
let pausePickerVisible = false;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SNOOZE_DURATIONS = [
  { label: '3 days', hours: 72 },
  { label: '1 week', hours: 168 },
  { label: '2 weeks', hours: 336 },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function _authToken() {
  return getAuthToken();
}

function _userId() {
  return getCurrentUser().userId;
}

/**
 * Resolve the preferred contact channel for a suggestion.
 * Prefers phone (SMS) over email; falls back to 'none'.
 * @param {object} suggestion
 * @returns {{ type: 'sms'|'email'|'none', value: string, contactName: string }}
 */
function resolveContactChannel(suggestion) {
  const contacts = suggestion.contacts || [];
  const contact = contacts[0];
  if (!contact) {
    return { type: 'none', value: '', contactName: 'Unknown' };
  }
  const contactName = contact.name || 'Unknown';
  if (contact.phone) {
    return { type: 'sms', value: contact.phone, contactName };
  }
  if (contact.email) {
    return { type: 'email', value: contact.email, contactName };
  }
  return { type: 'none', value: '', contactName };
}

/**
 * Return the appropriate toast message for a dismissal feedback preset.
 * @param {string} preset
 * @returns {string}
 */
function getDismissalToastMessage(preset) {
  if (preset === 'dont_suggest_contact') {
    return "Got it, we won't suggest this contact again";
  }
  return "Got it, we'll adjust future suggestions";
}

// ---------------------------------------------------------------------------
// Load dashboard
// ---------------------------------------------------------------------------

async function loadDashboard() {
  const container = document.getElementById('dashboard-content');
  if (!container) return;

  // Resolve initial tab: URL hash > localStorage > default
  const hash = window.location.hash;
  const tabMatch = hash.match(/#dashboard\/(overview|suggestions)/);
  if (tabMatch) {
    currentDashboardTab = tabMatch[1];
  } else {
    const savedTab = localStorage.getItem('currentDashboardTab');
    if (savedTab && VALID_DASHBOARD_TABS.includes(savedTab)) {
      currentDashboardTab = savedTab;
    }
  }

  container.innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      <p>Loading dashboard...</p>
    </div>
  `;

  try {
    const response = await fetchWithAuth(`${API_BASE}/dashboard`);
    if (!response.ok) throw new Error('Failed to load dashboard');
    dashboardData = await response.json();
    renderDashboard(dashboardData);
  } catch (error) {
    console.error('Error loading dashboard:', error);
    // Render with empty data so tabs still show
    dashboardData = { actionItems: {}, insights: {}, nudges: [], suggestions: [], activeGoals: [], pauseState: { active: false }, pendingReviews: [], weeklyDigest: null };
    renderDashboard(dashboardData);
  }
}

// ---------------------------------------------------------------------------
// Render dashboard
// ---------------------------------------------------------------------------

function renderDashboard(data) {
  const container = document.getElementById('dashboard-content');
  if (!container) return;

  const actionItems = data.actionItems || {};
  const insights = data.insights || {};
  const nudges = data.nudges || [];
  const isZeroState = !insights.enrichedContacts && !insights.totalContacts;

  container.innerHTML = `
    ${renderDashboardTabBar()}
    <div id="dashboard-overview-tab" class="dashboard-tab-content">
      ${isZeroState ? renderZeroStateContent() : `
        ${renderActionItems(actionItems)}
        ${renderNudgeCards(nudges)}
        ${renderInsights(insights)}
        ${renderQuickActions()}
      `}
    </div>
    <div id="dashboard-suggestions-tab" class="dashboard-tab-content hidden">
      ${renderSuggestionsTabContent()}
    </div>
  `;

  // Apply the resolved tab state (show/hide without re-persisting on initial render)
  applyDashboardTab(currentDashboardTab);
}

// ---------------------------------------------------------------------------
// Dashboard tab bar and switching (follows switchDirectoryTab pattern)
// ---------------------------------------------------------------------------

function renderDashboardTabBar() {
  return `
    <div class="dashboard-tabs" role="tablist" aria-label="Dashboard tabs">
      <button class="dashboard-tab${currentDashboardTab === 'overview' ? ' active' : ''}"
              data-tab="overview"
              role="tab"
              aria-selected="${currentDashboardTab === 'overview'}"
              aria-controls="dashboard-overview-tab"
              onclick="switchDashboardTab('overview')">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 16px; height: 16px;">
          <rect x="3" y="3" width="7" height="7"/>
          <rect x="14" y="3" width="7" height="7"/>
          <rect x="14" y="14" width="7" height="7"/>
          <rect x="3" y="14" width="7" height="7"/>
        </svg>
        Overview
      </button>
      <button class="dashboard-tab${currentDashboardTab === 'suggestions' ? ' active' : ''}"
              data-tab="suggestions"
              role="tab"
              aria-selected="${currentDashboardTab === 'suggestions'}"
              aria-controls="dashboard-suggestions-tab"
              onclick="switchDashboardTab('suggestions')">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 16px; height: 16px;">
          <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
        </svg>
        Suggestions
      </button>
    </div>
  `;
}

/**
 * Switch between dashboard tabs. Follows the switchDirectoryTab pattern
 * from directory-page.js: persist to localStorage, update URL hash,
 * toggle active class, show/hide tab content.
 */
function switchDashboardTab(tabName) {
  if (!VALID_DASHBOARD_TABS.includes(tabName)) return;

  currentDashboardTab = tabName;
  localStorage.setItem('currentDashboardTab', tabName);
  window.history.replaceState(null, '', `#dashboard/${tabName}`);

  applyDashboardTab(tabName);
}

/**
 * Apply tab visibility without persisting state. Used on initial render
 * and by switchDashboardTab after persisting.
 */
function applyDashboardTab(tabName) {
  // Update active tab button
  document.querySelectorAll('.dashboard-tab').forEach((btn) => {
    const isActive = btn.dataset.tab === tabName;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-selected', String(isActive));
  });

  // Hide all tab contents
  document.querySelectorAll('.dashboard-tab-content').forEach((content) => {
    content.classList.add('hidden');
  });

  // Show selected tab content
  const tabEl = document.getElementById(`dashboard-${tabName}-tab`);
  if (tabEl) tabEl.classList.remove('hidden');

  // Load suggestions content when switching to that tab
  if (tabName === 'suggestions') {
    loadSuggestionsTab();
  }
}

// ---------------------------------------------------------------------------
// Suggestions tab content (task 15.2 — full rendering)
// ---------------------------------------------------------------------------

function renderSuggestionsTabContent() {
  // Initial placeholder; real content loaded asynchronously
  return `
    <div id="suggestions-tab-root" class="dashboard-section">
      <p class="dashboard-suggestions-placeholder">Loading suggestions...</p>
    </div>
  `;
}

/**
 * Fetch dashboard data and render the suggestions tab.
 * Called when the suggestions tab becomes visible.
 */
async function loadSuggestionsTab() {
  const root = document.getElementById('suggestions-tab-root');
  if (!root) return;

  // If we already have data from the initial dashboard load, render immediately
  if (dashboardData && dashboardData.suggestions) {
    renderSuggestionsCards(root, dashboardData);
    return;
  }

  root.innerHTML = `<p class="dashboard-suggestions-placeholder">Loading suggestions...</p>`;

  try {
    const response = await fetchWithAuth(`${API_BASE}/dashboard`);
    if (!response.ok) throw new Error('Failed to load suggestions');
    dashboardData = await response.json();
    renderSuggestionsCards(root, dashboardData);
  } catch (error) {
    console.error('Error loading suggestions:', error);
    root.innerHTML = `
      <div class="suggestions-empty">
        <div class="suggestions-empty__icon">⚠️</div>
        <p>Failed to load suggestions. Please try again.</p>
      </div>
    `;
    showToast('Failed to load suggestions. Please try again.', 'error');
  }
}

/**
 * Render the full suggestions card list into the given root element.
 * Includes goal banner, pause banner, dismiss-all control, and suggestion cards.
 */
function renderSuggestionsCards(root, data) {
  const suggestions = (data.suggestions || []).filter(s => s.status === 'pending');
  const activeGoals = data.activeGoals || [];
  const pauseState = data.pauseState || null;
  const isPaused = pauseState && pauseState.active && pauseState.pauseEnd;
  suggestionsVisibleCount = SUGGESTIONS_PAGE_SIZE;

  // Build the tab header with controls
  const headerHtml = renderSuggestionsHeader(suggestions, isPaused);
  const goalBannerHtml = renderGoalBanner(activeGoals);
  const pauseBannerHtml = isPaused ? renderPausedBanner(pauseState) : '';

  // Pending reviews (post-interaction)
  const pendingReviews = data.pendingReviews || [];
  const pendingReviewsHtml = renderPendingReviews(pendingReviews);

  // Weekly digest
  const weeklyDigest = data.weeklyDigest || null;
  const weeklyDigestHtml = (!isPaused && weeklyDigest && weeklyDigest.show && !isDigestDismissedThisWeek())
    ? renderWeeklyDigest(weeklyDigest)
    : '';

  if (isPaused) {
    root.innerHTML = `
      ${headerHtml}
      ${goalBannerHtml}
      ${pauseBannerHtml}
      ${pendingReviewsHtml}
    `;
    return;
  }

  if (suggestions.length === 0) {
    root.innerHTML = `
      ${headerHtml}
      ${goalBannerHtml}
      ${pendingReviewsHtml}
      <div class="suggestions-empty">
        <div class="suggestions-empty__icon">✅</div>
        <p>You're all caught up. No suggestions right now.</p>
      </div>
    `;
    return;
  }

  root.innerHTML = `
    ${headerHtml}
    ${goalBannerHtml}
    ${weeklyDigestHtml}
    ${pendingReviewsHtml}
    <div id="suggestions-card-list"></div>
    <div id="suggestions-show-more-container"></div>
  `;

  renderVisibleCards(suggestions);
}

// ---------------------------------------------------------------------------
// Suggestions tab header with Pause and Dismiss All controls
// ---------------------------------------------------------------------------

function renderSuggestionsHeader(suggestions, isPaused) {
  const hasPending = suggestions.length > 0;

  return `
    <div class="suggestions-tab-header">
      <h2>Suggestions</h2>
      <div class="suggestions-tab-header__controls">
        <button class="suggestions-header-btn suggestions-header-btn--generate" onclick="handleGenerateNewSuggestions()" aria-label="Generate new suggestions">
          ✨ Generate new
        </button>
        ${!isPaused && hasPending ? `
          <button class="suggestions-header-btn suggestions-header-btn--dismiss" onclick="handleDismissAll()" aria-label="Dismiss all suggestions">
            Dismiss all
          </button>
        ` : ''}
        ${!isPaused ? `
          <button class="suggestions-header-btn suggestions-header-btn--pause" onclick="togglePausePicker()" aria-label="Pause suggestions">
            ⏸ Pause suggestions
          </button>
          <div id="pause-picker-dropdown" class="pause-picker ${pausePickerVisible ? '' : 'hidden'}" role="dialog" aria-label="Select pause duration">
            <p class="pause-picker__title">Pause for how long?</p>
            <div class="pause-picker__options">
              <button class="pause-picker__option" onclick="handlePauseSuggestions(1)">1 week</button>
              <button class="pause-picker__option" onclick="handlePauseSuggestions(2)">2 weeks</button>
              <button class="pause-picker__option" onclick="handlePauseSuggestions(3)">3 weeks</button>
              <button class="pause-picker__option" onclick="handlePauseSuggestions(4)">4 weeks</button>
            </div>
            <button class="pause-picker__cancel" onclick="togglePausePicker()">Cancel</button>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Goal banner
// ---------------------------------------------------------------------------

function renderGoalBanner(activeGoals) {
  if (!activeGoals || activeGoals.length === 0) {
    return `
      <div class="goal-banner goal-banner--empty" id="goal-banner">
        <div class="goal-banner__prompt">
          <span class="goal-banner__icon">🎯</span>
          <span class="goal-banner__text">Set a goal to get more relevant suggestions</span>
          <button class="goal-banner__action" onclick="showGoalForm()">Set a goal</button>
        </div>
        <div id="goal-form-container" class="goal-form ${goalFormVisible ? '' : 'hidden'}">
          ${renderGoalForm()}
        </div>
      </div>
    `;
  }

  const goalsHtml = activeGoals.map(g => `
    <div class="goal-banner__goal" data-goal-id="${escapeHtml(g.id)}">
      <span class="goal-banner__icon">🎯</span>
      <span class="goal-banner__goal-text">${escapeHtml(g.text)}</span>
      <button class="goal-banner__control" onclick="showGoalForm()" aria-label="Change goal">Change</button>
      <button class="goal-banner__control goal-banner__control--clear" onclick="handleClearGoal('${escapeHtml(g.id)}')" aria-label="Clear goal">Clear</button>
    </div>
  `).join('');

  return `
    <div class="goal-banner goal-banner--active" id="goal-banner">
      ${goalsHtml}
      <div id="goal-form-container" class="goal-form ${goalFormVisible ? '' : 'hidden'}">
        ${renderGoalForm()}
      </div>
    </div>
  `;
}

function renderGoalForm() {
  const presets = [
    'Reconnect with old friends',
    'Grow professional network',
    'Plan something social',
    'Get advice or mentorship',
  ];

  return `
    <div class="goal-form__inner">
      <p class="goal-form__label">What's on your mind?</p>
      <div class="goal-form__presets">
        ${presets.map(p => `
          <button class="goal-form__preset" onclick="handleGoalPresetSelect('${escapeHtml(p)}')">${escapeHtml(p)}</button>
        `).join('')}
      </div>
      <div class="goal-form__custom">
        <input type="text" id="goal-custom-input" class="goal-form__input" placeholder="Or type your own goal..." maxlength="200" aria-label="Custom goal text" />
        <button class="goal-form__submit" onclick="handleGoalSubmit()">Save</button>
      </div>
      <button class="goal-form__cancel" onclick="hideGoalForm()">Cancel</button>
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Paused state banner
// ---------------------------------------------------------------------------

function renderPausedBanner(pauseState) {
  const endDate = new Date(pauseState.pauseEnd);
  const now = new Date();
  const diffMs = endDate - now;
  const diffDays = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  let durationText;
  if (diffDays >= 7) {
    const weeks = Math.round(diffDays / 7);
    durationText = `${weeks} week${weeks !== 1 ? 's' : ''}`;
  } else {
    durationText = `${diffDays} day${diffDays !== 1 ? 's' : ''}`;
  }

  return `
    <div class="pause-banner" role="status" aria-label="Suggestions paused">
      <div class="pause-banner__content">
        <span class="pause-banner__icon">⏸️</span>
        <div class="pause-banner__info">
          <span class="pause-banner__title">Suggestions are paused</span>
          <span class="pause-banner__duration">${escapeHtml(durationText)} remaining</span>
        </div>
      </div>
      <button class="pause-banner__resume" onclick="handleResumeSuggestions()">Resume suggestions</button>
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Post-interaction review banners
// ---------------------------------------------------------------------------

/**
 * Render lightweight review banners for suggestions whose reviewPromptAfter has passed.
 */
function renderPendingReviews(pendingReviews) {
  if (!pendingReviews || pendingReviews.length === 0) return '';

  return pendingReviews.map(review => {
    const name = escapeHtml(review.contactName || 'this contact');
    const sid = escapeHtml(review.suggestionId);
    return `
      <div class="review-banner" data-review-id="${sid}" role="status" aria-label="Post-interaction review for ${name}">
        <p class="review-banner__prompt">Did you catch up with ${name}?</p>
        <div class="review-banner__options">
          <button class="review-banner__option" onclick="handleReviewSubmit('${sid}', 'went_well')">Yes, it went well</button>
          <button class="review-banner__option" onclick="handleReviewSubmit('${sid}', 'not_great')">Yes, but it wasn't great</button>
          <button class="review-banner__option" onclick="handleReviewSubmit('${sid}', 'not_yet')">Not yet</button>
          <button class="review-banner__option review-banner__option--skip" onclick="handleReviewSubmit('${sid}', 'skip')">Skip</button>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Submit a post-interaction review via POST /api/suggestions/:id/review.
 */
async function handleReviewSubmit(suggestionId, outcome) {
  const banner = document.querySelector(`[data-review-id="${suggestionId}"]`);
  if (banner) {
    banner.querySelectorAll('.review-banner__option').forEach(btn => { btn.disabled = true; });
  }

  try {
    const response = await fetchWithAuth(`${API_BASE}/suggestions/${suggestionId}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ outcome }),
    });
    if (!response.ok) throw new Error('Failed to submit review');

    showToast('Review submitted', 'success');
    if (banner) {
      banner.classList.add('review-banner--exiting');
      setTimeout(() => banner.remove(), 250);
    }
  } catch (error) {
    console.error('Error submitting review:', error);
    showToast('Failed to submit review. Please try again.', 'error');
    if (banner) {
      banner.querySelectorAll('.review-banner__option').forEach(btn => { btn.disabled = false; });
    }
  }
}

// ---------------------------------------------------------------------------
// Weekly digest banner
// ---------------------------------------------------------------------------

/**
 * Render the weekly digest banner at the top of the Suggestions tab.
 */
function renderWeeklyDigest(digest) {
  if (!digest || !digest.show) return '';

  const summaries = (digest.summaries || []).slice(0, 3);
  if (summaries.length === 0) return '';

  const summaryHtml = summaries.map(s => `
    <li class="digest-banner__item">
      <span class="digest-banner__contact">${escapeHtml(s.contactName || 'Unknown')}</span>
      <span class="digest-banner__reason">${escapeHtml(s.reasoning || '')}</span>
    </li>
  `).join('');

  return `
    <div class="digest-banner" id="weekly-digest-banner" role="region" aria-label="Weekly suggestion digest">
      <div class="digest-banner__header">
        <span class="digest-banner__icon">📋</span>
        <span class="digest-banner__title">Your suggestions this week</span>
      </div>
      <ol class="digest-banner__list">
        ${summaryHtml}
      </ol>
      <div class="digest-banner__actions">
        <a href="#" class="digest-banner__view-all" onclick="handleDigestViewAll(event)">View all</a>
        <button class="digest-banner__dismiss" onclick="handleDigestDismiss()">Dismiss digest</button>
      </div>
    </div>
  `;
}

/**
 * "View all" scrolls to the suggestion cards section.
 */
function handleDigestViewAll(event) {
  if (event) event.preventDefault();
  const cardList = document.getElementById('suggestions-card-list');
  if (cardList) {
    cardList.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

/**
 * "Dismiss digest" hides the banner for the current week (stored in localStorage).
 */
function handleDigestDismiss() {
  // Store the current week's Monday as the dismissed key
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? 6 : day - 1; // days since Monday
  const monday = new Date(now);
  monday.setDate(now.getDate() - diff);
  const weekKey = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
  localStorage.setItem('digestDismissedWeek', weekKey);

  const banner = document.getElementById('weekly-digest-banner');
  if (banner) {
    banner.classList.add('digest-banner--exiting');
    setTimeout(() => banner.remove(), 250);
  }
}

/**
 * Check if the weekly digest was already dismissed for the current week.
 */
function isDigestDismissedThisWeek() {
  const dismissed = localStorage.getItem('digestDismissedWeek');
  if (!dismissed) return false;

  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? 6 : day - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - diff);
  const weekKey = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
  return dismissed === weekKey;
}

/**
 * Render the currently visible batch of suggestion cards and the show-more control.
 */
function renderVisibleCards(suggestions) {
  if (!suggestions) {
    suggestions = ((dashboardData || {}).suggestions || []).filter(s => s.status === 'pending');
  }

  const listEl = document.getElementById('suggestions-card-list');
  const moreEl = document.getElementById('suggestions-show-more-container');
  if (!listEl) return;

  const visible = suggestions.slice(0, suggestionsVisibleCount);
  listEl.innerHTML = visible.map(s => renderSuggestionCard(s)).join('');

  if (moreEl) {
    const remaining = suggestions.length - suggestionsVisibleCount;
    if (remaining > 0) {
      const nextBatch = Math.min(remaining, SUGGESTIONS_PAGE_SIZE);
      moreEl.innerHTML = `
        <div class="suggestions-show-more">
          <button onclick="showMoreSuggestions()">Show ${nextBatch} more suggestion${nextBatch > 1 ? 's' : ''}</button>
        </div>
      `;
    } else {
      moreEl.innerHTML = '';
    }
  }
}

/**
 * Render a single suggestion card.
 */
function renderSuggestionCard(suggestion) {
  const isGroup = suggestion.type === 'group';
  const contacts = suggestion.contacts || [];
  const primaryName = contacts.length > 0
    ? contacts.map(c => escapeHtml(c.name || 'Unknown')).join(', ')
    : escapeHtml(suggestion.contactName || 'Unknown');

  const avatarHtml = isGroup
    ? renderGroupAvatars(contacts)
    : renderSingleAvatar(contacts[0] || { name: suggestion.contactName || '?' });

  const typeLabel = isGroup ? 'Group Catchup' : 'One-on-One';
  const reasoning = escapeHtml(suggestion.reasoning || '');
  const starter = suggestion.conversationStarter
    ? `<div class="suggestion-card__starter"><span class="suggestion-card__starter-icon">💬</span> ${escapeHtml(suggestion.conversationStarter)}</div>`
    : '';

  const signalHtml = renderSignalDetails(suggestion);

  return `
    <div class="suggestion-card" data-suggestion-id="${escapeHtml(suggestion.id)}" role="article" aria-label="Suggestion for ${escapeHtml(primaryName)}">
      <div class="suggestion-card__header">
        ${avatarHtml}
        <div class="suggestion-card__info">
          <div class="suggestion-card__name">${isGroup ? escapeHtml(primaryName) : escapeHtml(contacts[0]?.name || suggestion.contactName || 'Unknown')}</div>
          <div class="suggestion-card__type-label">${typeLabel}</div>
        </div>
      </div>
      <div class="suggestion-card__reasoning">${reasoning}</div>
      ${starter}
      <button class="suggestion-card__details-toggle" aria-expanded="false" onclick="toggleSuggestionDetails(this)">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
        Details
      </button>
      <div class="suggestion-card__details">
        ${signalHtml}
      </div>
      <div class="suggestion-card__actions">
        <button class="suggestion-card__btn suggestion-card__btn--primary" onclick="handleSuggestionAccept('${escapeHtml(suggestion.id)}')">Reach out</button>
        <button class="suggestion-card__btn suggestion-card__btn--secondary" onclick="handleSuggestionDismiss('${escapeHtml(suggestion.id)}')">Not now</button>
        <button class="suggestion-card__btn suggestion-card__btn--secondary" onclick="handleSuggestionSnooze('${escapeHtml(suggestion.id)}')">Snooze</button>
      </div>
    </div>
  `;
}

function renderSingleAvatar(contact) {
  const initial = ((contact && contact.name) || '?').charAt(0).toUpperCase();
  return `<div class="suggestion-card__avatar">${initial}</div>`;
}

function renderGroupAvatars(contacts) {
  const maxShow = 3;
  const shown = contacts.slice(0, maxShow);
  const extra = contacts.length - maxShow;

  let html = '<div class="suggestion-card__group-avatars">';
  shown.forEach(c => {
    const initial = ((c && c.name) || '?').charAt(0).toUpperCase();
    html += `<div class="suggestion-card__avatar">${initial}</div>`;
  });
  if (extra > 0) {
    html += `<div class="suggestion-card__avatar suggestion-card__avatar--more">+${extra}</div>`;
  }
  html += '</div>';
  return html;
}

function renderSignalDetails(suggestion) {
  const sc = suggestion.signalContribution || {};
  const signals = [
    { label: 'Enrichment', key: 'enrichmentScore', cls: 'enrichment', icon: '📊' },
    { label: 'Interaction', key: 'interactionScore', cls: 'interaction', icon: '💬' },
    { label: 'Calendar', key: 'calendarScore', cls: 'calendar', icon: '📅' },
    { label: 'Metadata', key: 'contactMetadataScore', cls: 'metadata', icon: '👤' },
  ];

  if (suggestion.goalRelevanceScore != null && suggestion.goalRelevanceScore > 0) {
    signals.push({ label: 'Goal', key: 'goalRelevanceScore', cls: 'goal', icon: '🎯' });
  }

  const activeSignals = signals.filter(s => {
    const value = s.key === 'goalRelevanceScore'
      ? (suggestion.goalRelevanceScore || 0)
      : (sc[s.key] || 0);
    return Math.round(value) > 0;
  });

  if (activeSignals.length === 0) {
    return '<p style="font-size:13px;color:var(--text-tertiary);margin:0;">No signal data available yet</p>';
  }

  return `<div class="signal-chips">${activeSignals.map(s => {
    const value = s.key === 'goalRelevanceScore'
      ? (suggestion.goalRelevanceScore || 0)
      : (sc[s.key] || 0);
    const pct = Math.min(Math.round(value), 100);
    const strength = pct >= 50 ? 'strong' : pct >= 20 ? 'moderate' : 'weak';
    return `<span class="signal-chip signal-chip--${s.cls} signal-chip--${strength}" title="${s.label}: ${pct}%">${s.icon} ${s.label}</span>`;
  }).join('')}</div>`;
}

/**
 * Toggle the expandable details section on a suggestion card.
 */
function toggleSuggestionDetails(btn) {
  const expanded = btn.getAttribute('aria-expanded') === 'true';
  btn.setAttribute('aria-expanded', String(!expanded));
  const details = btn.nextElementSibling;
  if (details) {
    details.classList.toggle('open', !expanded);
  }
}

/**
 * Show more suggestions (next batch of 3).
 */
function showMoreSuggestions() {
  suggestionsVisibleCount += SUGGESTIONS_PAGE_SIZE;
  const suggestions = ((dashboardData || {}).suggestions || []).filter(s => s.status === 'pending');
  renderVisibleCards(suggestions);
}

// ---------------------------------------------------------------------------
// Goal action handlers
// ---------------------------------------------------------------------------

function showGoalForm() {
  goalFormVisible = true;
  const container = document.getElementById('goal-form-container');
  if (container) {
    container.classList.remove('hidden');
    container.innerHTML = renderGoalForm();
    const input = document.getElementById('goal-custom-input');
    if (input) input.focus();
  }
}

function hideGoalForm() {
  goalFormVisible = false;
  const container = document.getElementById('goal-form-container');
  if (container) container.classList.add('hidden');
}

function handleGoalPresetSelect(presetText) {
  const input = document.getElementById('goal-custom-input');
  if (input) input.value = presetText;
  handleGoalSubmit();
}

async function handleGoalSubmit() {
  const input = document.getElementById('goal-custom-input');
  const text = input ? input.value.trim() : '';
  if (!text) {
    showToast('Please enter a goal', 'error');
    return;
  }

  try {
    const response = await fetchWithAuth(`${API_BASE}/suggestions/goals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });

    if (response.status === 409) {
      showToast('Maximum of 2 active goals allowed. Clear one first.', 'error');
      return;
    }
    if (!response.ok) throw new Error('Failed to create goal');

    showToast('Goal set!', 'success');
    goalFormVisible = false;
    await reloadSuggestionsTab();
  } catch (error) {
    console.error('Error creating goal:', error);
    showToast('Failed to set goal. Please try again.', 'error');
  }
}

async function handleClearGoal(goalId) {
  try {
    const response = await fetchWithAuth(`${API_BASE}/suggestions/goals/${goalId}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to clear goal');

    showToast('Goal cleared', 'success');
    await reloadSuggestionsTab();
  } catch (error) {
    console.error('Error clearing goal:', error);
    showToast('Failed to clear goal. Please try again.', 'error');
  }
}

// ---------------------------------------------------------------------------
// Pause action handlers
// ---------------------------------------------------------------------------

function togglePausePicker() {
  pausePickerVisible = !pausePickerVisible;
  const picker = document.getElementById('pause-picker-dropdown');
  if (picker) picker.classList.toggle('hidden', !pausePickerVisible);
}

async function handlePauseSuggestions(weeks) {
  pausePickerVisible = false;
  try {
    const response = await fetchWithAuth(`${API_BASE}/suggestions/pause`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weeks }),
    });

    if (response.status === 409) {
      showToast('Suggestions are already paused', 'error');
      return;
    }
    if (!response.ok) throw new Error('Failed to pause suggestions');

    showToast(`Suggestions paused for ${weeks} week${weeks > 1 ? 's' : ''}`, 'success');
    await reloadSuggestionsTab();
  } catch (error) {
    console.error('Error pausing suggestions:', error);
    showToast('Failed to pause suggestions. Please try again.', 'error');
  }
}

async function handleResumeSuggestions() {
  try {
    const response = await fetchWithAuth(`${API_BASE}/suggestions/pause`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to resume suggestions');

    showToast('Suggestions resumed!', 'success');
    await reloadSuggestionsTab();
  } catch (error) {
    console.error('Error resuming suggestions:', error);
    showToast('Failed to resume suggestions. Please try again.', 'error');
  }
}

// ---------------------------------------------------------------------------
// Dismiss all handler
// ---------------------------------------------------------------------------

async function handleDismissAll() {
  try {
    const response = await fetchWithAuth(`${API_BASE}/suggestions/dismiss-all`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) throw new Error('Failed to dismiss all suggestions');

    showToast('All suggestions dismissed', 'success');
    // Mark all local suggestions as dismissed
    if (dashboardData && dashboardData.suggestions) {
      dashboardData.suggestions.forEach(s => {
        if (s.status === 'pending') s.status = 'dismissed';
      });
    }
    await reloadSuggestionsTab();
  } catch (error) {
    console.error('Error dismissing all suggestions:', error);
    showToast('Failed to dismiss suggestions. Please try again.', 'error');
  }
}

// ---------------------------------------------------------------------------
// Generate new suggestions handler
// ---------------------------------------------------------------------------

async function handleGenerateNewSuggestions() {
  showToast('Generating new suggestions...', 'success');
  try {
    const response = await fetchWithAuth(`${API_BASE}/suggestions/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    if (!response.ok) throw new Error('Failed to generate suggestions');

    const data = await response.json();
    showToast(`${data.count || 0} new suggestions generated`, 'success');
    await reloadSuggestionsTab();
  } catch (error) {
    console.error('Error generating suggestions:', error);
    showToast('Could not generate new suggestions right now', 'error');
  }
}

// ---------------------------------------------------------------------------
// Reload suggestions tab (re-fetch and re-render)
// ---------------------------------------------------------------------------

async function reloadSuggestionsTab() {
  const root = document.getElementById('suggestions-tab-root');
  if (!root) return;

  try {
    const response = await fetchWithAuth(`${API_BASE}/dashboard`);
    if (!response.ok) throw new Error('Failed to reload suggestions');
    dashboardData = await response.json();
    renderSuggestionsCards(root, dashboardData);
  } catch (error) {
    console.error('Error reloading suggestions tab:', error);
    showToast('Failed to reload suggestions.', 'error');
  }
}

// ---------------------------------------------------------------------------
// Suggestion action handlers
// ---------------------------------------------------------------------------

/**
 * Accept a suggestion — show inline channel picker, then open the selected channel and call accept API.
 */
function handleSuggestionAccept(suggestionId) {
  const card = document.querySelector(`[data-suggestion-id="${suggestionId}"]`);
  if (!card) return;

  // If channel picker is already showing, toggle it off
  const existing = card.querySelector('.channel-picker');
  if (existing) {
    existing.remove();
    setCardButtonsDisabled(card, false);
    return;
  }

  // Look up the suggestion from local data
  const suggestion = (dashboardData && dashboardData.suggestions || []).find(s => s.id === suggestionId);
  const contacts = suggestion ? (suggestion.contacts || []) : [];
  const contact = contacts[0] || {};
  const contactName = contact.name || 'Unknown';

  // Build channel options based on available contact info
  const channels = [];
  if (contact.phone) {
    channels.push({ type: 'sms', label: '💬 Text', value: contact.phone, uri: `sms:${contact.phone}` });
    channels.push({ type: 'call', label: '📞 Call', value: contact.phone, uri: `tel:${contact.phone}` });
    channels.push({ type: 'whatsapp', label: '🟢 WhatsApp', value: contact.phone, uri: `https://wa.me/${contact.phone.replace(/[^0-9]/g, '')}` });
  }
  if (contact.email) {
    channels.push({ type: 'email', label: '✉️ Email', value: contact.email, uri: `mailto:${contact.email}` });
  }

  if (channels.length === 0) {
    // No contact info — just accept and show toast
    acceptAndRemove(suggestionId, contactName, card);
    return;
  }

  setCardButtonsDisabled(card, true);

  const channelButtonsHtml = channels.map(ch =>
    `<button class="channel-picker__option" onclick="handleChannelSelect('${escapeHtml(suggestionId)}', '${escapeHtml(ch.uri)}', '${escapeHtml(contactName)}')">${ch.label}</button>`
  ).join('');

  const pickerHtml = `
    <div class="channel-picker" role="group" aria-label="Reach out via">
      <p class="channel-picker__prompt">Reach out via:</p>
      <div class="channel-picker__options">
        ${channelButtonsHtml}
      </div>
      <button class="channel-picker__cancel" onclick="cancelChannelPicker('${escapeHtml(suggestionId)}')">Cancel</button>
    </div>
  `;

  const actionsEl = card.querySelector('.suggestion-card__actions');
  if (actionsEl) {
    actionsEl.insertAdjacentHTML('afterend', pickerHtml);
  }
}

/**
 * Handle channel selection — open the URI and accept the suggestion.
 */
async function handleChannelSelect(suggestionId, uri, contactName) {
  window.open(uri, '_blank');

  const card = document.querySelector(`[data-suggestion-id="${suggestionId}"]`);
  await acceptAndRemove(suggestionId, contactName, card);
}

/**
 * Cancel channel picker and re-enable buttons.
 */
function cancelChannelPicker(suggestionId) {
  const card = document.querySelector(`[data-suggestion-id="${suggestionId}"]`);
  if (!card) return;
  const picker = card.querySelector('.channel-picker');
  if (picker) picker.remove();
  setCardButtonsDisabled(card, false);
}

/**
 * Accept a suggestion via API and remove the card.
 */
async function acceptAndRemove(suggestionId, contactName, card) {
  try {
    const response = await fetchWithAuth(`${API_BASE}/suggestions/${suggestionId}/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) throw new Error('Failed to accept suggestion');

    showToast(`Reaching out to ${contactName}`, 'success');
    removeSuggestionCard(suggestionId);
  } catch (error) {
    console.error('Error accepting suggestion:', error);
    showToast('Failed to accept suggestion. Please try again.', 'error');
    if (card) setCardButtonsDisabled(card, false);
  }
}

/**
 * Dismiss a suggestion — show inline preset feedback options on the card.
 */
function handleSuggestionDismiss(suggestionId) {
  const card = document.querySelector(`[data-suggestion-id="${suggestionId}"]`);
  if (!card) return;

  // If feedback UI is already showing, toggle it off
  const existing = card.querySelector('.suggestion-feedback');
  if (existing) {
    existing.remove();
    setCardButtonsDisabled(card, false);
    return;
  }

  setCardButtonsDisabled(card, true);

  const feedbackPresets = [
    { preset: 'already_in_touch', label: 'Already in touch' },
    { preset: 'not_relevant', label: 'Not relevant right now' },
    { preset: 'timing_off', label: 'Timing is off' },
    { preset: 'dont_suggest_contact', label: "Don't suggest this contact" },
    { preset: 'other', label: 'Other' },
  ];

  const feedbackHtml = `
    <div class="suggestion-feedback" role="group" aria-label="Feedback options">
      <p class="suggestion-feedback__prompt">Why not now?</p>
      <div class="suggestion-feedback__options">
        ${feedbackPresets.map(p => `
          <button class="suggestion-feedback__option" data-preset="${p.preset}" onclick="handleFeedbackSelect('${escapeHtml(suggestionId)}', '${p.preset}')">
            ${escapeHtml(p.label)}
          </button>
        `).join('')}
      </div>
      <div class="suggestion-feedback__other-input hidden">
        <input type="text" class="suggestion-feedback__text" placeholder="Tell us more..." aria-label="Feedback comment" maxlength="500" />
        <button class="suggestion-feedback__submit" onclick="submitOtherFeedback('${escapeHtml(suggestionId)}')">Submit</button>
      </div>
      <button class="suggestion-feedback__cancel" onclick="cancelFeedback('${escapeHtml(suggestionId)}')">Cancel</button>
    </div>
  `;

  const actionsEl = card.querySelector('.suggestion-card__actions');
  if (actionsEl) {
    actionsEl.insertAdjacentHTML('afterend', feedbackHtml);
  }
}

/**
 * Handle selecting a feedback preset option.
 * If "Other" is selected, reveal the text input. Otherwise submit immediately.
 */
function handleFeedbackSelect(suggestionId, preset) {
  const card = document.querySelector(`[data-suggestion-id="${suggestionId}"]`);
  if (!card) return;

  if (preset === 'other') {
    const otherInput = card.querySelector('.suggestion-feedback__other-input');
    if (otherInput) {
      otherInput.classList.remove('hidden');
      const textField = otherInput.querySelector('.suggestion-feedback__text');
      if (textField) textField.focus();
    }
    return;
  }

  submitFeedback(suggestionId, preset);
}

/**
 * Submit "Other" feedback with the free-text comment.
 */
function submitOtherFeedback(suggestionId) {
  const card = document.querySelector(`[data-suggestion-id="${suggestionId}"]`);
  if (!card) return;

  const textField = card.querySelector('.suggestion-feedback__text');
  const comment = textField ? textField.value.trim() : '';
  submitFeedback(suggestionId, 'other', comment || undefined);
}

/**
 * Cancel feedback selection and restore the card buttons.
 */
function cancelFeedback(suggestionId) {
  const card = document.querySelector(`[data-suggestion-id="${suggestionId}"]`);
  if (!card) return;

  const feedbackEl = card.querySelector('.suggestion-feedback');
  if (feedbackEl) feedbackEl.remove();
  setCardButtonsDisabled(card, false);
}

/**
 * Submit feedback to the API and dismiss the card.
 */
async function submitFeedback(suggestionId, preset, comment) {
  const card = document.querySelector(`[data-suggestion-id="${suggestionId}"]`);
  if (!card) return;

  // Disable feedback buttons while submitting
  card.querySelectorAll('.suggestion-feedback__option, .suggestion-feedback__submit').forEach(btn => {
    btn.disabled = true;
  });

  try {
    const body = { preset };
    if (comment) body.comment = comment;

    const response = await fetchWithAuth(`${API_BASE}/suggestions/${suggestionId}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error('Failed to submit feedback');

    showToast(getDismissalToastMessage(preset), 'success');
    removeSuggestionCard(suggestionId);
  } catch (error) {
    console.error('Error submitting feedback:', error);
    showToast('Failed to dismiss suggestion. Please try again.', 'error');
    // Re-enable feedback buttons
    if (card) {
      card.querySelectorAll('.suggestion-feedback__option, .suggestion-feedback__submit').forEach(btn => {
        btn.disabled = false;
      });
    }
  }
}

/**
 * Snooze a suggestion — toggle inline duration picker on the card.
 */
function handleSuggestionSnooze(suggestionId) {
  const card = document.querySelector(`[data-suggestion-id="${suggestionId}"]`);
  if (!card) return;

  // If picker is already visible, toggle it off
  const existing = card.querySelector('.snooze-picker');
  if (existing) {
    cancelSnooze(suggestionId);
    return;
  }

  setCardButtonsDisabled(card, true);

  const pickerHtml = renderSnoozePicker(suggestionId);
  const actionsEl = card.querySelector('.suggestion-card__actions');
  if (actionsEl) {
    actionsEl.insertAdjacentHTML('afterend', pickerHtml);
  }
}

/**
 * Render the inline snooze duration picker HTML.
 */
function renderSnoozePicker(suggestionId) {
  const buttonsHtml = SNOOZE_DURATIONS.map(d =>
    `<button class="snooze-picker__option" onclick="handleSnoozeSelect('${escapeHtml(suggestionId)}', ${d.hours}, '${escapeHtml(d.label)}')">${escapeHtml(d.label)}</button>`
  ).join('');

  return `
    <div class="snooze-picker" role="group" aria-label="Snooze duration options">
      <p class="snooze-picker__prompt">Snooze for how long?</p>
      <div class="snooze-picker__options">
        ${buttonsHtml}
      </div>
      <button class="snooze-picker__cancel" onclick="cancelSnooze('${escapeHtml(suggestionId)}')">Cancel</button>
    </div>
  `;
}

/**
 * Handle selecting a snooze duration — POST /api/suggestions/:id/snooze with { duration }.
 */
async function handleSnoozeSelect(suggestionId, durationHours, durationLabel) {
  const card = document.querySelector(`[data-suggestion-id="${suggestionId}"]`);
  if (!card) return;

  // Disable picker buttons while submitting
  card.querySelectorAll('.snooze-picker__option, .snooze-picker__cancel').forEach(btn => {
    btn.disabled = true;
  });

  try {
    const response = await fetchWithAuth(`${API_BASE}/suggestions/${suggestionId}/snooze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ duration: durationHours }),
    });
    if (!response.ok) throw new Error('Failed to snooze suggestion');

    showToast(`Snoozed for ${durationLabel}`, 'success');
    removeSuggestionCard(suggestionId);
  } catch (error) {
    console.error('Error snoozing suggestion:', error);
    showToast('Failed to snooze suggestion. Please try again.', 'error');
    // Re-enable picker buttons and card buttons
    if (card) {
      card.querySelectorAll('.snooze-picker__option, .snooze-picker__cancel').forEach(btn => {
        btn.disabled = false;
      });
      setCardButtonsDisabled(card, false);
    }
  }
}

/**
 * Cancel snooze — remove picker and re-enable action buttons.
 */
function cancelSnooze(suggestionId) {
  const card = document.querySelector(`[data-suggestion-id="${suggestionId}"]`);
  if (!card) return;

  const picker = card.querySelector('.snooze-picker');
  if (picker) picker.remove();
  setCardButtonsDisabled(card, false);
}

/**
 * Disable/enable all action buttons on a card.
 */
function setCardButtonsDisabled(card, disabled) {
  card.querySelectorAll('.suggestion-card__btn').forEach(btn => {
    btn.disabled = disabled;
  });
}

/**
 * Remove a suggestion card with animation, promote next suggestion into view.
 */
function removeSuggestionCard(suggestionId) {
  // Mark as non-pending in local data so it won't reappear
  if (dashboardData && dashboardData.suggestions) {
    const s = dashboardData.suggestions.find(s => s.id === suggestionId);
    if (s) s.status = 'acted';
  }

  const card = document.querySelector(`[data-suggestion-id="${suggestionId}"]`);
  if (card) {
    card.classList.add('suggestion-card--exiting');
    setTimeout(() => {
      card.remove();
      // Re-render to promote next suggestion into visible set
      const pending = ((dashboardData || {}).suggestions || []).filter(s => s.status === 'pending');
      if (pending.length === 0) {
        const root = document.getElementById('suggestions-tab-root');
        if (root) {
          renderSuggestionsCards(root, dashboardData || { suggestions: [] });
        }
      } else {
        renderVisibleCards(pending);
      }
    }, 250);
  }
}

// ---------------------------------------------------------------------------
// Action Items section
// ---------------------------------------------------------------------------

function renderActionItems(items) {
  const cards = [];

  if (items.pendingEnrichments > 0) {
    cards.push(`
      <div class="dashboard-card dashboard-card--action" onclick="window.navigateTo('directory')" role="button" tabindex="0">
        <div class="dashboard-card__icon">📥</div>
        <div class="dashboard-card__body">
          <div class="dashboard-card__count">${items.pendingEnrichments}</div>
          <div class="dashboard-card__label">Pending Enrichments</div>
        </div>
      </div>
    `);
  }

  if (items.pendingSyncChanges > 0) {
    cards.push(`
      <div class="dashboard-card dashboard-card--action" onclick="window.navigateTo('preferences')" role="button" tabindex="0">
        <div class="dashboard-card__icon">🔄</div>
        <div class="dashboard-card__body">
          <div class="dashboard-card__count">${items.pendingSyncChanges}</div>
          <div class="dashboard-card__label">Pending Sync Changes</div>
        </div>
      </div>
    `);
  }

  if (items.activeImports > 0) {
    cards.push(`
      <div class="dashboard-card dashboard-card--action" onclick="window.openImportWizard && window.openImportWizard()" role="button" tabindex="0">
        <div class="dashboard-card__icon">⏳</div>
        <div class="dashboard-card__body">
          <div class="dashboard-card__count">${items.activeImports}</div>
          <div class="dashboard-card__label">Active Imports</div>
        </div>
      </div>
    `);
  }

  if (items.pendingMatches > 0) {
    cards.push(`
      <div class="dashboard-card dashboard-card--action" onclick="window.navigateTo('directory')" role="button" tabindex="0">
        <div class="dashboard-card__icon">🔗</div>
        <div class="dashboard-card__body">
          <div class="dashboard-card__count">${items.pendingMatches}</div>
          <div class="dashboard-card__label">Pending Matches</div>
        </div>
      </div>
    `);
  }

  if (cards.length === 0) return '';

  return `
    <div class="dashboard-section">
      <h2 class="dashboard-section__title">Action Items</h2>
      <div class="dashboard-grid dashboard-grid--actions">
        ${cards.join('')}
      </div>
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Nudge cards
// ---------------------------------------------------------------------------

function renderNudgeCards(nudges) {
  if (!nudges || nudges.length === 0) return '';

  const nudgeHtml = nudges.map(nudge => `
    <div class="dashboard-nudge" data-nudge-type="${escapeHtml(nudge.type || '')}">
      <div class="dashboard-nudge__content">
        <div class="dashboard-nudge__icon">${getNudgeIcon(nudge.type)}</div>
        <div>
          <div class="dashboard-nudge__title">${escapeHtml(nudge.title || '')}</div>
          <div class="dashboard-nudge__desc">${escapeHtml(nudge.description || '')}</div>
        </div>
      </div>
      <div class="dashboard-nudge__actions">
        ${nudge.actionLabel ? `<button class="btn-primary" onclick="handleNudgeAction('${escapeHtml(nudge.type)}')">${escapeHtml(nudge.actionLabel)}</button>` : ''}
        <button class="btn-secondary" onclick="dismissNudge('${escapeHtml(nudge.type)}')">Dismiss</button>
      </div>
    </div>
  `).join('');

  return `
    <div class="dashboard-section">
      ${nudgeHtml}
    </div>
  `;
}

function getNudgeIcon(type) {
  const icons = {
    get_deeper_insights: '💡',
    organize_circles: '🎯',
    set_frequency: '⏰',
    import_more: '📱',
  };
  return icons[type] || '💡';
}

// ---------------------------------------------------------------------------
// Insights section
// ---------------------------------------------------------------------------

function renderInsights(insights) {
  const catchUpSoon = insights.catchUpSoon || [];

  return `
    <div class="dashboard-section">
      <h2 class="dashboard-section__title">Relationship Insights</h2>
      <div class="dashboard-grid dashboard-grid--stats">
        <div class="dashboard-stat">
          <div class="dashboard-stat__value">${insights.totalContacts || 0}</div>
          <div class="dashboard-stat__label">Total Contacts</div>
        </div>
        <div class="dashboard-stat">
          <div class="dashboard-stat__value">${insights.enrichedContacts || 0}</div>
          <div class="dashboard-stat__label">With Enrichment Data</div>
        </div>
        <div class="dashboard-stat">
          <div class="dashboard-stat__value">${insights.staleRelationships || 0}</div>
          <div class="dashboard-stat__label">Stale (3+ months)</div>
        </div>
      </div>
      ${catchUpSoon.length > 0 ? `
        <div class="dashboard-catchup-list">
          <h3 class="dashboard-subsection__title">Catch up soon</h3>
          ${catchUpSoon.slice(0, 5).map(c => `
            <div class="dashboard-catchup-item" onclick="window.navigateTo('directory')">
              <div class="dashboard-catchup-item__avatar">${(c.name || '?').charAt(0).toUpperCase()}</div>
              <div class="dashboard-catchup-item__info">
                <div class="dashboard-catchup-item__name">${escapeHtml(c.name || 'Unknown')}</div>
                <div class="dashboard-catchup-item__reason">${escapeHtml(c.reason || '')}</div>
              </div>
            </div>
          `).join('')}
        </div>
      ` : ''}
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Quick Actions section
// ---------------------------------------------------------------------------

function renderQuickActions() {
  return `
    <div class="dashboard-section">
      <h2 class="dashboard-section__title">Quick Actions</h2>
      <div class="dashboard-grid dashboard-grid--actions">
        <div class="dashboard-card dashboard-card--quick" onclick="window.openImportWizard ? window.openImportWizard() : window.navigateTo('directory')" role="button" tabindex="0">
          <div class="dashboard-card__icon">📱</div>
          <div class="dashboard-card__label">Import Chat History</div>
        </div>
        <div class="dashboard-card dashboard-card--quick" onclick="window.floatingChatIcon && window.floatingChatIcon.element && window.floatingChatIcon.element.click()" role="button" tabindex="0">
          <div class="dashboard-card__icon">🎙️</div>
          <div class="dashboard-card__label">Record Voice Note</div>
        </div>
        <div class="dashboard-card dashboard-card--quick" onclick="window.navigateTo('directory')" role="button" tabindex="0">
          <div class="dashboard-card__icon">📇</div>
          <div class="dashboard-card__label">View All Contacts</div>
        </div>
        <div class="dashboard-card dashboard-card--quick" onclick="window.switchDashboardTab('suggestions')" role="button" tabindex="0">
          <div class="dashboard-card__icon">✨</div>
          <div class="dashboard-card__label">View Suggestions</div>
        </div>
      </div>
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Zero state
// ---------------------------------------------------------------------------

function renderZeroStateContent() {
  return `
    <div class="dashboard-section">
      <div class="dashboard-zero-state">
        <div class="dashboard-zero-state__icon">👋</div>
        <h2>Welcome to CatchUp</h2>
        <p>Get started by enriching your contacts with real conversation data.</p>
        <div class="dashboard-zero-state__cards">
          <div class="dashboard-card dashboard-card--quick" onclick="window.openImportWizard ? window.openImportWizard() : window.navigateTo('directory')" role="button" tabindex="0">
            <div class="dashboard-card__icon">📱</div>
            <div class="dashboard-card__label">Import Chat History</div>
            <div class="dashboard-card__desc">Upload exports from WhatsApp, Instagram, and more</div>
          </div>
          <div class="dashboard-card dashboard-card--quick" onclick="window.navigateTo('preferences')" role="button" tabindex="0">
            <div class="dashboard-card__icon">🔗</div>
            <div class="dashboard-card__label">Connect Calendar</div>
            <div class="dashboard-card__desc">See who you meet with and how often</div>
          </div>
          <div class="dashboard-card dashboard-card--quick" onclick="window.floatingChatIcon && window.floatingChatIcon.element && window.floatingChatIcon.element.click()" role="button" tabindex="0">
            <div class="dashboard-card__icon">🎙️</div>
            <div class="dashboard-card__label">Record Voice Notes</div>
            <div class="dashboard-card__desc">Capture context after conversations</div>
          </div>
        </div>
      </div>
    </div>
    ${renderQuickActions()}
  `;
}

function renderZeroState(container) {
  container.innerHTML = renderZeroStateContent();
}

// ---------------------------------------------------------------------------
// Nudge actions
// ---------------------------------------------------------------------------

async function handleNudgeAction(type) {
  switch (type) {
    case 'get_deeper_insights':
    case 'import_more':
      if (window.openImportWizard) window.openImportWizard();
      else navigateTo('directory');
      break;
    case 'organize_circles':
      navigateTo('directory');
      setTimeout(() => {
        if (typeof window.switchDirectoryTab === 'function') {
          window.switchDirectoryTab('circles');
        }
      }, 200);
      break;
    case 'set_frequency':
      navigateTo('directory');
      break;
    default:
      break;
  }
}

async function dismissNudge(type) {
  try {
    await fetchWithAuth(`${API_BASE}/nudges/dismiss`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nudgeType: type }),
    });
    // Remove nudge card from DOM
    const card = document.querySelector(`[data-nudge-type="${type}"]`);
    if (card) card.remove();
    showToast('Nudge dismissed', 'success');
  } catch (error) {
    console.error('Error dismissing nudge:', error);
  }
}

// ---------------------------------------------------------------------------
// Refresh on page focus
// ---------------------------------------------------------------------------

document.addEventListener('visibilitychange', () => {
  if (!document.hidden && document.getElementById('dashboard-page') &&
      !document.getElementById('dashboard-page').classList.contains('hidden')) {
    refreshActionCounts();
  }
});

async function refreshActionCounts() {
  try {
    const response = await fetchWithAuth(`${API_BASE}/dashboard`);
    if (response.ok) {
      const data = await response.json();
      dashboardData = data;
      // Re-render only action items for lightweight refresh
      const section = document.querySelector('.dashboard-grid--actions');
      if (section && data.actionItems) {
        const parent = section.closest('.dashboard-section');
        if (parent) {
          parent.outerHTML = renderActionItems(data.actionItems);
        }
      }
    }
  } catch (error) {
    // Silent fail on background refresh
  }
}

// ---------------------------------------------------------------------------
// Register with app-shell
// ---------------------------------------------------------------------------

registerPage('dashboard', { load: loadDashboard });

// ---------------------------------------------------------------------------
// Expose on window for backward compatibility
// ---------------------------------------------------------------------------

window.loadDashboard = loadDashboard;
window.handleNudgeAction = handleNudgeAction;
window.dismissNudge = dismissNudge;
window.switchDashboardTab = switchDashboardTab;
window.toggleSuggestionDetails = toggleSuggestionDetails;
window.showMoreSuggestions = showMoreSuggestions;
window.handleSuggestionAccept = handleSuggestionAccept;
window.handleChannelSelect = handleChannelSelect;
window.cancelChannelPicker = cancelChannelPicker;
window.handleSuggestionDismiss = handleSuggestionDismiss;
window.handleFeedbackSelect = handleFeedbackSelect;
window.submitOtherFeedback = submitOtherFeedback;
window.cancelFeedback = cancelFeedback;
window.handleSuggestionSnooze = handleSuggestionSnooze;
window.handleSnoozeSelect = handleSnoozeSelect;
window.cancelSnooze = cancelSnooze;
window.showGoalForm = showGoalForm;
window.hideGoalForm = hideGoalForm;
window.handleGoalPresetSelect = handleGoalPresetSelect;
window.handleGoalSubmit = handleGoalSubmit;
window.handleClearGoal = handleClearGoal;
window.togglePausePicker = togglePausePicker;
window.handlePauseSuggestions = handlePauseSuggestions;
window.handleResumeSuggestions = handleResumeSuggestions;
window.handleDismissAll = handleDismissAll;
window.handleGenerateNewSuggestions = handleGenerateNewSuggestions;
window.handleReviewSubmit = handleReviewSubmit;
window.handleDigestViewAll = handleDigestViewAll;
window.handleDigestDismiss = handleDigestDismiss;
