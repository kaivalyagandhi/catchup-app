# Groups & Preferences UI Improvements - Requirements

## Feature Overview

This feature enhances the Groups page in the Directory and the Preferences page with several UI improvements to improve user experience and visual consistency:

1. **Reviewed Groups Section**: Add a collapsible "Reviewed Groups" section to the Groups page to display accepted and rejected group mappings
2. **Automatic Step 3 Completion**: Automatically mark onboarding Step 3 as complete when at least one group mapping is reviewed
3. **Onboarding Modal Controls**: Add "Dismiss" and "Finish Later" buttons to the onboarding modal with clear restart instructions
4. **Preferences Page Consistency**: Standardize typography, button styles, input fields, and spacing across the Preferences page
5. **Integration Container Heights**: Equalize heights of Google Calendar and Google Contacts integration containers for visual balance

### Business Value

- **Improved Transparency**: Users can review their group mapping decisions at any time
- **Reduced Friction**: Automatic step completion reduces manual overhead in onboarding
- **Better UX**: Clear exit options prevent user confusion during onboarding
- **Professional Appearance**: Consistent styling improves perceived quality and trust
- **Visual Balance**: Equal container heights create a more polished, intentional design

## User Stories

### 1. Reviewed Groups Display
**As a** user who has reviewed Google Contact group mappings  
**I want to** see a dedicated "Reviewed Groups" section at the bottom of the Groups page  
**So that** I can easily see which group mappings I've already processed

**Acceptance Criteria:**
- 1.1: A "Reviewed Groups" section appears at the bottom of the Groups page when at least one group mapping has been reviewed (accepted or rejected)
- 1.2: The section is collapsible with an expand/collapse toggle (default: expanded)
- 1.3: The section displays all reviewed group mappings with no limit on quantity
- 1.4: Accepted mappings show the Google group name → CatchUp group name mapping with a success indicator (✓)
- 1.5: Rejected mappings show the Google group name with a "Skipped" indicator and different visual styling (muted colors, strikethrough, or similar)
- 1.6: The section is hidden when there are no reviewed groups
- 1.7: The section has a clear visual separation from the active groups table above it (border, spacing, or background color)
- 1.8: The collapse state persists across page refreshes (stored in localStorage)

### 2. Automatic Onboarding Step 3 Completion
**As a** user completing the onboarding process  
**I want** Step 3 to automatically mark as complete when I review at least one group mapping  
**So that** I can see my progress update in real-time without manual intervention

**Acceptance Criteria:**
- 2.1: When a user accepts or rejects their first group mapping, Step 3 is automatically marked as complete
- 2.2: The onboarding indicator updates immediately to show Step 3 completion
- 2.3: If all three steps are complete, the overall onboarding status updates to "Complete"
- 2.4: The completion check happens after each group mapping review action
- 2.5: The system handles the case where there are no group mappings to review (auto-complete Step 3)

### 3. Onboarding Modal Dismiss Button
**As a** user who wants to exit the onboarding flow  
**I want** a "Dismiss" button that explains I can restart onboarding from Preferences  
**So that** I can close the modal knowing how to return to onboarding later

**Acceptance Criteria:**
- 3.1: A "Dismiss" button is added to the onboarding sidebar modal
- 3.2: A "Finish Later" button is added as a separate button (replacing the X close button functionality)
- 3.3: Both buttons are positioned below the "Review Groups" step (below the step list)
- 3.4: Clicking "Dismiss" shows a confirmation dialog with the message: "Are you sure you want to dismiss onboarding? You can restart it anytime from Preferences."
- 3.5: The confirmation dialog has "Cancel" and "Dismiss" options
- 3.6: Clicking "Dismiss" in the confirmation closes the modal, saves current progress, and marks onboarding as dismissed
- 3.7: Clicking "Finish Later" closes the modal and saves current progress without marking as dismissed
- 3.8: The X close button in the top right is removed (replaced by "Finish Later" button)
- 3.9: Both buttons use consistent styling with the Stone & Clay theme
- 3.10: The buttons are horizontally aligned with appropriate spacing (e.g., "Finish Later" on left, "Dismiss" on right)
- 3.11: Button styling: "Finish Later" uses secondary button style, "Dismiss" uses tertiary/text button style

### 4. Preferences Page UI Consistency
**As a** user viewing the Preferences page  
**I want** consistent styling across all sections  
**So that** the page looks polished and professional

**Acceptance Criteria:**
- 4.1: All section headings use consistent font family, size, weight, and color
- 4.2: All body text uses consistent font family, size, and color
- 4.3: All buttons use consistent styling (padding, border-radius, font-weight)
- 4.4: All input fields use consistent styling (padding, border, border-radius)
- 4.5: Section spacing is consistent throughout the page
- 4.6: The page follows the Stone & Clay theme color palette
- 4.7: Dark mode (Espresso theme) is properly supported with appropriate color adjustments

### 5. Google Integration Container Height Equalization
**As a** user viewing the Preferences page  
**I want** the Google Calendar and Google Contacts containers to have equal heights  
**So that** the page layout looks balanced and symmetrical

**Acceptance Criteria:**
- 5.1: The Google Calendar integration container and Google Contacts integration container have equal heights
- 5.2: Heights are equalized using CSS flexbox or grid layout with `align-items: stretch` or similar
- 5.3: Content within each container is vertically aligned appropriately (top-aligned preferred)
- 5.4: The layout remains responsive on mobile devices (containers may stack vertically)
- 5.5: Both containers expand to match the height of the taller container
- 5.6: The equalization works in both light and dark themes
- 5.7: Internal spacing and padding are adjusted to maintain visual balance
- 5.8: The "Sync Now" and "Disconnect" buttons are positioned consistently in both containers

## Technical Requirements

### Backend Components
- **API Endpoint**: `GET /api/google-contacts/reviewed-mappings` - Fetch reviewed group mappings
- **Database Schema**: Ensure `google_group_mappings` table has `status`, `reviewed_at`, and `member_count` columns

### Frontend Components
- **Groups Table** (`public/js/groups-table.js`): Add reviewed groups section rendering
- **Reviewed Groups Section** (`public/js/reviewed-groups-section.js`): New component for displaying reviewed mappings
- **Onboarding Modal** (`public/js/app.js`): Add dismiss and finish later buttons
- **Preferences Page** (`public/index.html`, `public/js/app.js`): Update styling and layout
- **Step 3 Handler** (`public/js/step3-group-mapping-handler.js`): Update completion logic

### Styling
- **Groups Table CSS** (`public/css/groups-table.css`): Add reviewed groups section styles
- **Onboarding CSS** (`public/css/onboarding.css`): Update modal button positioning and footer styles
- **Preferences CSS** (`public/css/preferences.css`): Create or update preferences-specific styles
- **Responsive CSS** (`public/css/responsive.css`): Ensure mobile compatibility

### State Management
- Track reviewed group mappings via API
- Update onboarding state when Step 3 completes
- Persist collapse state in localStorage
- Save onboarding progress on dismiss/finish later

## Non-Functional Requirements

### Performance
- Reviewed groups section should render in < 100ms
- Onboarding state updates should be immediate (< 50ms)
- No layout shift when reviewed groups section appears

### Accessibility
- All buttons have proper ARIA labels
- Keyboard navigation works for all interactive elements
- Color contrast meets WCAG AA standards
- Screen readers can navigate the reviewed groups section

### Browser Compatibility
- Works in Chrome, Firefox, Safari, Edge (latest 2 versions)
- Mobile responsive on iOS Safari and Chrome Android
- Graceful degradation for older browsers

## Out of Scope

- Editing reviewed group mappings (future enhancement)
- Bulk actions on reviewed groups
- Filtering or sorting reviewed groups
- Exporting reviewed groups data
- Undo functionality for reviewed groups

## Dependencies

- Existing onboarding flow and state management
- Google Contacts integration and mapping API
- Groups table component
- Preferences page structure

## Success Metrics

### Quantitative Metrics
- Reviewed groups section renders in < 100ms (performance)
- Onboarding Step 3 completion rate increases by 10%+ (engagement)
- Zero layout-related bug reports post-launch (quality)
- Page load time remains under 2 seconds (performance)

### Qualitative Metrics
- Users can see their reviewed groups immediately after review (usability)
- User confusion about onboarding dismissal decreases (UX feedback)
- Preferences page visual consistency improves (design review)
- Positive user feedback on UI polish and professionalism (user surveys)

## Open Questions

~~1. Should reviewed groups be collapsible to save space?~~ **ANSWERED: Yes, collapsible with expand/collapse toggle**
~~2. Should there be a limit on how many reviewed groups to display?~~ **ANSWERED: No limit**
~~3. Should rejected mappings be shown differently from accepted ones?~~ **ANSWERED: Yes, different visual styling (muted, strikethrough, etc.)**
~~4. Should the "Dismiss" button save progress or discard it?~~ **ANSWERED: Save progress**
~~5. Should the "Finish Later" button remain as the X close button, or be a separate button?~~ **ANSWERED: Separate button for clarity, X button removed**
~~6. What should the exact wording be in the dismiss confirmation dialog?~~ **ANSWERED: "Are you sure you want to dismiss onboarding? You can restart it anytime from Preferences."**

All questions resolved. Ready to proceed to design phase.

## Assumptions

- Users want to see their reviewed groups for reference and audit purposes
- Automatic Step 3 completion is more intuitive than manual completion
- Users understand that "Dismiss" means they can return to onboarding later
- "Finish Later" is clearer than an X button for communicating progress preservation
- Preferences page currently has inconsistent styling that negatively impacts user perception
- The Google integration containers are currently different heights, creating visual imbalance
- Collapsible reviewed groups section improves usability without hiding important information
- Visual distinction between accepted and rejected mappings improves clarity and decision confidence
- Users access the Preferences page primarily on desktop, but mobile support is still important
- The Stone & Clay theme is the primary theme, with Espresso (dark mode) as secondary
