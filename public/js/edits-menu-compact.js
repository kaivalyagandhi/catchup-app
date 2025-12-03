/**
 * Compact Edits Menu Component
 *
 * Unified menu for managing pending edits with contact-based grouping.
 * Uses compact layout to reduce visual footprint by 40-50%.
 *
 * Requirements: 1.1-1.7, 2.1-2.5, 3.1-3.8, 4.1-4.8, 5.1-5.6, 6.1-6.7, 7.1-7.5, 8.1-8.6, 9.1-9.6, 10.1-10.7
 */

class EditsMenuCompact {
  constructor(options = {}) {
    this.activeTab = 'pending';
    this.pendingEdits = [];
    this.editHistory = [];
    this.isLoading = false;
    this.contactGroups = [];
    this.expandedGroups = new Set();
    
    this.onOpenChat = options.onOpenChat || (() => {});
    this.onEditSubmit = options.onEditSubmit || (() => {});
    this.onEditDismiss = options.onEditDismiss || (() => {});
    this.onEditUpdate = options.onEditUpdate || (() => {});
    this.onContactClick = options.onContactClick || (() => {});
    this.onGroupClick = options.onGroupClick || (() => {});
    this.onSearchContact = options.onSearchContact || (() => Promise.resolve([]));
    
    this.element = null;
    this.contentElement = null;
  }

  /**
   * Render the edits menu
   */
  render() {
    this.element = document.createElement('div');
    this.element.className = 'edits-menu';

    this.element.innerHTML = `
      <div class="edits-menu__header">
        <h2 class="edits-menu__title">Edits</h2>
      </div>
      <div class="edits-menu__tabs" role="tablist">
        <button class="edits-menu__tab edits-menu__tab--active" role="tab" aria-selected="true" data-tab="pending">
          Pending Edits
          <span class="edits-menu__tab-count" data-count="pending">0</span>
        </button>
        <button class="edits-menu__tab" role="tab" aria-selected="false" data-tab="history">
          Edit History
        </button>
      </div>
      <div class="edits-menu__content" role="tabpanel"></div>
    `;

    this.contentElement = this.element.querySelector('.edits-menu__content');

    // Set up tab click handlers
    this.element.querySelectorAll('.edits-menu__tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        this.switchTab(tab.getAttribute('data-tab'));
      });
    });

    this.renderContent();
    return this.element;
  }

  /**
   * Switch between tabs
   */
  switchTab(tabName) {
    this.activeTab = tabName;

    // Update tab styles
    this.element.querySelectorAll('.edits-menu__tab').forEach((tab) => {
      const isActive = tab.getAttribute('data-tab') === tabName;
      tab.classList.toggle('edits-menu__tab--active', isActive);
      tab.setAttribute('aria-selected', isActive.toString());
    });

    this.renderContent();
  }

  /**
   * Render content based on active tab
   */
  renderContent() {
    if (!this.contentElement) return;

    if (this.isLoading) {
      this.contentElement.innerHTML = '<div class="edits-menu__loading">Loading...</div>';
      return;
    }

    if (this.activeTab === 'pending') {
      this.renderPendingEditsCompact();
    } else {
      this.renderEditHistory();
    }
  }

  /**
   * Render pending edits with compact contact grouping
   * Requirements: 1.1, 1.2, 1.3, 2.1-2.5
   */
  renderPendingEditsCompact() {
    if (this.pendingEdits.length === 0) {
      this.contentElement.innerHTML = `
        <div class="edits-menu__empty">
          <p>No pending edits</p>
          <button class="edits-menu__open-chat-btn">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            Start Recording
          </button>
        </div>
      `;

      this.contentElement.querySelector('.edits-menu__open-chat-btn')
        .addEventListener('click', () => this.onOpenChat());
      return;
    }

    // Group edits by contact
    this.contactGroups = groupEditsByContact(this.pendingEdits);

    const container = document.createElement('div');
    container.className = 'edits-menu__list';

    // Render each contact group
    this.contactGroups.forEach((group, index) => {
      const groupElement = this.createContactGroup(group, index);
      container.appendChild(groupElement);
    });

    this.contentElement.innerHTML = '';
    this.contentElement.appendChild(container);
  }

  /**
   * Create a contact group element
   * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6
   */
  createContactGroup(group, index) {
    const groupElement = document.createElement('div');
    groupElement.className = 'contact-group';
    groupElement.setAttribute('data-contact-id', group.contactId);
    groupElement.setAttribute('data-group-index', index);

    // Determine if group should be expanded
    const isExpanded = this.expandedGroups.has(group.contactId) || group.isExpanded;
    if (isExpanded) {
      groupElement.classList.add('expanded');
    }

    // Create header
    const header = document.createElement('div');
    header.className = 'contact-group-header';
    header.innerHTML = `
      <div class="contact-group-header__left">
        <div class="contact-group-header__avatar">${escapeHtml(getContactInitials(group.contactName))}</div>
        <div class="contact-group-header__name">${escapeHtml(group.contactName)}</div>
        <div class="contact-group-header__count ${group.acceptedCount === group.totalCount ? 'contact-group-header__count--completed' : group.rejectedCount === group.totalCount ? 'contact-group-header__count--rejected' : ''}">
          ${group.acceptedCount}/${group.totalCount}
        </div>
      </div>
      <div class="contact-group-header__right">
        <div class="contact-group-header__bulk-actions">
          <button class="bulk-action-btn bulk-action-btn--accept" title="Accept all edits for this contact">✓ Accept All</button>
          <button class="bulk-action-btn bulk-action-btn--reject" title="Reject all edits for this contact">✗ Reject All</button>
        </div>
        <button class="contact-group-header__toggle ${isExpanded ? 'expanded' : ''}" title="Toggle group">▼</button>
      </div>
    `;

    // Add header click handler for expansion
    header.addEventListener('click', (e) => {
      if (e.target.closest('.contact-group-header__bulk-actions')) return;
      this.toggleGroupExpansion(group.contactId, groupElement);
    });

    // Add bulk action handlers
    const acceptAllBtn = header.querySelector('.bulk-action-btn--accept');
    const rejectAllBtn = header.querySelector('.bulk-action-btn--reject');

    acceptAllBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.acceptAllForContact(group.contactId);
    });

    rejectAllBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.rejectAllForContact(group.contactId);
    });

    groupElement.appendChild(header);

    // Create content area
    const content = document.createElement('div');
    content.className = 'contact-group-content';

    const itemsContainer = document.createElement('div');
    itemsContainer.className = 'contact-group-items';

    // Render each edit item
    group.edits.forEach((edit, editIndex) => {
      const itemElement = this.createCompactEditItem(edit, group, index, editIndex);
      itemsContainer.appendChild(itemElement);
    });

    content.appendChild(itemsContainer);
    groupElement.appendChild(content);

    return groupElement;
  }

  /**
   * Create a compact edit item
   * Requirements: 2.1, 2.2, 2.3, 3.1-3.8, 10.1-10.7
   */
  createCompactEditItem(edit, group, groupIndex, editIndex) {
    const itemElement = document.createElement('div');
    itemElement.className = 'edit-item-compact';
    itemElement.setAttribute('data-edit-id', edit.id);
    itemElement.setAttribute('data-group-index', groupIndex);
    itemElement.setAttribute('data-edit-index', editIndex);

    // Add state classes
    if (edit.accepted === true) {
      itemElement.classList.add('accepted');
    } else if (edit.accepted === false) {
      itemElement.classList.add('rejected');
    }

    const icon = getEditIcon(edit.editType, edit.field);
    const typeText = getEditTypeText(edit.editType);
    const typeBadgeClass = getEditTypeBadgeClass(edit.editType);
    const value = formatEditValue(edit.proposedValue, edit.editType, edit.field);
    const confidenceColor = getConfidenceColor(edit.confidenceScore);
    const confidenceText = formatConfidenceScore(edit.confidenceScore);
    const sourceType = edit.source ? getSourceTypeText(edit.source.type) : 'Unknown';
    const sourceExcerpt = edit.source?.transcriptExcerpt ? truncateText(edit.source.transcriptExcerpt, 30) : '';

    itemElement.innerHTML = `
      <div class="edit-item-compact__icon">${icon}</div>
      <span class="edit-item-compact__type ${typeBadgeClass}">${typeText}</span>
      <div class="edit-item-compact__content">
        <div class="edit-item-compact__field">${escapeHtml(edit.field || typeText)}</div>
        <div class="edit-item-compact__value">${escapeHtml(value)}</div>
      </div>
      <div class="edit-item-compact__meta">
        <span class="confidence-badge ${confidenceColor}" title="System confidence in this suggestion">${confidenceText}</span>
        <span class="source-badge" title="Click to see full context">
          <span class="source-badge__icon">📋</span>
          ${sourceType}${sourceExcerpt ? ': ' + escapeHtml(sourceExcerpt) : ''}
        </span>
      </div>
      <div class="edit-item-compact__actions">
        <button class="action-btn action-btn--accept ${edit.accepted === true ? 'active' : ''}" title="Accept this edit">✓</button>
        <button class="action-btn action-btn--reject ${edit.accepted === false ? 'active' : ''}" title="Reject this edit">✗</button>
      </div>
    `;

    // Add event handlers
    const acceptBtn = itemElement.querySelector('.action-btn--accept');
    const rejectBtn = itemElement.querySelector('.action-btn--reject');
    const sourceBtn = itemElement.querySelector('.source-badge');

    acceptBtn.addEventListener('click', () => {
      this.toggleEditState(edit.id, true, itemElement, group);
    });

    rejectBtn.addEventListener('click', () => {
      this.toggleEditState(edit.id, false, itemElement, group);
    });

    if (sourceBtn && edit.source) {
      sourceBtn.addEventListener('click', () => {
        this.showSourceContext(edit, sourceBtn);
      });
    }

    return itemElement;
  }

  /**
   * Toggle edit state (accept/reject)
   * Requirements: 3.4, 3.5, 3.6, 3.7, 3.8
   */
  toggleEditState(editId, accepted, itemElement, group) {
    // Find and update the edit
    const edit = this.pendingEdits.find(e => e.id === editId);
    if (!edit) return;

    // Toggle state - if clicking the same button, toggle off
    if (edit.accepted === accepted) {
      edit.accepted = null; // Reset to pending
    } else {
      edit.accepted = accepted;
    }

    // Update UI
    itemElement.classList.remove('accepted', 'rejected');
    if (edit.accepted === true) {
      itemElement.classList.add('accepted');
    } else if (edit.accepted === false) {
      itemElement.classList.add('rejected');
    }

    // Update action buttons
    const acceptBtn = itemElement.querySelector('.action-btn--accept');
    const rejectBtn = itemElement.querySelector('.action-btn--reject');
    acceptBtn.classList.toggle('active', edit.accepted === true);
    rejectBtn.classList.toggle('active', edit.accepted === false);

    // Update group summary
    this.updateGroupSummary(group);

    // Call the appropriate handler based on state
    if (edit.accepted === true) {
      // User accepted - submit the edit
      this.onEditSubmit(editId);
    } else if (edit.accepted === false) {
      // User rejected - dismiss the edit
      this.onEditDismiss(editId);
    }
  }

  /**
   * Update group summary counts
   * Requirements: 1.6, 3.8
   */
  updateGroupSummary(group) {
    group.acceptedCount = group.edits.filter(e => e.accepted === true).length;
    group.rejectedCount = group.edits.filter(e => e.accepted === false).length;

    const groupElement = this.element.querySelector(`[data-contact-id="${group.contactId}"]`);
    if (!groupElement) return;

    const countElement = groupElement.querySelector('.contact-group-header__count');
    if (countElement) {
      countElement.textContent = `${group.acceptedCount}/${group.totalCount}`;
      countElement.classList.remove('contact-group-header__count--completed', 'contact-group-header__count--rejected');
      if (group.acceptedCount === group.totalCount) {
        countElement.classList.add('contact-group-header__count--completed');
      } else if (group.rejectedCount === group.totalCount) {
        countElement.classList.add('contact-group-header__count--rejected');
      }
    }
  }

  /**
   * Toggle group expansion
   * Requirements: 1.3, 1.4, 1.5
   */
  toggleGroupExpansion(contactId, groupElement) {
    if (this.expandedGroups.has(contactId)) {
      this.expandedGroups.delete(contactId);
      groupElement.classList.remove('expanded');
    } else {
      this.expandedGroups.add(contactId);
      groupElement.classList.add('expanded');
    }

    // Update toggle button
    const toggle = groupElement.querySelector('.contact-group-header__toggle');
    if (toggle) {
      toggle.classList.toggle('expanded');
    }
  }

  /**
   * Accept all edits for a contact
   * Requirements: 8.2, 8.4
   */
  acceptAllForContact(contactId) {
    const group = this.contactGroups.find(g => g.contactId === contactId);
    if (!group) return;

    group.edits.forEach(edit => {
      edit.accepted = true;
      const itemElement = this.element.querySelector(`[data-edit-id="${edit.id}"]`);
      if (itemElement) {
        itemElement.classList.remove('rejected');
        itemElement.classList.add('accepted');
        const acceptBtn = itemElement.querySelector('.action-btn--accept');
        const rejectBtn = itemElement.querySelector('.action-btn--reject');
        if (acceptBtn) acceptBtn.classList.add('active');
        if (rejectBtn) rejectBtn.classList.remove('active');
      }
      // Submit each edit
      this.onEditSubmit(edit.id);
    });

    this.updateGroupSummary(group);
  }

  /**
   * Reject all edits for a contact
   * Requirements: 8.3, 8.4
   */
  rejectAllForContact(contactId) {
    const group = this.contactGroups.find(g => g.contactId === contactId);
    if (!group) return;

    group.edits.forEach(edit => {
      edit.accepted = false;
      const itemElement = this.element.querySelector(`[data-edit-id="${edit.id}"]`);
      if (itemElement) {
        itemElement.classList.remove('accepted');
        itemElement.classList.add('rejected');
        const acceptBtn = itemElement.querySelector('.action-btn--accept');
        const rejectBtn = itemElement.querySelector('.action-btn--reject');
        if (acceptBtn) acceptBtn.classList.remove('active');
        if (rejectBtn) rejectBtn.classList.add('active');
      }
      // Dismiss each edit
      this.onEditDismiss(edit.id);
    });

    this.updateGroupSummary(group);
  }

  /**
   * Show source context
   * Requirements: 7.3, 7.4, 7.5
   */
  showSourceContext(edit, sourceBtn) {
    if (!edit.source) return;

    // Create tooltip
    const tooltip = document.createElement('div');
    tooltip.className = 'source-context-tooltip';
    tooltip.innerHTML = `
      <div class="source-context-tooltip__content">
        <div class="source-context-tooltip__type">${getSourceTypeText(edit.source.type)}</div>
        <div class="source-context-tooltip__excerpt">"${escapeHtml(edit.source.fullContext || edit.source.transcriptExcerpt || '')}"</div>
        <div class="source-context-tooltip__time">${formatTimestamp(edit.source.timestamp)}</div>
      </div>
    `;

    // Position tooltip
    const rect = sourceBtn.getBoundingClientRect();
    tooltip.style.position = 'fixed';
    tooltip.style.top = (rect.bottom + 8) + 'px';
    tooltip.style.left = (rect.left - 100) + 'px';
    tooltip.style.zIndex = '10000';

    document.body.appendChild(tooltip);

    // Close on click outside
    const closeHandler = (e) => {
      if (!tooltip.contains(e.target) && !sourceBtn.contains(e.target)) {
        tooltip.remove();
        document.removeEventListener('click', closeHandler);
      }
    };

    setTimeout(() => {
      document.addEventListener('click', closeHandler);
    }, 0);
  }

  /**
   * Render edit history tab
   * Requirements: 1.4, 1.5, 10.2
   */
  renderEditHistory() {
    if (this.editHistory.length === 0) {
      this.contentElement.innerHTML = `
        <div class="edits-menu__empty">
          <p>No edit history yet</p>
        </div>
      `;
      return;
    }

    const list = document.createElement('div');
    list.className = 'edits-menu__list';

    for (const entry of this.editHistory) {
      const item = this.createEditHistoryItem(entry);
      list.appendChild(item);
    }

    this.contentElement.innerHTML = '';
    this.contentElement.appendChild(list);
  }

  /**
   * Create an edit history item (read-only)
   * Requirements: 10.1, 10.2, 10.3
   */
  createEditHistoryItem(entry) {
    const item = document.createElement('div');
    item.className = 'edit-item-compact';
    item.style.opacity = '0.7';

    const icon = getEditIcon(entry.editType, entry.field);
    const typeText = getEditTypeText(entry.editType);
    const typeBadgeClass = getEditTypeBadgeClass(entry.editType);
    const value = formatEditValue(entry.appliedValue, entry.editType, entry.field);
    const sourceType = entry.source ? getSourceTypeText(entry.source.type) : 'Unknown';
    
    // Get contact name for display
    const contactName = entry.targetContactName || entry.targetGroupName || 'Unknown';
    const contactInitials = getContactInitials(contactName);

    item.innerHTML = `
      <div class="edit-item-compact__icon">${icon}</div>
      <span class="edit-item-compact__type ${typeBadgeClass}">${typeText}</span>
      <div class="edit-item-compact__contact">
        <div class="edit-item-compact__contact-avatar">${escapeHtml(contactInitials)}</div>
        <div class="edit-item-compact__contact-name">${escapeHtml(contactName)}</div>
      </div>
      <div class="edit-item-compact__content">
        <div class="edit-item-compact__field">${escapeHtml(entry.field || typeText)}</div>
        <div class="edit-item-compact__value">${escapeHtml(value)}</div>
      </div>
      <div class="edit-item-compact__meta">
        <span class="source-badge">
          <span class="source-badge__icon">✓</span>
          ${sourceType}
        </span>
      </div>
    `;

    return item;
  }

  /**
   * Set pending edits data
   */
  setPendingEdits(edits) {
    this.pendingEdits = edits;
    this.updatePendingCount();
    if (this.activeTab === 'pending') {
      this.renderContent();
    }
  }

  /**
   * Set edit history data
   */
  setEditHistory(history) {
    this.editHistory = history;
    if (this.activeTab === 'history') {
      this.renderContent();
    }
  }

  /**
   * Update pending count badge
   */
  updatePendingCount() {
    const countEl = this.element?.querySelector('[data-count="pending"]');
    if (countEl) {
      countEl.textContent = this.pendingEdits.length.toString();
      countEl.style.display = this.pendingEdits.length > 0 ? 'inline-flex' : 'none';
    }
  }

  /**
   * Set loading state
   */
  setLoading(isLoading) {
    this.isLoading = isLoading;
    this.renderContent();
  }

  /**
   * Destroy the component
   */
  destroy() {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    this.element = null;
    this.contentElement = null;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { EditsMenuCompact };
}
