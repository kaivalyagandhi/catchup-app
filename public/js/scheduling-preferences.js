/**
 * Scheduling Preferences Panel
 * 
 * Manages user scheduling preferences including:
 * - Preferred days of the week
 * - Preferred time ranges
 * - Preferred durations
 * - Favorite locations
 * - Default activity type
 * - Apply-by-default toggle
 * 
 * Requirements: 16.1-16.12
 */

class SchedulingPreferences {
  constructor(options = {}) {
    this.containerId = options.containerId || 'scheduling-preferences-container';
    this.userId = options.userId || null;
    this.onSave = options.onSave || null;
    
    // Default preferences
    this.preferences = {
      preferredDays: [],
      preferredTimeRanges: [],
      preferredDurations: [60],
      favoriteLocations: [],
      defaultActivityType: null,
      applyByDefault: false
    };
    
    // Day labels
    this.dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    // Time range presets
    this.timeRangePresets = [
      { id: 'morning', label: 'Morning', start: '08:00', end: '12:00' },
      { id: 'afternoon', label: 'Afternoon', start: '12:00', end: '17:00' },
      { id: 'evening', label: 'Evening', start: '17:00', end: '21:00' }
    ];
    
    // Duration options (in minutes)
    this.durationOptions = [
      { value: 30, label: '30 min' },
      { value: 60, label: '1 hour' },
      { value: 120, label: '2 hours' },
      { value: 240, label: 'Half day' }
    ];
    
    // Activity types
    this.activityTypes = [
      { value: 'coffee', label: '☕ Coffee' },
      { value: 'dinner', label: '🍽️ Dinner' },
      { value: 'video_call', label: '📹 Video Call' },
      { value: 'activity', label: '🎯 Activity' },
      { value: 'other', label: '📝 Other' }
    ];
    
    this.isLoading = false;
    this.hasChanges = false;
  }
  
  /**
   * Initialize the preferences panel
   */
  async init() {
    await this.loadPreferences();
    this.render();
    this.attachEventListeners();
  }
  
  /**
   * Load preferences from API
   */
  async loadPreferences() {
    this.isLoading = true;
    
    try {
      const token = localStorage.getItem('authToken');
      const userId = this.userId || window.userId || localStorage.getItem('userId');
      const response = await fetch(`/api/scheduling/preferences?userId=${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data) {
          this.preferences = {
            preferredDays: data.preferredDays || [],
            preferredTimeRanges: data.preferredTimeRanges || [],
            preferredDurations: data.preferredDurations || [60],
            favoriteLocations: data.favoriteLocations || [],
            defaultActivityType: data.defaultActivityType || null,
            applyByDefault: data.applyByDefault || false
          };
        }
      }
    } catch (error) {
      console.error('Failed to load scheduling preferences:', error);
    } finally {
      this.isLoading = false;
    }
  }
  
  /**
   * Save preferences to API
   */
  async savePreferences() {
    try {
      const token = localStorage.getItem('authToken');
      const userId = this.userId || window.userId || localStorage.getItem('userId');
      const response = await fetch('/api/scheduling/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId,
          ...this.preferences
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to save preferences');
      }
      
      this.hasChanges = false;
      this.updateSaveButton();
      
      if (typeof showToast === 'function') {
        showToast('Preferences saved successfully', 'success');
      }
      
      if (this.onSave) {
        this.onSave(this.preferences);
      }
      
      return true;
    } catch (error) {
      console.error('Failed to save scheduling preferences:', error);
      if (typeof showToast === 'function') {
        showToast('Failed to save preferences', 'error');
      }
      return false;
    }
  }
  
  /**
   * Render the preferences panel
   */
  render() {
    const container = document.getElementById(this.containerId);
    if (!container) return;
    
    container.innerHTML = `
      <div class="scheduling-preferences-panel">
        <div class="preferences-header">
          <h3>Scheduling Preferences</h3>
          <p class="text-secondary">Set your default preferences for creating catchup plans</p>
        </div>
        
        <!-- Preferred Days -->
        <div class="preference-section">
          <h4>Preferred Days</h4>
          <p class="help-text">Select the days you typically prefer for catchups</p>
          <div class="day-selection">
            ${this.dayLabels.map((day, index) => `
              <button class="day-btn ${this.preferences.preferredDays.includes(index) ? 'selected' : ''}" 
                      data-day="${index}"
                      aria-pressed="${this.preferences.preferredDays.includes(index)}"
                      aria-label="${day}">
                ${day}
              </button>
            `).join('')}
          </div>
        </div>
        
        <!-- Preferred Time Ranges -->
        <div class="preference-section">
          <h4>Preferred Times</h4>
          <p class="help-text">Select your preferred time ranges</p>
          <div class="time-range-selection">
            ${this.timeRangePresets.map(range => `
              <button class="time-range-btn ${this.isTimeRangeSelected(range) ? 'selected' : ''}"
                      data-range-id="${range.id}"
                      data-start="${range.start}"
                      data-end="${range.end}"
                      aria-pressed="${this.isTimeRangeSelected(range)}">
                ${range.label}
              </button>
            `).join('')}
          </div>
        </div>
        
        <!-- Preferred Durations -->
        <div class="preference-section">
          <h4>Preferred Durations</h4>
          <p class="help-text">Select your typical catchup durations</p>
          <div class="duration-selection">
            ${this.durationOptions.map(duration => `
              <button class="duration-btn ${this.preferences.preferredDurations.includes(duration.value) ? 'selected' : ''}"
                      data-duration="${duration.value}"
                      aria-pressed="${this.preferences.preferredDurations.includes(duration.value)}">
                ${duration.label}
              </button>
            `).join('')}
          </div>
        </div>
        
        <!-- Default Activity Type -->
        <div class="preference-section">
          <h4>Default Activity</h4>
          <p class="help-text">Choose a default activity type for new plans</p>
          <select id="default-activity-type" class="form-select">
            <option value="">No default</option>
            ${this.activityTypes.map(type => `
              <option value="${type.value}" ${this.preferences.defaultActivityType === type.value ? 'selected' : ''}>
                ${type.label}
              </option>
            `).join('')}
          </select>
        </div>
        
        <!-- Favorite Locations -->
        <div class="preference-section">
          <h4>Favorite Locations</h4>
          <p class="help-text">Add your go-to spots for quick selection</p>
          <div class="favorite-locations-list" id="favorite-locations-list">
            ${this.renderFavoriteLocations()}
          </div>
          <div class="add-location-form">
            <input type="text" 
                   id="new-location-input" 
                   placeholder="Add a favorite location..."
                   maxlength="100">
            <button class="btn-secondary" id="add-location-btn">
              <span class="material-icons">add</span>
            </button>
          </div>
        </div>
        
        <!-- Apply by Default Toggle -->
        <div class="apply-default-toggle">
          <label for="apply-by-default">
            <strong>Apply preferences by default</strong>
            <span class="help-text">Automatically apply these preferences when creating new plans</span>
          </label>
          <label class="toggle-switch">
            <input type="checkbox" 
                   id="apply-by-default" 
                   ${this.preferences.applyByDefault ? 'checked' : ''}>
            <span class="toggle-slider"></span>
          </label>
        </div>
        
        <!-- Save Button -->
        <div class="preferences-actions">
          <button class="btn-primary" id="save-preferences-btn" disabled>
            <span class="material-icons">save</span>
            Save Preferences
          </button>
        </div>
      </div>
    `;
  }
  
  /**
   * Render favorite locations list
   */
  renderFavoriteLocations() {
    if (this.preferences.favoriteLocations.length === 0) {
      return '<p class="empty-locations text-tertiary">No favorite locations yet</p>';
    }
    
    return this.preferences.favoriteLocations.map((location, index) => `
      <div class="favorite-location-item" data-index="${index}">
        <span>${this.escapeHtml(location)}</span>
        <button class="remove-btn" data-location="${this.escapeHtml(location)}" aria-label="Remove ${this.escapeHtml(location)}">
          <span class="material-icons">close</span>
        </button>
      </div>
    `).join('');
  }
  
  /**
   * Check if a time range is selected
   */
  isTimeRangeSelected(range) {
    return this.preferences.preferredTimeRanges.some(
      r => r.start === range.start && r.end === range.end
    );
  }
  
  /**
   * Attach event listeners
   */
  attachEventListeners() {
    const container = document.getElementById(this.containerId);
    if (!container) return;
    
    // Day selection
    container.querySelectorAll('.day-btn').forEach(btn => {
      btn.addEventListener('click', (e) => this.handleDayClick(e));
    });
    
    // Time range selection
    container.querySelectorAll('.time-range-btn').forEach(btn => {
      btn.addEventListener('click', (e) => this.handleTimeRangeClick(e));
    });
    
    // Duration selection
    container.querySelectorAll('.duration-btn').forEach(btn => {
      btn.addEventListener('click', (e) => this.handleDurationClick(e));
    });
    
    // Default activity type
    const activitySelect = container.querySelector('#default-activity-type');
    if (activitySelect) {
      activitySelect.addEventListener('change', (e) => this.handleActivityChange(e));
    }
    
    // Add location
    const addLocationBtn = container.querySelector('#add-location-btn');
    const newLocationInput = container.querySelector('#new-location-input');
    
    if (addLocationBtn) {
      addLocationBtn.addEventListener('click', () => this.handleAddLocation());
    }
    
    if (newLocationInput) {
      newLocationInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.handleAddLocation();
        }
      });
    }
    
    // Remove location buttons
    container.querySelectorAll('.favorite-location-item .remove-btn').forEach(btn => {
      btn.addEventListener('click', (e) => this.handleRemoveLocation(e));
    });
    
    // Apply by default toggle
    const applyByDefaultToggle = container.querySelector('#apply-by-default');
    if (applyByDefaultToggle) {
      applyByDefaultToggle.addEventListener('change', (e) => this.handleApplyByDefaultChange(e));
    }
    
    // Save button
    const saveBtn = container.querySelector('#save-preferences-btn');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => this.savePreferences());
    }
  }
  
  /**
   * Handle day button click
   */
  handleDayClick(e) {
    const btn = e.currentTarget;
    const day = parseInt(btn.dataset.day, 10);
    
    const index = this.preferences.preferredDays.indexOf(day);
    if (index > -1) {
      this.preferences.preferredDays.splice(index, 1);
      btn.classList.remove('selected');
      btn.setAttribute('aria-pressed', 'false');
    } else {
      this.preferences.preferredDays.push(day);
      this.preferences.preferredDays.sort((a, b) => a - b);
      btn.classList.add('selected');
      btn.setAttribute('aria-pressed', 'true');
    }
    
    this.markChanged();
  }
  
  /**
   * Handle time range button click
   */
  handleTimeRangeClick(e) {
    const btn = e.currentTarget;
    const start = btn.dataset.start;
    const end = btn.dataset.end;
    const label = btn.textContent.trim();
    
    const existingIndex = this.preferences.preferredTimeRanges.findIndex(
      r => r.start === start && r.end === end
    );
    
    if (existingIndex > -1) {
      this.preferences.preferredTimeRanges.splice(existingIndex, 1);
      btn.classList.remove('selected');
      btn.setAttribute('aria-pressed', 'false');
    } else {
      this.preferences.preferredTimeRanges.push({ start, end, label });
      btn.classList.add('selected');
      btn.setAttribute('aria-pressed', 'true');
    }
    
    this.markChanged();
  }
  
  /**
   * Handle duration button click
   */
  handleDurationClick(e) {
    const btn = e.currentTarget;
    const duration = parseInt(btn.dataset.duration, 10);
    
    const index = this.preferences.preferredDurations.indexOf(duration);
    if (index > -1) {
      this.preferences.preferredDurations.splice(index, 1);
      btn.classList.remove('selected');
      btn.setAttribute('aria-pressed', 'false');
    } else {
      this.preferences.preferredDurations.push(duration);
      this.preferences.preferredDurations.sort((a, b) => a - b);
      btn.classList.add('selected');
      btn.setAttribute('aria-pressed', 'true');
    }
    
    this.markChanged();
  }
  
  /**
   * Handle activity type change
   */
  handleActivityChange(e) {
    this.preferences.defaultActivityType = e.target.value || null;
    this.markChanged();
  }
  
  /**
   * Handle add location
   */
  handleAddLocation() {
    const input = document.getElementById('new-location-input');
    if (!input) return;
    
    const location = input.value.trim();
    if (!location) return;
    
    // Check for duplicates
    if (this.preferences.favoriteLocations.includes(location)) {
      if (typeof showToast === 'function') {
        showToast('Location already exists', 'warning');
      }
      return;
    }
    
    // Limit to 10 locations
    if (this.preferences.favoriteLocations.length >= 10) {
      if (typeof showToast === 'function') {
        showToast('Maximum 10 favorite locations allowed', 'warning');
      }
      return;
    }
    
    this.preferences.favoriteLocations.push(location);
    input.value = '';
    
    // Re-render locations list
    const locationsList = document.getElementById('favorite-locations-list');
    if (locationsList) {
      locationsList.innerHTML = this.renderFavoriteLocations();
      // Re-attach remove listeners
      locationsList.querySelectorAll('.remove-btn').forEach(btn => {
        btn.addEventListener('click', (e) => this.handleRemoveLocation(e));
      });
    }
    
    this.markChanged();
  }
  
  /**
   * Handle remove location
   */
  handleRemoveLocation(e) {
    const btn = e.currentTarget;
    const location = btn.dataset.location;
    
    const index = this.preferences.favoriteLocations.indexOf(location);
    if (index > -1) {
      this.preferences.favoriteLocations.splice(index, 1);
      
      // Re-render locations list
      const locationsList = document.getElementById('favorite-locations-list');
      if (locationsList) {
        locationsList.innerHTML = this.renderFavoriteLocations();
        // Re-attach remove listeners
        locationsList.querySelectorAll('.remove-btn').forEach(btn => {
          btn.addEventListener('click', (e) => this.handleRemoveLocation(e));
        });
      }
      
      this.markChanged();
    }
  }
  
  /**
   * Handle apply by default toggle
   */
  handleApplyByDefaultChange(e) {
    this.preferences.applyByDefault = e.target.checked;
    this.markChanged();
  }
  
  /**
   * Mark preferences as changed
   */
  markChanged() {
    this.hasChanges = true;
    this.updateSaveButton();
  }
  
  /**
   * Update save button state
   */
  updateSaveButton() {
    const saveBtn = document.getElementById('save-preferences-btn');
    if (saveBtn) {
      saveBtn.disabled = !this.hasChanges;
    }
  }
  
  /**
   * Get current preferences
   */
  getPreferences() {
    return { ...this.preferences };
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
   * Destroy the component
   */
  destroy() {
    const container = document.getElementById(this.containerId);
    if (container) {
      container.innerHTML = '';
    }
  }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.SchedulingPreferences = SchedulingPreferences;
}
