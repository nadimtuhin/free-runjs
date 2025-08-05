import { ModuleType, defaultCode } from '../moduleTypes'

describe('Module Types', () => {
  describe('Type definitions', () => {
    test('should accept valid module types', () => {
      const esmType: ModuleType = 'esm'
      const cjsType: ModuleType = 'commonjs'
      
      expect(esmType).toBe('esm')
      expect(cjsType).toBe('commonjs')
    })
  })

  describe('Default code', () => {
    test('should have ESM default code', () => {
      expect(defaultCode.esm).toBeDefined()
      expect(typeof defaultCode.esm).toBe('string')
      expect(defaultCode.esm.length).toBeGreaterThan(0)
    })

    test('should have CommonJS default code', () => {
      expect(defaultCode.commonjs).toBeDefined()
      expect(typeof defaultCode.commonjs).toBe('string')
      expect(defaultCode.commonjs.length).toBeGreaterThan(0)
    })

    test('ESM code should contain import statements', () => {
      expect(defaultCode.esm).toContain('import')
      expect(defaultCode.esm).toContain('from')
    })

    test('CommonJS code should contain require statements', () => {
      expect(defaultCode.commonjs).toContain('require')
      expect(defaultCode.commonjs).toContain('const')
    })

    test('both code examples should use lodash', () => {
      expect(defaultCode.esm).toContain('lodash')
      expect(defaultCode.commonjs).toContain('lodash')
    })

    test('both code examples should have console.log statements', () => {
      expect(defaultCode.esm).toContain('console.log')
      expect(defaultCode.commonjs).toContain('console.log')
    })

    test('ESM code should be valid JavaScript syntax', () => {
      // Check for basic JavaScript syntax patterns
      expect(defaultCode.esm).toMatch(/import\s+.*from/)
      expect(defaultCode.esm).toMatch(/const\s+\w+\s*=/)
      expect(defaultCode.esm).toMatch(/console\.log\(/)
    })

    test('CommonJS code should be valid JavaScript syntax', () => {
      // Check for basic JavaScript syntax patterns
      expect(defaultCode.commonjs).toMatch(/const\s+.*=\s*require\(/)
      expect(defaultCode.commonjs).toMatch(/console\.log\(/)
    })

    test('code examples should demonstrate different module patterns', () => {
      // ESM should use modern import syntax
      expect(defaultCode.esm).toMatch(/import\s+_\s+from\s+['"]lodash['"]/)
      
      // CommonJS should use require syntax
      expect(defaultCode.commonjs).toMatch(/const\s+_\s*=\s*require\(['"]lodash['"]\)/)
    })

    test('code examples should be substantial', () => {
      // Should be more than just simple examples
      expect(defaultCode.esm.split('\n').length).toBeGreaterThan(10)
      expect(defaultCode.commonjs.split('\n').length).toBeGreaterThan(10)
    })

    test('code examples should demonstrate different lodash features', () => {
      // ESM example features
      expect(defaultCode.esm).toContain('_.chain')
      expect(defaultCode.esm).toContain('_.uniq')
      expect(defaultCode.esm).toContain('_.template')
      
      // CommonJS example features
      expect(defaultCode.commonjs).toContain('_.groupBy')
      expect(defaultCode.commonjs).toContain('_.sumBy')
    })
  })
})