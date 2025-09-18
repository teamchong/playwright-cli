# Playwright CLI - Claude Instructions

When users ask about browser automation, web scraping, or testing web applications, you can use the `playwright` CLI tool.

## Core Capabilities

The Playwright CLI provides direct browser control through Chrome DevTools Protocol (CDP). It automatically launches Chrome with debugging enabled if not already running.

## Command Usage Patterns

### Installation & Setup
```bash
playwright close                             # Close the browser
playwright install [browser]                 # Install browser binaries
```

### Starting a Browser Session
```bash
playwright open [url]                        # Open browser (connects if running,
```

### Navigation
```bash
playwright navigate <url>                    # Navigate to a URL
playwright back                              # Navigate back in browser history
```

### Interaction
```bash
playwright wait [selector]                   # Wait for element or timeout
playwright click <selector>                  # Click on an element
playwright hover <selector>                  # Hover over an element
playwright type <selector> <text>            # Type text into an element
playwright fill <fields...>                  # Fill form fields with values
playwright select <selector> <values...>     # Select option(s) in a dropdown
playwright drag <selector> <target>          # Drag from source to target element
playwright press <key>                       # Press a keyboard key
playwright upload <selector> <files...>      # Upload file(s) to a file input
```

### Capture & Analysis
```bash
playwright screenshot [path]                 # Take a screenshot
playwright pdf [path]                        # Save page as PDF
playwright snapshot                          # Capture interactive elements from
```

### Advanced Operations
```bash
playwright list                              # List open pages and contexts
playwright eval <expression>                 # Execute JavaScript in the browser
playwright exec [file]                       # Execute JavaScript/TypeScript file
playwright console                           # Capture browser console output
playwright network                           # Monitor network requests
playwright dialog <action>                   # Handle browser dialogs (alert,
playwright perf                              # View performance statistics and
playwright codegen [url]                     # Open Playwright code generator
playwright test [spec]                       # Run Playwright tests
```

### Window Management
```bash
playwright tabs [action]                     # Manage browser tabs
playwright resize <width> <height>           # Resize browser window
```

### Session Management
```bash
playwright session <action>                  # Manage browser sessions
```

## Best Practices

1. **Use smart open**: The `open` command automatically connects or launches as needed
2. **Use -n or --newTab**: When opening multiple URLs to keep them in separate tabs
3. **Use specific selectors**: Prefer ID and class selectors over complex XPath
4. **Wait for elements**: Use `playwright wait` before interacting with dynamic content
5. **Save sessions**: For repetitive tasks, save and reuse sessions

## Common Workflows

### Web Scraping
```bash
playwright open "https://example.com"  # Or: playwright navigate "https://example.com"
playwright wait ".content"
playwright snapshot                    # Get page structure
playwright eval "document.querySelector('.data').innerText"
playwright screenshot output.png       # Screenshots the current page
```

### Form Automation
```bash
playwright open "https://form.example.com"
# Fill multiple fields at once
playwright fill "#email=user@example.com" "#password=secret" "#name=John Doe"
# Or use individual commands
playwright type "#comments" "This is a longer text field"
playwright select "#country" "USA"
playwright click "button[type='submit']"
playwright wait ".success"
```

### Note on Documentation

This documentation is auto-generated from the CLI help output.
To regenerate: `npm run generate-docs` or `node scripts/generate-docs.js`

## Detailed Command Examples

### Screenshot Options
```bash
playwright screenshot --full-page output.png    # Capture full scrollable page
playwright screenshot --selector ".content"     # Capture specific element
playwright screenshot --tab-index 0            # Screenshot specific tab
```

### JavaScript Execution
```bash
playwright eval "document.title"               # Get page title
playwright eval "Array.from(document.querySelectorAll('a')).map(a => a.href)"
playwright exec /tmp/script.js                 # Execute file
echo "console.log(location.href)" | playwright exec  # Execute from stdin
```

## Error Handling

- If Chrome is not installed, run: `playwright install chromium`
- If connection fails, check if another Chrome instance is using the debugging port
- For selector not found errors, use `playwright list` to inspect page structure

## Integration Notes

- The CLI maintains a persistent browser connection across commands
- Sessions persist browser state including cookies and localStorage
- Screenshots default to PNG format in the current directory
- JavaScript evaluation returns results as formatted output
