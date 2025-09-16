/**
 * Decorators for command validation and parameter processing
 * Implements Decorator pattern with Chain of Responsibility for validation
 */

import {
  ValidationError,
  ValidatorFunction,
  ValidationUtils,
  Validators,
} from './validation'

// Metadata storage for decorators
const validationMetadata = new WeakMap<
  any,
  Record<string, ValidatorFunction[]>
>()
const sanitizationMetadata = new WeakMap<
  any,
  Record<string, (value: any) => any>
>()

/**
 * Decorator for validating command parameters
 * Uses Chain of Responsibility pattern to apply multiple validators
 */
export function validate(...validators: ValidatorFunction[]) {
  return function (
    target: any,
    propertyKey: string | symbol,
    parameterIndex: number
  ) {
    const existingMetadata = validationMetadata.get(target) || {}
    const paramName = String(propertyKey)

    existingMetadata[paramName] = validators
    validationMetadata.set(target, existingMetadata)
  }
}

/**
 * Decorator for URL validation
 */
export function ValidateUrl(required = false, message?: string) {
  return validate(Validators.url({ required, message }))
}

/**
 * Decorator for port validation
 */
export function ValidatePort(required = false, message?: string) {
  return validate(Validators.port({ required, message }))
}

/**
 * Decorator for timeout validation
 */
export function ValidateTimeout(required = false, message?: string) {
  return validate(Validators.timeout({ required, message }))
}

/**
 * Decorator for selector validation
 */
export function ValidateSelector(required = true, message?: string) {
  return validate(Validators.selector({ required, message }))
}

/**
 * Decorator for enum validation
 */
export function ValidateEnum<T>(
  allowedValues: T[],
  required = false,
  message?: string
) {
  return validate(Validators.enum(allowedValues, { required, message }))
}

/**
 * Decorator for string validation
 */
export function ValidateString(
  minLength = 0,
  maxLength = Infinity,
  required = false,
  message?: string
) {
  return validate(
    Validators.string(minLength, maxLength, { required, message })
  )
}

/**
 * Decorator for input sanitization
 */
export function sanitize(sanitizer: (value: any) => any) {
  return function (target: any, propertyKey: string | symbol) {
    const existingMetadata = sanitizationMetadata.get(target) || {}
    const paramName = String(propertyKey)

    existingMetadata[paramName] = sanitizer
    sanitizationMetadata.set(target, existingMetadata)
  }
}

/**
 * Common sanitizers
 */
export class Sanitizers {
  /**
   * Trim whitespace from strings
   */
  static trim(value: any): any {
    return typeof value === 'string' ? value.trim() : value
  }

  /**
   * Convert to lowercase
   */
  static toLowerCase(value: any): any {
    return typeof value === 'string' ? value.toLowerCase() : value
  }

  /**
   * Remove dangerous HTML characters
   */
  static escapeHtml(value: any): any {
    if (typeof value !== 'string') return value

    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
  }

  /**
   * Ensure URL has protocol
   */
  static normalizeUrl(value: any): any {
    if (typeof value !== 'string') return value

    const trimmed = value.trim()
    if (!trimmed) return trimmed

    // Add https:// if no protocol specified
    if (!trimmed.match(/^https?:\/\//i)) {
      return `https://${trimmed}`
    }

    return trimmed
  }

  /**
   * Convert string to number
   */
  static toNumber(value: any): any {
    if (typeof value === 'number') return value
    if (typeof value === 'string') {
      const num = parseInt(value, 10)
      return isNaN(num) ? value : num
    }
    return value
  }
}

/**
 * Method decorator that validates all parameters before execution
 * Implements Chain of Responsibility pattern for parameter validation
 */
export function validateParams(
  target: any,
  propertyName: string,
  descriptor: PropertyDescriptor
) {
  const method = descriptor.value

  descriptor.value = async function (...args: any[]) {
    const validators =
      validationMetadata.get(target.constructor.prototype) || {}
    const sanitizers =
      sanitizationMetadata.get(target.constructor.prototype) || {}

    // Create parameter map based on method signature
    const paramNames = getParameterNames(method)
    const paramMap: Record<string, any> = {}

    paramNames.forEach((name, index) => {
      paramMap[name] = args[index]
    })

    // Apply sanitization first
    for (const [paramName, sanitizer] of Object.entries(sanitizers)) {
      if (paramMap[paramName] !== undefined) {
        paramMap[paramName] = sanitizer(paramMap[paramName])
      }
    }

    // Apply validation
    const validationSchema: Record<string, ValidatorFunction[]> = {}
    for (const [paramName, validatorList] of Object.entries(validators)) {
      validationSchema[paramName] = validatorList
    }

    if (Object.keys(validationSchema).length > 0) {
      const { isValid, errors, sanitizedData } = ValidationUtils.validateObject(
        paramMap,
        validationSchema
      )

      if (!isValid) {
        const errorMessages = Object.entries(errors).flatMap(
          ([field, fieldErrors]) =>
            fieldErrors.map(error => `${field}: ${error}`)
        )
        throw new ValidationError(errorMessages)
      }

      // Update args with sanitized data
      paramNames.forEach((name, index) => {
        if (sanitizedData[name] !== undefined) {
          args[index] = sanitizedData[name]
        } else if (paramMap[name] !== undefined) {
          args[index] = paramMap[name]
        }
      })
    }

    // Call original method with validated/sanitized parameters
    return method.apply(this, args)
  }

  return descriptor
}

/**
 * Class decorator that automatically applies parameter validation to all execute methods
 */
export function ValidatedCommand(constructor: Function) {
  const originalExecute = constructor.prototype.execute

  if (originalExecute) {
    constructor.prototype.execute = validateParams(
      constructor.prototype,
      'execute',
      { value: originalExecute }
    ).value
  }
}

/**
 * Utility to extract parameter names from function
 * Used for mapping args to parameter names
 */
function getParameterNames(func: Function): string[] {
  const funcString = func.toString()

  // Match function parameters
  const paramMatch = funcString.match(/\(([^)]*)\)/)
  if (!paramMatch) return []

  const params = paramMatch[1]
  if (!params.trim()) return []

  // Split parameters and clean them
  return params
    .split(',')
    .map(param => param.trim().split(/[=\s]/)[0].trim())
    .filter(param => param && !param.startsWith('...'))
}

/**
 * Validation chain builder for fluent API
 */
export class ValidationChain {
  private validators: ValidatorFunction[] = []

  url(required = false, message?: string): this {
    this.validators.push(Validators.url({ required, message }))
    return this
  }

  port(required = false, message?: string): this {
    this.validators.push(Validators.port({ required, message }))
    return this
  }

  timeout(required = false, message?: string): this {
    this.validators.push(Validators.timeout({ required, message }))
    return this
  }

  selector(required = true, message?: string): this {
    this.validators.push(Validators.selector({ required, message }))
    return this
  }

  enum<T>(allowedValues: T[], required = false, message?: string): this {
    this.validators.push(Validators.enum(allowedValues, { required, message }))
    return this
  }

  string(
    minLength = 0,
    maxLength = Infinity,
    required = false,
    message?: string
  ): this {
    this.validators.push(
      Validators.string(minLength, maxLength, { required, message })
    )
    return this
  }

  custom(validatorFn: (value: any) => boolean, errorMessage: string): this {
    this.validators.push(Validators.custom(validatorFn, errorMessage))
    return this
  }

  build(): ValidatorFunction[] {
    return [...this.validators]
  }
}

/**
 * Factory for creating validation chains
 */
export const validation = () => new ValidationChain()
