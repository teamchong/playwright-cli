import { describe, it, expect } from 'vitest';
import type {
  // Base types
  BaseCommandOptions,
  BrowserOptions,
  SelectorOptions,
  ModifierOptions,
  
  // Command-specific types
  ClickOptions,
  TypeOptions,
  FillOptions,
  NavigateOptions,
  ScreenshotOptions,
  ResizeOptions,
  EvalOptions,
  SessionOptions,
  TabOptions,
  PDFOptions,
  WaitOptions,
  DialogOptions,
  ConsoleOptions,
  NetworkOptions,
  PerfOptions,
  CodegenOptions,
  TestOptions,
  InstallOptions,
  DragOptions,
  UploadOptions,
  SelectOptions,
  PressOptions,
  NavigationHistoryOptions,
  CloseOptions,
  OpenOptions,
  SnapshotOptions,
  ListOptions,
  ExecuteOptions,
  ClaudeOptions,
  
  // Union types
  NavigationCommandOptions,
  InteractionCommandOptions,
  CaptureCommandOptions,
  AdvancedCommandOptions,
  UtilityCommandOptions,
  AnyCommandOptions,
  
  // Data structures
  SessionData,
  CommandMetrics,
  DetailedBrowserState,
  EnhancedElementRef,
  CommandExecutionError,
  CLIConfig,
  CLIPlugin
} from '../types';

describe('Type Definitions', () => {
  describe('Base Types', () => {
    it('should define BaseCommandOptions correctly', () => {
      const options: BaseCommandOptions = {
        port: 9222,
        verbose: true,
        quiet: false,
        json: false,
        color: true
      };
      
      expect(options.port).toBe(9222);
      expect(options.verbose).toBe(true);
    });

    it('should extend BaseCommandOptions in BrowserOptions', () => {
      const options: BrowserOptions = {
        port: 9222,
        timeout: 5000,
        force: true
      };
      
      expect(options.port).toBe(9222);
      expect(options.timeout).toBe(5000);
    });

    it('should extend BrowserOptions in SelectorOptions', () => {
      const options: SelectorOptions = {
        port: 9222,
        selector: '#button',
        timeout: 3000
      };
      
      expect(options.selector).toBe('#button');
      expect(options.port).toBe(9222);
    });
  });

  describe('Navigation Command Types', () => {
    it('should define NavigateOptions correctly', () => {
      const options: NavigateOptions = {
        port: 9222,
        url: 'https://example.com',
        waitUntil: 'networkidle',
        timeout: 10000
      };
      
      expect(options.url).toBe('https://example.com');
      expect(options.waitUntil).toBe('networkidle');
    });

    it('should define OpenOptions correctly', () => {
      const options: OpenOptions = {
        port: 9222,
        newTab: true,
        device: 'iPhone 12',
        geolocation: '40.7128,-74.0060'
      };
      
      expect(options.newTab).toBe(true);
      expect(options.device).toBe('iPhone 12');
    });

    it('should define WaitOptions correctly', () => {
      const options: WaitOptions = {
        port: 9222,
        selector: '.loading',
        state: 'hidden',
        timeout: 5000
      };
      
      expect(options.selector).toBe('.loading');
      expect(options.state).toBe('hidden');
    });
  });

  describe('Interaction Command Types', () => {
    it('should define ClickOptions correctly', () => {
      const options: ClickOptions = {
        port: 9222,
        selector: 'button',
        double: true,
        shift: true,
        timeout: 5000
      };
      
      expect(options.selector).toBe('button');
      expect(options.double).toBe(true);
    });

    it('should define FillOptions correctly', () => {
      const options: FillOptions = {
        port: 9222,
        fields: ['#email=test@example.com', '#password=secret']
      };
      
      expect(options.fields).toHaveLength(2);
      expect(options.fields[0]).toBe('#email=test@example.com');
    });

    it('should define DragOptions correctly', () => {
      const options: DragOptions = {
        port: 9222,
        selector: '.draggable',
        target: '.drop-zone',
        timeout: 5000,
        delay: 100
      };
      
      expect(options.selector).toBe('.draggable');
      expect(options.target).toBe('.drop-zone');
    });

    it('should define UploadOptions correctly', () => {
      const options: UploadOptions = {
        port: 9222,
        selector: 'input[type="file"]',
        files: ['/path/to/file1.txt', '/path/to/file2.pdf'],
        timeout: 5000
      };
      
      expect(options.files).toHaveLength(2);
      expect(options.selector).toBe('input[type="file"]');
    });
  });

  describe('Capture Command Types', () => {
    it('should define ScreenshotOptions correctly', () => {
      const options: ScreenshotOptions = {
        port: 9222,
        path: 'screenshot.png',
        fullPage: true,
        quality: 90,
        type: 'jpeg'
      };
      
      expect(options.path).toBe('screenshot.png');
      expect(options.fullPage).toBe(true);
    });

    it('should define PDFOptions correctly', () => {
      const options: PDFOptions = {
        port: 9222,
        path: 'document.pdf',
        format: 'A4',
        landscape: true,
        printBackground: true,
        margin: {
          top: '1in',
          right: '1in',
          bottom: '1in',
          left: '1in'
        }
      };
      
      expect(options.format).toBe('A4');
      expect(options.landscape).toBe(true);
      expect(options.margin?.top).toBe('1in');
    });

    it('should define ResizeOptions correctly', () => {
      const options: ResizeOptions = {
        port: 9222,
        width: 1920,
        height: 1080
      };
      
      expect(options.width).toBe(1920);
      expect(options.height).toBe(1080);
    });
  });

  describe('Advanced Command Types', () => {
    it('should define EvalOptions correctly', () => {
      const options: EvalOptions = {
        port: 9222,
        expression: 'document.title',
        arg: { test: 'value' }
      };
      
      expect(options.expression).toBe('document.title');
      expect(options.arg).toEqual({ test: 'value' });
    });

    it('should define ConsoleOptions correctly', () => {
      const options: ConsoleOptions = {
        port: 9222,
        filter: 'error',
        follow: true
      };
      
      expect(options.filter).toBe('error');
      expect(options.follow).toBe(true);
    });

    it('should define NetworkOptions correctly', () => {
      const options: NetworkOptions = {
        port: 9222,
        filter: '*.api.example.com',
        method: 'POST',
        status: 200
      };
      
      expect(options.filter).toBe('*.api.example.com');
      expect(options.method).toBe('POST');
    });
  });

  describe('Utility Command Types', () => {
    it('should define CodegenOptions correctly', () => {
      const options: CodegenOptions = {
        port: 9222,
        url: 'https://example.com',
        output: 'test.spec.ts',
        language: 'typescript',
        device: 'Desktop Chrome'
      };
      
      expect(options.language).toBe('typescript');
      expect(options.output).toBe('test.spec.ts');
    });

    it('should define TestOptions correctly', () => {
      const options: TestOptions = {
        port: 9222,
        spec: 'tests/*.spec.ts',
        headed: true,
        debug: false,
        reporter: 'html'
      };
      
      expect(options.spec).toBe('tests/*.spec.ts');
      expect(options.headed).toBe(true);
    });

    it('should define SessionOptions correctly', () => {
      const options: SessionOptions = {
        port: 9222,
        action: 'save',
        name: 'my-session'
      };
      
      expect(options.action).toBe('save');
      expect(options.name).toBe('my-session');
    });
  });

  describe('Union Types', () => {
    it('should accept navigation command options', () => {
      const navigateOpt: NavigationCommandOptions = {
        port: 9222,
        url: 'https://example.com'
      } as NavigateOptions;
      
      const waitOpt: NavigationCommandOptions = {
        port: 9222,
        selector: '.element'
      } as WaitOptions;
      
      expect(navigateOpt.port).toBe(9222);
      expect(waitOpt.port).toBe(9222);
    });

    it('should accept interaction command options', () => {
      const clickOpt: InteractionCommandOptions = {
        port: 9222,
        selector: 'button'
      } as ClickOptions;
      
      const fillOpt: InteractionCommandOptions = {
        port: 9222,
        fields: ['#input=value']
      } as FillOptions;
      
      expect(clickOpt.port).toBe(9222);
      expect(fillOpt.port).toBe(9222);
    });

    it('should accept any command option', () => {
      const clickOpt: AnyCommandOptions = {
        port: 9222,
        selector: 'button'
      } as ClickOptions;
      
      const codegenOpt: AnyCommandOptions = {
        port: 9222,
        language: 'typescript'
      } as CodegenOptions;
      
      expect(clickOpt.port).toBe(9222);
      expect(codegenOpt.port).toBe(9222);
    });
  });

  describe('Data Structures', () => {
    it('should define SessionData correctly', () => {
      const session: SessionData = {
        name: 'test-session',
        description: 'Test session',
        created: '2025-01-13T10:00:00Z',
        url: 'https://example.com',
        cookies: [],
        localStorage: { key: 'value' },
        sessionStorage: { temp: 'data' },
        viewport: { width: 1920, height: 1080 },
        userAgent: 'Mozilla/5.0...'
      };
      
      expect(session.name).toBe('test-session');
      expect(session.viewport.width).toBe(1920);
    });

    it('should define CommandMetrics correctly', () => {
      const metrics: CommandMetrics = {
        commandName: 'click',
        startTime: Date.now(),
        endTime: Date.now() + 1000,
        duration: 1000,
        success: true,
        memoryUsage: { used: 50000000, total: 100000000 },
        networkRequests: 5,
        elementsFound: 1
      };
      
      expect(metrics.commandName).toBe('click');
      expect(metrics.success).toBe(true);
    });

    it('should define CLIConfig correctly', () => {
      const config: CLIConfig = {
        defaultPort: 9222,
        timeouts: {
          default: 5000,
          navigation: 30000,
          element: 5000
        },
        retries: {
          default: 3,
          browser: 2,
          network: 1
        },
        logging: {
          level: 'info',
          format: 'text'
        },
        browser: {
          headless: true,
          slowMo: 100
        },
        screenshots: {
          onError: true,
          directory: 'screenshots',
          fullPage: true
        }
      };
      
      expect(config.defaultPort).toBe(9222);
      expect(config.browser.headless).toBe(true);
    });
  });

  describe('Error Types', () => {
    it('should define CommandExecutionError correctly', () => {
      const error: CommandExecutionError = {
        name: 'CommandExecutionError',
        message: 'Command failed',
        code: 'ELEMENT_NOT_FOUND',
        command: 'click',
        args: { selector: '#missing' },
        screenshot: '/path/to/error.png',
        suggestions: ['Check if element exists', 'Wait for element to appear']
      };
      
      expect(error.code).toBe('ELEMENT_NOT_FOUND');
      expect(error.suggestions).toHaveLength(2);
    });
  });

  describe('Type Compatibility', () => {
    it('should allow BaseCommandOptions to be used where specific options are expected', () => {
      function processCommand(options: BaseCommandOptions) {
        return options.port;
      }
      
      const clickOptions: ClickOptions = {
        port: 9222,
        selector: 'button'
      };
      
      expect(processCommand(clickOptions)).toBe(9222);
    });

    it('should enforce required properties', () => {
      // This test validates TypeScript compilation, actual runtime test just verifies structure
      const validClick: ClickOptions = {
        port: 9222,
        selector: 'button' // Required
      };
      
      const validNavigate: NavigateOptions = {
        port: 9222,
        url: 'https://example.com' // Required
      };
      
      expect(validClick.selector).toBe('button');
      expect(validNavigate.url).toBe('https://example.com');
    });
  });
});