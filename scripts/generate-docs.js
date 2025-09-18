#!/usr/bin/env node

/**
 * Generate documentation from CLI help output
 * This ensures docs always match the actual implementation
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Get the main help output
function getHelpOutput(command = '') {
  try {
    const cmd = `./playwright ${command} --help 2>&1`;
    return execSync(cmd, { encoding: 'utf8' });
  } catch (e) {
    // --help exits with code 1, but still provides output
    return e.stdout || '';
  }
}

// Parse commands from help output
function parseCommands(helpText) {
  const commands = [];
  const commandRegex = /^\s+playwright\s+(\S+.*?)\s{2,}(.+?)(?:\s+\[aliases:.*?\])?$/gm;
  let match;
  
  while ((match = commandRegex.exec(helpText)) !== null) {
    commands.push({
      usage: match[1].trim(),
      description: match[2].trim()
    });
  }
  
  return commands;
}

// Group commands by category
function categorizeCommands(commands) {
  const categories = {
    'Installation & Setup': ['install', 'close'],
    'Starting a Browser Session': ['open'],
    'Navigation': ['navigate', 'back', 'forward'],
    'Interaction': ['click', 'hover', 'type', 'fill', 'select', 'drag', 'press', 'upload', 'wait'],
    'Capture & Analysis': ['screenshot', 'pdf', 'snapshot'],
    'Advanced Operations': ['eval', 'exec', 'console', 'network', 'dialog', 'list', 'codegen', 'test', 'perf'],
    'Window Management': ['tabs', 'resize'],
    'Session Management': ['session']
  };
  
  const grouped = {};
  
  for (const [category, keywords] of Object.entries(categories)) {
    grouped[category] = commands.filter(cmd => {
      const cmdName = cmd.usage.split(/\s+/)[0];
      return keywords.some(kw => cmdName.includes(kw));
    });
  }
  
  return grouped;
}

// Generate markdown documentation
function generateMarkdown() {
  const helpText = getHelpOutput();
  const commands = parseCommands(helpText);
  const categorized = categorizeCommands(commands);
  
  let markdown = `# Playwright CLI - Claude Instructions

When users ask about browser automation, web scraping, or testing web applications, you can use the \`playwright\` CLI tool.

## Core Capabilities

The Playwright CLI provides direct browser control through Chrome DevTools Protocol (CDP). It automatically launches Chrome with debugging enabled if not already running.

## Command Usage Patterns

`;

  for (const [category, cmds] of Object.entries(categorized)) {
    if (cmds.length === 0) continue;
    
    markdown += `### ${category}
\`\`\`bash
`;
    
    for (const cmd of cmds) {
      // Format command for documentation
      const formattedCmd = `playwright ${cmd.usage}`;
      const padding = ' '.repeat(Math.max(1, 45 - formattedCmd.length));
      markdown += `${formattedCmd}${padding}# ${cmd.description}\n`;
    }
    
    markdown += `\`\`\`

`;
  }
  
  // Add static sections that don't change
  markdown += `## Best Practices

1. **Use smart open**: The \`open\` command automatically connects or launches as needed
2. **Use -n or --newTab**: When opening multiple URLs to keep them in separate tabs
3. **Use specific selectors**: Prefer ID and class selectors over complex XPath
4. **Wait for elements**: Use \`playwright wait\` before interacting with dynamic content
5. **Save sessions**: For repetitive tasks, save and reuse sessions

## Common Workflows

### Web Scraping
\`\`\`bash
playwright open "https://example.com"  # Or: playwright navigate "https://example.com"
playwright wait ".content"
playwright snapshot                    # Get page structure
playwright eval "document.querySelector('.data').innerText"
playwright screenshot output.png       # Screenshots the current page
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

### Note on Documentation

This documentation is auto-generated from the CLI help output.
To regenerate: \`npm run generate-docs\` or \`node scripts/generate-docs.js\`
`;
  
  return markdown;
}

// Check specific command options
function getCommandOptions(command) {
  const help = getHelpOutput(command);
  const options = [];
  const optionRegex = /^\s+-(\w),?\s+--(\S+)\s+(.+?)(?:\s+\[.+?\])?$/gm;
  let match;
  
  while ((match = optionRegex.exec(help)) !== null) {
    options.push({
      short: match[1],
      long: match[2],
      description: match[3].trim()
    });
  }
  
  return options;
}

// Main execution
function main() {
  const markdown = generateMarkdown();
  const outputPath = path.join(__dirname, '..', 'CLAUDE.md');
  
  fs.writeFileSync(outputPath, markdown);
  console.log(`✅ Documentation generated: ${outputPath}`);
  
  // Also generate a detailed version
  const detailedPath = path.join(__dirname, '..', 'CLAUDE_INSTRUCTIONS.md');
  
  // For detailed version, include examples and more info
  let detailed = markdown;
  
  // Add examples for complex commands
  detailed += `
## Detailed Command Examples

### Screenshot Options
\`\`\`bash
playwright screenshot --full-page output.png    # Capture full scrollable page
playwright screenshot --selector ".content"     # Capture specific element
playwright screenshot --tab-index 0            # Screenshot specific tab
\`\`\`

### JavaScript Execution
\`\`\`bash
playwright eval "document.title"               # Get page title
playwright eval "Array.from(document.querySelectorAll('a')).map(a => a.href)"
playwright exec /tmp/script.js                 # Execute file
echo "console.log(location.href)" | playwright exec  # Execute from stdin
\`\`\`

## Error Handling

- If Chrome is not installed, run: \`playwright install chromium\`
- If connection fails, check if another Chrome instance is using the debugging port
- For selector not found errors, use \`playwright list\` to inspect page structure

## Integration Notes

- The CLI maintains a persistent browser connection across commands
- Sessions persist browser state including cookies and localStorage
- Screenshots default to PNG format in the current directory
- JavaScript evaluation returns results as formatted output
`;
  
  fs.writeFileSync(detailedPath, detailed);
  console.log(`✅ Detailed documentation generated: ${detailedPath}`);
}

main();