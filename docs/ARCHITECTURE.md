# Playwright CLI - Architecture Documentation

## Overview

The Playwright CLI is a command-line tool for browser automation built with TypeScript and Node.js. The architecture implements several design patterns to ensure maintainability, testability, and extensibility.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Entry Point                             │
│                    src/index.ts                               │
└─────────────────┬───────────────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────────────┐
│                   Command Layer                               │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐ │
│  │ CommandBase      │  │ Legacy Commands  │  │ New Commands │ │
│  │ (Template Method)│  │ (Direct impl.)   │  │ (Validated)  │ │
│  └──────────────────┘  └──────────────────┘  └──────────────┘ │
└─────────────────┬───────────────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────────────┐
│                  Service Layer                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │            Dependency Injection Container                │  │
│  │  ┌─────────────────────┐  ┌─────────────────────────┐   │  │
│  │  │   IBrowserService   │  │   RetryStrategy        │   │  │
│  │  │   (Interface)       │  │   (Strategy Pattern)    │   │  │
│  │  └─────────────────────┘  └─────────────────────────┘   │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────┬───────────────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────────────┐
│                 Infrastructure Layer                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐ │
│  │ BrowserHelper│  │ Logger       │  │ Performance Monitor  │ │
│  │              │  │ (Winston)    │  │                      │ │
│  └──────────────┘  └──────────────┘  └──────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Design Patterns Implemented

### 1. Template Method Pattern

**Location**: `src/lib/command-base.ts`

The `CommandBase` abstract class defines the skeleton of command execution with customizable steps:

```typescript
abstract class CommandBase {
  // Template method
  private async executeWithErrorHandling(args: any[], options: any): Promise<void> {
    this.performanceTracker = performanceMonitor.startTracking(this.command.name());
    
    try {
      await this.preExecute(args, options);    // Hook
      await this.execute(args, options);       // Abstract method
      await this.postExecute(args, options);   // Hook
      
      this.performanceTracker.end(true);
    } catch (error) {
      this.performanceTracker?.end(false, error.message);
      throw error;
    }
  }

  // Hooks for subclasses
  protected async preExecute(args: any[], options: any): Promise<void> {}
  protected async postExecute(args: any[], options: any): Promise<void> {}
  
  // Abstract method that subclasses must implement
  protected abstract execute(args: any[], options: any): Promise<void>;
}
```

**Benefits**:
- Consistent error handling across all commands
- Performance tracking for all operations
- Extensible hooks for pre/post processing
- Eliminates code duplication

### 2. Dependency Injection Pattern

**Location**: `src/lib/di-container.ts`, `src/lib/browser-service.ts`

Implements a simple DI container for managing service dependencies:

```typescript
// Service interface
export interface IBrowserService {
  getBrowser(port?: number): Promise<Browser>;
  withActivePage<T>(port: number, action: (page: Page) => Promise<T>): Promise<T>;
  // ... other methods
}

// DI Container
export class DIContainer {
  private services = new Map<symbol, any>();
  private factories = new Map<symbol, () => any>();
  
  register<T>(token: symbol, instance: T): void { /* ... */ }
  resolve<T>(token: symbol): T { /* ... */ }
}

// Usage in CommandBase
constructor(name: string, description: string, browserService?: IBrowserService) {
  this.browserService = browserService || container.resolve<IBrowserService>(SERVICE_TYPES.BrowserService);
}
```

**Benefits**:
- Easy mocking for tests
- Loose coupling between components
- Service substitution without code changes
- Better testability

### 3. Strategy Pattern

**Location**: `src/lib/retry-strategy.ts`

Implements different retry strategies with circuit breaker functionality:

```typescript
// Strategy interface
export abstract class RetryStrategy {
  abstract calculateDelay(attempt: number): number;
  
  async execute<T>(operation: RetryableOperation<T>): Promise<T> {
    // Common retry logic with circuit breaker
  }
}

// Concrete strategies
export class ExponentialRetryStrategy extends RetryStrategy {
  calculateDelay(attempt: number): number {
    return Math.min(this.config.baseDelayMs * Math.pow(2, attempt - 1), this.config.maxDelayMs);
  }
}

export class LinearRetryStrategy extends RetryStrategy {
  calculateDelay(attempt: number): number {
    return Math.min(this.config.baseDelayMs * attempt, this.config.maxDelayMs);
  }
}

// Strategy factory
export class RetryStrategyFactory {
  static create(type: 'linear' | 'exponential' | 'fixed', config: RetryConfig): RetryStrategy {
    switch (type) {
      case 'exponential': return new ExponentialRetryStrategy(config);
      case 'linear': return new LinearRetryStrategy(config);
      case 'fixed': return new FixedRetryStrategy(config);
    }
  }
}
```

**Benefits**:
- Different retry behaviors for different operations
- Circuit breaker prevents cascading failures
- Performance metrics for monitoring
- Easy to add new retry strategies

### 4. Decorator Pattern + Chain of Responsibility

**Location**: `src/lib/decorators.ts`, `src/lib/validation.ts`

Implements parameter validation through decorators and validation chains:

```typescript
// Decorator for validation
export function ValidateSelector(required = true, message?: string) {
  return validate(Validators.selector({ required, message }));
}

// Method decorator that processes validation chain
export function validateParams(target: any, propertyName: string, descriptor: PropertyDescriptor) {
  const method = descriptor.value;
  
  descriptor.value = async function (...args: any[]) {
    const validators = validationMetadata.get(target.constructor.prototype) || {};
    
    // Apply validation chain
    for (const [paramName, validatorList] of Object.entries(validators)) {
      // Chain of responsibility: each validator processes in sequence
    }
    
    return method.apply(this, args);
  };
}

// Usage in commands
class NavigateValidatedCommand extends CommandBase {
  protected async execute(
    @ValidateUrl(true) url: string,
    @ValidatePort() port: string
  ): Promise<void> {
    // Method automatically validates parameters before execution
  }
}
```

**Benefits**:
- Declarative parameter validation
- Composable validation rules
- Automatic error handling
- Input sanitization

### 5. Observer Pattern (Performance Monitoring)

**Location**: `src/lib/performance-monitor.ts`

Tracks command execution metrics:

```typescript
export class PerformanceMonitor {
  private trackers = new Map<string, PerformanceTracker>();
  
  startTracking(commandName: string): PerformanceTracker {
    const tracker = new PerformanceTracker(commandName);
    this.trackers.set(commandName, tracker);
    return tracker;
  }
  
  getMetrics(): PerformanceMetrics[] {
    return Array.from(this.trackers.values()).map(t => t.getMetrics());
  }
}

export class PerformanceTracker {
  private startTime = performance.now();
  
  end(success: boolean, errorMessage?: string): void {
    this.endTime = performance.now();
    this.duration = this.endTime - this.startTime;
    this.success = success;
    this.errorMessage = errorMessage;
    
    // Emit metrics or log performance data
    logger.debug(`Command ${this.commandName} took ${this.duration}ms`);
  }
}
```

### 6. Adapter Pattern

**Location**: `src/lib/di-container.ts` (BrowserHelperAdapter)

Adapts existing BrowserHelper class to implement IBrowserService interface:

```typescript
class BrowserHelperAdapter implements IBrowserService {
  async getBrowser(port = 9222): Promise<any> {
    return BrowserHelper.getBrowser(port);
  }

  async withActivePage<T>(port: number, action: (page: any) => Promise<T>): Promise<T> {
    return BrowserHelper.withActivePage(port, action);
  }
  // ... other methods
}
```

## Command Evolution Pattern

The codebase demonstrates a migration from legacy commands to modern, validated commands:

### Legacy Commands
- Direct implementation without base class
- Manual error handling
- Inconsistent patterns
- Hard to test

### Modern Commands (Validated)
- Inherit from `CommandBase`
- Automatic validation via decorators
- Consistent error handling and performance tracking
- Dependency injection for easy testing

```typescript
// Legacy command (src/commands/click.ts)
export async function clickCommand(selector: string, options: any) {
  try {
    const page = await BrowserHelper.getActivePage(options.port);
    await page.click(selector);
    console.log('Clicked successfully');
  } catch (error) {
    console.error('Click failed:', error.message);
  }
}

// Modern command (src/commands/click-validated.ts)
export class ClickValidatedCommand extends CommandBase {
  protected async execute(
    @ValidateSelector() selector: string,
    options: any
  ): Promise<void> {
    await this.withActivePage(this.parsePort(options), async page => {
      const { actualSelector } = await this.resolveRefSelector(selector, page);
      await page.click(actualSelector);
      this.succeedSpinner(`Clicked on ${selector}`);
    });
  }
}
```

## Quality Assurance Architecture

### Testing Strategy
- **Unit Tests**: Individual functions and classes (`src/**/__tests__/*.test.ts`)
- **Integration Tests**: Command execution with mock browser (`src/commands/__tests__/*.test.ts`)
- **Test Utilities**: Shared mocks and fixtures (`src/__tests__/fixtures/`)

### Code Quality Tools
- **ESLint**: Static analysis with TypeScript rules
- **Prettier**: Code formatting
- **Husky**: Pre-commit hooks
- **TypeScript**: Strict mode enabled

### CI/CD Pipeline
```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  test:
    strategy:
      matrix:
        node-version: [18, 20, 22]
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck  
      - run: npm test
      - run: npm run build
```

## Logging Architecture

### Structured Logging with Winston

```typescript
// src/lib/logger.ts
class Logger {
  private winston: winston.Logger;
  
  constructor() {
    this.winston = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      transports: [
        new winston.transports.Console({ format: cliFormat }),
        ...(process.env.LOG_FILE ? [
          new winston.transports.File({ 
            filename: process.env.LOG_FILE, 
            format: fileFormat 
          })
        ] : [])
      ]
    });
  }
  
  // Colored console output for CLI
  // JSON format for file logging
  // Different log levels: error, warn, info, debug
}
```

## Project Structure

```
src/
├── commands/           # Command implementations
│   ├── __tests__/     # Command integration tests
│   ├── *.ts           # Legacy commands
│   └── *-validated.ts # Modern commands with validation
├── lib/               # Core library code
│   ├── __tests__/     # Unit tests
│   ├── command-base.ts        # Template method base class
│   ├── di-container.ts        # Dependency injection
│   ├── browser-service.ts     # Browser abstraction
│   ├── retry-strategy.ts      # Strategy pattern implementation
│   ├── decorators.ts          # Validation decorators
│   ├── validation.ts          # Validation utilities
│   ├── logger.ts             # Winston logging
│   └── performance-monitor.ts # Performance tracking
├── __tests__/         # Global test utilities
│   ├── fixtures/      # Test data and mocks
│   └── setup.ts       # Test configuration
├── index.ts          # CLI entry point
└── executor.ts       # Command dispatcher
```

## Key Architectural Decisions

### ADR-001: Template Method for Commands
**Decision**: Use Template Method pattern for consistent command execution flow

**Context**: Commands needed consistent error handling, performance tracking, and lifecycle hooks

**Consequences**:
- ✅ Eliminates boilerplate code
- ✅ Consistent behavior across commands
- ✅ Easy to add cross-cutting concerns
- ❌ Requires inheritance (composition alternative considered)

### ADR-002: Dependency Injection Container
**Decision**: Implement custom DI container instead of using external library

**Context**: Need testable browser service abstraction without heavy dependencies

**Consequences**:
- ✅ No external dependencies
- ✅ Simple and focused on our needs
- ✅ Easy to mock services in tests
- ❌ Less feature-rich than mature DI libraries

### ADR-003: Strategy Pattern for Retry Logic
**Decision**: Implement different retry strategies with circuit breaker

**Context**: Different operations need different retry behaviors

**Consequences**:
- ✅ Flexible retry configurations
- ✅ Circuit breaker prevents cascading failures
- ✅ Performance metrics for monitoring
- ❌ Additional complexity for simple cases

### ADR-004: Decorator Pattern for Validation
**Decision**: Use decorators for parameter validation instead of manual validation

**Context**: Commands have complex parameter validation requirements

**Consequences**:
- ✅ Declarative and reusable validation rules
- ✅ Automatic error handling
- ✅ Input sanitization
- ❌ Requires understanding of decorator pattern
- ❌ Debugging can be more complex

## Migration Guide

### From Legacy to Modern Commands

1. **Extend CommandBase**:
   ```typescript
   export class MyCommand extends CommandBase {
     constructor() {
       super('my-command', 'Command description');
     }
   }
   ```

2. **Implement required methods**:
   ```typescript
   protected setupCommand(): void {
     this.command
       .argument('<arg>', 'Argument description')
       .option('-o, --option <value>', 'Option description');
   }

   protected async execute(args: any[], options: any): Promise<void> {
     // Command logic here
   }
   ```

3. **Add validation**:
   ```typescript
   const validationSchema = {
     arg: [Validators.required(), Validators.string(1, 100)],
     option: [Validators.port()]
   };
   
   const { isValid, errors, sanitizedData } = ValidationUtils.validateObject(
     { arg: args[0], option: options.option },
     validationSchema
   );
   ```

4. **Use base class utilities**:
   ```typescript
   this.startSpinner('Processing...');
   await this.withActivePage(port, async page => {
     // Browser operations
   });
   this.succeedSpinner('Completed successfully');
   ```

## Testing Architecture

### Unit Test Structure
```typescript
describe('CommandBase', () => {
  let mockBrowserService: MockBrowserService;
  
  beforeEach(() => {
    mockBrowserService = new MockBrowserService();
    setupTestServices(null, null);
  });
  
  it('should execute command with performance tracking', async () => {
    // Test implementation
  });
});
```

### Integration Test Structure
```typescript
describe('ClickValidatedCommand', () => {
  it('should validate parameters before clicking', async () => {
    const command = new ClickValidatedCommand();
    
    await expect(
      command.execute([''], {})
    ).rejects.toThrow(ValidationError);
  });
});
```

## Performance Considerations

- **Lazy Loading**: Services created on first use via factory functions
- **Connection Reuse**: Browser connections maintained across commands
- **Retry Logic**: Exponential backoff prevents overwhelming failing services
- **Circuit Breaker**: Prevents cascading failures
- **Performance Monitoring**: Tracks command execution times and success rates

## Security Considerations

- **Input Validation**: All user inputs validated and sanitized
- **HTML Escaping**: User-provided selectors escaped to prevent injection
- **URL Normalization**: URLs automatically prefixed with https:// if no protocol
- **Error Sanitization**: Error messages sanitized before display

## Future Extensibility

The architecture supports easy extension:

1. **New Commands**: Extend CommandBase and implement required methods
2. **New Retry Strategies**: Implement RetryStrategy interface
3. **New Validators**: Add to Validators utility class
4. **New Services**: Register in DI container
5. **New Decorators**: Follow existing decorator patterns

This architecture provides a solid foundation for a maintainable, testable, and extensible CLI tool while demonstrating modern software engineering practices.