import { EditorTab, createNewTab, isValidTab, isValidTabs } from '../tabs'
import { ModuleType } from '../moduleTypes'

// Mock UUID generation to make tests predictable
jest.mock('../uuid', () => ({
  generateUUID: jest.fn(() => 'mock-uuid-123')
}))

describe('Tabs Utilities', () => {
  describe('createNewTab', () => {
    test('should create a new ESM tab', () => {
      const tab = createNewTab('esm')
      
      expect(tab).toMatchObject({
        id: 'mock-uuid-123',
        name: 'Untitled',
        moduleType: 'esm',
        code: expect.any(String)
      })
      expect(tab.code.length).toBeGreaterThan(0)
      expect(tab.code).toContain('import')
    })

    test('should create a new CommonJS tab', () => {
      const tab = createNewTab('commonjs')
      
      expect(tab).toMatchObject({
        id: 'mock-uuid-123',
        name: 'Untitled',
        moduleType: 'commonjs',
        code: expect.any(String)
      })
      expect(tab.code.length).toBeGreaterThan(0)
      expect(tab.code).toContain('require')
    })

    test('should use default code for the specified module type', () => {
      const esmTab = createNewTab('esm')
      const cjsTab = createNewTab('commonjs')
      
      expect(esmTab.code).not.toBe(cjsTab.code)
      expect(esmTab.code).toContain('import _ from')
      expect(cjsTab.code).toContain('const _ = require')
    })

    test('should generate unique IDs for each tab', () => {
      const { generateUUID } = require('../uuid')
      generateUUID.mockReturnValueOnce('id-1').mockReturnValueOnce('id-2')
      
      const tab1 = createNewTab('esm')
      const tab2 = createNewTab('commonjs')
      
      expect(tab1.id).toBe('id-1')
      expect(tab2.id).toBe('id-2')
    })
  })

  describe('isValidTab', () => {
    const validTab: EditorTab = {
      id: 'test-id',
      name: 'Test Tab',
      code: 'console.log("test")',
      moduleType: 'esm'
    }

    test('should return true for valid tab', () => {
      expect(isValidTab(validTab)).toBe(true)
    })

    test('should return false for null or undefined', () => {
      expect(isValidTab(null)).toBe(false)
      expect(isValidTab(undefined)).toBe(false)
    })

    test('should return false for non-object types', () => {
      expect(isValidTab('string')).toBe(false)
      expect(isValidTab(123)).toBe(false)
      expect(isValidTab(true)).toBe(false)
      expect(isValidTab([])).toBe(false)
    })

    test('should return false for object missing required properties', () => {
      expect(isValidTab({})).toBe(false)
      expect(isValidTab({ id: 'test' })).toBe(false)
      expect(isValidTab({ id: 'test', name: 'Test' })).toBe(false)
      expect(isValidTab({ id: 'test', name: 'Test', code: 'code' })).toBe(false)
    })

    test('should return false for object with wrong property types', () => {
      expect(isValidTab({
        id: 123, // should be string
        name: 'Test',
        code: 'code',
        moduleType: 'esm'
      })).toBe(false)

      expect(isValidTab({
        id: 'test',
        name: 123, // should be string
        code: 'code',
        moduleType: 'esm'
      })).toBe(false)

      expect(isValidTab({
        id: 'test',
        name: 'Test',
        code: 123, // should be string
        moduleType: 'esm'
      })).toBe(false)
    })

    test('should return false for invalid moduleType', () => {
      expect(isValidTab({
        id: 'test',
        name: 'Test',
        code: 'code',
        moduleType: 'invalid' as ModuleType
      })).toBe(false)

      expect(isValidTab({
        id: 'test',
        name: 'Test',
        code: 'code',
        moduleType: 123 as any
      })).toBe(false)
    })

    test('should return true for valid ESM tab', () => {
      expect(isValidTab({
        id: 'test',
        name: 'Test',
        code: 'import test from "test"',
        moduleType: 'esm'
      })).toBe(true)
    })

    test('should return true for valid CommonJS tab', () => {
      expect(isValidTab({
        id: 'test',
        name: 'Test',
        code: 'const test = require("test")',
        moduleType: 'commonjs'
      })).toBe(true)
    })

    test('should allow additional properties', () => {
      expect(isValidTab({
        id: 'test',
        name: 'Test',
        code: 'code',
        moduleType: 'esm',
        extraProperty: 'allowed'
      })).toBe(true)
    })
  })

  describe('isValidTabs', () => {
    const validTab1: EditorTab = {
      id: 'tab-1',
      name: 'Tab 1',
      code: 'console.log(1)',
      moduleType: 'esm'
    }

    const validTab2: EditorTab = {
      id: 'tab-2',
      name: 'Tab 2',
      code: 'console.log(2)',
      moduleType: 'commonjs'
    }

    test('should return true for array of valid tabs', () => {
      expect(isValidTabs([validTab1])).toBe(true)
      expect(isValidTabs([validTab1, validTab2])).toBe(true)
    })

    test('should return false for non-array', () => {
      expect(isValidTabs(null)).toBe(false)
      expect(isValidTabs(undefined)).toBe(false)
      expect(isValidTabs('string')).toBe(false)
      expect(isValidTabs({})).toBe(false)
      expect(isValidTabs(123)).toBe(false)
    })

    test('should return false for empty array', () => {
      expect(isValidTabs([])).toBe(false)
    })

    test('should return false if any tab is invalid', () => {
      const invalidTab = { id: 'invalid' } // missing required properties
      
      expect(isValidTabs([validTab1, invalidTab])).toBe(false)
      expect(isValidTabs([invalidTab, validTab1])).toBe(false)
    })

    test('should return false for array containing non-tab objects', () => {
      expect(isValidTabs([validTab1, 'not-a-tab'])).toBe(false)
      expect(isValidTabs([validTab1, null])).toBe(false)
      expect(isValidTabs([validTab1, undefined])).toBe(false)
    })

    test('should return true for mixed module types', () => {
      const esmTab = { ...validTab1, moduleType: 'esm' as ModuleType }
      const cjsTab = { ...validTab2, moduleType: 'commonjs' as ModuleType }
      
      expect(isValidTabs([esmTab, cjsTab])).toBe(true)
    })

    test('should handle large arrays', () => {
      const manyTabs = Array.from({ length: 100 }, (_, i) => ({
        ...validTab1,
        id: `tab-${i}`,
        name: `Tab ${i}`
      }))
      
      expect(isValidTabs(manyTabs)).toBe(true)
    })
  })
  
  describe('Type definitions', () => {
    test('EditorTab should have correct structure', () => {
      const tab: EditorTab = {
        id: 'test',
        name: 'Test',
        code: 'test code',
        moduleType: 'esm'
      }
      
      // TypeScript compilation ensures the type is correct
      expect(typeof tab.id).toBe('string')
      expect(typeof tab.name).toBe('string')
      expect(typeof tab.code).toBe('string')
      expect(['esm', 'commonjs']).toContain(tab.moduleType)
    })
  })
})