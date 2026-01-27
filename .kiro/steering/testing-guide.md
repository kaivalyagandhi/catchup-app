# CatchUp Testing Guide

## Testing Philosophy

CatchUp uses a multi-layered testing approach that combines automated unit tests, property-based tests, and manual HTML-based testing for UI components. This guide outlines the testing conventions and patterns used throughout the project.

## Testing Stack

### Automated Testing
- **Unit Tests**: [Vitest](https://vitest.dev/) - Fast, modern test runner with TypeScript support
- **Property-Based Tests**: [fast-check](https://fast-check.dev/) - Generative testing for universal properties
- **Test Coverage**: `@vitest/coverage-v8` for code coverage reporting

### Manual Testing
- **HTML Test Files**: Located in `tests/html/` for manual UI component testing
- **Dashboards**: Monitoring dashboards in `tests/html/dashboards/` for real-time testing

## Automated Testing Conventions

### Test File Organization

#### Backend Tests
- **Location**: Co-located with source files using `.test.ts` suffix
- **Example**: `src/calendar/calendar-service.ts` → `src/calendar/calendar-service.test.ts`
- **Pattern**: Keep tests close to implementation for easy maintenance

#### Test Structure
```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('Feature Name - Specific Functionality', () => {
  beforeEach(async () => {
    // Setup test data
  });

  afterEach(async () => {
    // Cleanup test data
  });

  describe('methodName', () => {
    it('should handle normal case', async () => {
      // Arrange
      const input = createTestData();
      
      // Act
      const result = await methodUnderTest(input);
      
      // Assert
      expect(result).toEqual(expectedOutput);
    });

    it('should handle edge case', async () => {
      // Test edge cases
    });

    it('should throw error for invalid input', async () => {
      await expect(methodUnderTest(invalidInput)).rejects.toThrow('Expected error');
    });
  });
});
```

### Test Naming Conventions

#### Descriptive Test Names
- Use `should` statements that describe expected behavior
- Include context about what's being tested
- Examples:
  - ✅ `should return empty array when user has no calendars`
  - ✅ `should order calendars by primary first, then by name`
  - ✅ `should throw error when invalid calendar ID is provided`
  - ❌ `test calendar list` (too vague)
  - ❌ `it works` (not descriptive)

#### Test Suite Organization
- Group related tests using nested `describe` blocks
- Top level: Feature or service name
- Second level: Method or functionality being tested
- Third level (optional): Specific scenarios

```typescript
describe('Calendar Service - Calendar Listing and Selection', () => {
  describe('listUserCalendars', () => {
    it('should return empty array when user has no calendars', () => {});
    it('should return all calendars for a user', () => {});
  });
  
  describe('getSelectedCalendars', () => {
    it('should return empty array when no calendars are selected', () => {});
    it('should return only selected calendars', () => {});
  });
});
```

### Property-Based Testing with fast-check

#### When to Use Property-Based Tests
- Testing universal properties that should hold for all inputs
- Validating business logic across a wide range of scenarios
- Finding edge cases that manual tests might miss
- Complementing unit tests with generative testing

#### Property Test Pattern
```typescript
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

describe('Property-Based Tests', () => {
  it('should maintain invariant across all inputs', () => {
    fc.assert(
      fc.property(
        fc.string(), // Generator for test data
        fc.integer({ min: 0, max: 100 }),
        (text, number) => {
          // Property that should always be true
          const result = functionUnderTest(text, number);
          expect(result).toBeDefined();
          expect(result.length).toBeGreaterThanOrEqual(0);
        }
      ),
      { numRuns: 100 } // Number of test cases to generate
    );
  });
});
```

#### Smart Generators
Write intelligent generators that constrain inputs to valid ranges:

```typescript
// Good: Constrained generator for valid email addresses
const emailArbitrary = fc.tuple(
  fc.stringOf(fc.char().filter(c => /[a-z0-9]/.test(c)), { minLength: 1 }),
  fc.constantFrom('gmail.com', 'yahoo.com', 'example.com')
).map(([local, domain]) => `${local}@${domain}`);

// Good: Generator for valid date ranges
const dateRangeArbitrary = fc.tuple(
  fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }),
  fc.integer({ min: 1, max: 365 })
).map(([start, daysOffset]) => ({
  start,
  end: new Date(start.getTime() + daysOffset * 24 * 60 * 60 * 1000)
}));
```

### Test Data Management

#### Test User IDs
Use consistent test user IDs for database tests:
```typescript
const TEST_USER_ID = '00000000-0000-0000-0000-000000000001';
```

#### Helper Functions
Create reusable test helpers:
```typescript
async function createTestUser(): Promise<void> {
  const uniqueEmail = `test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
  await pool.query(
    `INSERT INTO users (id, email, name, created_at, updated_at)
     VALUES ($1, $2, $3, NOW(), NOW())
     ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email`,
    [TEST_USER_ID, uniqueEmail, 'Test User']
  );
}

async function cleanupTestData(): Promise<void> {
  await pool.query('DELETE FROM google_calendars WHERE user_id = $1', [TEST_USER_ID]);
  await pool.query('DELETE FROM users WHERE id = $1', [TEST_USER_ID]);
}
```

### Requirements Validation Tests

Link tests to requirements using descriptive test names:
```typescript
describe('Requirements validation', () => {
  it('should support multi-calendar selection (Requirement 7.3)', async () => {
    // Test implementation
  });

  it('should allow editing calendar selection (Requirement 7.4)', async () => {
    // Test implementation
  });
});
```

### Running Tests

```bash
# Run all tests once
npm test

# Run tests in watch mode (re-run on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run TypeScript type checking
npm run typecheck

# Run linter
npm run lint
```

## Manual Testing with HTML Files

### Purpose
Manual HTML test files allow you to test UI components, features, and integrations in isolation without running the full application. Located in `tests/html/`.

### Directory Structure

```
tests/html/
├── README.md                          # Comprehensive testing guide
├── *.test.html                        # Component and feature tests
├── archive/                           # Historical test files
├── components/                        # Isolated component tests
├── dashboards/                        # Monitoring dashboards
│   ├── sms-monitoring-dashboard.html
│   ├── test-dashboard.html
│   └── twilio-testing.html
├── features/                          # Feature-level tests
└── integrations/                      # Third-party integration tests
```

### Test File Types

#### Component Tests (`*-ui.test.html`, `*-manager.test.html`)
- **Purpose**: Test individual UI components in isolation
- **Requirements**: Usually standalone, may need backend for data
- **Examples**: `enrichment-panel.test.html`, `audio-manager.test.html`

#### Feature Tests (`*-features.test.html`, `*-flow.test.html`)
- **Purpose**: Test complete feature workflows
- **Requirements**: Backend server running
- **Examples**: `manage-circles-flow.test.html`, `onboarding-controller.test.html`

#### Integration Tests (`google-*.test.html`)
- **Purpose**: Test third-party service integrations
- **Requirements**: Backend server + API credentials configured
- **Examples**: `google-sso.test.html`, `google-contacts.test.html`

#### Dashboard Tests (`dashboards/*.html`)
- **Purpose**: Monitor and debug system behavior
- **Requirements**: Backend server running
- **Examples**: `sms-monitoring-dashboard.html`

### How to Use Manual Test Files

#### Basic Workflow
1. **Start the development server** (if needed):
   ```bash
   npm run dev
   ```

2. **Open the test file** in your browser:
   - Navigate to: `http://localhost:3000/tests/html/[filename].test.html`
   - Or open directly: `file:///path/to/catchup-app/tests/html/[filename].test.html`

3. **Follow on-screen instructions** and check browser console for output

#### Testing Patterns

**Console Output**: Most test files log to the browser console
```javascript
console.log('✓ Test passed');
console.error('✗ Test failed');
console.warn('⚠ Warning');
```

**Mock Data**: Some tests include mock data for standalone testing
```javascript
const mockContacts = [
  { id: 1, name: 'John Doe', circle: 'inner' },
  // ...
];
```

**Error Scenarios**: Test files often include error handling tests

### Test File Naming Conventions

- **Component tests**: `component-name.test.html` or `component-name-ui.test.html`
- **Feature tests**: `feature-name.test.html` or `feature-name-flow.test.html`
- **Integration tests**: `service-name-integration.test.html`
- **Specific scenarios**: `component-name-scenario.test.html` (e.g., `circular-visualizer-drag-test.html`)

### Creating New Manual Test Files

When adding new manual test files:

1. **Use descriptive names**: Follow naming conventions above
2. **Include instructions**: Add on-screen instructions and HTML comments
3. **Log to console**: Use `console.log()` for test results and debugging
4. **Test in isolation**: Minimize dependencies on other features
5. **Document requirements**: Note if backend or API credentials are needed
6. **Place in correct directory**: Use subdirectories for organization

### Example Test File Structure

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Component Name Test</title>
  <link rel="stylesheet" href="/css/styles.css">
</head>
<body>
  <div class="container">
    <h1>Component Name Test</h1>
    <p>Instructions: Click the button to test the component...</p>
    
    <!-- Test UI -->
    <div id="test-container"></div>
    
    <!-- Console output -->
    <div id="console-output"></div>
  </div>

  <script src="/js/component-name.js"></script>
  <script>
    // Test setup
    console.log('Starting component test...');
    
    // Test cases
    function testBasicFunctionality() {
      console.log('✓ Basic functionality test passed');
    }
    
    function testEdgeCases() {
      console.log('✓ Edge cases test passed');
    }
    
    // Run tests
    testBasicFunctionality();
    testEdgeCases();
  </script>
</body>
</html>
```

## Testing Best Practices

### General Guidelines

1. **Write tests first** (TDD) or immediately after implementation
2. **Test behavior, not implementation** - Focus on what the code does, not how
3. **Keep tests simple and focused** - One assertion per test when possible
4. **Use descriptive names** - Test names should explain what's being tested
5. **Clean up after tests** - Always clean up test data in `afterEach`
6. **Avoid test interdependence** - Each test should run independently
7. **Mock external dependencies** - Don't rely on external APIs in unit tests

### What to Test

#### Unit Tests
- ✅ Core business logic
- ✅ Edge cases and boundary conditions
- ✅ Error handling
- ✅ Data transformations
- ✅ Validation logic

#### Property-Based Tests
- ✅ Universal properties (e.g., "output length never exceeds input length")
- ✅ Invariants (e.g., "sorting is idempotent")
- ✅ Relationships (e.g., "encode then decode returns original")
- ✅ Business rules that apply to all inputs

#### Manual Tests
- ✅ UI component appearance and interactions
- ✅ User workflows and feature integration
- ✅ Third-party service integrations
- ✅ Visual regression testing
- ✅ Mobile responsiveness

### What NOT to Test

- ❌ Third-party library internals
- ❌ Framework functionality
- ❌ Database engine behavior
- ❌ Trivial getters/setters
- ❌ Configuration files

### Test Coverage Goals

- **Core business logic**: Aim for >80% coverage
- **API routes**: Test all endpoints and error cases
- **Services**: Test all public methods
- **Utilities**: Test all exported functions
- **UI components**: Manual testing for visual verification

## Troubleshooting

### Common Issues

#### Tests fail with database errors
- **Check**: Is PostgreSQL running?
- **Check**: Are database credentials correct in `.env`?
- **Try**: Run `npm run db:test` to verify connection

#### Manual test files won't load
- **Check**: Is the development server running? (`npm run dev`)
- **Check**: Is the file path correct?
- **Try**: Opening the file directly in the browser (for standalone tests)

#### Property-based tests are slow
- **Reduce**: Number of runs with `{ numRuns: 50 }` during development
- **Increase**: For CI/CD to catch more edge cases

#### Tests pass locally but fail in CI
- **Check**: Environment variables are set in CI
- **Check**: Database is properly initialized in CI
- **Check**: Timezone differences between local and CI

## Related Documentation

- **Manual Testing Guide**: `tests/html/README.md` - Detailed guide for HTML test files
- **API Reference**: `docs/API.md` - API endpoints for integration tests
- **Tech Standards**: `.kiro/steering/tech.md` - Overall tech stack and standards
- **Examples**: `docs/examples/` - Code examples for reference

## Contributing

When adding new tests:

1. Follow the naming conventions outlined above
2. Write descriptive test names that explain the expected behavior
3. Include both positive and negative test cases
4. Add property-based tests for universal properties
5. Document any special setup requirements
6. Ensure tests clean up after themselves
7. Run the full test suite before committing: `npm test && npm run typecheck`
