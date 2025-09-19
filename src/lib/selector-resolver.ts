/**
 * Selector Resolver - Converts text-based selectors to CSS selectors
 * 
 * This utility allows natural language text to find elements on the page,
 * providing a fallback when exact CSS selectors aren't available.
 */

export interface SelectorResolution {
  selector: string
  confidence: 'exact' | 'high' | 'medium' | 'low'
  strategy: 'css' | 'text-exact' | 'text-partial' | 'aria-label' | 'placeholder' | 'title'
}

/**
 * Resolve a text-based input to a CSS selector
 */
export function resolveSelector(input: string): SelectorResolution[] {
  const resolutions: SelectorResolution[] = []
  
  // If it's already a CSS selector, return as-is with highest confidence
  if (isCssSelector(input)) {
    resolutions.push({
      selector: input,
      confidence: 'exact',
      strategy: 'css'
    })
    return resolutions
  }
  
  // Try exact text match for buttons and links
  resolutions.push({
    selector: `button:has-text("${escapeText(input)}")`,
    confidence: 'high',
    strategy: 'text-exact'
  })
  
  resolutions.push({
    selector: `a:has-text("${escapeText(input)}")`,
    confidence: 'high', 
    strategy: 'text-exact'
  })
  
  // Try partial text match
  resolutions.push({
    selector: `button:has-text("${escapeText(input)}")`,
    confidence: 'medium',
    strategy: 'text-partial'
  })
  
  resolutions.push({
    selector: `a:has-text("${escapeText(input)}")`,
    confidence: 'medium',
    strategy: 'text-partial'
  })
  
  // Try aria-label match
  resolutions.push({
    selector: `[aria-label*="${escapeText(input)}" i]`,
    confidence: 'medium',
    strategy: 'aria-label'
  })
  
  // Try placeholder for inputs
  resolutions.push({
    selector: `input[placeholder*="${escapeText(input)}" i]`,
    confidence: 'medium',
    strategy: 'placeholder'
  })
  
  // Try title attribute
  resolutions.push({
    selector: `[title*="${escapeText(input)}" i]`,
    confidence: 'low',
    strategy: 'title'
  })
  
  // Try role-based selectors for common text
  if (input.toLowerCase().includes('button')) {
    resolutions.push({
      selector: '[role="button"]',
      confidence: 'low',
      strategy: 'aria-label'
    })
  }
  
  return resolutions
}

/**
 * Check if input looks like a CSS selector
 */
function isCssSelector(input: string): boolean {
  // If input has spaces, it's likely text content, not a CSS selector
  if (input.includes(' ') && !input.match(/[\>\+\~]/)) {
    return false
  }
  
  // Common CSS selector patterns
  // List of valid HTML tags to check against
  const validTags = ['a', 'button', 'div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'input', 'textarea', 'select', 'form', 'label', 'img', 'video', 'audio',
    'ul', 'ol', 'li', 'table', 'tr', 'td', 'th', 'thead', 'tbody', 'tfoot',
    'header', 'footer', 'nav', 'main', 'section', 'article', 'aside',
    'iframe', 'canvas', 'svg', 'path', 'g', 'rect', 'circle', 'text']
  
  // Check if it's a valid HTML tag name
  if (/^[a-zA-Z][\w-]*$/.test(input) && validTags.includes(input.toLowerCase())) {
    return true
  }
  
  const cssPatterns = [
    /^#[\w-]+$/,          // ID: #myid (must be complete)
    /^\.[\w-]+$/,         // Class: .myclass (must be complete)
    /^\[.+\]$/,           // Attribute: [data-test]
    /^[\w-]+\[.+\]$/,     // Tag with attribute: input[type="text"]
    /[\>\+\~]/,           // Combinators: > + ~ 
    /^:[\w-]+/,           // Pseudo: :hover
    /::[\w-]+/            // Pseudo-element: ::before
  ]
  
  return cssPatterns.some(pattern => pattern.test(input))
}

/**
 * Escape text for use in selectors
 */
function escapeText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/'/g, "\\'")
}

/**
 * Generate Playwright-compatible text selectors
 */
export function generatePlaywrightTextSelector(text: string): string[] {
  const escaped = escapeText(text)
  
  return [
    // Button with exact text (highest priority for buttons)
    `button:has-text("${escaped}")`,
    
    // Link with exact text
    `a:has-text("${escaped}")`,
    
    // Exact text match on any element  
    `text=${escaped}`,
    
    // Button with partial text
    `button:has-text("${escaped}")`,
    
    // Link with partial text
    `a:has-text("${escaped}")`,
    
    // Partial text match
    `text=${escaped}`,
    
    // Role-based selectors
    `[role="button"]:has-text("${escaped}")`,
    
    // Aria-label match
    `[aria-label*="${escaped}" i]`,
    
    // Placeholder match for inputs
    `input[placeholder*="${escaped}" i]`,
    
    // Label-based input matching
    `input:near(label:has-text("${escaped}"))`,
    
    // Title attribute match
    `[title*="${escaped}" i]`
  ]
}

/**
 * Find the best selector from available options by testing them
 */
export async function findBestSelector(
  page: any, 
  textInput: string
): Promise<{ selector: string; strategy: string } | null> {
  
  // If it's already a CSS selector, return it as-is
  if (isCssSelector(textInput)) {
    return { 
      selector: textInput, 
      strategy: 'css' 
    }
  }
  
  // Debug logging
  const debug = process.env.DEBUG || false
  if (debug) {
    console.log(`[findBestSelector] Looking for text: "${textInput}"`)
  }
  
  // Try different approaches to find elements by text
  const strategies = [
    // Try form field by name attribute (high priority for form filling)
    { 
      selector: `input[name="${textInput}"], textarea[name="${textInput}"], select[name="${textInput}"]`,
      strategy: 'form-name'
    },
    // Try form field by id attribute
    { 
      selector: `input[id="${textInput}"], textarea[id="${textInput}"], select[id="${textInput}"]`,
      strategy: 'form-id'
    },
    // Try exact button text - using getByRole with exact match
    { 
      selector: `button:text-is("${textInput}")`,
      strategy: 'button-exact'
    },
    // Try exact link text
    { 
      selector: `a:text-is("${textInput}")`,
      strategy: 'link-exact'
    },
    // Try exact text match on any element
    { 
      selector: `:text-is("${textInput}")`,
      strategy: 'text-exact'
    },
    // Try button with partial text
    { 
      selector: `button:has-text("${textInput}")`,
      strategy: 'button-partial'
    },
    // Try link with partial text
    { 
      selector: `a:has-text("${textInput}")`,
      strategy: 'link-partial'
    },
    // Try partial text on any element
    { 
      selector: `:has-text("${textInput}")`,
      strategy: 'text-partial'
    },
    // Try input placeholder - case insensitive partial match
    { 
      selector: `input[placeholder*="${textInput}" i]`,
      strategy: 'placeholder'
    },
    // Try aria-label - case insensitive partial match
    { 
      selector: `[aria-label*="${textInput}" i]`,
      strategy: 'aria-label'
    },
    // Try elements with role=button
    { 
      selector: `[role="button"]:has-text("${textInput}")`,
      strategy: 'role-button'
    }
  ]
  
  // Try each strategy
  for (const { selector, strategy } of strategies) {
    try {
      const count = await page.locator(selector).count()
      if (debug) {
        console.log(`[findBestSelector] Testing ${strategy}: "${selector}" - found ${count} elements`)
      }
      if (count === 1) {
        // Perfect match - exactly one element
        if (debug) {
          console.log(`[findBestSelector] ✓ Found single match with ${strategy}`)
        }
        return { selector, strategy }
      } else if (count > 1) {
        // Multiple matches - return first one
        // Use .first() which is the proper Playwright way
        if (debug) {
          console.log(`[findBestSelector] ✓ Found ${count} matches with ${strategy}, using first`)
        }
        return { 
          selector: selector,
          strategy: strategy + '+first'
        }
      }
    } catch (error: any) {
      // Strategy failed, try next one
      // Debug logging to understand why selectors fail
      if (debug) {
        console.error(`[findBestSelector] ✗ ${strategy} failed: ${error?.message || error}`)
      }
      continue
    }
  }
  
  if (debug) {
    console.log(`[findBestSelector] ✗ No selector found for "${textInput}"`)
  }
  return null
}

// Removed unused function getStrategyFromSelector