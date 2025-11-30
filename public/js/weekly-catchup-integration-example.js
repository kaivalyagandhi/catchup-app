/**
 * Weekly Catchup Integration Example
 *
 * Example showing how to integrate the Weekly Catchup UI into your application.
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 */

// Example 1: Basic Integration
// Add this to your main app.js or wherever you initialize components

function initializeWeeklyCatchup() {
  // Create container in your HTML
  const container = document.createElement('div');
  container.id = 'weekly-catchup-container';
  document.body.appendChild(container);

  // Initialize the UI
  const weeklyCatchupUI = new WeeklyCatchupUI('weekly-catchup-container');
  
  return weeklyCatchupUI;
}

// Example 2: Integration with Navigation
// Show weekly catchup when user clicks a menu item

function setupWeeklyCatchupNavigation() {
  const weeklyCatchupButton = document.getElementById('weekly-catchup-nav');
  
  if (weeklyCatchupButton) {
    weeklyCatchupButton.addEventListener('click', () => {
      // Hide other views
      document.querySelectorAll('.view').forEach(view => {
        view.style.display = 'none';
      });
      
      // Show weekly catchup view
      const weeklyCatchupView = document.getElementById('weekly-catchup-view');
      if (weeklyCatchupView) {
        weeklyCatchupView.style.display = 'block';
      }
      
      // Initialize if not already initialized
      if (!window.weeklyCatchupUI) {
        window.weeklyCatchupUI = new WeeklyCatchupUI('weekly-catchup-container');
      } else {
        // Reload current session
        window.weeklyCatchupUI.loadCurrentSession();
      }
    });
  }
}

// Example 3: Check for Active Session on Page Load
// Show a notification if there's an active weekly catchup session

async function checkForActiveSession() {
  try {
    const response = await fetch('/api/weekly-catchup/current', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
      },
    });

    const data = await response.json();

    if (data.success && data.session) {
      // Show notification
      showWeeklyCatchupNotification(data.session);
    }
  } catch (error) {
    console.error('Error checking for active session:', error);
  }
}

function showWeeklyCatchupNotification(session) {
  const notification = document.createElement('div');
  notification.className = 'weekly-catchup-notification';
  notification.innerHTML = `
    <div class="notification-content">
      <span>📅 You have ${session.progress.totalContacts - session.progress.reviewedContacts} contacts to review this week</span>
      <button onclick="navigateToWeeklyCatchup()">Continue</button>
      <button onclick="this.closest('.weekly-catchup-notification').remove()">Dismiss</button>
    </div>
  `;
  document.body.appendChild(notification);
}

function navigateToWeeklyCatchup() {
  // Navigate to weekly catchup view
  window.location.hash = '#weekly-catchup';
  
  // Remove notification
  const notification = document.querySelector('.weekly-catchup-notification');
  if (notification) {
    notification.remove();
  }
}

// Example 4: Integration with Onboarding Flow
// Automatically start weekly catchup after onboarding completion

async function onOnboardingComplete() {
  // Show success message
  console.log('Onboarding complete!');
  
  // Wait a moment
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Check if there are contacts to review
  const response = await fetch('/api/contacts?uncategorized=true', {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
    },
  });
  
  const data = await response.json();
  
  if (data.contacts && data.contacts.length > 0) {
    // Suggest starting weekly catchup
    if (confirm('Would you like to start your first Weekly Catchup session to review your contacts?')) {
      navigateToWeeklyCatchup();
    }
  }
}

// Example 5: Scheduled Reminder
// Show reminder on Monday mornings to start weekly catchup

function checkForWeeklyReminder() {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
  
  // Check if it's Monday
  if (dayOfWeek === 1) {
    // Check if user has already seen reminder this week
    const lastReminderDate = localStorage.getItem('lastWeeklyCatchupReminder');
    const today = now.toDateString();
    
    if (lastReminderDate !== today) {
      // Show reminder
      showWeeklyCatchupReminder();
      localStorage.setItem('lastWeeklyCatchupReminder', today);
    }
  }
}

function showWeeklyCatchupReminder() {
  const reminder = document.createElement('div');
  reminder.className = 'weekly-reminder-modal';
  reminder.innerHTML = `
    <div class="modal-overlay">
      <div class="modal-content">
        <h3>📅 Weekly Catchup Time!</h3>
        <p>It's a new week! Take a few minutes to review your contacts and keep your network organized.</p>
        <button class="btn btn-primary" onclick="navigateToWeeklyCatchup(); this.closest('.weekly-reminder-modal').remove()">
          Start Now
        </button>
        <button class="btn btn-secondary" onclick="this.closest('.weekly-reminder-modal').remove()">
          Maybe Later
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(reminder);
}

// Example 6: Progress Tracking
// Track and display weekly catchup completion stats

async function getWeeklyCatchupStats() {
  try {
    const response = await fetch('/api/weekly-catchup/stats', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
      },
    });

    const data = await response.json();

    if (data.success) {
      displayWeeklyCatchupStats(data.stats);
    }
  } catch (error) {
    console.error('Error getting weekly catchup stats:', error);
  }
}

function displayWeeklyCatchupStats(stats) {
  const statsContainer = document.getElementById('weekly-catchup-stats');
  
  if (statsContainer) {
    statsContainer.innerHTML = `
      <div class="stats-card">
        <h4>Weekly Catchup Stats</h4>
        <div class="stat-item">
          <span class="stat-label">Weeks Completed:</span>
          <span class="stat-value">${stats.weeksCompleted}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Contacts Reviewed:</span>
          <span class="stat-value">${stats.contactsReviewed}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Current Streak:</span>
          <span class="stat-value">${stats.currentStreak} weeks</span>
        </div>
      </div>
    `;
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  // Check for active session
  checkForActiveSession();
  
  // Check for weekly reminder
  checkForWeeklyReminder();
  
  // Setup navigation
  setupWeeklyCatchupNavigation();
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    initializeWeeklyCatchup,
    setupWeeklyCatchupNavigation,
    checkForActiveSession,
    navigateToWeeklyCatchup,
    onOnboardingComplete,
  };
}
