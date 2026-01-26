/**
 * Circular Visualizer Component v2
 * Simplified version with contacts positioned within circle zones
 * No drag-and-drop, cleaner hover states, better visual hierarchy
 */

// Circle definitions based on Dunbar's number - Simplified 4-circle system
// Using warm color variants as per Requirement 7.2
// Radii scaled for larger 1200px viewport
const CIRCLE_DEFINITIONS = {
  inner: {
    id: 'inner',
    name: 'Inner Circle',
    description: 'Your closest confidants—people you\'d call in a crisis',
    recommendedSize: 10,
    maxSize: 10,
    defaultFrequency: 'weekly',
    color: '#8b5cf6', // Warm purple
    innerRadius: 0,
    outerRadius: 140 // Scaled up from 100
  },
  close: {
    id: 'close',
    name: 'Close Friends',
    description: 'Good friends you regularly share life updates with',
    recommendedSize: 25,
    maxSize: 25,
    defaultFrequency: 'biweekly',
    color: '#3b82f6', // Warm blue
    innerRadius: 140,
    outerRadius: 280 // Scaled up from 200
  },
  active: {
    id: 'active',
    name: 'Active Friends',
    description: 'People you want to stay connected with regularly',
    recommendedSize: 50,
    maxSize: 50,
    defaultFrequency: 'monthly',
    color: '#10b981', // Warm green
    innerRadius: 280,
    outerRadius: 420 // Scaled up from 300
  },
  casual: {
    id: 'casual',
    name: 'Casual Network',
    description: 'Acquaintances you keep in touch with occasionally',
    recommendedSize: 100,
    maxSize: 100,
    defaultFrequency: 'quarterly',
    color: '#f59e0b', // Warm amber
    innerRadius: 420,
    outerRadius: 560 // Scaled up from 400
  }
};

const CIRCLE_ORDER = ['inner', 'close', 'active', 'casual'];

class CircularVisualizer {
  constructor(containerId) {
    this.containerId = containerId;
    this.container = null;
    this.svg = null;
    this.contacts = [];
    this.groups = [];
    this.activeGroupFilter = null;
    this.viewportSize = 1200; // Increased from 900 to 1200 for larger default view
    this.centerX = 600; // Updated center
    this.centerY = 600; // Updated center
    this.contactDotSize = 52; // Increased from 48 to 52 for better visibility
    this.zoomLevel = 1; // Default zoom level
    this.minZoom = 0.25; // Minimum zoom (25%)
    this.maxZoom = 2.0; // Maximum zoom (200%)
    this.zoomStep = 0.25; // 25% steps for cleaner zoom levels
    
    this.listeners = {
      contactClick: [],
      contactUpdate: []
    };
    
    this.init();
  }
  
  init() {
    this.setupStyles();
    this.setupContainer();
    this.handleResize();
    window.addEventListener('resize', () => this.handleResize());
  }
  
  setupContainer() {
    this.container = document.getElementById(this.containerId);
    if (!this.container) {
      console.error(`Container with id "${this.containerId}" not found`);
      return;
    }
    
    this.container.innerHTML = `
      <div class="circular-visualizer">
        <div class="visualizer-controls">
          <div class="group-filter-container" id="${this.containerId}-group-filter" style="display: none;">
            <label for="${this.containerId}-group-select" class="group-filter-label">Filter by Group:</label>
            <select id="${this.containerId}-group-select" class="group-filter-select">
              <option value="">All Contacts</option>
            </select>
          </div>
          <div class="controls-row">
            <div class="circle-legend">
              ${CIRCLE_ORDER.map(circleId => this.renderLegendItem(circleId)).join('')}
            </div>
            <div class="zoom-controls">
              <button class="zoom-btn zoom-in" id="${this.containerId}-zoom-in" title="Zoom In (Ctrl/Cmd + +)">
                <span style="font-size: 18px; font-weight: bold; line-height: 1;">+</span>
              </button>
              <span class="zoom-level" id="${this.containerId}-zoom-level">100%</span>
              <button class="zoom-btn zoom-out" id="${this.containerId}-zoom-out" title="Zoom Out (Ctrl/Cmd + -)">
                <span style="font-size: 18px; font-weight: bold; line-height: 1;">−</span>
              </button>
              <button class="zoom-btn zoom-reset" id="${this.containerId}-zoom-reset" title="Reset Zoom (Ctrl/Cmd + 0)">
                <span style="font-size: 18px; font-weight: bold; line-height: 1;">↺</span>
              </button>
            </div>
          </div>
        </div>
        <div class="visualizer-canvas-wrapper">
          <div class="visualizer-canvas" id="${this.containerId}-canvas">
            <svg id="${this.containerId}-svg" class="visualizer-svg">
              <defs>
                <filter id="contact-shadow">
                  <feDropShadow dx="0" dy="2" stdDeviation="4" flood-opacity="0.3"/>
                </filter>
              </defs>
              <g class="zoom-group" id="${this.containerId}-zoom-group">
                <!-- All content will be rendered inside this group for unified zoom -->
              </g>
            </svg>
          </div>
        </div>
      </div>
    `;
    
    this.svg = document.getElementById(`${this.containerId}-svg`);
    this.setupGroupFilterListener();
    this.setupZoomControls();
    this.setupKeyboardShortcuts();
  }

  renderLegendItem(circleId) {
    const circle = CIRCLE_DEFINITIONS[circleId];
    return `
      <div class="legend-item" data-circle="${circleId}">
        <div class="legend-color" style="background: ${circle.color}"></div>
        <div class="legend-info">
          <div class="legend-name">${circle.name}</div>
          <div class="legend-size" id="legend-size-${circleId}">0 / ${circle.recommendedSize}</div>
        </div>
      </div>
    `;
  }
  
  handleResize() {
    if (!this.container) return;
    
    const canvas = document.getElementById(`${this.containerId}-canvas`);
    if (!canvas) return;
    
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    
    if (this.svg) {
      // Set viewBox to maintain aspect ratio
      this.svg.setAttribute('viewBox', `0 0 ${this.viewportSize} ${this.viewportSize}`);
      
      // Calculate dimensions to fit viewport while maintaining aspect ratio
      const size = Math.min(width, height);
      
      // For mobile viewports, scale to fit available space
      if (window.innerWidth <= 768) {
        // On mobile, use full available width/height (whichever is smaller)
        this.svg.setAttribute('width', size);
        this.svg.setAttribute('height', size);
      } else {
        // On desktop, use canvas dimensions
        this.svg.setAttribute('width', width);
        this.svg.setAttribute('height', height);
      }
      
      // Ensure SVG maintains aspect ratio
      this.svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    }
    
    if (this.contacts.length > 0) {
      this.render(this.contacts, this.groups);
    }
  }
  
  setupGroupFilterListener() {
    const select = document.getElementById(`${this.containerId}-group-select`);
    if (select) {
      select.addEventListener('change', (e) => {
        const groupId = e.target.value;
        if (groupId) {
          this.showGroupFilter(groupId);
        } else {
          this.clearGroupFilter();
        }
      });
    }
  }
  
  setupZoomControls() {
    const zoomInBtn = document.getElementById(`${this.containerId}-zoom-in`);
    const zoomOutBtn = document.getElementById(`${this.containerId}-zoom-out`);
    const zoomResetBtn = document.getElementById(`${this.containerId}-zoom-reset`);
    
    if (zoomInBtn) {
      zoomInBtn.addEventListener('click', () => this.zoomIn());
    }
    
    if (zoomOutBtn) {
      zoomOutBtn.addEventListener('click', () => this.zoomOut());
    }
    
    if (zoomResetBtn) {
      zoomResetBtn.addEventListener('click', () => this.resetZoom());
    }
    
    // Mouse wheel zoom disabled per user request
  }
  
  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Check if Ctrl/Cmd is pressed
      if (e.ctrlKey || e.metaKey) {
        if (e.key === '=' || e.key === '+') {
          e.preventDefault();
          this.zoomIn();
        } else if (e.key === '-') {
          e.preventDefault();
          this.zoomOut();
        } else if (e.key === '0') {
          e.preventDefault();
          this.resetZoom();
        }
      }
    });
  }
  
  zoomIn() {
    const newZoom = Math.min(this.maxZoom, this.zoomLevel + this.zoomStep);
    this.setZoom(newZoom);
  }
  
  zoomOut() {
    const newZoom = Math.max(this.minZoom, this.zoomLevel - this.zoomStep);
    this.setZoom(newZoom);
  }
  
  resetZoom() {
    this.setZoom(1);
  }
  
  setZoom(level) {
    this.zoomLevel = level;
    
    // Apply zoom by scaling the SVG size while keeping viewBox fixed
    // This allows native scrolling when zoomed in
    if (this.svg) {
      // Keep viewBox at full size
      this.svg.setAttribute('viewBox', `0 0 ${this.viewportSize} ${this.viewportSize}`);
      
      // Scale the SVG element size based on zoom level
      const baseSize = 800; // Base size that fits container at 100%
      const scaledSize = baseSize * level;
      
      this.svg.style.width = `${scaledSize}px`;
      this.svg.style.height = `${scaledSize}px`;
      this.svg.style.minWidth = `${scaledSize}px`;
      this.svg.style.minHeight = `${scaledSize}px`;
      this.svg.style.transform = 'none';
    }
    
    // Update zoom level display
    const zoomLevelEl = document.getElementById(`${this.containerId}-zoom-level`);
    if (zoomLevelEl) {
      zoomLevelEl.textContent = `${Math.round(level * 100)}%`;
    }
    
    // Update button states
    const zoomInBtn = document.getElementById(`${this.containerId}-zoom-in`);
    const zoomOutBtn = document.getElementById(`${this.containerId}-zoom-out`);
    
    if (zoomInBtn) {
      zoomInBtn.disabled = level >= this.maxZoom;
    }
    
    if (zoomOutBtn) {
      zoomOutBtn.disabled = level <= this.minZoom;
    }
  }

  render(contacts, groups = []) {
    this.contacts = contacts || [];
    this.groups = groups || [];
    
    if (!this.svg) {
      console.error('SVG element not initialized');
      return;
    }
    
    // Update group filter dropdown
    this.updateGroupFilterDropdown();
    
    const defs = this.svg.querySelector('defs');
    this.svg.innerHTML = '';
    if (defs) {
      this.svg.appendChild(defs);
    }
    
    this.renderCircleZones();
    this.renderContacts();
    this.updateLegendCounts();
  }
  
  updateGroupFilterDropdown() {
    const container = document.getElementById(`${this.containerId}-group-filter`);
    const select = document.getElementById(`${this.containerId}-group-select`);
    
    if (!container || !select) return;
    
    // Hide dropdown if no groups exist
    if (!this.groups || this.groups.length === 0) {
      container.style.display = 'none';
      return;
    }
    
    // Show dropdown and populate with groups
    container.style.display = 'flex';
    
    // Preserve current selection
    const currentValue = select.value;
    
    // Clear and repopulate options
    select.innerHTML = '<option value="">All Contacts</option>';
    
    this.groups.forEach(group => {
      const option = document.createElement('option');
      option.value = group.id;
      option.textContent = group.name;
      select.appendChild(option);
    });
    
    // Restore selection if it still exists
    if (currentValue && this.groups.find(g => g.id === currentValue)) {
      select.value = currentValue;
    }
  }

  renderCircleZones() {
    const zonesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    zonesGroup.setAttribute('class', 'circle-zones-group');
    
    // Render zones from outermost to innermost with light backgrounds
    for (let i = CIRCLE_ORDER.length - 1; i >= 0; i--) {
      const circleId = CIRCLE_ORDER[i];
      const circleDef = CIRCLE_DEFINITIONS[circleId];
      
      // Create filled zone with light background
      const zone = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      zone.setAttribute('cx', this.centerX);
      zone.setAttribute('cy', this.centerY);
      zone.setAttribute('r', circleDef.outerRadius);
      zone.setAttribute('fill', circleDef.color);
      zone.setAttribute('fill-opacity', '0.08');
      zone.setAttribute('stroke', circleDef.color);
      zone.setAttribute('stroke-width', '2');
      zone.setAttribute('stroke-opacity', '0.4');
      zone.setAttribute('class', `circle-zone circle-zone-${circleId}`);
      zone.setAttribute('data-circle', circleId);
      
      zonesGroup.appendChild(zone);
      
      // Add circle label
      const label = this.createCircleLabel(circleId, circleDef);
      zonesGroup.appendChild(label);
    }
    
    this.svg.appendChild(zonesGroup);
  }
  
  createCircleLabel(circleId, circleDef) {
    const labelGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    labelGroup.setAttribute('class', 'circle-label');
    
    const labelY = this.centerY - circleDef.outerRadius - 20;
    
    const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bg.setAttribute('x', this.centerX - 70);
    bg.setAttribute('y', labelY - 14);
    bg.setAttribute('width', '140');
    bg.setAttribute('height', '28');
    bg.setAttribute('rx', '14');
    bg.setAttribute('fill', 'white');
    bg.setAttribute('opacity', '0.95');
    bg.setAttribute('stroke', circleDef.color);
    bg.setAttribute('stroke-width', '2');
    labelGroup.appendChild(bg);
    
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', this.centerX);
    text.setAttribute('y', labelY);
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('dominant-baseline', 'middle');
    text.setAttribute('fill', circleDef.color);
    text.setAttribute('font-size', '15');
    text.setAttribute('font-weight', '700');
    text.textContent = circleDef.name;
    labelGroup.appendChild(text);
    
    return labelGroup;
  }

  renderContacts() {
    const contactsGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    contactsGroup.setAttribute('class', 'contacts-group');
    
    const contactsByCircle = this.groupContactsByCircle();
    
    CIRCLE_ORDER.forEach(circleId => {
      const circleContacts = contactsByCircle[circleId] || [];
      if (circleContacts.length === 0) return;
      
      // Don't filter out contacts, render all of them
      const positions = this.calculateContactPositionsInZone(circleId, circleContacts.length);
      
      circleContacts.forEach((contact, index) => {
        const pos = positions[index];
        const contactElement = this.createContactDot(contact, pos.x, pos.y);
        contactsGroup.appendChild(contactElement);
      });
    });
    
    this.svg.appendChild(contactsGroup);
  }
  
  groupContactsByCircle() {
    const grouped = {
      inner: [],
      close: [],
      active: [],
      casual: [],
      acquaintance: []
    };
    
    this.contacts.forEach(contact => {
      const circle = contact.circle || contact.dunbarCircle;
      if (circle && grouped[circle]) {
        grouped[circle].push(contact);
      }
    });
    
    return grouped;
  }
  
  calculateContactPositionsInZone(circleId, count) {
    const circleDef = CIRCLE_DEFINITIONS[circleId];
    const positions = [];
    
    if (count === 0) return positions;
    
    // Position contacts within the zone (between inner and outer radius)
    const midRadius = (circleDef.innerRadius + circleDef.outerRadius) / 2;
    
    // Distribute contacts evenly around the circle at mid-radius
    const angleStep = (2 * Math.PI) / count;
    const startAngle = -Math.PI / 2; // Start at top
    
    for (let i = 0; i < count; i++) {
      const angle = startAngle + (i * angleStep);
      
      // Use fixed mid-radius for stable positioning (no random variation)
      const radius = midRadius;
      
      const x = this.centerX + radius * Math.cos(angle);
      const y = this.centerY + radius * Math.sin(angle);
      positions.push({ x, y, angle });
    }
    
    return positions;
  }

  createContactDot(contact, x, y) {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.setAttribute('class', 'contact-dot');
    group.setAttribute('data-contact-id', contact.id);
    group.setAttribute('transform', `translate(${x}, ${y})`);
    
    // Circle background with warm styling
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('r', this.contactDotSize / 2);
    circle.setAttribute('fill', contact.color || this.getContactColor(contact));
    circle.setAttribute('stroke', 'var(--bg-surface, white)');
    circle.setAttribute('stroke-width', '3');
    circle.setAttribute('filter', 'url(#contact-shadow)');
    circle.setAttribute('class', 'contact-circle');
    group.appendChild(circle);
    
    // Initials text - larger and bolder
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('dominant-baseline', 'middle');
    text.setAttribute('fill', 'white');
    text.setAttribute('font-size', '18'); // Increased from 14 to 18
    text.setAttribute('font-weight', '700'); // Increased from 600 to 700
    text.setAttribute('pointer-events', 'none');
    text.textContent = this.getInitials(contact.name);
    group.appendChild(text);
    
    // AI suggestion indicator
    if (contact.aiSuggestion && contact.aiSuggestion.confidence > 0.7) {
      const indicator = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      indicator.setAttribute('cx', this.contactDotSize / 2 - 5);
      indicator.setAttribute('cy', -this.contactDotSize / 2 + 5);
      indicator.setAttribute('r', '6');
      indicator.setAttribute('fill', '#10b981');
      indicator.setAttribute('stroke', 'white');
      indicator.setAttribute('stroke-width', '2');
      group.appendChild(indicator);
    }
    
    // Group membership indicators - enhanced visibility
    if (contact.groups && contact.groups.length > 0) {
      const groupBadge = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      groupBadge.setAttribute('class', 'group-badge');
      
      const badgeCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      badgeCircle.setAttribute('cx', -this.contactDotSize / 2 + 8);
      badgeCircle.setAttribute('cy', -this.contactDotSize / 2 + 8);
      badgeCircle.setAttribute('r', '10'); // Increased from 8 to 10
      badgeCircle.setAttribute('fill', '#6366f1');
      badgeCircle.setAttribute('stroke', 'white');
      badgeCircle.setAttribute('stroke-width', '2.5'); // Increased from 2 to 2.5
      badgeCircle.setAttribute('filter', 'url(#contact-shadow)'); // Add shadow
      groupBadge.appendChild(badgeCircle);
      
      if (contact.groups.length > 1) {
        const badgeText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        badgeText.setAttribute('x', -this.contactDotSize / 2 + 8);
        badgeText.setAttribute('y', -this.contactDotSize / 2 + 8);
        badgeText.setAttribute('text-anchor', 'middle');
        badgeText.setAttribute('dominant-baseline', 'middle');
        badgeText.setAttribute('fill', 'white');
        badgeText.setAttribute('font-size', '12'); // Increased from 10 to 12
        badgeText.setAttribute('font-weight', '700');
        badgeText.setAttribute('pointer-events', 'none');
        badgeText.textContent = contact.groups.length;
        groupBadge.appendChild(badgeText);
      }
      
      group.appendChild(groupBadge);
    }
    
    // Dim contacts not in active group filter
    if (this.activeGroupFilter && (!contact.groups || !contact.groups.includes(this.activeGroupFilter))) {
      circle.setAttribute('opacity', '0.2');
      text.setAttribute('opacity', '0.3');
    }
    
    // Add click listener only
    group.addEventListener('click', () => {
      this.emit('contactClick', { contactId: contact.id, contact });
    });
    
    // Add tooltip
    this.addContactTooltip(group, contact);
    
    return group;
  }
  
  getContactColor(contact) {
    const colors = [
      '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
      '#ec4899', '#6366f1', '#14b8a6', '#f97316', '#84cc16'
    ];
    
    const hash = contact.name.split('').reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);
    
    return colors[Math.abs(hash) % colors.length];
  }
  
  getInitials(name) {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length === 1) {
      return parts[0].substring(0, 2).toUpperCase();
    }
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  addContactTooltip(group, contact) {
    const tooltip = document.createElement('div');
    tooltip.className = 'contact-tooltip';
    
    let groupsHtml = '';
    if (contact.groups && contact.groups.length > 0) {
      const groupNames = contact.groups.map(groupId => {
        const group = this.groups.find(g => g.id === groupId);
        return group ? group.name : groupId;
      }).join(', ');
      groupsHtml = `<div class="tooltip-groups">Groups: ${this.escapeHtml(groupNames)}</div>`;
    }
    
    tooltip.innerHTML = `
      <div class="tooltip-name">${this.escapeHtml(contact.name)}</div>
      ${contact.email ? `<div class="tooltip-detail">${this.escapeHtml(contact.email)}</div>` : ''}
      ${contact.phone ? `<div class="tooltip-detail">${this.escapeHtml(contact.phone)}</div>` : ''}
      ${groupsHtml}
      ${contact.aiSuggestion ? `
        <div class="tooltip-suggestion">
          AI Suggested: ${CIRCLE_DEFINITIONS[contact.aiSuggestion.circle].name}
          (${Math.round(contact.aiSuggestion.confidence * 100)}% confidence)
        </div>
      ` : ''}
    `;
    
    group.addEventListener('mouseenter', (e) => {
      document.body.appendChild(tooltip);
      this.positionTooltip(tooltip, e);
    });
    
    group.addEventListener('mousemove', (e) => {
      this.positionTooltip(tooltip, e);
    });
    
    group.addEventListener('mouseleave', () => {
      if (tooltip.parentNode) {
        tooltip.parentNode.removeChild(tooltip);
      }
    });
  }
  
  positionTooltip(tooltip, e) {
    const offset = 15;
    const padding = 10;
    
    // Get tooltip dimensions
    const tooltipRect = tooltip.getBoundingClientRect();
    const tooltipWidth = tooltipRect.width;
    const tooltipHeight = tooltipRect.height;
    
    // Calculate initial position
    let left = e.pageX + offset;
    let top = e.pageY + offset;
    
    // Check if tooltip would go off right edge
    if (left + tooltipWidth + padding > window.innerWidth + window.scrollX) {
      left = e.pageX - tooltipWidth - offset;
    }
    
    // Check if tooltip would go off bottom edge
    if (top + tooltipHeight + padding > window.innerHeight + window.scrollY) {
      top = e.pageY - tooltipHeight - offset;
    }
    
    tooltip.style.left = left + 'px';
    tooltip.style.top = top + 'px';
  }
  
  escapeHtml(text) {
    if (text === null || text === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
  }
  
  updateLegendCounts() {
    const contactsByCircle = this.groupContactsByCircle();
    
    CIRCLE_ORDER.forEach(circleId => {
      const count = (contactsByCircle[circleId] || []).length;
      const circleDef = CIRCLE_DEFINITIONS[circleId];
      const legendSize = document.getElementById(`legend-size-${circleId}`);
      
      if (legendSize) {
        legendSize.textContent = `${count} / ${circleDef.recommendedSize}`;
        
        if (count > circleDef.maxSize) {
          legendSize.style.color = '#ef4444';
        } else if (count > circleDef.recommendedSize) {
          legendSize.style.color = '#f59e0b';
        } else {
          legendSize.style.color = '#10b981';
        }
      }
    });
  }
  
  updateContact(contactId, newCircle) {
    const contact = this.contacts.find(c => c.id === contactId);
    if (!contact) return;
    
    const oldCircle = contact.circle;
    contact.circle = newCircle;
    
    this.render(this.contacts, this.groups);
    this.emit('contactUpdate', { contactId, oldCircle, newCircle });
  }
  
  // Event listener management
  on(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event].push(callback);
    }
  }
  
  off(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
  }
  
  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in ${event} listener:`, error);
        }
      });
    }
  }
  
  getCircleDistribution() {
    const contactsByCircle = this.groupContactsByCircle();
    const distribution = {};
    
    CIRCLE_ORDER.forEach(circleId => {
      distribution[circleId] = (contactsByCircle[circleId] || []).length;
    });
    
    return distribution;
  }
  
  // Stub methods for backward compatibility (no-ops)
  enableDragDrop() {
    // Drag-drop removed in V2
  }
  
  disableDragDrop() {
    // Drag-drop removed in V2
  }
  
  celebrateMilestone(message) {
    console.log('Milestone:', message);
  }
  
  highlightCircle(circleId) {
    console.log('Highlight circle:', circleId);
  }
  
  showGroupFilter(groupId) {
    this.activeGroupFilter = groupId;
    this.render(this.contacts, this.groups);
  }
  
  clearGroupFilter() {
    this.activeGroupFilter = null;
    this.render(this.contacts, this.groups);
  }

  setupStyles() {
    if (document.getElementById('circular-visualizer-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'circular-visualizer-styles';
    style.textContent = `
      /* Make the circles visualizer extend edge-to-edge */
      /* Override the max-width constraint on parent when circles tab is active */
      #directory-circles-tab #circles-visualizer {
        position: relative;
        box-sizing: border-box;
        width: calc(100vw - 240px) !important; /* Full viewport minus sidebar */
        max-width: none !important;
        /* Calculate left margin to break out of centered container */
        margin-left: calc(-1 * (100vw - 240px - 100%) / 2 - 32px + 32px) !important; /* +32px to avoid sidebar overlap */
        margin-right: calc(-1 * (100vw - 240px - 100%) / 2 - 32px) !important;
        padding: 0 8px 0 0 !important; /* Small right padding */
      }
      
      /* Mobile: no sidebar */
      @media (max-width: 1023px) {
        #directory-circles-tab #circles-visualizer {
          width: 100vw !important;
          margin-left: calc(-1 * (100vw - 100%) / 2 - 32px) !important;
          margin-right: calc(-1 * (100vw - 100%) / 2 - 32px) !important;
          padding: 0 !important;
        }
      }
      
      @media (max-width: 767px) {
        #directory-circles-tab #circles-visualizer {
          width: 100vw !important;
          margin-left: calc(-1 * (100vw - 100%) / 2 - 16px) !important;
          margin-right: calc(-1 * (100vw - 100%) / 2 - 16px) !important;
          padding: 0 !important;
        }
      }
      
      #circles-visualizer-container {
        width: 100% !important;
        max-width: none !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      
      #circles-visualizer {
        width: 100% !important;
        max-width: none !important;
      }
      
      .circular-visualizer {
        width: 100%;
        height: 100%;
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        background: var(--bg-app);
        border-radius: 0;
        overflow: hidden;
        margin: 0;
        padding: 0;
      }
      
      .visualizer-controls {
        padding: 16px 24px;
        background: var(--bg-surface);
        border-bottom: 1px solid var(--border-subtle);
      }
      
      .controls-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 20px;
        flex-wrap: wrap;
      }
      
      .visualizer-canvas-wrapper {
        flex: 1;
        position: relative;
        display: flex;
        flex-direction: column;
        width: 100%;
        overflow-y: auto;
        overflow-x: hidden;
      }
      
      .zoom-controls {
        display: flex;
        align-items: center;
        gap: 8px;
        background: var(--bg-app, #f5f5f5);
        padding: 8px 12px;
        border-radius: 10px;
        border: 1px solid var(--border-subtle, #e5e5e5);
        flex-shrink: 0;
      }
      
      .zoom-btn {
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--bg-surface, #fff);
        border: 1px solid var(--border-subtle, #ddd);
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s;
        color: var(--text-primary, #333);
        font-size: 16px;
        font-weight: bold;
      }
      
      .zoom-btn:hover:not(:disabled) {
        background: var(--accent-primary, #8b5cf6);
        border-color: var(--accent-primary, #8b5cf6);
        color: white;
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(139, 92, 246, 0.3);
      }
      
      .zoom-btn:active:not(:disabled) {
        transform: translateY(0);
      }
      
      .zoom-btn:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }
      
      .zoom-level {
        font-size: 13px;
        font-weight: 600;
        color: var(--text-primary, #333);
        min-width: 45px;
        text-align: center;
        padding: 0 2px;
      }
      
      .group-filter-container {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 15px;
        padding: 12px;
        background: var(--bg-app);
        border-radius: 8px;
        border: 1px solid var(--border-subtle);
      }
      
      .group-filter-label {
        font-size: 14px;
        font-weight: 600;
        color: var(--text-primary);
        white-space: nowrap;
      }
      
      .group-filter-select {
        flex: 1;
        padding: 8px 12px;
        border: 1px solid var(--border-subtle);
        border-radius: 6px;
        background: var(--bg-surface);
        font-size: 14px;
        color: var(--text-primary);
        cursor: pointer;
        transition: all 0.2s;
      }
      
      .group-filter-select:hover {
        border-color: var(--border-default);
      }
      
      .group-filter-select:focus {
        outline: none;
        border-color: var(--accent-primary);
        box-shadow: 0 0 0 3px var(--accent-glow);
      }
      
      .circle-legend {
        display: flex;
        gap: 20px;
        flex-wrap: wrap;
        justify-content: center;
      }
      
      .legend-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        background: var(--bg-app);
        border-radius: 8px;
        transition: all 0.2s;
      }
      
      .legend-item:hover {
        background: var(--bg-hover);
        transform: translateY(-2px);
      }
      
      .legend-color {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        border: 2px solid var(--bg-surface);
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }
      
      .legend-info {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      
      .legend-name {
        font-size: 13px;
        font-weight: 600;
        color: var(--text-primary);
      }
      
      .legend-size {
        font-size: 11px;
        font-weight: 500;
        color: var(--text-secondary);
      }
      
      .visualizer-canvas {
        flex: 1;
        position: relative;
        min-height: 600px;
        max-height: 80vh;
        display: flex;
        align-items: flex-start;
        justify-content: center;
        padding: 20px 10px 10px 10px;
        overflow: auto;
        width: 100%;
        background: var(--bg-app);
      }
      
      .visualizer-svg {
        width: 800px;
        height: 800px;
        min-width: 800px;
        min-height: 800px;
        display: block;
        flex-shrink: 0;
      }
      
      .circle-zone {
        transition: fill-opacity 0.3s ease, stroke-opacity 0.3s ease;
      }
      
      .contact-dot {
        cursor: pointer;
      }
      
      .contact-dot:hover .contact-circle {
        stroke-width: 4;
        filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.3));
      }
      
      .contact-tooltip {
        position: fixed;
        background: var(--bg-surface);
        color: var(--text-primary);
        padding: 12px 16px;
        border-radius: 8px;
        border: 1px solid var(--border-subtle);
        font-size: 13px;
        pointer-events: none;
        z-index: 10000;
        max-width: 300px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }
      
      .tooltip-name {
        font-weight: 600;
        margin-bottom: 4px;
        font-size: 14px;
        color: var(--text-primary);
      }
      
      .tooltip-detail {
        color: var(--text-secondary);
        font-size: 12px;
        margin-bottom: 2px;
      }
      
      .tooltip-groups {
        margin-top: 6px;
        padding-top: 6px;
        border-top: 1px solid var(--border-subtle);
        color: var(--accent-primary);
        font-size: 12px;
        font-weight: 500;
      }
      
      .tooltip-suggestion {
        margin-top: 8px;
        padding-top: 8px;
        border-top: 1px solid var(--border-subtle);
        color: var(--status-success);
        font-size: 12px;
      }
      
      .group-badge {
        pointer-events: none;
      }
      
      /* Mobile-responsive styles */
      @media (max-width: 768px) {
        .visualizer-controls {
          padding: 15px;
        }
        
        .circle-legend {
          gap: 10px;
        }
        
        .legend-item {
          padding: 6px 10px;
          font-size: 12px;
        }
        
        .legend-name {
          font-size: 12px;
        }
        
        .legend-size {
          font-size: 10px;
        }
        
        .visualizer-canvas {
          min-height: 400px;
          padding: 15px;
          /* Ensure canvas takes full width on mobile */
          width: 100%;
        }
        
        .visualizer-svg {
          /* Scale SVG to fit mobile viewport while maintaining aspect ratio */
          width: 100% !important;
          height: auto !important;
          max-width: 100%;
          display: block;
          margin: 0 auto;
        }
      }
      
      @media (max-width: 480px) {
        .circular-visualizer {
          border-radius: 0;
        }
        
        .visualizer-controls {
          padding: 12px;
        }
        
        .circle-legend {
          gap: 8px;
          font-size: 11px;
        }
        
        .legend-item {
          padding: 5px 8px;
          flex: 1 1 calc(50% - 4px);
          min-width: 0;
        }
        
        .legend-color {
          width: 14px;
          height: 14px;
        }
        
        .legend-name {
          font-size: 11px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .legend-size {
          font-size: 9px;
        }
        
        .visualizer-canvas {
          min-height: 300px;
          padding: 10px;
          /* Maximize available space on small screens */
          width: 100%;
        }
        
        .visualizer-svg {
          /* Ensure SVG scales to fit small mobile screens */
          width: 100% !important;
          height: auto !important;
          max-width: 100%;
          display: block;
          margin: 0 auto;
        }
        
        .contact-tooltip {
          max-width: 250px;
          padding: 10px 12px;
          font-size: 12px;
        }
        
        .tooltip-name {
          font-size: 13px;
        }
        
        .group-filter-container {
          flex-direction: column;
          align-items: stretch;
          gap: 8px;
        }
        
        .group-filter-label {
          font-size: 13px;
        }
        
        .group-filter-select {
          width: 100%;
        }
      }
    `;
    document.head.appendChild(style);
  }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.CircularVisualizer = CircularVisualizer;
  window.CIRCLE_DEFINITIONS = CIRCLE_DEFINITIONS;
}
