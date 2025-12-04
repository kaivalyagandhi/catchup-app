# Contact Onboarding Feature - Complete Documentation

## Overview

The Contact Onboarding feature is a comprehensive system for organizing contacts into social circles based on Dunbar's number theory. This document serves as the central hub for all onboarding-related documentation.

## Documentation Index

### For Users

- **[User Guide](./CONTACT_ONBOARDING_USER_GUIDE.md)** - Complete guide for using the onboarding feature
  - Understanding Dunbar's number
  - Step-by-step onboarding walkthrough
  - Circle definitions and recommendations
  - AI suggestions and preferences
  - Weekly Catchup feature
  - Tips and best practices

- **[Troubleshooting Guide](./CONTACT_ONBOARDING_TROUBLESHOOTING.md)** - Solutions for common issues
  - Onboarding problems
  - Drag-and-drop issues
  - AI suggestion problems
  - Performance optimization
  - Mobile-specific issues
  - Error message reference

### For Developers

- **[API Documentation](./ONBOARDING_API.md)** - Complete API reference
  - Onboarding endpoints
  - Circle assignment endpoints
  - AI suggestion endpoints
  - Request/response formats
  - Error handling
  - Code examples

- **[Design Document](../.kiro/specs/contact-onboarding/design.md)** - Technical design
  - Architecture overview
  - Component interfaces
  - Data models
  - Correctness properties
  - Testing strategy
  - Implementation phases

- **[Requirements Document](../.kiro/specs/contact-onboarding/requirements.md)** - Feature requirements
  - User stories
  - Acceptance criteria
  - Glossary of terms

- **[Implementation Tasks](../.kiro/specs/contact-onboarding/tasks.md)** - Development checklist
  - Task breakdown
  - Implementation order
  - Testing requirements

## Quick Start

### For Users

1. **First Time Setup**
   - Log into CatchUp
   - Click "Begin Onboarding" when prompted
   - Follow the guided flow
   - Organize contacts into circles
   - Set preferences for close contacts

2. **Managing Existing Contacts**
   - Go to Contacts page
   - Click "Manage" button
   - Adjust circle assignments as needed
   - Update preferences

3. **Weekly Maintenance**
   - Check Weekly Catchup notifications
   - Review 10-15 contacts per week
   - Keep your network organized

### For Developers

1. **Setup Development Environment**
   ```bash
   # Install dependencies
   npm install
   
   # Set up database
   npm run db:init
   
   # Run migrations
   npm run db:migrate
   
   # Start development server
   npm run dev
   ```

2. **Run Tests**
   ```bash
   # Run all tests
   npm test
   
   # Run specific test suite
   npm test onboarding
   
   # Run with coverage
   npm run test:coverage
   ```

3. **Key Files to Know**
   - `src/contacts/onboarding-service.ts` - Main service logic
   - `src/contacts/circle-assignment-service.ts` - Circle management
   - `src/contacts/ai-suggestion-service.ts` - AI suggestions
   - `public/js/onboarding-controller.js` - Frontend controller
   - `public/js/circular-visualizer.js` - Visualization component

## Feature Overview

### What is Contact Onboarding?

Contact Onboarding helps users organize their relationships into five social circles based on Dunbar's number research:

1. **Inner Circle** (5 people) - Closest relationships
2. **Close Friends** (15 people) - Regular friends
3. **Active Friends** (50 people) - Occasional friends
4. **Casual Network** (150 people) - Acquaintances
5. **Acquaintances** (500+ people) - Loose connections

### Key Features

#### 1. Circular Visualization
- Beautiful concentric circles representing relationship tiers
- Drag-and-drop interface for easy organization
- Real-time updates and animations
- Capacity indicators and recommendations

#### 2. AI-Powered Suggestions
- Analyzes communication patterns
- Suggests appropriate circles for each contact
- Learns from user corrections
- Provides confidence scores

#### 3. Progressive Onboarding
- Breaks setup into manageable steps
- Saves progress automatically
- Allows resumption at any time
- Celebrates milestones

#### 4. Weekly Catchup
- Chunks contact management into weekly sessions
- Shows 10-15 contacts per week
- Tracks progress and completion
- Focuses on maintenance after initial setup

#### 5. Gamification
- Progress bars and animations
- Achievement badges
- Network health scores
- Streak tracking
- Milestone celebrations

#### 6. Mobile Responsive
- Touch-optimized interface
- Gesture support
- Responsive layouts
- Orientation handling

#### 7. Privacy & Security
- Private data storage
- Encrypted sensitive information
- Data export capability
- Complete account deletion

## Architecture

### High-Level Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend Layer                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Onboarding  │  │   Circular   │  │  Weekly      │      │
│  │  Controller  │  │  Visualizer  │  │  Catchup     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└────────────────────────────┬─────────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │   API Routes    │
                    └────────┬────────┘
                             │
┌────────────────────────────┼─────────────────────────────────┐
│                     Backend Layer                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Onboarding  │  │  Circle      │  │  AI          │      │
│  │  Service     │  │  Assignment  │  │  Suggestion  │      │
│  │              │  │  Service     │  │  Service     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└────────────────────────────┼─────────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │   PostgreSQL    │
                    └─────────────────┘
```

### Data Flow

1. **User Action** → Frontend Controller
2. **Controller** → API Endpoint
3. **API** → Service Layer
4. **Service** → Repository Layer
5. **Repository** → Database
6. **Response** ← Back through layers
7. **UI Update** ← Frontend renders changes

### Key Services

#### OnboardingService
- Manages onboarding flow and state
- Tracks progress and milestones
- Handles initialization and completion
- Coordinates with other services

#### CircleAssignmentService
- Assigns contacts to circles
- Validates circle capacity
- Calculates distribution
- Generates rebalancing suggestions

#### AISuggestionService
- Analyzes contact interaction patterns
- Generates circle suggestions
- Calculates confidence scores
- Learns from user overrides

## Database Schema

### Core Tables

#### onboarding_state
Stores onboarding session state and progress.

```sql
CREATE TABLE onboarding_state (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  current_step VARCHAR(50) NOT NULL,
  completed_steps JSONB DEFAULT '[]',
  trigger_type VARCHAR(20) NOT NULL,
  started_at TIMESTAMP NOT NULL,
  last_updated_at TIMESTAMP NOT NULL,
  completed_at TIMESTAMP,
  progress_data JSONB DEFAULT '{}'
);
```

#### contacts (extended)
Contact table with circle assignment fields.

```sql
ALTER TABLE contacts 
  ADD COLUMN dunbar_circle VARCHAR(20),
  ADD COLUMN circle_assigned_at TIMESTAMP,
  ADD COLUMN circle_confidence DECIMAL(3,2),
  ADD COLUMN ai_suggested_circle VARCHAR(20);
```

#### circle_assignments
History of circle assignments.

```sql
CREATE TABLE circle_assignments (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  contact_id UUID NOT NULL,
  from_circle VARCHAR(20),
  to_circle VARCHAR(20) NOT NULL,
  assigned_by VARCHAR(20) NOT NULL,
  confidence DECIMAL(3,2),
  assigned_at TIMESTAMP NOT NULL,
  reason TEXT
);
```

#### ai_circle_overrides
Tracks user corrections for AI learning.

```sql
CREATE TABLE ai_circle_overrides (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  contact_id UUID NOT NULL,
  suggested_circle VARCHAR(20) NOT NULL,
  actual_circle VARCHAR(20) NOT NULL,
  factors JSONB,
  recorded_at TIMESTAMP NOT NULL
);
```

See [migration file](../scripts/migrations/017_create_contact_onboarding_schema.sql) for complete schema.

## API Endpoints

### Onboarding Management

- `POST /api/onboarding/initialize` - Start onboarding
- `GET /api/onboarding/state` - Get current state
- `PUT /api/onboarding/progress` - Update progress
- `POST /api/onboarding/complete` - Mark complete
- `GET /api/onboarding/uncategorized` - Get uncategorized contacts

### Circle Assignment

- `POST /api/circles/assign` - Assign single contact
- `POST /api/circles/batch-assign` - Batch assignment
- `GET /api/circles/distribution` - Get circle counts
- `GET /api/circles/capacity/:circle` - Check capacity
- `GET /api/circles/suggestions/rebalance` - Get rebalancing suggestions

### AI Suggestions

- `POST /api/ai/suggest-circle` - Get suggestion for contact
- `POST /api/ai/batch-suggest` - Batch suggestions
- `POST /api/ai/record-override` - Record user correction
- `POST /api/ai/improve-model` - Trigger model improvement

See [API Documentation](./ONBOARDING_API.md) for complete reference.

## Testing

### Test Coverage

The onboarding feature includes comprehensive testing:

- **Unit Tests** - Individual component testing
- **Integration Tests** - API and service integration
- **Property-Based Tests** - Correctness properties
- **End-to-End Tests** - Complete user flows

### Running Tests

```bash
# All tests
npm test

# Specific test suites
npm test onboarding-service
npm test circle-assignment
npm test ai-suggestions

# With coverage
npm run test:coverage

# Watch mode
npm test -- --watch
```

### Key Test Files

- `src/contacts/onboarding-service.test.ts`
- `src/contacts/circle-assignment-service.test.ts`
- `src/contacts/ai-suggestion-service.test.ts`
- `src/api/routes/onboarding.test.ts`
- `public/js/onboarding-controller.test.html`

## Configuration

### Environment Variables

```bash
# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=catchup_db
DATABASE_USER=postgres
DATABASE_PASSWORD=your_password

# AI Service (if using external AI)
AI_SERVICE_URL=https://ai.catchup.app
AI_SERVICE_KEY=your_api_key

# Feature Flags
ENABLE_AI_SUGGESTIONS=true
ENABLE_WEEKLY_CATCHUP=true
ENABLE_GAMIFICATION=true
```

### Feature Flags

Control feature availability:

```typescript
// In config/features.ts
export const FEATURES = {
  aiSuggestions: process.env.ENABLE_AI_SUGGESTIONS === 'true',
  weeklyCatchup: process.env.ENABLE_WEEKLY_CATCHUP === 'true',
  gamification: process.env.ENABLE_GAMIFICATION === 'true',
};
```

## Performance Considerations

### Optimization Strategies

1. **Pagination** - Large contact lists are paginated
2. **Virtual Scrolling** - Efficient rendering of many contacts
3. **Caching** - AI suggestions and progress data cached
4. **Batch Operations** - Multiple assignments in single transaction
5. **Lazy Loading** - Components loaded as needed

### Performance Targets

- Circular visualization: <500ms for 500 contacts
- AI suggestions: <2s for 50 contacts
- Batch operations: <5s for 100 contacts
- State save: <200ms
- Page transitions: <300ms

### Monitoring

Key metrics to monitor:

- Onboarding completion rate
- Average time to complete
- AI suggestion acceptance rate
- Circle distribution patterns
- User engagement metrics

## Security

### Data Protection

- **Encryption** - Sensitive data encrypted at rest
- **Authentication** - JWT-based authentication required
- **Authorization** - User-specific data isolation
- **Input Validation** - All inputs validated and sanitized
- **SQL Injection Prevention** - Parameterized queries only

### Privacy

- **Data Isolation** - Users can only access their own data
- **No Sharing** - Circle assignments never shared
- **Export** - Users can export all their data
- **Deletion** - Complete data removal on account deletion
- **Audit Logs** - Sensitive operations logged

## Deployment

### Prerequisites

- Node.js 18+
- PostgreSQL 12+
- 2GB RAM minimum
- SSL certificate (production)

### Deployment Steps

```bash
# 1. Clone repository
git clone https://github.com/catchup/catchup.git

# 2. Install dependencies
npm install

# 3. Set up environment
cp .env.example .env
# Edit .env with production values

# 4. Set up database
npm run db:init

# 5. Build application
npm run build

# 6. Start server
npm start
```

### Production Checklist

- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] SSL certificate installed
- [ ] Backup strategy in place
- [ ] Monitoring configured
- [ ] Error tracking enabled
- [ ] Rate limiting configured
- [ ] Security headers set

## Troubleshooting

### Common Issues

See [Troubleshooting Guide](./CONTACT_ONBOARDING_TROUBLESHOOTING.md) for detailed solutions.

**Quick fixes:**

- **Onboarding won't start** → Check authentication, refresh page
- **Progress not saving** → Check internet connection, wait for save indicator
- **Drag-and-drop not working** → Update browser, try different browser
- **AI suggestions missing** → Normal for new accounts, will improve with use
- **Performance issues** → Use filters, close other tabs, clear cache

### Getting Help

- **Documentation** - Check this guide and linked docs
- **Support Email** - support@catchup.app
- **Community Forum** - community.catchup.app
- **Status Page** - status.catchup.app

## Contributing

### Development Workflow

1. Create feature branch from `main`
2. Implement changes with tests
3. Run test suite and linting
4. Submit pull request
5. Address code review feedback
6. Merge after approval

### Code Standards

- **TypeScript** - Use strict mode
- **Testing** - Maintain >80% coverage
- **Documentation** - Document all public APIs
- **Linting** - Pass ESLint checks
- **Formatting** - Use Prettier

### Pull Request Template

```markdown
## Description
Brief description of changes

## Related Issues
Fixes #123

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests pass
- [ ] Manual testing completed

## Documentation
- [ ] API docs updated
- [ ] User guide updated
- [ ] Code comments added

## Checklist
- [ ] Tests pass
- [ ] Linting passes
- [ ] No console errors
- [ ] Backwards compatible
```

## Roadmap

### Completed Features

- ✅ Core onboarding flow
- ✅ Circular visualization
- ✅ Drag-and-drop interface
- ✅ AI-powered suggestions
- ✅ Weekly Catchup
- ✅ Gamification
- ✅ Mobile responsive design
- ✅ Privacy & security features

### Planned Enhancements

- 🔄 Advanced relationship insights
- 🔄 Social network analysis
- 🔄 Machine learning improvements
- 🔄 Calendar integration
- 🔄 Communication platform integration
- 🔄 Wearable device integration

### Future Considerations

- Relationship strength visualization over time
- Automated circle rebalancing
- Predictive relationship maintenance
- Group formation suggestions
- Introduction recommendations

## Changelog

### Version 1.0.0 (November 2025)

**Initial Release**
- Complete onboarding flow
- Five-circle organization system
- AI-powered suggestions
- Drag-and-drop interface
- Weekly Catchup feature
- Gamification elements
- Mobile responsive design
- Privacy and security features

## License

Copyright © 2025 CatchUp. All rights reserved.

## Contact

- **Website** - https://catchup.app
- **Email** - hello@catchup.app
- **Support** - support@catchup.app
- **Twitter** - @catchupapp

---

*Last updated: November 2025*
*Version: 1.0.0*
