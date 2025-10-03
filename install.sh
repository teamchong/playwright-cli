#!/bin/bash

# Playwright CLI Installer
set -e

INSTALL_DIR="$HOME/.local/bin"
# Use environment variable if set, otherwise default to ~/.claude
CLAUDE_DIR="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"

echo "🎭 Playwright CLI Installer"
echo "==========================="
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
if [ ! -f "$SCRIPT_DIR/pw" ]; then
    echo "❌ Build failed - binary not found"
    exit 1
fi

# Create directories
mkdir -p "$INSTALL_DIR"
mkdir -p "$CLAUDE_DIR"

# Create wrapper script that references project directory
echo "📦 Installing to $INSTALL_DIR..."
cat > "$INSTALL_DIR/pw" << EOF
#!/usr/bin/env bash
exec node "$SCRIPT_DIR/dist/src/index.js" "\$@"
EOF
chmod +x "$INSTALL_DIR/pw"
echo "✅ Installed pw wrapper script"

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
        echo "Browser automation tool. Run 'pw --help' for documentation." >> "$CLAUDE_MD.tmp"
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
        echo "Browser automation tool. Run 'pw --help' for documentation." >> "$CLAUDE_MD"
    fi
    
    echo "<!-- END PLAYWRIGHT-CLI -->" >> "$CLAUDE_MD"
    
    echo "✅ Created CLAUDE.md with Playwright CLI instructions"
fi

# Check if PATH contains install directory
if [[ ":$PATH:" != *":$INSTALL_DIR:"* ]]; then
    echo ""
    echo "⚠️  Add $INSTALL_DIR to your PATH:"
    echo "    echo 'export PATH=\"\$HOME/.local/bin:\$PATH\"' >> ~/.zshrc"
    echo "    source ~/.zshrc"
fi

echo ""
echo "✅ Installation complete!"
echo ""
echo "Run 'pw' to see all available commands"