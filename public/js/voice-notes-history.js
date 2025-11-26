/**
 * Voice Notes History Interface
 * Displays voice notes in reverse chronological order with filtering and search
 */

class VoiceNotesHistory {
  constructor() {
    this.voiceNotes = [];
    this.filteredVoiceNotes = [];
    this.expandedNoteIds = new Set();
    this.filters = {
      contactId: null,
      status: null,
      dateFrom: null,
      dateTo: null,
      searchText: ''
    };
    
    // UI Elements
    this.container = null;
    this.listContainer = null;
    this.searchInput = null;
    this.contactFilter = null;
    this.statusFilter = null;
    this.dateFromInput = null;
    this.dateToInput = null;
    
    this.init();
  }
  
  init() {
    this.setupUI();
    this.attachEventListeners();
    this.loadVoiceNotes();
  }
  
  setupUI() {
    this.container = document.getElementById('voice-history-content');
    if (!this.container) return;
    
    this.container.innerHTML = `
      <div class="voice-history-container">
        <!-- Filters Section -->
        <div class="history-filters">
          <div class="filter-row">
            <div class="filter-group">
              <label for="history-search">Search Transcripts</label>
              <input 
                type="text" 
                id="history-search" 
                class="search-input"
                placeholder="Search across transcripts..."
              />
            </div>
            
            <div class="filter-group">
              <label for="contact-filter">Filter by Contact</label>
              <select id="contact-filter" class="filter-select">
                <option value="">All Contacts</option>
              </select>
            </div>
            
            <div class="filter-group">
              <label for="status-filter">Filter by Status</label>
              <select id="status-filter" class="filter-select">
                <option value="">All Statuses</option>
                <option value="recording">Recording</option>
                <option value="transcribing">Transcribing</option>
                <option value="extracting">Extracting</option>
                <option value="ready">Ready</option>
                <option value="applied">Applied</option>
                <option value="error">Error</option>
              </select>
            </div>
          </div>
          
          <div class="filter-row">
            <div class="filter-group">
              <label for="date-from">From Date</label>
              <input type="date" id="date-from" class="date-input" />
            </div>
            
            <div class="filter-group">
              <label for="date-to">To Date</label>
              <input type="date" id="date-to" class="date-input" />
            </div>
            
            <button id="clear-filters-btn" class="clear-filters-btn">
              Clear Filters
            </button>
          </div>
        </div>
        
        <!-- Voice Notes List -->
        <div id="voice-notes-list" class="voice-notes-list">
          <div class="loading-state">
            <div class="spinner"></div>
            <p>Loading voice notes...</p>
          </div>
        </div>
      </div>
    `;
    
    // Get UI element references
    this.listContainer = document.getElementById('voice-notes-list');
    this.searchInput = document.getElementById('history-search');
    this.contactFilter = document.getElementById('contact-filter');
    this.statusFilter = document.getElementById('status-filter');
    this.dateFromInput = document.getElementById('date-from');
    this.dateToInput = document.getElementById('date-to');
    
    this.addStyles();
  }
  
  addStyles() {
    if (document.getElementById('voice-history-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'voice-history-styles';
    style.textContent = `
      .voice-history-container {
        max-width: 1200px;
        margin: 0 auto;
      }
      
      .history-filters {
        background: white;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        margin-bottom: 20px;
      }
      
      .filter-row {
        display: flex;
        gap: 15px;
        margin-bottom: 15px;
        flex-wrap: wrap;
      }
      
      .filter-row:last-child {
        margin-bottom: 0;
      }
      
      .filter-group {
        flex: 1;
        min-width: 200px;
      }
      
      .filter-group label {
        display: block;
        margin-bottom: 5px;
        font-weight: 500;
        color: #374151;
        font-size: 14px;
      }
      
      .search-input,
      .filter-select,
      .date-input {
        width: 100%;
        padding: 10px;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        font-size: 14px;
      }
      
      .search-input:focus,
      .filter-select:focus,
      .date-input:focus {
        outline: none;
        border-color: #2563eb;
        box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
      }
      
      .clear-filters-btn {
        padding: 10px 20px;
        background: #f3f4f6;
        color: #374151;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
        align-self: flex-end;
      }
      
      .clear-filters-btn:hover {
        background: #e5e7eb;
      }
      
      .voice-notes-list {
        display: flex;
        flex-direction: column;
        gap: 15px;
      }
      
      .voice-note-card {
        background: white;
        border-radius: 8px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        overflow: hidden;
        transition: box-shadow 0.2s;
      }
      
      .voice-note-card:hover {
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      }
      
      .voice-note-header {
        padding: 20px;
        cursor: pointer;
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 15px;
      }
      
      .voice-note-header:hover {
        background: #f9fafb;
      }
      
      .voice-note-main {
        flex: 1;
      }
      
      .voice-note-meta {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 10px;
        flex-wrap: wrap;
      }
      
      .voice-note-date {
        color: #6b7280;
        font-size: 14px;
      }
      
      .status-badge {
        padding: 4px 12px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
      }
      
      .status-badge.recording {
        background: #fee2e2;
        color: #991b1b;
      }
      
      .status-badge.transcribing {
        background: #dbeafe;
        color: #1e40af;
      }
      
      .status-badge.extracting {
        background: #fef3c7;
        color: #92400e;
      }
      
      .status-badge.ready {
        background: #d1fae5;
        color: #065f46;
      }
      
      .status-badge.applied {
        background: #dbeafe;
        color: #1e40af;
      }
      
      .status-badge.error {
        background: #fee2e2;
        color: #991b1b;
      }
      
      .voice-note-contacts {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 10px;
      }
      
      .contact-avatar {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: 600;
        font-size: 14px;
      }
      
      .contact-names {
        color: #374151;
        font-weight: 500;
        font-size: 14px;
      }
      
      .transcript-preview {
        color: #6b7280;
        font-size: 14px;
        line-height: 1.5;
        margin-bottom: 10px;
      }
      
      .enrichment-summary {
        display: flex;
        gap: 15px;
        flex-wrap: wrap;
      }
      
      .enrichment-stat {
        display: flex;
        align-items: center;
        gap: 5px;
        color: #6b7280;
        font-size: 13px;
      }
      
      .enrichment-stat-icon {
        font-size: 16px;
      }
      
      .voice-note-actions {
        display: flex;
        gap: 10px;
      }
      
      .expand-btn,
      .delete-btn {
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
      }
      
      .expand-btn {
        background: #f3f4f6;
        color: #374151;
        border: 1px solid #d1d5db;
      }
      
      .expand-btn:hover {
        background: #e5e7eb;
      }
      
      .delete-btn {
        background: #fee2e2;
        color: #991b1b;
        border: 1px solid #fecaca;
      }
      
      .delete-btn:hover {
        background: #fecaca;
      }
      
      .voice-note-details {
        padding: 0 20px 20px 20px;
        border-top: 1px solid #e5e7eb;
        display: none;
      }
      
      .voice-note-details.expanded {
        display: block;
      }
      
      .details-section {
        margin-top: 20px;
      }
      
      .details-section h4 {
        margin-bottom: 10px;
        color: #1f2937;
        font-size: 16px;
      }
      
      .full-transcript {
        background: #f9fafb;
        padding: 15px;
        border-radius: 6px;
        color: #374151;
        line-height: 1.6;
        font-size: 14px;
        white-space: pre-wrap;
      }
      
      .enrichment-items-list {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      
      .enrichment-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px;
        background: #f9fafb;
        border-radius: 6px;
        border-left: 3px solid #2563eb;
      }
      
      .enrichment-item-info {
        flex: 1;
      }
      
      .enrichment-item-type {
        font-size: 12px;
        color: #6b7280;
        text-transform: uppercase;
        font-weight: 600;
        margin-bottom: 4px;
      }
      
      .enrichment-item-value {
        color: #1f2937;
        font-size: 14px;
      }
      
      .enrichment-item-contact {
        color: #6b7280;
        font-size: 13px;
        font-style: italic;
      }
      
      .empty-state {
        text-align: center;
        padding: 60px 20px;
        color: #6b7280;
      }
      
      .empty-state-icon {
        font-size: 48px;
        margin-bottom: 15px;
      }
      
      .empty-state h3 {
        color: #374151;
        margin-bottom: 10px;
      }
      
      @media (max-width: 768px) {
        .filter-row {
          flex-direction: column;
        }
        
        .filter-group {
          min-width: 100%;
        }
        
        .voice-note-header {
          flex-direction: column;
        }
        
        .voice-note-actions {
          width: 100%;
        }
        
        .expand-btn,
        .delete-btn {
          flex: 1;
        }
      }
    `;
    document.head.appendChild(style);
  }

  attachEventListeners() {
    // Search input
    if (this.searchInput) {
      this.searchInput.addEventListener('input', (e) => {
        this.filters.searchText = e.target.value;
        this.applyFilters();
      });
    }
    
    // Contact filter
    if (this.contactFilter) {
      this.contactFilter.addEventListener('change', (e) => {
        this.filters.contactId = e.target.value || null;
        this.applyFilters();
      });
    }
    
    // Status filter
    if (this.statusFilter) {
      this.statusFilter.addEventListener('change', (e) => {
        this.filters.status = e.target.value || null;
        this.applyFilters();
      });
    }
    
    // Date filters
    if (this.dateFromInput) {
      this.dateFromInput.addEventListener('change', (e) => {
        this.filters.dateFrom = e.target.value ? new Date(e.target.value) : null;
        this.applyFilters();
      });
    }
    
    if (this.dateToInput) {
      this.dateToInput.addEventListener('change', (e) => {
        this.filters.dateTo = e.target.value ? new Date(e.target.value) : null;
        this.applyFilters();
      });
    }
    
    // Clear filters button
    const clearBtn = document.getElementById('clear-filters-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => this.clearFilters());
    }
  }
  
  async loadVoiceNotes() {
    try {
      const token = localStorage.getItem('authToken');
      const userId = localStorage.getItem('userId');
      
      if (!token || !userId) {
        this.showError('Please log in to view voice notes');
        return;
      }
      
      // Fetch voice notes
      const response = await fetch(`/api/voice-notes?userId=${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to load voice notes');
      }
      
      this.voiceNotes = await response.json();
      
      // Sort by recording timestamp (newest first)
      this.voiceNotes.sort((a, b) => {
        return new Date(b.recordingTimestamp) - new Date(a.recordingTimestamp);
      });
      
      // Load contacts for filter dropdown
      await this.loadContactsForFilter();
      
      // Apply filters and render
      this.applyFilters();
      
    } catch (error) {
      console.error('Error loading voice notes:', error);
      this.showError('Failed to load voice notes. Please try again.');
    }
  }
  
  async loadContactsForFilter() {
    try {
      const token = localStorage.getItem('authToken');
      const userId = localStorage.getItem('userId');
      
      const response = await fetch(`/api/contacts?userId=${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const contacts = await response.json();
        
        // Populate contact filter dropdown
        if (this.contactFilter) {
          contacts.forEach(contact => {
            const option = document.createElement('option');
            option.value = contact.id;
            option.textContent = contact.name;
            this.contactFilter.appendChild(option);
          });
        }
      }
    } catch (error) {
      console.error('Error loading contacts for filter:', error);
    }
  }
  
  applyFilters() {
    this.filteredVoiceNotes = this.voiceNotes.filter(note => {
      // Contact filter
      if (this.filters.contactId) {
        const hasContact = note.contacts?.some(c => c.id === this.filters.contactId);
        if (!hasContact) return false;
      }
      
      // Status filter
      if (this.filters.status && note.status !== this.filters.status) {
        return false;
      }
      
      // Date range filter
      const noteDate = new Date(note.recordingTimestamp);
      if (this.filters.dateFrom && noteDate < this.filters.dateFrom) {
        return false;
      }
      if (this.filters.dateTo) {
        const dateTo = new Date(this.filters.dateTo);
        dateTo.setHours(23, 59, 59, 999); // Include the entire day
        if (noteDate > dateTo) {
          return false;
        }
      }
      
      // Search text filter
      if (this.filters.searchText) {
        const searchLower = this.filters.searchText.toLowerCase();
        const transcriptMatch = note.transcript?.toLowerCase().includes(searchLower);
        if (!transcriptMatch) return false;
      }
      
      return true;
    });
    
    this.render();
  }
  
  clearFilters() {
    this.filters = {
      contactId: null,
      status: null,
      dateFrom: null,
      dateTo: null,
      searchText: ''
    };
    
    // Reset UI inputs
    if (this.searchInput) this.searchInput.value = '';
    if (this.contactFilter) this.contactFilter.value = '';
    if (this.statusFilter) this.statusFilter.value = '';
    if (this.dateFromInput) this.dateFromInput.value = '';
    if (this.dateToInput) this.dateToInput.value = '';
    
    this.applyFilters();
  }
  
  render() {
    if (!this.listContainer) return;
    
    if (this.filteredVoiceNotes.length === 0) {
      this.listContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🎤</div>
          <h3>No Voice Notes Found</h3>
          <p>
            ${this.voiceNotes.length === 0 
              ? 'Start recording voice notes to see them here.' 
              : 'No voice notes match your current filters.'}
          </p>
        </div>
      `;
      return;
    }
    
    this.listContainer.innerHTML = this.filteredVoiceNotes
      .map(note => this.renderVoiceNoteCard(note))
      .join('');
    
    // Attach event listeners to cards
    this.attachCardEventListeners();
  }
  
  renderVoiceNoteCard(note) {
    const isExpanded = this.expandedNoteIds.has(note.id);
    const transcriptPreview = this.getTranscriptPreview(note.transcript);
    const enrichmentSummary = this.getEnrichmentSummary(note);
    const contactsDisplay = this.renderContacts(note.contacts || []);
    const dateDisplay = this.formatDate(note.recordingTimestamp);
    
    return `
      <div class="voice-note-card" data-note-id="${note.id}">
        <div class="voice-note-header" data-action="toggle">
          <div class="voice-note-main">
            <div class="voice-note-meta">
              <span class="voice-note-date">${dateDisplay}</span>
              <span class="status-badge ${note.status}">${note.status}</span>
            </div>
            
            ${contactsDisplay}
            
            <div class="transcript-preview">
              ${transcriptPreview}
            </div>
            
            ${enrichmentSummary}
          </div>
          
          <div class="voice-note-actions">
            <button class="expand-btn" data-action="toggle">
              ${isExpanded ? '▲ Collapse' : '▼ Expand'}
            </button>
            <button class="delete-btn" data-action="delete">
              🗑️ Delete
            </button>
          </div>
        </div>
        
        <div class="voice-note-details ${isExpanded ? 'expanded' : ''}">
          ${this.renderDetails(note)}
        </div>
      </div>
    `;
  }
  
  renderContacts(contacts) {
    if (!contacts || contacts.length === 0) {
      return '<div class="voice-note-contacts"><span class="contact-names">No contacts associated</span></div>';
    }
    
    const avatars = contacts.slice(0, 3).map(contact => {
      const initials = this.getInitials(contact.name);
      return `<div class="contact-avatar" title="${contact.name}">${initials}</div>`;
    }).join('');
    
    const names = contacts.map(c => c.name).join(', ');
    const moreCount = contacts.length > 3 ? ` +${contacts.length - 3}` : '';
    
    return `
      <div class="voice-note-contacts">
        ${avatars}
        <span class="contact-names">${names}${moreCount}</span>
      </div>
    `;
  }
  
  getInitials(name) {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length === 1) {
      return parts[0].charAt(0).toUpperCase();
    }
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }
  
  getTranscriptPreview(transcript) {
    if (!transcript) return '<em>No transcript available</em>';
    
    const preview = transcript.length > 100 
      ? transcript.substring(0, 100) + '...' 
      : transcript;
    
    return preview;
  }
  
  getEnrichmentSummary(note) {
    // Check enrichmentData first (new format), then fall back to extractedEntities (old format)
    const enrichmentData = note.enrichmentData || note.extractedEntities;
    
    if (!enrichmentData) {
      return '<div class="enrichment-summary"><span class="enrichment-stat">No enrichment data</span></div>';
    }
    
    let tagsCount = 0;
    let groupsCount = 0;
    let fieldsCount = 0;
    
    // Handle new enrichmentData format (contactProposals)
    if (enrichmentData.contactProposals) {
      enrichmentData.contactProposals.forEach(proposal => {
        if (proposal.items) {
          proposal.items.forEach(item => {
            if (item.type === 'tag') tagsCount++;
            else if (item.type === 'group') groupsCount++;
            else if (item.type === 'field') fieldsCount++;
          });
        }
      });
    } 
    // Handle old extractedEntities format
    else {
      Object.values(enrichmentData).forEach(entities => {
        if (entities.tags) tagsCount += entities.tags.length;
        if (entities.groups) groupsCount += entities.groups.length;
        if (entities.fields) {
          fieldsCount += Object.keys(entities.fields).filter(key => entities.fields[key]).length;
        }
      });
    }
    
    const stats = [];
    if (tagsCount > 0) {
      stats.push(`<span class="enrichment-stat"><span class="enrichment-stat-icon">🏷️</span> ${tagsCount} tag${tagsCount !== 1 ? 's' : ''}</span>`);
    }
    if (groupsCount > 0) {
      stats.push(`<span class="enrichment-stat"><span class="enrichment-stat-icon">👥</span> ${groupsCount} group${groupsCount !== 1 ? 's' : ''}</span>`);
    }
    if (fieldsCount > 0) {
      stats.push(`<span class="enrichment-stat"><span class="enrichment-stat-icon">📝</span> ${fieldsCount} field${fieldsCount !== 1 ? 's' : ''}</span>`);
    }
    
    if (stats.length === 0) {
      return '<div class="enrichment-summary"><span class="enrichment-stat">No enrichment applied</span></div>';
    }
    
    return `<div class="enrichment-summary">${stats.join('')}</div>`;
  }
  
  formatDate(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return `Today at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
    } else if (diffDays === 1) {
      return `Yesterday at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined 
      });
    }
  }

  renderDetails(note) {
    const enrichmentItems = this.getEnrichmentItems(note);
    
    return `
      <div class="details-section">
        <h4>Full Transcript</h4>
        <div class="full-transcript">
          ${note.transcript || 'No transcript available'}
        </div>
      </div>
      
      ${enrichmentItems.length > 0 ? `
        <div class="details-section">
          <h4>Enrichment Items Applied</h4>
          <div class="enrichment-items-list">
            ${enrichmentItems.map(item => this.renderEnrichmentItem(item)).join('')}
          </div>
        </div>
      ` : `
        <div class="details-section">
          <p style="color: #6b7280; font-style: italic;">No enrichment items applied</p>
        </div>
      `}
    `;
  }
  
  getEnrichmentItems(note) {
    const items = [];
    
    // Check enrichmentData first (new format), then fall back to extractedEntities (old format)
    const enrichmentData = note.enrichmentData || note.extractedEntities;
    
    if (!enrichmentData) {
      return items;
    }
    
    // Handle new enrichmentData format (contactProposals)
    if (enrichmentData.contactProposals) {
      enrichmentData.contactProposals.forEach(proposal => {
        if (proposal.items && proposal.items.length > 0) {
          proposal.items.forEach(item => {
            items.push({
              contactName: proposal.contactName,
              type: item.type,
              action: item.action,
              field: item.field,
              value: item.value
            });
          });
        }
      });
      return items;
    }
    
    // Handle old extractedEntities format
    if (!note.contacts) {
      return items;
    }
    
    // Process each contact's entities
    note.contacts.forEach(contact => {
      const entities = enrichmentData[contact.id];
      if (!entities) return;
      
      // Tags
      if (entities.tags && entities.tags.length > 0) {
        entities.tags.forEach(tag => {
          items.push({
            type: 'tag',
            value: tag,
            contactName: contact.name,
            contactId: contact.id
          });
        });
      }
      
      // Groups
      if (entities.groups && entities.groups.length > 0) {
        entities.groups.forEach(group => {
          items.push({
            type: 'group',
            value: group,
            contactName: contact.name,
            contactId: contact.id
          });
        });
      }
      
      // Fields
      if (entities.fields) {
        Object.entries(entities.fields).forEach(([field, value]) => {
          if (value) {
            items.push({
              type: 'field',
              field: field,
              value: value,
              contactName: contact.name,
              contactId: contact.id
            });
          }
        });
      }
      
      // Last contact date
      if (entities.lastContactDate) {
        items.push({
          type: 'lastContactDate',
          value: new Date(entities.lastContactDate).toLocaleDateString(),
          contactName: contact.name,
          contactId: contact.id
        });
      }
    });
    
    return items;
  }
  
  renderEnrichmentItem(item) {
    let typeLabel = '';
    let valueDisplay = '';
    
    switch (item.type) {
      case 'tag':
        typeLabel = 'Tag Added';
        valueDisplay = `🏷️ ${item.value}`;
        break;
      case 'group':
        typeLabel = 'Group Added';
        valueDisplay = `👥 ${item.value}`;
        break;
      case 'field':
        typeLabel = `Field Updated: ${item.field}`;
        valueDisplay = item.value;
        break;
      case 'lastContactDate':
        typeLabel = 'Last Contact Date';
        valueDisplay = `📅 ${item.value}`;
        break;
      default:
        typeLabel = 'Unknown';
        valueDisplay = item.value;
    }
    
    return `
      <div class="enrichment-item">
        <div class="enrichment-item-info">
          <div class="enrichment-item-type">${typeLabel}</div>
          <div class="enrichment-item-value">${valueDisplay}</div>
          <div class="enrichment-item-contact">Applied to: ${item.contactName}</div>
        </div>
      </div>
    `;
  }
  
  attachCardEventListeners() {
    // Toggle expand/collapse
    document.querySelectorAll('[data-action="toggle"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const card = btn.closest('.voice-note-card');
        const noteId = card.dataset.noteId;
        this.toggleExpand(noteId);
      });
    });
    
    // Delete button
    document.querySelectorAll('[data-action="delete"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const card = btn.closest('.voice-note-card');
        const noteId = card.dataset.noteId;
        this.confirmDelete(noteId);
      });
    });
  }
  
  toggleExpand(noteId) {
    if (this.expandedNoteIds.has(noteId)) {
      this.expandedNoteIds.delete(noteId);
    } else {
      this.expandedNoteIds.add(noteId);
    }
    this.render();
  }
  
  async confirmDelete(noteId) {
    const note = this.voiceNotes.find(n => n.id === noteId);
    if (!note) return;
    
    const confirmed = confirm(
      `Are you sure you want to delete this voice note?\n\n` +
      `Recorded: ${this.formatDate(note.recordingTimestamp)}\n` +
      `This action cannot be undone.`
    );
    
    if (confirmed) {
      await this.deleteVoiceNote(noteId);
    }
  }
  
  async deleteVoiceNote(noteId) {
    try {
      const token = localStorage.getItem('authToken');
      const userId = localStorage.getItem('userId');
      
      const response = await fetch(`/api/voice-notes/${noteId}?userId=${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete voice note');
      }
      
      // Remove from local array
      this.voiceNotes = this.voiceNotes.filter(n => n.id !== noteId);
      this.expandedNoteIds.delete(noteId);
      
      // Re-apply filters and render
      this.applyFilters();
      
      // Show success message
      if (typeof showToast === 'function') {
        showToast('Voice note deleted successfully', 'success');
      }
      
    } catch (error) {
      console.error('Error deleting voice note:', error);
      if (typeof showToast === 'function') {
        showToast('Failed to delete voice note', 'error');
      } else {
        alert('Failed to delete voice note. Please try again.');
      }
    }
  }
  
  showError(message) {
    if (this.listContainer) {
      this.listContainer.innerHTML = `
        <div class="error-state">
          <h3>Error</h3>
          <p>${message}</p>
        </div>
      `;
    }
  }
  
  refresh() {
    this.expandedNoteIds.clear();
    this.loadVoiceNotes();
  }
}

// Initialize voice notes history when page is loaded
let voiceNotesHistory = null;

function initVoiceNotesHistoryPage() {
  if (!voiceNotesHistory) {
    voiceNotesHistory = new VoiceNotesHistory();
  } else {
    voiceNotesHistory.refresh();
  }
}

// Export for use in app.js
if (typeof window !== 'undefined') {
  window.initVoiceNotesHistoryPage = initVoiceNotesHistoryPage;
  window.voiceNotesHistory = voiceNotesHistory;
}
