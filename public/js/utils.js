/**
 * Shared utility functions for CatchUp frontend modules.
 * ES module — import individual exports where needed.
 *
 * @module utils
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const API_BASE = '/api';

// ---------------------------------------------------------------------------
// HTML / formatting helpers
// ---------------------------------------------------------------------------

/**
 * Escape a string for safe insertion into HTML.
 * @param {string} text
 * @returns {string}
 */
export function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Format an ISO date-string as a locale-aware date/time string.
 * @param {string} dateString
 * @returns {string}
 */
export function formatDateTime(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString();
}

/**
 * Return a human-friendly relative time label (e.g. "3 mins ago").
 * @param {Date} date
 * @returns {string}
 */
export function formatRelativeTime(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

  // For older dates, show the actual date
  return date.toLocaleDateString();
}

// ---------------------------------------------------------------------------
// Authenticated fetch wrapper
// ---------------------------------------------------------------------------

/**
 * Wrapper around `fetch` that automatically attaches the JWT auth header
 * from localStorage and handles common HTTP error statuses.
 *
 * @param {string} url  — request URL (absolute or relative)
 * @param {RequestInit} [options={}] — standard fetch options
 * @returns {Promise<Response>}
 */
export async function fetchWithAuth(url, options = {}) {
  const token = localStorage.getItem('authToken');

  const headers = {
    ...(options.headers || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, { ...options, headers });

  // Auto-handle 401 — clear stored auth and redirect to login
  if (response.status === 401) {
    localStorage.removeItem('authToken');
    // Dispatch a custom event so the app-shell can react (e.g. show login)
    window.dispatchEvent(new CustomEvent('auth:expired'));
    throw new Error('Session expired. Please log in again.');
  }

  return response;
}

// ---------------------------------------------------------------------------
// Toast notification system
// ---------------------------------------------------------------------------

let toastCounter = 0;
const activeToasts = new Map();

/**
 * Show a toast notification.
 *
 * @param {string} message
 * @param {'info'|'success'|'error'|'loading'} [type='info']
 * @param {Object} [options]
 * @param {{ label: string, callback: Function }} [options.action] — optional action button
 * @returns {number} toastId — can be passed to `hideToast` to dismiss early
 */
export function showToast(message, type = 'info', options = {}) {
  const toastId = ++toastCounter;

  // Create toast element
  const toast = document.createElement('div');
  toast.id = `toast-${toastId}`;
  toast.className = `toast toast-${type}`;

  // Add icon based on type
  let icon = '';
  if (type === 'success') {
    icon = '✓';
  } else if (type === 'error') {
    icon = '✕';
  } else if (type === 'loading') {
    icon = '<span class="toast-spinner"></span>';
  } else {
    icon = 'ℹ';
  }

  toast.innerHTML = `
    <div class="toast-icon">${icon}</div>
    <div class="toast-message">${escapeHtml(message)}</div>
  `;

  // Add action button if provided (retry support)
  if (options.action && options.action.label && typeof options.action.callback === 'function') {
    const actionBtn = document.createElement('button');
    actionBtn.className = 'toast-action-btn';
    actionBtn.textContent = options.action.label;
    actionBtn.addEventListener('click', () => {
      hideToast(toastId);
      options.action.callback();
    });
    toast.appendChild(actionBtn);
  }

  // Add to DOM
  let toastContainer = document.getElementById('toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    document.body.appendChild(toastContainer);
  }

  toastContainer.appendChild(toast);
  activeToasts.set(toastId, toast);

  // Trigger animation
  setTimeout(() => {
    toast.classList.add('toast-show');
  }, 10);

  // Auto-dismiss for non-loading toasts (longer duration when action button present)
  if (type !== 'loading') {
    const duration = options.action ? 8000 : (type === 'error' ? 5000 : 3000);
    setTimeout(() => {
      hideToast(toastId);
    }, duration);
  }

  return toastId;
}

/**
 * Dismiss a toast by its id.
 * @param {number} toastId
 */
export function hideToast(toastId) {
  const toast = activeToasts.get(toastId);
  if (toast) {
    toast.classList.remove('toast-show');
    toast.classList.add('toast-hide');

    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
      activeToasts.delete(toastId);
    }, 300);
  }
}

// ---------------------------------------------------------------------------
// Confirmation dialog
// ---------------------------------------------------------------------------

/**
 * Show a non-blocking confirmation dialog (replaces window.confirm).
 *
 * @param {string} message
 * @param {Object} [options]
 * @param {string} [options.title='Confirm']
 * @param {string} [options.confirmText='Confirm']
 * @param {string} [options.cancelText='Cancel']
 * @param {'warning'|'danger'|'info'} [options.type='warning']
 * @returns {Promise<boolean>} resolves true on confirm, false on cancel
 */
export function showConfirm(message, options = {}) {
  return new Promise((resolve) => {
    const {
      title = 'Confirm',
      confirmText = 'Confirm',
      cancelText = 'Cancel',
      type = 'warning',
    } = options;

    // Create overlay using standard modal-overlay class
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    // Create dialog using standard modal classes with small size
    const dialog = document.createElement('div');
    dialog.className = `modal modal-sm confirm-dialog-${type}`;
    dialog.innerHTML = `
      <div class="modal-header">
        <h2 class="modal-title">${escapeHtml(title)}</h2>
        <button class="modal-close confirm-dialog-close" aria-label="Close">×</button>
      </div>
      <div class="modal-body">
        <p>${escapeHtml(message)}</p>
      </div>
      <div class="modal-footer">
        <button class="btn-secondary confirm-dialog-cancel">${escapeHtml(cancelText)}</button>
        <button class="btn-primary confirm-dialog-confirm ${type === 'danger' ? 'btn-danger' : ''}">${escapeHtml(confirmText)}</button>
      </div>
    `;

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    // Prevent body scroll
    document.body.style.overflow = 'hidden';

    // Animate in
    setTimeout(() => {
      overlay.classList.add('show');
    }, 10);

    // Handle confirm
    const confirmBtn = dialog.querySelector('.confirm-dialog-confirm');
    confirmBtn.onclick = () => {
      cleanup();
      resolve(true);
    };

    // Handle cancel
    const cancelBtn = dialog.querySelector('.confirm-dialog-cancel');
    cancelBtn.onclick = () => {
      cleanup();
      resolve(false);
    };

    // Handle close button (X)
    const closeBtn = dialog.querySelector('.confirm-dialog-close');
    closeBtn.onclick = () => {
      cleanup();
      resolve(false);
    };

    // Handle overlay click
    overlay.onclick = (e) => {
      if (e.target === overlay) {
        cleanup();
        resolve(false);
      }
    };

    // Handle escape key
    const escapeHandler = (e) => {
      if (e.key === 'Escape') {
        cleanup();
        resolve(false);
      }
    };
    document.addEventListener('keydown', escapeHandler);

    // Cleanup function
    function cleanup() {
      document.removeEventListener('keydown', escapeHandler);
      overlay.classList.remove('show');
      setTimeout(() => {
        if (overlay.parentNode) {
          overlay.parentNode.removeChild(overlay);
        }
        document.body.style.overflow = '';
      }, 300);
    }
  });
}
