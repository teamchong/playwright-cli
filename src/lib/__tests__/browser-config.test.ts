import { spawnSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync, unlinkSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

import { describe, it, expect, beforeEach, afterEach, vi } from '../../__tests__/vitest-compat';

import { BrowserConfig, type BrowserType } from '../browser-config';

vi.mock('fs');
vi.mock('child_process');
vi.mock('playwright', () => ({
  chromium: {
    executablePath: vi.fn(() => '/path/to/chromium')
  },
  firefox: {
    executablePath: vi.fn(() => '/path/to/firefox')
  },
  webkit: {
    executablePath: vi.fn(() => '/path/to/webkit')
  }
}));

const CLAUDE_DIR = join(homedir(), '.claude');
const CONFIG_FILE = join(CLAUDE_DIR, 'playwright-config.json');
const OLD_CONFIG_FILE = join(homedir(), '.playwright-cli-config.json');

describe('BrowserConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset config singleton
    ;(BrowserConfig as any).config = null;
  });

  describe('loadConfig', () => {
    it('should load config from new location', async () => {
      const mockConfig = {
        defaultBrowser: 'firefox' as BrowserType,
        browsersInstalled: true
      };

      vi.mocked(existsSync).mockImplementation((path: string) => {
        return path === CONFIG_FILE;
      });
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(mockConfig));

      const config = await BrowserConfig.loadConfig();

      expect(config).toEqual(mockConfig);
      expect(readFileSync).toHaveBeenCalledWith(CONFIG_FILE, 'utf-8');
    });

    it('should migrate from old location', async () => {
      const mockConfig = {
        defaultBrowser: 'webkit' as BrowserType,
        browsersInstalled: false
      };

      vi.mocked(existsSync).mockImplementation((path: string) => {
        return path === OLD_CONFIG_FILE;
      });
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(mockConfig));

      const config = await BrowserConfig.loadConfig();

      expect(config).toEqual(mockConfig);
      expect(readFileSync).toHaveBeenCalledWith(OLD_CONFIG_FILE, 'utf-8');
      expect(writeFileSync).toHaveBeenCalledWith(
        CONFIG_FILE,
        JSON.stringify(mockConfig, null, 2)
      );
    });

    it('should return default config when no file exists', async () => {
      vi.mocked(existsSync).mockReturnValue(false);

      const config = await BrowserConfig.loadConfig();

      expect(config).toEqual({
        defaultBrowser: 'chromium',
        browsersInstalled: false
      });
    });

    it('should cache loaded config', async () => {
      const mockConfig = {
        defaultBrowser: 'chromium' as BrowserType,
        browsersInstalled: true
      };

      vi.mocked(existsSync).mockImplementation((path: string) => path === CONFIG_FILE);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(mockConfig));

      const config1 = await BrowserConfig.loadConfig();
      const config2 = await BrowserConfig.loadConfig();

      expect(config1).toBe(config2); // Same reference
      expect(readFileSync).toHaveBeenCalledTimes(1); // Only read once
    });
  });

  describe('saveConfig', () => {
    it('should save config to file', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify({
        defaultBrowser: 'chromium',
        browsersInstalled: false
      }));

      await BrowserConfig.saveConfig({
        browsersInstalled: true,
        lastUsedPort: 9222
      });

      expect(writeFileSync).toHaveBeenCalledWith(
        CONFIG_FILE,
        expect.stringContaining('"browsersInstalled": true')
      );
    });

    it('should create .claude directory if not exists', async () => {
      vi.mocked(existsSync).mockImplementation((path: string) => {
        return path !== CLAUDE_DIR;
      });
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify({
        defaultBrowser: 'chromium',
        browsersInstalled: false
      }));

      await BrowserConfig.saveConfig({ defaultBrowser: 'firefox' });

      expect(mkdirSync).toHaveBeenCalledWith(CLAUDE_DIR, { recursive: true });
    });

    it('should merge with existing config', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify({
        defaultBrowser: 'chromium',
        browsersInstalled: true
      }));

      await BrowserConfig.saveConfig({ lastUsedPort: 9222 });

      const savedConfig = JSON.parse(
        vi.mocked(writeFileSync).mock.calls[0][1] as string
      );

      expect(savedConfig).toEqual({
        defaultBrowser: 'chromium',
        browsersInstalled: true,
        lastUsedPort: 9222
      });
    });
  });

  describe('checkBrowsersInstalled', () => {
    it('should return true when browsers are installed', async () => {
      vi.mocked(existsSync).mockReturnValue(true);

      const result = await BrowserConfig.checkBrowsersInstalled();

      expect(result).toBe(true);
    });

    it('should return false when no browsers installed', async () => {
      vi.mocked(existsSync).mockReturnValue(false);

      const result = await BrowserConfig.checkBrowsersInstalled();

      expect(result).toBe(false);
    });

    it('should handle errors gracefully', async () => {
      const { chromium } = await import('playwright');
      vi.mocked(chromium.executablePath).mockImplementation(() => {
        throw new Error('Not installed');
      });

      const result = await BrowserConfig.checkBrowsersInstalled();

      expect(result).toBe(false);
    });
  });

  describe('installBrowsers', () => {
    it('should run playwright install command', async () => {
      vi.mocked(spawnSync).mockReturnValue({
        status: 0
      } as any);
      vi.mocked(existsSync).mockReturnValue(true);

      const result = await BrowserConfig.installBrowsers();

      expect(spawnSync).toHaveBeenCalledWith(
        'npx',
        ['playwright', 'install'],
        expect.objectContaining({
          stdio: 'inherit',
          shell: true
        })
      );
      expect(result).toBe(true);
    });

    it('should save config on successful install', async () => {
      vi.mocked(spawnSync).mockReturnValue({
        status: 0
      } as any);
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify({
        defaultBrowser: 'chromium',
        browsersInstalled: false
      }));

      await BrowserConfig.installBrowsers();

      expect(writeFileSync).toHaveBeenCalledWith(
        CONFIG_FILE,
        expect.stringContaining('"browsersInstalled": true')
      );
    });

    it('should return false on installation failure', async () => {
      vi.mocked(spawnSync).mockReturnValue({
        status: 1
      } as any);

      const result = await BrowserConfig.installBrowsers();

      expect(result).toBe(false);
    });
  });

  describe('getBrowser', () => {
    it('should return chromium by default', async () => {
      vi.mocked(existsSync).mockReturnValue(false);

      const browser = await BrowserConfig.getBrowser();
      const { chromium } = await import('playwright');

      expect(browser).toBe(chromium);
    });

    it('should return firefox when specified', async () => {
      const browser = await BrowserConfig.getBrowser('firefox');
      const { firefox } = await import('playwright');

      expect(browser).toBe(firefox);
    });

    it('should return webkit when specified', async () => {
      const browser = await BrowserConfig.getBrowser('webkit');
      const { webkit } = await import('playwright');

      expect(browser).toBe(webkit);
    });

    it('should use default from config', async () => {
      vi.mocked(existsSync).mockImplementation((path: string) => path === CONFIG_FILE);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify({
        defaultBrowser: 'firefox',
        browsersInstalled: true
      }));

      const browser = await BrowserConfig.getBrowser();
      const { firefox } = await import('playwright');

      expect(browser).toBe(firefox);
    });
  });

  describe('selectBrowser', () => {
    it('should return default browser', async () => {
      vi.mocked(existsSync).mockImplementation((path: string) => path === CONFIG_FILE);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify({
        defaultBrowser: 'webkit',
        browsersInstalled: true
      }));

      const browser = await BrowserConfig.selectBrowser();

      expect(browser).toBe('webkit');
    });
  });

  describe('getLastUsedBrowser', () => {
    it('should return last used browser', async () => {
      vi.mocked(existsSync).mockImplementation((path: string) => path === CONFIG_FILE);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify({
        defaultBrowser: 'chromium',
        browsersInstalled: true,
        lastUsedBrowser: '/path/to/custom/chrome'
      }));

      const browser = await BrowserConfig.getLastUsedBrowser();

      expect(browser).toBe('/path/to/custom/chrome');
    });

    it('should return undefined when not set', async () => {
      vi.mocked(existsSync).mockReturnValue(false);

      const browser = await BrowserConfig.getLastUsedBrowser();

      expect(browser).toBeUndefined();
    });
  });

  describe('saveLastUsedBrowser', () => {
    it('should save browser path', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify({
        defaultBrowser: 'chromium',
        browsersInstalled: true
      }));

      await BrowserConfig.saveLastUsedBrowser('/custom/browser');

      expect(writeFileSync).toHaveBeenCalledWith(
        CONFIG_FILE,
        expect.stringContaining('"lastUsedBrowser": "/custom/browser"')
      );
    });

    it('should clear browser when undefined', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify({
        defaultBrowser: 'chromium',
        browsersInstalled: true,
        lastUsedBrowser: '/old/browser'
      }));

      await BrowserConfig.saveLastUsedBrowser(undefined);

      const savedConfig = JSON.parse(
        vi.mocked(writeFileSync).mock.calls[0][1] as string
      );

      expect(savedConfig.lastUsedBrowser).toBeUndefined();
    });
  });

  describe('saveLastUsedOptions', () => {
    it('should save options', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify({
        defaultBrowser: 'chromium',
        browsersInstalled: true
      }));

      await BrowserConfig.saveLastUsedOptions({
        port: 9222,
        headless: true,
        devtools: false
      });

      const savedConfig = JSON.parse(
        vi.mocked(writeFileSync).mock.calls[0][1] as string
      );

      expect(savedConfig.lastUsedPort).toBe(9222);
      expect(savedConfig.lastUsedOptions).toEqual({
        headless: true,
        devtools: false
      });
    });

    it('should merge with existing options', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify({
        defaultBrowser: 'chromium',
        browsersInstalled: true,
        lastUsedOptions: {
          headless: true,
          devtools: true
        }
      }));

      await BrowserConfig.saveLastUsedOptions({
        headless: false
      });

      const savedConfig = JSON.parse(
        vi.mocked(writeFileSync).mock.calls[0][1] as string
      );

      expect(savedConfig.lastUsedOptions).toEqual({
        headless: false,
        devtools: true // Preserved from existing
      });
    });
  });
});
