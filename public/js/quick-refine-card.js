/**
 * QuickRefineCard Component - Redesigned Swipe Mode
 * 
 * Gamified swipe-style interface for rapidly categorizing uncategorized contacts.
 * Features session tracking, high scores, compact design, and delightful animations.
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 20.3, 20.5, 20.6
 */

class QuickRefineCard {
  /**
   * Create a QuickRefineCard instance
   * @param {Array} contacts - Uncategorized contacts to refine
   * @param {Object} options - Configuration options
   */
  constructor(contacts, options = {}) {
    this.contacts = contacts || [];
    this.currentIndex = 0;
    this.onAssign = options.onAssign || (() => {});
    this.onDone = options.onDone || (() => {});
    this.onProgress = options.onProgress || (() => {});
    this.onSkip = options.onSkip || (() => {});
    this.containerId = options.containerId || 'quick-refine-container';
    this.userId = options.userId;
    
    // Session tracking for gamification
    this.sessionScore = 0;
    this.highScore = this.loadHighScore();
    this.savedForLater = []; // Contacts saved for later review
    this.sessionStartTime = Date.now();
    
    // Touch gesture tracking
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.touchEndX = 0;
    this.touchEndY = 0;
    this.isDragging = false;
    this.currentTranslateX = 0;
    this.currentTranslateY = 0;
    
    // Swipe thresholds
    this.SWIPE_THRESHOLD = 80;
    this.SWIPE_VELOCITY_THRESHOLD = 0.5;
    this.VERTICAL_SWIPE_THRESHOLD = 60;
    
    // Animation state
    this.isAnimating = false;
    
    this.init();
  }
  
  init() {
    this.setupStyles();
  }
  
  loadHighScore() {
    try {
      const stored = localStorage.getItem('swipe-mode-high-score');
      return stored ? parseInt(stored, 10) : 0;
    } catch (e) {
      return 0;
    }
  }
  
  saveHighScore() {
    try {
      if (this.sessionScore > this.highScore) {
        this.highScore = this.sessionScore;
        localStorage.setItem('swipe-mode-high-score', this.highScore.toString());
        return true; // New high score!
      }
      return false;
    } catch (e) {
      return false;
    }
  }
  
  setupStyles() {
    if (document.getElementById('quick-refine-card-styles')) {
      return;
    }
    
    const style = document.createElement('style');
    style.id = 'quick-refine-card-styles';
    style.textContent = `
      /* ============================================================================
         SWIPE MODE - 2-Column Layout Design
         Left: Stats + Contact Card | Right: Action Buttons
         ============================================================================ */
      
      .swipe-mode-container {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1.5rem;
        padding: 1rem;
        max-width: 100%;
        min-height: 480px;
        align-items: start;
      }
      
      /* Left Column - Stats and Contact */
      .swipe-left-column {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        align-items: center;
        height: 100%;
      }
      
      /* Session Stats Bar */
      .swipe-session-stats {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 1.25rem;
        padding: 0.75rem 1.25rem;
        background: var(--bg-secondary, #f5f5f4);
        border-radius: 12px;
        font-size: 0.875rem;
        width: 100%;
      }
      
      .swipe-stat {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        color: var(--text-secondary, #6b7280);
      }
      
      .swipe-stat-icon {
        font-size: 1.125rem;
      }
      
      .swipe-stat-label {
        font-size: 0.8125rem;
      }
      
      .swipe-stat-value {
        font-weight: 700;
        font-size: 1.125rem;
        color: var(--text-primary, #1f2937);
      }
      
      .swipe-stat-value.high-score {
        color: #f59e0b;
      }
      
      .swipe-stat-value.new-record {
        color: #10b981;
        animation: pulseGlow 0.6s ease-in-out;
      }
      
      @keyframes pulseGlow {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.2); }
      }
      
      /* Remaining Counter */
      .swipe-remaining {
        font-size: 0.875rem;
        color: var(--text-tertiary, #9ca3af);
        text-align: center;
      }
      
      /* Contact Card - Larger for 2-column */
      .swipe-card-wrapper {
        position: relative;
        width: 100%;
        max-width: 280px;
        height: 220px;
        perspective: 1000px;
      }
      
      .swipe-card {
        position: absolute;
        width: 100%;
        height: 100%;
        background: var(--bg-surface, #ffffff);
        border-radius: 16px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        border: 1px solid var(--border-subtle, #e5e7eb);
        padding: 1.5rem;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        text-align: center;
        cursor: grab;
        user-select: none;
        touch-action: pan-y;
        transition: transform 0.25s ease, opacity 0.25s ease, box-shadow 0.25s ease;
      }
      
      .swipe-card.dragging {
        cursor: grabbing;
        transition: none;
        box-shadow: 0 12px 32px rgba(0, 0, 0, 0.18);
      }
      
      .swipe-card.swiping-left,
      .swipe-card.swiping-right,
      .swipe-card.swiping-down {
        opacity: 0.85;
      }
      
      /* Card exit animations */
      .swipe-card.exit-left {
        animation: cardExitLeft 0.3s ease-out forwards;
      }
      
      .swipe-card.exit-right {
        animation: cardExitRight 0.3s ease-out forwards;
      }
      
      .swipe-card.exit-down {
        animation: cardExitDown 0.3s ease-out forwards;
      }
      
      .swipe-card.exit-up {
        animation: cardExitUp 0.25s ease-out forwards;
      }
      
      @keyframes cardExitLeft {
        to { transform: translateX(-150%) rotate(-15deg); opacity: 0; }
      }
      
      @keyframes cardExitRight {
        to { transform: translateX(150%) rotate(15deg); opacity: 0; }
      }
      
      @keyframes cardExitDown {
        to { transform: translateY(150%); opacity: 0; }
      }
      
      @keyframes cardExitUp {
        to { transform: translateY(-100%) scale(0.8); opacity: 0; }
      }
      
      /* Card enter animation */
      .swipe-card.entering {
        animation: cardEnter 0.25s ease-out;
      }
      
      @keyframes cardEnter {
        from { transform: scale(0.9); opacity: 0; }
        to { transform: scale(1); opacity: 1; }
      }
      
      /* Contact Avatar - Larger */
      .swipe-avatar {
        width: 64px;
        height: 64px;
        border-radius: 50%;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.5rem;
        font-weight: 600;
        color: white;
        margin-bottom: 0.75rem;
        flex-shrink: 0;
      }
      
      .swipe-contact-name {
        font-size: 1.25rem;
        font-weight: 600;
        color: var(--text-primary, #1f2937);
        margin-bottom: 0.375rem;
        max-width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      
      .swipe-contact-meta {
        font-size: 0.875rem;
        color: var(--text-secondary, #6b7280);
        max-width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      
      /* Swipe hint */
      .swipe-hint-compact {
        font-size: 0.75rem;
        color: var(--text-tertiary, #a8a29e);
        margin-top: auto;
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      
      /* Archive indicator overlay */
      .swipe-archive-overlay {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background: rgba(239, 68, 68, 0.1);
        border-radius: 16px;
        opacity: 0;
        transition: opacity 0.2s ease;
        pointer-events: none;
      }
      
      .swipe-card.swiping-down .swipe-archive-overlay {
        opacity: 1;
      }
      
      .swipe-archive-overlay-icon {
        font-size: 2.5rem;
      }
      
      .swipe-archive-overlay-text {
        font-size: 0.875rem;
        font-weight: 600;
        color: #ef4444;
      }
      
      /* Right Column - Action Buttons */
      .swipe-right-column {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        padding-top: 0.5rem;
      }
      
      /* Action Button - Full width with label */
      .swipe-action-btn-full {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.75rem 1rem;
        min-height: 48px;
        border-radius: 10px;
        border: 2px solid var(--border-color, #e5e7eb);
        background: var(--bg-surface, #ffffff);
        font-size: 0.9375rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.15s ease;
        text-align: left;
        width: 100%;
      }
      
      .swipe-action-btn-full:hover {
        transform: translateX(4px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      }
      
      .swipe-action-btn-full:active {
        transform: translateX(2px);
      }
      
      .swipe-action-btn-full.pressed {
        animation: buttonPress 0.2s ease;
      }
      
      @keyframes buttonPress {
        0% { transform: scale(1); }
        50% { transform: scale(0.98); }
        100% { transform: scale(1); }
      }
      
      /* Circle button colors */
      .swipe-action-btn-full.btn-inner { border-color: #8b5cf6; color: #8b5cf6; }
      .swipe-action-btn-full.btn-inner:hover { background: #8b5cf6; color: white; }
      
      .swipe-action-btn-full.btn-close { border-color: #ec4899; color: #ec4899; }
      .swipe-action-btn-full.btn-close:hover { background: #ec4899; color: white; }
      
      .swipe-action-btn-full.btn-active { border-color: #10b981; color: #10b981; }
      .swipe-action-btn-full.btn-active:hover { background: #10b981; color: white; }
      
      .swipe-action-btn-full.btn-casual { border-color: #3b82f6; color: #3b82f6; }
      .swipe-action-btn-full.btn-casual:hover { background: #3b82f6; color: white; }
      
      .swipe-action-btn-full.btn-archive { border-color: #ef4444; color: #ef4444; }
      .swipe-action-btn-full.btn-archive:hover { background: #ef4444; color: white; }
      
      .swipe-action-btn-full.btn-save-later { border-color: #f59e0b; color: #f59e0b; }
      .swipe-action-btn-full.btn-save-later:hover { background: #f59e0b; color: white; }
      
      .swipe-action-btn-full.btn-done { border-color: #6366f1; color: #6366f1; }
      .swipe-action-btn-full.btn-done:hover { background: #6366f1; color: white; }
      
      .swipe-action-btn-icon {
        font-size: 1.25rem;
        flex-shrink: 0;
        width: 28px;
        text-align: center;
      }
      
      .swipe-action-btn-label {
        flex: 1;
      }
      
      /* Keyboard shortcut - clean prominent styling */
      .swipe-action-btn-shortcut {
        font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
        font-size: 0.875rem;
        font-weight: 700;
        padding: 4px 10px;
        border-radius: 4px;
        min-width: 32px;
        text-align: center;
        border: 2px solid currentColor;
        background: transparent;
        opacity: 0.7;
        letter-spacing: 0.5px;
      }
      
      .swipe-action-btn-full:hover .swipe-action-btn-shortcut {
        opacity: 1;
        border-color: white;
        color: white;
      }
      
      /* Divider between circles and actions */
      .swipe-action-divider {
        height: 1px;
        background: var(--border-subtle, #e5e7eb);
        margin: 0.25rem 0;
      }
      
      /* Score popup animation */
      .score-popup {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 2rem;
        font-weight: 700;
        color: #10b981;
        pointer-events: none;
        animation: scorePopup 0.6s ease-out forwards;
        z-index: 100;
      }
      
      @keyframes scorePopup {
        0% { opacity: 1; transform: translate(-50%, -50%) scale(0.5); }
        50% { opacity: 1; transform: translate(-50%, -80%) scale(1.2); }
        100% { opacity: 0; transform: translate(-50%, -120%) scale(1); }
      }
      
      /* Completion Screen */
      .swipe-complete {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 2rem;
        text-align: center;
        grid-column: 1 / -1;
        min-height: 480px;
      }
      
      .swipe-complete-icon {
        font-size: 4rem;
        margin-bottom: 1rem;
        animation: celebrateBounce 0.5s ease;
      }
      
      @keyframes celebrateBounce {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.2); }
      }
      
      .swipe-complete-title {
        font-size: 1.5rem;
        font-weight: 700;
        color: var(--text-primary, #1f2937);
        margin-bottom: 0.75rem;
      }
      
      .swipe-complete-subtitle {
        font-size: 1rem;
        color: var(--text-secondary, #6b7280);
        margin-bottom: 1.5rem;
      }
      
      .swipe-complete-stats {
        display: flex;
        gap: 1.5rem;
        margin-bottom: 1.5rem;
        padding: 1.25rem 2rem;
        background: var(--bg-secondary, #f5f5f4);
        border-radius: 16px;
      }
      
      .swipe-complete-stat {
        text-align: center;
        min-width: 80px;
      }
      
      .swipe-complete-stat-value {
        font-size: 2.25rem;
        font-weight: 700;
        color: var(--accent-primary, #fb923c);
        line-height: 1.2;
      }
      
      .swipe-complete-stat-value.saved {
        color: #f59e0b;
      }
      
      .swipe-complete-stat-value.best {
        color: #8b5cf6;
      }
      
      .swipe-complete-stat-label {
        font-size: 0.8125rem;
        color: var(--text-secondary, #6b7280);
        margin-top: 0.25rem;
      }
      
      /* Saved contacts section */
      .swipe-saved-section {
        width: 100%;
        max-width: 400px;
        margin-bottom: 1.5rem;
        padding: 1rem;
        background: rgba(245, 158, 11, 0.08);
        border: 1px solid rgba(245, 158, 11, 0.2);
        border-radius: 12px;
      }
      
      .swipe-saved-header {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.9375rem;
        font-weight: 600;
        color: #b45309;
        margin-bottom: 0.75rem;
      }
      
      .swipe-saved-list {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        max-height: 100px;
        overflow-y: auto;
      }
      
      .swipe-saved-chip {
        display: inline-flex;
        align-items: center;
        padding: 0.375rem 0.75rem;
        background: white;
        border: 1px solid rgba(245, 158, 11, 0.3);
        border-radius: 16px;
        font-size: 0.8125rem;
        color: var(--text-primary, #1f2937);
      }
      
      .swipe-complete-message {
        font-size: 1rem;
        color: var(--text-secondary, #6b7280);
        margin-bottom: 1.5rem;
        max-width: 360px;
        line-height: 1.5;
      }
      
      .swipe-complete-actions {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        width: 100%;
        max-width: 300px;
      }
      
      .swipe-complete-btn {
        padding: 0.875rem 1.25rem;
        border-radius: 10px;
        font-size: 1rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.15s ease;
        border: 2px solid;
      }
      
      .swipe-complete-btn.btn-primary {
        background: var(--accent-primary, #fb923c);
        border-color: var(--accent-primary, #fb923c);
        color: white;
      }
      
      .swipe-complete-btn.btn-primary:hover {
        background: var(--accent-hover, #f97316);
        border-color: var(--accent-hover, #f97316);
      }
      
      .swipe-complete-btn.btn-secondary {
        background: transparent;
        border-color: var(--border-subtle, #e5e7eb);
        color: var(--text-primary, #1f2937);
      }
      
      .swipe-complete-btn.btn-secondary:hover {
        background: var(--bg-secondary, #f5f5f4);
      }
      
      /* Saved for Later Badge */
      .saved-later-badge {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        padding: 0.25rem 0.5rem;
        background: rgba(245, 158, 11, 0.1);
        color: #f59e0b;
        border-radius: 12px;
        font-size: 0.75rem;
        font-weight: 600;
        margin-left: 0.5rem;
      }
      
      /* New High Score Banner */
      .new-high-score-banner {
        background: linear-gradient(135deg, #fbbf24, #f59e0b);
        color: white;
        padding: 0.625rem 1.25rem;
        border-radius: 10px;
        font-size: 1rem;
        font-weight: 700;
        margin-bottom: 1rem;
        animation: highScorePulse 0.5s ease;
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      
      @keyframes highScorePulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
      }
      
      /* Mobile responsive - Stack columns */
      @media (max-width: 768px) {
        .swipe-mode-container {
          grid-template-columns: 1fr;
          gap: 1rem;
          padding: 0.75rem;
          min-height: auto;
        }
        
        .swipe-left-column {
          order: 1;
        }
        
        .swipe-right-column {
          order: 2;
          padding-top: 0;
        }
        
        .swipe-card-wrapper {
          max-width: 260px;
          height: 180px;
        }
        
        .swipe-avatar {
          width: 52px;
          height: 52px;
          font-size: 1.25rem;
        }
        
        .swipe-contact-name {
          font-size: 1.125rem;
        }
        
        .swipe-action-btn-full {
          padding: 0.75rem 0.875rem;
          font-size: 0.875rem;
        }
        
        .swipe-action-btn-icon {
          font-size: 1.125rem;
          width: 24px;
        }
        
        .swipe-action-btn-shortcut {
          font-size: 0.6875rem;
          padding: 3px 8px;
          min-width: 28px;
        }
      }
      
      /* Legacy styles for backward compatibility */
      .swipe-circle-buttons,
      .swipe-action-buttons {
        display: none;
      }
      
      .swipe-action-btn {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.375rem;
        padding: 0.625rem 0.5rem;
        min-height: 40px;
        border-radius: 8px;
        border: 2px solid #6b7280;
        background: var(--bg-surface, #ffffff);
        color: #6b7280;
        font-size: 0.75rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      
      .swipe-action-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
      }
      
      .swipe-action-btn:active {
        transform: translateY(0);
      }
      
      .swipe-action-btn.btn-archive {
        border-color: #ef4444;
        color: #ef4444;
      }
      
      .swipe-action-btn.btn-archive:hover {
        background: #ef4444;
        color: white;
      }
      
      .swipe-action-btn.btn-save-later {
        border-color: #f59e0b;
        color: #f59e0b;
      }
      
      .swipe-action-btn.btn-save-later:hover {
        background: #f59e0b;
        color: white;
      }
      
      .swipe-action-btn.btn-done {
        border-color: #3b82f6;
        color: #3b82f6;
      }
      
      .swipe-action-btn.btn-done:hover {
        background: #3b82f6;
        color: white;
      }
      
      .swipe-action-btn-icon {
        font-size: 0.875rem;
      }
      
      .swipe-action-btn-shortcut {
        font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
        font-size: 0.75rem;
        font-weight: 700;
        padding: 2px 6px;
        border-radius: 3px;
        border: 1.5px solid currentColor;
        background: transparent;
        margin-left: 0.25rem;
      }
      
      /* Score popup animation */
      .score-popup {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 1.5rem;
        font-weight: 700;
        color: #10b981;
        pointer-events: none;
        animation: scorePopup 0.6s ease-out forwards;
        z-index: 100;
      }
      
      @keyframes scorePopup {
        0% { opacity: 1; transform: translate(-50%, -50%) scale(0.5); }
        50% { opacity: 1; transform: translate(-50%, -80%) scale(1.2); }
        100% { opacity: 0; transform: translate(-50%, -120%) scale(1); }
      }
      
      /* Completion Screen */
      .swipe-complete {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 1.5rem;
        text-align: center;
        height: 100%;
      }
      
      .swipe-complete-icon {
        font-size: 3rem;
        margin-bottom: 0.75rem;
        animation: celebrateBounce 0.5s ease;
      }
      
      @keyframes celebrateBounce {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.2); }
      }
      
      .swipe-complete-title {
        font-size: 1.25rem;
        font-weight: 700;
        color: var(--text-primary, #1f2937);
        margin-bottom: 0.5rem;
      }
      
      .swipe-complete-subtitle {
        font-size: 0.9375rem;
        color: var(--text-secondary, #6b7280);
        margin-bottom: 1rem;
      }
      
      .swipe-complete-stats {
        display: flex;
        gap: 1.5rem;
        margin-bottom: 1rem;
        padding: 0.75rem 1.25rem;
        background: var(--bg-secondary, #f5f5f4);
        border-radius: 12px;
      }
      
      .swipe-complete-stat {
        text-align: center;
      }
      
      .swipe-complete-stat-value {
        font-size: 1.5rem;
        font-weight: 700;
        color: var(--accent-primary, #fb923c);
      }
      
      .swipe-complete-stat-label {
        font-size: 0.6875rem;
        color: var(--text-secondary, #6b7280);
      }
      
      .swipe-complete-message {
        font-size: 0.875rem;
        color: var(--text-secondary, #6b7280);
        margin-bottom: 1rem;
        max-width: 280px;
      }
      
      .swipe-complete-actions {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        width: 100%;
        max-width: 240px;
      }
      
      .swipe-complete-btn {
        padding: 0.75rem 1rem;
        border-radius: 8px;
        font-size: 0.875rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.15s ease;
        border: 2px solid;
      }
      
      .swipe-complete-btn.btn-primary {
        background: var(--accent-primary, #fb923c);
        border-color: var(--accent-primary, #fb923c);
        color: white;
      }
      
      .swipe-complete-btn.btn-primary:hover {
        background: var(--accent-hover, #f97316);
        border-color: var(--accent-hover, #f97316);
      }
      
      .swipe-complete-btn.btn-secondary {
        background: transparent;
        border-color: var(--border-subtle, #e5e7eb);
        color: var(--text-primary, #1f2937);
      }
      
      .swipe-complete-btn.btn-secondary:hover {
        background: var(--bg-secondary, #f5f5f4);
      }
      
      /* Saved for Later Badge */
      .saved-later-badge {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        padding: 0.25rem 0.5rem;
        background: rgba(245, 158, 11, 0.1);
        color: #f59e0b;
        border-radius: 12px;
        font-size: 0.6875rem;
        font-weight: 600;
        margin-left: 0.5rem;
      }
      
      /* New High Score Banner */
      .new-high-score-banner {
        background: linear-gradient(135deg, #fbbf24, #f59e0b);
        color: white;
        padding: 0.5rem 1rem;
        border-radius: 8px;
        font-size: 0.875rem;
        font-weight: 700;
        margin-bottom: 0.75rem;
        animation: highScorePulse 0.5s ease;
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      
      @keyframes highScorePulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
      }
      
      /* Mobile responsive */
      @media (max-width: 768px) {
        .swipe-mode-container {
          padding: 0.5rem;
        }
        
        .swipe-card-wrapper {
          max-width: 280px;
          height: 140px;
        }
        
        .swipe-avatar {
          width: 40px;
          height: 40px;
          font-size: 1rem;
        }
        
        .swipe-contact-name {
          font-size: 0.9375rem;
        }
        
        .swipe-circle-buttons,
        .swipe-action-buttons {
          max-width: 280px;
        }
        
        .swipe-circle-btn {
          min-height: 48px;
          padding: 0.375rem 0.125rem;
        }
        
        .swipe-circle-btn-icon {
          font-size: 0.875rem;
        }
        
        .swipe-action-btn {
          min-height: 36px;
          padding: 0.5rem 0.375rem;
          font-size: 0.6875rem;
        }
      }
    `;
    
    document.head.appendChild(style);
  }

  /**
   * Render the component
   */
  render() {
    const container = document.getElementById(this.containerId);
    if (!container) {
      console.error(`Container with id "${this.containerId}" not found`);
      return;
    }
    
    this.removeKeyboardListeners();
    
    if (this.contacts.length === 0 || this.currentIndex >= this.contacts.length) {
      container.innerHTML = this.renderComplete();
      this.attachCompleteListeners();
      return;
    }
    
    container.innerHTML = this.renderCard();
    this.attachEventListeners();
  }
  
  renderCard() {
    const contact = this.contacts[this.currentIndex];
    const remaining = this.contacts.length - this.currentIndex;
    const savedCount = this.savedForLater.length;
    
    return `
      <div class="swipe-mode-container">
        <!-- Left Column: Stats + Contact Card -->
        <div class="swipe-left-column">
          <div class="swipe-session-stats">
            <div class="swipe-stat">
              <span class="swipe-stat-icon">⚡</span>
              <span class="swipe-stat-label">Session</span>
              <span class="swipe-stat-value" id="session-score">${this.sessionScore}</span>
            </div>
            <div class="swipe-stat">
              <span class="swipe-stat-icon">🏆</span>
              <span class="swipe-stat-label">Best</span>
              <span class="swipe-stat-value high-score" id="high-score">${this.highScore}</span>
            </div>
            ${savedCount > 0 ? `
              <div class="swipe-stat">
                <span class="swipe-stat-icon">📌</span>
                <span class="swipe-stat-value">${savedCount}</span>
              </div>
            ` : ''}
          </div>
          
          <div class="swipe-remaining">${remaining} contact${remaining !== 1 ? 's' : ''} remaining</div>
          
          <div class="swipe-card-wrapper" id="card-wrapper">
            <div class="swipe-card entering" id="current-contact-card">
              <div class="swipe-archive-overlay">
                <span class="swipe-archive-overlay-icon">🗑️</span>
                <span class="swipe-archive-overlay-text">Archive</span>
              </div>
              <div class="swipe-avatar">${this.getInitials(contact.name)}</div>
              <div class="swipe-contact-name">${this.escapeHtml(contact.name)}</div>
              <div class="swipe-contact-meta">${this.getContactMeta(contact)}</div>
              <div class="swipe-hint-compact">
                <span>← swipe →</span>
                <span>or use buttons</span>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Right Column: Action Buttons -->
        <div class="swipe-right-column">
          <button class="swipe-action-btn-full btn-inner" data-circle="inner">
            <span class="swipe-action-btn-icon">💜</span>
            <span class="swipe-action-btn-label">Inner Circle</span>
            <span class="swipe-action-btn-shortcut">1</span>
          </button>
          <button class="swipe-action-btn-full btn-close" data-circle="close">
            <span class="swipe-action-btn-icon">💗</span>
            <span class="swipe-action-btn-label">Close Friends</span>
            <span class="swipe-action-btn-shortcut">2</span>
          </button>
          <button class="swipe-action-btn-full btn-active" data-circle="active">
            <span class="swipe-action-btn-icon">💚</span>
            <span class="swipe-action-btn-label">Active Friends</span>
            <span class="swipe-action-btn-shortcut">3</span>
          </button>
          <button class="swipe-action-btn-full btn-casual" data-circle="casual">
            <span class="swipe-action-btn-icon">💙</span>
            <span class="swipe-action-btn-label">Casual Friends</span>
            <span class="swipe-action-btn-shortcut">4</span>
          </button>
          
          <div class="swipe-action-divider"></div>
          
          <button class="swipe-action-btn-full btn-archive" id="archive-contact">
            <span class="swipe-action-btn-icon">🗑️</span>
            <span class="swipe-action-btn-label">Archive Contact</span>
            <span class="swipe-action-btn-shortcut">A</span>
          </button>
          <button class="swipe-action-btn-full btn-save-later" id="save-later-contact">
            <span class="swipe-action-btn-icon">📌</span>
            <span class="swipe-action-btn-label">Save for Later</span>
            <span class="swipe-action-btn-shortcut">S</span>
          </button>
          <button class="swipe-action-btn-full btn-done" id="done-refining">
            <span class="swipe-action-btn-icon">✓</span>
            <span class="swipe-action-btn-label">Done for Now</span>
            <span class="swipe-action-btn-shortcut">D</span>
          </button>
        </div>
      </div>
    `;
  }
  
  getContactMeta(contact) {
    if (contact.company) return this.escapeHtml(contact.company);
    if (contact.email) return this.escapeHtml(contact.email);
    if (contact.phone) return this.escapeHtml(contact.phone);
    return '';
  }
  
  renderComplete() {
    const isNewHighScore = this.sessionScore > 0 && this.sessionScore >= this.highScore;
    const savedCount = this.savedForLater.length;
    
    // Save high score
    this.saveHighScore();
    
    // Calculate session duration
    const sessionDuration = Math.round((Date.now() - this.sessionStartTime) / 1000);
    const minutes = Math.floor(sessionDuration / 60);
    const seconds = sessionDuration % 60;
    const durationText = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
    
    // Determine completion state
    const allDone = this.contacts.length === 0 && savedCount === 0;
    
    let title = '';
    let subtitle = '';
    let icon = '';
    
    if (allDone) {
      title = 'All Done!';
      subtitle = "You've organized all your contacts. Great work!";
      icon = '🎉';
    } else if (savedCount > 0) {
      title = 'Session Complete';
      subtitle = `You organized ${this.sessionScore} contact${this.sessionScore !== 1 ? 's' : ''} and saved ${savedCount} for later.`;
      icon = '✨';
    } else {
      title = 'Session Complete';
      subtitle = `You organized ${this.sessionScore} contact${this.sessionScore !== 1 ? 's' : ''} this session.`;
      icon = '✨';
    }
    
    // Build saved contacts list HTML
    let savedContactsHtml = '';
    if (savedCount > 0) {
      const savedChips = this.savedForLater.map(contact => 
        `<span class="swipe-saved-chip">${this.escapeHtml(contact.name)}</span>`
      ).join('');
      
      savedContactsHtml = `
        <div class="swipe-saved-section">
          <div class="swipe-saved-header">
            <span>📌</span>
            <span>Saved for Later (${savedCount})</span>
          </div>
          <div class="swipe-saved-list">
            ${savedChips}
          </div>
        </div>
      `;
    }
    
    return `
      <div class="swipe-mode-container">
        <div class="swipe-complete">
          ${isNewHighScore && this.sessionScore > 0 ? `
            <div class="new-high-score-banner">
              <span>🎉</span>
              <span>New High Score!</span>
            </div>
          ` : ''}
          <div class="swipe-complete-icon">${icon}</div>
          <div class="swipe-complete-title">${title}</div>
          <div class="swipe-complete-subtitle">${subtitle}</div>
          
          <div class="swipe-complete-stats">
            <div class="swipe-complete-stat">
              <div class="swipe-complete-stat-value">${this.sessionScore}</div>
              <div class="swipe-complete-stat-label">Organized</div>
            </div>
            ${savedCount > 0 ? `
              <div class="swipe-complete-stat">
                <div class="swipe-complete-stat-value saved">${savedCount}</div>
                <div class="swipe-complete-stat-label">Saved</div>
              </div>
            ` : ''}
            <div class="swipe-complete-stat">
              <div class="swipe-complete-stat-value best">${this.highScore}</div>
              <div class="swipe-complete-stat-label">Best Score</div>
            </div>
          </div>
          
          ${savedContactsHtml}
          
          <div class="swipe-complete-actions">
            ${savedCount > 0 ? `
              <button class="swipe-complete-btn btn-primary" id="review-saved">
                📌 Review Saved Contacts (${savedCount})
              </button>
              <button class="swipe-complete-btn btn-secondary" id="finish-refining">
                Done for Now
              </button>
            ` : `
              <button class="swipe-complete-btn btn-primary" id="finish-refining">
                ${allDone ? 'Close' : 'Done'}
              </button>
            `}
          </div>
        </div>
      </div>
    `;
  }
  
  attachEventListeners() {
    // Circle buttons (new full-width style)
    const circleButtons = document.querySelectorAll('.swipe-action-btn-full[data-circle]');
    circleButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const circle = e.currentTarget.dataset.circle;
        e.currentTarget.classList.add('pressed');
        setTimeout(() => e.currentTarget.classList.remove('pressed'), 200);
        this.handleAssignment(circle);
      });
    });
    
    // Archive button
    const archiveBtn = document.getElementById('archive-contact');
    if (archiveBtn) {
      archiveBtn.addEventListener('click', () => this.handleArchive());
    }
    
    // Save for later button
    const saveLaterBtn = document.getElementById('save-later-contact');
    if (saveLaterBtn) {
      saveLaterBtn.addEventListener('click', () => this.handleSaveForLater());
    }
    
    // Done button
    const doneBtn = document.getElementById('done-refining');
    if (doneBtn) {
      doneBtn.addEventListener('click', () => this.handleDone());
    }
    
    // Touch gestures
    const card = document.getElementById('current-contact-card');
    if (card) {
      this.attachTouchListeners(card);
      // Remove entering class after animation
      setTimeout(() => card.classList.remove('entering'), 250);
    }
    
    this.attachKeyboardListeners();
  }
  
  attachKeyboardListeners() {
    this.keyboardHandler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (this.isAnimating) return;
      
      const handledKeys = ['1', '2', '3', '4', 's', 'd', 'a', ' ', 'Enter'];
      if (handledKeys.includes(e.key.toLowerCase())) {
        e.preventDefault();
      }
      
      switch(e.key) {
        case '1': this.handleAssignment('inner'); break;
        case '2': this.handleAssignment('close'); break;
        case '3': this.handleAssignment('active'); break;
        case '4': this.handleAssignment('casual'); break;
        case 's': case 'S': case ' ': this.handleSaveForLater(); break;
        case 'd': case 'D': case 'Enter': this.handleDone(); break;
        case 'a': case 'A': this.handleArchive(); break;
      }
    };
    
    document.addEventListener('keydown', this.keyboardHandler);
  }
  
  removeKeyboardListeners() {
    if (this.keyboardHandler) {
      document.removeEventListener('keydown', this.keyboardHandler);
      this.keyboardHandler = null;
    }
  }
  
  attachCompleteListeners() {
    const finishBtn = document.getElementById('finish-refining');
    if (finishBtn) {
      finishBtn.addEventListener('click', () => this.finishAndClose());
    }
    
    const reviewBtn = document.getElementById('review-saved');
    if (reviewBtn) {
      reviewBtn.addEventListener('click', () => this.handleReviewSaved());
    }
  }
  
  attachTouchListeners(card) {
    card.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: true });
    card.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
    card.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: true });
    
    card.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    card.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    card.addEventListener('mouseup', (e) => this.handleMouseUp(e));
    card.addEventListener('mouseleave', (e) => this.handleMouseUp(e));
  }
  
  handleTouchStart(event) {
    if (this.isAnimating) return;
    this.touchStartX = event.touches[0].clientX;
    this.touchStartY = event.touches[0].clientY;
    this.touchStartTime = Date.now();
    this.isDragging = true;
    event.currentTarget.classList.add('dragging');
  }
  
  handleTouchMove(event) {
    if (!this.isDragging || this.isAnimating) return;
    
    this.touchEndX = event.touches[0].clientX;
    this.touchEndY = event.touches[0].clientY;
    
    const deltaX = this.touchEndX - this.touchStartX;
    const deltaY = this.touchEndY - this.touchStartY;
    const card = event.currentTarget;
    
    const isHorizontal = Math.abs(deltaX) > Math.abs(deltaY);
    const isVerticalDown = deltaY > 0 && Math.abs(deltaY) > Math.abs(deltaX);
    
    if (isHorizontal) {
      event.preventDefault();
      card.style.transform = `translateX(${deltaX}px) rotate(${deltaX * 0.03}deg)`;
      card.classList.toggle('swiping-left', deltaX < -this.SWIPE_THRESHOLD);
      card.classList.toggle('swiping-right', deltaX > this.SWIPE_THRESHOLD);
      card.classList.remove('swiping-down');
    } else if (isVerticalDown) {
      event.preventDefault();
      card.style.transform = `translateY(${deltaY}px)`;
      card.classList.toggle('swiping-down', deltaY > this.VERTICAL_SWIPE_THRESHOLD);
      card.classList.remove('swiping-left', 'swiping-right');
    }
  }
  
  handleTouchEnd(event) {
    if (!this.isDragging || this.isAnimating) return;
    
    this.isDragging = false;
    const card = event.currentTarget;
    card.classList.remove('dragging', 'swiping-left', 'swiping-right', 'swiping-down');
    
    const deltaX = this.touchEndX - this.touchStartX;
    const deltaY = this.touchEndY - this.touchStartY;
    
    const isHorizontal = Math.abs(deltaX) > Math.abs(deltaY);
    const isVerticalDown = deltaY > 0 && Math.abs(deltaY) > Math.abs(deltaX);
    
    if (isHorizontal && Math.abs(deltaX) > this.SWIPE_THRESHOLD) {
      this.handleSwipe(deltaX);
    } else if (isVerticalDown && deltaY > this.VERTICAL_SWIPE_THRESHOLD) {
      this.handleArchive();
    } else {
      card.style.transform = '';
    }
  }
  
  handleMouseDown(event) {
    if (this.isAnimating) return;
    this.touchStartX = event.clientX;
    this.touchStartY = event.clientY;
    this.touchStartTime = Date.now();
    this.isDragging = true;
    event.currentTarget.classList.add('dragging');
  }
  
  handleMouseMove(event) {
    if (!this.isDragging || this.isAnimating) return;
    
    this.touchEndX = event.clientX;
    this.touchEndY = event.clientY;
    
    const deltaX = this.touchEndX - this.touchStartX;
    const deltaY = this.touchEndY - this.touchStartY;
    const card = event.currentTarget;
    
    const isHorizontal = Math.abs(deltaX) > Math.abs(deltaY);
    const isVerticalDown = deltaY > 0 && Math.abs(deltaY) > Math.abs(deltaX);
    
    if (isHorizontal) {
      card.style.transform = `translateX(${deltaX}px) rotate(${deltaX * 0.03}deg)`;
      card.classList.toggle('swiping-left', deltaX < -this.SWIPE_THRESHOLD);
      card.classList.toggle('swiping-right', deltaX > this.SWIPE_THRESHOLD);
      card.classList.remove('swiping-down');
    } else if (isVerticalDown) {
      card.style.transform = `translateY(${deltaY}px)`;
      card.classList.toggle('swiping-down', deltaY > this.VERTICAL_SWIPE_THRESHOLD);
      card.classList.remove('swiping-left', 'swiping-right');
    }
  }
  
  handleMouseUp(event) {
    if (!this.isDragging || this.isAnimating) return;
    
    this.isDragging = false;
    const card = event.currentTarget;
    card.classList.remove('dragging', 'swiping-left', 'swiping-right', 'swiping-down');
    
    const deltaX = this.touchEndX - this.touchStartX;
    const deltaY = this.touchEndY - this.touchStartY;
    
    const isHorizontal = Math.abs(deltaX) > Math.abs(deltaY);
    const isVerticalDown = deltaY > 0 && Math.abs(deltaY) > Math.abs(deltaX);
    
    if (isHorizontal && Math.abs(deltaX) > this.SWIPE_THRESHOLD) {
      this.handleSwipe(deltaX);
    } else if (isVerticalDown && deltaY > this.VERTICAL_SWIPE_THRESHOLD) {
      this.handleArchive();
    } else {
      card.style.transform = '';
    }
  }
  
  handleSwipe(deltaX) {
    let circle;
    if (deltaX < -150) circle = 'inner';
    else if (deltaX < 0) circle = 'close';
    else if (deltaX < 150) circle = 'active';
    else circle = 'casual';
    
    this.handleAssignment(circle);
  }

  
  /**
   * Handle circle assignment with animation
   */
  async handleAssignment(circle) {
    if (this.isAnimating) return;
    
    const contact = this.contacts[this.currentIndex];
    const card = document.getElementById('current-contact-card');
    
    // Start animation
    this.isAnimating = true;
    
    // Determine exit direction based on circle
    const exitClass = circle === 'inner' || circle === 'close' ? 'exit-left' : 'exit-right';
    if (card) {
      card.classList.add(exitClass);
    }
    
    // Show score popup
    this.showScorePopup('+1');
    
    try {
      const response = await fetch('/api/circles/assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({ contactId: contact.id, circle })
      });
      
      if (!response.ok) throw new Error('Failed to assign');
      
      // Update score
      this.sessionScore++;
      this.updateScoreDisplay();
      
      this.onAssign(contact.id, circle);
      this.onProgress({ current: this.currentIndex + 1, total: this.contacts.length, assigned: circle });
      
    } catch (error) {
      console.error('Error assigning contact:', error);
    }
    
    // Wait for animation then move to next
    setTimeout(() => {
      this.isAnimating = false;
      this.nextContact();
    }, 300);
  }
  
  /**
   * Handle save for later
   */
  handleSaveForLater() {
    if (this.isAnimating) return;
    
    const contact = this.contacts[this.currentIndex];
    const card = document.getElementById('current-contact-card');
    
    this.isAnimating = true;
    
    if (card) {
      card.classList.add('exit-up');
    }
    
    // Save contact for later review
    this.savedForLater.push(contact);
    
    // Remove from current list
    this.contacts.splice(this.currentIndex, 1);
    
    // Adjust index
    if (this.currentIndex >= this.contacts.length && this.currentIndex > 0) {
      this.currentIndex = this.contacts.length - 1;
    }
    
    setTimeout(() => {
      this.isAnimating = false;
      if (this.contacts.length === 0) {
        this.render();
      } else {
        this.render();
      }
    }, 250);
  }
  
  /**
   * Handle archive with animation
   */
  async handleArchive() {
    if (this.isAnimating) return;
    
    const contact = this.contacts[this.currentIndex];
    const card = document.getElementById('current-contact-card');
    
    this.isAnimating = true;
    
    if (card) {
      card.classList.add('exit-down');
    }
    
    try {
      const response = await fetch('/api/contacts/archive', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({ contactIds: [contact.id] })
      });
      
      if (!response.ok) throw new Error('Failed to archive');
      
      this.contacts.splice(this.currentIndex, 1);
      
      if (this.currentIndex >= this.contacts.length && this.currentIndex > 0) {
        this.currentIndex = this.contacts.length - 1;
      }
      
      window.dispatchEvent(new CustomEvent('contactArchived', { 
        detail: { contactId: contact.id, contactName: contact.name } 
      }));
      
    } catch (error) {
      console.error('Error archiving:', error);
    }
    
    setTimeout(() => {
      this.isAnimating = false;
      this.render();
    }, 300);
  }
  
  /**
   * Handle review saved contacts
   */
  handleReviewSaved() {
    if (this.savedForLater.length === 0) {
      this.finishAndClose();
      return;
    }
    
    // Move saved contacts back to main list
    this.contacts = [...this.savedForLater];
    this.savedForLater = [];
    this.currentIndex = 0;
    
    this.render();
  }
  
  /**
   * Handle done - show completion screen
   */
  handleDone() {
    this.saveHighScore();
    
    // Show completion screen instead of immediately closing
    this.showCompletionScreen();
  }
  
  /**
   * Show the completion screen
   */
  showCompletionScreen() {
    const container = document.getElementById(this.containerId);
    if (!container) return;
    
    this.removeKeyboardListeners();
    container.innerHTML = this.renderComplete();
    this.attachCompleteListeners();
  }
  
  /**
   * Actually finish and close the modal
   */
  finishAndClose() {
    const progress = {
      currentIndex: this.currentIndex,
      totalContacts: this.contacts.length,
      sessionScore: this.sessionScore,
      savedForLater: this.savedForLater.length,
      timestamp: Date.now()
    };
    
    localStorage.setItem('quick-refine-progress', JSON.stringify(progress));
    this.onDone(progress);
  }
  
  /**
   * Show score popup animation
   */
  showScorePopup(text) {
    const wrapper = document.getElementById('card-wrapper');
    if (!wrapper) return;
    
    const popup = document.createElement('div');
    popup.className = 'score-popup';
    popup.textContent = text;
    wrapper.appendChild(popup);
    
    setTimeout(() => {
      if (popup.parentNode) popup.parentNode.removeChild(popup);
    }, 600);
  }
  
  /**
   * Update score display with animation
   */
  updateScoreDisplay() {
    const scoreEl = document.getElementById('session-score');
    const highScoreEl = document.getElementById('high-score');
    
    if (scoreEl) {
      scoreEl.textContent = this.sessionScore;
      scoreEl.classList.add('new-record');
      setTimeout(() => scoreEl.classList.remove('new-record'), 600);
    }
    
    // Check for new high score
    if (this.sessionScore > this.highScore && highScoreEl) {
      this.highScore = this.sessionScore;
      highScoreEl.textContent = this.highScore;
      highScoreEl.classList.add('new-record');
      setTimeout(() => highScoreEl.classList.remove('new-record'), 600);
    }
  }
  
  nextContact() {
    this.currentIndex++;
    this.render();
  }
  
  getInitials(name) {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }
  
  getCircleDisplayName(circle) {
    const names = { 'inner': 'Inner Circle', 'close': 'Close Friends', 'active': 'Active Friends', 'casual': 'Casual Network' };
    return names[circle] || circle;
  }
  
  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  destroy() {
    this.removeKeyboardListeners();
    const container = document.getElementById(this.containerId);
    if (container) container.innerHTML = '';
  }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = QuickRefineCard;
}
