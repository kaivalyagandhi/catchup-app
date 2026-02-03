/**
 * Plan Creation Modal Component
 * 
 * Multi-step modal for creating catchup plans.
 * Steps: 1) Select Contacts → 2) Plan Details → 3) Share Links
 * 
 * Requirements: 2.1-2.17, 3.4-3.7
 */

class PlanCreationModal {
  constructor(options = {}) {
    this.onPlanCreated = options.onPlanCreated || (() => {});
    this.userId = options.userId || window.userId || localStorage.getItem('userId');
    this.preSelectedContacts = options.preSelectedContacts || [];
    this.preSelectedCircle = options.preSelectedCircle || null;
    
    // State
    this.selectedContacts = new Map();
    this.preferences = null;
    this.step = 1;
    this.inviteLinks = [];
    this.createdPlan = null;
    this.contactPicker = null;
    this.groups = [];
    
    // Loading and error states - Task 14.2
    this.isLoading = false;
    this.isSubmitting = false;
    this.submitError = null;
    this.retryCount = 0;
    this.maxRetries = 3;
    
    // Bind methods
    this.handleClose = this.handleClose.bind(this);
    this.handleNext = this.handleNext.bind(this);
    this.handleBack = this.handleBack.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
  }
  
  /**
   * Check if this is an individual plan (single contact)
   * Requirements: 11.1, 11.2 - Individual plans have simplified flow
   */
  isIndividualPlan() {
    return this.selectedContacts.size === 1;
  }
  
  /**
   * Open the modal
   */
  async open() {
    try {
      await this.loadPreferences();
      await this.loadGroups();
      this.render();
      this.attachEventListeners();
      
      // Initialize contact picker for step 1
      if (this.step === 1) {
        this.initContactPicker();
      }
    } catch (error) {
      console.error('Failed to open plan creation modal:', error);
    }
  }
  
  /**
   * Load user scheduling preferences
   */
  async loadPreferences() {
    try {
      const userId = this.userId || window.userId || localStorage.getItem('userId');
      const response = await fetch(`/api/scheduling/preferences?userId=${userId}`, {
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
      const userId = this.userId || window.userId || localStorage.getItem('userId');
      const response = await fetch(`/api/contacts/groups?userId=${userId}`, {
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
   * Render the modal
   */
  render() {
    // Remove existing modal if any
    const existingModal = document.querySelector('.plan-creation-modal');
    if (existingModal) {
      existingModal.remove();
    }
    
    const modal = document.createElement('div');
    modal.className = 'modal plan-creation-modal';
    modal.innerHTML = `
      <div class="modal-content plan-creation-content">
        <div class="modal-header">
          <h2>Create Catchup Plan</h2>
          <button class="close-btn" id="close-plan-modal">&times;</button>
        </div>
        
        <div class="step-indicator">
          <div class="step ${this.step >= 1 ? 'active' : ''}" data-step="1">
            <span class="step-number">1</span>
            <span class="step-label">Select Contacts</span>
          </div>
          <div class="step ${this.step >= 2 ? 'active' : ''}" data-step="2">
            <span class="step-number">2</span>
            <span class="step-label">Plan Details</span>
          </div>
          <div class="step ${this.step >= 3 ? 'active' : ''}" data-step="3">
            <span class="step-number">3</span>
            <span class="step-label">Share Links</span>
          </div>
        </div>
        
        <div class="modal-body">
          ${this.renderCurrentStep()}
        </div>
        
        <div class="modal-footer">
          ${this.renderFooterButtons()}
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
  }
  
  /**
   * Render current step content
   */
  renderCurrentStep() {
    switch (this.step) {
      case 1:
        return this.renderStep1();
      case 2:
        return this.renderStep2();
      case 3:
        return this.renderStep3();
      default:
        return '';
    }
  }
  
  /**
   * Render Step 1: Contact Selection
   */
  renderStep1() {
    return `
      <div id="contact-picker-container">
        <!-- Contact picker will be initialized here -->
        <div class="loading-state">
          <div class="loading-spinner"></div>
          <p>Loading contacts...</p>
        </div>
      </div>
    `;
  }
  
  /**
   * Render Step 2: Plan Details
   * Requirements: 11.1, 11.2 - Simplified flow for individual plans (skip attendance type)
   */
  renderStep2() {
    const defaultStartDate = this.getDefaultStartDate();
    const defaultEndDate = this.getDefaultEndDate();
    const isIndividual = this.isIndividualPlan();
    
    // For individual plans, auto-set the single contact as must_attend
    // Requirements: 11.2 - No attendance type selection for single contact
    if (isIndividual) {
      const contact = Array.from(this.selectedContacts.values())[0];
      if (contact) {
        contact.attendanceType = 'must_attend';
        this.selectedContacts.set(contact.id, contact);
      }
    }
    
    return `
      <div class="plan-details-form ${isIndividual ? 'individual-plan-form' : ''}">
        ${isIndividual ? `
          <div class="individual-plan-banner">
            <span class="material-icons">person</span>
            <div class="banner-content">
              <strong>One-on-One Catchup</strong>
              <span>Planning with ${this.escapeHtml(Array.from(this.selectedContacts.values())[0]?.name || 'your contact')}</span>
            </div>
          </div>
        ` : ''}
        
        ${this.preferences && this.preferences.applyByDefault !== false ? `
          <div class="apply-preferences-banner">
            <span class="material-icons">auto_awesome</span>
            <span>Your saved preferences have been applied</span>
            <button class="btn-secondary btn-sm" id="clear-preferences">Clear</button>
          </div>
        ` : this.preferences ? `
          <div class="apply-preferences-banner">
            <span class="material-icons">auto_awesome</span>
            <span>Apply your saved preferences?</span>
            <button class="btn-secondary btn-sm" id="apply-preferences">Apply</button>
          </div>
        ` : ''}
        
        <div class="form-group">
          <label for="activity-type">Activity Type</label>
          <select id="activity-type">
            <option value="">Select activity...</option>
            <option value="coffee" ${this.getPreferenceValue('defaultActivityType') === 'coffee' ? 'selected' : ''}>☕ Coffee</option>
            <option value="dinner" ${this.getPreferenceValue('defaultActivityType') === 'dinner' ? 'selected' : ''}>🍽️ Dinner</option>
            <option value="video_call" ${this.getPreferenceValue('defaultActivityType') === 'video_call' ? 'selected' : ''}>📹 Video Call</option>
            <option value="activity" ${this.getPreferenceValue('defaultActivityType') === 'activity' ? 'selected' : ''}>🎯 Activity</option>
            <option value="other">📝 Other</option>
          </select>
        </div>
        
        <div class="form-group">
          <label for="duration">Duration</label>
          <select id="duration">
            <option value="30" ${this.getPreferenceValue('defaultDuration') === 30 ? 'selected' : ''}>30 minutes</option>
            <option value="60" ${!this.getPreferenceValue('defaultDuration') || this.getPreferenceValue('defaultDuration') === 60 ? 'selected' : ''}>1 hour</option>
            <option value="120" ${this.getPreferenceValue('defaultDuration') === 120 ? 'selected' : ''}>2 hours</option>
            <option value="240" ${this.getPreferenceValue('defaultDuration') === 240 ? 'selected' : ''}>Half day</option>
          </select>
        </div>
        
        <div class="form-group">
          <label>Date Range (max 14 days)</label>
          <div class="date-range-inputs">
            <input type="date" id="date-start" value="${defaultStartDate}" min="${defaultStartDate}">
            <span>to</span>
            <input type="date" id="date-end" value="${defaultEndDate}">
          </div>
        </div>
        
        ${!isIndividual ? `
          <div class="form-group">
            <label>Attendance Type</label>
            <div class="attendance-list" id="attendance-list">
              ${this.renderAttendanceList()}
            </div>
          </div>
        ` : ''}
        
        <div class="form-group">
          <label for="location">Location (optional)</label>
          <input type="text" id="location" placeholder="Enter location or meeting link">
          ${this.preferences?.favoriteLocations?.length ? `
            <div class="favorite-locations">
              <span>Favorites:</span>
              ${this.preferences.favoriteLocations.map(loc => `
                <button type="button" class="location-chip" data-location="${this.escapeHtml(loc)}">${this.escapeHtml(loc)}</button>
              `).join('')}
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }
  
  /**
   * Render attendance list for selected contacts
   */
  renderAttendanceList() {
    if (this.selectedContacts.size === 0) {
      return '<p class="no-contacts">No contacts selected</p>';
    }
    
    return Array.from(this.selectedContacts.values()).map(contact => `
      <div class="attendance-item" data-contact-id="${contact.id}">
        <span class="contact-name">${this.escapeHtml(contact.name)}</span>
        <div class="attendance-toggle">
          <button type="button" class="attendance-btn ${contact.attendanceType === 'must_attend' ? 'active' : ''}" 
                  data-type="must_attend" data-contact-id="${contact.id}">Must Attend</button>
          <button type="button" class="attendance-btn ${contact.attendanceType === 'nice_to_have' ? 'active' : ''}" 
                  data-type="nice_to_have" data-contact-id="${contact.id}">Nice to Have</button>
        </div>
      </div>
    `).join('');
  }
  
  /**
   * Render Step 3: Invite Links
   * Requirements: 5.1 - Prompt initiator to mark their availability after plan creation
   * Requirements: 11.3, 11.5 - Direct availability collection and quick finalization for individual plans
   */
  renderStep3() {
    const isIndividual = this.isIndividualPlan();
    const contactName = isIndividual ? this.escapeHtml(this.inviteLinks[0]?.contactName || 'your contact') : '';
    
    return `
      <div class="invite-links-container ${isIndividual ? 'individual-plan-links' : ''}">
        <div class="success-message">
          <span class="material-icons">check_circle</span>
          <h3>${isIndividual ? 'One-on-One Plan Created!' : 'Plan Created!'}</h3>
          <p>${isIndividual 
            ? `Share this link with ${contactName} so they can mark their availability.`
            : 'Share these links with your friends so they can mark their availability.'
          }</p>
        </div>
        
        <!-- Initiator Availability Prompt - Requirement 5.1 -->
        <div class="initiator-availability-prompt">
          <div class="prompt-icon">
            <span class="material-icons">event_available</span>
          </div>
          <div class="prompt-content">
            <h4>Mark Your Availability</h4>
            <p>Let ${isIndividual ? contactName : 'others'} know when you're free to help find the best time.</p>
          </div>
          <button type="button" class="btn-primary" id="mark-my-availability">
            <span class="material-icons">edit_calendar</span>
            Mark Availability
          </button>
        </div>
        
        <div class="invite-links-list">
          ${this.inviteLinks.map(link => `
            <div class="invite-link-item ${isIndividual ? 'individual-link-item' : ''}">
              <div class="invitee-info">
                <span class="invitee-name">${this.escapeHtml(link.contactName)}</span>
                ${!isIndividual ? `
                  <span class="attendance-badge ${link.attendanceType}">${link.attendanceType === 'must_attend' ? 'Must Attend' : 'Nice to Have'}</span>
                ` : ''}
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
        
        ${!isIndividual ? `
          <button type="button" class="btn-secondary" id="copy-all-links">
            <span class="material-icons">content_copy</span> Copy All Links
          </button>
        ` : ''}
        
        <div class="next-steps ${isIndividual ? 'individual-next-steps' : ''}">
          <h4>Next Steps</h4>
          <ol>
            <li>Mark your own availability (recommended)</li>
            <li>Copy the link${isIndividual ? '' : 's'} above and share ${isIndividual ? 'it' : 'them'} via your preferred messaging app</li>
            <li>Wait for ${isIndividual ? contactName + ' to mark their' : 'everyone to mark their'} availability</li>
            <li>Once availability is collected, ${isIndividual ? 'pick a time that works for both of you' : 'we\'ll help you find the best time'}</li>
          </ol>
        </div>
      </div>
    `;
  }
  
  /**
   * Render footer buttons based on current step
   */
  renderFooterButtons() {
    switch (this.step) {
      case 1:
        return `
          <button type="button" class="btn-secondary" id="modal-cancel">Cancel</button>
          <button type="button" class="btn-primary" id="modal-next" ${this.selectedContacts.size === 0 ? 'disabled' : ''}>
            Next <span class="material-icons">arrow_forward</span>
          </button>
        `;
      case 2:
        return `
          <button type="button" class="btn-secondary" id="modal-back">
            <span class="material-icons">arrow_back</span> Back
          </button>
          <button type="button" class="btn-primary" id="modal-submit">
            Create Plan <span class="material-icons">check</span>
          </button>
        `;
      case 3:
        return `
          <button type="button" class="btn-primary" id="modal-done">Done</button>
        `;
      default:
        return '';
    }
  }
  
  /**
   * Attach event listeners
   */
  attachEventListeners() {
    const modal = document.querySelector('.plan-creation-modal');
    if (!modal) return;
    
    // Close button
    const closeBtn = modal.querySelector('#close-plan-modal');
    if (closeBtn) {
      closeBtn.addEventListener('click', this.handleClose);
    }
    
    // Cancel button
    const cancelBtn = modal.querySelector('#modal-cancel');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', this.handleClose);
    }
    
    // Next button
    const nextBtn = modal.querySelector('#modal-next');
    if (nextBtn) {
      nextBtn.addEventListener('click', this.handleNext);
    }
    
    // Back button
    const backBtn = modal.querySelector('#modal-back');
    if (backBtn) {
      backBtn.addEventListener('click', this.handleBack);
    }
    
    // Submit button
    const submitBtn = modal.querySelector('#modal-submit');
    if (submitBtn) {
      submitBtn.addEventListener('click', this.handleSubmit);
    }
    
    // Done button
    const doneBtn = modal.querySelector('#modal-done');
    if (doneBtn) {
      doneBtn.addEventListener('click', this.handleClose);
    }
    
    // Step 2 specific listeners
    if (this.step === 2) {
      this.attachStep2Listeners(modal);
    }
    
    // Step 3 specific listeners
    if (this.step === 3) {
      this.attachStep3Listeners(modal);
    }
    
    // Click outside to close
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.handleClose();
      }
    });
    
    // Escape key to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.handleClose();
      }
    });
  }
  
  /**
   * Attach Step 2 specific listeners
   */
  attachStep2Listeners(modal) {
    // Apply preferences button
    const applyPrefsBtn = modal.querySelector('#apply-preferences');
    if (applyPrefsBtn) {
      applyPrefsBtn.addEventListener('click', () => this.applyPreferences());
    }
    
    // Clear preferences button
    const clearPrefsBtn = modal.querySelector('#clear-preferences');
    if (clearPrefsBtn) {
      clearPrefsBtn.addEventListener('click', () => this.clearPreferences());
    }
    
    // Attendance toggle buttons
    modal.querySelectorAll('.attendance-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const contactId = e.currentTarget.dataset.contactId;
        const type = e.currentTarget.dataset.type;
        this.setAttendanceType(contactId, type);
      });
    });
    
    // Favorite location chips
    modal.querySelectorAll('.location-chip').forEach(chip => {
      chip.addEventListener('click', (e) => {
        const location = e.currentTarget.dataset.location;
        const locationInput = modal.querySelector('#location');
        if (locationInput) {
          locationInput.value = location;
        }
      });
    });
    
    // Date range validation
    const dateStart = modal.querySelector('#date-start');
    const dateEnd = modal.querySelector('#date-end');
    if (dateStart && dateEnd) {
      dateStart.addEventListener('change', () => this.validateDateRange());
      dateEnd.addEventListener('change', () => this.validateDateRange());
    }
  }
  
  /**
   * Attach Step 3 specific listeners
   * Requirements: 5.1 - Handle initiator availability prompt
   */
  attachStep3Listeners(modal) {
    // Copy individual link buttons
    modal.querySelectorAll('.copy-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const link = e.currentTarget.dataset.link;
        this.copyToClipboard(link);
        this.showCopyFeedback(e.currentTarget);
      });
    });
    
    // Copy all links button
    const copyAllBtn = modal.querySelector('#copy-all-links');
    if (copyAllBtn) {
      copyAllBtn.addEventListener('click', () => this.copyAllLinks());
    }
    
    // Mark My Availability button - Requirement 5.1
    const markAvailabilityBtn = modal.querySelector('#mark-my-availability');
    if (markAvailabilityBtn) {
      markAvailabilityBtn.addEventListener('click', () => this.openInitiatorAvailabilityModal());
    }
  }
  
  /**
   * Open the initiator availability modal
   * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7
   */
  openInitiatorAvailabilityModal() {
    if (!window.InitiatorAvailabilityModal) {
      this.showToast('Availability marking is not available', 'error');
      return;
    }
    
    const availabilityModal = new window.InitiatorAvailabilityModal({
      planId: this.createdPlan.id,
      plan: this.createdPlan,
      userId: this.userId,
      onSave: (slots) => {
        // Update the prompt to show availability was marked
        this.updateAvailabilityPromptAfterSave(slots.length);
        this.showToast('Your availability has been saved!', 'success');
      },
      onSkip: () => {
        // User skipped, no action needed
      }
    });
    
    availabilityModal.open();
  }
  
  /**
   * Update the availability prompt after saving
   */
  updateAvailabilityPromptAfterSave(slotCount) {
    const prompt = document.querySelector('.initiator-availability-prompt');
    if (prompt) {
      prompt.innerHTML = `
        <div class="prompt-icon success">
          <span class="material-icons">check_circle</span>
        </div>
        <div class="prompt-content">
          <h4>Availability Marked!</h4>
          <p>You've selected ${slotCount} time slot${slotCount !== 1 ? 's' : ''}.</p>
        </div>
        <button type="button" class="btn-secondary" id="edit-my-availability">
          <span class="material-icons">edit</span>
          Edit
        </button>
      `;
      prompt.classList.add('completed');
      
      // Re-attach listener for edit button
      const editBtn = prompt.querySelector('#edit-my-availability');
      if (editBtn) {
        editBtn.addEventListener('click', () => this.openInitiatorAvailabilityModal());
      }
    }
  }
  
  /**
   * Initialize contact picker
   */
  initContactPicker() {
    console.log('[PlanCreationModal] initContactPicker called');
    console.log('[PlanCreationModal] this.userId:', this.userId);
    console.log('[PlanCreationModal] window.userId:', window.userId);
    console.log('[PlanCreationModal] localStorage userId:', localStorage.getItem('userId'));
    
    const effectiveUserId = this.userId || window.userId || localStorage.getItem('userId');
    console.log('[PlanCreationModal] Effective userId for ContactPicker:', effectiveUserId);
    
    this.contactPicker = new ContactPicker({
      containerId: 'contact-picker-container',
      userId: effectiveUserId,
      preSelectedContacts: this.preSelectedContacts,
      preSelectedCircle: this.preSelectedCircle,
      onSelectionChange: (contacts) => {
        this.selectedContacts.clear();
        contacts.forEach(c => this.selectedContacts.set(c.id, c));
        this.updateNextButton();
      }
    });
    
    this.contactPicker.init();
  }
  
  /**
   * Update next button state
   */
  updateNextButton() {
    const nextBtn = document.querySelector('#modal-next');
    if (nextBtn) {
      nextBtn.disabled = this.selectedContacts.size === 0;
    }
  }
  
  /**
   * Handle close modal
   */
  handleClose() {
    const modal = document.querySelector('.plan-creation-modal');
    if (modal) {
      modal.remove();
    }
    document.body.style.overflow = '';
    
    // Notify if plan was created
    if (this.createdPlan) {
      this.onPlanCreated(this.createdPlan);
    }
  }
  
  /**
   * Handle next step
   */
  handleNext() {
    if (this.step === 1 && this.selectedContacts.size === 0) {
      this.showToast('Please select at least one contact', 'error');
      return;
    }
    
    this.step++;
    this.render();
    this.attachEventListeners();
    
    if (this.step === 1) {
      this.initContactPicker();
    }
  }
  
  /**
   * Handle back step
   */
  handleBack() {
    this.step--;
    this.render();
    this.attachEventListeners();
    
    if (this.step === 1) {
      this.initContactPicker();
    }
  }
  
  /**
   * Handle form submission with loading states and error handling - Task 14.2
   */
  async handleSubmit() {
    const modal = document.querySelector('.plan-creation-modal');
    if (!modal) return;
    
    // Validate form
    const activityType = modal.querySelector('#activity-type').value;
    const duration = parseInt(modal.querySelector('#duration').value);
    const dateStart = modal.querySelector('#date-start').value;
    const dateEnd = modal.querySelector('#date-end').value;
    const location = modal.querySelector('#location').value;
    
    if (!this.validateDateRange()) {
      return;
    }
    
    const userId = this.userId || window.userId || localStorage.getItem('userId');
    
    // Prepare plan data
    const planData = {
      userId,
      invitees: Array.from(this.selectedContacts.values()).map(c => ({
        contactId: c.id,
        attendanceType: c.attendanceType || 'must_attend'
      })),
      activityType: activityType || null,
      duration,
      dateRangeStart: dateStart,
      dateRangeEnd: dateEnd,
      location: location || null
    };
    
    // Show loading state - Task 14.2
    this.isSubmitting = true;
    this.submitError = null;
    const submitBtn = modal.querySelector('#modal-submit');
    const backBtn = modal.querySelector('#modal-back');
    
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="loading-spinner-sm"></span> <span class="btn-text">Creating Plan...</span>';
    }
    if (backBtn) {
      backBtn.disabled = true;
    }
    
    try {
      const response = await this.fetchWithRetry('/api/scheduling/plans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify(planData)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || error.error || 'Failed to create plan');
      }
      
      const result = await response.json();
      this.createdPlan = result.plan;
      this.inviteLinks = result.inviteLinks;
      this.isSubmitting = false;
      this.retryCount = 0; // Reset retry count on success
      
      // Move to step 3
      this.step = 3;
      this.render();
      this.attachEventListeners();
      
    } catch (error) {
      console.error('Failed to create plan:', error);
      this.isSubmitting = false;
      this.submitError = this.getUserFriendlyError(error);
      
      // Show error state with retry option - Task 14.2
      this.showSubmitError(modal, submitBtn, backBtn);
    }
  }
  
  /**
   * Show submit error with retry option - Task 14.2
   */
  showSubmitError(modal, submitBtn, backBtn) {
    // Re-enable buttons
    if (backBtn) {
      backBtn.disabled = false;
    }
    
    const canRetry = this.retryCount < this.maxRetries;
    
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = 'Create Plan <span class="material-icons">check</span>';
    }
    
    // Show error banner in modal
    const existingError = modal.querySelector('.submit-error-banner');
    if (existingError) {
      existingError.remove();
    }
    
    const errorBanner = document.createElement('div');
    errorBanner.className = 'error-banner submit-error-banner';
    errorBanner.innerHTML = `
      <div class="error-icon">
        <span class="material-icons">error</span>
      </div>
      <div class="error-content">
        <p class="error-title">Failed to Create Plan</p>
        <p class="error-message">${this.escapeHtml(this.submitError)}</p>
        <div class="error-actions">
          ${canRetry ? `
            <button class="btn-retry" id="retry-submit-btn">
              <span class="material-icons">refresh</span>
              Try Again ${this.retryCount > 0 ? `(${this.maxRetries - this.retryCount} left)` : ''}
            </button>
          ` : ''}
          <button class="btn-dismiss" id="dismiss-error-btn">Dismiss</button>
        </div>
      </div>
    `;
    
    const modalBody = modal.querySelector('.modal-body');
    if (modalBody) {
      modalBody.insertBefore(errorBanner, modalBody.firstChild);
    }
    
    // Attach retry handler
    const retryBtn = errorBanner.querySelector('#retry-submit-btn');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        this.retryCount++;
        errorBanner.remove();
        this.handleSubmit();
      });
    }
    
    // Attach dismiss handler
    const dismissBtn = errorBanner.querySelector('#dismiss-error-btn');
    if (dismissBtn) {
      dismissBtn.addEventListener('click', () => {
        errorBanner.remove();
      });
    }
  }
  
  /**
   * Fetch with automatic retry for transient failures - Task 14.2
   */
  async fetchWithRetry(url, options = {}, maxRetries = 3) {
    let lastError;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await fetch(url, options);
        
        // Don't retry client errors (4xx), only server errors (5xx) and network issues
        if (response.ok || (response.status >= 400 && response.status < 500)) {
          return response;
        }
        
        // Server error - will retry
        lastError = new Error(`Server error: ${response.status}`);
        lastError.status = response.status;
        
      } catch (error) {
        // Network error - will retry
        lastError = error;
      }
      
      // Wait before retrying (exponential backoff)
      if (attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 500; // 500ms, 1s, 2s
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError;
  }
  
  /**
   * Get user-friendly error message - Task 14.2
   */
  getUserFriendlyError(error) {
    // Network errors
    if (error.message?.includes('fetch') || error.message?.includes('network') || error.name === 'TypeError') {
      return 'Unable to connect to the server. Please check your internet connection and try again.';
    }
    
    // Timeout errors
    if (error.message?.includes('timeout')) {
      return 'The request took too long. Please try again.';
    }
    
    // Validation errors (pass through)
    if (error.message?.includes('Date range') || error.message?.includes('contact')) {
      return error.message;
    }
    
    // Server errors
    if (error.status >= 500) {
      return 'Our servers are having trouble. Please try again in a few moments.';
    }
    
    // Default - use the error message if it's user-friendly
    if (error.message && !error.message.includes('HTTP') && !error.message.includes('Server error')) {
      return error.message;
    }
    
    return 'Something went wrong. Please try again.';
  }
  
  /**
   * Validate date range
   */
  validateDateRange() {
    const modal = document.querySelector('.plan-creation-modal');
    if (!modal) return false;
    
    const dateStart = modal.querySelector('#date-start');
    const dateEnd = modal.querySelector('#date-end');
    
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
   * Set attendance type for a contact
   */
  setAttendanceType(contactId, type) {
    const contact = this.selectedContacts.get(contactId);
    if (contact) {
      contact.attendanceType = type;
      this.selectedContacts.set(contactId, contact);
      
      // Update UI
      const modal = document.querySelector('.plan-creation-modal');
      if (modal) {
        const item = modal.querySelector(`.attendance-item[data-contact-id="${contactId}"]`);
        if (item) {
          item.querySelectorAll('.attendance-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.type === type);
          });
        }
      }
    }
  }
  
  /**
   * Apply saved preferences
   */
  applyPreferences() {
    if (!this.preferences) return;
    
    const modal = document.querySelector('.plan-creation-modal');
    if (!modal) return;
    
    if (this.preferences.defaultActivityType) {
      const activitySelect = modal.querySelector('#activity-type');
      if (activitySelect) {
        activitySelect.value = this.preferences.defaultActivityType;
      }
    }
    
    if (this.preferences.defaultDuration) {
      const durationSelect = modal.querySelector('#duration');
      if (durationSelect) {
        durationSelect.value = this.preferences.defaultDuration.toString();
      }
    }
    
    this.showToast('Preferences applied', 'success');
  }
  
  /**
   * Clear applied preferences
   */
  clearPreferences() {
    const modal = document.querySelector('.plan-creation-modal');
    if (!modal) return;
    
    const activitySelect = modal.querySelector('#activity-type');
    if (activitySelect) {
      activitySelect.value = '';
    }
    
    const durationSelect = modal.querySelector('#duration');
    if (durationSelect) {
      durationSelect.value = '60';
    }
    
    // Hide the banner
    const banner = modal.querySelector('.apply-preferences-banner');
    if (banner) {
      banner.style.display = 'none';
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
   * Copy all invite links
   */
  async copyAllLinks() {
    const allLinks = this.inviteLinks.map(link => 
      `${link.contactName}: ${link.url}`
    ).join('\n');
    
    await this.copyToClipboard(allLinks);
  }
  
  /**
   * Get preference value
   */
  getPreferenceValue(key) {
    if (!this.preferences || !this.preferences.applyByDefault) return null;
    return this.preferences[key];
  }
  
  /**
   * Get default start date (tomorrow)
   */
  getDefaultStartDate() {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    return date.toISOString().split('T')[0];
  }
  
  /**
   * Get default end date (1 week from tomorrow)
   */
  getDefaultEndDate() {
    const date = new Date();
    date.setDate(date.getDate() + 8);
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
window.PlanCreationModal = PlanCreationModal;
