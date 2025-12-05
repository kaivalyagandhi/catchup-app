// Theme Manager Module
// Manages Latte/Espresso theme switching and persistence

// Constants
const THEME_STORAGE_KEY = 'catchup-theme';
const THEMES = {
  LATTE: 'light',  // Light theme with warm alabaster/cream backgrounds
  ESPRESSO: 'dark' // Dark theme with deep warm coffee/black backgrounds
};

// Theme Manager Class
class ThemeManager {
  constructor() {
    this.currentTheme = THEMES.LATTE;
  }

  /**
   * Get the current theme
   * @returns {string} Current theme ('light' for Latte or 'dark' for Espresso)
   */
  getCurrentTheme() {
    return this.currentTheme;
  }

  /**
   * Get the current theme display name
   * @returns {string} Theme display name ('Latte' or 'Espresso')
   */
  getCurrentThemeName() {
    return this.currentTheme === THEMES.LATTE ? 'Latte' : 'Espresso';
  }

  /**
   * Set the theme
   * @param {string} theme - Theme to set ('light' for Latte or 'dark' for Espresso)
   */
  setTheme(theme) {
    if (theme !== THEMES.LATTE && theme !== THEMES.ESPRESSO) {
      console.warn(`Invalid theme: ${theme}. Defaulting to Latte.`);
      theme = THEMES.LATTE;
    }

    this.currentTheme = theme;
    this.applyTheme(theme);
    this.saveThemePreference(theme);
  }

  /**
   * Toggle between Latte (light) and Espresso (dark) themes
   */
  toggleTheme() {
    const newTheme = this.currentTheme === THEMES.LATTE ? THEMES.ESPRESSO : THEMES.LATTE;
    this.setTheme(newTheme);
  }

  /**
   * Initialize theme on page load
   * Loads saved preference or defaults to Latte mode
   */
  initializeTheme() {
    const savedTheme = this.loadThemePreference();
    
    if (savedTheme) {
      this.currentTheme = savedTheme;
      this.applyTheme(savedTheme, false); // Don't animate on initial load
    } else {
      // Default to Latte mode (light)
      this.currentTheme = THEMES.LATTE;
      this.applyTheme(THEMES.LATTE, false); // Don't animate on initial load
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
      if (savedTheme === THEMES.LATTE || savedTheme === THEMES.ESPRESSO) {
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
   * @param {string} theme - Theme to apply ('light' for Latte or 'dark' for Espresso)
   * @param {boolean} animate - Whether to animate the transition (default: true)
   */
  applyTheme(theme, animate = true) {
    try {
      if (animate) {
        // Add transition class for smooth theme switching
        document.documentElement.classList.add('theme-transitioning');
      }
      
      // Use requestAnimationFrame to ensure the transition class is applied before theme changes
      requestAnimationFrame(() => {
        // Apply the theme
        if (theme === THEMES.ESPRESSO) {
          document.documentElement.setAttribute('data-theme', 'dark');
        } else {
          document.documentElement.removeAttribute('data-theme');
        }
        
        if (animate) {
          // Remove transition class after animation completes
          setTimeout(() => {
            document.documentElement.classList.remove('theme-transitioning');
          }, 300); // Match CSS transition duration
        }
      });
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

// Make themeManager globally accessible for console debugging
if (typeof window !== 'undefined') {
  window.themeManager = themeManager;
}

// Initialize theme toggle button when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const themeToggle = document.getElementById('theme-toggle');
  
  if (themeToggle) {
    // Update icon based on current theme
    const updateIcon = () => {
      const latteIcon = themeToggle.querySelector('.theme-icon-latte');
      const espressoIcon = themeToggle.querySelector('.theme-icon-espresso');
      const currentTheme = themeManager.getCurrentTheme();
      
      if (currentTheme === THEMES.ESPRESSO) {
        // Show sun icon (to switch to Latte)
        latteIcon.style.display = 'block';
        espressoIcon.style.display = 'none';
      } else {
        // Show moon icon (to switch to Espresso)
        latteIcon.style.display = 'none';
        espressoIcon.style.display = 'block';
      }
    };
    
    // Set initial icon
    updateIcon();
    
    // Add click handler
    themeToggle.addEventListener('click', () => {
      themeManager.toggleTheme();
      updateIcon();
    });
  }
});
