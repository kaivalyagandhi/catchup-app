# Design Document

## Overview

The Directory page redesign transforms the existing separate Contacts and Groups & Tags pages into a unified, modern interface with tabular data presentation. The design prioritizes data density, scannability, and editing efficiency through inline editing, advanced filtering, and seamless tab-based navigation. The implementation will use vanilla JavaScript with modern CSS for styling, maintaining consistency with the existing CatchUp application architecture.

The redesign consolidates three distinct data types (Contacts, Groups, Tags) into a single page with tab-based navigation, while preserving the existing Google Contacts integration and preparing for future Dashboard page development that will handle Circles features.

## Architecture

### Component Structure

```
DirectoryPage
├── TabNavigation (Contacts | Circles | Groups | Tags)
├── ContactsTab
│   ├── SearchFilterBar (supports circle: filter)
│   ├── SortControls (includes circle sort option)
│   ├── ContactsTable
│   │   ├── TableHeader (sortable columns including Circle)
│   │   ├── TableBody (virtualized rows)
│   │   └── InlineEditCell
│   ├── AZScrollbar
│   └── AddContactButton
├── CirclesTab
│   ├── ManageCirclesButton
│   ├── GroupFilterDropdown
│   └── CircularVisualizer
│       ├── CircleLegend (capacity indicators)
│       ├── SVGCanvas
│       │   ├── CircleZones (5 concentric circles)
│       │   └── ContactDots (positioned in zones)
│       └── ContactTooltip
├── GroupsTab
│   ├── GoogleMappingsReview (conditional)
│   ├── SearchBar
│   ├── GroupsTable
│   │   ├── TableHeader
│   │   ├── TableBody
│   │   └── ExpandableRow
│   └── AddGroupButton
└── TagsTab
    ├── SearchBar
    ├── TagsTable
    │   ├── TableHeader
    │   ├── TableBody
    │   └── InlineEditCell
    └── AddTagButton
```

### Data Flow

1. **Page Load**: Fetch all contacts, groups, and tags data in parallel
2. **Tab Switch**: Show/hide relevant table, preserve filter state per tab
3. **Inline Edit**: Optimistic UI update → API call → Revert on error
4. **Search/Filter**: Client-side filtering for <1000 items, server-side for larger datasets
5. **Sort**: Client-side sorting with persistent preference in sessionStorage
6. **Add New**: Insert temporary row → Validate → API call → Sort into table

### State Management

```javascript
const directoryState = {
  currentTab: 'contacts', // 'contacts' | 'circles' | 'groups' | 'tags'
  contacts: {
    data: [],
    filteredData: [],
    searchQuery: '',
    filters: {}, // Supports circle: filter
    sortBy: 'name',
    sortOrder: 'asc'
  },
  circles: {
    visualizer: null, // CircularVisualizer instance
    activeGroupFilter: null,
    distribution: {} // Contact count per circle
  },
  groups: {
    data: [],
    filteredData: [],
    searchQuery: '',
    pendingMappings: []
  },
  tags: {
    data: [],
    filteredData: [],
    searchQuery: ''
  },
  editingCell: null // { type, id, field }
}
```

## Components and Interfaces

### 1. TabNavigation Component

**Purpose**: Provide seamless switching between Contacts, Groups, and Tags views

**Interface**:
```javascript
class TabNavigation {
  constructor(container, tabs, onTabChange)
  render()
  setActiveTab(tabId)
  showNotification(tabId, count) // Red dot indicator
  hideNotification(tabId)
}
```

**Behavior**:
- Renders tab buttons with active state styling
- Updates URL hash on tab change (e.g., `#directory/groups`)
- Displays red dot notification badge on Groups tab when mappings pending
- Preserves tab state across page refreshes

### 2. ContactsTable Component

**Purpose**: Display contacts in a sortable, filterable, editable table

**Interface**:
```javascript
class ContactsTable {
  constructor(container, data, options)
  render()
  sort(column, order)
  filter(query, filters)
  addRow()
  editCell(rowId, column)
  saveCell(rowId, column, value)
  deleteRow(rowId)
  refresh()
}
```

**Columns**:
- Name (editable, sortable)
- Phone (editable)
- Email (editable)
- Location (editable)
- Timezone (editable, dropdown)
- Frequency (editable, dropdown)
- Circle (read-only, badge, sortable, filterable)
- Tags (editable, multi-select with autocomplete)
- Groups (editable, multi-select with autocomplete)
- Source (read-only, badge)
- Actions (delete button)

**Features**:
- Virtualized rendering for 1000+ contacts using Intersection Observer
- Inline editing with immediate save
- Row hover effects
- Sortable column headers with visual indicators
- Responsive column widths

### 3. SearchFilterBar Component

**Purpose**: Provide advanced search and filtering capabilities

**Interface**:
```javascript
class SearchFilterBar {
  constructor(container, onSearch, onFilter)
  render()
  parseQuery(query) // Returns { text, filters }
  applyFilters(data, filters)
  showSuggestions(query)
}
```

**Filter Syntax**:
- `tag:work` - Filter by tag
- `group:family` - Filter by group
- `source:google` - Filter by source
- `circle:inner` - Filter by Dunbar circle (inner, close, active, casual, acquaintance)
- `location:NYC` - Filter by location
- Multiple filters: `tag:work group:colleagues circle:close`
- Text search: Any text without prefix searches name/email/phone

**Behavior**:
- Real-time filtering as user types
- Autocomplete suggestions for filter values
- Visual chips showing active filters
- Clear all filters button

### 4. CircularVisualizer Component

**Purpose**: Display contacts in concentric circles based on Dunbar's number theory

**Interface**:
```javascript
class CircularVisualizer {
  constructor(containerId)
  render(contacts, groups)
  updateContact(contactId, newCircle)
  showGroupFilter(groupId)
  clearGroupFilter()
  getCircleDistribution()
  on(event, callback) // Events: contactClick, contactUpdate
}
```

**Circle Definitions**:
- **Inner Circle**: 0-80px radius, 5 contacts max, color: #8b5cf6 (purple)
- **Close Friends**: 80-160px radius, 15 contacts max, color: #3b82f6 (blue)
- **Active Friends**: 160-240px radius, 50 contacts max, color: #10b981 (green)
- **Casual Network**: 240-320px radius, 150 contacts max, color: #f59e0b (amber)
- **Acquaintances**: 320-400px radius, 500 contacts max, color: #6b7280 (gray)

**Features**:
- SVG-based rendering with 900x900 viewBox
- Contact dots positioned evenly around mid-radius of each zone
- Contact dots are 36px diameter with initials
- Hover tooltips showing contact details
- Group filter to highlight specific group members
- Circle legend with capacity indicators (green/orange/red)
- Responsive scaling to fit container
- Click handler for contact selection

**Behavior**:
- Contacts distributed evenly in circular pattern within their zone
- No drag-and-drop (assignment happens via onboarding flow)
- Group filter dims non-matching contacts to 20% opacity
- Legend shows "X / Y" format with color-coded status
- Smooth transitions when filtering

### 5. AZScrollbar Component

**Purpose**: Provide quick alphabetical navigation

**Interface**:
```javascript
class AZScrollbar {
  constructor(container, data, onLetterClick)
  render()
  updateActiveLetters(data)
  highlightCurrentLetter(scrollPosition)
  scrollToLetter(letter)
}
```

**Behavior**:
- Fixed position on right side of table
- Only shows letters that have contacts
- Highlights current letter range based on scroll position
- Smooth scroll animation to selected letter
- Hidden on mobile or when <20 contacts

### 5. InlineEditCell Component

**Purpose**: Enable direct cell editing within the table

**Interface**:
```javascript
class InlineEditCell {
  constructor(cell, value, type, options)
  startEdit()
  cancelEdit()
  saveEdit()
  validate(value)
  showError(message)
}
```

**Cell Types**:
- **Text**: Simple input field
- **Email**: Input with email validation
- **Phone**: Input with phone formatting
- **Dropdown**: Select element (timezone, frequency)
- **MultiSelect**: Autocomplete with chips (tags, groups)

**Validation**:
- Name: Required, 1-100 characters
- Email: Valid email format or empty
- Phone: Valid phone format or empty
- Tags/Groups: Must exist or be created

### 6. GroupsTable Component

**Purpose**: Display and manage groups with member expansion

**Interface**:
```javascript
class GroupsTable {
  constructor(container, data, contacts)
  render()
  expandRow(groupId)
  collapseRow(groupId)
  editCell(groupId, column)
  addRow()
  deleteRow(groupId)
}
```

**Columns**:
- Name (editable, sortable)
- Description (editable)
- Contact Count (read-only, clickable to expand)
- Actions (delete button)

**Features**:
- Expandable rows showing member contacts
- Inline editing for name and description
- Contact count badge with expand/collapse icon
- Drag-and-drop to reorder members (future enhancement)

### 7. TagsTable Component

**Purpose**: Display and manage tags

**Interface**:
```javascript
class TagsTable {
  constructor(container, data, contacts)
  render()
  editCell(tagId, column)
  addRow()
  deleteRow(tagId)
}
```

**Columns**:
- Name (editable, sortable)
- Contact Count (read-only)
- Source (read-only, badge for AI/voice)
- Actions (delete button)

### 8. GoogleMappingsReview Component

**Purpose**: Display Google Contacts group mapping review UI

**Interface**:
```javascript
class GoogleMappingsReview {
  constructor(container, mappings, onApprove, onReject)
  render()
  approveMapping(mappingId)
  rejectMapping(mappingId)
  hide()
}
```

**Behavior**:
- Displays above groups table when mappings pending
- Shows Google group name → CatchUp group suggestion
- Approve/Reject buttons for each mapping
- Hides automatically when all mappings processed
- Updates red dot indicator on tab

## Data Models

### Contact Model
```typescript
interface Contact {
  id: string
  userId: string
  name: string
  phone?: string
  email?: string
  location?: string
  timezone?: string
  frequencyPreference?: 'weekly' | 'biweekly' | 'monthly' | 'quarterly'
  customNotes?: string
  source?: 'manual' | 'google'
  lastSyncedAt?: Date
  circle?: 'inner' | 'close' | 'active' | 'casual' | 'acquaintance' // Dunbar circle assignment
  dunbarCircle?: number // Legacy field, mapped to circle
  circleConfidence?: number // AI confidence score for circle assignment
  color?: string // Custom color for visualization
  tags: Tag[]
  groups: string[] // Group IDs
  createdAt: Date
  updatedAt: Date
  lastInteractionAt?: Date
}
```

### Group Model
```typescript
interface Group {
  id: string
  userId: string
  name: string
  description?: string
  contactIds: string[]
  createdAt: Date
  updatedAt: Date
}
```

### Tag Model
```typescript
interface Tag {
  id: string
  userId: string
  text: string
  source: 'manual' | 'ai' | 'voice'
  contactId: string
  createdAt: Date
}
```

### GoogleMapping Model
```typescript
interface GoogleMapping {
  id: string
  userId: string
  googleGroupId: string
  googleGroupName: string
  suggestedGroupId: string
  suggestedGroupName: string
  status: 'pending' | 'approved' | 'rejected'
  createdAt: Date
}
```

## Error Handling

### Client-Side Validation Errors
- Display inline error message below cell
- Prevent save until validation passes
- Highlight invalid cell with red border
- Show error toast for critical validation failures

### API Errors
- **Network Error**: Show toast, retry button
- **401 Unauthorized**: Redirect to login
- **400 Bad Request**: Show validation errors inline
- **500 Server Error**: Show toast with error message, revert optimistic update

### Inline Edit Error Handling
```javascript
async function saveCell(rowId, column, value) {
  const originalValue = getOriginalValue(rowId, column)
  
  // Optimistic update
  updateCellUI(rowId, column, value)
  
  try {
    await api.updateContact(rowId, { [column]: value })
  } catch (error) {
    // Revert on error
    updateCellUI(rowId, column, originalValue)
    showToast(`Failed to update ${column}: ${error.message}`, 'error')
  }
}
```

### Data Consistency
- Refresh data after bulk operations
- Validate foreign keys (group IDs, tag IDs) before save
- Handle concurrent edits with last-write-wins strategy
- Show warning if data changed by another session

## Testing Strategy

### Unit Tests

**ContactsTable Tests**:
- Render with empty data
- Render with sample contacts
- Sort by each column (ascending/descending)
- Filter by text search
- Filter by tag/group/source
- Add new contact row
- Delete contact
- Inline edit each cell type

**SearchFilterBar Tests**:
- Parse simple text query
- Parse filter syntax (tag:, group:, source:)
- Parse combined filters
- Apply filters to dataset
- Show autocomplete suggestions

**AZScrollbar Tests**:
- Render with contacts A-Z
- Render with sparse letters (A, C, F, Z)
- Scroll to letter
- Highlight current letter
- Hide when <20 contacts

**InlineEditCell Tests**:
- Start edit mode
- Cancel edit (Escape key)
- Save edit (Enter key)
- Validate email format
- Validate phone format
- Validate required fields

### Integration Tests

**Tab Navigation**:
- Switch between tabs
- Preserve filter state per tab
- Update URL hash
- Show/hide red dot indicator

**Google Mappings Integration**:
- Load pending mappings
- Approve mapping → update groups table
- Reject mapping → hide mapping
- Clear all mappings → hide review UI

**Inline Edit Flow**:
- Edit contact name → save → verify in database
- Edit tags → autocomplete → save → verify
- Edit groups → multi-select → save → verify
- Edit with validation error → show error → prevent save

### Property-Based Tests

Property-based testing will be used to verify universal correctness properties across all inputs. The testing framework will be **fast-check** (JavaScript property-based testing library).

Configuration:
- Minimum 100 iterations per property test
- Each test tagged with format: `**Feature: directory-page-redesign, Property {number}: {property_text}**`


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: All contact metadata visible without interaction

*For any* contact in the table, all metadata fields (name, phone, email, location, timezone, frequency, tags, groups, source) should be visible in the rendered HTML without requiring hover, click, or expansion interactions.

**Validates: Requirements 1.2**

### Property 2: Google source badge display

*For any* contact with source='google', the rendered table row should contain a Google badge element in the Source column.

**Validates: Requirements 1.4**

### Property 3: Tags and groups badge rendering

*For any* contact with tags or groups, the rendered table row should contain badge elements for each tag and group in their respective columns.

**Validates: Requirements 1.5**

### Property 4: Editable cell conversion

*For any* editable cell, clicking the cell should convert it to an input field (or appropriate input type) that accepts user input.

**Validates: Requirements 2.1**

### Property 5: Inline edit persistence

*For any* valid inline edit, completing the edit should result in the new value being saved to the database and persisting after page refresh.

**Validates: Requirements 2.2**

### Property 6: Edit failure reversion

*For any* inline edit that fails (network error, validation error, server error), the cell should revert to its original value and display an error notification.

**Validates: Requirements 2.3**

### Property 7: Autocomplete for tags and groups

*For any* tags or groups cell being edited, the system should display an autocomplete dropdown containing existing tags/groups as the user types.

**Validates: Requirements 2.4**

### Property 8: Escape key cancellation

*For any* cell in edit mode, pressing the Escape key should cancel the edit and restore the original value without saving.

**Validates: Requirements 2.5**

### Property 9: A-Z scrollbar letter navigation

*For any* letter clicked in the A-Z scrollbar that has contacts, the table should scroll to the first contact whose name starts with that letter.

**Validates: Requirements 3.2**

### Property 10: A-Z scrollbar fallback navigation

*For any* letter clicked in the A-Z scrollbar that has no contacts, the table should scroll to the first contact whose name starts with the next available letter alphabetically.

**Validates: Requirements 3.3**

### Property 11: A-Z scrollbar highlighting

*For any* scroll position in the contacts table, the A-Z scrollbar should highlight the letter corresponding to the currently visible contact names.

**Validates: Requirements 3.4**

### Property 12: Text search filtering

*For any* search query without filter prefixes, the filtered results should include only contacts whose name, email, or phone contains the query string (case-insensitive).

**Validates: Requirements 4.1**

### Property 13: Tag filter application

*For any* filter query in the format "tag:X", the filtered results should include only contacts that have a tag with text matching X.

**Validates: Requirements 4.2**

### Property 14: Group filter application

*For any* filter query in the format "group:X", the filtered results should include only contacts that belong to a group with name matching X.

**Validates: Requirements 4.3**

### Property 15: Source filter application

*For any* filter query in the format "source:X", the filtered results should include only contacts with source matching X.

**Validates: Requirements 4.4**

### Property 16: Combined filter AND logic

*For any* combination of multiple filters, the filtered results should include only contacts that satisfy ALL filter conditions (AND logic).

**Validates: Requirements 4.5**

### Property 17: Search clear restoration

*For any* filtered contact list, clearing the search bar should restore the full unfiltered contact list.

**Validates: Requirements 4.6**

### Property 18: New contact save and creation

*For any* valid new contact data entered in the add contact row, saving should create a new contact in the database with all entered fields.

**Validates: Requirements 5.2**

### Property 19: New contact sort insertion

*For any* new contact saved, the contact should appear in the table at the correct position according to the current sort order.

**Validates: Requirements 5.3**

### Property 20: Recently Added sort order

*For any* contact list sorted by "Recently Added", contacts should be ordered by creation date in descending order (newest first).

**Validates: Requirements 6.2**

### Property 21: Recently Met sort order

*For any* contact list sorted by "Recently Met", contacts should be ordered by last interaction date in descending order (most recent first).

**Validates: Requirements 6.3**

### Property 22: Column header sort toggle

*For any* sortable column header clicked, the table should toggle between ascending and descending sort order for that column.

**Validates: Requirements 6.4**

### Property 23: Sort order persistence

*For any* sort order selected, the selection should persist in sessionStorage and be restored when performing other operations (add, edit, delete).

**Validates: Requirements 6.5**

### Property 24: Tab switching visibility

*For any* tab clicked, the corresponding table should become visible and all other tables should be hidden.

**Validates: Requirements 7.2, 7.3**

### Property 25: Tab filter state preservation

*For any* tab with active filters, switching away and back to that tab should restore the same filtered state.

**Validates: Requirements 7.4**

### Property 26: Tab URL hash synchronization

*For any* tab switch, the URL hash should update to reflect the current tab (e.g., #directory/groups) without causing a page reload.

**Validates: Requirements 7.5**

### Property 27: Group row expansion

*For any* group row clicked, the row should expand to show all member contacts, and clicking again should collapse it.

**Validates: Requirements 8.2**

### Property 28: Group name inline edit

*For any* group name edited inline, the new name should be saved to the database and reflected in all references to that group.

**Validates: Requirements 8.3**

### Property 29: Group deletion cascade

*For any* group deleted, the group should be removed from the database and all member contacts should have that group ID removed from their groups array.

**Validates: Requirements 8.5**

### Property 30: Tag name global update

*For any* tag name edited inline, the new name should be updated for all contacts that have that tag.

**Validates: Requirements 9.2**

### Property 31: Tag deletion cascade

*For any* tag deleted, the tag should be removed from all associated contacts.

**Validates: Requirements 9.4**

### Property 32: AI/voice tag badge display

*For any* tag with source "ai" or "voice", the rendered tag should include a badge indicating the automated source.

**Validates: Requirements 9.5**

### Property 33: Google mappings red dot indicator

*For any* state where pending Google Contact mappings exist, the Groups tab header should display a red dot indicator.

**Validates: Requirements 10.1**

### Property 34: Google mappings review UI visibility

*For any* state where mappings need review AND the Groups tab is active, the Google Contacts Mappings Review UI should be visible above the groups table.

**Validates: Requirements 10.2**

### Property 35: Mapping completion indicator removal

*For any* state where all mappings have been reviewed (approved or rejected), the red dot indicator should be removed from the Groups tab.

**Validates: Requirements 10.3**

### Property 36: Mapping action immediate update

*For any* mapping approved or rejected, the groups table should immediately reflect the changes (new group created or mapping dismissed).

**Validates: Requirements 10.5**

### Property 37: Row hover highlighting

*For any* table row hovered, the row should display a background color change to indicate hover state.

**Validates: Requirements 11.3**

### Property 38: Badge styling consistency

*For any* badge rendered (tags, groups, source), the badge should have border-radius CSS property and appropriate color attributes.

**Validates: Requirements 11.4**

### Property 39: Dark mode theme application

*For any* table element, when dark mode is active, the element should use CSS variables from the dark theme palette.

**Validates: Requirements 11.5**

### Property 40: Mobile responsive layout

*For any* viewport width below 768px, the table layout should transform to a card-based view with stacked columns.

**Validates: Requirements 12.1**

### Property 41: Mobile column stacking

*For any* contact card in mobile view, all table columns should be stacked vertically within the card.

**Validates: Requirements 12.2**

### Property 42: Mobile tab horizontal scroll

*For any* mobile viewport where tabs exceed screen width, the tab section should be horizontally scrollable.

**Validates: Requirements 12.4**

### Property 43: Viewport change state preservation

*For any* viewport size change (desktop ↔ mobile), the current tab and filter state should be preserved.

**Validates: Requirements 12.5**

### Property 44: Circle column exclusion

*For any* contacts table rendered, the table should not include columns for Dunbar Circle or Circle Confidence.

**Validates: Requirements 13.1, 13.3**

### Property 45: Circle filter exclusion

*For any* filter options available, Circle-based filters should not be present in the filter syntax or autocomplete.

**Validates: Requirements 13.2**

### Property 46: Circle data persistence without display

*For any* contact with Circle assignment, the Circle data should exist in the database but not be rendered in the Directory page UI.

**Validates: Requirements 13.4**

