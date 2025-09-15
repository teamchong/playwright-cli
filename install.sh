#!/bin/bash

# Playwright CLI Installer
set -e

# Determine installation directory
if [ "${PLAYWRIGHT_SYSTEM_INSTALL:-}" = "true" ]; then
    INSTALL_DIR="/usr/local/bin"
elif [ "${PLAYWRIGHT_SYSTEM_INSTALL:-}" = "false" ]; then
    INSTALL_DIR="$HOME/.local/bin"
else
    # Auto-detect best installation path
    USER_DIR="$HOME/.local/bin"
    SYSTEM_DIR="/usr/local/bin"
    
    echo "🎭 Playwright CLI Installer"
    echo "==========================="
    echo ""
    
    # Check if user dir is in PATH
    if [[ ":$PATH:" == *":$USER_DIR:"* ]]; then
        echo "✅ Found $USER_DIR in PATH - will install there (no sudo needed)"
        INSTALL_DIR="$USER_DIR"
        PLAYWRIGHT_SYSTEM_INSTALL=false
    else
        echo "⚠️  $USER_DIR is not in your PATH"
        echo ""
        echo "Choose installation location:"
        echo "1) $SYSTEM_DIR (requires sudo, but works immediately)"
        echo "2) $USER_DIR (no sudo, but you'll need to add to PATH)"
        echo ""
        read -p "Enter choice (1 or 2): " choice
        
        case $choice in
            1)
                INSTALL_DIR="$SYSTEM_DIR"
                PLAYWRIGHT_SYSTEM_INSTALL=true
                echo "→ Installing to $SYSTEM_DIR (will require sudo)"
                ;;
            2)
                INSTALL_DIR="$USER_DIR"
                PLAYWRIGHT_SYSTEM_INSTALL=false
                echo "→ Installing to $USER_DIR (no sudo needed)"
                ;;
            *)
                echo "Invalid choice, defaulting to user directory"
                INSTALL_DIR="$USER_DIR"
                PLAYWRIGHT_SYSTEM_INSTALL=false
                ;;
        esac
    fi
fi

# Use environment variable if set, otherwise default to ~/.claude
CLAUDE_DIR="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"

if [ -z "${PLAYWRIGHT_SYSTEM_INSTALL:-}" ]; then
    echo ""
fi

echo "🧹 Cleaning up old files..."
# Clean up any old temporary playwright files
if ls /tmp/playwright-*.sock >/dev/null 2>&1; then
    rm -f /tmp/playwright-*.sock
    echo "  ✓ Removed old socket files"
fi

# Clean up old state files
if ls /tmp/playwright-state-*.json >/dev/null 2>&1; then
    rm -f /tmp/playwright-state-*.json
    echo "  ✓ Removed old state files"
fi
echo ""

# Check for Node.js (required for pkg compilation)
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not installed"
    echo ""
    echo "Please install Node.js first"
    exit 1
fi

# Build the binary
echo "🔨 Building playwright CLI..."
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    if command -v pnpm &> /dev/null; then
        pnpm install
    else
        npm install
    fi
    echo "✅ Dependencies installed"
fi

# Build the binary
if command -v pnpm &> /dev/null; then
    pnpm run build
else
    npm run build
fi
echo "✅ Build complete"

# Check if binary was built successfully
if [ ! -f "$SCRIPT_DIR/playwright" ]; then
    echo "❌ Build failed - binary not found"
    exit 1
fi

# Create directories
if [ "$PLAYWRIGHT_SYSTEM_INSTALL" = "true" ]; then
    sudo mkdir -p "$INSTALL_DIR"
else
    mkdir -p "$INSTALL_DIR"
fi
mkdir -p "$CLAUDE_DIR"

# Kill any running instances of the binary before copying
if pgrep -f "playwright" > /dev/null 2>&1; then
    echo "  Stopping running playwright instances..."
    pkill -f "playwright" 2>/dev/null || true
    sleep 0.5  # Give it time to terminate
fi

# Install binary using install command for better handling
echo "📦 Installing to $INSTALL_DIR..."
if command -v install &> /dev/null; then
    if [ "$PLAYWRIGHT_SYSTEM_INSTALL" = "true" ]; then
        sudo install -m 755 playwright "$INSTALL_DIR/"
    else
        install -m 755 playwright "$INSTALL_DIR/"
    fi
else
    # Fallback: remove existing file first if it exists
    if [ "$PLAYWRIGHT_SYSTEM_INSTALL" = "true" ]; then
        [ -f "$INSTALL_DIR/playwright" ] && sudo rm -f "$INSTALL_DIR/playwright"
        sudo cp playwright "$INSTALL_DIR/"
        sudo chmod +x "$INSTALL_DIR/playwright"
    else
        [ -f "$INSTALL_DIR/playwright" ] && rm -f "$INSTALL_DIR/playwright"
        cp playwright "$INSTALL_DIR/"
        chmod +x "$INSTALL_DIR/playwright"
    fi
fi

# Test installation
echo ""
echo "🧪 Testing installation..."
if "$INSTALL_DIR/playwright" --version &>/dev/null; then
    VERSION=$("$INSTALL_DIR/playwright" --version 2>/dev/null || echo "unknown")
    echo "✅ playwright binary works (version: $VERSION)"
elif "$INSTALL_DIR/playwright" help &>/dev/null; then
    echo "✅ playwright binary works"
else
    echo "⚠️  playwright binary may have issues - please test manually"
fi

# Update CLAUDE.md with Playwright CLI instructions
echo ""
echo "📝 Updating CLAUDE.md with Playwright CLI instructions..."
# Claude Code looks for CLAUDE.md in ~/.claude/CLAUDE.md by default
CLAUDE_MD="$CLAUDE_DIR/CLAUDE.md"
if [ -f "$CLAUDE_MD" ]; then
    # Existing file - update it
    cp "$CLAUDE_MD" "$CLAUDE_MD.backup"
    
    # Check if section exists and remove it if found
    if grep -q "<!-- BEGIN PLAYWRIGHT-CLI -->" "$CLAUDE_MD.backup"; then
        # Remove existing PLAYWRIGHT-CLI section including surrounding newlines
        perl -0pe 's/\n*<!-- BEGIN PLAYWRIGHT-CLI -->.*?<!-- END PLAYWRIGHT-CLI -->\n*//gs' "$CLAUDE_MD.backup" > "$CLAUDE_MD.tmp"
    else
        # No section to remove, just copy the file
        cp "$CLAUDE_MD.backup" "$CLAUDE_MD.tmp"
    fi
    
    # Trim all trailing newlines from the file
    perl -pi -e 'chomp if eof' "$CLAUDE_MD.tmp" 2>/dev/null || sed -i '' -e :a -e '/^\s*$/d;N;ba' "$CLAUDE_MD.tmp"
    
    # Check if file is empty or has content
    if [ ! -s "$CLAUDE_MD.tmp" ]; then
        # File is empty, no need for leading newlines
        true  # No-op
    else
        # File has content, add appropriate spacing
        echo "" >> "$CLAUDE_MD.tmp"
        echo "" >> "$CLAUDE_MD.tmp"
    fi
    echo "<!-- BEGIN PLAYWRIGHT-CLI -->" >> "$CLAUDE_MD.tmp"
    
    # Copy content from CLAUDE_INSTRUCTIONS.md if it exists
    if [ -f "$SCRIPT_DIR/CLAUDE_INSTRUCTIONS.md" ]; then
        cat "$SCRIPT_DIR/CLAUDE_INSTRUCTIONS.md" >> "$CLAUDE_MD.tmp"
    else
        # Fallback minimal content if file not found
        echo "## Playwright CLI" >> "$CLAUDE_MD.tmp"
        echo "Browser automation tool. Run 'playwright claude' for documentation." >> "$CLAUDE_MD.tmp"
    fi
    
    echo "<!-- END PLAYWRIGHT-CLI -->" >> "$CLAUDE_MD.tmp"
    
    mv "$CLAUDE_MD.tmp" "$CLAUDE_MD"
    echo "✅ Updated CLAUDE.md with Playwright CLI instructions"
else
    # New file - create with section from CLAUDE_INSTRUCTIONS.md
    mkdir -p "$CLAUDE_DIR"
    
    echo "<!-- BEGIN PLAYWRIGHT-CLI -->" > "$CLAUDE_MD"
    
    # Copy content from CLAUDE_INSTRUCTIONS.md if it exists
    if [ -f "$SCRIPT_DIR/CLAUDE_INSTRUCTIONS.md" ]; then
        cat "$SCRIPT_DIR/CLAUDE_INSTRUCTIONS.md" >> "$CLAUDE_MD"
    else
        # Fallback minimal content if file not found
        echo "## Playwright CLI" >> "$CLAUDE_MD"
        echo "Browser automation tool. Run 'playwright claude' for documentation." >> "$CLAUDE_MD"
    fi
    
    echo "<!-- END PLAYWRIGHT-CLI -->" >> "$CLAUDE_MD"
    
    echo "✅ Created CLAUDE.md with Playwright CLI instructions"
fi

# Check if PATH contains install directory and offer to add it
if [[ ":$PATH:" != *":$INSTALL_DIR:"* ]]; then
    echo ""
    echo "⚠️  WARNING: $INSTALL_DIR is not in your PATH!"
    echo ""
    echo "The 'playwright' command will NOT work until it's in PATH."
    echo ""
    
    # Detect shell config file
    if [ -n "$ZSH_VERSION" ] || [ -f "$HOME/.zshrc" ]; then
        SHELL_RC="$HOME/.zshrc"
        SHELL_NAME="zsh"
    elif [ -n "$BASH_VERSION" ] || [ -f "$HOME/.bashrc" ]; then
        SHELL_RC="$HOME/.bashrc"
        SHELL_NAME="bash"
    elif [ -f "$HOME/.profile" ]; then
        SHELL_RC="$HOME/.profile"
        SHELL_NAME="sh"
    else
        SHELL_RC=""
        SHELL_NAME="unknown"
    fi
    
    if [ -n "$SHELL_RC" ]; then
        echo "Would you like to add $INSTALL_DIR to your PATH automatically?"
        read -p "This will modify $SHELL_RC (y/N): " add_to_path
        
        if [[ "$add_to_path" =~ ^[Yy]$ ]]; then
            # Add to PATH in shell config
            echo "" >> "$SHELL_RC"
            echo "# Added by playwright-cli installer" >> "$SHELL_RC"
            echo "export PATH=\"$INSTALL_DIR:\$PATH\"" >> "$SHELL_RC"
            echo "✅ Added to $SHELL_RC"
            echo ""
            echo "Run this to update your current session:"
            echo "    source $SHELL_RC"
        else
            echo ""
            echo "To add manually, run:"
            echo "    echo 'export PATH=\"$INSTALL_DIR:\$PATH\"' >> $SHELL_RC"
            echo "    source $SHELL_RC"
        fi
    else
        echo "To add to PATH, run:"
        echo "    export PATH=\"$INSTALL_DIR:\$PATH\""
    fi
    
    echo ""
    echo "OR reinstall with system-wide installation (requires sudo):"
    echo "    PLAYWRIGHT_SYSTEM_INSTALL=true ./install.sh"
fi

echo ""
echo "✅ Installation complete!"
echo ""
echo "Run 'playwright' to see all available commands"