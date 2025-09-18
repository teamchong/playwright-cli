#!/bin/bash

# Playwright CLI Installation Script
# This script builds the CLI, generates documentation, and installs it locally

set -e  # Exit on error

echo "🚀 Playwright CLI Installation"
echo "=============================="

# Check for required tools
echo "📋 Checking requirements..."

if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required but not installed"
    echo "   Please install Node.js from https://nodejs.org"
    exit 1
fi

if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm is required but not installed"
    echo "   Installing pnpm..."
    npm install -g pnpm
fi

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# Build the CLI
echo "🔨 Building Playwright CLI..."
pnpm run build

# Generate documentation
echo "📝 Generating documentation..."
pnpm run generate-docs

# Install locally
echo "📂 Installing to ~/.local/bin..."
mkdir -p ~/.local/bin
cp playwright ~/.local/bin/
chmod +x ~/.local/bin/playwright

# Check if ~/.local/bin is in PATH
if [[ ":$PATH:" != *":$HOME/.local/bin:"* ]]; then
    echo ""
    echo "⚠️  ~/.local/bin is not in your PATH"
    echo "   Add this to your shell configuration file:"
    echo ""
    echo "   export PATH=\"\$HOME/.local/bin:\$PATH\""
    echo ""
    echo "   For bash: ~/.bashrc or ~/.bash_profile"
    echo "   For zsh:  ~/.zshrc"
fi

# Install Playwright browsers
echo ""
echo "🌐 Installing Playwright browsers..."
echo "   This may take a few minutes on first install..."
~/.local/bin/playwright install chromium

# Test the installation
echo ""
echo "✅ Testing installation..."
if ~/.local/bin/playwright --version &> /dev/null; then
    echo "   Playwright CLI installed successfully!"
    ~/.local/bin/playwright --version
else
    echo "❌ Installation test failed"
    exit 1
fi

echo ""
echo "🎉 Installation complete!"
echo ""
echo "Usage examples:"
echo "  playwright open https://example.com"
echo "  playwright screenshot output.png"
echo "  playwright --help"
echo ""
echo "Documentation:"
echo "  - CLAUDE.md: Auto-generated command reference"
echo "  - CLAUDE_INSTRUCTIONS.md: Detailed usage guide"
echo ""
echo "To keep docs updated after changes:"
echo "  pnpm run generate-docs"