// Google Contacts Integration UI
// Handles the Google Contacts settings interface with one-way sync notice

/**
 * Load and display Google Contacts connection status
 * Requirements: 1.1, 4.1, 7.1, 8.1, 8.2, 8.3, 15.1, 15.6
 */
async function loadGoogleContactsStatus() {
    try {
        const response = await fetch(`${API_BASE}/contacts/oauth/status`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load Google Contacts status');
        }
        
        const status = await response.json();
        return status;
    } catch (error) {
        console.error('Error loading Google Contacts status:', error);
        return {
            connected: false,
            email: null,
            lastSyncAt: null,
            totalContactsSynced: 0,
            lastSyncError: null,
            autoSyncEnabled: false
        };
    }
}

/**
 * Render Google Contacts settings card
 * Requirements: 1.1, 4.1, 7.1, 8.1, 8.2, 8.3, 15.1, 15.6
 */
function renderGoogleContactsCard(status) {
    const connected = status.connected;
    
    return `
        <div class="card">
            <!-- One-Way Sync Notice -->
            <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 16px; border-radius: 6px; margin-bottom: 16px;">
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                    <span style="font-size: 24px;">ℹ️</span>
                    <h4 style="margin: 0; font-size: 16px; font-weight: 600;">One-Way Sync (Read-Only)</h4>
                </div>
                <p style="margin: 0; font-size: 13px; line-height: 1.5; opacity: 0.95;">
                    CatchUp imports your contacts from Google but <strong>never modifies your Google Contacts</strong>. 
                    All edits you make in CatchUp stay local and won't affect your Google account.
                </p>
            </div>
            
            <!-- Connection Status Header -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <img src="https://www.gstatic.com/marketing-cms/assets/images/ff/21/95f22bf94e35bea3ec097d3f4720/contacts.png" alt="Google Contacts" style="width: 24px; height: 24px;">
                    <h4 style="margin: 0;">Google Contacts</h4>
                </div>
                <span style="font-size: 12px; padding: 4px 8px; border-radius: 4px; ${connected ? 'background: var(--status-success-bg); color: var(--status-success-text);' : 'background: var(--status-error-bg); color: var(--status-error-text);'}">
                    ${connected ? '✓ Connected (Read-Only)' : 'Not Connected'}
                </span>
            </div>
            
            <p style="margin: 0 0 16px 0; font-size: 13px; color: var(--text-secondary);">
                Sync your Google Contacts to automatically import and manage your relationships.
            </p>
            
            ${connected ? `
                <!-- Connected State -->
                ${status.email ? `
                    <div style="margin-bottom: 12px; padding: 10px; background: var(--bg-secondary); border-radius: 4px; border-left: 3px solid var(--status-success-text);">
                        <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 4px;">Connected as:</div>
                        <div style="font-weight: 600; color: var(--text-primary);">${status.email}</div>
                    </div>
                ` : ''}
                
                <!-- Sync Status -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
                    <div style="padding: 10px; background: var(--bg-secondary); border-radius: 4px;">
                        <div style="font-size: 11px; color: var(--text-secondary); margin-bottom: 4px; font-weight: 600;">LAST SYNC</div>
                        <div style="font-size: 13px; font-weight: 600; color: var(--text-primary);">
                            ${status.lastSyncAt ? formatRelativeTime(status.lastSyncAt) : 'Never'}
                        </div>
                    </div>
                    <div style="padding: 10px; background: var(--bg-secondary); border-radius: 4px;">
                        <div style="font-size: 11px; color: var(--text-secondary); margin-bottom: 4px; font-weight: 600;">CONTACTS SYNCED</div>
                        <div style="font-size: 13px; font-weight: 600; color: var(--text-primary);">
                            ${status.totalContactsSynced || 0}
                        </div>
                    </div>
                </div>
                
                ${status.lastSyncError ? `
                    <div style="margin-bottom: 12px; padding: 10px; background: var(--status-error-bg); border-radius: 4px; border-left: 3px solid var(--status-error-text);">
                        <div style="font-size: 12px; font-weight: 600; color: var(--status-error-text); margin-bottom: 4px;">Sync Error</div>
                        <div style="font-size: 12px; color: var(--text-secondary);">${status.lastSyncError}</div>
                    </div>
                ` : ''}
                
                <!-- Auto-sync Status -->
                <div style="margin-bottom: 16px; padding: 10px; background: var(--bg-secondary); border-radius: 4px; display: flex; align-items: center; justify-content: space-between;">
                    <div>
                        <div style="font-size: 12px; font-weight: 600; color: var(--text-primary); margin-bottom: 2px;">Automatic Sync</div>
                        <div style="font-size: 11px; color: var(--text-secondary);">Daily synchronization at midnight</div>
                    </div>
                    <span style="font-size: 12px; padding: 4px 8px; border-radius: 4px; ${status.autoSyncEnabled ? 'background: var(--status-success-bg); color: var(--status-success-text);' : 'background: var(--status-warning-bg); color: var(--status-warning-text);'}">
                        ${status.autoSyncEnabled ? 'Enabled' : 'Disabled'}
                    </span>
                </div>
                
                <!-- Safety Notice -->
                <div style="margin-bottom: 16px; padding: 10px; background: rgba(34, 197, 94, 0.1); border-radius: 4px; border-left: 3px solid var(--status-success-text);">
                    <div style="font-size: 12px; color: var(--text-primary); display: flex; align-items: center; gap: 6px;">
                        <span>✓</span>
                        <strong>Your Google Contacts remain unchanged</strong>
                    </div>
                </div>
                
                <!-- Action Buttons -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <button onclick="syncGoogleContactsNow()" id="sync-contacts-btn" style="width: 100%;">
                        Sync Now
                    </button>
                    <button onclick="disconnectGoogleContacts()" class="secondary" style="width: 100%;">
                        Disconnect
                    </button>
                </div>
            ` : `
                <!-- Not Connected State -->
                <div style="margin-bottom: 16px; padding: 12px; background: var(--bg-secondary); border-radius: 4px;">
                    <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 8px;">
                        <strong>What you get:</strong>
                    </div>
                    <ul style="margin: 0; padding-left: 20px; font-size: 12px; color: var(--text-secondary); line-height: 1.6;">
                        <li>Automatic import of all your contacts</li>
                        <li>Daily synchronization of changes</li>
                        <li>Contact groups and organization</li>
                        <li>100% safe - we never modify your Google data</li>
                    </ul>
                </div>
                
                <!-- Safety Assurance -->
                <div style="margin-bottom: 16px; padding: 10px; background: rgba(34, 197, 94, 0.1); border-radius: 4px; border-left: 3px solid var(--status-success-text);">
                    <div style="font-size: 12px; color: var(--text-primary); display: flex; align-items: center; gap: 6px;">
                        <span>✓</span>
                        <strong>Safe to connect without risk of data loss</strong>
                    </div>
                </div>
                
                <button onclick="connectGoogleContacts()" style="width: 100%;">
                    Connect Google Contacts
                </button>
            `}
        </div>
    `;
}

/**
 * Connect Google Contacts - initiate OAuth flow
 * Requirements: 1.1
 */
async function connectGoogleContacts() {
    try {
        const response = await fetch(`${API_BASE}/contacts/oauth/authorize`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (!response.ok) {
            throw new Error('Failed to get authorization URL');
        }
        
        const data = await response.json();
        
        // Redirect to Google OAuth consent screen
        window.location.href = data.authUrl;
    } catch (error) {
        console.error('Error connecting Google Contacts:', error);
        showToast('Failed to connect Google Contacts', 'error');
    }
}

/**
 * Sync Google Contacts now - trigger manual sync
 * Requirements: 4.1, 4.2, 4.3, 4.4, 15.6
 */
async function syncGoogleContactsNow() {
    const button = document.getElementById('sync-contacts-btn');
    const originalText = button.textContent;
    
    try {
        button.disabled = true;
        button.innerHTML = '<span class="loading-spinner"></span> Syncing...';
        
        // Show loading indicator
        const loadingToastId = showToast('Starting sync...', 'loading');
        
        const response = await fetch(`${API_BASE}/contacts/sync/incremental`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Sync failed');
        }
        
        const result = await response.json();
        
        // Hide loading toast
        if (loadingToastId && typeof hideToast === 'function') {
            hideToast(loadingToastId);
        }
        
        // Show detailed success message with results
        let message = 'Sync queued successfully!';
        if (result.message) {
            message = result.message;
        }
        
        showToast(message, 'success');
        
        // Show confirmation that Google Contacts remain unchanged
        setTimeout(() => {
            showToast('✓ Your Google Contacts remain unchanged', 'info');
        }, 2000);
        
        // Poll for sync completion and show results
        if (result.jobId) {
            pollSyncStatus(result.jobId);
        } else {
            // Reload the status to show updated information
            setTimeout(() => {
                loadPreferences();
            }, 3000);
        }
        
    } catch (error) {
        console.error('Error syncing Google Contacts:', error);
        
        // Show error with actionable steps
        let errorMessage = `Sync failed: ${error.message}`;
        if (error.message.includes('not connected')) {
            errorMessage = 'Please connect your Google Contacts account first';
        } else if (error.message.includes('already in progress')) {
            errorMessage = 'A sync is already in progress. Please wait for it to complete.';
        }
        
        showToast(errorMessage, 'error');
    } finally {
        button.disabled = false;
        button.textContent = originalText;
    }
}

/**
 * Poll sync status and show results when complete
 * Requirements: 4.2, 4.3, 4.4
 */
async function pollSyncStatus(jobId) {
    let attempts = 0;
    const maxAttempts = 60; // Poll for up to 5 minutes (60 * 5 seconds)
    
    const poll = async () => {
        try {
            const response = await fetch(`${API_BASE}/contacts/sync/status`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            
            if (!response.ok) {
                throw new Error('Failed to get sync status');
            }
            
            const status = await response.json();
            
            // Check if sync is complete
            if (!status.syncInProgress) {
                // Sync completed, show results
                if (status.lastSyncStatus === 'success') {
                    const contactsUpdated = status.totalContactsSynced || 0;
                    showToast(`✓ Sync completed! ${contactsUpdated} contacts synced`, 'success');
                } else if (status.lastSyncStatus === 'failed' && status.lastSyncError) {
                    showToast(`Sync failed: ${status.lastSyncError}`, 'error');
                }
                
                // Reload preferences to show updated status
                setTimeout(() => {
                    loadPreferences();
                }, 1000);
                
                return;
            }
            
            // Continue polling if not complete
            attempts++;
            if (attempts < maxAttempts) {
                setTimeout(poll, 5000); // Poll every 5 seconds
            } else {
                showToast('Sync is taking longer than expected. Check back later.', 'info');
                setTimeout(() => {
                    loadPreferences();
                }, 1000);
            }
        } catch (error) {
            console.error('Error polling sync status:', error);
            // Stop polling on error
        }
    };
    
    // Start polling after a short delay
    setTimeout(poll, 3000);
}

/**
 * Disconnect Google Contacts
 * Requirements: 7.1
 */
async function disconnectGoogleContacts() {
    if (!confirm('Are you sure you want to disconnect Google Contacts? Your existing contacts will be preserved, but automatic syncing will stop.')) {
        return;
    }
    
    try {
        showToast('Disconnecting...', 'loading');
        
        const response = await fetch(`${API_BASE}/contacts/oauth/disconnect`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (!response.ok) {
            throw new Error('Failed to disconnect');
        }
        
        showToast('Google Contacts disconnected successfully', 'success');
        
        // Reload preferences to show disconnected state
        setTimeout(() => {
            loadPreferences();
        }, 1000);
        
    } catch (error) {
        console.error('Error disconnecting Google Contacts:', error);
        showToast('Failed to disconnect Google Contacts', 'error');
    }
}

/**
 * Handle OAuth callback for Google Contacts
 * Requirements: 1.1, 2.1
 */
async function handleGoogleContactsOAuthCallback() {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    
    if (!code) {
        return;
    }
    
    // Check if this is a Google Contacts callback (state should indicate this)
    // For now, we'll check if we're already handling calendar callback
    if (window.location.search.includes('calendar')) {
        return;
    }
    
    try {
        showToast('Connecting Google Contacts...', 'loading');
        
        const response = await fetch(`${API_BASE}/contacts/oauth/callback?code=${code}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (!response.ok) {
            throw new Error('Failed to complete OAuth flow');
        }
        
        const result = await response.json();
        
        showToast('Google Contacts connected successfully! Starting initial sync...', 'success');
        
        // Clear the URL parameters
        window.history.replaceState({}, document.title, window.location.pathname);
        
        // Navigate to preferences page to show the connection
        setTimeout(() => {
            navigateTo('preferences');
        }, 2000);
        
    } catch (error) {
        console.error('Error handling OAuth callback:', error);
        showToast('Failed to connect Google Contacts', 'error');
        
        // Clear the URL parameters
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
function formatRelativeTime(timestamp) {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now - then;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return then.toLocaleDateString();
}

// Export functions for use in app.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        loadGoogleContactsStatus,
        renderGoogleContactsCard,
        connectGoogleContacts,
        syncGoogleContactsNow,
        disconnectGoogleContacts,
        handleGoogleContactsOAuthCallback
    };
}


/**
 * Load and display group mapping suggestions
 * Requirements: 6.5, 6.6, 6.7
 */
async function loadGroupMappingSuggestions() {
    try {
        const response = await fetch(`${API_BASE}/contacts/groups/mappings/pending`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load group mappings');
        }
        
        const mappings = await response.json();
        return mappings;
    } catch (error) {
        console.error('Error loading group mappings:', error);
        return [];
    }
}

/**
 * Load all group mappings (all statuses)
 * Requirements: 6.5
 */
async function loadAllGroupMappings() {
    try {
        const response = await fetch(`${API_BASE}/contacts/groups/mappings`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load group mappings');
        }
        
        const mappings = await response.json();
        return mappings;
    } catch (error) {
        console.error('Error loading group mappings:', error);
        return [];
    }
}

/**
 * Render group mapping review section
 * Requirements: 6.5, 6.6, 6.7
 */
function renderGroupMappingReview(pendingMappings, approvedMappings, rejectedMappings) {
    return `
        <div style="margin-top: 30px;">
            <h3 style="margin-bottom: 20px; border-bottom: 2px solid var(--border-primary); padding-bottom: 10px;">
                Google Contact Groups
            </h3>
            
            ${pendingMappings.length > 0 ? `
                <!-- Pending Mappings -->
                <div style="margin-bottom: 30px;">
                    <h4 style="margin-bottom: 15px; color: var(--text-primary); display: flex; align-items: center; gap: 8px;">
                        <span style="background: var(--status-warning-bg); color: var(--status-warning-text); padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600;">
                            ${pendingMappings.length} PENDING
                        </span>
                        Pending Group Mappings
                    </h4>
                    <p style="font-size: 13px; color: var(--text-secondary); margin-bottom: 15px;">
                        Review these suggestions to decide how to map your Google Contact groups to CatchUp groups.
                    </p>
                    
                    <div style="display: grid; gap: 15px;">
                        ${pendingMappings.map(mapping => renderGroupMappingCard(mapping, 'pending')).join('')}
                    </div>
                </div>
            ` : `
                <div style="padding: 20px; background: var(--bg-secondary); border-radius: 6px; text-align: center; margin-bottom: 30px;">
                    <p style="color: var(--text-secondary); margin: 0;">
                        ✓ No pending group mappings. All groups have been reviewed.
                    </p>
                </div>
            `}
            
            ${approvedMappings.length > 0 ? `
                <!-- Approved Mappings -->
                <div style="margin-bottom: 30px;">
                    <h4 style="margin-bottom: 15px; color: var(--text-primary); display: flex; align-items: center; gap: 8px;">
                        <span style="background: var(--status-success-bg); color: var(--status-success-text); padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600;">
                            ${approvedMappings.length} APPROVED
                        </span>
                        Approved Mappings
                    </h4>
                    
                    <div style="display: grid; gap: 12px;">
                        ${approvedMappings.map(mapping => renderGroupMappingCard(mapping, 'approved')).join('')}
                    </div>
                </div>
            ` : ''}
            
            ${rejectedMappings.length > 0 ? `
                <!-- Rejected Mappings -->
                <div style="margin-bottom: 20px;">
                    <h4 style="margin-bottom: 15px; color: var(--text-primary); display: flex; align-items: center; gap: 8px;">
                        <span style="background: var(--status-error-bg); color: var(--status-error-text); padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600;">
                            ${rejectedMappings.length} REJECTED
                        </span>
                        Rejected Mappings
                    </h4>
                    
                    <div style="display: grid; gap: 12px;">
                        ${rejectedMappings.map(mapping => renderGroupMappingCard(mapping, 'rejected')).join('')}
                    </div>
                </div>
            ` : ''}
        </div>
    `;
}

/**
 * Render individual group mapping card
 * Requirements: 6.5, 6.6, 6.7
 */
function renderGroupMappingCard(mapping, status) {
    const isPending = status === 'pending';
    const isApproved = status === 'approved';
    const isRejected = status === 'rejected';
    
    // Determine confidence color
    let confidenceColor = 'var(--text-secondary)';
    if (mapping.confidenceScore >= 0.8) {
        confidenceColor = 'var(--status-success-text)';
    } else if (mapping.confidenceScore >= 0.6) {
        confidenceColor = 'var(--status-warning-text)';
    } else {
        confidenceColor = 'var(--status-error-text)';
    }
    
    return `
        <div class="card" style="border-left: 4px solid ${isPending ? 'var(--status-warning-text)' : isApproved ? 'var(--status-success-text)' : 'var(--status-error-text)'};">
            <!-- Header -->
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
                <div style="flex: 1;">
                    <h4 style="margin: 0 0 6px 0; color: var(--text-primary); font-size: 16px;">
                        ${escapeHtml(mapping.googleName)}
                    </h4>
                    <div style="display: flex; gap: 12px; font-size: 12px; color: var(--text-secondary);">
                        <span>👥 ${mapping.memberCount} members</span>
                        ${mapping.confidenceScore ? `
                            <span style="color: ${confidenceColor}; font-weight: 600;">
                                ${Math.round(mapping.confidenceScore * 100)}% confidence
                            </span>
                        ` : ''}
                    </div>
                </div>
                
                ${!isPending ? `
                    <span style="font-size: 11px; padding: 4px 8px; border-radius: 4px; font-weight: 600; white-space: nowrap; ${
                        isApproved 
                            ? 'background: var(--status-success-bg); color: var(--status-success-text);' 
                            : 'background: var(--status-error-bg); color: var(--status-error-text);'
                    }">
                        ${isApproved ? '✓ APPROVED' : '✗ REJECTED'}
                    </span>
                ` : ''}
            </div>
            
            <!-- Suggested Action -->
            ${mapping.suggestedAction ? `
                <div style="margin-bottom: 12px; padding: 10px; background: var(--bg-secondary); border-radius: 4px;">
                    <div style="font-size: 11px; color: var(--text-secondary); margin-bottom: 4px; font-weight: 600;">
                        SUGGESTED ACTION
                    </div>
                    <div style="font-size: 13px; color: var(--text-primary); font-weight: 600;">
                        ${mapping.suggestedAction === 'create_new' ? '🆕 Create New Group' : '🔗 Map to Existing Group'}
                    </div>
                    ${mapping.suggestedGroupName ? `
                        <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">
                            ${mapping.suggestedAction === 'create_new' ? 'Name:' : 'Existing group:'} 
                            <strong>${escapeHtml(mapping.suggestedGroupName)}</strong>
                        </div>
                    ` : ''}
                </div>
            ` : ''}
            
            <!-- Suggestion Reason -->
            ${mapping.suggestionReason ? `
                <div style="margin-bottom: 12px; padding: 10px; background: rgba(59, 130, 246, 0.1); border-radius: 4px; border-left: 3px solid var(--color-primary);">
                    <div style="font-size: 11px; color: var(--text-secondary); margin-bottom: 4px; font-weight: 600;">
                        WHY THIS SUGGESTION?
                    </div>
                    <div style="font-size: 12px; color: var(--text-primary);">
                        ${escapeHtml(mapping.suggestionReason)}
                    </div>
                </div>
            ` : ''}
            
            <!-- Actions -->
            ${isPending ? `
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 12px;">
                    <button onclick="approveGroupMapping('${mapping.id}')" style="width: 100%; background: var(--status-success-text);">
                        ✓ Approve
                    </button>
                    <button onclick="rejectGroupMapping('${mapping.id}')" class="secondary" style="width: 100%;">
                        ✗ Reject
                    </button>
                </div>
            ` : ''}
        </div>
    `;
}

/**
 * Approve a group mapping suggestion
 * Requirements: 6.6
 */
async function approveGroupMapping(mappingId) {
    try {
        showToast('Approving mapping...', 'loading');
        
        const response = await fetch(`${API_BASE}/contacts/groups/mappings/${mappingId}/approve`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to approve mapping');
        }
        
        const result = await response.json();
        
        showToast('Group mapping approved successfully!', 'success');
        
        // Reload preferences to show updated mappings
        setTimeout(() => {
            loadPreferences();
        }, 1000);
        
    } catch (error) {
        console.error('Error approving group mapping:', error);
        showToast(`Failed to approve mapping: ${error.message}`, 'error');
    }
}

/**
 * Reject a group mapping suggestion
 * Requirements: 6.7
 */
async function rejectGroupMapping(mappingId) {
    try {
        showToast('Rejecting mapping...', 'loading');
        
        const response = await fetch(`${API_BASE}/contacts/groups/mappings/${mappingId}/reject`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to reject mapping');
        }
        
        showToast('Group mapping rejected', 'success');
        
        // Reload preferences to show updated mappings
        setTimeout(() => {
            loadPreferences();
        }, 1000);
        
    } catch (error) {
        console.error('Error rejecting group mapping:', error);
        showToast(`Failed to reject mapping: ${error.message}`, 'error');
    }
}

// Export additional functions
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ...module.exports,
        loadGroupMappingSuggestions,
        loadAllGroupMappings,
        renderGroupMappingReview,
        approveGroupMapping,
        rejectGroupMapping
    };
}
