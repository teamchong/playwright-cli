# Playwright CLI - Claude Instructions

When users ask about browser automation, web scraping, or testing web applications, you can use the `playwright` CLI tool.

## Core Capabilities

The Playwright CLI provides direct browser control through Chrome DevTools Protocol (CDP). It automatically launches Chrome with debugging enabled if not already running.

## Command Usage Patterns

### Installation & Setup
```bash
playwright install           # Install Playwright browsers (chromium, firefox, webkit)
playwright install chromium  # Install only Chromium browser
playwright close             # Close browser connection
```

### Starting a Browser Session
```bash
playwright open              # Smart open - launches Chrome or connects if running
playwright open <url>        # Open browser and navigate to URL
playwright open --port 9222  # Use specific debugging port
playwright open -n <url>     # Always open URL in a new tab
playwright open --new-tab <url>  # Same as -n
```

### Navigation
```bash
playwright navigate <url>              # Navigate to a URL
playwright back                        # Go back in browser history
playwright forward                     # Go forward in browser history (TODO: implement)
```

### Interaction
```bash
playwright click <selector>            # Click on an element
playwright type <selector> <text>      # Type text into an input
playwright press <key>                 # Press a keyboard key (e.g., Enter, Escape)
playwright fill <fields...>            # Fill multiple form fields (selector=value pairs)
playwright select <selector> <values> # Select dropdown option(s)
playwright hover <selector>            # Hover over an element
playwright drag <source> <target>      # Drag from source to target element
playwright upload <selector> <files>   # Upload file(s) to a file input
playwright wait [selector]             # Wait for element or timeout
```

### Capture & Analysis
```bash
playwright screenshot [path]           # Capture screenshot
playwright pdf [path]                  # Save page as PDF
playwright snapshot                    # Get accessibility tree snapshot
```

### Advanced Operations
```bash
playwright eval <code>                 # Execute JavaScript in browser context
playwright exec <file>                 # Execute JavaScript file in browser
playwright console                     # Monitor console output
playwright network                     # Monitor network requests
playwright dialog <accept|dismiss>     # Handle browser dialogs
playwright list                        # List open pages and contexts
playwright codegen [url]               # Generate Playwright test code interactively
playwright test [spec]                 # Run Playwright tests
```

### Window Management
```bash
playwright tabs [action]               # Manage tabs (list, new, close, select)
playwright resize <width> <height>     # Resize browser window
```

### Session Management
```bash
playwright session save <name>         # Save current browser state
playwright session load <name>         # Restore saved session
playwright session list                # Show saved sessions
```

## Best Practices

1. **Use smart open**: The `open` command automatically connects or launches as needed
2. **Use --new-tab**: When opening multiple URLs, use `-n` flag to keep them in separate tabs
3. **Use specific selectors**: Prefer ID and class selectors over complex XPath
4. **Wait for elements**: Use `playwright wait` before interacting with dynamic content
5. **Save sessions**: For repetitive tasks, save and reuse sessions

## Common Workflows

### Web Scraping
```bash
playwright open "https://example.com"
playwright wait ".content"
playwright snapshot                    # Get page structure
playwright eval "document.querySelector('.data').innerText"
playwright screenshot output.png
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

### Advanced Interaction
```bash
playwright open "https://app.example.com"
playwright hover ".menu-trigger"       # Hover to show menu
playwright drag ".item" ".drop-zone"   # Drag and drop
playwright press "Escape"              # Press keyboard key
playwright upload "#file-input" document.pdf report.xlsx
```

### PDF Generation
```bash
playwright open "https://report.example.com"
playwright wait ".report-ready"
playwright resize 1200 800             # Set specific viewport
playwright pdf report.pdf
```

### Network Monitoring
```bash
playwright open "https://api.example.com"
playwright network                     # Start monitoring
# Perform actions...
# Press Ctrl+C to stop monitoring
```

### Tab Management
```bash
playwright tabs list                   # List all open tabs
playwright tabs new --url "https://example.com"
playwright tabs select --index 2       # Switch to tab 2
playwright tabs close --index 0        # Close first tab
```

### Test Generation & Execution
```bash
playwright codegen                     # Start recording interactions
playwright codegen "https://example.com"  # Start recording from URL
playwright test                        # Run all tests
playwright test tests/login.spec.ts    # Run specific test file
playwright test --ui                   # Open test UI mode
playwright test --debug                # Run tests in debug mode
```

### JavaScript Execution
```bash
playwright eval "document.title"       # Execute inline JavaScript
playwright eval "Array.from(document.querySelectorAll('a')).map(a => a.href)"
playwright exec script.js              # Execute JavaScript file
echo "console.log(location.href)" | playwright exec  # Execute from stdin
```

## Writing Complex Automation Scripts

Claude Code can write JavaScript files that use the Playwright CLI's execution context. These scripts have access to:
- `page` - Current page object
- `context` - Browser context for creating new pages/tabs
- `browser` - Browser instance

### Example: Multi-Page Automation Script
```javascript
// Save as /tmp/automation.js and run with: playwright exec /tmp/automation.js
async function automateMultipleSites() {
  // Work with current page
  await page.goto('https://example.com');
  await page.fill('#search', 'query');
  await page.click('button[type="submit"]');
  
  // Create new tabs
  const newPage = await context.newPage();
  await newPage.goto('https://another-site.com');
  
  // Extract and return data
  const data = await page.evaluate(() => {
    return document.querySelector('.results')?.textContent;
  });
  
  console.log('Results:', data);
  return data;
}

automateMultipleSites();
```

### Example: Data Extraction Script
```javascript
// Save as /tmp/scraper.js
async function scrapeData() {
  const results = [];
  
  for (let i = 1; i <= 5; i++) {
    await page.goto(`https://example.com/page/${i}`);
    
    const pageData = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.item')).map(el => ({
        title: el.querySelector('.title')?.textContent,
        price: el.querySelector('.price')?.textContent
      }));
    });
    
    results.push(...pageData);
  }
  
  // Save results
  require('fs').writeFileSync('/tmp/data.json', JSON.stringify(results));
  console.log(`Scraped ${results.length} items`);
  return results;
}

scrapeData();
```

### Execution Pattern
1. Claude Code writes the script to `/tmp/script.js`
2. Execute with: `playwright exec /tmp/script.js`
3. Script has full access to Playwright API
4. Results are returned to stdout

## Error Handling

- If Chrome is not installed, suggest: `playwright install chromium`
- If connection fails, check if another Chrome instance is using the debugging port
- For selector not found errors, suggest using `playwright list` to inspect page structure

## Expected Output Examples

### Successful Commands
```bash
$ playwright open https://example.com
✅ Connected to Chrome at localhost:9222
🌐 Navigated to: https://example.com

$ playwright click "button.submit"
✅ Clicked element: button.submit

$ playwright screenshot
📸 Screenshot saved: screenshot-2024-01-15-143022.png

$ playwright eval "document.title"
📊 Result: "Example Domain"
```

### Error Outputs
```bash
$ playwright click ".nonexistent"
❌ Element not found: .nonexistent

$ playwright open
❌ Failed to connect to Chrome
💡 Try: playwright install chromium
```

## Integration Notes

- The CLI maintains a persistent browser connection across commands
- Sessions persist browser state including cookies and localStorage
- Screenshots default to PNG format in the current directory
- JavaScript evaluation returns results as formatted output
- All commands exit cleanly after completion (exit code 0 on success, 1 on error)

## When NOT to Use

- For simple HTTP requests, use curl or fetch instead
- For API testing, use dedicated API testing tools
- For unit testing JavaScript, use test frameworks directly

## Troubleshooting

If browser doesn't launch:
1. Check if Chrome/Chromium is installed
2. Try `playwright install chromium` to install Playwright's browser
3. Verify no other process is using port 9222
4. Try with explicit port: `playwright open --port 9223`