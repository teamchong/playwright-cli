import { readFileSync } from 'fs';
import { join } from 'path';
import { CommandModule, Arguments } from 'yargs';
import { logger } from '../../../lib/logger';

// Fallback if file not found
const CLAUDE_INSTRUCTIONS_FALLBACK = `# Playwright CLI - Claude Instructions

When users ask about browser automation, web scraping, or testing web applications, you can use the \`playwright\` CLI tool.

## Core Capabilities

The Playwright CLI provides direct browser control through Chrome DevTools Protocol (CDP). It automatically launches Chrome with debugging enabled if not already running.

## Command Usage Patterns

### Starting a Browser Session
\`\`\`bash
playwright open              # Smart open - launches Chrome or connects if running
playwright open <url>        # Open browser and navigate to URL
playwright open --port 9222  # Use specific debugging port
playwright open -n <url>     # Always open URL in a new tab
playwright open --new-tab <url>  # Same as -n
\`\`\`

### Navigation
\`\`\`bash
playwright navigate <url>              # Navigate to a URL
playwright back                        # Go back in browser history
\`\`\`

### Interaction
\`\`\`bash
playwright click <selector>            # Click on an element
playwright type <selector> <text>      # Type text into an input
playwright press <key>                 # Press a keyboard key (e.g., Enter, Escape)
playwright fill <fields...>            # Fill multiple form fields (selector=value pairs)
playwright select <selector> <values> # Select dropdown option(s)
playwright hover <selector>            # Hover over an element
playwright drag <source> <target>      # Drag from source to target element
playwright upload <selector> <files>   # Upload file(s) to a file input
playwright wait [selector]             # Wait for element or timeout
\`\`\`

### Capture & Analysis
\`\`\`bash
playwright screenshot [path]           # Capture screenshot
playwright pdf [path]                  # Save page as PDF
playwright snapshot                    # Get accessibility tree snapshot
\`\`\`

### Advanced Operations
\`\`\`bash
playwright eval <code>                 # Execute JavaScript in browser context
playwright console                     # Monitor console output
playwright network                     # Monitor network requests
playwright dialog <accept|dismiss>     # Handle browser dialogs
playwright list                        # List open pages and contexts
\`\`\`

### Window Management
\`\`\`bash
playwright tabs [action]               # Manage tabs (list, new, close, select)
playwright resize <width> <height>     # Resize browser window
\`\`\`

### Session Management
\`\`\`bash
playwright session save <name>         # Save current browser state
playwright session load <name>         # Restore saved session
playwright session list                # Show saved sessions
\`\`\`

## Best Practices

1. **Use smart open**: The \`open\` command automatically connects or launches as needed
2. **Use --new-tab**: When opening multiple URLs, use \`-n\` flag to keep them in separate tabs
3. **Use specific selectors**: Prefer ID and class selectors over complex XPath
4. **Wait for elements**: Use \`playwright wait\` before interacting with dynamic content
5. **Save sessions**: For repetitive tasks, save and reuse sessions

## Common Workflows

### Web Scraping
\`\`\`bash
playwright open "https://example.com"
playwright wait ".content"
playwright snapshot                    # Get page structure
playwright eval "document.querySelector('.data').innerText"
playwright screenshot output.png
\`\`\`

### Form Automation
\`\`\`bash
playwright open "https://form.example.com"
# Fill multiple fields at once
playwright fill "#email=user@example.com" "#password=secret" "#name=John Doe"
# Or use individual commands
playwright type "#comments" "This is a longer text field"
playwright select "#country" "USA"
playwright click "button[type='submit']"
playwright wait ".success"
\`\`\`

### Advanced Interaction
\`\`\`bash
playwright open "https://app.example.com"
playwright hover ".menu-trigger"       # Hover to show menu
playwright drag ".item" ".drop-zone"   # Drag and drop
playwright press "Escape"              # Press keyboard key
playwright upload "#file-input" document.pdf report.xlsx
\`\`\`

### PDF Generation
\`\`\`bash
playwright open "https://report.example.com"
playwright wait ".report-ready"
playwright resize 1200 800             # Set specific viewport
playwright pdf report.pdf
\`\`\`

### Network Monitoring
\`\`\`bash
playwright open "https://api.example.com"
playwright network                     # Start monitoring
# Perform actions...
# Press Ctrl+C to stop monitoring
\`\`\`

### Tab Management
\`\`\`bash
playwright tabs list                   # List all open tabs
playwright tabs new --url "https://example.com"
playwright tabs select --index 2       # Switch to tab 2
playwright tabs close --index 0        # Close first tab
\`\`\`

## Error Handling

- If Chrome is not installed, suggest: \`playwright install chromium\`
- If connection fails, check if another Chrome instance is using the debugging port
- For selector not found errors, suggest using \`playwright list\` to inspect page structure

## Integration Notes

- The CLI maintains a persistent browser connection across commands
- Sessions persist browser state including cookies and localStorage
- Screenshots default to PNG format in the current directory
- JavaScript evaluation returns results as formatted output

## When NOT to Use

- For simple HTTP requests, use curl or fetch instead
- For API testing, use dedicated API testing tools
- For unit testing JavaScript, use test frameworks directly

## Troubleshooting

If browser doesn't launch:
1. Check if Chrome/Chromium is installed
2. Try \`playwright install chromium\` to install Playwright's browser
3. Verify no other process is using port 9222
4. Try with explicit port: \`playwright open --port 9223\``;

export const claudeCommand: CommandModule = {
  command: 'claude',
  aliases: ['claude-instructions'],
  describe: 'Output Claude-specific usage instructions',
  
  handler: async (argv) => {
    try {
      // Try to read CLAUDE.md from the repo
      const instructionsPath = join(process.cwd(), 'CLAUDE.md');
      const instructions = readFileSync(instructionsPath, 'utf-8');
      logger.info(instructions);
    } catch {
      // Fallback to embedded instructions
      logger.info(CLAUDE_INSTRUCTIONS_FALLBACK);
    }
  }
};