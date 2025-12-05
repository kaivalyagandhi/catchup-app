# Requirements Document

## Introduction

This specification defines the comprehensive UI/UX refactor of the CatchUp web application to achieve a "Cozy Productivity" aesthetic with a "Digital Coffee Shop" vibe. The refactor transforms the current functional but dated interface into a warm, tactile, and grounded experience using earth tones and warm grays instead of sterile blue-grays. The design philosophy is "Grounded & Organic" - inspired by Notion (Sepia mode), Linear (Dawn theme), and Arc (Earthy spaces).

The refactor covers all existing surface areas of the application including: Authentication screens, Header/Navigation, Directory page (Contacts, Circles, Groups, Tags tabs), Suggestions page, Edits page, Preferences page, all modals, floating chat components, and toast notifications.

The design prioritizes desktop web experience while supporting responsive design for mobile devices. The fixed sidebar navigation is the primary navigation pattern for desktop, with a collapsible/overlay pattern for mobile viewports.

## Glossary

- **CatchUp Application**: The personal relationship management web application built with Vanilla JavaScript
- **Cozy Productivity**: A design aesthetic that feels warm, tactile, and grounded like a digital coffee shop
- **Stone & Clay Theme**: The color system using warm gray (Stone) and terracotta/amber (Clay) tones
- **App Shell**: The persistent layout structure consisting of the sidebar navigation and main content area
- **Design System**: The unified set of visual design tokens (colors, typography, spacing) implemented as CSS custom properties
- **Segmented Control**: A pill-shaped toggle component for switching between related views
- **Ghost Button**: A button with transparent background and border, showing only on hover
- **Pill Switch**: A toggle component with rounded ends resembling a pill shape
- **Stone Palette**: A warm gray color scale following the Radix Colors 12-step methodology for semantic color usage
- **Latte Mode**: Light theme with warm alabaster/cream backgrounds
- **Espresso Mode**: Dark theme with deep warm coffee/black backgrounds
- **Circular Visualizer**: The Dunbar's circles visualization component showing contacts in concentric rings
- **Contact Group**: A collection of edits grouped by contact in the Edits page
- **Floating Chat Icon**: The persistent chat bubble for voice notes and messaging

## Requirements

### Requirement 1: Design System Foundation

**User Story:** As a user, I want the application to use a warm, earthy design system with stone and clay tones, so that the interface feels grounded and organic rather than sterile.

#### Acceptance Criteria

1. WHEN the application loads THEN the Design System SHALL use CSS custom properties following the Radix Colors 12-step scale methodology for semantic color usage
2. WHEN viewing the interface THEN the Design System SHALL use Stone (warm gray) tones instead of pure black, pure white, or cool grays
3. WHEN viewing backgrounds THEN the Design System SHALL create depth using 1px borders with --border-subtle instead of heavy drop shadows
4. WHEN viewing text THEN the Design System SHALL use a modern sans-serif system stack (Inter or San Francisco) with softer contrast logic avoiding pure blacks
5. WHEN viewing icons THEN the Design System SHALL use thin-stroke SVG icons (Lucide or Phosphor) with no emoji characters in navigation elements

### Requirement 2: Theme System (Latte/Espresso)

**User Story:** As a user, I want seamless light ("Latte") and dark ("Espresso") mode support with warm, earthy tones, so that I can use the application comfortably in any lighting condition.

#### Acceptance Criteria

1. WHEN the user toggles theme mode THEN the Application SHALL switch between Latte and Espresso color schemes using CSS custom properties
2. WHEN in Latte mode THEN the Application SHALL use --bg-app (#FDFCF8 warm alabaster/cream), --bg-sidebar (#F5F5F4 Stone-100), and --bg-surface (#FFFFFF white for cards)
3. WHEN in Espresso mode THEN the Application SHALL use --bg-app (#1C1917 Stone-900 deep coffee), --bg-sidebar (#292524 Stone-800), and --bg-surface (#292524 Stone-800)
4. WHEN displaying borders THEN the Application SHALL use --border-subtle (#E7E5E4 Stone-200 in Latte, #44403C Stone-700 in Espresso)
5. WHEN displaying text THEN the Application SHALL use --text-primary (#44403C Stone-700 in Latte, #F5F5F4 Stone-100 in Espresso) and --text-secondary (#78716C Stone-500 in Latte, #A8A29E Stone-400 in Espresso)
6. WHEN displaying accent colors THEN the Application SHALL use --accent-primary (#D97706 Amber-600 or #A36952 Terracotta in Latte, #F59E0B Amber-500 or #DFA895 Muted Clay in Espresso)

### Requirement 3: App Shell - Fixed Sidebar Navigation

**User Story:** As a user, I want a fixed left sidebar navigation with warm styling, so that I can quickly access different sections of the application without losing context.

#### Acceptance Criteria

1. WHEN the application loads THEN the Navigation SHALL display as a fixed left sidebar with 240px width, full screen height, --bg-sidebar background, and border-right using --border-subtle
2. WHEN viewing the sidebar THEN the Navigation SHALL display the brand "CatchUp" at the top with 14px bold text
3. WHEN viewing navigation items THEN the Navigation SHALL display a vertical list with Suggestions (Sparkles icon), Directory (Book icon), and Edits (Pencil icon) using thin-stroke SVG icons
4. WHEN a navigation item is active THEN the Navigation SHALL display the item with --accent-primary text color and rgba(163, 105, 82, 0.1) subtle clay tint background
5. WHEN viewing the sidebar bottom THEN the Navigation SHALL display a pinned user footer with avatar circle and name in a pill container
6. WHEN the Edits nav item has pending edits THEN the Navigation SHALL display a badge count with --accent-primary background

### Requirement 4: App Shell - Main Content Area

**User Story:** As a user, I want the main content area to be well-spaced with warm backgrounds, so that content remains readable and inviting on large monitors.

#### Acceptance Criteria

1. WHEN viewing the main content area THEN the Application SHALL display content with --bg-app background color (warm alabaster in Latte, deep coffee in Espresso)
2. WHEN viewing the main content area THEN the Application SHALL apply appropriate padding around content
3. WHEN viewing the main content area THEN the Application SHALL constrain content to a maximum width of 1000px centered horizontally
4. WHEN navigating between sections THEN the Application SHALL display minimalist headers without massive "Welcome" banners
5. WHEN the sidebar is visible THEN the Main Content Area SHALL occupy the remaining horizontal space to the right of the 240px sidebar

### Requirement 5: Authentication Screens

**User Story:** As a user, I want the login and signup screens to match the cozy aesthetic, so that my first impression of the app feels warm and inviting.

#### Acceptance Criteria

1. WHEN viewing the auth screen THEN the Application SHALL display a centered card with --bg-surface background and subtle border
2. WHEN viewing the Google SSO button THEN the Application SHALL style it with warm tones matching the theme
3. WHEN viewing form inputs THEN the Application SHALL use --bg-surface background, --border-subtle borders, and rounded corners
4. WHEN viewing the auth divider THEN the Application SHALL use --border-subtle color with --text-secondary text
5. WHEN an error occurs THEN the Application SHALL display error messages with warm red tint background matching the theme

### Requirement 6: Directory Page - Contacts Tab

**User Story:** As a user, I want to view my contacts in a clean list format with warm visual hierarchy, so that I can quickly scan and find people.

#### Acceptance Criteria

1. WHEN viewing the Directory THEN the Application SHALL display a segmented control (pill-shaped toggle) for switching between Contacts, Circles, Groups, and Tags tabs
2. WHEN a segmented control item is active THEN the Application SHALL display white background with subtle shadow in Latte mode or Stone-700 background in Espresso mode
3. WHEN viewing contacts THEN the Application SHALL display each contact as a card with --bg-surface background and --border-subtle border
4. WHEN viewing a contact card THEN the Application SHALL display the name in --text-primary (deep stone) and metadata in --text-secondary
5. WHEN a contact has no image THEN the Application SHALL display a colored circle avatar with initials using warm pastel placeholders (Sage, Sand, Dusty Rose)
6. WHEN viewing contact tags THEN the Application SHALL display tag badges with warm-toned backgrounds
7. WHEN viewing contact groups THEN the Application SHALL display group badges with warm amber/clay tones

### Requirement 7: Directory Page - Circles Tab (Circular Visualizer)

**User Story:** As a user, I want the Dunbar's circles visualization to use warm colors, so that the relationship tiers feel inviting rather than clinical.

#### Acceptance Criteria

1. WHEN viewing the Circles tab THEN the Application SHALL display the circular visualizer with warm-toned concentric rings
2. WHEN viewing circle colors THEN the Application SHALL use warm variants: Inner (#8b5cf6 purple), Close (#3b82f6 blue), Active (#10b981 green), Casual (#f59e0b amber), Acquaintance (#78716C stone)
3. WHEN viewing contact dots THEN the Application SHALL display them with --bg-surface background and subtle shadow
4. WHEN hovering over a contact THEN the Application SHALL display a tooltip with warm styling matching the theme
5. WHEN viewing the legend THEN the Application SHALL display circle names and counts with --text-primary and --text-secondary colors

### Requirement 8: Directory Page - Groups Tab

**User Story:** As a user, I want to manage groups with warm-styled cards and controls, so that organizing contacts feels pleasant.

#### Acceptance Criteria

1. WHEN viewing the Groups tab THEN the Application SHALL display groups as cards with --bg-surface background and --border-subtle border
2. WHEN viewing group headers THEN the Application SHALL display group name in --text-primary and member count badge with warm styling
3. WHEN viewing group actions THEN the Application SHALL display Edit and Delete buttons with appropriate warm styling
4. WHEN viewing Google Contact Group mappings THEN the Application SHALL display the mapping review section with warm-toned status indicators
5. WHEN creating a new group THEN the Application SHALL display the modal with --bg-surface background and backdrop blur

### Requirement 9: Directory Page - Tags Tab

**User Story:** As a user, I want to manage tags with warm-styled badges and controls, so that categorizing contacts feels cohesive with the rest of the app.

#### Acceptance Criteria

1. WHEN viewing the Tags tab THEN the Application SHALL display tags as items with --bg-surface background and --border-subtle border
2. WHEN viewing tag badges THEN the Application SHALL use warm blue-tinted backgrounds in Latte mode and warm dark blue in Espresso mode
3. WHEN viewing tag member counts THEN the Application SHALL display counts with --text-secondary color
4. WHEN creating a new tag THEN the Application SHALL display the modal with warm styling matching the theme

### Requirement 10: Suggestions Page

**User Story:** As a user, I want to view connection suggestions as modern "Polaroid" style cards with warm tones, so that I can quickly understand why I should reach out and take action.

#### Acceptance Criteria

1. WHEN viewing the Suggestions page THEN the Application SHALL display suggestions in a card grid layout
2. WHEN viewing a suggestion card THEN the Application SHALL display it with --bg-surface background, 1px --border-subtle border, and 12px border radius (smooth)
3. WHEN viewing a suggestion card THEN the Application SHALL display user avatar, name, and reason text with warm typography
4. WHEN viewing suggestion status badges THEN the Application SHALL use warm-toned colors (pending: amber, accepted: sage green, dismissed: warm gray)
5. WHEN viewing suggestion actions THEN the Application SHALL display a primary "Accept" button with --text-primary background and --bg-surface text for high contrast
6. WHEN viewing secondary actions THEN the Application SHALL display "Dismiss" and "Snooze" buttons with ghost styling
7. WHEN viewing group suggestions THEN the Application SHALL display multiple avatars with warm-styled overlap

### Requirement 11: Edits Page (Compact Menu)

**User Story:** As a user, I want to review pending edits with warm-toned visual differentiation between old and new values, so that I can quickly approve or reject changes.

#### Acceptance Criteria

1. WHEN viewing the Edits page THEN the Application SHALL display the compact edits menu with --bg-surface background
2. WHEN viewing the tabs THEN the Application SHALL display "Pending Edits" and "Edit History" tabs with warm active state styling
3. WHEN viewing contact groups THEN the Application SHALL display grouped edits by contact with warm avatar styling
4. WHEN viewing an old value THEN the Application SHALL display it with strikethrough text and warm red tint background (#FECACA or rgba(248, 113, 113, 0.1))
5. WHEN viewing a new value THEN the Application SHALL display it with bold text and sage green tint background (#BBF7D0 or rgba(74, 222, 128, 0.1))
6. WHEN viewing bulk actions THEN the Application SHALL display "Accept All" and "Reject All" buttons with warm styling
7. WHEN the edits list is empty THEN the Application SHALL display an empty state with warm illustration and "Open Chat" button

### Requirement 12: Preferences Page

**User Story:** As a user, I want the preferences page to use warm styling for all settings sections, so that configuration feels cohesive with the rest of the app.

#### Acceptance Criteria

1. WHEN viewing the Preferences page THEN the Application SHALL display sections (Notifications, Integrations, Account, Developer) with warm headers and borders
2. WHEN viewing integration cards THEN the Application SHALL display Google Calendar and Google Contacts cards with --bg-surface background and warm status indicators
3. WHEN viewing connected status THEN the Application SHALL display a green dot with warm green (#10b981) and "Connected" text
4. WHEN viewing disconnected status THEN the Application SHALL display warm red styling for "Not Connected" state
5. WHEN viewing toggle controls THEN the Application SHALL display pill switches with --border-subtle background when off and --accent-primary (Terracotta/Amber) when on
6. WHEN viewing the Account section THEN the Application SHALL display user info rows with --bg-secondary background and warm styling
7. WHEN viewing the Developer section THEN the Application SHALL display test data controls with warm-styled buttons and status cards

### Requirement 13: Modals and Overlays

**User Story:** As a user, I want all modals to have consistent warm styling with backdrop blur, so that focused interactions feel cohesive.

#### Acceptance Criteria

1. WHEN opening any modal THEN the Application SHALL display a backdrop with blur effect (backdrop-filter: blur(4px)) and warm overlay color
2. WHEN viewing modal content THEN the Application SHALL display --bg-surface background with --border-subtle border and 12px border radius
3. WHEN viewing modal headers THEN the Application SHALL display title in --text-primary with close button using warm styling
4. WHEN viewing form inputs in modals THEN the Application SHALL use --bg-app background, --border-subtle borders, and warm focus states
5. WHEN viewing modal actions THEN the Application SHALL display primary and secondary buttons with warm styling

### Requirement 14: Floating Chat and Voice Notes

**User Story:** As a user, I want the floating chat icon and voice recording interface to match the warm aesthetic, so that the interaction feels integrated with the app.

#### Acceptance Criteria

1. WHEN viewing the floating chat icon THEN the Application SHALL display it with --accent-primary background and warm shadow
2. WHEN the chat window is open THEN the Application SHALL display it with --bg-surface background and --border-subtle border
3. WHEN viewing chat messages THEN the Application SHALL display user messages with warm blue tint and system messages with --bg-secondary
4. WHEN recording voice notes THEN the Application SHALL display the recording indicator with warm red pulsing animation
5. WHEN viewing the pending edit counter THEN the Application SHALL display it with --accent-primary background

### Requirement 15: Toast Notifications

**User Story:** As a user, I want toast notifications to use warm colors, so that feedback messages feel cohesive with the app aesthetic.

#### Acceptance Criteria

1. WHEN displaying a success toast THEN the Application SHALL use warm sage green background (#d1fae5 in Latte, #064e3b in Espresso)
2. WHEN displaying an error toast THEN the Application SHALL use warm red background (#fee2e2 in Latte, #7f1d1d in Espresso)
3. WHEN displaying an info toast THEN the Application SHALL use warm blue background matching the theme
4. WHEN displaying a loading toast THEN the Application SHALL use --accent-primary border accent

### Requirement 16: Responsive Design

**User Story:** As a user, I want the application to work well on both desktop and mobile devices, so that I can manage my relationships from any device.

#### Acceptance Criteria

1. WHEN viewing on desktop (viewport >= 1024px) THEN the Application SHALL display the fixed sidebar navigation alongside the main content
2. WHEN viewing on tablet (768px <= viewport < 1024px) THEN the Application SHALL display a collapsible sidebar that can be toggled
3. WHEN viewing on mobile (viewport < 768px) THEN the Application SHALL display a bottom navigation bar or hamburger menu instead of the sidebar
4. WHEN viewing cards on mobile THEN the Application SHALL stack cards vertically in a single column
5. WHEN viewing the circular visualizer on mobile THEN the Application SHALL scale appropriately and remain interactive

### Requirement 17: Implementation Architecture

**User Story:** As a developer, I want the UI refactor to maintain the existing Vanilla JavaScript architecture, so that the changes integrate seamlessly with the current codebase.

#### Acceptance Criteria

1. WHEN implementing the design system THEN the Application SHALL update the existing :root CSS custom properties in index.html with Stone & Clay theme values
2. WHEN implementing the app shell THEN the Application SHALL modify the existing header and navigation structure to use fixed sidebar layout
3. WHEN rendering pages THEN the Application SHALL update existing render functions to use new CSS classes and variables
4. WHEN implementing components THEN the Application SHALL use Vanilla JavaScript DOM manipulation without introducing new frameworks
5. WHEN implementing theme toggle THEN the Application SHALL update the existing themeManager to use Latte/Espresso naming and warm colors
