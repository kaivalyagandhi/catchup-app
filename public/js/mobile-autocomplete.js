/**
 * Mobile-Optimized Autocomplete Component
 * Provides touch-friendly autocomplete for contact search and input
 */

class MobileAutocomplete {
  constructor(inputElement, options = {}) {
    this.input = inputElement;
    this.options = {
      minChars: options.minChars || 1,
      maxResults: options.maxResults || 10,
      placeholder: options.placeholder || 'Search contacts...',
      onSelect: options.onSelect || (() => {}),
      onSearch: options.onSearch || (() => []),
      debounceMs: options.debounceMs || 300,
      touchOptimized: options.touchOptimized !== false
    };
    
    this.results = [];
    this.selectedIndex = -1;
    this.isOpen = false;
    this.debounceTimer = null;
    this.resultsContainer = null;
    
    this.init();
  }
  
  init() {
    this.setupInput();
    this.setupResultsContainer();
    this.attachEventListeners();
    this.setupStyles();
  }
  
  setupInput() {
    // Make input touch-friendly
    this.input.setAttribute('autocomplete', 'off');
    this.input.setAttribute('autocorrect', 'off');
    this.input.setAttribute('autocapitalize', 'off');
    this.input.setAttribute('spellcheck', 'false');
    
    if (this.options.placeholder) {
      this.input.setAttribute('placeholder', this.options.placeholder);
    }
    
    // Add mobile-optimized class
    if (this.options.touchOptimized) {
      this.input.classList.add('mobile-autocomplete-input');
    }
  }
  
  setupResultsContainer() {
    this.resultsContainer = document.createElement('div');
    this.resultsContainer.className = 'mobile-autocomplete-results';
    this.resultsContainer.style.display = 'none';
    
    // Position relative to input
    this.input.parentNode.style.position = 'relative';
    this.input.parentNode.appendChild(this.resultsContainer);
  }
  
  attachEventListeners() {
    // Input events
    this.input.addEventListener('input', (e) => this.handleInput(e));
    this.input.addEventListener('focus', () => this.handleFocus());
    this.input.addEventListener('blur', (e) => this.handleBlur(e));
    
    // Keyboard navigation
    this.input.addEventListener('keydown', (e) => this.handleKeydown(e));
    
    // Touch events for results
    this.resultsContainer.addEventListener('touchstart', (e) => {
      e.preventDefault(); // Prevent blur
    });
    
    this.resultsContainer.addEventListener('click', (e) => {
      const item = e.target.closest('.autocomplete-result-item');
      if (item) {
        const index = parseInt(item.getAttribute('data-index'));
        this.selectResult(index);
      }
    });
    
    // Close on outside click/touch
    document.addEventListener('click', (e) => {
      if (!this.input.contains(e.target) && !this.resultsContainer.contains(e.target)) {
        this.close();
      }
    });
  }
  
  handleInput(e) {
    const value = e.target.value.trim();
    
    // Clear debounce timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    
    // Debounce search
    this.debounceTimer = setTimeout(() => {
      if (value.length >= this.options.minChars) {
        this.search(value);
      } else {
        this.close();
      }
    }, this.options.debounceMs);
  }
  
  handleFocus() {
    const value = this.input.value.trim();
    if (value.length >= this.options.minChars && this.results.length > 0) {
      this.open();
    }
  }
  
  handleBlur(e) {
    // Delay to allow click on results
    setTimeout(() => {
      if (!this.resultsContainer.contains(document.activeElement)) {
        this.close();
      }
    }, 200);
  }
  
  handleKeydown(e) {
    if (!this.isOpen) return;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this.selectNext();
        break;
      case 'ArrowUp':
        e.preventDefault();
        this.selectPrevious();
        break;
      case 'Enter':
        e.preventDefault();
        if (this.selectedIndex >= 0) {
          this.selectResult(this.selectedIndex);
        }
        break;
      case 'Escape':
        e.preventDefault();
        this.close();
        break;
    }
  }
  
  async search(query) {
    try {
      const results = await this.options.onSearch(query);
      this.results = results.slice(0, this.options.maxResults);
      this.selectedIndex = -1;
      this.render();
      
      if (this.results.length > 0) {
        this.open();
      } else {
        this.close();
      }
    } catch (error) {
      console.error('Autocomplete search error:', error);
      this.close();
    }
  }
  
  render() {
    if (this.results.length === 0) {
      this.resultsContainer.innerHTML = `
        <div class="autocomplete-no-results">No contacts found</div>
      `;
      return;
    }
    
    this.resultsContainer.innerHTML = this.results.map((result, index) => {
      const isSelected = index === this.selectedIndex;
      return `
        <div class="autocomplete-result-item ${isSelected ? 'selected' : ''}" 
             data-index="${index}">
          <div class="result-avatar">
            ${this.getInitials(result.name)}
          </div>
          <div class="result-info">
            <div class="result-name">${this.escapeHtml(result.name)}</div>
            ${result.email ? `<div class="result-detail">${this.escapeHtml(result.email)}</div>` : ''}
            ${result.circle ? `<div class="result-circle">${this.getCircleName(result.circle)}</div>` : ''}
          </div>
        </div>
      `;
    }).join('');
  }
  
  selectNext() {
    this.selectedIndex = Math.min(this.selectedIndex + 1, this.results.length - 1);
    this.render();
    this.scrollToSelected();
  }
  
  selectPrevious() {
    this.selectedIndex = Math.max(this.selectedIndex - 1, -1);
    this.render();
    this.scrollToSelected();
  }
  
  scrollToSelected() {
    if (this.selectedIndex < 0) return;
    
    const selectedItem = this.resultsContainer.querySelector('.autocomplete-result-item.selected');
    if (selectedItem) {
      selectedItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }
  
  selectResult(index) {
    if (index < 0 || index >= this.results.length) return;
    
    const result = this.results[index];
    this.input.value = result.name;
    this.options.onSelect(result);
    this.close();
    
    // Haptic feedback on mobile
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
  }
  
  open() {
    this.isOpen = true;
    this.resultsContainer.style.display = 'block';
    this.resultsContainer.classList.add('open');
  }
  
  close() {
    this.isOpen = false;
    this.resultsContainer.style.display = 'none';
    this.resultsContainer.classList.remove('open');
    this.selectedIndex = -1;
  }
  
  clear() {
    this.input.value = '';
    this.results = [];
    this.close();
  }
  
  getInitials(name) {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length === 1) {
      return parts[0].substring(0, 2).toUpperCase();
    }
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  
  getCircleName(circleId) {
    const circles = {
      inner: 'Inner Circle',
      close: 'Close Friends',
      active: 'Active Friends',
      casual: 'Casual Network',
      acquaintance: 'Acquaintances'
    };
    return circles[circleId] || circleId;
  }
  
  escapeHtml(text) {
    if (text === null || text === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
  }
  
  setupStyles() {
    if (document.getElementById('mobile-autocomplete-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'mobile-autocomplete-styles';
    style.textContent = `
      .mobile-autocomplete-input {
        width: 100%;
        padding: 12px 16px;
        font-size: 16px;
        border: 2px solid #e5e7eb;
        border-radius: 8px;
        outline: none;
        transition: border-color 0.2s;
        -webkit-appearance: none;
        appearance: none;
      }
      
      .mobile-autocomplete-input:focus {
        border-color: #3b82f6;
      }
      
      .mobile-autocomplete-results {
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        margin-top: 4px;
        background: white;
        border: 2px solid #e5e7eb;
        border-radius: 8px;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        max-height: 300px;
        overflow-y: auto;
        z-index: 1000;
        -webkit-overflow-scrolling: touch;
      }
      
      .mobile-autocomplete-results.open {
        animation: slideDown 0.2s ease-out;
      }
      
      @keyframes slideDown {
        from {
          opacity: 0;
          transform: translateY(-10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      .autocomplete-result-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 16px;
        cursor: pointer;
        transition: background-color 0.15s;
        border-bottom: 1px solid #f3f4f6;
        min-height: 60px;
      }
      
      .autocomplete-result-item:last-child {
        border-bottom: none;
      }
      
      .autocomplete-result-item:active,
      .autocomplete-result-item.selected {
        background-color: #eff6ff;
      }
      
      .result-avatar {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 600;
        font-size: 14px;
        flex-shrink: 0;
      }
      
      .result-info {
        flex: 1;
        min-width: 0;
      }
      
      .result-name {
        font-size: 15px;
        font-weight: 600;
        color: #1f2937;
        margin-bottom: 2px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      
      .result-detail {
        font-size: 13px;
        color: #6b7280;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      
      .result-circle {
        font-size: 12px;
        color: #8b5cf6;
        font-weight: 500;
        margin-top: 2px;
      }
      
      .autocomplete-no-results {
        padding: 16px;
        text-align: center;
        color: #9ca3af;
        font-size: 14px;
        font-style: italic;
      }
      
      /* Mobile-specific adjustments */
      @media (max-width: 768px) {
        .mobile-autocomplete-input {
          font-size: 16px; /* Prevent zoom on iOS */
          padding: 14px 16px;
        }
        
        .mobile-autocomplete-results {
          max-height: 250px;
        }
        
        .autocomplete-result-item {
          padding: 14px 16px;
          min-height: 64px;
        }
        
        .result-avatar {
          width: 44px;
          height: 44px;
          font-size: 15px;
        }
        
        .result-name {
          font-size: 16px;
        }
        
        .result-detail {
          font-size: 14px;
        }
      }
      
      @media (max-width: 480px) {
        .mobile-autocomplete-results {
          max-height: 200px;
        }
        
        .autocomplete-result-item {
          padding: 12px 14px;
          min-height: 60px;
        }
        
        .result-avatar {
          width: 40px;
          height: 40px;
          font-size: 14px;
        }
      }
    `;
    document.head.appendChild(style);
  }
  
  destroy() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    
    if (this.resultsContainer && this.resultsContainer.parentNode) {
      this.resultsContainer.parentNode.removeChild(this.resultsContainer);
    }
  }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.MobileAutocomplete = MobileAutocomplete;
}
