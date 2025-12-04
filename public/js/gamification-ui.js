/**
 * Gamification UI Component
 *
 * Frontend component for displaying gamification features including:
 * - Progress bars with animations
 * - Milestone detection and celebration
 * - Achievement badges
 * - Streak tracking
 * - Network health score display
 * 
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 */

class GamificationUI {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      throw new Error(`Container element with id "${containerId}" not found`);
    }

    this.options = {
      apiBaseUrl: options.apiBaseUrl || '/api',
      onMilestoneReached: options.onMilestoneReached || null,
      onAchievementEarned: options.onAchievementEarned || null,
      animationDuration: options.animationDuration || 1000,
      ...options,
    };

    this.state = {
      progress: null,
      achievements: [],
      streakInfo: null,
      networkHealth: null,
      celebrationQueue: [],
    };

    this.init();
  }

  /**
   * Initialize the component
   */
  init() {
    this.render();
  }

  /**
   * Load all gamification data
   */
  async loadData() {
    try {
      const [progress, achievements, streakInfo, networkHealth] = await Promise.all([
        this.fetchProgress(),
        this.fetchAchievements(),
        this.fetchStreakInfo(),
        this.fetchNetworkHealth(),
      ]);

      this.state.progress = progress;
      this.state.achievements = achievements;
      this.state.streakInfo = streakInfo;
      this.state.networkHealth = networkHealth;

      this.render();
    } catch (error) {
      console.error('Error loading gamification data:', error);
      this.showError('Failed to load gamification data');
    }
  }

  /**
   * Fetch progress data
   */
  async fetchProgress() {
    const response = await fetch(`${this.options.apiBaseUrl}/gamification/progress`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch progress');
    }

    return response.json();
  }

  /**
   * Fetch achievements
   */
  async fetchAchievements() {
    const response = await fetch(`${this.options.apiBaseUrl}/gamification/achievements`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch achievements');
    }

    return response.json();
  }

  /**
   * Fetch streak info
   */
  async fetchStreakInfo() {
    const response = await fetch(`${this.options.apiBaseUrl}/gamification/streak`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch streak info');
    }

    return response.json();
  }

  /**
   * Fetch network health
   */
  async fetchNetworkHealth() {
    const response = await fetch(`${this.options.apiBaseUrl}/gamification/network-health`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch network health');
    }

    return response.json();
  }

  /**
   * Update progress (call after categorizing contacts)
   */
  async updateProgress() {
    const newProgress = await this.fetchProgress();
    const oldProgress = this.state.progress;

    this.state.progress = newProgress;

    // Check for new milestones
    if (oldProgress) {
      const newMilestones = newProgress.milestonesReached.filter(
        m => !oldProgress.milestonesReached.includes(m)
      );

      for (const milestone of newMilestones) {
        this.celebrateMilestone(milestone);
      }
    }

    this.render();
  }

  /**
   * Celebrate milestone achievement
   */
  celebrateMilestone(milestoneId) {
    const milestone = this.getMilestoneInfo(milestoneId);
    
    if (this.options.onMilestoneReached) {
      this.options.onMilestoneReached(milestone);
    }

    this.showCelebration(milestone.name, milestone.description);
  }

  /**
   * Show celebration animation
   */
  showCelebration(title, message) {
    const celebration = document.createElement('div');
    celebration.className = 'gamification-celebration';
    celebration.innerHTML = `
      <div class="celebration-content">
        <div class="celebration-icon">🎉</div>
        <h3 class="celebration-title">${title}</h3>
        <p class="celebration-message">${message}</p>
      </div>
    `;

    document.body.appendChild(celebration);

    // Animate in
    setTimeout(() => {
      celebration.classList.add('show');
    }, 10);

    // Remove after 3 seconds
    setTimeout(() => {
      celebration.classList.remove('show');
      setTimeout(() => {
        celebration.remove();
      }, 300);
    }, 3000);
  }

  /**
   * Render the component
   */
  render() {
    this.container.innerHTML = `
      <div class="gamification-container">
        ${this.renderProgressSection()}
        ${this.renderAchievementsSection()}
        ${this.renderStreakSection()}
        ${this.renderNetworkHealthSection()}
      </div>
    `;

    this.attachEventListeners();
  }

  /**
   * Render progress section
   */
  renderProgressSection() {
    if (!this.state.progress) {
      return '<div class="gamification-section loading">Loading progress...</div>';
    }

    const { percentComplete, categorizedContacts, totalContacts, currentMilestone, nextMilestone } = this.state.progress;

    return `
      <div class="gamification-section progress-section">
        <h3 class="section-title">Your Progress</h3>
        
        <div class="progress-stats">
          <div class="stat">
            <span class="stat-value">${categorizedContacts}</span>
            <span class="stat-label">of ${totalContacts} contacts</span>
          </div>
          <div class="stat">
            <span class="stat-value">${percentComplete}%</span>
            <span class="stat-label">complete</span>
          </div>
        </div>

        <div class="progress-bar-container">
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${percentComplete}%" data-percent="${percentComplete}"></div>
          </div>
        </div>

        <div class="milestone-info">
          <div class="current-milestone">
            <span class="milestone-label">Current:</span>
            <span class="milestone-name">${currentMilestone}</span>
          </div>
          <div class="next-milestone">
            <span class="milestone-label">Next:</span>
            <span class="milestone-name">${nextMilestone}</span>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render achievements section
   */
  renderAchievementsSection() {
    if (!this.state.achievements) {
      return '<div class="gamification-section loading">Loading achievements...</div>';
    }

    const achievementBadges = this.state.achievements.map(achievement => {
      const info = this.getAchievementInfo(achievement.achievementType);
      return `
        <div class="achievement-badge earned" title="${info.description}">
          <div class="badge-icon">${info.icon}</div>
          <div class="badge-name">${info.name}</div>
        </div>
      `;
    }).join('');

    // Show locked achievements too
    const allAchievementTypes = [
      'first_contact_categorized',
      'inner_circle_complete',
      'all_contacts_categorized',
      'week_streak_3',
      'week_streak_10',
      'balanced_network',
      'network_health_excellent',
    ];

    const earnedTypes = this.state.achievements.map(a => a.achievementType);
    const lockedBadges = allAchievementTypes
      .filter(type => !earnedTypes.includes(type))
      .map(type => {
        const info = this.getAchievementInfo(type);
        return `
          <div class="achievement-badge locked" title="${info.description}">
            <div class="badge-icon">🔒</div>
            <div class="badge-name">${info.name}</div>
          </div>
        `;
      }).join('');

    return `
      <div class="gamification-section achievements-section">
        <h3 class="section-title">Achievements</h3>
        <div class="achievements-grid">
          ${achievementBadges}
          ${lockedBadges}
        </div>
      </div>
    `;
  }

  /**
   * Render streak section
   */
  renderStreakSection() {
    if (!this.state.streakInfo) {
      return '<div class="gamification-section loading">Loading streak...</div>';
    }

    const { currentStreak, longestStreak } = this.state.streakInfo;
    const streakEmoji = currentStreak >= 10 ? '🔥🔥🔥' : currentStreak >= 3 ? '🔥🔥' : currentStreak > 0 ? '🔥' : '💤';

    return `
      <div class="gamification-section streak-section">
        <h3 class="section-title">Activity Streak</h3>
        
        <div class="streak-display">
          <div class="streak-icon">${streakEmoji}</div>
          <div class="streak-stats">
            <div class="streak-stat">
              <span class="streak-value">${currentStreak}</span>
              <span class="streak-label">day${currentStreak !== 1 ? 's' : ''} current</span>
            </div>
            <div class="streak-stat">
              <span class="streak-value">${longestStreak}</span>
              <span class="streak-label">day${longestStreak !== 1 ? 's' : ''} longest</span>
            </div>
          </div>
        </div>

        ${currentStreak >= 3 ? '<p class="streak-message">Keep it up! 🎉</p>' : ''}
      </div>
    `;
  }

  /**
   * Render network health section
   */
  renderNetworkHealthSection() {
    if (!this.state.networkHealth) {
      return '<div class="gamification-section loading">Loading network health...</div>';
    }

    const { overallScore, circleBalanceScore, engagementScore, maintenanceScore, details } = this.state.networkHealth;
    const healthColor = this.getHealthColor(overallScore);

    return `
      <div class="gamification-section network-health-section">
        <h3 class="section-title">Network Health</h3>
        
        <div class="health-score-display">
          <div class="health-score-circle" style="--score: ${overallScore}; --color: ${healthColor}">
            <svg viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" class="health-score-bg"></circle>
              <circle cx="50" cy="50" r="45" class="health-score-fill" 
                      style="stroke-dasharray: ${overallScore * 2.827}, 282.7"></circle>
            </svg>
            <div class="health-score-value">${overallScore}</div>
          </div>
        </div>

        <div class="health-breakdown">
          <div class="health-metric">
            <div class="metric-header">
              <span class="metric-name">Circle Balance</span>
              <span class="metric-score">${circleBalanceScore}</span>
            </div>
            <div class="metric-bar">
              <div class="metric-fill" style="width: ${circleBalanceScore}%"></div>
            </div>
            <p class="metric-description">${details.circleBalance}</p>
          </div>

          <div class="health-metric">
            <div class="metric-header">
              <span class="metric-name">Engagement</span>
              <span class="metric-score">${engagementScore}</span>
            </div>
            <div class="metric-bar">
              <div class="metric-fill" style="width: ${engagementScore}%"></div>
            </div>
            <p class="metric-description">${details.engagement}</p>
          </div>

          <div class="health-metric">
            <div class="metric-header">
              <span class="metric-name">Maintenance</span>
              <span class="metric-score">${maintenanceScore}</span>
            </div>
            <div class="metric-bar">
              <div class="metric-fill" style="width: ${maintenanceScore}%"></div>
            </div>
            <p class="metric-description">${details.maintenance}</p>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Get health color based on score
   */
  getHealthColor(score) {
    if (score >= 90) return '#4CAF50';
    if (score >= 75) return '#8BC34A';
    if (score >= 60) return '#FFC107';
    return '#FF5722';
  }

  /**
   * Get milestone information
   */
  getMilestoneInfo(milestoneId) {
    const milestones = {
      first_contact: { name: 'First Contact', description: 'Categorized your first contact' },
      quarter_complete: { name: '25% Complete', description: 'Categorized 25% of your contacts' },
      half_complete: { name: 'Halfway There', description: 'Categorized 50% of your contacts' },
      three_quarters: { name: '75% Complete', description: 'Categorized 75% of your contacts' },
      all_categorized: { name: 'All Categorized', description: 'Categorized all your contacts' },
      inner_circle_complete: { name: 'Inner Circle Complete', description: 'Filled your Inner Circle' },
    };

    return milestones[milestoneId] || { name: 'Milestone', description: 'Achievement unlocked' };
  }

  /**
   * Get achievement information
   */
  getAchievementInfo(achievementType) {
    const achievements = {
      first_contact_categorized: { name: 'First Steps', icon: '🎯', description: 'Categorized your first contact' },
      inner_circle_complete: { name: 'Inner Circle', icon: '💎', description: 'Filled your Inner Circle' },
      all_contacts_categorized: { name: 'Completionist', icon: '🏆', description: 'Categorized all contacts' },
      week_streak_3: { name: '3-Day Streak', icon: '🔥', description: 'Maintained a 3-day streak' },
      week_streak_10: { name: '10-Day Streak', icon: '🔥🔥', description: 'Maintained a 10-day streak' },
      balanced_network: { name: 'Balanced', icon: '⚖️', description: 'Achieved balanced circles' },
      network_health_excellent: { name: 'Excellent Health', icon: '💚', description: 'Network health score above 90' },
    };

    return achievements[achievementType] || { name: 'Achievement', icon: '🏅', description: 'Achievement earned' };
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Add any interactive elements here
  }

  /**
   * Get auth headers
   */
  getAuthHeaders() {
    const token = localStorage.getItem('authToken');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  /**
   * Show error message
   */
  showError(message) {
    this.container.innerHTML = `
      <div class="gamification-error">
        <p>${message}</p>
      </div>
    `;
  }

  /**
   * Destroy the component
   */
  destroy() {
    this.container.innerHTML = '';
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GamificationUI;
}
