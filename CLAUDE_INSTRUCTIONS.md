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
playwright click [selector]                  # Click on an element
playwright hover [selector]                  # Hover over an element
playwright type [selector] <text>            # Type text into an element
playwright fill [fields...]                  # Fill form fields with values
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

---

## 🤖 LLM-Friendly Enhancements

This CLI has been enhanced with powerful features specifically designed to make browser automation more accessible and reliable for AI assistants and LLMs.

### Key New Capabilities

1. **🎯 Text-Based Selectors**: Use natural language instead of CSS selectors
2. **📋 Ref-Based Interactions**: Reliable element targeting with snapshot references
3. **📊 Context Awareness**: Comprehensive page state information
4. **⚡ Simplified Scripting**: Easy-to-use JavaScript execution with helper functions
5. **📝 Smart Form Filling**: Multi-field form automation by field names

### Enhanced Commands

#### Text-Based Interactions
```bash
# Use natural language to find elements
playwright click "Submit"                    # Click button by text
playwright click "Login"                     # Click button/link by text
playwright type "Username" "john"            # Type into input by placeholder
playwright type "Email Address" "test@example.com"
playwright hover "Show More"                # Hover over element by text
```

#### Ref-Based Interactions (Most Reliable)
```bash
# 1. First, get snapshot with refs
playwright snapshot
# Output: button "Submit" [ref=abc123]

# 2. Use the ref for reliable targeting
playwright click --ref abc123
playwright type --ref def456 "some text"
playwright fill --ref ghi789 "form value"
playwright hover --ref jkl012
```

#### Smart Form Filling
```bash
# Fill multiple fields by name in one command
playwright fill "email=user@example.com" "password=secret123" "username=john"

# Fill fields by placeholder text
playwright fill "Email Address=test@example.com" "Username=testuser"

# Mix CSS selectors and names
playwright fill "#username=john" "email=john@example.com" "[name=phone]=123-456-7890"
```

#### Enhanced Snapshot & Context
```bash
# Get interactive elements with refs
playwright snapshot                          # Shows clickable elements with [ref=xxx]

# Get detailed form information  
playwright snapshot --detailed               # Shows form structure, required fields, values

# Get comprehensive page state
playwright context                           # Page info, form state, element counts
playwright context --verbose                 # Include viewport, technical details
playwright context --json                    # Machine-readable format
```

#### Simplified Script Execution
```bash
# Execute JavaScript directly without files
playwright exec --inline "console.log(await page.title())"

# Use simplified API for easier scripting
playwright exec --inline "await click('Submit')" --simple
playwright exec --inline "await goto('https://example.com'); await fillForm({'email': 'test@example.com'})" --simple

# Available simplified functions: goto, click, type, fill, select, check, hover,
# text, value, isVisible, count, waitFor, sleep, screenshot, newTab, etc.
```

### LLM-Optimized Workflows

#### 1. Understand Before Acting
```bash
# Always start with context to understand the page
playwright context

# Get detailed structure if forms are present
playwright snapshot --detailed
```

#### 2. Form Automation Workflow
```bash
# Method 1: Use smart form filling
playwright fill "email=user@example.com" "password=secret" "name=John Doe"
playwright click "Register"

# Method 2: Use refs for reliability
playwright snapshot                          # Get refs
playwright fill --ref abc123 "user@example.com"  # Use specific refs
playwright fill --ref def456 "secret123"
playwright click --ref ghi789               # Submit button ref
```

#### 3. Complex Automation with Simplified API
```bash
playwright exec --inline "
  await goto('https://example.com');
  await fillForm({
    'email': 'test@example.com',
    'password': 'secret123',
    'name': 'Test User'
  });
  await clickAndWait('Submit', '.success-message');
  const result = await text('.result');
  log('Result:', result);
  return result;
" --simple --json
```

#### 4. Multi-Step Workflow Example
```bash
# 1. Navigate and understand
playwright open "https://app.example.com"
playwright context                           # Understand current state

# 2. Login
playwright fill "email=admin@example.com" "password=admin123"
playwright click "Login"

# 3. Navigate to form
playwright click "New User"
playwright snapshot --detailed               # See form structure

# 4. Fill complex form using refs
playwright fill --ref abc123 "John Doe"      # Name field
playwright fill --ref def456 "john@example.com"  # Email
playwright select --ref ghi789 "Admin"       # Role dropdown
playwright click --ref jkl012                # Save button

# 5. Verify result
playwright context                           # Check final state
```

### Error Handling & Debugging

#### Enhanced Error Messages
- **Ref not found**: "ref not found: Element with ref=abc123 not found"
- **Text selector failed**: Automatically falls back to CSS selector matching
- **Multiple matches**: Uses first visible element, reports in logs

#### Debugging Tips
```bash
# If element not found by text:
playwright snapshot                          # See what's actually available
playwright context                           # Check if page is fully loaded

# If ref doesn't work:
playwright snapshot                          # Generate fresh refs
playwright snapshot --detailed               # See form field details

# For script errors:
playwright exec --inline "log('Debug info:', await url())" --simple
```

### Best Practices for LLMs

1. **Always start with context**: Run `playwright context` to understand page state
2. **Use snapshot for discovery**: Get refs and understand available interactions
3. **Prefer text over CSS**: Use button text, labels, placeholders when possible
4. **Use refs for reliability**: More reliable than CSS selectors across page changes
5. **Batch form operations**: Use multi-field fill for better performance
6. **Use simplified API**: Easier to write and understand automation scripts
7. **Handle errors gracefully**: Check context if operations fail
8. **Verify results**: Use context or eval to confirm successful operations

### Backward Compatibility

All existing commands and options continue to work exactly as before. These enhancements are additive and don't break any existing functionality.
