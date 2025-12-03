# Design Document: Edits UI Redesign

## Overview

This design transforms the edits menu from a verbose table layout into a compact, contact-grouped interface that maximizes information density while maintaining visual clarity. The new design introduces collapsible contact groups, icon-based actions, color-coded confidence indicators, and efficient use of whitespace to create a modern, polished experience.

The redesign maintains all existing functionality while reducing the visual footprint by approximately 40-50%, allowing users to see more edits at once and make faster decisions about accepting or rejecting changes.

## Architecture

```
Edits Menu (Compact)
├── Contact Group 1 (Collapsible)
│   ├── Header: Contact Name | 3/5 Accepted | [Expand/Collapse]
│   ├── Edit Item 1: [Icon] Field | Value | 92% | [✓] [✗]
│   ├── Edit Item 2: [Icon] Field | Value | 65% | [✓] [✗]
│   ├── Edit Item 3: [Icon] Field | Value | 45% | [✓] [✗]
│   ├── Edit Item 4: [Icon] Field | Value | 78% | [✓] [✗]
│   ├── Edit Item 5: [Icon] Field | Value | 88% | [✓] [✗]
│   └── Footer: [Accept All] [Reject All]
├── Contact Group 2 (Collapsed)
│   └── Header: Contact Name | 0/2 Accepted | [Expand/Collapse]
└── Contact Group 3 (Collapsed)
    └── Header: Contact Name | 1/1 Accepted | [Expand/Collapse]
```

## Components and Interfaces

### 1. Compact Contact Group Header

**Purpose**: Display contact name, edit count, and expansion toggle in minimal space

**Dimensions**: 40px height, full width

**Elements**:
- Contact avatar (24x24px, optional)
- Contact name (14px, bold)
- Edit count badge (12px, secondary color)
- Expansion toggle (chevron icon, 16x16px)
- Bulk action buttons (hidden until hover)

**States**:
- Collapsed: Shows header only
- Expanded: Shows header + all edits
- All accepted: Green checkmark indicator
- All rejected: Muted/strikethrough style
- Mixed: Neutral state

**Interactions**:
- Click header to toggle expansion
- Hover to reveal bulk action buttons
- Click "Accept All" to accept all edits for contact
- Click "Reject All" to reject all edits for contact

### 2. Compact Edit Item

**Purpose**: Display a single edit with minimal visual footprint

**Dimensions**: 36-44px height, full width

**Layout** (Single-line):
```
[Icon] [Type] [Value] [Confidence%] [Source] [✓] [✗]
```

**Layout** (Two-line for long values):
```
[Icon] [Type] [Value]
       [Confidence%] [Source] [✓] [✗]
```

**Elements**:
- Edit type icon (16x16px, color-coded)
- Edit type label (12px, secondary)
- Value display (13px, primary)
- Confidence badge (12px, color-coded)
- Source badge (11px, compact)
- Accept button (24x24px icon)
- Reject button (24x24px icon)

**Color Coding**:
- Add/Tag: Green (#10b981)
- Remove/Delete: Red (#ef4444)
- Update/Field: Blue (#3b82f6)
- Create: Purple (#8b5cf6)

**Confidence Colors**:
- 0-50%: Red (#ef4444)
- 50-75%: Yellow (#f59e0b)
- 75-100%: Green (#10b981)

**States**:
- Default: Normal appearance
- Accepted: Green background, checkmark filled
- Rejected: Muted/strikethrough, X filled
- Hover: Subtle background highlight
- Editing: Inline text input visible

**Interactions**:
- Click value to enter edit mode
- Click Accept to mark as accepted
- Click Reject to mark as rejected
- Hover to show source attribution
- Click source to expand full context

### 3. Confidence Indicator

**Purpose**: Quickly communicate system certainty about an edit

**Display Format**: Percentage badge with color coding

**Tooltip**: "The system is 92% confident about this suggestion"

**Placement**: Right side of edit item, before action buttons

**Styling**:
- Background: Color-coded (red/yellow/green)
- Text: White, 12px, bold
- Padding: 2px 6px
- Border-radius: 3px

### 4. Source Attribution (Compact)

**Purpose**: Show where an edit originated without cluttering the interface

**Default Display**: Badge only (e.g., "Voice" or "Manual")

**Expanded Display**: Tooltip or inline expansion showing:
- Source type
- Transcript excerpt (truncated)
- Timestamp
- Full context (on click)

**Styling**:
- Badge: 11px, secondary color, light background
- Excerpt: Italic, truncated to 50 characters
- Timestamp: 10px, muted color

### 5. Action Buttons (Icon-Only)

**Purpose**: Accept or reject edits with minimal visual footprint

**Buttons**:
- Accept: ✓ (checkmark) icon, 24x24px
- Reject: ✗ (X) icon, 24x24px

**Styling**:
- Default: Transparent background, muted color
- Hover: Colored background (green for accept, red for reject)
- Active: Filled icon, colored background
- Disabled: Grayed out

**Spacing**: 8px gap between buttons

### 6. Bulk Action Buttons

**Purpose**: Accept or reject all edits for a contact at once

**Buttons**:
- Accept All: "✓ Accept All" text button
- Reject All: "✗ Reject All" text button

**Placement**: Contact group footer (visible on hover or always visible)

**Styling**:
- Accept All: Green background, white text
- Reject All: Red background, white text
- Hover: Darker shade
- Active: Slight scale animation

**Spacing**: 8px gap between buttons

## Data Models

### PendingEdit (Compact View)

```typescript
interface PendingEdit {
  id: string;
  editType: 'add_tag' | 'remove_tag' | 'add_to_group' | 'remove_from_group' | 'update_contact_field' | 'create_contact' | 'create_group';
  targetContactId?: string;
  targetContactName?: string;
  targetGroupId?: string;
  targetGroupName?: string;
  field?: string;
  proposedValue: any;
  confidenceScore: number;  // 0-1
  source: {
    type: 'voice_transcript' | 'text_input' | 'manual';
    transcriptExcerpt?: string;
    fullContext?: string;
    timestamp: Date;
  };
  accepted: boolean;  // true = accepted, false = rejected, null = pending
  createdAt: Date;
}
```

### ContactGroup (Grouping)

```typescript
interface ContactGroup {
  contactId: string;
  contactName: string;
  contactAvatar?: string;
  edits: PendingEdit[];
  isExpanded: boolean;
  acceptedCount: number;
  rejectedCount: number;
  totalCount: number;
}
```

## Correctness Properties

A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.

### Property 1: Contact Grouping Consistency

*For any* set of pending edits, when grouped by contact, all edits with the same contact ID should appear under the same contact group header, and no edit should appear in multiple groups.

**Validates: Requirements 1.1, 1.2**

### Property 2: Edit Count Accuracy

*For any* contact group, the displayed edit count should equal the number of edits in that group, and the accepted/rejected counts should sum to the total count.

**Validates: Requirements 1.3, 1.6**

### Property 3: Accept/Reject State Persistence

*For any* edit, when the user clicks Accept or Reject, the edit's state should be persisted and reflected in the UI immediately, and the contact group summary should update accordingly.

**Validates: Requirements 3.4, 3.5, 3.8**

### Property 4: Confidence Score Validity

*For any* pending edit, the confidence score should be a number between 0 and 1, and the color coding should match the score range (red for 0-0.5, yellow for 0.5-0.75, green for 0.75-1.0).

**Validates: Requirements 6.2, 6.3, 6.4**

### Property 5: Bulk Action Atomicity

*For any* contact group, when the user clicks "Accept All" or "Reject All", all edits in that group should be marked with the same state, and the operation should complete atomically (all or nothing).

**Validates: Requirements 8.2, 8.3**

### Property 6: Compact Layout Space Efficiency

*For any* set of pending edits, the compact layout should display at least 5-6 edits without scrolling on a standard desktop viewport (1024x768), compared to 2-3 edits in the previous design.

**Validates: Requirements 2.5, 5.5**

### Property 7: Edit Modification Validation

*For any* edit value modification, when the user saves changes, the new value should be validated according to the field type, and if validation fails, an error message should be displayed without updating the edit.

**Validates: Requirements 10.3, 10.4**

### Property 8: Responsive Stacking

*For any* viewport width less than 480px, action buttons should stack vertically, and the edit item should remain readable without horizontal scrolling.

**Validates: Requirements 9.1, 9.6**

## Error Handling

### Invalid Edit State
- If an edit's state becomes inconsistent (e.g., both accepted and rejected), the system should default to the most recent state and log a warning.

### Missing Contact Information
- If a contact is deleted after an edit is created, the edit should display the contact name as plain text without navigation.

### Confidence Score Out of Range
- If a confidence score is outside 0-1, the system should clamp it to the valid range and log a warning.

### Bulk Action Failure
- If a bulk action fails for some edits but not others, the system should display a partial success message and allow the user to retry failed edits.

## Testing Strategy

### Unit Tests

- Test contact grouping logic with various edit combinations
- Test confidence score color coding for all ranges
- Test edit state transitions (pending → accepted/rejected)
- Test bulk action logic (accept all, reject all)
- Test edit modification validation for different field types
- Test responsive layout calculations for various viewport sizes

### Property-Based Tests

- **Property 1**: Generate random sets of edits with various contact IDs and verify grouping consistency
- **Property 2**: Generate random edits and verify count accuracy after state changes
- **Property 3**: Generate random accept/reject sequences and verify state persistence
- **Property 4**: Generate random confidence scores and verify color coding matches ranges
- **Property 5**: Generate random bulk actions and verify atomicity
- **Property 6**: Measure layout height for various edit counts and verify space efficiency
- **Property 7**: Generate random field values and verify validation behavior
- **Property 8**: Generate random viewport widths and verify responsive layout

### Integration Tests

- Test the full flow: create edits → group by contact → accept/reject → verify persistence
- Test navigation from edit items to contact/group pages
- Test source attribution expansion and collapse
- Test edit modification with inline validation
- Test undo functionality for bulk actions

## Visual Mockup

```
┌─────────────────────────────────────────────────────────┐
│ Edits                                                   │
├─────────────────────────────────────────────────────────┤
│ ▼ Alice Johnson                    2/3 Accepted         │
│   🏷️  Add Tag        "friend"      92%  ✓ ✗             │
│   📍  Update Location "NYC"         78%  ✓ ✗             │
│   👥  Add to Group   "Close Friends" 45% ✓ ✗            │
│   [✓ Accept All] [✗ Reject All]                         │
├─────────────────────────────────────────────────────────┤
│ ▶ Bob Smith                        0/2 Accepted         │
├─────────────────────────────────────────────────────────┤
│ ▶ Carol Davis                      1/1 Accepted ✓       │
├─────────────────────────────────────────────────────────┤
│ [Apply Selected] [Clear All]                            │
└─────────────────────────────────────────────────────────┘
```

## Implementation Notes

1. **CSS Variables**: Use CSS custom properties for colors, spacing, and sizing to maintain consistency
2. **Sticky Headers**: Contact group headers should remain visible when scrolling within a group
3. **Animation Timing**: Use 200-300ms transitions for smooth state changes
4. **Accessibility**: Ensure all interactive elements are keyboard-accessible and have proper ARIA labels
5. **Performance**: Use event delegation for edit item interactions to minimize DOM listeners
6. **Mobile Optimization**: Test on various mobile devices to ensure touch-friendly interactions

</content>
</invoke>