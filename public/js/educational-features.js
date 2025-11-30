/**
 * Educational Features Module
 * Provides tooltips, help content, and guidance for the contact onboarding system
 */

// Educational content for each circle
const CIRCLE_EDUCATION = {
  inner: {
    name: 'Inner Circle',
    size: '~5 people',
    description: 'Your closest relationships - family and best friends',
    characteristics: [
      'People you see or talk to at least weekly',
      'Those you turn to in times of crisis',
      'Relationships that require regular maintenance',
      'Your emotional support network'
    ],
    examples: 'Spouse, best friends, close family members',
    frequency: 'Contact weekly or more often',
    tips: 'These are your most important relationships. Keep this circle small and focused.'
  },
  close: {
    name: 'Close Friends',
    size: '~15 people',
    description: 'Good friends you see regularly',
    characteristics: [
      'Friends you see or talk to monthly',
      'People you actively maintain friendships with',
      'Those you share activities and interests with',
      'Friends you make time for regularly'
    ],
    examples: 'Close friends, siblings, regular social group',
    frequency: 'Contact every 2-4 weeks',
    tips: 'These friendships require consistent effort but are deeply rewarding.'
  },
  active: {
    name: 'Active Friends',
    size: '~50 people',
    description: 'Friends you maintain regular contact with',
    characteristics: [
      'Friends you see a few times per year',
      'People you enjoy spending time with',
      'Colleagues you socialize with outside work',
      'Friends from different life contexts'
    ],
    examples: 'Good friends, extended family, close colleagues',
    frequency: 'Contact monthly or quarterly',
    tips: 'These relationships add richness to your life. Check in periodically.'
  },
  casual: {
    name: 'Casual Network',
    size: '~150 people',
    description: 'Acquaintances and occasional contacts',
    characteristics: [
      'People you know and recognize',
      'Casual friends and acquaintances',
      'Professional contacts you interact with',
      'Friends of friends you see occasionally'
    ],
    examples: 'Acquaintances, distant relatives, casual colleagues',
    frequency: 'Contact quarterly or as needed',
    tips: 'This is your broader social network. Maintain awareness without pressure.'
  },
  acquaintance: {
    name: 'Acquaintances',
    size: '500+ people',
    description: 'People you know but rarely interact with',
    characteristics: [
      'People you recognize by name',
      'Distant connections and contacts',
      'Professional network members',
      'People you might reconnect with someday'
    ],
    examples: 'Former colleagues, old classmates, distant contacts',
    frequency: 'Contact yearly or less',
    tips: 'Keep these contacts organized but don\'t feel pressure to maintain them actively.'
  }
};

// First-time user educational tooltips
const FIRST_TIME_TOOLTIPS = {
  welcome: {
    title: 'Welcome to Contact Organization!',
    content: 'We\'ll help you organize your contacts into meaningful circles based on relationship strength. This makes it easier to stay in touch with the people who matter most.',
    position: 'center',
    showOnce: true
  },
  circles: {
    title: 'Understanding Social Circles',
    content: 'Based on Dunbar\'s number research, humans naturally maintain relationships in layers. We\'ll help you identify which circle each contact belongs to.',
    position: 'top',
    showOnce: true
  },
  dragDrop: {
    title: 'Drag and Drop',
    content: 'Simply drag contacts to different circles to organize them. You can also select multiple contacts (Ctrl/Cmd + click) and move them together.',
    position: 'bottom',
    showOnce: true
  },
  aiSuggestions: {
    title: 'AI-Powered Suggestions',
    content: 'We analyze your communication patterns to suggest the best circle for each contact. Green badges indicate high-confidence suggestions.',
    position: 'right',
    showOnce: true
  }
};

class EducationalFeatures {
  constructor(options = {}) {
    this.containerId = options.containerId || 'educational-container';
    this.visualizer = options.visualizer;
    this.onboardingController = options.onboardingController;
    this.userId = options.userId;
    
    // Track which tooltips have been shown
    this.shownTooltips = this.loadShownTooltips();
    this.isFirstTimeUser = this.checkFirstTimeUser();
    
    // Help panel state
    this.helpPanelOpen = false;
    
    this.init();
  }
  
  init() {
    this.setupStyles();
    this.createHelpButton();
    this.createHelpPanel();
    
    // Show first-time tooltips if this is a new user
    if (this.isFirstTimeUser) {
      this.showFirstTimeTooltips();
    }
    
    // Add circle hover listeners if visualizer is provided
    if (this.visualizer) {
      this.setupCircleHoverInfo();
    }
  }
  
  checkFirstTimeUser() {
    const key = `onboarding_completed_${this.userId}`;
    return !localStorage.getItem(key);
  }
  
  loadShownTooltips() {
    const key = `shown_tooltips_${this.userId}`;
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : {};
  }
  
  saveShownTooltips() {
    const key = `shown_tooltips_${this.userId}`;
    localStorage.setItem(key, JSON.stringify(this.shownTooltips));
  }
  
  markTooltipShown(tooltipId) {
    this.shownTooltips[tooltipId] = true;
    this.saveShownTooltips();
  }
  
  shouldShowTooltip(tooltipId) {
    const tooltip = FIRST_TIME_TOOLTIPS[tooltipId];
    if (!tooltip) return false;
    if (tooltip.showOnce && this.shownTooltips[tooltipId]) return false;
    return true;
  }
  
  createHelpButton() {
    const button = document.createElement('button');
    button.id = 'educational-help-button';
    button.className = 'educational-help-button';
    button.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"></circle>
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
        <line x1="12" y1="17" x2="12.01" y2="17"></line>
      </svg>
      <span>Help</span>
    `;
    
    button.addEventListener('click', () => this.toggleHelpPanel());
    
    // Add to page
    document.body.appendChild(button);
  }
  
  createHelpPanel() {
    const panel = document.createElement('div');
    panel.id = 'educational-help-panel';
    panel.className = 'educational-help-panel';
    panel.innerHTML = `
      <div class="help-panel-header">
        <h2>Understanding Social Circles</h2>
        <button class="help-panel-close" id="help-panel-close">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      <div class="help-panel-content">
        ${this.renderHelpContent()}
      </div>
    `;
    
    document.body.appendChild(panel);
    
    // Add close button listener
    const closeBtn = document.getElementById('help-panel-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closeHelpPanel());
    }
    
    // Close on overlay click
    panel.addEventListener('click', (e) => {
      if (e.target === panel) {
        this.closeHelpPanel();
      }
    });
  }
  
  renderHelpContent() {
    return `
      <div class="help-intro">
        <p>CatchUp uses <strong>Dunbar's number</strong> - research showing that humans naturally maintain relationships in layers. This helps you organize contacts based on relationship strength and interaction frequency.</p>
      </div>
      
      <div class="help-circles">
        ${Object.keys(CIRCLE_EDUCATION).map(circleId => this.renderCircleHelp(circleId)).join('')}
      </div>
      
      <div class="help-tips">
        <h3>Tips for Success</h3>
        <ul>
          <li><strong>Be honest:</strong> Place contacts where they actually fit, not where you wish they were</li>
          <li><strong>It's okay to have small circles:</strong> Quality matters more than quantity</li>
          <li><strong>Circles can change:</strong> Relationships evolve - you can always reorganize</li>
          <li><strong>Use AI suggestions:</strong> We analyze your communication patterns to help</li>
          <li><strong>Don't overthink it:</strong> Your first instinct is usually right</li>
        </ul>
      </div>
      
      <div class="help-actions">
        <h3>Quick Actions</h3>
        <ul>
          <li><strong>Drag and drop:</strong> Move contacts between circles</li>
          <li><strong>Multi-select:</strong> Hold Ctrl/Cmd and click to select multiple contacts</li>
          <li><strong>Group filter:</strong> View contacts by group membership</li>
          <li><strong>Hover for info:</strong> Hover over circles to see details</li>
        </ul>
      </div>
    `;
  }
  
  renderCircleHelp(circleId) {
    const circle = CIRCLE_EDUCATION[circleId];
    const circleDef = window.CIRCLE_DEFINITIONS ? window.CIRCLE_DEFINITIONS[circleId] : null;
    const color = circleDef ? circleDef.color : '#6b7280';
    
    return `
      <div class="help-circle-card">
        <div class="help-circle-header">
          <div class="help-circle-color" style="background: ${color}"></div>
          <div class="help-circle-title">
            <h3>${circle.name}</h3>
            <span class="help-circle-size">${circle.size}</span>
          </div>
        </div>
        <p class="help-circle-description">${circle.description}</p>
        <div class="help-circle-characteristics">
          <strong>Characteristics:</strong>
          <ul>
            ${circle.characteristics.map(char => `<li>${char}</li>`).join('')}
          </ul>
        </div>
        <div class="help-circle-examples">
          <strong>Examples:</strong> ${circle.examples}
        </div>
        <div class="help-circle-frequency">
          <strong>Contact Frequency:</strong> ${circle.frequency}
        </div>
        <div class="help-circle-tips">
          💡 <em>${circle.tips}</em>
        </div>
      </div>
    `;
  }
  
  toggleHelpPanel() {
    if (this.helpPanelOpen) {
      this.closeHelpPanel();
    } else {
      this.openHelpPanel();
    }
  }
  
  openHelpPanel() {
    const panel = document.getElementById('educational-help-panel');
    if (panel) {
      panel.classList.add('open');
      this.helpPanelOpen = true;
      document.body.style.overflow = 'hidden';
    }
  }
  
  closeHelpPanel() {
    const panel = document.getElementById('educational-help-panel');
    if (panel) {
      panel.classList.remove('open');
      this.helpPanelOpen = false;
      document.body.style.overflow = '';
    }
  }
  
  setupCircleHoverInfo() {
    if (!this.visualizer) return;
    
    // Listen for circle hover events from visualizer
    this.visualizer.on('circleHover', (data) => {
      if (data.isHovering) {
        this.showCircleInfo(data.circleId, data.circle);
      } else {
        this.hideCircleInfo();
      }
    });
  }
  
  showCircleInfo(circleId, circleDef) {
    // Remove existing info if any
    this.hideCircleInfo();
    
    const education = CIRCLE_EDUCATION[circleId];
    if (!education) return;
    
    // Get current circle stats
    const capacity = this.visualizer ? this.visualizer.getCircleCapacity(circleId) : null;
    
    const info = document.createElement('div');
    info.id = 'circle-hover-info';
    info.className = 'circle-hover-info';
    info.innerHTML = `
      <div class="circle-info-header">
        <div class="circle-info-color" style="background: ${circleDef.color}"></div>
        <div class="circle-info-title">
          <h4>${education.name}</h4>
          <span class="circle-info-size">${education.size}</span>
        </div>
      </div>
      <p class="circle-info-description">${education.description}</p>
      ${capacity ? `
        <div class="circle-info-capacity">
          <div class="capacity-bar">
            <div class="capacity-fill ${capacity.status}" 
                 style="width: ${Math.min((capacity.currentSize / capacity.recommendedSize) * 100, 100)}%">
            </div>
          </div>
          <div class="capacity-text">
            ${capacity.currentSize} of ${capacity.recommendedSize} recommended
            ${capacity.status === 'over' ? ' ⚠️ Over capacity' : ''}
            ${capacity.status === 'above' ? ' ⚡ Above recommended' : ''}
            ${capacity.status === 'optimal' ? ' ✓ Good balance' : ''}
          </div>
        </div>
      ` : ''}
      <div class="circle-info-frequency">
        <strong>Suggested contact frequency:</strong> ${education.frequency}
      </div>
    `;
    
    document.body.appendChild(info);
    
    // Position near the visualizer
    this.positionCircleInfo(info);
  }
  
  positionCircleInfo(info) {
    // Position to the right of the visualizer if space, otherwise left
    const visualizerCanvas = document.getElementById(`${this.visualizer.containerId}-canvas`);
    if (visualizerCanvas) {
      const rect = visualizerCanvas.getBoundingClientRect();
      const spaceRight = window.innerWidth - rect.right;
      
      if (spaceRight > 350) {
        info.style.left = `${rect.right + 20}px`;
        info.style.top = `${rect.top + 20}px`;
      } else {
        info.style.right = `${window.innerWidth - rect.left + 20}px`;
        info.style.top = `${rect.top + 20}px`;
      }
    }
  }
  
  hideCircleInfo() {
    const info = document.getElementById('circle-hover-info');
    if (info && info.parentNode) {
      info.parentNode.removeChild(info);
    }
  }
  
  showFirstTimeTooltips() {
    // Show welcome tooltip first
    if (this.shouldShowTooltip('welcome')) {
      this.showTooltip('welcome', () => {
        // After welcome, show circles tooltip
        if (this.shouldShowTooltip('circles')) {
          setTimeout(() => this.showTooltip('circles'), 500);
        }
      });
    }
  }
  
  showTooltip(tooltipId, onClose) {
    const tooltip = FIRST_TIME_TOOLTIPS[tooltipId];
    if (!tooltip) return;
    
    const overlay = document.createElement('div');
    overlay.className = 'educational-tooltip-overlay';
    
    const tooltipEl = document.createElement('div');
    tooltipEl.className = `educational-tooltip ${tooltip.position}`;
    tooltipEl.innerHTML = `
      <div class="tooltip-content">
        <h3>${tooltip.title}</h3>
        <p>${tooltip.content}</p>
        <button class="tooltip-got-it">Got it!</button>
      </div>
    `;
    
    overlay.appendChild(tooltipEl);
    document.body.appendChild(overlay);
    
    // Animate in
    setTimeout(() => {
      overlay.classList.add('show');
    }, 10);
    
    // Handle close
    const gotItBtn = tooltipEl.querySelector('.tooltip-got-it');
    if (gotItBtn) {
      gotItBtn.addEventListener('click', () => {
        this.markTooltipShown(tooltipId);
        overlay.classList.remove('show');
        setTimeout(() => {
          if (overlay.parentNode) {
            overlay.parentNode.removeChild(overlay);
          }
          if (onClose) onClose();
        }, 300);
      });
    }
  }
  
  // Imbalance detection and gentle suggestions
  checkCircleBalance(distribution) {
    const suggestions = [];
    
    Object.keys(CIRCLE_EDUCATION).forEach(circleId => {
      const circleDef = window.CIRCLE_DEFINITIONS ? window.CIRCLE_DEFINITIONS[circleId] : null;
      if (!circleDef) return;
      
      const currentSize = distribution[circleId] || 0;
      const recommended = circleDef.recommendedSize;
      const max = circleDef.maxSize;
      
      // Check if significantly over capacity
      if (currentSize > max * 1.5) {
        suggestions.push({
          type: 'over_capacity',
          circleId,
          circleName: CIRCLE_EDUCATION[circleId].name,
          currentSize,
          recommended,
          severity: 'high',
          message: `Your ${CIRCLE_EDUCATION[circleId].name} has ${currentSize} contacts, which is significantly more than the recommended ${recommended}. Consider if some contacts might fit better in a different circle.`,
          suggestion: `Research suggests that maintaining ${currentSize} close relationships may be challenging. You might want to review if all contacts truly belong in this circle.`
        });
      } else if (currentSize > recommended * 1.5) {
        suggestions.push({
          type: 'above_recommended',
          circleId,
          circleName: CIRCLE_EDUCATION[circleId].name,
          currentSize,
          recommended,
          severity: 'medium',
          message: `Your ${CIRCLE_EDUCATION[circleId].name} has ${currentSize} contacts, which is above the recommended ${recommended}.`,
          suggestion: `This is okay! Just be aware that maintaining this many relationships at this level may require extra effort.`
        });
      }
      
      // Check for empty inner circles (potential issue)
      if (circleId === 'inner' && currentSize === 0) {
        suggestions.push({
          type: 'empty_inner',
          circleId,
          circleName: CIRCLE_EDUCATION[circleId].name,
          currentSize,
          recommended,
          severity: 'low',
          message: `Your Inner Circle is empty.`,
          suggestion: `Consider adding your closest relationships here - these are the people you rely on most.`
        });
      }
    });
    
    return suggestions;
  }
  
  showBalanceSuggestions(distribution) {
    const suggestions = this.checkCircleBalance(distribution);
    
    if (suggestions.length === 0) {
      this.showBalancedNetworkMessage();
      return;
    }
    
    // Show gentle suggestions
    const container = document.createElement('div');
    container.className = 'balance-suggestions-container';
    container.innerHTML = `
      <div class="balance-suggestions">
        <div class="balance-header">
          <h3>💡 Network Balance Insights</h3>
          <button class="balance-close">×</button>
        </div>
        <p class="balance-intro">Here are some gentle suggestions to help optimize your network:</p>
        <div class="balance-items">
          ${suggestions.map(s => this.renderBalanceSuggestion(s)).join('')}
        </div>
        <div class="balance-footer">
          <p><em>These are just suggestions - organize your network in the way that works best for you!</em></p>
        </div>
      </div>
    `;
    
    document.body.appendChild(container);
    
    // Add close handler
    const closeBtn = container.querySelector('.balance-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        container.classList.add('closing');
        setTimeout(() => {
          if (container.parentNode) {
            container.parentNode.removeChild(container);
          }
        }, 300);
      });
    }
    
    // Auto-dismiss after 10 seconds
    setTimeout(() => {
      if (container.parentNode) {
        container.classList.add('closing');
        setTimeout(() => {
          if (container.parentNode) {
            container.parentNode.removeChild(container);
          }
        }, 300);
      }
    }, 10000);
  }
  
  renderBalanceSuggestion(suggestion) {
    const severityIcons = {
      high: '⚠️',
      medium: '⚡',
      low: 'ℹ️'
    };
    
    const severityColors = {
      high: '#ef4444',
      medium: '#f59e0b',
      low: '#3b82f6'
    };
    
    return `
      <div class="balance-item ${suggestion.severity}">
        <div class="balance-item-icon" style="color: ${severityColors[suggestion.severity]}">
          ${severityIcons[suggestion.severity]}
        </div>
        <div class="balance-item-content">
          <div class="balance-item-message">${suggestion.message}</div>
          <div class="balance-item-suggestion">${suggestion.suggestion}</div>
        </div>
      </div>
    `;
  }
  
  showBalancedNetworkMessage() {
    const container = document.createElement('div');
    container.className = 'balance-suggestions-container';
    container.innerHTML = `
      <div class="balance-suggestions balanced">
        <div class="balance-header">
          <h3>✨ Well-Balanced Network!</h3>
          <button class="balance-close">×</button>
        </div>
        <p>Your network is well-organized across all circles. Great job maintaining healthy relationship boundaries!</p>
      </div>
    `;
    
    document.body.appendChild(container);
    
    const closeBtn = container.querySelector('.balance-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        if (container.parentNode) {
          container.parentNode.removeChild(container);
        }
      });
    }
    
    setTimeout(() => {
      if (container.parentNode) {
        container.parentNode.removeChild(container);
      }
    }, 5000);
  }
  
  // Network structure summary for completion
  generateNetworkSummary(distribution, contacts) {
    const total = Object.values(distribution).reduce((sum, count) => sum + count, 0);
    
    // Calculate network health score
    const healthScore = this.calculateNetworkHealth(distribution);
    
    // Identify strongest circles
    const sortedCircles = Object.keys(distribution)
      .map(circleId => ({
        id: circleId,
        name: CIRCLE_EDUCATION[circleId].name,
        count: distribution[circleId] || 0,
        recommended: window.CIRCLE_DEFINITIONS[circleId].recommendedSize
      }))
      .sort((a, b) => b.count - a.count);
    
    const strongestCircle = sortedCircles[0];
    
    // Generate insights
    const insights = [];
    
    if (distribution.inner > 0) {
      insights.push(`You have ${distribution.inner} people in your Inner Circle - your closest support network.`);
    }
    
    if (distribution.close > 0) {
      insights.push(`${distribution.close} Close Friends form your regular social circle.`);
    }
    
    const activeTotal = (distribution.active || 0) + (distribution.casual || 0);
    if (activeTotal > 0) {
      insights.push(`You maintain ${activeTotal} active connections in your broader network.`);
    }
    
    return {
      total,
      distribution,
      healthScore,
      strongestCircle,
      insights,
      recommendations: this.generateRecommendations(distribution)
    };
  }
  
  calculateNetworkHealth(distribution) {
    let score = 0;
    let maxScore = 0;
    
    Object.keys(CIRCLE_EDUCATION).forEach(circleId => {
      const circleDef = window.CIRCLE_DEFINITIONS ? window.CIRCLE_DEFINITIONS[circleId] : null;
      if (!circleDef) return;
      
      const currentSize = distribution[circleId] || 0;
      const recommended = circleDef.recommendedSize;
      const max = circleDef.maxSize;
      
      // Weight inner circles more heavily
      const weight = circleId === 'inner' ? 3 : circleId === 'close' ? 2 : 1;
      maxScore += 100 * weight;
      
      // Score based on how close to recommended
      if (currentSize === 0) {
        score += 0;
      } else if (currentSize <= recommended) {
        score += 100 * weight;
      } else if (currentSize <= max) {
        score += 80 * weight;
      } else {
        score += 50 * weight;
      }
    });
    
    return Math.round((score / maxScore) * 100);
  }
  
  generateRecommendations(distribution) {
    const recommendations = [];
    
    // Check for empty inner circle
    if ((distribution.inner || 0) === 0) {
      recommendations.push({
        type: 'add_inner',
        priority: 'high',
        message: 'Consider adding your closest relationships to your Inner Circle'
      });
    }
    
    // Check for very large circles
    Object.keys(distribution).forEach(circleId => {
      const circleDef = window.CIRCLE_DEFINITIONS ? window.CIRCLE_DEFINITIONS[circleId] : null;
      if (!circleDef) return;
      
      const currentSize = distribution[circleId] || 0;
      if (currentSize > circleDef.maxSize * 1.5) {
        recommendations.push({
          type: 'rebalance',
          priority: 'medium',
          circleId,
          message: `Consider reviewing your ${CIRCLE_EDUCATION[circleId].name} - it may be larger than optimal`
        });
      }
    });
    
    return recommendations;
  }
  
  showNetworkSummary(distribution, contacts) {
    const summary = this.generateNetworkSummary(distribution, contacts);
    
    const container = document.createElement('div');
    container.className = 'network-summary-container';
    container.innerHTML = `
      <div class="network-summary">
        <div class="summary-header">
          <h2>🎉 Your Network Structure</h2>
          <button class="summary-close">×</button>
        </div>
        
        <div class="summary-stats">
          <div class="summary-stat-card">
            <div class="stat-value">${summary.total}</div>
            <div class="stat-label">Total Contacts</div>
          </div>
          <div class="summary-stat-card">
            <div class="stat-value">${summary.healthScore}%</div>
            <div class="stat-label">Network Health</div>
          </div>
          <div class="summary-stat-card">
            <div class="stat-value">${summary.strongestCircle.count}</div>
            <div class="stat-label">${summary.strongestCircle.name}</div>
          </div>
        </div>
        
        <div class="summary-distribution">
          <h3>Circle Distribution</h3>
          ${Object.keys(CIRCLE_EDUCATION).map(circleId => {
            const count = distribution[circleId] || 0;
            const circleDef = window.CIRCLE_DEFINITIONS[circleId];
            const percentage = summary.total > 0 ? Math.round((count / summary.total) * 100) : 0;
            
            return `
              <div class="summary-circle-row">
                <div class="summary-circle-info">
                  <div class="summary-circle-color" style="background: ${circleDef.color}"></div>
                  <span class="summary-circle-name">${CIRCLE_EDUCATION[circleId].name}</span>
                </div>
                <div class="summary-circle-bar">
                  <div class="summary-circle-fill" style="width: ${percentage}%; background: ${circleDef.color}"></div>
                </div>
                <div class="summary-circle-count">${count}</div>
              </div>
            `;
          }).join('')}
        </div>
        
        <div class="summary-insights">
          <h3>Key Insights</h3>
          <ul>
            ${summary.insights.map(insight => `<li>${insight}</li>`).join('')}
          </ul>
        </div>
        
        ${summary.recommendations.length > 0 ? `
          <div class="summary-recommendations">
            <h3>Recommendations</h3>
            <ul>
              ${summary.recommendations.map(rec => `
                <li class="recommendation-${rec.priority}">${rec.message}</li>
              `).join('')}
            </ul>
          </div>
        ` : ''}
        
        <div class="summary-footer">
          <p><strong>Great work!</strong> You've organized your network in a way that helps you maintain meaningful connections.</p>
          <button class="summary-done-btn">Done</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(container);
    
    // Add close handlers
    const closeBtn = container.querySelector('.summary-close');
    const doneBtn = container.querySelector('.summary-done-btn');
    
    const closeHandler = () => {
      container.classList.add('closing');
      setTimeout(() => {
        if (container.parentNode) {
          container.parentNode.removeChild(container);
        }
      }, 300);
    };
    
    if (closeBtn) closeBtn.addEventListener('click', closeHandler);
    if (doneBtn) doneBtn.addEventListener('click', closeHandler);
  }
  
  setupStyles() {
    if (document.getElementById('educational-features-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'educational-features-styles';
    style.textContent = `
      /* Help Button */
      .educational-help-button {
        position: fixed;
        bottom: 30px;
        right: 30px;
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px 20px;
        background: #6366f1;
        color: white;
        border: none;
        border-radius: 24px;
        font-size: 15px;
        font-weight: 600;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
        transition: all 0.3s ease;
        z-index: 1000;
      }
      
      .educational-help-button:hover {
        background: #4f46e5;
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(99, 102, 241, 0.5);
      }
      
      .educational-help-button svg {
        width: 20px;
        height: 20px;
      }
      
      /* Help Panel */
      .educational-help-panel {
        position: fixed;
        top: 0;
        right: -100%;
        width: 500px;
        max-width: 90vw;
        height: 100vh;
        background: white;
        box-shadow: -4px 0 20px rgba(0, 0, 0, 0.15);
        z-index: 10000;
        transition: right 0.3s ease;
        overflow-y: auto;
      }
      
      .educational-help-panel.open {
        right: 0;
      }
      
      .help-panel-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 24px;
        background: #6366f1;
        color: white;
        position: sticky;
        top: 0;
        z-index: 10;
      }
      
      .help-panel-header h2 {
        margin: 0;
        font-size: 24px;
        font-weight: 700;
      }
      
      .help-panel-close {
        background: none;
        border: none;
        color: white;
        cursor: pointer;
        padding: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 8px;
        transition: background 0.2s;
      }
      
      .help-panel-close:hover {
        background: rgba(255, 255, 255, 0.2);
      }
      
      .help-panel-content {
        padding: 24px;
      }
      
      .help-intro {
        margin-bottom: 32px;
        padding: 20px;
        background: #f0f9ff;
        border-left: 4px solid #3b82f6;
        border-radius: 8px;
      }
      
      .help-intro p {
        margin: 0;
        line-height: 1.6;
        color: #1e40af;
      }
      
      .help-circles {
        display: flex;
        flex-direction: column;
        gap: 20px;
        margin-bottom: 32px;
      }
      
      .help-circle-card {
        padding: 20px;
        background: #f9fafb;
        border-radius: 12px;
        border: 2px solid #e5e7eb;
        transition: all 0.2s;
      }
      
      .help-circle-card:hover {
        border-color: #6366f1;
        box-shadow: 0 4px 12px rgba(99, 102, 241, 0.1);
      }
      
      .help-circle-header {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 12px;
      }
      
      .help-circle-color {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }
      
      .help-circle-title {
        display: flex;
        align-items: baseline;
        gap: 8px;
      }
      
      .help-circle-title h3 {
        margin: 0;
        font-size: 18px;
        font-weight: 700;
        color: #1f2937;
      }
      
      .help-circle-size {
        font-size: 14px;
        color: #6b7280;
        font-weight: 500;
      }
      
      .help-circle-description {
        margin: 0 0 16px 0;
        color: #4b5563;
        line-height: 1.5;
      }
      
      .help-circle-characteristics {
        margin-bottom: 12px;
      }
      
      .help-circle-characteristics strong {
        display: block;
        margin-bottom: 8px;
        color: #374151;
        font-size: 14px;
      }
      
      .help-circle-characteristics ul {
        margin: 0;
        padding-left: 20px;
      }
      
      .help-circle-characteristics li {
        margin-bottom: 4px;
        color: #6b7280;
        font-size: 13px;
        line-height: 1.5;
      }
      
      .help-circle-examples,
      .help-circle-frequency {
        margin-bottom: 8px;
        font-size: 13px;
        color: #4b5563;
      }
      
      .help-circle-examples strong,
      .help-circle-frequency strong {
        color: #374151;
      }
      
      .help-circle-tips {
        margin-top: 12px;
        padding: 12px;
        background: #fef3c7;
        border-radius: 8px;
        font-size: 13px;
        color: #92400e;
        line-height: 1.5;
      }
      
      .help-tips,
      .help-actions {
        margin-bottom: 32px;
      }
      
      .help-tips h3,
      .help-actions h3 {
        margin: 0 0 16px 0;
        font-size: 20px;
        font-weight: 700;
        color: #1f2937;
      }
      
      .help-tips ul,
      .help-actions ul {
        margin: 0;
        padding-left: 20px;
      }
      
      .help-tips li,
      .help-actions li {
        margin-bottom: 12px;
        color: #4b5563;
        line-height: 1.6;
      }
      
      .help-tips li strong,
      .help-actions li strong {
        color: #1f2937;
      }
      
      /* Circle Hover Info */
      .circle-hover-info {
        position: fixed;
        width: 320px;
        background: white;
        border-radius: 12px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
        padding: 20px;
        z-index: 9999;
        animation: slideIn 0.3s ease-out;
      }
      
      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateX(-10px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }
      
      .circle-info-header {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 12px;
      }
      
      .circle-info-color {
        width: 20px;
        height: 20px;
        border-radius: 50%;
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }
      
      .circle-info-title h4 {
        margin: 0;
        font-size: 16px;
        font-weight: 700;
        color: #1f2937;
      }
      
      .circle-info-size {
        font-size: 13px;
        color: #6b7280;
        font-weight: 500;
      }
      
      .circle-info-description {
        margin: 0 0 16px 0;
        color: #4b5563;
        font-size: 14px;
        line-height: 1.5;
      }
      
      .circle-info-capacity {
        margin-bottom: 16px;
      }
      
      .capacity-bar {
        height: 8px;
        background: #f3f4f6;
        border-radius: 4px;
        overflow: hidden;
        margin-bottom: 8px;
      }
      
      .capacity-fill {
        height: 100%;
        border-radius: 4px;
        transition: width 0.3s ease;
      }
      
      .capacity-fill.optimal {
        background: #10b981;
      }
      
      .capacity-fill.above {
        background: #f59e0b;
      }
      
      .capacity-fill.over {
        background: #ef4444;
      }
      
      .capacity-text {
        font-size: 12px;
        color: #6b7280;
        font-weight: 500;
      }
      
      .circle-info-frequency {
        font-size: 13px;
        color: #4b5563;
      }
      
      .circle-info-frequency strong {
        color: #374151;
      }
      
      /* First-time Tooltips */
      .educational-tooltip-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10001;
        opacity: 0;
        transition: opacity 0.3s ease;
      }
      
      .educational-tooltip-overlay.show {
        opacity: 1;
      }
      
      .educational-tooltip {
        background: white;
        border-radius: 16px;
        padding: 32px;
        max-width: 500px;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        transform: scale(0.9);
        transition: transform 0.3s ease;
      }
      
      .educational-tooltip-overlay.show .educational-tooltip {
        transform: scale(1);
      }
      
      .tooltip-content h3 {
        margin: 0 0 16px 0;
        font-size: 24px;
        font-weight: 700;
        color: #1f2937;
      }
      
      .tooltip-content p {
        margin: 0 0 24px 0;
        color: #4b5563;
        line-height: 1.6;
        font-size: 16px;
      }
      
      .tooltip-got-it {
        width: 100%;
        padding: 12px 24px;
        background: #6366f1;
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.2s;
      }
      
      .tooltip-got-it:hover {
        background: #4f46e5;
      }
      
      /* Balance Suggestions */
      .balance-suggestions-container {
        position: fixed;
        bottom: 100px;
        right: 30px;
        width: 400px;
        max-width: calc(100vw - 60px);
        z-index: 9999;
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
      
      .balance-suggestions-container.closing {
        animation: slideDown 0.3s ease-out;
      }
      
      @keyframes slideDown {
        from {
          opacity: 1;
          transform: translateY(0);
        }
        to {
          opacity: 0;
          transform: translateY(20px);
        }
      }
      
      .balance-suggestions {
        background: white;
        border-radius: 12px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
        padding: 20px;
        border: 2px solid #e5e7eb;
      }
      
      .balance-suggestions.balanced {
        border-color: #10b981;
        background: linear-gradient(to bottom, #ecfdf5, white);
      }
      
      .balance-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
      }
      
      .balance-header h3 {
        margin: 0;
        font-size: 18px;
        font-weight: 700;
        color: #1f2937;
      }
      
      .balance-close {
        background: none;
        border: none;
        font-size: 24px;
        color: #9ca3af;
        cursor: pointer;
        padding: 0;
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 6px;
        transition: all 0.2s;
      }
      
      .balance-close:hover {
        background: #f3f4f6;
        color: #4b5563;
      }
      
      .balance-intro {
        margin: 0 0 16px 0;
        color: #6b7280;
        font-size: 14px;
      }
      
      .balance-items {
        display: flex;
        flex-direction: column;
        gap: 12px;
        margin-bottom: 16px;
      }
      
      .balance-item {
        display: flex;
        gap: 12px;
        padding: 12px;
        background: #f9fafb;
        border-radius: 8px;
        border-left: 4px solid #e5e7eb;
      }
      
      .balance-item.high {
        border-left-color: #ef4444;
        background: #fef2f2;
      }
      
      .balance-item.medium {
        border-left-color: #f59e0b;
        background: #fffbeb;
      }
      
      .balance-item.low {
        border-left-color: #3b82f6;
        background: #eff6ff;
      }
      
      .balance-item-icon {
        font-size: 20px;
        flex-shrink: 0;
      }
      
      .balance-item-content {
        flex: 1;
      }
      
      .balance-item-message {
        font-size: 14px;
        font-weight: 600;
        color: #1f2937;
        margin-bottom: 4px;
      }
      
      .balance-item-suggestion {
        font-size: 13px;
        color: #6b7280;
        line-height: 1.5;
      }
      
      .balance-footer {
        padding-top: 16px;
        border-top: 1px solid #e5e7eb;
      }
      
      .balance-footer p {
        margin: 0;
        font-size: 13px;
        color: #6b7280;
        font-style: italic;
      }
      
      /* Network Summary */
      .network-summary-container {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10002;
        padding: 20px;
      }
      
      .network-summary-container.closing {
        animation: fadeOut 0.3s ease-out;
      }
      
      @keyframes fadeOut {
        from {
          opacity: 1;
        }
        to {
          opacity: 0;
        }
      }
      
      .network-summary {
        background: white;
        border-radius: 16px;
        max-width: 600px;
        width: 100%;
        max-height: 90vh;
        overflow-y: auto;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        animation: scaleIn 0.3s ease-out;
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
      
      .summary-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 24px;
        background: linear-gradient(135deg, #6366f1, #8b5cf6);
        color: white;
        border-radius: 16px 16px 0 0;
      }
      
      .summary-header h2 {
        margin: 0;
        font-size: 28px;
        font-weight: 700;
      }
      
      .summary-close {
        background: rgba(255, 255, 255, 0.2);
        border: none;
        color: white;
        font-size: 24px;
        cursor: pointer;
        padding: 8px;
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 8px;
        transition: background 0.2s;
      }
      
      .summary-close:hover {
        background: rgba(255, 255, 255, 0.3);
      }
      
      .summary-stats {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 16px;
        padding: 24px;
        background: #f9fafb;
      }
      
      .summary-stat-card {
        text-align: center;
        padding: 20px;
        background: white;
        border-radius: 12px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
      }
      
      .stat-value {
        font-size: 32px;
        font-weight: 700;
        color: #6366f1;
        margin-bottom: 8px;
      }
      
      .stat-label {
        font-size: 13px;
        color: #6b7280;
        font-weight: 500;
      }
      
      .summary-distribution,
      .summary-insights,
      .summary-recommendations {
        padding: 24px;
        border-bottom: 1px solid #e5e7eb;
      }
      
      .summary-distribution h3,
      .summary-insights h3,
      .summary-recommendations h3 {
        margin: 0 0 16px 0;
        font-size: 18px;
        font-weight: 700;
        color: #1f2937;
      }
      
      .summary-circle-row {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 12px;
      }
      
      .summary-circle-info {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 140px;
      }
      
      .summary-circle-color {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }
      
      .summary-circle-name {
        font-size: 14px;
        font-weight: 600;
        color: #374151;
      }
      
      .summary-circle-bar {
        flex: 1;
        height: 8px;
        background: #f3f4f6;
        border-radius: 4px;
        overflow: hidden;
      }
      
      .summary-circle-fill {
        height: 100%;
        border-radius: 4px;
        transition: width 0.5s ease-out;
      }
      
      .summary-circle-count {
        min-width: 40px;
        text-align: right;
        font-size: 14px;
        font-weight: 600;
        color: #6b7280;
      }
      
      .summary-insights ul,
      .summary-recommendations ul {
        margin: 0;
        padding-left: 20px;
      }
      
      .summary-insights li,
      .summary-recommendations li {
        margin-bottom: 8px;
        color: #4b5563;
        line-height: 1.6;
      }
      
      .recommendation-high {
        color: #dc2626;
        font-weight: 600;
      }
      
      .recommendation-medium {
        color: #d97706;
        font-weight: 500;
      }
      
      .summary-footer {
        padding: 24px;
        text-align: center;
      }
      
      .summary-footer p {
        margin: 0 0 20px 0;
        color: #4b5563;
        line-height: 1.6;
      }
      
      .summary-done-btn {
        padding: 12px 32px;
        background: #6366f1;
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.2s;
      }
      
      .summary-done-btn:hover {
        background: #4f46e5;
      }
      
      /* Mobile Responsive */
      @media (max-width: 768px) {
        .educational-help-button {
          bottom: 20px;
          right: 20px;
          padding: 10px 16px;
          font-size: 14px;
        }
        
        .educational-help-panel {
          width: 100%;
          max-width: 100vw;
        }
        
        .circle-hover-info {
          width: calc(100vw - 40px);
          left: 20px !important;
          right: 20px !important;
        }
        
        .balance-suggestions-container {
          bottom: 80px;
          right: 20px;
          left: 20px;
          width: auto;
        }
        
        .network-summary {
          max-width: 100%;
          border-radius: 12px;
        }
        
        .summary-stats {
          grid-template-columns: 1fr;
          gap: 12px;
        }
        
        .summary-stat-card {
          padding: 16px;
        }
        
        .stat-value {
          font-size: 28px;
        }
      }
    `;
    document.head.appendChild(style);
  }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.EducationalFeatures = EducationalFeatures;
  window.CIRCLE_EDUCATION = CIRCLE_EDUCATION;
}
