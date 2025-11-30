/**
 * Contact Pruning Integration Example
 *
 * Demonstrates how to integrate contact pruning features into your application.
 * 
 * Requirements: 12.1, 12.2, 12.3, 12.4, 12.5
 */

// Example 1: Archive a contact from any UI
async function archiveContactExample(contactId) {
  try {
    const response = await fetch(`/api/contacts/${contactId}/archive`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: getCurrentUserId(),
      }),
    });

    const data = await response.json();

    if (data.success) {
      console.log('Contact archived successfully');
      // Update UI to reflect archived status
      updateContactList();
    }
  } catch (error) {
    console.error('Error archiving contact:', error);
  }
}

// Example 2: Remove a contact with confirmation
async function removeContactWithConfirmation(contactId, contactName) {
  // Show confirmation dialog
  const confirmed = confirm(
    `Are you sure you want to permanently remove ${contactName}?\n\n` +
    'This action cannot be undone. All data for this contact will be deleted.'
  );

  if (!confirmed) {
    return;
  }

  try {
    const response = await fetch(`/api/contacts/${contactId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
      },
    });

    const data = await response.json();

    if (data.success) {
      console.log('Contact removed successfully');
      console.log('Updated circle distribution:', data.result.circleDistribution);
      // Update UI to reflect removal
      updateContactList();
      updateCircleDistribution(data.result.circleDistribution);
    }
  } catch (error) {
    console.error('Error removing contact:', error);
  }
}

// Example 3: View archived contacts
async function viewArchivedContacts() {
  try {
    const response = await fetch(`/api/contacts/archived?userId=${getCurrentUserId()}`, {
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
      },
    });

    const data = await response.json();

    if (data.success) {
      console.log(`Found ${data.count} archived contacts`);
      
      // Display archived contacts
      data.contacts.forEach(contact => {
        console.log(`- ${contact.name} (archived ${formatDate(contact.archivedAt)})`);
        if (contact.dunbarCircle) {
          console.log(`  Previous circle: ${contact.dunbarCircle}`);
        }
      });

      return data.contacts;
    }
  } catch (error) {
    console.error('Error fetching archived contacts:', error);
  }
}

// Example 4: Reactivate an archived contact
async function reactivateContact(contactId) {
  try {
    const response = await fetch(`/api/contacts/${contactId}/reactivate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: getCurrentUserId(),
      }),
    });

    const data = await response.json();

    if (data.success) {
      console.log('Contact reactivated successfully');
      console.log('Previous circle restored:', data.result.previousCircle);
      console.log('Updated circle distribution:', data.result.circleDistribution);
      
      // Update UI
      updateContactList();
      updateCircleDistribution(data.result.circleDistribution);
    }
  } catch (error) {
    console.error('Error reactivating contact:', error);
  }
}

// Example 5: Integrate with Weekly Catchup
class WeeklyCatchupWithPruning {
  constructor() {
    this.currentContact = null;
  }

  renderContactActions() {
    return `
      <div class="contact-actions">
        <!-- Keep/Update actions -->
        <button onclick="weeklyCatchup.keepContact()">Keep</button>
        
        <!-- Pruning actions -->
        <div class="pruning-actions">
          <button onclick="weeklyCatchup.archiveCurrentContact()">
            Archive
          </button>
          <button 
            class="btn-danger" 
            onclick="weeklyCatchup.confirmRemoveCurrentContact()"
          >
            Remove
          </button>
        </div>
      </div>
    `;
  }

  async archiveCurrentContact() {
    if (!this.currentContact) return;

    await archiveContactExample(this.currentContact.id);
    await this.loadNextContact();
  }

  confirmRemoveCurrentContact() {
    if (!this.currentContact) return;

    removeContactWithConfirmation(
      this.currentContact.id,
      this.currentContact.name
    ).then(() => {
      this.loadNextContact();
    });
  }
}

// Example 6: Add "View Archived" button to contacts page
function addArchivedContactsButton() {
  const button = document.createElement('button');
  button.textContent = 'View Archived Contacts';
  button.className = 'btn btn-secondary';
  button.onclick = async () => {
    const archivedContacts = await viewArchivedContacts();
    showArchivedContactsModal(archivedContacts);
  };
  
  document.querySelector('.contacts-header').appendChild(button);
}

// Example 7: Show archived contacts in a modal
function showArchivedContactsModal(contacts) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-content">
      <h2>Archived Contacts (${contacts.length})</h2>
      <div class="archived-list">
        ${contacts.map(contact => `
          <div class="archived-contact-item">
            <div class="contact-info">
              <strong>${contact.name}</strong>
              ${contact.email ? `<span>${contact.email}</span>` : ''}
              ${contact.dunbarCircle ? `<span class="circle-badge">${contact.dunbarCircle}</span>` : ''}
            </div>
            <button 
              class="btn btn-primary btn-sm"
              onclick="reactivateContact('${contact.id}').then(() => this.closest('.modal-overlay').remove())"
            >
              Reactivate
            </button>
          </div>
        `).join('')}
      </div>
      <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">
        Close
      </button>
    </div>
  `;
  
  document.body.appendChild(modal);
}

// Example 8: Monitor circle distribution changes
function setupCircleDistributionMonitor() {
  let previousDistribution = null;

  async function checkDistribution() {
    const response = await fetch(`/api/circles/distribution?userId=${getCurrentUserId()}`, {
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
      },
    });

    const distribution = await response.json();

    if (previousDistribution) {
      // Check for changes
      Object.keys(distribution).forEach(circle => {
        if (distribution[circle] !== previousDistribution[circle]) {
          console.log(`Circle ${circle} changed: ${previousDistribution[circle]} → ${distribution[circle]}`);
        }
      });
    }

    previousDistribution = distribution;
    return distribution;
  }

  // Check every 30 seconds
  setInterval(checkDistribution, 30000);
  
  // Initial check
  checkDistribution();
}

// Helper functions
function getAuthToken() {
  return localStorage.getItem('authToken') || '';
}

function getCurrentUserId() {
  return localStorage.getItem('userId') || '';
}

function formatDate(date) {
  const d = new Date(date);
  const now = new Date();
  const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return `${Math.floor(diffDays / 30)} months ago`;
}

function updateContactList() {
  // Refresh your contact list UI
  console.log('Updating contact list...');
}

function updateCircleDistribution(distribution) {
  // Update circle visualization with new counts
  console.log('Updating circle distribution:', distribution);
}

// Usage Examples:

// 1. Archive a contact
// archiveContactExample('contact-123');

// 2. Remove a contact with confirmation
// removeContactWithConfirmation('contact-123', 'John Doe');

// 3. View all archived contacts
// viewArchivedContacts();

// 4. Reactivate a contact
// reactivateContact('contact-123');

// 5. Add archived contacts button to page
// addArchivedContactsButton();

// 6. Monitor circle distribution changes
// setupCircleDistributionMonitor();
