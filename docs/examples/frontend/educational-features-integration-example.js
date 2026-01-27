/**
 * Educational Features Integration Example
 * Shows how to integrate educational features with the onboarding system
 */

// Example: Initialize educational features with visualizer
function initializeEducationalFeatures() {
  // Assume we have a visualizer instance
  const visualizer = new CircularVisualizer('onboarding-visualizer');
  
  // Initialize educational features
  const educational = new EducationalFeatures({
    containerId: 'educational-container',
    visualizer: visualizer,
    userId: 'user-123' // Replace with actual user ID
  });
  
  return educational;
}

// Example: Show balance suggestions after organizing contacts
function checkNetworkBalance(educational, visualizer) {
  const distribution = visualizer.getCircleDistribution();
  educational.showBalanceSuggestions(distribution);
}

// Example: Show network summary on completion
function showCompletionSummary(educational, visualizer, contacts) {
  const distribution = visualizer.getCircleDistribution();
  educational.showNetworkSummary(distribution, contacts);
}

// Example: Manually trigger help panel
function openHelp(educational) {
  educational.openHelpPanel();
}

// Example: Show circle info programmatically
function showCircleDetails(educational, circleId) {
  const circleDef = window.CIRCLE_DEFINITIONS[circleId];
  if (circleDef) {
    educational.showCircleInfo(circleId, circleDef);
  }
}

// Example: Integration with onboarding controller
class OnboardingWithEducation {
  constructor(containerId, userId) {
    this.visualizer = new CircularVisualizer(containerId);
    this.educational = new EducationalFeatures({
      containerId: 'educational-container',
      visualizer: this.visualizer,
      userId: userId
    });
    
    this.setupEventListeners();
  }
  
  setupEventListeners() {
    // Show balance suggestions when user finishes organizing a circle
    this.visualizer.on('contactUpdate', (data) => {
      // Check if we should show balance suggestions
      const distribution = this.visualizer.getCircleDistribution();
      const totalContacts = Object.values(distribution).reduce((sum, count) => sum + count, 0);
      
      // Show suggestions after organizing at least 10 contacts
      if (totalContacts >= 10 && totalContacts % 10 === 0) {
        this.educational.showBalanceSuggestions(distribution);
      }
    });
  }
  
  completeOnboarding(contacts) {
    const distribution = this.visualizer.getCircleDistribution();
    this.educational.showNetworkSummary(distribution, contacts);
  }
  
  showHelp() {
    this.educational.openHelpPanel();
  }
}

// Example usage
document.addEventListener('DOMContentLoaded', () => {
  // Initialize with education
  const onboarding = new OnboardingWithEducation('my-visualizer', 'user-123');
  
  // Add help button click handler
  const helpBtn = document.getElementById('show-help-btn');
  if (helpBtn) {
    helpBtn.addEventListener('click', () => {
      onboarding.showHelp();
    });
  }
  
  // Simulate completion
  const completeBtn = document.getElementById('complete-onboarding-btn');
  if (completeBtn) {
    completeBtn.addEventListener('click', () => {
      // Get contacts from somewhere
      const contacts = []; // Replace with actual contacts
      onboarding.completeOnboarding(contacts);
    });
  }
});
