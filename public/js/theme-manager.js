// Theme Manager Module
// Manages dark/light theme switching and persistence

// Constants
const THEME_STORAGE_KEY = 'catchup-theme';
const THEMES = {
  LIGHT: 'light',
  DARK: 'dark'
};

// Theme Manager Class
class ThemeManager {
  constructor() {
    this.currentTheme = THEMES.LIGHT;
  }

  /**
   * Get the current theme
   * @returns {string} Current theme ('light' or 'dark')
   */
  getCurrentTheme() {
    return this.currentTheme;
  }

  /**
   * Set the theme
   * @param {string} theme - Theme to set ('light' or 'dark')
   */
  setTheme(theme) {
    if (theme !== THEMES.LIGHT && theme !== THEMES.DARK) {
      console.warn(`Invalid theme: ${theme}. Defaulting to light.`);
      theme = THEMES.LIGHT;
    }

    this.currentTheme = theme;
    this.applyTheme(theme);
    this.saveThemePreference(theme);
  }

  /**
   * Toggle between light and dark themes
   */
  toggleTheme() {
    const newTheme = this.currentTheme === THEMES.LIGHT ? THEMES.DARK : THEMES.LIGHT;
    this.setTheme(newTheme);
  }

  /**
   * Initialize theme on page load
   * Loads saved preference or defaults to light mode
   */
  initializeTheme() {
    const savedTheme = this.loadThemePreference();
    
    if (savedTheme) {
      this.currentTheme = savedTheme;
      this.applyTheme(savedTheme);
    } else {
      // Default to light mode
      this.currentTheme = THEMES.LIGHT;
      this.applyTheme(THEMES.LIGHT);
    }
  }

  /**
   * Save theme preference to localStorage
   * @param {string} theme - Theme to save
   */
  saveThemePreference(theme) {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch (error) {
      console.warn('Failed to save theme preference to localStorage:', error);
      // Gracefully continue without persistence
    }
  }

  /**
   * Load theme preference from localStorage
   * @returns {string|null} Saved theme or null if not found
   */
  loadThemePreference() {
    try {
      const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
      
      // Validate the saved theme
      if (savedTheme === THEMES.LIGHT || savedTheme === THEMES.DARK) {
        return savedTheme;
      }
      
      // Invalid value found, clear it
      if (savedTheme !== null) {
        console.warn(`Invalid theme value in localStorage: ${savedTheme}. Clearing.`);
        localStorage.removeItem(THEME_STORAGE_KEY);
      }
      
      return null;
    } catch (error) {
      console.warn('Failed to load theme preference from localStorage:', error);
      return null;
    }
  }

  /**
   * Apply theme by updating data-theme attribute on document root
   * @param {string} theme - Theme to apply
   */
  applyTheme(theme) {
    try {
      if (theme === THEMES.DARK) {
        document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        document.documentElement.removeAttribute('data-theme');
      }
    } catch (error) {
      console.error('Failed to apply theme:', error);
    }
  }
}

// Create global theme manager instance
const themeManager = new ThemeManager();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ThemeManager, themeManager, THEMES };
}
