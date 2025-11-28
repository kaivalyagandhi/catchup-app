/**
 * Enrichment Panel Component
 * Displays progressive enrichment suggestions during voice note recording
 * Shows suggestions grouped by type with confidence indicators
 * Updates dynamically as new suggestions arrive
 */

class EnrichmentPanel {
  constructor() {
    this.suggestions = [];
    this.container = null;
    this.isVisible = false;
    this.recentlyAddedIds = new Set();
    
    this.init();
  }
  
  init() {
    this.setupStyles();
  }
  
  /**
   * Show the enrichment panel
   */
  show() {
    if (!this.container) {
      this.createContainer();
    }
    
    this.container.classList.remove('hidden');
    this.isVisible = true;
  }
  
  /**
   * Hide the enrichment panel
   */
  hide() {
    if (this.container) {
      this.container.classList.add('hidden');
    }
    this.isVisible = false;
  }
  
  /**
   * Clear all suggestions
   */
  clear() {
    this.suggestions = [];
    this.recentlyAddedIds.clear();
    this.render();
  }
  
  /**
   * Update suggestions with new data
   * @param {Array} newSuggestions - Array of EnrichmentSuggestion objects
   */
  updateSuggestions(newSuggestions) {
    if (!Array.isArray(newSuggestions)) {
      console.warn('Invalid suggestions data:', newSuggestions);
      return;
    }
    
    // Track which suggestions are new for animation
    const existingIds = new Set(this.suggestions.map(s => s.id));
    const newIds = new Set();
    const mergedIds = new Set();
    
    // Create a map of existing suggestions for comparison
    const existingMap = new Map(this.suggestions.map(s => [s.id, s]));
    
    newSuggestions.forEach(suggestion => {
      if (!existingIds.has(suggestion.id)) {
        // Completely new suggestion
        newIds.add(suggestion.id);
      } else {
        // Check if confidence changed (merged/updated)
        const existing = existingMap.get(suggestion.id);
        if (existing && existing.confidence !== suggestion.confidence) {
          mergedIds.add(suggestion.id);
        }
      }
    });
    
    // Update suggestions
    this.suggestions = newSuggestions;
    
    // Mark new suggestions for highlighting
    this.recentlyAddedIds = newIds;
    
    // Render with animations
    this.render();
    
    // Apply merge animation to updated items
    if (mergedIds.size > 0) {
      setTimeout(() => {
        mergedIds.forEach(id => {
          const element = document.querySelector(`[data-id="${id}"]`);
          if (element) {
            element.classList.add('merged-item');
            setTimeout(() => {
              element.classList.remove('merged-item');
            }, 600);
          }
        });
      }, 50);
    }
    
    // Clear recently added markers after animation completes
    setTimeout(() => {
      this.recentlyAddedIds.clear();
      this.render();
    }, 2000);
  }
  
  /**
   * Create the container element
   */
  createContainer() {
    const existingContainer = document.getElementById('enrichment-panel');
    if (existingContainer) {
      this.container = existingContainer;
      return;
    }
    
    this.container = document.createElement('div');
    this.container.id = 'enrichment-panel';
    this.container.className = 'enrichment-panel hidden';
    
    // Insert after transcript container
    const transcriptContainer = document.querySelector('.transcript-container');
    if (transcriptContainer) {
      transcriptContainer.parentNode.insertBefore(
        this.container,
        transcriptContainer.nextSibling
      );
    } else {
      // Fallback: append to voice content
      const voiceContent = document.getElementById('voice-content');
      if (voiceContent) {
        voiceContent.appendChild(this.container);
      }
    }
  }
  
  /**
   * Render the panel content
   */
  render() {
    if (!this.container) {
      this.createContainer();
    }
    
    if (this.suggestions.length === 0) {
      this.container.innerHTML = `
        <div class="enrichment-panel-content">
          <div class="enrichment-panel-header">
            <h3>💡 Enrichment Suggestions</h3>
            <p class="enrichment-panel-subtitle">Suggestions will appear as you speak</p>
          </div>
          <div class="enrichment-empty-state">
            <div class="empty-icon">🎤</div>
            <p>Keep talking to see suggestions...</p>
          </div>
        </div>
      `;
      return;
    }
    
    // Group suggestions by type
    const grouped = this.groupSuggestionsByType(this.suggestions);
    
    this.container.innerHTML = `
      <div class="enrichment-panel-content">
        <div class="enrichment-panel-header">
          <h3>💡 Enrichment Suggestions</h3>
          <p class="enrichment-panel-subtitle">${this.suggestions.length} suggestion${this.suggestions.length !== 1 ? 's' : ''} detected</p>
        </div>
        
        <div class="enrichment-groups">
          ${Object.entries(grouped).map(([type, items]) => this.renderGroup(type, items)).join('')}
        </div>
      </div>
    `;
  }
  
  /**
   * Group suggestions by type
   */
  groupSuggestionsByType(suggestions) {
    const groups = {
      location: [],
      phone: [],
      email: [],
      tag: [],
      note: [],
      interest: [],
      event: []
    };
    
    suggestions.forEach(suggestion => {
      const type = suggestion.type || 'note';
      if (groups[type]) {
        groups[type].push(suggestion);
      } else {
        groups.note.push(suggestion);
      }
    });
    
    // Remove empty groups
    Object.keys(groups).forEach(key => {
      if (groups[key].length === 0) {
        delete groups[key];
      }
    });
    
    return groups;
  }
  
  /**
   * Render a group of suggestions
   */
  renderGroup(type, items) {
    const typeInfo = this.getTypeInfo(type);
    
    return `
      <div class="enrichment-group">
        <div class="enrichment-group-header">
          <span class="group-icon">${typeInfo.icon}</span>
          <span class="group-title">${typeInfo.title}</span>
          <span class="group-count">${items.length}</span>
        </div>
        
        <div class="enrichment-items">
          ${items.map((item, index) => this.renderSuggestion(item, index)).join('')}
        </div>
      </div>
    `;
  }
  
  /**
   * Render a single suggestion
   */
  renderSuggestion(suggestion, index = 0) {
    const isNew = this.recentlyAddedIds.has(suggestion.id);
    const confidenceClass = this.getConfidenceClass(suggestion.confidence);
    const confidenceLabel = this.getConfidenceLabel(suggestion.confidence);
    
    // Add stagger delay for new items
    const staggerDelay = isNew ? `style="animation-delay: ${index * 0.1}s"` : '';
    
    return `
      <div class="enrichment-item ${isNew ? 'new-item' : ''}" data-id="${suggestion.id}" ${staggerDelay}>
        <div class="item-main">
          <div class="item-value">${this.escapeHtml(suggestion.value)}</div>
          ${suggestion.contactHint ? `
            <div class="item-contact-hint">
              <span class="hint-icon">👤</span>
              <span class="hint-text">${this.escapeHtml(suggestion.contactHint)}</span>
            </div>
          ` : ''}
        </div>
        
        <div class="item-meta">
          <div class="confidence-indicator ${confidenceClass}" title="Confidence: ${Math.round(suggestion.confidence * 100)}%">
            <div class="confidence-bar" style="width: ${suggestion.confidence * 100}%"></div>
          </div>
          <span class="confidence-label">${confidenceLabel}</span>
        </div>
      </div>
    `;
  }
  
  /**
   * Get type information (icon and title)
   */
  getTypeInfo(type) {
    const typeMap = {
      location: { icon: '📍', title: 'Location Update' },
      phone: { icon: '📞', title: 'Phone Number' },
      email: { icon: '✉️', title: 'Email Address' },
      tag: { icon: '🏷️', title: 'Tags' },
      note: { icon: '📝', title: 'Notes' },
      interest: { icon: '⭐', title: 'Interests' },
      event: { icon: '📅', title: 'Events' }
    };
    
    return typeMap[type] || { icon: '📝', title: 'Other' };
  }
  
  /**
   * Get confidence class for styling
   */
  getConfidenceClass(confidence) {
    if (confidence >= 0.8) return 'confidence-high';
    if (confidence >= 0.6) return 'confidence-medium';
    return 'confidence-low';
  }
  
  /**
   * Get confidence label
   */
  getConfidenceLabel(confidence) {
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.6) return 'Medium';
    return 'Low';
  }
  
  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    if (text === null || text === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
  }
  
  /**
   * Setup component styles
   */
  setupStyles() {
    if (document.getElementById('enrichment-panel-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'enrichment-panel-styles';
    style.textContent = `
      .enrichment-panel {
        margin-top: 30px;
        background: var(--card-bg);
        border: 2px solid var(--border-primary);
        border-radius: 12px;
        overflow: hidden;
        transition: all 0.3s ease;
      }
      
      .enrichment-panel.hidden {
        display: none;
      }
      
      .enrichment-panel-content {
        padding: 20px;
      }
      
      .enrichment-panel-header {
        margin-bottom: 20px;
        padding-bottom: 15px;
        border-bottom: 2px solid var(--border-primary);
      }
      
      .enrichment-panel-header h3 {
        margin: 0 0 6px 0;
        color: var(--text-primary);
        font-size: 20px;
        font-weight: 600;
      }
      
      .enrichment-panel-subtitle {
        margin: 0;
        color: var(--text-secondary);
        font-size: 14px;
      }
      
      .enrichment-empty-state {
        text-align: center;
        padding: 40px 20px;
        color: var(--text-secondary);
      }
      
      .empty-icon {
        font-size: 48px;
        margin-bottom: 12px;
        opacity: 0.5;
      }
      
      .enrichment-empty-state p {
        margin: 0;
        font-size: 15px;
      }
      
      .enrichment-groups {
        display: flex;
        flex-direction: column;
        gap: 20px;
      }
      
      .enrichment-group {
        background: var(--bg-tertiary);
        border: 1px solid var(--border-primary);
        border-radius: 8px;
        overflow: hidden;
      }
      
      .enrichment-group-header {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 12px 16px;
        background: var(--bg-secondary);
        border-bottom: 1px solid var(--border-primary);
      }
      
      .group-icon {
        font-size: 20px;
      }
      
      .group-title {
        flex: 1;
        font-weight: 600;
        color: var(--text-primary);
        font-size: 15px;
      }
      
      .group-count {
        background: var(--color-primary);
        color: var(--text-inverse);
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 600;
      }
      
      .enrichment-items {
        padding: 12px;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      
      .enrichment-item {
        background: var(--card-bg);
        border: 1px solid var(--border-primary);
        border-radius: 8px;
        padding: 12px;
        transition: all 0.3s ease;
      }
      
      .enrichment-item:hover {
        border-color: var(--color-primary);
        box-shadow: 0 2px 8px var(--card-shadow);
      }
      
      /* New item animation */
      .enrichment-item.new-item {
        animation: slideInAndHighlight 0.6s ease-out;
        border-color: var(--color-success);
        background: var(--status-success-bg);
      }
      
      @keyframes slideInAndHighlight {
        0% {
          opacity: 0;
          transform: translateX(-20px) scale(0.95);
        }
        60% {
          opacity: 1;
          transform: translateX(0) scale(1.02);
        }
        100% {
          opacity: 1;
          transform: translateX(0) scale(1);
        }
      }
      
      /* Fade in animation for groups */
      .enrichment-group {
        animation: fadeIn 0.4s ease-out;
      }
      
      @keyframes fadeIn {
        from {
          opacity: 0;
          transform: translateY(-10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      /* Pulse animation for confidence bar updates */
      .confidence-bar {
        animation: pulseBar 0.3s ease-out;
      }
      
      @keyframes pulseBar {
        0% {
          transform: scaleX(0.95);
        }
        50% {
          transform: scaleX(1.05);
        }
        100% {
          transform: scaleX(1);
        }
      }
      
      /* Merged item animation (when suggestions are updated) */
      .enrichment-item.merged-item {
        animation: mergeHighlight 0.6s ease-out;
      }
      
      @keyframes mergeHighlight {
        0% {
          background: var(--status-info-bg);
          border-color: var(--color-primary);
          transform: scale(1);
        }
        50% {
          background: var(--status-info-bg);
          border-color: var(--color-primary);
          transform: scale(1.02);
        }
        100% {
          background: var(--card-bg);
          border-color: var(--border-primary);
          transform: scale(1);
        }
      }
      
      /* Smooth transitions for all interactive elements */
      .enrichment-item,
      .confidence-bar,
      .enrichment-group {
        transition: all 0.3s ease;
      }
      
      .item-main {
        margin-bottom: 10px;
      }
      
      .item-value {
        color: var(--text-primary);
        font-size: 15px;
        font-weight: 500;
        margin-bottom: 6px;
        word-break: break-word;
      }
      
      .item-contact-hint {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-top: 6px;
      }
      
      .hint-icon {
        font-size: 14px;
      }
      
      .hint-text {
        color: var(--text-secondary);
        font-size: 13px;
      }
      
      .item-meta {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      
      .confidence-indicator {
        flex: 1;
        height: 6px;
        background: var(--bg-secondary);
        border-radius: 3px;
        overflow: hidden;
        position: relative;
      }
      
      .confidence-bar {
        height: 100%;
        border-radius: 3px;
        transition: width 0.3s ease;
      }
      
      .confidence-high .confidence-bar {
        background: var(--color-success);
      }
      
      .confidence-medium .confidence-bar {
        background: var(--color-warning);
      }
      
      .confidence-low .confidence-bar {
        background: var(--color-secondary);
      }
      
      .confidence-label {
        font-size: 12px;
        font-weight: 600;
        color: var(--text-secondary);
        min-width: 50px;
        text-align: right;
      }
      
      /* Responsive design */
      @media (max-width: 768px) {
        .enrichment-panel-content {
          padding: 15px;
        }
        
        .enrichment-panel-header h3 {
          font-size: 18px;
        }
        
        .enrichment-groups {
          gap: 15px;
        }
        
        .enrichment-items {
          padding: 10px;
          gap: 8px;
        }
        
        .enrichment-item {
          padding: 10px;
        }
      }
    `;
    document.head.appendChild(style);
  }
}

// Initialize enrichment panel (disabled - using enrichment-review instead)
let enrichmentPanel = null;

function initEnrichmentPanel() {
  if (!enrichmentPanel) {
    enrichmentPanel = new EnrichmentPanel();
  }
  return enrichmentPanel;
}

// Export for use in other modules
// Note: enrichmentPanel is initialized but hidden - we use enrichment-review for live updates
if (typeof window !== 'undefined') {
  window.initEnrichmentPanel = initEnrichmentPanel;
  // Don't auto-initialize - enrichment-review handles live updates now
  // window.enrichmentPanel = initEnrichmentPanel();
}
