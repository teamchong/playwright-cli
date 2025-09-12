# Playwright CLI

[![CI Pipeline](https://github.com/yourusername/playwright-cli/actions/workflows/ci.yml/badge.svg)](https://github.com/yourusername/playwright-cli/actions/workflows/ci.yml)
[![Coverage](https://codecov.io/gh/yourusername/playwright-cli/branch/main/graph/badge.svg)](https://codecov.io/gh/yourusername/playwright-cli)
[![Release](https://github.com/yourusername/playwright-cli/actions/workflows/release.yml/badge.svg)](https://github.com/yourusername/playwright-cli/actions/workflows/release.yml)
[![semantic-release: angular](https://img.shields.io/badge/semantic--release-angular-e10079?logo=semantic-release)](https://github.com/semantic-release/semantic-release)

A powerful command-line interface for Playwright browser automation. Connect to existing Chrome instances or launch new ones, all from your terminal.

## Features

- 🔌 **Connect to existing Chrome** with debugging enabled
- 🚀 **Auto-launch Chrome** if not running
- 🎭 **Full Playwright API** via simple commands
- 💾 **Session persistence** - reconnect to previous sessions
- 🎯 **Smart detection** - automatically finds and connects to browsers

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/playwright-cli
cd playwright-cli

# Install dependencies (with pnpm, npm, or bun)
pnpm install  # Recommended
# or: npm install
# or: bun install

# Install Playwright browsers (optional, for managed browsers)
pnpm exec playwright install chromium
# or: npx playwright install chromium

# Create global symlink (optional)
bun link
```

## Usage

### Quick Start

```bash
# Connect to Chrome (auto-launches if not running)
playwright connect

# Start a Playwright-managed browser
playwright start

# Navigate to a URL
playwright navigate https://google.com

# Take a screenshot
playwright screenshot output.png

# Execute JavaScript
playwright eval "document.title"

# Click an element
playwright click "button.submit"

# Type text
playwright type "input[name=search]" "Hello World"
```

### Browser Management

```bash
# Connect to existing Chrome on custom port
playwright connect --port 9222

# Launch new browser instance
playwright launch --headless

# Start Playwright browser with debugging
playwright start --port 9223

# List open pages
playwright list

# Close browser
playwright close
```

### Advanced Features

```bash
# Monitor console output
playwright console

# Wait for element
playwright wait "div.loaded"

# Save as PDF
playwright pdf page.pdf

# Session management
playwright session --info
playwright session --clear
```

## Integration with Claude Code

This CLI can be integrated with Claude Code using hooks. Write code to `/dev/playwright` to execute it in the connected browser:

```javascript
// In Claude Code, write to /dev/playwright/script.js
await page.goto('https://example.com')
const title = await page.title()
console.log(title)
```

## Architecture

- **TypeScript + Bun** for fast execution
- **Commander.js** for CLI structure
- **Playwright** for browser automation
- **Session persistence** for reconnection
- **Auto-detection** of Chrome instances

## Commands

| Command                  | Description                               |
| ------------------------ | ----------------------------------------- |
| `connect`                | Connect to Chrome (auto-launch if needed) |
| `start`                  | Start Playwright-managed browser          |
| `launch`                 | Launch new browser instance               |
| `navigate <url>`         | Navigate to URL                           |
| `click <selector>`       | Click element                             |
| `type <selector> <text>` | Type text                                 |
| `screenshot [path]`      | Take screenshot                           |
| `eval <code>`            | Execute JavaScript                        |
| `console`                | Monitor console output                    |
| `wait [selector]`        | Wait for element/timeout                  |
| `pdf [path]`             | Save as PDF                               |
| `list`                   | List open pages                           |
| `close`                  | Close browser                             |
| `session`                | Manage sessions                           |
| `install`                | Install browser binaries                  |
| `codegen`                | Open Playwright codegen                   |
| `test`                   | Run Playwright tests                      |

## Development

```bash
# Run in development mode
bun run dev

# Build standalone executable
bun build src/index.ts --compile --outfile playwright-cli

# Run tests
bun test
```

## License

MIT
