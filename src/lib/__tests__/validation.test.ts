/**
 * Tests for validation system
 */

import { describe, it, expect } from 'vitest'

import { Validators, ValidationUtils, ValidationError } from '../validation'

describe('Validators', () => {
  describe('url validator', () => {
    it('should accept valid HTTP URLs', () => {
      const validator = Validators.url({ required: true })
      const result = validator('http://example.com', 'url')

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.sanitizedValue).toBe('http://example.com/')
    })

    it('should accept valid HTTPS URLs', () => {
      const validator = Validators.url({ required: true })
      const result = validator('https://example.com', 'url')

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.sanitizedValue).toBe('https://example.com/')
    })

    it('should reject non-HTTP protocols', () => {
      const validator = Validators.url({ required: true })
      const result = validator('ftp://example.com', 'url')

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('url must be a valid HTTP or HTTPS URL')
    })

    it('should reject invalid URLs', () => {
      const validator = Validators.url({ required: true })
      const result = validator('not-a-url', 'url')

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('url must be a valid URL')
    })

    it('should handle required validation', () => {
      const validator = Validators.url({ required: true })
      const result = validator('', 'url')

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('url is required')
    })

    it('should allow empty values when not required', () => {
      const validator = Validators.url({ required: false })
      const result = validator('', 'url')

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })
  })

  describe('port validator', () => {
    it('should accept valid port numbers', () => {
      const validator = Validators.port({ required: false })
      const result = validator('8080', 'port')

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.sanitizedValue).toBe(8080)
    })

    it('should accept port numbers as integers', () => {
      const validator = Validators.port({ required: false })
      const result = validator(9222, 'port')

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.sanitizedValue).toBe(9222)
    })

    it('should reject port numbers out of range (too low)', () => {
      const validator = Validators.port({ required: false })
      const result = validator('0', 'port')

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('port must be between 1 and 65535')
    })

    it('should reject port numbers out of range (too high)', () => {
      const validator = Validators.port({ required: false })
      const result = validator('65536', 'port')

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('port must be between 1 and 65535')
    })

    it('should reject non-numeric values', () => {
      const validator = Validators.port({ required: false })
      const result = validator('abc', 'port')

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('port must be a valid number')
    })
  })

  describe('timeout validator', () => {
    it('should accept valid timeout values', () => {
      const validator = Validators.timeout({ required: false })
      const result = validator('5000', 'timeout')

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.sanitizedValue).toBe(5000)
    })

    it('should accept zero timeout', () => {
      const validator = Validators.timeout({ required: false })
      const result = validator('0', 'timeout')

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.sanitizedValue).toBe(0)
    })

    it('should reject negative timeouts', () => {
      const validator = Validators.timeout({ required: false })
      const result = validator('-1000', 'timeout')

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('timeout must be a positive number')
    })

    it('should reject non-numeric values', () => {
      const validator = Validators.timeout({ required: false })
      const result = validator('abc', 'timeout')

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('timeout must be a valid number')
    })
  })

  describe('selector validator', () => {
    it('should accept valid CSS selectors', () => {
      const validator = Validators.selector({ required: true })
      const result = validator('.button', 'selector')

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.sanitizedValue).toBe('.button')
    })

    it('should accept ref format selectors', () => {
      const validator = Validators.selector({ required: true })
      const result = validator('[ref=abc123]', 'selector')

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.sanitizedValue).toBe('[ref=abc123]')
    })

    it('should reject empty selectors', () => {
      const validator = Validators.selector({ required: true })
      const result = validator('', 'selector')

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('selector is required')
    })

    it('should reject whitespace-only selectors', () => {
      const validator = Validators.selector({ required: true })
      const result = validator('   ', 'selector')

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('selector cannot be empty')
    })
  })

  describe('enum validator', () => {
    const allowedValues = ['load', 'domcontentloaded', 'networkidle']

    it('should accept allowed values', () => {
      const validator = Validators.enum(allowedValues, { required: false })
      const result = validator('load', 'waitUntil')

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.sanitizedValue).toBe('load')
    })

    it('should reject disallowed values', () => {
      const validator = Validators.enum(allowedValues, { required: false })
      const result = validator('invalid', 'waitUntil')

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain(
        'waitUntil must be one of: load, domcontentloaded, networkidle'
      )
    })

    it('should handle required validation', () => {
      const validator = Validators.enum(allowedValues, { required: true })
      const result = validator(null, 'waitUntil')

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('waitUntil is required')
    })
  })

  describe('string validator', () => {
    it('should accept strings within length limits', () => {
      const validator = Validators.string(1, 10, { required: true })
      const result = validator('hello', 'text')

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.sanitizedValue).toBe('hello')
    })

    it('should reject strings too short', () => {
      const validator = Validators.string(5, 10, { required: true })
      const result = validator('hi', 'text')

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('text must be at least 5 characters')
    })

    it('should reject strings too long', () => {
      const validator = Validators.string(1, 5, { required: true })
      const result = validator('toolongtext', 'text')

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('text must be no more than 5 characters')
    })
  })

  describe('custom validator', () => {
    it('should use custom validation logic', () => {
      const validator = Validators.custom(
        value => value === 'valid',
        '{field} must be exactly "valid"'
      )

      const validResult = validator('valid', 'test')
      expect(validResult.isValid).toBe(true)
      expect(validResult.errors).toHaveLength(0)

      const invalidResult = validator('invalid', 'test')
      expect(invalidResult.isValid).toBe(false)
      expect(invalidResult.errors).toContain('test must be exactly "valid"')
    })
  })
})

describe('ValidationUtils', () => {
  describe('validateValue', () => {
    it('should run multiple validators on a single value', () => {
      const validators = [
        Validators.string(5, 20, { required: true }),
        Validators.custom(
          value => value.includes('@'),
          '{field} must contain @'
        ),
      ]

      const result = ValidationUtils.validateValue(
        'user@example.com',
        'email',
        validators
      )

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.sanitizedValue).toBe('user@example.com')
    })

    it('should collect errors from multiple validators', () => {
      const validators = [
        Validators.string(10, 20, { required: true }),
        Validators.custom(
          value => value.includes('@'),
          '{field} must contain @'
        ),
      ]

      const result = ValidationUtils.validateValue('user', 'email', validators)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('email must be at least 10 characters')
      expect(result.errors).toContain('email must contain @')
    })
  })

  describe('validateObject', () => {
    it('should validate multiple fields', () => {
      const schema = {
        url: [Validators.url({ required: true })],
        port: [Validators.port({ required: false })],
        selector: [Validators.selector({ required: true })],
      }

      const data = {
        url: 'https://example.com',
        port: '9222',
        selector: '.button',
      }

      const result = ValidationUtils.validateObject(data, schema)

      expect(result.isValid).toBe(true)
      expect(Object.keys(result.errors)).toHaveLength(0)
      expect(result.sanitizedData.url).toBe('https://example.com/')
      expect(result.sanitizedData.port).toBe(9222)
      expect(result.sanitizedData.selector).toBe('.button')
    })

    it('should collect errors from multiple fields', () => {
      const schema = {
        url: [Validators.url({ required: true })],
        port: [Validators.port({ required: false })],
      }

      const data = {
        url: 'invalid-url',
        port: '99999',
      }

      const result = ValidationUtils.validateObject(data, schema)

      expect(result.isValid).toBe(false)
      expect(result.errors.url).toContain('url must be a valid URL')
      expect(result.errors.port).toContain('port must be between 1 and 65535')
    })
  })
})

describe('ValidationError', () => {
  it('should create error with multiple messages', () => {
    const errors = ['url is required', 'port must be a number']
    const error = new ValidationError(errors)

    expect(error.name).toBe('ValidationError')
    expect(error.message).toBe(
      'Validation failed: url is required, port must be a number'
    )
    expect(error.errors).toEqual(errors)
  })

  it('should be instance of Error', () => {
    const error = new ValidationError(['test error'])
    expect(error).toBeInstanceOf(Error)
    expect(error).toBeInstanceOf(ValidationError)
  })
})
