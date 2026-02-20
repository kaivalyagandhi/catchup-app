# Design Document

## Overview

The Groups & Tags Management UI provides a dedicated interface for users to manage their organizational structures (groups and tags) alongside their contacts. This feature extends the existing CatchUp application by adding a new management view that sits adjacent to the contacts view, allowing users to create, edit, delete, and manage associations between contacts and their organizational categories.

The design leverages the existing backend services (GroupService and TagService) and adds new frontend components and API endpoints to support comprehensive management operations.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend Layer                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Contacts   │  │   Groups &   │  │ Suggestions  │  │
│  │     View     │  │  Tags View   │  │     View     │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                     API Layer                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Contacts   │  │   Groups &   │  │ Suggestions  │  │
│  │   Routes     │  │  Tags Routes │  │    Routes    │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                   Service Layer                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Contact    │  │    Group     │  │     Tag      │  │
│  │   Service    │  │   Service    │  │   Service    │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                 Repository Layer                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Contact    │  │    Group     │  │     Tag      │  │
│  │  Repository  │  │  Repository  │  │  Repository  │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
                  ┌──────────────┐
                  │  PostgreSQL  │
                  │   Database   │
                  └──────────────┘
```

### Component Interaction Flow

1. **User Interaction**: User interacts with the Groups & Tags Management UI
2. **API Request**: Frontend makes authenticated API calls to backend routes
3. **Service Layer**: Routes delegate to service layer for business logic
4. **Repository Layer**: Services use repositories for data persistence
5. **Database**: Repositories execute SQL queries against PostgreSQL
6. **Response**: Data flows back through the layers to update the UI

## Components and Interfaces

### Frontend Components

#### 1. Groups & Tags Management View

**Location**: `public/js/app.js` (new functions) and `public/index.html` (new page section)

**Responsibilities**:
- Display lists of groups and tags with contact counts
- Provide create, edit, and delete operations for groups and tags
- Show associated contacts for each group/tag
- Enable adding/removing contacts from groups and tags
- Handle user interactions and API communication

**Key Functions**:
```javascript
// Navigation
function navigateToGroupsTagsManagement()

// Group Management
function loadGroups()
function renderGroups(groupsList)
function showCreateGroupModal()
function showEditGroupModal(groupId)
function saveGroup(event)
function deleteGroup(groupId)
function showGroupContacts(groupId)

// Tag Management
function loadTags()
function renderTags(tagsList)
function showCreateTagModal()
function showEditTagModal(tagId)
function saveTag(event)
function deleteTag(tagId)
function showTagContacts(tagId)

// Contact Association Management
function showAddContactsToGroupModal(groupId)
function showAddContactsToTagModal(tagId)
function addContactsToGroup(groupId, contactIds)
function removeContactFromGroup(groupId, contactId)
function addContactsToTag(tagId, contactIds)
function removeContactFromTag(tagId, contactId)
```

**State Management**:
```javascript
let groups = [];           // All groups for current user
let tags = [];             // All tags in system
let currentGroup = null;   // Currently selected group
let currentTag = null;     // Currently selected tag
let groupContacts = [];    // Contacts in selected group
let tagContacts = [];      // Contacts with selected tag
```

#### 2. Modal Components

**Group Modal**: For creating and editing groups
- Input field for group name
- Save and cancel buttons
- Error display area

**Tag Modal**: For creating and editing tags
- Input field for tag text (1-3 words validation)
- Save and cancel buttons
- Error display area

**Contact Association Modal**: For adding contacts to groups/tags
- Searchable list of available contacts
- Multi-select capability
- Add and cancel buttons

**Contact List Modal**: For viewing and managing associated contacts
- List of contacts in group/tag
- Remove button for each contact
- Close button

### Backend Components

#### 1. Groups & Tags API Routes

**Location**: New file `src/api/routes/groups-tags.ts`

**Endpoints**:

```typescript
// Group Endpoints
GET    /api/groups-tags/groups              // List all groups with contact counts
GET    /api/groups-tags/groups/:id          // Get specific group details
POST   /api/groups-tags/groups              // Create new group
PUT    /api/groups-tags/groups/:id          // Update group
DELETE /api/groups-tags/groups/:id          // Delete group (soft delete/archive)

// Tag Endpoints
GET    /api/groups-tags/tags                // List all tags with contact counts
GET    /api/groups-tags/tags/:id            // Get specific tag details
POST   /api/groups-tags/tags                // Create new tag
PUT    /api/groups-tags/tags/:id            // Update tag
DELETE /api/groups-tags/tags/:id            // Delete tag

// Group-Contact Association Endpoints
GET    /api/groups-tags/groups/:id/contacts // Get contacts in group
POST   /api/groups-tags/groups/:id/contacts // Add contacts to group
DELETE /api/groups-tags/groups/:id/contacts/:contactId // Remove contact from group

// Tag-Contact Association Endpoints
GET    /api/groups-tags/tags/:id/contacts   // Get contacts with tag
POST   /api/groups-tags/tags/:id/contacts   // Add tag to contacts
DELETE /api/groups-tags/tags/:id/contacts/:contactId // Remove tag from contact
```

**Request/Response Formats**:

```typescript
// Group Creation Request
{
  userId: string;
  name: string;
}

// Group Response
{
  id: string;
  userId: string;
  name: string;
  isDefault: boolean;
  isPromotedFromTag: boolean;
  archived: boolean;
  contactCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// Tag Creation Request
{
  text: string;
  source: 'manual' | 'ai' | 'voice';
}

// Tag Response
{
  id: string;
  text: string;
  source: TagSource;
  contactCount: number;
  createdAt: Date;
}

// Add Contacts Request
{
  userId: string;
  contactIds: string[];
}
```

#### 2. Enhanced Repository Methods

**GroupRepository Extensions**:
```typescript
interface GroupRepository {
  // Existing methods...
  
  // New methods for management UI
  getGroupWithContactCount(id: string, userId: string): Promise<GroupWithCount>;
  listGroupsWithContactCounts(userId: string): Promise<GroupWithCount[]>;
  getGroupContacts(groupId: string, userId: string): Promise<Contact[]>;
}
```

**TagRepository Extensions**:
```typescript
interface TagRepository {
  // Existing methods...
  
  // New methods for management UI
  getTagWithContactCount(id: string): Promise<TagWithCount>;
  listTagsWithContactCounts(): Promise<TagWithCount[]>;
  getTagContacts(tagId: string): Promise<Contact[]>;
  deleteTag(id: string): Promise<void>;
}
```

## Data Models

### Existing Models (Reference)

```typescript
interface Group {
  id: string;
  userId: string;
  name: string;
  isDefault: boolean;
  isPromotedFromTag: boolean;
  archived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface Tag {
  id: string;
  text: string;
  source: TagSource;
  createdAt: Date;
}

type TagSource = 'manual' | 'ai' | 'voice';

interface Contact {
  id: string;
  userId: string;
  name: string;
  phone?: string;
  email?: string;
  location?: string;
  timezone?: string;
  frequencyPreference?: string;
  customNotes?: string;
  tags?: Tag[];
  groups?: string[];
  archived: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### Extended Models for Management UI

```typescript
interface GroupWithCount extends Group {
  contactCount: number;
}

interface TagWithCount extends Tag {
  contactCount: number;
}

interface ContactSummary {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Group name validation consistency
*For any* group creation or update operation, if the name is empty or whitespace-only, the system should reject the operation and return an error
**Validates: Requirements 2.2, 4.2**

### Property 2: Tag name validation consistency
*For any* tag creation or update operation, if the name is empty or whitespace-only, the system should reject the operation and return an error
**Validates: Requirements 3.2, 5.2**

### Property 3: Group persistence consistency
*For any* successfully created group, querying the groups list should include that group with the correct name
**Validates: Requirements 2.3, 2.4**

### Property 4: Tag persistence consistency
*For any* successfully created tag, querying the tags list should include that tag with the correct text
**Validates: Requirements 3.3, 3.4**

### Property 5: Group update reflection
*For any* group that is updated with a new name, subsequent queries for that group should return the updated name
**Validates: Requirements 4.3, 4.4**

### Property 6: Tag update reflection
*For any* tag that is updated with new text, subsequent queries for that tag should return the updated text
**Validates: Requirements 5.3, 5.4**

### Property 7: Group deletion removes associations
*For any* group that is deleted, all contact-group associations should be removed, but the contacts themselves should remain in the system
**Validates: Requirements 6.2, 6.3, 6.4**

### Property 8: Tag deletion removes associations
*For any* tag that is deleted, all contact-tag associations should be removed, but the contacts themselves should remain in the system
**Validates: Requirements 7.2, 7.3, 7.4**

### Property 9: Contact count accuracy for groups
*For any* group, the displayed contact count should equal the number of contacts actually associated with that group
**Validates: Requirements 1.3**

### Property 10: Contact count accuracy for tags
*For any* tag, the displayed contact count should equal the number of contacts actually associated with that tag
**Validates: Requirements 1.4**

### Property 11: Contact addition to group
*For any* contact added to a group, querying the group's contacts should include that contact
**Validates: Requirements 10.3, 10.4**

### Property 12: Contact addition to tag
*For any* contact tagged with a tag, querying the tag's contacts should include that contact
**Validates: Requirements 11.3, 11.4**

### Property 13: Contact removal from group
*For any* contact removed from a group, querying the group's contacts should not include that contact
**Validates: Requirements 12.3, 12.4**

### Property 14: Contact removal from tag
*For any* contact with a tag removed, querying the tag's contacts should not include that contact
**Validates: Requirements 13.3, 13.4**

### Property 15: Operation success feedback
*For any* successful create, update, or delete operation, the system should display a success message
**Validates: Requirements 15.4**

### Property 16: Operation failure feedback
*For any* failed operation, the system should display an error message with actionable information
**Validates: Requirements 15.5**

## Error Handling

### Frontend Error Handling

**Validation Errors**:
- Empty group/tag names: Display inline error message
- Invalid tag format (>3 words): Display inline error message
- Duplicate names: Display warning message

**Network Errors**:
- Connection failures: Display retry option
- Timeout errors: Display timeout message with retry
- 401 Unauthorized: Redirect to login
- 404 Not Found: Display "resource not found" message
- 500 Server Error: Display generic error with support contact

**User Feedback**:
- Loading states: Show spinner during operations
- Success messages: Brief toast notification (3-5 seconds)
- Error messages: Persistent until dismissed or corrected

### Backend Error Handling

**Validation Errors** (400 Bad Request):
- Missing required fields
- Invalid data formats
- Business rule violations

**Authorization Errors** (401/403):
- Invalid or expired tokens
- Insufficient permissions
- Cross-user access attempts

**Not Found Errors** (404):
- Group/tag doesn't exist
- Contact doesn't exist
- Association doesn't exist

**Conflict Errors** (409):
- Duplicate group names for user
- Association already exists

**Server Errors** (500):
- Database connection failures
- Unexpected exceptions
- Transaction rollback scenarios

**Error Response Format**:
```typescript
{
  error: string;           // Human-readable error message
  code?: string;           // Machine-readable error code
  details?: any;           // Additional error context
}
```

## Testing Strategy

### Unit Testing

**Frontend Unit Tests**:
- Test modal open/close functionality
- Test form validation logic
- Test data transformation functions
- Test error message display logic
- Test contact count calculations

**Backend Unit Tests**:
- Test route parameter validation
- Test service method business logic
- Test repository query construction
- Test error handling paths
- Test authorization checks

**Example Unit Tests**:
```typescript
// Test group name validation
test('should reject empty group name', async () => {
  const service = new GroupServiceImpl();
  await expect(service.createGroup(userId, '')).rejects.toThrow('Group name is required');
});

// Test tag text validation
test('should reject tag with more than 3 words', async () => {
  const service = new TagServiceImpl();
  await expect(service.addTag(contactId, userId, 'one two three four', 'manual'))
    .rejects.toThrow('Tag must be 1-3 words');
});

// Test contact count calculation
test('should return correct contact count for group', async () => {
  const repository = new PostgresGroupRepository();
  const group = await repository.getGroupWithContactCount(groupId, userId);
  expect(group.contactCount).toBe(expectedCount);
});
```

### Property-Based Testing

**Testing Framework**: fast-check (for TypeScript/JavaScript)

**Configuration**: Each property test should run a minimum of 100 iterations

**Property Test Examples**:

```typescript
// Property 1: Group name validation consistency
test('Property 1: Empty or whitespace group names are always rejected', () => {
  fc.assert(
    fc.asyncProperty(
      fc.string().filter(s => s.trim() === ''),
      async (invalidName) => {
        const service = new GroupServiceImpl();
        await expect(service.createGroup(userId, invalidName))
          .rejects.toThrow();
      }
    ),
    { numRuns: 100 }
  );
});

// Property 3: Group persistence consistency
test('Property 3: Created groups appear in list', () => {
  fc.assert(
    fc.asyncProperty(
      fc.string().filter(s => s.trim().length > 0 && s.length <= 255),
      async (groupName) => {
        const service = new GroupServiceImpl();
        const created = await service.createGroup(userId, groupName);
        const groups = await service.listGroups(userId);
        expect(groups.some(g => g.id === created.id && g.name === groupName.trim()))
          .toBe(true);
      }
    ),
    { numRuns: 100 }
  );
});

// Property 7: Group deletion removes associations
test('Property 7: Deleting group removes associations but preserves contacts', () => {
  fc.assert(
    fc.asyncProperty(
      fc.array(fc.uuid(), { minLength: 1, maxLength: 10 }),
      async (contactIds) => {
        const groupService = new GroupServiceImpl();
        const contactService = new ContactServiceImpl();
        
        // Create group and add contacts
        const group = await groupService.createGroup(userId, 'Test Group');
        await groupService.bulkAssignContactsToGroup(contactIds, group.id, userId);
        
        // Delete group
        await groupService.archiveGroup(group.id, userId);
        
        // Verify contacts still exist
        for (const contactId of contactIds) {
          const contact = await contactService.getContact(contactId, userId);
          expect(contact).toBeDefined();
          expect(contact.groups).not.toContain(group.id);
        }
      }
    ),
    { numRuns: 100 }
  );
});

// Property 9: Contact count accuracy for groups
test('Property 9: Group contact count matches actual associations', () => {
  fc.assert(
    fc.asyncProperty(
      fc.array(fc.uuid(), { minLength: 0, maxLength: 20 }),
      async (contactIds) => {
        const service = new GroupServiceImpl();
        const repository = new PostgresGroupRepository();
        
        const group = await service.createGroup(userId, 'Test Group');
        if (contactIds.length > 0) {
          await service.bulkAssignContactsToGroup(contactIds, group.id, userId);
        }
        
        const groupWithCount = await repository.getGroupWithContactCount(group.id, userId);
        const actualContacts = await repository.getGroupContacts(group.id, userId);
        
        expect(groupWithCount.contactCount).toBe(actualContacts.length);
        expect(groupWithCount.contactCount).toBe(contactIds.length);
      }
    ),
    { numRuns: 100 }
  );
});
```

### Integration Testing

**API Integration Tests**:
- Test complete request/response cycles
- Test authentication and authorization
- Test database transactions
- Test error responses
- Test concurrent operations

**UI Integration Tests**:
- Test complete user workflows
- Test navigation between views
- Test modal interactions
- Test data refresh after operations
- Test error recovery flows

**Example Integration Tests**:
```typescript
// Test complete group creation workflow
test('should create group and display in list', async () => {
  const response = await request(app)
    .post('/api/groups-tags/groups')
    .set('Authorization', `Bearer ${token}`)
    .send({ userId, name: 'New Group' });
  
  expect(response.status).toBe(201);
  expect(response.body.name).toBe('New Group');
  
  const listResponse = await request(app)
    .get('/api/groups-tags/groups')
    .set('Authorization', `Bearer ${token}`)
    .query({ userId });
  
  expect(listResponse.body.some(g => g.id === response.body.id)).toBe(true);
});

// Test contact association workflow
test('should add and remove contacts from group', async () => {
  // Create group
  const groupResponse = await request(app)
    .post('/api/groups-tags/groups')
    .set('Authorization', `Bearer ${token}`)
    .send({ userId, name: 'Test Group' });
  
  const groupId = groupResponse.body.id;
  
  // Add contacts
  await request(app)
    .post(`/api/groups-tags/groups/${groupId}/contacts`)
    .set('Authorization', `Bearer ${token}`)
    .send({ userId, contactIds: [contactId1, contactId2] });
  
  // Verify contacts added
  const contactsResponse = await request(app)
    .get(`/api/groups-tags/groups/${groupId}/contacts`)
    .set('Authorization', `Bearer ${token}`)
    .query({ userId });
  
  expect(contactsResponse.body.length).toBe(2);
  
  // Remove one contact
  await request(app)
    .delete(`/api/groups-tags/groups/${groupId}/contacts/${contactId1}`)
    .set('Authorization', `Bearer ${token}`)
    .query({ userId });
  
  // Verify contact removed
  const updatedContactsResponse = await request(app)
    .get(`/api/groups-tags/groups/${groupId}/contacts`)
    .set('Authorization', `Bearer ${token}`)
    .query({ userId });
  
  expect(updatedContactsResponse.body.length).toBe(1);
  expect(updatedContactsResponse.body[0].id).toBe(contactId2);
});
```

### Manual Testing Checklist

**Group Management**:
- [ ] Create group with valid name
- [ ] Create group with empty name (should fail)
- [ ] Create group with very long name
- [ ] Edit group name
- [ ] Delete group with no contacts
- [ ] Delete group with contacts (verify contacts preserved)
- [ ] View group contact list

**Tag Management**:
- [ ] Create tag with 1 word
- [ ] Create tag with 3 words
- [ ] Create tag with 4 words (should fail)
- [ ] Edit tag text
- [ ] Delete tag with no contacts
- [ ] Delete tag with contacts (verify contacts preserved)
- [ ] View tag contact list

**Contact Association**:
- [ ] Add single contact to group
- [ ] Add multiple contacts to group
- [ ] Remove contact from group
- [ ] Add tag to single contact
- [ ] Add tag to multiple contacts
- [ ] Remove tag from contact

**UI/UX**:
- [ ] Responsive layout on mobile
- [ ] Responsive layout on tablet
- [ ] Responsive layout on desktop
- [ ] Loading indicators display correctly
- [ ] Success messages display and auto-dismiss
- [ ] Error messages display and persist
- [ ] Modal open/close animations
- [ ] Navigation between views

## Security Considerations

### Authentication & Authorization

**Token-Based Authentication**:
- All API endpoints require valid JWT token
- Tokens validated on every request
- Expired tokens result in 401 response and redirect to login

**User Isolation**:
- All operations scoped to authenticated user
- userId validated against token claims
- Cross-user access attempts blocked

**Input Validation**:
- All user inputs sanitized
- SQL injection prevention via parameterized queries
- XSS prevention via HTML escaping in frontend

### Data Privacy

**Access Control**:
- Users can only access their own groups
- Users can only access their own contacts
- Tags are system-wide but contact associations are user-specific

**Audit Logging**:
- Log all create/update/delete operations
- Include userId, timestamp, and operation type
- Store logs for compliance and debugging

## Performance Considerations

### Frontend Optimization

**Lazy Loading**:
- Load groups/tags only when management view is accessed
- Paginate large contact lists
- Implement virtual scrolling for long lists

**Caching**:
- Cache groups and tags in memory
- Invalidate cache on mutations
- Refresh cache on navigation to management view

**Debouncing**:
- Debounce search inputs (300ms)
- Debounce auto-save operations
- Throttle scroll events

### Backend Optimization

**Database Queries**:
- Use indexes on foreign keys (contact_id, group_id, tag_id)
- Batch operations for bulk assignments
- Use JOIN queries to fetch counts efficiently

**Query Optimization**:
```sql
-- Efficient group list with counts
SELECT g.*, COUNT(cg.contact_id) as contact_count
FROM groups g
LEFT JOIN contact_groups cg ON g.id = cg.group_id
WHERE g.user_id = $1 AND g.archived = false
GROUP BY g.id
ORDER BY g.name ASC;

-- Efficient tag list with counts
SELECT t.*, COUNT(ct.contact_id) as contact_count
FROM tags t
LEFT JOIN contact_tags ct ON t.id = ct.tag_id
GROUP BY t.id
ORDER BY t.text ASC;
```

**Connection Pooling**:
- Reuse database connections
- Configure appropriate pool size
- Handle connection errors gracefully

### Scalability

**Horizontal Scaling**:
- Stateless API design
- Session data in JWT tokens
- Database connection pooling

**Vertical Scaling**:
- Optimize query performance
- Add database indexes
- Implement caching layer

## Accessibility

**Keyboard Navigation**:
- All interactive elements accessible via keyboard
- Tab order follows logical flow
- Enter key submits forms
- Escape key closes modals

**Screen Reader Support**:
- Semantic HTML elements
- ARIA labels for interactive elements
- Descriptive button text
- Status announcements for operations

**Visual Accessibility**:
- Sufficient color contrast (WCAG AA)
- Focus indicators on interactive elements
- Error messages with icons and text
- Responsive text sizing

## Future Enhancements

**Potential Features**:
- Drag-and-drop contact assignment
- Bulk operations (multi-select groups/tags)
- Group/tag templates
- Import/export functionality
- Advanced filtering and search
- Tag hierarchies or categories
- Group nesting or sub-groups
- Analytics dashboard (most used tags, group sizes)
- Sharing groups between users
- Smart tag suggestions based on contact data
