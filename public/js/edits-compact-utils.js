/**
 * Compact Edits UI Utilities
 * 
 * Helper functions for contact grouping, state management, and data transformation
 */

/**
 * Group edits by contact
 * @param {Array} edits - Array of pending edits
 * @returns {Array} Array of contact groups with edits
 */
function groupEditsByContact(edits) {
  const groups = {};
  
  // Group edits by contact
  edits.forEach(edit => {
    const contactId = edit.targetContactId || 'unknown';
    const contactName = edit.targetContactName || 'Unknown Contact';
    
    if (!groups[contactId]) {
      groups[contactId] = {
        contactId,
        contactName,
        edits: [],
        isExpanded: true,
        acceptedCount: 0,
        rejectedCount: 0,
        totalCount: 0
      };
    }
    
    groups[contactId].edits.push(edit);
  });
  
  // Calculate counts and convert to array
  return Object.values(groups)
    .map(group => {
      group.totalCount = group.edits.length;
      group.acceptedCount = group.edits.filter(e => e.accepted === true).length;
      group.rejectedCount = group.edits.filter(e => e.accepted === false).length;
      return group;
    })
    .sort((a, b) => a.contactName.localeCompare(b.contactName));
}

/**
 * Get confidence score color
 * @param {number} score - Confidence score (0-1)
 * @returns {string} Color class name
 */
function getConfidenceColor(score) {
  if (score < 0.5) return 'confidence-badge--low';
  if (score < 0.75) return 'confidence-badge--mid';
  return 'confidence-badge--high';
}

/**
 * Format confidence score as percentage
 * @param {number} score - Confidence score (0-1)
 * @returns {string} Formatted percentage
 */
function formatConfidenceScore(score) {
  return `${Math.round(score * 100)}%`;
}

/**
 * Get edit type badge class
 * @param {string} editType - Type of edit
 * @returns {string} Badge class name
 */
function getEditTypeBadgeClass(editType) {
  const typeMap = {
    'add_tag': 'edit-item-compact__type--add',
    'remove_tag': 'edit-item-compact__type--remove',
    'add_to_group': 'edit-item-compact__type--add',
    'remove_from_group': 'edit-item-compact__type--remove',
    'update_contact_field': 'edit-item-compact__type--update',
    'create_contact': 'edit-item-compact__type--create',
    'create_group': 'edit-item-compact__type--create'
  };
  return typeMap[editType] || 'edit-item-compact__type--update';
}

/**
 * Get edit type display text
 * @param {string} editType - Type of edit
 * @returns {string} Display text
 */
function getEditTypeText(editType) {
  const typeMap = {
    'add_tag': 'Add Tag',
    'remove_tag': 'Remove Tag',
    'add_to_group': 'Add Group',
    'remove_from_group': 'Remove Group',
    'update_contact_field': 'Update',
    'create_contact': 'New Contact',
    'create_group': 'New Group'
  };
  return typeMap[editType] || 'Edit';
}

/**
 * Get edit icon
 * @param {string} editType - Type of edit
 * @param {string} field - Field name (for field edits)
 * @returns {string} Icon emoji
 */
function getEditIcon(editType, field) {
  if (editType === 'update_contact_field' && field) {
    const fieldIcons = {
      'location': '📍',
      'phone': '📞',
      'email': '✉️',
      'customNotes': '📝',
      'linkedIn': '💼',
      'instagram': '📷',
      'xHandle': '🐦'
    };
    return fieldIcons[field] || '📝';
  }
  
  const icons = {
    'add_tag': '🏷️',
    'remove_tag': '🏷️',
    'add_to_group': '👥',
    'remove_from_group': '👥',
    'update_contact_field': '📝',
    'create_contact': '👤',
    'create_group': '👥'
  };
  return icons[editType] || '📝';
}

/**
 * Format edit value for display
 * @param {*} value - The value to format
 * @param {string} editType - Type of edit
 * @param {string} field - Field name
 * @returns {string} Formatted value
 */
function formatEditValue(value, editType, field) {
  if (editType === 'update_contact_field' && field) {
    return `${field}: ${value}`;
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}

/**
 * Get source type display text
 * @param {string} sourceType - Source type
 * @returns {string} Display text
 */
function getSourceTypeText(sourceType) {
  const typeMap = {
    'voice_transcript': 'Voice',
    'text_input': 'Text',
    'manual': 'Manual'
  };
  return typeMap[sourceType] || 'Unknown';
}

/**
 * Truncate text to max length
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
function truncateText(text, maxLength) {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

/**
 * Format timestamp for display
 * @param {Date|string} timestamp - Timestamp to format
 * @returns {string} Formatted timestamp
 */
function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    second: '2-digit'
  });
}

/**
 * Get contact initials for avatar
 * @param {string} name - Contact name
 * @returns {string} Initials
 */
function getContactInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Escape HTML special characters
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = String(text);
  return div.innerHTML;
}

/**
 * Validate edit value based on type
 * @param {*} value - Value to validate
 * @param {string} editType - Type of edit
 * @param {string} field - Field name
 * @returns {Object} { valid: boolean, error?: string }
 */
function validateEditValue(value, editType, field) {
  if (!value && value !== 0) {
    return { valid: false, error: 'Value cannot be empty' };
  }
  
  if (editType === 'update_contact_field' && field) {
    switch (field) {
      case 'email':
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          return { valid: false, error: 'Invalid email format' };
        }
        break;
      case 'phone':
        if (!/^[\d\s\-\+\(\)]+$/.test(value) || value.replace(/\D/g, '').length < 10) {
          return { valid: false, error: 'Invalid phone format' };
        }
        break;
    }
  }
  
  return { valid: true };
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    groupEditsByContact,
    getConfidenceColor,
    formatConfidenceScore,
    getEditTypeBadgeClass,
    getEditTypeText,
    getEditIcon,
    formatEditValue,
    getSourceTypeText,
    truncateText,
    formatTimestamp,
    getContactInitials,
    escapeHtml,
    validateEditValue
  };
}
