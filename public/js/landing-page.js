/**
 * Landing Page JavaScript
 * Handles auth state detection and CTA button behavior
 */

(function() {
  'use strict';

  // Check if user is already authenticated
  function checkAuthState() {
    // Check for JWT token in localStorage (following existing auth pattern)
    const authToken = localStorage.getItem('authToken');
    
    if (authToken) {
      // User is logged in, show "Go to Dashboard" instead of sign-up
      showLoggedInState();
    } else {
      // User is not logged in, show sign-up CTAs
      showLoggedOutState();
    }
  }

  // Show logged-in state
  function showLoggedInState() {
    // Hide sign-up CTAs
    const ctaButtons = document.querySelector('.cta-buttons');
    if (ctaButtons) {
      ctaButtons.style.display = 'none';
    }
    
    // Show "Go to Dashboard" CTA
    const loggedInCta = document.getElementById('logged-in-cta');
    if (loggedInCta) {
      loggedInCta.style.display = 'block';
    }
    
    // Update final CTA to "Go to Dashboard"
    const finalCta = document.getElementById('final-cta');
    if (finalCta) {
      finalCta.href = '/app';
      finalCta.innerHTML = 'Go to Dashboard';
    }
  }

  // Show logged-out state
  function showLoggedOutState() {
    // Show sign-up CTAs (default state)
    const ctaButtons = document.querySelector('.cta-buttons');
    if (ctaButtons) {
      ctaButtons.style.display = 'flex';
    }
    
    // Hide "Go to Dashboard" CTA
    const loggedInCta = document.getElementById('logged-in-cta');
    if (loggedInCta) {
      loggedInCta.style.display = 'none';
    }
  }

  // Handle Google Sign-In
  async function handleGoogleSignIn(e) {
    e.preventDefault();
    
    try {
      // Fetch the authorization URL from the backend
      const response = await fetch('/api/auth/google/authorize');
      
      if (!response.ok) {
        throw new Error('Failed to get authorization URL');
      }
      
      const data = await response.json();
      
      // Redirect to Google's OAuth page
      window.location.href = data.authUrl;
    } catch (error) {
      console.error('Error initiating Google sign-in:', error);
      alert('Failed to start sign-in process. Please try again.');
    }
  }

  // Handle CTA button clicks
  function setupCTAHandlers() {
    // Primary CTA - Google Sign-In
    const primaryCta = document.getElementById('primary-cta');
    if (primaryCta) {
      primaryCta.addEventListener('click', function(e) {
        // Track analytics if available
        if (window.gtag) {
          window.gtag('event', 'click', {
            event_category: 'CTA',
            event_label: 'Primary Hero CTA'
          });
        }
        
        // Handle Google sign-in
        handleGoogleSignIn(e);
      });
    }

    // Final CTA - Google Sign-In
    const finalCta = document.getElementById('final-cta');
    if (finalCta) {
      finalCta.addEventListener('click', function(e) {
        // Track analytics if available
        if (window.gtag) {
          window.gtag('event', 'click', {
            event_category: 'CTA',
            event_label: 'Final CTA'
          });
        }
        
        // Check if user is logged in
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
          // Handle Google sign-in
          handleGoogleSignIn(e);
        }
        // Otherwise, let the default href="/app" work
      });
    }

    // Learn More button - smooth scroll
    const learnMoreBtn = document.querySelector('.btn-secondary');
    if (learnMoreBtn && learnMoreBtn.getAttribute('href') === '#features') {
      learnMoreBtn.addEventListener('click', function(e) {
        e.preventDefault();
        const featuresSection = document.getElementById('features');
        if (featuresSection) {
          featuresSection.scrollIntoView({ behavior: 'smooth' });
        }
      });
    }
  }

  // Handle OAuth callback
  function handleOAuthCallback() {
    // Check if we're on the callback URL with a token
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    
    if (token) {
      // Store the token
      localStorage.setItem('authToken', token);
      
      // Redirect to app
      window.location.href = '/app';
    }
  }

  // Initialize on page load
  function init() {
    // Check for OAuth callback
    handleOAuthCallback();
    
    // Check auth state
    checkAuthState();
    
    // Setup CTA handlers
    setupCTAHandlers();
  }

  // Run initialization when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
