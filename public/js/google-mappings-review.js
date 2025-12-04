/**
 * GoogleMappingsReview Component
 * 
 * Displays Google Contacts group mapping review UI
 * Implements Requirements: 15.1, 15.2, 15.3, 15.4, 15.5
 */

class GoogleMappingsReview {
  constructor(container, options = {}) {
    this.container = typeof container === 'string' 
      ? document.getElementById(container) 
      : container;
    this.options = {
      onApprove: null,
      onReject: null,
      onUpdate: null,
      ...options
    };
    
    this.pendingMappings = [];
    this.isVisible = false;
    this.excludedMembers = {}; // Track excluded members per mapping: { mappingId: [memberId1, memberId2] }
    this.membersCache = {}; // Cache loaded members: { mappingId: [members] }
  }

  /**
   * Load pending mappings from API
   * Requirements: 15.1, 15.2
   */
  async loadPendingMappings() {
    try {
      // Get auth token from global scope or localStorage
      const authToken = window.authToken || localStorage.getItem('authToken');
      const API_BASE = window.API_BASE || '/api';
      
      if (!authToken) {
        console.warn('No auth token available for loading mappings');
        return [];
      }

      const response = await fetch(`${API_BASE}/contacts/sync/groups/mappings/pending`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      
      if (!response.ok) {
        throw new Error('Failed to load pending mappings');
      }
      
      const mappings = await response.json();
      this.pendingMappings = mappings;
      return mappings;
    } catch (error) {
      console.error('Error loading pending mappings:', error);
      return [];
    }
  }

  /**
   * Check if there are pending mappings
   * Requirements: 15.1
   */
  async hasPendingMappings() {
    const mappings = await this.loadPendingMappings();
    return mappings.length > 0;
  }

  /**
   * Render the mappings review UI
   * Requirements: 15.2, 15.4
   */
  async render() {
    if (!this.container) {
      console.error('GoogleMappingsReview: Container not found');
      return;
    }

    await this.loadPendingMappings();

    // Hide if no pending mappings (Requirement 15.4)
    if (this.pendingMappings.length === 0) {
      this.hide();
      return;
    }

    this.isVisible = true;

    const html = `
      <div class="google-mappings-review">
        <div class="mappings-header">
          <h3>
            <span style="margin-right: 8px;">🔗</span>
            Google Contact Groups Review
          </h3>
          <span class="pending-badge">${this.pendingMappings.length} Pending</span>
        </div>
        
        <p class="mappings-description">
          Review these suggestions to decide how to map your Google Contact groups to CatchUp groups.
        </p>
        
        <div class="mappings-list">
          ${this.pendingMappings.map(mapping => this.renderMappingCard(mapping)).join('')}
        </div>
      </div>
    `;

    this.container.innerHTML = html;
    this.attachEventListeners();
  }

  /**
   * Render individual mapping card
   * Requirements: 15.2
   */
  renderMappingCard(mapping) {
    // Determine confidence color
    let confidenceColor = '#6b7280';
    if (mapping.confidenceScore >= 0.8) {
      confidenceColor = '#10b981';
    } else if (mapping.confidenceScore >= 0.6) {
      confidenceColor = '#f59e0b';
    } else {
      confidenceColor = '#ef4444';
    }
    
    return `
      <div class="mapping-card" data-mapping-id="${mapping.id}">
        <div class="mapping-header">
          <div class="mapping-info">
            <h4 class="mapping-title">${this.escapeHtml(mapping.googleName)}</h4>
            <div class="mapping-meta">
              <span class="member-count" onclick="toggleMappingMembers('${mapping.id}')" style="cursor: pointer; text-decoration: underline;">
                👥 ${mapping.memberCount} members
              </span>
              ${mapping.confidenceScore ? `
                <span class="confidence-score" style="color: ${confidenceColor};">
                  ${Math.round(mapping.confidenceScore * 100)}% confidence
                </span>
              ` : ''}
            </div>
          </div>
        </div>
        
        <!-- Members Section (collapsible) -->
        <div id="mapping-members-${mapping.id}" class="mapping-members" style="display: none;"></div>
        
        ${mapping.suggestedAction ? `
          <div class="suggested-action">
            <div class="action-label">SUGGESTED ACTION</div>
            <div class="action-value">
              ${mapping.suggestedAction === 'create_new' ? '🆕 Create New Group' : '🔗 Map to Existing Group'}
            </div>
            ${mapping.suggestedGroupName ? `
              <div class="action-detail">
                ${mapping.suggestedAction === 'create_new' ? 'Name:' : 'Existing group:'} 
                <strong>${this.escapeHtml(mapping.suggestedGroupName)}</strong>
              </div>
            ` : ''}
          </div>
        ` : ''}
        
        ${mapping.suggestionReason ? `
          <div class="suggestion-reason">
            <div class="reason-label">WHY THIS SUGGESTION?</div>
            <div class="reason-text">${this.escapeHtml(mapping.suggestionReason)}</div>
          </div>
        ` : ''}
        
        <div class="mapping-actions">
          <button class="btn-approve" data-mapping-id="${mapping.id}">
            ✓ Approve
          </button>
          <button class="btn-reject" data-mapping-id="${mapping.id}">
            ✗ Reject
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Approve button handlers
    this.container.querySelectorAll('.btn-approve').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const mappingId = e.target.dataset.mappingId;
        await this.approveMapping(mappingId);
      });
    });

    // Reject button handlers
    this.container.querySelectorAll('.btn-reject').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const mappingId = e.target.dataset.mappingId;
        await this.rejectMapping(mappingId);
      });
    });
  }

  /**
   * Approve a mapping
   * Requirements: 15.5
   */
  async approveMapping(mappingId) {
    try {
      const authToken = window.authToken || localStorage.getItem('authToken');
      const API_BASE = window.API_BASE || '/api';
      
      if (!authToken) {
        throw new Error('Not authenticated');
      }

      // Show loading state
      const card = this.container.querySelector(`[data-mapping-id="${mappingId}"]`);
      if (card) {
        card.style.opacity = '0.6';
        card.style.pointerEvents = 'none';
      }

      // Get excluded members (unchecked checkboxes)
      const excludedMembers = getExcludedMembers(mappingId);

      const response = await fetch(`${API_BASE}/contacts/sync/groups/mappings/${mappingId}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ excludedMembers })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to approve mapping');
      }
      
      const result = await response.json();
      
      // Show success message
      if (typeof showToast === 'function') {
        const membersAdded = result.membershipsUpdated || 0;
        showToast(`✓ Group approved! ${membersAdded} members added.`, 'success');
      }

      // Remove the mapping from pending list
      this.pendingMappings = this.pendingMappings.filter(m => m.id !== mappingId);

      // Trigger callbacks
      if (this.options.onApprove) {
        this.options.onApprove(mappingId, result);
      }
      if (this.options.onUpdate) {
        this.options.onUpdate();
      }

      // Re-render (will hide if no more pending)
      await this.render();

    } catch (error) {
      console.error('Error approving mapping:', error);
      
      // Restore card state
      const card = this.container.querySelector(`[data-mapping-id="${mappingId}"]`);
      if (card) {
        card.style.opacity = '1';
        card.style.pointerEvents = 'auto';
      }

      if (typeof showToast === 'function') {
        showToast(`Failed to approve mapping: ${error.message}`, 'error');
      }
    }
  }

  /**
   * Reject a mapping
   * Requirements: 15.5
   */
  async rejectMapping(mappingId) {
    try {
      const authToken = window.authToken || localStorage.getItem('authToken');
      const API_BASE = window.API_BASE || '/api';
      
      if (!authToken) {
        throw new Error('Not authenticated');
      }

      // Show loading state
      const card = this.container.querySelector(`[data-mapping-id="${mappingId}"]`);
      if (card) {
        card.style.opacity = '0.6';
        card.style.pointerEvents = 'none';
      }

      const response = await fetch(`${API_BASE}/contacts/sync/groups/mappings/${mappingId}/reject`, {
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
      
      // Show success message
      if (typeof showToast === 'function') {
        showToast('Group mapping rejected', 'success');
      }

      // Remove the mapping from pending list
      this.pendingMappings = this.pendingMappings.filter(m => m.id !== mappingId);

      // Trigger callbacks
      if (this.options.onReject) {
        this.options.onReject(mappingId);
      }
      if (this.options.onUpdate) {
        this.options.onUpdate();
      }

      // Re-render (will hide if no more pending)
      await this.render();

    } catch (error) {
      console.error('Error rejecting mapping:', error);
      
      // Restore card state
      const card = this.container.querySelector(`[data-mapping-id="${mappingId}"]`);
      if (card) {
        card.style.opacity = '1';
        card.style.pointerEvents = 'auto';
      }

      if (typeof showToast === 'function') {
        showToast(`Failed to reject mapping: ${error.message}`, 'error');
      }
    }
  }

  /**
   * Hide the review UI
   * Requirements: 15.3, 15.4
   */
  hide() {
    if (this.container) {
      this.container.innerHTML = '';
      this.container.style.display = 'none';
    }
    this.isVisible = false;
  }

  /**
   * Show the review UI
   * Requirements: 15.2
   */
  show() {
    if (this.container) {
      this.container.style.display = 'block';
    }
    this.isVisible = true;
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
}

/**
 * Toggle display of mapping members
 * This function is called from the rendered HTML
 */
async function toggleMappingMembers(mappingId) {
  const container = document.getElementById(`mapping-members-${mappingId}`);
  
  if (!container) {
    return;
  }
  
  if (container.style.display === 'none') {
    // Show members - fetch if not already loaded
    if (!container.dataset.loaded) {
      container.innerHTML = '<div style="text-align: center; padding: 20px; color: #6b7280;">Loading members...</div>';
      container.style.display = 'block';
      
      try {
        const authToken = window.authToken || localStorage.getItem('authToken');
        const API_BASE = window.API_BASE || '/api';
        
        const response = await fetch(`${API_BASE}/contacts/sync/groups/mappings/${mappingId}/members`, {
          headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (!response.ok) {
          throw new Error('Failed to load members');
        }
        
        const data = await response.json();
        container.innerHTML = renderMappingMembers(mappingId, data.members);
        container.dataset.loaded = 'true';
      } catch (error) {
        console.error('Error loading mapping members:', error);
        container.innerHTML = `<div style="color: #ef4444; padding: 10px;">Failed to load members</div>`;
      }
    } else {
      container.style.display = 'block';
    }
  } else {
    container.style.display = 'none';
  }
}

/**
 * Render mapping members list with selection checkboxes
 */
function renderMappingMembers(mappingId, members) {
  if (members.length === 0) {
    return `
      <div style="padding: 12px; text-align: center;">
        <div style="color: var(--text-secondary, #6b7280); margin-bottom: 8px;">
          No membership data available yet
        </div>
        <div style="font-size: 12px; color: var(--text-secondary, #6b7280);">
          Click "Sync Now" in Preferences to populate member data
        </div>
      </div>
    `;
  }
  
  return `
    <div class="members-header">
      <div class="members-title">MEMBERS (${members.length})</div>
      <div class="members-actions">
        <button class="btn-select-all" onclick="selectAllMembers('${mappingId}')">Select All</button>
        <button class="btn-deselect-all" onclick="deselectAllMembers('${mappingId}')">Deselect All</button>
      </div>
    </div>
    <div class="members-list">
      ${members.map(member => `
        <div class="member-card" data-member-id="${member.id}" data-mapping-id="${mappingId}">
          <input 
            type="checkbox" 
            class="member-checkbox" 
            data-member-id="${member.id}"
            data-mapping-id="${mappingId}"
            checked
            onchange="toggleMemberSelection('${mappingId}', '${member.id}')"
          />
          <div class="member-avatar">
            ${member.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
          </div>
          <div class="member-info">
            <div class="member-name">${escapeHtml(member.name)}</div>
            <div class="member-contact">
              ${member.email || member.phone || member.location || 'No contact info'}
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

/**
 * Escape HTML helper function
 */
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Toggle member selection
 */
function toggleMemberSelection(mappingId, memberId) {
  const checkbox = document.querySelector(
    `.member-checkbox[data-mapping-id="${mappingId}"][data-member-id="${memberId}"]`
  );
  const memberCard = document.querySelector(
    `.member-card[data-mapping-id="${mappingId}"][data-member-id="${memberId}"]`
  );
  
  if (checkbox && memberCard) {
    if (checkbox.checked) {
      memberCard.classList.remove('deselected');
    } else {
      memberCard.classList.add('deselected');
    }
  }
}

/**
 * Select all members for a mapping
 */
function selectAllMembers(mappingId) {
  const checkboxes = document.querySelectorAll(
    `.member-checkbox[data-mapping-id="${mappingId}"]`
  );
  const cards = document.querySelectorAll(
    `.member-card[data-mapping-id="${mappingId}"]`
  );
  
  checkboxes.forEach(checkbox => {
    checkbox.checked = true;
  });
  
  cards.forEach(card => {
    card.classList.remove('deselected');
  });
}

/**
 * Deselect all members for a mapping
 */
function deselectAllMembers(mappingId) {
  const checkboxes = document.querySelectorAll(
    `.member-checkbox[data-mapping-id="${mappingId}"]`
  );
  const cards = document.querySelectorAll(
    `.member-card[data-mapping-id="${mappingId}"]`
  );
  
  checkboxes.forEach(checkbox => {
    checkbox.checked = false;
  });
  
  cards.forEach(card => {
    card.classList.add('deselected');
  });
}

/**
 * Get excluded members for a mapping
 */
function getExcludedMembers(mappingId) {
  const checkboxes = document.querySelectorAll(
    `.member-checkbox[data-mapping-id="${mappingId}"]`
  );
  const excluded = [];
  
  checkboxes.forEach(checkbox => {
    if (!checkbox.checked) {
      excluded.push(checkbox.dataset.memberId);
    }
  });
  
  return excluded;
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { 
    GoogleMappingsReview,
    toggleMemberSelection,
    selectAllMembers,
    deselectAllMembers,
    getExcludedMembers
  };
}
