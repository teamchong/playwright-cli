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
CLAUDE_MD="$CLAUDE_DIR/CLAUDE.md"

# Function to remove binary from a directory
remove_binary() {
    local dir="$1"
    local use_sudo="$2"

    if [ -f "$dir/pw" ]; then
        echo "📋 Removing pw from $dir..."
        if [ "$use_sudo" = "true" ]; then
            sudo rm -f "$dir/pw"
        else
            rm -f "$dir/pw"
        fi
        echo "✅ Removed from $dir"
    fi
}

# Stop any running instances
if pgrep -f "pw" > /dev/null 2>&1; then
    echo "🛑 Stopping running pw instances..."
    pkill -f "pw" 2>/dev/null || true
    sleep 1
    echo "✅ Stopped running instances"
fi

# Remove from user directory (no sudo needed)
remove_binary "$USER_BIN" false

# Remove from system directory (requires sudo)
if [ -f "$SYSTEM_BIN/pw" ]; then
    echo "📋 Removing pw from $SYSTEM_BIN (requires sudo)..."
    if sudo rm -f "$SYSTEM_BIN/pw" 2>/dev/null; then
        echo "✅ Removed from $SYSTEM_BIN"
    else
        echo "⚠️  Could not remove from $SYSTEM_BIN (permission denied)"
        echo "   You may need to run: sudo rm -f $SYSTEM_BIN/pw"
    fi
fi

# Remove Playwright CLI section from CLAUDE.md
if [ -f "$CLAUDE_MD" ]; then
    echo "📝 Removing Playwright CLI instructions from CLAUDE.md..."
    
    # Remove the Playwright section between markers
    if grep -q "<!-- BEGIN PLAYWRIGHT-CLI -->" "$CLAUDE_MD"; then
        # Create temp file without the Playwright section
        awk '
            /<!-- BEGIN PLAYWRIGHT-CLI -->/ { skip = 1 }
            /<!-- END PLAYWRIGHT-CLI -->/ { skip = 0; next }
            !skip { print }
        ' "$CLAUDE_MD" > "$CLAUDE_MD.tmp"
        
        mv "$CLAUDE_MD.tmp" "$CLAUDE_MD"
        echo "✅ Removed Playwright CLI section from CLAUDE.md"
    fi
fi

echo ""
echo "✅ Uninstallation complete!"
echo ""
echo "Note: If you had pw in your PATH, you may need to restart"
echo "your terminal or run 'hash -r' to clear the command cache."