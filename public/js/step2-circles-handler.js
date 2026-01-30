/**
 * Step 2: Circles Organization Handler
 * 
 * Handles Step 2 of the onboarding flow: organizing contacts into circles.
 * Auto-triggers the Manage Circles flow when user navigates to the Circles tab.
 * 
 * Requirements: 3.1, 3.2, 8.1, 8.2, 8.3, 9.3, 9.4, 10.5
 */

class Step2CirclesHandler {
  constructor(onboardingState) {
    this.state = onboardingState;
    this.manageCirclesFlow = null;
    this.contacts = [];
    this.currentAssignments = {};
    this.aiSuggestions = [];
    this.updateProgressDebounced = this.debounce(this.updateProgressInternal.bind(this), 1000);
    this.contactsFetchInProgress = false;
    this.lastContactsFetch = 0;
    this.CONTACTS_CACHE_TTL = 5000; // 5 seconds cache
  }
  
  /**
   * Navigate to Step 2 and auto-trigger Manage Circles flow
   * Requirements: 3.1, 3.2
   */
  async navigateToStep() {
    // Navigate to Directory > Circles tab
    window.location.hash = '#directory/circles';
    
    if (typeof navigateTo === 'function') {
      navigateTo('directory');
      
      // Wait for directory to load, then switch to circles tab
      setTimeout(async () => {
        if (typeof switchDirectoryTab === 'function') {
          switchDirectoryTab('circles');
        }
        
        // Auto-open Manage Circles flow after tab loads
        setTimeout(async () => {
          await this.openManageCirclesFlow();
        }, 300);
      }, 100);
    }
  }
  
  /**
   * Open the new simplified circle assignment flow
   * QuickStartFlow → BatchSuggestions → QuickRefine
   * Requirements: 5.1, 6.1, 7.1
   */
  async openManageCirclesFlow() {
    try {
      // Check if dialog is already open
      const existingOverlay = document.querySelector('.manage-circles-overlay');
      const existingFlowContainer = document.getElementById('onboarding-flow-container');
      
      if (existingOverlay || existingFlowContainer) {
        console.log('[Step2] Manage Circles dialog already open, skipping');
        return;
      }
      
      // Reset the flag in case it got stuck
      window.isOpeningManageCircles = false;
      
      // Fetch contacts
      await this.fetchContacts();
      
      // Start with Quick Start Flow
      await this.startQuickStartFlow();
      
      // Set up event listeners for progress tracking
      this.setupEventListeners();
      
    } catch (error) {
      console.error('Error opening circle assignment flow:', error);
      window.isOpeningManageCircles = false;
      if (typeof showToast === 'function') {
        showToast('Failed to load circle organization', 'error');
      }
    }
  }
  
  /**
   * Start the Quick Start Flow (Step 1 of new flow)
   * Requirements: 5.1, 5.6, 5.7, 5.8, 5.9, 19.1, 19.2
   */
  async startQuickStartFlow() {
    // Create container for the flow
    const container = document.createElement('div');
    container.id = 'onboarding-flow-container';
    container.className = 'manage-circles-overlay';
    container.innerHTML = `
      <div class="manage-circles-modal">
        <div class="manage-circles__header">
          <h2>Organize Your Circles - Step 1 of 3</h2>
          <button class="btn-close" id="flow-close" aria-label="Close">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 20px; height: 20px;">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div class="education-tip">
          <div class="education-tip__icon">💡</div>
          <div class="education-tip__content">
            <strong>Understanding Circles:</strong> Based on Dunbar's number research, humans naturally maintain relationships in layers. 
            Your <strong>Inner Circle</strong> (~5 people) includes your closest relationships - those you see or talk to weekly.
            <a href="#" class="education-tip__learn-more" id="learn-more-circles">Learn more about circles</a>
          </div>
        </div>
        <div id="quick-start-container"></div>
      </div>
    `;
    
    document.body.appendChild(container);
    
    // Add close button handler
    const closeBtn = document.getElementById('flow-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closeFlow());
    }
    
    // Add learn more handler
    const learnMoreBtn = document.getElementById('learn-more-circles');
    if (learnMoreBtn) {
      learnMoreBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.showCirclesEducation();
      });
    }
    
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
    
    // Initialize Quick Start Flow
    if (typeof QuickStartFlow === 'undefined') {
      console.error('QuickStartFlow component not loaded');
      if (typeof showToast === 'function') {
        showToast('Quick Start component not available', 'error');
      }
      return;
    }
    
    this.quickStartFlow = new QuickStartFlow({
      containerId: 'quick-start-container',
      userId: window.userId || localStorage.getItem('userId'),
      onAcceptAll: (contactIds, circle) => {
        console.log('Quick Start: Accept All', contactIds, circle);
        this.handleQuickStartComplete(contactIds);
      },
      onReview: () => {
        console.log('Quick Start: Review mode activated');
      },
      onSkip: () => {
        console.log('Quick Start: Skipped');
        this.startBatchSuggestionsFlow();
      },
      onComplete: (result) => {
        console.log('Quick Start: Complete', result);
        this.startBatchSuggestionsFlow();
      }
    });
    
    await this.quickStartFlow.render();
  }
  
  /**
   * Handle Quick Start completion and move to Batch Suggestions
   * Requirements: 5.10, 6.1
   */
  async handleQuickStartComplete(assignedContactIds) {
    // Update progress
    this.updateProgress();
    
    // Move to Batch Suggestions
    await this.startBatchSuggestionsFlow();
  }
  
  /**
   * Start the Batch Suggestions Flow (Step 2 of new flow)
   * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 19.1, 19.3
   */
  async startBatchSuggestionsFlow() {
    const container = document.getElementById('onboarding-flow-container');
    if (!container) return;
    
    // Update header
    const header = container.querySelector('.manage-circles__header h2');
    if (header) {
      header.textContent = 'Organize Your Circles - Step 2 of 3';
    }
    
    // Update education tip
    const educationTip = container.querySelector('.education-tip__content');
    if (educationTip) {
      educationTip.innerHTML = `
        <strong>Smart Batching:</strong> We've grouped contacts by relationship signals (family, work, hobbies, etc.). 
        Assign entire groups to circles with one click to save time.
        <a href="#" class="education-tip__learn-more" id="learn-more-batching">Learn more</a>
      `;
      
      // Re-attach learn more handler
      const learnMoreBtn = document.getElementById('learn-more-batching');
      if (learnMoreBtn) {
        learnMoreBtn.addEventListener('click', (e) => {
          e.preventDefault();
          this.showBatchingEducation();
        });
      }
    }
    
    // Clear previous content
    const contentContainer = document.getElementById('quick-start-container');
    if (!contentContainer) return;
    
    contentContainer.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>Loading batch suggestions...</p></div>';
    
    // Check if BatchSuggestionCard component is available
    if (typeof BatchSuggestionCard === 'undefined') {
      console.error('BatchSuggestionCard component not loaded');
      // Fall back to Quick Refine
      await this.startQuickRefineFlow();
      return;
    }
    
    try {
      // Fetch batch suggestions
      const response = await fetch(`/api/ai/batch-suggestions?userId=${window.userId || localStorage.getItem('userId')}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch batch suggestions');
      }
      
      const data = await response.json();
      const batches = data.batches || [];
      
      if (batches.length === 0) {
        // No batches, move to Quick Refine
        await this.startQuickRefineFlow();
        return;
      }
      
      // Render batch suggestions
      contentContainer.innerHTML = `
        <div class="batch-suggestions-container">
          <div class="batch-suggestions-header">
            <h3>Smart Batching by Relationship Signals</h3>
            <p>We've grouped your contacts based on relationship strength. Review and accept each batch.</p>
          </div>
          <div id="batch-cards-container"></div>
          <div class="batch-actions">
            <button class="btn-primary" id="batch-done">Done with Batches</button>
            <button class="btn-text" id="batch-skip">Skip to Manual Review</button>
          </div>
        </div>
      `;
      
      // Render each batch card
      const batchCardsContainer = document.getElementById('batch-cards-container');
      this.batchCards = [];
      
      batches.forEach((batch, index) => {
        const card = new BatchSuggestionCard(batch, {
          onAccept: (result) => {
            console.log('Batch accepted:', result);
            this.handleBatchAccepted(result.batchId, result.contactIds, result.circle);
          },
          onSkip: (result) => {
            console.log('Batch skipped:', result);
          }
        });
        
        // render() returns the card element - append it to the container
        const cardElement = card.render();
        batchCardsContainer.appendChild(cardElement);
        this.batchCards.push(card);
      });
      
      // Add event listeners
      const doneBtn = document.getElementById('batch-done');
      if (doneBtn) {
        doneBtn.addEventListener('click', () => this.startQuickRefineFlow());
      }
      
      const skipBtn = document.getElementById('batch-skip');
      if (skipBtn) {
        skipBtn.addEventListener('click', () => this.startQuickRefineFlow());
      }
      
    } catch (error) {
      console.error('Error loading batch suggestions:', error);
      // Fall back to Quick Refine
      await this.startQuickRefineFlow();
    }
  }
  
  /**
   * Handle batch acceptance
   * Requirements: 6.8, 6.9
   */
  async handleBatchAccepted(batchId, contactIds, circle) {
    // Update progress
    this.updateProgress();
    
    // Show undo toast if available
    if (typeof UndoToast !== 'undefined') {
      // Undo toast will be handled by the BatchSuggestionCard component
    }
  }
  
  /**
   * Start the Quick Refine Flow (Step 3 of new flow)
   * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 19.1, 19.4
   */
  async startQuickRefineFlow() {
    const container = document.getElementById('onboarding-flow-container');
    if (!container) return;
    
    // Update header
    const header = container.querySelector('.manage-circles__header h2');
    if (header) {
      header.textContent = 'Organize Your Circles - Step 3 of 3';
    }
    
    // Update education tip
    const educationTip = container.querySelector('.education-tip__content');
    if (educationTip) {
      educationTip.innerHTML = `
        <strong>Quick Refine:</strong> Use 1-4 keys to assign, S to skip, D when done.
        <a href="#" class="education-tip__learn-more" id="learn-more-refine">Learn more</a>
      `;
      
      // Re-attach learn more handler
      const learnMoreBtn = document.getElementById('learn-more-refine');
      if (learnMoreBtn) {
        learnMoreBtn.addEventListener('click', (e) => {
          e.preventDefault();
          this.showRefineEducation();
        });
      }
    }
    
    // Clear previous content
    const contentContainer = document.getElementById('quick-start-container');
    if (!contentContainer) return;
    
    contentContainer.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>Loading remaining contacts...</p></div>';
    
    // Check if QuickRefineCard component is available
    if (typeof QuickRefineCard === 'undefined') {
      console.error('QuickRefineCard component not loaded');
      // Fall back to completion
      await this.handleFlowComplete();
      return;
    }
    
    try {
      // Fetch uncategorized contacts
      const response = await fetch(`/api/contacts?userId=${window.userId || localStorage.getItem('userId')}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch contacts');
      }
      
      const allContacts = await response.json();
      const uncategorized = allContacts.filter(c => 
        (!c.circle || c.circle === 'uncategorized') && 
        (!c.dunbarCircle || c.dunbarCircle === 'uncategorized')
      );
      
      if (uncategorized.length === 0) {
        // All contacts categorized, complete the flow
        await this.handleFlowComplete();
        return;
      }
      
      // Render Quick Refine
      contentContainer.innerHTML = '<div id="quick-refine-container"></div>';
      
      this.quickRefineCard = new QuickRefineCard(uncategorized, {
        containerId: 'quick-refine-container',
        onAssign: (contactId, circle) => {
          console.log('Contact assigned:', contactId, circle);
          this.handleContactAssigned(contactId, circle);
        },
        onDone: () => {
          console.log('Quick Refine: Done');
          this.handleFlowComplete();
        },
        onSkip: () => {
          console.log('Quick Refine: Skipped');
          this.handleFlowComplete();
        }
      });
      
      await this.quickRefineCard.render();
      
    } catch (error) {
      console.error('Error loading Quick Refine:', error);
      // Complete the flow anyway
      await this.handleFlowComplete();
    }
  }
  
  /**
   * Handle individual contact assignment in Quick Refine
   * Requirements: 7.3, 7.5, 10.2, 19.3, 19.4
   */
  async handleContactAssigned(contactId, circle) {
    // Update local contacts cache immediately (optimistic update)
    const contact = this.contacts.find(c => c.id === contactId);
    if (contact) {
      contact.circle = circle;
      contact.dunbarCircle = circle;
    }
    
    // Update onboarding controller if available
    if (window.onboardingController && window.onboardingController.isOnboardingActive()) {
      try {
        window.onboardingController.addCategorizedContact(contactId);
      } catch (error) {
        console.error('Error updating onboarding controller:', error);
      }
    }
    
    // Check circle capacity and show warning if needed
    await this.checkCircleCapacity(circle);
    
    // Update progress (debounced to avoid rate limiting)
    this.updateProgressDebounced();
  }
  
  /**
   * Check circle capacity and show warning if approaching limit
   * Requirements: 19.3, 19.4
   */
  async checkCircleCapacity(circle) {
    const capacities = {
      inner: 5,
      close: 15,
      active: 50,
      casual: 150
    };
    
    const capacity = capacities[circle];
    if (!capacity) return;
    
    // Use cached contacts to avoid rate limiting
    if (this.contacts.length === 0) {
      return; // No data available
    }
    
    const circleContacts = this.contacts.filter(c => 
      c.circle === circle || c.dunbarCircle === circle
    );
    const count = circleContacts.length;
    
    // Show warning if at 80% capacity or more
    if (count >= capacity * 0.8) {
      this.showCapacityWarning(circle);
    }
    
    // Update capacity display in UI if element exists
    const capacityDisplay = document.querySelector(`.circle-capacity-${circle}`);
    if (capacityDisplay) {
      capacityDisplay.textContent = `${count}/${capacity}`;
      
      // Add warning class if at capacity
      if (count >= capacity) {
        capacityDisplay.classList.add('at-capacity');
      }
    }
  }
  
  /**
   * Handle flow completion
   * Requirements: 10.1, 10.2
   */
  async handleFlowComplete() {
    // Close the flow
    this.closeFlow();
    
    // Call the original save and continue handler
    await this.handleSaveAndContinue();
  }
  
  /**
   * Close the flow container
   */
  closeFlow() {
    const container = document.getElementById('onboarding-flow-container');
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
    
    // Restore body scroll
    document.body.style.overflow = '';
    
    // Clean up components
    if (this.quickStartFlow) {
      this.quickStartFlow.destroy();
      this.quickStartFlow = null;
    }
    
    if (this.batchCards) {
      this.batchCards.forEach(card => card.destroy && card.destroy());
      this.batchCards = null;
    }
    
    if (this.quickRefineCard) {
      this.quickRefineCard.destroy && this.quickRefineCard.destroy();
      this.quickRefineCard = null;
    }
  }
  
  /**
   * Update progress tracking (debounced version)
   * Requirements: 9.1, 9.2, 10.2, 10.5
   */
  updateProgress() {
    this.updateProgressDebounced();
  }
  
  /**
   * Internal progress update implementation
   * Requirements: 9.1, 9.2, 10.2, 10.5
   */
  async updateProgressInternal() {
    // Use cached contacts if available and fresh
    const now = Date.now();
    const cacheAge = now - this.lastContactsFetch;
    
    if (cacheAge < this.CONTACTS_CACHE_TTL && this.contacts.length > 0) {
      // Use cached data
      this.updateProgressFromCache();
    } else {
      // Fetch fresh data
      try {
        await this.fetchContacts();
        this.updateProgressFromCache();
      } catch (error) {
        console.error('Error fetching contacts for progress update:', error);
        // Fall back to cached data if fetch fails
        if (this.contacts.length > 0) {
          this.updateProgressFromCache();
        }
      }
    }
  }
  
  /**
   * Update progress using cached contact data
   */
  updateProgressFromCache() {
    // Count categorized contacts (excluding 'uncategorized' value)
    const categorized = this.contacts.filter(c => 
      (c.circle && c.circle !== 'uncategorized') || 
      (c.dunbarCircle && c.dunbarCircle !== 'uncategorized')
    ).length;
    const total = this.contacts.length;
    
    // Update onboarding controller if available
    if (window.onboardingController && window.onboardingController.isOnboardingActive()) {
      window.onboardingController.updateProgressData({
        totalCount: total,
        categorizedCount: categorized
      });
    }
    
    // Update onboarding state (legacy support)
    if (window.onboardingIndicator) {
      const currentState = window.onboardingIndicator.state;
      currentState.steps.circles.contactsCategorized = categorized;
      currentState.steps.circles.totalContacts = total;
      window.onboardingIndicator.updateState(currentState);
    }
    
    // Check for milestones
    this.checkProgressMilestones();
  }
  
  /**
   * Fetch contacts from API with rate limit protection
   */
  async fetchContacts() {
    // Prevent concurrent fetches
    if (this.contactsFetchInProgress) {
      console.log('[Step2] Contact fetch already in progress, skipping');
      return;
    }
    
    // Check cache freshness
    const now = Date.now();
    const cacheAge = now - this.lastContactsFetch;
    if (cacheAge < this.CONTACTS_CACHE_TTL && this.contacts.length > 0) {
      console.log('[Step2] Using cached contacts');
      return;
    }
    
    this.contactsFetchInProgress = true;
    
    try {
      const userId = window.userId || localStorage.getItem('userId');
      const authToken = localStorage.getItem('authToken');
      
      if (!userId || !authToken) {
        throw new Error('User not authenticated');
      }
      
      const response = await fetch(`${window.API_BASE || '/api'}/contacts?userId=${userId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch contacts');
      }
      
      this.contacts = await response.json();
      this.lastContactsFetch = Date.now();
    } finally {
      this.contactsFetchInProgress = false;
    }
  }
  
  /**
   * Fetch AI circle suggestions from backend with timeout and error handling
   * Requirements: 8.1, 8.2, 8.3, 13.4
   */
  async fetchAISuggestions() {
    const userId = window.userId || localStorage.getItem('userId');
    const authToken = localStorage.getItem('authToken');
    
    if (!userId || !authToken) {
      return; // Gracefully handle missing auth
    }
    
    try {
      // Add timeout to AI request (30 seconds)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      const response = await fetch(`${window.API_BASE || '/api'}/ai/circle-suggestions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          userId,
          contactIds: this.contacts.map(c => c.id)
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        // Handle AI service failures gracefully
        // Requirements: 9.4, 13.4
        console.warn('AI suggestions not available:', response.statusText);
        this.aiSuggestions = [];
        this.showAIServiceWarning('unavailable');
        return;
      }
      
      const data = await response.json();
      this.aiSuggestions = data.suggestions || [];
      
      if (this.aiSuggestions.length > 0) {
        if (typeof showToast === 'function') {
          showToast(`AI generated ${this.aiSuggestions.length} circle suggestions`, 'success');
        }
      }
      
    } catch (error) {
      // Handle AI service failures gracefully
      // Requirements: 9.4, 13.4
      console.warn('Failed to fetch AI suggestions:', error);
      this.aiSuggestions = [];
      
      // Determine error type
      if (error.name === 'AbortError') {
        this.showAIServiceWarning('timeout');
      } else if (error.message && error.message.includes('network')) {
        this.showAIServiceWarning('network');
      } else {
        this.showAIServiceWarning('error');
      }
    }
  }
  
  /**
   * Show warning about AI service issues
   * Requirements: 9.4, 13.4
   */
  showAIServiceWarning(type) {
    let message = '';
    
    switch (type) {
      case 'timeout':
        message = 'AI suggestions timed out. You can still organize contacts manually.';
        break;
      case 'network':
        message = 'Network issue prevented AI suggestions. You can still organize contacts manually.';
        break;
      case 'unavailable':
        message = 'AI suggestions temporarily unavailable. You can still organize contacts manually.';
        break;
      default:
        message = 'AI suggestions unavailable. You can still organize contacts manually.';
    }
    
    if (typeof showToast === 'function') {
      showToast(message, 'info');
    }
  }
  
  /**
   * Apply AI suggestions to contacts
   * Requirements: 8.1, 8.2, 8.3
   */
  applyAISuggestionsToContacts() {
    if (!this.aiSuggestions || this.aiSuggestions.length === 0) {
      return;
    }
    
    // Create a map of contact ID to suggestion
    const suggestionMap = new Map();
    this.aiSuggestions.forEach(suggestion => {
      suggestionMap.set(suggestion.contactId, suggestion);
    });
    
    // Apply suggestions to contacts
    this.contacts.forEach(contact => {
      const suggestion = suggestionMap.get(contact.id);
      if (suggestion) {
        contact.circle_ai_suggestion = suggestion.suggestedCircle;
        contact.circle_ai_confidence = suggestion.confidence;
        contact.circle_ai_reason = suggestion.reason;
        
        // Pre-select high-confidence suggestions (>= 80%)
        // Requirements: 8.3
        if (suggestion.confidence >= 80 && !contact.circle && !contact.dunbarCircle) {
          contact.circle = suggestion.suggestedCircle;
          contact.dunbarCircle = suggestion.suggestedCircle;
          contact.circle_assigned_by = 'ai';
        }
      }
    });
  }
  
  /**
   * Load current circle assignments from contacts
   */
  loadCurrentAssignments() {
    this.currentAssignments = {};
    
    this.contacts.forEach(contact => {
      const circle = contact.circle || contact.dunbarCircle;
      if (circle) {
        this.currentAssignments[contact.id] = circle;
      }
    });
  }
  
  /**
   * Set up event listeners for progress tracking
   * Requirements: 9.1, 9.2, 9.4
   */
  setupEventListeners() {
    // Listen for circle assignments
    window.addEventListener('circle-assigned', (e) => {
      this.handleCircleAssignment(e.detail);
    });
  }
  
  /**
   * Handle circle assignment and update progress
   * Requirements: 9.1, 9.2, 9.4
   */
  handleCircleAssignment(data) {
    const { contactId, circle } = data;
    
    // Update local assignments
    if (circle) {
      this.currentAssignments[contactId] = circle;
    } else {
      delete this.currentAssignments[contactId];
    }
    
    // Update contact in local array
    const contact = this.contacts.find(c => c.id === contactId);
    if (contact) {
      contact.circle = circle;
      contact.dunbarCircle = circle;
    }
    
    // Check for progress milestones
    this.checkProgressMilestones();
    
    // Check for capacity warnings
    this.checkCapacityWarnings();
  }
  
  /**
   * Check and display progress milestones
   * Requirements: 9.4
   */
  checkProgressMilestones() {
    const categorized = this.contacts.filter(c => c.circle || c.dunbarCircle).length;
    const total = this.contacts.length;
    
    if (total === 0) return;
    
    const percentage = (categorized / total) * 100;
    
    // Show encouraging messages at milestones
    if (percentage === 25 && !this.milestone25Shown) {
      this.milestone25Shown = true;
      if (typeof showToast === 'function') {
        showToast('🎉 Great start! You\'re 25% done organizing your circles.', 'success');
      }
    } else if (percentage >= 50 && percentage < 75 && !this.milestone50Shown) {
      this.milestone50Shown = true;
      if (typeof showToast === 'function') {
        showToast('🌟 Halfway there! Keep going!', 'success');
      }
    } else if (percentage >= 75 && percentage < 100 && !this.milestone75Shown) {
      this.milestone75Shown = true;
      if (typeof showToast === 'function') {
        showToast('✨ Almost done! Just a bit more!', 'success');
      }
    } else if (percentage === 100 && !this.milestone100Shown) {
      this.milestone100Shown = true;
      this.showCompletionCelebration();
    }
  }
  
  /**
   * Show completion celebration
   * Requirements: 9.4
   */
  showCompletionCelebration() {
    if (typeof showToast === 'function') {
      showToast('🎊 Congratulations! All contacts categorized!', 'success');
    }
    
    // Show a more prominent celebration modal
    setTimeout(() => {
      const celebrationHtml = `
        <div class="celebration-overlay" id="celebration-overlay">
          <div class="celebration-modal">
            <div class="celebration-icon">🎉</div>
            <h2>Amazing Work!</h2>
            <p>You've successfully organized all your contacts into circles.</p>
            <p>Your relationship network is now ready for intelligent suggestions!</p>
            <button class="btn-primary" id="celebration-continue">Continue to Next Step</button>
          </div>
        </div>
      `;
      
      const container = document.createElement('div');
      container.innerHTML = celebrationHtml;
      document.body.appendChild(container.firstElementChild);
      
      // Add click handler
      document.getElementById('celebration-continue').addEventListener('click', () => {
        document.getElementById('celebration-overlay').remove();
        this.handleSaveAndContinue();
      });
      
      // Close on overlay click
      document.getElementById('celebration-overlay').addEventListener('click', (e) => {
        if (e.target.id === 'celebration-overlay') {
          document.getElementById('celebration-overlay').remove();
        }
      });
    }, 500);
  }
  
  /**
   * Check for capacity warnings
   * Requirements: 9.3, 10.5
   */
  checkCapacityWarnings() {
    const circles = [
      { id: 'inner', name: 'Inner Circle', capacity: 10 },
      { id: 'close', name: 'Close Friends', capacity: 25 },
      { id: 'active', name: 'Active Friends', capacity: 50 },
      { id: 'casual', name: 'Casual Network', capacity: 100 }
    ];
    
    // Count contacts in each circle
    const counts = {};
    circles.forEach(circle => {
      counts[circle.id] = 0;
    });
    
    this.contacts.forEach(contact => {
      const circleId = contact.circle || contact.dunbarCircle;
      if (circleId && counts[circleId] !== undefined) {
        counts[circleId]++;
      }
    });
    
    // Check for over-capacity circles
    circles.forEach(circle => {
      const count = counts[circle.id];
      
      // Show warning when exceeding capacity
      if (count > circle.capacity && !this[`warning_${circle.id}_shown`]) {
        this[`warning_${circle.id}_shown`] = true;
        
        if (typeof showToast === 'function') {
          showToast(
            `⚠️ ${circle.name} is over capacity (${count}/${circle.capacity}). Consider rebalancing for better relationship management.`,
            'warning'
          );
        }
      }
      
      // Reset warning flag if count drops back below capacity
      if (count <= circle.capacity) {
        this[`warning_${circle.id}_shown`] = false;
      }
    });
  }
  
  /**
   * Handle save and continue to Step 3
   * Requirements: 6.3, 6.4, 10.2, 12.1
   */
  async handleSaveAndContinue() {
    const categorized = this.contacts.filter(c => c.circle || c.dunbarCircle).length;
    const total = this.contacts.length;
    
    // Update onboarding controller if available
    if (window.onboardingController && window.onboardingController.isOnboardingActive()) {
      try {
        // Mark circle assignment step as complete
        await window.onboardingController.markStepComplete(window.onboardingController.getCurrentStep());
        
        // Update progress data
        window.onboardingController.updateProgressData({
          totalCount: total,
          categorizedCount: categorized
        });
        
        // Save progress to backend
        await window.onboardingController.saveProgress();
      } catch (error) {
        console.error('Error updating onboarding controller:', error);
      }
    }
    
    // Update onboarding state (legacy support)
    if (window.onboardingIndicator) {
      const currentState = window.onboardingIndicator.state;
      currentState.steps.circles.complete = true;
      currentState.steps.circles.contactsCategorized = categorized;
      currentState.steps.circles.totalContacts = total;
      currentState.currentStep = 3;
      
      window.onboardingIndicator.updateState(currentState);
    }
    
    // Check if there are group mappings to review
    const hasGroupMappings = await this.checkForGroupMappings();
    
    if (!hasGroupMappings) {
      // No group mappings to review - mark step 3 as complete automatically
      if (window.onboardingController && window.onboardingController.isOnboardingActive()) {
        try {
          await window.onboardingController.markStepComplete('group-mappings');
          await window.onboardingController.saveProgress();
        } catch (error) {
          console.error('Error marking group mappings step complete:', error);
        }
      }
      
      // Update legacy onboarding state
      if (window.onboardingIndicator) {
        const currentState = window.onboardingIndicator.state;
        currentState.steps.groupMappings.complete = true;
        window.onboardingIndicator.updateState(currentState);
      }
      
      if (typeof showToast === 'function') {
        showToast('Circles organized! No group mappings to review.', 'success');
      }
      return;
    }
    
    // Show success message
    if (typeof showToast === 'function') {
      showToast('Circles organized! You can review group mappings when ready.', 'success');
    }
    
    // Don't automatically prompt - let user navigate when ready
    // The onboarding indicator will show step 3 is available
  }
  
  /**
   * Check if there are group mappings to review
   * Returns true if there are pending mappings, false otherwise
   */
  async checkForGroupMappings() {
    try {
      const userId = window.userId || localStorage.getItem('userId');
      const authToken = localStorage.getItem('authToken');
      
      if (!userId || !authToken) {
        return false;
      }
      
      // Check if user has visited group mappings page before
      const visitedKey = `group-mappings-visited-${userId}`;
      const hasVisited = localStorage.getItem(visitedKey) === 'true';
      
      if (hasVisited) {
        // User has already visited, no need to prompt
        return false;
      }
      
      // Check if there are any group mapping suggestions
      const response = await fetch(`${window.API_BASE || '/api'}/contacts/google/group-mappings?userId=${userId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      if (!response.ok) {
        // API error - assume no mappings
        return false;
      }
      
      const data = await response.json();
      const mappings = data.mappings || [];
      
      // Return true only if there are pending mappings
      return mappings.length > 0;
      
    } catch (error) {
      console.error('Error checking for group mappings:', error);
      return false;
    }
  }
  
  /**
   * Handle skip for now
   * Requirements: 6.4, 12.1
   */
  handleSkip() {
    if (typeof showToast === 'function') {
      showToast('Progress saved. You can continue organizing circles anytime.', 'info');
    }
  }
  
  /**
   * Handle modal close
   */
  handleClose() {
    // Clean up
    this.manageCirclesFlow = null;
  }
  
  /**
   * Navigate to Step 3 (Group Mappings)
   */
  navigateToStep3() {
    // Mark group mappings page as visited
    const userId = window.userId || localStorage.getItem('userId');
    if (userId) {
      localStorage.setItem(`group-mappings-visited-${userId}`, 'true');
    }
    
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
  
  /**
   * Show detailed circles education modal
   * Requirements: 19.2, 19.5, 19.6
   */
  showCirclesEducation() {
    if (typeof EducationalFeatures !== 'undefined') {
      // Use existing educational features if available
      const educationalFeatures = new EducationalFeatures({
        userId: window.userId || localStorage.getItem('userId')
      });
      educationalFeatures.openHelpPanel();
    } else {
      // Fallback: show comprehensive education modal
      this.showEducationModal('circles');
    }
  }
  
  /**
   * Show comprehensive education modal
   * Requirements: 19.1, 19.2, 19.3, 19.4, 19.5, 19.6
   */
  showEducationModal(topic) {
    const content = this.getEducationContent(topic);
    
    const modal = document.createElement('div');
    modal.className = 'education-modal-overlay';
    modal.innerHTML = `
      <div class="education-modal">
        <div class="education-modal__header">
          <h2>${content.title}</h2>
          <button class="btn-close" aria-label="Close">×</button>
        </div>
        <div class="education-modal__content">
          ${content.html}
        </div>
        <div class="education-modal__footer">
          <button class="btn-primary">Got it!</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add event listeners
    const closeBtn = modal.querySelector('.btn-close');
    const gotItBtn = modal.querySelector('.btn-primary');
    
    const closeModal = () => {
      modal.classList.add('closing');
      setTimeout(() => {
        if (modal.parentNode) {
          modal.parentNode.removeChild(modal);
        }
      }, 300);
    };
    
    closeBtn.addEventListener('click', closeModal);
    gotItBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
  }
  
  /**
   * Get education content for different topics
   * Requirements: 19.1, 19.2, 19.3, 19.4
   */
  getEducationContent(topic) {
    const content = {
      circles: {
        title: 'Understanding Social Circles',
        html: `
          <div class="education-section-compact">
            <p><strong>Based on Dunbar's Number Research:</strong> Humans naturally maintain relationships in layers. This isn't about ranking people – it's about recognizing the different levels of connection we have.</p>
          </div>
          
          <div class="education-circles-compact">
            <div class="education-circle-item-compact">
              <div class="circle-badge-compact inner">~5</div>
              <div class="circle-info-compact">
                <h4>Inner Circle</h4>
                <p>Your closest relationships – family and best friends you <em>see or talk to weekly</em>.</p>
                <ul>
                  <li>People you turn to in times of crisis</li>
                  <li>Relationships that require regular maintenance</li>
                  <li>Your emotional support network</li>
                </ul>
              </div>
            </div>
            
            <div class="education-circle-item-compact">
              <div class="circle-badge-compact close">~15</div>
              <div class="circle-info-compact">
                <h4>Close Friends</h4>
                <p>Good friends you <em>see regularly</em> and actively maintain friendships with.</p>
                <ul>
                  <li>Friends you see or talk to monthly</li>
                  <li>People you share activities and interests with</li>
                  <li>Friends you make time for regularly</li>
                </ul>
              </div>
            </div>
            
            <div class="education-circle-item-compact">
              <div class="circle-badge-compact active">~50</div>
              <div class="circle-info-compact">
                <h4>Active Friends</h4>
                <p>Friends you <em>maintain regular contact</em> with throughout the year.</p>
                <ul>
                  <li>Friends you see a few times per year</li>
                  <li>Colleagues you socialize with outside work</li>
                  <li>Friends from different life contexts</li>
                </ul>
              </div>
            </div>
            
            <div class="education-circle-item-compact">
              <div class="circle-badge-compact casual">~150</div>
              <div class="circle-info-compact">
                <h4>Casual Network</h4>
                <p>Acquaintances and occasional contacts you know and recognize.</p>
                <ul>
                  <li>Casual friends and acquaintances</li>
                  <li>Professional contacts you interact with</li>
                  <li>Friends of friends you see occasionally</li>
                </ul>
              </div>
            </div>
          </div>
        `
      },
      batching: {
        title: 'Smart Batching',
        html: `
          <div class="education-section">
            <h3>Save Time with Batch Assignment</h3>
            <p>We've analyzed your contacts and grouped them by relationship signals to help you organize faster.</p>
          </div>
          
          <div class="education-features">
            <div class="feature-item">
              <div class="feature-icon">👨‍👩‍👧‍👦</div>
              <div class="feature-content">
                <h4>Family Groups</h4>
                <p>Contacts identified as family members based on shared last names and relationship indicators.</p>
              </div>
            </div>
            
            <div class="feature-item">
              <div class="feature-icon">💼</div>
              <div class="feature-content">
                <h4>Work Colleagues</h4>
                <p>People from the same company or with similar job titles and professional connections.</p>
              </div>
            </div>
            
            <div class="feature-item">
              <div class="feature-icon">🎯</div>
              <div class="feature-content">
                <h4>Shared Interests</h4>
                <p>Contacts grouped by hobbies, activities, or common interests you've mentioned.</p>
              </div>
            </div>
            
            <div class="feature-item">
              <div class="feature-icon">📅</div>
              <div class="feature-content">
                <h4>Calendar Overlap</h4>
                <p>People you frequently meet with based on shared calendar events.</p>
              </div>
            </div>
          </div>
          
          <div class="education-tips">
            <h3>How to Use Batching</h3>
            <ul>
              <li><strong>Review each batch:</strong> Check if the suggested circle makes sense</li>
              <li><strong>Accept or skip:</strong> Accept entire batches with one click, or skip to review individually</li>
              <li><strong>Expand to see details:</strong> Click on a batch to see all contacts before accepting</li>
              <li><strong>It's flexible:</strong> You can always adjust assignments later</li>
            </ul>
          </div>
        `
      },
      refine: {
        title: 'Quick Refine',
        html: `
          <div class="education-section-compact">
            <p><strong>Fast Contact Organization:</strong> Review contacts one at a time and quickly assign them to circles.</p>
          </div>
          
          <div class="education-features-compact">
            <div class="feature-item-compact">
              <span class="feature-icon-compact">⌨️</span>
              <div class="feature-text-compact">
                <strong>Keyboard Shortcuts:</strong> 1-4 to assign circles, S to skip, D when done
              </div>
            </div>
            
            <div class="feature-item-compact">
              <span class="feature-icon-compact">👆</span>
              <div class="feature-text-compact">
                <strong>Swipe Gestures:</strong> Swipe or click buttons to assign contacts
              </div>
            </div>
            
            <div class="feature-item-compact">
              <span class="feature-icon-compact">💾</span>
              <div class="feature-text-compact">
                <strong>Auto-Save:</strong> Progress saved automatically, resume anytime
              </div>
            </div>
          </div>
        `
      }
    };
    
    return content[topic] || content.circles;
  }
  
  /**
   * Show batching education
   * Requirements: 19.1, 19.3
   */
  showBatchingEducation() {
    this.showEducationModal('batching');
  }
  
  /**
   * Show refine education
   * Requirements: 19.1, 19.4
   */
  showRefineEducation() {
    this.showEducationModal('refine');
  }
  
  /**
   * Show capacity warning when circle is full
   * Requirements: 19.4
   */
  showCapacityWarning(circle) {
    const capacities = {
      inner: 5,
      close: 15,
      active: 50,
      casual: 150
    };
    
    const capacity = capacities[circle];
    if (!capacity) return;
    
    const message = `Your ${circle} circle is approaching capacity (${capacity} contacts).\n\n` +
                   `Based on Dunbar's research, maintaining more than ${capacity} relationships ` +
                   `at this level becomes difficult. Consider if some contacts might fit better ` +
                   `in a different circle.`;
    
    if (typeof showToast === 'function') {
      showToast(message, 'warning', 8000);
    } else {
      alert(message);
    }
  }
  
  /**
   * Destroy the handler and clean up
   */
  destroy() {
    if (this.manageCirclesFlow) {
      this.manageCirclesFlow.destroy();
      this.manageCirclesFlow = null;
    }
  }
  
  /**
   * Debounce utility function
   * Delays function execution until after wait milliseconds have elapsed since last call
   */
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
  
  /**
   * Initialize education modal styles
   */
  static initStyles() {
    if (document.getElementById('step2-education-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'step2-education-styles';
    style.textContent = `
      /* Education Modal Styles */
      .education-modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.6);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        padding: 20px;
        animation: fadeIn 0.3s ease-out;
      }
      
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      
      .education-modal-overlay.closing {
        animation: fadeOut 0.3s ease-out;
      }
      
      @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
      }
      
      .education-modal {
        background: white;
        border-radius: 16px;
        max-width: 600px;
        width: 100%;
        max-height: 88vh;
        display: flex;
        flex-direction: column;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        animation: slideUp 0.3s ease-out;
      }
      
      @keyframes slideUp {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      .education-modal__header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px 24px;
        border-bottom: 1px solid #e5e7eb;
      }
      
      .education-modal__header h2 {
        margin: 0;
        font-size: 20px;
        font-weight: 700;
        color: #1f2937;
      }
      
      .education-modal__header .btn-close {
        background: none;
        border: none;
        font-size: 28px;
        color: #9ca3af;
        cursor: pointer;
        padding: 0;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 8px;
        transition: all 0.2s;
      }
      
      .education-modal__header .btn-close:hover {
        background: #f3f4f6;
        color: #4b5563;
      }
      
      .education-modal__content {
        flex: 1;
        overflow-y: auto;
        padding: 20px 24px;
      }
      
      .education-modal__footer {
        padding: 16px 24px;
        border-top: 1px solid #e5e7eb;
        display: flex;
        justify-content: flex-end;
      }
      
      .education-section-compact {
        margin-bottom: 16px;
      }
      
      .education-section-compact p {
        margin: 0;
        color: #4b5563;
        line-height: 1.5;
        font-size: 14px;
      }
      
      .education-circles-compact {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 10px;
        margin-bottom: 16px;
      }
      
      .education-circle-item-compact {
        display: flex;
        gap: 10px;
        padding: 12px;
        background: #f9fafb;
        border-radius: 10px;
        border: 2px solid #e5e7eb;
      }
      
      .circle-badge-compact {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 13px;
        font-weight: 700;
        color: white;
        flex-shrink: 0;
      }
      
      .circle-badge-compact.inner {
        background: linear-gradient(135deg, #ef4444, #dc2626);
      }
      
      .circle-badge-compact.close {
        background: linear-gradient(135deg, #f59e0b, #d97706);
      }
      
      .circle-badge-compact.active {
        background: linear-gradient(135deg, #3b82f6, #2563eb);
      }
      
      .circle-badge-compact.casual {
        background: linear-gradient(135deg, #10b981, #059669);
      }
      
      .circle-info-compact {
        flex: 1;
        min-width: 0;
      }
      
      .circle-info-compact h4 {
        margin: 0 0 4px 0;
        font-size: 15px;
        font-weight: 700;
        color: #1f2937;
      }
      
      .circle-info-compact p {
        margin: 0 0 6px 0;
        color: #6b7280;
        line-height: 1.3;
        font-size: 12px;
      }
      
      .circle-info-compact p em {
        font-style: italic;
        color: #4b5563;
      }
      
      .circle-info-compact ul {
        margin: 0;
        padding-left: 16px;
        list-style-type: disc;
      }
      
      .circle-info-compact li {
        margin-bottom: 3px;
        color: #6b7280;
        font-size: 11px;
        line-height: 1.3;
      }
      
      .circle-info-compact li:last-child {
        margin-bottom: 0;
      }
      
      .education-features-compact {
        display: flex;
        flex-direction: column;
        gap: 10px;
        margin-bottom: 16px;
      }
      
      .feature-item-compact {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px;
        background: #f9fafb;
        border-radius: 8px;
      }
      
      .feature-icon-compact {
        font-size: 20px;
        flex-shrink: 0;
      }
      
      .feature-text-compact {
        flex: 1;
        font-size: 12px;
        line-height: 1.4;
        color: #4b5563;
      }
      
      .feature-text-compact strong {
        color: #1f2937;
        display: block;
        margin-bottom: 2px;
      }
      
      .education-features {
        display: flex;
        flex-direction: column;
        gap: 16px;
        margin-bottom: 32px;
      }
      
      .feature-item {
        display: flex;
        gap: 16px;
        padding: 16px;
        background: #f9fafb;
        border-radius: 12px;
      }
      
      .feature-icon {
        font-size: 32px;
        flex-shrink: 0;
      }
      
      .feature-content h4 {
        margin: 0 0 8px 0;
        font-size: 16px;
        font-weight: 700;
        color: #1f2937;
      }
      
      .feature-content p {
        margin: 0;
        color: #6b7280;
        font-size: 14px;
        line-height: 1.5;
      }
      
      .education-tips {
        padding: 20px;
        background: #fef3c7;
        border-radius: 12px;
        border-left: 4px solid #f59e0b;
      }
      
      .education-tips h3 {
        margin: 0 0 16px 0;
        font-size: 18px;
        font-weight: 700;
        color: #92400e;
      }
      
      .education-tips ul {
        margin: 0;
        padding-left: 20px;
      }
      
      .education-tips li {
        margin-bottom: 10px;
        color: #78350f;
        line-height: 1.6;
      }
      
      .education-tips li strong {
        color: #92400e;
      }
      
      /* Education tip in flow */
      .education-tip {
        display: flex;
        gap: 12px;
        padding: 16px;
        background: #eff6ff;
        border-radius: 12px;
        border-left: 4px solid #3b82f6;
        margin-bottom: 24px;
      }
      
      .education-tip__icon {
        font-size: 24px;
        flex-shrink: 0;
      }
      
      .education-tip__content {
        flex: 1;
        color: #1e40af;
        font-size: 14px;
        line-height: 1.6;
      }
      
      .education-tip__content strong {
        color: #1e3a8a;
      }
      
      .education-tip__learn-more {
        color: #2563eb;
        text-decoration: underline;
        cursor: pointer;
        font-weight: 600;
      }
      
      .education-tip__learn-more:hover {
        color: #1d4ed8;
      }
      
      /* Mobile responsive */
      @media (max-width: 768px) {
        .education-modal {
          max-width: 100%;
          border-radius: 12px;
          max-height: 92vh;
        }
        
        .education-modal__header {
          padding: 16px 20px;
        }
        
        .education-modal__header h2 {
          font-size: 18px;
        }
        
        .education-modal__content {
          padding: 16px 20px;
        }
        
        .education-section-compact p {
          font-size: 13px;
        }
        
        .education-circles-compact {
          grid-template-columns: 1fr;
          gap: 8px;
        }
        
        .education-circle-item-compact {
          padding: 10px;
        }
        
        .circle-badge-compact {
          width: 36px;
          height: 36px;
          font-size: 12px;
        }
        
        .circle-info-compact h4 {
          font-size: 14px;
        }
        
        .circle-info-compact p {
          font-size: 11px;
        }
        
        .circle-info-compact li {
          font-size: 10px;
        }
      }
    `;
    document.head.appendChild(style);
  }
}

// Initialize styles when script loads
if (typeof document !== 'undefined') {
  Step2CirclesHandler.initStyles();
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Step2CirclesHandler;
}
