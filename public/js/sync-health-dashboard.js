/**
 * Sync Health Dashboard
 * 
 * Admin dashboard for monitoring Google Contacts and Calendar sync health.
 * Displays metrics, success rates, API calls saved, and persistent failures.
 * 
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8
 */

class SyncHealthDashboard {
  constructor() {
    this.currentFilter = '';
    this.autoRefreshInterval = null;
    this.countdownInterval = null;
    this.refreshIntervalMs = 24 * 60 * 60 * 1000; // 24 hours (daily) - updated 2026-02-04
    this.countdownSeconds = 24 * 60 * 60; // 24 hours in seconds
    
    this.init();
  }

  init() {
    // Set up event listeners
    document.getElementById('integration-filter').addEventListener('change', (e) => {
      this.currentFilter = e.target.value;
      this.loadMetrics();
    });

    document.getElementById('refresh-btn').addEventListener('click', () => {
      this.loadMetrics();
    });

    document.getElementById('export-btn').addEventListener('click', () => {
      this.exportToCSV();
    });

    // Initial load
    this.loadMetrics();

    // Start auto-refresh
    this.startAutoRefresh();
  }

  /**
   * Load sync health metrics from API
   * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.8
   */
  async loadMetrics() {
    const loadingEl = document.getElementById('loading');
    const metricsEl = document.getElementById('metrics-container');
    const errorEl = document.getElementById('error-container');

    // Show loading state
    loadingEl.style.display = 'block';
    metricsEl.style.display = 'none';
    errorEl.innerHTML = '';

    try {
      // Build API URL with filter
      let url = '/api/admin/sync-health';
      if (this.currentFilter) {
        url += `?integration_type=${this.currentFilter}`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
      });

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Access denied. Admin privileges required.');
        }
        throw new Error(`Failed to load metrics: ${response.statusText}`);
      }

      const metrics = await response.json();

      // Update UI with metrics
      this.updateMetrics(metrics);

      // Update last refresh time
      this.updateLastRefreshTime();

      // Reset countdown
      this.resetCountdown();

      // Hide loading, show metrics
      loadingEl.style.display = 'none';
      metricsEl.style.display = 'block';

    } catch (error) {
      console.error('Error loading metrics:', error);
      
      // Show error
      errorEl.innerHTML = `
        <div class="error">
          <strong>Error:</strong> ${error.message}
        </div>
      `;
      
      loadingEl.style.display = 'none';
    }
  }

  /**
   * Update dashboard with metrics data
   * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5
   */
  updateMetrics(metrics) {
    // Total users
    document.getElementById('total-users').textContent = metrics.totalUsers.toLocaleString();

    // Active integrations
    document.getElementById('active-contacts').textContent = 
      metrics.activeIntegrations.contacts.toLocaleString();
    document.getElementById('active-calendar').textContent = 
      metrics.activeIntegrations.calendar.toLocaleString();

    // Invalid tokens
    document.getElementById('invalid-contacts').textContent = 
      metrics.invalidTokens.contacts.toLocaleString();
    document.getElementById('invalid-calendar').textContent = 
      metrics.invalidTokens.calendar.toLocaleString();

    // Open circuit breakers
    document.getElementById('circuit-contacts').textContent = 
      metrics.openCircuitBreakers.contacts.toLocaleString();
    document.getElementById('circuit-calendar').textContent = 
      metrics.openCircuitBreakers.calendar.toLocaleString();

    // Sync success rate
    this.updateSuccessRate('contacts', metrics.syncSuccessRate24h.contacts);
    this.updateSuccessRate('calendar', metrics.syncSuccessRate24h.calendar);

    // API calls saved
    this.updateAPICallsSaved(metrics.apiCallsSaved);

    // Persistent failures
    this.updatePersistentFailures(metrics.persistentFailures);
  }

  /**
   * Update success rate bar chart
   */
  updateSuccessRate(type, percentage) {
    const barEl = document.getElementById(`success-${type}-bar`);
    const valueEl = document.getElementById(`success-${type}-value`);

    // Update width and value
    barEl.style.width = `${percentage}%`;
    valueEl.textContent = `${percentage.toFixed(1)}%`;

    // Update color based on percentage
    if (percentage >= 95) {
      barEl.style.background = '#4caf50'; // Green
    } else if (percentage >= 80) {
      barEl.style.background = '#ff9800'; // Orange
    } else {
      barEl.style.background = '#f44336'; // Red
    }
  }

  /**
   * Update API calls saved section
   * Requirements: 10.5
   */
  updateAPICallsSaved(apiCallsSaved) {
    const section = document.getElementById('api-calls-section');

    // Calculate total API calls (saved + made)
    // Assuming we track this in metrics, otherwise just show saved
    const totalSaved = apiCallsSaved.total;
    const percentageSaved = totalSaved > 0 ? 100 : 0; // Simplified for now

    section.innerHTML = `
      <h2>API Calls Saved (24h)</h2>
      <div style="font-size: 14px; color: var(--text-secondary, #666); margin-bottom: 16px;">
        Optimization impact on Google API usage
      </div>
      
      <div class="metrics-grid" style="margin-bottom: 16px;">
        <div class="metric-card">
          <h3>Total Saved</h3>
          <div class="metric-value">${totalSaved.toLocaleString()}</div>
          <div style="font-size: 13px; color: var(--text-secondary, #666); margin-top: 4px;">
            API calls prevented
          </div>
        </div>
        
        <div class="metric-card">
          <h3>Circuit Breaker</h3>
          <div class="metric-value">${apiCallsSaved.byCircuitBreaker.toLocaleString()}</div>
          <div style="font-size: 13px; color: var(--text-secondary, #666); margin-top: 4px;">
            Calls blocked by open circuits
          </div>
        </div>
        
        <div class="metric-card">
          <h3>Adaptive Scheduling</h3>
          <div class="metric-value">${apiCallsSaved.byAdaptiveScheduling.toLocaleString()}</div>
          <div style="font-size: 13px; color: var(--text-secondary, #666); margin-top: 4px;">
            Calls saved by reduced frequency
          </div>
        </div>
        
        <div class="metric-card">
          <h3>Webhooks</h3>
          <div class="metric-value">${apiCallsSaved.byWebhooks.toLocaleString()}</div>
          <div style="font-size: 13px; color: var(--text-secondary, #666); margin-top: 4px;">
            Calls replaced by push notifications
          </div>
        </div>
      </div>

      <div class="chart-container">
        <div class="bar-chart">
          <div class="bar-item">
            <div class="bar-label">Circuit Breaker</div>
            <div class="bar-track">
              <div class="bar-fill" style="width: ${this.calculatePercentage(apiCallsSaved.byCircuitBreaker, totalSaved)}%; background: #2196f3;">
                <span class="bar-value">${apiCallsSaved.byCircuitBreaker.toLocaleString()}</span>
              </div>
            </div>
          </div>
          <div class="bar-item">
            <div class="bar-label">Adaptive Scheduling</div>
            <div class="bar-track">
              <div class="bar-fill" style="width: ${this.calculatePercentage(apiCallsSaved.byAdaptiveScheduling, totalSaved)}%; background: #4caf50;">
                <span class="bar-value">${apiCallsSaved.byAdaptiveScheduling.toLocaleString()}</span>
              </div>
            </div>
          </div>
          <div class="bar-item">
            <div class="bar-label">Webhooks</div>
            <div class="bar-track">
              <div class="bar-fill" style="width: ${this.calculatePercentage(apiCallsSaved.byWebhooks, totalSaved)}%; background: #9c27b0;">
                <span class="bar-value">${apiCallsSaved.byWebhooks.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Calculate percentage for bar chart
   */
  calculatePercentage(value, total) {
    if (total === 0) return 0;
    return Math.round((value / total) * 100);
  }

  /**
   * Update persistent failures table
   * Requirements: 10.8
   */
  updatePersistentFailures(failures) {
    const section = document.getElementById('persistent-failures-section');

    section.innerHTML = `
      <h2>Persistent Failures (>7 days)</h2>
      <div style="font-size: 14px; color: var(--text-secondary, #666); margin-bottom: 16px;">
        Users with sync issues requiring attention
      </div>
    `;

    if (failures.length === 0) {
      section.innerHTML += `
        <div class="empty-state">
          <div class="empty-state-icon">✅</div>
          <div>No persistent failures found</div>
          <div style="font-size: 13px; margin-top: 8px;">All users are syncing successfully</div>
        </div>
      `;
      return;
    }

    const tableHTML = `
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>User Email</th>
              <th>Integration</th>
              <th>Last Success</th>
              <th>Failures</th>
              <th>Last Error</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${failures.map(failure => `
              <tr>
                <td>${this.escapeHtml(failure.email)}</td>
                <td>
                  <span class="badge badge-${failure.integrationType === 'google_contacts' ? 'contacts' : 'calendar'}">
                    ${failure.integrationType === 'google_contacts' ? 'Contacts' : 'Calendar'}
                  </span>
                </td>
                <td>${failure.lastSuccessfulSync ? this.formatDate(failure.lastSuccessfulSync) : 'Never'}</td>
                <td>${failure.failureCount}</td>
                <td style="max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" 
                    title="${this.escapeHtml(failure.lastError)}">
                  ${this.escapeHtml(failure.lastError)}
                </td>
                <td>
                  <a href="#" class="link-button" onclick="dashboard.viewUserDetails('${failure.userId}'); return false;">
                    View Details
                  </a>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    section.innerHTML += tableHTML;
  }

  /**
   * View detailed user sync status
   */
  async viewUserDetails(userId) {
    try {
      const response = await fetch(`/api/admin/sync-health/user/${userId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load user details');
      }

      const status = await response.json();

      // Display in alert for now (could be a modal in production)
      const details = `
User Sync Status:

CONTACTS:
- Token: ${status.contacts.tokenHealth?.status || 'Unknown'}
- Circuit Breaker: ${status.contacts.circuitBreakerState?.state || 'Unknown'}
- Last Sync: ${status.contacts.lastSync ? new Date(status.contacts.lastSync).toLocaleString() : 'Never'}
- Last Result: ${status.contacts.lastSyncResult || 'Unknown'}

CALENDAR:
- Token: ${status.calendar.tokenHealth?.status || 'Unknown'}
- Circuit Breaker: ${status.calendar.circuitBreakerState?.state || 'Unknown'}
- Last Sync: ${status.calendar.lastSync ? new Date(status.calendar.lastSync).toLocaleString() : 'Never'}
- Last Result: ${status.calendar.lastSyncResult || 'Unknown'}
- Webhook Active: ${status.calendar.webhookActive ? 'Yes' : 'No'}
      `.trim();

      alert(details);

    } catch (error) {
      console.error('Error loading user details:', error);
      alert('Failed to load user details: ' + error.message);
    }
  }

  /**
   * Export metrics to CSV
   * Requirements: 10.6
   */
  async exportToCSV() {
    try {
      // Build API URL with filter
      let url = '/api/admin/sync-health';
      if (this.currentFilter) {
        url += `?integration_type=${this.currentFilter}`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load metrics for export');
      }

      const metrics = await response.json();

      // Generate CSV content
      const csv = this.generateCSV(metrics);

      // Create download link
      const blob = new Blob([csv], { type: 'text/csv' });
      const url_blob = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url_blob;
      
      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      link.download = `sync-health-metrics-${timestamp}.csv`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url_blob);

    } catch (error) {
      console.error('Error exporting CSV:', error);
      alert('Failed to export CSV: ' + error.message);
    }
  }

  /**
   * Generate CSV content from metrics
   */
  generateCSV(metrics) {
    const lines = [];

    // Header
    lines.push('Sync Health Metrics Report');
    lines.push(`Generated: ${new Date().toISOString()}`);
    lines.push(`Filter: ${this.currentFilter || 'All Integrations'}`);
    lines.push('');

    // Overview metrics
    lines.push('OVERVIEW');
    lines.push('Metric,Value');
    lines.push(`Total Users,${metrics.totalUsers}`);
    lines.push(`Active Contacts Integrations,${metrics.activeIntegrations.contacts}`);
    lines.push(`Active Calendar Integrations,${metrics.activeIntegrations.calendar}`);
    lines.push(`Invalid Contacts Tokens,${metrics.invalidTokens.contacts}`);
    lines.push(`Invalid Calendar Tokens,${metrics.invalidTokens.calendar}`);
    lines.push(`Open Contacts Circuit Breakers,${metrics.openCircuitBreakers.contacts}`);
    lines.push(`Open Calendar Circuit Breakers,${metrics.openCircuitBreakers.calendar}`);
    lines.push('');

    // Success rates
    lines.push('SYNC SUCCESS RATE (24H)');
    lines.push('Integration,Success Rate (%)');
    lines.push(`Google Contacts,${metrics.syncSuccessRate24h.contacts.toFixed(2)}`);
    lines.push(`Google Calendar,${metrics.syncSuccessRate24h.calendar.toFixed(2)}`);
    lines.push('');

    // API calls saved
    lines.push('API CALLS SAVED (24H)');
    lines.push('Optimization Type,Calls Saved');
    lines.push(`Circuit Breaker,${metrics.apiCallsSaved.byCircuitBreaker}`);
    lines.push(`Adaptive Scheduling,${metrics.apiCallsSaved.byAdaptiveScheduling}`);
    lines.push(`Webhooks,${metrics.apiCallsSaved.byWebhooks}`);
    lines.push(`Total,${metrics.apiCallsSaved.total}`);
    lines.push('');

    // Persistent failures
    lines.push('PERSISTENT FAILURES (>7 DAYS)');
    lines.push('User Email,Integration,Last Success,Failure Count,Last Error');
    metrics.persistentFailures.forEach(failure => {
      const lastSuccess = failure.lastSuccessfulSync 
        ? new Date(failure.lastSuccessfulSync).toISOString()
        : 'Never';
      const error = failure.lastError.replace(/,/g, ';'); // Escape commas
      lines.push(`${failure.email},${failure.integrationType},${lastSuccess},${failure.failureCount},"${error}"`);
    });

    return lines.join('\n');
  }

  /**
   * Start auto-refresh timer
   * Requirements: 10.7
   */
  startAutoRefresh() {
    // Clear existing intervals
    if (this.autoRefreshInterval) {
      clearInterval(this.autoRefreshInterval);
    }
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }

    // Set up auto-refresh
    this.autoRefreshInterval = setInterval(() => {
      this.loadMetrics();
    }, this.refreshIntervalMs);

    // Set up countdown
    this.resetCountdown();
  }

  /**
   * Reset countdown timer
   */
  resetCountdown() {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }

    this.countdownSeconds = 24 * 60 * 60; // 24 hours
    this.updateCountdownDisplay();

    this.countdownInterval = setInterval(() => {
      this.countdownSeconds--;
      this.updateCountdownDisplay();

      if (this.countdownSeconds <= 0) {
        this.countdownSeconds = 300;
      }
    }, 1000);
  }

  /**
   * Update countdown display
   */
  updateCountdownDisplay() {
    const minutes = Math.floor(this.countdownSeconds / 60);
    const seconds = this.countdownSeconds % 60;
    const display = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    document.getElementById('countdown').textContent = display;
  }

  /**
   * Update last refresh time
   */
  updateLastRefreshTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString();
    document.getElementById('last-refresh').textContent = timeString;
  }

  /**
   * Format date for display
   */
  formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  }

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize dashboard
const dashboard = new SyncHealthDashboard();
