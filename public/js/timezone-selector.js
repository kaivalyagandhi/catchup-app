/**
 * Timezone Selector Component
 * 
 * Provides a searchable dropdown for selecting timezones with region grouping.
 * Includes browser timezone auto-detection and current time preview.
 */

// Timezone data grouped by region
const TIMEZONE_DATA = [
  {
    region: 'Americas',
    timezones: [
      { value: 'America/New_York', label: 'Eastern Time (New York)', offset: 'UTC-5' },
      { value: 'America/Chicago', label: 'Central Time (Chicago)', offset: 'UTC-6' },
      { value: 'America/Denver', label: 'Mountain Time (Denver)', offset: 'UTC-7' },
      { value: 'America/Los_Angeles', label: 'Pacific Time (Los Angeles)', offset: 'UTC-8' },
      { value: 'America/Anchorage', label: 'Alaska Time (Anchorage)', offset: 'UTC-9' },
      { value: 'Pacific/Honolulu', label: 'Hawaii Time (Honolulu)', offset: 'UTC-10' },
      { value: 'America/Toronto', label: 'Eastern Time (Toronto)', offset: 'UTC-5' },
      { value: 'America/Vancouver', label: 'Pacific Time (Vancouver)', offset: 'UTC-8' },
      { value: 'America/Mexico_City', label: 'Central Time (Mexico City)', offset: 'UTC-6' },
      { value: 'America/Sao_Paulo', label: 'Brasilia Time (São Paulo)', offset: 'UTC-3' },
      { value: 'America/Buenos_Aires', label: 'Argentina Time (Buenos Aires)', offset: 'UTC-3' },
    ],
  },
  {
    region: 'Europe',
    timezones: [
      { value: 'Europe/London', label: 'Greenwich Mean Time (London)', offset: 'UTC+0' },
      { value: 'Europe/Paris', label: 'Central European Time (Paris)', offset: 'UTC+1' },
      { value: 'Europe/Berlin', label: 'Central European Time (Berlin)', offset: 'UTC+1' },
      { value: 'Europe/Rome', label: 'Central European Time (Rome)', offset: 'UTC+1' },
      { value: 'Europe/Madrid', label: 'Central European Time (Madrid)', offset: 'UTC+1' },
      { value: 'Europe/Amsterdam', label: 'Central European Time (Amsterdam)', offset: 'UTC+1' },
      { value: 'Europe/Brussels', label: 'Central European Time (Brussels)', offset: 'UTC+1' },
      { value: 'Europe/Vienna', label: 'Central European Time (Vienna)', offset: 'UTC+1' },
      { value: 'Europe/Stockholm', label: 'Central European Time (Stockholm)', offset: 'UTC+1' },
      { value: 'Europe/Athens', label: 'Eastern European Time (Athens)', offset: 'UTC+2' },
      { value: 'Europe/Istanbul', label: 'Turkey Time (Istanbul)', offset: 'UTC+3' },
      { value: 'Europe/Moscow', label: 'Moscow Time (Moscow)', offset: 'UTC+3' },
    ],
  },
  {
    region: 'Asia',
    timezones: [
      { value: 'Asia/Dubai', label: 'Gulf Standard Time (Dubai)', offset: 'UTC+4' },
      { value: 'Asia/Kolkata', label: 'India Standard Time (Mumbai)', offset: 'UTC+5:30' },
      { value: 'Asia/Bangkok', label: 'Indochina Time (Bangkok)', offset: 'UTC+7' },
      { value: 'Asia/Singapore', label: 'Singapore Time (Singapore)', offset: 'UTC+8' },
      { value: 'Asia/Hong_Kong', label: 'Hong Kong Time (Hong Kong)', offset: 'UTC+8' },
      { value: 'Asia/Shanghai', label: 'China Standard Time (Shanghai)', offset: 'UTC+8' },
      { value: 'Asia/Tokyo', label: 'Japan Standard Time (Tokyo)', offset: 'UTC+9' },
      { value: 'Asia/Seoul', label: 'Korea Standard Time (Seoul)', offset: 'UTC+9' },
    ],
  },
  {
    region: 'Australia & Pacific',
    timezones: [
      { value: 'Australia/Perth', label: 'Australian Western Time (Perth)', offset: 'UTC+8' },
      { value: 'Australia/Adelaide', label: 'Australian Central Time (Adelaide)', offset: 'UTC+9:30' },
      { value: 'Australia/Sydney', label: 'Australian Eastern Time (Sydney)', offset: 'UTC+10' },
      { value: 'Australia/Melbourne', label: 'Australian Eastern Time (Melbourne)', offset: 'UTC+10' },
      { value: 'Australia/Brisbane', label: 'Australian Eastern Time (Brisbane)', offset: 'UTC+10' },
      { value: 'Pacific/Auckland', label: 'New Zealand Time (Auckland)', offset: 'UTC+12' },
    ],
  },
  {
    region: 'Africa & Middle East',
    timezones: [
      { value: 'Africa/Cairo', label: 'Eastern European Time (Cairo)', offset: 'UTC+2' },
      { value: 'Africa/Johannesburg', label: 'South Africa Time (Johannesburg)', offset: 'UTC+2' },
      { value: 'Africa/Lagos', label: 'West Africa Time (Lagos)', offset: 'UTC+1' },
      { value: 'Africa/Nairobi', label: 'East Africa Time (Nairobi)', offset: 'UTC+3' },
      { value: 'Asia/Jerusalem', label: 'Israel Time (Jerusalem)', offset: 'UTC+2' },
    ],
  },
  {
    region: 'Other',
    timezones: [
      { value: 'UTC', label: 'Coordinated Universal Time (UTC)', offset: 'UTC+0' },
    ],
  },
];

/**
 * Timezone Selector Class
 */
class TimezoneSelector {
  /**
   * Create a timezone selector
   * @param {Object} options - Configuration options
   * @param {string} options.containerId - ID of the container element
   * @param {string} options.currentTimezone - Currently selected timezone (defaults to 'UTC')
   * @param {Function} options.onChange - Callback when timezone changes (receives timezone value)
   */
  constructor(options) {
    this.containerId = options.containerId;
    this.currentTimezone = options.currentTimezone || 'UTC';
    this.onChange = options.onChange || (() => {});
    this.searchTerm = '';
    this.timeUpdateInterval = null;
    
    this.render();
    this.attachEventListeners();
    this.startTimeUpdates();
  }

  /**
   * Detect browser's timezone
   * @returns {string} IANA timezone identifier
   */
  static detectBrowserTimezone() {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch (error) {
      console.warn('Failed to detect browser timezone:', error);
      return 'UTC';
    }
  }

  /**
   * Get current time in a specific timezone
   * @param {string} timezone - IANA timezone identifier
   * @returns {string} Formatted time string
   */
  getCurrentTimeInTimezone(timezone) {
    try {
      const now = new Date();
      return now.toLocaleTimeString('en-US', {
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch (error) {
      console.warn('Failed to get time for timezone:', timezone, error);
      return '--:--';
    }
  }

  /**
   * Filter timezones based on search term
   * @returns {Array} Filtered timezone groups
   */
  getFilteredTimezones() {
    if (!this.searchTerm) {
      return TIMEZONE_DATA;
    }

    const searchLower = this.searchTerm.toLowerCase();
    
    return TIMEZONE_DATA.map(group => ({
      region: group.region,
      timezones: group.timezones.filter(tz =>
        tz.label.toLowerCase().includes(searchLower) ||
        tz.value.toLowerCase().includes(searchLower) ||
        tz.offset.toLowerCase().includes(searchLower)
      ),
    })).filter(group => group.timezones.length > 0);
  }

  /**
   * Render the timezone selector
   */
  render() {
    const container = document.getElementById(this.containerId);
    if (!container) {
      console.error(`Container not found: ${this.containerId}`);
      return;
    }

    const selectedTimezone = this.findTimezoneInfo(this.currentTimezone);
    const currentTime = this.getCurrentTimeInTimezone(this.currentTimezone);

    container.innerHTML = `
      <div class="timezone-selector">
        <div class="timezone-selector-header">
          <label for="timezone-search" class="timezone-label">Timezone</label>
          <button type="button" class="timezone-detect-btn" id="detect-timezone-btn">
            Detect from Browser
          </button>
        </div>
        
        <div class="timezone-search-container">
          <input
            type="text"
            id="timezone-search"
            class="timezone-search-input"
            placeholder="Search timezones..."
            value="${this.searchTerm}"
          />
        </div>

        <div class="timezone-dropdown" id="timezone-dropdown">
          ${this.renderTimezoneOptions()}
        </div>

        <div class="timezone-preview">
          <div class="timezone-preview-label">Selected:</div>
          <div class="timezone-preview-value">
            <strong>${selectedTimezone ? selectedTimezone.label : this.currentTimezone}</strong>
            <span class="timezone-preview-offset">${selectedTimezone ? selectedTimezone.offset : ''}</span>
          </div>
          <div class="timezone-preview-time">
            Current time: <strong>${currentTime}</strong>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render timezone options grouped by region
   * @returns {string} HTML string
   */
  renderTimezoneOptions() {
    const filteredGroups = this.getFilteredTimezones();

    if (filteredGroups.length === 0) {
      return '<div class="timezone-no-results">No timezones found</div>';
    }

    return filteredGroups.map(group => `
      <div class="timezone-group">
        <div class="timezone-group-header">${group.region}</div>
        <div class="timezone-group-options">
          ${group.timezones.map(tz => `
            <div
              class="timezone-option ${tz.value === this.currentTimezone ? 'selected' : ''}"
              data-timezone="${tz.value}"
            >
              <div class="timezone-option-label">${tz.label}</div>
              <div class="timezone-option-offset">${tz.offset}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');
  }

  /**
   * Find timezone info by value
   * @param {string} timezoneValue - IANA timezone identifier
   * @returns {Object|null} Timezone info or null
   */
  findTimezoneInfo(timezoneValue) {
    for (const group of TIMEZONE_DATA) {
      const found = group.timezones.find(tz => tz.value === timezoneValue);
      if (found) return found;
    }
    return null;
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    const container = document.getElementById(this.containerId);
    if (!container) return;

    // Search input
    const searchInput = container.querySelector('#timezone-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchTerm = e.target.value;
        this.updateDropdown();
      });

      // Focus search input to show dropdown
      searchInput.addEventListener('focus', () => {
        this.showDropdown();
      });
    }

    // Detect timezone button
    const detectBtn = container.querySelector('#detect-timezone-btn');
    if (detectBtn) {
      detectBtn.addEventListener('click', () => {
        const detected = TimezoneSelector.detectBrowserTimezone();
        this.selectTimezone(detected);
      });
    }

    // Timezone options
    const dropdown = container.querySelector('#timezone-dropdown');
    if (dropdown) {
      dropdown.addEventListener('click', (e) => {
        const option = e.target.closest('.timezone-option');
        if (option) {
          const timezone = option.dataset.timezone;
          this.selectTimezone(timezone);
        }
      });
    }

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!container.contains(e.target)) {
        this.hideDropdown();
      }
    });
  }

  /**
   * Select a timezone
   * @param {string} timezone - IANA timezone identifier
   */
  selectTimezone(timezone) {
    this.currentTimezone = timezone;
    this.searchTerm = '';
    this.render();
    this.attachEventListeners();
    this.onChange(timezone);
    this.hideDropdown();
  }

  /**
   * Update dropdown content
   */
  updateDropdown() {
    const dropdown = document.getElementById('timezone-dropdown');
    if (dropdown) {
      dropdown.innerHTML = this.renderTimezoneOptions();
    }
  }

  /**
   * Show dropdown
   */
  showDropdown() {
    const dropdown = document.getElementById('timezone-dropdown');
    if (dropdown) {
      dropdown.classList.add('show');
    }
  }

  /**
   * Hide dropdown
   */
  hideDropdown() {
    const dropdown = document.getElementById('timezone-dropdown');
    if (dropdown) {
      dropdown.classList.remove('show');
    }
  }

  /**
   * Start updating time preview
   */
  startTimeUpdates() {
    // Update time every second
    this.timeUpdateInterval = setInterval(() => {
      const timeElement = document.querySelector('.timezone-preview-time strong');
      if (timeElement) {
        timeElement.textContent = this.getCurrentTimeInTimezone(this.currentTimezone);
      }
    }, 1000);
  }

  /**
   * Stop updating time preview
   */
  stopTimeUpdates() {
    if (this.timeUpdateInterval) {
      clearInterval(this.timeUpdateInterval);
      this.timeUpdateInterval = null;
    }
  }

  /**
   * Destroy the timezone selector
   */
  destroy() {
    this.stopTimeUpdates();
    const container = document.getElementById(this.containerId);
    if (container) {
      container.innerHTML = '';
    }
  }

  /**
   * Get current timezone value
   * @returns {string} Current timezone
   */
  getValue() {
    return this.currentTimezone;
  }

  /**
   * Set timezone value
   * @param {string} timezone - IANA timezone identifier
   */
  setValue(timezone) {
    this.currentTimezone = timezone;
    this.render();
    this.attachEventListeners();
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TimezoneSelector;
}
