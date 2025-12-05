# Contact Onboarding Quick Reference

Quick reference guide for the Contact Onboarding feature.

## For Users

### Getting Started
1. Look for "Get Started" indicator in sidebar
2. Click "Step 1: Connect Accounts"
3. Connect Google Calendar and Contacts
4. Organize contacts into 4 circles
5. Review group mapping suggestions

### The 4 Circles
- **Inner Circle (10)**: Closest confidants, call in crisis
- **Close Friends (25)**: Regular life updates, genuine care
- **Active Friends (50)**: Stay connected regularly, shared activities
- **Casual Network (100)**: Occasional contact, professional/contextual

### Keyboard Shortcuts
- `Tab`: Navigate between elements
- `Arrow Keys`: Navigate between steps
- `Enter/Space`: Activate buttons
- `Escape`: Close modals/dismiss

### Need Help?
- Dismiss anytime with X button
- Resume with "Resume Setup" button
- Progress is automatically saved
- See full [User Guide](./CONTACT_ONBOARDING_USER_GUIDE.md)

## For Developers

### Key Components
- `OnboardingStepIndicator`: Sidebar progress indicator
- `ManageCirclesFlow`: Circle assignment modal
- `Step1IntegrationsHandler`: Integration connection
- `Step2CirclesHandler`: Circle organization
- `Step3GroupMappingHandler`: Group mapping review

### State Management
```javascript
// Load state
const state = OnboardingStateManager.loadState(userId);

// Update state
await stateManager.updateStepCompletion(userId, 1, true);

// Check completion
const isComplete = await stateManager.isOnboardingComplete(userId);
```

### API Endpoints
```
POST   /api/onboarding/init
GET    /api/onboarding/state?userId=:id
PUT    /api/onboarding/state
POST   /api/contacts/:id/circle
GET    /api/contacts/circles/counts
POST   /api/ai/circle-suggestions
GET    /api/google-contacts/mapping-suggestions
```

### Events
```javascript
// Listen for events
window.addEventListener('onboarding-state-changed', (e) => {
  console.log(e.detail.state);
});

// Emit events
window.dispatchEvent(new CustomEvent('circle-assigned', {
  detail: { contactId, circle }
}));
```

### Analytics
```javascript
// Track events
onboardingAnalytics.trackOnboardingStarted(userId);
onboardingAnalytics.trackStepCompleted(userId, 1);
onboardingAnalytics.trackCircleAssigned(userId, contactId, circle, false);
```

### Database
```sql
-- Main tables
onboarding_state
contacts (with circle column)
group_mapping_suggestions
onboarding_analytics_events

-- Quick stats
SELECT * FROM onboarding_analytics_summary;
```

### Testing
```bash
# Unit tests
npm test src/contacts/onboarding-state-manager.test.ts

# Manual tests
open public/js/onboarding-step-indicator.test.html
open public/js/manage-circles-flow.test.html
```

## Accessibility

### WCAG Compliance
- ✅ WCAG 2.1 AA compliant
- ✅ Keyboard navigable
- ✅ Screen reader compatible
- ✅ High contrast support
- ✅ Reduced motion support

### Testing Tools
- Chrome Lighthouse
- axe DevTools
- WAVE Browser Extension
- VoiceOver (macOS)
- NVDA (Windows)

## Common Tasks

### Add New Step
1. Update `OnboardingState` interface
2. Create step handler class
3. Add to step indicator
4. Create API endpoints
5. Add analytics tracking

### Modify Circle Logic
1. Update `OnboardingService`
2. Update `ManageCirclesFlow`
3. Update database schema
4. Update AI suggestions
5. Add tests

### Add Analytics Event
1. Add event type to enum
2. Add tracking method
3. Update API endpoint
4. Update documentation

## File Locations

### Frontend
```
public/js/
├── onboarding-step-indicator.js
├── manage-circles-flow.js
├── step1-integrations-handler.js
├── step2-circles-handler.js
├── step3-group-mapping-handler.js
└── onboarding-analytics.js

public/css/
├── onboarding.css
├── onboarding-indicator.css
└── manage-circles-flow.css
```

### Backend
```
src/
├── contacts/
│   ├── onboarding-state-manager.ts
│   ├── onboarding-service.ts
│   └── onboarding-repositories.ts
├── api/routes/
│   ├── onboarding.ts
│   ├── circles.ts
│   └── analytics.ts
└── utils/
    └── onboarding-analytics.ts
```

### Documentation
```
docs/
├── CONTACT_ONBOARDING_USER_GUIDE.md
├── CONTACT_ONBOARDING_DEVELOPER_GUIDE.md
├── CONTACT_ONBOARDING_ACCESSIBILITY.md
├── CONTACT_ONBOARDING_ANALYTICS.md
├── CONTACT_ONBOARDING_QUICK_REFERENCE.md
└── features/onboarding/
```

## Troubleshooting

### State Not Persisting
- Check localStorage quota
- Verify database connection
- Check browser console for errors

### AI Suggestions Not Working
- Verify API key configuration
- Check network connectivity
- Review error logs

### Accessibility Issues
- Run Lighthouse audit
- Test with screen reader
- Verify keyboard navigation
- Check color contrast

### Analytics Not Tracking
- Check browser console
- Verify API endpoint
- Check database connection
- Verify external service config

## Resources

- [Full User Guide](./CONTACT_ONBOARDING_USER_GUIDE.md)
- [Developer Guide](./CONTACT_ONBOARDING_DEVELOPER_GUIDE.md)
- [Accessibility Guide](./CONTACT_ONBOARDING_ACCESSIBILITY.md)
- [Analytics Guide](./CONTACT_ONBOARDING_ANALYTICS.md)
- [Troubleshooting](./CONTACT_ONBOARDING_TROUBLESHOOTING.md)

## Support

For questions or issues:
1. Check documentation
2. Review error logs
3. Test in isolation
4. Contact development team

---

**Last Updated**: December 2024  
**Version**: 1.0  
**Status**: Production Ready
