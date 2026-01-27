/**
 * ProgressTracker Component
 * 
 * Displays progress tracking with percentage, absolute numbers, and estimated time remaining.
 * Includes milestone celebrations and circle capacity indicators.
 * 
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7
 */

class ProgressTracker {
  constructor(options = {}) {
    this.containerId = options.containerId || 'progress-tracker-container';
    this.totalContacts = options.totalContacts || 0;
    this.categorizedContacts = options.categorizedContacts || 0;
    this.onMilestone = options.onMilestone || (() => {});
    this.startTime = options.startTime || Date.now();
    this.circleCapacities = options.circleCapacities || {
      inner: { current: 0, max: 10 },
      close: { current: 0, max: 25 },
      active: { current: 0, max: 50 },
      casual: { current: 0, max: 100 }
    };
    
    // Milestone tracking
    this.milestones = [
      { threshold: 25, message: "Great start! You're 25% done!", reached: false },
      { threshold: 50, message: "Halfway there! Keep going!", reached: false },
      { threshold: 75, message: "Almost done! You're doing great!", reached: false },
      { threshold: 100, message: "🎉 All contacts organized! Amazing work!", reached: false }
    ];
    
    // Track categorization history for pace calculation
    this.categorizationHistory = [];
    
    this.init();
  }
  
  init() {
    this.setupStyles();
  }
  
  setupStyles() {
    // Check if styles already exist
    if (document.getElementById('progress-tracker-styles')) {
      return;
    }
    
    const style = document.createElement('style');
    style.id = 'progress-tracker-styles';
    style.textContent = `
      .progress-tracker {
        background: var(--bg-surface, #ffffff);
        border: 1px solid var(--border-subtle, #e5e7eb);
        border-radius: 12px;
        padding: 1.5rem;
        margin-bottom: 1.5rem;
      }
      
      .progress-tracker__header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
      }
      
      .progress-tracker__title {
        font-size: 1rem;
        font-weight: 600;
        color: var(--text-primary, #1f2937);
        margin: 0;
      }
      
      .progress-tracker__stats {
        font-size: 0.875rem;
        color: var(--text-secondary, #6b7280);
      }
      
      .progress-tracker__bar-container {
        position: relative;
        margin-bottom: 0.75rem;
      }
      
      .progress-tracker__bar {
        height: 12px;
        background: var(--bg-tertiary, #e5e7eb);
        border-radius: 6px;
        overflow: hidden;
        position: relative;
      }
      
      .progress-tracker__bar-fill {
        height: 100%;
        background: linear-gradient(90deg, #10b981, #3b82f6);
        border-radius: 6px;
        transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        position: relative;
        overflow: hidden;
      }
      
      .progress-tracker__bar-fill::after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        bottom: 0;
        right: 0;
        background: linear-gradient(
          90deg,
          transparent,
          rgba(255, 255, 255, 0.3),
          transparent
        );
        animation: shimmer 2s infinite;
      }
      
      @keyframes shimmer {
        0% {
          transform: translateX(-100%);
        }
        100% {
          transform: translateX(100%);
        }
      }
      
      .progress-tracker__percentage {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 0.75rem;
        font-weight: 700;
        color: var(--text-primary, #1f2937);
        text-shadow: 0 1px 2px rgba(255, 255, 255, 0.8);
      }
      
      .progress-tracker__details {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 0.875rem;
        color: var(--text-secondary, #6b7280);
      }
      
      .progress-tracker__time-estimate {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      
      .progress-tracker__time-icon {
        font-size: 1rem;
      }
      
      .progress-tracker__circles {
        margin-top: 1.5rem;
        padding-top: 1.5rem;
        border-top: 1px solid var(--border-subtle, #e5e7eb);
      }
      
      .progress-tracker__circles-title {
        font-size: 0.875rem;
        font-weight: 600;
        color: var(--text-primary, #1f2937);
        margin: 0 0 1rem 0;
      }
      
      .progress-tracker__circles-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
        gap: 0.75rem;
      }
      
      .circle-capacity {
        background: var(--bg-secondary, #f9fafb);
        border-radius: 8px;
        padding: 0.75rem;
        transition: transform 0.2s, box-shadow 0.2s;
      }
      
      .circle-capacity:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
      }
      
      .circle-capacity__header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.5rem;
      }
      
      .circle-capacity__name {
        font-size: 0.875rem;
        font-weight: 500;
        color: var(--text-primary, #1f2937);
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      
      .circle-capacity__emoji {
        font-size: 1rem;
      }
      
      .circle-capacity__count {
        font-size: 0.75rem;
        font-weight: 600;
        color: var(--text-secondary, #6b7280);
      }
      
      .circle-capacity__bar {
        height: 6px;
        background: var(--bg-tertiary, #e5e7eb);
        border-radius: 3px;
        overflow: hidden;
        margin-bottom: 0.25rem;
      }
      
      .circle-capacity__bar-fill {
        height: 100%;
        transition: width 0.3s ease, background-color 0.3s ease;
        border-radius: 3px;
      }
      
      .circle-capacity__bar-fill--inner {
        background: linear-gradient(90deg, #8b5cf6, #a78bfa);
      }
      
      .circle-capacity__bar-fill--close {
        background: linear-gradient(90deg, #3b82f6, #60a5fa);
      }
      
      .circle-capacity__bar-fill--active {
        background: linear-gradient(90deg, #10b981, #34d399);
      }
      
      .circle-capacity__bar-fill--casual {
        background: linear-gradient(90deg, #f59e0b, #fbbf24);
      }
      
      .circle-capacity__bar-fill--warning {
        background: linear-gradient(90deg, #ef4444, #f87171);
      }
      
      .circle-capacity__status {
        font-size: 0.75rem;
        color: var(--text-tertiary, #9ca3af);
      }
      
      .circle-capacity__status--warning {
        color: #ef4444;
        font-weight: 600;
      }
      
      /* Milestone celebration modal */
      .milestone-celebration {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(4px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        animation: fadeIn 0.3s ease;
      }
      
      .milestone-celebration__content {
        background: var(--bg-surface, #ffffff);
        border-radius: 16px;
        padding: 2rem;
        max-width: 400px;
        text-align: center;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        animation: scaleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
      }
      
      .milestone-celebration__icon {
        font-size: 4rem;
        margin-bottom: 1rem;
        animation: bounce 0.6s ease-out;
      }
      
      .milestone-celebration__message {
        font-size: 1.5rem;
        font-weight: 600;
        color: var(--text-primary, #1f2937);
        margin: 0 0 1rem 0;
      }
      
      .milestone-celebration__progress {
        font-size: 1rem;
        color: var(--text-secondary, #6b7280);
        margin: 0 0 1.5rem 0;
      }
      
      .milestone-celebration__button {
        padding: 0.75rem 1.5rem;
        background: linear-gradient(90deg, #10b981, #3b82f6);
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 1rem;
        font-weight: 600;
        cursor: pointer;
        transition: transform 0.2s;
      }
      
      .milestone-celebration__button:hover {
        transform: scale(1.05);
      }
      
      @keyframes fadeIn {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }
      
      @keyframes scaleIn {
        from {
          opacity: 0;
          transform: scale(0.9);
        }
        to {
          opacity: 1;
          transform: scale(1);
        }
      }
      
      @keyframes bounce {
        0%, 100% {
          transform: translateY(0);
        }
        25% {
          transform: translateY(-20px);
        }
        50% {
          transform: translateY(0);
        }
        75% {
          transform: translateY(-10px);
        }
      }
      
      /* Mobile responsive */
      @media (max-width: 768px) {
        .progress-tracker {
          padding: 1rem;
        }
        
        .progress-tracker__header {
          flex-direction: column;
          align-items: flex-start;
          gap: 0.5rem;
        }
        
        .progress-tracker__details {
          flex-direction: column;
          align-items: flex-start;
          gap: 0.5rem;
        }
        
        .progress-tracker__circles-grid {
          grid-template-columns: 1fr;
        }
        
        .milestone-celebration__content {
          margin: 1rem;
          padding: 1.5rem;
        }
        
        .milestone-celebration__icon {
          font-size: 3rem;
        }
        
        .milestone-celebration__message {
          font-size: 1.25rem;
        }
      }
    `;
    
    document.head.appendChild(style);
  }
  
  /**
   * Render the progress tracker
   * Requirements: 9.1, 9.2, 9.3
   */
  render() {
    const container = document.getElementById(this.containerId);
    if (!container) {
      console.error(`Container with id "${this.containerId}" not found`);
      return;
    }
    
    const percentage = this.calculatePercentage();
    const timeEstimate = this.calculateTimeEstimate();
    
    container.innerHTML = `
      <div class="progress-tracker">
        <div class="progress-tracker__header">
          <h3 class="progress-tracker__title">Organization Progress</h3>
          <div class="progress-tracker__stats">
            ${this.categorizedContacts} of ${this.totalContacts} contacts
          </div>
        </div>
        
        <div class="progress-tracker__bar-container">
          <div class="progress-tracker__bar">
            <div class="progress-tracker__bar-fill" style="width: ${percentage}%"></div>
            <div class="progress-tracker__percentage">${percentage}%</div>
          </div>
        </div>
        
        <div class="progress-tracker__details">
          <div class="progress-tracker__absolute">
            ${this.categorizedContacts} categorized, ${this.totalContacts - this.categorizedContacts} remaining
          </div>
          <div class="progress-tracker__time-estimate">
            <span class="progress-tracker__time-icon">⏱️</span>
            <span>${timeEstimate}</span>
          </div>
        </div>
        
        ${this.renderCircleCapacities()}
      </div>
    `;
  }
  
  /**
   * Render circle capacity indicators
   * Requirements: 9.4, 9.7
   */
  renderCircleCapacities() {
    const circles = [
      { key: 'inner', name: 'Inner Circle', emoji: '💜', max: 10 },
      { key: 'close', name: 'Close Friends', emoji: '💙', max: 25 },
      { key: 'active', name: 'Active Friends', emoji: '💚', max: 50 },
      { key: 'casual', name: 'Casual Network', emoji: '💛', max: 100 }
    ];
    
    const circlesHtml = circles.map(circle => {
      const capacity = this.circleCapacities[circle.key] || { current: 0, max: circle.max };
      const fillPercentage = (capacity.current / capacity.max) * 100;
      const isNearCapacity = fillPercentage >= 90;
      const isAtCapacity = capacity.current >= capacity.max;
      
      let statusText = `${capacity.current}/${capacity.max}`;
      let statusClass = '';
      
      if (isAtCapacity) {
        statusText = 'Full';
        statusClass = 'circle-capacity__status--warning';
      } else if (isNearCapacity) {
        statusText = `${capacity.max - capacity.current} left`;
        statusClass = 'circle-capacity__status--warning';
      }
      
      const barFillClass = isAtCapacity 
        ? 'circle-capacity__bar-fill--warning' 
        : `circle-capacity__bar-fill--${circle.key}`;
      
      return `
        <div class="circle-capacity">
          <div class="circle-capacity__header">
            <div class="circle-capacity__name">
              <span class="circle-capacity__emoji">${circle.emoji}</span>
              <span>${circle.name}</span>
            </div>
            <div class="circle-capacity__count">${capacity.current}/${capacity.max}</div>
          </div>
          <div class="circle-capacity__bar">
            <div class="circle-capacity__bar-fill ${barFillClass}" 
                 style="width: ${Math.min(fillPercentage, 100)}%"></div>
          </div>
          <div class="circle-capacity__status ${statusClass}">
            ${statusText}
          </div>
        </div>
      `;
    }).join('');
    
    return `
      <div class="progress-tracker__circles">
        <h4 class="progress-tracker__circles-title">Circle Capacity</h4>
        <div class="progress-tracker__circles-grid">
          ${circlesHtml}
        </div>
      </div>
    `;
  }
  
  /**
   * Calculate progress percentage
   * Requirements: 9.1, 9.2
   */
  calculatePercentage() {
    if (this.totalContacts === 0) {
      return 0;
    }
    return Math.round((this.categorizedContacts / this.totalContacts) * 100);
  }
  
  /**
   * Calculate estimated time remaining
   * Requirements: 9.3
   */
  calculateTimeEstimate() {
    if (this.categorizedContacts === 0) {
      return 'Estimating...';
    }
    
    const remaining = this.totalContacts - this.categorizedContacts;
    if (remaining === 0) {
      return 'Complete!';
    }
    
    // Calculate average time per contact
    const elapsedTime = Date.now() - this.startTime;
    const avgTimePerContact = elapsedTime / this.categorizedContacts;
    const estimatedRemainingTime = avgTimePerContact * remaining;
    
    // Format time estimate
    const minutes = Math.ceil(estimatedRemainingTime / 60000);
    
    if (minutes < 1) {
      return 'Less than a minute';
    } else if (minutes === 1) {
      return '~1 minute remaining';
    } else if (minutes < 60) {
      return `~${minutes} minutes remaining`;
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      if (remainingMinutes === 0) {
        return `~${hours} hour${hours > 1 ? 's' : ''} remaining`;
      }
      return `~${hours}h ${remainingMinutes}m remaining`;
    }
  }
  
  /**
   * Update progress
   * Requirements: 9.1, 9.2, 9.5, 9.6
   */
  update(categorizedContacts, totalContacts, circleCapacities) {
    const previousPercentage = this.calculatePercentage();
    
    this.categorizedContacts = categorizedContacts;
    this.totalContacts = totalContacts;
    
    if (circleCapacities) {
      this.circleCapacities = circleCapacities;
    }
    
    // Track categorization for pace calculation
    this.categorizationHistory.push({
      count: categorizedContacts,
      timestamp: Date.now()
    });
    
    // Keep only last 10 entries for pace calculation
    if (this.categorizationHistory.length > 10) {
      this.categorizationHistory.shift();
    }
    
    // Re-render
    this.render();
    
    // Check for milestone achievements
    const currentPercentage = this.calculatePercentage();
    this.checkMilestones(previousPercentage, currentPercentage);
  }
  
  /**
   * Check and trigger milestone celebrations
   * Requirements: 9.5, 9.6
   */
  checkMilestones(previousPercentage, currentPercentage) {
    for (const milestone of this.milestones) {
      if (!milestone.reached && 
          previousPercentage < milestone.threshold && 
          currentPercentage >= milestone.threshold) {
        milestone.reached = true;
        this.showMilestoneCelebration(milestone);
        this.onMilestone(milestone);
      }
    }
  }
  
  /**
   * Show milestone celebration modal
   * Requirements: 9.5, 9.6
   */
  showMilestoneCelebration(milestone) {
    const celebrationHtml = `
      <div class="milestone-celebration" id="milestone-celebration">
        <div class="milestone-celebration__content">
          <div class="milestone-celebration__icon">
            ${this.getMilestoneIcon(milestone.threshold)}
          </div>
          <h2 class="milestone-celebration__message">${milestone.message}</h2>
          <p class="milestone-celebration__progress">
            ${this.categorizedContacts} of ${this.totalContacts} contacts organized
          </p>
          <button class="milestone-celebration__button" id="close-celebration">
            Continue
          </button>
        </div>
      </div>
    `;
    
    // Add to body
    const celebrationDiv = document.createElement('div');
    celebrationDiv.innerHTML = celebrationHtml;
    document.body.appendChild(celebrationDiv.firstElementChild);
    
    // Add event listener to close button
    const closeBtn = document.getElementById('close-celebration');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.closeMilestoneCelebration();
      });
    }
    
    // Auto-close after 5 seconds
    setTimeout(() => {
      this.closeMilestoneCelebration();
    }, 5000);
  }
  
  /**
   * Close milestone celebration modal
   */
  closeMilestoneCelebration() {
    const celebration = document.getElementById('milestone-celebration');
    if (celebration) {
      celebration.style.animation = 'fadeOut 0.3s ease';
      setTimeout(() => {
        celebration.remove();
      }, 300);
    }
  }
  
  /**
   * Get milestone icon based on threshold
   */
  getMilestoneIcon(threshold) {
    switch (threshold) {
      case 25:
        return '🌟';
      case 50:
        return '🎯';
      case 75:
        return '🚀';
      case 100:
        return '🎉';
      default:
        return '✨';
    }
  }
  
  /**
   * Update circle capacities
   * Requirements: 9.4, 9.7
   */
  updateCircleCapacities(circleCapacities) {
    this.circleCapacities = circleCapacities;
    this.render();
  }
  
  /**
   * Reset progress tracker
   */
  reset() {
    this.categorizedContacts = 0;
    this.totalContacts = 0;
    this.startTime = Date.now();
    this.categorizationHistory = [];
    this.milestones.forEach(m => m.reached = false);
    this.render();
  }
  
  /**
   * Destroy the component
   */
  destroy() {
    const container = document.getElementById(this.containerId);
    if (container) {
      container.innerHTML = '';
    }
    
    // Remove any celebration modals
    this.closeMilestoneCelebration();
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ProgressTracker;
}
