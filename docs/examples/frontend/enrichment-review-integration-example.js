/**
 * Enrichment Review Integration Example
 * 
 * This example demonstrates how to integrate the enhanced enrichment review UI
 * with SMS/MMS support into your application.
 */

// Example 1: Initialize and load enrichments on page load
document.addEventListener('DOMContentLoaded', async () => {
  // Initialize the enrichment review component
  const enrichmentReview = initEnrichmentReview();
  
  // Get current user ID from your auth system
  const userId = getCurrentUserId(); // Replace with your auth implementation
  
  // Load all pending enrichments
  await enrichmentReview.loadEnrichmentItems(userId, 'all');
});

// Example 2: Load enrichments when user navigates to enrichment page
async function showEnrichmentReviewPage() {
  const userId = getCurrentUserId();
  const enrichmentReview = initEnrichmentReview();
  
  // Load enrichments with default filter (all sources)
  await enrichmentReview.loadEnrichmentItems(userId, 'all');
  
  // Show the container
  const container = document.getElementById('enrichment-review-container');
  if (container) {
    container.style.display = 'block';
  }
}

// Example 3: Filter enrichments by source
async function filterEnrichmentsBySource(source) {
  const userId = getCurrentUserId();
  const enrichmentReview = window.enrichmentReview;
  
  if (!enrichmentReview) {
    console.error('Enrichment review not initialized');
    return;
  }
  
  // Load enrichments filtered by source
  await enrichmentReview.loadEnrichmentItems(userId, source);
}

// Example 4: Handle enrichment notifications
// When a new SMS/MMS enrichment is created, notify the user
function notifyNewEnrichment(enrichmentData) {
  const { source, sourceMetadata } = enrichmentData;
  
  let message = 'New enrichment received';
  
  if (source === 'sms') {
    message = '💬 New SMS enrichment received';
  } else if (source === 'mms') {
    const mediaType = sourceMetadata?.mediaType || '';
    if (mediaType.includes('audio')) {
      message = '🎤 New voice note enrichment received';
    } else if (mediaType.includes('image')) {
      message = '📷 New image enrichment received';
    } else if (mediaType.includes('video')) {
      message = '🎥 New video enrichment received';
    }
  }
  
  // Show notification
  showToast(message, 'info');
  
  // Optionally reload enrichments
  const enrichmentReview = window.enrichmentReview;
  if (enrichmentReview) {
    const userId = getCurrentUserId();
    enrichmentReview.loadEnrichmentItems(userId, enrichmentReview.currentFilter);
  }
}

// Example 5: Integrate with voice notes workflow
async function handleVoiceNoteComplete(voiceNoteId) {
  // After a voice note is processed, load enrichments
  const userId = getCurrentUserId();
  const enrichmentReview = window.enrichmentReview;
  
  if (enrichmentReview) {
    // Reload enrichments to show new items
    await enrichmentReview.loadEnrichmentItems(userId, 'all');
    
    // Show success message
    showToast('Voice note processed! Review enrichments below.', 'success');
  }
}

// Example 6: Integrate with SMS webhook callback
// When SMS webhook processes a message, notify the UI
function handleSMSEnrichmentCreated(enrichmentIds) {
  console.log(`Created ${enrichmentIds.length} enrichments from SMS`);
  
  // Show notification
  showToast(`📱 ${enrichmentIds.length} new enrichment${enrichmentIds.length !== 1 ? 's' : ''} from SMS`, 'success');
  
  // Reload enrichments
  const enrichmentReview = window.enrichmentReview;
  if (enrichmentReview) {
    const userId = getCurrentUserId();
    enrichmentReview.loadEnrichmentItems(userId, enrichmentReview.currentFilter);
  }
}

// Example 7: Custom enrichment item renderer
// You can customize how enrichment items are displayed
function customizeEnrichmentDisplay() {
  const enrichmentReview = window.enrichmentReview;
  
  if (!enrichmentReview) return;
  
  // Override the renderSourceBadge method for custom styling
  const originalRenderSourceBadge = enrichmentReview.renderSourceBadge.bind(enrichmentReview);
  
  enrichmentReview.renderSourceBadge = function(source, sourceMetadata) {
    // Add custom logic here
    if (source === 'sms' && sourceMetadata?.phoneNumber) {
      // Custom badge for SMS with phone number
      return `<span class="source-badge source-sms">💬 SMS from ${this.maskPhoneNumber(sourceMetadata.phoneNumber)}</span>`;
    }
    
    // Fall back to default rendering
    return originalRenderSourceBadge(source, sourceMetadata);
  };
}

// Example 8: Batch operations on enrichments
async function batchAcceptEnrichmentsBySource(source) {
  const userId = getCurrentUserId();
  
  try {
    // Fetch enrichments for specific source
    const response = await fetch(`/api/enrichment-items?userId=${userId}&source=${source}&status=pending`);
    if (!response.ok) {
      throw new Error('Failed to fetch enrichments');
    }
    
    const enrichments = await response.json();
    
    // Accept all enrichments from this source
    const updatePromises = enrichments.map(item =>
      fetch(`/api/enrichment-items/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, accepted: true })
      })
    );
    
    await Promise.all(updatePromises);
    
    showToast(`Accepted ${enrichments.length} enrichments from ${source}`, 'success');
    
    // Reload enrichments
    const enrichmentReview = window.enrichmentReview;
    if (enrichmentReview) {
      await enrichmentReview.loadEnrichmentItems(userId, enrichmentReview.currentFilter);
    }
  } catch (error) {
    console.error('Error batch accepting enrichments:', error);
    showToast('Failed to accept enrichments', 'error');
  }
}

// Example 9: Monitor enrichment statistics
async function getEnrichmentStatistics(userId) {
  try {
    // Fetch all pending enrichments
    const response = await fetch(`/api/enrichment-items?userId=${userId}&status=pending`);
    if (!response.ok) {
      throw new Error('Failed to fetch enrichments');
    }
    
    const enrichments = await response.json();
    
    // Calculate statistics by source
    const stats = {
      total: enrichments.length,
      web: enrichments.filter(e => e.source === 'web').length,
      sms: enrichments.filter(e => e.source === 'sms').length,
      mms: enrichments.filter(e => e.source === 'mms').length,
      byMediaType: {
        audio: enrichments.filter(e => e.sourceMetadata?.mediaType?.includes('audio')).length,
        image: enrichments.filter(e => e.sourceMetadata?.mediaType?.includes('image')).length,
        video: enrichments.filter(e => e.sourceMetadata?.mediaType?.includes('video')).length
      }
    };
    
    console.log('Enrichment Statistics:', stats);
    return stats;
  } catch (error) {
    console.error('Error fetching enrichment statistics:', error);
    return null;
  }
}

// Example 10: Auto-apply enrichments from trusted sources
async function autoApplyTrustedEnrichments(userId, trustedSources = ['web']) {
  try {
    // Fetch enrichments from trusted sources
    const enrichments = [];
    
    for (const source of trustedSources) {
      const response = await fetch(`/api/enrichment-items?userId=${userId}&source=${source}&status=pending`);
      if (response.ok) {
        const items = await response.json();
        enrichments.push(...items);
      }
    }
    
    if (enrichments.length === 0) {
      console.log('No enrichments to auto-apply');
      return;
    }
    
    // Accept all enrichments
    const updatePromises = enrichments.map(item =>
      fetch(`/api/enrichment-items/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, accepted: true })
      })
    );
    
    await Promise.all(updatePromises);
    
    // Apply enrichments
    const applyResponse = await fetch('/api/enrichment-items/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        enrichmentIds: enrichments.map(e => e.id)
      })
    });
    
    if (!applyResponse.ok) {
      throw new Error('Failed to apply enrichments');
    }
    
    const result = await applyResponse.json();
    console.log(`Auto-applied ${result.appliedCount} enrichments from trusted sources`);
    
    return result;
  } catch (error) {
    console.error('Error auto-applying enrichments:', error);
    return null;
  }
}

// Helper function to get current user ID
// Replace this with your actual authentication implementation
function getCurrentUserId() {
  // Example: Get from localStorage
  return localStorage.getItem('userId') || null;
  
  // Or from a global auth object
  // return window.auth?.userId || null;
  
  // Or from a cookie
  // return getCookie('userId');
}

// Helper function to show toast notifications
// This should match your application's notification system
function showToast(message, type = 'info') {
  // Example implementation
  console.log(`[${type.toUpperCase()}] ${message}`);
  
  // If you have a toast library, use it here
  // toast.show(message, { type });
}

// Export functions for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    showEnrichmentReviewPage,
    filterEnrichmentsBySource,
    notifyNewEnrichment,
    handleVoiceNoteComplete,
    handleSMSEnrichmentCreated,
    batchAcceptEnrichmentsBySource,
    getEnrichmentStatistics,
    autoApplyTrustedEnrichments
  };
}
