/**
 * Accessibility Enhancements for Contact Onboarding
 * 
 * Provides comprehensive accessibility improvements including:
 * - ARIA labels for all interactive elements
 * - Keyboard navigation for circular visualization
 * - Screen reader support
 * - Focus indicators for keyboard users
 * - Color contrast improvements
 * 
 * Requirements: All UI requirements (accessibility is cross-cutting)
 */

class AccessibilityEnhancements {
  constructor() {
    this.focusableElements = [];
    this.currentFocusIndex = -1;
    this.keyboardNavigationEnabled = false;
    this.announcer = null;
    
    this.init();
  }

  /**
   * Initialize accessibility enhancements
   */
  init() {
    this.setupScreenReaderAnnouncer();
    this.setupKeyboardNavigation();
    this.setupFocusManagement();
    this.enhanceExistingElements();
    this.setupStyles();
    
    // Listen for dynamic content changes
    this.observeDOMChanges();
  }

  /**
   * Set up screen reader announcer
   */
  setupScreenReaderAnnouncer() {
    // Create live region for announcements
    this.announcer = document.createElement('div');
    this.announcer.setAttribute('role', 'status');
    this.announcer.setAttribute('aria-live', 'polite');
    this.announcer.setAttribute('aria-atomic', 'true');
    this.announcer.className = 'sr-only';
    document.body.appendChild(this.announcer);
  }

  /**
   * Announce message to screen readers
   * @param {string} message - Message to announce
   * @param {string} priority - 'polite' or 'assertive'
   */
  announce(message, priority = 'polite') {
    if (!this.announcer) return;
    
    this.announcer.setAttribute('aria-live', priority);
    this.announcer.textContent = '';
    
    // Small delay to ensure screen readers pick up the change
    setTimeout(() => {
      this.announcer.textContent = message;
    }, 100);
  }

  /**
   * Set up keyboard navigation
   */
  setupKeyboardNavigation() {
    document.addEventListener('keydown', (e) => {
      // Enable keyboard navigation mode on Tab
      if (e.key === 'Tab') {
        this.keyboardNavigationEnabled = true;
        document.body.classList.add('keyboard-navigation');
      }
      
      // Handle arrow key navigation in circular visualizer
      if (this.keyboardNavigationEnabled && document.activeElement) {
        this.handleArrowKeyNavigation(e);
      }
      
      // Handle Enter/Space for activation
      if ((e.key === 'Enter' || e.key === ' ') && document.activeElement) {
        this.handleActivation(e);
      }
      
      // Escape to close modals/overlays
      if (e.key === 'Escape') {
        this.handleEscape(e);
      }
    });

    // Disable keyboard navigation mode on mouse use
    document.addEventListener('mousedown', () => {
      this.keyboardNavigationEnabled = false;
      document.body.classList.remove('keyboard-navigation');
    });
  }

  /**
   * Handle arrow key navigation
   * @param {KeyboardEvent} e - Keyboard event
   */
  handleArrowKeyNavigation(e) {
    const activeElement = document.activeElement;
    
    // Navigation in circular visualizer
    if (activeElement.closest('.contact-dot')) {
      e.preventDefault();
      this.navigateContactDots(e.key);
      return;
    }
    
    // Navigation in circle rings
    if (activeElement.closest('.circle-ring')) {
      e.preventDefault();
      this.navigateCircleRings(e.key);
      return;
    }
    
    // Navigation in button groups
    if (activeElement.closest('.circle-buttons, .group-filters')) {
      this.navigateButtonGroup(e);
    }
  }

  /**
   * Navigate between contact dots using arrow keys
   * @param {string} key - Arrow key pressed
   */
  navigateContactDots(key) {
    const allDots = Array.from(document.querySelectorAll('.contact-dot'));
    const currentIndex = allDots.findIndex(dot => dot.contains(document.activeElement));
    
    if (currentIndex === -1) return;
    
    let nextIndex = currentIndex;
    
    switch (key) {
      case 'ArrowRight':
      case 'ArrowDown':
        nextIndex = (currentIndex + 1) % allDots.length;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        nextIndex = (currentIndex - 1 + allDots.length) % allDots.length;
        break;
    }
    
    if (nextIndex !== currentIndex) {
      allDots[nextIndex].focus();
      this.announceContactFocus(allDots[nextIndex]);
    }
  }

  /**
   * Navigate between circle rings using arrow keys
   * @param {string} key - Arrow key pressed
   */
  navigateCircleRings(key) {
    const allRings = Array.from(document.querySelectorAll('.circle-ring'));
    const currentIndex = allRings.findIndex(ring => ring === document.activeElement);
    
    if (currentIndex === -1) return;
    
    let nextIndex = currentIndex;
    
    switch (key) {
      case 'ArrowRight':
      case 'ArrowDown':
        nextIndex = Math.min(currentIndex + 1, allRings.length - 1);
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        nextIndex = Math.max(currentIndex - 1, 0);
        break;
    }
    
    if (nextIndex !== currentIndex) {
      allRings[nextIndex].focus();
      this.announceCircleFocus(allRings[nextIndex]);
    }
  }

  /**
   * Navigate within button groups
   * @param {KeyboardEvent} e - Keyboard event
   */
  navigateButtonGroup(e) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    
    const group = e.target.closest('.circle-buttons, .group-filters');
    const buttons = Array.from(group.querySelectorAll('button:not([disabled])'));
    const currentIndex = buttons.indexOf(e.target);
    
    if (currentIndex === -1) return;
    
    e.preventDefault();
    
    let nextIndex = currentIndex;
    if (e.key === 'ArrowRight') {
      nextIndex = (currentIndex + 1) % buttons.length;
    } else if (e.key === 'ArrowLeft') {
      nextIndex = (currentIndex - 1 + buttons.length) % buttons.length;
    }
    
    buttons[nextIndex].focus();
  }

  /**
   * Handle Enter/Space activation
   * @param {KeyboardEvent} e - Keyboard event
   */
  handleActivation(e) {
    const target = e.target;
    
    // Contact dot activation
    if (target.closest('.contact-dot')) {
      e.preventDefault();
      target.click();
      return;
    }
    
    // Circle ring activation (for info display)
    if (target.classList.contains('circle-ring')) {
      e.preventDefault();
      this.showCircleInfo(target);
      return;
    }
  }

  /**
   * Handle Escape key
   * @param {KeyboardEvent} e - Keyboard event
   */
  handleEscape(e) {
    // Close modals
    const modal = document.querySelector('.modal-overlay');
    if (modal) {
      modal.remove();
      this.announce('Dialog closed');
      return;
    }
    
    // Close tooltips
    const tooltip = document.querySelector('.contact-tooltip');
    if (tooltip) {
      tooltip.remove();
      return;
    }
    
    // Clear selection
    if (window.circularVisualizer && window.circularVisualizer.selectedContacts.size > 0) {
      window.circularVisualizer.clearSelection();
      this.announce('Selection cleared');
    }
  }

  /**
   * Set up focus management
   */
  setupFocusManagement() {
    // Trap focus in modals
    document.addEventListener('focusin', (e) => {
      const modal = document.querySelector('.modal-overlay');
      if (modal && !modal.contains(e.target)) {
        const focusable = modal.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length > 0) {
          focusable[0].focus();
        }
      }
    });
  }

  /**
   * Enhance existing elements with accessibility attributes
   */
  enhanceExistingElements() {
    // Run enhancement on page load
    setTimeout(() => {
      this.enhanceCircularVisualizer();
      this.enhanceOnboardingController();
      this.enhanceAISuggestionUI();
      this.enhancePreferenceSettingUI();
      this.enhanceGamificationUI();
      this.enhanceWeeklyCatchupUI();
      this.enhanceUncategorizedTracker();
    }, 500);
  }

  /**
   * Enhance circular visualizer with accessibility
   */
  enhanceCircularVisualizer() {
    // Add ARIA labels to SVG
    const svg = document.querySelector('.visualizer-svg');
    if (svg) {
      svg.setAttribute('role', 'application');
      svg.setAttribute('aria-label', 'Contact organization visualization');
      svg.setAttribute('aria-describedby', 'visualizer-instructions');
      
      // Add instructions
      const instructions = document.createElement('div');
      instructions.id = 'visualizer-instructions';
      instructions.className = 'sr-only';
      instructions.textContent = 'Use Tab to navigate between contacts, arrow keys to move between contacts, Enter to select, and drag to move contacts between circles.';
      svg.parentElement.insertBefore(instructions, svg);
    }
    
    // Enhance circle rings
    document.querySelectorAll('.circle-ring').forEach((ring, index) => {
      const circleId = ring.getAttribute('data-circle');
      const circleName = this.getCircleName(circleId);
      
      ring.setAttribute('role', 'button');
      ring.setAttribute('tabindex', '0');
      ring.setAttribute('aria-label', `${circleName} circle. Press Enter for information.`);
    });
    
    // Enhance contact dots
    document.querySelectorAll('.contact-dot').forEach(dot => {
      const contactId = dot.getAttribute('data-contact-id');
      const contactName = this.getContactName(contactId);
      const circle = this.getContactCircle(contactId);
      
      dot.setAttribute('role', 'button');
      dot.setAttribute('tabindex', '0');
      dot.setAttribute('aria-label', `${contactName}, in ${this.getCircleName(circle)}. Press Enter to select, or drag to move.`);
      dot.setAttribute('aria-grabbed', 'false');
    });
    
    // Enhance legend
    document.querySelectorAll('.legend-item').forEach(item => {
      const circleId = item.getAttribute('data-circle');
      const circleName = this.getCircleName(circleId);
      
      item.setAttribute('role', 'button');
      item.setAttribute('tabindex', '0');
      item.setAttribute('aria-label', `${circleName} legend item. Press Enter to highlight circle.`);
    });
    
    // Enhance group filters
    document.querySelectorAll('.group-filter-btn').forEach(btn => {
      const groupId = btn.getAttribute('data-group-id');
      const isActive = btn.classList.contains('active');
      
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
  }

  /**
   * Enhance onboarding controller with accessibility
   */
  enhanceOnboardingController() {
    // Add ARIA labels to progress indicators
    const progressBar = document.querySelector('.preference-progress-bar, .progress-bar');
    if (progressBar) {
      const fill = progressBar.querySelector('.preference-progress-fill, .progress-fill');
      if (fill) {
        const percent = fill.style.width;
        progressBar.setAttribute('role', 'progressbar');
        progressBar.setAttribute('aria-valuenow', parseInt(percent) || 0);
        progressBar.setAttribute('aria-valuemin', '0');
        progressBar.setAttribute('aria-valuemax', '100');
        progressBar.setAttribute('aria-label', 'Onboarding progress');
      }
    }
    
    // Enhance navigation buttons
    document.querySelectorAll('[id*="preference-"], [id*="onboarding-"]').forEach(btn => {
      if (btn.tagName === 'BUTTON' && !btn.hasAttribute('aria-label')) {
        const text = btn.textContent.trim();
        if (text) {
          btn.setAttribute('aria-label', text);
        }
      }
    });
  }

  /**
   * Enhance AI suggestion UI with accessibility
   */
  enhanceAISuggestionUI() {
    // Enhance confidence indicators
    document.querySelectorAll('.confidence-bar').forEach(bar => {
      const fill = bar.querySelector('.confidence-fill');
      if (fill) {
        const width = fill.style.width;
        const percent = parseInt(width) || 0;
        
        bar.setAttribute('role', 'meter');
        bar.setAttribute('aria-valuenow', percent);
        bar.setAttribute('aria-valuemin', '0');
        bar.setAttribute('aria-valuemax', '100');
        bar.setAttribute('aria-label', `AI confidence: ${percent}%`);
      }
    });
    
    // Enhance suggestion buttons
    const acceptBtn = document.getElementById('accept-suggestion-btn');
    if (acceptBtn) {
      acceptBtn.setAttribute('aria-label', 'Accept AI suggestion');
    }
    
    const overrideBtn = document.getElementById('override-suggestion-btn');
    if (overrideBtn) {
      overrideBtn.setAttribute('aria-label', 'Choose different circle');
    }
    
    // Enhance alternative options
    document.querySelectorAll('.ai-suggestion-alternative').forEach(alt => {
      const circleName = alt.querySelector('.ai-suggestion-alternative-name')?.textContent;
      if (circleName) {
        alt.setAttribute('role', 'button');
        alt.setAttribute('tabindex', '0');
        alt.setAttribute('aria-label', `Select ${circleName} as alternative`);
      }
    });
  }

  /**
   * Enhance preference setting UI with accessibility
   */
  enhancePreferenceSettingUI() {
    // Enhance radio button groups
    document.querySelectorAll('.preference-options').forEach(group => {
      group.setAttribute('role', 'radiogroup');
      group.setAttribute('aria-label', 'Contact frequency preferences');
    });
    
    // Enhance individual options
    document.querySelectorAll('.preference-option').forEach(option => {
      const radio = option.querySelector('input[type="radio"]');
      const label = option.querySelector('.preference-option-label');
      
      if (radio && label && !radio.id) {
        const id = `pref-${Math.random().toString(36).substr(2, 9)}`;
        radio.id = id;
        option.setAttribute('for', id);
      }
    });
  }

  /**
   * Enhance gamification UI with accessibility
   */
  enhanceGamificationUI() {
    // Enhance progress bars
    document.querySelectorAll('.progress-bar').forEach(bar => {
      const fill = bar.querySelector('.progress-fill');
      if (fill) {
        const percent = parseInt(fill.style.width) || 0;
        bar.setAttribute('role', 'progressbar');
        bar.setAttribute('aria-valuenow', percent);
        bar.setAttribute('aria-valuemin', '0');
        bar.setAttribute('aria-valuemax', '100');
      }
    });
    
    // Enhance achievement badges
    document.querySelectorAll('.achievement-badge').forEach(badge => {
      const name = badge.querySelector('.badge-name')?.textContent;
      const isLocked = badge.classList.contains('locked');
      
      badge.setAttribute('role', 'img');
      badge.setAttribute('aria-label', isLocked ? `${name} (locked)` : `${name} (earned)`);
    });
    
    // Enhance health score
    const healthScore = document.querySelector('.health-score-circle');
    if (healthScore) {
      const score = healthScore.querySelector('.health-score-value')?.textContent;
      healthScore.setAttribute('role', 'img');
      healthScore.setAttribute('aria-label', `Network health score: ${score} out of 100`);
    }
  }

  /**
   * Enhance weekly catchup UI with accessibility
   */
  enhanceWeeklyCatchupUI() {
    // Enhance progress indicators
    const progressBar = document.querySelector('.weekly-catchup-progress .progress-bar');
    if (progressBar) {
      const fill = progressBar.querySelector('.progress-fill');
      if (fill) {
        const percent = parseInt(fill.style.width) || 0;
        progressBar.setAttribute('role', 'progressbar');
        progressBar.setAttribute('aria-valuenow', percent);
        progressBar.setAttribute('aria-valuemin', '0');
        progressBar.setAttribute('aria-valuemax', '100');
        progressBar.setAttribute('aria-label', 'Weekly catchup progress');
      }
    }
    
    // Enhance action buttons
    document.querySelectorAll('.review-actions button').forEach(btn => {
      if (!btn.hasAttribute('aria-label')) {
        btn.setAttribute('aria-label', btn.textContent.trim());
      }
    });
  }

  /**
   * Enhance uncategorized tracker with accessibility
   */
  enhanceUncategorizedTracker() {
    // Enhance count badge
    const badge = document.querySelector('.uncategorized-badge');
    if (badge) {
      const count = badge.querySelector('.badge-count')?.textContent;
      badge.setAttribute('role', 'status');
      badge.setAttribute('aria-label', `${count} uncategorized contacts`);
    }
    
    // Enhance incomplete indicator
    const indicator = document.querySelector('.incomplete-indicator');
    if (indicator) {
      indicator.setAttribute('role', 'alert');
    }
  }

  /**
   * Observe DOM changes and enhance new elements
   */
  observeDOMChanges() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.addedNodes.length > 0) {
          // Re-run enhancements on new content
          setTimeout(() => {
            this.enhanceExistingElements();
          }, 100);
        }
      });
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  /**
   * Show circle information (for keyboard users)
   * @param {HTMLElement} circleElement - Circle ring element
   */
  showCircleInfo(circleElement) {
    const circleId = circleElement.getAttribute('data-circle');
    const circleName = this.getCircleName(circleId);
    const circleInfo = this.getCircleInfo(circleId);
    
    this.announce(`${circleName}: ${circleInfo.description}. Recommended size: ${circleInfo.recommendedSize} contacts.`);
  }

  /**
   * Announce contact focus for screen readers
   * @param {HTMLElement} contactElement - Contact dot element
   */
  announceContactFocus(contactElement) {
    const contactId = contactElement.getAttribute('data-contact-id');
    const contactName = this.getContactName(contactId);
    const circle = this.getContactCircle(contactId);
    
    this.announce(`${contactName}, in ${this.getCircleName(circle)}`);
  }

  /**
   * Announce circle focus for screen readers
   * @param {HTMLElement} circleElement - Circle ring element
   */
  announceCircleFocus(circleElement) {
    const circleId = circleElement.getAttribute('data-circle');
    const circleName = this.getCircleName(circleId);
    const count = this.getCircleContactCount(circleId);
    
    this.announce(`${circleName}, ${count} contacts`);
  }

  /**
   * Get circle name from ID
   * @param {string} circleId - Circle ID
   * @returns {string} Circle name
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
   * Get circle information
   * @param {string} circleId - Circle ID
   * @returns {Object} Circle information
   */
  getCircleInfo(circleId) {
    const info = {
      inner: { description: 'Your closest relationships - family and best friends', recommendedSize: 5 },
      close: { description: 'Good friends you see regularly', recommendedSize: 15 },
      active: { description: 'Friends you maintain regular contact with', recommendedSize: 50 },
      casual: { description: 'Acquaintances and occasional contacts', recommendedSize: 150 },
      acquaintance: { description: 'People you know but rarely interact with', recommendedSize: 500 }
    };
    return info[circleId] || { description: '', recommendedSize: 0 };
  }

  /**
   * Get contact name from ID
   * @param {string} contactId - Contact ID
   * @returns {string} Contact name
   */
  getContactName(contactId) {
    // Try to get from visualizer
    if (window.circularVisualizer) {
      const contact = window.circularVisualizer.contacts.find(c => c.id === contactId);
      if (contact) return contact.name;
    }
    return 'Contact';
  }

  /**
   * Get contact circle from ID
   * @param {string} contactId - Contact ID
   * @returns {string} Circle ID
   */
  getContactCircle(contactId) {
    if (window.circularVisualizer) {
      const contact = window.circularVisualizer.contacts.find(c => c.id === contactId);
      if (contact) return contact.circle || contact.dunbarCircle;
    }
    return '';
  }

  /**
   * Get contact count for a circle
   * @param {string} circleId - Circle ID
   * @returns {number} Contact count
   */
  getCircleContactCount(circleId) {
    if (window.circularVisualizer) {
      const distribution = window.circularVisualizer.getCircleDistribution();
      return distribution[circleId] || 0;
    }
    return 0;
  }

  /**
   * Set up accessibility styles
   */
  setupStyles() {
    if (document.getElementById('accessibility-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'accessibility-styles';
    style.textContent = `
      /* Screen reader only content */
      .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border-width: 0;
      }
      
      /* Focus indicators for keyboard navigation */
      .keyboard-navigation *:focus {
        outline: 3px solid #3b82f6 !important;
        outline-offset: 2px !important;
        box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.2) !important;
      }
      
      /* Enhanced focus for interactive elements */
      .keyboard-navigation button:focus,
      .keyboard-navigation a:focus,
      .keyboard-navigation input:focus,
      .keyboard-navigation select:focus,
      .keyboard-navigation textarea:focus,
      .keyboard-navigation [role="button"]:focus {
        outline: 3px solid #3b82f6 !important;
        outline-offset: 2px !important;
      }
      
      /* Focus for contact dots */
      .keyboard-navigation .contact-dot:focus {
        outline: 4px solid #3b82f6 !important;
        outline-offset: 4px !important;
        transform: scale(1.15);
      }
      
      /* Focus for circle rings */
      .keyboard-navigation .circle-ring:focus {
        stroke-width: 4 !important;
        stroke: #3b82f6 !important;
        opacity: 0.9 !important;
      }
      
      /* High contrast mode support */
      @media (prefers-contrast: high) {
        .contact-dot {
          border: 3px solid currentColor !important;
        }
        
        .circle-ring {
          stroke-width: 3 !important;
        }
        
        button, .btn {
          border: 2px solid currentColor !important;
        }
      }
      
      /* Reduced motion support */
      @media (prefers-reduced-motion: reduce) {
        * {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
        }
        
        .contact-dot,
        .progress-fill,
        .celebration-content {
          transition: none !important;
          animation: none !important;
        }
      }
      
      /* Ensure sufficient color contrast */
      .legend-size {
        color: #4b5563 !important; /* Darker for better contrast */
      }
      
      .tooltip-detail {
        color: #e5e7eb !important; /* Lighter for better contrast on dark background */
      }
      
      .group-filter-hint {
        color: #4b5563 !important; /* Darker for better contrast */
      }
      
      /* Skip to main content link */
      .skip-to-main {
        position: absolute;
        top: -40px;
        left: 0;
        background: #3b82f6;
        color: white;
        padding: 8px 16px;
        text-decoration: none;
        z-index: 10000;
        border-radius: 0 0 4px 0;
      }
      
      .skip-to-main:focus {
        top: 0;
      }
      
      /* Ensure buttons have minimum touch target size (44x44px) */
      button, .btn, [role="button"] {
        min-height: 44px;
        min-width: 44px;
      }
      
      /* Improve link visibility */
      a:focus {
        outline: 3px solid #3b82f6;
        outline-offset: 2px;
      }
      
      /* Ensure form labels are associated */
      label {
        cursor: pointer;
      }
      
      /* Improve checkbox/radio visibility */
      input[type="checkbox"]:focus,
      input[type="radio"]:focus {
        outline: 3px solid #3b82f6;
        outline-offset: 2px;
      }
    `;
    
    document.head.appendChild(style);
  }

  /**
   * Add skip to main content link
   */
  addSkipLink() {
    if (document.querySelector('.skip-to-main')) return;
    
    const skipLink = document.createElement('a');
    skipLink.href = '#main-content';
    skipLink.className = 'skip-to-main';
    skipLink.textContent = 'Skip to main content';
    
    document.body.insertBefore(skipLink, document.body.firstChild);
    
    // Ensure main content has ID
    const main = document.querySelector('main, [role="main"], .main-content');
    if (main && !main.id) {
      main.id = 'main-content';
    }
  }
}

// Initialize accessibility enhancements when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.accessibilityEnhancements = new AccessibilityEnhancements();
  });
} else {
  window.accessibilityEnhancements = new AccessibilityEnhancements();
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AccessibilityEnhancements;
}
