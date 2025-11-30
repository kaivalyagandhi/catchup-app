# Educational Features Module

Comprehensive educational features for the contact onboarding system, providing tooltips, help content, and guidance based on Dunbar's number theory.

## Features

### 1. Help Button & Panel
- **Floating help button** in bottom-right corner
- **Comprehensive help panel** with detailed information about all circles
- **Circle characteristics** and examples for each Dunbar layer
- **Tips and quick actions** guide

### 2. Circle Information Display
- **Hover/tap information** for each circle
- **Current capacity status** with visual indicators
- **Recommended sizes** and contact frequency
- **Automatic positioning** based on available screen space

### 3. First-Time User Tooltips
- **Welcome tooltip** introducing the system
- **Progressive disclosure** of features
- **One-time display** (tracked per user)
- **Smooth animations** and transitions

### 4. Balance Suggestions
- **Gentle guidance** for imbalanced circles
- **Severity levels** (high, medium, low)
- **Non-prescriptive messaging** respecting user choices
- **Auto-dismiss** after 10 seconds

### 5. Network Summary
- **Completion statistics** showing total contacts and distribution
- **Network health score** based on circle balance
- **Key insights** about relationship structure
- **Personalized recommendations** for improvement

## Installation

Include the required files in your HTML:

```html
<!-- Dependencies -->
<script src="circular-visualizer.js"></script>

<!-- Educational Features -->
<script src="educational-features.js"></script>
```

## Usage

### Basic Initialization

```javascript
// Create visualizer first
const visualizer = new CircularVisualizer('my-visualizer');

// Initialize educational features
const educational = new EducationalFeatures({
  containerId: 'educational-container',
  visualizer: visualizer,
  userId: 'user-123'
});
```

### Show Help Panel

```javascript
// Open help panel
educational.openHelpPanel();

// Close help panel
educational.closeHelpPanel();

// Toggle help panel
educational.toggleHelpPanel();
```

### Display Circle Information

Circle information is automatically shown when hovering over circles in the visualizer. You can also trigger it manually:

```javascript
// Show info for a specific circle
educational.showCircleInfo('inner', CIRCLE_DEFINITIONS.inner);

// Hide circle info
educational.hideCircleInfo();
```

### Check Network Balance

```javascript
// Get current distribution from visualizer
const distribution = visualizer.getCircleDistribution();

// Show balance suggestions
educational.showBalanceSuggestions(distribution);
```

### Show Network Summary

```javascript
// Get distribution and contacts
const distribution = visualizer.getCircleDistribution();
const contacts = []; // Your contacts array

// Show completion summary
educational.showNetworkSummary(distribution, contacts);
```

### First-Time Tooltips

Tooltips are automatically shown for first-time users. To manually trigger:

```javascript
// Show specific tooltip
educational.showTooltip('welcome', () => {
  console.log('Tooltip closed');
});

// Reset tooltips for testing
localStorage.removeItem(`shown_tooltips_${userId}`);
```

## Integration with Onboarding

### Complete Integration Example

```javascript
class OnboardingWithEducation {
  constructor(containerId, userId) {
    this.visualizer = new CircularVisualizer(containerId);
    this.educational = new EducationalFeatures({
      containerId: 'educational-container',
      visualizer: this.visualizer,
      userId: userId
    });
    
    this.setupEventListeners();
  }
  
  setupEventListeners() {
    // Show balance suggestions periodically
    this.visualizer.on('contactUpdate', (data) => {
      const distribution = this.visualizer.getCircleDistribution();
      const totalContacts = Object.values(distribution)
        .reduce((sum, count) => sum + count, 0);
      
      // Show suggestions every 10 contacts
      if (totalContacts >= 10 && totalContacts % 10 === 0) {
        this.educational.showBalanceSuggestions(distribution);
      }
    });
  }
  
  completeOnboarding(contacts) {
    const distribution = this.visualizer.getCircleDistribution();
    this.educational.showNetworkSummary(distribution, contacts);
  }
}
```

## API Reference

### Constructor Options

```typescript
interface EducationalFeaturesOptions {
  containerId?: string;      // Container ID for educational elements
  visualizer?: CircularVisualizer;  // Visualizer instance
  userId?: string;           // User ID for tracking shown tooltips
}
```

### Methods

#### Help Panel
- `openHelpPanel()` - Open the help panel
- `closeHelpPanel()` - Close the help panel
- `toggleHelpPanel()` - Toggle help panel open/closed

#### Circle Information
- `showCircleInfo(circleId, circleDef)` - Show info for a circle
- `hideCircleInfo()` - Hide circle information

#### Tooltips
- `showTooltip(tooltipId, onClose)` - Show a specific tooltip
- `shouldShowTooltip(tooltipId)` - Check if tooltip should be shown
- `markTooltipShown(tooltipId)` - Mark tooltip as shown

#### Balance & Summary
- `checkCircleBalance(distribution)` - Check for imbalances
- `showBalanceSuggestions(distribution)` - Show balance suggestions
- `showNetworkSummary(distribution, contacts)` - Show completion summary
- `calculateNetworkHealth(distribution)` - Calculate health score (0-100)

## Circle Education Content

Each circle includes:
- **Name** and **recommended size**
- **Description** of relationship type
- **Characteristics** list
- **Examples** of typical contacts
- **Contact frequency** recommendations
- **Tips** for managing the circle

### Available Circles

- **Inner Circle** (~5 people) - Closest relationships
- **Close Friends** (~15 people) - Regular social circle
- **Active Friends** (~50 people) - Maintained friendships
- **Casual Network** (~150 people) - Acquaintances
- **Acquaintances** (500+ people) - Distant contacts

## Styling

The module includes comprehensive CSS with:
- **Responsive design** for mobile and desktop
- **Smooth animations** and transitions
- **Accessible color contrast**
- **Touch-optimized** for mobile devices

### Customization

Override CSS variables or classes to customize appearance:

```css
/* Customize help button color */
.educational-help-button {
  background: #your-color;
}

/* Customize panel width */
.educational-help-panel {
  width: 600px;
}
```

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Testing

Open `educational-features.test.html` in a browser to test all features:

1. Help panel open/close
2. Circle information display
3. Balance suggestions (balanced, imbalanced, over capacity)
4. Network summaries (small, medium, large networks)
5. First-time tooltips

## Requirements Validation

This implementation satisfies:

- **Requirement 14.1**: Educational tooltips for first-time users ✓
- **Requirement 14.2**: Circle information display on hover/tap ✓
- **Requirement 14.3**: Help button with detailed explanations ✓
- **Requirement 14.4**: Gentle suggestions for imbalanced circles ✓
- **Requirement 14.5**: Network structure summary for completion ✓

## Best Practices

1. **Initialize after visualizer** - Educational features need visualizer reference
2. **Show summaries on completion** - Display network summary when onboarding completes
3. **Check balance periodically** - Show suggestions at natural breakpoints
4. **Respect user choices** - Keep messaging gentle and non-prescriptive
5. **Test on mobile** - Ensure touch interactions work properly

## Troubleshooting

### Help button not appearing
- Check that educational features are initialized
- Verify no CSS conflicts with z-index
- Ensure body element is accessible

### Tooltips showing repeatedly
- Check localStorage is enabled
- Verify userId is consistent
- Use `markTooltipShown()` to manually mark as shown

### Circle info not positioning correctly
- Ensure visualizer container has proper dimensions
- Check for CSS overflow issues
- Test with different screen sizes

## Future Enhancements

Potential additions:
- Video tutorials
- Interactive walkthroughs
- Contextual tips based on user behavior
- Gamification badges for learning
- Multi-language support
