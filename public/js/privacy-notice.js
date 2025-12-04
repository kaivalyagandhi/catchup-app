/**
 * Privacy Notice Component
 *
 * Displays privacy notice at the start of onboarding
 */

class PrivacyNotice {
  constructor() {
    this.container = null;
    this.onAccept = null;
    this.onDecline = null;
  }

  /**
   * Initialize the privacy notice
   */
  async init(options = {}) {
    this.onAccept = options.onAccept || (() => {});
    this.onDecline = options.onDecline || (() => {});

    // Fetch privacy notice content
    try {
      const response = await fetch('/api/privacy/notice');
      const data = await response.json();
      this.noticeContent = data.notice;
    } catch (error) {
      console.error('Failed to load privacy notice:', error);
      this.noticeContent = this.getDefaultNotice();
    }
  }

  /**
   * Render the privacy notice
   */
  render(containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`Container ${containerId} not found`);
      return;
    }

    this.container = container;

    container.innerHTML = `
      <div class="privacy-notice">
        <div class="privacy-notice-header">
          <h2>Your Privacy Matters</h2>
          <p class="privacy-notice-subtitle">
            Before we begin, here's how we protect your data
          </p>
        </div>

        <div class="privacy-notice-content">
          <div class="privacy-highlights">
            <div class="privacy-highlight">
              <div class="privacy-icon">🔒</div>
              <h3>Secure & Private</h3>
              <p>Your data is encrypted and never shared with third parties</p>
            </div>
            <div class="privacy-highlight">
              <div class="privacy-icon">👤</div>
              <h3>You're in Control</h3>
              <p>Export or delete your data at any time</p>
            </div>
            <div class="privacy-highlight">
              <div class="privacy-icon">🤖</div>
              <h3>AI That Respects Privacy</h3>
              <p>AI suggestions use only your data, never shared with others</p>
            </div>
          </div>

          <div class="privacy-details">
            <button class="privacy-details-toggle" id="privacy-details-toggle">
              Read Full Privacy Notice
              <span class="toggle-icon">▼</span>
            </button>
            <div class="privacy-details-content" id="privacy-details-content" style="display: none;">
              <pre class="privacy-notice-text">${this.escapeHtml(this.noticeContent || '')}</pre>
            </div>
          </div>
        </div>

        <div class="privacy-notice-actions">
          <button class="btn btn-secondary" id="privacy-decline-btn">
            I Don't Accept
          </button>
          <button class="btn btn-primary" id="privacy-accept-btn">
            I Accept & Continue
          </button>
        </div>

        <p class="privacy-notice-footer">
          By continuing, you agree to our privacy practices. You can change your mind at any time.
        </p>
      </div>
    `;

    this.attachEventListeners();
    this.applyStyles();
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    const acceptBtn = document.getElementById('privacy-accept-btn');
    const declineBtn = document.getElementById('privacy-decline-btn');
    const detailsToggle = document.getElementById('privacy-details-toggle');
    const detailsContent = document.getElementById('privacy-details-content');

    if (acceptBtn) {
      acceptBtn.addEventListener('click', () => {
        this.recordConsent(true);
        this.onAccept();
      });
    }

    if (declineBtn) {
      declineBtn.addEventListener('click', () => {
        this.recordConsent(false);
        this.onDecline();
      });
    }

    if (detailsToggle && detailsContent) {
      detailsToggle.addEventListener('click', () => {
        const isVisible = detailsContent.style.display !== 'none';
        detailsContent.style.display = isVisible ? 'none' : 'block';
        const icon = detailsToggle.querySelector('.toggle-icon');
        if (icon) {
          icon.textContent = isVisible ? '▼' : '▲';
        }
      });
    }
  }

  /**
   * Record user consent
   */
  recordConsent(accepted) {
    const consent = {
      accepted,
      timestamp: new Date().toISOString(),
      version: '1.0'
    };
    localStorage.setItem('catchup_privacy_consent', JSON.stringify(consent));
  }

  /**
   * Check if user has already accepted
   */
  hasAccepted() {
    const consent = localStorage.getItem('catchup_privacy_consent');
    if (!consent) return false;

    try {
      const parsed = JSON.parse(consent);
      return parsed.accepted === true;
    } catch {
      return false;
    }
  }

  /**
   * Apply styles
   */
  applyStyles() {
    if (document.getElementById('privacy-notice-styles')) return;

    const style = document.createElement('style');
    style.id = 'privacy-notice-styles';
    style.textContent = `
      .privacy-notice {
        max-width: 800px;
        margin: 0 auto;
        padding: 2rem;
        background: white;
        border-radius: 12px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      }

      .privacy-notice-header {
        text-align: center;
        margin-bottom: 2rem;
      }

      .privacy-notice-header h2 {
        font-size: 2rem;
        color: #2c3e50;
        margin-bottom: 0.5rem;
      }

      .privacy-notice-subtitle {
        font-size: 1.1rem;
        color: #7f8c8d;
      }

      .privacy-highlights {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1.5rem;
        margin-bottom: 2rem;
      }

      .privacy-highlight {
        text-align: center;
        padding: 1.5rem;
        background: #f8f9fa;
        border-radius: 8px;
      }

      .privacy-icon {
        font-size: 3rem;
        margin-bottom: 0.5rem;
      }

      .privacy-highlight h3 {
        font-size: 1.1rem;
        color: #2c3e50;
        margin-bottom: 0.5rem;
      }

      .privacy-highlight p {
        font-size: 0.9rem;
        color: #7f8c8d;
        line-height: 1.4;
      }

      .privacy-details {
        margin: 2rem 0;
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        overflow: hidden;
      }

      .privacy-details-toggle {
        width: 100%;
        padding: 1rem;
        background: #f8f9fa;
        border: none;
        cursor: pointer;
        font-size: 1rem;
        font-weight: 500;
        color: #2c3e50;
        display: flex;
        justify-content: space-between;
        align-items: center;
        transition: background 0.2s;
      }

      .privacy-details-toggle:hover {
        background: #e9ecef;
      }

      .toggle-icon {
        font-size: 0.8rem;
      }

      .privacy-details-content {
        max-height: 400px;
        overflow-y: auto;
        padding: 1rem;
        background: white;
      }

      .privacy-notice-text {
        white-space: pre-wrap;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 0.9rem;
        line-height: 1.6;
        color: #2c3e50;
      }

      .privacy-notice-actions {
        display: flex;
        gap: 1rem;
        justify-content: center;
        margin: 2rem 0 1rem;
      }

      .privacy-notice-actions .btn {
        padding: 0.75rem 2rem;
        font-size: 1rem;
        border-radius: 6px;
        border: none;
        cursor: pointer;
        font-weight: 500;
        transition: all 0.2s;
      }

      .privacy-notice-actions .btn-primary {
        background: #3498db;
        color: white;
      }

      .privacy-notice-actions .btn-primary:hover {
        background: #2980b9;
        transform: translateY(-1px);
        box-shadow: 0 4px 8px rgba(52, 152, 219, 0.3);
      }

      .privacy-notice-actions .btn-secondary {
        background: #ecf0f1;
        color: #7f8c8d;
      }

      .privacy-notice-actions .btn-secondary:hover {
        background: #d5dbdb;
      }

      .privacy-notice-footer {
        text-align: center;
        font-size: 0.85rem;
        color: #95a5a6;
        margin-top: 1rem;
      }

      @media (max-width: 768px) {
        .privacy-notice {
          padding: 1.5rem;
        }

        .privacy-highlights {
          grid-template-columns: 1fr;
        }

        .privacy-notice-actions {
          flex-direction: column-reverse;
        }

        .privacy-notice-actions .btn {
          width: 100%;
        }
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Get default privacy notice if API fails
   */
  getDefaultNotice() {
    return `
# CatchUp Privacy Notice

## Your Data, Your Control

CatchUp is designed with privacy at its core.

### What We Store
- Contact information you provide
- Your relationship organization
- Interaction history
- Voice notes and transcriptions
- Your preferences

### Your Rights
- Access: Export all your data at any time
- Control: Modify or delete any information
- Deletion: Permanently delete your account
- Privacy: Your data is never shared

### Data Security
- All data is encrypted
- Access is strictly controlled
- Regular security audits

For questions, contact privacy@catchup.app
    `.trim();
  }

  /**
   * Show data summary to user
   */
  async showDataSummary() {
    try {
      const response = await fetch('/api/privacy/data-summary', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch data summary');
      }

      const summary = await response.json();
      
      return `
You currently have:
- ${summary.contacts} contacts
- ${summary.interactions} interactions
- ${summary.voiceNotes} voice notes
- ${summary.groups} groups
- ${summary.tags} tags
- ${summary.achievements} achievements
      `.trim();
    } catch (error) {
      console.error('Error fetching data summary:', error);
      return 'Unable to load data summary';
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PrivacyNotice;
}
