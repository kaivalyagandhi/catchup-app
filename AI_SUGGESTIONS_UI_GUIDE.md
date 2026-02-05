# AI Suggestions UI Guide

## Visual Changes

### Before vs After

#### Before (No Suggestions)
```
┌─────────────────────────────────────────────┐
│ 💜 Inner Circle                      0/10   │
├─────────────────────────────────────────────┤
│ No contacts in this circle                  │
└─────────────────────────────────────────────┘
```

#### After (With Suggestions & Generate Button)
```
┌─────────────────────────────────────────────┐
│ 💜 Inner Circle [✨ Generate AI Suggestions] 3/10 │
├─────────────────────────────────────────────┤
│ ┌─────────────┐ ┌─────────────┐ ┌─────────┐│
│ │ John Doe    │ │ Jane Smith  │ │ Bob Lee ││
│ │ [AI] [✓]    │ │ [AI] [✓]    │ │ [AI] [✓]││
│ └─────────────┘ └─────────────┘ └─────────┘│
└─────────────────────────────────────────────┘
```

## UI Components

### 1. Generate AI Suggestions Button

**Location**: Next to circle name in header

**Desktop View**:
```
[✨ Generate AI Suggestions]
```

**Mobile View** (< 767px):
```
[✨]
```

**States**:
- **Default**: Purple gradient, sparkle animation
- **Hover**: Lifts up slightly, stronger shadow
- **Loading**: Shows "Generating...", disabled
- **Disabled**: 50% opacity, no hover effect

**CSS Classes**:
- `.clv-generate-ai-btn` - Main button
- `.clv-generate-ai-icon` - Sparkle emoji (✨)
- `.clv-generate-ai-text` - Button text (hidden on mobile)

### 2. AI Suggestion Chips

**Visual Style**:
```
┌─────────────────────┐
│ Contact Name [AI] ✓ │  ← Dotted border
└─────────────────────┘
```

**States**:

**Suggested** (Not Accepted):
- Dotted border (2px dashed)
- Transparent background
- Gray text
- "AI" badge visible
- Green checkmark button visible

**Accepted**:
- Solid border (1px solid)
- Light gray background
- Dark text
- "AI" badge hidden
- Remove button (×) visible

**CSS Classes**:
- `.clv-suggestion-chip` - Main chip
- `.clv-suggestion-chip.accepted` - Accepted state
- `.clv-ai-badge` - Purple "AI" badge
- `.clv-accept-btn` - Green checkmark button

### 3. Circle Header Layout

```
┌──────────────────────────────────────────────────────────┐
│ [Emoji] Circle Name [Generate Button]        Count/Max   │
└──────────────────────────────────────────────────────────┘
```

**Responsive Breakpoints**:
- **Desktop** (> 767px): Full button text
- **Mobile** (≤ 767px): Icon only

## Color Scheme

### Generate Button
- **Background**: `linear-gradient(135deg, #8b5cf6, #6366f1)` (Purple gradient)
- **Text**: White
- **Shadow**: `rgba(139, 92, 246, 0.2)`
- **Hover Shadow**: `rgba(139, 92, 246, 0.3)`

### AI Badge
- **Background**: `linear-gradient(135deg, #8b5cf6, #6366f1)` (Purple gradient)
- **Text**: White
- **Border Radius**: 10px
- **Padding**: 2px 6px

### Suggestion Chip
- **Border (Suggested)**: `2px dashed #d1d5db` (Gray)
- **Border (Hover)**: `2px dashed #fb923c` (Orange)
- **Background (Hover)**: `rgba(251, 146, 60, 0.05)` (Light orange)
- **Border (Accepted)**: `1px solid #e5e7eb` (Gray)
- **Background (Accepted)**: `#f3f4f6` (Light gray)

### Accept Button
- **Background**: `#10b981` (Green)
- **Hover**: `#059669` (Darker green)
- **Icon**: White checkmark (✓)

## Animations

### Sparkle Animation
```css
@keyframes clvSparkle {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(1.1); }
}
```
- **Duration**: 2s (default), 0.5s (hover)
- **Timing**: ease-in-out
- **Iteration**: infinite

### Chip Fade In
```css
@keyframes clvChipIn {
  from { opacity: 0; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1); }
}
```
- **Duration**: 0.2s
- **Timing**: ease-out

### Button Hover
- **Transform**: `translateY(-1px)` (lifts up)
- **Shadow**: Increases from 2px to 4px
- **Duration**: 0.2s

## Accessibility

### ARIA Labels
```html
<button 
  class="clv-generate-ai-btn"
  title="Generate AI suggestions for this circle"
  aria-label="Generate AI suggestions"
>
  <span class="clv-generate-ai-icon">✨</span>
  <span class="clv-generate-ai-text">Generate AI Suggestions</span>
</button>
```

### Keyboard Navigation
- **Tab**: Focus on generate button
- **Enter/Space**: Trigger generation
- **Tab**: Move to next interactive element

### Screen Reader Support
- Button announces: "Generate AI suggestions button"
- Loading state announces: "Generating..."
- Success toast announces: "Generated X AI suggestions for Circle Name"

## Dark Theme Support

All components support dark theme via `[data-theme="dark"]`:

**Generate Button**:
- Same gradient (already dark)
- Slightly stronger shadow

**Suggestion Chips**:
- Border: Lighter gray for visibility
- Background: Darker surface color
- Text: Lighter color

**AI Badge**:
- Same gradient (already has good contrast)

## Mobile Optimizations

### Button Text Hiding
```css
@media (max-width: 767px) {
  .clv-generate-ai-text {
    display: none;
  }
  
  .clv-generate-ai-btn {
    padding: 6px 10px;  /* Reduced padding */
  }
}
```

### Touch Targets
- Minimum 44px × 44px for touch
- Increased padding on mobile
- Larger tap areas for buttons

### Chip Sizing
- Slightly larger on mobile (8px → 14px padding)
- Larger remove/accept buttons (20px → 24px)
- Better spacing between chips

## Loading States

### Generate Button Loading
```
[✨ Generating...]  ← Disabled, gray text
```

### Suggestion Loading
```
┌─────────────────────────────────────────────┐
│ [Spinner] Loading suggestions...            │
└─────────────────────────────────────────────┘
```

## Error States

### No Suggestions
```
Info Toast: "No new suggestions found for Circle Name. 
Try adding more contact details or calendar events."
```

### API Error
```
Error Toast: "Failed to generate suggestions: [error message]"
```

### Network Error
```
Error Toast: "Failed to generate suggestions: Network error"
```

## Success States

### Suggestions Generated
```
Success Toast: "✨ Generated 5 AI suggestions for Inner Circle"
```

### Suggestion Accepted
```
Success Toast: "John Doe added to Inner Circle"
```

## Interaction Flow

1. **User clicks generate button**
   - Button shows "Generating..."
   - Button disabled
   - Sparkle animation speeds up

2. **API call in progress**
   - Loading state visible
   - User can't click again
   - Other UI remains interactive

3. **Suggestions received**
   - Button re-enables
   - Text returns to "Generate AI Suggestions"
   - New chips fade in
   - Success toast appears

4. **User clicks accept (✓)**
   - Chip changes to solid border
   - "AI" badge disappears
   - Remove button (×) appears
   - Circle count updates
   - Success toast appears

## Best Practices

### When to Show Generate Button
- ✅ Inner Circle (high value)
- ✅ Close Friends (high value)
- ✅ Active Friends (medium value)
- ❌ Casual Network (low value, too many contacts)

### When to Disable Generate Button
- During generation (loading state)
- When API is unavailable
- When user is not authenticated

### When to Show Suggestions
- On initial load (if available)
- After manual generation
- After accepting/rejecting suggestions (refresh)

### When to Hide Suggestions
- Contact already in a circle
- Contact was rejected by user
- Suggestion was accepted (becomes regular chip)

## Testing Checklist

- [ ] Button appears in correct circles
- [ ] Button text hides on mobile
- [ ] Sparkle animation works
- [ ] Loading state shows correctly
- [ ] Suggestions appear after generation
- [ ] Accept button works
- [ ] Remove button works (after accept)
- [ ] Circle count updates
- [ ] Toasts appear with correct messages
- [ ] Dark theme works
- [ ] Keyboard navigation works
- [ ] Screen reader announces correctly
- [ ] Touch targets are adequate on mobile
