import { spawnSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

import { chromium, firefox, webkit } from 'playwright';

import { logger } from './logger';
import { PlatformHelper } from './platform-helper';

const OLD_CONFIG_FILE = join(homedir(), '.playwright-cli-config.json');
const CLAUDE_DIR = PlatformHelper.getClaudeDir();
const CONFIG_FILE = join(CLAUDE_DIR, 'playwright-config.json');

export type BrowserType = 'chromium' | 'firefox' | 'webkit';

interface Config {
  defaultBrowser: BrowserType;
  browsersInstalled: boolean;
  lastUsedBrowser?: string;
  lastUsedPort?: number;
  lastUsedOptions?: {
    headless?: boolean;
    devtools?: boolean;
  };
}

export class BrowserConfig {
  private static config: Config | null = null;

  static async loadConfig(): Promise<Config> {
    if (this.config) return this.config;

    try {
      // Try new location first
      if (existsSync(CONFIG_FILE)) {
        const data = readFileSync(CONFIG_FILE, 'utf-8');
        this.config = JSON.parse(data);
        return this.config!;
      }
      // Migrate from old location if exists
      if (existsSync(OLD_CONFIG_FILE)) {
        const data = readFileSync(OLD_CONFIG_FILE, 'utf-8');
        this.config = JSON.parse(data);
        // Save to new location
        if (this.config) {
          await this.saveConfig(this.config);
        }
        // Delete old file
        try {
          require('fs').unlinkSync(OLD_CONFIG_FILE);
        } catch {}
        return this.config!;
      }
    } catch {}

    // Default config
    this.config = {
      defaultBrowser: 'chromium',
      browsersInstalled: false
    };
    return this.config;
  }

  static async saveConfig(config: Partial<Config>) {
    const current = await this.loadConfig();
    this.config = { ...current, ...config };

    // Ensure Claude directory exists
    PlatformHelper.getOrCreateClaudeDir();

    writeFileSync(CONFIG_FILE, JSON.stringify(this.config, null, 2));
  }

  static async checkBrowsersInstalled(): Promise<boolean> {
    // Check if Playwright browsers are installed
    try {
      // Try to get browser executable paths
      const browsers = [
        chromium.executablePath(),
        firefox.executablePath(),
        webkit.executablePath()
      ];

      // Check if at least one exists
      return browsers.some(path => path && existsSync(path));
    } catch {
      return false;
    }
  }

  static async installBrowsers(): Promise<boolean> {
    logger.info('📦 Installing Playwright browsers...');
    logger.info('This may take a few minutes on first run.');

    const result = spawnSync('npx', ['playwright', 'install'], {
      stdio: 'inherit',
      shell: true
    });

    if (result.status === 0) {
      await this.saveConfig({ browsersInstalled: true });
      return true;
    }
    return false;
  }

  static async getBrowser(type?: BrowserType) {
    const config = await this.loadConfig();
    const browserType = type || config.defaultBrowser;

    switch (browserType) {
    case 'firefox':
      return firefox;
    case 'webkit':
      return webkit;
    case 'chromium':
    default:
      return chromium;
    }
  }

  static async selectBrowser(): Promise<BrowserType> {
    // In a real implementation, this would prompt the user
    // For now, return the default
    const config = await this.loadConfig();
    return config.defaultBrowser;
  }

  static async getLastUsedBrowser(): Promise<string | undefined> {
    const config = await this.loadConfig();
    return config.lastUsedBrowser;
  }

  static async saveLastUsedBrowser(browserPath: string | undefined) {
    if (browserPath === undefined || browserPath === 'default') {
      // Clear the saved browser
      const config = await this.loadConfig();
      delete config.lastUsedBrowser;
      await this.saveConfig(config);
    } else {
      await this.saveConfig({ lastUsedBrowser: browserPath });
    }
  }

  static async saveLastUsedOptions(options: { port?: number; headless?: boolean; devtools?: boolean }) {
    const config = await this.loadConfig();
    await this.saveConfig({
      lastUsedPort: options.port || config.lastUsedPort,
      lastUsedOptions: {
        headless: options.headless !== undefined ? options.headless : config.lastUsedOptions?.headless,
        devtools: options.devtools !== undefined ? options.devtools : config.lastUsedOptions?.devtools
      }
    });
  }
}
