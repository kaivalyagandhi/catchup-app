/**
 * Scheduling Notifications Panel Component
 * 
 * Displays a dropdown panel with recent scheduling notifications.
 * Supports read/unread status and mark-as-read functionality.
 * 
 * Requirements: 13.5, 13.6, 13.7
 */

class SchedulingNotifications {
  constructor(options = {}) {
    this.containerId = options.containerId || 'notification-panel-container';
    this.userId = options.userId || window.userId || localStorage.getItem('userId');
    this.onNotificationClick = options.onNotificationClick || null;
    this.onCountChange = options.onCountChange || null;
    
    this.notifications = [];
    this.unreadCount = 0;
    this.isOpen = false;
    this.isLoading = false;
    
    // Bind methods
    this.handleToggle = this.handleToggle.bind(this);
    this.handleOutsideClick = this.handleOutsideClick.bind(this);
    this.handleMarkAsRead = this.handleMarkAsRead.bind(this);
    this.handleMarkAllAsRead = this.handleMarkAllAsRead.bind(this);
  }
  
  /**
   * Initialize the notification panel
   */
  async init() {
    await this.loadNotifications();
    this.render();
    this.attachEventListeners();
  }
  
  /**
   * Load notifications from API
   */
  async loadNotifications() {
    this.isLoading = true;
    
    try {
      const userId = this.userId || window.userId || localStorage.getItem('userId');
      const response = await fetch(`/api/scheduling/notifications?userId=${userId}&limit=20`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      this.notifications = await response.json();
      this.unreadCount = this.notifications.filter(n => !n.readAt).length;
      
      // Notify parent of count change
      if (this.onCountChange) {
        this.onCountChange(this.unreadCount);
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
      this.notifications = [];
      this.unreadCount = 0;
    } finally {
      this.isLoading = false;
    }
  }
  
  /**
   * Render the notification bell button and dropdown panel
   */
  render() {
    const container = document.getElementById(this.containerId);
    if (!container) {
      console.error('Notification panel container not found');
      return;
    }
    
    container.innerHTML = `
      <div class="notification-panel-wrapper">
        <button class="notification-bell-btn" id="notification-bell-btn" title="Notifications">
          <span class="material-icons">notifications</span>
          ${this.unreadCount > 0 ? `
            <span class="notification-badge">${this.unreadCount > 99 ? '99+' : this.unreadCount}</span>
          ` : ''}
        </button>
        
        <div class="notification-dropdown ${this.isOpen ? 'open' : ''}" id="notification-dropdown">
          <div class="notification-dropdown-header">
            <h4>Notifications</h4>
            ${this.unreadCount > 0 ? `
              <button class="mark-all-read-btn" id="mark-all-read-btn">
                Mark all as read
              </button>
            ` : ''}
          </div>
          
          <div class="notification-dropdown-body" id="notification-list">
            ${this.renderNotificationList()}
          </div>
        </div>
      </div>
    `;
  }
  
  /**
   * Render the list of notifications
   */
  renderNotificationList() {
    if (this.isLoading) {
      return `
        <div class="notification-loading">
          <span class="loading-spinner"></span>
          <p>Loading notifications...</p>
        </div>
      `;
    }
    
    if (this.notifications.length === 0) {
      return `
        <div class="notification-empty">
          <span class="material-icons">notifications_none</span>
          <p>No notifications yet</p>
        </div>
      `;
    }
    
    return this.notifications.map(notification => this.renderNotificationItem(notification)).join('');
  }
  
  /**
   * Render a single notification item
   */
  renderNotificationItem(notification) {
    const isUnread = !notification.readAt;
    const timeAgo = this.formatTimeAgo(notification.createdAt);
    const icon = this.getNotificationIcon(notification.type);
    
    return `
      <div class="notification-item ${isUnread ? 'unread' : ''}" 
           data-notification-id="${notification.id}"
           data-plan-id="${notification.planId}">
        <div class="notification-icon ${notification.type}">
          <span class="material-icons">${icon}</span>
        </div>
        <div class="notification-content">
          <p class="notification-message">${this.escapeHtml(notification.message)}</p>
          <span class="notification-time">${timeAgo}</span>
        </div>
        ${isUnread ? `
          <button class="notification-mark-read-btn" data-notification-id="${notification.id}" title="Mark as read">
            <span class="material-icons">check</span>
          </button>
        ` : ''}
      </div>
    `;
  }
  
  /**
   * Get icon for notification type
   */
  getNotificationIcon(type) {
    const icons = {
      'availability_submitted': 'event_available',
      'plan_ready': 'check_circle',
      'plan_finalized': 'event',
      'plan_cancelled': 'event_busy',
      'reminder_sent': 'notifications_active'
    };
    return icons[type] || 'notifications';
  }
  
  /**
   * Attach event listeners
   */
  attachEventListeners() {
    const container = document.getElementById(this.containerId);
    if (!container) return;
    
    // Bell button toggle
    const bellBtn = container.querySelector('#notification-bell-btn');
    if (bellBtn) {
      bellBtn.addEventListener('click', this.handleToggle);
    }
    
    // Mark all as read button
    const markAllBtn = container.querySelector('#mark-all-read-btn');
    if (markAllBtn) {
      markAllBtn.addEventListener('click', this.handleMarkAllAsRead);
    }
    
    // Individual mark as read buttons
    container.querySelectorAll('.notification-mark-read-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const notificationId = btn.dataset.notificationId;
        this.handleMarkAsRead(notificationId);
      });
    });
    
    // Notification item click (navigate to plan)
    container.querySelectorAll('.notification-item').forEach(item => {
      item.addEventListener('click', (e) => {
        // Don't trigger if clicking the mark-read button
        if (e.target.closest('.notification-mark-read-btn')) return;
        
        const notificationId = item.dataset.notificationId;
        const planId = item.dataset.planId;
        
        // Mark as read when clicked
        const notification = this.notifications.find(n => n.id === notificationId);
        if (notification && !notification.readAt) {
          this.handleMarkAsRead(notificationId);
        }
        
        // Trigger callback if provided
        if (this.onNotificationClick && planId) {
          this.onNotificationClick(planId);
        }
        
        // Close dropdown
        this.close();
      });
    });
    
    // Close on outside click
    document.addEventListener('click', this.handleOutsideClick);
  }
  
  /**
   * Handle toggle dropdown
   */
  handleToggle(e) {
    e.stopPropagation();
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }
  
  /**
   * Handle outside click to close dropdown
   */
  handleOutsideClick(e) {
    const container = document.getElementById(this.containerId);
    if (container && !container.contains(e.target) && this.isOpen) {
      this.close();
    }
  }
  
  /**
   * Open the dropdown
   */
  open() {
    this.isOpen = true;
    const dropdown = document.getElementById('notification-dropdown');
    if (dropdown) {
      dropdown.classList.add('open');
    }
    
    // Refresh notifications when opening
    this.loadNotifications().then(() => {
      this.updateNotificationList();
    });
  }
  
  /**
   * Close the dropdown
   */
  close() {
    this.isOpen = false;
    const dropdown = document.getElementById('notification-dropdown');
    if (dropdown) {
      dropdown.classList.remove('open');
    }
  }
  
  /**
   * Handle marking a single notification as read
   */
  async handleMarkAsRead(notificationId) {
    try {
      const response = await fetch(`/api/scheduling/notifications/${notificationId}/read`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      // Update local state
      const notification = this.notifications.find(n => n.id === notificationId);
      if (notification) {
        notification.readAt = new Date();
        this.unreadCount = Math.max(0, this.unreadCount - 1);
      }
      
      // Update UI
      this.updateNotificationItem(notificationId);
      this.updateBadge();
      
      // Notify parent of count change
      if (this.onCountChange) {
        this.onCountChange(this.unreadCount);
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }
  
  /**
   * Handle marking all notifications as read
   */
  async handleMarkAllAsRead(e) {
    e.stopPropagation();
    
    try {
      const userId = this.userId || window.userId || localStorage.getItem('userId');
      const response = await fetch('/api/scheduling/notifications/read-all', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      // Update local state
      this.notifications.forEach(n => {
        if (!n.readAt) {
          n.readAt = new Date();
        }
      });
      this.unreadCount = 0;
      
      // Update UI
      this.updateNotificationList();
      this.updateBadge();
      
      // Notify parent of count change
      if (this.onCountChange) {
        this.onCountChange(this.unreadCount);
      }
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  }
  
  /**
   * Update a single notification item in the DOM
   */
  updateNotificationItem(notificationId) {
    const item = document.querySelector(`.notification-item[data-notification-id="${notificationId}"]`);
    if (item) {
      item.classList.remove('unread');
      const markReadBtn = item.querySelector('.notification-mark-read-btn');
      if (markReadBtn) {
        markReadBtn.remove();
      }
    }
  }
  
  /**
   * Update the notification list in the DOM
   */
  updateNotificationList() {
    const listContainer = document.getElementById('notification-list');
    if (listContainer) {
      listContainer.innerHTML = this.renderNotificationList();
      
      // Re-attach event listeners for new items
      const container = document.getElementById(this.containerId);
      if (container) {
        container.querySelectorAll('.notification-mark-read-btn').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const notificationId = btn.dataset.notificationId;
            this.handleMarkAsRead(notificationId);
          });
        });
        
        container.querySelectorAll('.notification-item').forEach(item => {
          item.addEventListener('click', (e) => {
            if (e.target.closest('.notification-mark-read-btn')) return;
            
            const notificationId = item.dataset.notificationId;
            const planId = item.dataset.planId;
            
            const notification = this.notifications.find(n => n.id === notificationId);
            if (notification && !notification.readAt) {
              this.handleMarkAsRead(notificationId);
            }
            
            if (this.onNotificationClick && planId) {
              this.onNotificationClick(planId);
            }
            
            this.close();
          });
        });
      }
    }
    
    // Update mark all button visibility
    const markAllBtn = document.getElementById('mark-all-read-btn');
    if (markAllBtn) {
      markAllBtn.style.display = this.unreadCount > 0 ? 'block' : 'none';
    }
  }
  
  /**
   * Update the notification badge
   */
  updateBadge() {
    const bellBtn = document.getElementById('notification-bell-btn');
    if (bellBtn) {
      const existingBadge = bellBtn.querySelector('.notification-badge');
      if (existingBadge) {
        existingBadge.remove();
      }
      
      if (this.unreadCount > 0) {
        const badge = document.createElement('span');
        badge.className = 'notification-badge';
        badge.textContent = this.unreadCount > 99 ? '99+' : this.unreadCount;
        bellBtn.appendChild(badge);
      }
    }
  }
  
  /**
   * Refresh notifications (can be called externally)
   */
  async refresh() {
    await this.loadNotifications();
    this.updateNotificationList();
    this.updateBadge();
  }
  
  /**
   * Get current unread count
   */
  getUnreadCount() {
    return this.unreadCount;
  }
  
  /**
   * Format time ago string
   */
  formatTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    
    if (diffSec < 60) {
      return 'Just now';
    } else if (diffMin < 60) {
      return `${diffMin}m ago`;
    } else if (diffHour < 24) {
      return `${diffHour}h ago`;
    } else if (diffDay < 7) {
      return `${diffDay}d ago`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  }
  
  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  /**
   * Cleanup event listeners
   */
  destroy() {
    document.removeEventListener('click', this.handleOutsideClick);
  }
}

// Export for use in other modules
window.SchedulingNotifications = SchedulingNotifications;
