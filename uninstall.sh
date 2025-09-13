#!/bin/bash

# Playwright CLI Uninstaller
# Removes playwright CLI from all possible installation paths

set -e

echo "🗑️  Playwright CLI Uninstaller"
echo "============================="
echo ""

# Define possible installation paths
USER_BIN="$HOME/.local/bin"
SYSTEM_BIN="/usr/local/bin"
CLAUDE_DIR="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"
CLAUDE_MD="$CLAUDE_DIR/CLAUDE.MD"

# Function to remove binary from a directory
remove_binary() {
    local dir="$1"
    local use_sudo="$2"
    
    if [ -f "$dir/playwright" ]; then
        echo "📋 Removing playwright from $dir..."
        if [ "$use_sudo" = "true" ]; then
            sudo rm -f "$dir/playwright"
        else
            rm -f "$dir/playwright"
        fi
        echo "✅ Removed from $dir"
    fi
}

# Stop any running instances
if pgrep -f "playwright" > /dev/null 2>&1; then
    echo "🛑 Stopping running playwright instances..."
    pkill -f "playwright" 2>/dev/null || true
    sleep 1
    echo "✅ Stopped running instances"
fi

# Remove from user directory (no sudo needed)
remove_binary "$USER_BIN" false

# Remove from system directory (requires sudo)
if [ -f "$SYSTEM_BIN/playwright" ]; then
    echo "📋 Removing playwright from $SYSTEM_BIN (requires sudo)..."
    if sudo rm -f "$SYSTEM_BIN/playwright" 2>/dev/null; then
        echo "✅ Removed from $SYSTEM_BIN"
    else
        echo "⚠️  Could not remove from $SYSTEM_BIN (permission denied)"
        echo "   You may need to run: sudo rm -f $SYSTEM_BIN/playwright"
    fi
fi

# Remove Playwright CLI section from CLAUDE.md
if [ -f "$CLAUDE_MD" ]; then
    echo "📝 Removing Playwright CLI instructions from CLAUDE.md..."
    if grep -q "<!-- BEGIN PLAYWRIGHT-CLI -->" "$CLAUDE_MD"; then
        # Create backup
        cp "$CLAUDE_MD" "$CLAUDE_MD.backup"
        
        # Remove PLAYWRIGHT-CLI section
        perl -0pe 's/\n*<!-- BEGIN PLAYWRIGHT-CLI -->.*?<!-- END PLAYWRIGHT-CLI -->\n*//gs' "$CLAUDE_MD.backup" > "$CLAUDE_MD.tmp"
        
        # Trim trailing newlines
        perl -pi -e 'chomp if eof' "$CLAUDE_MD.tmp" 2>/dev/null || sed -i '' -e :a -e '/^\s*$/d;N;ba' "$CLAUDE_MD.tmp"
        
        mv "$CLAUDE_MD.tmp" "$CLAUDE_MD"
        echo "✅ Removed Playwright CLI section from CLAUDE.md"
    fi
fi

echo ""
echo "✅ Uninstallation complete!"
echo ""
echo "Note: If you had playwright in your PATH, you may need to restart"
echo "your terminal or run 'hash -r' to clear the command cache."