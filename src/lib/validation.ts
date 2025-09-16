/**
 * Validation decorators and utilities for command parameters
 * Provides type-safe validation with comprehensive error messages
 */

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  sanitizedValue?: any
}

export interface ValidatorFunction {
  (value: any, fieldName: string): ValidationResult
}

export interface ValidatorOptions {
  required?: boolean
  message?: string
}

// Validation error for better error handling
export class ValidationError extends Error {
  public readonly errors: string[]

  constructor(errors: string[]) {
    super(`Validation failed: ${errors.join(', ')}`)
    this.name = 'ValidationError'
    this.errors = errors
  }
}

/**
 * Built-in validators
 */
export class Validators {
  /**
   * Validates that a value is a valid URL
   */
  static url(options: ValidatorOptions = {}): ValidatorFunction {
    return (value: any, fieldName: string): ValidationResult => {
      const errors: string[] = []

      if (!value && options.required) {
        errors.push(options.message || `${fieldName} is required`)
        return { isValid: false, errors }
      }

      if (!value) {
        return { isValid: true, errors: [], sanitizedValue: value }
      }

      let urlToValidate = String(value).trim()
      let normalized = false

      // Try to normalize URL by adding https:// if no protocol
      if (!urlToValidate.match(/^[a-zA-Z]+:\/\//)) {
        urlToValidate = `https://${urlToValidate}`
        normalized = true
      }

      try {
        const url = new URL(urlToValidate)
        // Ensure it's a valid HTTP/HTTPS URL
        if (!['http:', 'https:'].includes(url.protocol)) {
          errors.push(
            options.message || `${fieldName} must be a valid HTTP or HTTPS URL`
          )
        }

        // Additional validation for normalized URLs to catch invalid domains
        if (normalized) {
          // Check if the hostname is valid (contains at least one dot for proper domain)
          if (
            !url.hostname.includes('.') ||
            url.hostname.startsWith('.') ||
            url.hostname.endsWith('.')
          ) {
            errors.push(options.message || `${fieldName} must be a valid URL`)
          }
        }

        return {
          isValid: errors.length === 0,
          errors,
          sanitizedValue: url.toString(),
        }
      } catch {
        errors.push(options.message || `${fieldName} must be a valid URL`)
        return { isValid: false, errors }
      }
    }
  }

  /**
   * Validates that a value is a valid port number
   */
  static port(options: ValidatorOptions = {}): ValidatorFunction {
    return (value: any, fieldName: string): ValidationResult => {
      const errors: string[] = []

      if (!value && options.required) {
        errors.push(options.message || `${fieldName} is required`)
        return { isValid: false, errors }
      }

      if (!value) {
        return { isValid: true, errors: [], sanitizedValue: value }
      }

      const portNum = parseInt(String(value), 10)

      if (isNaN(portNum)) {
        errors.push(options.message || `${fieldName} must be a valid number`)
      } else if (portNum < 1 || portNum > 65535) {
        errors.push(
          options.message || `${fieldName} must be between 1 and 65535`
        )
      }

      return {
        isValid: errors.length === 0,
        errors,
        sanitizedValue: portNum,
      }
    }
  }

  /**
   * Validates that a value is a valid timeout (positive number)
   */
  static timeout(options: ValidatorOptions = {}): ValidatorFunction {
    return (value: any, fieldName: string): ValidationResult => {
      const errors: string[] = []

      if (!value && options.required) {
        errors.push(options.message || `${fieldName} is required`)
        return { isValid: false, errors }
      }

      if (!value) {
        return { isValid: true, errors: [], sanitizedValue: value }
      }

      const timeoutNum = parseInt(String(value), 10)

      if (isNaN(timeoutNum)) {
        errors.push(options.message || `${fieldName} must be a valid number`)
      } else if (timeoutNum < 0) {
        errors.push(options.message || `${fieldName} must be a positive number`)
      }

      return {
        isValid: errors.length === 0,
        errors,
        sanitizedValue: timeoutNum,
      }
    }
  }

  /**
   * Validates that a value is a valid CSS selector
   */
  static selector(options: ValidatorOptions = {}): ValidatorFunction {
    return (value: any, fieldName: string): ValidationResult => {
      const errors: string[] = []

      if (!value && options.required) {
        errors.push(options.message || `${fieldName} is required`)
        return { isValid: false, errors }
      }

      if (!value) {
        return { isValid: true, errors: [], sanitizedValue: value }
      }

      const selector = String(value).trim()

      if (!selector) {
        errors.push(options.message || `${fieldName} cannot be empty`)
        return { isValid: false, errors }
      }

      // Basic CSS selector validation
      // Allow ref format [ref=abcd1234]
      const refPattern = /^\[ref=[a-f0-9]+\]$/
      if (refPattern.test(selector)) {
        return { isValid: true, errors: [], sanitizedValue: selector }
      }

      // Since we're in Node.js environment, we can't validate CSS selectors
      // using the DOM API. We'll do basic validation and let the browser
      // handle the actual selector validation at runtime.
      return { isValid: true, errors: [], sanitizedValue: selector }
    }
  }

  /**
   * Validates that a value is one of the allowed enum values
   */
  static enum<T>(
    allowedValues: T[],
    options: ValidatorOptions = {}
  ): ValidatorFunction {
    return (value: any, fieldName: string): ValidationResult => {
      const errors: string[] = []

      if (!value && options.required) {
        errors.push(options.message || `${fieldName} is required`)
        return { isValid: false, errors }
      }

      if (!value) {
        return { isValid: true, errors: [], sanitizedValue: value }
      }

      if (!allowedValues.includes(value)) {
        errors.push(
          options.message ||
            `${fieldName} must be one of: ${allowedValues.join(', ')}`
        )
      }

      return {
        isValid: errors.length === 0,
        errors,
        sanitizedValue: value,
      }
    }
  }

  /**
   * Validates that a value is a string within length limits
   */
  static string(
    minLength = 0,
    maxLength = Infinity,
    options: ValidatorOptions = {}
  ): ValidatorFunction {
    return (value: any, fieldName: string): ValidationResult => {
      const errors: string[] = []

      if (!value && options.required) {
        errors.push(options.message || `${fieldName} is required`)
        return { isValid: false, errors }
      }

      if (!value) {
        return { isValid: true, errors: [], sanitizedValue: value }
      }

      const str = String(value)

      if (str.length < minLength) {
        errors.push(
          options.message ||
            `${fieldName} must be at least ${minLength} characters`
        )
      }

      if (str.length > maxLength) {
        errors.push(
          options.message ||
            `${fieldName} must be no more than ${maxLength} characters`
        )
      }

      return {
        isValid: errors.length === 0,
        errors,
        sanitizedValue: str,
      }
    }
  }

  /**
   * Creates a custom validator
   */
  static custom(
    validatorFn: (value: any) => boolean,
    errorMessage: string
  ): ValidatorFunction {
    return (value: any, fieldName: string): ValidationResult => {
      const isValid = validatorFn(value)
      return {
        isValid,
        errors: isValid ? [] : [errorMessage.replace('{field}', fieldName)],
        sanitizedValue: value,
      }
    }
  }
}

/**
 * Validation utilities
 */
export class ValidationUtils {
  /**
   * Runs multiple validators on a single value
   */
  static validateValue(
    value: any,
    fieldName: string,
    validators: ValidatorFunction[]
  ): ValidationResult {
    const allErrors: string[] = []
    let sanitizedValue = value

    for (const validator of validators) {
      const result = validator(sanitizedValue, fieldName)
      if (!result.isValid) {
        allErrors.push(...result.errors)
      }
      if (result.sanitizedValue !== undefined) {
        sanitizedValue = result.sanitizedValue
      }
    }

    return {
      isValid: allErrors.length === 0,
      errors: allErrors,
      sanitizedValue,
    }
  }

  /**
   * Validates an object against a schema of validators
   */
  static validateObject<T>(
    obj: Record<string, any>,
    schema: Record<keyof T, ValidatorFunction[]>
  ): {
    isValid: boolean
    errors: Record<string, string[]>
    sanitizedData: Partial<T>
  } {
    const errors: Record<string, string[]> = {}
    const sanitizedData: Partial<T> = {}

    for (const [fieldName, validators] of Object.entries(schema)) {
      const value = obj[fieldName]
      const result = this.validateValue(
        value,
        fieldName,
        validators as ValidatorFunction[]
      )

      if (!result.isValid) {
        errors[fieldName] = result.errors
      }

      if (result.sanitizedValue !== undefined) {
        ;(sanitizedData as any)[fieldName] = result.sanitizedValue
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
      sanitizedData,
    }
  }
}
