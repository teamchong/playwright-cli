import { createHash } from 'crypto';

/**
 * Generates a deterministic reference identifier from element properties.
 * Same element will always produce the same ref across multiple calls.
 * Uses MD5 hashing for consistent 6-character identifiers.
 *
 * @param node - The accessibility tree node
 * @param path - The element's path in the tree (default: '')
 * @returns A 6-character hash string as the element reference
 *
 * @example
 * ```typescript
 * const node = { role: 'button', name: 'Submit', value: '' };
 * const ref = generateRef(node, 'root-0-1'); // Returns: 'a1b2c3'
 * ```
 */
export function generateRef(node: any, path: string = ''): string {
  const content = `${path}-${node.role}-${node.name || ''}-${node.value || ''}`;
  const hash = createHash('md5').update(content).digest('hex');
  return hash.substring(0, 6);
}

/**
 * Determines if an accessibility tree node represents an interactive element.
 * Checks against known interactive roles and properties like focusable/clickable.
 *
 * @param node - The accessibility tree node to test
 * @returns True if the element can be interacted with by users
 *
 * @example
 * ```typescript
 * const buttonNode = { role: 'button', name: 'Submit' };
 * const textNode = { role: 'text', name: 'Hello' };
 *
 * console.log(isInteractive(buttonNode)); // true
 * console.log(isInteractive(textNode));   // false
 * ```
 */
export function isInteractive(node: any): boolean {
  const interactiveRoles = [
    'button', 'link', 'textbox', 'checkbox', 'radio',
    'combobox', 'menuitem', 'tab', 'switch', 'slider',
    'searchbox', 'spinbutton', 'option'
  ];

  // Check role
  if (interactiveRoles.includes(node.role)) {
    return true;
  }

  // Check if it's clickable/focusable
  if (node.focusable || node.clickable) {
    return true;
  }

  return false;
}

/**
 * Searches for an element in the accessibility tree by its reference identifier.
 * Performs a depth-first search through the tree structure.
 *
 * @param node - The root node to start searching from
 * @param targetRef - The 6-character reference identifier to find
 * @param path - Current path in the tree traversal (default: '')
 * @returns The matching node or null if not found
 *
 * @example
 * ```typescript
 * const tree = { role: 'main', children: [{ role: 'button', name: 'Submit' }] };
 * const element = findElementByRef(tree, 'a1b2c3');
 * if (element) {
 *   console.log(`Found: ${element.role} - ${element.name}`);
 * }
 * ```
 */
export function findElementByRef(node: any, targetRef: string, path: string = ''): any {
  if (!node) return null;

  const currentRef = generateRef(node, path);
  if (currentRef === targetRef) {
    return node;
  }

  if (node.children) {
    for (let i = 0; i < node.children.length; i++) {
      const found = findElementByRef(node.children[i], targetRef, `${path}-${i}`);
      if (found) return found;
    }
  }

  return null;
}

/**
 * Converts an accessibility tree node to a Playwright-compatible CSS selector.
 * Generates selectors based on element role, name, and properties for reliable targeting.
 *
 * @param node - The accessibility tree node to convert
 * @returns A CSS selector string that can be used with Playwright
 *
 * @example
 * ```typescript
 * const buttonNode = { role: 'button', name: 'Submit' };
 * const linkNode = { role: 'link', name: 'Home' };
 * const inputNode = { role: 'textbox', name: 'Email', value: '' };
 *
 * console.log(nodeToSelector(buttonNode)); // 'button:has-text("Submit")'
 * console.log(nodeToSelector(linkNode));   // 'a:has-text("Home")'
 * console.log(nodeToSelector(inputNode));  // 'input[aria-label="Email"]'
 * ```
 */
export function nodeToSelector(node: any): string {
  // Try to create a unique selector based on the node properties
  if (node.role === 'button' && node.name) {
    return `button:has-text("${node.name}")`;
  }
  if (node.role === 'link' && node.name) {
    return `a:has-text("${node.name}")`;
  }
  if (node.role === 'textbox') {
    if (node.name) {
      return `input[aria-label="${node.name}"]`;
    }
    if (node.value) {
      return `input[value="${node.value}"]`;
    }
    return 'input[type="text"]';
  }
  if (node.role === 'checkbox') {
    return node.name ? `input[type="checkbox"][aria-label="${node.name}"]` : 'input[type="checkbox"]';
  }
  if (node.role === 'radio') {
    return node.name ? `input[type="radio"][aria-label="${node.name}"]` : 'input[type="radio"]';
  }

  // Fallback to text content
  if (node.name) {
    return `:has-text("${node.name}")`;
  }

  return '*'; // Last resort
}

/**
 * Extracts all interactive elements from an accessibility tree.
 * Recursively traverses the tree and collects elements that users can interact with.
 * Returns elements with their role, name, reference, and description.
 *
 * @param node - The root node to extract elements from
 * @param path - Current path in tree traversal (default: '')
 * @param results - Accumulator array for results (default: [])
 * @returns Array of interactive element objects with ref, role, name, and description
 *
 * @example
 * ```typescript
 * const tree = {
 *   role: 'main',
 *   children: [
 *     { role: 'button', name: 'Submit', description: 'Submit the form' },
 *     { role: 'text', name: 'Hello' }, // Not interactive
 *     { role: 'link', name: 'Home', description: 'Go to homepage' }
 *   ]
 * };
 *
 * const interactive = extractInteractiveElements(tree);
 * // Returns: [
 * //   { role: 'button', name: 'Submit', ref: 'abc123', description: 'Submit the form' },
 * //   { role: 'link', name: 'Home', ref: 'def456', description: 'Go to homepage' }
 * // ]
 * ```
 */
export function extractInteractiveElements(node: any, path: string = '', results: any[] = []): any[] {
  if (!node) return results;

  // Add current node if interactive
  if (isInteractive(node)) {
    const ref = generateRef(node, path);
    results.push({
      role: node.role,
      name: node.name || node.value || '',
      ref: ref,
      description: node.description
    });
  }

  // Recurse through children
  if (node.children) {
    node.children.forEach((child: any, index: number) => {
      extractInteractiveElements(child, `${path}-${index}`, results);
    });
  }

  return results;
}
