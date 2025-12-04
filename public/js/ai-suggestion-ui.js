/**
 * AI Suggestion UI Component
 * Displays AI-suggested circles with confidence indicators, acceptance buttons,
 * override tracking, alternative suggestions, and explanation tooltips
 */

// Constants
const API_BASE = '/api';

// Confidence thresholds
const CONFIDENCE_THRESHOLDS = {
  HIGH: 0.7,
  MEDIUM: 0.3,
  LOW: 0
};

// Circle definitions (matching circular-visualizer.js)
const CIRCLE_DEFINITIONS = {
  inner: {
    id: 'inner',
    name: 'Inner Circle',
    description: 'Your closest relationships - family and best friends',
    recommendedSize: 5,
    color: '#8b5cf6'
  },
  close: {
    id: 'close',
    name: 'Close Friends',
    description: 'Good friends you see regularly',
    recommendedSize: 15,
    color: '#3b82f6'
  },
  active: {
    id: 'active',
    name: 'Active Friends',
    description: 'Friends you maintain regular contact with',
    recommendedSize: 50,
    color: '#10b981'
  },
  casual: {
    id: 'casual',
    name: 'Casual Network',
    description: 'Acquaintances and occasional contacts',
    recommendedSize: 150,
    color: '#f59e0b'
  },
  acquaintance: {
    id: 'acquaintance',
    name: 'Acquaintances',
    description: 'People you know but rarely interact with',
    recommendedSize: 500,
    color: '#6b7280'
  }
};

/**
 * AI Suggestion UI Class
 * Manages display and interaction with AI circle suggestions
 */
class AISuggestionUI {
  constructor(containerId) {
    this.containerId = containerId;
    this.container = null;
    this.authToken = null;
    this.currentContact = null;
    this.currentSuggestion = null;
    this.listeners = {
      accept: [],
      override: [],
      error: []
    };
    
    this.init();
  }
  
  init() {
    this.container = document.getElementById(this.containerId);
    if (!this.container) {
      console.error(`Container with id "${this.containerId}" not found`);
      return;
    }
    
    this.setupStyles();
  }
  
  setupStyles() {
    // Check if styles already exist
    if (document.getElementById('ai-suggestion-ui-styles')) {
      return;
    }
    
    const style = document.createElement('style');
    style.id = 'ai-suggestion-ui-styles';
    style.textContent = `
      .ai-suggestion-container {
        background: white;
        border-radius: 12px;
        padding: 24px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        max-width: 600px;
        margin: 0 auto;
      }
      
      .ai-suggestion-header {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 20px;
      }
      
      .ai-suggestion-icon {
        width: 40px;
        height: 40px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 20px;
      }
      
      .ai-suggestion-title {
        flex: 1;
      }
      
      .ai-suggestion-title h3 {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
        color: #1f2937;
      }
      
      .ai-suggestion-title p {
        margin: 4px 0 0 0;
        font-size: 14px;
        color: #6b7280;
      }
      
      .ai-suggestion-main {
        background: #f9fafb;
        border-radius: 8px;
        padding: 20px;
        margin-bottom: 20px;
      }
      
      .ai-suggestion-contact {
        font-size: 16px;
        font-weight: 600;
        color: #1f2937;
        margin-bottom: 16px;
      }
      
      .ai-suggestion-primary {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px;
        background: white;
        border-radius: 8px;
        border: 2px solid #e5e7eb;
        margin-bottom: 16px;
        transition: all 0.2s;
      }
      
      .ai-suggestion-primary.high-confidence {
        border-color: #10b981;
        background: #f0fdf4;
      }
      
      .ai-suggestion-primary.medium-confidence {
        border-color: #f59e0b;
        background: #fffbeb;
      }
      
      .ai-suggestion-primary.low-confidence {
        border-color: #6b7280;
        background: #f9fafb;
      }
      
      .ai-suggestion-circle-info {
        flex: 1;
        display: flex;
        align-items: center;
        gap: 12px;
      }
      
      .ai-suggestion-circle-badge {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: 600;
        font-size: 14px;
      }
      
      .ai-suggestion-circle-details {
        flex: 1;
      }
      
      .ai-suggestion-circle-name {
        font-size: 16px;
        font-weight: 600;
        color: #1f2937;
        margin-bottom: 4px;
      }
      
      .ai-suggestion-confidence {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 14px;
      }
      
      .confidence-bar {
        flex: 1;
        height: 6px;
        background: #e5e7eb;
        border-radius: 3px;
        overflow: hidden;
        max-width: 120px;
      }
      
      .confidence-fill {
        height: 100%;
        transition: width 0.3s;
      }
      
      .confidence-fill.high {
        background: #10b981;
      }
      
      .confidence-fill.medium {
        background: #f59e0b;
      }
      
      .confidence-fill.low {
        background: #6b7280;
      }
      
      .confidence-text {
        font-weight: 600;
        color: #6b7280;
      }
      
      .ai-suggestion-actions {
        display: flex;
        gap: 8px;
      }
      
      .ai-suggestion-btn {
        padding: 10px 20px;
        border-radius: 6px;
        border: none;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
      }
      
      .ai-suggestion-btn-accept {
        background: #10b981;
        color: white;
      }
      
      .ai-suggestion-btn-accept:hover {
        background: #059669;
      }
      
      .ai-suggestion-btn-override {
        background: #6b7280;
        color: white;
      }
      
      .ai-suggestion-btn-override:hover {
        background: #4b5563;
      }
      
      .ai-suggestion-explanation {
        margin-top: 12px;
        padding: 12px;
        background: white;
        border-radius: 6px;
        border-left: 3px solid #3b82f6;
      }
      
      .ai-suggestion-explanation-title {
        font-size: 13px;
        font-weight: 600;
        color: #1f2937;
        margin-bottom: 8px;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      
      .ai-suggestion-factors {
        list-style: none;
        padding: 0;
        margin: 0;
      }
      
      .ai-suggestion-factor {
        font-size: 13px;
        color: #6b7280;
        padding: 4px 0;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      .factor-icon {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #e5e7eb;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
      }
      
      .ai-suggestion-alternatives {
        margin-top: 16px;
      }
      
      .ai-suggestion-alternatives-title {
        font-size: 14px;
        font-weight: 600;
        color: #6b7280;
        margin-bottom: 12px;
      }
      
      .ai-suggestion-alternative-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      
      .ai-suggestion-alternative {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px;
        background: white;
        border-radius: 6px;
        border: 1px solid #e5e7eb;
        cursor: pointer;
        transition: all 0.2s;
      }
      
      .ai-suggestion-alternative:hover {
        border-color: #3b82f6;
        background: #eff6ff;
      }
      
      .ai-suggestion-alternative-info {
        display: flex;
        align-items: center;
        gap: 12px;
        flex: 1;
      }
      
      .ai-suggestion-alternative-badge {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: 600;
        font-size: 12px;
      }
      
      .ai-suggestion-alternative-name {
        font-size: 14px;
        font-weight: 500;
        color: #1f2937;
      }
      
      .ai-suggestion-alternative-confidence {
        font-size: 13px;
        color: #6b7280;
      }
      
      .ai-suggestion-tooltip {
        position: relative;
        display: inline-block;
        cursor: help;
      }
      
      .ai-suggestion-tooltip-icon {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #e5e7eb;
        color: #6b7280;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: 600;
      }
      
      .ai-suggestion-tooltip-content {
        visibility: hidden;
        position: absolute;
        z-index: 1000;
        bottom: 125%;
        left: 50%;
        transform: translateX(-50%);
        background: #1f2937;
        color: white;
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 12px;
        white-space: nowrap;
        opacity: 0;
        transition: opacity 0.2s;
      }
      
      .ai-suggestion-tooltip:hover .ai-suggestion-tooltip-content {
        visibility: visible;
        opacity: 1;
      }
      
      .ai-suggestion-loading {
        text-align: center;
        padding: 40px;
        color: #6b7280;
      }
      
      .ai-suggestion-error {
        padding: 16px;
        background: #fef2f2;
        border: 1px solid #fecaca;
        border-radius: 8px;
        color: #991b1b;
        font-size: 14px;
      }
      
      .ai-suggestion-empty {
        text-align: center;
        padding: 40px;
        color: #6b7280;
        font-size: 14px;
      }
      
      @media (max-width: 640px) {
        .ai-suggestion-container {
          padding: 16px;
        }
        
        .ai-suggestion-primary {
          flex-direction: column;
          align-items: stretch;
          gap: 12px;
        }
        
        .ai-suggestion-actions {
          width: 100%;
        }
        
        .ai-suggestion-btn {
          flex: 1;
        }
      }
    `;
    
    document.head.appendChild(style);
  }
  
  /**
   * Initialize with authentication token
   * @param {string} authToken - JWT authentication token
   */
  initialize(authToken) {
    this.authToken = authToken;
  }
  
  /**
   * Display AI suggestion for a contact
   * @param {Object} contact - Contact object
   * @param {Object} suggestion - AI suggestion object (optional, will fetch if not provided)
   */
  async displaySuggestion(contact, suggestion = null) {
    if (!this.container) {
      console.error('Container not initialized');
      return;
    }
    
    this.currentContact = contact;
    
    // Show loading state
    this.showLoading();
    
    try {
      // Fetch suggestion if not provided
      if (!suggestion) {
        suggestion = await this.fetchSuggestion(contact.id);
      }
      
      this.currentSuggestion = suggestion;
      
      // Render the suggestion UI
      this.render();
      
    } catch (error) {
      console.error('Error displaying AI suggestion:', error);
      this.showError(error.message || 'Failed to load AI suggestion');
    }
  }
  
  /**
   * Fetch AI suggestion from API
   * @param {string} contactId - Contact ID
   * @returns {Promise<Object>} AI suggestion
   */
  async fetchSuggestion(contactId) {
    const response = await fetch(`${API_BASE}/ai/suggest-circle`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.authToken}`
      },
      body: JSON.stringify({ contactId })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch AI suggestion');
    }
    
    return await response.json();
  }
  
  /**
   * Render the suggestion UI
   */
  render() {
    if (!this.currentContact || !this.currentSuggestion) {
      this.showEmpty();
      return;
    }
    
    const { suggestedCircle, confidence, factors, alternativeCircles } = this.currentSuggestion;
    const circleDef = CIRCLE_DEFINITIONS[suggestedCircle];
    
    // Determine confidence level
    const confidenceLevel = this.getConfidenceLevel(confidence);
    const confidenceClass = confidenceLevel.toLowerCase();
    
    // Build factors HTML
    const factorsHtml = factors && factors.length > 0 ? `
      <div class="ai-suggestion-explanation">
        <div class="ai-suggestion-explanation-title">
          <span>💡</span>
          <span>Why this suggestion?</span>
        </div>
        <ul class="ai-suggestion-factors">
          ${factors.map(factor => `
            <li class="ai-suggestion-factor">
              <span class="factor-icon">✓</span>
              <span>${this.escapeHtml(factor.description)}</span>
            </li>
          `).join('')}
        </ul>
      </div>
    ` : '';
    
    // Build alternatives HTML
    const alternativesHtml = alternativeCircles && alternativeCircles.length > 0 ? `
      <div class="ai-suggestion-alternatives">
        <div class="ai-suggestion-alternatives-title">
          Other possibilities:
        </div>
        <div class="ai-suggestion-alternative-list">
          ${alternativeCircles.map(alt => {
            const altCircleDef = CIRCLE_DEFINITIONS[alt.circle];
            return `
              <div class="ai-suggestion-alternative" data-circle="${alt.circle}">
                <div class="ai-suggestion-alternative-info">
                  <div class="ai-suggestion-alternative-badge" style="background: ${altCircleDef.color}">
                    ${this.getCircleInitials(altCircleDef.name)}
                  </div>
                  <div>
                    <div class="ai-suggestion-alternative-name">${altCircleDef.name}</div>
                    <div class="ai-suggestion-alternative-confidence">
                      ${Math.round(alt.confidence * 100)}% confidence
                    </div>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    ` : '';
    
    this.container.innerHTML = `
      <div class="ai-suggestion-container">
        <div class="ai-suggestion-header">
          <div class="ai-suggestion-icon">🤖</div>
          <div class="ai-suggestion-title">
            <h3>AI Circle Suggestion</h3>
            <p>Based on interaction patterns and relationship strength</p>
          </div>
        </div>
        
        <div class="ai-suggestion-main">
          <div class="ai-suggestion-contact">
            Suggested circle for <strong>${this.escapeHtml(this.currentContact.name)}</strong>
          </div>
          
          <div class="ai-suggestion-primary ${confidenceClass}-confidence">
            <div class="ai-suggestion-circle-info">
              <div class="ai-suggestion-circle-badge" style="background: ${circleDef.color}">
                ${this.getCircleInitials(circleDef.name)}
              </div>
              <div class="ai-suggestion-circle-details">
                <div class="ai-suggestion-circle-name">
                  ${circleDef.name}
                  <span class="ai-suggestion-tooltip">
                    <span class="ai-suggestion-tooltip-icon">?</span>
                    <span class="ai-suggestion-tooltip-content">
                      ${circleDef.description}
                    </span>
                  </span>
                </div>
                <div class="ai-suggestion-confidence">
                  <div class="confidence-bar">
                    <div class="confidence-fill ${confidenceClass}" style="width: ${confidence * 100}%"></div>
                  </div>
                  <span class="confidence-text">${Math.round(confidence * 100)}% confident</span>
                </div>
              </div>
            </div>
            
            <div class="ai-suggestion-actions">
              <button class="ai-suggestion-btn ai-suggestion-btn-accept" id="accept-suggestion-btn">
                ✓ Accept
              </button>
              <button class="ai-suggestion-btn ai-suggestion-btn-override" id="override-suggestion-btn">
                Choose Different
              </button>
            </div>
          </div>
          
          ${factorsHtml}
          ${alternativesHtml}
        </div>
      </div>
    `;
    
    // Add event listeners
    this.attachEventListeners();
  }
  
  /**
   * Attach event listeners to rendered elements
   */
  attachEventListeners() {
    // Accept button
    const acceptBtn = document.getElementById('accept-suggestion-btn');
    if (acceptBtn) {
      acceptBtn.addEventListener('click', () => this.handleAccept());
    }
    
    // Override button
    const overrideBtn = document.getElementById('override-suggestion-btn');
    if (overrideBtn) {
      overrideBtn.addEventListener('click', () => this.handleOverride());
    }
    
    // Alternative circle buttons
    const alternatives = this.container.querySelectorAll('.ai-suggestion-alternative');
    alternatives.forEach(alt => {
      alt.addEventListener('click', () => {
        const circle = alt.getAttribute('data-circle');
        this.handleAlternativeSelect(circle);
      });
    });
  }
  
  /**
   * Handle accept button click
   */
  async handleAccept() {
    if (!this.currentContact || !this.currentSuggestion) {
      return;
    }
    
    try {
      // Emit accept event
      this.emit('accept', {
        contactId: this.currentContact.id,
        contact: this.currentContact,
        circle: this.currentSuggestion.suggestedCircle,
        suggestion: this.currentSuggestion
      });
      
    } catch (error) {
      console.error('Error accepting suggestion:', error);
      this.emit('error', error);
    }
  }
  
  /**
   * Handle override button click
   */
  handleOverride() {
    // Emit override event to let parent component handle circle selection
    this.emit('override', {
      contactId: this.currentContact.id,
      contact: this.currentContact,
      suggestedCircle: this.currentSuggestion.suggestedCircle,
      suggestion: this.currentSuggestion
    });
  }
  
  /**
   * Handle alternative circle selection
   * @param {string} circle - Selected circle ID
   */
  async handleAlternativeSelect(circle) {
    if (!this.currentContact || !this.currentSuggestion) {
      return;
    }
    
    try {
      // Record override
      await this.recordOverride(
        this.currentContact.id,
        this.currentSuggestion.suggestedCircle,
        circle
      );
      
      // Emit accept event with the alternative circle
      this.emit('accept', {
        contactId: this.currentContact.id,
        contact: this.currentContact,
        circle: circle,
        suggestion: this.currentSuggestion,
        isOverride: true
      });
      
    } catch (error) {
      console.error('Error selecting alternative:', error);
      this.emit('error', error);
    }
  }
  
  /**
   * Record user override to API
   * @param {string} contactId - Contact ID
   * @param {string} suggestedCircle - AI suggested circle
   * @param {string} actualCircle - User selected circle
   */
  async recordOverride(contactId, suggestedCircle, actualCircle) {
    const response = await fetch(`${API_BASE}/ai/record-override`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.authToken}`
      },
      body: JSON.stringify({
        contactId,
        suggestedCircle,
        actualCircle
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to record override');
    }
  }
  
  /**
   * Get confidence level label
   * @param {number} confidence - Confidence score (0-1)
   * @returns {string} Confidence level
   */
  getConfidenceLevel(confidence) {
    if (confidence >= CONFIDENCE_THRESHOLDS.HIGH) {
      return 'High';
    } else if (confidence >= CONFIDENCE_THRESHOLDS.MEDIUM) {
      return 'Medium';
    } else {
      return 'Low';
    }
  }
  
  /**
   * Get circle initials for badge
   * @param {string} circleName - Circle name
   * @returns {string} Initials
   */
  getCircleInitials(circleName) {
    const words = circleName.split(' ');
    if (words.length === 1) {
      return words[0].substring(0, 2).toUpperCase();
    }
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  }
  
  /**
   * Show loading state
   */
  showLoading() {
    if (!this.container) return;
    
    this.container.innerHTML = `
      <div class="ai-suggestion-loading">
        <div>🤖 Analyzing contact patterns...</div>
      </div>
    `;
  }
  
  /**
   * Show error state
   * @param {string} message - Error message
   */
  showError(message) {
    if (!this.container) return;
    
    this.container.innerHTML = `
      <div class="ai-suggestion-error">
        <strong>Error:</strong> ${this.escapeHtml(message)}
      </div>
    `;
  }
  
  /**
   * Show empty state
   */
  showEmpty() {
    if (!this.container) return;
    
    this.container.innerHTML = `
      <div class="ai-suggestion-empty">
        No suggestion available
      </div>
    `;
  }
  
  /**
   * Clear the UI
   */
  clear() {
    if (this.container) {
      this.container.innerHTML = '';
    }
    this.currentContact = null;
    this.currentSuggestion = null;
  }
  
  /**
   * Escape HTML to prevent XSS
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  /**
   * Register an event listener
   * @param {string} event - Event name ('accept', 'override', 'error')
   * @param {Function} callback - Callback function
   */
  on(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event].push(callback);
    }
  }
  
  /**
   * Unregister an event listener
   * @param {string} event - Event name
   * @param {Function} callback - Callback function to remove
   */
  off(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
  }
  
  /**
   * Emit an event to all registered listeners
   * @param {string} event - Event name
   * @param {*} data - Event data
   */
  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in ${event} listener:`, error);
        }
      });
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AISuggestionUI, CIRCLE_DEFINITIONS, CONFIDENCE_THRESHOLDS };
}
