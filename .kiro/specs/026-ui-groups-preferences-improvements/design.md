# Groups & Preferences UI Improvements - Design Document

## Overview

This design document outlines the technical implementation for five UI improvements to enhance user experience and visual consistency across the Groups page and Preferences page:

1. **Reviewed Groups Section**: Add a collapsible section to the Groups page displaying accepted and rejected group mappings
2. **Automatic Onboarding Step 3 Completion**: Automatically mark Step 3 complete when at least one group mapping is reviewed
3. **Onboarding Modal Controls**: Add "Dismiss" and "Finish Later" buttons with clear restart instructions
4. **Preferences Page UI Consistency**: Standardize typography, buttons, inputs, and spacing
5. **Google Integration Container Heights**: Equalize heights of Google Calendar and Contacts containers

### Design Goals

- **Transparency**: Users can review their group mapping decisions at any time
- **Reduced Friction**: Automatic step completion reduces manual overhead
- **Clear Exit Options**: Users understand how to pause or dismiss onboarding
- **Professional Appearance**: Consistent styling improves perceived quality
- **Visual Balance**: Equal container heights create a polished design

## Architecture

### Component Structure

```
Groups Page
├── Google Mappings Review (existing)
├── Groups Table (existing)
└── Reviewed Groups Section (NEW)
    ├── Section Header (collapsible)
    ├── Accepted Mappings List
    └── Rejected Mappings List

Onboarding Modal
├── Modal Header
├── Step List
│   ├── Step 1: Connect Accounts
│   ├── Step 2: Organize Circles
│   └── Step 3: Review Groups
└── Modal Footer (NEW)
    ├── Finish Later Button (NEW)
    └── Dismiss Button (NEW)

Preferences Page
├── Integrations Section
│   ├── Google Calendar Container
│   └── Google Contacts Container (height-matched)
└── Display Settings Section
```

## Detailed Design

### 1. Reviewed Groups Section

#### 1.1 Data Model

```typescript
interface ReviewedGroupMapping {
  id: string;
  googleGroupId: string;
  googleGroupName: string;
  catchupGroupId: string | null;
  catchupGroupName: string | null;
  status: 'accepted' | 'rejected';
  reviewedAt: Date;
  memberCount: number;
}
```


#### 1.2 API Endpoint

**GET /api/google-contacts/reviewed-mappings**
- Query params: `userId`
- Returns: `{ mappings: ReviewedGroupMapping[] }`
- Fetches all reviewed group mappings (accepted and rejected)

#### 1.3 UI Components

**ReviewedGroupsSection Component**
- Location: Rendered at bottom of Groups page
- State:
  - `isExpanded: boolean` (default: true, persisted in localStorage)
  - `reviewedMappings: ReviewedGroupMapping[]`
- Methods:
  - `toggleExpanded()`: Toggle collapse state
  - `fetchReviewedMappings()`: Load data from API
  - `renderAcceptedMappings()`: Render accepted list
  - `renderRejectedMappings()`: Render rejected list

#### 1.4 HTML Structure

```html
<div class="reviewed-groups-section" id="reviewed-groups-section">
  <div class="reviewed-groups-header" onclick="toggleReviewedGroups()">
    <h3>
      <span class="expand-icon">▼</span>
      Reviewed Groups
      <span class="count-badge">5</span>
    </h3>
  </div>
  
  <div class="reviewed-groups-content" id="reviewed-groups-content">
    <!-- Accepted Mappings -->
    <div class="reviewed-mappings-group">
      <h4>Accepted Mappings</h4>
      <div class="reviewed-mapping accepted">
        <span class="status-icon">✓</span>
        <span class="mapping-text">
          <strong>Family</strong> (Google) → <strong>Inner Circle</strong> (CatchUp)
        </span>
        <span class="member-count">12 members</span>
      </div>
    </div>
    
    <!-- Rejected Mappings -->
    <div class="reviewed-mappings-group">
      <h4>Skipped Mappings</h4>
      <div class="reviewed-mapping rejected">
        <span class="status-icon">⊘</span>
        <span class="mapping-text muted">
          <del>Old Contacts</del> (Google) - Skipped
        </span>
        <span class="member-count muted">3 members</span>
      </div>
    </div>
  </div>
</div>
```


#### 1.5 CSS Styling

```css
/* Reviewed Groups Section */
.reviewed-groups-section {
  margin-top: 32px;
  padding-top: 24px;
  border-top: 2px solid var(--border-subtle);
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 20px;
}

.reviewed-groups-header {
  cursor: pointer;
  user-select: none;
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-radius: 8px;
  transition: background 0.2s ease;
}

.reviewed-groups-header:hover {
  background: var(--bg-hover);
}

.reviewed-groups-header h3 {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.expand-icon {
  font-size: 14px;
  transition: transform 0.2s ease;
}

.reviewed-groups-section.collapsed .expand-icon {
  transform: rotate(-90deg);
}

.reviewed-groups-content {
  margin-top: 16px;
  transition: max-height 0.3s ease, opacity 0.3s ease;
  overflow: hidden;
}

.reviewed-groups-section.collapsed .reviewed-groups-content {
  max-height: 0;
  opacity: 0;
}

/* Reviewed Mappings Groups */
.reviewed-mappings-group {
  margin-bottom: 24px;
}

.reviewed-mappings-group:last-child {
  margin-bottom: 0;
}

.reviewed-mappings-group h4 {
  font-size: 14px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-secondary);
  margin-bottom: 12px;
}

/* Reviewed Mapping Items */
.reviewed-mapping {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
  margin-bottom: 8px;
  transition: all 0.2s ease;
}

.reviewed-mapping:last-child {
  margin-bottom: 0;
}

.reviewed-mapping.accepted {
  border-left: 4px solid var(--status-success);
}

.reviewed-mapping.rejected {
  border-left: 4px solid var(--text-tertiary);
  opacity: 0.7;
}

.status-icon {
  font-size: 18px;
  flex-shrink: 0;
}

.reviewed-mapping.accepted .status-icon {
  color: var(--status-success);
}

.reviewed-mapping.rejected .status-icon {
  color: var(--text-tertiary);
}

.mapping-text {
  flex: 1;
  font-size: 14px;
  color: var(--text-primary);
}

.mapping-text.muted {
  color: var(--text-tertiary);
}

.mapping-text del {
  text-decoration: line-through;
}

.member-count {
  font-size: 12px;
  color: var(--text-secondary);
  padding: 4px 8px;
  background: var(--bg-tertiary);
  border-radius: 12px;
}

.member-count.muted {
  color: var(--text-tertiary);
}
```


#### 1.6 JavaScript Implementation

```javascript
// Add to groups-table.js or create reviewed-groups.js

class ReviewedGroupsSection {
  constructor(container) {
    this.container = container;
    this.isExpanded = this.loadExpandedState();
    this.mappings = [];
  }
  
  async render() {
    await this.fetchReviewedMappings();
    
    if (this.mappings.length === 0) {
      this.container.innerHTML = '';
      return;
    }
    
    const acceptedMappings = this.mappings.filter(m => m.status === 'accepted');
    const rejectedMappings = this.mappings.filter(m => m.status === 'rejected');
    
    this.container.innerHTML = `
      <div class="reviewed-groups-section ${this.isExpanded ? '' : 'collapsed'}" 
           id="reviewed-groups-section">
        <div class="reviewed-groups-header" onclick="window.reviewedGroupsSection.toggleExpanded()">
          <h3>
            <span class="expand-icon">${this.isExpanded ? '▼' : '▶'}</span>
            Reviewed Groups
            <span class="count-badge">${this.mappings.length}</span>
          </h3>
        </div>
        
        <div class="reviewed-groups-content" id="reviewed-groups-content">
          ${acceptedMappings.length > 0 ? this.renderAcceptedMappings(acceptedMappings) : ''}
          ${rejectedMappings.length > 0 ? this.renderRejectedMappings(rejectedMappings) : ''}
        </div>
      </div>
    `;
  }
  
  renderAcceptedMappings(mappings) {
    return `
      <div class="reviewed-mappings-group">
        <h4>Accepted Mappings</h4>
        ${mappings.map(m => `
          <div class="reviewed-mapping accepted">
            <span class="status-icon">✓</span>
            <span class="mapping-text">
              <strong>${this.escapeHtml(m.googleGroupName)}</strong> (Google) → 
              <strong>${this.escapeHtml(m.catchupGroupName)}</strong> (CatchUp)
            </span>
            <span class="member-count">${m.memberCount} members</span>
          </div>
        `).join('')}
      </div>
    `;
  }
  
  renderRejectedMappings(mappings) {
    return `
      <div class="reviewed-mappings-group">
        <h4>Skipped Mappings</h4>
        ${mappings.map(m => `
          <div class="reviewed-mapping rejected">
            <span class="status-icon">⊘</span>
            <span class="mapping-text muted">
              <del>${this.escapeHtml(m.googleGroupName)}</del> (Google) - Skipped
            </span>
            <span class="member-count muted">${m.memberCount} members</span>
          </div>
        `).join('')}
      </div>
    `;
  }
  
  async fetchReviewedMappings() {
    const authToken = localStorage.getItem('authToken');
    const userId = window.userId || localStorage.getItem('userId');
    
    try {
      const response = await fetch(
        `${window.API_BASE || '/api'}/google-contacts/reviewed-mappings?userId=${userId}`,
        { headers: { 'Authorization': `Bearer ${authToken}` } }
      );
      
      if (response.ok) {
        const data = await response.json();
        this.mappings = data.mappings || [];
      }
    } catch (error) {
      console.error('Failed to fetch reviewed mappings:', error);
      this.mappings = [];
    }
  }
  
  toggleExpanded() {
    this.isExpanded = !this.isExpanded;
    this.saveExpandedState();
    
    const section = document.getElementById('reviewed-groups-section');
    if (section) {
      section.classList.toggle('collapsed');
    }
    
    const icon = section?.querySelector('.expand-icon');
    if (icon) {
      icon.textContent = this.isExpanded ? '▼' : '▶';
    }
  }
  
  loadExpandedState() {
    const saved = localStorage.getItem('reviewed-groups-expanded');
    return saved === null ? true : saved === 'true';
  }
  
  saveExpandedState() {
    localStorage.setItem('reviewed-groups-expanded', this.isExpanded.toString());
  }
  
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Global instance
window.reviewedGroupsSection = null;

// Initialize in groups page load
function initializeReviewedGroupsSection() {
  const container = document.getElementById('reviewed-groups-container');
  if (container) {
    window.reviewedGroupsSection = new ReviewedGroupsSection(container);
    window.reviewedGroupsSection.render();
  }
}
```


### 2. Automatic Onboarding Step 3 Completion

#### 2.1 Completion Logic

**Trigger Points:**
- After accepting a group mapping
- After rejecting a group mapping
- When loading groups page with at least one reviewed mapping

**Implementation in step3-group-mapping-handler.js:**

```javascript
// Update the updateProgress method
async updateProgress() {
  const reviewed = this.mappings.filter(m => m.reviewed).length;
  
  // Update state
  this.state.steps.groups.mappingsReviewed = reviewed;
  
  // Check if Step 3 should be marked complete
  // Complete if: at least one mapping reviewed OR no mappings exist
  const shouldComplete = reviewed > 0 || this.mappings.length === 0;
  
  if (shouldComplete && !this.state.steps.groups.complete) {
    this.state.steps.groups.complete = true;
    await this.stateManager.saveState(this.userId, this.state);
    
    // Mark onboarding as complete if all steps are done
    await this.checkAndCompleteOnboarding();
    
    // Update onboarding indicator UI
    if (window.onboardingIndicator) {
      window.onboardingIndicator.updateState(this.state);
    }
    
    // Show success toast
    if (typeof showToast === 'function') {
      showToast('✓ Step 3 complete!', 'success');
    }
  } else {
    await this.stateManager.saveState(this.userId, this.state);
  }
}
```

#### 2.2 Onboarding Indicator Update

The onboarding indicator (sidebar) should automatically update when Step 3 completes:

```javascript
// In onboarding-indicator.js or similar
updateState(state) {
  // Update step 3 visual state
  const step3Element = document.querySelector('[data-step="groups"]');
  if (step3Element && state.steps.groups.complete) {
    step3Element.classList.add('completed');
    step3Element.querySelector('.step-icon').textContent = '✓';
  }
  
  // Check if all steps complete
  const allComplete = 
    state.steps.integrations.complete &&
    state.steps.circles.complete &&
    state.steps.groups.complete;
  
  if (allComplete) {
    this.showCompletionState();
  }
}
```


### 3. Onboarding Modal Dismiss and Finish Later Buttons

#### 3.1 Modal Structure Update

**Current Structure:**
```html
<div id="onboarding-modal">
  <div class="modal-header">
    <h2>Get Started</h2>
    <button class="close-btn">✕</button>  <!-- REMOVE THIS -->
  </div>
  <div class="modal-body">
    <!-- Steps -->
  </div>
</div>
```

**New Structure:**
```html
<div id="onboarding-modal">
  <div class="modal-header">
    <h2>Get Started</h2>
  </div>
  <div class="modal-body">
    <!-- Step 1: Connect Accounts -->
    <div class="onboarding-step" data-step="integrations">
      <span class="step-icon">✓</span>
      <span class="step-label">Connect Accounts</span>
    </div>
    
    <!-- Step 2: Organize Circles -->
    <div class="onboarding-step" data-step="circles">
      <span class="step-icon">✓</span>
      <span class="step-label">Organize Circles</span>
    </div>
    
    <!-- Step 3: Review Groups -->
    <div class="onboarding-step active" data-step="groups">
      <span class="step-icon">→</span>
      <span class="step-label">Review Groups</span>
    </div>
  </div>
  
  <!-- NEW: Modal Footer -->
  <div class="modal-footer">
    <button class="btn-finish-later" onclick="finishLater()">
      Finish Later
    </button>
    <button class="btn-dismiss" onclick="dismissOnboarding()">
      Dismiss
    </button>
  </div>
</div>
```

#### 3.2 CSS Styling

```css
/* Modal Footer */
.modal-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-top: 1px solid var(--border-subtle);
  gap: 12px;
  margin-top: 20px;
}

/* Finish Later Button - Secondary Style */
.btn-finish-later {
  flex: 1;
  padding: 10px 20px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-finish-later:hover {
  background: var(--bg-hover);
  border-color: var(--border-default);
}

/* Dismiss Button - Tertiary/Text Style */
.btn-dismiss {
  flex: 1;
  padding: 10px 20px;
  background: transparent;
  color: var(--text-secondary);
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-dismiss:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

/* Remove X button from header */
.modal-header .close-btn {
  display: none;
}

/* Mobile responsive */
@media (max-width: 768px) {
  .modal-footer {
    flex-direction: column;
    gap: 8px;
  }
  
  .btn-finish-later,
  .btn-dismiss {
    width: 100%;
  }
}
```


#### 3.3 JavaScript Implementation

```javascript
// Add to app.js or onboarding modal code

/**
 * Finish Later - Closes modal and saves progress
 */
function finishLater() {
  // Save current progress
  if (window.onboardingController) {
    window.onboardingController.saveProgress().then(() => {
      closeOnboardingModal();
      
      if (typeof showToast === 'function') {
        showToast('Progress saved. You can continue anytime!', 'info');
      }
    }).catch(error => {
      console.error('Failed to save progress:', error);
      // Still close modal even if save fails
      closeOnboardingModal();
    });
  } else {
    closeOnboardingModal();
  }
}

/**
 * Dismiss Onboarding - Shows confirmation dialog
 */
function dismissOnboarding() {
  showConfirmDialog({
    title: 'Dismiss Onboarding',
    message: 'Are you sure you want to dismiss onboarding? You can restart it anytime from Preferences.',
    confirmText: 'Dismiss',
    cancelText: 'Cancel',
    type: 'warning',
    onConfirm: async () => {
      try {
        // Save progress and mark as dismissed
        if (window.onboardingController) {
          await window.onboardingController.saveProgress();
        }
        
        // Mark onboarding as dismissed in localStorage
        const userId = window.userId || localStorage.getItem('userId');
        if (userId) {
          localStorage.setItem(`onboarding-dismissed-${userId}`, 'true');
        }
        
        // Close modal
        closeOnboardingModal();
        
        if (typeof showToast === 'function') {
          showToast('Onboarding dismissed. Restart anytime from Preferences.', 'info');
        }
      } catch (error) {
        console.error('Failed to dismiss onboarding:', error);
        if (typeof showToast === 'function') {
          showToast('Failed to dismiss onboarding. Please try again.', 'error');
        }
      }
    }
  });
}

/**
 * Show confirmation dialog
 */
function showConfirmDialog(options) {
  const {
    title = 'Confirm',
    message = 'Are you sure?',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    type = 'default',
    onConfirm = () => {},
    onCancel = () => {}
  } = options;
  
  // Create modal overlay
  const overlay = document.createElement('div');
  overlay.className = 'confirm-dialog-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
  `;
  
  // Create dialog
  const dialog = document.createElement('div');
  dialog.className = 'confirm-dialog';
  dialog.style.cssText = `
    background: var(--bg-surface);
    border-radius: 12px;
    padding: 24px;
    max-width: 400px;
    width: 90%;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  `;
  
  dialog.innerHTML = `
    <h3 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 600; color: var(--text-primary);">
      ${title}
    </h3>
    <p style="margin: 0 0 20px 0; font-size: 14px; color: var(--text-secondary); line-height: 1.5;">
      ${message}
    </p>
    <div style="display: flex; gap: 12px; justify-content: flex-end;">
      <button class="btn-cancel" style="
        padding: 8px 16px;
        background: var(--bg-secondary);
        color: var(--text-primary);
        border: 1px solid var(--border-subtle);
        border-radius: 6px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
      ">${cancelText}</button>
      <button class="btn-confirm" style="
        padding: 8px 16px;
        background: ${type === 'warning' ? 'var(--status-warning)' : 'var(--accent-primary)'};
        color: var(--text-inverse);
        border: none;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
      ">${confirmText}</button>
    </div>
  `;
  
  overlay.appendChild(dialog);
  document.body.appendChild(overlay);
  
  // Event handlers
  const closeDialog = () => overlay.remove();
  
  dialog.querySelector('.btn-cancel').addEventListener('click', () => {
    closeDialog();
    onCancel();
  });
  
  dialog.querySelector('.btn-confirm').addEventListener('click', () => {
    closeDialog();
    onConfirm();
  });
  
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closeDialog();
      onCancel();
    }
  });
}

/**
 * Update modal rendering to include footer
 */
function renderOnboardingModal() {
  // ... existing modal rendering code ...
  
  // Add footer to modal
  const modalFooter = `
    <div class="modal-footer">
      <button class="btn-finish-later" onclick="finishLater()">
        Finish Later
      </button>
      <button class="btn-dismiss" onclick="dismissOnboarding()">
        Dismiss
      </button>
    </div>
  `;
  
  // Append footer to modal
  const modal = document.getElementById('onboarding-modal');
  if (modal) {
    modal.insertAdjacentHTML('beforeend', modalFooter);
  }
}
```


### 4. Preferences Page UI Consistency

#### 4.1 Typography Standards

**Headings:**
- Page Title (h2): `font-size: 24px; font-weight: 600; color: var(--text-primary); margin-bottom: 24px;`
- Section Title (h3): `font-size: 18px; font-weight: 600; color: var(--text-primary); margin-bottom: 16px;`
- Subsection Title (h4): `font-size: 14px; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px;`

**Body Text:**
- Primary: `font-size: 14px; color: var(--text-primary); line-height: 1.6;`
- Secondary: `font-size: 13px; color: var(--text-secondary); line-height: 1.5;`
- Tertiary: `font-size: 12px; color: var(--text-tertiary); line-height: 1.4;`

#### 4.2 Button Standards

**Primary Button:**
```css
.btn-primary {
  padding: 10px 20px;
  background: var(--accent-primary);
  color: var(--text-inverse);
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary:hover {
  background: var(--accent-hover);
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}
```

**Secondary Button:**
```css
.btn-secondary {
  padding: 10px 20px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-secondary:hover {
  background: var(--bg-hover);
  border-color: var(--border-default);
}
```

#### 4.3 Input Field Standards

```css
input, select, textarea {
  width: 100%;
  padding: 10px 14px;
  background: var(--bg-app);
  color: var(--text-primary);
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
  font-size: 14px;
  font-family: inherit;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

input:focus, select:focus, textarea:focus {
  outline: none;
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 3px var(--accent-glow);
}

input::placeholder, textarea::placeholder {
  color: var(--text-tertiary);
}
```

#### 4.4 Section Spacing Standards

```css
/* Preferences Page Layout */
#preferences-page {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

/* Section Spacing */
.preferences-section {
  margin-bottom: 32px;
  padding: 24px;
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: 12px;
}

.preferences-section:last-child {
  margin-bottom: 0;
}

/* Form Group Spacing */
.form-group {
  margin-bottom: 20px;
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.form-group .help-text {
  margin-top: 6px;
  font-size: 12px;
  color: var(--text-tertiary);
}
```


### 5. Google Integration Container Height Equalization

#### 5.1 Current Structure

```html
<div class="preferences-section">
  <h3>Integrations</h3>
  
  <div class="integrations-grid">
    <!-- Google Calendar Container -->
    <div class="integration-card">
      <div class="integration-header">
        <h4>Google Calendar</h4>
        <span class="status-badge connected">Connected</span>
      </div>
      <div class="integration-body">
        <p>Connected as: user@gmail.com</p>
        <div class="integration-stats">
          <div class="stat">
            <span class="stat-label">Last Sync</span>
            <span class="stat-value">1/23/2026</span>
          </div>
          <div class="stat">
            <span class="stat-label">Events Synced</span>
            <span class="stat-value">24</span>
          </div>
        </div>
        <div class="integration-info">
          <p>One-Way Sync (Read-Only)</p>
          <p>CatchUp imports your calendar events...</p>
        </div>
      </div>
      <div class="integration-actions">
        <button class="btn-primary">Sync Now</button>
        <button class="btn-secondary">Disconnect</button>
      </div>
    </div>
    
    <!-- Google Contacts Container -->
    <div class="integration-card">
      <div class="integration-header">
        <h4>Google Contacts</h4>
        <span class="status-badge connected">Connected (Read-Only)</span>
      </div>
      <div class="integration-body">
        <p>Connected as: user@gmail.com</p>
        <div class="integration-stats">
          <div class="stat">
            <span class="stat-label">Last Sync</span>
            <span class="stat-value">14 hours ago</span>
          </div>
          <div class="stat">
            <span class="stat-label">Contacts Synced</span>
            <span class="stat-value">1315</span>
          </div>
        </div>
        <div class="integration-info">
          <p>One-Way Sync (Read-Only)</p>
          <p>CatchUp imports your contacts from Google Contacts...</p>
        </div>
      </div>
      <div class="integration-actions">
        <button class="btn-primary">Sync Now</button>
        <button class="btn-secondary">Disconnect</button>
      </div>
    </div>
  </div>
</div>
```

#### 5.2 CSS Implementation

```css
/* Integrations Grid - Equal Height Cards */
.integrations-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  align-items: stretch; /* Key: Makes all cards same height */
}

/* Integration Card - Flexbox for internal layout */
.integration-card {
  display: flex;
  flex-direction: column;
  background: var(--bg-secondary);
  border: 1px solid var(--border-subtle);
  border-radius: 12px;
  padding: 20px;
  transition: box-shadow 0.2s ease;
  min-height: 100%; /* Ensures full height */
}

.integration-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

/* Integration Header */
.integration-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-subtle);
}

.integration-header h4 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.status-badge {
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.status-badge.connected {
  background: var(--status-success-bg);
  color: var(--status-success-text);
}

/* Integration Body - Grows to fill space */
.integration-body {
  flex: 1; /* Key: Takes up available space */
  margin-bottom: 16px;
}

.integration-body > p {
  margin: 0 0 12px 0;
  font-size: 13px;
  color: var(--text-secondary);
}

/* Integration Stats */
.integration-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 16px;
  padding: 12px;
  background: var(--bg-tertiary);
  border-radius: 8px;
}

.stat {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-tertiary);
}

.stat-value {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

/* Integration Info */
.integration-info {
  padding: 12px;
  background: var(--bg-app);
  border-radius: 8px;
  border-left: 3px solid var(--accent-primary);
}

.integration-info p {
  margin: 0 0 8px 0;
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.5;
}

.integration-info p:last-child {
  margin-bottom: 0;
}

.integration-info p:first-child {
  font-weight: 600;
  color: var(--text-primary);
}

/* Integration Actions - Fixed at bottom */
.integration-actions {
  display: flex;
  gap: 10px;
  margin-top: auto; /* Key: Pushes to bottom */
  padding-top: 16px;
  border-top: 1px solid var(--border-subtle);
}

.integration-actions button {
  flex: 1;
}

/* Mobile Responsive */
@media (max-width: 768px) {
  .integrations-grid {
    grid-template-columns: 1fr;
  }
  
  .integration-actions {
    flex-direction: column;
  }
  
  .integration-actions button {
    width: 100%;
  }
}
```


## Implementation Plan

### Phase 1: Backend API (if needed)

**New Endpoint:**
```typescript
// GET /api/google-contacts/reviewed-mappings
// Returns all reviewed group mappings for a user

router.get('/google-contacts/reviewed-mappings', authenticate, async (req, res) => {
  const { userId } = req.query;
  
  try {
    const mappings = await db.query(`
      SELECT 
        gm.id,
        gm.google_group_id,
        gm.google_group_name,
        gm.catchup_group_id,
        g.name as catchup_group_name,
        gm.status,
        gm.reviewed_at,
        gm.member_count
      FROM google_group_mappings gm
      LEFT JOIN groups g ON g.id = gm.catchup_group_id
      WHERE gm.user_id = $1
        AND gm.status IN ('accepted', 'rejected')
      ORDER BY gm.reviewed_at DESC
    `, [userId]);
    
    res.json({ mappings: mappings.rows });
  } catch (error) {
    console.error('Failed to fetch reviewed mappings:', error);
    res.status(500).json({ error: 'Failed to fetch reviewed mappings' });
  }
});
```

**Database Schema (if not exists):**
```sql
-- Add status column to google_group_mappings table if not exists
ALTER TABLE google_group_mappings 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS member_count INTEGER DEFAULT 0;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_google_group_mappings_user_status 
ON google_group_mappings(user_id, status);
```

### Phase 2: Frontend Components

**File Changes:**

1. **public/js/groups-table.js**
   - Add container div for reviewed groups section
   - Initialize ReviewedGroupsSection after groups table renders

2. **public/js/reviewed-groups-section.js** (NEW FILE)
   - Create ReviewedGroupsSection class
   - Implement render, toggle, fetch methods

3. **public/css/groups-table.css**
   - Add reviewed groups section styles
   - Add accepted/rejected mapping styles

4. **public/js/app.js**
   - Update onboarding modal rendering
   - Add finishLater() and dismissOnboarding() functions
   - Add showConfirmDialog() utility function
   - Remove X close button from modal header

5. **public/js/step3-group-mapping-handler.js**
   - Update updateProgress() to check for Step 3 completion
   - Trigger onboarding indicator update

6. **public/index.html**
   - Update preferences page structure
   - Apply consistent styling classes
   - Update integration cards HTML

7. **public/css/preferences.css** (NEW FILE or update existing)
   - Add preferences page typography standards
   - Add button standards
   - Add input field standards
   - Add section spacing standards
   - Add integration card equal height styles

### Phase 3: Testing

**Manual Testing Checklist:**

1. **Reviewed Groups Section:**
   - [ ] Section appears after reviewing first mapping
   - [ ] Accepted mappings show correctly with ✓ icon
   - [ ] Rejected mappings show with strikethrough and muted colors
   - [ ] Collapse/expand toggle works
   - [ ] Collapse state persists across page refreshes
   - [ ] Section hidden when no reviewed groups

2. **Onboarding Step 3 Completion:**
   - [ ] Step 3 marks complete after first mapping review
   - [ ] Onboarding indicator updates immediately
   - [ ] Success toast appears
   - [ ] All steps complete triggers overall completion

3. **Onboarding Modal Buttons:**
   - [ ] "Finish Later" button appears below steps
   - [ ] "Dismiss" button appears below steps
   - [ ] X button removed from header
   - [ ] "Finish Later" closes modal and saves progress
   - [ ] "Dismiss" shows confirmation dialog
   - [ ] Confirmation dialog has correct message
   - [ ] Dismissing marks onboarding as dismissed
   - [ ] Both buttons work on mobile

4. **Preferences Page Consistency:**
   - [ ] All headings use consistent fonts/sizes
   - [ ] All buttons use consistent styling
   - [ ] All inputs use consistent styling
   - [ ] Section spacing is consistent
   - [ ] Dark mode works correctly

5. **Integration Container Heights:**
   - [ ] Google Calendar and Contacts containers have equal heights
   - [ ] Content aligns properly within containers
   - [ ] Buttons align at bottom of both containers
   - [ ] Layout responsive on mobile
   - [ ] Works in both light and dark themes


## Edge Cases and Error Handling

### Reviewed Groups Section

**Edge Cases:**
1. **No reviewed groups:** Section should be hidden completely
2. **Only accepted mappings:** Show only "Accepted Mappings" subsection
3. **Only rejected mappings:** Show only "Skipped Mappings" subsection
4. **Large number of mappings:** Section should scroll if needed, no pagination
5. **API failure:** Show empty state or error message, don't break page

**Error Handling:**
```javascript
async fetchReviewedMappings() {
  try {
    const response = await fetch(/* ... */);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    this.mappings = await response.json();
  } catch (error) {
    console.error('Failed to fetch reviewed mappings:', error);
    this.mappings = [];
    
    // Show error toast
    if (typeof showToast === 'function') {
      showToast('Failed to load reviewed groups', 'error');
    }
  }
}
```

### Onboarding Modal Buttons

**Edge Cases:**
1. **No onboarding state:** Buttons should still work, just close modal
2. **Save progress fails:** Still close modal, show error toast
3. **User clicks outside modal:** Treat as "Finish Later"
4. **Rapid clicking:** Disable buttons during save operation

**Error Handling:**
```javascript
async function finishLater() {
  const btn = document.querySelector('.btn-finish-later');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Saving...';
  }
  
  try {
    if (window.onboardingController) {
      await window.onboardingController.saveProgress();
    }
    closeOnboardingModal();
    showToast('Progress saved!', 'success');
  } catch (error) {
    console.error('Save failed:', error);
    showToast('Failed to save progress', 'error');
    closeOnboardingModal(); // Still close
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Finish Later';
    }
  }
}
```

### Preferences Page

**Edge Cases:**
1. **Not connected to Google:** Show "Connect" button instead of stats
2. **Sync in progress:** Disable "Sync Now" button, show spinner
3. **Sync failed:** Show error message in card
4. **Very long email addresses:** Truncate with ellipsis

**Error Handling:**
```javascript
// Handle sync errors gracefully
async function syncGoogleCalendar() {
  const btn = document.querySelector('.btn-sync-calendar');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Syncing...';
  
  try {
    const response = await fetch('/api/calendar/sync', { method: 'POST' });
    if (!response.ok) throw new Error('Sync failed');
    
    showToast('Calendar synced successfully', 'success');
    await refreshCalendarStats();
  } catch (error) {
    showToast('Failed to sync calendar', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Sync Now';
  }
}
```

## Accessibility Considerations

### Keyboard Navigation
- All buttons must be keyboard accessible (Tab, Enter, Space)
- Modal should trap focus (Tab cycles within modal)
- Escape key should trigger "Finish Later" behavior
- Collapse/expand should work with Enter/Space keys

### Screen Readers
- Add ARIA labels to all interactive elements
- Announce state changes (collapsed/expanded, step completed)
- Provide descriptive button labels
- Use semantic HTML (button, nav, section, etc.)

### Color Contrast
- Ensure all text meets WCAG AA standards (4.5:1 for normal text)
- Don't rely solely on color to convey information
- Test in both light and dark modes
- Provide visual indicators beyond color (icons, text)

**ARIA Attributes:**
```html
<!-- Reviewed Groups Section -->
<div class="reviewed-groups-section" 
     role="region" 
     aria-labelledby="reviewed-groups-heading">
  <div class="reviewed-groups-header" 
       role="button"
       tabindex="0"
       aria-expanded="true"
       aria-controls="reviewed-groups-content">
    <h3 id="reviewed-groups-heading">
      <span class="expand-icon" aria-hidden="true">▼</span>
      Reviewed Groups
      <span class="count-badge" aria-label="5 reviewed groups">5</span>
    </h3>
  </div>
  <div id="reviewed-groups-content" role="list">
    <!-- Content -->
  </div>
</div>

<!-- Onboarding Modal -->
<div id="onboarding-modal" 
     role="dialog" 
     aria-labelledby="onboarding-title"
     aria-modal="true">
  <h2 id="onboarding-title">Get Started</h2>
  <!-- Steps -->
  <div class="modal-footer">
    <button class="btn-finish-later" 
            aria-label="Save progress and finish onboarding later">
      Finish Later
    </button>
    <button class="btn-dismiss" 
            aria-label="Dismiss onboarding (can restart from Preferences)">
      Dismiss
    </button>
  </div>
</div>
```

## Performance Considerations

### Reviewed Groups Section
- Lazy load: Only fetch when Groups tab is active
- Cache: Store in memory after first fetch
- Debounce: Collapse/expand animation uses CSS transitions (hardware accelerated)
- Limit: No pagination needed, but consider virtual scrolling if >100 items

### Onboarding Modal
- Render once: Don't re-render on every state change
- Event delegation: Use single listener for multiple buttons
- Async operations: Don't block UI during save operations

### Preferences Page
- Minimize reflows: Use CSS Grid/Flexbox for layout
- Optimize images: Use appropriate sizes for profile pictures
- Lazy load: Only fetch integration stats when page is visible

## Browser Compatibility

**Minimum Supported Versions:**
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

**Polyfills Needed:**
- None (using standard ES6+ features supported in target browsers)

**CSS Features Used:**
- CSS Grid (supported)
- CSS Flexbox (supported)
- CSS Custom Properties (supported)
- CSS Transitions (supported)

## Security Considerations

### XSS Prevention
- Escape all user-generated content (group names, emails)
- Use textContent instead of innerHTML where possible
- Sanitize HTML if innerHTML is necessary

### CSRF Protection
- All API calls include authentication token
- Confirmation dialogs prevent accidental actions

### Data Privacy
- Don't log sensitive information (emails, group names)
- Store collapse state in localStorage (user-specific)
- Clear dismissed state on logout

## Rollback Plan

If issues arise after deployment:

1. **Reviewed Groups Section:** Can be hidden with CSS: `.reviewed-groups-section { display: none; }`
2. **Onboarding Buttons:** Can revert to X button by removing footer and restoring header button
3. **Preferences Styling:** Can revert CSS file to previous version
4. **Integration Heights:** Can remove grid layout and use default block layout

## Success Metrics

**Quantitative:**
- Onboarding completion rate increases by 10%
- Average time to complete Step 3 decreases by 20%
- User confusion reports decrease by 30%
- Preferences page bounce rate decreases by 15%

**Qualitative:**
- Users can easily find reviewed groups
- Users understand how to dismiss vs finish later
- Preferences page looks polished and professional
- Integration cards appear balanced and symmetrical

## Future Enhancements

**Reviewed Groups Section:**
- Add search/filter functionality
- Add ability to undo review (re-open mapping)
- Add export functionality (CSV, JSON)
- Add sorting options (date, name, status)

**Onboarding Modal:**
- Add progress percentage indicator
- Add estimated time remaining
- Add "Skip All" option for power users
- Add onboarding tutorial videos

**Preferences Page:**
- Add more integration options (Outlook, Apple)
- Add bulk sync operations
- Add sync scheduling options
- Add integration health monitoring

