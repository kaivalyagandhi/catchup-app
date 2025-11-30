/**
 * Circular Visualizer Component
 * SVG-based circular visualization of contacts organized in Dunbar circles
 * Supports drag-and-drop, animations, and responsive sizing
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
    radius: 80
  },
  close: {
    id: 'close',
    name: 'Close Friends',
    description: 'Good friends you see regularly',
    recommendedSize: 15,
    maxSize: 15,
    defaultFrequency: 'biweekly',
    color: '#3b82f6',
    radius: 160
  },
  active: {
    id: 'active',
    name: 'Active Friends',
    description: 'Friends you maintain regular contact with',
    recommendedSize: 50,
    maxSize: 50,
    defaultFrequency: 'monthly',
    color: '#10b981',
    radius: 240
  },
  casual: {
    id: 'casual',
    name: 'Casual Network',
    description: 'Acquaintances and occasional contacts',
    recommendedSize: 150,
    maxSize: 150,
    defaultFrequency: 'quarterly',
    color: '#f59e0b',
    radius: 320
  },
  acquaintance: {
    id: 'acquaintance',
    name: 'Acquaintances',
    description: 'People you know but rarely interact with',
    recommendedSize: 500,
    maxSize: 1000,
    defaultFrequency: 'yearly',
    color: '#6b7280',
    radius: 400
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
    this.draggedContact = null;
    this.dragEnabled = true;
    this.viewportSize = 900;
    this.centerX = 450;
    this.centerY = 450;
    this.contactDotSize = 40;
    
    // Selection and batch drag support
    this.selectedContacts = new Set();
    this.batchDragMode = false;
    
    // Event listeners
    this.listeners = {
      contactDrag: [],
      contactClick: [],
      circleHover: [],
      contactUpdate: [],
      batchDrag: []
    };
    
    this.init();
  }
  
  init() {
    this.setupStyles();
    this.setupContainer();
    this.handleResize();
    
    // Add resize listener
    window.addEventListener('resize', () => this.handleResize());
    
    // Add orientation change listener for mobile
    window.addEventListener('orientationchange', () => this.handleOrientationChange());
    
    // Detect mobile device
    this.isMobile = this.detectMobile();
    
    // Apply mobile-specific optimizations
    if (this.isMobile) {
      this.applyMobileOptimizations();
    }
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
          <div class="group-filter-controls" id="${this.containerId}-group-controls">
            <div class="group-filter-header">
              <label class="group-filter-toggle">
                <input type="checkbox" id="${this.containerId}-group-toggle" />
                <span>Show Groups</span>
              </label>
            </div>
            <div class="group-filter-list" id="${this.containerId}-group-list" style="display: none;">
              <div class="group-filter-hint">Select a group to filter contacts:</div>
              <div class="group-filters" id="${this.containerId}-group-filters"></div>
              <div class="group-distribution" id="${this.containerId}-group-distribution" style="display: none;"></div>
            </div>
          </div>
          <div class="selection-controls" id="${this.containerId}-selection" style="display: none;">
            <div class="selection-info">
              <span class="selection-count">0 contacts selected</span>
              <button class="clear-selection-btn" id="${this.containerId}-clear-selection">Clear Selection</button>
            </div>
            <div class="selection-hint">Drag any selected contact to move all to a circle</div>
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
    
    // Add clear selection button handler
    const clearBtn = document.getElementById(`${this.containerId}-clear-selection`);
    if (clearBtn) {
      clearBtn.addEventListener('click', () => this.clearSelection());
    }
    
    // Add group toggle handler
    const groupToggle = document.getElementById(`${this.containerId}-group-toggle`);
    if (groupToggle) {
      groupToggle.addEventListener('change', (e) => this.handleGroupToggle(e.target.checked));
    }
  }
  
  handleGroupToggle(enabled) {
    const groupList = document.getElementById(`${this.containerId}-group-list`);
    if (groupList) {
      groupList.style.display = enabled ? 'block' : 'none';
    }
    
    if (!enabled) {
      // Clear any active filter when toggling off
      this.clearGroupFilter();
    } else {
      // Render group filters
      this.renderGroupFilters();
    }
  }
  
  renderGroupFilters() {
    const filtersContainer = document.getElementById(`${this.containerId}-group-filters`);
    if (!filtersContainer) return;
    
    if (!this.groups || this.groups.length === 0) {
      filtersContainer.innerHTML = '<div class="no-groups">No groups available</div>';
      return;
    }
    
    filtersContainer.innerHTML = `
      <button class="group-filter-btn ${!this.activeGroupFilter ? 'active' : ''}" data-group-id="all">
        All Contacts
      </button>
      ${this.groups.map(group => `
        <button class="group-filter-btn ${this.activeGroupFilter === group.id ? 'active' : ''}" 
                data-group-id="${group.id}">
          <span class="group-filter-name">${this.escapeHtml(group.name)}</span>
          <span class="group-filter-count">${this.getGroupContactCount(group.id)}</span>
        </button>
      `).join('')}
    `;
    
    // Add click handlers
    filtersContainer.querySelectorAll('.group-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const groupId = btn.getAttribute('data-group-id');
        if (groupId === 'all') {
          this.clearGroupFilter();
        } else {
          this.showGroupFilter(groupId);
        }
        this.renderGroupFilters(); // Re-render to update active state
      });
    });
  }
  
  getGroupContactCount(groupId) {
    if (!this.contacts) return 0;
    return this.contacts.filter(contact => 
      contact.groups && contact.groups.includes(groupId)
    ).length;
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
    
    // Calculate scale to fit
    const minDimension = Math.min(width, height);
    const scale = minDimension / this.viewportSize;
    
    // Adjust contact dot size for mobile
    if (this.isMobile) {
      const screenWidth = window.innerWidth;
      if (screenWidth < 480) {
        this.contactDotSize = 32; // Smaller dots for small screens
      } else if (screenWidth < 768) {
        this.contactDotSize = 36; // Medium dots for tablets
      } else {
        this.contactDotSize = 40; // Default size
      }
    }
    
    // Update SVG viewBox
    if (this.svg) {
      this.svg.setAttribute('viewBox', `0 0 ${this.viewportSize} ${this.viewportSize}`);
      this.svg.setAttribute('width', width);
      this.svg.setAttribute('height', height);
    }
    
    // Re-render if we have contacts
    if (this.contacts.length > 0) {
      this.render(this.contacts, this.groups);
    }
  }
  
  handleOrientationChange() {
    // Save current state before orientation change
    const state = this.saveState();
    
    // Wait for orientation change to complete
    setTimeout(() => {
      this.handleResize();
      
      // Restore state after orientation change
      this.restoreState(state);
    }, 100);
  }
  
  saveState() {
    return {
      selectedContacts: Array.from(this.selectedContacts),
      activeGroupFilter: this.activeGroupFilter,
      scrollPosition: window.scrollY
    };
  }
  
  restoreState(state) {
    if (!state) return;
    
    // Restore selected contacts
    this.selectedContacts = new Set(state.selectedContacts);
    this.updateSelectionUI();
    
    // Restore group filter
    if (state.activeGroupFilter) {
      this.activeGroupFilter = state.activeGroupFilter;
    }
    
    // Restore scroll position
    if (state.scrollPosition) {
      window.scrollTo(0, state.scrollPosition);
    }
    
    // Re-render with restored state
    this.render(this.contacts, this.groups);
  }
  
  detectMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           (window.innerWidth <= 768);
  }
  
  applyMobileOptimizations() {
    // Disable hover effects on mobile
    if (this.container) {
      this.container.classList.add('mobile-optimized');
    }
    
    // Increase touch target sizes
    this.contactDotSize = Math.max(this.contactDotSize, 36);
    
    // Enable momentum scrolling
    if (this.container) {
      this.container.style.webkitOverflowScrolling = 'touch';
    }
  }
  
  render(contacts, groups = []) {
    this.contacts = contacts || [];
    this.groups = groups || [];
    
    if (!this.svg) {
      console.error('SVG element not initialized');
      return;
    }
    
    // Clear existing content (except defs)
    const defs = this.svg.querySelector('defs');
    this.svg.innerHTML = '';
    if (defs) {
      this.svg.appendChild(defs);
    }
    
    // Render circles
    this.renderCircles();
    
    // Render contacts
    this.renderContacts();
    
    // Update legend counts
    this.updateLegendCounts();
  }
  
  renderCircles() {
    const circlesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    circlesGroup.setAttribute('class', 'circles-group');
    
    // Render circles from outermost to innermost
    for (let i = CIRCLE_ORDER.length - 1; i >= 0; i--) {
      const circleId = CIRCLE_ORDER[i];
      const circleDef = CIRCLE_DEFINITIONS[circleId];
      
      // Create circle element
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', this.centerX);
      circle.setAttribute('cy', this.centerY);
      circle.setAttribute('r', circleDef.radius);
      circle.setAttribute('fill', 'none');
      circle.setAttribute('stroke', circleDef.color);
      circle.setAttribute('stroke-width', '2');
      circle.setAttribute('opacity', '0.3');
      circle.setAttribute('class', `circle-ring circle-${circleId}`);
      circle.setAttribute('data-circle', circleId);
      
      // Add hover effect
      circle.addEventListener('mouseenter', () => this.handleCircleHover(circleId, true));
      circle.addEventListener('mouseleave', () => this.handleCircleHover(circleId, false));
      
      circlesGroup.appendChild(circle);
      
      // Add circle label
      const label = this.createCircleLabel(circleId, circleDef);
      circlesGroup.appendChild(label);
    }
    
    this.svg.appendChild(circlesGroup);
  }
  
  createCircleLabel(circleId, circleDef) {
    const labelGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    labelGroup.setAttribute('class', 'circle-label');
    
    // Position label at top of circle
    const labelY = this.centerY - circleDef.radius - 15;
    
    // Background rect for better readability
    const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bg.setAttribute('x', this.centerX - 60);
    bg.setAttribute('y', labelY - 12);
    bg.setAttribute('width', '120');
    bg.setAttribute('height', '24');
    bg.setAttribute('rx', '12');
    bg.setAttribute('fill', 'white');
    bg.setAttribute('opacity', '0.9');
    labelGroup.appendChild(bg);
    
    // Label text
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', this.centerX);
    text.setAttribute('y', labelY);
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('dominant-baseline', 'middle');
    text.setAttribute('fill', circleDef.color);
    text.setAttribute('font-size', '14');
    text.setAttribute('font-weight', '600');
    text.textContent = circleDef.name;
    labelGroup.appendChild(text);
    
    return labelGroup;
  }
  
  renderContacts() {
    const contactsGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    contactsGroup.setAttribute('class', 'contacts-group');
    
    // Group contacts by circle
    const contactsByCircle = this.groupContactsByCircle();
    
    // Render each circle's contacts
    CIRCLE_ORDER.forEach(circleId => {
      const circleContacts = contactsByCircle[circleId] || [];
      if (circleContacts.length === 0) return;
      
      // Filter by group if active
      let filteredContacts = circleContacts;
      if (this.activeGroupFilter) {
        filteredContacts = circleContacts.filter(contact => 
          contact.groups && contact.groups.includes(this.activeGroupFilter)
        );
      }
      
      // Position contacts around the circle
      const positions = this.calculateContactPositions(circleId, filteredContacts.length);
      
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
  
  calculateContactPositions(circleId, count) {
    const circleDef = CIRCLE_DEFINITIONS[circleId];
    const radius = circleDef.radius;
    const positions = [];
    
    if (count === 0) return positions;
    
    // Distribute contacts evenly around the circle
    const angleStep = (2 * Math.PI) / count;
    const startAngle = -Math.PI / 2; // Start at top
    
    for (let i = 0; i < count; i++) {
      const angle = startAngle + (i * angleStep);
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
    
    // Add selected class if contact is selected
    if (this.selectedContacts.has(contact.id)) {
      group.classList.add('selected');
    }
    
    // Circle background
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('r', this.contactDotSize / 2);
    circle.setAttribute('fill', contact.color || this.getContactColor(contact));
    circle.setAttribute('stroke', 'white');
    circle.setAttribute('stroke-width', '3');
    circle.setAttribute('filter', 'url(#contact-shadow)');
    circle.setAttribute('class', 'contact-circle');
    group.appendChild(circle);
    
    // Selection indicator ring
    if (this.selectedContacts.has(contact.id)) {
      const selectionRing = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      selectionRing.setAttribute('r', this.contactDotSize / 2 + 4);
      selectionRing.setAttribute('fill', 'none');
      selectionRing.setAttribute('stroke', '#3b82f6');
      selectionRing.setAttribute('stroke-width', '3');
      selectionRing.setAttribute('class', 'selection-ring');
      group.insertBefore(selectionRing, circle);
    }
    
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
      // Add group badge
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
      
      // Show count if multiple groups
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
    
    // Add event listeners
    this.addContactEventListeners(group, contact);
    
    // Add tooltip
    this.addContactTooltip(group, contact);
    
    return group;
  }
  
  getContactColor(contact) {
    // Generate consistent color based on contact name
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
  
  addContactEventListeners(group, contact) {
    if (!this.dragEnabled) return;
    
    let isDragging = false;
    let startX, startY;
    let draggedGroups = [];
    
    const handleMouseDown = (e) => {
      if (e.button !== 0) return; // Only left click
      
      // Handle selection with Ctrl/Cmd key
      if (e.ctrlKey || e.metaKey) {
        this.toggleContactSelection(contact.id);
        e.preventDefault();
        return;
      }
      
      isDragging = true;
      this.draggedContact = contact;
      
      const rect = this.svg.getBoundingClientRect();
      const scale = this.viewportSize / rect.width;
      startX = (e.clientX - rect.left) * scale;
      startY = (e.clientY - rect.top) * scale;
      
      // If dragging a selected contact, drag all selected contacts
      if (this.selectedContacts.has(contact.id) && this.selectedContacts.size > 1) {
        this.batchDragMode = true;
        draggedGroups = Array.from(this.selectedContacts).map(id => {
          const elem = this.svg.querySelector(`[data-contact-id="${id}"]`);
          if (elem) {
            elem.classList.add('dragging');
          }
          return { id, element: elem };
        }).filter(item => item.element);
      } else {
        group.classList.add('dragging');
        draggedGroups = [{ id: contact.id, element: group }];
      }
      
      this.highlightDropZones(true);
      
      e.preventDefault();
    };
    
    const handleMouseMove = (e) => {
      if (!isDragging) return;
      
      const rect = this.svg.getBoundingClientRect();
      const scale = this.viewportSize / rect.width;
      const currentX = (e.clientX - rect.left) * scale;
      const currentY = (e.clientY - rect.top) * scale;
      
      const dx = currentX - startX;
      const dy = currentY - startY;
      
      // Move all dragged elements
      draggedGroups.forEach(({ element }) => {
        if (!element) return;
        const transform = element.getAttribute('transform');
        const match = transform.match(/translate\(([^,]+),\s*([^)]+)\)/);
        if (match) {
          const origX = parseFloat(match[1]);
          const origY = parseFloat(match[2]);
          element.setAttribute('transform', `translate(${origX + dx}, ${origY + dy})`);
        }
      });
      
      startX = currentX;
      startY = currentY;
      
      // Check which circle we're over
      const targetCircle = this.getCircleAtPosition(currentX, currentY);
      this.highlightTargetCircle(targetCircle);
    };
    
    const handleMouseUp = (e) => {
      if (!isDragging) return;
      
      isDragging = false;
      
      // Remove dragging class from all elements
      draggedGroups.forEach(({ element }) => {
        if (element) {
          element.classList.remove('dragging');
        }
      });
      
      this.highlightDropZones(false);
      
      const rect = this.svg.getBoundingClientRect();
      const scale = this.viewportSize / rect.width;
      const currentX = (e.clientX - rect.left) * scale;
      const currentY = (e.clientY - rect.top) * scale;
      
      const targetCircle = this.getCircleAtPosition(currentX, currentY);
      
      if (targetCircle && this.batchDragMode && draggedGroups.length > 1) {
        // Batch drag operation
        const contactIds = draggedGroups.map(item => item.id);
        const fromCircles = contactIds.map(id => {
          const c = this.contacts.find(contact => contact.id === id);
          return c ? c.circle : null;
        });
        
        // Check if any contact would actually move
        const hasChanges = contactIds.some((id, idx) => fromCircles[idx] !== targetCircle);
        
        if (hasChanges) {
          this.emit('batchDrag', {
            contactIds,
            fromCircles,
            toCircle: targetCircle
          });
        } else {
          // Cancelled - animate all back
          draggedGroups.forEach(({ element, id }) => {
            const c = this.contacts.find(contact => contact.id === id);
            if (c && element) {
              this.animateContactBack(element, c);
            }
          });
        }
      } else if (targetCircle && targetCircle !== contact.circle) {
        // Single drag operation
        this.emit('contactDrag', {
          contactId: contact.id,
          fromCircle: contact.circle,
          toCircle: targetCircle
        });
      } else {
        // Cancelled - animate back
        draggedGroups.forEach(({ element, id }) => {
          const c = this.contacts.find(contact => contact.id === id);
          if (c && element) {
            this.animateContactBack(element, c);
          }
        });
      }
      
      this.draggedContact = null;
      this.batchDragMode = false;
      draggedGroups = [];
    };
    
    group.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    // Click handler
    group.addEventListener('click', (e) => {
      if (!isDragging) {
        // Don't emit click if we're doing selection
        if (!e.ctrlKey && !e.metaKey) {
          this.emit('contactClick', { contactId: contact.id, contact });
        }
      }
    });
    
    // Touch support for mobile
    this.addTouchSupport(group, contact);
  }
  
  addTouchSupport(group, contact) {
    let touchStartX, touchStartY;
    let isTouchDragging = false;
    let touchStartTime = 0;
    let longPressTimer = null;
    let draggedGroups = [];
    
    group.addEventListener('touchstart', (e) => {
      const touch = e.touches[0];
      const rect = this.svg.getBoundingClientRect();
      const scale = this.viewportSize / rect.width;
      
      touchStartX = (touch.clientX - rect.left) * scale;
      touchStartY = (touch.clientY - rect.top) * scale;
      touchStartTime = Date.now();
      
      // Long press for selection
      longPressTimer = setTimeout(() => {
        this.toggleContactSelection(contact.id);
        // Haptic feedback if available
        if (navigator.vibrate) {
          navigator.vibrate(50);
        }
      }, 500);
      
      e.preventDefault();
    });
    
    group.addEventListener('touchmove', (e) => {
      // Cancel long press if moving
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
      
      // Start dragging if moved enough
      if (!isTouchDragging) {
        const touch = e.touches[0];
        const rect = this.svg.getBoundingClientRect();
        const scale = this.viewportSize / rect.width;
        const currentX = (touch.clientX - rect.left) * scale;
        const currentY = (touch.clientY - rect.top) * scale;
        
        const distance = Math.sqrt(
          Math.pow(currentX - touchStartX, 2) + 
          Math.pow(currentY - touchStartY, 2)
        );
        
        if (distance > 10) {
          isTouchDragging = true;
          this.draggedContact = contact;
          
          // If dragging a selected contact, drag all selected contacts
          if (this.selectedContacts.has(contact.id) && this.selectedContacts.size > 1) {
            this.batchDragMode = true;
            draggedGroups = Array.from(this.selectedContacts).map(id => {
              const elem = this.svg.querySelector(`[data-contact-id="${id}"]`);
              if (elem) {
                elem.classList.add('dragging');
              }
              return { id, element: elem };
            }).filter(item => item.element);
          } else {
            group.classList.add('dragging');
            draggedGroups = [{ id: contact.id, element: group }];
          }
          
          this.highlightDropZones(true);
        }
      }
      
      if (!isTouchDragging) return;
      
      const touch = e.touches[0];
      const rect = this.svg.getBoundingClientRect();
      const scale = this.viewportSize / rect.width;
      const currentX = (touch.clientX - rect.left) * scale;
      const currentY = (touch.clientY - rect.top) * scale;
      
      const dx = currentX - touchStartX;
      const dy = currentY - touchStartY;
      
      // Move all dragged elements
      draggedGroups.forEach(({ element }) => {
        if (!element) return;
        const transform = element.getAttribute('transform');
        const match = transform.match(/translate\(([^,]+),\s*([^)]+)\)/);
        if (match) {
          const origX = parseFloat(match[1]);
          const origY = parseFloat(match[2]);
          element.setAttribute('transform', `translate(${origX + dx}, ${origY + dy})`);
        }
      });
      
      touchStartX = currentX;
      touchStartY = currentY;
      
      const targetCircle = this.getCircleAtPosition(currentX, currentY);
      this.highlightTargetCircle(targetCircle);
      
      e.preventDefault();
    });
    
    group.addEventListener('touchend', (e) => {
      // Cancel long press timer
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
      
      if (!isTouchDragging) {
        // Quick tap - treat as click if not selecting
        const touchDuration = Date.now() - touchStartTime;
        if (touchDuration < 200) {
          this.emit('contactClick', { contactId: contact.id, contact });
        }
        return;
      }
      
      isTouchDragging = false;
      
      // Remove dragging class from all elements
      draggedGroups.forEach(({ element }) => {
        if (element) {
          element.classList.remove('dragging');
        }
      });
      
      this.highlightDropZones(false);
      
      const touch = e.changedTouches[0];
      const rect = this.svg.getBoundingClientRect();
      const scale = this.viewportSize / rect.width;
      const currentX = (touch.clientX - rect.left) * scale;
      const currentY = (touch.clientY - rect.top) * scale;
      
      const targetCircle = this.getCircleAtPosition(currentX, currentY);
      
      if (targetCircle && this.batchDragMode && draggedGroups.length > 1) {
        // Batch drag operation
        const contactIds = draggedGroups.map(item => item.id);
        const fromCircles = contactIds.map(id => {
          const c = this.contacts.find(contact => contact.id === id);
          return c ? c.circle : null;
        });
        
        const hasChanges = contactIds.some((id, idx) => fromCircles[idx] !== targetCircle);
        
        if (hasChanges) {
          this.emit('batchDrag', {
            contactIds,
            fromCircles,
            toCircle: targetCircle
          });
        } else {
          draggedGroups.forEach(({ element, id }) => {
            const c = this.contacts.find(contact => contact.id === id);
            if (c && element) {
              this.animateContactBack(element, c);
            }
          });
        }
      } else if (targetCircle && targetCircle !== contact.circle) {
        this.emit('contactDrag', {
          contactId: contact.id,
          fromCircle: contact.circle,
          toCircle: targetCircle
        });
      } else {
        draggedGroups.forEach(({ element, id }) => {
          const c = this.contacts.find(contact => contact.id === id);
          if (c && element) {
            this.animateContactBack(element, c);
          }
        });
      }
      
      this.draggedContact = null;
      this.batchDragMode = false;
      draggedGroups = [];
    });
  }
  
  addContactTooltip(group, contact) {
    const tooltip = document.createElement('div');
    tooltip.className = 'contact-tooltip';
    
    // Build group names list
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
    const offset = 10;
    tooltip.style.left = (e.pageX + offset) + 'px';
    tooltip.style.top = (e.pageY + offset) + 'px';
  }
  
  escapeHtml(text) {
    if (text === null || text === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
  }
  
  getCircleAtPosition(x, y) {
    const dx = x - this.centerX;
    const dy = y - this.centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Find which circle this distance falls into
    for (let i = 0; i < CIRCLE_ORDER.length; i++) {
      const circleId = CIRCLE_ORDER[i];
      const circleDef = CIRCLE_DEFINITIONS[circleId];
      
      // Check if within this circle's radius
      const innerRadius = i > 0 ? CIRCLE_DEFINITIONS[CIRCLE_ORDER[i - 1]].radius : 0;
      const outerRadius = circleDef.radius;
      
      if (distance >= innerRadius && distance <= outerRadius) {
        return circleId;
      }
    }
    
    return null;
  }
  
  highlightDropZones(highlight) {
    const circles = this.svg.querySelectorAll('.circle-ring');
    circles.forEach(circle => {
      if (highlight) {
        circle.setAttribute('opacity', '0.6');
        circle.setAttribute('stroke-width', '3');
      } else {
        circle.setAttribute('opacity', '0.3');
        circle.setAttribute('stroke-width', '2');
      }
    });
  }
  
  highlightTargetCircle(circleId) {
    const circles = this.svg.querySelectorAll('.circle-ring');
    circles.forEach(circle => {
      const id = circle.getAttribute('data-circle');
      if (id === circleId) {
        circle.setAttribute('opacity', '0.8');
        circle.setAttribute('stroke-width', '4');
      } else {
        circle.setAttribute('opacity', '0.4');
        circle.setAttribute('stroke-width', '2');
      }
    });
  }
  
  animateContactBack(group, contact) {
    // Get original position
    const circle = contact.circle || contact.dunbarCircle;
    if (!circle) return;
    
    const contactsByCircle = this.groupContactsByCircle();
    const circleContacts = contactsByCircle[circle] || [];
    const index = circleContacts.findIndex(c => c.id === contact.id);
    
    if (index === -1) return;
    
    const positions = this.calculateContactPositions(circle, circleContacts.length);
    const targetPos = positions[index];
    
    // Animate back to original position
    group.style.transition = 'transform 0.3s ease-out';
    group.setAttribute('transform', `translate(${targetPos.x}, ${targetPos.y})`);
    
    setTimeout(() => {
      group.style.transition = '';
    }, 300);
  }
  
  updateContact(contactId, newCircle) {
    // Find and update contact
    const contact = this.contacts.find(c => c.id === contactId);
    if (!contact) return;
    
    const oldCircle = contact.circle;
    contact.circle = newCircle;
    
    // Animate transition
    this.animateTransition(contactId, oldCircle, newCircle);
    
    // Re-render
    this.render(this.contacts, this.groups);
    
    this.emit('contactUpdate', { contactId, oldCircle, newCircle });
  }
  
  updateMultipleContacts(updates) {
    // updates is an array of { contactId, newCircle }
    const updatedContacts = [];
    
    updates.forEach(({ contactId, newCircle }) => {
      const contact = this.contacts.find(c => c.id === contactId);
      if (contact) {
        const oldCircle = contact.circle;
        contact.circle = newCircle;
        updatedContacts.push({ contactId, oldCircle, newCircle });
        
        // Animate transition
        this.animateTransition(contactId, oldCircle, newCircle);
      }
    });
    
    // Re-render once after all updates
    this.render(this.contacts, this.groups);
    
    // Emit batch update event
    if (updatedContacts.length > 0) {
      this.emit('contactUpdate', { batch: true, updates: updatedContacts });
    }
  }
  
  animateTransition(contactId, fromCircle, toCircle) {
    const group = this.svg.querySelector(`[data-contact-id="${contactId}"]`);
    if (!group) return;
    
    // Add celebration animation
    group.classList.add('contact-updating');
    
    setTimeout(() => {
      group.classList.remove('contact-updating');
    }, 500);
  }
  
  highlightCircle(circleId) {
    const circle = this.svg.querySelector(`.circle-${circleId}`);
    if (circle) {
      circle.setAttribute('opacity', '0.8');
      circle.setAttribute('stroke-width', '4');
      
      setTimeout(() => {
        circle.setAttribute('opacity', '0.3');
        circle.setAttribute('stroke-width', '2');
      }, 1000);
    }
  }
  
  handleCircleHover(circleId, isHovering) {
    const circleDef = CIRCLE_DEFINITIONS[circleId];
    
    this.emit('circleHover', {
      circleId,
      isHovering,
      circle: circleDef
    });
  }
  
  updateLegendCounts() {
    const contactsByCircle = this.groupContactsByCircle();
    
    CIRCLE_ORDER.forEach(circleId => {
      const count = (contactsByCircle[circleId] || []).length;
      const circleDef = CIRCLE_DEFINITIONS[circleId];
      const legendSize = document.getElementById(`legend-size-${circleId}`);
      
      if (legendSize) {
        legendSize.textContent = `${count} / ${circleDef.recommendedSize}`;
        
        // Color code based on capacity
        if (count > circleDef.maxSize) {
          legendSize.style.color = '#ef4444'; // Over capacity
        } else if (count > circleDef.recommendedSize) {
          legendSize.style.color = '#f59e0b'; // Above recommended
        } else {
          legendSize.style.color = '#10b981'; // Good
        }
      }
    });
  }
  
  showGroupFilter(groupId) {
    this.activeGroupFilter = groupId;
    this.render(this.contacts, this.groups);
    this.updateGroupDistribution();
  }
  
  clearGroupFilter() {
    this.activeGroupFilter = null;
    this.render(this.contacts, this.groups);
    this.hideGroupDistribution();
  }
  
  updateGroupDistribution() {
    const distributionContainer = document.getElementById(`${this.containerId}-group-distribution`);
    if (!distributionContainer || !this.activeGroupFilter) {
      this.hideGroupDistribution();
      return;
    }
    
    // Get group name
    const group = this.groups.find(g => g.id === this.activeGroupFilter);
    if (!group) {
      this.hideGroupDistribution();
      return;
    }
    
    // Calculate distribution
    const filteredContacts = this.contacts.filter(contact => 
      contact.groups && contact.groups.includes(this.activeGroupFilter)
    );
    
    const distribution = {};
    CIRCLE_ORDER.forEach(circleId => {
      distribution[circleId] = filteredContacts.filter(c => 
        (c.circle || c.dunbarCircle) === circleId
      ).length;
    });
    
    const total = filteredContacts.length;
    
    // Render distribution
    distributionContainer.style.display = 'block';
    distributionContainer.innerHTML = `
      <div class="distribution-header">
        <strong>${this.escapeHtml(group.name)}</strong> Distribution (${total} contacts)
      </div>
      <div class="distribution-bars">
        ${CIRCLE_ORDER.map(circleId => {
          const circleDef = CIRCLE_DEFINITIONS[circleId];
          const count = distribution[circleId] || 0;
          const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
          
          return `
            <div class="distribution-bar-item">
              <div class="distribution-bar-label">
                <span class="distribution-circle-name">${circleDef.name}</span>
                <span class="distribution-count">${count} (${percentage}%)</span>
              </div>
              <div class="distribution-bar-track">
                <div class="distribution-bar-fill" 
                     style="width: ${percentage}%; background: ${circleDef.color};">
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }
  
  hideGroupDistribution() {
    const distributionContainer = document.getElementById(`${this.containerId}-group-distribution`);
    if (distributionContainer) {
      distributionContainer.style.display = 'none';
    }
  }
  
  enableDragDrop() {
    this.dragEnabled = true;
  }
  
  disableDragDrop() {
    this.dragEnabled = false;
  }
  
  // Selection management
  toggleContactSelection(contactId) {
    if (this.selectedContacts.has(contactId)) {
      this.selectedContacts.delete(contactId);
    } else {
      this.selectedContacts.add(contactId);
    }
    
    // Update selection UI
    this.updateSelectionUI();
    
    // Re-render to show selection state
    this.render(this.contacts, this.groups);
  }
  
  selectContact(contactId) {
    this.selectedContacts.add(contactId);
    this.updateSelectionUI();
    this.render(this.contacts, this.groups);
  }
  
  deselectContact(contactId) {
    this.selectedContacts.delete(contactId);
    this.updateSelectionUI();
    this.render(this.contacts, this.groups);
  }
  
  selectMultipleContacts(contactIds) {
    contactIds.forEach(id => this.selectedContacts.add(id));
    this.updateSelectionUI();
    this.render(this.contacts, this.groups);
  }
  
  clearSelection() {
    this.selectedContacts.clear();
    this.updateSelectionUI();
    this.render(this.contacts, this.groups);
  }
  
  getSelectedContacts() {
    return Array.from(this.selectedContacts);
  }
  
  isContactSelected(contactId) {
    return this.selectedContacts.has(contactId);
  }
  
  updateSelectionUI() {
    const selectionControls = document.getElementById(`${this.containerId}-selection`);
    if (!selectionControls) return;
    
    const count = this.selectedContacts.size;
    
    if (count > 0) {
      selectionControls.style.display = 'block';
      const countSpan = selectionControls.querySelector('.selection-count');
      if (countSpan) {
        countSpan.textContent = `${count} contact${count !== 1 ? 's' : ''} selected`;
      }
    } else {
      selectionControls.style.display = 'none';
    }
  }
  
  celebrateMilestone(milestone) {
    // Create celebration overlay
    const overlay = document.createElement('div');
    overlay.className = 'milestone-celebration';
    overlay.innerHTML = `
      <div class="celebration-content">
        <div class="celebration-icon">🎉</div>
        <div class="celebration-text">${this.escapeHtml(milestone)}</div>
      </div>
    `;
    
    this.container.appendChild(overlay);
    
    // Animate in
    setTimeout(() => {
      overlay.classList.add('show');
    }, 10);
    
    // Remove after animation
    setTimeout(() => {
      overlay.classList.remove('show');
      setTimeout(() => {
        if (overlay.parentNode) {
          overlay.parentNode.removeChild(overlay);
        }
      }, 300);
    }, 3000);
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
  
  // Utility methods
  getCircleDistribution() {
    const contactsByCircle = this.groupContactsByCircle();
    const distribution = {};
    
    CIRCLE_ORDER.forEach(circleId => {
      distribution[circleId] = (contactsByCircle[circleId] || []).length;
    });
    
    return distribution;
  }
  
  getCircleCapacity(circleId) {
    const circleDef = CIRCLE_DEFINITIONS[circleId];
    const contactsByCircle = this.groupContactsByCircle();
    const currentSize = (contactsByCircle[circleId] || []).length;
    
    return {
      circle: circleId,
      currentSize,
      recommendedSize: circleDef.recommendedSize,
      maxSize: circleDef.maxSize,
      status: currentSize > circleDef.maxSize ? 'over' : 
              currentSize > circleDef.recommendedSize ? 'above' : 'optimal'
    };
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
        margin-bottom: 16px;
      }
      
      .group-filter-controls {
        margin-top: 16px;
        padding: 16px;
        background: #f9fafb;
        border-radius: 8px;
        border: 1px solid #e5e7eb;
      }
      
      .group-filter-header {
        margin-bottom: 12px;
      }
      
      .group-filter-toggle {
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 600;
        color: #374151;
        user-select: none;
      }
      
      .group-filter-toggle input[type="checkbox"] {
        width: 18px;
        height: 18px;
        cursor: pointer;
      }
      
      .group-filter-list {
        animation: slideDown 0.3s ease-out;
      }
      
      .group-filter-hint {
        font-size: 12px;
        color: #6b7280;
        margin-bottom: 12px;
      }
      
      .group-filters {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-bottom: 16px;
      }
      
      .group-filter-btn {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 14px;
        background: white;
        border: 2px solid #e5e7eb;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 500;
        color: #374151;
        cursor: pointer;
        transition: all 0.2s;
      }
      
      .group-filter-btn:hover {
        border-color: #6366f1;
        background: #f5f3ff;
        transform: translateY(-1px);
      }
      
      .group-filter-btn.active {
        background: #6366f1;
        border-color: #6366f1;
        color: white;
      }
      
      .group-filter-name {
        font-weight: 600;
      }
      
      .group-filter-count {
        padding: 2px 8px;
        background: rgba(0, 0, 0, 0.1);
        border-radius: 12px;
        font-size: 11px;
        font-weight: 700;
      }
      
      .group-filter-btn.active .group-filter-count {
        background: rgba(255, 255, 255, 0.3);
      }
      
      .no-groups {
        padding: 12px;
        text-align: center;
        color: #9ca3af;
        font-size: 13px;
        font-style: italic;
      }
      
      .group-distribution {
        padding: 16px;
        background: white;
        border-radius: 8px;
        border: 2px solid #6366f1;
        animation: slideDown 0.3s ease-out;
      }
      
      .distribution-header {
        font-size: 14px;
        color: #374151;
        margin-bottom: 12px;
        padding-bottom: 8px;
        border-bottom: 1px solid #e5e7eb;
      }
      
      .distribution-bars {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      
      .distribution-bar-item {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      
      .distribution-bar-label {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 12px;
      }
      
      .distribution-circle-name {
        font-weight: 600;
        color: #374151;
      }
      
      .distribution-count {
        color: #6b7280;
        font-weight: 500;
      }
      
      .distribution-bar-track {
        height: 8px;
        background: #f3f4f6;
        border-radius: 4px;
        overflow: hidden;
      }
      
      .distribution-bar-fill {
        height: 100%;
        border-radius: 4px;
        transition: width 0.3s ease-out;
      }
      
      .selection-controls {
        margin-top: 16px;
        padding: 12px 16px;
        background: #eff6ff;
        border: 2px solid #3b82f6;
        border-radius: 8px;
        animation: slideDown 0.3s ease-out;
      }
      
      @keyframes slideDown {
        from {
          opacity: 0;
          transform: translateY(-10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      .selection-info {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 8px;
      }
      
      .selection-count {
        font-size: 14px;
        font-weight: 600;
        color: #1e40af;
      }
      
      .clear-selection-btn {
        padding: 6px 12px;
        background: white;
        border: 1px solid #3b82f6;
        border-radius: 6px;
        color: #3b82f6;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
      }
      
      .clear-selection-btn:hover {
        background: #3b82f6;
        color: white;
      }
      
      .selection-hint {
        font-size: 12px;
        color: #1e40af;
        opacity: 0.8;
      }
      
      .legend-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        background: #f9fafb;
        border-radius: 8px;
        cursor: pointer;
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
      }
      
      .visualizer-svg {
        max-width: 100%;
        max-height: 100%;
      }
      
      .contact-dot {
        cursor: grab;
        transition: transform 0.2s ease-out;
      }
      
      .contact-dot:hover {
        transform: scale(1.1);
      }
      
      .contact-dot.dragging {
        cursor: grabbing;
        opacity: 0.8;
      }
      
      .contact-dot.selected {
        filter: drop-shadow(0 0 8px rgba(59, 130, 246, 0.6));
      }
      
      .contact-dot.selected .selection-ring {
        animation: selection-pulse 1.5s ease-in-out infinite;
      }
      
      .contact-dot.contact-updating {
        animation: pulse 0.5s ease-out;
      }
      
      @keyframes pulse {
        0%, 100% {
          transform: scale(1);
        }
        50% {
          transform: scale(1.2);
        }
      }
      
      @keyframes selection-pulse {
        0%, 100% {
          opacity: 1;
        }
        50% {
          opacity: 0.5;
        }
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
      
      .milestone-celebration {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: opacity 0.3s ease-out;
        z-index: 1000;
      }
      
      .milestone-celebration.show {
        opacity: 1;
      }
      
      .celebration-content {
        background: white;
        padding: 40px 60px;
        border-radius: 16px;
        text-align: center;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        transform: scale(0.8);
        transition: transform 0.3s ease-out;
      }
      
      .milestone-celebration.show .celebration-content {
        transform: scale(1);
      }
      
      .celebration-icon {
        font-size: 64px;
        margin-bottom: 16px;
      }
      
      .celebration-text {
        font-size: 24px;
        font-weight: 600;
        color: #1f2937;
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
        }
        
        .celebration-content {
          padding: 30px 40px;
        }
        
        .celebration-icon {
          font-size: 48px;
        }
        
        .celebration-text {
          font-size: 18px;
        }
        
        .group-filter-controls {
          padding: 12px;
        }
        
        .group-filters {
          gap: 6px;
        }
        
        .group-filter-btn {
          padding: 6px 10px;
          font-size: 12px;
        }
        
        .selection-controls {
          padding: 10px 12px;
        }
        
        .selection-info {
          flex-direction: column;
          align-items: flex-start;
          gap: 8px;
        }
        
        .clear-selection-btn {
          width: 100%;
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
        }
        
        .group-filter-controls {
          padding: 10px;
        }
        
        .group-filter-btn {
          padding: 5px 8px;
          font-size: 11px;
        }
        
        .group-filter-count {
          padding: 1px 6px;
          font-size: 10px;
        }
        
        .distribution-header {
          font-size: 12px;
        }
        
        .distribution-bar-label {
          font-size: 11px;
        }
        
        .contact-tooltip {
          max-width: 250px;
          padding: 10px 12px;
          font-size: 12px;
        }
        
        .tooltip-name {
          font-size: 13px;
        }
        
        .celebration-content {
          padding: 20px 30px;
        }
        
        .celebration-icon {
          font-size: 36px;
        }
        
        .celebration-text {
          font-size: 16px;
        }
      }
      
      /* Touch-optimized styles */
      .mobile-optimized .contact-dot {
        cursor: pointer;
      }
      
      .mobile-optimized .contact-dot:hover {
        transform: none;
      }
      
      .mobile-optimized .contact-dot:active {
        transform: scale(1.1);
      }
      
      .mobile-optimized .legend-item:hover {
        transform: none;
      }
      
      .mobile-optimized .legend-item:active {
        background: #e5e7eb;
      }
      
      /* Landscape orientation adjustments */
      @media (max-height: 500px) and (orientation: landscape) {
        .visualizer-controls {
          padding: 10px;
        }
        
        .circle-legend {
          gap: 8px;
        }
        
        .legend-item {
          padding: 4px 8px;
        }
        
        .visualizer-canvas {
          min-height: 300px;
        }
        
        .group-filter-controls {
          padding: 8px;
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
