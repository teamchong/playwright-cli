/**
 * Type Command - Yargs Implementation
 * 
 * Types text into an element using Playwright's page.type() or page.fill() methods.
 * Supports clearing fields before typing and controlling typing speed.
 */

import { createCommand } from '../../lib/command-builder';
import { BrowserHelper } from '../../../lib/browser-helper';
import { findElementByRef, nodeToSelector } from '../../../lib/ref-utils';
import type { TypeOptions } from '../../types';

export const typeCommand = createCommand<TypeOptions>({
  metadata: {
    name: 'type',
    category: 'interaction',
    description: 'Type text into an element',
    aliases: []
  },
  
  command: 'type <selector> <text>',
  describe: 'Type text into an element',
  
  builder: (yargs) => {
    return yargs
      .positional('selector', {
        describe: 'Element selector',
        type: 'string',
        demandOption: true
      })
      .positional('text', {
        describe: 'Text to type',
        type: 'string',
        demandOption: true
      })
      .option('port', {
        describe: 'Chrome debugging port',
        type: 'number',
        default: 9222,
        alias: 'p'
      })
      .option('delay', {
        describe: 'Delay between keystrokes in milliseconds',
        type: 'number',
        default: 0
      })
      .option('timeout', {
        describe: 'Timeout in milliseconds',
        type: 'number',
        default: 5000
      })
      .option('clear', {
        describe: 'Clear field before typing',
        type: 'boolean',
        default: false
      });
  },
  
  handler: async ({ argv, logger, spinner }) => {
    const { selector, text, port, delay, timeout, clear } = argv;
    
    if (spinner) {
      spinner.text = `Typing into ${selector}...`;
    }
    
    await BrowserHelper.withActivePage(port, async (page) => {
      let actualSelector = selector;
      
      // Check if it's a ref selector
      const refMatch = selector.match(/^\[ref=([a-f0-9]+)\]$/);
      if (refMatch) {
        const targetRef = refMatch[1];
        if (spinner) {
          spinner.text = `Finding element with ref=${targetRef}...`;
        }
        
        // Get accessibility snapshot
        const snapshot = await page.accessibility.snapshot();
        
        // Find the element with this ref
        const element = findElementByRef(snapshot, targetRef);
        
        if (!element) {
          throw new Error(`No element found with ref=${targetRef}`);
        }
        
        // Convert to a selector
        actualSelector = nodeToSelector(element);
        if (spinner) {
          spinner.text = `Typing into ${element.role} "${element.name || ''}"...`;
        }
      }
      
      if (clear) {
        await page.fill(actualSelector, text, { timeout });
      } else {
        await page.type(actualSelector, text, {
          delay,
          timeout
        });
      }
    });
    
    logger.success(`Typed text into ${selector}`);
  }
});