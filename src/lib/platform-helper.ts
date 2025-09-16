import { existsSync } from 'fs'
import { homedir, platform } from 'os'
import { join } from 'path'

/**
 * Cross-platform helper for finding Claude Code configuration directories
 */
export class PlatformHelper {
  /**
   * Get the Claude configuration directory based on platform conventions
   */
  static getClaudeDir(): string {
    const plat = platform()

    switch (plat) {
      case 'win32':
        // Windows: Use AppData/Local for user config
        return process.env.LOCALAPPDATA
          ? join(process.env.LOCALAPPDATA, 'Claude')
          : join(homedir(), 'AppData', 'Local', 'Claude')

      case 'darwin':
        // macOS: Use ~/.claude (could also use ~/Library/Application Support/Claude)
        return join(homedir(), '.claude')

      default:
        // Linux and others: Follow XDG Base Directory spec
        return process.env.XDG_CONFIG_HOME
          ? join(process.env.XDG_CONFIG_HOME, 'claude')
          : join(homedir(), '.claude')
    }
  }

  /**
   * Find Claude settings.json file across different possible locations
   */
  static findSettingsFile(): string | null {
    const possiblePaths = [
      // Primary location based on platform
      join(this.getClaudeDir(), 'settings.json'),

      // Legacy location
      join(homedir(), '.claude', 'settings.json'),

      // VSCode extension location (Windows)
      platform() === 'win32' && process.env.APPDATA
        ? join(
            process.env.APPDATA,
            'Code',
            'User',
            'globalStorage',
            'anthropic.claude-code',
            'settings.json'
          )
        : null,

      // VSCode extension location (macOS)
      platform() === 'darwin'
        ? join(
            homedir(),
            'Library',
            'Application Support',
            'Code',
            'User',
            'globalStorage',
            'anthropic.claude-code',
            'settings.json'
          )
        : null,

      // VSCode extension location (Linux)
      platform() === 'linux'
        ? join(
            homedir(),
            '.config',
            'Code',
            'User',
            'globalStorage',
            'anthropic.claude-code',
            'settings.json'
          )
        : null,
    ].filter(Boolean) as string[]

    // Return first existing file
    for (const path of possiblePaths) {
      if (existsSync(path)) {
        return path
      }
    }

    return null
  }

  /**
   * Find CLAUDE.md file across different possible locations
   */
  static findClaudeMd(): string | null {
    const possiblePaths = [
      // Primary location
      join(this.getClaudeDir(), 'CLAUDE.md'),

      // Legacy location
      join(homedir(), '.claude', 'CLAUDE.md'),

      // Project-specific (current directory)
      join(process.cwd(), 'CLAUDE.md'),
      join(process.cwd(), '.claude', 'CLAUDE.md'),
    ]

    for (const path of possiblePaths) {
      if (existsSync(path)) {
        return path
      }
    }

    return null
  }

  /**
   * Get or create the Claude config directory
   */
  static getOrCreateClaudeDir(): string {
    const dir = this.getClaudeDir()

    if (!existsSync(dir)) {
      const { mkdirSync } = require('fs')
      mkdirSync(dir, { recursive: true })
    }

    return dir
  }

  /**
   * Get platform-specific binary installation directory
   */
  static getBinDir(): string {
    const plat = platform()

    switch (plat) {
      case 'win32':
        // Windows: Add to user's local bin or create one
        return process.env.LOCALAPPDATA
          ? join(process.env.LOCALAPPDATA, 'Microsoft', 'WindowsApps')
          : join(homedir(), 'AppData', 'Local', 'Microsoft', 'WindowsApps')

      case 'darwin':
      case 'linux':
      default:
        // Unix-like: Use ~/.local/bin (follows FHS)
        return join(homedir(), '.local', 'bin')
    }
  }

  /**
   * Get the appropriate shell profile file for PATH updates
   */
  static getShellProfile(): string | null {
    const plat = platform()

    if (plat === 'win32') {
      // Windows doesn't use shell profiles the same way
      return null
    }

    // Check which shell is being used
    const shell = process.env.SHELL || ''

    if (shell.includes('zsh')) {
      return join(homedir(), '.zshrc')
    } else if (shell.includes('bash')) {
      // Check for .bashrc first, then .bash_profile
      const bashrc = join(homedir(), '.bashrc')
      const bashProfile = join(homedir(), '.bash_profile')
      return existsSync(bashrc) ? bashrc : bashProfile
    } else if (shell.includes('fish')) {
      return join(homedir(), '.config', 'fish', 'config.fish')
    }

    // Default to .profile
    return join(homedir(), '.profile')
  }

  /**
   * Check if running on Windows
   */
  static isWindows(): boolean {
    return platform() === 'win32'
  }

  /**
   * Check if running on macOS
   */
  static isMacOS(): boolean {
    return platform() === 'darwin'
  }

  /**
   * Check if running on Linux
   */
  static isLinux(): boolean {
    return platform() === 'linux'
  }

  /**
   * Get platform-specific executable extension
   */
  static getExecutableExtension(): string {
    return this.isWindows() ? '.exe' : ''
  }

  /**
   * Get platform name for display
   */
  static getPlatformName(): string {
    const plat = platform()
    switch (plat) {
      case 'win32':
        return 'Windows'
      case 'darwin':
        return 'macOS'
      case 'linux':
        return 'Linux'
      default:
        return plat
    }
  }
}
