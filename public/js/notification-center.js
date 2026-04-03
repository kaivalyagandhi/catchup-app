/**
 * Notification Center — slide-out panel from right side.
 *
 * Uses the fixed bell button in the top-right (next to theme toggle).
 * Opens a slide-out panel similar to the contact detail panel.
 *
 * @module notification-center
 */

import {
  escapeHtml,
  fetchWithAuth,
  API_BASE,
  formatRelativeTime,
} from './utils.js';

import { navigateTo } from './app-shell.js';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let notifications = [];
let unreadCount = 0;
let isPanelOpen = false;
let pollInterval = null;
let panelEl = null;
let overlayEl = null;

// ---------------------------------------------------------------------------
// Event type icons
// ---------------------------------------------------------------------------

const EVENT_ICONS = {
  import_complete: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
  import_failed: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
  ai_enrichment_ready: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/></svg>',
  export_reminder: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>',
  sync_conflict: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  pending_enrichments_reminder: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
};

// ---------------------------------------------------------------------------
// Initialize
// ---------------------------------------------------------------------------

function initNotificationCenter() {
  const bellBtn = document.getElementById('notification-bell-fixed');
  if (!bellBtn) return;

  bellBtn.onclick = togglePanel;

  // Start polling
  fetchUnreadCount();
  pollInterval = setInterval(fetchUnreadCount, 300000);
}

// ---------------------------------------------------------------------------
// Polling
// ---------------------------------------------------------------------------

async function fetchUnreadCount() {
  try {
    const response = await fetchWithAuth(`${API_BASE}/notifications/unread-count`);
    if (response.ok) {
      const data = await response.json();
      unreadCount = data.count || 0;
      updateBadge();
    }
  } catch (e) { /* silent */ }
}

function updateBadge() {
  const badge = document.getElementById('notification-badge-fixed');
  if (!badge) return;
  badge.textContent = unreadCount;
  badge.style.display = unreadCount > 0 ? 'flex' : 'none';
}

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------

function createPanelElements() {
  overlayEl = document.createElement('div');
  overlayEl.className = 'notification-panel-overlay';
  overlayEl.onclick = closePanel;

  panelEl = document.createElement('div');
  panelEl.className = 'notification-panel';
  panelEl.setAttribute('role', 'dialog');
  panelEl.setAttribute('aria-label', 'Notifications');

  document.body.appendChild(overlayEl);
  document.body.appendChild(panelEl);
}

function togglePanel() {
  if (isPanelOpen) {
    closePanel();
  } else {
    openPanel();
  }
}

async function openPanel() {
  if (!panelEl) createPanelElements();

  isPanelOpen = true;
  renderPanelContent();
  panelEl.classList.add('open');
  overlayEl.classList.add('show');

  // Hide top-right action buttons so they don't overlap the panel
  document.querySelectorAll('.theme-toggle, #notification-bell-fixed').forEach(el => el.style.display = 'none');

  // Load notifications
  try {
    const response = await fetchWithAuth(`${API_BASE}/notifications?limit=30`);
    if (response.ok) {
      const data = await response.json();
      notifications = Array.isArray(data) ? data : (data.notifications || []);
      renderPanelContent();
    }
  } catch (e) { /* silent */ }

  document.addEventListener('keydown', handlePanelKeydown);
}

function closePanel() {
  if (panelEl) panelEl.classList.remove('open');
  if (overlayEl) overlayEl.classList.remove('show');
  isPanelOpen = false;
  document.removeEventListener('keydown', handlePanelKeydown);

  // Restore top-right action buttons
  document.querySelectorAll('.theme-toggle, #notification-bell-fixed').forEach(el => el.style.display = '');
}

function handlePanelKeydown(e) {
  if (e.key === 'Escape' && isPanelOpen) {
    e.preventDefault();
    closePanel();
  }
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

function renderPanelContent() {
  if (!panelEl) return;

  const listHtml = notifications.length === 0
    ? `<div style="padding:40px 20px;text-align:center;color:var(--text-secondary);font-size:14px;">No notifications yet</div>`
    : notifications.map(n => {
        const icon = EVENT_ICONS[n.eventType || n.event_type] || '📋';
        const isUnread = !n.read;
        const createdAt = n.createdAt || n.created_at;

        return `
          <div class="notification-panel-item ${isUnread ? 'notification-panel-item--unread' : ''}"
               onclick="window.handleNotificationClick('${n.id}', '${escapeHtml(n.actionUrl || n.action_url || '')}')">
            <div class="notification-panel-item__icon">${icon}</div>
            <div class="notification-panel-item__content">
              <div class="notification-panel-item__title">${escapeHtml(n.title || '')}</div>
              <div class="notification-panel-item__desc">${escapeHtml(n.description || '')}</div>
              ${createdAt ? `<div class="notification-panel-item__time">${formatRelativeTime(new Date(createdAt))}</div>` : ''}
            </div>
          </div>
        `;
      }).join('');

  panelEl.innerHTML = `
    <div class="notification-panel__header">
      <h2 style="margin:0;font-size:18px;color:var(--text-primary);">Notifications</h2>
      <div style="display:flex;gap:8px;align-items:center;">
        <button class="btn-secondary" style="font-size:12px;padding:4px 10px;" onclick="window.markAllNotificationsRead()">Mark all read</button>
        <button class="notification-panel__close" onclick="window.closeNotificationPanel()" aria-label="Close">✕</button>
      </div>
    </div>
    <div class="notification-panel__body">
      ${listHtml}
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

async function handleNotificationClick(notificationId, actionUrl) {
  try {
    await fetchWithAuth(`${API_BASE}/notifications/${notificationId}/read`, { method: 'POST' });
    unreadCount = Math.max(0, unreadCount - 1);
    updateBadge();

    const item = notifications.find(n => n.id === notificationId);
    if (item) item.read = true;
    renderPanelContent();
  } catch (e) { /* silent */ }

  if (actionUrl) {
    closePanel();
    if (actionUrl.startsWith('#') || actionUrl.startsWith('/app')) {
      const page = actionUrl.replace('/app/', '').replace('#', '').split('/')[0];
      navigateTo(page || 'dashboard');
    }
  }
}

async function markAllNotificationsRead() {
  try {
    await fetchWithAuth(`${API_BASE}/notifications/mark-all-read`, { method: 'POST' });
    unreadCount = 0;
    updateBadge();
    notifications.forEach(n => n.read = true);
    renderPanelContent();
  } catch (e) { /* silent */ }
}

// ---------------------------------------------------------------------------
// Auto-init
// ---------------------------------------------------------------------------

function adjustTopButtonsForBanner() {
  const banner = document.querySelector('.sync-warning-banner:not(.hidden)');
  const themeBtn = document.getElementById('theme-toggle');
  const bellBtn = document.getElementById('notification-bell-fixed');
  
  if (banner && banner.offsetHeight > 0) {
    const bannerHeight = banner.offsetHeight;
    const offset = Math.max(bannerHeight + 8, 20) + 'px';
    document.documentElement.style.setProperty('--banner-height', bannerHeight + 'px');
    if (themeBtn) themeBtn.style.top = offset;
    if (bellBtn) bellBtn.style.top = offset;
    document.body.classList.add('sync-warning-visible');
  } else {
    document.documentElement.style.removeProperty('--banner-height');
    if (themeBtn) themeBtn.style.top = '20px';
    if (bellBtn) bellBtn.style.top = '20px';
    document.body.classList.remove('sync-warning-visible');
  }
}

window.addEventListener('app:ready', () => {
  initNotificationCenter();
  setTimeout(adjustTopButtonsForBanner, 300);
  setTimeout(adjustTopButtonsForBanner, 1000);
  setTimeout(adjustTopButtonsForBanner, 2000);
  setInterval(adjustTopButtonsForBanner, 10000);
});
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    initNotificationCenter();
    adjustTopButtonsForBanner();
  }, 1000);
});

// ---------------------------------------------------------------------------
// Expose on window
// ---------------------------------------------------------------------------

window.initNotificationCenter = initNotificationCenter;
window.handleNotificationClick = handleNotificationClick;
window.markAllNotificationsRead = markAllNotificationsRead;
window.closeNotificationPanel = closePanel;
