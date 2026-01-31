/**
 * ModeToggle Component
 * 
 * A segmented control UI component for switching between two modes
 * in the circle management modal: Organize (unified AI + Manual) and Swipe Mode.
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.6
 * - 6.1: Display mode toggle at top of circle management modal
 * - 6.2: Present two options: "Organize" (merged AI + Manual), "Swipe Mode"
 * - 6.3: Default to "Organize" for new users
 * - 6.6: Remember user's last selected mode (localStorage)
 */

class ModeToggle {
  /**
   * Create a ModeToggle instance
   * @param {Object} options - Configuration options
   * @param {string} options.containerId - ID of the container element to render into
   * @param {Function} options.onModeChange - Callback when mode changes
   * @param {string} [options.defaultMode='organize'] - Default mode if no saved preference
   */
  constructor(options) {
    this.containerId = options.containerId;
    this.onModeChange = options.onModeChange || (() => {});
    this.defaultMode = options.defaultMode || 'organize';
    this.storageKey = 'circle-management-mode';
    
    // Define available modes (merged AI + Manual into "List Mode")
    this.modes = [
      { id: 'organize', label: 'List Mode', icon: '📋' },
      { id: 'swipe', label: 'Swipe Mode', icon: '👆' }
    ];
    
    // Load saved mode or use default (Requirement 6.3, 6.6)
    this.currentMode = this.loadSavedMode() || this.defaultMode;
    
    // Bind methods
    this.handleModeChange = this.handleModeChange.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
  }

  /**
   * Render the mode toggle component
   * @returns {string} HTML string for the component
   */
  render() {
    return `
      <div class="mode-toggle" role="tablist" aria-label="Circle management mode">
        ${this.modes.map(mode => {
          const isActive = this.currentMode === mode.id;
          return `
            <button 
              class="mode-toggle__option ${isActive ? 'mode-toggle__option--active' : ''}"
              data-mode="${mode.id}"
              role="tab"
              aria-selected="${isActive}"
              aria-controls="mode-content"
              tabindex="${isActive ? '0' : '-1'}"
              id="mode-tab-${mode.id}"
            >
              <span class="mode-toggle__icon">${mode.icon}</span>
              <span class="mode-toggle__label">${mode.label}</span>
            </button>
          `;
        }).join('')}
        <div class="mode-toggle__slider" aria-hidden="true"></div>
      </div>
    `;
  }

  /**
   * Mount the component to the DOM and attach event listeners
   */
  mount() {
    const container = document.getElementById(this.containerId);
    if (!container) {
      console.error(`ModeToggle: Container with id "${this.containerId}" not found`);
      return;
    }

    // Inject styles if not already present
    this.injectStyles();

    // Render the component
    container.innerHTML = this.render();

    // Attach event listeners
    this.attachEventListeners();

    // Update slider position
    requestAnimationFrame(() => this.updateSliderPosition());
  }

  /**
   * Attach click and keyboard event listeners
   */
  attachEventListeners() {
    const container = document.getElementById(this.containerId);
    if (!container) return;

    const options = container.querySelectorAll('.mode-toggle__option');
    options.forEach(option => {
      option.addEventListener('click', (e) => {
        const mode = e.currentTarget.dataset.mode;
        this.handleModeChange(mode);
      });

      option.addEventListener('keydown', this.handleKeyDown);
    });
  }

  /**
   * Handle keyboard navigation (Requirement 6.9)
   * @param {KeyboardEvent} e - Keyboard event
   */
  handleKeyDown(e) {
    const container = document.getElementById(this.containerId);
    if (!container) return;

    const options = Array.from(container.querySelectorAll('.mode-toggle__option'));
    const currentIndex = options.findIndex(opt => opt.dataset.mode === this.currentMode);

    let newIndex = currentIndex;

    switch (e.key) {
      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault();
        newIndex = currentIndex === 0 ? options.length - 1 : currentIndex - 1;
        break;
      case 'ArrowRight':
      case 'ArrowDown':
        e.preventDefault();
        newIndex = currentIndex === options.length - 1 ? 0 : currentIndex + 1;
        break;
      case 'Home':
        e.preventDefault();
        newIndex = 0;
        break;
      case 'End':
        e.preventDefault();
        newIndex = options.length - 1;
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        return;
      default:
        return;
    }

    if (newIndex !== currentIndex) {
      const newMode = options[newIndex].dataset.mode;
      this.handleModeChange(newMode);
      options[newIndex].focus();
    }
  }

  /**
   * Handle mode change
   * @param {string} mode - The new mode
   */
  handleModeChange(mode) {
    if (mode === this.currentMode) return;

    const previousMode = this.currentMode;
    this.currentMode = mode;

    // Save to localStorage (Requirement 6.6)
    this.saveMode(mode);

    // Update UI
    this.updateUI();

    // Notify callback
    this.onModeChange(mode, previousMode);
  }

  /**
   * Update the UI to reflect current mode
   */
  updateUI() {
    const container = document.getElementById(this.containerId);
    if (!container) return;

    const options = container.querySelectorAll('.mode-toggle__option');
    options.forEach(option => {
      const isActive = option.dataset.mode === this.currentMode;
      option.classList.toggle('mode-toggle__option--active', isActive);
      option.setAttribute('aria-selected', isActive.toString());
      option.setAttribute('tabindex', isActive ? '0' : '-1');
    });

    // Update slider position
    this.updateSliderPosition();
  }

  /**
   * Update the slider position based on current mode
   */
  updateSliderPosition() {
    const container = document.getElementById(this.containerId);
    if (!container) return;

    const slider = container.querySelector('.mode-toggle__slider');
    const activeOption = container.querySelector('.mode-toggle__option--active');
    
    if (slider && activeOption) {
      const toggleContainer = container.querySelector('.mode-toggle');
      const containerRect = toggleContainer.getBoundingClientRect();
      const activeRect = activeOption.getBoundingClientRect();
      
      const left = activeRect.left - containerRect.left;
      const width = activeRect.width;
      
      slider.style.transform = `translateX(${left}px)`;
      slider.style.width = `${width}px`;
    }
  }

  /**
   * Save mode preference to localStorage (Requirement 6.6)
   * @param {string} mode - The mode to save
   */
  saveMode(mode) {
    try {
      localStorage.setItem(this.storageKey, mode);
    } catch (e) {
      console.warn('ModeToggle: Unable to save mode preference to localStorage', e);
    }
  }

  /**
   * Load saved mode preference from localStorage (Requirement 6.6)
   * @returns {string|null} The saved mode or null if not found
   */
  loadSavedMode() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      // Map old mode names to new ones
      if (saved === 'ai-assisted' || saved === 'manual') {
        return 'organize';
      }
      return saved;
    } catch (e) {
      console.warn('ModeToggle: Unable to load mode preference from localStorage', e);
      return null;
    }
  }

  /**
   * Get the current mode
   * @returns {string} Current mode
   */
  getCurrentMode() {
    return this.currentMode;
  }

  /**
   * Set the mode programmatically
   * @param {string} mode - The mode to set
   * @param {boolean} [triggerCallback=true] - Whether to trigger the onModeChange callback
   */
  setMode(mode, triggerCallback = true) {
    const validModes = this.modes.map(m => m.id);
    if (!validModes.includes(mode)) {
      console.error(`ModeToggle: Invalid mode "${mode}". Must be one of: ${validModes.join(', ')}`);
      return;
    }

    if (triggerCallback) {
      this.handleModeChange(mode);
    } else {
      this.currentMode = mode;
      this.saveMode(mode);
      this.updateUI();
    }
  }

  /**
   * Inject component styles into the document head
   */
  injectStyles() {
    const styleId = 'mode-toggle-styles';
    if (document.getElementById(styleId)) return;

    const styles = document.createElement('style');
    styles.id = styleId;
    styles.textContent = `
      /* ============================================================================
         MODE TOGGLE COMPONENT - 3 Mode Version
         Segmented control for switching between AI Suggestions, Manual, and Swipe modes
         ============================================================================ */

      .mode-toggle {
        display: inline-flex;
        position: relative;
        background: var(--bg-secondary, #f5f5f4);
        border-radius: 10px;
        padding: 4px;
        gap: 0;
        margin-bottom: 20px;
        width: 100%;
        max-width: 480px;
      }

      .mode-toggle__option {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        padding: 10px 12px;
        background: transparent;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-family: inherit;
        font-size: 13px;
        font-weight: 500;
        color: var(--text-secondary, #78716c);
        transition: color 0.2s ease, transform 0.1s ease;
        position: relative;
        z-index: 2;
        flex: 1;
        min-height: 44px;
        white-space: nowrap;
      }

      .mode-toggle__option:hover:not(.mode-toggle__option--active) {
        color: var(--text-primary, #1c1917);
      }

      .mode-toggle__option:focus {
        outline: none;
      }

      .mode-toggle__option:focus-visible {
        outline: 2px solid var(--accent-primary, #fb923c);
        outline-offset: 2px;
        border-radius: 8px;
      }

      .mode-toggle__option:active {
        transform: scale(0.98);
      }

      .mode-toggle__option--active {
        color: var(--text-primary, #1c1917);
        font-weight: 600;
      }

      .mode-toggle__icon {
        font-size: 14px;
        line-height: 1;
        flex-shrink: 0;
      }

      .mode-toggle__label {
        line-height: 1.2;
      }

      /* Sliding background indicator */
      .mode-toggle__slider {
        position: absolute;
        top: 4px;
        left: 4px;
        height: calc(100% - 8px);
        background: var(--bg-surface, #ffffff);
        border-radius: 8px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06);
        transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), width 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        z-index: 1;
        pointer-events: none;
      }

      /* ============================================================================
         DARK THEME SUPPORT
         ============================================================================ */

      [data-theme="dark"] .mode-toggle {
        background: var(--bg-secondary, #292524);
      }

      [data-theme="dark"] .mode-toggle__option {
        color: var(--text-secondary, #a8a29e);
      }

      [data-theme="dark"] .mode-toggle__option:hover:not(.mode-toggle__option--active) {
        color: var(--text-primary, #fafaf9);
      }

      [data-theme="dark"] .mode-toggle__option--active {
        color: var(--text-primary, #fafaf9);
      }

      [data-theme="dark"] .mode-toggle__slider {
        background: var(--bg-surface, #1c1917);
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3), 0 1px 2px rgba(0, 0, 0, 0.2);
      }

      /* ============================================================================
         RESPONSIVE STYLES
         ============================================================================ */

      @media (max-width: 767px) {
        .mode-toggle {
          max-width: 100%;
          width: 100%;
        }

        .mode-toggle__option {
          padding: 10px 8px;
          font-size: 12px;
          gap: 4px;
        }

        .mode-toggle__icon {
          font-size: 12px;
        }
      }

      @media (max-width: 400px) {
        .mode-toggle__option {
          padding: 8px 6px;
          font-size: 11px;
          gap: 3px;
          flex-direction: column;
        }

        .mode-toggle__icon {
          font-size: 14px;
        }

        .mode-toggle__label {
          font-size: 10px;
        }
      }

      /* ============================================================================
         ANIMATION
         ============================================================================ */

      @keyframes modeToggleFadeIn {
        from {
          opacity: 0;
          transform: translateY(-4px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .mode-toggle {
        animation: modeToggleFadeIn 0.3s ease-out;
      }

      @media (prefers-reduced-motion: reduce) {
        .mode-toggle,
        .mode-toggle__option,
        .mode-toggle__slider {
          animation: none;
          transition: none;
        }
      }
    `;

    document.head.appendChild(styles);
  }

  /**
   * Clean up the component
   */
  destroy() {
    const container = document.getElementById(this.containerId);
    if (!container) return;

    const options = container.querySelectorAll('.mode-toggle__option');
    options.forEach(option => {
      option.removeEventListener('click', this.handleModeChange);
      option.removeEventListener('keydown', this.handleKeyDown);
    });

    container.innerHTML = '';
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ModeToggle;
}
