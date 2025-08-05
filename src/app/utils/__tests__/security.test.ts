import {
  ALLOWED_PACKAGES,
  DANGEROUS_PATTERNS,
  validatePackageName,
  scanCodeForDangerousPatterns,
  analyzeCodeComplexity,
  detectSuspiciousPatterns,
  scanForMaliciousContent,
  sanitizeEnvironment,
  EXECUTION_TIMEOUT,
  MAX_MEMORY_USAGE,
  MAX_CODE_COMPLEXITY,
  MAX_NESTED_LOOPS,
} from '../security'

describe('Security Utilities', () => {
  describe('Constants', () => {
    test('should have valid configuration constants', () => {
      expect(EXECUTION_TIMEOUT).toBe(10000)
      expect(MAX_MEMORY_USAGE).toBe(50 * 1024 * 1024)
      expect(MAX_CODE_COMPLEXITY).toBe(100)
      expect(MAX_NESTED_LOOPS).toBe(3)
    })

    test('should have allowed packages defined', () => {
      expect(ALLOWED_PACKAGES).toBeInstanceOf(Set)
      expect(ALLOWED_PACKAGES.size).toBeGreaterThan(50)
      expect(ALLOWED_PACKAGES.has('lodash')).toBe(true)
      expect(ALLOWED_PACKAGES.has('axios')).toBe(true)
      expect(ALLOWED_PACKAGES.has('react')).toBe(true)
    })

    test('should have dangerous patterns defined', () => {
      expect(DANGEROUS_PATTERNS).toBeInstanceOf(Array)
      expect(DANGEROUS_PATTERNS.length).toBeGreaterThan(10)
      expect(DANGEROUS_PATTERNS).toContain('require\\(.*fs.*\\)')
      expect(DANGEROUS_PATTERNS).toContain('eval\\(')
    })
  })

  describe('validatePackageName', () => {
    test('should allow whitelisted packages', () => {
      expect(validatePackageName('lodash')).toBe(true)
      expect(validatePackageName('axios')).toBe(true)
      expect(validatePackageName('react')).toBe(true)
      expect(validatePackageName('util')).toBe(true)
    })

    test('should reject non-whitelisted packages', () => {
      expect(validatePackageName('malicious-package')).toBe(false)
      expect(validatePackageName('evil-lib')).toBe(false)
      expect(validatePackageName('unknown-module')).toBe(false)
    })

    test('should reject packages with path traversal', () => {
      expect(validatePackageName('../../../etc/passwd')).toBe(false)
      expect(validatePackageName('package/../file')).toBe(false)
      expect(validatePackageName('lib\\windows\\system32')).toBe(false)
    })

    test('should reject empty or invalid package names', () => {
      expect(validatePackageName('')).toBe(false)
      expect(validatePackageName(' ')).toBe(false)
    })
  })

  describe('scanCodeForDangerousPatterns', () => {
    test('should detect file system operations', () => {
      const code = "const fs = require('fs'); fs.writeFileSync('/etc/passwd', 'hacked');"
      const violations = scanCodeForDangerousPatterns(code)
      
      expect(violations.length).toBeGreaterThan(0)
      expect(violations.some(v => v.includes('require\\(.*fs.*\\)'))).toBe(true)
      expect(violations.some(v => v.includes('\\.writeFile'))).toBe(true)
    })

    test('should detect process operations', () => {
      const code = 'process.exit(1); process.kill(123);'
      const violations = scanCodeForDangerousPatterns(code)
      
      expect(violations.length).toBeGreaterThan(0)
      expect(violations.some(v => v.includes('process\\.exit'))).toBe(true)
    })

    test('should detect eval usage', () => {
      const code = "eval('malicious code'); new Function('return process')();"
      const violations = scanCodeForDangerousPatterns(code)
      
      expect(violations.length).toBeGreaterThan(0)
      expect(violations.some(v => v.includes('eval\\('))).toBe(true)
      expect(violations.some(v => v.includes('Function\\('))).toBe(true)
    })

    test('should return empty array for safe code', () => {
      const code = 'console.log("Hello World"); const x = 1 + 2;'
      const violations = scanCodeForDangerousPatterns(code)
      
      expect(violations).toEqual([])
    })

    test('should detect child process operations', () => {
      const code = "const { exec } = require('child_process'); exec('rm -rf /');"
      const violations = scanCodeForDangerousPatterns(code)
      
      expect(violations.length).toBeGreaterThan(0)
      expect(violations.some(v => v.includes('child_process') || v.includes('exec'))).toBe(true)
    })
  })

  describe('analyzeCodeComplexity', () => {
    test('should calculate basic complexity correctly', () => {
      const code = `
        function test() {
          if (true) {
            console.log("hello");
          }
        }
      `
      const result = analyzeCodeComplexity(code)
      
      expect(result.complexity).toBeGreaterThan(1)
      expect(result.nestedLoops).toBe(0)
      expect(result.violations).toEqual([])
    })

    test('should detect nested loops', () => {
      const code = `
        for (let i = 0; i < 10; i++) {
          for (let j = 0; j < 10; j++) {
            console.log(i, j);
          }
        }
      `
      const result = analyzeCodeComplexity(code)
      
      expect(result.nestedLoops).toBe(2)
      expect(result.violations).toEqual([])
    })

    test('should flag overly complex code', () => {
      let complexCode = 'let x = 1;\n'
      
      // Create code with high complexity
      for (let i = 0; i < 50; i++) {
        complexCode += `if (x === ${i}) { x++; } else if (x > ${i}) { x--; } else { x = ${i}; }\n`
      }
      
      const result = analyzeCodeComplexity(complexCode)
      
      expect(result.complexity).toBeGreaterThan(MAX_CODE_COMPLEXITY)
      expect(result.violations.some(v => v.includes('complexity too high'))).toBe(true)
    })

    test('should flag too many nested loops', () => {
      const code = `
        for (let a = 0; a < 10; a++) {
          for (let b = 0; b < 10; b++) {
            for (let c = 0; c < 10; c++) {
              for (let d = 0; d < 10; d++) {
                console.log(a, b, c, d);
              }
            }
          }
        }
      `
      const result = analyzeCodeComplexity(code)
      
      expect(result.nestedLoops).toBeGreaterThan(MAX_NESTED_LOOPS)
      expect(result.violations.some(v => v.includes('nested loops'))).toBe(true)
    })

    test('should handle empty code', () => {
      const result = analyzeCodeComplexity('')
      
      expect(result.complexity).toBe(1)
      expect(result.nestedLoops).toBe(0)
      expect(result.violations).toEqual([])
    })
  })

  describe('detectSuspiciousPatterns', () => {
    test('should detect cryptocurrency-related terms', () => {
      const code = 'const bitcoin = require("crypto"); mining.start();'
      const violations = detectSuspiciousPatterns(code)
      
      expect(violations.length).toBeGreaterThan(0)
      expect(violations.some(v => v.includes('bitcoin') || v.includes('mining'))).toBe(true)
    })

    test('should detect network attack patterns', () => {
      const code = 'nmap.scan("target"); exploit.run();'
      const violations = detectSuspiciousPatterns(code)
      
      expect(violations.length).toBeGreaterThan(0)
      expect(violations.some(v => v.includes('nmap') || v.includes('exploit'))).toBe(true)
    })

    test('should detect data exfiltration attempts', () => {
      const code = 'exfiltrate(password); steal(credentials);'
      const violations = detectSuspiciousPatterns(code)
      
      expect(violations.length).toBeGreaterThan(0)
      expect(violations.some(v => v.includes('exfiltrate') || v.includes('password'))).toBe(true)
    })

    test('should detect obfuscation attempts', () => {
      const code = 'const x = "\\x48\\x65\\x6c\\x6c\\x6f"; const y = "\\u0048\\u0065\\u006c\\u006c\\u006f";'
      const violations = detectSuspiciousPatterns(code)
      
      expect(violations.length).toBeGreaterThan(0)
    })

    test('should detect high iteration loops', () => {
      const code = 'for (let i = 0; i < 1000000; i++) { console.log(i); }'
      const violations = detectSuspiciousPatterns(code)
      
      expect(violations.length).toBeGreaterThan(0)
    })

    test('should return empty array for normal code', () => {
      const code = 'console.log("Hello World"); const sum = (a, b) => a + b;'
      const violations = detectSuspiciousPatterns(code)
      
      expect(violations).toEqual([])
    })
  })

  describe('scanForMaliciousContent', () => {
    test('should detect excessive string concatenation', () => {
      // Create pattern that matches exactly: ['"`][^'"]*['"`]\s*\+\s*['"`][^'"]*['"`]
      let parts = []
      for (let i = 0; i < 105; i++) {
        parts.push('"test" + "more"')
      }
      const code = `let str = ${parts.join(' + ')};`
      
      const violations = scanForMaliciousContent(code)
      
      expect(violations.some(v => v.includes('string concatenation'))).toBe(true)
    })

    test('should detect very long strings', () => {
      const longString = 'a'.repeat(15000)
      const code = `const x = "${longString}";`
      
      const violations = scanForMaliciousContent(code)
      
      expect(violations.some(v => v.includes('long strings'))).toBe(true)
    })

    test('should detect excessive function calls', () => {
      let code = ''
      for (let i = 0; i < 1500; i++) {
        code += `func${i}(); `
      }
      
      const violations = scanForMaliciousContent(code)
      
      expect(violations.some(v => v.includes('function calls'))).toBe(true)
    })

    test('should return empty array for normal code', () => {
      const code = 'function hello() { return "world"; } hello();'
      const violations = scanForMaliciousContent(code)
      
      expect(violations).toEqual([])
    })
  })

  describe('sanitizeEnvironment', () => {
    test('should return minimal environment', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'test'
      
      const env = sanitizeEnvironment()
      
      expect(env).toHaveProperty('NODE_ENV', 'test')
      expect(Object.keys(env).length).toBeLessThanOrEqual(5) // Should be minimal
      
      process.env.NODE_ENV = originalEnv
    })

    test('should not expose sensitive variables', () => {
      const env = sanitizeEnvironment()
      
      expect(env).not.toHaveProperty('API_KEY')
      expect(env).not.toHaveProperty('SECRET')
      expect(env).not.toHaveProperty('PASSWORD')
      expect(env).not.toHaveProperty('TOKEN')
    })
  })
})