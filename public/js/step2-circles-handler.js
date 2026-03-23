/**
 * Step 2: Circles Organization Handler
 * 
 * Handles Step 2 of the onboarding flow: organizing contacts into circles.
 * Extended to support both Circles and Groups contexts via ContextToggle.
 * Auto-triggers the Manage Circles flow when user navigates to the Circles tab.
 * 
 * Requirements: 3.1, 3.2, 5, 8.1, 8.2, 8.3, 9.3, 9.4, 10, 10.5, 12
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
    
    // Context state (Task 6.1, 6.3)
    this.activeContext = 'circles'; // 'circles' or 'groups'
    this.groups = [];
    this.contextToggle = null;
    // Context-keyed store for preserving unsaved state across context switches (Task 6.3)
    this.contextStateStore = {
      circles: { pendingAssignments: {}, scrollPosition: 0 },
      groups: { pendingAssignments: {}, scrollPosition: 0 }
    };
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
   * QuickStartFlow → QuickRefine (Smart Batching removed per Requirement 1.1)
   * Requirements: 3.2, 3.3, 3.4, 3.5, 5.1, 6.1, 7.1, 9.5
   * @param {string} [entryContext='circles'] - Entry context: 'circles' or 'groups' (Task 6.1)
   */
  async openManageCirclesFlow(entryContext = 'circles') {
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
      
      // Store the active context (Task 6.1)
      this.activeContext = entryContext || 'circles';
      
      // Fetch contacts
      await this.fetchContacts();
      
      // Fetch groups when entryContext is 'groups' (Task 6.1, Requirement 9.5)
      if (this.activeContext === 'groups') {
        await this.fetchGroups();
      }
      
      // Check saved mode preference (Requirement 5.9, 6.6)
      const savedMode = localStorage.getItem('circle-management-mode');
      // Map old mode names to new ones
      let initialMode = 'organize';
      if (savedMode === 'swipe') {
        initialMode = 'swipe';
      }
      
      // Create the modal container with mode toggle (Requirement 6.1)
      await this.createModalWithModeToggle(initialMode, this.activeContext, this.groups);
      
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
   * Fetch user groups from API (Task 6.1)
   * @returns {Promise<Array>} Array of group objects
   */
  async fetchGroups() {
    try {
      const userId = window.userId || localStorage.getItem('userId');
      const authToken = localStorage.getItem('authToken');
      
      if (!userId || !authToken) {
        console.warn('[Step2] User not authenticated, returning empty groups');
        this.groups = [];
        return;
      }
      
      const response = await fetch(`${window.API_BASE || '/api'}/groups-tags/groups`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      if (!response.ok) {
        console.warn('[Step2] Failed to fetch groups, status:', response.status);
        this.groups = [];
        return;
      }
      
      const data = await response.json();
      this.groups = data.groups || data || [];
      console.log(`[Step2] Loaded ${this.groups.length} groups`);
    } catch (error) {
      console.error('[Step2] Error fetching groups:', error);
      this.groups = [];
    }
  }
  
  /**
   * Create the modal container with mode toggle at the top
   * Requirements: 5.1, 5.2, 5.3, 5.4, 6.1, 6.2, 6.3, 6.4, 6.5, 12.3
   * @param {string} initialMode - Initial mode ('organize' or 'swipe')
   * @param {string} [entryContext='circles'] - Entry context: 'circles' or 'groups' (Task 6.2)
   * @param {Array} [groups=[]] - User groups array (Task 6.2)
   */
  async createModalWithModeToggle(initialMode, entryContext = 'circles', groups = []) {
    // Consistent modal title regardless of context
    const modalTitle = 'Organize Contacts';
    
    // Create container for the flow
    const container = document.createElement('div');
    container.id = 'onboarding-flow-container';
    container.className = 'manage-circles-overlay';
    container.setAttribute('role', 'dialog');
    container.setAttribute('aria-modal', 'true');
    container.setAttribute('aria-label', modalTitle);
    container.innerHTML = `
      <div class="manage-circles-modal">
        <div class="manage-circles__sticky-header">
          <div class="manage-circles__header">
            <h2 id="modal-title">${modalTitle}</h2>
            <div class="manage-circles__toggles-row">
              <div class="manage-circles__context-toggle-container" id="context-toggle-container"></div>
              <span class="manage-circles__toggle-divider"></span>
              <div class="manage-circles__mode-toggle-container" id="mode-toggle-container"></div>
            </div>
            <div class="manage-circles__header-actions">
              <button class="btn-secondary btn-sm" id="flow-skip">Skip</button>
              <button class="btn-primary btn-sm" id="flow-done">Done</button>
            </div>
          </div>
          <div class="manage-circles__progress-container" id="progress-indicator-container"></div>
          <div class="manage-circles__sticky-extras" id="sticky-extras-container"></div>
        </div>
        <div class="manage-circles__scrollable-content" id="mode-content-container"></div>
      </div>
    `;
    
    document.body.appendChild(container);
    
    // Add header button handlers
    const skipBtn = document.getElementById('flow-skip');
    if (skipBtn) {
      skipBtn.addEventListener('click', () => {
        this.handleSkip();
        this.closeFlow();
      });
    }
    
    const doneBtn = document.getElementById('flow-done');
    if (doneBtn) {
      doneBtn.addEventListener('click', () => this.handleFlowComplete());
    }
    
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
    
    // Initialize ContextToggle component (Task 6.2, Requirement 5.4)
    const contextToggleContainer = document.getElementById('context-toggle-container');
    if (typeof ContextToggle !== 'undefined' && contextToggleContainer) {
      this.contextToggle = new ContextToggle({
        defaultContext: entryContext,
        onContextChange: (newContext, previousContext) => this.handleContextChange(newContext, previousContext)
      });
      // Override localStorage restore — use the entryContext passed in
      this.contextToggle.context = entryContext;
      const toggleEl = this.contextToggle.render();
      contextToggleContainer.appendChild(toggleEl);
    } else {
      console.warn('[Step2] ContextToggle component not loaded');
    }
    
    // Initialize Mode Toggle component (Requirement 6.1, 6.2, 6.3)
    if (typeof ModeToggle !== 'undefined') {
      this.modeToggle = new ModeToggle({
        containerId: 'mode-toggle-container',
        defaultMode: initialMode,
        onModeChange: (newMode, previousMode) => this.handleModeChange(newMode, previousMode)
      });
      this.modeToggle.mount();
    } else {
      console.warn('[Step2] ModeToggle component not loaded, defaulting to AI-Assisted mode');
    }
    
    // Render initial progress indicator (Task 6.6)
    this.renderProgressIndicator();
    
    // Load the appropriate content based on mode and context
    await this.loadModeContent(initialMode);
    
    // Set up focus trapping within the modal (Task 6.7, Requirement 12.3)
    this.setupFocusTrap(container);
  }
  
  /**
   * Handle mode change from the toggle
   * Requirements: 6.4, 6.5, 6.8
   * @param {string} newMode - The new mode ('organize' or 'swipe')
   * @param {string} previousMode - The previous mode
   */
  async handleModeChange(newMode, previousMode) {
    console.log(`[Step2] Mode changed from ${previousMode} to ${newMode}`);
    
    // Clean up current mode components before switching (Requirement 6.8 - preserve progress)
    this.cleanupCurrentModeComponents();
    
    // Load the new mode content
    await this.loadModeContent(newMode);
  }
  
  /**
   * Clean up current mode components
   */
  cleanupCurrentModeComponents() {
    // Clean up Quick Start Flow
    if (this.quickStartFlow) {
      if (typeof this.quickStartFlow.destroy === 'function') {
        this.quickStartFlow.destroy();
      }
      this.quickStartFlow = null;
    }
    
    // Clean up Quick Refine Card
    if (this.quickRefineCard) {
      if (typeof this.quickRefineCard.destroy === 'function') {
        this.quickRefineCard.destroy();
      }
      this.quickRefineCard = null;
    }
    
    // Clean up Circle List View
    if (this.circleListView) {
      if (typeof this.circleListView.destroy === 'function') {
        this.circleListView.destroy();
      }
      this.circleListView = null;
    }
    
    // Clean up group-specific components
    if (this.groupCircleListView) {
      if (typeof this.groupCircleListView.destroy === 'function') {
        this.groupCircleListView.destroy();
      }
      this.groupCircleListView = null;
    }
    
    if (this.groupQuickRefineCard) {
      if (typeof this.groupQuickRefineCard.destroy === 'function') {
        this.groupQuickRefineCard.destroy();
      }
      this.groupQuickRefineCard = null;
    }
  }
  
  /**
   * Handle context change from ContextToggle (Task 6.3)
   * Swaps the mode content container between circles and groups views,
   * preserving any unsaved assignment state in a context-keyed store.
   * Requirements: 5.5, 5.6, 10.4
   * @param {string} newContext - 'circles' or 'groups'
   * @param {string} previousContext - The previous context
   */
  async handleContextChange(newContext, previousContext) {
    console.log(`[Step2] Context changed from ${previousContext} to ${newContext}`);
    
    // Preserve unsaved state from the previous context (Requirement 5.5)
    const contentContainer = document.getElementById('mode-content-container');
    if (contentContainer && previousContext) {
      this.contextStateStore[previousContext] = this.contextStateStore[previousContext] || {};
      this.contextStateStore[previousContext].scrollPosition = contentContainer.scrollTop || 0;
      // Preserve pending assignments from current components
      if (previousContext === 'circles') {
        this.contextStateStore.circles.pendingAssignments = { ...this.currentAssignments };
      } else if (previousContext === 'groups') {
        this.contextStateStore.groups.pendingAssignments = this.contextStateStore.groups.pendingAssignments || {};
      }
    }
    
    // Update active context
    this.activeContext = newContext;
    
    // Fetch groups if switching to groups context and not yet loaded
    if (newContext === 'groups' && this.groups.length === 0) {
      await this.fetchGroups();
    }
    
    // Clean up current mode components before switching
    this.cleanupCurrentModeComponents();
    
    // Determine current mode from ModeToggle
    let currentMode = 'organize';
    if (this.modeToggle && typeof this.modeToggle.getCurrentMode === 'function') {
      currentMode = this.modeToggle.getCurrentMode();
    }
    
    // Load content for the new context
    await this.loadModeContent(currentMode);
    
    // Restore scroll position for the new context
    if (contentContainer && this.contextStateStore[newContext]) {
      contentContainer.scrollTop = this.contextStateStore[newContext].scrollPosition || 0;
    }
  }
  
  /**
   * Load Group Organize Mode content with CircleListView in groups context (Task 6.4)
   * Mirrors the pattern of loadOrganizeModeContent() but with context: 'groups'
   * Requirements: 5.3, 6.1, 6.3, 6.4
   * @param {HTMLElement} contentContainer - Container to render into
   */
  async loadGroupOrganizeModeContent(contentContainer) {
    // Render education tip in sticky header area
    const stickyExtras = document.getElementById('sticky-extras-container');
    if (stickyExtras) {
      stickyExtras.innerHTML = `
        <div class="education-tip">
          <div class="education-tip__icon">👥</div>
          <div class="education-tip__content">
            <strong>Organize Your Groups:</strong> Your contacts are shown below organized by group.
            AI suggestions appear as dotted outlines — click ✓ to accept, or use search to find and add contacts.
            <a href="#" class="education-tip__learn-more" id="learn-more-groups-organize">Learn more about groups</a>
          </div>
        </div>
      `;
      const learnMoreBtn = document.getElementById('learn-more-groups-organize');
      if (learnMoreBtn) {
        learnMoreBtn.addEventListener('click', (e) => {
          e.preventDefault();
          this.showGroupsEducation();
        });
      }
    }
    
    contentContainer.innerHTML = `
      <div id="group-list-view-container"></div>
    `;
    
    // Initialize CircleListView with groups context
    if (typeof CircleListView !== 'undefined') {
      // Load keyboard shortcuts for group number display in search
      let keyboardShortcuts = {};
      try {
        const authToken = localStorage.getItem('authToken');
        const shortcutsResp = await fetch(`${window.API_BASE || '/api'}/users/preferences/keyboard-shortcuts`, {
          headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (shortcutsResp.ok) {
          const shortcutsData = await shortcutsResp.json();
          const savedValue = shortcutsData.value || {};
          // API stores { groupId: shortcutNumber } — use directly
          const keys = Object.keys(savedValue);
          const looksLikeGroupIdKeys = keys.length > 0 && keys.some(k => k.length > 1);
          if (looksLikeGroupIdKeys) {
            keyboardShortcuts = savedValue;
          } else {
            // Invert { shortcutNumber: groupId } to { groupId: shortcutNumber }
            for (const [key, groupId] of Object.entries(savedValue)) {
              keyboardShortcuts[groupId] = key;
            }
          }
        }
      } catch (e) {
        console.warn('[Step2] Could not load keyboard shortcuts for groups list view:', e);
      }
      
      // Auto-assign shortcuts if none saved
      if (Object.keys(keyboardShortcuts).length === 0 && this.groups.length > 0) {
        const limit = Math.min(this.groups.length, 10);
        for (let i = 0; i < limit; i++) {
          keyboardShortcuts[this.groups[i].id] = String(i);
        }
      }
      
      this.groupCircleListView = new CircleListView({
        containerId: 'group-list-view-container',
        userId: window.userId || localStorage.getItem('userId'),
        context: 'groups',
        groups: this.groups,
        keyboardShortcuts: keyboardShortcuts,
        onContactMove: async (contactId, groupId) => {
          await this.handleGroupAssignment(contactId, groupId);
        },
        onContactRemove: async (contactId, groupId) => {
          await this.handleGroupRemoval(contactId, groupId);
        },
        onSuggestionAccept: async (contactId, groupId) => {
          await this.handleGroupAssignment(contactId, groupId);
        },
        onSave: () => this.handleFlowComplete(),
        onCancel: () => {
          this.handleSkip();
          this.closeFlow();
        }
      });
      await this.groupCircleListView.mount();
    } else {
      console.error('[Step2] CircleListView component not loaded');
      contentContainer.innerHTML = `
        <div class="error-state">
          <p>Failed to load group organizer. Please refresh and try again.</p>
        </div>
      `;
    }
  }
  
  /**
   * Load Group Swipe Mode content with QuickRefineCard in groups context (Task 6.5)
   * Mirrors the pattern of loadSwipeModeContent() but with context: 'groups'
   * Requirements: 5.3, 7.1, 7.3, 7.4
   * @param {HTMLElement} contentContainer - Container to render into
   */
  async loadGroupSwipeModeContent(contentContainer) {
    // Render education tip in sticky header area
    const stickyExtras = document.getElementById('sticky-extras-container');
    if (stickyExtras) {
      stickyExtras.innerHTML = `
        <div class="education-tip">
          <div class="education-tip__icon">👆</div>
          <div class="education-tip__content">
            <strong>Swipe Mode (Groups):</strong> Quickly assign contacts to groups one at a time.
            Use number keys (0-9) for group shortcuts, S to skip, A to archive, D when done.
            <a href="#" class="education-tip__learn-more" id="learn-more-groups-swipe">Learn more</a>
          </div>
        </div>
      `;
      const learnMoreBtn = document.getElementById('learn-more-groups-swipe');
      if (learnMoreBtn) {
        learnMoreBtn.addEventListener('click', (e) => {
          e.preventDefault();
          this.showRefineEducation();
        });
      }
    }
    
    contentContainer.innerHTML = `
      <div id="group-quick-refine-container"><div class="loading-state"><div class="spinner"></div><p>Loading contacts...</p></div></div>
    `;
    
    // Check if QuickRefineCard component is available
    if (typeof QuickRefineCard === 'undefined') {
      console.error('[Step2] QuickRefineCard component not loaded');
      contentContainer.innerHTML = `
        <div class="error-state">
          <p>Swipe mode is not available. Please try another mode.</p>
        </div>
      `;
      return;
    }
    
    try {
      // Fetch contacts not in any group (ungrouped)
      const userId = window.userId || localStorage.getItem('userId');
      const authToken = localStorage.getItem('authToken');
      
      const response = await fetch(`${window.API_BASE || '/api'}/contacts?userId=${userId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch contacts');
      }
      
      const allContacts = await response.json();
      const ungrouped = allContacts.filter(c =>
        !c.archived_at && (!c.groups || c.groups.length === 0)
      );
      
      if (ungrouped.length === 0) {
        const container = document.getElementById('group-quick-refine-container');
        if (container) {
          container.innerHTML = `
            <div class="quick-refine-empty">
              <div class="quick-refine-empty-icon">🎉</div>
              <h3>All Done!</h3>
              <p>All your contacts are already organized into groups.</p>
              <button class="refine-btn refine-btn-done" id="group-swipe-mode-done">Continue</button>
            </div>
          `;
          const doneBtn = document.getElementById('group-swipe-mode-done');
          if (doneBtn) {
            doneBtn.addEventListener('click', () => this.handleFlowComplete());
          }
        }
        return;
      }
      
      // Load keyboard shortcuts from preferences
      let shortcuts = {};
      try {
        const shortcutsResp = await fetch(`${window.API_BASE || '/api'}/users/preferences/keyboard-shortcuts`, {
          headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (shortcutsResp.ok) {
          const shortcutsData = await shortcutsResp.json();
          const savedValue = shortcutsData.value || {};
          // API stores { groupId: shortcutNumber }, QuickRefineCard expects { shortcutNumber: groupId }
          // Detect format: if keys look like group IDs (not single digits), invert
          const keys = Object.keys(savedValue);
          const looksLikeGroupIdKeys = keys.length > 0 && keys.some(k => k.length > 1);
          if (looksLikeGroupIdKeys) {
            for (const [groupId, key] of Object.entries(savedValue)) {
              if (key !== '' && key !== undefined) {
                shortcuts[String(key)] = groupId;
              }
            }
          } else {
            shortcuts = savedValue;
          }
        }
      } catch (e) {
        console.warn('[Step2] Could not load keyboard shortcuts:', e);
      }
      
      // Auto-assign shortcuts if none saved yet
      if (Object.keys(shortcuts).length === 0 && this.groups.length > 0) {
        const limit = Math.min(this.groups.length, 10);
        for (let i = 0; i < limit; i++) {
          shortcuts[String(i)] = this.groups[i].id;
        }
      }
      
      // Render Quick Refine for groups
      const quickRefineContainer = document.getElementById('group-quick-refine-container');
      if (quickRefineContainer) {
        quickRefineContainer.innerHTML = '';
      }
      
      this.groupQuickRefineCard = new QuickRefineCard(ungrouped, {
        containerId: 'group-quick-refine-container',
        context: 'groups',
        groups: this.groups,
        shortcuts: shortcuts,
        onAssign: (contactId, groupId) => {
          console.log('[Step2] Group assigned:', contactId, groupId);
          this.handleGroupAssignment(contactId, groupId);
        },
        onDone: () => {
          console.log('[Step2] Group Swipe Mode: Done');
          this.handleFlowComplete();
        },
        onSkip: () => {
          console.log('[Step2] Group Swipe Mode: Skipped');
          this.handleFlowComplete();
        }
      });
      
      await this.groupQuickRefineCard.render();
      
    } catch (error) {
      console.error('[Step2] Error loading Group Swipe Mode:', error);
      const container = document.getElementById('group-quick-refine-container');
      if (container) {
        container.innerHTML = `
          <div class="error-state">
            <p>Failed to load contacts. Please try again.</p>
          </div>
        `;
      }
    }
  }
  
  /**
   * Handle group assignment (optimistic update) (Task 6.4, 6.5)
   * Requirements: 11.1
   * @param {string} contactId - Contact ID
   * @param {string} groupId - Group ID
   */
  async handleGroupAssignment(contactId, groupId) {
    try {
      const authToken = localStorage.getItem('authToken');
      const response = await fetch(`${window.API_BASE || '/api'}/contacts/${contactId}/groups/${groupId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to assign contact to group');
      }
      
      // Update progress indicator
      this.renderProgressIndicator();
      
    } catch (error) {
      console.error('[Step2] Error assigning contact to group:', error);
      if (typeof showToast === 'function') {
        showToast('Failed to save group assignment', 'error', {
          action: { label: 'Retry', callback: () => this.handleGroupAssignment(contactId, groupId) }
        });
      }
    }
  }
  
  /**
   * Handle group removal (optimistic update) (Task 6.4)
   * Requirements: 11.2
   * @param {string} contactId - Contact ID
   * @param {string} groupId - Group ID
   */
  async handleGroupRemoval(contactId, groupId) {
    try {
      const authToken = localStorage.getItem('authToken');
      const response = await fetch(`${window.API_BASE || '/api'}/contacts/${contactId}/groups/${groupId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to remove contact from group');
      }
      
      // Update progress indicator
      this.renderProgressIndicator();
      
    } catch (error) {
      console.error('[Step2] Error removing contact from group:', error);
      if (typeof showToast === 'function') {
        showToast('Failed to remove group assignment', 'error');
      }
    }
  }
  
  /**
   * Render context-aware progress indicator (Task 6.6)
   * Circles: "X/Y contacts in circles" with percentage bar (existing behavior)
   * Groups: "X contacts in groups" as simple count
   * Requirements: 10.1, 10.2, 10.3, 10.4
   */
  renderProgressIndicator() {
    const container = document.getElementById('progress-indicator-container');
    if (!container) return;
    
    if (this.activeContext === 'groups') {
      // Groups context: bar + percentage like circles (Requirement 10.2)
      const totalContacts = this.contacts.filter(c => !c.archived_at).length;
      const groupedContacts = this.contacts.filter(c =>
        !c.archived_at && c.groups && c.groups.length > 0
      ).length;
      const percentage = totalContacts > 0 ? Math.round((groupedContacts / totalContacts) * 100) : 0;
      
      container.innerHTML = `
        <div class="progress-indicator">
          <span class="progress-indicator__text">
            <strong>${groupedContacts}/${totalContacts}</strong> contacts in groups
          </span>
          <div class="progress-indicator__bar">
            <div class="progress-indicator__fill" style="width: ${percentage}%"></div>
          </div>
          <span class="progress-indicator__percentage">${percentage}%</span>
        </div>
      `;
    } else {
      // Circles context: percentage bar (Requirement 10.1, existing behavior)
      const totalContacts = this.contacts.filter(c => !c.archived_at).length;
      const categorized = this.contacts.filter(c =>
        !c.archived_at && (
          (c.circle && c.circle !== 'uncategorized') ||
          (c.dunbarCircle && c.dunbarCircle !== 'uncategorized')
        )
      ).length;
      const percentage = totalContacts > 0 ? Math.round((categorized / totalContacts) * 100) : 0;
      
      container.innerHTML = `
        <div class="progress-indicator progress-indicator--circles">
          <span class="progress-indicator__text">
            <strong>${categorized}/${totalContacts}</strong> contacts in circles
          </span>
          <div class="progress-indicator__bar">
            <div class="progress-indicator__fill" style="width: ${percentage}%"></div>
          </div>
          <span class="progress-indicator__percentage">${percentage}%</span>
        </div>
      `;
    }
  }
  
  /**
   * Set up focus trapping within the modal boundary (Task 6.7)
   * Tab/Shift+Tab cycle within modal elements.
   * Requirement: 12.3
   * @param {HTMLElement} overlayContainer - The modal overlay container
   */
  setupFocusTrap(overlayContainer) {
    if (!overlayContainer) return;
    
    // Remove any existing focus trap handler
    if (this._focusTrapHandler) {
      overlayContainer.removeEventListener('keydown', this._focusTrapHandler);
    }
    
    this._focusTrapHandler = (e) => {
      if (e.key !== 'Tab') return;
      
      const modal = overlayContainer.querySelector('.manage-circles-modal');
      if (!modal) return;
      
      // Get all focusable elements within the modal
      const focusableSelectors = [
        'a[href]',
        'button:not([disabled])',
        'input:not([disabled])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        '[tabindex]:not([tabindex="-1"])',
        '[role="tab"]'
      ].join(', ');
      
      const focusableElements = Array.from(modal.querySelectorAll(focusableSelectors))
        .filter(el => el.offsetParent !== null); // Only visible elements
      
      if (focusableElements.length === 0) return;
      
      const firstFocusable = focusableElements[0];
      const lastFocusable = focusableElements[focusableElements.length - 1];
      
      if (e.shiftKey) {
        // Shift+Tab: if on first element, wrap to last
        if (document.activeElement === firstFocusable || !modal.contains(document.activeElement)) {
          e.preventDefault();
          lastFocusable.focus();
        }
      } else {
        // Tab: if on last element, wrap to first
        if (document.activeElement === lastFocusable || !modal.contains(document.activeElement)) {
          e.preventDefault();
          firstFocusable.focus();
        }
      }
    };
    
    overlayContainer.addEventListener('keydown', this._focusTrapHandler);
    
    // Also close on Escape key
    this._escapeHandler = (e) => {
      if (e.key === 'Escape') {
        this.handleSkip();
        this.closeFlow();
      }
    };
    overlayContainer.addEventListener('keydown', this._escapeHandler);
    
    // Focus the first focusable element in the modal
    requestAnimationFrame(() => {
      const modal = overlayContainer.querySelector('.manage-circles-modal');
      if (modal) {
        const firstFocusable = modal.querySelector('button, [tabindex]:not([tabindex="-1"]), input, select, textarea, a[href], [role="tab"]');
        if (firstFocusable) {
          firstFocusable.focus();
        }
      }
    });
  }
  
  /**
   * Show groups education modal
   */
  showGroupsEducation() {
    this.showEducationModal('groups');
  }
  
  /**
   * Load content based on the selected mode and active context
   * Requirements: 5.2, 5.3, 6.4, 6.5
   * @param {string} mode - The mode to load ('organize' or 'swipe')
   */
  async loadModeContent(mode) {
    const contentContainer = document.getElementById('mode-content-container');
    if (!contentContainer) return;
    
    // Route to context-specific content (Task 6.4, 6.5)
    if (this.activeContext === 'groups') {
      if (mode === 'swipe') {
        await this.loadGroupSwipeModeContent(contentContainer);
      } else {
        await this.loadGroupOrganizeModeContent(contentContainer);
      }
    } else {
      // Default circles context — existing behavior unchanged (Task 6.8)
      if (mode === 'swipe') {
        await this.loadSwipeModeContent(contentContainer);
      } else {
        await this.loadOrganizeModeContent(contentContainer);
      }
    }
    
    // Update progress indicator after content loads (Task 6.6)
    this.renderProgressIndicator();
  }
  
  /**
   * Load unified Organize Mode content with CircleListView + AI Suggestions
   * Merges AI Suggestions and Manual Review into one view
   * @param {HTMLElement} contentContainer - Container to render into
   */
  async loadOrganizeModeContent(contentContainer) {
    // Render education tip in sticky header area
    const stickyExtras = document.getElementById('sticky-extras-container');
    if (stickyExtras) {
      stickyExtras.innerHTML = `
        <div class="education-tip">
          <div class="education-tip__icon">✨</div>
          <div class="education-tip__content">
            <strong>Organize Your Circles:</strong> Your contacts are shown below with AI suggestions (dotted outline).
            Click ✓ to accept a suggestion, or use the search bar to find and add contacts manually.
            <a href="#" class="education-tip__learn-more" id="learn-more-organize">Learn more about circles</a>
          </div>
        </div>
      `;
      const learnMoreBtn = document.getElementById('learn-more-organize');
      if (learnMoreBtn) {
        learnMoreBtn.addEventListener('click', (e) => {
          e.preventDefault();
          this.showCirclesEducation();
        });
      }
    }
    
    contentContainer.innerHTML = `
      <div id="circle-list-view-container"></div>
    `;
    
    // Fetch AI suggestions for Inner, Close, and Active circles
    const aiSuggestions = await this.fetchCircleSuggestions();
    
    // Initialize CircleListView component with AI suggestions
    if (typeof CircleListView !== 'undefined') {
      this.circleListView = new CircleListView({
        containerId: 'circle-list-view-container',
        userId: window.userId || localStorage.getItem('userId'),
        aiSuggestions: aiSuggestions, // Pass AI suggestions
        onContactMove: async (contactId, targetCircle) => {
          await this.handleContactAssigned(contactId, targetCircle);
        },
        onContactRemove: async (contactId) => {
          await this.handleContactAssigned(contactId, null);
        },
        onSuggestionAccept: async (contactId, circle) => {
          await this.handleContactAssigned(contactId, circle);
        },
        onSave: () => this.handleFlowComplete(),
        onCancel: () => {
          this.handleSkip();
          this.closeFlow();
        }
      });
      await this.circleListView.mount();
    } else {
      console.error('[Step2] CircleListView component not loaded');
      contentContainer.innerHTML = `
        <div class="error-state">
          <p>Failed to load circle organizer. Please refresh and try again.</p>
        </div>
      `;
    }
  }
  
  /**
   * Fetch AI suggestions for Inner, Close, and Active circles
   * @returns {Promise<Object>} Suggestions grouped by circle
   */
  async fetchCircleSuggestions() {
    try {
      const userId = window.userId || localStorage.getItem('userId');
      const authToken = localStorage.getItem('authToken');
      
      if (!userId || !authToken) {
        console.log('[Step2] No userId or authToken, returning empty suggestions');
        return { inner: [], close: [], active: [] };
      }
      
      console.log('[Step2] Fetching AI suggestions for userId:', userId);
      const response = await fetch(`/api/ai/circle-suggestions?userId=${userId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      if (!response.ok) {
        console.warn('[Step2] Failed to fetch AI suggestions, status:', response.status);
        return { inner: [], close: [], active: [] };
      }
      
      const data = await response.json();
      console.log('[Step2] AI suggestions response:', data);
      const suggestions = data.suggestions || { inner: [], close: [], active: [] };
      console.log('[Step2] Parsed suggestions:', suggestions);
      return suggestions;
    } catch (error) {
      console.error('[Step2] Error fetching AI suggestions:', error);
      return { inner: [], close: [], active: [] };
    }
  }
  
  /**
   * Load Manual Mode content with CircleListView
   * Requirements: 5.3, 5.4, 5.5, 5.6, 5.7, 6.4
   * @param {HTMLElement} contentContainer - Container to render into
   */
  async loadManualModeContent(contentContainer) {
    // Render education tip in sticky header area
    const stickyExtras = document.getElementById('sticky-extras-container');
    if (stickyExtras) {
      stickyExtras.innerHTML = `
        <div class="education-tip">
          <div class="education-tip__icon">📋</div>
          <div class="education-tip__content">
            <strong>Manual Review:</strong> Organize contacts by searching and assigning them to circles directly.
            Click on a contact chip to remove it, or use the search bar to find and add contacts.
            <a href="#" class="education-tip__learn-more" id="learn-more-manual">Learn more about circles</a>
          </div>
        </div>
      `;
      const learnMoreBtn = document.getElementById('learn-more-manual');
      if (learnMoreBtn) {
        learnMoreBtn.addEventListener('click', (e) => {
          e.preventDefault();
          this.showCirclesEducation();
        });
      }
    }
    
    contentContainer.innerHTML = `
      <div id="circle-list-view-container"></div>
    `;
    
    // Initialize CircleListView component
    if (typeof CircleListView !== 'undefined') {
      this.circleListView = new CircleListView({
        containerId: 'circle-list-view-container',
        userId: window.userId || localStorage.getItem('userId'),
        onContactMove: async (contactId, targetCircle) => {
          await this.handleContactAssigned(contactId, targetCircle);
        },
        onContactRemove: async (contactId) => {
          await this.handleContactAssigned(contactId, null);
        },
        onSave: () => this.handleFlowComplete(),
        onCancel: () => {
          this.handleSkip();
          this.closeFlow();
        }
      });
      await this.circleListView.mount();
    } else {
      console.error('[Step2] CircleListView component not loaded');
      contentContainer.innerHTML = `
        <div class="error-state">
          <p>Manual mode is not available. Please try AI Suggestions mode.</p>
        </div>
      `;
    }
  }
  
  /**
   * Load Swipe Mode content with QuickRefineCard
   * @param {HTMLElement} contentContainer - Container to render into
   */
  async loadSwipeModeContent(contentContainer) {
    // Render education tip in sticky header area
    const stickyExtras = document.getElementById('sticky-extras-container');
    if (stickyExtras) {
      stickyExtras.innerHTML = `
        <div class="education-tip">
          <div class="education-tip__icon">👆</div>
          <div class="education-tip__content">
            <strong>Swipe Mode:</strong> Quickly categorize contacts one at a time. Use keyboard shortcuts (1-4) to assign circles, S to skip, A to archive, D when done.
            <a href="#" class="education-tip__learn-more" id="learn-more-swipe">Learn more</a>
          </div>
        </div>
      `;
      const learnMoreBtn = document.getElementById('learn-more-swipe');
      if (learnMoreBtn) {
        learnMoreBtn.addEventListener('click', (e) => {
          e.preventDefault();
          this.showRefineEducation();
        });
      }
    }
    
    contentContainer.innerHTML = `
      <div id="quick-refine-container"><div class="loading-state"><div class="spinner"></div><p>Loading contacts...</p></div></div>
    `;
    
    // Check if QuickRefineCard component is available
    if (typeof QuickRefineCard === 'undefined') {
      console.error('QuickRefineCard component not loaded');
      contentContainer.innerHTML = `
        <div class="error-state">
          <p>Swipe mode is not available. Please try another mode.</p>
        </div>
      `;
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
        // All contacts categorized
        const quickRefineContainer = document.getElementById('quick-refine-container');
        if (quickRefineContainer) {
          quickRefineContainer.innerHTML = `
            <div class="quick-refine-empty">
              <div class="quick-refine-empty-icon">🎉</div>
              <h3>All Done!</h3>
              <p>All your contacts are already organized into circles.</p>
              <button class="refine-btn refine-btn-done" id="swipe-mode-done">Continue</button>
            </div>
          `;
          const doneBtn = document.getElementById('swipe-mode-done');
          if (doneBtn) {
            doneBtn.addEventListener('click', () => this.handleFlowComplete());
          }
        }
        return;
      }
      
      // Render Quick Refine
      const quickRefineContainer = document.getElementById('quick-refine-container');
      if (quickRefineContainer) {
        quickRefineContainer.innerHTML = '';
      }
      
      this.quickRefineCard = new QuickRefineCard(uncategorized, {
        containerId: 'quick-refine-container',
        onAssign: (contactId, circle) => {
          console.log('Contact assigned:', contactId, circle);
          this.handleContactAssigned(contactId, circle);
        },
        onDone: () => {
          console.log('Swipe Mode: Done');
          this.handleFlowComplete();
        },
        onSkip: () => {
          console.log('Swipe Mode: Skipped');
          this.handleFlowComplete();
        }
      });
      
      await this.quickRefineCard.render();
      
    } catch (error) {
      console.error('Error loading Swipe Mode:', error);
      const quickRefineContainer = document.getElementById('quick-refine-container');
      if (quickRefineContainer) {
        quickRefineContainer.innerHTML = `
          <div class="error-state">
            <p>Failed to load contacts. Please try again.</p>
          </div>
        `;
      }
    }
  }
  
  /**
   * Load AI-Assisted Mode content
   * Requirements: 3.2, 3.3, 3.4, 3.5, 6.5
   * @param {HTMLElement} contentContainer - Container to render into
   */
  async loadAIAssistedModeContent(contentContainer) {
    // Initialize tracking arrays for step indicator (Requirements 7.2, 7.3, 7.7)
    this.skippedSteps = [];
    this.completedSteps = [];
    
    // Check Inner Circle capacity (Requirements 3.1, 3.2, 3.3, 3.4, 3.5)
    const capacityInfo = await this.checkInnerCircleCapacity();
    
    if (capacityInfo.isFull) {
      // Inner Circle is at capacity (>= 10), show message
      contentContainer.innerHTML = `
        <div class="education-tip">
          <div class="education-tip__icon">✅</div>
          <div class="education-tip__content">
            <strong>Inner Circle Full:</strong> Your Inner Circle already has ${capacityInfo.count} contacts.
            You can use Manual Review mode to reorganize, or Swipe Mode to categorize remaining contacts.
          </div>
        </div>
        <div class="quick-refine-empty">
          <div class="quick-refine-empty-icon">🎉</div>
          <h3>Inner Circle Complete!</h3>
          <p>Your Inner Circle is at capacity. Switch to another mode to continue organizing.</p>
          <div class="quick-start-actions" style="margin-top: 2rem;">
            <button class="quick-start-btn btn-primary" id="ai-mode-done">Done</button>
          </div>
        </div>
      `;
      
      const doneBtn = document.getElementById('ai-mode-done');
      if (doneBtn) {
        doneBtn.addEventListener('click', () => this.handleFlowComplete());
      }
      return;
    }
    
    // Start with Quick Start Flow (with capacity limit for 8-9 contacts) (Requirement 3.5)
    await this.loadQuickStartContent(contentContainer, capacityInfo.remaining);
  }
  
  /**
   * Render dynamic step indicator with step names, checkmarks, and skip handling
   * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7
   * @param {number} currentStep - Current step number (1-based)
   * @param {number} totalSteps - Total number of steps
   * @param {Array<string>} skippedSteps - Array of skipped step names
   * @param {Array<string>} completedSteps - Array of completed step names
   * @returns {string} HTML for the step indicator
   */
  renderStepIndicator(currentStep, totalSteps, skippedSteps = [], completedSteps = []) {
    // Define all possible steps in the AI-Assisted flow
    const allSteps = [
      { id: 'quick-start', name: 'AI Quick Start', number: 1 },
      { id: 'quick-refine', name: 'Quick Refine', number: 2 }
    ];
    
    // Filter out skipped steps to get active steps
    const activeSteps = allSteps.filter(step => !skippedSteps.includes(step.id));
    
    // Recalculate step numbers based on active steps
    activeSteps.forEach((step, index) => {
      step.displayNumber = index + 1;
    });
    
    // Calculate actual total steps (excluding skipped)
    const actualTotalSteps = activeSteps.length;
    
    // Find the current step in active steps
    const currentStepIndex = currentStep - 1;
    const currentStepData = activeSteps[currentStepIndex];
    
    // Build the step indicator HTML
    const stepsHtml = activeSteps.map((step, index) => {
      const isCompleted = completedSteps.includes(step.id) || index < currentStepIndex;
      const isCurrent = index === currentStepIndex;
      const isUpcoming = index > currentStepIndex;
      
      let statusClass = '';
      let statusIcon = '';
      
      if (isCompleted) {
        statusClass = 'step-indicator__step--completed';
        statusIcon = '<span class="step-indicator__checkmark">✓</span>';
      } else if (isCurrent) {
        statusClass = 'step-indicator__step--current';
        statusIcon = `<span class="step-indicator__number">${step.displayNumber}</span>`;
      } else if (isUpcoming) {
        statusClass = 'step-indicator__step--upcoming';
        statusIcon = `<span class="step-indicator__number">${step.displayNumber}</span>`;
      }
      
      return `
        <div class="step-indicator__step ${statusClass}">
          <div class="step-indicator__icon-wrapper">
            ${statusIcon}
          </div>
          <span class="step-indicator__name">${step.name}</span>
        </div>
        ${index < activeSteps.length - 1 ? '<div class="step-indicator__connector"></div>' : ''}
      `;
    }).join('');
    
    // Add skipped steps indicator if any steps were skipped
    let skippedIndicator = '';
    if (skippedSteps.length > 0) {
      const skippedNames = allSteps
        .filter(step => skippedSteps.includes(step.id))
        .map(step => step.name)
        .join(', ');
      skippedIndicator = `
        <div class="step-indicator__skipped-notice">
          <span class="step-indicator__skipped-icon">⏭️</span>
          <span class="step-indicator__skipped-text">Skipped: ${skippedNames}</span>
        </div>
      `;
    }
    
    return `
      <div class="step-indicator-enhanced">
        <div class="step-indicator__steps">
          ${stepsHtml}
        </div>
        ${skippedIndicator}
      </div>
    `;
  }
  
  /**
   * Load Quick Start content into the container
   * @param {HTMLElement} contentContainer - Container to render into
   * @param {number} remainingCapacity - Remaining Inner Circle capacity
   */
  async loadQuickStartContent(contentContainer, remainingCapacity = 10) {
    // Track that Quick Start is not skipped
    this.skippedSteps = this.skippedSteps || [];
    this.completedSteps = this.completedSteps || [];
    
    contentContainer.innerHTML = `
      <div class="education-tip">
        <div class="education-tip__icon">💡</div>
        <div class="education-tip__content">
          <strong>Understanding Circles:</strong> Based on Dunbar's number research, humans naturally maintain relationships in layers. 
          Your <strong>Inner Circle</strong> (~5 people) includes your closest relationships - those you see or talk to weekly.
          ${remainingCapacity < 10 ? `<br><em>Note: You have room for ${remainingCapacity} more contact${remainingCapacity === 1 ? '' : 's'} in your Inner Circle.</em>` : ''}
          <a href="#" class="education-tip__learn-more" id="learn-more-circles">Learn more about circles</a>
        </div>
      </div>
      <div id="quick-start-container"></div>
    `;
    
    // Add learn more handler
    const learnMoreBtn = document.getElementById('learn-more-circles');
    if (learnMoreBtn) {
      learnMoreBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.showCirclesEducation();
      });
    }
    
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
      maxSuggestions: remainingCapacity,
      onAcceptAll: (contactIds, circle) => {
        console.log('Quick Start: Accept All', contactIds, circle);
        this.handleQuickStartComplete(contactIds);
      },
      onReview: () => {
        console.log('Quick Start: Review mode activated');
      },
      onSkip: () => {
        console.log('Quick Start: Skipped');
        this.handleFlowComplete();
      },
      onComplete: (result) => {
        console.log('Quick Start: Complete', result);
        this.handleFlowComplete();
      }
    });
    
    await this.quickStartFlow.render();
  }
  
  /**
   * Transition from Quick Start to completion
   * @deprecated Quick Refine is now a separate mode (Swipe Mode)
   */
  async transitionToQuickRefine() {
    // Quick Refine is now accessed via Swipe Mode toggle
    // Just complete the AI Suggestions flow
    await this.handleFlowComplete();
  }
  
  /**
   * Open Manual Mode for circle management (legacy method - now handled by mode toggle)
   * Requirements: 5.3, 5.9, 6.4
   * @deprecated Use createModalWithModeToggle() with 'manual' mode instead
   */
  async openManualMode() {
    // This method is now deprecated - mode switching is handled by the mode toggle
    // Redirect to the new modal with mode toggle
    await this.createModalWithModeToggle('manual');
    this.setupEventListeners();
  }
  
  /**
   * Check if Inner Circle is at capacity
   * Returns capacity information for the Inner Circle
   * Requirements: 3.1
   * @returns {Promise<{count: number, capacity: number, isFull: boolean, remaining: number}>}
   */
  async checkInnerCircleCapacity() {
    try {
      const userId = window.userId || localStorage.getItem('userId');
      const authToken = localStorage.getItem('authToken');
      
      if (!userId || !authToken) {
        console.warn('[Step2] User not authenticated, returning default capacity');
        return { count: 0, capacity: 10, isFull: false, remaining: 10 };
      }
      
      const response = await fetch(`/api/contacts/circle-counts?userId=${userId}`, {
        headers: { 
          'Authorization': `Bearer ${authToken}` 
        }
      });
      
      if (!response.ok) {
        console.warn('[Step2] Failed to fetch circle counts, returning default capacity');
        return { count: 0, capacity: 10, isFull: false, remaining: 10 };
      }
      
      const data = await response.json();
      const innerCount = data.inner || 0;
      const capacity = 10; // Dunbar's Inner Circle capacity
      
      return {
        count: innerCount,
        capacity,
        isFull: innerCount >= capacity,
        remaining: Math.max(0, capacity - innerCount)
      };
    } catch (error) {
      console.error('Error checking Inner Circle capacity:', error);
      return { count: 0, capacity: 10, isFull: false, remaining: 10 };
    }
  }
  
  /**
   * Start the Quick Start Flow (Step 1 of new flow)
   * Requirements: 3.5, 5.1, 5.6, 5.7, 5.8, 5.9, 19.1, 19.2
   * @param {number} [remainingCapacity=10] - Remaining Inner Circle capacity (for 8-9 contacts case)
   * @deprecated Use createModalWithModeToggle() instead - this method is kept for backward compatibility
   */
  async startQuickStartFlow(remainingCapacity = 10) {
    // If modal doesn't exist, create it with mode toggle
    const existingContainer = document.getElementById('onboarding-flow-container');
    if (!existingContainer) {
      await this.createModalWithModeToggle('ai-assisted');
      return;
    }
    
    // If modal exists, just load the Quick Start content
    const contentContainer = document.getElementById('mode-content-container');
    if (contentContainer) {
      await this.loadQuickStartContent(contentContainer, remainingCapacity);
    }
  }
  
  /**
   * Handle Quick Start completion
   * Requirements: 5.10, 1.1, 1.2
   */
  async handleQuickStartComplete(assignedContactIds) {
    // Update progress
    this.updateProgress();
    
    // Complete the flow - user can switch to Swipe Mode if they want to continue
    await this.handleFlowComplete();
  }
  
  // NOTE: startBatchSuggestionsFlow() and handleBatchAccepted() methods removed
  // per Requirements 1.1, 1.4 - Smart Batching step eliminated from the flow
  // Flow now proceeds directly from AI Quick Start to Quick Refine

  /**
   * Start the Quick Refine Flow (now Swipe Mode)
   * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 19.1, 19.4
   * @deprecated Use mode toggle to switch to 'swipe' mode instead
   */
  async startQuickRefineFlow() {
    // If modal doesn't exist, create it with mode toggle and go to Swipe Mode
    const existingContainer = document.getElementById('onboarding-flow-container');
    if (!existingContainer) {
      await this.createModalWithModeToggle('swipe');
      return;
    }
    
    // If modal exists, switch to swipe mode
    if (this.modeToggle && typeof this.modeToggle.setMode === 'function') {
      this.modeToggle.setMode('swipe');
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
    
    // Remove focus trap handlers before removing container
    if (container) {
      if (this._focusTrapHandler) {
        container.removeEventListener('keydown', this._focusTrapHandler);
        this._focusTrapHandler = null;
      }
      if (this._escapeHandler) {
        container.removeEventListener('keydown', this._escapeHandler);
        this._escapeHandler = null;
      }
    }
    
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
    
    // Restore body scroll
    document.body.style.overflow = '';
    
    // Clean up ContextToggle component (Task 6.2)
    if (this.contextToggle) {
      if (typeof this.contextToggle.destroy === 'function') {
        this.contextToggle.destroy();
      }
      this.contextToggle = null;
    }
    
    // Clean up Mode Toggle component
    if (this.modeToggle) {
      if (typeof this.modeToggle.destroy === 'function') {
        this.modeToggle.destroy();
      }
      this.modeToggle = null;
    }
    
    // Clean up Quick Start Flow
    if (this.quickStartFlow) {
      if (typeof this.quickStartFlow.destroy === 'function') {
        this.quickStartFlow.destroy();
      }
      this.quickStartFlow = null;
    }
    
    // NOTE: batchCards cleanup removed - Smart Batching eliminated per Requirement 1.4
    
    // Clean up Quick Refine Card
    if (this.quickRefineCard) {
      if (typeof this.quickRefineCard.destroy === 'function') {
        this.quickRefineCard.destroy();
      }
      this.quickRefineCard = null;
    }
    
    // Clean up Circle List View
    if (this.circleListView) {
      if (typeof this.circleListView.destroy === 'function') {
        this.circleListView.destroy();
      }
      this.circleListView = null;
    }
    
    // Clean up group-specific components (Task 6.4, 6.5)
    if (this.groupCircleListView) {
      if (typeof this.groupCircleListView.destroy === 'function') {
        this.groupCircleListView.destroy();
      }
      this.groupCircleListView = null;
    }
    
    if (this.groupQuickRefineCard) {
      if (typeof this.groupQuickRefineCard.destroy === 'function') {
        this.groupQuickRefineCard.destroy();
      }
      this.groupQuickRefineCard = null;
    }
    
    // Reset context state store
    this.contextStateStore = {
      circles: { pendingAssignments: {}, scrollPosition: 0 },
      groups: { pendingAssignments: {}, scrollPosition: 0 }
    };
    
    // Trigger visualization refresh
    this.refreshVisualization();
  }
  
  /**
   * Refresh the circles visualization after modal closes
   */
  refreshVisualization() {
    // Dispatch custom event for visualization refresh
    window.dispatchEvent(new CustomEvent('contacts-updated'));
    
    // Also try to refresh the circular visualizer directly if available
    if (typeof window.circularVisualizer !== 'undefined' && window.circularVisualizer) {
      if (typeof window.circularVisualizer.refresh === 'function') {
        window.circularVisualizer.refresh();
      } else if (typeof window.circularVisualizer.loadContacts === 'function') {
        window.circularVisualizer.loadContacts();
      }
    }
    
    // Try refreshing via the app's refresh mechanism
    if (typeof refreshContacts === 'function') {
      refreshContacts();
    }
    
    console.log('[Step2] Triggered visualization refresh');
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
      if (window.onboardingIndicator && window.onboardingIndicator.state) {
        const currentState = window.onboardingIndicator.state;
        if (currentState.steps && currentState.steps.groups) {
          currentState.steps.groups.complete = true;
          window.onboardingIndicator.updateState(currentState);
        }
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
      // NOTE: 'batching' education content removed per Requirement 1.4, 1.5
      // Smart Batching UI components have been eliminated from the flow
      groups: {
        title: 'Understanding Groups',
        html: `
          <div class="education-section-compact">
            <p><strong>Organize by Groups:</strong> Groups are custom collections you define — like "Book Club", "Work Team", or "Neighbors". A contact can belong to multiple groups.</p>
          </div>
          
          <div class="education-features-compact">
            <div class="feature-item-compact">
              <span class="feature-icon-compact">👥</span>
              <div class="feature-text-compact">
                <strong>Custom Groups:</strong> Create groups that match how you think about your contacts
              </div>
            </div>
            
            <div class="feature-item-compact">
              <span class="feature-icon-compact">🤖</span>
              <div class="feature-text-compact">
                <strong>AI Suggestions:</strong> We suggest groups based on your Google contacts, interactions, and shared events
              </div>
            </div>
            
            <div class="feature-item-compact">
              <span class="feature-icon-compact">🔢</span>
              <div class="feature-text-compact">
                <strong>Keyboard Shortcuts:</strong> Assign number keys (0-9) to groups for fast swipe-mode assignment
              </div>
            </div>
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
  
  // NOTE: showBatchingEducation() method removed per Requirement 1.4
  // Smart Batching UI components have been eliminated from the flow
  
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
      
      /* ============================================================================
         PROGRESS INDICATOR (Task 6.6)
         Context-aware progress display
         Requirements: 10.1, 10.2, 10.3, 10.4
         ============================================================================ */
      
      .manage-circles__progress-container {
        padding: 0;
        margin-bottom: 0;
      }
      
      .progress-indicator {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 16px;
        background: var(--bg-secondary, #f9fafb);
        border-radius: 10px;
        font-size: 13px;
        color: var(--text-secondary, #6b7280);
      }
      
      .progress-indicator__text {
        white-space: nowrap;
      }
      
      .progress-indicator__text strong {
        color: var(--text-primary, #1f2937);
        font-weight: 700;
      }
      
      .progress-indicator__bar {
        flex: 1;
        height: 6px;
        background: var(--border-subtle, #e5e7eb);
        border-radius: 3px;
        overflow: hidden;
        min-width: 80px;
      }
      
      .progress-indicator__fill {
        height: 100%;
        background: linear-gradient(90deg, #fb923c, #f97316);
        border-radius: 3px;
        transition: width 0.3s ease;
      }
      
      .progress-indicator__percentage {
        font-weight: 600;
        color: var(--accent-primary, #fb923c);
        min-width: 36px;
        text-align: right;
      }
      
      .progress-indicator--groups {
        /* Same layout as circles */
      }
      
      /* ============================================================================
         CONTEXT TOGGLE CONTAINER (Task 6.2)
         Positioned in header between title and mode toggle
         ============================================================================ */
      
      .manage-circles__context-toggle-container {
        flex: 0 0 auto;
        display: flex;
        align-items: center;
        overflow: hidden;
        border-radius: 8px;
      }
      
      .manage-circles__toggles-row {
        display: flex;
        align-items: center;
        gap: 0;
        flex: 0 1 auto;
        min-width: 0;
        background: var(--bg-secondary, #f5f5f4);
        border-radius: 10px;
        padding: 3px;
      }
      
      .manage-circles__toggle-divider {
        width: 1px;
        height: 24px;
        background: var(--border-subtle, #d1d5db);
        flex-shrink: 0;
        margin: 0 2px;
        display: block;
        z-index: 5;
        position: relative;
      }
      
      /* Unified sizing for both toggles inside the row */
      .manage-circles__toggles-row .context-toggle,
      .manage-circles__toggles-row .mode-toggle {
        background: transparent;
        border-radius: 8px;
        padding: 0;
        margin-bottom: 0;
        max-width: none;
        width: auto;
      }
      
      .manage-circles__toggles-row .context-toggle__option,
      .manage-circles__toggles-row .mode-toggle__option {
        padding: 6px 12px;
        font-size: 13px;
        min-height: 34px;
        gap: 5px;
      }
      
      .manage-circles__toggles-row .context-toggle__icon,
      .manage-circles__toggles-row .mode-toggle__icon {
        font-size: 13px;
      }
      
      .manage-circles__toggles-row .context-toggle__slider,
      .manage-circles__toggles-row .mode-toggle__slider {
        top: 0;
        height: 100%;
      }
      
      .manage-circles__mode-toggle-container {
        flex: 0 0 auto;
        overflow: hidden;
        border-radius: 8px;
      }
      
      /* Sticky extras area for education tip */
      .manage-circles__sticky-extras {
        margin-top: 8px;
      }
      
      .manage-circles__sticky-extras:empty {
        display: none;
        margin-top: 0;
      }
      
      .manage-circles__sticky-extras .education-tip {
        margin-bottom: 0;
      }
      
      .manage-circles__header {
        flex-wrap: nowrap;
        gap: 8px;
      }
      
      @media (max-width: 768px) {
        .manage-circles__toggles-row {
          order: 3;
          width: 100%;
          flex-wrap: wrap;
          gap: 0;
        }
        
        .manage-circles__toggle-divider {
          width: 100%;
          height: 1px;
          margin: 2px 0;
        }
        
        .manage-circles__header {
          flex-wrap: wrap;
        }
        
        .manage-circles__context-toggle-container {
          flex: 1;
        }
        
        .manage-circles__mode-toggle-container {
          flex: 1;
        }
        
        .manage-circles__progress-container {
          padding: 0 16px;
        }
        
        .progress-indicator {
          padding: 8px 12px;
          font-size: 12px;
          gap: 8px;
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
