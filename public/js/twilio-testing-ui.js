/**
 * Twilio Testing UI Component
 * 
 * Provides a comprehensive UI for testing Twilio SMS/MMS integration
 * directly from the CatchUp web app preferences section.
 * 
 * Features:
 * - Configuration validation
 * - Test SMS sending
 * - Webhook signature testing
 * - Phone number verification
 * - Real-time test results
 * - Error diagnostics
 */

class TwilioTestingUI {
  constructor(options = {}) {
    this.container = options.container || document.body;
    this.apiBaseUrl = options.apiBaseUrl || '/api';
    
    // State
    this.testResults = {
      configuration: null,
      phoneNumber: null,
      smsSending: null,
      webhook: null,
    };
    
    this.isTestingInProgress = false;
    
    this.render();
  }
  
  /**
   * Render the main UI structure
   */
  render() {
    const html = `
      <div class="twilio-testing-ui">
        <div class="twilio-testing-header">
          <h2>📱 Twilio SMS/MMS Testing</h2>
          <p class="twilio-testing-subtitle">
            Test your Twilio integration to ensure SMS and MMS messaging works correctly.
          </p>
        </div>
        
        <div class="twilio-testing-content">
          <!-- Configuration Status -->
          <div class="test-section">
            <div class="test-section-header">
              <h3>1. Configuration Status</h3>
              <span class="test-status" id="config-status">⏳ Not tested</span>
            </div>
            <p class="test-description">
              Verify that Twilio credentials are properly configured.
            </p>
            <button class="btn-secondary" id="test-config-btn" onclick="twilioTester.testConfiguration()">
              Test Configuration
            </button>
            <div class="test-result" id="config-result"></div>
          </div>
          
          <!-- Phone Number Verification -->
          <div class="test-section">
            <div class="test-section-header">
              <h3>2. Phone Number Verification</h3>
              <span class="test-status" id="phone-status">⏳ Not tested</span>
            </div>
            <p class="test-description">
              Verify your Twilio phone number and its capabilities.
            </p>
            <button class="btn-secondary" id="test-phone-btn" onclick="twilioTester.testPhoneNumber()">
              Verify Phone Number
            </button>
            <div class="test-result" id="phone-result"></div>
          </div>
          
          <!-- Send Test SMS -->
          <div class="test-section">
            <div class="test-section-header">
              <h3>3. Send Test SMS</h3>
              <span class="test-status" id="sms-status">⏳ Not tested</span>
            </div>
            <p class="test-description">
              Send a test SMS message to verify delivery works.
            </p>
            <div class="test-input-group">
              <label for="test-phone-input">Recipient Phone Number:</label>
              <input 
                type="tel" 
                id="test-phone-input" 
                placeholder="+15555551234"
                class="test-input"
              />
              <small class="input-hint">
                Format: +1234567890 (include country code)
                ${this.isTrialAccount() ? '<br><strong>Trial accounts:</strong> Number must be verified in Twilio Console' : ''}
              </small>
            </div>
            <button class="btn-primary" id="test-sms-btn" onclick="twilioTester.testSMSSending()">
              Send Test SMS
            </button>
            <div class="test-result" id="sms-result"></div>
          </div>
          
          <!-- Webhook Testing -->
          <div class="test-section">
            <div class="test-section-header">
              <h3>4. Webhook Configuration</h3>
              <span class="test-status" id="webhook-status">⏳ Not tested</span>
            </div>
            <p class="test-description">
              Check webhook configuration for receiving incoming messages.
            </p>
            <button class="btn-secondary" id="test-webhook-btn" onclick="twilioTester.testWebhook()">
              Check Webhook
            </button>
            <div class="test-result" id="webhook-result"></div>
          </div>
          
          <!-- Run All Tests -->
          <div class="test-section test-section-highlight">
            <h3>🚀 Run All Tests</h3>
            <p class="test-description">
              Run all tests sequentially to verify complete integration.
            </p>
            <button class="btn-primary btn-large" id="run-all-btn" onclick="twilioTester.runAllTests()">
              Run All Tests
            </button>
            <div class="test-summary" id="test-summary"></div>
          </div>
          
          <!-- Help & Resources -->
          <div class="test-section test-section-info">
            <h3>📚 Help & Resources</h3>
            <div class="help-links">
              <a href="/TWILIO_QUICK_START.md" target="_blank" class="help-link">
                📖 Quick Start Guide
              </a>
              <a href="/TWILIO_SETUP_AND_TESTING_GUIDE.md" target="_blank" class="help-link">
                📘 Complete Setup Guide
              </a>
              <a href="https://console.twilio.com/" target="_blank" class="help-link">
                🔧 Twilio Console
              </a>
              <a href="https://www.twilio.com/docs/sms" target="_blank" class="help-link">
                📚 Twilio SMS Docs
              </a>
            </div>
          </div>
        </div>
      </div>
    `;
    
    this.container.innerHTML = html;
  }
  
  /**
   * Test 1: Configuration validation
   */
  async testConfiguration() {
    this.setTestStatus('config', 'testing');
    this.clearResult('config');
    
    try {
      const response = await fetch(`${this.apiBaseUrl}/twilio/test/config`);
      const result = await response.json();
      
      if (result.success) {
        this.setTestStatus('config', 'success');
        this.showResult('config', 'success', `
          <strong>✅ Configuration Valid</strong>
          <ul>
            <li>Account SID: ${this.maskCredential(result.accountSid)}</li>
            <li>Phone Number: ${result.phoneNumber}</li>
            <li>Auth Token: Configured ✓</li>
          </ul>
        `);
      } else {
        this.setTestStatus('config', 'error');
        this.showResult('config', 'error', `
          <strong>❌ Configuration Invalid</strong>
          <p>${result.error}</p>
          <div class="test-help">
            <strong>How to fix:</strong>
            <ol>
              <li>Sign up at <a href="https://www.twilio.com/try-twilio" target="_blank">Twilio</a></li>
              <li>Get your Account SID and Auth Token from the dashboard</li>
              <li>Purchase a phone number with SMS/MMS capabilities</li>
              <li>Add credentials to your .env file</li>
            </ol>
          </div>
        `);
      }
      
      this.testResults.configuration = result;
      return result;
    } catch (error) {
      this.setTestStatus('config', 'error');
      this.showResult('config', 'error', `
        <strong>❌ Test Failed</strong>
        <p>${error.message}</p>
      `);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Test 2: Phone number verification
   */
  async testPhoneNumber() {
    this.setTestStatus('phone', 'testing');
    this.clearResult('phone');
    
    try {
      const response = await fetch(`${this.apiBaseUrl}/twilio/test/phone`);
      const result = await response.json();
      
      if (result.success) {
        this.setTestStatus('phone', 'success');
        this.showResult('phone', 'success', `
          <strong>✅ Phone Number Verified</strong>
          <ul>
            <li>Phone: ${result.phoneNumber}</li>
            <li>Friendly Name: ${result.friendlyName}</li>
            <li>SMS Capable: ${result.capabilities.sms ? '✅ Yes' : '❌ No'}</li>
            <li>MMS Capable: ${result.capabilities.mms ? '✅ Yes' : '⚠️ No'}</li>
            ${result.webhookUrl ? `<li>Webhook: ${result.webhookUrl}</li>` : '<li>⚠️ No webhook configured</li>'}
          </ul>
          ${!result.capabilities.mms ? '<p class="warning">⚠️ MMS not enabled - voice notes with images will fail</p>' : ''}
          ${!result.webhookUrl ? '<p class="warning">⚠️ Configure webhook to receive messages</p>' : ''}
        `);
      } else {
        this.setTestStatus('phone', 'error');
        this.showResult('phone', 'error', `
          <strong>❌ Phone Number Not Found</strong>
          <p>${result.error}</p>
          <div class="test-help">
            <strong>How to fix:</strong>
            <ol>
              <li>Go to <a href="https://console.twilio.com/us1/develop/phone-numbers/manage/incoming" target="_blank">Twilio Console</a></li>
              <li>Buy a phone number with SMS/MMS capabilities</li>
              <li>Update TWILIO_PHONE_NUMBER in your .env file</li>
            </ol>
          </div>
        `);
      }
      
      this.testResults.phoneNumber = result;
      return result;
    } catch (error) {
      this.setTestStatus('phone', 'error');
      this.showResult('phone', 'error', `
        <strong>❌ Test Failed</strong>
        <p>${error.message}</p>
      `);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Test 3: Send test SMS
   */
  async testSMSSending() {
    const phoneInput = document.getElementById('test-phone-input');
    const toNumber = phoneInput.value.trim();
    
    if (!toNumber) {
      showToast('Please enter a phone number', 'error');
      return;
    }
    
    if (!toNumber.startsWith('+')) {
      showToast('Phone number must include country code (e.g., +15555551234)', 'error');
      return;
    }
    
    this.setTestStatus('sms', 'testing');
    this.clearResult('sms');
    
    try {
      const response = await fetch(`${this.apiBaseUrl}/twilio/test/send-sms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: toNumber }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        this.setTestStatus('sms', 'success');
        this.showResult('sms', 'success', `
          <strong>✅ SMS Sent Successfully!</strong>
          <ul>
            <li>Message SID: ${result.messageSid}</li>
            <li>To: ${result.to}</li>
            <li>From: ${result.from}</li>
            <li>Status: ${result.status}</li>
          </ul>
          <p class="success-note">Check your phone for the test message!</p>
        `);
      } else {
        this.setTestStatus('sms', 'error');
        
        let helpText = '';
        if (result.errorCode === 21608) {
          helpText = `
            <div class="test-help">
              <strong>Trial Account Restriction:</strong>
              <p>Trial accounts can only send to verified phone numbers.</p>
              <ol>
                <li>Go to <a href="https://console.twilio.com/us1/develop/phone-numbers/manage/verified" target="_blank">Verified Caller IDs</a></li>
                <li>Add and verify ${toNumber}</li>
                <li>Or upgrade to a paid account</li>
              </ol>
            </div>
          `;
        } else if (result.errorCode === 21211) {
          helpText = `
            <div class="test-help">
              <strong>Invalid Phone Number:</strong>
              <p>The phone number format is invalid.</p>
              <p>Use E.164 format: +[country code][number]</p>
              <p>Example: +15555551234</p>
            </div>
          `;
        }
        
        this.showResult('sms', 'error', `
          <strong>❌ SMS Sending Failed</strong>
          <p>${result.error}</p>
          ${result.errorCode ? `<p>Error Code: ${result.errorCode}</p>` : ''}
          ${helpText}
        `);
      }
      
      this.testResults.smsSending = result;
      return result;
    } catch (error) {
      this.setTestStatus('sms', 'error');
      this.showResult('sms', 'error', `
        <strong>❌ Test Failed</strong>
        <p>${error.message}</p>
      `);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Test 4: Webhook configuration
   */
  async testWebhook() {
    this.setTestStatus('webhook', 'testing');
    this.clearResult('webhook');
    
    try {
      const response = await fetch(`${this.apiBaseUrl}/twilio/test/webhook`);
      const result = await response.json();
      
      if (result.success) {
        this.setTestStatus('webhook', result.configured ? 'success' : 'warning');
        
        if (result.configured) {
          this.showResult('webhook', 'success', `
            <strong>✅ Webhook Configured</strong>
            <ul>
              <li>Webhook URL: ${result.webhookUrl}</li>
              <li>Method: ${result.method || 'POST'}</li>
              <li>Status: Active</li>
            </ul>
            <p class="success-note">Your app can receive incoming SMS/MMS messages!</p>
          `);
        } else {
          this.showResult('webhook', 'warning', `
            <strong>⚠️ Webhook Not Configured</strong>
            <p>Your Twilio number can send messages but cannot receive them.</p>
            <div class="test-help">
              <strong>To configure webhook:</strong>
              <ol>
                <li>For local development, install ngrok: <code>brew install ngrok</code></li>
                <li>Start ngrok: <code>ngrok http 3000</code></li>
                <li>Copy the https URL (e.g., https://abc123.ngrok.io)</li>
                <li>Go to <a href="https://console.twilio.com/us1/develop/phone-numbers/manage/incoming" target="_blank">Twilio Console</a></li>
                <li>Click your phone number</li>
                <li>Under "Messaging Configuration", set webhook to: <code>https://abc123.ngrok.io/api/sms/webhook</code></li>
                <li>Set method to POST and save</li>
              </ol>
            </div>
          `);
        }
      } else {
        this.setTestStatus('webhook', 'error');
        this.showResult('webhook', 'error', `
          <strong>❌ Webhook Check Failed</strong>
          <p>${result.error}</p>
        `);
      }
      
      this.testResults.webhook = result;
      return result;
    } catch (error) {
      this.setTestStatus('webhook', 'error');
      this.showResult('webhook', 'error', `
        <strong>❌ Test Failed</strong>
        <p>${error.message}</p>
      `);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Run all tests sequentially
   */
  async runAllTests() {
    if (this.isTestingInProgress) {
      return;
    }
    
    this.isTestingInProgress = true;
    const runAllBtn = document.getElementById('run-all-btn');
    const originalText = runAllBtn.textContent;
    runAllBtn.disabled = true;
    runAllBtn.textContent = 'Running Tests...';
    
    const summaryDiv = document.getElementById('test-summary');
    summaryDiv.innerHTML = '<p class="testing-message">🔄 Running tests...</p>';
    
    try {
      // Test 1: Configuration
      await this.testConfiguration();
      await this.sleep(500);
      
      // Test 2: Phone Number
      await this.testPhoneNumber();
      await this.sleep(500);
      
      // Test 3: Webhook
      await this.testWebhook();
      await this.sleep(500);
      
      // Show summary
      this.showTestSummary();
    } finally {
      this.isTestingInProgress = false;
      runAllBtn.disabled = false;
      runAllBtn.textContent = originalText;
    }
  }
  
  /**
   * Show test summary
   */
  showTestSummary() {
    const summaryDiv = document.getElementById('test-summary');
    
    const passed = Object.values(this.testResults).filter(r => r?.success).length;
    const total = Object.keys(this.testResults).length;
    
    const allPassed = passed === total;
    const somePassed = passed > 0 && passed < total;
    
    let summaryClass = 'summary-success';
    let summaryIcon = '✅';
    let summaryTitle = 'All Tests Passed!';
    
    if (!allPassed) {
      if (somePassed) {
        summaryClass = 'summary-warning';
        summaryIcon = '⚠️';
        summaryTitle = 'Some Tests Failed';
      } else {
        summaryClass = 'summary-error';
        summaryIcon = '❌';
        summaryTitle = 'Tests Failed';
      }
    }
    
    summaryDiv.innerHTML = `
      <div class="test-summary-content ${summaryClass}">
        <div class="summary-header">
          <span class="summary-icon">${summaryIcon}</span>
          <h4>${summaryTitle}</h4>
        </div>
        <div class="summary-stats">
          <div class="summary-stat">
            <span class="stat-value">${passed}</span>
            <span class="stat-label">Passed</span>
          </div>
          <div class="summary-stat">
            <span class="stat-value">${total - passed}</span>
            <span class="stat-label">Failed</span>
          </div>
          <div class="summary-stat">
            <span class="stat-value">${total}</span>
            <span class="stat-label">Total</span>
          </div>
        </div>
        ${!allPassed ? `
          <p class="summary-note">
            Review the failed tests above and follow the troubleshooting steps.
          </p>
        ` : `
          <p class="summary-note">
            Your Twilio integration is working correctly! 🎉
          </p>
        `}
      </div>
    `;
  }
  
  /**
   * Set test status indicator
   */
  setTestStatus(testId, status) {
    const statusEl = document.getElementById(`${testId}-status`);
    if (!statusEl) return;
    
    const statusMap = {
      testing: { text: '🔄 Testing...', class: 'status-testing' },
      success: { text: '✅ Passed', class: 'status-success' },
      warning: { text: '⚠️ Warning', class: 'status-warning' },
      error: { text: '❌ Failed', class: 'status-error' },
    };
    
    const statusInfo = statusMap[status] || { text: '⏳ Not tested', class: '' };
    statusEl.textContent = statusInfo.text;
    statusEl.className = `test-status ${statusInfo.class}`;
  }
  
  /**
   * Show test result
   */
  showResult(testId, type, html) {
    const resultEl = document.getElementById(`${testId}-result`);
    if (!resultEl) return;
    
    resultEl.className = `test-result test-result-${type} test-result-visible`;
    resultEl.innerHTML = html;
  }
  
  /**
   * Clear test result
   */
  clearResult(testId) {
    const resultEl = document.getElementById(`${testId}-result`);
    if (!resultEl) return;
    
    resultEl.className = 'test-result';
    resultEl.innerHTML = '';
  }
  
  /**
   * Mask credential for display
   */
  maskCredential(value) {
    if (!value || value.length < 10) return '***';
    return value.substring(0, 10) + '...';
  }
  
  /**
   * Check if using trial account
   */
  isTrialAccount() {
    // This would need to be determined from the API
    return true; // Assume trial for safety
  }
  
  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.TwilioTestingUI = TwilioTestingUI;
  
  // Create global instance for onclick handlers
  window.twilioTester = null;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TwilioTestingUI };
}
