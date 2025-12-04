/**
 * Uncategorized Tracker Integration Example
 * 
 * Demonstrates how to integrate the UncategorizedTracker with the
 * OnboardingController and contact management system.
 * 
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5
 */

// Example 1: Basic Setup
// =====================

function setupUncategorizedTracking(authToken, userId) {
  // Initialize tracker
  const tracker = new UncategorizedTracker();
  tracker.initialize(authToken, userId);

  // Fetch initial data
  tracker.fetchCompletionStatus();
  tracker.fetchProgress();

  // Render components
  tracker.renderCountBadge(document.getElementById('uncategorized-badge'));
  tracker.renderIncompleteIndicator(document.getElementById('incomplete-indicator'));
  tracker.renderCompletionStatus(document.getElementById('completion-status'));

  return tracker;
}

// Example 2: Integration with Onboarding Controller
// =================================================

function integrateWithOnboarding(authToken, userId) {
  // Initialize both components
  const onboardingController = new OnboardingController();
  const tracker = new UncategorizedTracker();

  onboardingController.initialize(authToken, userId);
  tracker.initialize(authToken, userId);

  // Update tracker when onboarding progress changes
  onboardingController.on('progressUpdate', async (progress) => {
    console.log('Onboarding progress updated:', progress);
    await tracker.refresh();
    
    // Re-render all components
    tracker.renderCountBadge(document.getElementById('uncategorized-badge'));
    tracker.renderIncompleteIndicator(document.getElementById('incomplete-indicator'));
    tracker.renderCompletionStatus(document.getElementById('completion-status'));
  });

  // Handle management mode requests from tracker
  tracker.on('openManagement', async (data) => {
    console.log('Opening management mode with prioritized contacts:', data.prioritizeContacts);
    
    // Initialize onboarding in management mode
    await onboardingController.initializeOnboarding('manage');
    
    // Pass prioritized contact IDs to circular visualizer
    if (window.circularVisualizer) {
      window.circularVisualizer.setPrioritizedContacts(data.prioritizeContacts);
    }
  });

  // Handle errors
  tracker.on('error', (error) => {
    console.error('Tracker error:', error);
    showErrorNotification('Failed to update contact tracking: ' + error.message);
  });

  return { onboardingController, tracker };
}

// Example 3: Contact Creation with Auto-Flagging
// ==============================================

async function createContactWithTracking(authToken, userId, contactData) {
  try {
    // Create the contact
    const response = await fetch('/api/contacts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(contactData)
    });

    if (!response.ok) {
      throw new Error('Failed to create contact');
    }

    const newContact = await response.json();
    console.log('Contact created:', newContact);

    // Flag for categorization if onboarding is complete
    const tracker = window.uncategorizedTracker;
    if (tracker) {
      await tracker.flagNewContact(newContact.id);
      console.log('Contact flagged for categorization');
      
      // Refresh tracker display
      await tracker.refresh();
      tracker.renderCountBadge(document.getElementById('uncategorized-badge'));
      tracker.renderIncompleteIndicator(document.getElementById('incomplete-indicator'));
    }

    return newContact;
  } catch (error) {
    console.error('Error creating contact:', error);
    throw error;
  }
}

// Example 4: Contacts Page Integration
// ====================================

function setupContactsPageTracking(authToken, userId) {
  const tracker = new UncategorizedTracker();
  tracker.initialize(authToken, userId);

  // Fetch and display status
  async function updateContactsPageStatus() {
    await tracker.fetchCompletionStatus();
    await tracker.fetchProgress();

    const status = tracker.status;
    const progress = tracker.progress;

    // Show badge in header
    const headerBadge = document.getElementById('header-uncategorized-badge');
    if (headerBadge) {
      tracker.renderCountBadge(headerBadge);
    }

    // Show indicator if incomplete
    const pageIndicator = document.getElementById('page-incomplete-indicator');
    if (pageIndicator) {
      tracker.renderIncompleteIndicator(pageIndicator);
    }

    // Update "Manage" button text
    const manageButton = document.getElementById('manage-contacts-button');
    if (manageButton && status.hasUncategorizedContacts) {
      manageButton.textContent = `Organize ${status.uncategorizedCount} Contacts`;
      manageButton.classList.add('has-uncategorized');
    }
  }

  // Update on page load
  updateContactsPageStatus();

  // Update periodically (every 30 seconds)
  setInterval(updateContactsPageStatus, 30000);

  // Handle "Manage" button click
  const manageButton = document.getElementById('manage-contacts-button');
  if (manageButton) {
    manageButton.addEventListener('click', async () => {
      await tracker.openManagementMode();
    });
  }

  return tracker;
}

// Example 5: Dashboard Widget
// ===========================

function createDashboardWidget(authToken, userId, containerId) {
  const tracker = new UncategorizedTracker();
  tracker.initialize(authToken, userId);

  const container = document.getElementById(containerId);
  if (!container) {
    console.error('Container not found:', containerId);
    return null;
  }

  // Create widget structure
  container.innerHTML = `
    <div class="dashboard-widget uncategorized-widget">
      <div class="widget-header">
        <h3>Contact Organization</h3>
        <button class="widget-refresh" onclick="refreshUncategorizedWidget()">
          🔄 Refresh
        </button>
      </div>
      <div class="widget-body">
        <div id="widget-status"></div>
        <div id="widget-badge"></div>
      </div>
    </div>
  `;

  // Render widget content
  async function renderWidget() {
    await tracker.fetchCompletionStatus();
    await tracker.fetchProgress();

    tracker.renderCompletionStatus(document.getElementById('widget-status'));
    tracker.renderCountBadge(document.getElementById('widget-badge'));
  }

  // Initial render
  renderWidget();

  // Make refresh function global
  window.refreshUncategorizedWidget = renderWidget;

  return tracker;
}

// Example 6: Management Mode with Prioritization
// ==============================================

async function openManagementModeWithPrioritization(authToken, userId) {
  const tracker = new UncategorizedTracker();
  tracker.initialize(authToken, userId);

  try {
    // Fetch uncategorized contacts
    const uncategorized = await tracker.fetchUncategorizedContacts();
    console.log('Uncategorized contacts:', uncategorized);

    // Initialize onboarding in management mode
    const onboardingController = new OnboardingController();
    onboardingController.initialize(authToken, userId);
    await onboardingController.initializeOnboarding('manage');

    // Configure circular visualizer to prioritize uncategorized contacts
    if (window.circularVisualizer) {
      // Show uncategorized contacts first
      window.circularVisualizer.setPrioritizedContacts(
        uncategorized.map(c => c.id)
      );

      // Highlight uncategorized contacts
      window.circularVisualizer.setHighlightedContacts(
        uncategorized.map(c => c.id),
        { color: '#f39c12', label: 'Needs Categorization' }
      );
    }

    // Show progress in UI
    const progress = await tracker.fetchProgress();
    showNotification(
      `${progress.uncategorizedContacts} contacts need categorization`,
      'info'
    );

  } catch (error) {
    console.error('Error opening management mode:', error);
    showErrorNotification('Failed to open management mode');
  }
}

// Example 7: Real-time Updates
// ============================

function setupRealTimeTracking(authToken, userId) {
  const tracker = new UncategorizedTracker();
  tracker.initialize(authToken, userId);

  // Listen for contact updates
  tracker.on('progressUpdate', (progress) => {
    console.log('Progress updated:', progress);
    
    // Update all UI components
    updateAllTrackingComponents(tracker);
    
    // Show notification if milestone reached
    if (progress.percentComplete === 100) {
      showSuccessNotification('🎉 All contacts organized!');
    } else if (progress.percentComplete >= 75 && progress.percentComplete < 100) {
      showNotification('Almost there! Keep going!', 'info');
    }
  });

  // Listen for status changes
  tracker.on('statusUpdate', (status) => {
    console.log('Status updated:', status);
    
    // Update completion indicator
    if (status.isComplete && !status.hasUncategorizedContacts) {
      showSuccessNotification('Contact organization complete!');
      hideOnboardingPrompts();
    }
  });

  return tracker;
}

// Helper function to update all tracking components
function updateAllTrackingComponents(tracker) {
  // Update badge
  const badgeContainer = document.getElementById('uncategorized-badge');
  if (badgeContainer) {
    tracker.renderCountBadge(badgeContainer);
  }

  // Update indicator
  const indicatorContainer = document.getElementById('incomplete-indicator');
  if (indicatorContainer) {
    tracker.renderIncompleteIndicator(indicatorContainer);
  }

  // Update status
  const statusContainer = document.getElementById('completion-status');
  if (statusContainer) {
    tracker.renderCompletionStatus(statusContainer);
  }
}

// Helper functions for notifications
function showNotification(message, type = 'info') {
  console.log(`[${type.toUpperCase()}] ${message}`);
  // Implement your notification system here
}

function showSuccessNotification(message) {
  showNotification(message, 'success');
}

function showErrorNotification(message) {
  showNotification(message, 'error');
}

function hideOnboardingPrompts() {
  const prompts = document.querySelectorAll('.onboarding-prompt');
  prompts.forEach(prompt => {
    prompt.style.display = 'none';
  });
}

// Example 8: Complete Application Setup
// =====================================

async function initializeApplication(authToken, userId) {
  console.log('Initializing CatchUp application...');

  // 1. Initialize onboarding controller
  const onboardingController = new OnboardingController();
  onboardingController.initialize(authToken, userId);

  // 2. Initialize uncategorized tracker
  const tracker = new UncategorizedTracker();
  tracker.initialize(authToken, userId);

  // 3. Fetch initial data
  await Promise.all([
    tracker.fetchCompletionStatus(),
    tracker.fetchProgress()
  ]);

  // 4. Set up integrations
  integrateWithOnboarding(authToken, userId);
  setupContactsPageTracking(authToken, userId);
  setupRealTimeTracking(authToken, userId);

  // 5. Render initial UI
  updateAllTrackingComponents(tracker);

  // 6. Make components globally available
  window.onboardingController = onboardingController;
  window.uncategorizedTracker = tracker;

  console.log('Application initialized successfully');

  return { onboardingController, tracker };
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    setupUncategorizedTracking,
    integrateWithOnboarding,
    createContactWithTracking,
    setupContactsPageTracking,
    createDashboardWidget,
    openManagementModeWithPrioritization,
    setupRealTimeTracking,
    initializeApplication
  };
}
