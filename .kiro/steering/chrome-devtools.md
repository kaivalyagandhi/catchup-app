---
inclusion: manual
---

# Chrome DevTools MCP Usage Guide

## Overview

The Chrome DevTools MCP server allows direct interaction with a running browser instance via Chrome DevTools Protocol (CDP). Use this for debugging, inspecting elements, reading console output, and testing the app in your actual browser session.

## Setup

### Enable Remote Debugging

Start your browser with the debugging port exposed:

```bash
# macOS - Chrome
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222

# macOS - Chromium
/Applications/Chromium.app/Contents/MacOS/Chromium --remote-debugging-port=9222

# Linux
google-chrome --remote-debugging-port=9222

# Windows
"C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222
```

Once running, the DevTools MCP will automatically connect to `localhost:9222`.

## Common Tasks

### Read Console Output

When debugging issues, use Chrome DevTools to capture console logs, errors, and warnings:

```
Use: mcp_chrome_devtools_list_console_messages
- Filters available: log, error, warning, info, debug
- Returns messages with timestamps and context
```

### Take Screenshots

Capture the current page or specific elements:

```
Use: mcp_chrome_devtools_take_screenshot
- Full page: fullPage=true
- Specific element: uid from snapshot
- Formats: png, jpeg, webp
```

### Inspect Page Structure

Get the accessibility tree snapshot to understand page layout and find elements:

```
Use: mcp_chrome_devtools_take_snapshot
- Returns all elements with unique identifiers (uid)
- Use uids to interact with specific elements
```

### Interact with Elements

- **Click**: mcp_chrome_devtools_click
- **Fill input**: mcp_chrome_devtools_fill
- **Hover**: mcp_chrome_devtools_hover
- **Type text**: mcp_chrome_devtools_press_key
- **Drag**: mcp_chrome_devtools_drag

### Check Network Activity

Monitor API calls and network requests:

```
Use: mcp_chrome_devtools_list_network_requests
- Filter by resource type (xhr, fetch, document, etc.)
- Get request/response details with mcp_chrome_devtools_get_network_request
```

### Execute JavaScript

Run arbitrary JavaScript in the browser context:

```
Use: mcp_chrome_devtools_evaluate_script
- Access DOM, window object, and page state
- Returns JSON-serializable results
```

## When to Use Chrome DevTools vs Playwright

| Task | Tool |
|------|------|
| Debug existing browser session | Chrome DevTools MCP |
| Read console logs from running app | Chrome DevTools MCP |
| Inspect elements on current page | Chrome DevTools MCP |
| Test UI interactions manually | Chrome DevTools MCP |
| Automated testing/scripting | Playwright MCP |
| Create new browser instance | Playwright MCP |
| Record test scenarios | Playwright MCP |

## Workflow

1. Start your app: `npm run dev`
2. Start browser with debugging: `chrome --remote-debugging-port=9222`
3. Navigate to your app in the browser
4. Ask me to debug/inspect/test something
5. I'll use Chrome DevTools MCP to interact with your actual session

## Tips

- Always take a snapshot first to get element uids before interacting
- Use console message filtering to find specific errors
- Network requests help identify API issues
- JavaScript evaluation is useful for checking page state
- Screenshots are helpful for visual verification

## Troubleshooting

### "Cannot connect to browser"
- Ensure browser is running with `--remote-debugging-port=9222`
- Check that port 9222 is not blocked
- Verify browser is still running

### "Element not found"
- Take a fresh snapshot, page may have changed
- Element might be in an iframe (use different selectors)
- Wait for page to fully load before interacting

### "Console messages empty"
- Messages are cleared on navigation
- Check message types (log, error, warning, etc.)
- Use `includePreservedMessages: true` to see older messages
