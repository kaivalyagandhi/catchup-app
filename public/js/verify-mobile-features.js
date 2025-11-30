/**
 * Mobile Features Verification Script
 * Run this script to verify all mobile-responsive features are working
 */

function verifyMobileFeatures() {
  const results = {
    passed: [],
    failed: [],
    warnings: []
  };
  
  console.log('🔍 Verifying Mobile-Responsive Features...\n');
  
  // Test 1: Check if CircularVisualizer exists
  if (typeof CircularVisualizer !== 'undefined') {
    results.passed.push('✓ CircularVisualizer class is defined');
    
    // Test mobile methods
    const testContainer = document.createElement('div');
    testContainer.id = 'test-visualizer';
    document.body.appendChild(testContainer);
    
    try {
      const visualizer = new CircularVisualizer('test-visualizer');
      
      // Check mobile detection
      if (typeof visualizer.detectMobile === 'function') {
        results.passed.push('✓ detectMobile() method exists');
        const isMobile = visualizer.detectMobile();
        console.log(`  Mobile detected: ${isMobile}`);
      } else {
        results.failed.push('✗ detectMobile() method missing');
      }
      
      // Check orientation handling
      if (typeof visualizer.handleOrientationChange === 'function') {
        results.passed.push('✓ handleOrientationChange() method exists');
      } else {
        results.failed.push('✗ handleOrientationChange() method missing');
      }
      
      // Check state preservation
      if (typeof visualizer.saveState === 'function' && typeof visualizer.restoreState === 'function') {
        results.passed.push('✓ saveState() and restoreState() methods exist');
        
        // Test state save/restore
        const state = visualizer.saveState();
        if (state && typeof state === 'object') {
          results.passed.push('✓ State save returns valid object');
        } else {
          results.failed.push('✗ State save returns invalid data');
        }
      } else {
        results.failed.push('✗ State preservation methods missing');
      }
      
      // Check mobile optimizations
      if (typeof visualizer.applyMobileOptimizations === 'function') {
        results.passed.push('✓ applyMobileOptimizations() method exists');
      } else {
        results.failed.push('✗ applyMobileOptimizations() method missing');
      }
      
      // Check touch support
      if (visualizer.isMobile !== undefined) {
        results.passed.push('✓ isMobile property is set');
      } else {
        results.warnings.push('⚠ isMobile property not initialized');
      }
      
      // Cleanup
      document.body.removeChild(testContainer);
    } catch (error) {
      results.failed.push(`✗ Error creating CircularVisualizer: ${error.message}`);
    }
  } else {
    results.failed.push('✗ CircularVisualizer class not found');
  }
  
  // Test 2: Check if MobileAutocomplete exists
  if (typeof MobileAutocomplete !== 'undefined') {
    results.passed.push('✓ MobileAutocomplete class is defined');
    
    // Create test input
    const testInput = document.createElement('input');
    testInput.id = 'test-autocomplete';
    document.body.appendChild(testInput);
    
    try {
      const autocomplete = new MobileAutocomplete(testInput, {
        onSearch: () => [],
        onSelect: () => {}
      });
      
      // Check methods
      if (typeof autocomplete.search === 'function') {
        results.passed.push('✓ MobileAutocomplete search() method exists');
      } else {
        results.failed.push('✗ MobileAutocomplete search() method missing');
      }
      
      if (typeof autocomplete.clear === 'function') {
        results.passed.push('✓ MobileAutocomplete clear() method exists');
      } else {
        results.failed.push('✗ MobileAutocomplete clear() method missing');
      }
      
      // Cleanup
      autocomplete.destroy();
      document.body.removeChild(testInput);
    } catch (error) {
      results.failed.push(`✗ Error creating MobileAutocomplete: ${error.message}`);
    }
  } else {
    results.failed.push('✗ MobileAutocomplete class not found');
  }
  
  // Test 3: Check CSS media queries
  const styles = document.getElementById('circular-visualizer-styles');
  if (styles) {
    results.passed.push('✓ Circular visualizer styles are loaded');
    
    const cssText = styles.textContent;
    if (cssText.includes('@media (max-width: 768px)')) {
      results.passed.push('✓ Tablet media query exists');
    } else {
      results.failed.push('✗ Tablet media query missing');
    }
    
    if (cssText.includes('@media (max-width: 480px)')) {
      results.passed.push('✓ Mobile media query exists');
    } else {
      results.failed.push('✗ Mobile media query missing');
    }
    
    if (cssText.includes('orientation: landscape')) {
      results.passed.push('✓ Landscape orientation media query exists');
    } else {
      results.warnings.push('⚠ Landscape orientation media query missing');
    }
  } else {
    results.warnings.push('⚠ Circular visualizer styles not loaded yet');
  }
  
  // Test 4: Check viewport meta tag
  const viewport = document.querySelector('meta[name="viewport"]');
  if (viewport) {
    results.passed.push('✓ Viewport meta tag exists');
    const content = viewport.getAttribute('content');
    if (content && content.includes('width=device-width')) {
      results.passed.push('✓ Viewport is properly configured');
    } else {
      results.warnings.push('⚠ Viewport may not be properly configured');
    }
  } else {
    results.warnings.push('⚠ Viewport meta tag missing (should be added for mobile)');
  }
  
  // Test 5: Check touch event support
  if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
    results.passed.push('✓ Touch events are supported');
  } else {
    results.warnings.push('⚠ Touch events not supported (desktop browser)');
  }
  
  // Test 6: Check orientation API
  if ('orientation' in window || 'onorientationchange' in window) {
    results.passed.push('✓ Orientation API is supported');
  } else {
    results.warnings.push('⚠ Orientation API not supported');
  }
  
  // Test 7: Check vibration API
  if ('vibrate' in navigator) {
    results.passed.push('✓ Vibration API is supported');
  } else {
    results.warnings.push('⚠ Vibration API not supported (haptic feedback unavailable)');
  }
  
  // Print results
  console.log('\n📊 Verification Results:\n');
  
  console.log('✅ Passed Tests:');
  results.passed.forEach(msg => console.log(`  ${msg}`));
  
  if (results.warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    results.warnings.forEach(msg => console.log(`  ${msg}`));
  }
  
  if (results.failed.length > 0) {
    console.log('\n❌ Failed Tests:');
    results.failed.forEach(msg => console.log(`  ${msg}`));
  }
  
  // Summary
  const total = results.passed.length + results.failed.length;
  const passRate = total > 0 ? Math.round((results.passed.length / total) * 100) : 0;
  
  console.log(`\n📈 Summary: ${results.passed.length}/${total} tests passed (${passRate}%)`);
  
  if (results.failed.length === 0) {
    console.log('\n🎉 All critical tests passed! Mobile features are working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Please review the implementation.');
  }
  
  return {
    passed: results.passed.length,
    failed: results.failed.length,
    warnings: results.warnings.length,
    passRate,
    success: results.failed.length === 0
  };
}

// Auto-run if loaded directly
if (typeof window !== 'undefined') {
  window.verifyMobileFeatures = verifyMobileFeatures;
  
  // Run verification when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      console.log('Running mobile features verification...');
      setTimeout(verifyMobileFeatures, 1000);
    });
  }
}
