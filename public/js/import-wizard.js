/**
 * Import Wizard — guided chat history import flow for CatchUp.
 *
 * Owns: platform selection, export instructions, file upload with
 * drag-and-drop, progress polling, and import summary display.
 *
 * @module import-wizard
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

let currentStep = 'platform'; // platform | instructions | upload | progress | summary
let selectedPlatform = null;
let pollingInterval = null;
let wizardOverlay = null;

// ---------------------------------------------------------------------------
// Platform definitions
// ---------------------------------------------------------------------------

const PLATFORMS = [
  { id: 'whatsapp', name: 'WhatsApp', icon: '💬', highlighted: true, badge: 'Fastest — export in under a minute',
    instructions: [
      'Open a WhatsApp chat',
      'Tap the three dots menu (⋮) → More → Export chat',
      'Choose "Without Media" for faster upload',
      'Save or share the .txt file',
      'Upload the file here',
    ] },
  { id: 'instagram', name: 'Instagram', icon: '📸', highlighted: false,
    instructions: [
      'Go to Instagram Settings → Accounts Center → Your information and permissions',
      'Select "Download your information"',
      'Choose JSON format and select Messages',
      'Request download — Instagram will email you when ready',
      'Download and upload the JSON file here',
    ] },
  { id: 'facebook', name: 'Facebook Messenger', icon: '💙', highlighted: false,
    instructions: [
      'Go to Facebook Settings → Your Facebook Information',
      'Click "Download Your Information"',
      'Select JSON format and choose Messages',
      'Request download — Facebook will notify you when ready',
      'Download and upload the JSON file here',
    ] },
  { id: 'imessage', name: 'iMessage', icon: '🍎', highlighted: false,
    instructions: [
      'Use iMazing or similar tool to export iMessage history',
      'Export as CSV format',
      'Upload the CSV file here',
    ] },
  { id: 'twitter', name: 'X / Twitter DMs', icon: '🐦', highlighted: false,
    instructions: [
      'Go to Settings → Your Account → Download an archive of your data',
      'Request your archive — X will email you when ready',
      'Download and extract the archive',
      'Upload the direct-messages.js file here',
    ] },
  { id: 'google_messages', name: 'Google Messages / SMS', icon: '📱', highlighted: false,
    instructions: [
      'Install "SMS Backup & Restore" from the Play Store',
      'Create a backup (XML format)',
      'Transfer the .xml file to your computer',
      'Upload the XML file here',
    ] },
];

// ---------------------------------------------------------------------------
// Open / Close wizard
// ---------------------------------------------------------------------------

export function openImportWizard(preselectedPlatform) {
  currentStep = 'platform';
  selectedPlatform = preselectedPlatform || null;

  if (selectedPlatform) {
    currentStep = 'instructions';
  }

  renderWizard();
}

function closeImportWizard() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
  if (wizardOverlay && wizardOverlay.parentNode) {
    wizardOverlay.parentNode.removeChild(wizardOverlay);
  }
  wizardOverlay = null;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

function renderWizard() {
  if (wizardOverlay) closeImportWizard();

  wizardOverlay = document.createElement('div');
  wizardOverlay.className = 'import-wizard-overlay';
  wizardOverlay.onclick = (e) => { if (e.target === wizardOverlay) closeImportWizard(); };

  const wizard = document.createElement('div');
  wizard.className = 'import-wizard';

  let bodyHtml = '';
  let title = 'Import Chat History';

  switch (currentStep) {
    case 'platform':
      bodyHtml = renderPlatformSelection();
      break;
    case 'instructions':
      title = `Import from ${getPlatformName()}`;
      bodyHtml = renderInstructions();
      break;
    case 'upload':
      title = `Upload ${getPlatformName()} Export`;
      bodyHtml = renderUpload();
      break;
    case 'progress':
      title = 'Importing...';
      bodyHtml = renderProgress();
      break;
    case 'summary':
      title = 'Import Complete';
      bodyHtml = renderSummary();
      break;
  }

  wizard.innerHTML = `
    <div class="import-wizard__header">
      <div class="import-wizard__title">${escapeHtml(title)}</div>
      <button class="import-wizard__close" onclick="window.closeImportWizard()">✕</button>
    </div>
    <div class="import-wizard__body" id="import-wizard-body">
      ${bodyHtml}
    </div>
  `;

  wizardOverlay.appendChild(wizard);
  document.body.appendChild(wizardOverlay);

  // Attach drag-and-drop if on upload step
  if (currentStep === 'upload') {
    setupDragDrop();
  }
}

function getPlatformName() {
  const p = PLATFORMS.find(pl => pl.id === selectedPlatform);
  return p ? p.name : 'Unknown';
}

// ---------------------------------------------------------------------------
// Step: Platform Selection
// ---------------------------------------------------------------------------

function renderPlatformSelection() {
  return `
    <div class="platform-grid">
      ${PLATFORMS.map(p => `
        <div class="platform-card ${p.highlighted ? 'platform-card--highlighted' : ''}"
             onclick="window.selectImportPlatform('${p.id}')">
          <div class="platform-card__icon">${p.icon}</div>
          <div class="platform-card__name">${escapeHtml(p.name)}</div>
          ${p.badge ? `<div class="platform-card__badge">${escapeHtml(p.badge)}</div>` : ''}
        </div>
      `).join('')}
    </div>
  `;
}

function selectImportPlatform(platformId) {
  selectedPlatform = platformId;
  currentStep = 'instructions';
  renderWizard();
}

// ---------------------------------------------------------------------------
// Step: Instructions
// ---------------------------------------------------------------------------

function renderInstructions() {
  const platform = PLATFORMS.find(p => p.id === selectedPlatform);
  if (!platform) return '<p>Unknown platform</p>';

  return `
    <div class="import-instructions">
      <p style="font-size:14px;font-weight:600;color:var(--text-primary);margin-bottom:12px;">
        How to export your ${escapeHtml(platform.name)} data:
      </p>
      <ol>
        ${platform.instructions.map(step => `<li>${escapeHtml(step)}</li>`).join('')}
      </ol>
    </div>
    <div style="display:flex;gap:8px;margin-top:16px;">
      <button class="btn-primary" onclick="window.goToImportUpload()">I have my file ready</button>
      <button class="btn-secondary" onclick="window.handleExportNotReady()">My export isn't ready yet</button>
    </div>
    <div style="margin-top:12px;">
      <button class="btn-secondary" onclick="window.goToImportPlatforms()" style="font-size:12px;">← Back to platforms</button>
    </div>
  `;
}

function goToImportUpload() {
  currentStep = 'upload';
  renderWizard();
}

function goToImportPlatforms() {
  currentStep = 'platform';
  selectedPlatform = null;
  renderWizard();
}

async function handleExportNotReady() {
  try {
    await fetchWithAuth(`${API_BASE}/notifications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType: 'export_reminder',
        title: `${getPlatformName()} export reminder`,
        description: `Your ${getPlatformName()} data export should be ready. Check your email and upload it to CatchUp.`,
      }),
    });
  } catch (e) { /* silent */ }
  showToast("We'll remind you in 24 hours to check for your export", 'success');
  closeImportWizard();
}

// ---------------------------------------------------------------------------
// Step: Upload
// ---------------------------------------------------------------------------

function renderUpload() {
  return `
    <div class="file-drop-zone" id="file-drop-zone">
      <div class="file-drop-zone__icon">📁</div>
      <div class="file-drop-zone__text">
        Drag and drop your file here, or <strong>click to browse</strong>
      </div>
      <div style="font-size:12px;color:var(--text-tertiary);margin-top:8px;">Max 200MB</div>
      <input type="file" id="import-file-input" style="display:none;" onchange="window.handleImportFile(this.files[0])">
    </div>
    <div style="margin-top:12px;">
      <button class="btn-secondary" onclick="window.selectImportPlatform('${selectedPlatform}')" style="font-size:12px;">← Back to instructions</button>
    </div>
  `;
}

function setupDragDrop() {
  const zone = document.getElementById('file-drop-zone');
  const input = document.getElementById('import-file-input');
  if (!zone || !input) return;

  zone.onclick = () => input.click();

  zone.addEventListener('dragover', (e) => {
    e.preventDefault();
    zone.classList.add('dragover');
  });
  zone.addEventListener('dragleave', () => {
    zone.classList.remove('dragover');
  });
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
      handleImportFile(e.dataTransfer.files[0]);
    }
  });
}

async function handleImportFile(file) {
  if (!file) return;

  if (file.size > 200 * 1024 * 1024) {
    showToast('File exceeds 200MB limit', 'error');
    return;
  }

  const formData = new FormData();
  formData.append('file', file);
  if (selectedPlatform) {
    formData.append('platform', selectedPlatform);
  }

  currentStep = 'progress';
  renderWizard();

  try {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE}/imports/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(err.error || 'Upload failed');
    }

    const data = await response.json();
    startPolling(data.jobId);
  } catch (error) {
    showToast(error.message || 'Import failed', 'error');
    currentStep = 'upload';
    renderWizard();
  }
}

// ---------------------------------------------------------------------------
// Step: Progress
// ---------------------------------------------------------------------------

let progressData = { phase: 'uploading', percentage: 0, matched: 0 };

function renderProgress() {
  return `
    <div class="import-progress">
      <div style="font-size:40px;margin-bottom:16px;">⏳</div>
      <div class="import-progress__phase" id="import-phase">${escapeHtml(progressData.phase || 'Processing...')}</div>
      <div class="import-progress__bar">
        <div class="import-progress__fill" id="import-progress-fill" style="width:${progressData.percentage || 0}%"></div>
      </div>
      <div style="font-size:13px;color:var(--text-secondary);" id="import-matched">
        ${progressData.matched > 0 ? `${progressData.matched} contacts matched` : ''}
      </div>
    </div>
  `;
}

function startPolling(jobId) {
  if (pollingInterval) clearInterval(pollingInterval);

  pollingInterval = setInterval(async () => {
    try {
      const response = await fetchWithAuth(`${API_BASE}/imports/${jobId}/status`);
      if (!response.ok) return;

      const data = await response.json();
      progressData = data;

      // Update progress UI
      const phaseEl = document.getElementById('import-phase');
      const fillEl = document.getElementById('import-progress-fill');
      const matchedEl = document.getElementById('import-matched');

      if (phaseEl) phaseEl.textContent = data.phase || 'Processing...';
      if (fillEl) fillEl.style.width = `${data.percentage || 0}%`;
      if (matchedEl && data.matched > 0) matchedEl.textContent = `${data.matched} contacts matched`;

      if (data.status === 'complete' || data.status === 'failed') {
        clearInterval(pollingInterval);
        pollingInterval = null;

        if (data.status === 'complete') {
          progressData = data;
          currentStep = 'summary';
          renderWizard();
        } else {
          showToast(data.error || 'Import failed', 'error');
          currentStep = 'upload';
          renderWizard();
        }
      }
    } catch (e) { /* silent */ }
  }, 2000);
}

// ---------------------------------------------------------------------------
// Step: Summary
// ---------------------------------------------------------------------------

function renderSummary() {
  const d = progressData;
  return `
    <div class="import-summary">
      <div style="text-align:center;margin-bottom:20px;">
        <div style="font-size:48px;">✅</div>
        <h3 style="color:var(--text-primary);margin-top:8px;">Import Complete</h3>
      </div>
      <div class="import-summary__stat">
        <span class="import-summary__stat-label">Total Participants</span>
        <span class="import-summary__stat-value">${d.totalParticipants || 0}</span>
      </div>
      <div class="import-summary__stat">
        <span class="import-summary__stat-label">Auto-matched</span>
        <span class="import-summary__stat-value">${d.autoMatched || 0}</span>
      </div>
      <div class="import-summary__stat">
        <span class="import-summary__stat-label">Likely Matches</span>
        <span class="import-summary__stat-value">${d.likelyMatched || 0}</span>
      </div>
      <div class="import-summary__stat">
        <span class="import-summary__stat-label">Unmatched</span>
        <span class="import-summary__stat-value">${d.unmatched || 0}</span>
      </div>
      <div class="import-summary__stat">
        <span class="import-summary__stat-label">Enrichment Records</span>
        <span class="import-summary__stat-value">${d.enrichmentRecordsCreated || 0}</span>
      </div>
      <div style="display:flex;flex-direction:column;gap:8px;margin-top:20px;">
        ${d.likelyMatched > 0 ? `<button class="btn-primary" onclick="window.closeImportWizard(); window.navigateTo('directory');">Review Likely Matches</button>` : ''}
        ${d.unmatched > 0 ? `<button class="btn-secondary" onclick="window.closeImportWizard(); window.navigateTo('directory');">Review Pending Enrichments</button>` : ''}
        <button class="btn-secondary" onclick="window.closeImportWizard(); window.navigateTo('directory');">View Contacts</button>
      </div>
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Expose on window
// ---------------------------------------------------------------------------

window.openImportWizard = openImportWizard;
window.closeImportWizard = closeImportWizard;
window.selectImportPlatform = selectImportPlatform;
window.goToImportUpload = goToImportUpload;
window.goToImportPlatforms = goToImportPlatforms;
window.handleExportNotReady = handleExportNotReady;
window.handleImportFile = handleImportFile;
