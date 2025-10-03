# Playwright CLI - Claude Instructions

When users ask about browser automation, web scraping, or testing web applications, you can use the `pw` CLI tool.

## Core Capabilities

The Playwright CLI provides direct browser control through Chrome DevTools Protocol (CDP). It automatically launches Chrome with debugging enabled if not already running.

## Command Usage Patterns

### Installation & Setup
```bash
pw install           # Install Playwright browsers (chromium, firefox, webkit)
pw install chromium  # Install only Chromium browser
pw close             # Close browser connection
```

### Starting a Browser Session
```bash
pw open              # Smart open - launches Chrome or connects if running
pw open <url>        # Open browser and navigate to URL
pw open --port 9222  # Use specific debugging port
pw open -n <url>     # Always open URL in a new tab
pw open --new-tab <url>  # Same as -n
```

### Navigation
```bash
pw navigate <url>              # Navigate to a URL
pw back                        # Go back in browser history
pw forward                     # Go forward in browser history (TODO: implement)
```

### Interaction
```bash
pw click <selector>            # Click on an element
pw type <selector> <text>      # Type text into an input
pw press <key>                 # Press a keyboard key (e.g., Enter, Escape)
pw fill <fields...>            # Fill multiple form fields (selector=value pairs)
pw select <selector> <values> # Select dropdown option(s)
pw hover <selector>            # Hover over an element
pw drag <source> <target>      # Drag from source to target element
pw upload <selector> <files>   # Upload file(s) to a file input
pw wait [selector]             # Wait for element or timeout
```

### Capture & Analysis
```bash
pw screenshot [path]           # Capture screenshot
pw pdf [path]                  # Save page as PDF
pw snapshot                    # Get accessibility tree snapshot
```

### Advanced Operations
```bash
pw eval <code>                 # Execute JavaScript in browser context
pw exec <file>                 # Execute JavaScript file in browser
pw console                     # Monitor console output
pw network                     # Monitor network requests
pw dialog <accept|dismiss>     # Handle browser dialogs
pw list                        # List open pages and contexts
pw codegen [url]               # Generate Playwright test code interactively
pw test [spec]                 # Run Playwright tests
```

### Window Management
```bash
pw tabs [action]               # Manage tabs (list, new, close, select)
pw resize <width> <height>     # Resize browser window
```

### Session Management
```bash
pw session save <name>         # Save current browser state
pw session load <name>         # Restore saved session
pw session list                # Show saved sessions
```

## Best Practices

1. **Use smart open**: The `open` command automatically connects or launches as needed
2. **Use --new-tab**: When opening multiple URLs, use `-n` flag to keep them in separate tabs
3. **Use specific selectors**: Prefer ID and class selectors over complex XPath
4. **Wait for elements**: Use `pw wait` before interacting with dynamic content
5. **Save sessions**: For repetitive tasks, save and reuse sessions

## Common Workflows

### Web Scraping
```bash
pw open "https://example.com"
pw wait ".content"
pw snapshot                    # Get page structure
pw eval "document.querySelector('.data').innerText"
pw screenshot output.png
```

### Form Automation
```bash
pw open "https://form.example.com"
# Fill multiple fields at once
pw fill "#email=user@example.com" "#password=secret" "#name=John Doe"
# Or use individual commands
pw type "#comments" "This is a longer text field"
pw select "#country" "USA"
pw click "button[type='submit']"
pw wait ".success"
```

### Advanced Interaction
```bash
pw open "https://app.example.com"
pw hover ".menu-trigger"       # Hover to show menu
pw drag ".item" ".drop-zone"   # Drag and drop
pw press "Escape"              # Press keyboard key
pw upload "#file-input" document.pdf report.xlsx
```

### PDF Generation
```bash
pw open "https://report.example.com"
pw wait ".report-ready"
pw resize 1200 800             # Set specific viewport
pw pdf report.pdf
```

### Network Monitoring
```bash
pw open "https://api.example.com"
pw network                     # Start monitoring
# Perform actions...
# Press Ctrl+C to stop monitoring
```

### Tab Management
```bash
pw tabs list                   # List all open tabs
pw tabs new --url "https://example.com"
pw tabs select --index 2       # Switch to tab 2
pw tabs close --index 0        # Close first tab
```

### Test Generation & Execution
```bash
pw codegen                     # Start recording interactions
pw codegen "https://example.com"  # Start recording from URL
pw test                        # Run all tests
pw test tests/login.spec.ts    # Run specific test file
pw test --ui                   # Open test UI mode
pw test --debug                # Run tests in debug mode
```

### JavaScript Execution
```bash
pw eval "document.title"       # Execute inline JavaScript
pw eval "Array.from(document.querySelectorAll('a')).map(a => a.href)"
pw exec script.js              # Execute JavaScript file
echo "console.log(location.href)" | pw exec  # Execute from stdin
```

## Writing Complex Automation Scripts

Claude Code can write JavaScript files that use the Playwright CLI's execution context. These scripts have access to:
- `page` - Current page object
- `context` - Browser context for creating new pages/tabs
- `browser` - Browser instance

### Example: Multi-Page Automation Script
```javascript
// Save as /tmp/automation.js and run with: pw exec /tmp/automation.js
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
2. Execute with: `pw exec /tmp/script.js`
3. Script has full access to Playwright API
4. Results are returned to stdout

## Error Handling

- If Chrome is not installed, suggest: `pw install chromium`
- If connection fails, check if another Chrome instance is using the debugging port
- For selector not found errors, suggest using `pw list` to inspect page structure

## Expected Output Examples

### Successful Commands
```bash
$ pw open https://example.com
✅ Connected to Chrome at localhost:9222
🌐 Navigated to: https://example.com

$ pw click "button.submit"
✅ Clicked element: button.submit

$ pw screenshot
📸 Screenshot saved: screenshot-2024-01-15-143022.png

$ pw eval "document.title"
📊 Result: "Example Domain"
```

### Error Outputs
```bash
$ pw click ".nonexistent"
❌ Element not found: .nonexistent

$ pw open
❌ Failed to connect to Chrome
💡 Try: pw install chromium
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
2. Try `pw install chromium` to install Playwright's browser
3. Verify no other process is using port 9222
4. Try with explicit port: `pw open --port 9223`