/**
 * App Shell — core application shell for CatchUp.
 *
 * Owns: sidebar navigation, page routing, authentication state, theme
 * management, and global initialization. Page modules register themselves
 * via `registerPage` so the shell never hard-codes page-specific loaders.
 *
 * @module app-shell
 */

import { showToast, fetchWithAuth, API_BASE } from './utils.js';

// ---------------------------------------------------------------------------
// Page registry — page modules register their loaders here
// ---------------------------------------------------------------------------

/** @type {Map<string, { load: Function, unload?: Function }>} */
const pageRegistry = new Map();

/**
 * Register a page module so the shell can route to it.
 *
 * @param {string} name  — page identifier (e.g. 'directory', 'suggestions')
 * @param {{ load: Function, unload?: Function }} handlers
 */
export function registerPage(name, handlers) {
  pageRegistry.set(name, handlers);
}

// ---------------------------------------------------------------------------
// Auth state
// ---------------------------------------------------------------------------

let authToken = null;
let userId = null;
let userEmail = null;
let currentPage = 'directory';
let isLoginMode = true;

// Onboarding components
let onboardingIndicator = null;
let step1Handler = null;
let step2Handler = null;
let step3Handler = null;

// Chat components
let floatingChatIcon = null;
let chatWindow = null;

// Flag to track if we've already checked onboarding state
let onboardingStateChecked = false;

/**
 * Return the current authenticated user info.
 * @returns {{ userId: string|null, userEmail: string|null }}
 */
export function getCurrentUser() {
  return { userId, userEmail };
}

/**
 * Return the current JWT auth token.
 * @returns {string|null}
 */
export function getAuthToken() {
  return authToken;
}

// ---------------------------------------------------------------------------
// Authentication
// ---------------------------------------------------------------------------

function checkAuth() {
  authToken = localStorage.getItem('authToken');
  userId = localStorage.getItem('userId');
  userEmail = localStorage.getItem('userEmail');

  // Expose userId globally for components that need it
  window.userId = userId;

  if (authToken && userId) {
    showMainApp();
  } else {
    showAuthScreen();
  }
}

function showLoadingScreen() {
  document.getElementById('loading-screen').classList.remove('hidden');
  document.getElementById('auth-screen').classList.add('hidden');
  document.getElementById('main-app').classList.add('hidden');
}

function showAuthScreen() {
  document.getElementById('loading-screen').classList.add('hidden');
  document.getElementById('auth-screen').classList.remove('hidden');
  document.getElementById('main-app').classList.add('hidden');

  // Initialize Google SSO when showing auth screen
  if (typeof initGoogleSSO === 'function') {
    initGoogleSSO();
  }
}

function showMainApp() {
  document.getElementById('loading-screen').classList.add('hidden');
  document.getElementById('auth-screen').classList.add('hidden');
  document.getElementById('main-app').classList.remove('hidden');

  // Update user info in sidebar footer
  const userNameEl = document.getElementById('user-name');
  const userAvatarEl = document.getElementById('user-avatar-initials');

  if (userNameEl) {
    userNameEl.textContent = 'Settings';
  }

  if (userAvatarEl && userEmail) {
    const initials = userEmail.charAt(0).toUpperCase();
    userAvatarEl.textContent = initials;
  }

  updateThemeIcon();

  // Initialize floating chat icon and chat window
  initializeChatComponents();

  // Initialize onboarding indicator
  initializeOnboardingIndicator();

  // Initialize sync warning banner
  initializeSyncWarningBanner();

  // Check if we're handling an OAuth redirect — if so, don't override navigation
  const urlParams = new URLSearchParams(window.location.search);
  const hasOAuthRedirect =
    urlParams.get('calendar_success') === 'true' ||
    urlParams.get('calendar_error') ||
    urlParams.get('contacts_success') === 'true' ||
    urlParams.get('contacts_error');

  if (hasOAuthRedirect) {
    return;
  }

  // Determine initial page from URL or localStorage
  const path = window.location.pathname;
  const pageFromUrl = getPageFromPath(path);
  const savedPage = localStorage.getItem('currentPage');

  let initialPage = 'dashboard';
  if (pageFromUrl && pageFromUrl !== 'directory') {
    initialPage = pageFromUrl;
  } else if (savedPage && ['dashboard', 'directory', 'suggestions', 'preferences'].includes(savedPage)) {
    initialPage = savedPage;
  }

  // Navigate to initial page
  navigateTo(initialPage);

  // Dispatch app:ready so page modules can perform post-init work
  window.dispatchEvent(new CustomEvent('app:ready', {
    detail: { userId, userEmail, authToken },
  }));
}

function toggleAuthMode() {
  isLoginMode = !isLoginMode;

  if (isLoginMode) {
    document.getElementById('auth-title').textContent = 'Login to CatchUp';
    document.getElementById('auth-submit-btn').textContent = 'Login';
    document.getElementById('auth-toggle-text').textContent = "Don't have an account?";
    document.getElementById('auth-toggle-link').textContent = 'Sign up';
  } else {
    document.getElementById('auth-title').textContent = 'Sign Up for CatchUp';
    document.getElementById('auth-submit-btn').textContent = 'Sign Up';
    document.getElementById('auth-toggle-text').textContent = 'Already have an account?';
    document.getElementById('auth-toggle-link').textContent = 'Log in';
  }

  document.getElementById('auth-error').classList.add('hidden');
  document.getElementById('auth-success').classList.add('hidden');
}

async function handleAuth(event) {
  event.preventDefault();

  const email = document.getElementById('auth-email').value;
  const password = document.getElementById('auth-password').value;
  const endpoint = isLoginMode ? '/auth/login' : '/auth/register';

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Authentication failed');
    }

    authToken = data.token;
    userId = data.user.id;
    userEmail = data.user.email;

    localStorage.setItem('authToken', authToken);
    localStorage.setItem('userId', userId);
    localStorage.setItem('userEmail', userEmail);

    window.userId = userId;

    if (!isLoginMode) {
      document.getElementById('auth-success').textContent =
        'Account created successfully! Logging you in...';
      document.getElementById('auth-success').classList.remove('hidden');
      setTimeout(() => showMainApp(), 1000);
    } else {
      showMainApp();
    }
  } catch (error) {
    console.error('Auth error:', error);
    const errorMessage = error.message || 'Authentication failed. Please try again.';
    document.getElementById('auth-error').textContent = errorMessage;
    document.getElementById('auth-error').classList.remove('hidden');
    document.getElementById('auth-success').classList.add('hidden');
  }
}

function logout() {
  localStorage.removeItem('authToken');
  localStorage.removeItem('userId');
  localStorage.removeItem('userEmail');

  authToken = null;
  userId = null;
  userEmail = null;
  window.userId = null;

  onboardingStateChecked = false;

  // Clean up chat components
  if (chatWindow) {
    chatWindow.destroy();
    chatWindow = null;
  }
  if (floatingChatIcon) {
    floatingChatIcon.destroy();
    floatingChatIcon = null;
  }

  // Clean up onboarding indicator
  if (onboardingIndicator) {
    onboardingIndicator.destroy();
    onboardingIndicator = null;
  }

  showAuthScreen();
  document.getElementById('auth-form').reset();
}

async function deleteAccount() {
  const confirmToast = document.createElement('div');
  confirmToast.className = 'toast-confirm';
  confirmToast.innerHTML = `
    <div class="toast-confirm-content">
      <h3>Delete Account?</h3>
      <p>This will permanently delete your account and all associated data. This action cannot be undone.</p>
      <div class="toast-confirm-actions">
        <button class="btn-secondary" id="cancel-delete-account">Cancel</button>
        <button class="btn-danger" id="confirm-delete-account">Delete Account</button>
      </div>
    </div>
  `;
  document.body.appendChild(confirmToast);

  const confirmed = await new Promise((resolve) => {
    document.getElementById('confirm-delete-account').onclick = () => {
      confirmToast.remove();
      resolve(true);
    };
    document.getElementById('cancel-delete-account').onclick = () => {
      confirmToast.remove();
      resolve(false);
    };
  });

  if (!confirmed) return;

  try {
    const response = await fetch(`${API_BASE}/privacy/account`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ confirmation: 'DELETE MY ACCOUNT' }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to delete account');
    }

    showToast('Account deleted successfully', 'success');
    setTimeout(() => logout(), 1500);
  } catch (error) {
    console.error('Error deleting account:', error);
    showToast(`Error deleting account: ${error.message}`, 'error');
  }
}

// ---------------------------------------------------------------------------
// Theme
// ---------------------------------------------------------------------------

function toggleTheme() {
  if (typeof themeManager !== 'undefined') {
    themeManager.toggleTheme();
    updateThemeIcon();
  } else {
    console.error('Theme manager not available');
  }
}

function updateThemeIcon() {
  const themeIcon = document.getElementById('theme-icon');
  if (themeIcon && typeof themeManager !== 'undefined') {
    const currentTheme = themeManager.getCurrentTheme();
    themeIcon.textContent = currentTheme === 'light' ? '🌙' : '☀️';
  }
}

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------

function setupNavigation() {
  document.querySelectorAll('.nav-item').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const page = link.dataset.page;
      navigateTo(page);
    });
  });

  // Handle hash changes for directory tabs
  window.addEventListener('hashchange', () => {
    const hash = window.location.hash;
    if (hash.startsWith('#directory/')) {
      const tab = hash.split('/')[1];
      if (tab && ['contacts', 'circles', 'groups', 'tags'].includes(tab)) {
        // Dispatch event for directory-page module to handle tab switching
        window.dispatchEvent(
          new CustomEvent('app:switchDirectoryTab', { detail: { tab } })
        );
      }
    }
  });

  // Handle browser back/forward buttons
  window.addEventListener('popstate', (event) => {
    if (event.state && event.state.page) {
      navigateTo(event.state.page, false);
    } else {
      const path = window.location.pathname;
      const page = getPageFromPath(path);
      navigateTo(page, false);
    }
  });
}

/**
 * Extract page name from URL path.
 * @param {string} path
 * @returns {string}
 */
function getPageFromPath(path) {
  const cleanPath = path.replace(/^\/app\/?/, '').replace(/\/$/, '');
  const validPages = ['dashboard', 'directory', 'preferences'];

  if (!cleanPath || cleanPath === '') return 'dashboard';
  if (validPages.includes(cleanPath)) return cleanPath;
  return 'directory';
}

// Responsive sidebar helpers

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  const hamburgerBtn = document.getElementById('hamburger-btn');

  if (sidebar && overlay && hamburgerBtn) {
    if (sidebar.classList.contains('open')) {
      closeSidebar();
    } else {
      openSidebar();
    }
  }
}

function openSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  const hamburgerBtn = document.getElementById('hamburger-btn');

  if (sidebar && overlay && hamburgerBtn) {
    sidebar.classList.add('open');
    overlay.classList.add('visible');
    hamburgerBtn.classList.add('open');
  }
}

function closeSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  const hamburgerBtn = document.getElementById('hamburger-btn');

  if (sidebar && overlay && hamburgerBtn) {
    sidebar.classList.remove('open');
    overlay.classList.remove('visible');
    hamburgerBtn.classList.remove('open');
  }
}

/** Convenience wrapper used by the user-pill onclick in the sidebar. */
function navigateToPage(page) {
  navigateTo(page);
}

/**
 * Navigate to a page. Looks up the page in the registry to call its loader.
 *
 * @param {string} page — page identifier
 * @param {boolean} [updateHistory=true] — push to browser history
 */
export function navigateTo(page, updateHistory = true) {
  // Update active nav item in sidebar
  document.querySelectorAll('.nav-item').forEach((link) => {
    link.classList.toggle('active', link.dataset.page === page);
  });

  // Update active nav item in mobile navigation
  document.querySelectorAll('.mobile-nav__item').forEach((link) => {
    link.classList.toggle('mobile-nav__item--active', link.dataset.page === page);
  });

  // Hide all pages
  document.querySelectorAll('.page').forEach((p) => {
    p.classList.add('hidden');
  });

  // Show selected page
  const pageEl = document.getElementById(`${page}-page`);
  if (pageEl) {
    pageEl.classList.remove('hidden');
  }

  currentPage = page;

  // Update URL without page reload
  if (updateHistory) {
    const url = page === 'dashboard' ? '/app' : `/app/${page}`;
    window.history.pushState({ page }, '', url);
  }

  // Persist current page
  localStorage.setItem('currentPage', page);

  // Close sidebar on tablet after navigation
  closeSidebar();

  // Call the registered page loader (if any)
  const entry = pageRegistry.get(page);
  if (entry && typeof entry.load === 'function') {
    entry.load();
  } else {
    console.warn(`[app-shell] No registered loader for page "${page}"`);
  }
}

// ---------------------------------------------------------------------------
// Chat components initialization
// ---------------------------------------------------------------------------

function initializeChatComponents() {
  if (floatingChatIcon || typeof FloatingChatIcon === 'undefined') return;

  if (typeof ChatWindow !== 'undefined') {
    chatWindow = new ChatWindow({
      onClose: () => console.log('Chat window closed'),
      onCancelSession: () => console.log('Chat session cancelled'),
      onStartRecording: () => {
        console.log('Recording started from chat');
        if (floatingChatIcon) floatingChatIcon.setRecordingState(true);
      },
      onStopRecording: () => {
        console.log('Recording stopped from chat');
        if (floatingChatIcon) floatingChatIcon.setRecordingState(false);
      },
      onSendMessage: async (text) => {
        console.log('Message sent:', text);
        chatWindow.addMessage({
          id: Date.now().toString(),
          type: 'user',
          content: text,
          timestamp: new Date().toISOString(),
          status: 'sent',
        });
      },
      onEditClick: (editId) => {
        console.log('Edit clicked:', editId);
        navigateTo('edits');
      },
      onCounterClick: () => {
        console.log('Counter clicked - show pending edits');
        navigateTo('edits');
        chatWindow.close();
      },
    });

    const chatWindowEl = chatWindow.render();
    document.body.appendChild(chatWindowEl);
  }

  floatingChatIcon = new FloatingChatIcon({
    onClick: () => {
      if (chatWindow) {
        if (chatWindow.isOpen) {
          chatWindow.close();
        } else {
          chatWindow.open('session-' + Date.now());
          chatWindow.addMessage({
            id: 'welcome',
            type: 'system',
            content:
              'Hi! You can record voice notes or type messages to update your contacts. What would you like to do?',
            timestamp: new Date().toISOString(),
          });
        }
      }
    },
  });

  const iconEl = floatingChatIcon.render();
  document.body.appendChild(iconEl);

  window.floatingChatIcon = floatingChatIcon;
  window.chatWindow = chatWindow;

  console.log('Chat components initialized');
}

// ---------------------------------------------------------------------------
// Onboarding indicator
// ---------------------------------------------------------------------------

function initializeOnboardingIndicator() {
  if (onboardingIndicator || typeof OnboardingStepIndicator === 'undefined') return;

  const savedState = OnboardingStepIndicator.loadState();
  if (savedState && window.userId) {
    savedState.userId = window.userId;
  }

  onboardingIndicator = new OnboardingStepIndicator(savedState);

  if (window.userId && !onboardingIndicator.state.userId) {
    onboardingIndicator.state.userId = window.userId;
  }

  const container = document.getElementById('onboarding-indicator-container');
  if (container) {
    onboardingIndicator.mount(container);
    console.log('Onboarding indicator initialized');
  } else {
    console.error('Onboarding indicator container not found');
  }

  window.onboardingIndicator = onboardingIndicator;

  initializeStep1Handler();
}

// ---------------------------------------------------------------------------
// Sync warning banner
// ---------------------------------------------------------------------------

function initializeSyncWarningBanner() {
  if (window.syncWarningBanner || typeof SyncWarningBanner === 'undefined') return;

  window.syncWarningBanner = new SyncWarningBanner();
  window.syncWarningBanner.init();
  console.log('Sync warning banner initialized');
}

// ---------------------------------------------------------------------------
// Onboarding step handlers
// ---------------------------------------------------------------------------

async function initializeStep1Handler() {
  if (typeof Step1IntegrationsHandler === 'undefined' || !window.userId) return;

  const savedState = OnboardingStepIndicator.loadState();
  if (!savedState || savedState.isComplete || savedState.currentStep !== 1) return;

  const isOnPreferences =
    window.location.hash === '#preferences' || currentPage === 'preferences';

  if (isOnPreferences) {
    if (!step1Handler) {
      const stateManager = getOnboardingStateManagerForUI();
      step1Handler = new Step1IntegrationsHandler(stateManager, window.userId);
      await step1Handler.initialize();
    }

    setTimeout(() => {
      step1Handler.highlightIntegrationSections();
      step1Handler.setupConnectionListeners();
    }, 500);
  }
}

async function initializeStep2Handler() {
  if (typeof Step2CirclesHandler === 'undefined' || !window.userId) return;

  const savedState = OnboardingStepIndicator.loadState();
  if (!savedState || savedState.isComplete || savedState.currentStep !== 2) return;

  const isOnCircles =
    window.location.hash === '#directory/circles' ||
    (currentPage === 'directory' &&
      localStorage.getItem('currentDirectoryTab') === 'circles');

  if (isOnCircles) {
    const existingOverlay = document.querySelector('.manage-circles-overlay');
    if (existingOverlay || window.isOpeningManageCircles) return;

    if (!step2Handler) {
      step2Handler = new Step2CirclesHandler(savedState);
    }

    window.isOpeningManageCircles = true;

    setTimeout(async () => {
      await step2Handler.openManageCirclesFlow();
      setTimeout(() => {
        window.isOpeningManageCircles = false;
      }, 1000);
    }, 500);
  }
}

async function initializeStep3Handler() {
  if (typeof Step3GroupMappingHandler === 'undefined' || !window.userId) return;

  const savedState = OnboardingStepIndicator.loadState();
  if (!savedState || savedState.isComplete || savedState.currentStep !== 3) return;

  const isOnGroups =
    window.location.hash === '#directory/groups' ||
    (currentPage === 'directory' &&
      localStorage.getItem('currentDirectoryTab') === 'groups');

  if (isOnGroups) {
    if (!step3Handler) {
      step3Handler = new Step3GroupMappingHandler(savedState);
    }

    setTimeout(async () => {
      await step3Handler.loadMappingSuggestions();
    }, 500);
  }
}

/**
 * Onboarding state manager wrapper for UI components.
 */
function getOnboardingStateManagerForUI() {
  return {
    async loadState(uid) {
      const saved = OnboardingStepIndicator.loadState();
      if (saved && saved.userId === uid) return saved;
      return null;
    },

    async initializeState(uid) {
      const state = {
        userId: uid,
        isComplete: false,
        currentStep: 1,
        dismissedAt: null,
        steps: {
          integrations: { complete: false, googleCalendar: false, googleContacts: false },
          circles: { complete: false, contactsCategorized: 0, totalContacts: 0 },
          groups: { complete: false, mappingsReviewed: 0, totalMappings: 0 },
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      localStorage.setItem('catchup-onboarding', JSON.stringify(state));

      if (window.onboardingIndicator) {
        window.onboardingIndicator.updateState(state);
      }
      return state;
    },

    async updateGoogleCalendarConnection(uid, connected) {
      const state = await this.loadState(uid);
      if (state) {
        state.steps.integrations.googleCalendar = connected;
        state.updatedAt = new Date();
        localStorage.setItem('catchup-onboarding', JSON.stringify(state));
        if (window.onboardingIndicator) window.onboardingIndicator.updateState(state);
      }
    },

    async updateGoogleContactsConnection(uid, connected) {
      const state = await this.loadState(uid);
      if (state) {
        state.steps.integrations.googleContacts = connected;
        state.updatedAt = new Date();
        localStorage.setItem('catchup-onboarding', JSON.stringify(state));
        if (window.onboardingIndicator) window.onboardingIndicator.updateState(state);
      }
    },

    async markStep1Complete(uid, googleCalendar, googleContacts) {
      const state = await this.loadState(uid);
      if (state) {
        state.steps.integrations.googleCalendar = googleCalendar;
        state.steps.integrations.googleContacts = googleContacts;

        if (googleCalendar && googleContacts) {
          state.steps.integrations.complete = true;
          state.currentStep = 2;
        }

        state.updatedAt = new Date();
        localStorage.setItem('catchup-onboarding', JSON.stringify(state));
        if (window.onboardingIndicator) window.onboardingIndicator.updateState(state);
      }
    },
  };
}

/**
 * Check onboarding status after contacts are loaded.
 * Exported so page modules (e.g. directory-page) can call it.
 */
export function checkOnboardingStatus(contacts) {
  if (!onboardingIndicator || !window.userId) return;

  if (contacts && contacts.length > 0) {
    const currentState = onboardingIndicator.state;
    if (currentState.steps.circles.totalContacts === 0) {
      currentState.steps.circles.totalContacts = contacts.length;
      const categorized = contacts.filter((c) => c.circle || c.dunbarCircle).length;
      currentState.steps.circles.contactsCategorized = categorized;
      onboardingIndicator.updateState(currentState);
    }
  }
}

// ---------------------------------------------------------------------------
// Listen for auth:expired from fetchWithAuth in utils.js
// ---------------------------------------------------------------------------

window.addEventListener('auth:expired', () => {
  logout();
});

// ---------------------------------------------------------------------------
// Main initialization
// ---------------------------------------------------------------------------

/**
 * Initialize the application shell: theme, auth, navigation, event listeners.
 * Called automatically on DOMContentLoaded but also exported for testing.
 */
export function initAppShell() {
  // Initialize theme before anything else
  if (typeof themeManager !== 'undefined') {
    themeManager.initializeTheme();
    updateThemeIcon();
  }

  // Handle Google SSO redirect
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('auth_success') === 'true' && urlParams.get('token')) {
    const token = urlParams.get('token');
    const ssoUserId = urlParams.get('userId');
    const ssoUserEmail = urlParams.get('userEmail');

    localStorage.setItem('authToken', token);
    localStorage.setItem('userId', ssoUserId);
    localStorage.setItem('userEmail', ssoUserEmail);

    window.history.replaceState({}, document.title, window.location.pathname);
    console.log('[Google SSO] Authentication successful, showing main app...');
  }

  // Check for OAuth redirects BEFORE checking auth
  const hasCalendarRedirect =
    urlParams.get('calendar_success') === 'true' || urlParams.get('calendar_error');
  const hasContactsRedirect =
    urlParams.get('contacts_success') === 'true' || urlParams.get('contacts_error');

  checkAuth();
  setupNavigation();

  // Handle calendar success redirect
  if (urlParams.get('calendar_success') === 'true') {
    window.history.replaceState({}, document.title, window.location.pathname);
    navigateTo('preferences');
    setTimeout(() => {
      showToast('Google Calendar connected successfully!', 'success');
      const prefEntry = pageRegistry.get('preferences');
      if (prefEntry) prefEntry.load();
    }, 500);
  }

  // Handle calendar error redirect
  if (urlParams.get('calendar_error')) {
    const error = urlParams.get('calendar_error');
    window.history.replaceState({}, document.title, window.location.pathname);
    navigateTo('preferences');
    setTimeout(() => showToast(`Failed to connect calendar: ${error}`, 'error'), 500);
  }

  // Handle contacts success redirect
  if (urlParams.get('contacts_success') === 'true') {
    window.history.replaceState({}, document.title, window.location.pathname);
    navigateTo('preferences');
    setTimeout(() => {
      showToast('Google Contacts connected successfully! Syncing contacts...', 'success');
      const prefEntry = pageRegistry.get('preferences');
      if (prefEntry) prefEntry.load();
    }, 500);
  }

  // Handle contacts error redirect
  if (urlParams.get('contacts_error')) {
    const error = urlParams.get('contacts_error');
    window.history.replaceState({}, document.title, window.location.pathname);
    navigateTo('preferences');
    setTimeout(() => showToast(`Failed to connect contacts: ${error}`, 'error'), 500);
  }

  // Listen for contacts updates from voice notes enrichment
  window.addEventListener('contacts-updated', () => {
    console.log('contacts-updated event received, currentPage:', currentPage);
    const dirEntry = pageRegistry.get('directory');
    if (dirEntry) dirEntry.load();
  });

  // Listen for navigation requests from chat window
  window.addEventListener('navigate-to', (event) => {
    const page = event.detail;
    if (page && pageRegistry.has(page)) {
      navigateTo(page);
    }
  });

  // Listen for edits updates from voice notes enrichment
  window.addEventListener('edits-updated', async () => {
    console.log('edits-updated event received, currentPage:', currentPage);

    try {
      const response = await fetch(`${API_BASE}/edits/pending`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'x-user-id': userId,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const count = (data.edits || []).length;
        console.log('Updated pending edits count:', count);
        window.dispatchEvent(
          new CustomEvent('app:pendingEditsCount', { detail: { count } })
        );
      }
    } catch (error) {
      console.error('Error fetching pending edits count:', error);
    }

    if (currentPage === 'edits') {
      const editsEntry = pageRegistry.get('edits');
      if (editsEntry) editsEntry.load();
    }
  });

  // Expose globals that existing non-module scripts depend on
  window.toggleSidebar = toggleSidebar;
  window.openSidebar = openSidebar;
  window.closeSidebar = closeSidebar;
  window.navigateToPage = navigateToPage;
  window.navigateTo = navigateTo;
  window.toggleTheme = toggleTheme;
  window.toggleAuthMode = toggleAuthMode;
  window.handleAuth = handleAuth;
  window.logout = logout;
  window.deleteAccount = deleteAccount;
  window.checkOnboardingStatus = checkOnboardingStatus;
  window.getOnboardingStateManagerForUI = getOnboardingStateManagerForUI;
  window.initializeStep2Handler = initializeStep2Handler;
  window.initializeStep3Handler = initializeStep3Handler;
}

// ---------------------------------------------------------------------------
// Auto-init when DOM is ready
// ---------------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
  initAppShell();
});
