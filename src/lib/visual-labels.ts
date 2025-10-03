/**
 * Visual Labels System - Displays A-Z style labels on interactive elements
 *
 * This module provides functionality to inject visual labels (A, B, C... AA, AB, etc.)
 * directly onto webpage elements, making them easily identifiable for AI agents.
 */

/**
 * Converts a number to Excel-style column notation (A, B, C... AA, AB, etc.)
 * @param num - Zero-based index
 * @returns Excel-style column string
 */
export function numberToExcelColumn(num: number): string {
  let column = ''
  let n = num

  while (n >= 0) {
    column = String.fromCharCode(65 + (n % 26)) + column
    n = Math.floor(n / 26) - 1
    if (n < 0) break
  }

  return column
}

/**
 * Converts Excel-style column notation back to a number
 * @param column - Excel-style column string (A, B, AA, etc.)
 * @returns Zero-based index
 */
export function excelColumnToNumber(column: string): number {
  let result = 0
  for (let i = 0; i < column.length; i++) {
    result = result * 26 + (column.charCodeAt(i) - 64)
  }
  return result - 1
}

/**
 * Script to inject visual labels onto the page
 * This will be executed in the browser context
 */
export const injectVisualLabelsScript = `
(function() {
  // Remove any existing labels first
  const existingContainer = document.getElementById('playwright-visual-labels');
  if (existingContainer) {
    existingContainer.remove();
  }

  // Create container for labels
  const container = document.createElement('div');
  container.id = 'playwright-visual-labels';
  container.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 2147483647;';
  document.body.appendChild(container);

  // Find all interactive elements
  const interactiveSelectors = [
    'a[href]',
    'button',
    'input',
    'textarea',
    'select',
    '[role="button"]',
    '[role="link"]',
    '[role="checkbox"]',
    '[role="radio"]',
    '[role="textbox"]',
    '[role="combobox"]',
    '[role="menuitem"]',
    '[role="tab"]',
    '[role="switch"]',
    '[onclick]',
    '[tabindex]:not([tabindex="-1"])'
  ];

  const elements = document.querySelectorAll(interactiveSelectors.join(', '));
  const visibleElements = [];

  // Filter for visible elements
  Array.from(elements).forEach((element) => {
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);

    // Check if element is visible
    if (rect.width > 0 &&
        rect.height > 0 &&
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        style.opacity !== '0' &&
        rect.top < window.innerHeight &&
        rect.bottom > 0 &&
        rect.left < window.innerWidth &&
        rect.right > 0) {
      visibleElements.push({ element, rect });
    }
  });

  // Sort elements by position (top to bottom, left to right)
  visibleElements.sort((a, b) => {
    const topDiff = a.rect.top - b.rect.top;
    if (Math.abs(topDiff) > 10) return topDiff;
    return a.rect.left - b.rect.left;
  });

  // Create labels for each element
  visibleElements.forEach((item, index) => {
    const { element, rect } = item;

    // Generate Excel-style label (A, B, C... AA, AB, etc.)
    const labelText = window.numberToExcelColumn(index);

    // Store the label on the element for reference
    element.setAttribute('data-playwright-label', labelText);

    // Create visual label
    const label = document.createElement('div');
    label.className = 'playwright-label';
    label.textContent = labelText;
    label.setAttribute('data-label', labelText);

    // Position the label
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

    label.style.cssText = \`
      position: absolute;
      top: \${rect.top + scrollTop}px;
      left: \${rect.left + scrollLeft - 25}px;
      background: #ff6b35;
      color: white;
      padding: 2px 4px;
      border-radius: 3px;
      font-size: 11px;
      font-weight: bold;
      font-family: monospace;
      pointer-events: none;
      z-index: 2147483646;
      box-shadow: 0 1px 3px rgba(0,0,0,0.3);
      min-width: 18px;
      text-align: center;
      line-height: 1.2;
    \`;

    // Add hover effect via CSS
    container.appendChild(label);
  });

  // Add CSS for animations
  const style = document.createElement('style');
  style.textContent = \`
    .playwright-label {
      animation: playwright-label-fade-in 0.3s ease-out;
    }

    @keyframes playwright-label-fade-in {
      from {
        opacity: 0;
        transform: scale(0.8);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }

    [data-playwright-label]:hover {
      outline: 2px solid #ff6b35 !important;
      outline-offset: 2px !important;
    }
  \`;
  document.head.appendChild(style);

  // Return the number of labels created
  return visibleElements.length;
})();
`

/**
 * Script to remove visual labels from the page
 */
export const removeVisualLabelsScript = `
(function() {
  const container = document.getElementById('playwright-visual-labels');
  if (container) {
    container.remove();
  }

  // Remove data attributes
  document.querySelectorAll('[data-playwright-label]').forEach(el => {
    el.removeAttribute('data-playwright-label');
  });

  return true;
})();
`

/**
 * Script to get element by label
 */
export const getElementByLabelScript = (label: string) => `
(function() {
  const element = document.querySelector('[data-playwright-label="${label}"]');
  if (!element) return null;

  // Return element info
  const rect = element.getBoundingClientRect();
  return {
    tagName: element.tagName.toLowerCase(),
    id: element.id || null,
    className: element.className || null,
    text: element.textContent?.trim().substring(0, 100) || null,
    type: element.type || null,
    href: element.href || null,
    placeholder: element.placeholder || null,
    value: element.value || null,
    position: {
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height
    }
  };
})();
`

/**
 * Make the Excel column functions available in browser context
 */
export const injectHelperFunctionsScript = `
window.numberToExcelColumn = ${numberToExcelColumn.toString()};
window.excelColumnToNumber = ${excelColumnToNumber.toString()};
`