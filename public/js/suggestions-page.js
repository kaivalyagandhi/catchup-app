/**
 * Suggestions Page — DEPRECATED
 *
 * This standalone page has been replaced by the Dashboard Suggestions tab.
 * All visits are redirected to `#dashboard/suggestions`.
 * Window exports are preserved as no-ops for backward compatibility.
 *
 * @module suggestions-page
 */

import { registerPage, navigateTo } from './app-shell.js';

// ---------------------------------------------------------------------------
// Redirect to dashboard suggestions tab
// ---------------------------------------------------------------------------

function redirectToDashboard() {
  window.location.hash = '#dashboard/suggestions';
  navigateTo('dashboard');
}

// ---------------------------------------------------------------------------
// Register with app-shell — triggers redirect on load
// ---------------------------------------------------------------------------

registerPage('suggestions', { load: redirectToDashboard });

// ---------------------------------------------------------------------------
// Backward-compatible window exports (no-ops / redirects)
// ---------------------------------------------------------------------------

window.loadSuggestions = redirectToDashboard;
window.filterSuggestions = function () {};
window.renderSuggestions = function () {};
window.showGroupModifyMenu = function () {};
window.closeGroupModifyMenu = function () {};
window.removeContactFromGroup = function () {};
window.acceptSuggestion = function () {};
window.dismissSuggestion = function () {};
window.snoozeSuggestion = function () {};
window.addContactTooltipListeners = function () {};
window.loadCalendarEventCounts = function () {};
