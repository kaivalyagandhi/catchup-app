# Testing Conventions

## Stack
- Vitest for unit tests (`npm test`, `npm run test:coverage`)
- fast-check for property-based tests
- TypeScript type checking: `npm run typecheck`
- Linting: `npm run lint`

## Test File Conventions
- Co-locate tests with source: `src/calendar/calendar-service.test.ts`
- Use `describe` / `it` with `should` statements
- Arrange / Act / Assert pattern
- Clean up test data in `afterEach`
- Mock external dependencies (Google APIs, Twilio, etc.)

## Property-Based Tests
Use fast-check when testing universal properties, invariants, or business rules across all inputs:
```typescript
import * as fc from 'fast-check';
fc.assert(fc.property(fc.string(), (text) => {
  expect(functionUnderTest(text).length).toBeGreaterThanOrEqual(0);
}), { numRuns: 100 });
```

## Manual UI Tests
HTML test files in `tests/html/` for browser-based component testing. Open via dev server or directly in browser.

## What to Test
- Core business logic, edge cases, error handling, data transformations, validation
- Property tests for universal invariants and business rules
- Manual HTML tests for UI components and integrations
