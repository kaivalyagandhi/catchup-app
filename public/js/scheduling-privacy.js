/**
 * Scheduling Privacy Controls
 * 
 * Manages calendar sharing privacy settings:
 * - Inner Circle sharing toggle
 * - Privacy indicator display
 * - Calendar visibility settings
 * 
 * Requirements: 8.1-8.9
 */

class SchedulingPrivacy {
  constructor(options = {}) {
    this.containerId = options.containerId || 'scheduling-privacy-container';
    this.onSettingsChange = options.onSettingsChange || null;
    
    // Default settings
    this.settings = {
      shareWithInnerCircle: false
    };
    
    this.isLoading = false;
  }
  
  /**
   * Initialize the privacy controls
   */
  async init() {
    await this.loadSettings();
    this.render();
    this.attachEventListeners();
  }
  
  /**
   * Load privacy settings from API
   */
  async loadSettings() {
    this.isLoading = true;
    
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/scheduling/privacy', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data) {
          this.settings = {
            shareWithInnerCircle: data.shareWithInnerCircle || false
          };
        }
      }
    } catch (error) {
      console.error('Failed to load privacy settings:', error);
    } finally {
      this.isLoading = false;
    }
  }
  
  /**
   * Save privacy settings to API
   */
  async saveSettings() {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/scheduling/privacy', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(this.settings)
      });
      
      if (!response.ok) {
        throw new Error('Failed to save privacy settings');
      }
      
      if (typeof showToast === 'function') {
        showToast('Privacy settings saved', 'success');
      }
      
      if (this.onSettingsChange) {
        this.onSettingsChange(this.settings);
      }
      
      // Update privacy indicator
      this.updatePrivacyIndicator();
      
      return true;
    } catch (error) {
      console.error('Failed to save privacy settings:', error);
      if (typeof showToast === 'function') {
        showToast('Failed to save privacy settings', 'error');
      }
      return false;
    }
  }
  
  /**
   * Render the privacy controls
   */
  render() {
    const container = document.getElementById(this.containerId);
    if (!container) return;
    
    container.innerHTML = `
      <div class="scheduling-privacy-panel">
        <div class="privacy-header">
          <h4>
            <span class="material-icons">security</span>
            Calendar Privacy
          </h4>
        </div>
        
        <div class="privacy-info">
          <p>Control how your calendar information is shared during scheduling.</p>
          <p class="text-tertiary">By default, only your free/busy status is visible to others. Event details are never shared.</p>
        </div>
        
        <div class="privacy-settings">
          <!-- Inner Circle Sharing -->
          <div class="privacy-setting-item">
            <div class="setting-info">
              <label for="share-inner-circle">
                <strong>Share with Inner Circle</strong>
              </label>
              <p class="help-text">
                Allow your Inner Circle contacts to see your free/busy status when creating plans with you.
              </p>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" 
                     id="share-inner-circle" 
                     ${this.settings.shareWithInnerCircle ? 'checked' : ''}>
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>
        
        <div class="privacy-notice">
          <span class="material-icons">info</span>
          <p>Your calendar event details (titles, descriptions, attendees) are <strong>never</strong> shared with anyone. Only free/busy time slots are visible during scheduling.</p>
        </div>
      </div>
    `;
  }
  
  /**
   * Render privacy indicator for scheduling page
   */
  renderPrivacyIndicator() {
    const isSharing = this.settings.shareWithInnerCircle;
    
    return `
      <div class="privacy-indicator">
        <span class="material-icons">${isSharing ? 'visibility' : 'visibility_off'}</span>
        <span>${isSharing ? 'Sharing with Inner Circle' : 'Calendar private'}</span>
      </div>
    `;
  }
  
  /**
   * Update privacy indicator in the DOM
   */
  updatePrivacyIndicator() {
    const indicator = document.querySelector('.privacy-indicator');
    if (indicator) {
      const isSharing = this.settings.shareWithInnerCircle;
      indicator.innerHTML = `
        <span class="material-icons">${isSharing ? 'visibility' : 'visibility_off'}</span>
        <span>${isSharing ? 'Sharing with Inner Circle' : 'Calendar private'}</span>
      `;
    }
  }
  
  /**
   * Attach event listeners
   */
  attachEventListeners() {
    const container = document.getElementById(this.containerId);
    if (!container) return;
    
    // Inner Circle sharing toggle
    const shareToggle = container.querySelector('#share-inner-circle');
    if (shareToggle) {
      shareToggle.addEventListener('change', (e) => this.handleShareToggle(e));
    }
  }
  
  /**
   * Handle share toggle change
   */
  async handleShareToggle(e) {
    this.settings.shareWithInnerCircle = e.target.checked;
    await this.saveSettings();
  }
  
  /**
   * Get current settings
   */
  getSettings() {
    return { ...this.settings };
  }
  
  /**
   * Check if sharing is enabled
   */
  isSharingEnabled() {
    return this.settings.shareWithInnerCircle;
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
  window.SchedulingPrivacy = SchedulingPrivacy;
}
