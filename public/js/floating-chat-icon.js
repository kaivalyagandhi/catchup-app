/**
 * Floating Chat Icon Component
 *
 * Persistent UI element that provides access to the chat interface.
 * Displays recording state, pending edit count, and error indicators.
 *
 * Requirements: 2.1, 2.4, 12.1, 12.2, 12.3, 12.5
 */

class FloatingChatIcon {
  constructor(options = {}) {
    this.isRecording = false;
    this.pendingEditCount = 0;
    this.hasError = false;
    this.isGlowing = false;
    this.isPulsing = false;
    this.onClick = options.onClick || (() => {});
    this.element = null;
    this.badgeElement = null;
    this.pulseTimeout = null;
  }

  /**
   * Render the floating chat icon
   */
  render() {
    // Create container
    this.element = document.createElement('div');
    this.element.className = 'floating-chat-icon';
    this.element.setAttribute('role', 'button');
    this.element.setAttribute('aria-label', 'Open chat for contact edits');
    this.element.setAttribute('tabindex', '0');

    // Create icon
    const icon = document.createElement('span');
    icon.className = 'floating-chat-icon__icon';
    icon.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      </svg>
    `;
    this.element.appendChild(icon);

    // Create badge for pending edit count
    this.badgeElement = document.createElement('span');
    this.badgeElement.className = 'floating-chat-icon__badge';
    this.badgeElement.style.display = 'none';
    this.element.appendChild(this.badgeElement);

    // Add click handler
    this.element.addEventListener('click', () => this.onClick());
    this.element.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.onClick();
      }
    });

    this.updateStyles();
    return this.element;
  }

  /**
   * Set recording state (red glow effect)
   * Requirements: 12.2
   */
  setRecordingState(isRecording) {
    this.isRecording = isRecording;
    this.isGlowing = isRecording;
    this.updateStyles();
  }

  /**
   * Set error state
   * Requirements: 12.5
   */
  setErrorState(hasError) {
    this.hasError = hasError;
    this.updateStyles();
  }

  /**
   * Update pending edit count
   */
  setPendingEditCount(count) {
    const previousCount = this.pendingEditCount;
    this.pendingEditCount = count;
    
    if (this.badgeElement) {
      if (count > 0) {
        this.badgeElement.textContent = count > 99 ? '99+' : count.toString();
        this.badgeElement.style.display = 'flex';
        
        // Animate if count increased
        if (count > previousCount) {
          this.animateBadge();
        }
      } else {
        this.badgeElement.style.display = 'none';
      }
    }
  }

  /**
   * Trigger pulse animation when edit detected
   * Requirements: 12.3
   */
  triggerPulse() {
    if (!this.element) return;

    this.isPulsing = true;
    this.element.classList.add('floating-chat-icon--pulse');

    // Clear any existing timeout
    if (this.pulseTimeout) {
      clearTimeout(this.pulseTimeout);
    }

    // Remove pulse class after animation
    this.pulseTimeout = setTimeout(() => {
      this.isPulsing = false;
      if (this.element) {
        this.element.classList.remove('floating-chat-icon--pulse');
      }
    }, 600);
  }

  /**
   * Animate badge when count changes
   */
  animateBadge() {
    if (!this.badgeElement) return;

    this.badgeElement.classList.add('floating-chat-icon__badge--bounce');
    setTimeout(() => {
      if (this.badgeElement) {
        this.badgeElement.classList.remove('floating-chat-icon__badge--bounce');
      }
    }, 300);
  }

  /**
   * Update element styles based on state
   */
  updateStyles() {
    if (!this.element) return;

    // Remove all state classes
    this.element.classList.remove(
      'floating-chat-icon--recording',
      'floating-chat-icon--error',
      'floating-chat-icon--glow'
    );

    // Add appropriate state classes
    if (this.hasError) {
      this.element.classList.add('floating-chat-icon--error');
    } else if (this.isRecording) {
      this.element.classList.add('floating-chat-icon--recording', 'floating-chat-icon--glow');
    }
  }

  /**
   * Destroy the component
   */
  destroy() {
    if (this.pulseTimeout) {
      clearTimeout(this.pulseTimeout);
    }
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    this.element = null;
    this.badgeElement = null;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { FloatingChatIcon };
}
