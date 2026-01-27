# Quick Refine Card - Quick Reference

## Initialization

```javascript
const quickRefine = new QuickRefineCard(contacts, {
  containerId: 'quick-refine-container',
  userId: 'user-123',
  onAssign: (contactId, circle) => { /* ... */ },
  onDone: (progress) => { /* ... */ },
  onProgress: (progress) => { /* ... */ }
});

quickRefine.render();
```

## Swipe Gesture Mapping

| Gesture | Distance | Circle |
|---------|----------|--------|
| ← Far Left | < -200px | Inner Circle 💜 |
| ← Near Left | -200 to 0px | Close Friends 💗 |
| → Near Right | 0 to 200px | Active Friends 💚 |
| → Far Right | > 200px | Casual Network 💙 |

## Circle Buttons

- **Inner Circle** (💜): 0-10 contacts
- **Close Friends** (💗): 11-25 contacts
- **Active Friends** (💚): 26-50 contacts
- **Casual Network** (💙): 51-100 contacts

## Key Methods

```javascript
// Render the component
quickRefine.render();

// Move to next contact
quickRefine.nextContact();

// Destroy the component
quickRefine.destroy();
```

## Callbacks

### onAssign(contactId, circle)
```javascript
onAssign: (contactId, circle) => {
  console.log(`${contactId} → ${circle}`);
}
```

### onDone(progress)
```javascript
onDone: (progress) => {
  console.log(`Completed: ${progress.currentIndex}/${progress.totalContacts}`);
}
```

### onProgress(progress)
```javascript
onProgress: (progress) => {
  console.log(`Progress: ${progress.current}/${progress.total}`);
}
```

## API Endpoint

**POST /api/circles/assign**
```json
{
  "contactId": "contact-456",
  "circle": "inner"
}
```

## Progress Persistence

```javascript
// Save progress (automatic)
localStorage.setItem('quick-refine-progress', JSON.stringify({
  currentIndex: 5,
  totalContacts: 20,
  timestamp: Date.now()
}));

// Resume from saved progress
const saved = JSON.parse(localStorage.getItem('quick-refine-progress'));
const remaining = contacts.slice(saved.currentIndex);
const quickRefine = new QuickRefineCard(remaining, options);
```

## Mobile Responsive

- **Viewport**: >= 320px
- **Touch Targets**: 44x44px minimum
- **Swipe Gestures**: Full touch support
- **Breakpoint**: 768px for mobile layout

## Testing

```bash
# Open test file
open tests/html/quick-refine-card.test.html

# Or navigate to
http://localhost:3000/tests/html/quick-refine-card.test.html
```

## Common Issues

### Swipe not working
- Check touch events are enabled
- Verify SWIPE_THRESHOLD (100px default)
- Test on actual mobile device

### Progress not saving
- Check localStorage is available
- Verify browser allows localStorage
- Check for quota exceeded errors

### Card not rendering
- Verify container ID exists
- Check contacts array is not empty
- Ensure styles are loaded

## CSS Custom Properties

```css
--text-primary: #1f2937;
--text-secondary: #6b7280;
--bg-secondary: #ffffff;
--border-color: #e5e7eb;
--primary-color: #3b82f6;
```

## Requirements Coverage

- ✅ 7.1: Display uncategorized contacts
- ✅ 7.2: Card-based interface
- ✅ 7.3: Circle assignment buttons
- ✅ 7.4: Swipe gestures
- ✅ 7.5: Remaining count
- ✅ 7.6: Done for Now
- ✅ 7.7: Progress persistence
- ✅ 7.8: Last contact date
- ✅ 20.3: Mobile responsive
- ✅ 20.5: Touch gestures
- ✅ 20.6: Visualizer adaptation
