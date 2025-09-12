import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * Cross-platform settings and configuration locator for Claude Code
 * Based on actual Claude Code source implementation
 */
export class SettingsLocator {
  private static instance: SettingsLocator;
  
  private constructor() {}
  
  static getInstance(): SettingsLocator {
    if (!SettingsLocator.instance) {
      SettingsLocator.instance = new SettingsLocator();
    }
    return SettingsLocator.instance;
  }

  /**
   * Get Claude Code's primary configuration directory
   * This matches Claude Code's mB() function implementation
   */
  getClaudeConfigDir(): string {
    // Check for environment variable override first
    if (process.env.CLAUDE_CONFIG_DIR) {
      return process.env.CLAUDE_CONFIG_DIR;
    }
    
    // Default to ~/.claude
    return path.join(os.homedir(), '.claude');
  }

  /**
   * Get system-wide configuration directory
   * This matches Claude Code's Hh() function implementation
   */
  getSystemConfigDir(): string {
    const platform = os.platform();
    
    switch (platform) {
      case 'darwin': // macOS
        return '/Library/Application Support/ClaudeCode';
      case 'win32': // Windows
        return 'C:\\ProgramData\\ClaudeCode';
      default: // Linux and others
        return '/etc/claude-code';
    }
  }

  /**
   * Get all possible Claude configuration directories in priority order
   */
  getClaudeDirectories(): string[] {
    const dirs: string[] = [];
    const cwd = process.cwd();

    // 1. Environment variable override (highest priority)
    if (process.env.CLAUDE_CONFIG_DIR) {
      dirs.push(process.env.CLAUDE_CONFIG_DIR);
    }

    // 2. User config directory (~/.claude)
    dirs.push(this.getClaudeConfigDir());

    // 3. Project-level .claude directory
    dirs.push(path.join(cwd, '.claude'));

    // 4. Current working directory (for CLAUDE.md)
    dirs.push(cwd);

    // 5. System-wide config directory
    dirs.push(this.getSystemConfigDir());

    // 6. Legacy location (~/.claude.json parent directory)
    dirs.push(os.homedir());

    // Filter to only existing directories
    return dirs.filter(dir => fs.existsSync(dir));
  }

  /**
   * Find Claude settings.json file based on type
   * Matches Claude Code's SO() function implementation
   */
  findSettingsFile(type: 'user' | 'project' | 'local' | 'policy' = 'user'): string | null {
    let settingsPath: string;
    
    switch (type) {
      case 'user':
        // User settings: ~/.claude/settings.json
        settingsPath = path.join(this.getClaudeConfigDir(), 'settings.json');
        break;
      case 'project':
        // Project settings: ./.claude/settings.json
        settingsPath = path.join(process.cwd(), '.claude', 'settings.json');
        break;
      case 'local':
        // Local settings: ./.claude/settings.local.json
        settingsPath = path.join(process.cwd(), '.claude', 'settings.local.json');
        break;
      case 'policy':
        // System-wide managed settings
        const systemDir = this.getSystemConfigDir();
        settingsPath = path.join(systemDir, 'managed-settings.json');
        break;
    }
    
    return fs.existsSync(settingsPath) ? settingsPath : null;
  }

  /**
   * Find all settings files in priority order
   */
  findAllSettingsFiles(): string[] {
    const files: string[] = [];
    
    // Check in priority order (user > project > local > policy)
    const types: Array<'user' | 'project' | 'local' | 'policy'> = ['user', 'project', 'local', 'policy'];
    for (const type of types) {
      const file = this.findSettingsFile(type);
      if (file) {
        files.push(file);
      }
    }
    
    // Also check for legacy ~/.claude.json
    const legacyPath = path.join(os.homedir(), '.claude.json');
    if (fs.existsSync(legacyPath)) {
      files.push(legacyPath);
    }
    
    return files;
  }

  /**
   * Find CLAUDE.md file based on type
   * Matches Claude Code's zU() function implementation
   */
  findClaudeMdFile(type: 'user' | 'project' | 'local' | 'managed' = 'user'): string | null {
    let mdPath: string;
    
    switch (type) {
      case 'user':
        // User CLAUDE.md: ~/.claude/CLAUDE.md
        mdPath = path.join(this.getClaudeConfigDir(), 'CLAUDE.md');
        break;
      case 'project':
        // Project CLAUDE.md: ./CLAUDE.md
        mdPath = path.join(process.cwd(), 'CLAUDE.md');
        break;
      case 'local':
        // Local CLAUDE.md: ./CLAUDE.local.md
        mdPath = path.join(process.cwd(), 'CLAUDE.local.md');
        break;
      case 'managed':
        // System-wide managed CLAUDE.md
        mdPath = path.join(this.getSystemConfigDir(), 'CLAUDE.md');
        break;
    }
    
    return fs.existsSync(mdPath) ? mdPath : null;
  }

  /**
   * Find all CLAUDE.md files in priority order
   */
  findAllClaudeMdFiles(): string[] {
    const files: string[] = [];
    
    // Check in Claude Code's search order
    const types: Array<'user' | 'project' | 'local' | 'managed'> = ['user', 'project', 'local', 'managed'];
    for (const type of types) {
      const file = this.findClaudeMdFile(type);
      if (file) {
        files.push(file);
      }
    }
    
    // Check for experimental ULTRACLAUDE.md if it exists
    const ultraPath = path.join(this.getClaudeConfigDir(), 'ULTRACLAUDE.md');
    if (fs.existsSync(ultraPath)) {
      files.push(ultraPath);
    }
    
    return files;
  }

  /**
   * Get or create the best location for CLAUDE.md
   */
  getClaudeMdPath(): string {
    // First, check if user-level CLAUDE.md already exists
    const existing = this.findClaudeMdFile('user');
    if (existing) {
      return existing;
    }

    // Create in user config directory (~/.claude/CLAUDE.md)
    const targetDir = this.getClaudeConfigDir();
    
    // Ensure directory exists
    fs.mkdirSync(targetDir, { recursive: true });
    return path.join(targetDir, 'CLAUDE.md');
  }

  /**
   * Check if running in WSL (Windows Subsystem for Linux)
   */
  isWSL(): boolean {
    if (process.platform !== 'linux') {
      return false;
    }

    try {
      const osRelease = fs.readFileSync('/proc/version', 'utf8');
      return osRelease.toLowerCase().includes('microsoft');
    } catch {
      return false;
    }
  }

  /**
   * Get Windows path from WSL
   */
  getWindowsPathFromWSL(unixPath: string): string | null {
    if (!this.isWSL()) {
      return null;
    }

    // Convert /home/user to /mnt/c/Users/user
    const match = unixPath.match(/^\/home\/([^\/]+)(.*)/);
    if (match) {
      const username = match[1];
      const restPath = match[2];
      
      // Try to find Windows home
      const winHome = `/mnt/c/Users/${username}`;
      if (fs.existsSync(winHome)) {
        return winHome + restPath.replace(/\//g, '\\');
      }
    }

    return null;
  }

  /**
   * Debug function to show all detected paths
   */
  debugPaths(): void {
    console.log('Platform:', os.platform());
    console.log('Home directory:', os.homedir());
    console.log('\nDetected Claude directories:');
    this.getClaudeDirectories().forEach(dir => {
      console.log('  ✓', dir);
    });
    
    console.log('\nSettings file:', this.findSettingsFile() || 'Not found');
    console.log('CLAUDE.md file:', this.findClaudeMdFile() || 'Not found');
    
    if (this.isWSL()) {
      console.log('\n⚠️  Running in WSL environment');
    }
  }
}

// Export singleton instance
export const settingsLocator = SettingsLocator.getInstance();