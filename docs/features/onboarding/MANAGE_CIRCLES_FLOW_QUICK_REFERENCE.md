# Manage Circles Flow - Quick Reference

## Quick Start

```javascript
// Create and mount
const flow = new ManageCirclesFlow(contacts, assignments, {
  onSave: (assignments) => { /* handle save */ },
  isOnboarding: true
});
flow.mount();
```

## Constructor Options

| Option | Type | Description |
|--------|------|-------------|
| `onSave` | Function | Callback when save clicked |
| `onSkip` | Function | Callback when skip clicked |
| `onClose` | Function | Callback when modal closed |
| `isOnboarding` | Boolean | Whether in onboarding mode |

## Circle Definitions

| Circle | Capacity | Emoji | Frequency |
|--------|----------|-------|-----------|
| Inner Circle | 10 | 💎 | Weekly+ |
| Close Friends | 25 | 🌟 | Bi-weekly to monthly |
| Active Friends | 50 | ✨ | Monthly to quarterly |
| Casual Network | 100 | 🤝 | Quarterly to annually |

## Key Methods

```javascript
flow.mount()           // Mount modal to DOM
flow.close()           // Close modal
flow.destroy()         // Destroy component
flow.refresh()         // Refresh content
```

## API Endpoints

```
POST /api/contacts/:id/circle
POST /api/contacts/circles/bulk
```

## Events

```javascript
window.addEventListener('circle-assigned', (e) => {
  const { contactId, circle } = e.detail;
});
```

## CSS Classes

```css
.manage-circles-overlay    /* Modal overlay */
.manage-circles-modal      /* Modal container */
.educational-tip           /* Educational panel */
.search-bar                /* Search input */
.progress-section          /* Progress bar */
.circle-capacities         /* Capacities display */
.contact-grid              /* Contact grid */
.contact-card              /* Contact card */
```

## Mobile Breakpoints

- Mobile: < 768px (single column)
- Tablet: 768px - 1023px
- Desktop: > 1024px

## Testing

Open `public/js/manage-circles-flow.test.html` in browser.

## Common Issues

**Modal not showing:**
- Check CSS is loaded
- Verify `mount()` was called
- Check z-index conflicts

**Search not working:**
- Verify search input has correct ID
- Check event listeners attached
- Ensure `filterContacts()` is working

**Assignments not saving:**
- Check API endpoints are available
- Verify auth token in localStorage
- Check network tab for errors

**Progress not updating:**
- Ensure `updateCircleCounts()` is called
- Check `refresh()` is triggered
- Verify state is being updated

## Requirements

- Modern browser (ES6+)
- Stone & Clay theme CSS
- Fetch API support
- localStorage available
