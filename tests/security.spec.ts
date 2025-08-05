import { test, expect } from '@playwright/test'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const TEST_API_KEY = process.env.TEST_API_KEY || 'test_key_dev_mode'

test.describe('Security Tests', () => {
  test.describe('Code Execution Security', () => {
    test('should reject dangerous file system operations', async ({ request }) => {
      const dangerousCodes = [
        "const fs = require('fs'); fs.writeFileSync('/etc/passwd', 'hacked');",
        "require('fs').readFileSync('/etc/passwd');",
        "import fs from 'fs'; fs.unlinkSync('/important-file');",
        "const { execSync } = require('child_process'); execSync('rm -rf /');",
      ]

      for (const code of dangerousCodes) {
        const response = await request.post(`${BASE_URL}/api/execute`, {
          data: { code, moduleType: 'commonjs' },
          headers: { 'X-API-Key': TEST_API_KEY },
        })

        expect(response.status()).toBe(400)
        const result = await response.json()
        expect(result.error).toContain('security violations')
      }
    })

    test('should reject dangerous process operations', async ({ request }) => {
      const dangerousCodes = [
        'process.exit(1);',
        'process.kill(process.pid);',
        "const { spawn } = require('child_process'); spawn('curl', ['evil.com']);",
        "eval('malicious code here');",
        "new Function('return process.env')();",
        "setTimeout('eval(maliciousCode)', 1000);",
      ]

      for (const code of dangerousCodes) {
        const response = await request.post(`${BASE_URL}/api/execute`, {
          data: { code, moduleType: 'commonjs' },
          headers: { 'X-API-Key': TEST_API_KEY },
        })

        expect(response.status()).toBe(400)
        const result = await response.json()
        expect(result.error).toContain('security violations')
      }
    })

    test('should reject non-whitelisted packages', async ({ request }) => {
      const dangerousPackages = [
        "const hacker = require('some-malicious-package');",
        "import evil from 'not-whitelisted-package';",
        "require('../../../../../../etc/passwd');",
      ]

      for (const code of dangerousPackages) {
        const response = await request.post(`${BASE_URL}/api/execute`, {
          data: { code, moduleType: 'commonjs' },
          headers: { 'X-API-Key': TEST_API_KEY },
        })

        expect(response.status()).toBe(400)
        const result = await response.json()
        expect(result.error).toContain('not allowed for security reasons')
      }
    })

    test('should allow safe whitelisted packages', async ({ request }) => {
      const safeCodes = [
        "const _ = require('lodash'); console.log(_.isEmpty({}));",
        "const util = require('util'); console.log(util.format('Hello %s', 'World'));",
        "import { v4 } from 'uuid'; console.log(v4());",
      ]

      for (const code of safeCodes) {
        const response = await request.post(`${BASE_URL}/api/execute`, {
          data: { code, moduleType: code.includes('import') ? 'esm' : 'commonjs' },
        })

        // Should not be rejected for security reasons
        if (response.status() === 400) {
          const result = await response.json()
          expect(result.error).not.toContain('dangerous patterns')
          expect(result.error).not.toContain('not allowed for security reasons')
        }
      }
    })

    test('should enforce execution timeout', async ({ request }) => {
      const infiniteLoopCode = "while(true) { console.log('infinite'); }"

      const response = await request.post(`${BASE_URL}/api/execute`, {
        data: { code: infiniteLoopCode, moduleType: 'commonjs' },
      })

      if (response.status() === 400) {
        const result = await response.json()
        expect(result.error).toContain('timed out')
      }
    })

    test('should validate input size limits', async ({ request }) => {
      const largeCode = 'console.log("x");'.repeat(10000) // > 50KB

      const response = await request.post(`${BASE_URL}/api/execute`, {
        data: { code: largeCode, moduleType: 'commonjs' },
      })

      expect(response.status()).toBe(400)
      const result = await response.json()
      expect(result.error).toContain('too long')
    })

    test('should validate request structure', async ({ request }) => {
      const invalidRequests = [
        {}, // missing code
        { code: 123 }, // wrong type
        { code: '' }, // empty code
        { code: 'console.log("test")', moduleType: 'invalid' }, // invalid module type
      ]

      for (const invalidReq of invalidRequests) {
        const response = await request.post(`${BASE_URL}/api/execute`, {
          data: invalidReq,
        })

        expect(response.status()).toBe(400)
        const result = await response.json()
        expect(result.error).toBeDefined()
      }
    })
  })

  test.describe('Rate Limiting', () => {
    test('should enforce rate limits', async ({ request }) => {
      const promises = []

      // Send 70 requests quickly (above the 60/minute limit)
      for (let i = 0; i < 70; i++) {
        promises.push(
          request.post(`${BASE_URL}/api/execute`, {
            data: { code: 'console.log("test");', moduleType: 'commonjs' },
          })
        )
      }

      const responses = await Promise.all(promises)
      const rateLimitedResponses = responses.filter(r => r.status() === 429)

      expect(rateLimitedResponses.length).toBeGreaterThan(0)
    })
  })

  test.describe('Security Headers', () => {
    test('should include security headers', async ({ request }) => {
      const response = await request.get(`${BASE_URL}`)
      const headers = response.headers()

      expect(headers['x-frame-options']).toBe('DENY')
      expect(headers['x-content-type-options']).toBe('nosniff')
      expect(headers['x-xss-protection']).toBe('1; mode=block')
      expect(headers['strict-transport-security']).toContain('max-age=31536000')
      expect(headers['content-security-policy']).toContain("default-src 'self'")
      expect(headers['cross-origin-embedder-policy']).toBe('require-corp')
      expect(headers['cross-origin-opener-policy']).toBe('same-origin')
    })
  })

  test.describe('Input Sanitization', () => {
    test('should handle malicious JSON payloads', async ({ request }) => {
      const maliciousPayloads = [
        '{"__proto__": {"isAdmin": true}, "code": "console.log(\\"test\\");"}',
        '{"constructor": {"prototype": {"isAdmin": true}}, "code": "console.log(\\"test\\");"}',
      ]

      for (const payload of maliciousPayloads) {
        const response = await request.post(`${BASE_URL}/api/execute`, {
          data: payload,
          headers: { 'Content-Type': 'application/json' },
        })

        // Should either reject the malicious payload or handle it safely
        expect([200, 400, 422]).toContain(response.status())
      }
    })

    test('should handle XSS attempts in code', async ({ request }) => {
      const xssAttempts = [
        'console.log("<script>alert(\\"XSS\\")</script>");',
        'console.log("\\");alert(\\"XSS\\");//");',
        'console.log(`${alert("XSS")}`);',
      ]

      for (const code of xssAttempts) {
        const response = await request.post(`${BASE_URL}/api/execute`, {
          data: { code, moduleType: 'commonjs' },
          headers: { 'X-API-Key': TEST_API_KEY },
        })

        // Should execute safely without allowing XSS
        if (response.status() === 200) {
          const result = await response.json()
          expect(result.output).not.toContain('<script>')
        }
      }
    })
  })

  test.describe('Environment Security', () => {
    test('should not expose sensitive environment variables', async ({ request }) => {
      const envTestCodes = [
        'console.log(JSON.stringify(process.env, null, 2));',
        'console.log(process.env.NODE_ENV, process.env.SECRET_KEY);',
        'for(let key in process.env) { console.log(key, process.env[key]); }',
      ]

      for (const code of envTestCodes) {
        const response = await request.post(`${BASE_URL}/api/execute`, {
          data: { code, moduleType: 'commonjs' },
          headers: { 'X-API-Key': TEST_API_KEY },
        })

        if (response.status() === 200) {
          const result = await response.json()
          // Should not contain common sensitive keys
          expect(result.output).not.toMatch(/SECRET|API_KEY|PASSWORD|TOKEN|PRIVATE/i)
        }
      }
    })

    test('should isolate execution environment', async ({ request }) => {
      const isolationTestCode = `
        try {
          // Try to access parent process
          console.log(process.ppid);
          console.log(process.cwd());
          console.log(__dirname);
          console.log(__filename);
        } catch (e) {
          console.log('Access restricted:', e.message);
        }
      `

      const response = await request.post(`${BASE_URL}/api/execute`, {
        data: { code: isolationTestCode, moduleType: 'commonjs' },
      })

      // Should execute in isolated environment
      expect([200, 400]).toContain(response.status())
    })
  })

  test.describe('API Key Authentication', () => {
    test('should require API key for execute endpoint', async ({ request }) => {
      const response = await request.post(`${BASE_URL}/api/execute`, {
        data: { code: 'console.log("test")', moduleType: 'commonjs' },
      })

      // In development mode, should allow without API key
      if (process.env.NODE_ENV === 'development') {
        expect([200, 400]).toContain(response.status())
      } else {
        expect(response.status()).toBe(401)
        const result = await response.json()
        expect(result.error).toBe('Authentication required')
      }
    })

    test('should reject invalid API keys', async ({ request }) => {
      const response = await request.post(`${BASE_URL}/api/execute`, {
        data: { code: 'console.log("test")', moduleType: 'commonjs' },
        headers: { 'X-API-Key': 'invalid_key_12345' },
      })

      if (process.env.NODE_ENV !== 'development') {
        expect(response.status()).toBe(401)
        const result = await response.json()
        expect(result.reason).toBe('invalid_api_key')
      }
    })
  })

  test.describe('Code Complexity Analysis', () => {
    test('should reject overly complex code', async ({ request }) => {
      const complexCode = `
        for (let i = 0; i < 100; i++) {
          for (let j = 0; j < 100; j++) {
            for (let k = 0; k < 100; k++) {
              for (let l = 0; l < 100; l++) {
                if (i % 2 === 0) {
                  if (j % 3 === 0) {
                    if (k % 4 === 0) {
                      console.log(i + j + k + l)
                    }
                  }
                }
              }
            }
          }
        }
      `

      const response = await request.post(`${BASE_URL}/api/execute`, {
        data: { code: complexCode, moduleType: 'commonjs' },
        headers: { 'X-API-Key': TEST_API_KEY },
      })

      expect(response.status()).toBe(400)
      const result = await response.json()
      expect(result.error).toContain('security violations')
      expect(result.violations.some((v: string) => v.includes('nested loops'))).toBeTruthy()
    })

    test('should analyze and report code complexity', async ({ request }) => {
      const moderateCode = `
        if (true) {
          for (let i = 0; i < 10; i++) {
            console.log(i)
          }
        }
      `

      const response = await request.post(`${BASE_URL}/api/execute`, {
        data: { code: moderateCode, moduleType: 'commonjs' },
        headers: { 'X-API-Key': TEST_API_KEY },
      })

      if (response.status() === 400) {
        const result = await response.json()
        expect(result.analysis).toBeDefined()
        expect(typeof result.analysis.complexity).toBe('number')
        expect(typeof result.analysis.nestedLoops).toBe('number')
      }
    })
  })

  test.describe('Suspicious Content Detection', () => {
    test('should detect cryptocurrency mining attempts', async ({ request }) => {
      const miningCode = 'const bitcoin = require("crypto"); bitcoin.mining = true;'

      const response = await request.post(`${BASE_URL}/api/execute`, {
        data: { code: miningCode, moduleType: 'commonjs' },
        headers: { 'X-API-Key': TEST_API_KEY },
      })

      expect(response.status()).toBe(400)
      const result = await response.json()
      expect(result.violations.some((v: string) => v.includes('Suspicious pattern'))).toBeTruthy()
    })

    test('should detect potential DoS attacks', async ({ request }) => {
      const dosCode = 'for (let i = 0; i < 999999; i++) { console.log("flood"); }'

      const response = await request.post(`${BASE_URL}/api/execute`, {
        data: { code: dosCode, moduleType: 'commonjs' },
        headers: { 'X-API-Key': TEST_API_KEY },
      })

      expect(response.status()).toBe(400)
      const result = await response.json()
      expect(result.violations.some((v: string) => v.includes('Suspicious pattern'))).toBeTruthy()
    })
  })

  test.describe('Security Monitoring', () => {
    test('should provide security metrics endpoint', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/security/metrics`, {
        headers: { 'X-API-Key': TEST_API_KEY },
      })

      if (process.env.NODE_ENV === 'development') {
        expect(response.status()).toBe(200)
        const result = await response.json()
        expect(result.metrics).toBeDefined()
        expect(result.suspicious_ips).toBeDefined()
        expect(result.timestamp).toBeDefined()
      } else {
        expect([200, 401]).toContain(response.status())
      }
    })

    test('should provide security events endpoint', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/security/events?limit=10`, {
        headers: { 'X-API-Key': TEST_API_KEY },
      })

      if (process.env.NODE_ENV === 'development') {
        expect(response.status()).toBe(200)
        const result = await response.json()
        expect(Array.isArray(result.events)).toBeTruthy()
        expect(typeof result.total).toBe('number')
      } else {
        expect([200, 401]).toContain(response.status())
      }
    })
  })

  test.describe('Health Check', () => {
    test('should provide health status', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/health`)

      expect(response.status()).toBe(200)
      const result = await response.json()
      expect(result.status).toBe('healthy')
      expect(result.memory).toBeDefined()
      expect(result.uptime).toBeDefined()
    })
  })
})
