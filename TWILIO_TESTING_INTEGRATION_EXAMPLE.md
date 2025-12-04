# Integrating Twilio Testing UI into Preferences

## Overview

This guide shows how to integrate the Twilio Testing UI component into your CatchUp preferences page.

## Quick Integration

### Option 1: Standalone Page (Already Done!)

The easiest way to use the Twilio testing tool is via the standalone page:

```
http://localhost:3000/twilio-testing.html
```

This page is ready to use right now!

### Option 2: Add to Preferences Page

To integrate into your existing preferences page:

#### Step 1: Add CSS to your preferences page

```html
<link rel="stylesheet" href="/css/twilio-testing-ui.css">
```

#### Step 2: Add JavaScript to your preferences page

```html
<script src="/js/twilio-testing-ui.js"></script>
```

#### Step 3: Add a container in your preferences HTML

```html
<div class="preferences-section">
  <h2>Twilio SMS/MMS Testing</h2>
  <div id="twilio-testing-container"></div>
</div>
```

#### Step 4: Initialize the component

```javascript
// Initialize Twilio testing UI
const twilioContainer = document.getElementById('twilio-testing-container');
if (twilioContainer) {
  window.twilioTester = new TwilioTestingUI({
    container: twilioContainer,
    apiBaseUrl: '/api'
  });
}
```

## Complete Example

Here's a complete example of a preferences page with Twilio testing:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preferences - CatchUp</title>
  
  <!-- Your existing CSS -->
  <link rel="stylesheet" href="/css/app.css">
  
  <!-- Twilio Testing CSS -->
  <link rel="stylesheet" href="/css/twilio-testing-ui.css">
  
  <style>
    .preferences-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
    
    .preferences-section {
      margin-bottom: 40px;
      padding: 20px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }
    
    .preferences-section h2 {
      margin-top: 0;
      padding-bottom: 16px;
      border-bottom: 2px solid #e5e7eb;
    }
    
    .preferences-tabs {
      display: flex;
      gap: 8px;
      margin-bottom: 24px;
      border-bottom: 2px solid #e5e7eb;
    }
    
    .tab-button {
      padding: 12px 24px;
      background: none;
      border: none;
      border-bottom: 3px solid transparent;
      cursor: pointer;
      font-size: 16px;
      font-weight: 500;
      color: #6b7280;
      transition: all 0.2s;
    }
    
    .tab-button:hover {
      color: #374151;
    }
    
    .tab-button.active {
      color: #8b5cf6;
      border-bottom-color: #8b5cf6;
    }
    
    .tab-content {
      display: none;
    }
    
    .tab-content.active {
      display: block;
    }
  </style>
</head>
<body>
  <div class="preferences-container">
    <h1>Preferences</h1>
    
    <!-- Tabs -->
    <div class="preferences-tabs">
      <button class="tab-button active" onclick="switchTab('general')">
        General
      </button>
      <button class="tab-button" onclick="switchTab('notifications')">
        Notifications
      </button>
      <button class="tab-button" onclick="switchTab('integrations')">
        Integrations
      </button>
      <button class="tab-button" onclick="switchTab('testing')">
        Testing
      </button>
    </div>
    
    <!-- General Tab -->
    <div id="general-tab" class="tab-content active">
      <div class="preferences-section">
        <h2>General Settings</h2>
        <p>Your general preferences go here...</p>
      </div>
    </div>
    
    <!-- Notifications Tab -->
    <div id="notifications-tab" class="tab-content">
      <div class="preferences-section">
        <h2>Notification Settings</h2>
        <p>Your notification preferences go here...</p>
      </div>
    </div>
    
    <!-- Integrations Tab -->
    <div id="integrations-tab" class="tab-content">
      <div class="preferences-section">
        <h2>Connected Services</h2>
        <p>Your connected services go here...</p>
      </div>
    </div>
    
    <!-- Testing Tab -->
    <div id="testing-tab" class="tab-content">
      <div class="preferences-section">
        <h2>Integration Testing</h2>
        <p class="subtitle">Test your integrations to ensure everything is working correctly.</p>
        
        <!-- Twilio Testing UI -->
        <div id="twilio-testing-container"></div>
      </div>
    </div>
  </div>
  
  <!-- Your existing JavaScript -->
  <script src="/js/app.js"></script>
  
  <!-- Twilio Testing JavaScript -->
  <script src="/js/twilio-testing-ui.js"></script>
  
  <script>
    // Tab switching
    function switchTab(tabName) {
      // Hide all tabs
      document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
      });
      
      // Remove active from all buttons
      document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
      });
      
      // Show selected tab
      document.getElementById(tabName + '-tab').classList.add('active');
      
      // Activate button
      event.target.classList.add('active');
    }
    
    // Initialize Twilio testing UI
    document.addEventListener('DOMContentLoaded', () => {
      const twilioContainer = document.getElementById('twilio-testing-container');
      if (twilioContainer) {
        window.twilioTester = new TwilioTestingUI({
          container: twilioContainer,
          apiBaseUrl: '/api'
        });
        console.log('Twilio Testing UI initialized');
      }
    });
  </script>
</body>
</html>
```

## API Endpoints

The Twilio Testing UI uses these API endpoints (already implemented):

- `GET /api/twilio/test/config` - Test configuration
- `GET /api/twilio/test/phone` - Verify phone number
- `POST /api/twilio/test/send-sms` - Send test SMS
- `GET /api/twilio/test/webhook` - Check webhook configuration

## Customization

### Custom Styling

You can customize the appearance by overriding CSS variables:

```css
.twilio-testing-ui {
  --primary-color: #8b5cf6;
  --success-color: #10b981;
  --warning-color: #f59e0b;
  --error-color: #ef4444;
}
```

### Custom API Base URL

If your API is hosted on a different domain:

```javascript
window.twilioTester = new TwilioTestingUI({
  container: twilioContainer,
  apiBaseUrl: 'https://api.yourdomain.com/api'
});
```

## Testing the Integration

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Visit the standalone page:
   ```
   http://localhost:3000/twilio-testing.html
   ```

3. Or visit your preferences page with the integrated component

4. Run the tests to verify everything works

## Troubleshooting

### Component not showing

**Check:**
- CSS file is loaded: `/css/twilio-testing-ui.css`
- JS file is loaded: `/js/twilio-testing-ui.js`
- Container element exists: `#twilio-testing-container`
- No JavaScript errors in console

### API calls failing

**Check:**
- Server is running: `npm run dev`
- API routes are registered in `src/api/server.ts`
- No CORS issues (should work on same domain)
- Check browser console for errors

### Tests not working

**Check:**
- Twilio credentials configured in `.env`
- Server restarted after adding credentials
- API endpoints returning data (check Network tab)

## Next Steps

1. ✅ Use the standalone page: `http://localhost:3000/twilio-testing.html`
2. 📝 Test your Twilio integration
3. 🔧 Fix any issues found
4. 🎨 Optionally integrate into your preferences page
5. 🚀 Deploy to production

## Resources

- [Twilio UI Testing Guide](TWILIO_UI_TESTING_GUIDE.md)
- [Twilio Setup Guide](TWILIO_SETUP_AND_TESTING_GUIDE.md)
- [Twilio Quick Start](TWILIO_QUICK_START.md)

---

**Last Updated:** December 3, 2025
