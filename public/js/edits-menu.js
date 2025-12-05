/**
 * Edits Menu Component
 *
 * Unified menu for managing pending edits and edit history.
 * Replaces the previous Voice Notes menu.
 *
 * Requirements: 1.1-1.7, 7.1, 9.1-9.5, 10.2, 11.1-11.6
 */

class EditsMenu {
  constructor(options = {}) {
    this.activeTab = 'pending';
    this.pendingEdits = [];
    this.editHistory = [];
    this.isLoading = false;
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
          <span class="edits-menu__tab-count" data-count="pending" style="display: none;">0</span>
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
      this.renderPendingEdits();
    } else {
      this.renderEditHistory();
    }
  }

  /**
   * Render pending edits tab
   * Requirements: 1.3, 1.6, 7.1
   */
  renderPendingEdits() {
    if (this.pendingEdits.length === 0) {
      this.contentElement.innerHTML = `
        <div class="edits-menu__empty">
          <div style="text-align: center; padding: 24px 16px;">
            <div style="font-size: 48px; margin-bottom: 12px;">✨</div>
            <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600;">You've cleared your inbox!</h3>
            <p style="margin: 0 0 20px 0; font-size: 13px; color: var(--text-secondary); line-height: 1.5;">
              Great job staying on top of your contacts. Try adding more by chatting with the voice recorder.
            </p>
            <button class="edits-menu__open-chat-btn" style="background: #007AFF; color: white; border: none; padding: 10px 18px; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; box-shadow: 0 2px 8px rgba(0, 122, 255, 0.3);">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
              Open Chat
            </button>
          </div>
        </div>
      `;

      const btn = this.contentElement.querySelector('.edits-menu__open-chat-btn');
      if (btn) {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('Chat button clicked');
          this.onOpenChat();
        });
        // Add hover effect
        btn.addEventListener('mouseenter', () => {
          btn.style.background = '#0051D5';
          btn.style.boxShadow = '0 4px 12px rgba(0, 122, 255, 0.4)';
        });
        btn.addEventListener('mouseleave', () => {
          btn.style.background = '#007AFF';
          btn.style.boxShadow = '0 2px 8px rgba(0, 122, 255, 0.3)';
        });
      }
      return;
    }

    const list = document.createElement('div');
    list.className = 'edits-menu__list';

    for (const edit of this.pendingEdits) {
      const item = this.createEditItem(edit, false);
      list.appendChild(item);
    }

    this.contentElement.innerHTML = '';
    this.contentElement.appendChild(list);
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
      const item = this.createEditItem(entry, true);
      list.appendChild(item);
    }

    this.contentElement.innerHTML = '';
    this.contentElement.appendChild(list);
  }

  /**
   * Create an edit item element
   * Requirements: 1.7, 7.1, 9.1-9.5, 10.2, 11.1-11.6
   */
  createEditItem(edit, isHistory) {
    const item = document.createElement('div');
    item.className = 'edit-item';
    item.setAttribute('data-edit-id', edit.id);

    // Check if low confidence (requires review)
    const confidenceScore = isHistory ? null : edit.confidenceScore;
    const requiresReview = confidenceScore !== null && confidenceScore < 0.5;
    
    if (requiresReview) {
      item.classList.add('edit-item--requires-review');
    }

    // Edit type badge
    const typeBadge = document.createElement('span');
    typeBadge.className = `edit-item__type edit-item__type--${edit.editType}`;
    typeBadge.textContent = this.formatEditType(edit.editType);

    // Target (contact or group)
    const target = document.createElement('div');
    target.className = 'edit-item__target';
    
    if (edit.targetContactName || edit.targetContactId) {
      const contactLink = this.createEntityLink(
        edit.targetContactName || 'Unknown Contact',
        edit.targetContactId,
        'contact'
      );
      target.appendChild(contactLink);
    }
    
    if (edit.targetGroupName || edit.targetGroupId) {
      if (target.children.length > 0) {
        target.appendChild(document.createTextNode(' → '));
      }
      const groupLink = this.createEntityLink(
        edit.targetGroupName || 'Unknown Group',
        edit.targetGroupId,
        'group'
      );
      target.appendChild(groupLink);
    }

    // Value
    const value = document.createElement('div');
    value.className = 'edit-item__value';
    value.textContent = this.formatValue(edit.editType, isHistory ? edit.appliedValue : edit.proposedValue, edit.field);

    // Source attribution
    const source = document.createElement('div');
    source.className = 'edit-item__source';
    source.innerHTML = this.createSourceAttribution(edit.source, isHistory);

    // Confidence score (pending only)
    let confidence = null;
    if (!isHistory && confidenceScore !== null) {
      confidence = document.createElement('div');
      confidence.className = 'edit-item__confidence';
      confidence.innerHTML = `
        <span class="edit-item__confidence-label">Confidence:</span>
        <span class="edit-item__confidence-value ${requiresReview ? 'edit-item__confidence-value--low' : ''}">${Math.round(confidenceScore * 100)}%</span>
      `;
    }

    // Timestamp
    const timestamp = document.createElement('div');
    timestamp.className = 'edit-item__timestamp';
    timestamp.textContent = this.formatTimestamp(isHistory ? edit.submittedAt : edit.createdAt);

    // Build item
    const header = document.createElement('div');
    header.className = 'edit-item__header';
    header.appendChild(typeBadge);
    if (confidence) header.appendChild(confidence);
    header.appendChild(timestamp);

    item.appendChild(header);
    item.appendChild(target);
    item.appendChild(value);
    item.appendChild(source);

    // Actions (pending only)
    if (!isHistory) {
      const actions = this.createEditActions(edit);
      item.appendChild(actions);
    }

    return item;
  }

  /**
   * Create entity link (contact or group)
   * Requirements: 11.1-11.6
   */
  createEntityLink(name, id, type) {
    if (!id) {
      // Entity doesn't exist, show as plain text
      const span = document.createElement('span');
      span.className = 'edit-item__entity edit-item__entity--deleted';
      span.textContent = name;
      return span;
    }

    const link = document.createElement('button');
    link.className = `edit-item__entity edit-item__entity--${type}`;
    link.textContent = name;
    link.addEventListener('click', (e) => {
      e.stopPropagation();
      if (type === 'contact') {
        this.onContactClick(id);
      } else {
        this.onGroupClick(id);
      }
    });

    return link;
  }

  /**
   * Create source attribution display
   * Requirements: 9.2, 9.3, 9.4
   */
  createSourceAttribution(source, isHistory) {
    if (!source) return '';

    const sourceType = source.type === 'voice_transcript' ? 'Voice' : 
                       source.type === 'text_input' ? 'Text' : 'Manual';
    
    let html = `<span class="edit-item__source-type">${sourceType}</span>`;
    
    if (source.transcriptExcerpt) {
      html += `
        <span class="edit-item__source-excerpt">"${this.truncate(source.transcriptExcerpt, 50)}"</span>
        <button class="edit-item__source-expand" aria-label="Show full context">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>
        <div class="edit-item__source-full" style="display: none;">
          <p>${source.fullContext || source.transcriptExcerpt}</p>
          <span class="edit-item__source-time">${this.formatTimestamp(source.timestamp)}</span>
        </div>
      `;
    }

    return html;
  }

  /**
   * Create action buttons for pending edits
   * Requirements: 7.6, 7.7
   */
  createEditActions(edit) {
    const actions = document.createElement('div');
    actions.className = 'edit-item__actions';

    // Change contact button (for fuzzy search)
    if (edit.editType !== 'create_contact' && edit.editType !== 'create_group') {
      const changeBtn = document.createElement('button');
      changeBtn.className = 'edit-item__action edit-item__action--change';
      changeBtn.textContent = 'Change Contact';
      changeBtn.addEventListener('click', () => this.showContactSearch(edit));
      actions.appendChild(changeBtn);
    }

    // Dismiss button
    const dismissBtn = document.createElement('button');
    dismissBtn.className = 'edit-item__action edit-item__action--dismiss';
    dismissBtn.textContent = 'Dismiss';
    dismissBtn.addEventListener('click', () => this.onEditDismiss(edit.id));
    actions.appendChild(dismissBtn);

    // Submit button
    const submitBtn = document.createElement('button');
    submitBtn.className = 'edit-item__action edit-item__action--submit';
    submitBtn.textContent = 'Submit';
    submitBtn.addEventListener('click', () => this.onEditSubmit(edit.id));
    actions.appendChild(submitBtn);

    return actions;
  }

  /**
   * Show contact search for changing target
   * Requirements: 7.2, 7.3, 7.4
   */
  async showContactSearch(edit) {
    const item = this.element.querySelector(`[data-edit-id="${edit.id}"]`);
    if (!item) return;

    // Check if search is already open
    if (item.querySelector('.edit-item__search')) return;

    const searchContainer = document.createElement('div');
    searchContainer.className = 'edit-item__search';
    searchContainer.innerHTML = `
      <input type="text" class="edit-item__search-input" placeholder="Search contacts..." aria-label="Search contacts">
      <div class="edit-item__search-results"></div>
      <button class="edit-item__search-create">+ Create new contact</button>
    `;

    const input = searchContainer.querySelector('.edit-item__search-input');
    const results = searchContainer.querySelector('.edit-item__search-results');
    const createBtn = searchContainer.querySelector('.edit-item__search-create');

    let debounceTimer;
    input.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(async () => {
        const query = input.value.trim();
        if (query.length < 2) {
          results.innerHTML = '';
          return;
        }

        const matches = await this.onSearchContact(query);
        results.innerHTML = '';

        for (const match of matches) {
          const option = document.createElement('button');
          option.className = 'edit-item__search-option';
          option.innerHTML = `
            <span class="search-option__name">${match.name}</span>
            <span class="search-option__score">${Math.round(match.similarityScore * 100)}%</span>
          `;
          option.addEventListener('click', () => {
            this.onEditUpdate(edit.id, { targetContactId: match.id, targetContactName: match.name });
            searchContainer.remove();
          });
          results.appendChild(option);
        }
      }, 300);
    });

    createBtn.addEventListener('click', () => {
      // Navigate to create contact flow
      this.onContactClick(null, input.value.trim());
      searchContainer.remove();
    });

    item.appendChild(searchContainer);
    input.focus();
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
   * Format edit type for display
   */
  formatEditType(editType) {
    const typeMap = {
      'create_contact': 'New Contact',
      'update_contact_field': 'Update',
      'add_tag': 'Add Tag',
      'remove_tag': 'Remove Tag',
      'add_to_group': 'Add to Group',
      'remove_from_group': 'Remove from Group',
      'create_group': 'New Group',
    };
    return typeMap[editType] || editType;
  }

  /**
   * Format value for display
   */
  formatValue(editType, value, field) {
    if (editType === 'update_contact_field' && field) {
      return `${field}: ${JSON.stringify(value)}`;
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  }

  /**
   * Format timestamp for display
   */
  formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString();
  }

  /**
   * Truncate string
   */
  truncate(str, maxLength) {
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength) + '...';
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
  module.exports = { EditsMenu };
}
