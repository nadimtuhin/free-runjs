import { NextRequest } from 'next/server'
import { POST } from '../execute/cjs/route'
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
    const allowed = ['lodash', 'axios', 'moment', 'uuid']
    return allowed.includes(name)
  }),
  scanCodeForDangerousPatterns: jest.fn(() => []),
  sanitizeEnvironment: jest.fn(() => ({
    NODE_ENV: 'test',
    PATH: '/usr/bin',
  })),
  EXECUTION_TIMEOUT: 10000,
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

describe('/api/execute/cjs', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.cwd = jest.fn(() => '/workspace/runjs')
    
    // Default mocks
    mockMkdir.mockResolvedValue(undefined)
    mockWriteFile.mockResolvedValue(undefined)
    mockAccess.mockRejectedValue(new Error('File not found'))
    mockReadFile.mockResolvedValue(JSON.stringify({
      name: 'runjs-temp-cjs',
      version: '1.0.0',
      private: true,
      dependencies: {}
    }))
  })

  describe('Input Validation', () => {
    test('should reject dangerous code patterns', async () => {
      const { scanCodeForDangerousPatterns } = require('../../utils/security')
      scanCodeForDangerousPatterns.mockReturnValueOnce(['Dangerous pattern: eval()'])

      const request = new NextRequest('http://localhost/api/execute/cjs', {
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

    test('should accept safe code', async () => {
      mockExec.mockImplementation(createMockExec('npm init complete', ''))
      mockExec.mockImplementation(createMockExec('console output', ''))

      const request = new NextRequest('http://localhost/api/execute/cjs', {
        method: 'POST',
        body: JSON.stringify({ code: 'console.log("Hello World")' }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.moduleType).toBe('commonjs')
    })
  })

  describe('Package Management', () => {
    test('should extract and validate package dependencies', async () => {
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

      const request = new NextRequest('http://localhost/api/execute/cjs', {
        method: 'POST',
        body: JSON.stringify({ code: 'const lodash = require("lodash"); console.log(lodash.version)' }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      expect(response.status).toBe(200)

      expect(validatePackageName).toHaveBeenCalledWith('lodash')
    })

    test('should reject disallowed packages', async () => {
      const { validatePackageName } = require('../../utils/security')
      validatePackageName.mockReturnValue(false)

      const request = new NextRequest('http://localhost/api/execute/cjs', {
        method: 'POST',
        body: JSON.stringify({ code: 'const malicious = require("evil-package")' }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data.error).toContain('not allowed for security reasons')
    })

    test('should skip installation for already installed packages', async () => {
      mockReadFile.mockResolvedValue(JSON.stringify({
        name: 'runjs-temp-cjs',
        dependencies: {
          'lodash': '^4.17.21'
        }
      }))

      mockExec.mockImplementation(createMockExec('Code executed', ''))

      const request = new NextRequest('http://localhost/api/execute/cjs', {
        method: 'POST',
        body: JSON.stringify({ code: 'const lodash = require("lodash")' }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      expect(response.status).toBe(200)

      // Should not call npm install since package is already installed
      const installCalls = (mockExec as jest.Mock).mock.calls.filter(
        call => call[0].includes('npm install')
      )
      expect(installCalls).toHaveLength(0)
    })

    test('should handle package installation failures', async () => {
      mockExec.mockImplementation((command: string, options: any, callback: Function) => {
        if (command.includes('npm init')) {
          callback(null, { stdout: 'npm init complete', stderr: '' })
        } else if (command.includes('npm install')) {
          callback(new Error('Package not found'), null)
        }
        return { kill: jest.fn() } as any
      })

      const request = new NextRequest('http://localhost/api/execute/cjs', {
        method: 'POST',
        body: JSON.stringify({ code: 'const pkg = require("lodash")' }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data.error).toContain('Failed to install packages')
    })
  })

  describe('Code Execution', () => {
    test('should execute valid CommonJS code', async () => {
      mockExec.mockImplementation((command: string, options: any, callback: Function) => {
        if (command.includes('npm init')) {
          callback(null, { stdout: 'npm init complete', stderr: '' })
        } else if (command.includes('node')) {
          callback(null, { stdout: 'Hello World\n', stderr: '' })
        }
        return { kill: jest.fn() } as any
      })

      const request = new NextRequest('http://localhost/api/execute/cjs', {
        method: 'POST',
        body: JSON.stringify({ code: 'console.log("Hello World")' }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.output).toBe('Hello World\n')
      expect(data.moduleType).toBe('commonjs')
    })

    test('should handle code execution errors', async () => {
      mockExec.mockImplementation((command: string, options: any, callback: Function) => {
        if (command.includes('npm init')) {
          callback(null, { stdout: 'npm init complete', stderr: '' })
        } else if (command.includes('node')) {
          callback(null, { stdout: '', stderr: 'ReferenceError: x is not defined' })
        }
        return { kill: jest.fn() } as any
      })

      const request = new NextRequest('http://localhost/api/execute/cjs', {
        method: 'POST',
        body: JSON.stringify({ code: 'console.log(x)' }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.output).toBe('Error: ReferenceError: x is not defined')
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

      const request = new NextRequest('http://localhost/api/execute/cjs', {
        method: 'POST',
        body: JSON.stringify({ code: 'while(true) {}' }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data.error).toContain('timed out')
    })

    test('should filter out Node.js experimental warnings', async () => {
      mockExec.mockImplementation((command: string, options: any, callback: Function) => {
        if (command.includes('npm init')) {
          callback(null, { stdout: 'npm init complete', stderr: '' })
        } else if (command.includes('node')) {
          callback(null, { 
            stdout: 'Hello World\n', 
            stderr: '(node:1234) ExperimentalWarning: Some feature is experimental' 
          })
        }
        return { kill: jest.fn() } as any
      })

      const request = new NextRequest('http://localhost/api/execute/cjs', {
        method: 'POST',
        body: JSON.stringify({ code: 'console.log("Hello World")' }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.output).toBe('Hello World\n') // Should not include the warning
    })
  })

  describe('Directory Initialization', () => {
    test('should create temp directory structure', async () => {
      mockExec.mockImplementation(createMockExec('npm init complete', ''))
      mockExec.mockImplementation(createMockExec('Code executed', ''))

      const request = new NextRequest('http://localhost/api/execute/cjs', {
        method: 'POST',
        body: JSON.stringify({ code: 'console.log("test")' }),
        headers: { 'Content-Type': 'application/json' },
      })

      await POST(request)

      expect(mockMkdir).toHaveBeenCalledWith('/workspace/runjs/temp/cjs', { recursive: true })
    })

    test('should handle existing package.json with ESM type', async () => {
      mockAccess.mockResolvedValue(undefined) // File exists
      mockReadFile.mockResolvedValue(JSON.stringify({
        name: 'test',
        type: 'module',
        dependencies: { 'lodash': '^4.17.21' }
      }))

      mockExec.mockImplementation((command: string, options: any, callback: Function) => {
        if (command.includes('npm install lodash')) {
          callback(null, { stdout: 'Package installed', stderr: '' })
        } else if (command.includes('node')) {
          callback(null, { stdout: 'Code executed', stderr: '' })
        }
        return { kill: jest.fn() } as any
      })

      const request = new NextRequest('http://localhost/api/execute/cjs', {
        method: 'POST',
        body: JSON.stringify({ code: 'console.log("test")' }),
        headers: { 'Content-Type': 'application/json' },
      })

      await POST(request)

      // Should have written updated package.json without type: 'module'
      const writeFileCalls = (mockWriteFile as jest.Mock).mock.calls
      const packageJsonWrites = writeFileCalls.filter(call => 
        call[0].includes('package.json')
      )
      expect(packageJsonWrites.length).toBeGreaterThan(0)
    })
  })

  describe('Response Structure', () => {
    test('should return complete response structure', async () => {
      mockExec.mockImplementation(createMockExec('npm init complete', ''))
      mockExec.mockImplementation(createMockExec('Hello\n', ''))

      const request = new NextRequest('http://localhost/api/execute/cjs', {
        method: 'POST',
        body: JSON.stringify({ code: 'console.log("Hello")' }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data).toMatchObject({
        output: expect.any(String),
        installedPackages: expect.any(Array),
        moduleType: 'commonjs',
        debugLogs: expect.any(Array),
      })
    })

    test('should include debug logs in response', async () => {
      mockExec.mockImplementation(createMockExec('npm init complete', ''))
      mockExec.mockImplementation(createMockExec('Test output', ''))

      const request = new NextRequest('http://localhost/api/execute/cjs', {
        method: 'POST',
        body: JSON.stringify({ code: 'console.log("test")' }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(Array.isArray(data.debugLogs)).toBe(true)
      expect(data.debugLogs.length).toBeGreaterThan(0)
    })

    test('should include debug logs even on error', async () => {
      const request = new NextRequest('http://localhost/api/execute/cjs', {
        method: 'POST',
        body: JSON.stringify({ invalid: 'json' }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(Array.isArray(data.debugLogs)).toBe(true)
    })
  })

  describe('Error Handling', () => {
    test('should handle invalid JSON input', async () => {
      const request = new NextRequest('http://localhost/api/execute/cjs', {
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

      const request = new NextRequest('http://localhost/api/execute/cjs', {
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
            NODE_PATH: '/workspace/runjs/temp/cjs/node_modules',
          })
          callback(null, { stdout: 'Code executed', stderr: '' })
        }
        return { kill: jest.fn() } as any
      })

      const request = new NextRequest('http://localhost/api/execute/cjs', {
        method: 'POST',
        body: JSON.stringify({ code: 'console.log("test")' }),
        headers: { 'Content-Type': 'application/json' },
      })

      await POST(request)
      expect(sanitizeEnvironment).toHaveBeenCalled()
    })
  })
})