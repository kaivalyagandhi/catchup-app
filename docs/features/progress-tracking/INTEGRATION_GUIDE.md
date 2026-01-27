# Progress Tracker Integration Guide

## Quick Start

### 1. Include the Component

```html
<!-- In your HTML file -->
<script src="/js/progress-tracker.js"></script>

<!-- Add container element -->
<div id="progress-tracker-container"></div>
```

### 2. Initialize

```javascript
const progressTracker = new ProgressTracker({
  containerId: 'progress-tracker-container',
  totalContacts: 100,
  categorizedContacts: 0,
  startTime: Date.now(),
  circleCapacities: {
    inner: { current: 0, max: 10 },
    close: { current: 0, max: 25 },
    active: { current: 0, max: 50 },
    casual: { current: 0, max: 100 }
  },
  onMilestone: (milestone) => {
    console.log('Milestone reached:', milestone);
  }
});

progressTracker.render();
```

### 3. Update Progress

```javascript
// When a contact is categorized
function onContactCategorized(contactId, circle) {
  categorizedCount++;
  circleCapacities[circle].current++;
  
  progressTracker.update(
    categorizedCount,
    totalContacts,
    circleCapacities
  );
}
```

## Integration with Existing Components

### QuickStartFlow Integration

```javascript
// In public/js/quick-start-flow.js

class QuickStartFlow {
  constructor(options = {}) {
    // ... existing code ...
    
    // Add progress tracker
    this.progressTracker = new ProgressTracker({
      containerId: 'quick-start-progress',
      totalContacts: 0,
      categorizedContacts: 0,
      onMilestone: (milestone) => {
        this.handleMilestone(milestone);
      }
    });
  }
  
  async render() {
    // ... existing code ...
    
    // Initialize progress tracker with contact count
    this.progressTracker.update(
      0,
      this.contacts.length,
      this.getCircleCapacities()
    );
  }
  
  async handleAcceptAll() {
    // ... existing batch assignment code ...
    
    // Update progress tracker
    this.progressTracker.update(
      this.contacts.length,
      this.contacts.length,
      this.getCircleCapacities()
    );
  }
  
  getCircleCapacities() {
    // Fetch current circle capacities from backend or state
    return {
      inner: { current: 10, max: 10 },
      close: { current: 0, max: 25 },
      active: { current: 0, max: 50 },
      casual: { current: 0, max: 100 }
    };
  }
  
  handleMilestone(milestone) {
    // Track analytics
    if (typeof analytics !== 'undefined') {
      analytics.track('Onboarding Milestone', {
        threshold: milestone.threshold,
        message: milestone.message
      });
    }
  }
}
```

### BatchSuggestionCard Integration

```javascript
// In public/js/batch-suggestion-card.js

class BatchSuggestionCard {
  async handleAcceptBatch() {
    // ... existing batch accept code ...
    
    // Update progress tracker
    if (window.progressTracker) {
      const newCategorized = categorizedCount + this.batch.contacts.length;
      const updatedCapacities = this.updateCircleCapacity(
        this.batch.suggestedCircle,
        this.batch.contacts.length
      );
      
      window.progressTracker.update(
        newCategorized,
        totalContacts,
        updatedCapacities
      );
    }
  }
  
  updateCircleCapacity(circle, count) {
    const capacities = { ...currentCircleCapacities };
    capacities[circle].current += count;
    return capacities;
  }
}
```

### QuickRefineCard Integration

```javascript
// In public/js/quick-refine-card.js

class QuickRefineCard {
  handleCircleAssignment(contactId, circle) {
    // ... existing assignment code ...
    
    // Update progress tracker
    if (window.progressTracker) {
      categorizedCount++;
      circleCapacities[circle].current++;
      
      window.progressTracker.update(
        categorizedCount,
        totalContacts,
        circleCapacities
      );
    }
  }
}
```

### OnboardingController Integration

```javascript
// In public/js/onboarding-controller.js

class OnboardingController {
  async initializeOnboarding(trigger) {
    // ... existing initialization code ...
    
    // Initialize progress tracker
    this.progressTracker = new ProgressTracker({
      containerId: 'onboarding-progress',
      totalContacts: this.state.progressData.totalCount,
      categorizedContacts: this.state.progressData.categorizedCount,
      startTime: new Date(this.state.startedAt).getTime(),
      circleCapacities: await this.getCircleCapacities(),
      onMilestone: (milestone) => {
        this.handleMilestone(milestone);
      }
    });
    
    this.progressTracker.render();
  }
  
  async saveProgress() {
    // ... existing save code ...
    
    // Update progress tracker
    if (this.progressTracker) {
      this.progressTracker.update(
        this.state.progressData.categorizedCount,
        this.state.progressData.totalCount,
        await this.getCircleCapacities()
      );
    }
  }
  
  async getCircleCapacities() {
    // Fetch from backend
    const response = await fetch(`${API_BASE}/contacts/circle-capacities`, {
      headers: {
        'Authorization': `Bearer ${this.authToken}`
      }
    });
    return await response.json();
  }
  
  handleMilestone(milestone) {
    // Save milestone to backend
    fetch(`${API_BASE}/onboarding/milestone`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.authToken}`
      },
      body: JSON.stringify({
        threshold: milestone.threshold,
        message: milestone.message,
        timestamp: new Date().toISOString()
      })
    });
  }
}
```

## Backend API Integration

### Get Circle Capacities Endpoint

```typescript
// In src/api/routes/contacts.ts

router.get('/contacts/circle-capacities', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    
    const capacities = await contactRepository.getCircleCapacities(userId);
    
    res.json({
      inner: { current: capacities.inner, max: 10 },
      close: { current: capacities.close, max: 25 },
      active: { current: capacities.active, max: 50 },
      casual: { current: capacities.casual, max: 100 }
    });
  } catch (error) {
    console.error('Error fetching circle capacities:', error);
    res.status(500).json({ error: 'Failed to fetch circle capacities' });
  }
});
```

### Repository Method

```typescript
// In src/contacts/repository.ts

async getCircleCapacities(userId: string): Promise<CircleCapacities> {
  const result = await pool.query(
    `SELECT 
       dunbar_circle,
       COUNT(*) as count
     FROM contacts
     WHERE user_id = $1 
       AND archived_at IS NULL
       AND dunbar_circle IS NOT NULL
     GROUP BY dunbar_circle`,
    [userId]
  );
  
  const capacities = {
    inner: 0,
    close: 0,
    active: 0,
    casual: 0
  };
  
  result.rows.forEach(row => {
    capacities[row.dunbar_circle] = parseInt(row.count, 10);
  });
  
  return capacities;
}
```

## State Management

### Storing Progress State

```javascript
// Save progress state to localStorage
function saveProgressState() {
  const state = {
    totalContacts: progressTracker.totalContacts,
    categorizedContacts: progressTracker.categorizedContacts,
    startTime: progressTracker.startTime,
    circleCapacities: progressTracker.circleCapacities,
    milestonesReached: progressTracker.milestones
      .filter(m => m.reached)
      .map(m => m.threshold)
  };
  
  localStorage.setItem('progress-state', JSON.stringify(state));
}

// Load progress state from localStorage
function loadProgressState() {
  const saved = localStorage.getItem('progress-state');
  if (saved) {
    const state = JSON.parse(saved);
    
    progressTracker = new ProgressTracker({
      containerId: 'progress-tracker-container',
      totalContacts: state.totalContacts,
      categorizedContacts: state.categorizedContacts,
      startTime: state.startTime,
      circleCapacities: state.circleCapacities
    });
    
    // Mark milestones as reached
    state.milestonesReached.forEach(threshold => {
      const milestone = progressTracker.milestones.find(m => m.threshold === threshold);
      if (milestone) {
        milestone.reached = true;
      }
    });
    
    progressTracker.render();
  }
}
```

## Event Handling

### Custom Events

```javascript
// Emit custom event when progress updates
progressTracker.update = function(categorized, total, capacities) {
  // ... existing update code ...
  
  // Emit custom event
  window.dispatchEvent(new CustomEvent('progress-updated', {
    detail: {
      categorized,
      total,
      percentage: this.calculatePercentage(),
      capacities
    }
  }));
};

// Listen for progress updates
window.addEventListener('progress-updated', (event) => {
  console.log('Progress updated:', event.detail);
  
  // Update other UI components
  updateNavigationBadge(event.detail.percentage);
  updateSidebarProgress(event.detail.categorized, event.detail.total);
});
```

## Analytics Integration

### Track Milestone Achievements

```javascript
const progressTracker = new ProgressTracker({
  // ... other options ...
  onMilestone: (milestone) => {
    // Google Analytics
    if (typeof gtag !== 'undefined') {
      gtag('event', 'milestone_reached', {
        'event_category': 'onboarding',
        'event_label': `${milestone.threshold}%`,
        'value': milestone.threshold
      });
    }
    
    // Mixpanel
    if (typeof mixpanel !== 'undefined') {
      mixpanel.track('Onboarding Milestone', {
        threshold: milestone.threshold,
        message: milestone.message,
        categorized_count: progressTracker.categorizedContacts,
        total_count: progressTracker.totalContacts
      });
    }
    
    // Custom analytics
    analytics.track('milestone_reached', {
      threshold: milestone.threshold,
      time_elapsed: Date.now() - progressTracker.startTime,
      pace: progressTracker.categorizedContacts / 
            ((Date.now() - progressTracker.startTime) / 60000) // contacts per minute
    });
  }
});
```

## Error Handling

### Graceful Degradation

```javascript
try {
  progressTracker.update(categorized, total, capacities);
} catch (error) {
  console.error('Failed to update progress tracker:', error);
  
  // Fallback: Show simple text progress
  document.getElementById('fallback-progress').textContent = 
    `${categorized} of ${total} contacts organized`;
}
```

### Validation

```javascript
function updateProgress(categorized, total, capacities) {
  // Validate inputs
  if (categorized < 0 || total < 0) {
    console.error('Invalid progress values');
    return;
  }
  
  if (categorized > total) {
    console.warn('Categorized count exceeds total, capping at total');
    categorized = total;
  }
  
  // Validate circle capacities
  Object.keys(capacities).forEach(circle => {
    if (capacities[circle].current > capacities[circle].max) {
      console.warn(`${circle} circle exceeds capacity`);
      capacities[circle].current = capacities[circle].max;
    }
  });
  
  progressTracker.update(categorized, total, capacities);
}
```

## Testing Integration

### Unit Tests

```javascript
// In your test file
describe('Progress Tracker Integration', () => {
  let progressTracker;
  
  beforeEach(() => {
    document.body.innerHTML = '<div id="progress-tracker-container"></div>';
    progressTracker = new ProgressTracker({
      containerId: 'progress-tracker-container',
      totalContacts: 100,
      categorizedContacts: 0
    });
  });
  
  afterEach(() => {
    progressTracker.destroy();
  });
  
  it('should update progress correctly', () => {
    progressTracker.render();
    progressTracker.update(25, 100, mockCapacities);
    
    const percentage = document.querySelector('.progress-tracker__percentage');
    expect(percentage.textContent).toBe('25%');
  });
  
  it('should trigger milestone at 25%', (done) => {
    progressTracker.onMilestone = (milestone) => {
      expect(milestone.threshold).toBe(25);
      done();
    };
    
    progressTracker.render();
    progressTracker.update(25, 100, mockCapacities);
  });
});
```

## Troubleshooting

### Common Issues

**Issue**: Progress tracker not rendering  
**Solution**: Ensure container element exists before calling `render()`

**Issue**: Milestone not triggering  
**Solution**: Verify percentage crosses threshold (not just equals)

**Issue**: Circle capacities not updating  
**Solution**: Pass complete `circleCapacities` object to `update()`

**Issue**: Time estimate shows "Estimating..."  
**Solution**: Requires at least 1 categorized contact

## Best Practices

1. **Initialize Early**: Create progress tracker at start of onboarding flow
2. **Update Frequently**: Call `update()` after each contact categorization
3. **Handle Errors**: Wrap updates in try-catch for graceful degradation
4. **Track Analytics**: Use `onMilestone` callback for analytics
5. **Persist State**: Save progress to localStorage for session recovery
6. **Validate Inputs**: Check bounds before calling `update()`
7. **Clean Up**: Call `destroy()` when component is no longer needed

## Performance Tips

1. **Debounce Updates**: For rapid changes, debounce `update()` calls
2. **Batch Updates**: Update multiple contacts at once when possible
3. **Lazy Render**: Only render when visible to user
4. **Optimize Animations**: Use CSS transforms for better performance
5. **Memory Management**: Destroy component when not in use

## Next Steps

1. Integrate with your onboarding flow
2. Add analytics tracking
3. Test on various devices and browsers
4. Gather user feedback on messaging
5. Consider implementing optional enhancements
