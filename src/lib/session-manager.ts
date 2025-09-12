import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

import { BrowserHelper } from './browser-helper';
import { PlatformHelper } from './platform-helper';

const CLAUDE_DIR = PlatformHelper.getClaudeDir();
const SESSIONS_DIR = join(CLAUDE_DIR, 'playwright-sessions');

export interface SessionData {
  name: string;
  createdAt: string;
  updatedAt: string;
  url: string;
  port: number;
  cookies: any[];
  localStorage: Record<string, any>;
  sessionStorage: Record<string, any>;
  viewportSize?: { width: number; height: number };
  userAgent?: string;
  metadata?: {
    description?: string;
    tags?: string[];
  };
}

export class SessionManager {
  private static ensureSessionsDir() {
    PlatformHelper.getOrCreateClaudeDir();
    if (!existsSync(SESSIONS_DIR)) {
      mkdirSync(SESSIONS_DIR, { recursive: true });
    }
  }

  static getSessionPath(name: string): string {
    return join(SESSIONS_DIR, `${name}.json`);
  }

  static async saveSession(name: string, port: number = 9222, description?: string): Promise<void> {
    this.ensureSessionsDir();

    try {
      await BrowserHelper.withBrowser(port, async (browser) => {
        const contexts = browser.contexts();
        if (contexts.length === 0) {
          throw new Error('No browser context found');
        }

        const context = contexts[0];
        const pages = context.pages();
        if (pages.length === 0) {
          throw new Error('No pages found in browser');
        }

        const page = pages[0];

        // Get current state
        const url = page.url();
        const cookies = await context.cookies();
        const viewportSize = page.viewportSize();
        const userAgent = await page.evaluate(() => {
          const win = (globalThis as any).window;
          return win.navigator.userAgent;
        });

        // Get localStorage and sessionStorage
        const localStorage = await page.evaluate(() => {
          const storage: Record<string, any> = {};
          const win = (globalThis as any).window;
          for (let i = 0; i < win.localStorage.length; i++) {
            const key = win.localStorage.key(i);
            if (key) {
              storage[key] = win.localStorage.getItem(key);
            }
          }
          return storage;
        });

        const sessionStorage = await page.evaluate(() => {
          const storage: Record<string, any> = {};
          const win = (globalThis as any).window;
          for (let i = 0; i < win.sessionStorage.length; i++) {
            const key = win.sessionStorage.key(i);
            if (key) {
              storage[key] = win.sessionStorage.getItem(key);
            }
          }
          return storage;
        });

        const sessionData: SessionData = {
          name,
          createdAt: existsSync(this.getSessionPath(name)) ?
            JSON.parse(readFileSync(this.getSessionPath(name), 'utf-8')).createdAt :
            new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          url,
          port,
          cookies,
          localStorage,
          sessionStorage,
          viewportSize: viewportSize || undefined,
          userAgent,
          metadata: {
            description
          }
        };

        writeFileSync(this.getSessionPath(name), JSON.stringify(sessionData, null, 2));
      });
    } catch (error: any) {
      throw new Error(`Failed to save session: ${error.message}`);
    }
  }

  static async loadSession(name: string, port: number = 9222): Promise<void> {
    const sessionPath = this.getSessionPath(name);

    if (!existsSync(sessionPath)) {
      throw new Error(`Session '${name}' not found`);
    }

    try {
      const sessionData: SessionData = JSON.parse(readFileSync(sessionPath, 'utf-8'));

      await BrowserHelper.withBrowser(port, async (browser) => {
        const contexts = browser.contexts();
        const context = contexts.length > 0 ? contexts[0] : await browser.newContext();

        // Set cookies
        if (sessionData.cookies.length > 0) {
          await context.addCookies(sessionData.cookies);
        }

        // Set viewport if available
        const pages = context.pages();
        const page = pages.length > 0 ? pages[0] : await context.newPage();

        if (sessionData.viewportSize) {
          await page.setViewportSize(sessionData.viewportSize);
        }

        // Navigate to saved URL
        await page.goto(sessionData.url);

        // Restore localStorage
        if (sessionData.localStorage && Object.keys(sessionData.localStorage).length > 0) {
          await page.evaluate((localStorage) => {
            const win = (globalThis as any).window;
            for (const [key, value] of Object.entries(localStorage)) {
              if (value !== null) {
                win.localStorage.setItem(key, String(value));
              }
            }
          }, sessionData.localStorage);
        }

        // Restore sessionStorage
        if (sessionData.sessionStorage && Object.keys(sessionData.sessionStorage).length > 0) {
          await page.evaluate((sessionStorage) => {
            const win = (globalThis as any).window;
            for (const [key, value] of Object.entries(sessionStorage)) {
              if (value !== null) {
                win.sessionStorage.setItem(key, String(value));
              }
            }
          }, sessionData.sessionStorage);
        }

        // Refresh to apply storage changes
        await page.reload();
      });
    } catch (error: any) {
      throw new Error(`Failed to load session: ${error.message}`);
    }
  }

  static listSessions(): SessionData[] {
    this.ensureSessionsDir();

    try {
      const files = readdirSync(SESSIONS_DIR).filter(file => file.endsWith('.json'));
      const sessions: SessionData[] = [];

      for (const file of files) {
        try {
          const sessionData: SessionData = JSON.parse(readFileSync(join(SESSIONS_DIR, file), 'utf-8'));
          sessions.push(sessionData);
        } catch {
          // Skip corrupted session files
        }
      }

      // Sort by most recently updated
      return sessions.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    } catch {
      return [];
    }
  }

  static async deleteSession(name: string): Promise<void> {
    const sessionPath = this.getSessionPath(name);

    if (!existsSync(sessionPath)) {
      throw new Error(`Session '${name}' not found`);
    }

    try {
      unlinkSync(sessionPath);
    } catch (error: any) {
      throw new Error(`Failed to delete session: ${error.message}`);
    }
  }

  static sessionExists(name: string): boolean {
    return existsSync(this.getSessionPath(name));
  }
}
