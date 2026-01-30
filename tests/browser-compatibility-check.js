/**
 * Browser Compatibility Check Script
 * 
 * This script can be run in the browser console to quickly check
 * if all required features are supported.
 * 
 * Usage:
 * 1. Open browser DevTools (F12)
 * 2. Copy and paste this entire script into the Console
 * 3. Press Enter to run
 * 4. Review the results
 */

(function() {
  console.log('%c🌐 Browser Compatibility Check', 'font-size: 20px; font-weight: bold; color: #4CAF50;');
  console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #4CAF50;');
  
  // Detect Browser
  const ua = navigator.userAgent;
  let browserName = 'Unknown';
  let browserVersion = 'Unknown';
  
  if (ua.indexOf('Firefox') > -1) {
    browserName = 'Firefox';
    browserVersion = ua.match(/Firefox\/(\d+\.\d+)/)?.[1] || 'Unknown';
  } else if (ua.indexOf('Edg') > -1) {
    browserName = 'Edge';
    browserVersion = ua.match(/Edg\/(\d+\.\d+)/)?.[1] || 'Unknown';
  } else if (ua.indexOf('Chrome') > -1) {
    browserName = 'Chrome';
    browserVersion = ua.match(/Chrome\/(\d+\.\d+)/)?.[1] || 'Unknown';
  } else if (ua.indexOf('Safari') > -1) {
    browserName = 'Safari';
    browserVersion = ua.match(/Version\/(\d+\.\d+)/)?.[1] || 'Unknown';
  }
  
  console.log(`\n📱 Browser: ${browserName} ${browserVersion}`);
  console.log(`💻 Platform: ${navigator.platform}`);
  console.log(`🌍 User Agent: ${ua}\n`);
  
  // Feature Tests
  const features = [
    {
      name: 'CSS Variables',
      test: () => CSS.supports('color', 'var(--test)'),
      required: true
    },
    {
      name: 'CSS Grid',
      test: () => CSS.supports('display', 'grid'),
      required: true
    },
    {
      name: 'CSS Flexbox',
      test: () => CSS.supports('display', 'flex'),
      required: true
    },
    {
      name: 'Fetch API',
      test: () => typeof fetch !== 'undefined',
      required: true
    },
    {
      name: 'LocalStorage',
      test: () => {
        try {
          localStorage.setItem('test', 'test');
          localStorage.removeItem('test');
          return true;
        } catch (e) {
          return false;
        }
      },
      required: true
    },
    {
      name: 'ES6 Classes',
      test: () => {
        try {
          eval('class Test {}');
          return true;
        } catch (e) {
          return false;
        }
      },
      required: true
    },
    {
      name: 'Arrow Functions',
      test: () => {
        try {
          eval('() => {}');
          return true;
        } catch (e) {
          return false;
        }
      },
      required: true
    },
    {
      name: 'Template Literals',
      test: () => {
        try {
          eval('`test`');
          return true;
        } catch (e) {
          return false;
        }
      },
      required: true
    },
    {
      name: 'Async/Await',
      test: () => {
        try {
          eval('async function test() {}');
          return true;
        } catch (e) {
          return false;
        }
      },
      required: true
    },
    {
      name: 'Destructuring',
      test: () => {
        try {
          eval('const { test } = { test: true }');
          return true;
        } catch (e) {
          return false;
        }
      },
      required: true
    },
    {
      name: 'Spread Operator',
      test: () => {
        try {
          eval('const arr = [...[1, 2, 3]]');
          return true;
        } catch (e) {
          return false;
        }
      },
      required: true
    },
    {
      name: 'Promise',
      test: () => typeof Promise !== 'undefined',
      required: true
    },
    {
      name: 'Map/Set',
      test: () => typeof Map !== 'undefined' && typeof Set !== 'undefined',
      required: true
    },
    {
      name: 'Object.assign',
      test: () => typeof Object.assign === 'function',
      required: true
    },
    {
      name: 'Array.from',
      test: () => typeof Array.from === 'function',
      required: true
    }
  ];
  
  console.log('🔍 Feature Detection Results:\n');
  
  let allPassed = true;
  let requiredFailed = [];
  
  features.forEach(feature => {
    const supported = feature.test();
    const icon = supported ? '✅' : '❌';
    const style = supported ? 'color: #4CAF50;' : 'color: #f44336;';
    const requiredText = feature.required ? ' (REQUIRED)' : ' (optional)';
    
    console.log(`%c${icon} ${feature.name}${requiredText}`, style);
    
    if (!supported) {
      allPassed = false;
      if (feature.required) {
        requiredFailed.push(feature.name);
      }
    }
  });
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  // Summary
  if (allPassed) {
    console.log('%c✅ All features supported! This browser is fully compatible.', 'font-size: 16px; font-weight: bold; color: #4CAF50;');
  } else if (requiredFailed.length > 0) {
    console.log('%c❌ COMPATIBILITY ISSUES DETECTED', 'font-size: 16px; font-weight: bold; color: #f44336;');
    console.log('%cThe following REQUIRED features are not supported:', 'color: #f44336;');
    requiredFailed.forEach(feature => {
      console.log(`%c  • ${feature}`, 'color: #f44336;');
    });
    console.log('\n%cThis browser may not work correctly with the application.', 'color: #ff9800;');
    console.log('%cPlease upgrade to a newer version or use a different browser.', 'color: #ff9800;');
  } else {
    console.log('%c⚠️ Some optional features are not supported, but the app should work.', 'font-size: 16px; font-weight: bold; color: #ff9800;');
  }
  
  // Minimum Version Check
  console.log('\n📋 Minimum Browser Versions:');
  console.log('  • Chrome: 90+');
  console.log('  • Firefox: 88+');
  console.log('  • Safari: 14+');
  console.log('  • Edge: 90+');
  
  // Version Comparison
  const minVersions = {
    'Chrome': 90,
    'Firefox': 88,
    'Safari': 14,
    'Edge': 90
  };
  
  if (minVersions[browserName]) {
    const currentVersion = parseFloat(browserVersion);
    const minVersion = minVersions[browserName];
    
    if (currentVersion >= minVersion) {
      console.log(`\n%c✅ ${browserName} ${browserVersion} meets minimum version requirement (${minVersion}+)`, 'color: #4CAF50;');
    } else {
      console.log(`\n%c❌ ${browserName} ${browserVersion} is below minimum version requirement (${minVersion}+)`, 'color: #f44336;');
      console.log('%cPlease upgrade your browser for the best experience.', 'color: #ff9800;');
    }
  }
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  // Return results object
  return {
    browser: browserName,
    version: browserVersion,
    platform: navigator.platform,
    allFeaturesSupported: allPassed,
    requiredFeaturesFailed: requiredFailed,
    features: features.map(f => ({
      name: f.name,
      supported: f.test(),
      required: f.required
    }))
  };
})();
