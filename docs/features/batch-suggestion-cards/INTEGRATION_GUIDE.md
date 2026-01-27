# Batch Suggestion Cards - Integration Guide

## Quick Start

### 1. Include Required Files

Add these files to your HTML page:

```html
<!-- CSS -->
<link rel="stylesheet" href="/css/batch-suggestion-card.css">
<link rel="stylesheet" href="/css/undo-toast.css">

<!-- JavaScript -->
<script src="/js/undo-toast.js"></script>
<script src="/js/batch-suggestion-card.js"></script>
```

### 2. Create Container

Add a container element where batch cards will be rendered:

```html
<div id="batch-suggestions-container"></div>
```

### 3. Fetch and Render Batches

```javascript
async function loadBatchSuggestions() {
  try {
    // Fetch batch suggestions from API
    const response = await fetch('/api/ai/batch-suggestions?userId=' + userId, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch batch suggestions');
    }
    
    const data = await response.json();
    
    // Get container
    const container = document.getElementById('batch-suggestions-container');
    container.innerHTML = ''; // Clear existing content
    
    // Create cards for each batch
    data.batches.forEach(batch => {
      const card = new BatchSuggestionCard(batch, {
        onAccept: handleBatchAccept,
        onSkip: handleBatchSkip,
        onProgressUpdate: updateProgress
      });
      
      const cardElement = card.render();
      container.appendChild(cardElement);
    });
    
  } catch (error) {
    console.error('Error loading batch suggestions:', error);
    showToast('Failed to load batch suggestions', 'error');
  }
}

// Handle batch acceptance
async function handleBatchAccept(data) {
  console.log('Batch accepted:', data);
  // Refresh contacts list
  await loadContacts();
  // Update circular visualizer
  if (window.circularVisualizer) {
    window.circularVisualizer.refresh();
  }
}

// Handle batch skip
function handleBatchSkip(data) {
  console.log('Batch skipped:', data);
  // Move to next batch or show completion
}

// Update progress
function updateProgress(increment) {
  currentProgress += increment;
  const progressBar = document.getElementById('progress-bar');
  if (progressBar) {
    progressBar.style.width = `${currentProgress}%`;
  }
}
```

## Integration with Onboarding Flow

### Step 2: Circle Assignment

The batch suggestion cards are designed to be used in Step 2 of the onboarding flow, after the Quick Start flow:

```javascript
// In step2-circles-handler.js or similar

class Step2CirclesHandler {
  async showBatchSuggestions() {
    // Fetch batch suggestions
    const response = await fetch('/api/ai/batch-suggestions?userId=' + this.userId);
    const data = await response.json();
    
    // Clear container
    const container = document.getElementById('batch-container');
    container.innerHTML = '';
    
    // Track progress
    let totalContacts = data.totalContacts;
    let processedContacts = 0;
    
    // Create cards
    data.batches.forEach(batch => {
      const card = new BatchSuggestionCard(batch, {
        onAccept: async (acceptData) => {
          processedContacts += acceptData.contactIds.length;
          this.updateProgress(processedContacts, totalContacts);
          
          // Check if all batches are complete
          if (processedContacts >= totalContacts) {
            this.completeStep2();
          }
        },
        onSkip: (skipData) => {
          // Track skipped contacts
          this.skippedContacts += skipData.contactCount;
        },
        onProgressUpdate: (increment) => {
          // Update progress bar
          this.progress += increment;
          this.updateProgressBar(this.progress);
        }
      });
      
      container.appendChild(card.render());
    });
  }
  
  updateProgress(processed, total) {
    const percentage = Math.round((processed / total) * 100);
    document.getElementById('progress-text').textContent = 
      `${processed} of ${total} contacts organized (${percentage}%)`;
  }
  
  completeStep2() {
    // Mark step 2 as complete
    // Move to step 3 or show completion
    showToast('Circle assignment complete!', 'success');
    this.onboardingIndicator.completeStep(2);
  }
}
```

## Progress Tracking

### Basic Progress Bar

```html
<div class="progress-container">
  <div class="progress-bar">
    <div class="progress-fill" id="progress-fill"></div>
  </div>
  <div class="progress-text" id="progress-text">0% Complete</div>
</div>
```

```javascript
let totalProgress = 0;

function updateProgress(increment) {
  totalProgress = Math.min(100, totalProgress + increment);
  
  const progressFill = document.getElementById('progress-fill');
  const progressText = document.getElementById('progress-text');
  
  progressFill.style.width = `${totalProgress}%`;
  progressText.textContent = `${totalProgress}% Complete`;
  
  // Show completion message
  if (totalProgress >= 100) {
    showToast('All batches processed!', 'success');
  }
}
```

## Undo Functionality

The undo functionality is automatically handled by the component. To customize the undo behavior:

```javascript
const card = new BatchSuggestionCard(batch, {
  onAccept: async (data) => {
    // Store undo state if needed
    const undoState = {
      batchId: data.batchId,
      contactIds: data.contactIds,
      circle: data.circle
    };
    
    // The component will show the undo toast automatically
    // You can listen for the undo event if needed
    window.addEventListener('batch-undone', (event) => {
      console.log('Batch was undone:', event.detail);
      // Refresh UI
    });
  }
});
```

## Error Handling

```javascript
// Global error handler for batch operations
window.addEventListener('batch-error', (event) => {
  const { error, batchId } = event.detail;
  console.error('Batch error:', error);
  showToast(`Failed to process batch: ${error.message}`, 'error');
});

// Handle API errors
async function handleBatchAccept(data) {
  try {
    // Your acceptance logic
  } catch (error) {
    // Show error to user
    showToast('Failed to accept batch. Please try again.', 'error');
    
    // Log for debugging
    console.error('Batch acceptance error:', error);
    
    // Optionally report to error tracking service
    if (window.errorTracker) {
      window.errorTracker.logError(error, { context: 'batch-accept' });
    }
  }
}
```

## Styling Customization

### Custom Colors

Override CSS variables to match your theme:

```css
:root {
  --primary-color: #your-primary-color;
  --primary-hover: #your-hover-color;
  --bg-secondary: #your-background;
  --text-primary: #your-text-color;
}
```

### Custom Circle Colors

```css
.circle-badge-inner {
  background: rgba(your-color, 0.1);
  color: your-color;
}

.circle-badge-close {
  background: rgba(your-color, 0.1);
  color: your-color;
}
```

## Events

The component dispatches custom events:

```javascript
// Listen for contacts update
window.addEventListener('contacts-updated', () => {
  console.log('Contacts were updated');
  // Refresh your contacts list
  loadContacts();
});

// Listen for batch acceptance
window.addEventListener('batch-accepted', (event) => {
  const { batchId, contactIds, circle } = event.detail;
  console.log('Batch accepted:', batchId);
});

// Listen for batch skip
window.addEventListener('batch-skipped', (event) => {
  const { batchId, contactCount } = event.detail;
  console.log('Batch skipped:', batchId);
});
```

## Best Practices

1. **Always fetch fresh data**: Don't cache batch suggestions for too long
2. **Handle errors gracefully**: Show user-friendly error messages
3. **Provide feedback**: Use toasts and progress indicators
4. **Enable undo**: Always show the undo toast after batch acceptance
5. **Update UI**: Refresh contacts and visualizers after batch operations
6. **Track progress**: Show users how much they've completed
7. **Mobile-first**: Test on mobile devices for touch interactions
8. **Accessibility**: Ensure keyboard navigation works

## Troubleshooting

### Cards not rendering
- Check if container element exists
- Verify batch data structure matches expected format
- Check browser console for errors

### Accept button not working
- Verify API endpoint is accessible
- Check authentication token is valid
- Ensure userId is set correctly

### Undo not working
- Verify batch-remove endpoint exists
- Check if UndoToast component is loaded
- Ensure undo callback is properly defined

### Progress not updating
- Verify onProgressUpdate callback is provided
- Check if progress bar element exists
- Ensure progress calculation is correct

## Example: Complete Integration

See `tests/html/batch-suggestion-card.test.html` for a complete working example with:
- Mock data
- Progress tracking
- Console logging
- Error handling
- All features demonstrated

## API Requirements

Ensure these endpoints are available:

1. **GET** `/api/ai/batch-suggestions?userId={userId}`
   - Returns batch suggestions grouped by signal strength

2. **POST** `/api/contacts/circles/batch-accept`
   - Accepts a batch and assigns contacts to circles

3. **POST** `/api/contacts/circles/batch-remove`
   - Removes circle assignments (for undo)

## Support

For issues or questions:
- Check the main README: `docs/features/batch-suggestion-cards/README.md`
- Review test file: `tests/html/batch-suggestion-card.test.html`
- Check API documentation: `docs/API.md`
