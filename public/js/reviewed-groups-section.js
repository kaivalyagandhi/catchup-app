/**
 * Reviewed Groups Section Component
 * 
 * Displays accepted and rejected Google Contact group mappings
 * Requirements: Groups & Preferences UI Improvements - 2.1-2.8
 */

class ReviewedGroupsSection {
  constructor(container) {
    this.container = container;
    this.isExpanded = this.loadExpandedState();
    this.mappings = [];
  }

  /**
   * Render the reviewed groups section
   */
  async render() {
    await this.fetchReviewedMappings();

    if (this.mappings.length === 0) {
      this.container.innerHTML = '';
      return;
    }

    const acceptedMappings = this.mappings.filter((m) => m.status === 'approved');
    const rejectedMappings = this.mappings.filter((m) => m.status === 'rejected');

    this.container.innerHTML = `
      <div class="reviewed-groups-section ${this.isExpanded ? '' : 'collapsed'}" 
           id="reviewed-groups-section"
           role="region"
           aria-labelledby="reviewed-groups-heading">
        <div class="reviewed-groups-header" 
             role="button"
             tabindex="0"
             aria-expanded="${this.isExpanded}"
             aria-controls="reviewed-groups-content"
             onclick="window.reviewedGroupsSection.toggleExpanded()"
             onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();window.reviewedGroupsSection.toggleExpanded();}">
          <h3 id="reviewed-groups-heading">
            <span class="expand-icon" aria-hidden="true">${this.isExpanded ? '▼' : '▶'}</span>
            Reviewed Groups
            <span class="count-badge" aria-label="${this.mappings.length} reviewed groups">${this.mappings.length}</span>
          </h3>
        </div>
        
        <div class="reviewed-groups-content" id="reviewed-groups-content" role="list">
          ${acceptedMappings.length > 0 ? this.renderAcceptedMappings(acceptedMappings) : ''}
          ${rejectedMappings.length > 0 ? this.renderRejectedMappings(rejectedMappings) : ''}
        </div>
      </div>
    `;
  }

  /**
   * Render accepted mappings list
   */
  renderAcceptedMappings(mappings) {
    return `
      <div class="reviewed-mappings-group">
        <h4>Accepted Mappings</h4>
        ${mappings
          .map(
            (m) => `
          <div class="reviewed-mapping accepted" role="listitem">
            <span class="status-icon" aria-label="Accepted">✓</span>
            <span class="mapping-text">
              <strong>${this.escapeHtml(m.google_group_name)}</strong> (Google) → 
              <strong>${this.escapeHtml(m.catchup_group_name || 'Unknown')}</strong> (CatchUp)
            </span>
            <span class="member-count">${m.member_count} members</span>
          </div>
        `
          )
          .join('')}
      </div>
    `;
  }

  /**
   * Render rejected mappings list
   */
  renderRejectedMappings(mappings) {
    return `
      <div class="reviewed-mappings-group">
        <h4>Skipped Mappings</h4>
        ${mappings
          .map(
            (m) => `
          <div class="reviewed-mapping rejected" role="listitem">
            <span class="status-icon" aria-label="Skipped">⊘</span>
            <span class="mapping-text muted">
              <del>${this.escapeHtml(m.google_group_name)}</del> (Google) - Skipped
            </span>
            <span class="member-count muted">${m.member_count} members</span>
          </div>
        `
          )
          .join('')}
      </div>
    `;
  }

  /**
   * Fetch reviewed mappings from API
   */
  async fetchReviewedMappings() {
    const authToken = localStorage.getItem('authToken');
    const userId = window.userId || localStorage.getItem('userId');

    if (!authToken || !userId) {
      console.error('No auth token or user ID found');
      this.mappings = [];
      return;
    }

    try {
      const response = await fetch(
        `${window.API_BASE || '/api'}/google-contacts/reviewed-mappings?userId=${userId}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      this.mappings = data.mappings || [];
    } catch (error) {
      console.error('Failed to fetch reviewed mappings:', error);
      this.mappings = [];

      // Show error toast if available
      if (typeof showToast === 'function') {
        showToast('Failed to load reviewed groups', 'error');
      }
    }
  }

  /**
   * Toggle expanded/collapsed state
   */
  toggleExpanded() {
    this.isExpanded = !this.isExpanded;
    this.saveExpandedState();

    const section = document.getElementById('reviewed-groups-section');
    if (section) {
      section.classList.toggle('collapsed');
      const header = section.querySelector('.reviewed-groups-header');
      if (header) {
        header.setAttribute('aria-expanded', this.isExpanded);
      }
    }

    const icon = section?.querySelector('.expand-icon');
    if (icon) {
      icon.textContent = this.isExpanded ? '▼' : '▶';
    }
  }

  /**
   * Load expanded state from localStorage
   */
  loadExpandedState() {
    const saved = localStorage.getItem('reviewed-groups-expanded');
    return saved === null ? true : saved === 'true';
  }

  /**
   * Save expanded state to localStorage
   */
  saveExpandedState() {
    localStorage.setItem('reviewed-groups-expanded', this.isExpanded.toString());
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

// Global instance
window.reviewedGroupsSection = null;

/**
 * Initialize reviewed groups section
 */
function initializeReviewedGroupsSection() {
  const container = document.getElementById('reviewed-groups-container');
  if (container) {
    window.reviewedGroupsSection = new ReviewedGroupsSection(container);
    window.reviewedGroupsSection.render();
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ReviewedGroupsSection, initializeReviewedGroupsSection };
}
