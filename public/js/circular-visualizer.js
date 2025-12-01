/**
 * Circular Visualizer Component v2
 * Simplified version with contacts positioned within circle zones
 * No drag-and-drop, cleaner hover states, better visual hierarchy
 */

// Circle definitions based on Dunbar's number
const CIRCLE_DEFINITIONS = {
  inner: {
    id: 'inner',
    name: 'Inner Circle',
    description: 'Your closest relationships - family and best friends',
    recommendedSize: 5,
    maxSize: 5,
    defaultFrequency: 'weekly',
    color: '#8b5cf6',
    innerRadius: 0,
    outerRadius: 80
  },
  close: {
    id: 'close',
    name: 'Close Friends',
    description: 'Good friends you see regularly',
    recommendedSize: 15,
    maxSize: 15,
    defaultFrequency: 'biweekly',
    color: '#3b82f6',
    innerRadius: 80,
    outerRadius: 160
  },
  active: {
    id: 'active',
    name: 'Active Friends',
    description: 'Friends you maintain regular contact with',
    recommendedSize: 50,
    maxSize: 50,
    defaultFrequency: 'monthly',
    color: '#10b981',
    innerRadius: 160,
    outerRadius: 240
  },
  casual: {
    id: 'casual',
    name: 'Casual Network',
    description: 'Acquaintances and occasional contacts',
    recommendedSize: 150,
    maxSize: 150,
    defaultFrequency: 'quarterly',
    color: '#f59e0b',
    innerRadius: 240,
    outerRadius: 320
  },
  acquaintance: {
    id: 'acquaintance',
    name: 'Acquaintances',
    description: 'People you know but rarely interact with',
    recommendedSize: 500,
    maxSize: 1000,
    defaultFrequency: 'yearly',
    color: '#6b7280',
    innerRadius: 320,
    outerRadius: 400
  }
};

const CIRCLE_ORDER = ['inner', 'close', 'active', 'casual', 'acquaintance'];

class CircularVisualizer {
  constructor(containerId) {
    this.containerId = containerId;
    this.container = null;
    this.svg = null;
    this.contacts = [];
    this.groups = [];
    this.activeGroupFilter = null;
    this.viewportSize = 900;
    this.centerX = 450;
    this.centerY = 450;
    this.contactDotSize = 36;
    
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
          <div class="circle-legend">
            ${CIRCLE_ORDER.map(circleId => this.renderLegendItem(circleId)).join('')}
          </div>
        </div>
        <div class="visualizer-canvas" id="${this.containerId}-canvas">
          <svg id="${this.containerId}-svg" class="visualizer-svg">
            <defs>
              <filter id="contact-shadow">
                <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.2"/>
              </filter>
            </defs>
          </svg>
        </div>
      </div>
    `;
    
    this.svg = document.getElementById(`${this.containerId}-svg`);
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
      this.svg.setAttribute('viewBox', `0 0 ${this.viewportSize} ${this.viewportSize}`);
      this.svg.setAttribute('width', width);
      this.svg.setAttribute('height', height);
    }
    
    if (this.contacts.length > 0) {
      this.render(this.contacts, this.groups);
    }
  }
  
  render(contacts, groups = []) {
    this.contacts = contacts || [];
    this.groups = groups || [];
    
    if (!this.svg) {
      console.error('SVG element not initialized');
      return;
    }
    
    const defs = this.svg.querySelector('defs');
    this.svg.innerHTML = '';
    if (defs) {
      this.svg.appendChild(defs);
    }
    
    this.renderCircleZones();
    this.renderContacts();
    this.updateLegendCounts();
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
    
    const labelY = this.centerY - circleDef.outerRadius - 15;
    
    const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bg.setAttribute('x', this.centerX - 60);
    bg.setAttribute('y', labelY - 12);
    bg.setAttribute('width', '120');
    bg.setAttribute('height', '24');
    bg.setAttribute('rx', '12');
    bg.setAttribute('fill', 'white');
    bg.setAttribute('opacity', '0.95');
    bg.setAttribute('stroke', circleDef.color);
    bg.setAttribute('stroke-width', '1.5');
    labelGroup.appendChild(bg);
    
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', this.centerX);
    text.setAttribute('y', labelY);
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('dominant-baseline', 'middle');
    text.setAttribute('fill', circleDef.color);
    text.setAttribute('font-size', '13');
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
      
      let filteredContacts = circleContacts;
      if (this.activeGroupFilter) {
        filteredContacts = circleContacts.filter(contact => 
          contact.groups && contact.groups.includes(this.activeGroupFilter)
        );
      }
      
      const positions = this.calculateContactPositionsInZone(circleId, filteredContacts.length);
      
      filteredContacts.forEach((contact, index) => {
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
    
    // Circle background
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('r', this.contactDotSize / 2);
    circle.setAttribute('fill', contact.color || this.getContactColor(contact));
    circle.setAttribute('stroke', 'white');
    circle.setAttribute('stroke-width', '3');
    circle.setAttribute('filter', 'url(#contact-shadow)');
    circle.setAttribute('class', 'contact-circle');
    group.appendChild(circle);
    
    // Initials text
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('dominant-baseline', 'middle');
    text.setAttribute('fill', 'white');
    text.setAttribute('font-size', '14');
    text.setAttribute('font-weight', '600');
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
    
    // Group membership indicators
    if (contact.groups && contact.groups.length > 0) {
      const groupBadge = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      groupBadge.setAttribute('class', 'group-badge');
      
      const badgeCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      badgeCircle.setAttribute('cx', -this.contactDotSize / 2 + 5);
      badgeCircle.setAttribute('cy', -this.contactDotSize / 2 + 5);
      badgeCircle.setAttribute('r', '8');
      badgeCircle.setAttribute('fill', '#6366f1');
      badgeCircle.setAttribute('stroke', 'white');
      badgeCircle.setAttribute('stroke-width', '2');
      groupBadge.appendChild(badgeCircle);
      
      if (contact.groups.length > 1) {
        const badgeText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        badgeText.setAttribute('x', -this.contactDotSize / 2 + 5);
        badgeText.setAttribute('y', -this.contactDotSize / 2 + 5);
        badgeText.setAttribute('text-anchor', 'middle');
        badgeText.setAttribute('dominant-baseline', 'middle');
        badgeText.setAttribute('fill', 'white');
        badgeText.setAttribute('font-size', '10');
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
    console.log('Show group filter:', groupId);
  }
  
  clearGroupFilter() {
    console.log('Clear group filter');
  }

  setupStyles() {
    if (document.getElementById('circular-visualizer-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'circular-visualizer-styles';
    style.textContent = `
      .circular-visualizer {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        background: #f9fafb;
        border-radius: 12px;
        overflow: hidden;
      }
      
      .visualizer-controls {
        padding: 20px;
        background: white;
        border-bottom: 2px solid #e5e7eb;
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
        background: #f9fafb;
        border-radius: 8px;
        transition: all 0.2s;
      }
      
      .legend-item:hover {
        background: #f3f4f6;
        transform: translateY(-2px);
      }
      
      .legend-color {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        border: 2px solid white;
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
        color: #374151;
      }
      
      .legend-size {
        font-size: 11px;
        font-weight: 500;
        color: #6b7280;
      }
      
      .visualizer-canvas {
        flex: 1;
        position: relative;
        min-height: 500px;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
      }
      
      .visualizer-svg {
        max-width: 100%;
        max-height: 100%;
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
        background: rgba(0, 0, 0, 0.9);
        color: white;
        padding: 12px 16px;
        border-radius: 8px;
        font-size: 13px;
        pointer-events: none;
        z-index: 10000;
        max-width: 300px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
      }
      
      .tooltip-name {
        font-weight: 600;
        margin-bottom: 4px;
        font-size: 14px;
      }
      
      .tooltip-detail {
        color: #d1d5db;
        font-size: 12px;
        margin-bottom: 2px;
      }
      
      .tooltip-groups {
        margin-top: 6px;
        padding-top: 6px;
        border-top: 1px solid rgba(255, 255, 255, 0.2);
        color: #a78bfa;
        font-size: 12px;
        font-weight: 500;
      }
      
      .tooltip-suggestion {
        margin-top: 8px;
        padding-top: 8px;
        border-top: 1px solid rgba(255, 255, 255, 0.2);
        color: #10b981;
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
          min-height: 350px;
          padding: 10px;
        }
        
        .contact-tooltip {
          max-width: 250px;
          padding: 10px 12px;
          font-size: 12px;
        }
        
        .tooltip-name {
          font-size: 13px;
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
