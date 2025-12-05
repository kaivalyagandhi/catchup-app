# Task 8: Segmented Control Visual Reference

## Design Specifications

### Latte Mode (Light Theme)

```
┌─────────────────────────────────────────────────────────────┐
│                                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ 👥 Contacts │ 🎯 Circles │ 👥 Groups │ 🏷️ Tags      │  │
│  │   [WHITE]   │  [GRAY]    │  [GRAY]   │  [GRAY]       │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                               │
└─────────────────────────────────────────────────────────────┘

Container: Stone-100 (#F5F5F4) background
Border: 1px Stone-400 (#A8A29E)
Border-radius: 12px
Padding: 4px
Gap: 4px between tabs

Active Tab (Contacts):
- Background: White (#FFFFFF)
- Text: Stone-900 (#1C1917)
- Shadow: 0 1px 3px rgba(0,0,0,0.1)
- Border-radius: 8px
- Font-weight: 600

Inactive Tabs:
- Background: Transparent
- Text: Stone-500 (#78716C)
- Font-weight: 500

Hover State:
- Background: Stone-200 (#E7E5E4)
- Text: Stone-900 (#1C1917)
```

### Espresso Mode (Dark Theme)

```
┌─────────────────────────────────────────────────────────────┐
│                                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ 👥 Contacts │ 🎯 Circles │ 👥 Groups │ 🏷️ Tags      │  │
│  │  [STONE-8]  │  [TRANS]   │  [TRANS]  │  [TRANS]      │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                               │
└─────────────────────────────────────────────────────────────┘

Container: Stone-800 (#1C1917) background
Border: 1px Stone-600 (#78716C)
Border-radius: 12px
Padding: 4px
Gap: 4px between tabs

Active Tab (Contacts):
- Background: Stone-800 (#292524)
- Text: Stone-50 (#FAFAF9)
- Shadow: 0 1px 3px rgba(0,0,0,0.1)
- Border-radius: 8px
- Font-weight: 600

Inactive Tabs:
- Background: Transparent
- Text: Stone-400 (#A8A29E)
- Font-weight: 500

Hover State:
- Background: Stone-700 (#44403C)
- Text: Stone-50 (#FAFAF9)
```

## Interaction States

### 1. Default State
```
[Container with 4 tabs, first tab active]
Contacts tab: White background, elevated
Other tabs: Transparent, flat
```

### 2. Hover State (on inactive tab)
```
User hovers over "Circles" tab
Circles tab: Light gray background appears
Smooth 0.2s transition
```

### 3. Click/Active State
```
User clicks "Groups" tab
Groups tab: Becomes active (white bg, shadow)
Contacts tab: Becomes inactive (transparent)
Content area: Fades in with new content
```

### 4. Mobile State (<768px)
```
[Container stretches to full width]
[Horizontal scroll if tabs overflow]
[Scrollbar hidden for clean look]
Tabs maintain pill shape
Slightly smaller padding and font
```

## Spacing & Sizing

### Desktop (≥768px)
- Container padding: 4px
- Tab padding: 10px 20px
- Tab font-size: 14px
- Gap between tabs: 4px
- Container border-radius: 12px
- Tab border-radius: 8px

### Mobile (<768px)
- Container padding: 4px
- Tab padding: 10px 16px
- Tab font-size: 13px
- Gap between tabs: 4px
- Border-radius: Same as desktop

## Animation & Transitions

### Tab Switching
```css
transition: all 0.2s ease;
```
- Background color fades smoothly
- Text color transitions
- Shadow appears/disappears

### Content Switching
```css
animation: fadeIn 0.3s ease-in;

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

## Accessibility

### Keyboard Navigation
- Tab key moves between tabs
- Enter/Space activates tab
- Arrow keys can navigate (if implemented)

### Screen Readers
- Buttons have clear labels
- Active state announced
- Tab role semantics

### Focus States
- Visible focus ring on keyboard navigation
- Follows browser default focus styles
- High contrast for visibility

## Comparison with Other Patterns

### vs. Underline Tabs (Previous Design)
| Feature | Underline | Segmented Control |
|---------|-----------|-------------------|
| Visual Weight | Light | Medium |
| Hierarchy | Subtle | Clear |
| Modern Feel | Traditional | Contemporary |
| Mobile Friendly | Good | Excellent |
| Touch Target | Medium | Large |

### vs. Button Group
| Feature | Button Group | Segmented Control |
|---------|--------------|-------------------|
| Spacing | Gaps or borders | Contained |
| Background | Individual | Shared container |
| Visual Unity | Separate | Unified |
| Warmth | Neutral | Warm (Stone palette) |

## Implementation Notes

1. **Container is inline-flex**: Doesn't stretch full width unnecessarily
2. **4px gap**: Creates breathing room between tabs
3. **Subtle shadow on active**: Provides elevation without being heavy
4. **Warm colors**: Stone palette creates cozy feel
5. **Smooth transitions**: Enhances perceived performance
6. **Mobile-first**: Responsive design adapts gracefully

## Testing Checklist

Visual Tests:
- [ ] Container has rounded corners (12px)
- [ ] Tabs have rounded corners (8px)
- [ ] Active tab has white background (Latte)
- [ ] Active tab has subtle shadow
- [ ] Inactive tabs are transparent
- [ ] Hover state shows background change
- [ ] 4px gap visible between tabs
- [ ] Container has warm gray background

Functional Tests:
- [ ] Only one tab active at a time
- [ ] Clicking tab switches content
- [ ] Content fades in smoothly
- [ ] Tab state persists on page refresh
- [ ] URL hash updates correctly

Theme Tests:
- [ ] Latte mode uses correct colors
- [ ] Espresso mode uses correct colors
- [ ] Theme toggle works smoothly
- [ ] No flash of unstyled content

Responsive Tests:
- [ ] Desktop: Inline container
- [ ] Mobile: Full-width container
- [ ] Horizontal scroll works
- [ ] Scrollbar hidden
- [ ] Touch-friendly tap targets
