# Playwright CLI

[![CI Pipeline](https://github.com/yourusername/playwright-cli/actions/workflows/ci.yml/badge.svg)](https://github.com/yourusername/playwright-cli/actions/workflows/ci.yml)
[![Coverage](https://codecov.io/gh/yourusername/playwright-cli/branch/main/graph/badge.svg)](https://codecov.io/gh/yourusername/playwright-cli)
[![Release](https://github.com/yourusername/playwright-cli/actions/workflows/release.yml/badge.svg)](https://github.com/yourusername/playwright-cli/actions/workflows/release.yml)
[![semantic-release: angular](https://img.shields.io/badge/semantic--release-angular-e10079?logo=semantic-release)](https://github.com/semantic-release/semantic-release)

A powerful command-line interface for Playwright browser automation. Control Chrome/Chromium browsers directly from your terminal with simple commands.

## Features

- 🔌 **Connect to existing Chrome** with debugging enabled or auto-launch new instances
- 🎭 **Full Playwright API** via simple CLI commands
- 🎯 **Smart element targeting** - CSS selectors, text matching, or ref-based targeting
- 📊 **Context awareness** - View page state, forms, and persistent action history across commands
- 🗂️ **Tab management** - Control multiple tabs with `--tab-id` or `--tab-index`
- 💾 **Session persistence** - Save and restore browser sessions
- 🚀 **LLM-friendly** - Designed for AI agents and automation workflows

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

# Build the project
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

## Usage

### Quick Start

```bash
# Open browser and navigate to a URL
playwright open https://google.com

# Navigate to a URL in existing browser
playwright navigate https://example.com

# Take a screenshot
playwright screenshot output.png

# Execute JavaScript
playwright eval "document.title"

# Click an element
playwright click "button.submit"

# Type text
playwright type "#search-input" "Hello World"

# Fill form fields (enhanced syntax)
playwright fill "email=user@example.com" "password=secret123"
```

### Browser & Tab Management

```bash
# Open browser (connects to existing or launches new)
playwright open [url]

# Close browser
playwright close

# List all open tabs
playwright tabs list

# Create new tab
playwright tabs new --url https://example.com

# Close specific tab
playwright tabs close --tab-id ABC123

# Switch to specific tab
playwright tabs select --index 2
```

### Page Navigation

```bash
# Navigate to URL
playwright navigate https://example.com

# Navigate back in history
playwright back

# Wait for element or timeout
playwright wait ".loaded-content" --timeout 5000
```

### Interaction Commands

```bash
# Click element (supports CSS selectors or text matching)
playwright click "Submit"  # Clicks button with text "Submit"
playwright click "#submit-btn"  # CSS selector
playwright click --ref abc123  # Using captured ref

# Type text
playwright type "#input" "text"
playwright type --ref xyz789 "text"  # Using ref

# Fill multiple form fields
playwright fill "username=john" "email=john@example.com" "password=secret"
playwright fill "#name" "John Doe"  # Legacy syntax still supported

# Select dropdown option
playwright select "#country" "USA"

# Hover over element
playwright hover ".menu-item"

# Drag and drop
playwright drag ".draggable" ".drop-zone"

# Press keyboard key
playwright press "Enter"

# Upload files
playwright upload "#file-input" document.pdf photo.jpg
```

### Capture & Analysis

```bash
# Take screenshot
playwright screenshot [filename]
playwright screenshot --full-page  # Full page screenshot

# Save as PDF
playwright pdf output.pdf

# Capture interactive elements snapshot
playwright snapshot  # Shows all interactive elements with refs
playwright snapshot --full  # Include all elements
playwright snapshot --json  # Output as JSON

# Show current page context and state
playwright context  # Shows page info, forms, navigation state, persistent action history
playwright context --verbose  # Include technical details
playwright context --json  # Output as JSON

# Enhanced text-based element selection
playwright click "Submit"  # Click button with text "Submit"
playwright type "Enter your email" "user@example.com"  # Type in input by placeholder
playwright fill "Password=secret123"  # Fill by label text

# List all open pages
playwright list
```

### Advanced Features

```bash
# Execute JavaScript
playwright eval "document.querySelector('.price').innerText"

# Execute JavaScript file
playwright exec script.js
playwright exec --inline "console.log('Hello'); return document.title"

# Monitor console output
playwright console

# Monitor network requests
playwright network

# Handle dialogs
playwright dialog accept  # Accept alert/confirm/prompt
playwright dialog dismiss  # Dismiss dialog

# Performance metrics
playwright perf

# Resize browser window
playwright resize 1920 1080
```

### Session Management

```bash
# Save current session
playwright session save my-session

# Load saved session
playwright session load my-session

# List saved sessions
playwright session list
```

### Tab Targeting

Most interaction commands support tab targeting via:
- `--tab-id <id>` - Target specific tab by ID
- `--tab-index <n>` - Target tab by index (0-based)

```bash
# Examples
playwright click "#button" --tab-id ABC123DEF
playwright type "#input" "text" --tab-index 2
playwright screenshot --tab-id XYZ789
```

## Architecture

- **TypeScript + Yargs** - Type-safe CLI with automatic help generation
- **Playwright Core** - Browser automation engine
- **Chrome DevTools Protocol** - Direct browser control
- **Action History** - Tracks user interactions for context
- **Ref System** - Capture and reuse element references
- **Session Persistence** - Save and restore browser state

## Commands Reference

### Navigation Commands
| Command | Description |
|---------|-------------|
| `open [url]` | Open browser (connects if running, launches if not) |
| `close` | Close the browser |
| `navigate <url>` | Navigate to a URL |
| `back` | Navigate back in browser history |
| `wait [selector]` | Wait for element or timeout |

### Interaction Commands
| Command | Description |
|---------|-------------|
| `click [selector]` | Click on an element |
| `type <selector> <text>` | Type text into an element |
| `fill [fields...]` | Fill form fields with values |
| `select <selector> <values...>` | Select option(s) in a dropdown |
| `hover [selector]` | Hover over an element |
| `drag <selector> <target>` | Drag from source to target |
| `press <key>` | Press a keyboard key |
| `upload <selector> <files...>` | Upload file(s) to input |

### Capture Commands
| Command | Description |
|---------|-------------|
| `screenshot [path]` | Take a screenshot |
| `pdf [path]` | Save page as PDF |
| `snapshot` | Capture interactive elements |
| `list` | List open pages and contexts |
| `context` | Show current page state and history |

### Window Management
| Command | Description |
|---------|-------------|
| `tabs [action]` | Manage browser tabs |
| `resize <width> <height>` | Resize browser window |

### Advanced Commands
| Command | Description |
|---------|-------------|
| `eval <expression>` | Execute JavaScript in browser |
| `exec [file]` | Execute JavaScript file |
| `console` | Monitor console output |
| `network` | Monitor network requests |
| `dialog <action>` | Handle browser dialogs |
| `perf` | View performance stats |

### Utility Commands
| Command | Description |
|---------|-------------|
| `session <action>` | Manage browser sessions |
| `install [browser]` | Install browser binaries |
| `codegen [url]` | Open Playwright code generator |
| `test [spec]` | Run Playwright tests |
| `claude` | Show Claude-specific instructions |

## Development

```bash
# Run in development mode
npm run dev

# Build the project
npm run build

# Run tests
npm test

# Run specific test suite
npm run test:unit
npm run test:integration
npm run test:e2e

# Build standalone executable (requires Bun)
bun build src/index.ts --compile --outfile playwright-cli
```

## Testing

The project includes comprehensive test coverage:
- Unit tests for individual components
- Integration tests for command workflows
- E2E tests for full browser automation scenarios
- Backward compatibility tests

Run tests with:
```bash
npm test           # Run all tests
npm run test:watch # Watch mode
npm run test:ui    # Interactive UI
```

**Note:** Tests run with a visible browser window (not headless) due to limitations with Playwright's CDP connection to headless Chrome. This is a known issue where `connectOverCDP` doesn't work reliably with externally-launched headless Chrome instances.

## License

MIT