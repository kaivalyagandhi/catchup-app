/**
 * UndoStateManager
 * 
 * Manages undo state for bulk actions in the circle assignment flow.
 * Stores previous state, handles restoration, and manages the undo stack.
 * 
 * Requirements: 8.4, 8.5, 8.6
 */

class UndoStateManager {
  constructor() {
    // Stack to store undo states (only most recent action)
    // Requirement 8.6: Support undo for the most recent bulk action only
    this.undoStack = null;
    this.isUndoInProgress = false;
  }

  /**
   * Store the current state before a bulk action
   * Requirements: 8.4
   * 
   * @param {Object} state - State to store
   * @param {string} state.actionType - Type of action (e.g., 'batch-assign', 'accept-all')
   * @param {Array} state.contacts - Array of contacts affected
   * @param {Object} state.previousValues - Previous values for each contact
   * @param {Function} state.restoreFunction - Function to call to restore state
   * @param {Object} [state.metadata] - Additional metadata about the action
   */
  saveState(state) {
    // Validate required fields
    if (!state.actionType || !state.contacts || !state.previousValues) {
      console.error('Invalid state object. Required fields: actionType, contacts, previousValues');
      return false;
    }

    // Clear any existing undo state (only keep most recent)
    // Requirement 8.6: Support undo for the most recent bulk action only
    this.clearUndoStack();

    // Store the new state
    this.undoStack = {
      actionType: state.actionType,
      contacts: this.deepClone(state.contacts),
      previousValues: this.deepClone(state.previousValues),
      restoreFunction: state.restoreFunction,
      metadata: state.metadata || {},
      timestamp: Date.now()
    };

    return true;
  }

  /**
   * Restore the previous state (undo the action)
   * Requirements: 8.4
   * 
   * @returns {Promise<Object>} Result of the restore operation
   */
  async restoreState() {
    if (!this.undoStack) {
      console.warn('No undo state available');
      return {
        success: false,
        error: 'No action to undo'
      };
    }

    if (this.isUndoInProgress) {
      console.warn('Undo already in progress');
      return {
        success: false,
        error: 'Undo already in progress'
      };
    }

    this.isUndoInProgress = true;

    try {
      const state = this.undoStack;

      // Call the restore function if provided
      if (typeof state.restoreFunction === 'function') {
        await state.restoreFunction(state.previousValues, state.contacts);
      } else {
        // Default restore logic: restore circle assignments
        await this.defaultRestore(state);
      }

      // Clear the undo stack after successful restore
      // Requirement 8.6: Clear undo stack after action
      const restoredState = this.deepClone(state);
      this.clearUndoStack();

      this.isUndoInProgress = false;

      return {
        success: true,
        actionType: restoredState.actionType,
        contactsRestored: restoredState.contacts.length,
        metadata: restoredState.metadata
      };
    } catch (error) {
      console.error('Error restoring state:', error);
      this.isUndoInProgress = false;

      return {
        success: false,
        error: error.message || 'Failed to restore state'
      };
    }
  }

  /**
   * Default restore logic for circle assignments
   * @private
   */
  async defaultRestore(state) {
    const { contacts, previousValues } = state;

    // Restore each contact's previous circle assignment
    for (const contact of contacts) {
      const previousValue = previousValues[contact.id];
      
      if (previousValue !== undefined) {
        // Update the contact's circle assignment
        contact.dunbarCircle = previousValue;
      }
    }

    // If there's a global state update function, call it
    if (typeof window.updateContactsState === 'function') {
      window.updateContactsState(contacts);
    }
  }

  /**
   * Clear the undo stack
   * Requirements: 8.5, 8.6
   */
  clearUndoStack() {
    this.undoStack = null;
  }

  /**
   * Check if undo is available
   * @returns {boolean} True if undo state exists
   */
  canUndo() {
    return this.undoStack !== null && !this.isUndoInProgress;
  }

  /**
   * Get information about the current undo state
   * @returns {Object|null} Undo state info or null
   */
  getUndoInfo() {
    if (!this.undoStack) {
      return null;
    }

    return {
      actionType: this.undoStack.actionType,
      contactCount: this.undoStack.contacts.length,
      timestamp: this.undoStack.timestamp,
      metadata: this.undoStack.metadata
    };
  }

  /**
   * Deep clone an object to prevent reference issues
   * @private
   */
  deepClone(obj) {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (obj instanceof Date) {
      return new Date(obj.getTime());
    }

    if (obj instanceof Array) {
      return obj.map(item => this.deepClone(item));
    }

    if (obj instanceof Object) {
      const clonedObj = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          clonedObj[key] = this.deepClone(obj[key]);
        }
      }
      return clonedObj;
    }

    return obj;
  }

  /**
   * Create a snapshot of contacts' current state
   * Helper method to capture state before bulk actions
   * 
   * @param {Array} contacts - Array of contact objects
   * @param {string} [field='dunbarCircle'] - Field to capture
   * @returns {Object} Map of contact ID to field value
   */
  captureContactState(contacts, field = 'dunbarCircle') {
    const snapshot = {};
    
    for (const contact of contacts) {
      snapshot[contact.id] = contact[field];
    }

    return snapshot;
  }

  /**
   * Create a complete undo state object for bulk circle assignment
   * Helper method to simplify state creation
   * 
   * @param {string} actionType - Type of action
   * @param {Array} contacts - Contacts being modified
   * @param {Function} restoreFunction - Function to restore state
   * @param {Object} [metadata] - Additional metadata
   * @returns {Object} Complete state object ready for saveState()
   */
  createBulkAssignmentState(actionType, contacts, restoreFunction, metadata = {}) {
    return {
      actionType,
      contacts,
      previousValues: this.captureContactState(contacts),
      restoreFunction,
      metadata: {
        ...metadata,
        contactIds: contacts.map(c => c.id),
        timestamp: Date.now()
      }
    };
  }
}

// Create a singleton instance for global use
const undoStateManager = new UndoStateManager();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { UndoStateManager, undoStateManager };
}
