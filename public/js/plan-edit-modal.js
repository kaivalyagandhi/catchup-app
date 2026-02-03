/**
 * Plan Edit Modal Component
 * 
 * Modal for editing existing catchup plans before finalization.
 * Allows editing: date range, activity type, duration, location
 * Allows adding/removing invitees
 * Supports converting individual plans to group plans by adding contacts
 * 
 * Requirements: 12.1, 12.2, 12.7, 11.6
 */

class PlanEditModal {
  constructor(options = {}) {
    this.plan = options.plan;
    this.userId = options.userId || window.userId || localStorage.getItem('userId');
    this.onPlanUpdated = options.onPlanUpdated || (() => {});
    this.onClose = options.onClose || (() => {});
    
    // State
    this.invitees = new Map();
    this.removedInvitees = [];
    this.addedInvitees = [];
    this.preferences = null;
    this.groups = [];
    this.contacts = [];
    this.showContactPicker = false;
    
    // Track if this was originally an individual plan (for conversion detection)
    // Requirements: 11.6 - Individual plans can be converted to group plans
    this.wasIndividualPlan = (options.plan?.invitees?.length || 0) === 1;
    this.showConversionNotice = false;
    
    // Bind methods
    this.handleClose = this.handleClose.bind(this);
    this.handleSave = this.handleSave.bind(this);
  }
  
  /**
   * Open the modal
   */
  async open() {
    try {
      // Initialize invitees from plan
      this.plan.invitees.forEach(inv => {
        this.invitees.set(inv.contactId, {
          id: inv.contactId,
          name: inv.contactName,
          attendanceType: inv.attendanceType,
          hasResponded: inv.hasResponded,
          isOriginal: true
        });
      });
      
      await Promise.all([
        this.loadPreferences(),
        this.loadGroups(),
        this.loadContacts()
      ]);
      
      this.render();
      this.attachEventListeners();
    } catch (error) {
      console.error('Failed to open plan edit modal:', error);
    }
  }

  /**
   * Load user scheduling preferences
   */
  async loadPreferences() {
    try {
      const response = await fetch(`/api/scheduling/preferences?userId=${this.userId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      
      if (response.ok) {
        this.preferences = await response.json();
      }
    } catch (error) {
      console.error('Failed to load preferences:', error);
    }
  }
  
  /**
   * Load groups for contact picker
   */
  async loadGroups() {
    try {
      const response = await fetch(`/api/contacts/groups?userId=${this.userId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      
      if (response.ok) {
        this.groups = await response.json();
      }
    } catch (error) {
      console.error('Failed to load groups:', error);
    }
  }
  
  /**
   * Load contacts for adding new invitees
   */
  async loadContacts() {
    try {
      const response = await fetch(`/api/contacts?userId=${this.userId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      
      if (response.ok) {
        this.contacts = await response.json();
      }
    } catch (error) {
      console.error('Failed to load contacts:', error);
    }
  }

  /**
   * Render the modal
   */
  render() {
    // Remove existing modal if any
    const existingModal = document.querySelector('.plan-edit-modal');
    if (existingModal) {
      existingModal.remove();
    }
    
    const modal = document.createElement('div');
    modal.className = 'modal plan-edit-modal';
    modal.innerHTML = `
      <div class="modal-content plan-edit-content">
        <div class="modal-header">
          <h2>Edit Plan</h2>
          <button class="close-btn" id="close-edit-modal">&times;</button>
        </div>
        
        <div class="modal-body">
          ${this.renderEditForm()}
        </div>
        
        <div class="modal-footer">
          <button type="button" class="btn-secondary" id="cancel-edit">Cancel</button>
          <button type="button" class="btn-primary" id="save-edit">
            <span class="material-icons">save</span> Save Changes
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
  }

  /**
   * Render the edit form
   */
  renderEditForm() {
    // Check if we're converting from individual to group plan
    // Requirements: 11.6 - Individual plans can be converted to group plans
    const isConvertingToGroup = this.wasIndividualPlan && this.invitees.size > 1;
    
    return `
      <div class="plan-edit-form">
        ${isConvertingToGroup ? this.renderConversionNotice() : ''}
        
        <div class="form-section">
          <h4>Plan Details</h4>
          
          <div class="form-group">
            <label for="edit-activity-type">Activity Type</label>
            <select id="edit-activity-type">
              <option value="">Select activity...</option>
              <option value="coffee" ${this.plan.activityType === 'coffee' ? 'selected' : ''}>☕ Coffee</option>
              <option value="dinner" ${this.plan.activityType === 'dinner' ? 'selected' : ''}>🍽️ Dinner</option>
              <option value="video_call" ${this.plan.activityType === 'video_call' ? 'selected' : ''}>📹 Video Call</option>
              <option value="activity" ${this.plan.activityType === 'activity' ? 'selected' : ''}>🎯 Activity</option>
              <option value="other" ${this.plan.activityType === 'other' ? 'selected' : ''}>📝 Other</option>
            </select>
          </div>
          
          <div class="form-group">
            <label for="edit-duration">Duration</label>
            <select id="edit-duration">
              <option value="30" ${this.plan.duration === 30 ? 'selected' : ''}>30 minutes</option>
              <option value="60" ${this.plan.duration === 60 ? 'selected' : ''}>1 hour</option>
              <option value="120" ${this.plan.duration === 120 ? 'selected' : ''}>2 hours</option>
              <option value="240" ${this.plan.duration === 240 ? 'selected' : ''}>Half day</option>
            </select>
          </div>
          
          <div class="form-group">
            <label>Date Range (max 14 days)</label>
            <div class="date-range-inputs">
              <input type="date" id="edit-date-start" value="${this.formatDateForInput(this.plan.dateRangeStart)}">
              <span>to</span>
              <input type="date" id="edit-date-end" value="${this.formatDateForInput(this.plan.dateRangeEnd)}">
            </div>
          </div>
          
          <div class="form-group">
            <label for="edit-location">Location (optional)</label>
            <input type="text" id="edit-location" value="${this.escapeHtml(this.plan.location || '')}" placeholder="Enter location or meeting link">
            ${this.renderFavoriteLocations()}
          </div>
        </div>
        
        <div class="form-section">
          <div class="section-header">
            <h4>Invitees (${this.invitees.size})${isConvertingToGroup ? ' <span class="group-badge">Group Plan</span>' : ''}</h4>
            <button type="button" class="btn-secondary btn-sm" id="add-invitee-btn">
              <span class="material-icons">person_add</span> Add
            </button>
          </div>
          
          <div class="invitees-list" id="edit-invitees-list">
            ${this.renderInviteesList()}
          </div>
          
          ${this.showContactPicker ? this.renderContactPicker() : ''}
        </div>
      </div>
    `;
  }

  /**
   * Render favorite locations chips
   */
  renderFavoriteLocations() {
    if (!this.preferences?.favoriteLocations?.length) return '';
    
    return `
      <div class="favorite-locations">
        <span>Favorites:</span>
        ${this.preferences.favoriteLocations.map(loc => `
          <button type="button" class="location-chip" data-location="${this.escapeHtml(loc)}">${this.escapeHtml(loc)}</button>
        `).join('')}
      </div>
    `;
  }

  /**
   * Render conversion notice when converting individual plan to group plan
   * Requirements: 11.6 - Individual plans can be converted to group plans
   */
  renderConversionNotice() {
    return `
      <div class="conversion-notice">
        <div class="conversion-notice-icon">
          <span class="material-icons">group_add</span>
        </div>
        <div class="conversion-notice-content">
          <h4>Converting to Group Plan</h4>
          <p>
            You're adding more contacts to this individual plan. It will become a group plan where you can:
          </p>
          <ul>
            <li>Mark attendees as "Must Attend" or "Nice to Have"</li>
            <li>Use AI to find the best time for everyone</li>
            <li>See availability overlap for all participants</li>
          </ul>
          <p class="conversion-note">
            <span class="material-icons">info</span>
            The original contact will remain as "Must Attend" by default.
          </p>
        </div>
      </div>
    `;
  }
  
  /**
   * Render the invitees list
   */
  renderInviteesList() {
    if (this.invitees.size === 0) {
      return '<p class="no-invitees">No invitees added</p>';
    }
    
    return Array.from(this.invitees.values()).map(invitee => `
      <div class="invitee-edit-item" data-contact-id="${invitee.id}">
        <div class="invitee-info">
          <span class="invitee-name">${this.escapeHtml(invitee.name)}</span>
          ${invitee.hasResponded ? '<span class="response-badge responded">✓ Responded</span>' : ''}
          ${!invitee.isOriginal ? '<span class="new-badge">New</span>' : ''}
        </div>
        <div class="invitee-actions">
          <div class="attendance-toggle">
            <button type="button" class="attendance-btn ${invitee.attendanceType === 'must_attend' ? 'active' : ''}" 
                    data-type="must_attend" data-contact-id="${invitee.id}">Must</button>
            <button type="button" class="attendance-btn ${invitee.attendanceType === 'nice_to_have' ? 'active' : ''}" 
                    data-type="nice_to_have" data-contact-id="${invitee.id}">Nice</button>
          </div>
          <button type="button" class="btn-icon remove-invitee-btn" data-contact-id="${invitee.id}" 
                  title="Remove invitee" ${this.invitees.size <= 1 ? 'disabled' : ''}>
            <span class="material-icons">close</span>
          </button>
        </div>
      </div>
    `).join('');
  }

  /**
   * Render the contact picker for adding new invitees
   */
  renderContactPicker() {
    // Filter out contacts that are already invitees
    const availableContacts = this.contacts.filter(c => !this.invitees.has(c.id));
    
    return `
      <div class="contact-picker-inline" id="inline-contact-picker">
        <div class="picker-header">
          <input type="search" id="contact-search-input" placeholder="Search contacts..." class="contact-search-input">
          <button type="button" class="btn-icon" id="close-contact-picker">
            <span class="material-icons">close</span>
          </button>
        </div>
        <div class="contacts-list" id="available-contacts-list">
          ${availableContacts.length === 0 ? 
            '<p class="no-contacts">All contacts are already invited</p>' :
            availableContacts.slice(0, 10).map(contact => `
              <div class="contact-item" data-contact-id="${contact.id}" data-contact-name="${this.escapeHtml(contact.name)}">
                <span class="contact-name">${this.escapeHtml(contact.name)}</span>
                ${contact.circle ? `<span class="circle-badge ${contact.circle}">${this.getCircleEmoji(contact.circle)}</span>` : ''}
                <button type="button" class="btn-sm btn-secondary add-contact-btn" data-contact-id="${contact.id}">Add</button>
              </div>
            `).join('')
          }
        </div>
      </div>
    `;
  }
  
  /**
   * Get emoji for circle
   */
  getCircleEmoji(circle) {
    const emojis = {
      'inner': '💜',
      'close': '💗',
      'active': '💚',
      'casual': '💙'
    };
    return emojis[circle] || '';
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    const modal = document.querySelector('.plan-edit-modal');
    if (!modal) return;
    
    // Close buttons
    modal.querySelector('#close-edit-modal').addEventListener('click', this.handleClose);
    modal.querySelector('#cancel-edit').addEventListener('click', this.handleClose);
    
    // Save button
    modal.querySelector('#save-edit').addEventListener('click', this.handleSave);
    
    // Click outside to close
    modal.addEventListener('click', (e) => {
      if (e.target === modal) this.handleClose();
    });
    
    // Escape key to close
    this.escapeHandler = (e) => {
      if (e.key === 'Escape') this.handleClose();
    };
    document.addEventListener('keydown', this.escapeHandler);
    
    // Add invitee button
    const addInviteeBtn = modal.querySelector('#add-invitee-btn');
    if (addInviteeBtn) {
      addInviteeBtn.addEventListener('click', () => this.toggleContactPicker());
    }
    
    // Favorite location chips
    modal.querySelectorAll('.location-chip').forEach(chip => {
      chip.addEventListener('click', (e) => {
        const location = e.currentTarget.dataset.location;
        const locationInput = modal.querySelector('#edit-location');
        if (locationInput) locationInput.value = location;
      });
    });
    
    // Attendance toggle buttons
    this.attachInviteeListeners(modal);
    
    // Date range validation
    const dateStart = modal.querySelector('#edit-date-start');
    const dateEnd = modal.querySelector('#edit-date-end');
    if (dateStart && dateEnd) {
      dateStart.addEventListener('change', () => this.validateDateRange());
      dateEnd.addEventListener('change', () => this.validateDateRange());
    }
  }

  /**
   * Attach listeners to invitee list items
   */
  attachInviteeListeners(modal) {
    // Attendance toggle buttons
    modal.querySelectorAll('.attendance-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const contactId = e.currentTarget.dataset.contactId;
        const type = e.currentTarget.dataset.type;
        this.setAttendanceType(contactId, type);
      });
    });
    
    // Remove invitee buttons
    modal.querySelectorAll('.remove-invitee-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const contactId = e.currentTarget.dataset.contactId;
        this.removeInvitee(contactId);
      });
    });
    
    // Contact picker listeners
    const closePickerBtn = modal.querySelector('#close-contact-picker');
    if (closePickerBtn) {
      closePickerBtn.addEventListener('click', () => this.toggleContactPicker());
    }
    
    const searchInput = modal.querySelector('#contact-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => this.filterContacts(e.target.value));
    }
    
    modal.querySelectorAll('.add-contact-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const contactId = e.currentTarget.dataset.contactId;
        this.addInvitee(contactId);
      });
    });
  }
  
  /**
   * Toggle contact picker visibility
   */
  toggleContactPicker() {
    this.showContactPicker = !this.showContactPicker;
    this.updateInviteesSection();
  }

  /**
   * Update the invitees section without re-rendering the whole modal
   * Requirements: 11.6 - Update UI to reflect group plan conversion
   */
  updateInviteesSection() {
    const modal = document.querySelector('.plan-edit-modal');
    if (!modal) return;
    
    const inviteesList = modal.querySelector('#edit-invitees-list');
    if (inviteesList) {
      inviteesList.innerHTML = this.renderInviteesList();
    }
    
    // Update or add contact picker
    const existingPicker = modal.querySelector('#inline-contact-picker');
    if (this.showContactPicker) {
      if (!existingPicker) {
        const formSection = modal.querySelector('.form-section:last-child');
        if (formSection) {
          formSection.insertAdjacentHTML('beforeend', this.renderContactPicker());
        }
      }
    } else if (existingPicker) {
      existingPicker.remove();
    }
    
    // Update section header count and group badge
    // Requirements: 11.6 - Update UI to reflect group plan conversion
    const isConvertingToGroup = this.wasIndividualPlan && this.invitees.size > 1;
    const sectionHeader = modal.querySelector('.section-header h4');
    if (sectionHeader) {
      sectionHeader.innerHTML = `Invitees (${this.invitees.size})${isConvertingToGroup ? ' <span class="group-badge">Group Plan</span>' : ''}`;
    }
    
    // Re-attach listeners
    this.attachInviteeListeners(modal);
  }
  
  /**
   * Filter contacts in the picker
   */
  filterContacts(query) {
    const modal = document.querySelector('.plan-edit-modal');
    if (!modal) return;
    
    const contactsList = modal.querySelector('#available-contacts-list');
    if (!contactsList) return;
    
    const availableContacts = this.contacts.filter(c => 
      !this.invitees.has(c.id) && 
      c.name.toLowerCase().includes(query.toLowerCase())
    );
    
    contactsList.innerHTML = availableContacts.length === 0 ? 
      '<p class="no-contacts">No matching contacts</p>' :
      availableContacts.slice(0, 10).map(contact => `
        <div class="contact-item" data-contact-id="${contact.id}" data-contact-name="${this.escapeHtml(contact.name)}">
          <span class="contact-name">${this.escapeHtml(contact.name)}</span>
          ${contact.circle ? `<span class="circle-badge ${contact.circle}">${this.getCircleEmoji(contact.circle)}</span>` : ''}
          <button type="button" class="btn-sm btn-secondary add-contact-btn" data-contact-id="${contact.id}">Add</button>
        </div>
      `).join('');
    
    // Re-attach add button listeners
    contactsList.querySelectorAll('.add-contact-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const contactId = e.currentTarget.dataset.contactId;
        this.addInvitee(contactId);
      });
    });
  }

  /**
   * Add an invitee
   * Requirements: 11.6 - Individual plans can be converted to group plans
   */
  addInvitee(contactId) {
    const contact = this.contacts.find(c => c.id === contactId);
    if (!contact) return;
    
    // Check if this is converting from individual to group plan
    const isConvertingToGroup = this.wasIndividualPlan && this.invitees.size === 1;
    
    if (isConvertingToGroup && !this.showConversionNotice) {
      // Show confirmation dialog for conversion
      this.showConversionConfirmation(contact);
      return;
    }
    
    // Add the invitee
    this.invitees.set(contactId, {
      id: contactId,
      name: contact.name,
      attendanceType: 'must_attend',
      hasResponded: false,
      isOriginal: false
    });
    
    this.addedInvitees.push(contactId);
    this.updateInviteesSection();
    
    // Re-render the form to show conversion notice if applicable
    if (isConvertingToGroup) {
      this.render();
      this.attachEventListeners();
    }
  }

  /**
   * Show confirmation dialog when converting individual plan to group plan
   * Requirements: 11.6 - Individual plans can be converted to group plans
   */
  showConversionConfirmation(contact) {
    const modal = document.querySelector('.plan-edit-modal');
    if (!modal) return;
    
    // Create confirmation overlay
    const overlay = document.createElement('div');
    overlay.className = 'conversion-confirmation-overlay';
    overlay.innerHTML = `
      <div class="conversion-confirmation-dialog">
        <div class="dialog-header">
          <span class="material-icons">group_add</span>
          <h3>Convert to Group Plan?</h3>
        </div>
        <div class="dialog-body">
          <p>
            Adding <strong>${this.escapeHtml(contact.name)}</strong> will convert this from an individual 
            catchup to a group plan.
          </p>
          <div class="conversion-benefits">
            <div class="benefit-item">
              <span class="material-icons">check_circle</span>
              <span>Coordinate availability with multiple people</span>
            </div>
            <div class="benefit-item">
              <span class="material-icons">check_circle</span>
              <span>AI-powered time suggestions</span>
            </div>
            <div class="benefit-item">
              <span class="material-icons">check_circle</span>
              <span>Mark attendees as required or optional</span>
            </div>
          </div>
          <div class="attendance-selection">
            <label>Set attendance type for ${this.escapeHtml(contact.name)}:</label>
            <div class="attendance-options">
              <button type="button" class="attendance-option active" data-type="must_attend">
                <span class="material-icons">star</span>
                <span>Must Attend</span>
                <small>Required for the catchup</small>
              </button>
              <button type="button" class="attendance-option" data-type="nice_to_have">
                <span class="material-icons">star_border</span>
                <span>Nice to Have</span>
                <small>Optional attendee</small>
              </button>
            </div>
          </div>
        </div>
        <div class="dialog-footer">
          <button type="button" class="btn-secondary" id="cancel-conversion">Cancel</button>
          <button type="button" class="btn-primary" id="confirm-conversion">
            <span class="material-icons">group_add</span> Add & Convert
          </button>
        </div>
      </div>
    `;
    
    modal.appendChild(overlay);
    
    // Track selected attendance type
    let selectedAttendanceType = 'must_attend';
    
    // Attach event listeners
    overlay.querySelectorAll('.attendance-option').forEach(btn => {
      btn.addEventListener('click', (e) => {
        overlay.querySelectorAll('.attendance-option').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        selectedAttendanceType = e.currentTarget.dataset.type;
      });
    });
    
    overlay.querySelector('#cancel-conversion').addEventListener('click', () => {
      overlay.remove();
    });
    
    overlay.querySelector('#confirm-conversion').addEventListener('click', () => {
      // Mark that we've shown the conversion notice
      this.showConversionNotice = true;
      
      // Add the invitee with selected attendance type
      this.invitees.set(contact.id, {
        id: contact.id,
        name: contact.name,
        attendanceType: selectedAttendanceType,
        hasResponded: false,
        isOriginal: false
      });
      
      this.addedInvitees.push(contact.id);
      
      // Remove overlay
      overlay.remove();
      
      // Re-render the form to show conversion notice
      this.render();
      this.attachEventListeners();
      
      // Show success toast
      this.showToast(`Added ${contact.name} - plan converted to group`, 'success');
    });
    
    // Click outside to close
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.remove();
      }
    });
  }
  
  /**
   * Remove an invitee
   * Requirements: 11.6 - Handle reverting from group to individual plan
   */
  removeInvitee(contactId) {
    if (this.invitees.size <= 1) {
      this.showToast('Cannot remove the last invitee', 'error');
      return;
    }
    
    const invitee = this.invitees.get(contactId);
    if (invitee?.isOriginal) {
      this.removedInvitees.push(contactId);
    } else {
      // Remove from added list if it was just added
      this.addedInvitees = this.addedInvitees.filter(id => id !== contactId);
    }
    
    this.invitees.delete(contactId);
    
    // Check if we're reverting back to individual plan
    // Requirements: 11.6 - Handle reverting from group to individual plan
    const wasGroupPlan = this.wasIndividualPlan && this.showConversionNotice;
    const isNowIndividual = this.invitees.size === 1;
    
    if (wasGroupPlan && isNowIndividual) {
      // Re-render to remove conversion notice
      this.showConversionNotice = false;
      this.render();
      this.attachEventListeners();
      this.showToast('Reverted to individual plan', 'info');
    } else {
      this.updateInviteesSection();
    }
  }
  
  /**
   * Set attendance type for an invitee
   */
  setAttendanceType(contactId, type) {
    const invitee = this.invitees.get(contactId);
    if (invitee) {
      invitee.attendanceType = type;
      this.invitees.set(contactId, invitee);
      this.updateInviteesSection();
    }
  }

  /**
   * Validate date range
   */
  validateDateRange() {
    const modal = document.querySelector('.plan-edit-modal');
    if (!modal) return false;
    
    const dateStart = modal.querySelector('#edit-date-start');
    const dateEnd = modal.querySelector('#edit-date-end');
    
    if (!dateStart || !dateEnd) return true;
    
    const start = new Date(dateStart.value);
    const end = new Date(dateEnd.value);
    const daysDiff = (end - start) / (1000 * 60 * 60 * 24);
    
    if (daysDiff < 0) {
      this.showToast('End date must be after start date', 'error');
      return false;
    }
    
    if (daysDiff > 14) {
      this.showToast('Date range cannot exceed 14 days', 'error');
      return false;
    }
    
    return true;
  }
  
  /**
   * Handle close modal
   */
  handleClose() {
    const modal = document.querySelector('.plan-edit-modal');
    if (modal) {
      modal.remove();
    }
    document.body.style.overflow = '';
    
    if (this.escapeHandler) {
      document.removeEventListener('keydown', this.escapeHandler);
    }
    
    this.onClose();
  }

  /**
   * Handle save changes
   */
  async handleSave() {
    const modal = document.querySelector('.plan-edit-modal');
    if (!modal) return;
    
    // Validate date range
    if (!this.validateDateRange()) {
      return;
    }
    
    // Get form values
    const activityType = modal.querySelector('#edit-activity-type').value;
    const duration = parseInt(modal.querySelector('#edit-duration').value);
    const dateRangeStart = modal.querySelector('#edit-date-start').value;
    const dateRangeEnd = modal.querySelector('#edit-date-end').value;
    const location = modal.querySelector('#edit-location').value;
    
    // Show loading state
    const saveBtn = modal.querySelector('#save-edit');
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.innerHTML = '<span class="loading-spinner-sm"></span> Saving...';
    }
    
    try {
      // 1. Update plan details
      await this.updatePlanDetails({
        activityType: activityType || null,
        duration,
        dateRangeStart,
        dateRangeEnd,
        location: location || null
      });
      
      // 2. Remove invitees
      for (const contactId of this.removedInvitees) {
        await this.removeInviteeFromServer(contactId);
      }
      
      // 3. Add new invitees
      const newInviteLinks = [];
      for (const contactId of this.addedInvitees) {
        const invitee = this.invitees.get(contactId);
        if (invitee) {
          const link = await this.addInviteeToServer(contactId, invitee.attendanceType);
          newInviteLinks.push(link);
        }
      }
      
      // 4. Update attendance types for existing invitees
      for (const [contactId, invitee] of this.invitees) {
        if (invitee.isOriginal && !this.removedInvitees.includes(contactId)) {
          const originalInvitee = this.plan.invitees.find(i => i.contactId === contactId);
          if (originalInvitee && originalInvitee.attendanceType !== invitee.attendanceType) {
            await this.updateInviteeAttendanceOnServer(contactId, invitee.attendanceType);
          }
        }
      }
      
      this.showToast('Plan updated successfully!', 'success');
      
      // Show new invite links if any
      if (newInviteLinks.length > 0) {
        this.showNewInviteLinks(newInviteLinks);
      } else {
        this.handleClose();
        this.onPlanUpdated();
      }
      
    } catch (error) {
      console.error('Failed to save plan:', error);
      this.showToast(error.message || 'Failed to save changes', 'error');
      
      // Reset button
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<span class="material-icons">save</span> Save Changes';
      }
    }
  }

  /**
   * Update plan details on server
   */
  async updatePlanDetails(updates) {
    const response = await fetch(`/api/scheduling/plans/${this.plan.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      },
      body: JSON.stringify({
        userId: this.userId,
        ...updates
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update plan');
    }
    
    return response.json();
  }
  
  /**
   * Add invitee on server
   */
  async addInviteeToServer(contactId, attendanceType) {
    const response = await fetch(`/api/scheduling/plans/${this.plan.id}/invitees`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      },
      body: JSON.stringify({
        userId: this.userId,
        contactId,
        attendanceType
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to add invitee');
    }
    
    return response.json();
  }
  
  /**
   * Remove invitee on server
   */
  async removeInviteeFromServer(contactId) {
    const response = await fetch(`/api/scheduling/plans/${this.plan.id}/invitees/${contactId}?userId=${this.userId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      }
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to remove invitee');
    }
  }
  
  /**
   * Update invitee attendance on server
   */
  async updateInviteeAttendanceOnServer(contactId, attendanceType) {
    const response = await fetch(`/api/scheduling/plans/${this.plan.id}/invitees/${contactId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      },
      body: JSON.stringify({
        userId: this.userId,
        attendanceType
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update invitee');
    }
  }

  /**
   * Show new invite links after adding invitees
   */
  showNewInviteLinks(inviteLinks) {
    const modal = document.querySelector('.plan-edit-modal');
    if (!modal) return;
    
    const modalBody = modal.querySelector('.modal-body');
    if (modalBody) {
      modalBody.innerHTML = `
        <div class="new-invite-links-container">
          <div class="success-message">
            <span class="material-icons">check_circle</span>
            <h3>Plan Updated!</h3>
            <p>Share these links with your new invitees so they can mark their availability.</p>
          </div>
          
          <div class="invite-links-list">
            ${inviteLinks.map(link => `
              <div class="invite-link-item">
                <div class="invitee-info">
                  <span class="invitee-name">${this.escapeHtml(link.contactName)}</span>
                  <span class="attendance-badge ${link.attendanceType}">${link.attendanceType === 'must_attend' ? 'Must Attend' : 'Nice to Have'}</span>
                </div>
                <div class="link-actions">
                  <input type="text" readonly value="${link.url}" class="link-input">
                  <button type="button" class="copy-btn" data-link="${link.url}" title="Copy link">
                    <span class="material-icons">content_copy</span>
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
          
          <button type="button" class="btn-secondary" id="copy-all-new-links">
            <span class="material-icons">content_copy</span> Copy All Links
          </button>
        </div>
      `;
    }
    
    // Update footer
    const modalFooter = modal.querySelector('.modal-footer');
    if (modalFooter) {
      modalFooter.innerHTML = `
        <button type="button" class="btn-primary" id="done-edit">Done</button>
      `;
    }
    
    // Attach new listeners
    modal.querySelectorAll('.copy-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const link = e.currentTarget.dataset.link;
        this.copyToClipboard(link);
        this.showCopyFeedback(e.currentTarget);
      });
    });
    
    const copyAllBtn = modal.querySelector('#copy-all-new-links');
    if (copyAllBtn) {
      copyAllBtn.addEventListener('click', () => {
        const allLinks = inviteLinks.map(link => `${link.contactName}: ${link.url}`).join('\n');
        this.copyToClipboard(allLinks);
      });
    }
    
    const doneBtn = modal.querySelector('#done-edit');
    if (doneBtn) {
      doneBtn.addEventListener('click', () => {
        this.handleClose();
        this.onPlanUpdated();
      });
    }
  }

  /**
   * Copy text to clipboard
   */
  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      this.showToast('Copied to clipboard', 'success');
    } catch (error) {
      console.error('Failed to copy:', error);
      this.showToast('Failed to copy', 'error');
    }
  }
  
  /**
   * Show copy feedback on button
   */
  showCopyFeedback(button) {
    const icon = button.querySelector('.material-icons');
    if (icon) {
      const originalText = icon.textContent;
      icon.textContent = 'check';
      setTimeout(() => {
        icon.textContent = originalText;
      }, 2000);
    }
  }
  
  /**
   * Format date for input field
   */
  formatDateForInput(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toISOString().split('T')[0];
  }
  
  /**
   * Show toast notification
   */
  showToast(message, type = 'info') {
    if (window.showToast) {
      window.showToast(message, type);
    } else {
      console.log(`[${type}] ${message}`);
    }
  }
  
  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Export for use in other modules
window.PlanEditModal = PlanEditModal;
