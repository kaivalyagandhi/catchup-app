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
    this.isSpeaking = false;
    this.onClick = options.onClick || (() => {});
    this.element = null;
    this.badgeElement = null;
    this.pulseTimeout = null;
    this.speakingTimeout = null;
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
   * Set recording state (changes icon to speech bubble)
   * Requirements: 12.2
   */
  setRecordingState(isRecording) {
    this.isRecording = isRecording;
    this.updateStyles();
    this.updateIcon();
  }

  /**
   * Set speaking state (triggers glow when audio detected)
   * Called when microphone picks up talking
   */
  setSpeakingState(isSpeaking) {
    this.isSpeaking = isSpeaking;
    
    if (isSpeaking && this.isRecording) {
      // Clear any existing timeout
      if (this.speakingTimeout) {
        clearTimeout(this.speakingTimeout);
      }
      
      // Add speaking glow
      if (this.element) {
        this.element.classList.add('floating-chat-icon--speaking');
      }
      
      // Auto-remove speaking state after 300ms of no updates
      this.speakingTimeout = setTimeout(() => {
        this.isSpeaking = false;
        if (this.element) {
          this.element.classList.remove('floating-chat-icon--speaking');
        }
      }, 300);
    } else if (!isSpeaking && this.element) {
      this.element.classList.remove('floating-chat-icon--speaking');
    }
  }

  /**
   * Update waveform visualization based on audio level
   * @param {number} level - Audio level from 0 to 1
   */
  setAudioLevel(level) {
    if (!this.isRecording || !this.element) return;
    
    const waveformIcon = this.element.querySelector('.waveform-icon');
    if (!waveformIcon) return;
    
    const lines = waveformIcon.querySelectorAll('line');
    if (lines.length !== 5) return;
    
    // Minimum heights when silent (small bars visible)
    const minHeights = [2, 3, 4, 3, 2];
    // Maximum heights at full volume (dramatic range)
    const maxHeights = [6, 9, 11, 9, 6];
    
    // Add randomness for organic feel
    lines.forEach((line, index) => {
      const minH = minHeights[index];
      const maxH = maxHeights[index];
      // Random variation per bar
      const randomFactor = 0.8 + Math.random() * 0.4;
      // Interpolate between min and max based on level
      const height = minH + (maxH - minH) * level * randomFactor;
      
      // Calculate y1 and y2 centered at 12 (middle of 24px viewBox)
      const y1 = 12 - height;
      const y2 = 12 + height;
      
      line.setAttribute('y1', y1.toFixed(1));
      line.setAttribute('y2', y2.toFixed(1));
    });
  }

  /**
   * Update icon based on recording state
   */
  updateIcon() {
    if (!this.element) return;
    
    const iconContainer = this.element.querySelector('.floating-chat-icon__icon');
    if (!iconContainer) return;
    
    if (this.isRecording) {
      // Sound waveform icon when recording
      iconContainer.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="waveform-icon">
          <line x1="4" y1="8" x2="4" y2="16"></line>
          <line x1="8" y1="5" x2="8" y2="19"></line>
          <line x1="12" y1="3" x2="12" y2="21"></line>
          <line x1="16" y1="5" x2="16" y2="19"></line>
          <line x1="20" y1="8" x2="20" y2="16"></line>
        </svg>
      `;
    } else {
      // Default chat icon
      iconContainer.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
      `;
    }
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
      'floating-chat-icon--glow',
      'floating-chat-icon--speaking'
    );

    // Add appropriate state classes
    if (this.hasError) {
      this.element.classList.add('floating-chat-icon--error');
    } else if (this.isRecording) {
      this.element.classList.add('floating-chat-icon--recording');
      // Speaking glow is added separately via setSpeakingState
    }
  }

  /**
   * Destroy the component
   */
  destroy() {
    if (this.pulseTimeout) {
      clearTimeout(this.pulseTimeout);
    }
    if (this.speakingTimeout) {
      clearTimeout(this.speakingTimeout);
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
