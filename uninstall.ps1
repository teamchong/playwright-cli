# Playwright CLI Uninstaller for Windows
# Run with: powershell -ExecutionPolicy Bypass -File uninstall.ps1

$ErrorActionPreference = "Stop"

# Color codes for output
function Write-Success { param($msg) Write-Host "✅ $msg" -ForegroundColor Green }
function Write-Warning { param($msg) Write-Host "⚠️  $msg" -ForegroundColor Yellow }
function Write-Error { param($msg) Write-Host "❌ $msg" -ForegroundColor Red }

# Set paths based on OS
if ($IsWindows -or $env:OS -eq "Windows_NT") {
    $INSTALL_DIR = "$env:LOCALAPPDATA\Programs\playwright-cli"
    $CLAUDE_DIR = if ($env:CLAUDE_CONFIG_DIR) { $env:CLAUDE_CONFIG_DIR } else { "$env:USERPROFILE\.claude" }
    $BINARY_NAME = "pw.exe"
} else {
    # Unix/macOS paths
    $INSTALL_DIR = "$HOME/.local/bin"
    $CLAUDE_DIR = if ($env:CLAUDE_CONFIG_DIR) { $env:CLAUDE_CONFIG_DIR } else { "$HOME/.claude" }
    $BINARY_NAME = "pw"
}

Write-Host "🗑️  Playwright CLI Uninstaller" -ForegroundColor Cyan
Write-Host "=============================" -ForegroundColor Cyan
Write-Host ""

# Track what was removed
$removedItems = @()

# Remove binary
$binaryPath = Join-Path $INSTALL_DIR $BINARY_NAME
if (Test-Path $binaryPath) {
    Remove-Item $binaryPath -Force
    Write-Success "Removed pw binary"
    $removedItems += "pw binary"
} else {
    Write-Warning "Binary not found at $binaryPath"
}

# Remove from CLAUDE.md using markers
Write-Host ""
Write-Host "📝 Cleaning up CLAUDE.md..." -ForegroundColor Yellow
$CLAUDE_MD = Join-Path $CLAUDE_DIR "CLAUDE.md"

if (Test-Path $CLAUDE_MD) {
    # Check if section exists before trying to remove
    $content = Get-Content $CLAUDE_MD -Raw
    if ($content -match '<!-- BEGIN PLAYWRIGHT-CLI -->') {
        # Backup first
        Copy-Item $CLAUDE_MD "$CLAUDE_MD.backup" -Force
        
        # Remove the section between markers (including the markers themselves)
        $pattern = '(?s)<!-- BEGIN PLAYWRIGHT-CLI -->.*?<!-- END PLAYWRIGHT-CLI -->'
        $content = $content -replace $pattern, ''
        
        # Clean up excessive newlines (max 2 consecutive) - same as bash script
        $content = $content -replace '(\r?\n){3,}', "`n`n"
        
        # Trim trailing whitespace
        $content = $content.TrimEnd()
        
        # Write back with a trailing newline
        Set-Content -Path $CLAUDE_MD -Value $content
        Write-Success "Removed Playwright CLI section from CLAUDE.md"
        $removedItems += "CLAUDE.md entry"
    } else {
        Write-Warning "PLAYWRIGHT-CLI section not found in CLAUDE.md (skipping)"
    }
} else {
    Write-Warning "CLAUDE.md not found"
}

# Remove from PATH if present (Windows only)
if ($IsWindows -or $env:OS -eq "Windows_NT") {
    $userPath = [Environment]::GetEnvironmentVariable("Path", "User")
    if ($userPath -like "*$INSTALL_DIR*") {
        Write-Host ""
        Write-Host "📝 Removing from PATH..." -ForegroundColor Yellow
        $newPath = ($userPath -split ';' | Where-Object { $_ -ne $INSTALL_DIR }) -join ';'
        [Environment]::SetEnvironmentVariable("Path", $newPath, "User")
        Write-Success "Removed from PATH"
        $removedItems += "PATH entry"
    }
}

# Remove install directory if empty
if (Test-Path $INSTALL_DIR) {
    $files = Get-ChildItem $INSTALL_DIR
    if ($files.Count -eq 0) {
        Remove-Item $INSTALL_DIR -Force
        Write-Success "Removed empty installation directory"
        $removedItems += "Installation directory"
    }
}

# Summary
Write-Host ""
Write-Host "═══════════════════════════════════════════" -ForegroundColor Cyan
if ($removedItems.Count -gt 0) {
    Write-Host "✅ Uninstallation complete!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Removed:" -ForegroundColor White
    foreach ($item in $removedItems) {
        Write-Host "  • $item" -ForegroundColor Gray
    }
} else {
    Write-Warning "Nothing to remove - pw was not installed"
}
Write-Host ""
Write-Host "To reinstall, run: .\install.ps1" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════" -ForegroundColor Cyan