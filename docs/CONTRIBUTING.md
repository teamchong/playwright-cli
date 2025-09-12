# Contributing to Playwright CLI

## Overview

This document provides guidelines for contributing to the Playwright CLI project. We follow modern software engineering practices and maintain high code quality standards.

## Architecture Guidelines

### Design Patterns

The codebase implements several key design patterns. Please follow these when adding new features:

#### 1. Template Method Pattern (Commands)

All new commands should extend `CommandBase`:

```typescript
import { CommandBase } from '../lib/command-base';

export class MyCommand extends CommandBase {
  constructor() {
    super('my-command', 'Description of what this command does');
  }

  protected setupCommand(): void {
    this.command
      .argument('<required-arg>', 'Description of required argument')
      .option('-o, --optional <value>', 'Description of optional flag', 'default-value');
  }

  protected async execute(args: any[], options: any): Promise<void> {
    // Your command logic here
    const [requiredArg] = args;
    const { optional } = options;

    this.startSpinner('Processing...');
    
    await this.withActivePage(this.parsePort(options), async page => {
      // Browser operations
    });

    this.succeedSpinner('Operation completed successfully');
  }
}
```

#### 2. Dependency Injection Pattern

Use the DI container for testable services:

```typescript
// Use injected browser service
await this.withActivePage(port, async page => {
  // Operations using injected service
});

// For testing, provide mock service in constructor
constructor(name: string, description: string, browserService?: IBrowserService) {
  super(name, description, browserService);
}
```

#### 3. Validation Decorators

Add parameter validation to all commands:

```typescript
import { ValidationUtils, Validators, ValidationError } from '../lib/validation';

protected async execute(args: any[], options: any): Promise<void> {
  const [url] = args;
  const { port, timeout } = options;
  
  // Define validation schema
  const validationSchema = {
    url: [Validators.url({ required: true })],
    port: [Validators.port({ required: false })],
    timeout: [Validators.timeout({ required: false })]
  };
  
  // Validate parameters
  const { isValid, errors, sanitizedData } = ValidationUtils.validateObject(
    { url, port, timeout },
    validationSchema
  );
  
  if (!isValid) {
    const errorMessages = Object.entries(errors)
      .flatMap(([field, fieldErrors]) => 
        fieldErrors.map(error => `${field}: ${error}`)
      );
    throw new ValidationError(errorMessages);
  }

  // Use sanitized data
  const cleanUrl = sanitizedData.url || url;
  // ... rest of command logic
}
```

#### 4. Retry Strategy Pattern

Use appropriate retry strategies for different operations:

```typescript
// Browser connection operations
await this.withBrowserRetry(port, async browser => {
  // Browser-level operations
});

// Page interaction operations  
await this.withActivePageRetry(port, async page => {
  // Page-level operations
});

// Custom retry strategy
this.configureRetryStrategy('exponential', 'network');
await this.withRetry(async () => {
  // Custom operation
}, 'network');
```

### Code Quality Standards

#### TypeScript Guidelines

1. **Enable Strict Mode**: All code must compile with TypeScript strict mode
2. **Explicit Types**: Avoid `any` and `unknown` unless absolutely necessary
3. **Return Types**: Always specify return types for public methods
4. **Null Safety**: Use optional chaining and nullish coalescing appropriately

```typescript
// Good
public async execute(args: string[], options: CommandOptions): Promise<void> {
  const page = await this.getActivePage(options.port);
  const title = await page?.title() ?? 'Unknown';
}

// Bad
public async execute(args: any, options: any): Promise<any> {
  const page = await this.getActivePage(options.port);
  const title = await page.title();
}
```

#### Testing Requirements

Every new feature must include comprehensive tests:

1. **Unit Tests**: Test individual functions and classes
2. **Integration Tests**: Test command execution end-to-end
3. **Coverage**: Maintain minimum 80% code coverage

```typescript
// Unit test example
describe('ValidationUtils', () => {
  it('should validate URL correctly', () => {
    const result = ValidationUtils.validateUrl('https://example.com');
    expect(result.isValid).toBe(true);
  });

  it('should reject invalid URL', () => {
    const result = ValidationUtils.validateUrl('not-a-url');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Invalid URL format');
  });
});

// Integration test example
describe('NavigateCommand', () => {
  let mockBrowserService: MockBrowserService;

  beforeEach(() => {
    mockBrowserService = new MockBrowserService();
    setupTestServices(null, mockBrowserService);
  });

  it('should navigate to URL successfully', async () => {
    const command = new NavigateCommand();
    await expect(command.execute(['https://example.com'], {})).resolves.toBeUndefined();
  });
});
```

#### Error Handling

Follow consistent error handling patterns:

```typescript
// Use ValidationError for parameter validation
if (!isValid) {
  throw new ValidationError(errorMessages);
}

// Let base class handle browser errors
// CommandBase will catch and format appropriately
await this.withActivePage(port, async page => {
  // Operations that might throw browser errors
});

// For custom errors, provide helpful messages
if (!elementFound) {
  throw new Error(`Element not found: ${selector}. Make sure the page has loaded and the selector is correct.`);
}
```

#### Logging Guidelines

Use structured logging throughout:

```typescript
import { logger } from '../lib/logger';

// Use appropriate log levels
logger.info('Command started');
logger.debug('Detailed debugging information');
logger.warn('Something might be wrong');
logger.error('Something definitely went wrong', error);

// Use base class logging methods in commands
this.logSuccess('Operation completed');
this.logInfo('Additional details');
this.logWarning('Potential issue detected');
```

## Development Workflow

### Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Run tests**:
   ```bash
   npm test
   npm run test:coverage
   ```

3. **Lint and format**:
   ```bash
   npm run lint
   npm run format:check
   npm run format:fix
   ```

4. **Type checking**:
   ```bash
   npm run typecheck
   ```

### Before Submitting

1. **All tests pass**: `npm test`
2. **No linting errors**: `npm run lint`
3. **Code formatted**: `npm run format:check`
4. **TypeScript compiles**: `npm run typecheck`
5. **Coverage maintained**: Check coverage report
6. **Documentation updated**: Update README if needed

### Pre-commit Hooks

The project uses Husky for pre-commit hooks that automatically:
- Run Prettier formatting
- Check linting
- Run type checking
- Run tests

### Commit Message Format

Follow conventional commit format:

```
type(scope): description

[optional body]

[optional footer]
```

**Types**:
- `feat`: New features
- `fix`: Bug fixes
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Test additions or changes
- `chore`: Build system or tool changes

**Examples**:
```
feat(commands): add screenshot command with validation

Add new screenshot command that extends CommandBase and includes
parameter validation for file paths and image formats.

Closes #123
```

```
fix(retry): handle undefined lastError in retry strategy

Initialize lastError variable to prevent undefined reference
in retry failure messages.
```

## File Structure Guidelines

### Command Files

Place command files in appropriate directories:

```
src/commands/
├── legacy-command.ts          # Legacy commands (being migrated)
├── modern-command.ts          # Modern commands with validation
├── __tests__/                 # Command integration tests
│   ├── modern-command.test.ts
│   └── command-test-utils.ts  # Shared test utilities
```

### Library Code

Organize library code by functionality:

```
src/lib/
├── command-base.ts            # Base class for commands
├── di-container.ts            # Dependency injection
├── retry-strategy.ts          # Retry pattern implementation
├── validation.ts              # Validation utilities
├── decorators.ts              # Validation decorators
├── logger.ts                  # Logging service
├── performance-monitor.ts     # Performance tracking
└── __tests__/                 # Unit tests
    ├── validation.test.ts
    ├── retry-strategy.test.ts
    └── test-helpers.ts        # Test utilities
```

### Test Files

Follow consistent naming and structure:

```typescript
// Unit test: src/lib/__tests__/validation.test.ts
import { describe, it, expect } from 'vitest';
import { ValidationUtils } from '../validation';

describe('ValidationUtils', () => {
  describe('validateUrl', () => {
    it('should accept valid HTTP URL', () => {
      // Test implementation
    });

    it('should accept valid HTTPS URL', () => {
      // Test implementation
    });

    it('should reject invalid URL format', () => {
      // Test implementation
    });
  });
});

// Integration test: src/commands/__tests__/navigate.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { NavigateCommand } from '../navigate';
import { setupTestServices, MockBrowserService } from '../../__tests__/fixtures/common-fixtures';

describe('NavigateCommand', () => {
  let mockBrowserService: MockBrowserService;

  beforeEach(() => {
    mockBrowserService = new MockBrowserService();
    setupTestServices(null, mockBrowserService);
  });

  it('should navigate to valid URL', async () => {
    // Integration test implementation
  });
});
```

## Performance Guidelines

### Browser Operations

1. **Connection Reuse**: Use `withActivePage()` and `withBrowser()` methods that manage connections
2. **Retry Logic**: Use appropriate retry strategies for different operation types
3. **Timeouts**: Always specify reasonable timeouts for operations
4. **Resource Cleanup**: Browser connections are automatically managed by base class

### Memory Management

1. **Avoid Memory Leaks**: Don't store references to browser objects
2. **Dispose Resources**: Use try/finally blocks for explicit cleanup if needed
3. **Limit Concurrency**: Don't create too many concurrent browser connections

### Testing Performance

1. **Mock Heavy Operations**: Use `MockBrowserService` for unit tests
2. **Parallel Tests**: Tests run in parallel by default with Vitest
3. **Selective Testing**: Use `test.only()` during development, remove before commit

## Documentation Standards

### JSDoc Comments

All public APIs must have JSDoc comments:

```typescript
/**
 * Navigate to a specified URL with optional wait conditions.
 * 
 * @param url - The URL to navigate to (will be normalized with https:// if no protocol)
 * @param options - Navigation options including port and wait conditions
 * @returns Promise that resolves when navigation is complete
 * 
 * @example
 * ```typescript
 * await navigateCommand(['https://example.com'], { port: 9222, waitUntil: 'load' });
 * ```
 * 
 * @throws {ValidationError} When URL format is invalid
 * @throws {Error} When browser connection fails
 */
public async execute(args: string[], options: NavigateOptions): Promise<void> {
  // Implementation
}
```

### README Updates

Update README.md when adding:
- New commands
- New CLI options
- Configuration changes
- Installation requirements

### Architecture Documentation

Update architecture docs when:
- Adding new design patterns
- Making architectural decisions
- Changing core interfaces
- Adding new ADRs

## Common Patterns

### Adding a New Command

1. **Create command class**:
   ```typescript
   export class MyCommand extends CommandBase {
     // Implementation following patterns above
   }
   ```

2. **Add tests**:
   ```typescript
   // Unit tests for validation
   // Integration tests for command execution
   ```

3. **Export command**:
   ```typescript
   export const myCommand = new MyCommand().getCommand();
   ```

4. **Register in index**:
   ```typescript
   program.addCommand(myCommand);
   ```

### Adding Validation Rules

1. **Add validator function**:
   ```typescript
   export const myValidator = (options?: ValidationOptions): ValidatorFunction => {
     return (value: any) => {
       // Validation logic
       return { isValid: true/false, error?: string };
     };
   };
   ```

2. **Add to Validators utility**:
   ```typescript
   export class Validators {
     static myValidator = myValidator;
   }
   ```

3. **Add decorator** (optional):
   ```typescript
   export function ValidateMyThing(required = false, message?: string) {
     return validate(Validators.myValidator({ required, message }));
   }
   ```

### Adding New Services

1. **Define interface**:
   ```typescript
   export interface IMyService {
     doSomething(): Promise<Result>;
   }
   ```

2. **Implement service**:
   ```typescript
   export class MyService implements IMyService {
     async doSomething(): Promise<Result> {
       // Implementation
     }
   }
   ```

3. **Create mock for testing**:
   ```typescript
   export class MockMyService implements IMyService {
     async doSomething(): Promise<Result> {
       // Mock implementation
     }
   }
   ```

4. **Register in DI container**:
   ```typescript
   export const SERVICE_TYPES = {
     MyService: Symbol.for('MyService'),
   };
   ```

## Getting Help

1. **Architecture Questions**: Review `docs/ARCHITECTURE.md` and ADRs
2. **Code Patterns**: Look at existing commands for examples
3. **Testing**: Check `src/**/__tests__` for test patterns
4. **Issues**: Create GitHub issue with detailed description

## Review Process

1. **Self Review**: Check your code against this guide
2. **Automated Checks**: Ensure CI passes
3. **Peer Review**: Address feedback constructively
4. **Documentation**: Update docs if needed

Remember: The goal is maintainable, testable code that follows established patterns. When in doubt, look at existing implementations and follow the same patterns.