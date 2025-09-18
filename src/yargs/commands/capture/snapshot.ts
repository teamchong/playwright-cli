import { CommandModule, Arguments } from 'yargs'
import chalk from 'chalk'

import { BrowserHelper } from '../../../lib/browser-helper'
import { logger } from '../../../lib/logger'
import { extractInteractiveElements } from '../../../lib/ref-utils'
import { refManager } from '../../../lib/ref-manager'

interface SnapshotArgs extends Arguments {
  'port': number
  'timeout': number
  'json'?: boolean
  'full'?: boolean
  'detailed'?: boolean
  'tab-index'?: number
  'tab-id'?: string
}

/**
 * Snapshot command that captures the page's accessibility tree.
 * Extracts interactive elements with reference IDs for use with click/type commands.
 * Supports both compact (interactive-only) and full tree output modes.
 *
 * @example
 * ```bash
 * playwright snapshot                 # Show interactive elements with refs
 * playwright snapshot --full          # Show complete accessibility tree
 * playwright snapshot --json          # Output as JSON for scripting
 * ```
 */
export const snapshotCommand: CommandModule<{}, SnapshotArgs> = {
  command: 'snapshot',
  describe: 'Capture interactive elements from the current page',

  builder: yargs => {
    return yargs
      .option('port', {
        alias: 'p',
        describe: 'Chrome debugging port',
        type: 'number',
        default: 9222,
      })
      .option('timeout', {
        alias: 't',
        describe: 'Timeout in milliseconds',
        type: 'number',
        default: 30000,
      })
      .option('json', {
        describe: 'Output as JSON format',
        type: 'boolean',
      })
      .option('full', {
        describe: 'Show full accessibility tree (not just interactive)',
        type: 'boolean',
      })
      .option('detailed', {
        describe: 'Show detailed form field information',
        type: 'boolean',
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
      .conflicts('tab-index', 'tab-id')
  },

  handler: async argv => {
    const tabIndex = argv['tab-index'] as number | undefined
    const tabId = argv['tab-id'] as string | undefined

    try {
      await BrowserHelper.withTargetPage(
        argv.port,
        tabIndex,
        tabId,
        async page => {
          const snapshot = await page.accessibility.snapshot()

          if (argv.full) {
            // Show full tree (old behavior)
            if (argv.json) {
              logger.info(JSON.stringify(snapshot, null, 2))
            } else {
              const printNode = (node: any, indent = '') => {
                const role = node.role || 'unknown'
                const name = node.name ? ` "${node.name}"` : ''
                logger.info(`${indent}${role}${name}`)

                if (node.children) {
                  node.children.forEach((child: any) => {
                    printNode(child, indent + '  ')
                  })
                }
              }

              logger.info('Full Accessibility Tree:')
              if (snapshot) {
                printNode(snapshot)
              }
            }
          } else {
            // Show only interactive elements with refs (new default)
            const interactiveElements = extractInteractiveElements(snapshot)
            
            // Store refs in RefManager for later use
            refManager.storeSnapshot(interactiveElements, tabId)

            // Get detailed form information if --detailed flag is used
            let detailedFormInfo: any = null
            if (argv.detailed) {
              detailedFormInfo = await page.evaluate(`
                const forms = Array.from(document.querySelectorAll('form'));
                const inputs = Array.from(document.querySelectorAll('input, textarea, select'));
                
                const formDetails = forms.map((form, index) => {
                  const formInputs = Array.from(form.querySelectorAll('input, textarea, select'));
                  return {
                    index,
                    id: form.id || null,
                    action: form.action || null,
                    method: form.method || 'get',
                    inputCount: formInputs.length,
                    inputs: formInputs.map(input => ({
                      type: input.type || input.tagName.toLowerCase(),
                      name: input.name || null,
                      id: input.id || null,
                      placeholder: input.placeholder || null,
                      value: input.value || null,
                      required: input.required || false,
                      disabled: input.disabled || false
                    }))
                  };
                });
                
                const standaloneInputs = inputs.filter(input => !input.closest('form')).map(input => ({
                  type: input.type || input.tagName.toLowerCase(),
                  name: input.name || null,
                  id: input.id || null,
                  placeholder: input.placeholder || null,
                  value: input.value || null,
                  required: input.required || false,
                  disabled: input.disabled || false
                }));
                
                return {
                  forms: formDetails,
                  standaloneInputs
                };
              `)
            }

            if (argv.json) {
              const output = argv.detailed 
                ? { interactiveElements, detailedFormInfo }
                : interactiveElements
              logger.info(JSON.stringify(output, null, 2))
            } else {
              logger.info('Interactive Elements:')
              logger.info(chalk.gray('─'.repeat(40)))

              if (interactiveElements.length === 0) {
                logger.warn('No interactive elements found')
              } else {
                interactiveElements.forEach(elem => {
                  const roleColor =
                    elem.role === 'button'
                      ? chalk.green
                      : elem.role === 'link'
                        ? chalk.blue
                        : elem.role === 'textbox'
                          ? chalk.yellow
                          : chalk.white

                  const name = elem.name || '(no text)'
                  
                  if (argv.detailed && elem.role === 'textbox') {
                    // Find matching detailed info for this input
                    const matchingInput = detailedFormInfo?.standaloneInputs?.find((input: any) => 
                      input.placeholder === elem.name || input.name === elem.name || input.id === elem.name
                    ) || detailedFormInfo?.forms?.flatMap((form: any) => form.inputs)?.find((input: any) =>
                      input.placeholder === elem.name || input.name === elem.name || input.id === elem.name
                    )
                    
                    let details = ''
                    if (matchingInput) {
                      const parts = []
                      if (matchingInput.type && matchingInput.type !== 'text') parts.push(`type=${matchingInput.type}`)
                      if (matchingInput.name) parts.push(`name=${matchingInput.name}`)
                      if (matchingInput.required) parts.push('required')
                      if (matchingInput.value) parts.push(`value="${matchingInput.value}"`)
                      if (parts.length > 0) details = chalk.gray(` (${parts.join(', ')})`)
                    }
                    
                    logger.info(
                      `${roleColor(elem.role)} "${name}" ${chalk.gray(`[ref=${elem.ref}]`)}${details}`
                    )
                  } else {
                    logger.info(
                      `${roleColor(elem.role)} "${name}" ${chalk.gray(`[ref=${elem.ref}]`)}`
                    )
                  }
                })
              }

              // Show detailed form information if requested
              if (argv.detailed && detailedFormInfo) {
                logger.info('')
                logger.info(chalk.blue('📋 Detailed Form Information:'))
                logger.info(chalk.gray('─'.repeat(40)))
                
                if (detailedFormInfo.forms && detailedFormInfo.forms.length > 0) {
                  detailedFormInfo.forms.forEach((form: any, index: number) => {
                    logger.info(chalk.cyan(`Form ${index + 1}:`))
                    if (form.id) logger.info(`  ID: ${form.id}`)
                    if (form.action) logger.info(`  Action: ${form.action}`)
                    logger.info(`  Method: ${form.method}`)
                    logger.info(`  ${form.inputCount} input field(s):`)
                    
                    form.inputs.forEach((input: any, inputIndex: number) => {
                      const statusIcon = input.value ? '✓' : '○'
                      const requiredFlag = input.required ? chalk.red(' *') : ''
                      const disabledFlag = input.disabled ? chalk.gray(' (disabled)') : ''
                      
                      logger.info(`    ${statusIcon} ${input.type} "${input.placeholder || input.name || input.id || 'unnamed'}"${requiredFlag}${disabledFlag}`)
                      if (input.value) {
                        logger.info(`      Current value: "${input.value}"`)
                      }
                    })
                    logger.info('')
                  })
                }
                
                if (detailedFormInfo.standaloneInputs && detailedFormInfo.standaloneInputs.length > 0) {
                  logger.info(chalk.cyan('Standalone Inputs (not in forms):'))
                  detailedFormInfo.standaloneInputs.forEach((input: any) => {
                    const statusIcon = input.value ? '✓' : '○'
                    const requiredFlag = input.required ? chalk.red(' *') : ''
                    const disabledFlag = input.disabled ? chalk.gray(' (disabled)') : ''
                    
                    logger.info(`  ${statusIcon} ${input.type} "${input.placeholder || input.name || input.id || 'unnamed'}"${requiredFlag}${disabledFlag}`)
                    if (input.value) {
                      logger.info(`    Current value: "${input.value}"`)
                    }
                  })
                }
              }

              logger.info(chalk.gray('─'.repeat(40)))
              logger.info(
                chalk.gray(
                  `Found ${interactiveElements.length} interactive elements`
                )
              )
              
              if (argv.detailed) {
                const totalForms = detailedFormInfo?.forms?.length || 0
                const totalInputs = (detailedFormInfo?.forms?.reduce((sum: number, form: any) => sum + form.inputCount, 0) || 0) + 
                                   (detailedFormInfo?.standaloneInputs?.length || 0)
                logger.info(chalk.gray(`${totalForms} form(s), ${totalInputs} input field(s)`))
              }
            }
          }
        }
      )
      // Exit cleanly

      return
    } catch (error: any) {
      logger.error(chalk.red(`❌ Failed to capture snapshot: ${error.message}`))
      throw new Error('Command failed')
    }
  },
}
