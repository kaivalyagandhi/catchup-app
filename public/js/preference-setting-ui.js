/**
 * Preference Setting UI Component
 * 
 * Provides an interface for users to set contact frequency preferences
 * for Inner Circle and Close Friends contacts during onboarding.
 * 
 * Features:
 * - Smart default suggestions based on circle assignment
 * - Skip option with default application
 * - Batch preference setting
 * - Later completion of incomplete preferences
 */

class PreferenceSettingUI {
  constructor(options = {}) {
    this.container = options.container || document.body;
    this.onSave = options.onSave || (() => {});
    this.onSkip = options.onSkip || (() => {});
    this.onComplete = options.onComplete || (() => {});
    
    // State
    this.contacts = [];
    this.currentIndex = 0;
    this.preferences = new Map(); // contactId -> frequency
    this.skippedContacts = new Set();
    
    // Circle-based default frequencies
    this.defaultFrequencies = {
      inner: 'weekly',
      close: 'biweekly',
      active: 'monthly',
      casual: 'quarterly',
      acquaintance: 'yearly'
    };
    
    // Frequency options with descriptions
    this.frequencyOptions = [
      { value: 'daily', label: 'Daily', description: 'Check in every day' },
      { value: 'weekly', label: 'Weekly', description: 'Once a week' },
      { value: 'biweekly', label: 'Bi-weekly', description: 'Every two weeks' },
      { value: 'monthly', label: 'Monthly', description: 'Once a month' },
      { value: 'quarterly', label: 'Quarterly', description: 'Every 3 months' },
      { value: 'yearly', label: 'Yearly', description: 'Once a year' }
    ];
    
    this.render();
  }
  
  /**
   * Initialize with contacts that need preference setting
   * @param {Array} contacts - Contacts in Inner Circle or Close Friends
   */
  initialize(contacts) {
    this.contacts = contacts.filter(c => 
      c.circle === 'inner' || c.circle === 'close'
    );
    this.currentIndex = 0;
    this.preferences.clear();
    this.skippedContacts.clear();
    
    if (this.contacts.length === 0) {
      this.showEmptyState();
    } else {
      this.showCurrentContact();
    }
  }
  
  /**
   * Render the main UI structure
   */
  render() {
    const html = `
      <div class="preference-setting-ui">
        <div class="preference-header">
          <h2>Set Contact Preferences</h2>
          <p class="preference-subtitle">
            How often would you like to stay in touch with your closest contacts?
          </p>
          <div class="preference-progress">
            <div class="preference-progress-bar">
              <div class="preference-progress-fill" id="preference-progress-fill"></div>
            </div>
            <div class="preference-progress-text" id="preference-progress-text">
              0 of 0 contacts
            </div>
          </div>
        </div>
        
        <div class="preference-content" id="preference-content">
          <!-- Contact cards will be rendered here -->
        </div>
        
        <div class="preference-actions">
          <button class="btn-secondary" id="preference-skip-all">
            Skip All (Use Defaults)
          </button>
          <button class="btn-primary" id="preference-complete" style="display: none;">
            Complete
          </button>
        </div>
      </div>
    `;
    
    this.container.innerHTML = html;
    this.attachEventListeners();
  }
  
  /**
   * Show the current contact for preference setting
   */
  showCurrentContact() {
    if (this.currentIndex >= this.contacts.length) {
      this.showCompletionState();
      return;
    }
    
    const contact = this.contacts[this.currentIndex];
    const defaultFrequency = this.defaultFrequencies[contact.circle];
    const savedPreference = this.preferences.get(contact.id);
    
    const content = document.getElementById('preference-content');
    content.innerHTML = `
      <div class="preference-card">
        <div class="preference-card-header">
          <div class="contact-avatar" style="background-color: ${this.getContactColor(contact)}">
            ${this.getInitials(contact.name)}
          </div>
          <div class="contact-info">
            <h3>${this.escapeHtml(contact.name)}</h3>
            <p class="contact-circle">${this.getCircleName(contact.circle)}</p>
          </div>
        </div>
        
        <div class="preference-card-body">
          <p class="preference-prompt">
            How often would you like to stay in touch with ${this.escapeHtml(contact.name)}?
          </p>
          
          <div class="preference-options">
            ${this.frequencyOptions.map(option => `
              <label class="preference-option ${option.value === defaultFrequency ? 'recommended' : ''} ${savedPreference === option.value ? 'selected' : ''}">
                <input 
                  type="radio" 
                  name="frequency" 
                  value="${option.value}"
                  ${savedPreference === option.value ? 'checked' : ''}
                  ${option.value === defaultFrequency && !savedPreference ? 'checked' : ''}
                >
                <div class="preference-option-content">
                  <div class="preference-option-label">
                    ${option.label}
                    ${option.value === defaultFrequency ? '<span class="badge-recommended">Recommended</span>' : ''}
                  </div>
                  <div class="preference-option-description">${option.description}</div>
                </div>
              </label>
            `).join('')}
          </div>
          
          <div class="preference-card-actions">
            <button class="btn-text" id="preference-skip-contact">
              Skip (Use Default)
            </button>
            <button class="btn-primary" id="preference-save-contact">
              Save & Next
            </button>
          </div>
        </div>
      </div>
    `;
    
    this.updateProgress();
    this.attachContactEventListeners();
  }
  
  /**
   * Show empty state when no contacts need preferences
   */
  showEmptyState() {
    const content = document.getElementById('preference-content');
    content.innerHTML = `
      <div class="preference-empty-state">
        <div class="empty-state-icon">✓</div>
        <h3>No Preferences to Set</h3>
        <p>You don't have any contacts in your Inner Circle or Close Friends yet.</p>
        <p>Preferences will be set automatically when you assign contacts to these circles.</p>
      </div>
    `;
    
    document.getElementById('preference-skip-all').style.display = 'none';
    document.getElementById('preference-complete').style.display = 'block';
  }
  
  /**
   * Show completion state
   */
  showCompletionState() {
    const content = document.getElementById('preference-content');
    const setCount = this.preferences.size;
    const skippedCount = this.skippedContacts.size;
    const totalCount = this.contacts.length;
    
    content.innerHTML = `
      <div class="preference-completion-state">
        <div class="completion-icon">🎉</div>
        <h3>Preferences Set!</h3>
        <p>You've completed setting preferences for your closest contacts.</p>
        
        <div class="completion-summary">
          <div class="completion-stat">
            <div class="completion-stat-value">${setCount}</div>
            <div class="completion-stat-label">Custom Preferences</div>
          </div>
          <div class="completion-stat">
            <div class="completion-stat-value">${skippedCount}</div>
            <div class="completion-stat-label">Using Defaults</div>
          </div>
          <div class="completion-stat">
            <div class="completion-stat-value">${totalCount}</div>
            <div class="completion-stat-label">Total Contacts</div>
          </div>
        </div>
        
        <p class="completion-note">
          You can always update these preferences later from the contact details page.
        </p>
      </div>
    `;
    
    document.getElementById('preference-skip-all').style.display = 'none';
    document.getElementById('preference-complete').style.display = 'block';
  }
  
  /**
   * Attach event listeners to main UI elements
   */
  attachEventListeners() {
    const skipAllBtn = document.getElementById('preference-skip-all');
    const completeBtn = document.getElementById('preference-complete');
    
    if (skipAllBtn) {
      skipAllBtn.addEventListener('click', () => this.handleSkipAll());
    }
    
    if (completeBtn) {
      completeBtn.addEventListener('click', () => this.handleComplete());
    }
  }
  
  /**
   * Attach event listeners to contact-specific elements
   */
  attachContactEventListeners() {
    const skipBtn = document.getElementById('preference-skip-contact');
    const saveBtn = document.getElementById('preference-save-contact');
    const radioButtons = document.querySelectorAll('input[name="frequency"]');
    
    if (skipBtn) {
      skipBtn.addEventListener('click', () => this.handleSkipContact());
    }
    
    if (saveBtn) {
      saveBtn.addEventListener('click', () => this.handleSaveContact());
    }
    
    // Update visual selection on radio change
    radioButtons.forEach(radio => {
      radio.addEventListener('change', (e) => {
        document.querySelectorAll('.preference-option').forEach(opt => {
          opt.classList.remove('selected');
        });
        e.target.closest('.preference-option').classList.add('selected');
      });
    });
  }
  
  /**
   * Handle saving preference for current contact
   */
  async handleSaveContact() {
    const contact = this.contacts[this.currentIndex];
    const selectedRadio = document.querySelector('input[name="frequency"]:checked');
    
    if (!selectedRadio) {
      alert('Please select a frequency preference');
      return;
    }
    
    const frequency = selectedRadio.value;
    this.preferences.set(contact.id, frequency);
    this.skippedContacts.delete(contact.id);
    
    // Call save callback
    try {
      await this.onSave(contact.id, frequency);
      
      // Move to next contact
      this.currentIndex++;
      this.showCurrentContact();
    } catch (error) {
      console.error('Error saving preference:', error);
      alert('Failed to save preference. Please try again.');
    }
  }
  
  /**
   * Handle skipping current contact (use default)
   */
  async handleSkipContact() {
    const contact = this.contacts[this.currentIndex];
    const defaultFrequency = this.defaultFrequencies[contact.circle];
    
    this.skippedContacts.add(contact.id);
    this.preferences.delete(contact.id);
    
    // Call skip callback with default frequency
    try {
      await this.onSkip(contact.id, defaultFrequency);
      
      // Move to next contact
      this.currentIndex++;
      this.showCurrentContact();
    } catch (error) {
      console.error('Error skipping preference:', error);
      alert('Failed to skip preference. Please try again.');
    }
  }
  
  /**
   * Handle skipping all remaining contacts
   */
  async handleSkipAll() {
    const remaining = this.contacts.slice(this.currentIndex);
    
    if (remaining.length === 0) {
      this.handleComplete();
      return;
    }
    
    const confirmed = confirm(
      `Skip setting preferences for ${remaining.length} contact(s)? ` +
      `Default frequencies will be applied based on their circle.`
    );
    
    if (!confirmed) return;
    
    try {
      // Apply defaults to all remaining contacts
      for (const contact of remaining) {
        const defaultFrequency = this.defaultFrequencies[contact.circle];
        this.skippedContacts.add(contact.id);
        await this.onSkip(contact.id, defaultFrequency);
      }
      
      // Jump to completion
      this.currentIndex = this.contacts.length;
      this.showCompletionState();
    } catch (error) {
      console.error('Error skipping all preferences:', error);
      alert('Failed to skip preferences. Please try again.');
    }
  }
  
  /**
   * Handle completion
   */
  handleComplete() {
    this.onComplete({
      totalContacts: this.contacts.length,
      customPreferences: this.preferences.size,
      defaultPreferences: this.skippedContacts.size,
      preferences: Object.fromEntries(this.preferences)
    });
  }
  
  /**
   * Update progress indicator
   */
  updateProgress() {
    const progressFill = document.getElementById('preference-progress-fill');
    const progressText = document.getElementById('preference-progress-text');
    
    if (!progressFill || !progressText) return;
    
    const completed = this.currentIndex;
    const total = this.contacts.length;
    const percentage = total > 0 ? (completed / total) * 100 : 0;
    
    progressFill.style.width = `${percentage}%`;
    progressText.textContent = `${completed} of ${total} contacts`;
  }
  
  /**
   * Get contact initials
   */
  getInitials(name) {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) {
      return parts[0].substring(0, 2).toUpperCase();
    }
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  
  /**
   * Get contact color based on name
   */
  getContactColor(contact) {
    const colors = [
      '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', 
      '#ef4444', '#ec4899', '#6366f1', '#14b8a6'
    ];
    const hash = contact.name.split('').reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);
    return colors[Math.abs(hash) % colors.length];
  }
  
  /**
   * Get circle display name
   */
  getCircleName(circleId) {
    const names = {
      inner: 'Inner Circle',
      close: 'Close Friends',
      active: 'Active Friends',
      casual: 'Casual Network',
      acquaintance: 'Acquaintances'
    };
    return names[circleId] || circleId;
  }
  
  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  /**
   * Get all preferences (including defaults for skipped contacts)
   */
  getAllPreferences() {
    const allPreferences = {};
    
    this.contacts.forEach(contact => {
      if (this.preferences.has(contact.id)) {
        allPreferences[contact.id] = this.preferences.get(contact.id);
      } else if (this.skippedContacts.has(contact.id)) {
        allPreferences[contact.id] = this.defaultFrequencies[contact.circle];
      }
    });
    
    return allPreferences;
  }
  
  /**
   * Reset the UI state
   */
  reset() {
    this.contacts = [];
    this.currentIndex = 0;
    this.preferences.clear();
    this.skippedContacts.clear();
    this.render();
  }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.PreferenceSettingUI = PreferenceSettingUI;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PreferenceSettingUI };
}
