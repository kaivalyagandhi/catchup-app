# Step 3 Group Mapping Handler - Quick Reference

## Quick Start

```javascript
// Initialize and navigate
const handler = new Step3GroupMappingHandler(stateManager, userId);
await handler.initialize();
await handler.navigateToStep();
```

## Key Methods

| Method | Purpose | Returns |
|--------|---------|---------|
| `initialize()` | Load onboarding state | `Promise<void>` |
| `navigateToStep()` | Navigate to Groups tab | `Promise<void>` |
| `loadMappingSuggestions()` | Fetch mapping suggestions | `Promise<void>` |
| `acceptMapping(id)` | Accept a mapping | `Promise<void>` |
| `rejectMapping(id)` | Reject a mapping | `Promise<void>` |
| `completeOnboarding()` | Mark onboarding complete | `Promise<void>` |
| `destroy()` | Clean up handler | `void` |

## API Endpoints

```
GET  /api/google-contacts/mapping-suggestions?userId={id}
POST /api/google-contacts/accept-mapping
POST /api/google-contacts/reject-mapping
GET  /api/groups?userId={id}
```

## State Structure

```javascript
{
  steps: {
    groups: {
      complete: boolean,
      mappingsReviewed: number,
      totalMappings: number
    }
  },
  isComplete: boolean
}
```

## Mapping Object

```javascript
{
  id: string,
  googleGroupId: string,
  googleGroupName: string,
  memberCount: number,
  suggestedGroupId: string,
  confidence: number,  // 0-100
  reviewed: boolean,
  accepted: boolean,
  rejected: boolean
}
```

## Confidence Levels

- **High**: ≥80% (green badge)
- **Medium**: 60-79% (amber badge)
- **Low**: <60% (gray badge)

## CSS Classes

```css
.mapping-suggestions          /* Main container */
.mapping-card                 /* Individual card */
.mapping-card__select         /* Group dropdown */
.confidence-badge             /* Confidence score */
.confidence-badge--high       /* High confidence */
.confidence-badge--medium     /* Medium confidence */
.confidence-badge--low        /* Low confidence */
.btn-accept                   /* Accept button */
.btn-reject                   /* Skip button */
.completion-modal             /* Celebration modal */
```

## Events

```javascript
// Emitted when onboarding complete
window.dispatchEvent(new CustomEvent('onboarding-complete', {
  detail: { userId }
}));
```

## Common Patterns

### Initialize Handler

```javascript
const stateManager = new OnboardingStateManager();
const handler = new Step3GroupMappingHandler(stateManager, userId);
await handler.initialize();
```

### Handle Empty Mappings

```javascript
if (mappings.length === 0) {
  handler.handleEmptyMappings();
}
```

### Accept Mapping

```javascript
await handler.acceptMapping(mappingId);
// Card fades out and is removed
// Progress is updated
// Toast notification shown
```

### Complete Onboarding

```javascript
await handler.completeOnboarding();
// State marked complete
// Indicator hidden
// Celebration modal shown
```

## Error Handling

```javascript
try {
  await handler.loadMappingSuggestions();
} catch (error) {
  // Shows error toast
  // Displays empty state
  // Allows user to skip
}
```

## Testing

```bash
# Open test file
open public/js/step3-group-mapping-handler.test.html

# Test scenarios
- Render mappings
- Empty state
- Accept mapping
- Reject mapping
- Completion celebration
```

## Integration

```html
<!-- Include CSS -->
<link rel="stylesheet" href="/css/group-mapping-suggestions.css">

<!-- Include JS -->
<script src="/js/step3-group-mapping-handler.js"></script>

<!-- Initialize -->
<script>
  const handler = new Step3GroupMappingHandler(stateManager, userId);
  await handler.initialize();
  await handler.navigateToStep();
</script>
```

## Responsive Breakpoints

- **Mobile**: <768px (single column)
- **Tablet**: 768-1023px (adjusted layout)
- **Desktop**: ≥1024px (full layout)

## Requirements

- ✅ 5.1: Navigate to Groups tab
- ✅ 5.2: Fetch mapping suggestions
- ✅ 5.3: Display mapping cards
- ✅ 5.4: Handle accept/reject
- ✅ 5.5: Mark Step 3 complete
- ✅ 8.1: Show completion celebration
- ✅ 16.1: Stone & Clay theme

## Files

```
public/js/step3-group-mapping-handler.js
public/css/group-mapping-suggestions.css
public/js/step3-group-mapping-handler.test.html
docs/features/onboarding/STEP3_GROUP_MAPPING_HANDLER_README.md
```

## Dependencies

- `OnboardingStateManager` - State persistence
- `showToast()` - Toast notifications
- `navigateTo()` - Page navigation
- `switchDirectoryTab()` - Tab switching

## Browser Support

- Chrome/Edge: ✅
- Firefox: ✅
- Safari: ✅
- Mobile browsers: ✅

## Performance

- Lazy loads mappings on navigation
- Fade animations: 300ms
- API timeout: 10s (recommended)
- Minimal DOM updates

## Accessibility

- Keyboard navigation: ✅
- Screen reader labels: ✅
- Focus management: ✅
- Color contrast: WCAG AA

## Security

- XSS protection: HTML escaping
- CSRF tokens: Required in API
- Auth tokens: Bearer authentication
- Input validation: Server-side
