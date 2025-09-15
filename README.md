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

### Easy Installation (Recommended)

```bash
# Clone the repository
git clone https://github.com/yourusername/playwright-cli
cd playwright-cli

# Interactive installation (auto-detects best location)
./install.sh
# - If ~/.local/bin is in PATH: installs there (no sudo)
# - Otherwise: asks if you want system-wide (/usr/local/bin with sudo) 
#   or user-local (add to PATH manually)

# Force user directory installation (no sudo, may need PATH setup)
PLAYWRIGHT_SYSTEM_INSTALL=false ./install.sh

# Force system-wide installation (requires sudo, works immediately)
PLAYWRIGHT_SYSTEM_INSTALL=true ./install.sh
```

**Important:** For the `playwright` command to work, the binary must be in your PATH. The installer will guide you if PATH setup is needed.

### Manual Installation

```bash
# Install dependencies (with pnpm, npm, or bun)
pnpm install  # Recommended
# or: npm install
# or: bun install

# Build the binary
pnpm run build
# or: npm run build

# Install Playwright browsers (optional, for managed browsers)
pnpm exec playwright install chromium
# or: npx playwright install chromium
```

### Windows Installation

```powershell
# Run PowerShell as Administrator (optional, for system-wide install)
# Clone the repository
git clone https://github.com/yourusername/playwright-cli
cd playwright-cli

# Run the installer
powershell -ExecutionPolicy Bypass -File install.ps1
```

### Uninstallation

#### macOS/Linux
```bash
# Remove from all installation paths (user and system)
./uninstall.sh
```

#### Windows
```powershell
# Remove from all installation paths
powershell -ExecutionPolicy Bypass -File uninstall.ps1
```

The uninstall scripts will:
- Stop any running playwright processes
- Remove binaries from installation directories
- Clean up CLAUDE.md entries if present
- Remove temporary files and state

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
