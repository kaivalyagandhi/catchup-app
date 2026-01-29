/**
 * SearchFilterBar Component (Standalone)
 * 
 * Reusable search and filter bar component that can be used across different views
 * (Contacts table, Circles visualization, etc.)
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 8.4
 */

class SearchFilterBar {
  constructor(container, options = {}) {
    this.container = typeof container === 'string' 
      ? document.getElementById(container) 
      : container;
    this.options = {
      onSearch: null,
      onFilter: null,
      onFilteredData: null, // New callback that returns filtered data
      onFetchTags: null,
      onFetchGroups: null,
      onGetLocations: null,
      placeholder: 'Search contacts or use filters (tag:, group:, source:, circle:, location:)',
      // Configuration for which filters to show
      visibleFilters: ['tag', 'group', 'circle', 'frequency', 'location', 'source'],
      // Mode: 'table' or 'visualizer' - affects styling
      mode: 'table',
      // Data source for filtering (optional - if provided, component handles filtering)
      data: null,
      ...options
    };
    
    this.searchInput = null;
    this.currentQuery = '';
    this.currentFilters = {};
    this.autocompleteList = null;
    this.availableTags = [];
    this.availableGroups = [];
    this.allData = options.data || [];
  }

  /**
   * Set data source for filtering
   */
  setData(data) {
    this.allData = data || [];
  }

  /**
   * Render the search filter bar
   */
  render() {
    if (!this.container) {
      console.error('SearchFilterBar: Container not found');
      return;
    }

    const filterChips = this.renderFilterChips();

    const html = `
      <div class="search-filter-bar ${this.options.mode === 'visualizer' ? 'search-filter-bar--visualizer' : ''}">
        <div class="search-input-wrapper">
          <span class="search-icon">🔍</span>
          <input 
            type="text" 
            class="search-input" 
            placeholder="${this.options.placeholder}"
            value="${this.currentQuery}"
            aria-label="Search contacts"
          />
          <button class="filter-toggle-btn" title="Show filters" aria-label="Toggle filters">
            ☰
          </button>
          <button class="clear-filters-btn" title="Clear all filters" style="display: none;" aria-label="Clear filters">
            ✕
          </button>
        </div>
        <div class="filter-chips-panel">
          ${filterChips}
        </div>
        <div class="active-filters" role="list" aria-label="Active filters"></div>
      </div>
    `;

    this.container.innerHTML = html;
    this.searchInput = this.container.querySelector('.search-input');
    
    if (!this.searchInput) {
      console.error('SearchFilterBar: search input not found after render');
      return;
    }
    
    this.attachEventListeners();
    this.loadAutocompleteData();
  }

  /**
   * Render filter chip selectors based on visibleFilters option
   */
  renderFilterChips() {
    const filterConfigs = {
      tag: {
        icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 14px; height: 14px;">
          <path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z"/>
          <path d="M7 7h.01"/>
        </svg>`,
        label: 'Tag'
      },
      group: {
        icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 14px; height: 14px;">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>`,
        label: 'Group'
      },
      circle: {
        icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 14px; height: 14px;">
          <circle cx="12" cy="12" r="10"/>
          <circle cx="12" cy="12" r="6"/>
          <circle cx="12" cy="12" r="2"/>
        </svg>`,
        label: 'Circle'
      },
      frequency: {
        icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 14px; height: 14px;">
          <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
          <line x1="16" x2="16" y1="2" y2="6"/>
          <line x1="8" x2="8" y1="2" y2="6"/>
          <line x1="3" x2="21" y1="10" y2="10"/>
        </svg>`,
        label: 'Frequency'
      },
      location: {
        icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 14px; height: 14px;">
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>`,
        label: 'Location'
      },
      source: {
        icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 14px; height: 14px;">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
        </svg>`,
        label: 'Source'
      }
    };

    return this.options.visibleFilters.map(filterType => {
      const config = filterConfigs[filterType];
      if (!config) return '';
      
      return `
        <div class="filter-chip-selector" data-filter-type="${filterType}">
          <span class="filter-chip-icon">${config.icon}</span>
          <span class="filter-chip-text">${config.label}</span>
          <span class="filter-chip-arrow">▼</span>
        </div>
      `;
    }).join('');
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    if (!this.searchInput) {
      console.error('SearchFilterBar.attachEventListeners: searchInput is null');
      return;
    }

    // Real-time search as user types
    this.searchInput.addEventListener('input', (e) => {
      const query = e.target.value;
      this.handleInput(query);
      this.handleAutocomplete(query);
    });

    // Hide autocomplete on blur
    this.searchInput.addEventListener('blur', () => {
      setTimeout(() => this.hideAutocomplete(), 200);
    });

    // Clear filters button
    const clearBtn = this.container.querySelector('.clear-filters-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        this.clearFilters();
      });
    }

    // Filter toggle button
    const filterToggleBtn = this.container.querySelector('.filter-toggle-btn');
    if (filterToggleBtn) {
      filterToggleBtn.addEventListener('click', () => {
        this.toggleFilterPanel();
      });
    }

    // Filter chip selectors
    const chipSelectors = this.container.querySelectorAll('.filter-chip-selector');
    chipSelectors.forEach(chip => {
      chip.addEventListener('click', (e) => {
        const filterType = chip.dataset.filterType;
        this.showFilterDropdown(filterType, chip);
      });
    });
  }

  /**
   * Handle input changes and parse query
   */
  handleInput(query) {
    this.currentQuery = query;
    const parsed = this.parseQuery(query);
    
    // Update clear button visibility
    const clearBtn = this.container.querySelector('.clear-filters-btn');
    if (clearBtn) {
      clearBtn.style.display = query ? 'flex' : 'none';
    }

    // Update active filters display
    this.renderActiveFilters(parsed.filters);

    // Trigger search callback with text query
    if (this.options.onSearch) {
      this.options.onSearch(parsed.text);
    }

    // Trigger filter callback with parsed filters
    if (this.options.onFilter) {
      this.options.onFilter(parsed.filters);
    }

    // If data is provided, filter it and trigger callback
    if (this.allData.length > 0 && this.options.onFilteredData) {
      const filteredData = this.applyFilters(this.allData, parsed.text, parsed.filters);
      this.options.onFilteredData(filteredData, parsed.text, parsed.filters);
    }
  }

  /**
   * Parse search query into text and filters
   */
  parseQuery(query) {
    const filters = {};
    let text = query;

    const filterPatterns = [
      { key: 'tag', regex: /tag:(?:"([^"]+)"|(\S+))/gi },
      { key: 'group', regex: /group:(?:"([^"]+)"|(\S+))/gi },
      { key: 'source', regex: /source:(?:"([^"]+)"|(\S+))/gi },
      { key: 'circle', regex: /circle:(?:"([^"]+)"|(\S+))/gi },
      { key: 'location', regex: /location:(?:"([^"]+)"|(\S+))/gi },
      { key: 'frequency', regex: /frequency:(?:"([^"]+)"|(\S+))/gi }
    ];

    filterPatterns.forEach(({ key, regex }) => {
      const matches = [...query.matchAll(regex)];
      if (matches.length > 0) {
        filters[key] = matches.map(m => (m[1] || m[2]).toLowerCase());
        matches.forEach(match => {
          text = text.replace(match[0], '').trim();
        });
      }
    });

    return { text: text.trim(), filters };
  }

  /**
   * Apply filters to dataset
   */
  applyFilters(data, text, filters) {
    // Build a group ID to name map for efficient lookup
    const groupNameMap = {};
    
    // First try availableGroups (loaded via loadAutocompleteData)
    let groupsSource = this.availableGroups;
    
    // If availableGroups is empty, try to get groups synchronously from callback
    if ((!groupsSource || groupsSource.length === 0) && this.options.onFetchGroups) {
      const result = this.options.onFetchGroups();
      // Handle both sync and async results
      if (result && !result.then) {
        groupsSource = result;
      }
    }
    
    if (groupsSource && groupsSource.length > 0) {
      groupsSource.forEach(g => {
        if (typeof g === 'object' && g.id) {
          groupNameMap[g.id] = (g.name || '').toLowerCase();
        }
      });
    }
    
    return data.filter(contact => {
      // Text search
      if (text) {
        const searchText = text.toLowerCase();
        const matchesText = 
          (contact.name && contact.name.toLowerCase().includes(searchText)) ||
          (contact.email && contact.email.toLowerCase().includes(searchText)) ||
          (contact.phone && contact.phone.toLowerCase().includes(searchText));
        
        if (!matchesText) return false;
      }

      // Tag filter
      if (filters.tag && filters.tag.length > 0) {
        const contactTags = contact.tags 
          ? contact.tags.map(t => (typeof t === 'string' ? t : t.text || '').toLowerCase()) 
          : [];
        const hasAllTags = filters.tag.every(filterTag => 
          contactTags.some(contactTag => contactTag.includes(filterTag))
        );
        if (!hasAllTags) return false;
      }

      // Group filter - contacts store group IDs, we need to match by name
      if (filters.group && filters.group.length > 0) {
        const contactGroupIds = contact.groups || [];
        const hasAllGroups = filters.group.every(filterGroup => 
          contactGroupIds.some(groupId => {
            // groupId could be a UUID string or an object
            let groupName = '';
            if (typeof groupId === 'object' && groupId.name) {
              groupName = groupId.name.toLowerCase();
            } else if (typeof groupId === 'string') {
              // Look up group name from the map
              groupName = groupNameMap[groupId] || '';
            }
            return groupName.includes(filterGroup);
          })
        );
        if (!hasAllGroups) return false;
      }

      // Source filter
      if (filters.source && filters.source.length > 0) {
        const contactSource = (contact.source || '').toLowerCase();
        if (!filters.source.includes(contactSource)) return false;
      }

      // Circle filter
      if (filters.circle && filters.circle.length > 0) {
        const contactCircle = (contact.dunbarCircle || contact.circle || '').toLowerCase();
        if (!filters.circle.includes(contactCircle)) return false;
      }

      // Location filter
      if (filters.location && filters.location.length > 0) {
        const contactLocation = (contact.location || '').toLowerCase();
        const hasLocation = filters.location.some(filterLoc => 
          contactLocation.includes(filterLoc)
        );
        if (!hasLocation) return false;
      }

      // Frequency filter
      if (filters.frequency && filters.frequency.length > 0) {
        const contactFrequency = (contact.frequencyPreference || contact.frequency || '').toLowerCase();
        if (!filters.frequency.includes(contactFrequency)) return false;
      }

      return true;
    });
  }

  /**
   * Load autocomplete data
   */
  async loadAutocompleteData() {
    try {
      if (this.options.onFetchTags) {
        this.availableTags = await this.options.onFetchTags();
      }
      if (this.options.onFetchGroups) {
        this.availableGroups = await this.options.onFetchGroups();
      }
    } catch (error) {
      console.error('Error loading autocomplete data:', error);
    }
  }

  /**
   * Handle autocomplete suggestions
   */
  handleAutocomplete(query) {
    const suggestions = this.getAutocompleteSuggestions(query);
    
    if (suggestions.length > 0) {
      this.showAutocomplete(suggestions);
    } else {
      this.hideAutocomplete();
    }
  }

  /**
   * Get autocomplete suggestions
   */
  getAutocompleteSuggestions(query) {
    const suggestions = [];
    const lastWord = query.split(/\s+/).pop();
    
    if (lastWord.includes(':')) {
      const [filterType, filterValue] = lastWord.split(':');
      
      switch (filterType.toLowerCase()) {
        case 'tag':
          this.availableTags.forEach(tag => {
            if (!filterValue || tag.toLowerCase().includes(filterValue.toLowerCase())) {
              suggestions.push({
                type: 'tag',
                value: tag,
                display: `tag:${tag}`,
                description: 'Filter by tag'
              });
            }
          });
          break;
          
        case 'group':
          this.availableGroups.forEach(group => {
            const groupName = group.name || group;
            if (!filterValue || groupName.toLowerCase().includes(filterValue.toLowerCase())) {
              suggestions.push({
                type: 'group',
                value: groupName,
                display: `group:${groupName}`,
                description: 'Filter by group'
              });
            }
          });
          break;
          
        case 'source':
          ['google', 'manual'].forEach(source => {
            if (!filterValue || source.includes(filterValue.toLowerCase())) {
              suggestions.push({
                type: 'source',
                value: source,
                display: `source:${source}`,
                description: 'Filter by source'
              });
            }
          });
          break;
          
        case 'circle':
          ['inner', 'close', 'active', 'casual'].forEach(circle => {
            if (!filterValue || circle.includes(filterValue.toLowerCase())) {
              suggestions.push({
                type: 'circle',
                value: circle,
                display: `circle:${circle}`,
                description: 'Filter by circle'
              });
            }
          });
          break;
          
        case 'frequency':
          ['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'flexible'].forEach(freq => {
            if (!filterValue || freq.includes(filterValue.toLowerCase())) {
              suggestions.push({
                type: 'frequency',
                value: freq,
                display: `frequency:${freq}`,
                description: 'Filter by frequency'
              });
            }
          });
          break;
      }
    } else if (!lastWord.includes(':') && lastWord.length > 0) {
      const filterTypes = [
        { type: 'tag', description: 'Filter by tag' },
        { type: 'group', description: 'Filter by group' },
        { type: 'source', description: 'Filter by source' },
        { type: 'circle', description: 'Filter by circle' },
        { type: 'location', description: 'Filter by location' },
        { type: 'frequency', description: 'Filter by frequency' }
      ];
      
      filterTypes.forEach(({ type, description }) => {
        if (type.startsWith(lastWord.toLowerCase()) && this.options.visibleFilters.includes(type)) {
          suggestions.push({
            type: 'filter-type',
            value: type,
            display: `${type}:`,
            description
          });
        }
      });
    }

    return suggestions.slice(0, 10);
  }

  /**
   * Show autocomplete dropdown
   */
  showAutocomplete(suggestions) {
    this.hideAutocomplete();
    
    if (suggestions.length === 0) return;

    this.autocompleteList = document.createElement('div');
    this.autocompleteList.className = 'search-autocomplete-list';
    
    suggestions.forEach(suggestion => {
      const item = document.createElement('div');
      item.className = 'search-autocomplete-item';
      
      const displaySpan = document.createElement('span');
      displaySpan.className = 'autocomplete-display';
      displaySpan.textContent = suggestion.display;
      
      const descSpan = document.createElement('span');
      descSpan.className = 'autocomplete-description';
      descSpan.textContent = suggestion.description;
      
      item.appendChild(displaySpan);
      item.appendChild(descSpan);
      
      item.addEventListener('click', () => {
        this.selectSuggestion(suggestion);
      });
      
      this.autocompleteList.appendChild(item);
    });
    
    const wrapper = this.container.querySelector('.search-input-wrapper');
    wrapper.appendChild(this.autocompleteList);
  }

  /**
   * Hide autocomplete dropdown
   */
  hideAutocomplete() {
    if (this.autocompleteList) {
      this.autocompleteList.remove();
      this.autocompleteList = null;
    }
  }

  /**
   * Select an autocomplete suggestion
   */
  selectSuggestion(suggestion) {
    const words = this.currentQuery.split(/\s+/);
    words[words.length - 1] = suggestion.display;
    
    this.searchInput.value = words.join(' ') + ' ';
    this.searchInput.focus();
    
    this.handleInput(this.searchInput.value);
    this.hideAutocomplete();
  }

  /**
   * Render active filters as chips
   */
  renderActiveFilters(filters) {
    const container = this.container.querySelector('.active-filters');
    if (!container) return;

    const chips = [];
    
    Object.entries(filters).forEach(([key, values]) => {
      values.forEach(value => {
        chips.push(`
          <span class="filter-chip active-filter-chip" data-filter-key="${key}" data-filter-value="${value}" role="listitem">
            <span class="filter-chip-label">${key}:</span>
            <span class="filter-chip-value">${value}</span>
            <span class="filter-chip-remove" aria-label="Remove ${key} filter">✕</span>
          </span>
        `);
      });
    });

    container.innerHTML = chips.join('');
    container.style.display = chips.length > 0 ? 'flex' : 'none';
    
    container.querySelectorAll('.filter-chip-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const chip = e.target.closest('.filter-chip');
        const key = chip.dataset.filterKey;
        const value = chip.dataset.filterValue;
        this.removeFilter(key, value);
      });
    });
  }

  /**
   * Remove a specific filter
   */
  removeFilter(key, value) {
    const escapedValue = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    const quotedPattern = `${key}:"${escapedValue}"\\s*`;
    const unquotedPattern = `${key}:${escapedValue}\\s*`;
    
    let newValue = this.searchInput.value;
    
    const quotedRegex = new RegExp(quotedPattern, 'gi');
    if (quotedRegex.test(newValue)) {
      newValue = newValue.replace(quotedRegex, '').trim();
    } else {
      const unquotedRegex = new RegExp(unquotedPattern, 'gi');
      newValue = newValue.replace(unquotedRegex, '').trim();
    }
    
    this.searchInput.value = newValue;
    this.handleInput(newValue);
  }

  /**
   * Clear all filters
   */
  clearFilters() {
    this.searchInput.value = '';
    this.currentQuery = '';
    this.currentFilters = {};
    this.handleInput('');
    this.hideAutocomplete();
  }

  /**
   * Get current query
   */
  getQuery() {
    return this.currentQuery;
  }

  /**
   * Get current filters
   */
  getFilters() {
    return this.parseQuery(this.currentQuery).filters;
  }

  /**
   * Toggle filter panel visibility
   */
  toggleFilterPanel() {
    const panel = this.container.querySelector('.filter-chips-panel');
    if (!panel) return;
    
    const isVisible = panel.style.display !== 'none';
    panel.style.display = isVisible ? 'none' : 'flex';
  }

  /**
   * Show filter dropdown for a specific filter type
   */
  async showFilterDropdown(filterType, chipElement) {
    const existingDropdown = document.querySelector('.filter-dropdown');
    if (existingDropdown) {
      existingDropdown.remove();
    }

    const values = await this.getFilterValues(filterType);
    
    if (!values || values.length === 0) {
      return;
    }

    const dropdown = document.createElement('div');
    dropdown.className = 'filter-dropdown';
    
    values.forEach(value => {
      const item = document.createElement('div');
      item.className = 'filter-dropdown-item';
      item.textContent = value;
      item.dataset.value = value;
      
      item.addEventListener('click', () => {
        this.addFilter(filterType, value);
        dropdown.remove();
      });
      
      dropdown.appendChild(item);
    });
    
    const rect = chipElement.getBoundingClientRect();
    dropdown.style.position = 'fixed';
    dropdown.style.top = `${rect.bottom + 4}px`;
    dropdown.style.left = `${rect.left}px`;
    dropdown.style.minWidth = `${rect.width}px`;
    dropdown.style.zIndex = '10000';
    
    document.body.appendChild(dropdown);
    
    setTimeout(() => {
      document.addEventListener('click', function closeDropdown(e) {
        if (!dropdown.contains(e.target) && !chipElement.contains(e.target)) {
          dropdown.remove();
          document.removeEventListener('click', closeDropdown);
        }
      });
    }, 0);
  }

  /**
   * Get available values for a filter type
   */
  async getFilterValues(filterType) {
    switch (filterType) {
      case 'tag':
        return this.availableTags || [];
      case 'group':
        const groups = this.availableGroups || [];
        return groups.map(g => typeof g === 'object' ? g.name : g);
      case 'circle':
        return ['Inner Circle', 'Close Friends', 'Active Friends', 'Casual Network'];
      case 'frequency':
        return ['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'flexible'];
      case 'location':
        if (this.options.onGetLocations) {
          return await this.options.onGetLocations();
        }
        // Extract unique locations from data
        if (this.allData.length > 0) {
          const locations = [...new Set(this.allData.map(c => c.location).filter(Boolean))];
          return locations.sort();
        }
        return [];
      case 'source':
        return ['google', 'manual'];
      default:
        return [];
    }
  }

  /**
   * Add a filter to the search
   */
  addFilter(filterType, value) {
    const currentValue = this.searchInput.value.trim();
    
    // Normalize circle values for the filter
    let normalizedValue = value;
    if (filterType === 'circle') {
      const circleMap = {
        'Inner Circle': 'inner',
        'Close Friends': 'close',
        'Active Friends': 'active',
        'Casual Network': 'casual'
      };
      normalizedValue = circleMap[value] || value.toLowerCase();
    }
    
    const formattedValue = normalizedValue.includes(' ') ? `"${normalizedValue}"` : normalizedValue;
    const filterString = `${filterType}:${formattedValue}`;
    
    if (currentValue.toLowerCase().includes(filterString.toLowerCase())) {
      return;
    }
    
    const newValue = currentValue ? `${currentValue} ${filterString}` : filterString;
    this.searchInput.value = newValue;
    this.handleInput(newValue);
  }

  /**
   * Set query programmatically
   */
  setQuery(query) {
    if (this.searchInput) {
      this.searchInput.value = query;
      this.handleInput(query);
    }
  }

  /**
   * Destroy the component
   */
  destroy() {
    this.hideAutocomplete();
    if (this.container) {
      this.container.innerHTML = '';
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SearchFilterBar;
}
