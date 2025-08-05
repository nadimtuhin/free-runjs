import { NextRequest } from 'next/server'
import { POST } from '../execute/mjs/route'
import { exec } from 'child_process'
import { writeFile, mkdir, readFile, access } from 'fs/promises'

// Mock all external dependencies
jest.mock('child_process')
jest.mock('fs/promises')
jest.mock('path', () => ({
  join: jest.fn((...paths) => paths.join('/')),
}))

// Mock security functions
jest.mock('../../utils/security', () => ({
  validatePackageName: jest.fn((name: string) => {
    const allowed = ['lodash', 'axios', 'moment', 'uuid', 'react']
    return allowed.includes(name)
  }),
  scanCodeForDangerousPatterns: jest.fn(() => []),
  analyzeCodeComplexity: jest.fn(() => ({ score: 5, violations: [] })),
  detectSuspiciousPatterns: jest.fn(() => []),
  scanForMaliciousContent: jest.fn(() => []),
  sanitizeEnvironment: jest.fn(() => ({
    NODE_ENV: 'test',
    PATH: '/usr/bin',
  })),
  EXECUTION_TIMEOUT: 10000,
}))

// Mock auth functions
jest.mock('../../utils/auth', () => ({
  validateAPIKey: jest.fn(() => ({ authenticated: true, keyId: 'test_key' })),
  checkKeyRateLimit: jest.fn(() => true),
}))

// Mock security logger
jest.mock('../../utils/security-logger', () => ({
  securityLogger: {
    logSecurityEvent: jest.fn(),
  },
  getClientIP: jest.fn(() => '127.0.0.1'),
  getUserAgent: jest.fn(() => 'test-agent'),
}))

const mockExec = exec as jest.MockedFunction<typeof exec>
const mockWriteFile = writeFile as jest.MockedFunction<typeof writeFile>
const mockMkdir = mkdir as jest.MockedFunction<typeof mkdir>
const mockReadFile = readFile as jest.MockedFunction<typeof readFile>
const mockAccess = access as jest.MockedFunction<typeof access>

// Helper to create a mock exec that calls callback
const createMockExec = (stdout: string, stderr: string = '', error: Error | null = null) => {
  return ((command: string, options: any, callback: Function) => {
    setTimeout(() => callback(error, { stdout, stderr }), 10)
    return { kill: jest.fn() } as any
  }) as any
}

describe('/api/execute/mjs', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.cwd = jest.fn(() => '/workspace/runjs')
    
    // Default mocks
    mockMkdir.mockResolvedValue(undefined)
    mockWriteFile.mockResolvedValue(undefined)
    mockAccess.mockRejectedValue(new Error('File not found'))
    mockReadFile.mockResolvedValue(JSON.stringify({
      name: 'runjs-temp-esm',
      version: '1.0.0',
      private: true,
      type: 'module',
      dependencies: {}
    }))
  })

  describe('Security Validation', () => {
    test('should reject dangerous code patterns', async () => {
      const { scanCodeForDangerousPatterns } = require('../../utils/security')
      scanCodeForDangerousPatterns.mockReturnValueOnce(['Dangerous pattern: eval()'])

      const request = new NextRequest('http://localhost/api/execute/mjs', {
        method: 'POST',
        body: JSON.stringify({ code: 'eval("malicious code")' }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data.error).toBe('Code contains potentially dangerous patterns')
      expect(data.violations).toEqual(['Dangerous pattern: eval()'])
    })

    test('should reject high complexity code', async () => {
      const { analyzeCodeComplexity } = require('../../utils/security')
      analyzeCodeComplexity.mockReturnValueOnce({
        score: 25, // Above threshold
        violations: ['Cyclomatic complexity too high']
      })

      const request = new NextRequest('http://localhost/api/execute/mjs', {
        method: 'POST',
        body: JSON.stringify({ code: 'complex nested loops and conditions' }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data.error).toBe('Code complexity too high')
      expect(data.violations).toEqual(['Cyclomatic complexity too high'])
    })

    test('should reject suspicious patterns', async () => {
      const { detectSuspiciousPatterns } = require('../../utils/security')
      detectSuspiciousPatterns.mockReturnValueOnce(['Suspicious pattern detected'])

      const request = new NextRequest('http://localhost/api/execute/mjs', {
        method: 'POST',
        body: JSON.stringify({ code: 'suspicious code pattern' }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data.error).toBe('Code contains suspicious patterns')
    })

    test('should reject malicious content', async () => {
      const { scanForMaliciousContent } = require('../../utils/security')
      scanForMaliciousContent.mockReturnValueOnce(['Malicious content detected'])

      const request = new NextRequest('http://localhost/api/execute/mjs', {
        method: 'POST',
        body: JSON.stringify({ code: 'malicious content' }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data.error).toBe('Code contains malicious content')
    })
  })

  describe('Authentication & Rate Limiting', () => {
    test('should reject unauthenticated requests', async () => {
      const { validateAPIKey } = require('../../utils/auth')
      validateAPIKey.mockReturnValueOnce({ authenticated: false, reason: 'invalid_api_key' })

      const request = new NextRequest('http://localhost/api/execute/mjs', {
        method: 'POST',
        body: JSON.stringify({ code: 'console.log("test")' }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      expect(response.status).toBe(401)

      const data = await response.json()
      expect(data.error).toBe('Unauthorized: invalid_api_key')
    })

    test('should reject rate-limited requests', async () => {
      const { checkKeyRateLimit } = require('../../utils/auth')
      checkKeyRateLimit.mockReturnValueOnce(false)

      const request = new NextRequest('http://localhost/api/execute/mjs', {
        method: 'POST',
        body: JSON.stringify({ code: 'console.log("test")' }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      expect(response.status).toBe(429)

      const data = await response.json()
      expect(data.error).toBe('Rate limit exceeded')
    })

    test('should accept authenticated requests within rate limit', async () => {
      mockExec.mockImplementation(createMockExec('npm init complete', ''))
      mockExec.mockImplementation(createMockExec('Code executed', ''))

      const request = new NextRequest('http://localhost/api/execute/mjs', {
        method: 'POST',
        body: JSON.stringify({ code: 'console.log("test")' }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      expect(response.status).toBe(200)
    })
  })

  describe('Package Management', () => {
    test('should extract and validate ES module imports', async () => {
      const { validatePackageName } = require('../../utils/security')
      validatePackageName.mockReturnValue(true)

      mockExec.mockImplementation((command: string, options: any, callback: Function) => {
        if (command.includes('npm init')) {
          callback(null, { stdout: 'npm init complete', stderr: '' })
        } else if (command.includes('npm install')) {
          callback(null, { stdout: 'Package installed', stderr: '' })
        } else if (command.includes('node')) {
          callback(null, { stdout: 'Code executed', stderr: '' })
        }
        return { kill: jest.fn() } as any
      })

      const request = new NextRequest('http://localhost/api/execute/mjs', {
        method: 'POST',
        body: JSON.stringify({ code: 'import _ from "lodash";\nconsole.log(_.version)' }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      expect(response.status).toBe(200)
      expect(validatePackageName).toHaveBeenCalledWith('lodash')
    })

    test('should handle multiple import patterns', async () => {
      const { validatePackageName } = require('../../utils/security')
      validatePackageName.mockReturnValue(true)

      mockExec.mockImplementation(createMockExec('Code executed', ''))

      const code = `
        import lodash from 'lodash';
        import { get } from 'lodash';
        import * as moment from 'moment';
        import axios, { AxiosResponse } from 'axios';
      `

      const request = new NextRequest('http://localhost/api/execute/mjs', {
        method: 'POST',
        body: JSON.stringify({ code }),
        headers: { 'Content-Type': 'application/json' },
      })

      await POST(request)

      expect(validatePackageName).toHaveBeenCalledWith('lodash')
      expect(validatePackageName).toHaveBeenCalledWith('moment')
      expect(validatePackageName).toHaveBeenCalledWith('axios')
    })

    test('should reject disallowed ES module imports', async () => {
      const { validatePackageName } = require('../../utils/security')
      validatePackageName.mockReturnValue(false)

      const request = new NextRequest('http://localhost/api/execute/mjs', {
        method: 'POST',
        body: JSON.stringify({ code: 'import malicious from "evil-package"' }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data.error).toContain('not allowed for security reasons')
    })
  })

  describe('Code Execution', () => {
    test('should execute valid ES module code', async () => {
      mockExec.mockImplementation((command: string, options: any, callback: Function) => {
        if (command.includes('npm init')) {
          callback(null, { stdout: 'npm init complete', stderr: '' })
        } else if (command.includes('node')) {
          callback(null, { stdout: 'Hello ES Module\n', stderr: '' })
        }
        return { kill: jest.fn() } as any
      })

      const request = new NextRequest('http://localhost/api/execute/mjs', {
        method: 'POST',
        body: JSON.stringify({ code: 'console.log("Hello ES Module")' }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.output).toBe('Hello ES Module\n')
      expect(data.moduleType).toBe('esm')
    })

    test('should handle execution timeout', async () => {
      mockExec.mockImplementation((command: string, options: any, callback: Function) => {
        if (command.includes('npm init')) {
          callback(null, { stdout: 'npm init complete', stderr: '' })
        } else if (command.includes('node')) {
          const error = new Error('Command failed')
          error.message = 'timeout'
          callback(error, null)
        }
        return { kill: jest.fn() } as any
      })

      const request = new NextRequest('http://localhost/api/execute/mjs', {
        method: 'POST',
        body: JSON.stringify({ code: 'while(true) {}' }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data.error).toContain('timed out')
    })

    test('should handle runtime errors', async () => {
      mockExec.mockImplementation((command: string, options: any, callback: Function) => {
        if (command.includes('npm init')) {
          callback(null, { stdout: 'npm init complete', stderr: '' })
        } else if (command.includes('node')) {
          callback(null, { stdout: '', stderr: 'ReferenceError: undefinedVar is not defined' })
        }
        return { kill: jest.fn() } as any
      })

      const request = new NextRequest('http://localhost/api/execute/mjs', {
        method: 'POST',
        body: JSON.stringify({ code: 'console.log(undefinedVar)' }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.output).toBe('Error: ReferenceError: undefinedVar is not defined')
    })
  })

  describe('Directory Initialization', () => {
    test('should create ESM temp directory structure', async () => {
      mockExec.mockImplementation(createMockExec('npm init complete', ''))

      const request = new NextRequest('http://localhost/api/execute/mjs', {
        method: 'POST',
        body: JSON.stringify({ code: 'console.log("test")' }),
        headers: { 'Content-Type': 'application/json' },
      })

      await POST(request)

      expect(mockMkdir).toHaveBeenCalledWith('/workspace/runjs/temp/esm', { recursive: true })
    })

    test('should handle existing package.json without module type', async () => {
      mockAccess.mockResolvedValue(undefined) // File exists
      mockReadFile.mockResolvedValue(JSON.stringify({
        name: 'test',
        dependencies: { 'lodash': '^4.17.21' }
        // No type field - should add type: 'module'
      }))

      mockExec.mockImplementation((command: string, options: any, callback: Function) => {
        if (command.includes('npm install lodash')) {
          callback(null, { stdout: 'Package installed', stderr: '' })
        } else if (command.includes('node')) {
          callback(null, { stdout: 'Code executed', stderr: '' })
        }
        return { kill: jest.fn() } as any
      })

      const request = new NextRequest('http://localhost/api/execute/mjs', {
        method: 'POST',
        body: JSON.stringify({ code: 'console.log("test")' }),
        headers: { 'Content-Type': 'application/json' },
      })

      await POST(request)

      // Should have written updated package.json with type: 'module'
      const writeFileCalls = (mockWriteFile as jest.Mock).mock.calls
      const packageJsonWrites = writeFileCalls.filter(call => 
        call[0].includes('package.json')
      )
      expect(packageJsonWrites.length).toBeGreaterThan(0)
    })
  })

  describe('Security Logging', () => {
    test('should log security events', async () => {
      const { securityLogger } = require('../../utils/security-logger')
      const { scanCodeForDangerousPatterns } = require('../../utils/security')
      scanCodeForDangerousPatterns.mockReturnValueOnce(['Dangerous pattern'])

      const request = new NextRequest('http://localhost/api/execute/mjs', {
        method: 'POST',
        body: JSON.stringify({ code: 'eval("malicious")' }),
        headers: { 'Content-Type': 'application/json' },
      })

      await POST(request)

      expect(securityLogger.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'code_execution_blocked',
          severity: 'high',
          blocked: true,
        })
      )
    })

    test('should log authentication failures', async () => {
      const { validateAPIKey } = require('../../utils/auth')
      const { securityLogger } = require('../../utils/security-logger')
      validateAPIKey.mockReturnValueOnce({ authenticated: false, reason: 'invalid_api_key' })

      const request = new NextRequest('http://localhost/api/execute/mjs', {
        method: 'POST',
        body: JSON.stringify({ code: 'console.log("test")' }),
        headers: { 'Content-Type': 'application/json' },
      })

      await POST(request)

      expect(securityLogger.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'authentication_failed',
          severity: 'medium',
          blocked: true,
        })
      )
    })

    test('should log rate limit violations', async () => {
      const { checkKeyRateLimit } = require('../../utils/auth')
      const { securityLogger } = require('../../utils/security-logger')
      checkKeyRateLimit.mockReturnValueOnce(false)

      const request = new NextRequest('http://localhost/api/execute/mjs', {
        method: 'POST',
        body: JSON.stringify({ code: 'console.log("test")' }),
        headers: { 'Content-Type': 'application/json' },
      })

      await POST(request)

      expect(securityLogger.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'rate_limit_exceeded',
          severity: 'medium',
          blocked: true,
        })
      )
    })
  })

  describe('Response Structure', () => {
    test('should return complete ESM response structure', async () => {
      mockExec.mockImplementation(createMockExec('npm init complete', ''))
      mockExec.mockImplementation(createMockExec('Hello\n', ''))

      const request = new NextRequest('http://localhost/api/execute/mjs', {
        method: 'POST',
        body: JSON.stringify({ code: 'console.log("Hello")' }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data).toMatchObject({
        output: expect.any(String),
        installedPackages: expect.any(Array),
        moduleType: 'esm',
      })
    })

    test('should handle no output gracefully', async () => {
      mockExec.mockImplementation((command: string, options: any, callback: Function) => {
        if (command.includes('npm init')) {
          callback(null, { stdout: 'npm init complete', stderr: '' })
        } else if (command.includes('node')) {
          callback(null, { stdout: '', stderr: '' })
        }
        return { kill: jest.fn() } as any
      })

      const request = new NextRequest('http://localhost/api/execute/mjs', {
        method: 'POST',
        body: JSON.stringify({ code: '// no output' }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data.output).toBe('No output')
    })
  })

  describe('Error Handling', () => {
    test('should handle invalid JSON input', async () => {
      const request = new NextRequest('http://localhost/api/execute/mjs', {
        method: 'POST',
        body: 'invalid json',
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data.error).toBeDefined()
    })

    test('should handle file system errors', async () => {
      mockMkdir.mockRejectedValue(new Error('Permission denied'))

      const request = new NextRequest('http://localhost/api/execute/mjs', {
        method: 'POST',
        body: JSON.stringify({ code: 'console.log("test")' }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data.error).toContain('Permission denied')
    })
  })

  describe('Environment Security', () => {
    test('should use sanitized environment for code execution', async () => {
      const { sanitizeEnvironment } = require('../../utils/security')
      
      mockExec.mockImplementation((command: string, options: any, callback: Function) => {
        if (command.includes('npm init')) {
          callback(null, { stdout: 'npm init complete', stderr: '' })
        } else if (command.includes('node')) {
          // Verify sanitized environment is used
          expect(options.env).toEqual({
            NODE_ENV: 'test',
            PATH: '/usr/bin',
            NODE_PATH: '/workspace/runjs/temp/esm/node_modules',
          })
          callback(null, { stdout: 'Code executed', stderr: '' })
        }
        return { kill: jest.fn() } as any
      })

      const request = new NextRequest('http://localhost/api/execute/mjs', {
        method: 'POST',
        body: JSON.stringify({ code: 'console.log("test")' }),
        headers: { 'Content-Type': 'application/json' },
      })

      await POST(request)
      expect(sanitizeEnvironment).toHaveBeenCalled()
    })
  })
})