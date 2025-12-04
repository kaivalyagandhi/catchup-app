# AI Suggestion UI Visual Guide

## Component Layout

```
┌─────────────────────────────────────────────────────────────┐
│  🤖  AI Circle Suggestion                                    │
│      Based on interaction patterns and relationship strength │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Suggested circle for Alice Johnson                          │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  [IC]  Inner Circle                              [?]   │  │
│  │        ████████████████░░░░░░  85% confident          │  │
│  │                                                        │  │
│  │                          [✓ Accept] [Choose Different]│  │
│  └───────────────────────────────────────────────────────┘  │
│                                                               │
│  💡 Why this suggestion?                                     │
│  ✓ You communicate with Alice daily                         │
│  ✓ Last interaction was today                               │
│  ✓ Consistent daily interaction for over a year             │
│  ✓ Communication across multiple channels                   │
│                                                               │
│  Other possibilities:                                        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ [CF] Close Friends                    15% confidence │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Confidence Levels

### High Confidence (≥70%)
```
┌─────────────────────────────────────────────────────────┐
│  [IC]  Inner Circle                                [?]   │ ← Green border
│        ████████████████░░░░░░  85% confident          │
│                                                        │
│                      [✓ Accept] [Choose Different]    │
└─────────────────────────────────────────────────────────┘
```
- **Visual**: Green border (#10b981)
- **Background**: Light green (#f0fdf4)
- **Message**: "Accept" button prominently displayed
- **Behavior**: Pre-selected for one-click acceptance

### Medium Confidence (30-69%)
```
┌─────────────────────────────────────────────────────────┐
│  [CF]  Close Friends                               [?]   │ ← Orange border
│        ████████░░░░░░░░░░░░  55% confident          │
│                                                        │
│                      [✓ Accept] [Choose Different]    │
└─────────────────────────────────────────────────────────┘
```
- **Visual**: Orange border (#f59e0b)
- **Background**: Light orange (#fffbeb)
- **Message**: Suggested but easy to override
- **Behavior**: Both buttons equally prominent

### Low Confidence (<30%)
```
┌─────────────────────────────────────────────────────────┐
│  [CN]  Casual Network                              [?]   │ ← Gray border
│        ███░░░░░░░░░░░░░░░░░  25% confident          │
│                                                        │
│                      [✓ Accept] [Choose Different]    │
└─────────────────────────────────────────────────────────┘
```
- **Visual**: Gray border (#6b7280)
- **Background**: Light gray (#f9fafb)
- **Message**: Multiple options presented
- **Behavior**: Override button emphasized

## Circle Badges

Each circle has a unique color and two-letter abbreviation:

```
[IC] Inner Circle       - Purple (#8b5cf6)
[CF] Close Friends      - Blue (#3b82f6)
[AF] Active Friends     - Green (#10b981)
[CN] Casual Network     - Orange (#f59e0b)
[AQ] Acquaintances      - Gray (#6b7280)
```

## Confidence Bar

The confidence bar visually represents the AI's confidence level:

```
High (85%):    ████████████████░░░░░░  85% confident
Medium (55%):  ████████░░░░░░░░░░░░  55% confident
Low (25%):     ███░░░░░░░░░░░░░░░░░  25% confident
```

- **Fill color**: Matches confidence level (green/orange/gray)
- **Background**: Light gray (#e5e7eb)
- **Width**: Proportional to confidence percentage

## Explanation Factors

When available, factors are displayed with checkmarks:

```
💡 Why this suggestion?
✓ You communicate with Alice daily
✓ Last interaction was today
✓ Consistent daily interaction for over a year
✓ Communication across multiple channels
```

Each factor includes:
- **Icon**: Checkmark in a circle
- **Description**: Human-readable explanation
- **Type**: communication_frequency, recency, consistency, etc.

## Alternative Circles

Alternative suggestions are shown as clickable cards:

```
Other possibilities:

┌─────────────────────────────────────────────────────┐
│ [CF] Close Friends                    15% confidence │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ [AF] Active Friends                   10% confidence │
└─────────────────────────────────────────────────────┘
```

- **Hover effect**: Blue border and light blue background
- **Click**: Selects that circle and records override
- **Display**: Up to 3 alternatives shown

## Tooltips

Hovering over the [?] icon shows circle description:

```
     [?]  ← Hover here
      ↓
┌─────────────────────────────────────────┐
│ Your closest relationships - family and │
│ best friends                            │
└─────────────────────────────────────────┘
```

## States

### Loading State
```
┌─────────────────────────────────────────┐
│                                         │
│    🤖 Analyzing contact patterns...     │
│                                         │
└─────────────────────────────────────────┘
```

### Error State
```
┌─────────────────────────────────────────┐
│ Error: Failed to analyze contact       │
│ patterns. Please try again.             │
└─────────────────────────────────────────┘
```
- **Background**: Light red (#fef2f2)
- **Border**: Red (#fecaca)
- **Text**: Dark red (#991b1b)

### Empty State
```
┌─────────────────────────────────────────┐
│                                         │
│      No suggestion available            │
│                                         │
└─────────────────────────────────────────┘
```

## Mobile Layout

On mobile devices (< 640px), the layout stacks vertically:

```
┌─────────────────────────────┐
│  [IC]  Inner Circle    [?]  │
│  ████████████  85% confident│
│                             │
│  ┌─────────────────────────┐│
│  │      ✓ Accept           ││
│  └─────────────────────────┘│
│  ┌─────────────────────────┐│
│  │   Choose Different      ││
│  └─────────────────────────┘│
└─────────────────────────────┘
```

- **Buttons**: Full width, stacked vertically
- **Padding**: Reduced for smaller screens
- **Font sizes**: Slightly smaller for readability

## Interactions

### Accept Button Click
1. Button shows loading state
2. API call to assign contact
3. Success animation
4. Move to next contact

### Override Button Click
1. Show circle selector modal
2. Display all 5 circles with descriptions
3. User selects preferred circle
4. Record override to API
5. Assign contact to selected circle

### Alternative Circle Click
1. Highlight selected alternative
2. Record override to API
3. Assign contact to alternative circle
4. Success animation
5. Move to next contact

## Color Palette

```
Primary Colors:
- Purple:  #8b5cf6  (Inner Circle)
- Blue:    #3b82f6  (Close Friends, Primary actions)
- Green:   #10b981  (Active Friends, Success, High confidence)
- Orange:  #f59e0b  (Casual Network, Medium confidence)
- Gray:    #6b7280  (Acquaintances, Low confidence)

Background Colors:
- White:       #ffffff
- Light Gray:  #f9fafb
- Light Green: #f0fdf4
- Light Orange:#fffbeb
- Light Red:   #fef2f2

Text Colors:
- Dark:    #1f2937
- Medium:  #4b5563
- Light:   #6b7280

Border Colors:
- Light:   #e5e7eb
- Medium:  #d1d5db
- Success: #10b981
- Warning: #f59e0b
- Error:   #ef4444
```

## Animations

### Fade In
- **Duration**: 200ms
- **Easing**: ease-in-out
- **Applied to**: Modal overlays, tooltips

### Slide In
- **Duration**: 300ms
- **Easing**: ease-out
- **Applied to**: Suggestion cards, alternatives

### Confidence Bar Fill
- **Duration**: 300ms
- **Easing**: ease-in-out
- **Applied to**: Confidence bar width

### Button Hover
- **Duration**: 200ms
- **Easing**: ease-in-out
- **Applied to**: Background color changes

## Accessibility

### Keyboard Navigation
- **Tab**: Move between interactive elements
- **Enter**: Activate buttons
- **Escape**: Close modals

### Screen Reader Support
- All buttons have descriptive labels
- Confidence levels announced as percentages
- Circle descriptions read on focus
- Alternative options clearly labeled

### Focus Indicators
- Blue outline on focused elements
- 2px solid border
- Visible on all interactive elements

## Responsive Breakpoints

```
Desktop:  > 640px  - Full layout with side-by-side buttons
Tablet:   640px    - Slightly reduced padding
Mobile:   < 640px  - Stacked layout, full-width buttons
```

## Example Scenarios

### Scenario 1: High Confidence, No Alternatives
```
User sees: Green-bordered suggestion with 85% confidence
Action: Clicks "Accept"
Result: Contact assigned immediately, moves to next
```

### Scenario 2: Medium Confidence, With Alternatives
```
User sees: Orange-bordered suggestion with 55% confidence
         + 2 alternative circles
Action: Clicks alternative "Close Friends"
Result: Override recorded, contact assigned, moves to next
```

### Scenario 3: Low Confidence, Manual Override
```
User sees: Gray-bordered suggestion with 25% confidence
Action: Clicks "Choose Different"
Result: Modal opens with all 5 circles
        User selects preferred circle
        Override recorded, contact assigned
```

## Integration Points

### With Onboarding Controller
- Displays during circle_assignment step
- Updates progress after each assignment
- Saves state to backend

### With Circular Visualizer
- Shows current distribution
- Updates after assignments
- Supports drag-and-drop override

### With Backend API
- Fetches suggestions from /api/ai/suggest-circle
- Records overrides to /api/ai/record-override
- Assigns contacts via /api/circles/assign
```
