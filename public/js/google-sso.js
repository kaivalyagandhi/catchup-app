/**
 * Google SSO Frontend Integration
 * 
 * Handles Google Single Sign-On authentication flow including:
 * - OAuth authorization initiation
 * - Callback handling
 * - Loading states and visual feedback
 * - Error display
 * - Test mode detection
 */

// State management
let googleSSOState = {
    isLoading: false,
    testModeEnabled: false,
    error: null
};

/**
 * Initialize Google SSO functionality
 * - Sets up event listeners
 * - Checks test mode status
 * - Handles OAuth callback if present
 */
async function initGoogleSSO() {
    console.log('Initializing Google SSO...');
    
    // Set up Google SSO button click handler
    const googleSSOBtn = document.getElementById('google-sso-btn');
    if (googleSSOBtn) {
        googleSSOBtn.addEventListener('click', handleGoogleLogin);
    }
    
    // Check test mode status to show/hide email/password form
    await checkTestMode();
    
    // Handle auth success from redirect (new flow)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('auth_success') === 'true' && urlParams.get('token')) {
        const token = urlParams.get('token');
        const userId = urlParams.get('userId');
        const userEmail = urlParams.get('userEmail');
        const isNewUser = urlParams.get('isNewUser') === 'true';
        
        // Store authentication data
        localStorage.setItem('authToken', token);
        localStorage.setItem('userId', userId);
        localStorage.setItem('userEmail', userEmail);
        
        // Clear URL parameters
        window.history.replaceState({}, document.title, window.location.pathname);
        
        console.log('[Google SSO] Authentication successful, reloading...');
        
        // Reload to show authenticated app
        window.location.reload();
        return;
    }
    
    // Handle OAuth callback if present in URL (old flow - keeping for compatibility)
    if (window.location.search.includes('code=') && window.location.search.includes('state=')) {
        // Check if this is a Google SSO callback (not Google Contacts or Calendar)
        const state = urlParams.get('state');
        
        // Google SSO state doesn't have a specific prefix like 'google_contacts'
        // If it's not a known integration state, assume it's Google SSO
        if (state && !state.includes('google_contacts') && !state.includes('calendar')) {
            await handleGoogleCallback();
        }
    }
}

/**
 * Check if test mode is enabled
 * Uses server-injected value for instant display, falls back to API call
 */
async function checkTestMode() {
    // First, check for server-injected test mode status (instant, no network delay)
    if (typeof window.__TEST_MODE_ENABLED__ !== 'undefined') {
        googleSSOState.testModeEnabled = window.__TEST_MODE_ENABLED__;
        applyTestModeUI(googleSSOState.testModeEnabled);
        console.log('Test mode (server-injected):', googleSSOState.testModeEnabled ? 'enabled' : 'disabled');
        return;
    }
    
    // Fallback to API call if server injection is not available
    try {
        const response = await fetch('/api/auth/test-mode');
        
        if (!response.ok) {
            throw new Error('Failed to fetch test mode status');
        }
        
        const data = await response.json();
        googleSSOState.testModeEnabled = data.enabled || false;
        applyTestModeUI(googleSSOState.testModeEnabled);
        console.log('Test mode (API):', googleSSOState.testModeEnabled ? 'enabled' : 'disabled');
    } catch (error) {
        console.error('Failed to check test mode:', error);
        // Default to hiding email/password form if check fails (production mode)
        applyTestModeUI(false);
    }
}

/**
 * Apply test mode UI changes
 * @param {boolean} enabled - Whether test mode is enabled
 */
function applyTestModeUI(enabled) {
    // Show/hide email/password form based on test mode
    const emailAuthForm = document.getElementById('email-auth-form');
    if (emailAuthForm) {
        emailAuthForm.style.display = enabled ? 'block' : 'none';
    }
    
    // Update test mode indicator visibility
    updateTestModeIndicator(enabled);
}

/**
 * Update test mode indicator visibility
 * @param {boolean} enabled - Whether test mode is enabled
 */
function updateTestModeIndicator(enabled) {
    const testModeNotice = document.querySelector('.test-mode-notice');
    if (testModeNotice) {
        if (enabled) {
            testModeNotice.style.display = 'block';
        } else {
            testModeNotice.style.display = 'none';
        }
    }
}

/**
 * Handle Google SSO button click
 * Initiates OAuth authorization flow
 */
async function handleGoogleLogin() {
    if (googleSSOState.isLoading) {
        return; // Prevent multiple clicks
    }
    
    try {
        setGoogleSSOLoading(true);
        clearGoogleSSOError();
        
        // Get authorization URL from backend
        const response = await fetch('/api/auth/google/authorize');
        
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error?.message || 'Failed to initiate Google sign-in');
        }
        
        const data = await response.json();
        
        // Backend returns 'authUrl', not 'authorizationUrl'
        if (!data.authUrl) {
            throw new Error('No authorization URL received');
        }
        
        // Redirect to Google's authorization page
        console.log('Redirecting to Google authorization...');
        window.location.href = data.authUrl;
        
    } catch (error) {
        console.error('Google SSO error:', error);
        displayGoogleSSOError(error.message || 'Failed to start Google sign-in. Please try again.');
        setGoogleSSOLoading(false);
    }
}

/**
 * Handle OAuth callback from Google
 * Exchanges authorization code for tokens and authenticates user
 */
async function handleGoogleCallback() {
    try {
        setGoogleSSOLoading(true);
        showGoogleSSOLoadingMessage('Completing sign-in with Google...');
        
        // Get code and state from URL
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');
        
        if (!code || !state) {
            throw new Error('Missing authorization code or state');
        }
        
        // Exchange code for token via backend
        const response = await fetch('/api/auth/google/callback' + window.location.search, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error?.message || 'Authentication failed');
        }
        
        const data = await response.json();
        
        if (!data.token || !data.user) {
            throw new Error('Invalid authentication response');
        }
        
        // Store authentication data
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('userId', data.user.id);
        localStorage.setItem('userEmail', data.user.email);
        
        // Clear URL parameters
        window.history.replaceState({}, document.title, window.location.pathname);
        
        // Show success message briefly
        showGoogleSSOSuccessMessage('Successfully signed in!');
        
        // Redirect to main app after short delay
        setTimeout(() => {
            window.location.reload();
        }, 500);
        
    } catch (error) {
        console.error('Google callback error:', error);
        
        // Clear URL parameters
        window.history.replaceState({}, document.title, window.location.pathname);
        
        // Display error
        displayGoogleSSOError(error.message || 'Failed to complete sign-in. Please try again.');
        setGoogleSSOLoading(false);
    }
}

/**
 * Set loading state for Google SSO button
 * @param {boolean} loading - Whether loading is active
 */
function setGoogleSSOLoading(loading) {
    googleSSOState.isLoading = loading;
    
    const googleSSOBtn = document.getElementById('google-sso-btn');
    if (googleSSOBtn) {
        if (loading) {
            googleSSOBtn.disabled = true;
            googleSSOBtn.classList.add('loading');
            
            // Store original content
            if (!googleSSOBtn.dataset.originalContent) {
                googleSSOBtn.dataset.originalContent = googleSSOBtn.innerHTML;
            }
            
            // Show loading spinner
            googleSSOBtn.innerHTML = `
                <span class="google-sso-spinner"></span>
                <span>Signing in...</span>
            `;
        } else {
            googleSSOBtn.disabled = false;
            googleSSOBtn.classList.remove('loading');
            
            // Restore original content
            if (googleSSOBtn.dataset.originalContent) {
                googleSSOBtn.innerHTML = googleSSOBtn.dataset.originalContent;
            }
        }
    }
}

/**
 * Display error message for Google SSO
 * @param {string} message - Error message to display
 */
function displayGoogleSSOError(message) {
    googleSSOState.error = message;
    
    const errorDiv = document.getElementById('google-sso-error');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.classList.remove('hidden');
        errorDiv.style.display = 'block';
    }
    
    // Also show in auth-error if available
    const authError = document.getElementById('auth-error');
    if (authError) {
        authError.textContent = message;
        authError.classList.remove('hidden');
    }
}

/**
 * Clear Google SSO error message
 */
function clearGoogleSSOError() {
    googleSSOState.error = null;
    
    const errorDiv = document.getElementById('google-sso-error');
    if (errorDiv) {
        errorDiv.textContent = '';
        errorDiv.classList.add('hidden');
        errorDiv.style.display = 'none';
    }
    
    const authError = document.getElementById('auth-error');
    if (authError) {
        authError.classList.add('hidden');
    }
}

/**
 * Show loading message during OAuth flow
 * @param {string} message - Loading message to display
 */
function showGoogleSSOLoadingMessage(message) {
    const loadingDiv = document.getElementById('google-sso-loading');
    if (loadingDiv) {
        loadingDiv.textContent = message;
        loadingDiv.classList.remove('hidden');
        loadingDiv.style.display = 'block';
    }
}

/**
 * Show success message after authentication
 * @param {string} message - Success message to display
 */
function showGoogleSSOSuccessMessage(message) {
    const successDiv = document.getElementById('google-sso-success');
    if (successDiv) {
        successDiv.textContent = message;
        successDiv.classList.remove('hidden');
        successDiv.style.display = 'block';
    }
    
    // Also show in auth-success if available
    const authSuccess = document.getElementById('auth-success');
    if (authSuccess) {
        authSuccess.textContent = message;
        authSuccess.classList.remove('hidden');
    }
}

// Export functions for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initGoogleSSO,
        handleGoogleLogin,
        handleGoogleCallback,
        checkTestMode,
        updateTestModeIndicator
    };
}
