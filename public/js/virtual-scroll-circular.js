/**
 * Virtual Scroll Circular Visualizer
 * 
 * Optimized circular visualizer with virtual scrolling for large contact lists.
 * Only renders contacts that are visible or near the viewport.
 * Requirements: 4.2 - Add virtual scrolling for circular visualization
 */

class VirtualScrollCircularVisualizer {
  constructor(containerId, options = {}) {
    this.containerId = containerId;
    this.container = null;
    this.svg = null;
    this.contacts = [];
    this.groups = [];
    
    // Virtual scrolling configuration
    this.virtualScrollEnabled = options.virtualScrollEnabled !== false;
    this.renderThreshold = options.renderThreshold || 100; // Enable virtual scroll for 100+ contacts
    this.visibilityBuffer = options.visibilityBuffer || 20; // Render extra items outside viewport
    this.maxRenderedItems = options.maxRenderedItems || 200; // Max items to render at once
    
    // Performance tracking
    this.renderCount = 0;
    this.lastRenderTime = 0;
    
    // Viewport state
    this.viewportState = {
      centerX: 450,
      centerY: 450,
      visibleRadius: 500,
      scale: 1,
    };
    
    // Rendered items cache
    this.renderedItems = new Map();
    
    this.init();
  }
  
  init() {
    this.setupContainer();
    this.setupPerformanceMonitoring();
  }
  
  setupContainer() {
    this.container = document.getElementById(this.containerId);
    if (!this.container) {
      console.error(`Container with id "${this.containerId}" not found`);
      return;
    }
    
    this.container.innerHTML = `
      <div class="virtual-scroll-visualizer">
        <div class="performance-stats" id="${this.containerId}-stats" style="display: none;">
          <span class="stat-label">Rendered:</span>
          <span class="stat-value" id="${this.containerId}-rendered">0</span>
          <span class="stat-label">Total:</span>
          <span class="stat-value" id="${this.containerId}-total">0</span>
          <span class="stat-label">Render Time:</span>
          <span class="stat-value" id="${this.containerId}-time">0ms</span>
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
  
  setupPerformanceMonitoring() {
    // Show performance stats in development
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      const stats = document.getElementById(`${this.containerId}-stats`);
      if (stats) {
        stats.style.display = 'flex';
      }
    }
  }
  
  /**
   * Render contacts with virtual scrolling optimization
   */
  render(contacts, groups = []) {
    const startTime = performance.now();
    
    this.contacts = contacts || [];
    this.groups = groups || [];
    
    if (!this.svg) {
      console.error('SVG element not initialized');
      return;
    }
    
    // Determine if virtual scrolling should be used
    const useVirtualScroll = this.virtualScrollEnabled && 
                             this.contacts.length >= this.renderThreshold;
    
    if (useVirtualScroll) {
      this.renderWithVirtualScroll();
    } else {
      this.renderAll();
    }
    
    // Update performance stats
    const renderTime = performance.now() - startTime;
    this.lastRenderTime = renderTime;
    this.renderCount++;
    this.updatePerformanceStats();
  }
  
  /**
   * Render all contacts (for small lists)
   */
  renderAll() {
    // Clear existing content
    const defs = this.svg.querySelector('defs');
    this.svg.innerHTML = '';
    if (defs) {
      this.svg.appendChild(defs);
    }
    
    // Render circles
    this.renderCircles();
    
    // Render all contacts
    const contactsGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    contactsGroup.setAttribute('class', 'contacts-group');
    
    const contactsByCircle = this.groupContactsByCircle();
    
    Object.keys(contactsByCircle).forEach(circleId => {
      const circleContacts = contactsByCircle[circleId];
      const positions = this.calculateContactPositions(circleId, circleContacts.length);
      
      circleContacts.forEach((contact, index) => {
        const pos = positions[index];
        const contactElement = this.createContactDot(contact, pos.x, pos.y);
        contactsGroup.appendChild(contactElement);
      });
    });
    
    this.svg.appendChild(contactsGroup);
    this.renderedItems.clear();
  }
  
  /**
   * Render with virtual scrolling (for large lists)
   */
  renderWithVirtualScroll() {
    // Clear existing content
    const defs = this.svg.querySelector('defs');
    this.svg.innerHTML = '';
    if (defs) {
      this.svg.appendChild(defs);
    }
    
    // Render circles
    this.renderCircles();
    
    // Group contacts by circle
    const contactsByCircle = this.groupContactsByCircle();
    
    // Calculate which contacts to render based on viewport
    const visibleContacts = this.calculateVisibleContacts(contactsByCircle);
    
    // Render only visible contacts
    const contactsGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    contactsGroup.setAttribute('class', 'contacts-group');
    
    visibleContacts.forEach(({ contact, x, y }) => {
      const contactElement = this.createContactDot(contact, x, y);
      contactsGroup.appendChild(contactElement);
      this.renderedItems.set(contact.id, { contact, x, y });
    });
    
    this.svg.appendChild(contactsGroup);
  }
  
  /**
   * Calculate which contacts are visible in viewport
   */
  calculateVisibleContacts(contactsByCircle) {
    const visible = [];
    const { centerX, centerY, visibleRadius } = this.viewportState;
    
    Object.keys(contactsByCircle).forEach(circleId => {
      const circleContacts = contactsByCircle[circleId];
      const positions = this.calculateContactPositions(circleId, circleContacts.length);
      
      circleContacts.forEach((contact, index) => {
        const pos = positions[index];
        
        // Calculate distance from viewport center
        const dx = pos.x - centerX;
        const dy = pos.y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Include if within visible radius + buffer
        if (distance <= visibleRadius + this.visibilityBuffer) {
          visible.push({ contact, x: pos.x, y: pos.y });
        }
      });
    });
    
    // Limit to max rendered items
    if (visible.length > this.maxRenderedItems) {
      // Sort by distance from center and take closest items
      visible.sort((a, b) => {
        const distA = Math.sqrt(
          Math.pow(a.x - centerX, 2) + Math.pow(a.y - centerY, 2)
        );
        const distB = Math.sqrt(
          Math.pow(b.x - centerX, 2) + Math.pow(b.y - centerY, 2)
        );
        return distA - distB;
      });
      
      return visible.slice(0, this.maxRenderedItems);
    }
    
    return visible;
  }
  
  /**
   * Group contacts by circle
   */
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
  
  /**
   * Calculate contact positions around a circle
   */
  calculateContactPositions(circleId, count) {
    const CIRCLE_DEFINITIONS = {
      inner: { radius: 80 },
      close: { radius: 160 },
      active: { radius: 240 },
      casual: { radius: 320 },
      acquaintance: { radius: 400 }
    };
    
    const circleDef = CIRCLE_DEFINITIONS[circleId];
    const radius = circleDef.radius;
    const positions = [];
    
    if (count === 0) return positions;
    
    const angleStep = (2 * Math.PI) / count;
    const startAngle = -Math.PI / 2;
    
    for (let i = 0; i < count; i++) {
      const angle = startAngle + (i * angleStep);
      const x = this.viewportState.centerX + radius * Math.cos(angle);
      const y = this.viewportState.centerY + radius * Math.sin(angle);
      positions.push({ x, y, angle });
    }
    
    return positions;
  }
  
  /**
   * Render circle rings
   */
  renderCircles() {
    const CIRCLE_DEFINITIONS = {
      inner: { radius: 80, color: '#8b5cf6' },
      close: { radius: 160, color: '#3b82f6' },
      active: { radius: 240, color: '#10b981' },
      casual: { radius: 320, color: '#f59e0b' },
      acquaintance: { radius: 400, color: '#6b7280' }
    };
    
    const circlesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    circlesGroup.setAttribute('class', 'circles-group');
    
    const circleOrder = ['acquaintance', 'casual', 'active', 'close', 'inner'];
    
    circleOrder.forEach(circleId => {
      const circleDef = CIRCLE_DEFINITIONS[circleId];
      
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', this.viewportState.centerX);
      circle.setAttribute('cy', this.viewportState.centerY);
      circle.setAttribute('r', circleDef.radius);
      circle.setAttribute('fill', 'none');
      circle.setAttribute('stroke', circleDef.color);
      circle.setAttribute('stroke-width', '2');
      circle.setAttribute('opacity', '0.3');
      circle.setAttribute('class', `circle-ring circle-${circleId}`);
      
      circlesGroup.appendChild(circle);
    });
    
    this.svg.appendChild(circlesGroup);
  }
  
  /**
   * Create contact dot element
   */
  createContactDot(contact, x, y) {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.setAttribute('class', 'contact-dot');
    group.setAttribute('data-contact-id', contact.id);
    group.setAttribute('transform', `translate(${x}, ${y})`);
    
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('r', '20');
    circle.setAttribute('fill', contact.color || this.getContactColor(contact));
    circle.setAttribute('stroke', 'white');
    circle.setAttribute('stroke-width', '3');
    circle.setAttribute('filter', 'url(#contact-shadow)');
    group.appendChild(circle);
    
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('dominant-baseline', 'middle');
    text.setAttribute('fill', 'white');
    text.setAttribute('font-size', '14');
    text.setAttribute('font-weight', '600');
    text.setAttribute('pointer-events', 'none');
    text.textContent = this.getInitials(contact.name);
    group.appendChild(text);
    
    return group;
  }
  
  /**
   * Get contact color
   */
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
  
  /**
   * Get initials from name
   */
  getInitials(name) {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length === 1) {
      return parts[0].substring(0, 2).toUpperCase();
    }
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  
  /**
   * Update performance statistics display
   */
  updatePerformanceStats() {
    const renderedEl = document.getElementById(`${this.containerId}-rendered`);
    const totalEl = document.getElementById(`${this.containerId}-total`);
    const timeEl = document.getElementById(`${this.containerId}-time`);
    
    if (renderedEl) {
      renderedEl.textContent = this.renderedItems.size || this.contacts.length;
    }
    if (totalEl) {
      totalEl.textContent = this.contacts.length;
    }
    if (timeEl) {
      timeEl.textContent = `${this.lastRenderTime.toFixed(2)}ms`;
    }
  }
  
  /**
   * Update viewport state (for zoom/pan)
   */
  updateViewport(centerX, centerY, visibleRadius, scale = 1) {
    this.viewportState = { centerX, centerY, visibleRadius, scale };
    
    // Re-render if using virtual scroll
    if (this.virtualScrollEnabled && this.contacts.length >= this.renderThreshold) {
      this.render(this.contacts, this.groups);
    }
  }
  
  /**
   * Get performance metrics
   */
  getPerformanceMetrics() {
    return {
      totalContacts: this.contacts.length,
      renderedContacts: this.renderedItems.size || this.contacts.length,
      lastRenderTime: this.lastRenderTime,
      renderCount: this.renderCount,
      virtualScrollEnabled: this.virtualScrollEnabled && 
                           this.contacts.length >= this.renderThreshold,
    };
  }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.VirtualScrollCircularVisualizer = VirtualScrollCircularVisualizer;
}
