# Validation System Guide

The validation system provides a comprehensive framework for validating and sanitizing command parameters in the Playwright CLI. It implements the Decorator pattern with Chain of Responsibility for parameter validation.

## Overview

The validation layer consists of:

1. **Core Validation (`validation.ts`)** - Base validators and utilities
2. **Decorators (`decorators.ts`)** - Decorator pattern implementation 
3. **Validation Helper (`validation-helper.ts`)** - Easy integration utilities
4. **Enhanced Error Handling** - Better error messages in `CommandBase`

## Quick Start

### 1. Using ValidationHelper (Recommended)

The easiest way to add validation to existing commands:

```typescript
import { ValidationHelper } from '../lib/validation-helper';
import { ValidationError } from '../lib/validation';

export class MyCommand extends CommandBase {
  protected async execute(args: any[], options: any): Promise<void> {
    const [url, selector] = args;
    const { port, timeout } = options;
    
    // Auto-validate common parameters
    const { isValid, errors, sanitizedParams } = ValidationHelper.validateCommandParams({
      url, selector, port, timeout
    }, { throwOnError: true }); // Throws ValidationError on failure
    
    // Use sanitized parameters
    const cleanUrl = sanitizedParams.url;
    const portNum = sanitizedParams.port;
    
    // ... rest of command logic
  }
}
```

### 2. Using Schema Builder (Advanced)

For custom validation rules:

```typescript
const schema = ValidationHelper.createSchema()
  .url('url', true, 'URL is required')
  .port('port', false)
  .selector('selector', true)
  .enum('waitUntil', ['load', 'domcontentloaded', 'networkidle'])
  .string('text', 1, 1000, true, 'Text must be 1-1000 characters');

const { sanitizedParams } = schema.validate(params, { throwOnError: true });
```

### 3. Using Raw Validators (Low-level)

For maximum control:

```typescript
import { Validators, ValidationUtils } from '../lib/validation';

const validationSchema = {
  url: [Validators.url({ required: true })],
  port: [Validators.port({ required: false })],
  selector: [Validators.selector({ required: true })]
};

const { isValid, errors, sanitizedData } = ValidationUtils.validateObject(
  { url, port, selector },
  validationSchema
);

if (!isValid) {
  throw new ValidationError(Object.values(errors).flat());
}
```

## Built-in Validators

### URL Validator
```typescript
Validators.url({ required: true })
// Validates HTTP/HTTPS URLs
// Sanitizes: Full URL string
```

### Port Validator
```typescript
Validators.port({ required: false })
// Validates port numbers (1-65535)
// Sanitizes: Converts to integer
```

### Timeout Validator
```typescript
Validators.timeout({ required: false })
// Validates positive numbers
// Sanitizes: Converts to integer
```

### Selector Validator
```typescript
Validators.selector({ required: true })
// Validates CSS selectors and ref format [ref=abc123]
// Sanitizes: Trims whitespace
```

### Enum Validator
```typescript
Validators.enum(['load', 'domcontentloaded'], { required: false })
// Validates against allowed values
// No sanitization
```

### String Validator
```typescript
Validators.string(minLength, maxLength, { required: true })
// Validates string length
// Sanitizes: Converts to string
```

### Custom Validator
```typescript
Validators.custom(
  (value) => value.includes('@'),
  'Must contain @ symbol'
)
// Custom validation logic
// No automatic sanitization
```

## Built-in Sanitizers

```typescript
import { Sanitizers } from '../lib/decorators';

// Trim whitespace
Sanitizers.trim('  hello  ') // → 'hello'

// Convert to lowercase
Sanitizers.toLowerCase('HELLO') // → 'hello'

// Escape HTML
Sanitizers.escapeHtml('<script>') // → '&lt;script&gt;'

// Normalize URL (add https://)
Sanitizers.normalizeUrl('example.com') // → 'https://example.com'

// Convert to number
Sanitizers.toNumber('123') // → 123
```

## Error Handling

The validation system integrates with `CommandBase` for consistent error handling:

```typescript
// Automatic error formatting
throw new ValidationError(['url: Invalid URL', 'port: Must be 1-65535']);

// Output:
// ❌ Invalid parameters:
//    • url: Invalid URL  
//    • port: Must be 1-65535
```

## Integration Patterns

### Pattern 1: Retrofit Existing Commands

Minimal changes to existing commands:

```typescript
export class ExistingCommand extends CommandBase {
  protected async execute(args: any[], options: any): Promise<void> {
    // Add this validation block
    const validated = ValidationHelper.validateCommandParams({
      ...args.reduce((acc, arg, i) => ({ ...acc, [`arg${i}`]: arg }), {}),
      ...options
    }, { throwOnError: true });
    
    // Use validated.sanitizedParams instead of raw parameters
    const [url] = args; // becomes: validated.sanitizedParams.arg0
    // ... rest of existing logic
  }
}
```

### Pattern 2: New Commands with Full Validation

```typescript
export class NewCommand extends CommandBase {
  protected async execute(args: any[], options: any): Promise<void> {
    const [url, selector] = args;
    const { port, timeout, force } = options;
    
    // Comprehensive parameter validation
    const schema = ValidationHelper.createSchema()
      .url('url', true)
      .selector('selector', true)
      .port('port', false)
      .timeout('timeout', false);
    
    const { sanitizedParams } = schema.validate(
      { url, selector, port, timeout }, 
      { throwOnError: true }
    );
    
    // Validate boolean flags separately
    const booleanValidation = ValidationHelper.validateBooleans({ force });
    if (!booleanValidation.isValid) {
      throw new ValidationError(booleanValidation.errors);
    }
    
    // Use sanitized parameters
    await this.withActivePage(sanitizedParams.port || 9222, async page => {
      // ... command logic with sanitizedParams
    });
  }
}
```

### Pattern 3: Mixin for Validation Capabilities

```typescript
import { WithValidation } from '../lib/validation-helper';

export class MyCommand extends WithValidation(CommandBase) {
  protected async execute(args: any[], options: any): Promise<void> {
    // Built-in validation methods available
    const { sanitizedParams } = this.validateParams({
      url: args[0],
      port: options.port
    });
    
    // ... use sanitizedParams
  }
}
```

## Testing Validation

```typescript
import { ValidationHelper, ValidationError } from '../lib/validation-helper';

describe('MyCommand validation', () => {
  it('should validate parameters correctly', () => {
    const validParams = { url: 'https://example.com', port: '9222' };
    const result = ValidationHelper.validateCommandParams(validParams);
    
    expect(result.isValid).toBe(true);
    expect(result.sanitizedParams.port).toBe(9222);
  });
  
  it('should reject invalid parameters', () => {
    const invalidParams = { url: 'invalid-url' };
    
    expect(() => {
      ValidationHelper.validateCommandParams(invalidParams, { throwOnError: true });
    }).toThrow(ValidationError);
  });
});
```

## Best Practices

1. **Use ValidationHelper for most cases** - It handles common parameters automatically
2. **Always use sanitized parameters** - Don't use raw input after validation
3. **Validate early** - Do validation at the start of `execute()` method
4. **Use throwOnError: true** - Let `CommandBase` handle error formatting
5. **Validate booleans separately** - Use `ValidationHelper.validateBooleans()` 
6. **Write tests** - Validate your validation logic
7. **Custom messages** - Provide helpful error messages for users
8. **Chain validators** - Use multiple validators for complex requirements

## Example Commands

See these example implementations:
- `navigate-validated.ts` - Basic validation with schema
- `click-validated.ts` - Complex validation with modifiers
- `type-validated.ts` - Retrofitting existing command with minimal changes

The validation system provides type safety, consistent error messages, and automatic sanitization while being easy to integrate into existing code.