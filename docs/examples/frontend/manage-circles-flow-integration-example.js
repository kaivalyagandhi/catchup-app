/**
 * Manage Circles Flow - Integration Example
 * 
 * This file demonstrates how to integrate the ManageCirclesFlow component
 * into the CatchUp application for both onboarding and post-onboarding use.
 */

// ============================================================================
// Example 1: During Onboarding (Step 2)
// ============================================================================

/**
 * Step 2 Handler - Opens Manage Circles flow during onboarding
 */
async function handleOnboardingStep2() {
  // Fetch contacts from API
  const contacts = await fetchContacts();
  
  // Get current circle assignments
  const currentAssignments = {};
  contacts.forEach(contact => {
    if (contact.circle || contact.dunbarCircle) {
      currentAssignments[contact.id] = contact.circle || contact.dunbarCircle;
    }
  });
  
  // Create Manage Circles flow in onboarding mode
  const flow = new ManageCirclesFlow(contacts, currentAssignments, {
    isOnboarding: true,
    
    onSave: async (assignments) => {
      console.log('Onboarding Step 2 - Save clicked', assignments);
      
      // Update onboarding state
      if (window.onboardingIndicator) {
        const categorized = Object.keys(assignments).length;
        const total = contacts.length;
        
        const currentState = window.onboardingIndicator.state;
        currentState.steps.circles.complete = true;
        currentState.steps.circles.contactsCategorized = categorized;
        currentState.steps.circles.totalContacts = total;
        currentState.currentStep = 3;
        
        window.onboardingIndicator.updateState(currentState);
      }
      
      // Show success message
      showToast('Circles organized! Ready to review group mappings.', 'success');
      
      // Prompt to continue to Step 3
      setTimeout(() => {
        if (confirm('Would you like to review group mapping suggestions now?')) {
          navigateToStep3();
        }
      }, 1500);
    },
    
    onSkip: async (assignments) => {
      console.log('Onboarding Step 2 - Skip clicked', assignments);
      showToast('Progress saved. You can continue organizing circles anytime.', 'info');
    },
    
    onClose: () => {
      console.log('Onboarding Step 2 - Modal closed');
    }
  });
  
  // Mount the flow
  flow.mount();
}

/**
 * Navigate to Step 3 (Group Mappings)
 */
function navigateToStep3() {
  window.location.hash = '#directory/groups';
  if (typeof navigateTo === 'function') {
    navigateTo('directory');
    setTimeout(() => {
      if (typeof switchDirectoryTab === 'function') {
        switchDirectoryTab('groups');
      }
    }, 100);
  }
}

// ============================================================================
// Example 2: Post-Onboarding (Manage Circles Button)
// ============================================================================

/**
 * Handle "Manage Circles" button click from Circles section
 */
async function handleManageCirclesButton() {
  // Fetch contacts from API
  const contacts = await fetchContacts();
  
  // Get current circle assignments
  const currentAssignments = {};
  contacts.forEach(contact => {
    if (contact.circle || contact.dunbarCircle) {
      currentAssignments[contact.id] = contact.circle || contact.dunbarCircle;
    }
  });
  
  // Create Manage Circles flow in normal mode
  const flow = new ManageCirclesFlow(contacts, currentAssignments, {
    isOnboarding: false,
    
    onSave: async (assignments) => {
      console.log('Manage Circles - Save clicked', assignments);
      
      // Show success message
      showToast('Circle assignments saved successfully', 'success');
      
      // Refresh circles visualization
      if (typeof loadCirclesVisualization === 'function') {
        loadCirclesVisualization();
      }
    },
    
    onSkip: async (assignments) => {
      console.log('Manage Circles - Skip clicked', assignments);
      showToast('Changes saved', 'info');
      
      // Refresh circles visualization
      if (typeof loadCirclesVisualization === 'function') {
        loadCirclesVisualization();
      }
    },
    
    onClose: () => {
      console.log('Manage Circles - Modal closed');
    }
  });
  
  // Mount the flow
  flow.mount();
}

// ============================================================================
// Example 3: With AI Suggestions
// ============================================================================

/**
 * Open Manage Circles with AI-generated suggestions
 */
async function handleManageCirclesWithAI() {
  // Fetch contacts
  const contacts = await fetchContacts();
  
  // Fetch AI suggestions from backend
  const aiSuggestions = await fetchAICircleSuggestions(contacts);
  
  // Merge AI suggestions into contacts
  const contactsWithAI = contacts.map(contact => {
    const suggestion = aiSuggestions.find(s => s.contactId === contact.id);
    if (suggestion) {
      return {
        ...contact,
        circleAiSuggestion: suggestion.suggestedCircle,
        circleAiConfidence: suggestion.confidence
      };
    }
    return contact;
  });
  
  // Get current assignments
  const currentAssignments = {};
  contactsWithAI.forEach(contact => {
    if (contact.circle || contact.dunbarCircle) {
      currentAssignments[contact.id] = contact.circle || contact.dunbarCircle;
    }
  });
  
  // Create flow with AI suggestions
  const flow = new ManageCirclesFlow(contactsWithAI, currentAssignments, {
    isOnboarding: false,
    onSave: async (assignments) => {
      showToast('Circle assignments saved successfully', 'success');
      if (typeof loadCirclesVisualization === 'function') {
        loadCirclesVisualization();
      }
    }
  });
  
  flow.mount();
}

/**
 * Fetch AI circle suggestions from backend
 */
async function fetchAICircleSuggestions(contacts) {
  try {
    const response = await fetch(`${window.API_BASE || '/api'}/ai/circle-suggestions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      },
      body: JSON.stringify({ contacts })
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch AI suggestions');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching AI suggestions:', error);
    // Return empty array if AI service fails
    return [];
  }
}

// ============================================================================
// Example 4: Listening to Circle Assignment Events
// ============================================================================

/**
 * Set up event listener for circle assignments
 */
function setupCircleAssignmentListener() {
  window.addEventListener('circle-assigned', (event) => {
    const { contactId, circle } = event.detail;
    console.log(`Contact ${contactId} assigned to ${circle}`);
    
    // Update any UI that depends on circle assignments
    updateCircleVisualization();
    updateContactsList();
    
    // Track analytics
    if (typeof trackEvent === 'function') {
      trackEvent('circle_assigned', {
        contactId,
        circle,
        source: 'manage_circles_flow'
      });
    }
  });
}

// ============================================================================
// Example 5: Integration with Onboarding Step Indicator
// ============================================================================

/**
 * Update onboarding indicator when circles are organized
 */
function updateOnboardingProgress(categorized, total) {
  if (!window.onboardingIndicator) {
    return;
  }
  
  const currentState = window.onboardingIndicator.state;
  currentState.steps.circles.contactsCategorized = categorized;
  currentState.steps.circles.totalContacts = total;
  
  // Check if 50%+ categorized (Step 2 completion threshold)
  if (total > 0 && categorized / total >= 0.5) {
    currentState.steps.circles.complete = true;
    currentState.currentStep = 3;
  }
  
  window.onboardingIndicator.updateState(currentState);
}

// ============================================================================
// Example 6: Error Handling
// ============================================================================

/**
 * Open Manage Circles with comprehensive error handling
 */
async function handleManageCirclesWithErrorHandling() {
  try {
    // Show loading state
    showLoadingOverlay('Loading contacts...');
    
    // Fetch contacts
    const contacts = await fetchContacts();
    
    if (!contacts || contacts.length === 0) {
      hideLoadingOverlay();
      showToast('No contacts found. Please add contacts first.', 'info');
      return;
    }
    
    // Get current assignments
    const currentAssignments = {};
    contacts.forEach(contact => {
      if (contact.circle || contact.dunbarCircle) {
        currentAssignments[contact.id] = contact.circle || contact.dunbarCircle;
      }
    });
    
    // Hide loading
    hideLoadingOverlay();
    
    // Create flow
    const flow = new ManageCirclesFlow(contacts, currentAssignments, {
      isOnboarding: false,
      
      onSave: async (assignments) => {
        try {
          showLoadingOverlay('Saving assignments...');
          
          // Save to backend
          await saveCircleAssignments(assignments);
          
          hideLoadingOverlay();
          showToast('Circle assignments saved successfully', 'success');
          
          // Refresh UI
          if (typeof loadCirclesVisualization === 'function') {
            loadCirclesVisualization();
          }
        } catch (error) {
          hideLoadingOverlay();
          console.error('Error saving assignments:', error);
          showToast('Failed to save assignments. Please try again.', 'error');
        }
      },
      
      onSkip: async (assignments) => {
        showToast('Progress saved', 'info');
      },
      
      onClose: () => {
        console.log('Modal closed');
      }
    });
    
    flow.mount();
    
  } catch (error) {
    hideLoadingOverlay();
    console.error('Error opening Manage Circles:', error);
    showToast('Failed to load contacts. Please try again.', 'error');
  }
}

/**
 * Save circle assignments to backend
 */
async function saveCircleAssignments(assignments) {
  const assignmentsArray = Object.entries(assignments).map(([contactId, circle]) => ({
    contactId: parseInt(contactId),
    circle
  }));
  
  const response = await fetch(`${window.API_BASE || '/api'}/contacts/circles/bulk`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('authToken')}`
    },
    body: JSON.stringify({ assignments: assignmentsArray })
  });
  
  if (!response.ok) {
    throw new Error('Failed to save assignments');
  }
  
  return await response.json();
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Fetch contacts from API
 */
async function fetchContacts() {
  const userId = localStorage.getItem('userId');
  const authToken = localStorage.getItem('authToken');
  
  const response = await fetch(`${window.API_BASE || '/api'}/contacts?userId=${userId}`, {
    headers: {
      'Authorization': `Bearer ${authToken}`
    }
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch contacts');
  }
  
  return await response.json();
}

/**
 * Show loading overlay
 */
function showLoadingOverlay(message) {
  // Implementation depends on your app's loading UI
  console.log('Loading:', message);
}

/**
 * Hide loading overlay
 */
function hideLoadingOverlay() {
  // Implementation depends on your app's loading UI
  console.log('Loading complete');
}

/**
 * Show toast notification
 */
function showToast(message, type = 'info') {
  // Implementation depends on your app's toast UI
  console.log(`Toast [${type}]:`, message);
}

/**
 * Update circle visualization
 */
function updateCircleVisualization() {
  // Refresh the circular visualizer component
  if (typeof loadCirclesVisualization === 'function') {
    loadCirclesVisualization();
  }
}

/**
 * Update contacts list
 */
function updateContactsList() {
  // Refresh the contacts table
  if (typeof loadContacts === 'function') {
    loadContacts();
  }
}

// ============================================================================
// Initialization
// ============================================================================

/**
 * Initialize Manage Circles Flow integration
 * Call this when the app loads
 */
function initializeManageCirclesFlow() {
  // Set up event listeners
  setupCircleAssignmentListener();
  
  // Add "Manage Circles" button to Circles section
  const circlesSection = document.getElementById('directory-circles-tab');
  if (circlesSection) {
    const manageBtn = document.createElement('button');
    manageBtn.className = 'btn-primary';
    manageBtn.textContent = 'Manage Circles';
    manageBtn.addEventListener('click', handleManageCirclesButton);
    
    // Insert button at the top of circles section
    circlesSection.insertBefore(manageBtn, circlesSection.firstChild);
  }
  
  console.log('Manage Circles Flow integration initialized');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeManageCirclesFlow);
} else {
  initializeManageCirclesFlow();
}
