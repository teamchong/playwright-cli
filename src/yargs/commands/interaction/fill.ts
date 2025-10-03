/**
 * Fill Command - Yargs Implementation
 *
 * Fills multiple form fields with values using Playwright's page.fill() method.
 * Accepts selector=value pairs to fill multiple fields in one command.
 */

import { createCommand } from '../../lib/command-builder'
import { BrowserHelper } from '../../../lib/browser-helper'
import { refManager } from '../../../lib/ref-manager'
import { findBestSelector } from '../../../lib/selector-resolver'
import { actionHistory } from '../../../lib/action-history'
import type { FillOptions } from '../../types'
import chalk from 'chalk'

// Helper to calculate Levenshtein distance for suggestions
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = []
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i]
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        )
      }
    }
  }
  return matrix[b.length][a.length]
}

interface FillWithRefOptions extends FillOptions {
  ref?: string
}

export const fillCommand = createCommand<FillWithRefOptions>({
  metadata: {
    name: 'fill',
    category: 'interaction',
    description: 'Fill form fields with values',
    aliases: [],
  },

  command: 'fill [fields...]',
  describe: 'Fill form fields with values',

  builder: yargs => {
    return yargs
      .positional('fields', {
        describe:
          'Field selector=value pairs (e.g., "#email=test@example.com" "#password=secret")',
        type: 'string',
        array: true,
      })
      .option('ref', {
        describe: 'Use reference from snapshot to fill a single field',
        type: 'string',
        alias: 'r',
      })
      .check(argv => {
        if (!argv.fields?.length && !argv.ref) {
          throw new Error('Either fields or --ref must be provided')
        }
        if (argv.ref && (!argv.fields || argv.fields.length !== 1)) {
          throw new Error('When using --ref, provide exactly one value')
        }
        return true
      })
      .option('form', {
        describe: 'Scope all fields to a specific form (CSS selector)',
        type: 'string',
      })
      .option('port', {
        describe: 'Chrome debugging port',
        type: 'number',
        default: 9222,
        alias: 'p',
      })
      .option('timeout', {
        describe: 'Timeout in milliseconds',
        type: 'number',
        default: 5000,
      })
      .option('tab-index', {
        describe: 'Target specific tab by index (0-based)',
        type: 'number',
        alias: 'tab',
      })
      .option('tab-id', {
        describe: 'Target specific tab by unique ID',
        type: 'string',
      })
      .option('quiet', {
        describe: 'Suppress output',
        type: 'boolean',
        default: false,
      })
      .option('json', {
        describe: 'Output results as JSON',
        type: 'boolean',
        default: false,
      })
      .conflicts('tab-index', 'tab-id')
  },

  handler: async ({ argv, logger, spinner }) => {
    const { fields, port, timeout, ref } = argv
    const tabIndex = argv['tab-index'] as number | undefined
    const tabId = argv['tab-id'] as string | undefined
    let formScope = argv.form as string | undefined
    const quiet = argv.quiet as boolean
    const json = argv.json as boolean

    // Auto-prepend # to form scope if it's just an ID
    if (
      formScope &&
      !formScope.startsWith('#') &&
      !formScope.startsWith('.') &&
      !formScope.includes(' ')
    ) {
      formScope = `#${formScope}`
    }

    // Handle --ref mode (single field fill)
    if (ref) {
      const storedSelector = refManager.getSelector(ref, tabId)
      if (!storedSelector) {
        const errorMsg = `ref not found: Element with ref=${ref} not found`
        logger.error(chalk.red(`❌ ${errorMsg}`))
        throw new Error(errorMsg)
      }

      const value = fields![0] // We checked in validation that exactly one value is provided

      await BrowserHelper.withTargetPage(port, tabIndex, tabId, async page => {
        try {
          await page.fill(storedSelector, value, { timeout: timeout as number })

          // Track the fill action
          actionHistory.addAction({
            type: 'fill',
            target: storedSelector,
            value: value,
            tabId: tabId,
          })

          logger.success(`Filled [${ref}] with "${value}"`)
        } catch (err: any) {
          logger.error(`Failed to fill [${ref}]: ${err.message}`)
          throw err
        }
      })
      return
    }

    const tabTarget =
      tabIndex !== undefined
        ? ` in tab ${tabIndex}`
        : tabId !== undefined
          ? ` in tab ${tabId.slice(0, 8)}...`
          : ''

    if (spinner) {
      spinner.text = `Filling ${fields.length} field(s)${tabTarget}...`
    }

    let filledCount = 0
    const errors: string[] = []
    const results: Array<{
      field: string
      value: string
      success: boolean
      error?: string
    }> = []

    // Detect legacy vs enhanced syntax
    const hasEqualsFields = fields!.some(field => field.includes('='))
    const isLegacySyntax =
      !hasEqualsFields && fields!.length >= 2 && fields!.length % 2 === 0

    // Get available field names for suggestions
    let availableFields: string[] = []

    await BrowserHelper.withTargetPage(port, tabIndex, tabId, async page => {
      // Collect available fields for suggestions
      try {
        availableFields = await page.evaluate(() => {
          const inputs = Array.from(
            (globalThis as any).document.querySelectorAll(
              'input, textarea, select'
            )
          )
          const fieldNames: string[] = []
          inputs.forEach((input: any) => {
            if (input.name) fieldNames.push(input.name)
            if (input.id) fieldNames.push(input.id)
            if (input.placeholder) fieldNames.push(input.placeholder)
          })
          // Also get labels
          // @ts-expect-error - document is available in browser context
          const labels = Array.from(document.querySelectorAll('label'))
          labels.forEach((label: any) => {
            const text = label.textContent?.trim()
            if (text) fieldNames.push(text)
          })
          return [...new Set(fieldNames)] // Remove duplicates
        })
      } catch {
        // Ignore errors in getting field names
      }

      if (isLegacySyntax) {
        // Legacy syntax: fill "selector" "value" "selector2" "value2"
        for (let i = 0; i < fields!.length; i += 2) {
          const selector = fields![i]
          const value = fields![i + 1]

          try {
            await page.fill(selector, value, { timeout: timeout as number })

            // Track the fill action
            actionHistory.addAction({
              type: 'fill',
              target: selector,
              value: value,
              tabId: tabId,
            })

            if (!quiet && !json) {
              console.log(`  ✓ Filled ${selector} with "${value}"`)
            }
            results.push({ field: selector, value, success: true })
            filledCount++
          } catch (err: any) {
            const errorMsg = `Failed to fill ${selector}: ${err.message}`
            errors.push(errorMsg)
            results.push({
              field: selector,
              value,
              success: false,
              error: err.message,
            })
            if (!quiet && !json) {
              console.log(`  ⚠️  ${errorMsg}`)
            }
          }
        }
      } else {
        // Enhanced syntax: fill "field=value" "field2=value2"
        for (const field of fields!) {
          // Check for malformed input (no equals sign)
          if (!field.includes('=')) {
            const errorMsg = `invalid format: ${field}. Use selector=value`
            errors.push(errorMsg)
            results.push({
              field,
              value: '',
              success: false,
              error: 'invalid format',
            })
            if (!quiet && !json) {
              console.log(`  ⚠️  ${errorMsg}`)
            }
            continue
          }

          // Handle CSS attribute selectors like [name=username]=value correctly
          let selectorPart: string
          let value: string

          if (field.startsWith('[') && field.includes(']=')) {
            // CSS attribute selector: [name=username]=value
            const closeBracketIndex = field.indexOf(']=')
            selectorPart = field.substring(0, closeBracketIndex + 1) // Include the closing ]
            value = field.substring(closeBracketIndex + 2) // Skip ]=
          } else {
            // Regular selector: #id=value or .class=value
            const [selector, ...valueParts] = field.split('=')
            selectorPart = selector
            value = valueParts.join('=') // Handle values with = in them
          }

          if (!selectorPart) {
            const errorMsg = `invalid format: ${field}. Use selector=value`
            errors.push(errorMsg)
            results.push({
              field,
              value: '',
              success: false,
              error: 'invalid format',
            })
            if (!quiet && !json) {
              console.log(`  ⚠️  ${errorMsg}`)
            }
            continue
          }

          try {
            let actualSelector = selectorPart
            let strategy = 'direct'
            let localFormScope = formScope || ''

            // Check if selector has inline form scoping (e.g., "#registration-form email")
            const parts = selectorPart.trim().split(/\s+/)
            if (
              parts.length === 2 &&
              (parts[0].startsWith('#') || parts[0].startsWith('.'))
            ) {
              localFormScope = parts[0]
              actualSelector = parts[1]
            }

            // Skip attribute selector fixing - let CSS parser handle it
            // The field=value parsing should have already separated the selector from the value

            // For simple identifiers (no CSS selector syntax), try field-specific resolution
            if (
              !actualSelector.startsWith('#') &&
              !actualSelector.startsWith('.') &&
              !actualSelector.startsWith('[')
            ) {
              // Try to find form field by various attributes
              const fieldSelectors = [
                `[name="${actualSelector}"]`, // by name attribute
                `#${actualSelector}`, // by id
                `[placeholder*="${actualSelector}" i]`, // by placeholder (case-insensitive)
                `input[aria-label*="${actualSelector}" i]`, // by aria-label
              ]

              // Add form scope if provided
              if (localFormScope) {
                for (let i = 0; i < fieldSelectors.length; i++) {
                  fieldSelectors[i] = `${localFormScope} ${fieldSelectors[i]}`
                }
              }

              let found = false
              for (const fieldSelector of fieldSelectors) {
                try {
                  const element = await page.$(fieldSelector)
                  if (element) {
                    actualSelector = fieldSelector
                    strategy = fieldSelector.includes('[name=')
                      ? 'name'
                      : fieldSelector.includes('#') &&
                          !fieldSelector.includes(' #')
                        ? 'id'
                        : fieldSelector.includes('placeholder')
                          ? 'placeholder'
                          : 'aria-label'
                    found = true
                    break
                  }
                } catch {
                  // Continue to next selector
                }
              }

              // If still not found, try finding by label text
              if (!found) {
                try {
                  // Try to find label with exact text match first
                  const labelSelector = localFormScope
                    ? `${localFormScope} label:text("${actualSelector}")`
                    : `label:text("${actualSelector}")`
                  const labelElement = await page.$(labelSelector)
                  if (labelElement) {
                    const forAttr = await labelElement.getAttribute('for')
                    if (forAttr) {
                      actualSelector = localFormScope
                        ? `${localFormScope} #${forAttr}`
                        : `#${forAttr}`
                      strategy = 'label'
                      found = true
                    }
                  }
                } catch {
                  // Try contains text as fallback
                  try {
                    const labelSelector = localFormScope
                      ? `${localFormScope} label:has-text("${actualSelector}")`
                      : `label:has-text("${actualSelector}")`
                    const labelElement = await page.$(labelSelector)
                    if (labelElement) {
                      const forAttr = await labelElement.getAttribute('for')
                      if (forAttr) {
                        actualSelector = localFormScope
                          ? `${localFormScope} #${forAttr}`
                          : `#${forAttr}`
                        strategy = 'label'
                        found = true
                      }
                    }
                  } catch {
                    // Fall back to text-based selector resolution
                  }
                }
              }

              // If no field-specific match found, try text-based selector resolution
              if (!found) {
                const textSelectorResult = await findBestSelector(
                  page,
                  actualSelector
                )
                if (textSelectorResult) {
                  actualSelector = localFormScope
                    ? `${localFormScope} ${textSelectorResult.selector}`
                    : textSelectorResult.selector
                  strategy = textSelectorResult.strategy
                } else {
                  // If not a CSS selector and no element found by text, throw clear error
                  const isCss =
                    /^[#.]/.test(actualSelector) ||
                    /[.\[\]\>\+\~:]/.test(actualSelector) ||
                    /^[a-z]+$/i.test(actualSelector)
                  if (!isCss) {
                    throw new Error(
                      `Element not found by text: "${actualSelector}". Try using a CSS selector or check the page content with 'snapshot'.`
                    )
                  }
                }
              }
            }

            if (spinner) {
              spinner.text = `Filling field via ${strategy}: ${selectorPart}...`
            }

            // Check if element exists before trying to fill
            const element = await page.$(actualSelector)
            if (!element) {
              throw new Error(`not found: ${actualSelector}`)
            }

            await page.fill(actualSelector, value, {
              timeout: timeout as number,
            })

            // Track the fill action
            actionHistory.addAction({
              type: 'fill',
              target: selectorPart,
              value: value,
              tabId: tabId,
            })

            if (!quiet && !json) {
              console.log(`  ✓ Filled ${selectorPart} with "${value}"`)
            }
            results.push({ field: selectorPart, value, success: true })
            filledCount++
          } catch (err: any) {
            let errorMsg = err.message

            // Add suggestions for field not found errors
            if (
              errorMsg.includes('Timeout') ||
              errorMsg.includes('not found')
            ) {
              const suggestions = availableFields
                .map(field => ({
                  field,
                  distance: levenshteinDistance(
                    selectorPart.toLowerCase(),
                    field.toLowerCase()
                  ),
                }))
                .filter(s => s.distance <= 3) // Only suggest if reasonably close
                .sort((a, b) => a.distance - b.distance)
                .slice(0, 3)
                .map(s => s.field)

              if (suggestions.length > 0) {
                errorMsg += `. Did you mean: ${suggestions.join(', ')}?`
              }
            }

            const fullErrorMsg = `Failed to fill ${selectorPart}: ${errorMsg}`
            errors.push(fullErrorMsg)
            results.push({
              field: selectorPart,
              value,
              success: false,
              error: errorMsg,
            })

            // Display error immediately for better visibility
            if (!quiet && !json) {
              console.log(`  ⚠️  ${fullErrorMsg}`)
            }
          }
        }
      }
    })

    // Handle output based on flags
    if (json) {
      // JSON output - match test expectations
      const filledFields = results.filter(r => r.success).map(r => r.field)
      const failedFields = results.filter(r => !r.success).map(r => r.field)

      console.log(
        JSON.stringify(
          {
            success: errors.length === 0,
            filled: filledFields,
            failed: failedFields,
            total: fields!.length,
            results,
          },
          null,
          2
        )
      )
    } else if (!quiet) {
      // Report summary - use proper pluralization
      const actualFieldCount = isLegacySyntax
        ? fields!.length / 2
        : fields!.length
      const fieldWord = actualFieldCount === 1 ? 'field' : 'fields'
      const summaryMsg =
        filledCount === actualFieldCount
          ? `filled ${filledCount} ${fieldWord}${tabTarget}`
          : filledCount === 0
            ? `Failed to fill any ${fieldWord}${tabTarget}`
            : `filled ${filledCount} of ${actualFieldCount} ${fieldWord}${tabTarget}`

      if (filledCount === actualFieldCount) {
        console.log(`✅ ${summaryMsg}`)
      } else {
        console.log(`⚠️ ${summaryMsg}`)
      }
    }
  },
})
