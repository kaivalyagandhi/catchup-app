/**
 * Mobile-Responsive Integration Example
 * Demonstrates how to integrate mobile-responsive features into the onboarding flow
 */

// Example 1: Initialize Mobile-Optimized Circular Visualizer
function initializeMobileVisualizer() {
  // Create visualizer instance
  const visualizer = new CircularVisualizer('onboarding-visualizer');
  
  // Render contacts and groups
  visualizer.render(contacts, groups);
  
  // Listen for mobile-specific events
  visualizer.on('contactDrag', async (data) => {
    console.log('Contact dragged:', data);
    
    // Update backend
    try {
      await fetch('/api/circles/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId: data.contactId,
          circle: data.toCircle
        })
      });
      
      // Update visualizer
      visualizer.updateContact(data.contactId, data.toCircle);
      
      // Show success feedback
      showToast('Contact moved successfully!');
      
      // Haptic feedback on mobile
      if (navigator.vibrate) {
        navigator.vibrate(10);
      }
    } catch (error) {
      console.error('Failed to update contact:', error);
      showToast('Failed to move contact', 'error');
    }
  });
  
  // Handle batch drag for mobile
  visualizer.on('batchDrag', async (data) => {
    console.log('Batch drag:', data);
    
    try {
      await fetch('/api/circles/batch-assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactIds: data.contactIds,
          circle: data.toCircle
        })
      });
      
      // Update visualizer
      const updates = data.contactIds.map(id => ({
        contactId: id,
        newCircle: data.toCircle
      }));
      visualizer.updateMultipleContacts(updates);
      
      showToast(`${data.contactIds.length} contacts moved successfully!`);
      
      // Haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate([10, 50, 10]);
      }
    } catch (error) {
      console.error('Failed to batch update:', error);
      showToast('Failed to move contacts', 'error');
    }
  });
  
  return visualizer;
}

// Example 2: Initialize Mobile Autocomplete for Contact Search
function initializeMobileAutocomplete() {
  const searchInput = document.getElementById('contact-search');
  
  const autocomplete = new MobileAutocomplete(searchInput, {
    minChars: 1,
    maxResults: 10,
    touchOptimized: true,
    debounceMs: 300,
    placeholder: 'Search contacts...',
    
    // Search function
    onSearch: async (query) => {
      try {
        const response = await fetch(`/api/contacts/search?q=${encodeURIComponent(query)}`);
        if (!response.ok) throw new Error('Search failed');
        
        const results = await response.json();
        return results;
      } catch (error) {
        console.error('Search error:', error);
        return [];
      }
    },
    
    // Selection handler
    onSelect: (contact) => {
      console.log('Contact selected:', contact);
      
      // Highlight contact in visualizer
      const visualizer = window.onboardingVisualizer;
      if (visualizer) {
        visualizer.selectContact(contact.id);
        
        // Scroll to contact's circle
        const circle = contact.circle || contact.dunbarCircle;
        if (circle) {
          visualizer.highlightCircle(circle);
        }
      }
      
      // Show contact details
      showContactDetails(contact);
      
      // Haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate(10);
      }
    }
  });
  
  return autocomplete;
}

// Example 3: Handle Orientation Changes
function setupOrientationHandling(visualizer) {
  let savedState = null;
  
  // Listen for orientation change
  window.addEventListener('orientationchange', () => {
    console.log('Orientation changed');
    
    // Save state before change
    savedState = visualizer.saveState();
    
    // Show loading indicator
    showLoadingOverlay('Adjusting layout...');
    
    // Wait for orientation change to complete
    setTimeout(() => {
      // Handle resize
      visualizer.handleResize();
      
      // Restore state
      if (savedState) {
        visualizer.restoreState(savedState);
      }
      
      // Hide loading indicator
      hideLoadingOverlay();
      
      // Log orientation
      const orientation = window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
      console.log('New orientation:', orientation);
    }, 100);
  });
  
  // Also handle resize events
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      visualizer.handleResize();
    }, 250);
  });
}

// Example 4: Mobile-Optimized Onboarding Flow
function initializeMobileOnboarding() {
  // Detect if mobile
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  if (isMobile) {
    console.log('Mobile device detected - applying optimizations');
    
    // Apply mobile-specific styles
    document.body.classList.add('mobile-device');
    
    // Disable hover tooltips on mobile
    document.body.classList.add('no-hover');
    
    // Enable momentum scrolling
    document.querySelectorAll('.scrollable').forEach(el => {
      el.style.webkitOverflowScrolling = 'touch';
    });
    
    // Prevent double-tap zoom
    let lastTouchEnd = 0;
    document.addEventListener('touchend', (e) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) {
        e.preventDefault();
      }
      lastTouchEnd = now;
    }, false);
    
    // Add viewport meta tag if not present
    if (!document.querySelector('meta[name="viewport"]')) {
      const viewport = document.createElement('meta');
      viewport.name = 'viewport';
      viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
      document.head.appendChild(viewport);
    }
  }
  
  // Initialize visualizer
  const visualizer = initializeMobileVisualizer();
  window.onboardingVisualizer = visualizer;
  
  // Initialize autocomplete
  const autocomplete = initializeMobileAutocomplete();
  window.onboardingAutocomplete = autocomplete;
  
  // Setup orientation handling
  setupOrientationHandling(visualizer);
  
  // Setup touch feedback
  setupTouchFeedback();
  
  return { visualizer, autocomplete };
}

// Example 5: Touch Feedback System
function setupTouchFeedback() {
  // Add touch feedback to all buttons
  document.querySelectorAll('button, .btn, .clickable').forEach(element => {
    element.addEventListener('touchstart', function() {
      this.classList.add('touch-active');
    });
    
    element.addEventListener('touchend', function() {
      this.classList.remove('touch-active');
    });
    
    element.addEventListener('touchcancel', function() {
      this.classList.remove('touch-active');
    });
  });
  
  // Add haptic feedback to important actions
  document.querySelectorAll('[data-haptic]').forEach(element => {
    element.addEventListener('click', () => {
      if (navigator.vibrate) {
        const pattern = element.getAttribute('data-haptic');
        if (pattern === 'light') {
          navigator.vibrate(10);
        } else if (pattern === 'medium') {
          navigator.vibrate(20);
        } else if (pattern === 'heavy') {
          navigator.vibrate([10, 50, 10]);
        }
      }
    });
  });
}

// Example 6: Responsive Image Loading
function setupResponsiveImages() {
  const isMobile = window.innerWidth <= 768;
  
  document.querySelectorAll('img[data-mobile-src]').forEach(img => {
    if (isMobile && img.getAttribute('data-mobile-src')) {
      img.src = img.getAttribute('data-mobile-src');
    }
  });
}

// Example 7: Mobile-Optimized Toast Notifications
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  
  // Position at bottom on mobile, top on desktop
  const isMobile = window.innerWidth <= 768;
  toast.style.position = 'fixed';
  toast.style.left = '50%';
  toast.style.transform = 'translateX(-50%)';
  toast.style.zIndex = '10000';
  toast.style.padding = '12px 24px';
  toast.style.borderRadius = '8px';
  toast.style.fontSize = '14px';
  toast.style.fontWeight = '500';
  toast.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
  
  if (isMobile) {
    toast.style.bottom = '20px';
    toast.style.maxWidth = 'calc(100% - 40px)';
  } else {
    toast.style.top = '20px';
    toast.style.maxWidth = '400px';
  }
  
  if (type === 'success') {
    toast.style.background = '#10b981';
    toast.style.color = 'white';
  } else if (type === 'error') {
    toast.style.background = '#ef4444';
    toast.style.color = 'white';
  } else {
    toast.style.background = '#3b82f6';
    toast.style.color = 'white';
  }
  
  document.body.appendChild(toast);
  
  // Animate in
  setTimeout(() => {
    toast.style.opacity = '1';
    toast.style.transition = 'opacity 0.3s';
  }, 10);
  
  // Remove after 3 seconds
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, 3000);
}

// Example 8: Loading Overlay for Orientation Changes
function showLoadingOverlay(message = 'Loading...') {
  let overlay = document.getElementById('loading-overlay');
  
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'loading-overlay';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.right = '0';
    overlay.style.bottom = '0';
    overlay.style.background = 'rgba(0, 0, 0, 0.5)';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = '9999';
    overlay.innerHTML = `
      <div style="background: white; padding: 24px 32px; border-radius: 12px; text-align: center;">
        <div style="font-size: 16px; font-weight: 600; color: #1f2937;">${message}</div>
      </div>
    `;
    document.body.appendChild(overlay);
  }
  
  overlay.style.display = 'flex';
}

function hideLoadingOverlay() {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) {
    overlay.style.display = 'none';
  }
}

// Example 9: Contact Details Modal (Mobile-Optimized)
function showContactDetails(contact) {
  const modal = document.createElement('div');
  modal.className = 'contact-details-modal';
  modal.innerHTML = `
    <div class="modal-overlay" onclick="this.parentElement.remove()"></div>
    <div class="modal-content">
      <div class="modal-header">
        <h2>${contact.name}</h2>
        <button class="modal-close" onclick="this.closest('.contact-details-modal').remove()">×</button>
      </div>
      <div class="modal-body">
        ${contact.email ? `<p><strong>Email:</strong> ${contact.email}</p>` : ''}
        ${contact.phone ? `<p><strong>Phone:</strong> ${contact.phone}</p>` : ''}
        ${contact.circle ? `<p><strong>Circle:</strong> ${getCircleName(contact.circle)}</p>` : ''}
        ${contact.groups && contact.groups.length > 0 ? `<p><strong>Groups:</strong> ${contact.groups.join(', ')}</p>` : ''}
      </div>
      <div class="modal-actions">
        <button class="btn btn-primary" onclick="editContact('${contact.id}')">Edit</button>
        <button class="btn btn-secondary" onclick="this.closest('.contact-details-modal').remove()">Close</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
}

function getCircleName(circleId) {
  const circles = {
    inner: 'Inner Circle',
    close: 'Close Friends',
    active: 'Active Friends',
    casual: 'Casual Network',
    acquaintance: 'Acquaintances'
  };
  return circles[circleId] || circleId;
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  // Check if we're on the onboarding page
  if (document.getElementById('onboarding-visualizer')) {
    initializeMobileOnboarding();
  }
});

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.MobileOnboarding = {
    initialize: initializeMobileOnboarding,
    initializeVisualizer: initializeMobileVisualizer,
    initializeAutocomplete: initializeMobileAutocomplete,
    setupOrientationHandling,
    showToast,
    showContactDetails
  };
}
