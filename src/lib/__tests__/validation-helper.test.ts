/**
 * Tests for validation helper utilities
 */

import { describe, it, expect } from '../../__tests__/vitest-compat';

import { ValidationError } from '../validation';
import { ValidationHelper, ValidationSchemaBuilder } from '../validation-helper';

describe('ValidationHelper', () => {
  describe('validateCommandParams', () => {
    it('should auto-validate common parameters', () => {
      const params = {
        url: 'https://example.com',
        port: '9222',
        timeout: '5000',
        selector: '.button'
      };

      const result = ValidationHelper.validateCommandParams(params);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.sanitizedParams.url).toBe('https://example.com/');
      expect(result.sanitizedParams.port).toBe(9222);
      expect(result.sanitizedParams.timeout).toBe(5000);
      expect(result.sanitizedParams.selector).toBe('.button');
    });

    it('should handle invalid parameters', () => {
      const params = {
        url: 'invalid-url',
        port: '99999',
        timeout: '-1000'
      };

      const result = ValidationHelper.validateCommandParams(params, { throwOnError: false });

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.includes('url must be a valid URL'))).toBe(true);
      expect(result.errors.some(e => e.includes('port must be between 1 and 65535'))).toBe(true);
      expect(result.errors.some(e => e.includes('timeout must be a positive number'))).toBe(true);
    });

    it('should throw ValidationError when throwOnError is true', () => {
      const params = { url: 'invalid-url' };

      expect(() => {
        ValidationHelper.validateCommandParams(params, { throwOnError: true });
      }).toThrow(ValidationError);
    });

    it('should apply URL normalization', () => {
      const params = { url: 'example.com' };

      const result = ValidationHelper.validateCommandParams(params);

      expect(result.isValid).toBe(true);
      expect(result.sanitizedParams.url).toBe('https://example.com/');
    });
  });

  describe('validateWithRules', () => {
    it('should validate with custom rules', () => {
      const params = {
        customField: 'test-value',
        anotherField: '123'
      };

      const rules = ValidationHelper.createSchema()
        .string('customField', 5, 20, true)
        .custom('anotherField', [
          (value, fieldName) => {
            const num = parseInt(value);
            return {
              isValid: !isNaN(num) && num > 0,
              errors: isNaN(num) || num <= 0 ? [`${fieldName} must be a positive number`] : [],
              sanitizedValue: num
            };
          }
        ])
        .build();

      const result = ValidationHelper.validateWithRules(params, rules);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.sanitizedParams.customField).toBe('test-value');
      expect(result.sanitizedParams.anotherField).toBe(123);
    });
  });

  describe('quick validation methods', () => {
    describe('validateSelector', () => {
      it('should validate and sanitize selectors', () => {
        const result = ValidationHelper.validateSelector('  .button  ');
        expect(result).toBe('.button');
      });

      it('should throw on invalid selector', () => {
        expect(() => {
          ValidationHelper.validateSelector('');
        }).toThrow(ValidationError);
      });
    });

    describe('validateUrl', () => {
      it('should validate and normalize URLs', () => {
        const result = ValidationHelper.validateUrl('example.com');
        expect(result).toBe('https://example.com/');
      });

      it('should throw on invalid URL', () => {
        expect(() => {
          ValidationHelper.validateUrl('invalid-url');
        }).toThrow(ValidationError);
      });
    });

    describe('validatePort', () => {
      it('should validate and convert port numbers', () => {
        const result = ValidationHelper.validatePort('9222');
        expect(result).toBe(9222);
      });

      it('should accept number inputs', () => {
        const result = ValidationHelper.validatePort(8080);
        expect(result).toBe(8080);
      });

      it('should throw on invalid port', () => {
        expect(() => {
          ValidationHelper.validatePort('99999');
        }).toThrow(ValidationError);
      });
    });

    describe('validateTimeout', () => {
      it('should validate and convert timeout values', () => {
        const result = ValidationHelper.validateTimeout('5000');
        expect(result).toBe(5000);
      });

      it('should throw on negative timeout', () => {
        expect(() => {
          ValidationHelper.validateTimeout('-1000');
        }).toThrow(ValidationError);
      });
    });
  });

  describe('validateBooleans', () => {
    it('should validate boolean flags', () => {
      const booleans = {
        force: true,
        double: false,
        clear: true
      };

      const result = ValidationHelper.validateBooleans(booleans);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject non-boolean values', () => {
      const booleans = {
        force: 'true',  // string instead of boolean
        double: 1,      // number instead of boolean
        clear: true     // valid boolean
      };

      const result = ValidationHelper.validateBooleans(booleans);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('force: Must be a boolean value');
      expect(result.errors).toContain('double: Must be a boolean value');
    });

    it('should allow undefined values', () => {
      const booleans = {
        force: undefined,
        double: true
      };

      const result = ValidationHelper.validateBooleans(booleans);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});

describe('ValidationSchemaBuilder', () => {
  it('should build validation schema with fluent API', () => {
    const schema = ValidationHelper.createSchema()
      .url('url', true, 'Custom URL error message')
      .port('port', false)
      .timeout('timeout', false)
      .selector('selector', true)
      .enum('waitUntil', ['load', 'domcontentloaded'], false)
      .string('text', 1, 100, true);

    const rules = schema.build();

    expect(rules).toHaveLength(6);
    expect(rules[0].name).toBe('url');
    expect(rules[0].required).toBe(true);
    expect(rules[1].name).toBe('port');
    expect(rules[1].required).toBe(false);
  });

  it('should validate using built schema', () => {
    const schema = ValidationHelper.createSchema()
      .url('url', true)
      .port('port', false);

    const validParams = { url: 'https://example.com', port: '9222' };
    const result = schema.validate(validParams, { throwOnError: false });

    expect(result.isValid).toBe(true);
    expect(result.sanitizedParams.url).toBe('https://example.com/');
    expect(result.sanitizedParams.port).toBe(9222);
  });

  it('should handle validation errors in schema', () => {
    const schema = ValidationHelper.createSchema()
      .url('url', true)
      .port('port', false);

    const invalidParams = { url: 'invalid-url', port: '99999' };
    const result = schema.validate(invalidParams, { throwOnError: false });

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should support custom validators in schema', () => {
    const schema = ValidationHelper.createSchema()
      .custom('email', [
        (value, fieldName) => ({
          isValid: typeof value === 'string' && value.includes('@'),
          errors: !value.includes('@') ? [`${fieldName} must contain @`] : [],
          sanitizedValue: value
        })
      ]);

    const validParams = { email: 'user@example.com' };
    const result = schema.validate(validParams, { throwOnError: false });

    expect(result.isValid).toBe(true);

    const invalidParams = { email: 'invalid-email' };
    const invalidResult = schema.validate(invalidParams, { throwOnError: false });

    expect(invalidResult.isValid).toBe(false);
    expect(invalidResult.errors).toContain('email: email must contain @');
  });
});
