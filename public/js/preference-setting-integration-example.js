/**
 * Preference Setting Integration Example
 * 
 * Demonstrates how to integrate the PreferenceSettingUI component
 * with the OnboardingController and backend API.
 */

class PreferenceSettingIntegration {
  constructor(options = {}) {
    this.container = options.container || document.body;
    this.onboardingController = options.onboardingController;
    this.authToken = options.authToken;
    this.userId = options.userId;
    
    this.preferenceUI = null;
    this.contacts = [];
  }
  
  /**
   * Initialize the preference setting step
   * Fetches contacts that need preferences and displays the UI
   */
  async initialize() {
    try {
      // Fetch contacts in Inner Circle and Close Friends
      const contacts = await this.fetchContactsNeedingPreferences();
      
      if (contacts.length === 0) {
        // No contacts need preferences, skip to next step
        console.log('No contacts need preferences, skipping step');
        await this.onboardingController.nextStep();
        return;
      }
      
      this.contacts = contacts;
      
      // Initialize the preference UI
      this.preferenceUI = new PreferenceSettingUI({
        container: this.container,
        onSave: (contactId, frequency) => this.handleSavePreference(contactId, frequency),
        onSkip: (contactId, defaultFrequency) => this.handleSkipPreference(contactId, defaultFrequency),
        onComplete: (summary) => this.handleComplete(summary)
      });
      
      // Load contacts into UI
      this.preferenceUI.initialize(contacts);
      
    } catch (error) {
      console.error('Error initializing preference setting:', error);
      alert('Failed to load preference setting. Please try again.');
    }
  }
  
  /**
   * Fetch contacts that need frequency preferences
   * (Inner Circle and Close Friends contacts)
   */
  async fetchContactsNeedingPreferences() {
    try {
      // Get circle distribution to find Inner Circle and Close Friends contacts
      const response = await fetch('/api/circles/distribution', {
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch circle distribution');
      }
      
      // For this example, we'll fetch all contacts and filter
      // In production, you'd have a dedicated endpoint
      const contactsResponse = await fetch('/api/contacts', {
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        }
      });
      
      if (!contactsResponse.ok) {
        throw new Error('Failed to fetch contacts');
      }
      
      const allContacts = await contactsResponse.json();
      
      // Filter for Inner Circle and Close Friends
      const needingPreferences = allContacts.filter(contact => 
        contact.dunbarCircle === 'inner' || contact.dunbarCircle === 'close'
      );
      
      // Map to the format expected by PreferenceSettingUI
      return needingPreferences.map(contact => ({
        id: contact.id,
        name: contact.name,
        circle: contact.dunbarCircle,
        email: contact.email,
        currentPreference: contact.frequencyPreference
      }));
      
    } catch (error) {
      console.error('Error fetching contacts:', error);
      throw error;
    }
  }
  
  /**
   * Handle saving a custom preference
   */
  async handleSavePreference(contactId, frequency) {
    try {
      const response = await fetch('/api/circles/preferences/set', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`
        },
        body: JSON.stringify({
          contactId,
          frequency
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save preference');
      }
      
      console.log(`Saved preference for ${contactId}: ${frequency}`);
      
      // Update onboarding progress
      await this.updateOnboardingProgress();
      
    } catch (error) {
      console.error('Error saving preference:', error);
      throw error;
    }
  }
  
  /**
   * Handle skipping a contact (apply default)
   */
  async handleSkipPreference(contactId, defaultFrequency) {
    try {
      const response = await fetch('/api/circles/preferences/set', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`
        },
        body: JSON.stringify({
          contactId,
          frequency: defaultFrequency
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to set default preference');
      }
      
      console.log(`Applied default preference for ${contactId}: ${defaultFrequency}`);
      
      // Update onboarding progress
      await this.updateOnboardingProgress();
      
    } catch (error) {
      console.error('Error setting default preference:', error);
      throw error;
    }
  }
  
  /**
   * Handle completion of preference setting
   */
  async handleComplete(summary) {
    try {
      console.log('Preference setting completed:', summary);
      
      // Mark step as complete
      await this.onboardingController.markStepComplete('preference_setting');
      
      // Move to next step
      await this.onboardingController.nextStep();
      
    } catch (error) {
      console.error('Error completing preference setting:', error);
      alert('Failed to complete preference setting. Please try again.');
    }
  }
  
  /**
   * Update onboarding progress data
   */
  async updateOnboardingProgress() {
    try {
      const state = this.onboardingController.state;
      if (!state) return;
      
      // Update progress data
      const progressData = state.progressData || {};
      progressData.preferencesSet = (progressData.preferencesSet || 0) + 1;
      
      state.progressData = progressData;
      
      await this.onboardingController.saveProgress();
      
    } catch (error) {
      console.error('Error updating progress:', error);
      // Don't throw - this is not critical
    }
  }
  
  /**
   * Batch set preferences for all contacts
   * Useful for "Skip All" functionality
   */
  async batchSetPreferences(preferences) {
    try {
      const response = await fetch('/api/circles/preferences/batch-set', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`
        },
        body: JSON.stringify({
          preferences: preferences.map(p => ({
            contactId: p.contactId,
            frequency: p.frequency
          }))
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to batch set preferences');
      }
      
      console.log(`Batch set ${preferences.length} preferences`);
      
    } catch (error) {
      console.error('Error batch setting preferences:', error);
      throw error;
    }
  }
  
  /**
   * Get default frequency for a circle
   */
  getDefaultFrequency(circle) {
    const defaults = {
      inner: 'weekly',
      close: 'biweekly',
      active: 'monthly',
      casual: 'quarterly',
      acquaintance: 'yearly'
    };
    return defaults[circle] || 'monthly';
  }
  
  /**
   * Clean up resources
   */
  destroy() {
    if (this.preferenceUI) {
      this.preferenceUI.reset();
      this.preferenceUI = null;
    }
    this.contacts = [];
  }
}

// Example usage
function exampleUsage() {
  // Assume we have an onboarding controller instance
  const onboardingController = new OnboardingController();
  onboardingController.initialize('your-auth-token', 'user-id');
  
  // Create preference setting integration
  const container = document.getElementById('preference-container');
  const integration = new PreferenceSettingIntegration({
    container: container,
    onboardingController: onboardingController,
    authToken: 'your-auth-token',
    userId: 'user-id'
  });
  
  // Initialize when reaching preference setting step
  integration.initialize();
}

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.PreferenceSettingIntegration = PreferenceSettingIntegration;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PreferenceSettingIntegration };
}
