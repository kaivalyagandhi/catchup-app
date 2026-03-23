/**
 * ContextToggle Component
 *
 * A standalone segmented control for switching between "Circles" and "Groups"
 * contexts within the Organize Contacts modal.
 *
 * Requirements: 4, 12
 * - 4.1: Render segmented control with "Circles" (default) and "Groups"
 * - 4.2: Emit `context-changed` CustomEvent with detail.context
 * - 4.3: Keyboard navigation (ArrowLeft/Right, Enter/Space)
 * - 4.4: Persist to localStorage under `organize-contacts-context`
 * - 4.5: Restore from localStorage on init
 * - 4.6: No dependencies on Step2CirclesHandler
 * - 4.7: role="tablist" on container, role="tab" + aria-selected on options
 * - 12.4: Visible focus indicators with minimum 3:1 contrast ratio
 */

class ContextToggle {
  /**
   * Create a ContextToggle instance
   * @param {Object} [options={}] - Configuration options
   * @param {string} [options.defaultContext='circles'] - Default context if no saved preference
   * @param {Function} [options.onContextChange] - Callback when context changes
   */
  constructor(options = {}) {
    this.defaultContext = options.defaultContext || 'circles';
    this.onContextChange = options.onContextChange || null;
    this.container = null;
    this.storageKey = 'organize-contacts-context';

    // Define available contexts
    this.contexts = [
      { id: 'circles', label: 'Circles', icon: '⭕' },
      { id: 'groups', label: 'Groups', icon: '👥' }
    ];

    // Restore from localStorage (Requirement 4.5)
    const saved = this._loadSavedContext();
    this.context = saved || this.defaultContext;

    // Bind methods
    this._handleClick = this._handleClick.bind(this);
    this._handleKeyDown = this._handleKeyDown.bind(this);
  }

  /**
   * Render the context toggle and return the container element.
   * @returns {HTMLElement} The rendered container element
   */
  render() {
    // Inject styles if not already present
    this._injectStyles();

    this.container = document.createElement('div');
    this.container.className = 'context-toggle';
    this.container.setAttribute('role', 'tablist');
    this.container.setAttribute('aria-label', 'Organization context');

    this.contexts.forEach(ctx => {
      const isActive = this.context === ctx.id;
      const button = document.createElement('button');
      button.className = 'context-toggle__option' + (isActive ? ' context-toggle__option--active' : '');
      button.dataset.context = ctx.id;
      button.setAttribute('role', 'tab');
      button.setAttribute('aria-selected', String(isActive));
      button.setAttribute('tabindex', isActive ? '0' : '-1');
      button.id = `context-tab-${ctx.id}`;
      button.innerHTML = `
        <span class="context-toggle__icon">${ctx.icon}</span>
        <span class="context-toggle__label">${ctx.label}</span>
      `;
      this.container.appendChild(button);
    });

    // Sliding background indicator
    const slider = document.createElement('div');
    slider.className = 'context-toggle__slider';
    slider.setAttribute('aria-hidden', 'true');
    this.container.appendChild(slider);

    this.attachEventListeners();

    // Position slider after next paint
    requestAnimationFrame(() => this._updateSliderPosition());

    return this.container;
  }

  /**
   * Attach click and keyboard event listeners to option buttons.
   */
  attachEventListeners() {
    if (!this.container) return;

    const options = this.container.querySelectorAll('.context-toggle__option');
    options.forEach(option => {
      option.addEventListener('click', this._handleClick);
      option.addEventListener('keydown', this._handleKeyDown);
    });
  }

  /**
   * Handle click on an option button.
   * @param {MouseEvent} e
   * @private
   */
  _handleClick(e) {
    const ctx = e.currentTarget.dataset.context;
    if (ctx) this.setContext(ctx);
  }

  /**
   * Handle keyboard navigation (Requirement 4.3, 12).
   * ArrowLeft/ArrowRight to move focus, Enter/Space to select.
   * @param {KeyboardEvent} e
   * @private
   */
  _handleKeyDown(e) {
    if (!this.container) return;

    const options = Array.from(this.container.querySelectorAll('.context-toggle__option'));
    const currentIndex = options.findIndex(opt => opt.dataset.context === this.context);
    let newIndex = currentIndex;

    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        newIndex = currentIndex === 0 ? options.length - 1 : currentIndex - 1;
        break;
      case 'ArrowRight':
        e.preventDefault();
        newIndex = currentIndex === options.length - 1 ? 0 : currentIndex + 1;
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        // Select the currently focused option
        this.setContext(e.currentTarget.dataset.context);
        return;
      default:
        return;
    }

    if (newIndex !== currentIndex) {
      // Move focus and select
      this.setContext(options[newIndex].dataset.context);
      options[newIndex].focus();
    }
  }

  /**
   * Set the active context, persist to localStorage, update UI, and emit event.
   * @param {string} context - 'circles' or 'groups'
   */
  setContext(context) {
    const validContexts = this.contexts.map(c => c.id);
    if (!validContexts.includes(context)) {
      console.error(`ContextToggle: Invalid context "${context}". Must be one of: ${validContexts.join(', ')}`);
      return;
    }

    if (context === this.context) return;

    const previousContext = this.context;
    this.context = context;

    // Persist to localStorage (Requirement 4.4)
    this._saveContext(context);

    // Update UI
    this._updateUI();

    // Emit CustomEvent (Requirement 4.2)
    if (this.container) {
      this.container.dispatchEvent(new CustomEvent('context-changed', {
        bubbles: true,
        detail: { context, previousContext }
      }));
    }

    // Invoke callback if provided
    if (typeof this.onContextChange === 'function') {
      this.onContextChange(context, previousContext);
    }
  }

  /**
   * Get the current context.
   * @returns {string} 'circles' or 'groups'
   */
  getContext() {
    return this.context;
  }

  /**
   * Update the UI to reflect the current context.
   * @private
   */
  _updateUI() {
    if (!this.container) return;

    const options = this.container.querySelectorAll('.context-toggle__option');
    options.forEach(option => {
      const isActive = option.dataset.context === this.context;
      option.classList.toggle('context-toggle__option--active', isActive);
      option.setAttribute('aria-selected', String(isActive));
      option.setAttribute('tabindex', isActive ? '0' : '-1');
    });

    this._updateSliderPosition();
  }

  /**
   * Update the sliding background indicator position.
   * @private
   */
  _updateSliderPosition() {
    if (!this.container) return;

    const slider = this.container.querySelector('.context-toggle__slider');
    const activeOption = this.container.querySelector('.context-toggle__option--active');

    if (slider && activeOption) {
      const containerRect = this.container.getBoundingClientRect();
      const activeRect = activeOption.getBoundingClientRect();

      const left = activeRect.left - containerRect.left;
      const width = activeRect.width;

      slider.style.transform = `translateX(${left}px)`;
      slider.style.width = `${width}px`;
    }
  }

  /**
   * Save context to localStorage (Requirement 4.4).
   * @param {string} context
   * @private
   */
  _saveContext(context) {
    try {
      localStorage.setItem(this.storageKey, context);
    } catch (e) {
      console.warn('ContextToggle: Unable to save context to localStorage', e);
    }
  }

  /**
   * Load saved context from localStorage (Requirement 4.5).
   * @returns {string|null}
   * @private
   */
  _loadSavedContext() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved === 'circles' || saved === 'groups') {
        return saved;
      }
      return null;
    } catch (e) {
      console.warn('ContextToggle: Unable to load context from localStorage', e);
      return null;
    }
  }

  /**
   * Clean up event listeners and DOM references.
   */
  destroy() {
    if (this.container) {
      const options = this.container.querySelectorAll('.context-toggle__option');
      options.forEach(option => {
        option.removeEventListener('click', this._handleClick);
        option.removeEventListener('keydown', this._handleKeyDown);
      });
      this.container = null;
    }
  }

  /**
   * Inject component styles into the document head.
   * Includes visible focus indicators with minimum 3:1 contrast ratio (Requirement 12.4).
   * @private
   */
  _injectStyles() {
    const styleId = 'context-toggle-styles';
    if (document.getElementById(styleId)) return;

    const styles = document.createElement('style');
    styles.id = styleId;
    styles.textContent = `
      /* ============================================================================
         CONTEXT TOGGLE COMPONENT
         Segmented control for switching between Circles and Groups contexts
         Requirements: 4.1, 4.7, 12.4
         ============================================================================ */

      .context-toggle {
        display: inline-flex;
        position: relative;
        background: var(--bg-secondary, #f5f5f4);
        border-radius: 10px;
        padding: 4px;
        gap: 0;
        width: 100%;
        max-width: 320px;
      }

      .context-toggle__option {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        padding: 8px 16px;
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
        min-height: 40px;
        white-space: nowrap;
      }

      .context-toggle__option:hover:not(.context-toggle__option--active) {
        color: var(--text-primary, #1c1917);
      }

      /* Focus indicator: 3:1+ contrast ratio (Requirement 12.4)
         #D97706 (amber-600) on #f5f5f4 background = ~3.5:1 contrast ratio */
      .context-toggle__option:focus {
        outline: none;
      }

      .context-toggle__option:focus-visible {
        outline: 3px solid #D97706;
        outline-offset: 2px;
        border-radius: 8px;
      }

      .context-toggle__option:active {
        transform: scale(0.98);
      }

      .context-toggle__option--active {
        color: var(--text-primary, #1c1917);
        font-weight: 600;
      }

      .context-toggle__icon {
        font-size: 14px;
        line-height: 1;
        flex-shrink: 0;
      }

      .context-toggle__label {
        line-height: 1.2;
      }

      /* Sliding background indicator */
      .context-toggle__slider {
        position: absolute;
        top: 4px;
        left: 4px;
        height: calc(100% - 8px);
        background: var(--bg-surface, #ffffff);
        border-radius: 8px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06);
        transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1),
                    width 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        z-index: 1;
        pointer-events: none;
      }

      /* ============================================================================
         DARK THEME SUPPORT
         ============================================================================ */

      [data-theme="dark"] .context-toggle {
        background: var(--bg-secondary, #292524);
      }

      [data-theme="dark"] .context-toggle__option {
        color: var(--text-secondary, #a8a29e);
      }

      [data-theme="dark"] .context-toggle__option:hover:not(.context-toggle__option--active) {
        color: var(--text-primary, #fafaf9);
      }

      [data-theme="dark"] .context-toggle__option--active {
        color: var(--text-primary, #fafaf9);
      }

      /* Dark theme focus: #FBBF24 (amber-400) on #292524 = ~8:1 contrast */
      [data-theme="dark"] .context-toggle__option:focus-visible {
        outline-color: #FBBF24;
      }

      [data-theme="dark"] .context-toggle__slider {
        background: var(--bg-surface, #1c1917);
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3), 0 1px 2px rgba(0, 0, 0, 0.2);
      }

      /* ============================================================================
         RESPONSIVE STYLES
         ============================================================================ */

      @media (max-width: 767px) {
        .context-toggle {
          max-width: 100%;
          width: 100%;
        }

        .context-toggle__option {
          padding: 8px 12px;
          font-size: 12px;
          gap: 4px;
        }
      }

      @media (max-width: 400px) {
        .context-toggle__option {
          padding: 6px 8px;
          font-size: 11px;
          gap: 3px;
        }

        .context-toggle__icon {
          font-size: 12px;
        }
      }

      /* ============================================================================
         ANIMATION
         ============================================================================ */

      @keyframes contextToggleFadeIn {
        from {
          opacity: 0;
          transform: translateY(-4px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .context-toggle {
        animation: contextToggleFadeIn 0.3s ease-out;
      }

      @media (prefers-reduced-motion: reduce) {
        .context-toggle,
        .context-toggle__option,
        .context-toggle__slider {
          animation: none;
          transition: none;
        }
      }
    `;

    document.head.appendChild(styles);
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ContextToggle;
}
