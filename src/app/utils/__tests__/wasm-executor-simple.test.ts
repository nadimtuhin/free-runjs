import { WASMExecutor, createWASMExecutor } from '../wasm-executor'

// Mock dependencies to avoid file system operations
jest.mock('fs/promises', () => ({
  writeFile: jest.fn().mockResolvedValue(undefined),
  readFile: jest.fn().mockResolvedValue(''),
  mkdir: jest.fn().mockResolvedValue(undefined),
  rm: jest.fn().mockResolvedValue(undefined)
}))

jest.mock('child_process', () => ({
  spawn: jest.fn()
}))

jest.mock('../uuid', () => ({
  generateUUID: jest.fn(() => 'test-uuid-123')
}))

jest.mock('../security-logger', () => ({
  securityLogger: {
    logSecurityEvent: jest.fn()
  }
}))

describe('WASM Executor - Simple Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('WASMExecutor Creation and Configuration', () => {
    test('should create executor with default options', () => {
      const executor = new WASMExecutor()
      expect(executor).toBeInstanceOf(WASMExecutor)
    })

    test('should create executor with custom options', () => {
      const options = {
        memoryLimit: '256MB',
        cpuTimeLimit: '30s',
        allowNetwork: true,
        runtime: 'wasmer' as const
      }
      
      const executor = new WASMExecutor(options)
      expect(executor).toBeInstanceOf(WASMExecutor)
    })

    test('should create executor via factory function', () => {
      const executor = createWASMExecutor()
      expect(executor).toBeInstanceOf(WASMExecutor)
    })

    test('should pass options to factory-created executor', () => {
      const options = {
        memoryLimit: '512MB',
        cpuTimeLimit: '60s'
      }
      
      const executor = createWASMExecutor(options)
      expect(executor).toBeInstanceOf(WASMExecutor)
    })
  })

  describe('Utility Methods', () => {
    test('should parse memory limits correctly', () => {
      const executor = new WASMExecutor()
      
      expect(executor['parseMemoryLimit']('64MB')).toBe(64 * 1024 * 1024)
      expect(executor['parseMemoryLimit']('1GB')).toBe(1024 * 1024 * 1024)
      expect(executor['parseMemoryLimit']('512KB')).toBe(512 * 1024)
    })

    test('should parse time limits correctly', () => {
      const executor = new WASMExecutor()
      
      expect(executor['parseTimeLimit']('5s')).toBe(5000)
      expect(executor['parseTimeLimit']('30s')).toBe(30000)
      expect(executor['parseTimeLimit']('invalid')).toBe(10000) // Default fallback
    })

    test('should wrap code for ESM execution', () => {
      const executor = new WASMExecutor()
      const code = 'console.log("test")'
      
      const wrapped = executor['wrapCodeForExecution'](code, 'esm')
      expect(wrapped).toContain('async')
      expect(wrapped).toContain(code)
    })

    test('should wrap code for CommonJS execution', () => {
      const executor = new WASMExecutor()
      const code = 'console.log("test")'
      
      const wrapped = executor['wrapCodeForExecution'](code, 'commonjs')
      expect(wrapped).not.toContain('async')
      expect(wrapped).toContain(code)
    })
  })

  describe('Configuration Validation', () => {
    test('should handle filesystem restrictions config', () => {
      const executor = new WASMExecutor({
        allowedPaths: ['/tmp', '/app']
      })

      expect(executor).toBeInstanceOf(WASMExecutor)
    })

    test('should handle runtime selection', () => {
      const wasmtimeExecutor = new WASMExecutor({ runtime: 'wasmtime' })
      const wasmerExecutor = new WASMExecutor({ runtime: 'wasmer' })
      const nativeExecutor = new WASMExecutor({ runtime: 'native-fallback' })

      expect(wasmtimeExecutor).toBeInstanceOf(WASMExecutor)
      expect(wasmerExecutor).toBeInstanceOf(WASMExecutor)
      expect(nativeExecutor).toBeInstanceOf(WASMExecutor)
    })

    test('should handle resource limit configurations', () => {
      const executor = new WASMExecutor({
        memoryLimit: '32MB',
        cpuTimeLimit: '2s',
        maxFileSize: '5MB'
      })

      expect(executor).toBeInstanceOf(WASMExecutor)
    })
  })

  describe('Security Configuration', () => {
    test('should handle network restrictions', () => {
      const networkAllowedExecutor = new WASMExecutor({ allowNetwork: true })
      const networkBlockedExecutor = new WASMExecutor({ allowNetwork: false })

      expect(networkAllowedExecutor).toBeInstanceOf(WASMExecutor)
      expect(networkBlockedExecutor).toBeInstanceOf(WASMExecutor)
    })

    test('should handle path restrictions', () => {
      const executor = new WASMExecutor({
        allowedPaths: ['/tmp', '/var/tmp', '/app/sandbox']
      })

      expect(executor).toBeInstanceOf(WASMExecutor)
    })
  })
})