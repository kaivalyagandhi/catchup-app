/**
 * KeyboardShortcutPreferences Component
 * 
 * Manages group-to-keyboard-shortcut (0-9) mappings for swipe mode.
 * 2-column layout: groups on left (click to select), numpad grid on right (click to assign).
 * 
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 */

class KeyboardShortcutPreferences {
  /**
   * @param {Array} groups - Array of group objects with { id, name }
   * @param {Object} options
   * @param {Function} options.onSave - Callback when shortcuts are saved, receives shortcuts map { groupId: shortcutNumber }
   */
  constructor(groups, options = {}) {
    this.groups = groups || [];
    this.onSave = options.onSave || null;
    this.shortcuts = {}; // groupId -> shortcut number (string '0'-'9')
    this.container = null;
    this.selectedGroupId = null; // Currently selected group for assignment
    this.setupStyles();
  }

  setupStyles() {
    if (document.getElementById('keyboard-shortcut-prefs-styles')) {
      // Remove old styles to ensure fresh version
      const old = document.getElementById('keyboard-shortcut-prefs-styles');
      old.remove();
    }

    const style = document.createElement('style');
    style.id = 'keyboard-shortcut-prefs-styles';
    style.textContent = `
      .ksp-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.3);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .ksp-popover {
        background: var(--bg-surface, #ffffff);
        border-radius: 16px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
        border: 1px solid var(--border-subtle, #e5e7eb);
        width: 560px;
        max-width: 95vw;
        max-height: 85vh;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      .ksp-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 1rem 1.25rem;
        border-bottom: 1px solid var(--border-subtle, #e5e7eb);
        flex-shrink: 0;
      }

      .ksp-header-title {
        font-size: 1rem;
        font-weight: 700;
        color: var(--text-primary, #1f2937);
      }

      .ksp-header-hint {
        font-size: 0.75rem;
        color: var(--text-secondary, #6b7280);
        font-weight: 400;
        margin-left: 0.5rem;
      }

      .ksp-close-btn {
        background: none;
        border: none;
        font-size: 1.25rem;
        cursor: pointer;
        color: var(--text-secondary, #6b7280);
        padding: 0.25rem;
        border-radius: 6px;
        line-height: 1;
      }

      .ksp-close-btn:hover {
        background: var(--bg-secondary, #f5f5f4);
      }

      /* 2-column body */
      .ksp-body {
        display: flex;
        gap: 1rem;
        padding: 1rem 1.25rem;
        overflow-y: auto;
        flex: 1;
        min-height: 0;
      }

      /* Left column: group list */
      .ksp-groups-col {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 4px;
        overflow-y: auto;
        min-width: 0;
      }

      .ksp-group-row {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 10px;
        border-radius: 8px;
        cursor: pointer;
        transition: background 0.15s, border-color 0.15s;
        border: 2px solid transparent;
        min-height: 40px;
      }

      .ksp-group-row:hover {
        background: var(--bg-secondary, #f5f5f4);
      }

      .ksp-group-row.ksp-group-selected {
        border-color: #6366f1;
        background: rgba(99, 102, 241, 0.06);
      }

      .ksp-group-row.ksp-group-mapped {
        opacity: 0.7;
      }

      .ksp-group-badge {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        min-width: 28px;
        border-radius: 6px;
        font-size: 0.75rem;
        font-weight: 700;
        font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
        flex-shrink: 0;
      }

      .ksp-group-badge.ksp-badge-mapped {
        background: #6366f1;
        color: white;
      }

      .ksp-group-badge.ksp-badge-unmapped {
        background: var(--bg-secondary, #f3f4f6);
        color: var(--text-tertiary, #9ca3af);
        border: 1px dashed var(--border-subtle, #d1d5db);
      }

      .ksp-group-name {
        font-size: 0.875rem;
        color: var(--text-primary, #1f2937);
        font-weight: 500;
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .ksp-group-clear {
        background: none;
        border: none;
        font-size: 0.875rem;
        cursor: pointer;
        color: var(--text-tertiary, #9ca3af);
        padding: 2px 4px;
        border-radius: 4px;
        line-height: 1;
        display: none;
      }

      .ksp-group-row.ksp-group-mapped .ksp-group-clear {
        display: block;
      }

      .ksp-group-clear:hover {
        color: #ef4444;
        background: rgba(239, 68, 68, 0.08);
      }

      /* Right column: numpad grid */
      .ksp-numpad-col {
        flex-shrink: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
      }

      .ksp-numpad-label {
        font-size: 0.75rem;
        font-weight: 600;
        color: var(--text-secondary, #6b7280);
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .ksp-numpad-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 6px;
      }

      .ksp-numpad-key {
        width: 52px;
        height: 52px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        border-radius: 10px;
        border: 2px solid var(--border-subtle, #d1d5db);
        background: var(--bg-surface, #ffffff);
        cursor: pointer;
        transition: all 0.15s ease;
        font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
        position: relative;
        padding: 4px;
      }

      .ksp-numpad-key:hover:not(.ksp-key-mapped) {
        border-color: #6366f1;
        background: rgba(99, 102, 241, 0.04);
        transform: scale(1.05);
      }

      .ksp-numpad-key.ksp-key-mapped {
        background: #eef2ff;
        border-color: #c7d2fe;
        cursor: default;
        opacity: 0.5;
      }

      .ksp-numpad-key.ksp-key-highlight {
        border-color: #6366f1;
        box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
        background: rgba(99, 102, 241, 0.04);
      }

      .ksp-key-number {
        font-size: 1.125rem;
        font-weight: 700;
        color: var(--text-primary, #1f2937);
        line-height: 1;
      }

      .ksp-key-mapped .ksp-key-number {
        color: #6366f1;
        font-size: 0.875rem;
      }

      .ksp-key-group-label {
        font-size: 0.5rem;
        color: #6366f1;
        font-weight: 600;
        max-width: 44px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        text-align: center;
        line-height: 1.2;
        margin-top: 1px;
      }

      /* Zero key spans full width */
      .ksp-numpad-key.ksp-key-zero {
        grid-column: 1 / -1;
        width: 100%;
        height: 44px;
      }

      .ksp-errors {
        padding: 0.625rem 0.75rem;
        margin-bottom: 0.75rem;
        background: rgba(239, 68, 68, 0.08);
        border: 1px solid rgba(239, 68, 68, 0.2);
        border-radius: 8px;
        color: #dc2626;
        font-size: 0.8125rem;
      }

      .ksp-error-item {
        margin-bottom: 0.25rem;
      }

      .ksp-error-item:last-child {
        margin-bottom: 0;
      }

      .ksp-footer {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 1rem 1.25rem;
        border-top: 1px solid var(--border-subtle, #e5e7eb);
        flex-shrink: 0;
      }

      .ksp-btn {
        padding: 0.5rem 1rem;
        border-radius: 8px;
        font-size: 0.875rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.15s ease;
        border: 2px solid;
      }

      .ksp-btn-auto {
        background: transparent;
        border-color: #6366f1;
        color: #6366f1;
      }

      .ksp-btn-auto:hover {
        background: rgba(99, 102, 241, 0.08);
      }

      .ksp-btn-save {
        background: #6366f1;
        border-color: #6366f1;
        color: white;
        margin-left: auto;
      }

      .ksp-btn-save:hover {
        background: #4f46e5;
        border-color: #4f46e5;
      }

      .ksp-btn-cancel {
        background: transparent;
        border-color: var(--border-subtle, #d1d5db);
        color: var(--text-secondary, #6b7280);
      }

      .ksp-btn-cancel:hover {
        background: var(--bg-secondary, #f5f5f4);
      }

      /* Mobile: stack columns */
      @media (max-width: 520px) {
        .ksp-popover {
          width: 100%;
          max-width: 100%;
          max-height: 95vh;
          border-radius: 12px 12px 0 0;
        }

        .ksp-body {
          flex-direction: column;
        }

        .ksp-numpad-col {
          flex-direction: row;
          flex-wrap: wrap;
          justify-content: center;
        }

        .ksp-numpad-grid {
          gap: 4px;
        }

        .ksp-numpad-key {
          width: 44px;
          height: 44px;
        }

        .ksp-numpad-key.ksp-key-zero {
          height: 38px;
        }
      }
    `;

    document.head.appendChild(style);
  }

  /**
   * Get initials from a group name
   */
  getInitials(name) {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  /**
   * Get the set of already-assigned shortcut numbers
   */
  getAssignedKeys() {
    const assigned = new Set();
    for (const val of Object.values(this.shortcuts)) {
      if (val !== '' && val !== undefined) {
        assigned.add(String(val));
      }
    }
    return assigned;
  }

  /**
   * Get group name for a given shortcut number, or null
   */
  getGroupForKey(keyNum) {
    for (const [groupId, shortcut] of Object.entries(this.shortcuts)) {
      if (String(shortcut) === String(keyNum)) {
        const group = this.groups.find(g => g.id === groupId);
        return group || null;
      }
    }
    return null;
  }

  /**
   * Render the popover with 2-column layout
   */
  render() {
    this.destroy();

    const overlay = document.createElement('div');
    overlay.className = 'ksp-overlay';
    overlay.id = 'ksp-overlay';

    overlay.innerHTML = `
      <div class="ksp-popover">
        <div class="ksp-header">
          <span class="ksp-header-title">Keyboard Shortcuts<span class="ksp-header-hint">Select a group, then tap a key</span></span>
          <button class="ksp-close-btn" id="ksp-close" aria-label="Close">&times;</button>
        </div>
        <div id="ksp-errors"></div>
        <div class="ksp-body">
          <div class="ksp-groups-col" id="ksp-groups-col">
            ${this.renderGroupList()}
          </div>
          <div class="ksp-numpad-col">
            <span class="ksp-numpad-label">Keys</span>
            <div class="ksp-numpad-grid" id="ksp-numpad-grid">
              ${this.renderNumpad()}
            </div>
          </div>
        </div>
        <div class="ksp-footer">
          <button class="ksp-btn ksp-btn-auto" id="ksp-auto-assign">Auto-Assign</button>
          <button class="ksp-btn ksp-btn-cancel" id="ksp-cancel">Cancel</button>
          <button class="ksp-btn ksp-btn-save" id="ksp-save">Save</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    this.container = overlay;
    this.attachEventListeners();

    return overlay;
  }

  /**
   * Render the group list (left column)
   */
  renderGroupList() {
    const assignedKeys = this.getAssignedKeys();

    return this.groups.map(group => {
      const shortcut = this.shortcuts[group.id];
      const isMapped = shortcut !== undefined && shortcut !== '';
      const isSelected = this.selectedGroupId === group.id;
      const classes = [
        'ksp-group-row',
        isSelected ? 'ksp-group-selected' : '',
        isMapped ? 'ksp-group-mapped' : ''
      ].filter(Boolean).join(' ');

      const badgeContent = isMapped ? shortcut : '—';
      const badgeClass = isMapped ? 'ksp-badge-mapped' : 'ksp-badge-unmapped';

      return `
        <div class="${classes}" data-group-id="${group.id}">
          <span class="ksp-group-badge ${badgeClass}">${badgeContent}</span>
          <span class="ksp-group-name" title="${this.escapeHtml(group.name)}">${this.escapeHtml(group.name)}</span>
          <button class="ksp-group-clear" data-group-id="${group.id}" title="Remove shortcut" aria-label="Remove shortcut for ${this.escapeHtml(group.name)}">×</button>
        </div>
      `;
    }).join('');
  }

  /**
   * Render the numpad grid (right column) — 0 at top, then 1-2-3, 4-5-6, 7-8-9
   */
  renderNumpad() {
    const assignedKeys = this.getAssignedKeys();

    let html = '';

    // Zero key at top, spanning full width
    const zeroMapped = assignedKeys.has('0');
    const zeroGroup = zeroMapped ? this.getGroupForKey('0') : null;
    const zeroClasses = [
      'ksp-numpad-key ksp-key-zero',
      zeroMapped ? 'ksp-key-mapped' : '',
      (!zeroMapped && this.selectedGroupId) ? 'ksp-key-highlight' : ''
    ].filter(Boolean).join(' ');

    html += `
      <button class="${zeroClasses}" data-key="0" ${zeroMapped ? 'disabled' : ''}>
        <span class="ksp-key-number">0</span>
        ${zeroGroup ? `<span class="ksp-key-group-label">${this.escapeHtml(this.getInitials(zeroGroup.name))}</span>` : ''}
      </button>
    `;

    // Then 1-2-3, 4-5-6, 7-8-9
    const rows = [[1, 2, 3], [4, 5, 6], [7, 8, 9]];
    for (const row of rows) {
      for (const num of row) {
        const key = String(num);
        const isMapped = assignedKeys.has(key);
        const mappedGroup = isMapped ? this.getGroupForKey(key) : null;
        const classes = [
          'ksp-numpad-key',
          isMapped ? 'ksp-key-mapped' : '',
          (!isMapped && this.selectedGroupId) ? 'ksp-key-highlight' : ''
        ].filter(Boolean).join(' ');

        html += `
          <button class="${classes}" data-key="${key}" ${isMapped ? 'disabled' : ''}>
            <span class="ksp-key-number">${key}</span>
            ${mappedGroup ? `<span class="ksp-key-group-label">${this.escapeHtml(this.getInitials(mappedGroup.name))}</span>` : ''}
          </button>
        `;
      }
    }

    return html;
  }

  /**
   * Re-render the dynamic parts (group list + numpad) without destroying the whole popover
   */
  updateUI() {
    if (!this.container) return;

    const groupsCol = this.container.querySelector('#ksp-groups-col');
    if (groupsCol) groupsCol.innerHTML = this.renderGroupList();

    const numpadGrid = this.container.querySelector('#ksp-numpad-grid');
    if (numpadGrid) numpadGrid.innerHTML = this.renderNumpad();

    // Re-attach dynamic listeners
    this.attachDynamicListeners();
  }

  attachEventListeners() {
    if (!this.container) return;

    // Close button
    this.container.querySelector('#ksp-close')?.addEventListener('click', () => this.destroy());

    // Cancel button
    this.container.querySelector('#ksp-cancel')?.addEventListener('click', () => this.destroy());

    // Auto-assign button
    this.container.querySelector('#ksp-auto-assign')?.addEventListener('click', () => {
      this.autoAssign();
      this.selectedGroupId = null;
      this.updateUI();
    });

    // Save button
    this.container.querySelector('#ksp-save')?.addEventListener('click', () => this.save());

    // Click overlay to close
    this.container.addEventListener('click', (e) => {
      if (e.target === this.container) this.destroy();
    });

    // Block ALL keyboard events from propagating to the underlying modal
    this._blockHandler = (e) => {
      e.stopPropagation();
      
      // Handle Escape
      if (e.key === 'Escape') {
        this.destroy();
        return;
      }
      
      // Handle number input while a group is selected
      if (this.selectedGroupId) {
        const num = e.key;
        if (/^[0-9]$/.test(num)) {
          const assignedKeys = this.getAssignedKeys();
          if (!assignedKeys.has(num)) {
            this.shortcuts[this.selectedGroupId] = num;
            this.selectedGroupId = null;
            this.clearErrors();
            this.updateUI();
          }
        }
      }
    };
    // Use capture phase on the overlay to intercept before anything else
    this.container.addEventListener('keydown', this._blockHandler, true);
    // Also block at document level to prevent any leakage
    this._docBlockHandler = (e) => {
      if (this.container && document.body.contains(this.container)) {
        e.stopPropagation();
        e.stopImmediatePropagation();
      }
    };
    document.addEventListener('keydown', this._docBlockHandler, true);

    this.attachDynamicListeners();
  }

  /**
   * Attach listeners to dynamically rendered elements (group rows, numpad keys, clear buttons)
   */
  attachDynamicListeners() {
    if (!this.container) return;

    // Group row clicks — select for assignment
    this.container.querySelectorAll('.ksp-group-row').forEach(row => {
      row.addEventListener('click', (e) => {
        if (e.target.closest('.ksp-group-clear')) return; // Don't select when clearing
        const groupId = row.dataset.groupId;
        this.selectedGroupId = this.selectedGroupId === groupId ? null : groupId;
        this.updateUI();
      });
    });

    // Clear buttons
    this.container.querySelectorAll('.ksp-group-clear').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const groupId = btn.dataset.groupId;
        delete this.shortcuts[groupId];
        this.updateUI();
      });
    });

    // Numpad key clicks — assign to selected group
    this.container.querySelectorAll('.ksp-numpad-key:not([disabled])').forEach(key => {
      key.addEventListener('click', () => {
        if (!this.selectedGroupId) return;
        const keyNum = key.dataset.key;
        this.shortcuts[this.selectedGroupId] = keyNum;
        this.selectedGroupId = null;
        this.clearErrors();
        this.updateUI();
      });
    });
  }

  /**
   * Auto-assign shortcuts 0-9 sequentially to groups
   */
  autoAssign() {
    this.shortcuts = {};
    const limit = Math.min(this.groups.length, 10);
    for (let i = 0; i < limit; i++) {
      this.shortcuts[this.groups[i].id] = String(i);
    }
  }

  /**
   * Validate shortcut assignments for duplicates
   */
  validate() {
    const errors = [];
    const seen = {};

    for (const [groupId, shortcut] of Object.entries(this.shortcuts)) {
      if (shortcut === '' || shortcut === undefined) continue;
      if (seen[shortcut]) {
        const existingGroup = this.groups.find(g => g.id === seen[shortcut]);
        const currentGroup = this.groups.find(g => g.id === groupId);
        errors.push(`Key ${shortcut} assigned to both "${existingGroup?.name}" and "${currentGroup?.name}"`);
      } else {
        seen[shortcut] = groupId;
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Save shortcut preferences via API
   */
  async save() {
    const validation = this.validate();
    if (!validation.valid) {
      this.showErrors(validation.errors);
      return;
    }

    try {
      const response = await fetch('/api/users/preferences/keyboard-shortcuts', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${typeof localStorage !== 'undefined' ? localStorage.getItem('authToken') : ''}`
        },
        body: JSON.stringify({ value: this.shortcuts })
      });

      if (!response.ok) throw new Error('Failed to save preferences');

      if (this.onSave) this.onSave(this.shortcuts);
      this.destroy();
    } catch (error) {
      console.error('Error saving keyboard shortcuts:', error);
      this.showErrors(['Failed to save preferences. Please try again.']);
    }
  }

  showErrors(errors) {
    if (!this.container) return;
    const errorsEl = this.container.querySelector('#ksp-errors');
    if (!errorsEl) return;
    errorsEl.innerHTML = `
      <div class="ksp-errors" style="margin: 0 1.25rem;">
        ${errors.map(e => `<div class="ksp-error-item">⚠️ ${this.escapeHtml(e)}</div>`).join('')}
      </div>
    `;
  }

  clearErrors() {
    if (!this.container) return;
    const errorsEl = this.container.querySelector('#ksp-errors');
    if (errorsEl) errorsEl.innerHTML = '';
  }

  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  destroy() {
    if (this._blockHandler && this.container) {
      this.container.removeEventListener('keydown', this._blockHandler, true);
      this._blockHandler = null;
    }
    if (this._docBlockHandler) {
      document.removeEventListener('keydown', this._docBlockHandler, true);
      this._docBlockHandler = null;
    }
    const existing = document.getElementById('ksp-overlay');
    if (existing) existing.remove();
    this.container = null;
    this.selectedGroupId = null;
  }
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = KeyboardShortcutPreferences;
}
