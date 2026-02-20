---
inclusion: manual
---

# Chrome DevTools MCP (Disabled)

Currently disabled in `.kiro/settings/mcp.json`.

## Re-enable
1. Set `"disabled": false` in `.kiro/settings/mcp.json`
2. Start Chrome: `chrome --remote-debugging-port=9222`
3. Run `npm run dev` and navigate to app

## Key Tools
`take_snapshot`, `click`, `fill`, `hover`, `press_key`, `list_console_messages`, `list_network_requests`, `take_screenshot`, `evaluate_script`, `navigate_page`

Always take snapshot first to get element UIDs before interacting.
