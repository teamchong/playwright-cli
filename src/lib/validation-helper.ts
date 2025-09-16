/**
 * Helper utilities for easy integration of validation into existing commands
 * Provides a simple API to add validation without major refactoring
 */

import { Sanitizers } from './decorators'
import { logger } from './logger'
import {
  ValidationUtils,
  Validators,
  ValidationError,
  ValidatorFunction,
} from './validation'

export interface ParameterValidationRule {
  name: string
  validators: ValidatorFunction[]
  sanitizer?: (value: any) => any
  required?: boolean
}

export interface ValidationHelperOptions {
  throwOnError?: boolean
  logErrors?: boolean
}

/**
 * Validation helper that provides a simple API for command parameter validation
 */
export class ValidationHelper {
  /**
   * Quick validation for common command parameters
   */
  static validateCommandParams(
    params: Record<string, any>,
    options: ValidationHelperOptions = {}
  ): {
    isValid: boolean
    errors: string[]
    sanitizedParams: Record<string, any>
  } {
    const { throwOnError = false, logErrors = false } = options
    const validationSchema: Record<string, ValidatorFunction[]> = {}
    const sanitizedParams: Record<string, any> = { ...params }
    const allErrors: string[] = []

    // Auto-detect and validate common parameters
    for (const [key, value] of Object.entries(params)) {
      switch (key) {
        case 'url':
          validationSchema[key] = [Validators.url({ required: true })]
          // URL validator handles normalization internally
          break

        case 'port':
          validationSchema[key] = [Validators.port({ required: false })]
          // Port validator handles number conversion internally
          break

        case 'timeout':
          validationSchema[key] = [Validators.timeout({ required: false })]
          // Timeout validator handles number conversion internally
          break

        case 'selector':
          validationSchema[key] = [Validators.selector({ required: true })]
          // Selector validator handles trimming internally
          break

        case 'waitUntil':
          const waitOptions = ['load', 'domcontentloaded', 'networkidle']
          validationSchema[key] = [
            Validators.enum(waitOptions, { required: false }),
          ]
          break

        default:
          // No automatic validation for unknown parameters
          break
      }
    }

    if (Object.keys(validationSchema).length > 0) {
      const { isValid, errors, sanitizedData } = ValidationUtils.validateObject(
        params,
        validationSchema
      )

      if (!isValid) {
        const errorMessages = Object.entries(errors).flatMap(
          ([field, fieldErrors]) =>
            fieldErrors.map(error => `${field}: ${error}`)
        )
        allErrors.push(...errorMessages)
      }

      // Use sanitized data from validators
      Object.assign(sanitizedParams, sanitizedData)
    }

    if (allErrors.length > 0) {
      if (logErrors) {
        logger.error(`Validation errors: ${allErrors.join(', ')}`)
      }

      if (throwOnError) {
        throw new ValidationError(allErrors)
      }
    }

    return {
      isValid: allErrors.length === 0,
      errors: allErrors,
      sanitizedParams,
    }
  }

  /**
   * Validate specific parameters with custom rules
   */
  static validateWithRules(
    params: Record<string, any>,
    rules: ParameterValidationRule[],
    options: ValidationHelperOptions = {}
  ): {
    isValid: boolean
    errors: string[]
    sanitizedParams: Record<string, any>
  } {
    const { throwOnError = false, logErrors = false } = options
    const validationSchema: Record<string, ValidatorFunction[]> = {}
    const sanitizedParams: Record<string, any> = { ...params }

    // Apply custom rules
    for (const rule of rules) {
      validationSchema[rule.name] = rule.validators

      if (rule.sanitizer && params[rule.name] !== undefined) {
        sanitizedParams[rule.name] = rule.sanitizer(params[rule.name])
      }
    }

    const { isValid, errors, sanitizedData } = ValidationUtils.validateObject(
      params,
      validationSchema
    )

    // Merge sanitized data
    Object.assign(sanitizedParams, sanitizedData)

    const allErrors = Object.entries(errors).flatMap(([field, fieldErrors]) =>
      fieldErrors.map(error => `${field}: ${error}`)
    )

    if (allErrors.length > 0) {
      if (logErrors) {
        logger.error(`Validation errors: ${allErrors.join(', ')}`)
      }

      if (throwOnError) {
        throw new ValidationError(allErrors)
      }
    }

    return {
      isValid: allErrors.length === 0,
      errors: allErrors,
      sanitizedParams,
    }
  }

  /**
   * Quick selector validation (most common use case)
   */
  static validateSelector(selector: string, required = true): string {
    const result = Validators.selector({ required })(selector, 'selector')

    if (!result.isValid) {
      throw new ValidationError(result.errors)
    }

    return Sanitizers.trim(result.sanitizedValue || selector)
  }

  /**
   * Quick URL validation (common for navigate commands)
   */
  static validateUrl(url: string, required = true): string {
    const result = Validators.url({ required })(url, 'url')

    if (!result.isValid) {
      throw new ValidationError(result.errors)
    }

    return Sanitizers.normalizeUrl(result.sanitizedValue || url)
  }

  /**
   * Quick port validation
   */
  static validatePort(port: string | number, required = false): number {
    const result = Validators.port({ required })(port, 'port')

    if (!result.isValid) {
      throw new ValidationError(result.errors)
    }

    return result.sanitizedValue || parseInt(String(port), 10)
  }

  /**
   * Quick timeout validation
   */
  static validateTimeout(timeout: string | number, required = false): number {
    const result = Validators.timeout({ required })(timeout, 'timeout')

    if (!result.isValid) {
      throw new ValidationError(result.errors)
    }

    return result.sanitizedValue || parseInt(String(timeout), 10)
  }

  /**
   * Validate boolean flags (common for command options)
   */
  static validateBooleans(booleanParams: Record<string, any>): {
    isValid: boolean
    errors: string[]
  } {
    const errors: string[] = []

    for (const [key, value] of Object.entries(booleanParams)) {
      if (value !== undefined && typeof value !== 'boolean') {
        errors.push(`${key}: Must be a boolean value`)
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    }
  }

  /**
   * Create a validation schema builder for fluent API
   */
  static createSchema(): ValidationSchemaBuilder {
    return new ValidationSchemaBuilder()
  }
}

/**
 * Fluent API for building validation schemas
 */
export class ValidationSchemaBuilder {
  private rules: ParameterValidationRule[] = []

  url(name: string, required = true, message?: string): this {
    this.rules.push({
      name,
      validators: [Validators.url({ required, message })],
      sanitizer: Sanitizers.normalizeUrl,
      required,
    })
    return this
  }

  port(name: string, required = false, message?: string): this {
    this.rules.push({
      name,
      validators: [Validators.port({ required, message })],
      sanitizer: Sanitizers.toNumber,
      required,
    })
    return this
  }

  timeout(name: string, required = false, message?: string): this {
    this.rules.push({
      name,
      validators: [Validators.timeout({ required, message })],
      sanitizer: Sanitizers.toNumber,
      required,
    })
    return this
  }

  selector(name: string, required = true, message?: string): this {
    this.rules.push({
      name,
      validators: [Validators.selector({ required, message })],
      sanitizer: Sanitizers.trim,
      required,
    })
    return this
  }

  enum<T>(
    name: string,
    allowedValues: T[],
    required = false,
    message?: string
  ): this {
    this.rules.push({
      name,
      validators: [Validators.enum(allowedValues, { required, message })],
      required,
    })
    return this
  }

  string(
    name: string,
    minLength = 0,
    maxLength = Infinity,
    required = false,
    message?: string
  ): this {
    this.rules.push({
      name,
      validators: [
        Validators.string(minLength, maxLength, { required, message }),
      ],
      sanitizer: Sanitizers.trim,
      required,
    })
    return this
  }

  custom(
    name: string,
    validators: ValidatorFunction[],
    sanitizer?: (value: any) => any
  ): this {
    this.rules.push({
      name,
      validators,
      sanitizer,
      required: false,
    })
    return this
  }

  build(): ParameterValidationRule[] {
    return [...this.rules]
  }

  validate(
    params: Record<string, any>,
    options: ValidationHelperOptions = {}
  ): {
    isValid: boolean
    errors: string[]
    sanitizedParams: Record<string, any>
  } {
    return ValidationHelper.validateWithRules(params, this.build(), options)
  }
}

/**
 * Mixin that adds validation capabilities to any class
 */
export function WithValidation<T extends new (...args: any[]) => {}>(Base: T) {
  return class extends Base {
    protected validateParams(
      params: Record<string, any>,
      options: ValidationHelperOptions = { throwOnError: true }
    ): {
      isValid: boolean
      errors: string[]
      sanitizedParams: Record<string, any>
    } {
      return ValidationHelper.validateCommandParams(params, options)
    }

    protected validateWithRules(
      params: Record<string, any>,
      rules: ParameterValidationRule[],
      options: ValidationHelperOptions = { throwOnError: true }
    ): {
      isValid: boolean
      errors: string[]
      sanitizedParams: Record<string, any>
    } {
      return ValidationHelper.validateWithRules(params, rules, options)
    }
  }
}
