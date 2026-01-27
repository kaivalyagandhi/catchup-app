/**
 * Undo Integration Example
 * 
 * This file demonstrates how to integrate UndoToast and UndoStateManager
 * for bulk circle assignment actions.
 * 
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6
 */

/**
 * Example 1: Accept All Quick Start Suggestions
 * 
 * This shows how to implement undo for the "Accept All" action
 * in the Quick Start flow.
 */
async function handleAcceptAllWithUndo(contacts, circle) {
  // 1. Capture current state before making changes
  const previousState = undoStateManager.captureContactState(contacts);

  // 2. Define the restore function
  const restoreFunction = async (previousValues, affectedContacts) => {
    // Restore each contact's previous circle assignment
    const restorePromises = affectedContacts.map(async (contact) => {
      const previousCircle = previousValues[contact.id];
      
      // Call API to restore the contact's circle
      const response = await fetch(`/api/contacts/${contact.id}/circle`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          circle: previousCircle
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to restore contact ${contact.id}`);
      }

      // Update local state
      contact.dunbarCircle = previousCircle;
    });

    await Promise.all(restorePromises);

    // Refresh the UI
    if (typeof window.refreshCircularVisualizer === 'function') {
      window.refreshCircularVisualizer();
    }

    // Show success message
    if (typeof showToast === 'function') {
      showToast('Successfully undone. Contacts restored to previous state.', 'success');
    }
  };

  // 3. Save the state before making changes
  const state = undoStateManager.createBulkAssignmentState(
    'accept-all',
    contacts,
    restoreFunction,
    {
      circle,
      contactCount: contacts.length
    }
  );

  undoStateManager.saveState(state);

  // 4. Perform the bulk assignment
  try {
    const response = await fetch('/api/contacts/circles/batch-accept', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      },
      body: JSON.stringify({
        contactIds: contacts.map(c => c.id),
        circle
      })
    });

    if (!response.ok) {
      throw new Error('Failed to assign contacts');
    }

    // Update local state
    contacts.forEach(contact => {
      contact.dunbarCircle = circle;
    });

    // 5. Show undo toast
    const undoToast = new UndoToast({
      message: `${contacts.length} contacts added to ${circle} circle`,
      onUndo: async () => {
        // Handle undo
        const result = await undoStateManager.restoreState();
        
        if (result.success) {
          console.log('Undo successful:', result);
        } else {
          console.error('Undo failed:', result.error);
          if (typeof showToast === 'function') {
            showToast(`Failed to undo: ${result.error}`, 'error');
          }
        }
      },
      duration: 10000 // 10 seconds
    });

    undoToast.show();

    // 6. Update UI
    if (typeof window.refreshCircularVisualizer === 'function') {
      window.refreshCircularVisualizer();
    }

  } catch (error) {
    console.error('Error in bulk assignment:', error);
    
    // Clear undo state on error
    undoStateManager.clearUndoStack();
    
    if (typeof showToast === 'function') {
      showToast(`Failed to assign contacts: ${error.message}`, 'error');
    }
  }
}

/**
 * Example 2: Accept Batch Suggestions
 * 
 * This shows how to implement undo for batch acceptance
 * in the Smart Batching flow.
 */
async function handleAcceptBatchWithUndo(batch) {
  const { contacts, suggestedCircle } = batch;

  // Capture state and create restore function
  const previousState = undoStateManager.captureContactState(contacts);

  const restoreFunction = async (previousValues, affectedContacts) => {
    // Batch restore API call
    const restoreData = affectedContacts.map(contact => ({
      contactId: contact.id,
      circle: previousValues[contact.id]
    }));

    const response = await fetch('/api/contacts/circles/batch-restore', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      },
      body: JSON.stringify({ assignments: restoreData })
    });

    if (!response.ok) {
      throw new Error('Failed to restore batch');
    }

    // Update local state
    affectedContacts.forEach(contact => {
      contact.dunbarCircle = previousValues[contact.id];
    });

    // Refresh UI
    if (typeof window.updateBatchProgress === 'function') {
      window.updateBatchProgress();
    }

    if (typeof showToast === 'function') {
      showToast('Batch assignment undone successfully', 'success');
    }
  };

  // Save state
  const state = undoStateManager.createBulkAssignmentState(
    'accept-batch',
    contacts,
    restoreFunction,
    {
      batchId: batch.id,
      batchName: batch.name,
      suggestedCircle
    }
  );

  undoStateManager.saveState(state);

  // Perform batch assignment
  try {
    const response = await fetch('/api/contacts/circles/batch-accept', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      },
      body: JSON.stringify({
        batchId: batch.id,
        circle: suggestedCircle,
        contactIds: contacts.map(c => c.id)
      })
    });

    if (!response.ok) {
      throw new Error('Failed to accept batch');
    }

    // Update local state
    contacts.forEach(contact => {
      contact.dunbarCircle = suggestedCircle;
    });

    // Show undo toast
    const undoToast = new UndoToast({
      message: `Batch "${batch.name}" assigned to ${suggestedCircle}`,
      onUndo: async () => {
        const result = await undoStateManager.restoreState();
        
        if (!result.success) {
          if (typeof showToast === 'function') {
            showToast(`Failed to undo: ${result.error}`, 'error');
          }
        }
      }
    });

    undoToast.show();

    // Update progress
    if (typeof window.updateBatchProgress === 'function') {
      window.updateBatchProgress();
    }

  } catch (error) {
    console.error('Error accepting batch:', error);
    undoStateManager.clearUndoStack();
    
    if (typeof showToast === 'function') {
      showToast(`Failed to accept batch: ${error.message}`, 'error');
    }
  }
}

/**
 * Example 3: Simple Undo Integration Pattern
 * 
 * A simplified pattern for any bulk action with undo
 */
async function performBulkActionWithUndo(options) {
  const {
    actionType,
    contacts,
    actionFunction,
    restoreFunction,
    successMessage,
    metadata = {}
  } = options;

  // Save state
  const state = undoStateManager.createBulkAssignmentState(
    actionType,
    contacts,
    restoreFunction,
    metadata
  );

  undoStateManager.saveState(state);

  try {
    // Perform the action
    await actionFunction(contacts);

    // Show undo toast
    const undoToast = new UndoToast({
      message: successMessage,
      onUndo: async () => {
        const result = await undoStateManager.restoreState();
        
        if (!result.success && typeof showToast === 'function') {
          showToast(`Failed to undo: ${result.error}`, 'error');
        }
      }
    });

    undoToast.show();

  } catch (error) {
    console.error(`Error in ${actionType}:`, error);
    undoStateManager.clearUndoStack();
    throw error;
  }
}

/**
 * Example 4: Check if undo is available
 */
function checkUndoAvailability() {
  if (undoStateManager.canUndo()) {
    const info = undoStateManager.getUndoInfo();
    console.log('Undo available:', info);
    return true;
  } else {
    console.log('No undo available');
    return false;
  }
}

// Export functions for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    handleAcceptAllWithUndo,
    handleAcceptBatchWithUndo,
    performBulkActionWithUndo,
    checkUndoAvailability
  };
}
