import { describe, it, expect } from 'vitest'

import {
  generateRef,
  isInteractive,
  findElementByRef,
  nodeToSelector,
  extractInteractiveElements,
} from '../ref-utils'

describe('ref-utils', () => {
  describe('generateRef', () => {
    it('should generate consistent ref for same element', () => {
      const node = {
        role: 'button',
        name: 'Submit',
        value: '',
      }

      const ref1 = generateRef(node, 'path1')
      const ref2 = generateRef(node, 'path1')

      expect(ref1).toBe(ref2)
      expect(ref1).toHaveLength(6)
    })

    it('should generate different refs for different elements', () => {
      const node1 = { role: 'button', name: 'Submit' }
      const node2 = { role: 'button', name: 'Cancel' }

      const ref1 = generateRef(node1, 'path')
      const ref2 = generateRef(node2, 'path')

      expect(ref1).not.toBe(ref2)
    })

    it('should generate different refs for same element at different paths', () => {
      const node = { role: 'button', name: 'Submit' }

      const ref1 = generateRef(node, 'path1')
      const ref2 = generateRef(node, 'path2')

      expect(ref1).not.toBe(ref2)
    })
  })

  describe('isInteractive', () => {
    it('should identify interactive roles', () => {
      const interactiveRoles = [
        'button',
        'link',
        'textbox',
        'checkbox',
        'radio',
        'combobox',
        'menuitem',
        'tab',
        'switch',
        'slider',
        'searchbox',
        'spinbutton',
        'option',
      ]

      interactiveRoles.forEach(role => {
        expect(isInteractive({ role })).toBe(true)
      })
    })

    it('should identify focusable elements as interactive', () => {
      expect(isInteractive({ role: 'div', focusable: true })).toBe(true)
    })

    it('should identify clickable elements as interactive', () => {
      expect(isInteractive({ role: 'div', clickable: true })).toBe(true)
    })

    it('should identify non-interactive elements', () => {
      expect(isInteractive({ role: 'heading' })).toBe(false)
      expect(isInteractive({ role: 'paragraph' })).toBe(false)
      expect(isInteractive({ role: 'image' })).toBe(false)
    })
  })

  describe('findElementByRef', () => {
    it('should find element by ref', () => {
      const tree = {
        role: 'root',
        children: [
          { role: 'button', name: 'Submit' },
          { role: 'button', name: 'Cancel' },
        ],
      }

      const targetRef = generateRef(tree.children[1], '-1')
      const found = findElementByRef(tree, targetRef)

      expect(found).toEqual(tree.children[1])
    })

    it('should find nested element by ref', () => {
      const tree = {
        role: 'root',
        children: [
          {
            role: 'div',
            children: [{ role: 'button', name: 'Deep Button' }],
          },
        ],
      }

      const targetRef = generateRef(tree.children[0].children[0], '-0-0')
      const found = findElementByRef(tree, targetRef)

      expect(found).toEqual(tree.children[0].children[0])
    })

    it('should return null for non-existent ref', () => {
      const tree = { role: 'root' }
      const found = findElementByRef(tree, 'nonexistent')

      expect(found).toBeNull()
    })

    it('should handle null node', () => {
      const found = findElementByRef(null, 'anyref')
      expect(found).toBeNull()
    })
  })

  describe('nodeToSelector', () => {
    it('should create button selector with text', () => {
      const node = { role: 'button', name: 'Submit' }
      expect(nodeToSelector(node)).toBe('button:has-text("Submit")')
    })

    it('should create link selector with text', () => {
      const node = { role: 'link', name: 'Home' }
      expect(nodeToSelector(node)).toBe('a:has-text("Home")')
    })

    it('should create textbox selector with aria-label', () => {
      const node = { role: 'textbox', name: 'Email' }
      // The function now returns a compound selector for better matching
      expect(nodeToSelector(node)).toBe('input[placeholder="Email"], input[aria-label="Email"]')
    })

    it('should create textbox selector with value', () => {
      const node = { role: 'textbox', value: 'test@example.com' }
      expect(nodeToSelector(node)).toBe('input[value="test@example.com"]')
    })

    it('should create generic textbox selector', () => {
      const node = { role: 'textbox' }
      expect(nodeToSelector(node)).toBe('input[type="text"]')
    })

    it('should create checkbox selector', () => {
      const node = { role: 'checkbox', name: 'Agree' }
      expect(nodeToSelector(node)).toBe(
        'input[type="checkbox"][aria-label="Agree"]'
      )
    })

    it('should create radio selector', () => {
      const node = { role: 'radio', name: 'Option 1' }
      expect(nodeToSelector(node)).toBe(
        'input[type="radio"][aria-label="Option 1"]'
      )
    })

    it('should fallback to text content selector', () => {
      const node = { role: 'unknown', name: 'Some text' }
      expect(nodeToSelector(node)).toBe(':has-text("Some text")')
    })

    it('should return wildcard for unknown element without name', () => {
      const node = { role: 'unknown' }
      expect(nodeToSelector(node)).toBe('*')
    })
  })

  describe('extractInteractiveElements', () => {
    it('should extract interactive elements from tree', () => {
      const tree = {
        role: 'root',
        children: [
          { role: 'heading', name: 'Title' },
          { role: 'button', name: 'Submit' },
          { role: 'link', name: 'Home' },
        ],
      }

      const elements = extractInteractiveElements(tree)

      expect(elements).toHaveLength(2)
      expect(elements[0]).toMatchObject({
        role: 'button',
        name: 'Submit',
      })
      expect(elements[1]).toMatchObject({
        role: 'link',
        name: 'Home',
      })
    })

    it('should extract nested interactive elements', () => {
      const tree = {
        role: 'root',
        children: [
          {
            role: 'div',
            children: [
              { role: 'button', name: 'Nested Button' },
              { role: 'textbox', value: 'test' },
            ],
          },
        ],
      }

      const elements = extractInteractiveElements(tree)

      expect(elements).toHaveLength(2)
      expect(elements[0].name).toBe('Nested Button')
      expect(elements[1].name).toBe('test')
    })

    it('should include ref and description in extracted elements', () => {
      const tree = {
        role: 'button',
        name: 'Submit',
        description: 'Submit the form',
      }

      const elements = extractInteractiveElements(tree)

      expect(elements).toHaveLength(1)
      expect(elements[0]).toHaveProperty('ref')
      expect(elements[0].ref).toHaveLength(6)
      expect(elements[0].description).toBe('Submit the form')
    })

    it('should handle empty tree', () => {
      const elements = extractInteractiveElements(null)
      expect(elements).toEqual([])
    })

    it('should handle tree without interactive elements', () => {
      const tree = {
        role: 'root',
        children: [
          { role: 'heading', name: 'Title' },
          { role: 'paragraph', name: 'Text' },
        ],
      }

      const elements = extractInteractiveElements(tree)
      expect(elements).toEqual([])
    })
  })
})
