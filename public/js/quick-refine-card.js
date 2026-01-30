/**
 * QuickRefineCard Component
 * 
 * Swipe-style interface for rapidly categorizing uncategorized contacts.
 * Displays contacts one at a time with circle assignment buttons.
 * Supports touch gestures for mobile devices.
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 20.3, 20.5, 20.6
 */

class QuickRefineCard {
  /**
   * Create a QuickRefineCard instance
   * @param {Array} contacts - Uncategorized contacts to refine
   * @param {Object} options - Configuration options
   * @param {Function} options.onAssign - Callback when contact is assigned (contactId, circle)
   * @param {Function} options.onDone - Callback when user exits flow
   * @param {Function} options.onProgress - Callback for progress updates
   * @param {string} options.containerId - Container element ID
   * @param {string} options.userId - User ID for API calls
   */
  constructor(contacts, options = {}) {
    this.contacts = contacts || [];
    this.currentIndex = 0;
    this.onAssign = options.onAssign || (() => {});
    this.onDone = options.onDone || (() => {});
    this.onProgress = options.onProgress || (() => {});
    this.containerId = options.containerId || 'quick-refine-container';
    this.userId = options.userId;
    
    // Touch gesture tracking
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.touchEndX = 0;
    this.touchEndY = 0;
    this.isDragging = false;
    this.currentTranslateX = 0;
    
    // Swipe thresholds
    this.SWIPE_THRESHOLD = 100; // Minimum distance for swipe
    this.SWIPE_VELOCITY_THRESHOLD = 0.5; // Minimum velocity
    
    this.init();
  }
  
  init() {
    this.setupStyles();
  }
  
  setupStyles() {
    // Check if styles already exist
    if (document.getElementById('quick-refine-card-styles')) {
      return;
    }
    
    const style = document.createElement('style');
    style.id = 'quick-refine-card-styles';
    style.textContent = `
      .quick-refine-container {
        max-width: 600px;
        margin: 0 auto;
        padding: 2rem 1rem;
        min-height: 500px;
      }
      
      .quick-refine-header {
        text-align: center;
        margin-bottom: 2rem;
      }
      
      .quick-refine-header h2 {
        font-size: 1.75rem;
        font-weight: 600;
        color: var(--text-primary, #1f2937);
        margin-bottom: 0.5rem;
      }
      
      .quick-refine-progress {
        font-size: 1rem;
        color: var(--text-secondary, #6b7280);
        margin-bottom: 1rem;
      }
      
      .quick-refine-progress-bar {
        width: 100%;
        height: 8px;
        background-color: var(--bg-tertiary, #e5e7eb);
        border-radius: 4px;
        overflow: hidden;
        margin-bottom: 0.5rem;
      }
      
      .quick-refine-progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #10b981, #3b82f6);
        transition: width 0.3s ease;
      }
      
      .quick-refine-card-wrapper {
        position: relative;
        width: 100%;
        height: 400px;
        perspective: 1000px;
        margin-bottom: 2rem;
      }
      
      .quick-refine-card {
        position: absolute;
        width: 100%;
        height: 100%;
        background: var(--bg-secondary, #ffffff);
        border-radius: 16px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06);
        padding: 2rem;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        text-align: center;
        cursor: grab;
        user-select: none;
        touch-action: pan-y;
        transition: transform 0.3s ease, opacity 0.3s ease;
      }
      
      .quick-refine-card.dragging {
        cursor: grabbing;
        transition: none;
      }
      
      .quick-refine-card.swiping-left {
        opacity: 0.7;
      }
      
      .quick-refine-card.swiping-right {
        opacity: 0.7;
      }
      
      .contact-avatar {
        width: 80px;
        height: 80px;
        border-radius: 50%;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 2rem;
        font-weight: 600;
        color: white;
        margin-bottom: 1.5rem;
      }
      
      .contact-name {
        font-size: 1.5rem;
        font-weight: 600;
        color: var(--text-primary, #1f2937);
        margin-bottom: 0.5rem;
      }
      
      .contact-metadata {
        font-size: 0.875rem;
        color: var(--text-secondary, #6b7280);
        margin-bottom: 1rem;
      }
      
      .contact-metadata-item {
        display: inline-block;
        margin: 0 0.5rem;
      }
      
      .contact-last-contact {
        font-size: 0.875rem;
        color: var(--text-tertiary, #9ca3af);
        font-style: italic;
      }
      
      .swipe-hint {
        position: absolute;
        bottom: 1rem;
        left: 50%;
        transform: translateX(-50%);
        font-size: 0.75rem;
        color: var(--text-tertiary, #9ca3af);
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      
      .swipe-hint-arrow {
        font-size: 1rem;
      }
      
      .circle-buttons {
        display: flex;
        flex-direction: row;
        gap: 0.375rem;
        width: 100%;
        max-width: 550px;
        margin-bottom: 0.75rem;
      }
      
      .circle-btn {
        flex: 1;
        padding: 0.375rem 0.25rem;
        border-radius: 6px;
        border: 2px solid var(--border-color, #e5e7eb);
        background: var(--bg-secondary, #ffffff);
        font-size: 0.6875rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.125rem;
        min-height: 52px;
        position: relative;
      }
      
      .circle-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      }
      
      .circle-btn:active {
        transform: translateY(0);
      }
      
      .circle-btn-inner {
        border-color: #8b5cf6;
        color: #8b5cf6;
      }
      
      .circle-btn-inner:hover {
        background-color: #8b5cf6;
        color: white;
      }
      
      .circle-btn-close {
        border-color: #ec4899;
        color: #ec4899;
      }
      
      .circle-btn-close:hover {
        background-color: #ec4899;
        color: white;
      }
      
      .circle-btn-active {
        border-color: #10b981;
        color: #10b981;
      }
      
      .circle-btn-active:hover {
        background-color: #10b981;
        color: white;
      }
      
      .circle-btn-casual {
        border-color: #3b82f6;
        color: #3b82f6;
      }
      
      .circle-btn-casual:hover {
        background-color: #3b82f6;
        color: white;
      }
      
      .circle-btn-icon {
        font-size: 1.125rem;
      }
      
      .circle-btn-label {
        font-size: 0.6875rem;
        line-height: 1.1;
        text-align: center;
      }
      
      .circle-btn-capacity {
        font-size: 0.625rem;
        opacity: 0.7;
        line-height: 1;
      }
      
      .circle-btn-shortcut {
        position: absolute;
        top: 0.125rem;
        right: 0.125rem;
        background: rgba(0, 0, 0, 0.1);
        color: var(--text-secondary, #6b7280);
        font-size: 0.5rem;
        font-weight: 700;
        padding: 0.0625rem 0.1875rem;
        border-radius: 2px;
        line-height: 1;
      }
      
      .quick-refine-actions {
        display: flex;
        gap: 1rem;
        justify-content: center;
        flex-wrap: wrap;
      }
      
      .refine-btn {
        padding: 0.75rem 1.5rem;
        border-radius: 8px;
        font-size: 1rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
        border: none;
      }
      
      .refine-btn-skip {
        background-color: var(--bg-tertiary, #e5e7eb);
        color: var(--text-primary, #1f2937);
      }
      
      .refine-btn-skip:hover {
        background-color: var(--bg-hover, #d1d5db);
      }
      
      .refine-btn-done {
        background-color: var(--primary-color, #3b82f6);
        color: white;
      }
      
      .refine-btn-done:hover {
        background-color: var(--primary-hover, #2563eb);
      }
      
      .quick-refine-empty {
        text-align: center;
        padding: 3rem;
      }
      
      .quick-refine-empty h3 {
        font-size: 1.5rem;
        font-weight: 600;
        color: var(--text-primary, #1f2937);
        margin-bottom: 1rem;
      }
      
      .quick-refine-empty p {
        font-size: 1rem;
        color: var(--text-secondary, #6b7280);
        margin-bottom: 2rem;
      }
      
      .quick-refine-empty-icon {
        font-size: 4rem;
        margin-bottom: 1rem;
      }
      
      /* Mobile responsive */
      @media (max-width: 768px) {
        .quick-refine-container {
          padding: 1rem 0.5rem;
        }
        
        .quick-refine-header h2 {
          font-size: 1.5rem;
        }
        
        .quick-refine-card {
          padding: 1.5rem;
        }
        
        .circle-buttons {
          flex-direction: row;
          gap: 0.25rem;
        }
        
        .circle-btn {
          padding: 0.5rem 0.25rem;
          min-height: 60px;
          font-size: 0.625rem;
        }
        
        .circle-btn-icon {
          font-size: 1rem;
        }
        
        .circle-btn-label {
          font-size: 0.625rem;
        }
        
        .circle-btn-capacity {
          font-size: 0.5625rem;
        }
        
        .contact-avatar {
          width: 60px;
          height: 60px;
          font-size: 1.5rem;
        }
        
        .contact-name {
          font-size: 1.25rem;
        }
      }
      
      /* Touch-friendly tap targets */
      @media (max-width: 768px) {
        .circle-btn {
          min-height: 44px;
          min-width: 44px;
        }
        
        .refine-btn {
          min-height: 44px;
          min-width: 44px;
        }
      }
    `;
    
    document.head.appendChild(style);
  }
  
  /**
   * Render the component
   * Requirements: 7.1, 7.2, 7.3, 7.8
   */
  render() {
    const container = document.getElementById(this.containerId);
    if (!container) {
      console.error(`Container with id "${this.containerId}" not found`);
      return;
    }
    
    // Remove old keyboard listeners before re-rendering
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
    const progress = ((this.currentIndex / this.contacts.length) * 100).toFixed(0);
    
    return `
      <div class="quick-refine-container">
        <div class="quick-refine-header">
          <h2>Quick Refine</h2>
          <div class="quick-refine-progress">
            <div class="quick-refine-progress-bar">
              <div class="quick-refine-progress-fill" style="width: ${progress}%"></div>
            </div>
            <span>${remaining} contact${remaining !== 1 ? 's' : ''} remaining</span>
          </div>
        </div>
        
        <div class="quick-refine-card-wrapper">
          <div class="quick-refine-card" id="current-contact-card">
            <div class="contact-avatar">${this.getInitials(contact.name)}</div>
            <div class="contact-name">${this.escapeHtml(contact.name)}</div>
            ${this.renderContactMetadata(contact)}
            ${this.renderLastContact(contact)}
            <div class="swipe-hint">
              <span class="swipe-hint-arrow">←</span>
              <span>Swipe or use 1-4 keys</span>
              <span class="swipe-hint-arrow">→</span>
            </div>
          </div>
        </div>
        
        <div class="circle-buttons">
          <button class="circle-btn circle-btn-inner" data-circle="inner">
            <span class="circle-btn-shortcut">1</span>
            <span class="circle-btn-icon">💜</span>
            <span class="circle-btn-label">Inner Circle</span>
            <span class="circle-btn-capacity">0-10</span>
          </button>
          <button class="circle-btn circle-btn-close" data-circle="close">
            <span class="circle-btn-shortcut">2</span>
            <span class="circle-btn-icon">💗</span>
            <span class="circle-btn-label">Close Friends</span>
            <span class="circle-btn-capacity">11-25</span>
          </button>
          <button class="circle-btn circle-btn-active" data-circle="active">
            <span class="circle-btn-shortcut">3</span>
            <span class="circle-btn-icon">💚</span>
            <span class="circle-btn-label">Active Friends</span>
            <span class="circle-btn-capacity">26-50</span>
          </button>
          <button class="circle-btn circle-btn-casual" data-circle="casual">
            <span class="circle-btn-shortcut">4</span>
            <span class="circle-btn-icon">💙</span>
            <span class="circle-btn-label">Casual Network</span>
            <span class="circle-btn-capacity">51-100</span>
          </button>
        </div>
        
        <div class="quick-refine-actions">
          <button class="refine-btn refine-btn-skip" id="skip-contact">
            Skip (S)
          </button>
          <button class="refine-btn refine-btn-done" id="done-refining">
            Done for Now (D)
          </button>
        </div>
      </div>
    `;
  }
  
  renderContactMetadata(contact) {
    const metadata = [];
    
    if (contact.email) {
      metadata.push(`<span class="contact-metadata-item">📧 ${this.escapeHtml(contact.email)}</span>`);
    }
    
    if (contact.company) {
      metadata.push(`<span class="contact-metadata-item">🏢 ${this.escapeHtml(contact.company)}</span>`);
    }
    
    if (contact.phone) {
      metadata.push(`<span class="contact-metadata-item">📱 ${this.escapeHtml(contact.phone)}</span>`);
    }
    
    if (metadata.length === 0) {
      return '';
    }
    
    return `<div class="contact-metadata">${metadata.join('')}</div>`;
  }
  
  renderLastContact(contact) {
    if (!contact.lastContactDate) {
      return '';
    }
    
    const date = new Date(contact.lastContactDate);
    const now = new Date();
    const daysSince = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    let timeText = '';
    if (daysSince === 0) {
      timeText = 'Today';
    } else if (daysSince === 1) {
      timeText = 'Yesterday';
    } else if (daysSince < 30) {
      timeText = `${daysSince} days ago`;
    } else if (daysSince < 365) {
      const months = Math.floor(daysSince / 30);
      timeText = `${months} month${months !== 1 ? 's' : ''} ago`;
    } else {
      const years = Math.floor(daysSince / 365);
      timeText = `${years} year${years !== 1 ? 's' : ''} ago`;
    }
    
    return `<div class="contact-last-contact">Last contact: ${timeText}</div>`;
  }
  
  renderComplete() {
    return `
      <div class="quick-refine-container">
        <div class="quick-refine-empty">
          <div class="quick-refine-empty-icon">🎉</div>
          <h3>All Done!</h3>
          <p>You've reviewed all uncategorized contacts.</p>
          <button class="refine-btn refine-btn-done" id="finish-refining">
            Continue
          </button>
        </div>
      </div>
    `;
  }
  
  attachEventListeners() {
    // Circle assignment buttons
    const circleButtons = document.querySelectorAll('.circle-btn');
    circleButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const circle = e.currentTarget.dataset.circle;
        this.handleAssignment(circle);
      });
    });
    
    // Skip button
    const skipBtn = document.getElementById('skip-contact');
    if (skipBtn) {
      skipBtn.addEventListener('click', () => this.handleSkip());
    }
    
    // Done button
    const doneBtn = document.getElementById('done-refining');
    if (doneBtn) {
      doneBtn.addEventListener('click', () => this.handleDone());
    }
    
    // Touch gestures for mobile
    const card = document.getElementById('current-contact-card');
    if (card) {
      this.attachTouchListeners(card);
    }
    
    // Keyboard shortcuts
    this.attachKeyboardListeners();
  }
  
  /**
   * Attach keyboard event listeners for shortcuts
   * Requirements: 7.4
   * 
   * Keyboard shortcuts:
   * - 1: Assign to Inner Circle
   * - 2: Assign to Close Friends
   * - 3: Assign to Active Friends
   * - 4: Assign to Casual Network
   * - S or Space: Skip contact
   * - D or Enter: Done for now
   */
  attachKeyboardListeners() {
    this.keyboardHandler = (e) => {
      // Don't trigger if user is typing in an input field
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }
      
      // Prevent default for keys we handle
      const handledKeys = ['1', '2', '3', '4', 's', 'd', ' ', 'Enter'];
      if (handledKeys.includes(e.key)) {
        e.preventDefault();
      }
      
      switch(e.key) {
        case '1':
          this.handleAssignment('inner');
          break;
        case '2':
          this.handleAssignment('close');
          break;
        case '3':
          this.handleAssignment('active');
          break;
        case '4':
          this.handleAssignment('casual');
          break;
        case 's':
        case 'S':
        case ' ':
          this.handleSkip();
          break;
        case 'd':
        case 'D':
        case 'Enter':
          this.handleDone();
          break;
      }
    };
    
    document.addEventListener('keydown', this.keyboardHandler);
  }
  
  /**
   * Remove keyboard event listeners
   */
  removeKeyboardListeners() {
    if (this.keyboardHandler) {
      document.removeEventListener('keydown', this.keyboardHandler);
      this.keyboardHandler = null;
    }
  }
  
  attachCompleteListeners() {
    const finishBtn = document.getElementById('finish-refining');
    if (finishBtn) {
      finishBtn.addEventListener('click', () => this.handleDone());
    }
  }
  
  /**
   * Attach touch event listeners for swipe gestures
   * Requirements: 7.4, 20.5
   */
  attachTouchListeners(card) {
    card.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: true });
    card.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
    card.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: true });
    
    // Mouse events for desktop testing
    card.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    card.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    card.addEventListener('mouseup', (e) => this.handleMouseUp(e));
    card.addEventListener('mouseleave', (e) => this.handleMouseUp(e));
  }
  
  handleTouchStart(event) {
    this.touchStartX = event.touches[0].clientX;
    this.touchStartY = event.touches[0].clientY;
    this.touchStartTime = Date.now();
    this.isDragging = true;
    
    const card = event.currentTarget;
    card.classList.add('dragging');
  }
  
  handleTouchMove(event) {
    if (!this.isDragging) return;
    
    this.touchEndX = event.touches[0].clientX;
    this.touchEndY = event.touches[0].clientY;
    
    const deltaX = this.touchEndX - this.touchStartX;
    const deltaY = this.touchEndY - this.touchStartY;
    
    // Only handle horizontal swipes
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      event.preventDefault();
      
      const card = event.currentTarget;
      this.currentTranslateX = deltaX;
      card.style.transform = `translateX(${deltaX}px) rotate(${deltaX * 0.05}deg)`;
      
      // Visual feedback
      if (deltaX < -this.SWIPE_THRESHOLD) {
        card.classList.add('swiping-left');
        card.classList.remove('swiping-right');
      } else if (deltaX > this.SWIPE_THRESHOLD) {
        card.classList.add('swiping-right');
        card.classList.remove('swiping-left');
      } else {
        card.classList.remove('swiping-left', 'swiping-right');
      }
    }
  }
  
  handleTouchEnd(event) {
    if (!this.isDragging) return;
    
    this.isDragging = false;
    const card = event.currentTarget;
    card.classList.remove('dragging', 'swiping-left', 'swiping-right');
    
    const deltaX = this.touchEndX - this.touchStartX;
    const deltaY = this.touchEndY - this.touchStartY;
    const deltaTime = Date.now() - this.touchStartTime;
    const velocity = Math.abs(deltaX) / deltaTime;
    
    // Determine if swipe was significant enough
    const isHorizontalSwipe = Math.abs(deltaX) > Math.abs(deltaY);
    const isSignificantSwipe = Math.abs(deltaX) > this.SWIPE_THRESHOLD || velocity > this.SWIPE_VELOCITY_THRESHOLD;
    
    if (isHorizontalSwipe && isSignificantSwipe) {
      // Map swipe direction to circle
      this.handleSwipe(deltaX);
    } else {
      // Reset card position
      card.style.transform = '';
    }
    
    // Reset tracking
    this.currentTranslateX = 0;
  }
  
  // Mouse event handlers for desktop
  handleMouseDown(event) {
    this.touchStartX = event.clientX;
    this.touchStartY = event.clientY;
    this.touchStartTime = Date.now();
    this.isDragging = true;
    
    const card = event.currentTarget;
    card.classList.add('dragging');
  }
  
  handleMouseMove(event) {
    if (!this.isDragging) return;
    
    this.touchEndX = event.clientX;
    this.touchEndY = event.clientY;
    
    const deltaX = this.touchEndX - this.touchStartX;
    
    const card = event.currentTarget;
    this.currentTranslateX = deltaX;
    card.style.transform = `translateX(${deltaX}px) rotate(${deltaX * 0.05}deg)`;
    
    // Visual feedback
    if (deltaX < -this.SWIPE_THRESHOLD) {
      card.classList.add('swiping-left');
      card.classList.remove('swiping-right');
    } else if (deltaX > this.SWIPE_THRESHOLD) {
      card.classList.add('swiping-right');
      card.classList.remove('swiping-left');
    } else {
      card.classList.remove('swiping-left', 'swiping-right');
    }
  }
  
  handleMouseUp(event) {
    if (!this.isDragging) return;
    
    this.isDragging = false;
    const card = event.currentTarget;
    card.classList.remove('dragging', 'swiping-left', 'swiping-right');
    
    const deltaX = this.touchEndX - this.touchStartX;
    const deltaTime = Date.now() - this.touchStartTime;
    const velocity = Math.abs(deltaX) / deltaTime;
    
    const isSignificantSwipe = Math.abs(deltaX) > this.SWIPE_THRESHOLD || velocity > this.SWIPE_VELOCITY_THRESHOLD;
    
    if (isSignificantSwipe) {
      this.handleSwipe(deltaX);
    } else {
      card.style.transform = '';
    }
    
    this.currentTranslateX = 0;
  }
  
  /**
   * Handle swipe gesture and map to circle assignment
   * Requirements: 7.4, 20.5
   * 
   * Swipe mapping:
   * - Swipe left (far): Inner Circle
   * - Swipe left (near): Close Friends
   * - Swipe right (near): Active Friends
   * - Swipe right (far): Casual Network
   */
  handleSwipe(deltaX) {
    let circle;
    
    if (deltaX < -200) {
      // Far left swipe -> Inner Circle
      circle = 'inner';
    } else if (deltaX < 0) {
      // Near left swipe -> Close Friends
      circle = 'close';
    } else if (deltaX < 200) {
      // Near right swipe -> Active Friends
      circle = 'active';
    } else {
      // Far right swipe -> Casual Network
      circle = 'casual';
    }
    
    this.handleAssignment(circle);
  }
  
  /**
   * Handle circle assignment
   * Requirements: 7.1, 7.2
   */
  async handleAssignment(circle) {
    const contact = this.contacts[this.currentIndex];
    
    try {
      // Call API to assign contact to circle
      const response = await fetch('/api/circles/assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          contactId: contact.id,
          circle: circle
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to assign contact: ${response.statusText}`);
      }
      
      // Notify callback
      this.onAssign(contact.id, circle);
      
      // Update progress
      this.onProgress({
        current: this.currentIndex + 1,
        total: this.contacts.length,
        assigned: circle
      });
      
      // Show success feedback
      if (typeof showToast === 'function') {
        showToast(`${contact.name} added to ${this.getCircleDisplayName(circle)}`, 'success');
      }
      
      // Move to next contact
      this.nextContact();
      
    } catch (error) {
      console.error('Error assigning contact:', error);
      if (typeof showToast === 'function') {
        showToast(`Failed to assign contact: ${error.message}`, 'error');
      }
    }
  }
  
  /**
   * Handle skip action
   * Requirements: 7.5
   */
  handleSkip() {
    this.nextContact();
  }
  
  /**
   * Handle done action
   * Requirements: 7.6, 7.7
   */
  handleDone() {
    // Save progress
    const progress = {
      currentIndex: this.currentIndex,
      totalContacts: this.contacts.length,
      timestamp: Date.now()
    };
    
    // Store in localStorage for resumption
    localStorage.setItem('quick-refine-progress', JSON.stringify(progress));
    
    // Notify callback
    this.onDone(progress);
  }
  
  /**
   * Move to next contact
   */
  nextContact() {
    this.currentIndex++;
    this.render();
  }
  
  /**
   * Get initials from name
   */
  getInitials(name) {
    if (!name) return '?';
    
    const parts = name.trim().split(' ');
    if (parts.length === 1) {
      return parts[0].charAt(0).toUpperCase();
    }
    
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }
  
  /**
   * Get circle display name
   */
  getCircleDisplayName(circle) {
    const names = {
      'inner': 'Inner Circle',
      'close': 'Close Friends',
      'active': 'Active Friends',
      'casual': 'Casual Network'
    };
    return names[circle] || circle;
  }
  
  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  /**
   * Destroy the component
   */
  destroy() {
    // Remove keyboard listeners
    this.removeKeyboardListeners();
    
    const container = document.getElementById(this.containerId);
    if (container) {
      container.innerHTML = '';
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = QuickRefineCard;
}
