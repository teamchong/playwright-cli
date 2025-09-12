import { readFileSync } from 'fs';
import { join } from 'path';

import { Command } from 'commander';

import { logger } from '../lib/logger';

// Fallback if file not found
const CLAUDE_INSTRUCTIONS_FALLBACK = `# Playwright CLI - Claude Instructions

When users ask about browser automation, web scraping, or testing web applications, you can use the \`playwright\` CLI tool.

## Core Capabilities

The Playwright CLI provides direct browser control through Chrome DevTools Protocol (CDP). It automatically launches Chrome with debugging enabled if not already running.

## Command Usage Patterns

### Starting a Browser Session
\`\`\`bash
playwright connect           # Auto-launches Chrome if not running
playwright connect --port 9222  # Connect to specific debugging port
\`\`\`

### Navigation and Interaction
\`\`\`bash
playwright navigate <url>              # Navigate to a URL
playwright click <selector>            # Click on an element
playwright type <selector> <text>      # Type text into an input
playwright wait [selector]             # Wait for element or timeout
playwright screenshot [path]           # Capture screenshot
\`\`\`

### Advanced Operations
\`\`\`bash
playwright eval <code>                 # Execute JavaScript in browser context
playwright console                     # Monitor console output
playwright list                        # List open pages and contexts
playwright pdf [path]                  # Save page as PDF
\`\`\`

### Session Management
\`\`\`bash
playwright session save <name>         # Save current browser state
playwright session load <name>         # Restore saved session
playwright session list                # Show saved sessions
\`\`\`

## Best Practices

1. **Always connect first**: Before any browser operation, ensure connection with \`playwright connect\`
2. **Use specific selectors**: Prefer ID and class selectors over complex XPath
3. **Wait for elements**: Use \`playwright wait\` before interacting with dynamic content
4. **Save sessions**: For repetitive tasks, save and reuse sessions

## Common Workflows

### Web Scraping
\`\`\`bash
playwright connect
playwright navigate "https://example.com"
playwright wait ".content"
playwright eval "document.querySelector('.data').innerText"
playwright screenshot output.png
\`\`\`

### Form Automation
\`\`\`bash
playwright connect
playwright navigate "https://form.example.com"
playwright type "#email" "user@example.com"
playwright type "#password" "secret"
playwright click "button[type='submit']"
playwright wait ".success"
\`\`\`

### PDF Generation
\`\`\`bash
playwright connect
playwright navigate "https://report.example.com"
playwright wait ".report-ready"
playwright pdf report.pdf
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
4. Try with explicit port: \`playwright connect --port 9223\``;

export const claudeCommand = new Command('claude-instructions')
  .alias('claude')
  .description('Output Claude-specific usage instructions')
  .action(() => {
    try {
      // Try to read CLAUDE_INSTRUCTIONS.md from the repo
      const instructionsPath = join(process.cwd(), 'CLAUDE_INSTRUCTIONS.md');
      const instructions = readFileSync(instructionsPath, 'utf-8');
      logger.info(instructions);
    } catch {
      // Fallback to embedded instructions
      logger.info(CLAUDE_INSTRUCTIONS_FALLBACK);
    }
  });
