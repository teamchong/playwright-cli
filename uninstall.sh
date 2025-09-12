#!/bin/bash

# Playwright CLI Uninstaller
# Removes all installed components and configurations

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

INSTALL_DIR="$HOME/.local/bin"
# Use environment variable if set, otherwise default to ~/.claude
CLAUDE_DIR="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"

echo "🗑️  Playwright CLI Uninstaller"
echo "============================="
echo ""

# Track what was removed
REMOVED_ITEMS=()

# Remove binary
if [ -f "$INSTALL_DIR/playwright" ]; then
    rm -f "$INSTALL_DIR/playwright"
    echo -e "${GREEN}✓${NC} Removed playwright binary"
    REMOVED_ITEMS+=("Playwright CLI binary")
else
    echo -e "${YELLOW}⚠${NC} Binary not found at $INSTALL_DIR/playwright"
fi

# Remove from CLAUDE.md using markers
echo ""
echo "📝 Cleaning up CLAUDE.md..."
if [ -f "$CLAUDE_DIR/CLAUDE.md" ]; then
    # Check if section exists before trying to remove
    if grep -q "<!-- BEGIN PLAYWRIGHT-CLI -->" "$CLAUDE_DIR/CLAUDE.md"; then
        # Backup first
        cp "$CLAUDE_DIR/CLAUDE.md" "$CLAUDE_DIR/CLAUDE.md.backup"
        
        # Remove section between markers
        sed '/<!-- BEGIN PLAYWRIGHT-CLI -->/,/<!-- END PLAYWRIGHT-CLI -->/d' "$CLAUDE_DIR/CLAUDE.md.backup" > "$CLAUDE_DIR/CLAUDE.md.tmp"
    
        # Clean up excessive blank lines (keep max 2 consecutive) and remove trailing blank lines
        awk '
            /^$/ { blank++; if (blank <= 2) lines[NR] = $0; next }
            { 
                for (i in lines) print lines[i]
                delete lines
                blank = 0
                print 
            }
        ' "$CLAUDE_DIR/CLAUDE.md.tmp" > "$CLAUDE_DIR/CLAUDE.md"
        
        rm -f "$CLAUDE_DIR/CLAUDE.md.tmp"
        echo -e "${GREEN}✓${NC} Removed Playwright CLI section from CLAUDE.md"
        REMOVED_ITEMS+=("CLAUDE.md entry")
    else
        echo -e "${YELLOW}⚠${NC} PLAYWRIGHT-CLI section not found in CLAUDE.md (skipping)"
    fi
else
    echo -e "${YELLOW}⚠${NC} CLAUDE.md not found"
fi

# Clean up any session files
if ls ~/.playwright-cli-sessions/* >/dev/null 2>&1; then
    rm -rf ~/.playwright-cli-sessions
    echo -e "${GREEN}✓${NC} Removed saved sessions"
    REMOVED_ITEMS+=("Saved sessions")
fi

# Summary
echo ""
echo "═══════════════════════════════════════════"
if [ ${#REMOVED_ITEMS[@]} -gt 0 ]; then
    echo -e "${GREEN}✅ Uninstallation complete!${NC}"
    echo ""
    echo "Removed:"
    for item in "${REMOVED_ITEMS[@]}"; do
        echo "  • $item"
    done
else
    echo -e "${YELLOW}⚠️  Nothing to remove - Playwright CLI was not installed${NC}"
fi
echo ""
echo "To reinstall, run: ./install.sh"
echo "═══════════════════════════════════════════"