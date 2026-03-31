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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function _authToken() {
  return getAuthToken();
}

function _userId() {
  return getCurrentUser().userId;
}

// ---------------------------------------------------------------------------
// Load dashboard
// ---------------------------------------------------------------------------

async function loadDashboard() {
  const container = document.getElementById('dashboard-content');
  if (!container) return;

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
    // Render zero-state fallback
    renderZeroState(container);
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

  if (isZeroState) {
    renderZeroState(container);
    return;
  }

  container.innerHTML = `
    ${renderActionItems(actionItems)}
    ${renderNudgeCards(nudges)}
    ${renderInsights(insights)}
    ${renderQuickActions()}
  `;
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
        <div class="dashboard-card dashboard-card--quick" onclick="window.navigateTo('suggestions')" role="button" tabindex="0">
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

function renderZeroState(container) {
  container.innerHTML = `
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
