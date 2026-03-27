/**
 * Settings Page — preferences and settings UI for CatchUp.
 *
 * Owns: integrations (Google Calendar, Google Contacts), display settings
 * (timezone), notifications placeholder, account info, onboarding restart,
 * about/version section, and test data management.
 *
 * @module settings-page
 */

import { escapeHtml, showToast, API_BASE, formatRelativeTime } from './utils.js';

import {
  registerPage,
  getAuthToken,
  getCurrentUser,
  navigateTo,
} from './app-shell.js';

// ---------------------------------------------------------------------------
// Module-level state
// ---------------------------------------------------------------------------

let timezoneSelector = null;

let testDataFeedback = {
  message: null,
  type: null,
  timestamp: null,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Shorthand for authToken from app-shell. */
function _authToken() {
  return getAuthToken();
}

/**
 * Safely call a calendar/contacts function from window if available,
 * otherwise return a sensible default.
 */
function _callWindowFn(fnName, ...args) {
  if (typeof window[fnName] === 'function') {
    return window[fnName](...args);
  }
  return null;
}

// ---------------------------------------------------------------------------
// Calendar / Contacts integration helpers (delegate to window globals)
// ---------------------------------------------------------------------------

async function checkCalendarConnection() {
  if (typeof window.checkCalendarConnection === 'function') {
    return window.checkCalendarConnection();
  }
  return { connected: false, email: null, expiresAt: null };
}

function connectCalendar() {
  _callWindowFn('connectCalendar');
}

function refreshCalendar() {
  _callWindowFn('refreshCalendar');
}

function disconnectCalendar() {
  _callWindowFn('disconnectCalendar');
}

async function loadGoogleContactsStatus() {
  if (typeof window.loadGoogleContactsStatus === 'function') {
    return window.loadGoogleContactsStatus();
  }
  return { connected: false };
}

// ---------------------------------------------------------------------------
// Load Preferences (main page loader)
// ---------------------------------------------------------------------------

async function loadPreferences() {
  const container = document.getElementById('preferences-content');
  const authToken = _authToken();

  // Load calendar connection status
  let calendarStatus = { connected: false, email: null, expiresAt: null };
  try {
    calendarStatus = await checkCalendarConnection();
  } catch (error) {
    console.error('Error checking calendar connection:', error);
  }

  const calendarConnected = calendarStatus.connected;

  // Load calendar sync status
  let lastSync = null;
  if (calendarConnected) {
    try {
      const syncResponse = await fetch(`${API_BASE}/calendar/sync-status`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (syncResponse.ok) {
        const syncData = await syncResponse.json();
        lastSync = syncData.lastSync;
      }
    } catch (error) {
      console.error('Error loading sync status:', error);
    }
  }

  // Load Google Contacts connection status
  let googleContactsStatus = { connected: false };
  try {
    googleContactsStatus = await loadGoogleContactsStatus();
  } catch (error) {
    console.error('Error loading Google Contacts status:', error);
  }

  // Load test data status
  let testDataStatus = null;
  try {
    const response = await fetch(`${API_BASE}/test-data/status`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (response.ok) {
      testDataStatus = await response.json();
    } else {
      console.error('Test data status request failed:', response.status, response.statusText);
    }
  } catch (error) {
    console.error('Error loading test data status:', error);
  }

  container.innerHTML = `
        <!-- Integrations Section -->
        <div style="margin-top: 16px;">
            <h3 style="margin-bottom: 16px; border-bottom: 1px solid var(--border-subtle); padding-bottom: 8px; color: var(--text-primary); font-size: 16px;">Integrations</h3>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                <!-- Google Calendar -->
                <div data-integration="google-calendar" class="integration-section" style="padding: 14px; border: 1px solid var(--border-subtle); border-radius: 10px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <img src="https://www.gstatic.com/marketing-cms/assets/images/d3/d1/e8596a9246608f8fbd72597729c8/calendar.png" alt="Google Calendar" style="width: 24px; height: 24px;">
                            <h4 style="margin: 0; color: var(--text-primary);">Google Calendar</h4>
                        </div>
                        <div style="display: flex; align-items: center; gap: 6px;">
                            <span style="width: 8px; height: 8px; border-radius: 50%; background: ${calendarConnected ? '#10b981' : '#ef4444'};"></span>
                            <span style="font-size: 12px; font-weight: 500; color: ${calendarConnected ? '#10b981' : '#ef4444'};">
                                ${calendarConnected ? 'Connected' : 'Not Connected'}
                            </span>
                        </div>
                    </div>
                    <p style="margin: 0 0 16px 0; font-size: 13px; color: var(--text-secondary);">
                        Connect your Google Calendar to enable smart scheduling and availability detection.
                    </p>
                    ${calendarConnected ? `
                        ${calendarStatus.email ? `
                            <div style="margin-bottom: 12px; padding: 10px; background: var(--status-success-bg); border-radius: 8px; border-left: 3px solid #10b981;">
                                <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 4px;">Connected as:</div>
                                <div style="font-weight: 600; color: var(--text-primary);">${calendarStatus.email}</div>
                            </div>
                        ` : ''}
                        
                        <!-- Sync Status -->
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
                            <div style="padding: 10px; background: var(--bg-hover); border-radius: 8px;">
                                <div style="font-size: 11px; color: var(--text-secondary); margin-bottom: 4px; font-weight: 600;">LAST SYNC</div>
                                <div style="font-size: 13px; font-weight: 600; color: var(--text-primary);">
                                    ${lastSync ? formatRelativeTime(new Date(lastSync)) : 'Never'}
                                </div>
                            </div>
                            <div style="padding: 10px; background: var(--bg-hover); border-radius: 8px;">
                                <div style="font-size: 11px; color: var(--text-secondary); margin-bottom: 4px; font-weight: 600;">EVENTS SYNCED</div>
                                <div style="font-size: 13px; font-weight: 600; color: var(--text-primary);" id="calendar-events-count">
                                    Loading...
                                </div>
                            </div>
                        </div>
                        
                        <!-- Auto-sync Status -->
                        <div style="margin-bottom: 16px; padding: 10px; background: var(--bg-hover); border-radius: 8px; display: flex; align-items: center; justify-content: space-between;">
                            <div>
                                <div style="font-size: 12px; font-weight: 600; color: var(--text-primary); margin-bottom: 2px;">Automatic Sync</div>
                                <div style="font-size: 11px; color: var(--text-secondary);">Daily synchronization at midnight</div>
                            </div>
                            <div style="display: flex; align-items: center; gap: 6px;">
                                <span style="width: 8px; height: 8px; border-radius: 50%; background: #10b981;"></span>
                                <span style="font-size: 12px; font-weight: 500; color: #10b981;">
                                    Enabled
                                </span>
                            </div>
                        </div>
                        
                        <!-- Read-Only Sync Notice -->
                        <div style="background: var(--status-info-bg); color: var(--text-primary); padding: 12px; border-radius: 8px; margin-bottom: 16px; border-left: 3px solid var(--status-info);">
                            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                                <span style="font-size: 18px;">ℹ️</span>
                                <h4 style="margin: 0; font-size: 13px; font-weight: 600; color: var(--text-primary);">One-Way Sync (Read-Only)</h4>
                            </div>
                            <p style="margin: 0; font-size: 12px; line-height: 1.5; color: var(--text-secondary);">
                                CatchUp imports your calendar events from Google but <strong>never modifies your Google Calendar</strong>. 
                                All changes you make in CatchUp stay local and won't affect your Google account.
                            </p>
                        </div>
                        
                        <!-- Action Buttons -->
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                            <button onclick="refreshCalendar()" id="refresh-calendar-btn" style="width: 100%;">
                                Sync Now
                            </button>
                            <button onclick="disconnectCalendar()" class="secondary" style="width: 100%;">
                                Disconnect
                            </button>
                        </div>
                    ` : `
                        <!-- Not Connected State -->
                        <div style="margin-bottom: 16px; padding: 12px; background: var(--bg-hover); border-radius: 8px;">
                            <div style="font-size: 12px; color: var(--text-primary); margin-bottom: 8px;">
                                <strong>What you get:</strong>
                            </div>
                            <ul style="margin: 0; padding-left: 20px; font-size: 12px; color: var(--text-secondary); line-height: 1.6;">
                                <li>Automatic import of all your calendar events</li>
                                <li>Daily synchronization of changes</li>
                                <li>Smart scheduling and availability detection</li>
                                <li>100% safe - we never modify your Google Calendar</li>
                            </ul>
                        </div>
                        
                        <!-- Safety Assurance -->
                        <div style="margin-bottom: 16px; padding: 10px; background: var(--status-success-bg); border-radius: 8px; border-left: 3px solid #10b981;">
                            <div style="font-size: 12px; color: var(--text-primary); display: flex; align-items: center; gap: 6px;">
                                <span>✓</span>
                                <strong>Safe to connect without risk of data loss</strong>
                            </div>
                        </div>
                        
                        <button onclick="connectCalendar()" style="width: 100%;">
                            Connect Google Calendar
                        </button>
                    `}
                </div>
                
                <!-- Google Contacts -->
                <div id="google-contacts-card">
                    <!-- Will be populated by loadGoogleContactsStatus() -->
                </div>
            </div>
        </div>
        
        <!-- Display Settings Section -->
        <div style="margin-top: 24px;">
            <h3 style="margin-bottom: 16px; border-bottom: 1px solid var(--border-subtle); padding-bottom: 8px; color: var(--text-primary); font-size: 16px;">Display Settings</h3>
            
            <div style="padding: 20px; background: var(--bg-hover); border-radius: 10px;">
                <h4 style="margin: 0 0 12px 0; color: var(--text-primary); font-size: 14px;">Timezone</h4>
                <p style="margin: 0 0 16px 0; font-size: 13px; color: var(--text-secondary);">
                    Set your timezone to display calendar times and availability in your local time.
                </p>
                
                <div id="timezone-selector-container"></div>
                
                <div style="margin-top: 16px;">
                    <button onclick="saveTimezonePreference()" id="save-timezone-btn" class="btn-primary" style="width: 100%;">
                        Save Timezone
                    </button>
                </div>
            </div>
        </div>
        
        <!-- Notifications Section -->
        <div style="margin-top: 24px;">
            <h3 style="margin-bottom: 16px; border-bottom: 1px solid var(--border-subtle); padding-bottom: 8px; color: var(--text-primary); font-size: 16px;">Notifications</h3>
            <div style="padding: 20px; background: var(--bg-hover); border-radius: 10px; text-align: center;">
                <div style="font-size: 32px; margin-bottom: 12px;">📬</div>
                <h4 style="margin: 0 0 8px 0; color: var(--text-primary);">Coming Soon</h4>
                <p style="margin: 0; font-size: 13px; color: var(--text-secondary);">
                    SMS and email notifications are not yet available. We're working on bringing you smart reminders to stay connected with your contacts.
                </p>
            </div>
        </div>
        
        <!-- Account Section -->
        <div style="margin-top: 24px;">
            <h3 style="margin-bottom: 16px; border-bottom: 1px solid var(--border-subtle); padding-bottom: 8px; color: var(--text-primary); font-size: 16px;">Account</h3>
            
            <div id="account-info-loading" style="text-align: center; padding: 16px;">
                <div class="loading-spinner" style="margin: 0 auto 8px;"></div>
                <p style="color: var(--text-secondary); font-size: 13px;">Loading account information...</p>
            </div>
            <div id="account-info-content" style="display: none;">
                <!-- Account info will be populated here -->
            </div>
        </div>
    `;

  // Add Onboarding section with restart button
  const onboardingSection = document.createElement('div');
  onboardingSection.style.marginTop = '30px';
  onboardingSection.innerHTML = renderOnboardingSection();
  container.appendChild(onboardingSection);

  // Add About section with version info
  const aboutSection = document.createElement('div');
  aboutSection.style.marginTop = '30px';
  aboutSection.innerHTML = renderAboutSection();
  container.appendChild(aboutSection);

  // Render Google Contacts card
  const googleContactsCard = document.getElementById('google-contacts-card');
  if (googleContactsCard && typeof window.renderGoogleContactsCard === 'function') {
    googleContactsCard.innerHTML = window.renderGoogleContactsCard(googleContactsStatus);
  }

  // Load account information
  loadAccountInfo();

  // Load calendar events count if connected (with small delay to ensure DOM is ready)
  if (calendarConnected) {
    setTimeout(() => loadCalendarEventsCount(), 100);
  }

  // Initialize timezone selector (with small delay to ensure DOM is ready)
  setTimeout(() => initializeTimezoneSelector(), 100);

  // Check if Step 1 should be marked complete
  checkStep1Completion(calendarConnected, googleContactsStatus.connected);
}

// ---------------------------------------------------------------------------
// Step 1 completion check
// ---------------------------------------------------------------------------

/**
 * Check if Step 1 of onboarding should be marked complete
 */
async function checkStep1Completion(calendarConnected, contactsConnected) {
  console.log('[Onboarding] Checking Step 1 completion:', { calendarConnected, contactsConnected });

  if (!calendarConnected || !contactsConnected) {
    console.log('[Onboarding] Not both connected, skipping');
    return;
  }

  const stateManager =
    typeof window.getOnboardingStateManagerForUI === 'function'
      ? window.getOnboardingStateManagerForUI()
      : null;

  if (!stateManager) {
    console.log('[Onboarding] No state manager available');
    return;
  }

  const OnboardingStepIndicator =
    typeof window.OnboardingStepIndicator !== 'undefined'
      ? window.OnboardingStepIndicator
      : null;

  let savedState = OnboardingStepIndicator ? OnboardingStepIndicator.loadState() : null;

  if (!savedState) {
    console.log('[Onboarding] No saved state found, initializing...');
    savedState = await stateManager.initializeState(window.userId);
  }

  console.log('[Onboarding] Current state:', savedState);

  if (savedState.isComplete) {
    console.log('[Onboarding] Onboarding already complete, skipping');
    return;
  }

  if (savedState.currentStep !== 1) {
    console.log('[Onboarding] Not on Step 1 (current step:', savedState.currentStep, '), skipping');
    return;
  }

  console.log('[Onboarding] Marking Step 1 complete');
  await stateManager.markStep1Complete(window.userId, true, true);

  if (window.onboardingIndicator) {
    const updatedState = await stateManager.loadState(window.userId);
    console.log('[Onboarding] Updated state:', updatedState);
    window.onboardingIndicator.updateState(updatedState);
  }

  showToast('Step 1 complete! Click "Organize Circles" to continue.', 'success');
}

// ---------------------------------------------------------------------------
// Calendar events count
// ---------------------------------------------------------------------------

async function loadCalendarEventsCount() {
  const authToken = _authToken();
  try {
    const response = await fetch(`${API_BASE}/calendar/events/count`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    if (response.ok) {
      const data = await response.json();
      const countElement = document.getElementById('calendar-events-count');
      if (countElement) {
        countElement.textContent = data.count || 0;
      }
    } else {
      const countElement = document.getElementById('calendar-events-count');
      if (countElement) {
        countElement.textContent = '0';
      }
    }
  } catch (error) {
    console.error('Error loading calendar events count:', error);
    const countElement = document.getElementById('calendar-events-count');
    if (countElement) {
      countElement.textContent = '0';
    }
  }
}

// ---------------------------------------------------------------------------
// Timezone selector
// ---------------------------------------------------------------------------

async function initializeTimezoneSelector() {
  const authToken = _authToken();
  try {
    const response = await fetch(`${API_BASE}/preferences/timezone`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    let currentTimezone = 'UTC';
    if (response.ok) {
      const data = await response.json();
      currentTimezone = data.timezone || 'UTC';
    } else if (typeof TimezoneSelector !== 'undefined') {
      currentTimezone = TimezoneSelector.detectBrowserTimezone();
    }

    if (typeof TimezoneSelector !== 'undefined') {
      timezoneSelector = new TimezoneSelector({
        containerId: 'timezone-selector-container',
        currentTimezone: currentTimezone,
        onChange: (tz) => {
          console.log('Timezone changed to:', tz);
        },
      });
    } else {
      console.error('TimezoneSelector class not found');
    }
  } catch (error) {
    console.error('Error initializing timezone selector:', error);
  }
}

async function saveTimezonePreference() {
  if (!timezoneSelector) {
    showToast('Timezone selector not initialized', 'error');
    return;
  }

  const timezone = timezoneSelector.getValue();
  const saveBtn = document.getElementById('save-timezone-btn');
  const authToken = _authToken();

  try {
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving...';
    }

    const response = await fetch(`${API_BASE}/preferences/timezone`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ timezone }),
    });

    if (response.ok) {
      showToast('Timezone preference saved successfully', 'success');
    } else {
      const error = await response.json();
      showToast(error.error || 'Failed to save timezone preference', 'error');
    }
  } catch (error) {
    console.error('Error saving timezone preference:', error);
    showToast('Failed to save timezone preference', 'error');
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save Timezone';
    }
  }
}

// ---------------------------------------------------------------------------
// Restart onboarding
// ---------------------------------------------------------------------------

async function restartOnboarding() {
  if (!window.onboardingIndicator) {
    showToast('Onboarding system not initialized', 'error');
    return;
  }

  const authToken = _authToken();

  let calendarConnected = false;
  let contactsConnected = false;

  try {
    const calendarStatus = await checkCalendarConnection();
    calendarConnected = calendarStatus.connected;
  } catch (error) {
    console.error('Error checking calendar connection:', error);
  }

  try {
    const contactsStatus = await loadGoogleContactsStatus();
    contactsConnected = contactsStatus.connected;
  } catch (error) {
    console.error('Error checking contacts connection:', error);
  }

  let contactsCategorized = 0;
  let totalContacts = 0;

  try {
    const response = await fetch(`${API_BASE}/contacts`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (response.ok) {
      const contactsData = await response.json();
      totalContacts = contactsData.length;
      contactsCategorized = contactsData.filter((c) => c.circle || c.dunbarCircle).length;
    }
  } catch (error) {
    console.error('Error checking contacts:', error);
  }

  let currentStep = 1;
  const step1Complete = calendarConnected && contactsConnected;
  const step2Complete = totalContacts > 0 && contactsCategorized > 0;

  if (step1Complete && step2Complete) {
    currentStep = 3;
  } else if (step1Complete) {
    currentStep = 2;
  } else {
    currentStep = 1;
  }

  const freshState = {
    userId: window.userId,
    isComplete: false,
    currentStep: currentStep,
    dismissedAt: null,
    steps: {
      integrations: {
        complete: step1Complete,
        googleCalendar: calendarConnected,
        googleContacts: contactsConnected,
      },
      circles: {
        complete: step2Complete,
        contactsCategorized: contactsCategorized,
        totalContacts: totalContacts,
      },
      groups: {
        complete: false,
        mappingsReviewed: 0,
        totalMappings: 0,
      },
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  window.onboardingIndicator.updateState(freshState);
  window.onboardingIndicator.isDismissed = false;

  const indicatorContainer = document.getElementById('onboarding-indicator-container');
  if (indicatorContainer) {
    window.onboardingIndicator.mount(indicatorContainer);
  }

  loadPreferences();

  if (currentStep === 1) {
    navigateTo('preferences');
    showToast('Onboarding restarted! Connect your accounts to continue.', 'success');
  } else if (currentStep === 2) {
    navigateTo('directory');
    setTimeout(() => {
      if (typeof window.switchDirectoryTab === 'function') {
        window.switchDirectoryTab('circles');
      }
    }, 100);
    showToast('Step 1 already complete! Continue with organizing circles.', 'success');
  } else if (currentStep === 3) {
    navigateTo('directory');
    setTimeout(() => {
      if (typeof window.switchDirectoryTab === 'function') {
        window.switchDirectoryTab('groups');
      }
    }, 100);
    showToast('Steps 1 & 2 complete! Review group mappings to finish.', 'success');
  }
}

// ---------------------------------------------------------------------------
// Onboarding section renderer
// ---------------------------------------------------------------------------

function renderOnboardingSection() {
  const OnboardingStepIndicator =
    typeof window.OnboardingStepIndicator !== 'undefined'
      ? window.OnboardingStepIndicator
      : null;

  const onboardingState = OnboardingStepIndicator ? OnboardingStepIndicator.loadState() : null;
  const isComplete = onboardingState?.isComplete || false;
  const isDismissed = onboardingState?.dismissedAt !== null;

  return `
        <h4 style="margin-bottom: 15px; font-size: 14px; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px;">Onboarding</h4>
        
        <div style="padding: 20px; border: 1px solid var(--border-subtle); border-radius: 10px; background: var(--bg-surface);">
            ${isComplete ? `
                <div style="margin-bottom: 16px; padding: 12px; background: var(--status-success-bg); border-radius: 8px; border-left: 3px solid #10b981;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 18px;">✓</span>
                        <div>
                            <div style="font-size: 13px; font-weight: 600; color: var(--text-primary);">Onboarding Complete!</div>
                            <div style="font-size: 12px; color: var(--text-secondary); margin-top: 2px;">You've completed all setup steps.</div>
                        </div>
                    </div>
                </div>
            ` : isDismissed ? `
                <div style="margin-bottom: 16px; padding: 12px; background: var(--status-info-bg); border-radius: 8px; border-left: 3px solid var(--status-info);">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 18px;">ℹ️</span>
                        <div>
                            <div style="font-size: 13px; font-weight: 600; color: var(--text-primary);">Onboarding Dismissed</div>
                            <div style="font-size: 12px; color: var(--text-secondary); margin-top: 2px;">You can restart it anytime below.</div>
                        </div>
                    </div>
                </div>
            ` : `
                <div style="margin-bottom: 16px; padding: 12px; background: var(--bg-hover); border-radius: 8px;">
                    <div style="font-size: 13px; font-weight: 600; color: var(--text-primary); margin-bottom: 4px;">Setup In Progress</div>
                    <div style="font-size: 12px; color: var(--text-secondary);">Complete the setup steps in the sidebar to get started.</div>
                </div>
            `}
            
            <div style="font-size: 13px; color: var(--text-primary); margin-bottom: 12px;">
                <strong>What's included:</strong>
            </div>
            <ul style="margin: 0 0 16px 0; padding-left: 20px; font-size: 12px; color: var(--text-secondary); line-height: 1.6;">
                <li>Connect your Google Calendar and Contacts</li>
                <li>Organize contacts into relationship circles</li>
                <li>Review and map Google Contact groups</li>
            </ul>
            
            <button onclick="restartOnboarding()" class="secondary" style="width: 100%;">
                ${isComplete || isDismissed ? 'Restart Onboarding' : 'Resume Onboarding'}
            </button>
        </div>
    `;
}

// ---------------------------------------------------------------------------
// About section renderer
// ---------------------------------------------------------------------------

function renderAboutSection() {
  const versionInfo = window.__VERSION_INFO__;

  let displayVersion = 'Unknown';
  let versionClass = 'local';
  let environment = 'Unknown';
  let buildDate = 'Unknown';

  if (versionInfo) {
    if (versionInfo.isProduction) {
      displayVersion = `v${versionInfo.version}`;
      versionClass = 'production';
      environment = 'Production';
    } else if (versionInfo.isLocal) {
      displayVersion = 'Development (Local)';
      versionClass = 'local';
      environment = 'Local';
    } else if (versionInfo.isDevelopment) {
      displayVersion = `Dev ${versionInfo.version}`;
      versionClass = 'development';
      environment = 'Development';
    } else {
      displayVersion = versionInfo.version || 'Unknown';
    }

    if (versionInfo.timestamp) {
      buildDate = new Date(versionInfo.timestamp).toLocaleString();
    }
  }

  return `
        <h4 style="margin-bottom: 15px; font-size: 14px; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px;">About</h4>
        
        <div class="version-info-card">
            <div class="version-info-grid">
                <div class="version-info-item">
                    <div class="version-label">Version</div>
                    <div class="version-value ${versionClass}">${displayVersion}</div>
                </div>
                <div class="version-info-item">
                    <div class="version-label">Environment</div>
                    <div class="version-value">${environment}</div>
                </div>
                <div class="version-info-item">
                    <div class="version-label">Build Date</div>
                    <div class="version-value" style="font-size: 12px;">${buildDate}</div>
                </div>
            </div>
        </div>
    `;
}

// ---------------------------------------------------------------------------
// Save preferences (simple toast)
// ---------------------------------------------------------------------------

function savePreferences() {
  showToast('Preferences saved!', 'success');
}

// ---------------------------------------------------------------------------
// Load account info
// ---------------------------------------------------------------------------

/**
 * Load and display account information
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 */
async function loadAccountInfo() {
  const loadingDiv = document.getElementById('account-info-loading');
  const contentDiv = document.getElementById('account-info-content');
  const authToken = _authToken();

  if (!loadingDiv || !contentDiv) {
    return;
  }

  try {
    const userResponse = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    if (!userResponse.ok) {
      throw new Error('Failed to load user info');
    }

    const user = await userResponse.json();

    let lastLogin = null;
    try {
      const lastLoginResponse = await fetch(`${API_BASE}/auth/last-login`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (lastLoginResponse.ok) {
        const data = await lastLoginResponse.json();
        lastLogin = data.lastLogin;
      }
    } catch (error) {
      console.error('Error loading last login:', error);
    }

    const isAdmin = user.isAdmin || false;

    let authMethodDisplay = 'Email/Password';
    let connectionStatus = 'Connected';

    if (user.authProvider === 'google') {
      authMethodDisplay = 'Google SSO';
    } else if (user.authProvider === 'both') {
      authMethodDisplay = 'Google SSO + Email/Password';
    }

    const createdDate = new Date(user.createdAt);
    const createdDateStr = createdDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    let lastLoginStr = 'This is your first login';
    if (lastLogin) {
      const lastLoginDate = new Date(lastLogin);
      lastLoginStr = formatRelativeTime(lastLoginDate);
    }

    contentDiv.innerHTML = `
            <div style="display: grid; gap: 10px;">
                <!-- Email -->
                <div class="info-row" style="padding: 10px; background: var(--bg-hover); border-radius: 6px;">
                    <div style="font-size: 11px; color: var(--text-secondary); margin-bottom: 3px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px;">Email</div>
                    <div style="font-size: 13px; color: var(--text-primary); font-weight: 500;">${escapeHtml(user.email)}</div>
                </div>
                
                <!-- Authentication Method -->
                <div class="info-row" style="display: flex; justify-content: space-between; align-items: center; padding: 10px; background: var(--bg-hover); border-radius: 6px;">
                    <div style="flex: 1;">
                        <div style="font-size: 11px; color: var(--text-secondary); margin-bottom: 3px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px;">Authentication Method</div>
                        <div style="font-size: 13px; color: var(--text-primary); font-weight: 500;">${authMethodDisplay}</div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 5px;">
                        <span style="width: 7px; height: 7px; border-radius: 50%; background: #10b981;"></span>
                        <span style="font-size: 11px; font-weight: 500; color: #10b981;">
                            ${connectionStatus}
                        </span>
                    </div>
                </div>
                
                <!-- Member Since & Last Login -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <div class="info-row" style="padding: 10px; background: var(--bg-hover); border-radius: 6px;">
                        <div style="font-size: 11px; color: var(--text-secondary); margin-bottom: 3px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px;">Member Since</div>
                        <div style="font-size: 13px; color: var(--text-primary); font-weight: 500;">${createdDateStr}</div>
                    </div>
                    
                    <div class="info-row" style="padding: 10px; background: var(--bg-hover); border-radius: 6px;">
                        <div style="font-size: 11px; color: var(--text-secondary); margin-bottom: 3px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px;">Last Login</div>
                        <div style="font-size: 13px; color: var(--text-primary); font-weight: 500;">${lastLoginStr}</div>
                    </div>
                </div>
                
                <!-- Action Buttons -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 8px;">
                    <button onclick="logout()" style="padding: 10px; background: var(--color-danger); color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 13px;">
                        Sign Out
                    </button>
                    <button onclick="deleteAccount()" style="padding: 10px; background: transparent; color: var(--color-danger); border: 2px solid var(--color-danger); border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 13px;">
                        Delete Account
                    </button>
                </div>
                
                ${isAdmin ? `
                <!-- Admin Dashboard Link -->
                <div style="margin-top: 16px; padding: 14px; background: linear-gradient(135deg, var(--bg-hover) 0%, var(--bg-secondary) 100%); border: 2px solid var(--border-subtle); border-radius: 8px;">
                    <div style="display: flex; align-items: center; justify-content: space-between;">
                        <div style="flex: 1;">
                            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                                <span style="font-size: 18px;">🔧</span>
                                <h4 style="margin: 0; font-size: 14px; font-weight: 600; color: var(--text-primary);">Admin Dashboard</h4>
                            </div>
                            <p style="margin: 0; font-size: 12px; color: var(--text-secondary); line-height: 1.4;">
                                Monitor sync health, view metrics, and manage system optimization
                            </p>
                        </div>
                        <a href="/admin/sync-health.html" target="_blank" style="padding: 10px 16px; background: var(--color-primary); color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 13px; text-decoration: none; white-space: nowrap; display: inline-flex; align-items: center; gap: 6px;">
                            Open Dashboard
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                <polyline points="15 3 21 3 21 9"></polyline>
                                <line x1="10" y1="14" x2="21" y2="3"></line>
                            </svg>
                        </a>
                    </div>
                </div>
                ` : ''}
            </div>
        `;

    loadingDiv.style.display = 'none';
    contentDiv.style.display = 'block';
  } catch (error) {
    console.error('Error loading account info:', error);

    loadingDiv.style.display = 'none';
    contentDiv.style.display = 'block';
    contentDiv.innerHTML = `
            <div style="text-align: center; padding: 20px; color: var(--status-error-text);">
                <p style="margin-bottom: 10px;">Failed to load account information</p>
                <button onclick="loadAccountInfo()" class="secondary" style="padding: 8px 16px; font-size: 13px;">
                    Retry
                </button>
            </div>
        `;
  }
}

// ---------------------------------------------------------------------------
// Test Data Management Functions
// ---------------------------------------------------------------------------

function showTestDataFeedback(message, type = 'info', duration = 5000) {
  let feedback = document.getElementById('test-data-feedback');
  if (!feedback) {
    feedback = document.createElement('div');
    feedback.id = 'test-data-feedback';
    feedback.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 16px;
            border-radius: 4px;
            font-size: 14px;
            z-index: 1000;
            animation: slideIn 0.3s ease-out;
            max-width: 400px;
        `;
    document.body.appendChild(feedback);
  }

  let bgColor, textColor, borderColor;
  switch (type) {
    case 'success':
      bgColor = 'var(--status-success-bg)';
      textColor = 'var(--status-success-text)';
      borderColor = 'var(--status-success-text)';
      break;
    case 'error':
      bgColor = 'var(--status-error-bg)';
      textColor = 'var(--status-error-text)';
      borderColor = 'var(--status-error-text)';
      break;
    case 'loading':
      bgColor = 'var(--status-info-bg)';
      textColor = 'var(--status-info-text)';
      borderColor = 'var(--status-info-text)';
      break;
    default:
      bgColor = 'var(--bg-secondary)';
      textColor = 'var(--text-primary)';
      borderColor = 'var(--border-primary)';
  }

  feedback.style.backgroundColor = bgColor;
  feedback.style.color = textColor;
  feedback.style.borderLeft = `4px solid ${borderColor}`;
  feedback.textContent = message;
  feedback.style.display = 'block';

  if (type !== 'loading' && duration > 0) {
    setTimeout(() => {
      feedback.style.display = 'none';
    }, duration);
  }
}

async function refreshTestDataStatus() {
  const authToken = _authToken();
  try {
    const response = await fetch(`${API_BASE}/test-data/status`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch test data status');
    }

    const testDataStatus = await response.json();

    const statusCards = document.querySelectorAll('[data-test-data-type]');
    statusCards.forEach((card) => {
      const dataType = card.getAttribute('data-test-data-type');
      const counts = testDataStatus[dataType];

      if (counts) {
        const countElement = card.querySelector('[data-test-data-counts]');
        if (countElement) {
          countElement.innerHTML = `
                        <span style="color: var(--status-info-text);">${counts.test}</span> test / 
                        <span style="color: var(--text-secondary);">${counts.real}</span> real
                    `;
        }
      }
    });

    return testDataStatus;
  } catch (error) {
    console.error('Error refreshing test data status:', error);
    return null;
  }
}

async function generateTestData(dataType) {
  const authToken = _authToken();
  try {
    const button = event.target;

    button.disabled = true;
    button.textContent = 'Generating...';
    showTestDataFeedback(`Generating ${dataType}...`, 'loading');

    const response = await fetch(`${API_BASE}/test-data/generate/${dataType}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.details || `Failed to generate ${dataType}`);
    }

    const result = await response.json();

    showTestDataFeedback(
      `Successfully generated ${result.itemsCreated} ${dataType}`,
      'success',
      5000,
    );

    setTimeout(() => {
      refreshTestDataStatus();
    }, 500);
  } catch (error) {
    console.error(`Error generating ${dataType}:`, error);
    showTestDataFeedback(`Error generating ${dataType}: ${error.message}`, 'error', 5000);
  } finally {
    if (event.target) {
      event.target.disabled = false;
      event.target.textContent = 'Generate';
    }
  }
}

async function removeTestData(dataType) {
  if (!confirm(`Are you sure you want to remove all test ${dataType}?`)) {
    return;
  }

  const authToken = _authToken();
  try {
    const button = event.target;

    button.disabled = true;
    button.textContent = 'Removing...';
    showTestDataFeedback(`Removing ${dataType}...`, 'loading');

    const response = await fetch(`${API_BASE}/test-data/remove/${dataType}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.details || `Failed to remove ${dataType}`);
    }

    const result = await response.json();

    showTestDataFeedback(
      `Successfully removed ${result.itemsDeleted} test ${dataType}`,
      'success',
      5000,
    );

    setTimeout(() => {
      refreshTestDataStatus();
    }, 500);
  } catch (error) {
    console.error(`Error removing ${dataType}:`, error);
    showTestDataFeedback(`Error removing ${dataType}: ${error.message}`, 'error', 5000);
  } finally {
    if (event.target) {
      event.target.disabled = false;
      event.target.textContent = 'Remove';
    }
  }
}

async function clearAllTestData() {
  if (
    !confirm(
      'Are you sure you want to permanently delete ALL test data? This action cannot be undone.',
    )
  ) {
    return;
  }

  if (
    !confirm(
      'This will delete all test contacts, calendar events, suggestions, and voice notes. Are you absolutely sure?',
    )
  ) {
    return;
  }

  const authToken = _authToken();
  try {
    const button = event.target;

    button.disabled = true;
    button.textContent = 'Clearing...';
    showTestDataFeedback('Clearing all test data...', 'loading');

    const response = await fetch(`${API_BASE}/test-data/clear`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.details || 'Failed to clear test data');
    }

    const result = await response.json();

    const summary = [
      result.contactsDeleted > 0 && `${result.contactsDeleted} contacts`,
      result.calendarEventsDeleted > 0 && `${result.calendarEventsDeleted} calendar events`,
      result.suggestionsDeleted > 0 && `${result.suggestionsDeleted} suggestions`,
      result.voiceNotesDeleted > 0 && `${result.voiceNotesDeleted} voice notes`,
    ]
      .filter(Boolean)
      .join(', ');

    showTestDataFeedback(`Successfully cleared all test data (${summary})`, 'success', 5000);

    // Refresh current view via window globals
    if (typeof window.loadContacts === 'function') {
      window.loadContacts();
    }

    await refreshTestDataStatus();
  } catch (error) {
    console.error('Error clearing all test data:', error);
    showTestDataFeedback(`Error clearing test data: ${error.message}`, 'error', 5000);
  } finally {
    if (event.target) {
      event.target.disabled = false;
      event.target.textContent = 'Clear All';
    }
  }
}

async function bulkAddTestData() {
  const authToken = _authToken();
  try {
    const button = event.target;

    button.disabled = true;
    button.textContent = 'Generating...';
    showTestDataFeedback('Generating all test data...', 'loading');

    const dataTypes = ['contacts', 'calendarEvents', 'suggestions', 'groupSuggestions', 'voiceNotes'];
    const results = {};
    let totalItemsCreated = 0;

    for (const dataType of dataTypes) {
      try {
        const response = await fetch(`${API_BASE}/test-data/generate/${dataType}`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const result = await response.json();
          results[dataType] = result.itemsCreated;
          totalItemsCreated += result.itemsCreated;
          console.log(`Generated ${result.itemsCreated} ${dataType}`);
        } else {
          console.warn(`Failed to generate ${dataType}`);
          results[dataType] = 0;
        }
      } catch (error) {
        console.error(`Error generating ${dataType}:`, error);
        results[dataType] = 0;
      }

      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    const summary = [
      results.contacts > 0 && `${results.contacts} contacts`,
      results.calendarEvents > 0 && `${results.calendarEvents} calendar events`,
      results.suggestions > 0 && `${results.suggestions} suggestions`,
      results.groupSuggestions > 0 && `${results.groupSuggestions} group suggestions`,
      results.voiceNotes > 0 && `${results.voiceNotes} voice notes`,
    ]
      .filter(Boolean)
      .join(', ');

    showTestDataFeedback(`Successfully generated all test data (${summary})`, 'success', 5000);

    setTimeout(() => {
      refreshTestDataStatus();
    }, 500);
  } catch (error) {
    console.error('Error in bulk add test data:', error);
    showTestDataFeedback(`Error generating test data: ${error.message}`, 'error', 5000);
  } finally {
    if (event.target) {
      event.target.disabled = false;
      event.target.textContent = 'Bulk Add All Test Data';
    }
  }
}

async function deleteAllUserData() {
  if (!confirm('Are you sure you want to delete all your data? This action cannot be undone.')) {
    return;
  }

  if (
    !confirm(
      'This will permanently delete all your contacts, events, suggestions, and voice notes. Your account will remain active. Are you absolutely sure?',
    )
  ) {
    return;
  }

  const authToken = _authToken();
  try {
    const button = event.target;

    button.disabled = true;
    button.textContent = 'Clearing...';
    showTestDataFeedback('Clearing all your data...', 'loading');

    const response = await fetch(`${API_BASE}/account/clear-data`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to clear data');
    }

    const result = await response.json();

    const summary = [
      result.contactsDeleted > 0 && `${result.contactsDeleted} contacts`,
      result.calendarEventsDeleted > 0 && `${result.calendarEventsDeleted} calendar events`,
      result.suggestionsDeleted > 0 && `${result.suggestionsDeleted} suggestions`,
      result.voiceNotesDeleted > 0 && `${result.voiceNotesDeleted} voice notes`,
    ]
      .filter(Boolean)
      .join(', ');

    showTestDataFeedback(`All your data has been cleared (${summary})`, 'success', 5000);

    // Refresh current view via window globals
    if (typeof window.loadContacts === 'function') {
      window.loadContacts();
    }

    await refreshTestDataStatus();
  } catch (error) {
    console.error('Error clearing user data:', error);
    showTestDataFeedback(`Error clearing data: ${error.message}`, 'error', 5000);
  } finally {
    if (event.target) {
      event.target.disabled = false;
      event.target.textContent = 'Clear All';
    }
  }
}

async function seedTestData() {
  if (
    !confirm(
      'This will create test contacts with tags, groups, calendar events, and suggestions. Continue?',
    )
  ) {
    return;
  }

  const authToken = _authToken();
  showTestDataLoading('Seeding test data...');

  try {
    const response = await fetch(`${API_BASE}/test-data/seed`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        contactCount: 10,
        includeCalendarEvents: true,
        includeSuggestions: true,
      }),
    });

    if (response.status === 401) {
      if (typeof window.logout === 'function') window.logout();
      return;
    }

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to seed test data');
    }

    const data = await response.json();

    hideTestDataLoading();

    const successMessage = `Created ${data.contactsCreated} contacts, ${data.groupsCreated} groups, ${data.tagsCreated} tags, ${data.calendarEventsCreated} calendar events, and ${data.suggestionsCreated || 0} suggestions!`;
    showTestDataSuccess(successMessage);

    if (typeof window.loadContacts === 'function') {
      window.loadContacts();
    }
  } catch (error) {
    console.error('Error seeding test data:', error);
    hideTestDataLoading();
    showTestDataError(error.message || 'Failed to seed test data');
  }
}

async function generateSuggestions() {
  if (
    !confirm(
      'This will generate new suggestions based on your existing contacts and calendar. Continue?',
    )
  ) {
    return;
  }

  const authToken = _authToken();
  showTestDataLoading('Generating suggestions...');

  try {
    const response = await fetch(`${API_BASE}/test-data/generate-suggestions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        daysAhead: 7,
      }),
    });

    if (response.status === 401) {
      if (typeof window.logout === 'function') window.logout();
      return;
    }

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to generate suggestions');
    }

    const data = await response.json();

    hideTestDataLoading();
    showTestDataSuccess(`Generated ${data.suggestionsCreated} new suggestions!`);

    if (typeof window.loadSuggestions === 'function') {
      window.loadSuggestions();
    }
  } catch (error) {
    console.error('Error generating suggestions:', error);
    hideTestDataLoading();
    showTestDataError(error.message || 'Failed to generate suggestions');
  }
}

async function clearTestData() {
  if (
    !confirm(
      'This will delete ALL test data including contacts, groups, tags, calendar events, and suggestions. This action cannot be undone. Continue?',
    )
  ) {
    return;
  }

  const authToken = _authToken();
  showTestDataLoading('Clearing test data...');

  try {
    const response = await fetch(`${API_BASE}/test-data/clear`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
    });

    if (response.status === 401) {
      if (typeof window.logout === 'function') window.logout();
      return;
    }

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to clear test data');
    }

    const data = await response.json();

    hideTestDataLoading();

    const successMessage = `Cleared ${data.contactsDeleted} contacts, ${data.groupsDeleted} groups, ${data.tagsDeleted} tags, ${data.calendarEventsDeleted} calendar events, and ${data.suggestionsDeleted} suggestions!`;
    showTestDataSuccess(successMessage);

    if (typeof window.loadContacts === 'function') {
      window.loadContacts();
    }
  } catch (error) {
    console.error('Error clearing test data:', error);
    hideTestDataLoading();
    showTestDataError(error.message || 'Failed to clear test data');
  }
}

// ---------------------------------------------------------------------------
// Test data UI feedback helpers
// ---------------------------------------------------------------------------

function showTestDataLoading(message) {
  const infoBox = document.getElementById('suggestions-info');
  const infoText = document.getElementById('suggestions-info-text');

  if (infoBox && infoText) {
    infoBox.style.background = '#e0f2fe';
    infoBox.style.display = 'block';
    infoText.innerHTML = `<span style="display: inline-block; animation: spin 1s linear infinite;">⏳</span> ${escapeHtml(message)}`;
  }
}

function hideTestDataLoading() {
  // Loading is hidden when success or error is shown
}

function showTestDataSuccess(message) {
  const infoBox = document.getElementById('suggestions-info');
  const infoText = document.getElementById('suggestions-info-text');

  if (infoBox && infoText) {
    infoBox.style.background = '#d1fae5';
    infoBox.style.display = 'block';
    infoText.innerHTML = `✅ ${escapeHtml(message)}`;

    setTimeout(() => {
      infoBox.style.display = 'none';
    }, 5000);
  }
}

function showTestDataError(message) {
  const infoBox = document.getElementById('suggestions-info');
  const infoText = document.getElementById('suggestions-info-text');

  if (infoBox && infoText) {
    infoBox.style.background = '#fee2e2';
    infoBox.style.display = 'block';
    infoText.innerHTML = `❌ ${escapeHtml(message)}`;

    setTimeout(() => {
      infoBox.style.display = 'none';
    }, 7000);
  }
}

// ---------------------------------------------------------------------------
// Page registration
// ---------------------------------------------------------------------------

registerPage('preferences', { load: loadPreferences });

// ---------------------------------------------------------------------------
// Expose all functions on window for backward compatibility with onclick
// ---------------------------------------------------------------------------

// Core settings page
window.loadPreferences = loadPreferences;
window.savePreferences = savePreferences;

// Calendar / Contacts integration (delegate wrappers)
window.connectCalendar = connectCalendar;
window.refreshCalendar = refreshCalendar;
window.disconnectCalendar = disconnectCalendar;

// Timezone
window.initializeTimezoneSelector = initializeTimezoneSelector;
window.saveTimezonePreference = saveTimezonePreference;

// Calendar events count
window.loadCalendarEventsCount = loadCalendarEventsCount;

// Onboarding
window.checkStep1Completion = checkStep1Completion;
window.restartOnboarding = restartOnboarding;
window.renderOnboardingSection = renderOnboardingSection;

// About
window.renderAboutSection = renderAboutSection;

// Account
window.loadAccountInfo = loadAccountInfo;

// Test data management
window.showTestDataFeedback = showTestDataFeedback;
window.refreshTestDataStatus = refreshTestDataStatus;
window.generateTestData = generateTestData;
window.removeTestData = removeTestData;
window.clearAllTestData = clearAllTestData;
window.bulkAddTestData = bulkAddTestData;
window.deleteAllUserData = deleteAllUserData;
window.seedTestData = seedTestData;
window.generateSuggestions = generateSuggestions;
window.clearTestData = clearTestData;
window.showTestDataLoading = showTestDataLoading;
window.hideTestDataLoading = hideTestDataLoading;
window.showTestDataSuccess = showTestDataSuccess;
window.showTestDataError = showTestDataError;
