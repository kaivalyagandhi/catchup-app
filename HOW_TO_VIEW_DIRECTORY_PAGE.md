# How to View the Directory Page

## Quick Start

Your development server is already running! Here's how to see the Directory page in action:

### 1. Open the Application

Open your browser and navigate to:
```
http://localhost:3000
```

### 2. Log In

Use your test credentials to log in to the application.

### 3. Navigate to Directory

Once logged in, you should see the main navigation with a **"Directory"** button. Click it to access the unified Directory page.

Alternatively, you can directly navigate to:
```
http://localhost:3000/#directory
```

## What You'll See

### Main Directory Page Features

1. **Tab Navigation** at the top:
   - 👥 **Contacts** - View all contacts in a table
   - 🎯 **Circles** - Visualize contacts in concentric circles
   - 📁 **Groups** - Manage contact groups
   - 🏷️ **Tags** - Manage contact tags

2. **Contacts Tab** (Default view):
   - Search bar with advanced filtering (try: `tag:work`, `circle:inner`, `source:google`)
   - Sort dropdown (Alphabetical, Recently Added, Recently Met)
   - "Add Contact" button
   - "Manage Circles" button
   - Full contacts table with columns:
     - Name, Phone, Email, Location, Timezone, Frequency
     - Circle (with colored badges)
     - Tags, Groups, Source
     - Actions (Edit, Delete)
   - A-Z scrollbar on the right (appears when >20 contacts)
   - Click any cell to edit inline
   - Hover over rows for highlight effect

3. **Circles Tab**:
   - Concentric circles visualization showing your relationship network
   - Five circles: Inner Circle, Close Friends, Active Friends, Casual Network, Acquaintances
   - Contact dots positioned within their assigned circles
   - Hover over dots to see contact details
   - Group filter dropdown to highlight specific groups
   - Circle capacity indicators with color coding (green/orange/red)
   - "Manage Circles" button to assign contacts to circles

4. **Groups Tab**:
   - Groups table with Name, Description, Contact Count, Actions
   - Click contact count to expand and see members
   - Inline editing for group names and descriptions
   - "Add Group" button
   - Google Contacts mappings review (if pending mappings exist)
   - Red dot indicator on tab when mappings need review

5. **Tags Tab**:
   - Tags table with Name, Contact Count, Source, Actions
   - AI/voice badges for automated tags
   - Inline editing for tag names
   - "Add Tag" button

## Testing Features

### Try These Actions:

1. **Search and Filter**:
   - Type in search bar: `John` (searches name, email, phone)
   - Try filters: `tag:work`, `group:family`, `circle:inner`, `source:google`
   - Combine filters: `tag:work circle:close`

2. **Sorting**:
   - Use sort dropdown to change order
   - Click column headers to sort by that column
   - Toggle ascending/descending with repeated clicks

3. **Inline Editing**:
   - Click any editable cell (name, email, phone, etc.)
   - Make changes and press Enter to save
   - Press Escape to cancel
   - Try editing tags/groups to see autocomplete

4. **Add Contact**:
   - Click "Add Contact" button
   - Fill in the new row
   - Click Save or press Enter
   - Watch it sort into the table automatically

5. **A-Z Navigation**:
   - If you have >20 contacts, you'll see the A-Z scrollbar on the right
   - Click any letter to jump to contacts starting with that letter
   - Scroll the table to see the current letter highlight

6. **Tab Switching**:
   - Switch between tabs
   - Notice the URL hash changes (e.g., `#directory/circles`)
   - Filter state is preserved per tab
   - Refresh the page - you'll stay on the same tab

7. **Circles Visualization**:
   - Go to Circles tab
   - Hover over contact dots to see details
   - Use group filter dropdown to highlight specific groups
   - Click "Manage Circles" to assign contacts to circles

8. **Mobile Responsive**:
   - Resize your browser window to <768px width
   - Watch the table transform to card-based layout
   - Tabs become horizontally scrollable
   - A-Z scrollbar hides automatically

9. **Dark Mode**:
   - Toggle dark mode using the theme toggle in the header
   - All Directory components adapt to dark theme

## Verification Files

If you want to test specific features in isolation, open these HTML files directly in your browser:

- `verify-contacts-table.html` - Contacts table with sample data
- `verify-circles-tab.html` - Circles visualization
- `verify-groups-table.html` - Groups table
- `verify-tags-table.html` - Tags table
- `verify-search-filter.html` - Search and filtering
- `verify-sorting.html` - Sorting functionality
- `verify-inline-editing.html` - Inline editing
- `verify-az-scrollbar.html` - A-Z navigation
- `verify-mobile-responsive.html` - Mobile layout
- `verify-circle-column.html` - Circle column in contacts table

## Troubleshooting

### Server Not Running?
If you get a connection error, start the server:
```bash
npm run dev
```

### No Contacts Showing?
You may need to:
1. Log in with a valid user account
2. Add some test contacts
3. Or use the seed data script: `npm run db:seed` (if available)

### Features Not Working?
1. Check browser console for errors (F12 → Console tab)
2. Make sure you're logged in
3. Try hard refresh: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)

## What's New in Directory Page

The Directory page consolidates what used to be separate pages:
- ✅ Old "Contacts" page → Now "Contacts" tab in Directory
- ✅ Old "Groups & Tags" page → Now "Groups" and "Tags" tabs in Directory
- ✅ New "Circles" tab → Concentric circles visualization
- ✅ Unified navigation and state management
- ✅ Modern tabular UI with inline editing
- ✅ Advanced search and filtering
- ✅ A-Z scrollbar navigation
- ✅ Circle column showing relationship tiers
- ✅ Fully responsive mobile design

Enjoy exploring your new Directory page! 🎉
