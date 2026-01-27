/**
 * Gamification Integration Example
 *
 * Example showing how to integrate gamification features
 * with the onboarding controller and circular visualizer.
 */

// Example 1: Initialize gamification UI in onboarding flow
function initializeOnboardingWithGamification() {
  // Create onboarding controller
  const onboardingController = new OnboardingController('onboarding-container', {
    apiBaseUrl: '/api',
  });

  // Create gamification UI
  const gamificationUI = new GamificationUI('gamification-sidebar', {
    apiBaseUrl: '/api',
    onMilestoneReached: (milestone) => {
      console.log('🎉 Milestone reached:', milestone.name);
      // Show celebration in onboarding UI
      onboardingController.showCelebration(milestone);
    },
    onAchievementEarned: (achievement) => {
      console.log('🏆 Achievement earned:', achievement.name);
    },
  });

  // Load initial data
  gamificationUI.loadData();

  return { onboardingController, gamificationUI };
}

// Example 2: Update gamification after categorizing a contact
async function categorizeContactWithGamification(contactId, circle) {
  try {
    // Assign contact to circle
    const response = await fetch('/api/circles/assign', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
      },
      body: JSON.stringify({
        contactId,
        circle,
        assignedBy: 'user',
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to assign contact');
    }

    // Update streak
    await fetch('/api/gamification/streak/update', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
      },
    });

    // Detect new milestones
    const milestonesResponse = await fetch('/api/gamification/milestones/detect', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
      },
    });

    const { newAchievements } = await milestonesResponse.json();

    // Update gamification UI
    if (window.gamificationUI) {
      await window.gamificationUI.updateProgress();
    }

    // Show celebrations for new achievements
    for (const achievement of newAchievements) {
      console.log('New achievement:', achievement);
    }

    return { success: true, newAchievements };
  } catch (error) {
    console.error('Error categorizing contact:', error);
    return { success: false, error };
  }
}

// Example 3: Display gamification in a sidebar
function createGamificationSidebar() {
  const sidebar = document.createElement('div');
  sidebar.id = 'gamification-sidebar';
  sidebar.style.cssText = `
    position: fixed;
    right: 0;
    top: 0;
    bottom: 0;
    width: 350px;
    background: white;
    box-shadow: -2px 0 8px rgba(0, 0, 0, 0.1);
    overflow-y: auto;
    z-index: 1000;
  `;

  document.body.appendChild(sidebar);

  // Initialize gamification UI in sidebar
  const gamificationUI = new GamificationUI('gamification-sidebar', {
    apiBaseUrl: '/api',
  });

  gamificationUI.loadData();

  return gamificationUI;
}

// Example 4: Show progress in onboarding header
async function showProgressInHeader() {
  try {
    const response = await fetch('/api/gamification/progress', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
      },
    });

    const progress = await response.json();

    // Update header with progress
    const header = document.querySelector('.onboarding-header');
    if (header) {
      const progressBar = document.createElement('div');
      progressBar.className = 'header-progress';
      progressBar.innerHTML = `
        <div class="progress-text">
          ${progress.categorizedContacts} of ${progress.totalContacts} contacts categorized
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${progress.percentComplete}%"></div>
        </div>
      `;
      header.appendChild(progressBar);
    }
  } catch (error) {
    console.error('Error fetching progress:', error);
  }
}

// Example 5: Batch categorization with gamification
async function batchCategorizeWithGamification(assignments) {
  try {
    // Perform batch assignment
    const response = await fetch('/api/circles/batch-assign', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
      },
      body: JSON.stringify({ assignments }),
    });

    if (!response.ok) {
      throw new Error('Failed to batch assign contacts');
    }

    // Update gamification
    await fetch('/api/gamification/streak/update', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
      },
    });

    const milestonesResponse = await fetch('/api/gamification/milestones/detect', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
      },
    });

    const { newAchievements } = await milestonesResponse.json();

    // Update UI
    if (window.gamificationUI) {
      await window.gamificationUI.updateProgress();
    }

    // Show celebration if milestones reached
    if (newAchievements.length > 0) {
      for (const achievement of newAchievements) {
        window.gamificationUI.showCelebration(
          achievement.achievementType,
          'Achievement unlocked!'
        );
      }
    }

    return { success: true, newAchievements };
  } catch (error) {
    console.error('Error in batch categorization:', error);
    return { success: false, error };
  }
}

// Example 6: Network health dashboard
async function showNetworkHealthDashboard() {
  try {
    const response = await fetch('/api/gamification/network-health', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
      },
    });

    const health = await response.json();

    // Create dashboard
    const dashboard = document.createElement('div');
    dashboard.className = 'network-health-dashboard';
    dashboard.innerHTML = `
      <h2>Network Health</h2>
      <div class="health-score">${health.overallScore}/100</div>
      <div class="health-details">
        <div class="metric">
          <span>Circle Balance:</span>
          <span>${health.circleBalanceScore}</span>
        </div>
        <div class="metric">
          <span>Engagement:</span>
          <span>${health.engagementScore}</span>
        </div>
        <div class="metric">
          <span>Maintenance:</span>
          <span>${health.maintenanceScore}</span>
        </div>
      </div>
    `;

    return dashboard;
  } catch (error) {
    console.error('Error fetching network health:', error);
    return null;
  }
}

// Example 7: Achievement notification
function showAchievementNotification(achievement) {
  const notification = document.createElement('div');
  notification.className = 'achievement-notification';
  notification.innerHTML = `
    <div class="notification-icon">🏆</div>
    <div class="notification-content">
      <h4>Achievement Unlocked!</h4>
      <p>${achievement.achievementType}</p>
    </div>
  `;

  document.body.appendChild(notification);

  // Animate in
  setTimeout(() => {
    notification.classList.add('show');
  }, 10);

  // Remove after 5 seconds
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => {
      notification.remove();
    }, 300);
  }, 5000);
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    initializeOnboardingWithGamification,
    categorizeContactWithGamification,
    createGamificationSidebar,
    showProgressInHeader,
    batchCategorizeWithGamification,
    showNetworkHealthDashboard,
    showAchievementNotification,
  };
}
