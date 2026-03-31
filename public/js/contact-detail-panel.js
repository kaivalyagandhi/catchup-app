/**
 * Contact Detail Panel — slide-out panel showing full contact profile.
 *
 * Owns: core fields with inline edit, relationship summary, enrichment
 * sources, source badges, circle/group/tag editing, sync status,
 * keyboard navigation (Escape, arrow keys), and responsive full-screen.
 *
 * @module contact-detail-panel
 */

import {
  escapeHtml,
  showToast,
  fetchWithAuth,
  API_BASE,
  formatRelativeTime,
} from './utils.js';

import { getAuthToken, getCurrentUser, navigateTo } from './app-shell.js';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let currentContact = null;
let contactEnrichments = [];
let panelEl = null;
let overlayEl = null;
let isOpen = false;
let contactList = []; // reference to directory contacts for arrow nav
let currentIndex = -1;

let isEditing = false;

// ---------------------------------------------------------------------------
// Platform icons
// ---------------------------------------------------------------------------

const PLATFORM_ICONS = {
  google: '<span class="source-pill" style="background:#4285f4;">G</span>',
  apple: '<span class="source-pill" style="background:#555;">A</span>',
  whatsapp: '<span class="source-pill" style="background:#25d366;">WA</span>',
  instagram: '<span class="source-pill" style="background:#e1306c;">IG</span>',
  facebook: '<span class="source-pill" style="background:#1877f2;">FB</span>',
  imessage: '<span class="source-pill" style="background:#555;">iM</span>',
  twitter: '<span class="source-pill" style="background:#1da1f2;">X</span>',
  google_messages: '<span class="source-pill" style="background:#1a73e8;">SMS</span>',
  voice_note: '<span class="source-pill" style="background:#10b981;">V</span>',
  manual: '<span class="source-pill" style="background:#78716c;">M</span>',
  calendar: '<span class="source-pill" style="background:#ea4335;">Cal</span>',
  chat_import: '<span class="source-pill" style="background:#f59e0b;">Chat</span>',
};

// ---------------------------------------------------------------------------
// Open / Close
// ---------------------------------------------------------------------------

export function openContactDetail(contact, contacts, index) {
  currentContact = contact;
  contactList = contacts || [];
  currentIndex = index >= 0 ? index : -1;

  if (!panelEl) createPanelElements();

  renderPanel();
  loadEnrichments(contact.id);

  panelEl.classList.add('open');
  overlayEl.classList.add('show');
  isOpen = true;

  // Hide top-right action buttons so they don't overlap the panel
  document.querySelectorAll('.theme-toggle, #notification-bell-fixed').forEach(el => el.style.display = 'none');

  document.addEventListener('keydown', handlePanelKeydown);
  // Trap focus
  panelEl.focus();
}

export function closeContactDetail() {
  if (panelEl) panelEl.classList.remove('open');
  if (overlayEl) overlayEl.classList.remove('show');
  isOpen = false;
  document.removeEventListener('keydown', handlePanelKeydown);

  // Restore top-right action buttons
  document.querySelectorAll('.theme-toggle, #notification-bell-fixed').forEach(el => el.style.display = '');
}

function createPanelElements() {
  overlayEl = document.createElement('div');
  overlayEl.className = 'contact-detail-overlay';
  overlayEl.onclick = closeContactDetail;

  panelEl = document.createElement('div');
  panelEl.className = 'contact-detail-panel';
  panelEl.setAttribute('tabindex', '-1');
  panelEl.setAttribute('role', 'dialog');
  panelEl.setAttribute('aria-label', 'Contact details');

  document.body.appendChild(overlayEl);
  document.body.appendChild(panelEl);
}

// ---------------------------------------------------------------------------
// Keyboard handling
// ---------------------------------------------------------------------------

function handlePanelKeydown(e) {
  if (!isOpen) return;

  if (e.key === 'Escape') {
    e.preventDefault();
    closeContactDetail();
    return;
  }

  // Arrow navigation between contacts
  if (e.key === 'ArrowDown' && contactList.length > 0) {
    e.preventDefault();
    if (currentIndex < contactList.length - 1) {
      currentIndex++;
      currentContact = contactList[currentIndex];
      renderPanel();
      loadEnrichments(currentContact.id);
    }
  }

  if (e.key === 'ArrowUp' && contactList.length > 0) {
    e.preventDefault();
    if (currentIndex > 0) {
      currentIndex--;
      currentContact = contactList[currentIndex];
      renderPanel();
      loadEnrichments(currentContact.id);
    }
  }
}

// ---------------------------------------------------------------------------
// Load enrichments
// ---------------------------------------------------------------------------

async function loadEnrichments(contactId) {
  try {
    const response = await fetchWithAuth(`${API_BASE}/contacts/${contactId}/enrichments`);
    if (response.ok) {
      contactEnrichments = await response.json();
      renderEnrichmentSections();
    }
  } catch (e) {
    contactEnrichments = [];
  }
}

// ---------------------------------------------------------------------------
// Render panel
// ---------------------------------------------------------------------------

function renderPanel() {
  if (!panelEl || !currentContact) return;
  const c = currentContact;

  panelEl.innerHTML = `
    <div class="contact-detail-panel__header">
      <h2 style="margin:0;font-size:18px;color:var(--text-primary);">${escapeHtml(c.name)}</h2>
      <button class="contact-detail-panel__close" onclick="window.closeContactDetail()" aria-label="Close panel">✕</button>
    </div>
    <div class="contact-detail-panel__body">
      ${renderCoreFields(c)}
      ${renderSourceBadges(c)}
      <div id="enrichment-summary-section"></div>
      <div id="enrichment-sources-section"></div>
      ${renderCircleGroupTags(c)}
      ${renderSyncStatus(c)}
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Core fields with inline edit
// ---------------------------------------------------------------------------

function renderCoreFields(c) {
  const fields = [
    { key: 'name', label: 'Name', value: c.name },
    { key: 'phone', label: 'Phone', value: c.phone },
    { key: 'email', label: 'Email', value: c.email },
    { key: 'location', label: 'Location', value: c.location },
    { key: 'timezone', label: 'Timezone', value: c.timezone },
    { key: 'customNotes', label: 'Notes', value: c.customNotes },
  ];

  return `
    <div class="contact-detail-section">
      <div class="contact-detail-section__title">Contact Info</div>
      ${fields.map(f => `
        <div class="contact-detail-field" data-field="${f.key}">
          <span class="contact-detail-field__label">${f.label}</span>
          <span class="contact-detail-field__value contact-detail-field__value--editable" onclick="window.startFieldEdit('${f.key}', this)">
            ${f.value ? escapeHtml(f.value) : '<span style="color:var(--text-tertiary)">—</span>'}
          </span>
        </div>
      `).join('')}
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Inline field editing (click to edit, Enter to save, Escape to cancel)
// ---------------------------------------------------------------------------

function startFieldEdit(field, el) {
  // Don't start if already editing
  if (el.querySelector('input')) return;

  const currentValue = currentContact[field] || '';
  const originalHtml = el.innerHTML;

  el.innerHTML = `<input class="contact-detail-field__input" value="${escapeHtml(currentValue)}" data-field="${field}">`;
  const input = el.querySelector('input');
  if (!input) return;

  input.focus();
  input.select();

  const save = async () => {
    const newValue = input.value.trim();
    if (newValue === currentValue) {
      el.innerHTML = originalHtml;
      return;
    }

    try {
      const response = await fetchWithAuth(`${API_BASE}/contacts/${currentContact.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: newValue || undefined }),
      });

      if (response.ok) {
        currentContact[field] = newValue;
        el.innerHTML = newValue ? escapeHtml(newValue) : '<span style="color:var(--text-tertiary)">—</span>';
        showToast('Updated', 'success');
      } else {
        el.innerHTML = originalHtml;
        showToast('Failed to update', 'error');
      }
    } catch (e) {
      el.innerHTML = originalHtml;
      showToast('Failed to update', 'error');
    }
  };

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); save(); }
    if (e.key === 'Escape') { e.preventDefault(); el.innerHTML = originalHtml; }
  });

  input.addEventListener('blur', () => {
    // Small delay to allow keydown to fire first
    setTimeout(() => { if (el.querySelector('input')) save(); }, 100);
  });
}

// ---------------------------------------------------------------------------
// Source badges
// ---------------------------------------------------------------------------

function renderSourceBadges(c) {
  const sources = c.sources || (c.source ? [c.source] : []);
  if (sources.length === 0) return '';

  return `
    <div class="contact-detail-section">
      <div class="contact-detail-section__title">Sources</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px;">
        ${sources.map(s => `<span class="source-badge">${PLATFORM_ICONS[s] || '📋'} ${escapeHtml(s)}</span>`).join('')}
      </div>
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Enrichment sections (populated async)
// ---------------------------------------------------------------------------

function renderEnrichmentSections() {
  const summaryEl = document.getElementById('enrichment-summary-section');
  const sourcesEl = document.getElementById('enrichment-sources-section');
  if (!summaryEl || !sourcesEl) return;

  if (!contactEnrichments || contactEnrichments.length === 0) {
    summaryEl.innerHTML = '';
    sourcesEl.innerHTML = '';
    return;
  }

  // Aggregate
  let totalMessages = 0;
  let latestDate = null;
  const enrichments = Array.isArray(contactEnrichments) ? contactEnrichments : (contactEnrichments.enrichments || []);

  enrichments.forEach(e => {
    totalMessages += e.messageCount || e.message_count || 0;
    const d = e.lastMessageDate || e.last_message_date;
    if (d) {
      const date = new Date(d);
      if (!latestDate || date > latestDate) latestDate = date;
    }
  });

  summaryEl.innerHTML = `
    <div class="contact-detail-section">
      <div class="contact-detail-section__title">Relationship Summary</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        <div style="padding:10px;background:var(--bg-secondary);border-radius:8px;text-align:center;">
          <div style="font-size:20px;font-weight:700;color:var(--text-primary);">${totalMessages}</div>
          <div style="font-size:11px;color:var(--text-secondary);">Total Messages</div>
        </div>
        <div style="padding:10px;background:var(--bg-secondary);border-radius:8px;text-align:center;">
          <div style="font-size:14px;font-weight:600;color:var(--text-primary);">${latestDate ? formatRelativeTime(latestDate) : '—'}</div>
          <div style="font-size:11px;color:var(--text-secondary);">Last Interaction</div>
        </div>
      </div>
    </div>
  `;

  sourcesEl.innerHTML = `
    <div class="contact-detail-section">
      <div class="contact-detail-section__title">Enrichment Sources</div>
      ${enrichments.map(e => {
        const platform = e.platform || 'unknown';
        const msgCount = e.messageCount || e.message_count || 0;
        const topics = e.topics || [];
        const sentiment = e.sentiment;
        const firstDate = e.firstMessageDate || e.first_message_date;
        const lastDate = e.lastMessageDate || e.last_message_date;

        return `
          <div class="enrichment-source-card">
            <div class="enrichment-source-card__header">
              <span>${PLATFORM_ICONS[platform] || '📋'}</span>
              <span class="enrichment-source-card__platform">${escapeHtml(platform)}</span>
              ${sentiment ? `<span class="source-badge">${escapeHtml(sentiment)}</span>` : ''}
            </div>
            <div class="enrichment-source-card__stats">
              <span>${msgCount} messages</span>
              ${firstDate && lastDate ? `<span>${new Date(firstDate).toLocaleDateString()} — ${new Date(lastDate).toLocaleDateString()}</span>` : ''}
            </div>
            ${topics.length > 0 ? `
              <div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:8px;">
                ${topics.slice(0, 5).map(t => `<span class="tag-badge">${escapeHtml(typeof t === 'string' ? t : t.name || '')}</span>`).join('')}
              </div>
            ` : ''}
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Circle / Group / Tags
// ---------------------------------------------------------------------------

function renderCircleGroupTags(c) {
  const circleNames = { inner: 'Inner Circle', close: 'Close Friends', active: 'Active Friends', casual: 'Casual Network' };
  const circle = c.dunbarCircle || c.circle;

  let tagsHtml = '';
  if (c.tags && c.tags.length > 0) {
    tagsHtml = c.tags.map(t => `<span class="tag-badge">${escapeHtml(typeof t === 'string' ? t : t.text || '')}</span>`).join('');
  }

  let groupsHtml = '';
  if (c.groups && c.groups.length > 0) {
    const allGroups = window.groups || [];
    groupsHtml = c.groups.map(gid => {
      const g = allGroups.find(gr => gr.id === gid);
      return `<span class="group-badge">${escapeHtml(g ? g.name : gid)}</span>`;
    }).join('');
  }

  return `
    <div class="contact-detail-section">
      <div class="contact-detail-section__title">Organization</div>
      ${circle ? `<div style="margin-bottom:8px;"><strong>Circle:</strong> ${circleNames[circle] || circle}</div>` : ''}
      ${groupsHtml ? `<div style="margin-bottom:8px;"><strong>Groups:</strong><div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px;">${groupsHtml}</div></div>` : ''}
      ${tagsHtml ? `<div><strong>Tags:</strong><div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px;">${tagsHtml}</div></div>` : ''}
      ${!circle && !groupsHtml && !tagsHtml ? '<div style="color:var(--text-tertiary);font-size:13px;">No organization data</div>' : ''}
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Sync status
// ---------------------------------------------------------------------------

function renderSyncStatus(c) {
  if (!c.googleResourceName && c.source !== 'google') return '';

  let statusClass = 'synced';
  let statusText = 'Synced';
  if (c.pendingSyncChanges > 0) { statusClass = 'pending'; statusText = 'Pending changes'; }

  return `
    <div class="contact-detail-section">
      <div class="contact-detail-section__title">Sync Status</div>
      <div class="sync-status">
        <span class="sync-status__dot sync-status__dot--${statusClass}"></span>
        <span>${statusText}</span>
        ${c.lastSyncedAt ? `<span style="color:var(--text-tertiary);font-size:11px;margin-left:auto;">Last synced ${formatRelativeTime(new Date(c.lastSyncedAt))}</span>` : ''}
      </div>
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Expose on window
// ---------------------------------------------------------------------------

window.openContactDetail = openContactDetail;
window.closeContactDetail = closeContactDetail;
window.startFieldEdit = startFieldEdit;
