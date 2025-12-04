# HTML Test Files

This directory contains HTML and JavaScript test files for manual testing and verification of CatchUp features.

## Directory Structure

### `/components`
UI component tests and verification files:
- Search functionality tests
- Navigation and tab tests
- Table and list components
- Theme toggle tests
- Sorting and filtering tests

### `/features`
Feature-level tests:
- Contact management (add, edit, inline editing)
- Groups and circles management
- Tags and member management
- Mobile responsive tests
- Directory page tests

### `/integrations`
Third-party integration tests:
- Google integrations (Calendar, Speech, Mappings)
- Twilio (SMS/MMS, webhooks)
- Circles integration
- Enrichment flow tests

## Usage

These files are standalone HTML/JS files that can be opened directly in a browser for manual testing. They typically:
- Test specific UI components or features in isolation
- Verify integration with external services
- Debug specific issues or edge cases

To use:
1. Start the development server: `npm run dev`
2. Open the relevant HTML file in your browser
3. Follow any instructions in the file comments

## Note

These are manual test files, not automated tests. For automated testing, see the main test suite in the project root.
