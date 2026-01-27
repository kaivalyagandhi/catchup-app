# Landing Page Visual Reference

## Layout Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        HERO SECTION                          │
│                     (Gradient Background)                    │
│                                                              │
│     Your AI-powered Rolodex that actually remembers         │
│                      to call                                 │
│                                                              │
│     Reduce coordination friction for maintaining            │
│              friendships with intelligent                    │
│            relationship management                           │
│                                                              │
│   ┌──────────────────────┐  ┌──────────────────────┐       │
│   │ Get Started with     │  │    Learn More        │       │
│   │      Google          │  │                      │       │
│   └──────────────────────┘  └──────────────────────┘       │
│                                                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                     FEATURES SECTION                         │
│                                                              │
│     Maintain meaningful connections effortlessly             │
│   CatchUp helps you stay connected with the people who      │
│                    matter most                               │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   [Icon]     │  │   [Icon]     │  │   [Icon]     │     │
│  │              │  │              │  │              │     │
│  │  Organize by │  │ Voice-First  │  │    Smart     │     │
│  │ Relationship │  │   Capture    │  │  Scheduling  │     │
│  │    Depth     │  │              │  │ Suggestions  │     │
│  │              │  │              │  │              │     │
│  │ Based on     │  │ Record quick │  │ Connect your │     │
│  │ Dunbar's...  │  │ voice notes  │  │ calendar...  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   [Icon]     │  │   [Icon]     │  │   [Icon]     │     │
│  │              │  │              │  │              │     │
│  │ AI-Powered   │  │   Privacy    │  │    Never     │     │
│  │ Relationship │  │   Focused    │  │  Lose Touch  │     │
│  │   Insights   │  │    Design    │  │              │     │
│  │              │  │              │  │              │     │
│  │ Get intel... │  │ Your data... │  │ Set custom   │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                   TESTIMONIALS SECTION                       │
│                   (Light Gray Background)                    │
│                                                              │
│              What people are saying                          │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │              │  │              │  │              │     │
│  │ "CatchUp has │  │ "The voice   │  │ "Finally, a  │     │
│  │ transformed  │  │ notes feature│  │ tool that    │     │
│  │ how I main...│  │ is a game... │  │ helps me be  │     │
│  │              │  │              │  │ more inten...│     │
│  │              │  │              │  │              │     │
│  │ Sarah Chen   │  │ Michael      │  │ Emily        │     │
│  │ Product Mgr  │  │ Rodriguez    │  │ Thompson     │     │
│  │              │  │ SW Engineer  │  │ Entrepreneur │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    FINAL CTA SECTION                         │
│                     (Gradient Background)                    │
│                                                              │
│        Start organizing your relationships today             │
│   Join CatchUp and never lose touch with the people who     │
│                    matter most                               │
│                                                              │
│              ┌──────────────────────┐                       │
│              │ Get Started with     │                       │
│              │      Google          │                       │
│              └──────────────────────┘                       │
│                                                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                         FOOTER                               │
│                    (Dark Background)                         │
│                                                              │
│            © 2026 CatchUp. All rights reserved.             │
│                                                              │
│        Privacy Policy  |  Terms of Service  |  Contact      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Color Scheme

### Primary Colors
- **Primary Blue**: `#4285f4` (Google Blue)
- **Primary Hover**: `#357ae8` (Darker Blue)
- **Text Primary**: `#202124` (Almost Black)
- **Text Secondary**: `#5f6368` (Gray)

### Background Colors
- **White**: `#ffffff` (Main background)
- **Surface**: `#f8f9fa` (Light gray for cards)
- **Gradient**: `linear-gradient(135deg, #667eea 0%, #764ba2 100%)` (Purple gradient)

### Accent Colors
- **Border**: `#dadce0` (Light gray)
- **Shadow**: `rgba(0, 0, 0, 0.1)` (Subtle shadow)

## Typography

### Font Family
```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
```

### Font Sizes

**Mobile (320px - 767px)**
- Hero Title: `2rem` (32px)
- Hero Subtitle: `1.125rem` (18px)
- Section Title: `2rem` (32px)
- Feature Title: `1.25rem` (20px)
- Body Text: `1rem` (16px)

**Tablet (768px - 1023px)**
- Hero Title: `2.5rem` (40px)
- Hero Subtitle: `1.25rem` (20px)
- Section Title: `2rem` (32px)

**Desktop (1024px+)**
- Hero Title: `3rem` (48px)
- Hero Subtitle: `1.5rem` (24px)
- Section Title: `2.5rem` (40px)

## Spacing

### Vertical Spacing
- Section Padding: `4rem` (64px) on desktop, `2rem` (32px) on mobile
- Card Gap: `2rem` (32px)
- Element Margin: `1rem` (16px)

### Horizontal Spacing
- Container Max Width: `1200px`
- Container Padding: `1rem` (16px) on mobile, `2rem` (32px) on desktop

## Interactive Elements

### Buttons

**Primary Button**
```css
background: #4285f4
color: white
padding: 12px 24px
border-radius: 8px
min-height: 44px (touch-friendly)
```

**Hover State**
```css
background: #357ae8
transform: translateY(-1px)
box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15)
```

**Secondary Button**
```css
background: transparent
color: #4285f4
border: 2px solid #4285f4
```

### Cards

**Feature Card**
```css
background: #f8f9fa
padding: 2rem
border-radius: 12px
border: 1px solid #dadce0
```

**Hover State**
```css
transform: translateY(-4px)
box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1)
```

## Icons

### Icon Style
- **Size**: 48x48px
- **Color**: `#4285f4` (Primary blue)
- **Stroke Width**: 2px
- **Style**: Outline/line icons

### Icon Types
1. **Dunbar's Circles**: Concentric circles
2. **Voice-First**: Microphone
3. **Smart Scheduling**: Calendar
4. **AI Insights**: Cube/3D box
5. **Privacy**: Shield with checkmark
6. **Time-Based**: Clock

## Responsive Breakpoints

### Mobile First Approach
```css
/* Base styles: Mobile (320px+) */
.features-grid {
  grid-template-columns: 1fr;
}

/* Tablet (768px+) */
@media (min-width: 768px) {
  .features-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* Desktop (1024px+) */
@media (min-width: 1024px) {
  .features-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
```

## Accessibility Features

### Focus Indicators
```css
a:focus, button:focus {
  outline: 2px solid #4285f4;
  outline-offset: 2px;
}
```

### Touch Targets
- Minimum size: 44x44px
- Adequate spacing between interactive elements
- Large tap areas for mobile

### Color Contrast
- Text on white: 4.5:1 ratio (WCAG AA)
- Text on gradient: Sufficient contrast maintained
- Links clearly distinguishable

## Animation and Transitions

### Smooth Transitions
```css
transition: all 0.2s ease;
```

### Hover Effects
- Cards: `translateY(-4px)` with shadow
- Buttons: `translateY(-1px)` with darker background
- Links: Color change

### Reduced Motion
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

## Loading States

### Initial Load
- HTML loads immediately (static)
- CSS applies instantly (inline or cached)
- JavaScript loads asynchronously (non-blocking)

### Auth State Detection
- Default: Show sign-up CTAs
- After JS loads: Check localStorage
- If authenticated: Switch to "Go to Dashboard"

## Browser Support

### Supported Browsers
- ✅ Chrome/Edge (Chromium) - Latest 2 versions
- ✅ Firefox - Latest 2 versions
- ✅ Safari - Latest 2 versions
- ✅ iOS Safari - iOS 12+
- ✅ Chrome Android - Latest version

### Fallbacks
- CSS Grid with flexbox fallback
- Modern CSS with graceful degradation
- JavaScript optional (progressive enhancement)

## Performance Metrics

### Target Lighthouse Scores
- Performance: >= 80
- Accessibility: >= 90
- Best Practices: >= 90
- SEO: >= 90

### File Sizes
- HTML: ~11KB (uncompressed)
- CSS: ~7KB (uncompressed)
- JavaScript: ~3KB (uncompressed)
- Total: ~21KB (before compression)

### Load Time Targets
- First Contentful Paint: < 1.5s
- Time to Interactive: < 3s
- Total Load Time: < 3s on 3G

## SEO Elements

### Meta Tags
```html
<title>CatchUp - Your AI-Powered Relationship Manager</title>
<meta name="description" content="Reduce coordination friction...">
<meta property="og:title" content="CatchUp - Your AI-Powered...">
<meta property="og:description" content="Voice-first context capture...">
<meta property="og:image" content="/favicon.svg">
```

### Semantic Structure
```
<body>
  <section class="hero">
    <h1>Main Headline</h1>
  </section>
  <section class="features">
    <h2>Section Title</h2>
    <h3>Feature Title</h3>
  </section>
  <section class="testimonials">
    <h2>Section Title</h2>
  </section>
  <footer>
    <nav>Links</nav>
  </footer>
</body>
```

## Print Styles

### Print Optimization
```css
@media print {
  .hero, .final-cta {
    background: white;
    color: black;
  }
  .btn-primary, .btn-secondary {
    border: 1px solid black;
  }
}
```

## Comparison: Mobile vs Desktop

### Mobile (320px)
- Single column layout
- Stacked buttons
- Smaller typography
- Simplified spacing
- Touch-optimized

### Desktop (1024px+)
- Three-column grid
- Side-by-side buttons
- Larger typography
- Generous spacing
- Hover effects

## User Journey Visualization

```
┌─────────────────────────────────────────────────────────────┐
│                    UNAUTHENTICATED USER                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    Visit catchup.app/
                              │
                              ▼
                    Landing Page Loads
                              │
                              ▼
                    Read Features & Benefits
                              │
                              ▼
                Click "Get Started with Google"
                              │
                              ▼
                    Google OAuth Flow
                              │
                              ▼
                    Grant Permissions
                              │
                              ▼
                    Redirect to Dashboard
                              │
                              ▼
                    Begin Onboarding

┌─────────────────────────────────────────────────────────────┐
│                     AUTHENTICATED USER                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    Visit catchup.app/
                              │
                              ▼
                Server Detects JWT Token
                              │
                              ▼
                    Dashboard Loads
                              │
                              ▼
                    Continue Using App
```

## Component Hierarchy

```
Landing Page
├── Hero Section
│   ├── Title
│   ├── Subtitle
│   └── CTA Buttons
│       ├── Primary CTA (Google SSO)
│       └── Secondary CTA (Learn More)
├── Features Section
│   ├── Section Header
│   └── Feature Grid (6 cards)
│       ├── Feature Card 1 (Dunbar's Circles)
│       ├── Feature Card 2 (Voice-First)
│       ├── Feature Card 3 (Smart Scheduling)
│       ├── Feature Card 4 (AI Insights)
│       ├── Feature Card 5 (Privacy)
│       └── Feature Card 6 (Time-Based)
├── Testimonials Section
│   ├── Section Header
│   └── Testimonial Grid (3 cards)
│       ├── Testimonial 1 (Sarah Chen)
│       ├── Testimonial 2 (Michael Rodriguez)
│       └── Testimonial 3 (Emily Thompson)
├── Final CTA Section
│   ├── Title
│   ├── Subtitle
│   └── CTA Button (Google SSO)
└── Footer
    ├── Copyright
    └── Navigation Links
```

This visual reference provides a comprehensive overview of the landing page design, layout, and styling decisions.
