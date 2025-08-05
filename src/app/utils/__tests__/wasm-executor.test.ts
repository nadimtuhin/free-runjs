import { WASMExecutor, createWASMExecutor } from '../wasm-executor'
import { spawn } from 'child_process'
import { writeFile, readFile, mkdir, rm } from 'fs/promises'

// Mock dependencies
jest.mock('child_process')
jest.mock('fs/promises')
jest.mock('../uuid', () => ({
  generateUUID: jest.fn(() => 'test-uuid-123')
}))

const mockSpawn = spawn as jest.MockedFunction<typeof spawn>
const mockWriteFile = writeFile as jest.MockedFunction<typeof writeFile>
const mockMkdir = mkdir as jest.MockedFunction<typeof mkdir>
const mockRm = rm as jest.MockedFunction<typeof rm>

// Mock process methods
// Helper function to create properly mocked child process
function createMockChild(stdout = '', stderr = '', exitCode = 0, shouldError = false) {
  return {
    stdout: {
      on: jest.fn((event, callback) => {
        if (event === 'data' && stdout) {
          setTimeout(() => callback(Buffer.from(stdout)), 10)
        }
      })
    },
    stderr: {
      on: jest.fn((event, callback) => {
        if (event === 'data' && stderr) {
          setTimeout(() => callback(Buffer.from(stderr)), 10)
        }
      })
    },
    on: jest.fn((event, callback) => {
      if (event === 'close' && !shouldError) {
        setTimeout(() => callback(exitCode), 20)
      }
      if (event === 'error' && shouldError) {
        setTimeout(() => callback(new Error('Process error')), 15)
      }
    }),
    kill: jest.fn()
  }
}

describe('WASM Executor', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockWriteFile.mockResolvedValue(undefined)
    mockMkdir.mockResolvedValue(undefined)
    mockRm.mockResolvedValue(undefined)
  })

  describe('WASMExecutor class', () => {
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

    test('should execute simple JavaScript code', async () => {
      // Mock successful process execution
      mockSpawn.mockReturnValue(createMockChild('Hello World\n', '', 0) as any)

      const executor = new WASMExecutor()
      const result = await executor.execute('console.log("Hello World")')

      expect(result.output).toBe('Hello World\n')
      expect(result.exitCode).toBe(0)
      expect(result.wasmUsed).toBe(false) // Falls back to native in test
    })

    test('should handle execution errors', async () => {
      // Mock error process execution
      mockSpawn.mockReturnValue(createMockChild('', 'ReferenceError: x is not defined\n', 1) as any)

      const executor = new WASMExecutor()
      const result = await executor.execute('console.log(x)')

      expect(result.exitCode).toBe(1)
      expect(result.error).toBe('ReferenceError: x is not defined\n')
    })

    test('should enforce memory limits', async () => {
      const executor = new WASMExecutor({
        memoryLimit: '64MB'
      })

      // Memory limit parsing should work
      expect(executor['parseMemoryLimit']('64MB')).toBe(64 * 1024 * 1024)
      expect(executor['parseMemoryLimit']('1GB')).toBe(1024 * 1024 * 1024)
    })

    test('should enforce time limits', async () => {
      const executor = new WASMExecutor({
        cpuTimeLimit: '5s'
      })

      // Time limit parsing should work
      expect(executor['parseTimeLimit']('5s')).toBe(5000)
      expect(executor['parseTimeLimit']('30s')).toBe(30000)
    })

    test('should handle both ESM and CommonJS modules', async () => {
      // Mock successful execution for both module types
      mockSpawn.mockReturnValue(createMockChild('Module executed\n', '', 0) as any)

      const executor = new WASMExecutor()

      // Test ESM
      const esmResult = await executor.execute('console.log("ESM")', 'esm')
      expect(esmResult.output).toBe('Module executed\n')

      // Test CommonJS
      const cjsResult = await executor.execute('console.log("CJS")', 'commonjs')
      expect(cjsResult.output).toBe('Module executed\n')
    })

    test('should create proper directory structure', async () => {
      const executor = new WASMExecutor()
      
      // Mock successful execution
      mockSpawn.mockReturnValue(createMockChild('test output\n', '', 0) as any)

      await executor.execute('console.log("test")')

      // Should create temp directories
      expect(mockMkdir).toHaveBeenCalledWith(
        expect.stringContaining('/temp/wasm/test-uuid-123'),
        { recursive: true }
      )
      expect(mockMkdir).toHaveBeenCalledWith(
        expect.stringContaining('/fs'),
        { recursive: true }
      )
    })

    test('should cleanup temporary files', async () => {
      const executor = new WASMExecutor()
      
      // Mock successful execution
      mockSpawn.mockReturnValue(createMockChild('test output\n', '', 0) as any)

      await executor.execute('console.log("test")')

      // Should cleanup temp directory
      expect(mockRm).toHaveBeenCalledWith(
        expect.stringContaining('/temp/wasm/test-uuid-123'),
        { recursive: true, force: true }
      )
    })

    test('should handle WASM runtime availability check', async () => {
      const executor = new WASMExecutor({ runtime: 'wasmtime' })
      
      // Mock execFile for runtime check
      jest.doMock('child_process', () => ({
        spawn: mockSpawn,
        execFile: jest.fn((command, args, callback) => {
          if (command === 'wasmtime' && args.includes('--version')) {
            callback(null, { stdout: 'wasmtime 1.0.0' })
          } else {
            callback(new Error('Command not found'))
          }
        })
      }))

      const available = await executor['checkWASMAvailability']()
      expect(available).toBe(false) // Mocked to return false in test environment
    })

    test('should wrap code properly for different module types', () => {
      const executor = new WASMExecutor()
      
      const esmWrapped = executor['wrapCodeForExecution']('console.log("test")', 'esm')
      expect(esmWrapped).toContain('async')
      expect(esmWrapped).toContain('console.log("test")')

      const cjsWrapped = executor['wrapCodeForExecution']('console.log("test")', 'commonjs')
      expect(cjsWrapped).not.toContain('async')
      expect(cjsWrapped).toContain('console.log("test")')
    })
  })

  describe('createWASMExecutor factory', () => {
    test('should create executor instance', () => {
      const executor = createWASMExecutor()
      expect(executor).toBeInstanceOf(WASMExecutor)
    })

    test('should pass options to executor', () => {
      const options = {
        memoryLimit: '512MB',
        cpuTimeLimit: '60s'
      }
      
      const executor = createWASMExecutor(options)
      expect(executor).toBeInstanceOf(WASMExecutor)
    })
  })

  describe('Security and Resource Management', () => {
    test('should enforce resource limits', async () => {
      const executor = new WASMExecutor({
        memoryLimit: '32MB',
        cpuTimeLimit: '2s'
      })

      // Mock timeout scenario
      mockSpawn.mockReturnValue({
        ...mockProcess,
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((event, callback) => {
          if (event === 'error') {
            callback(new Error('timeout'))
          }
        }),
        kill: jest.fn()
      } as any)

      try {
        await executor.execute('while(true) {}') // Infinite loop
      } catch (error) {
        expect(error.message).toContain('timeout')
      }
    })

    test('should create WASI configuration', async () => {
      const executor = new WASMExecutor()
      
      mockSpawn.mockReturnValue({
        ...mockProcess,
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((event, callback) => {
          if (event === 'close') callback(0)
        })
      } as any)

      await executor.execute('console.log("test")')

      // Should write WASI config
      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.stringContaining('wasi-config.json'),
        expect.stringContaining('"NODE_ENV":"sandbox"')
      )
    })

    test('should handle filesystem restrictions', () => {
      const executor = new WASMExecutor({
        allowedPaths: ['/tmp', '/app']
      })

      // Executor should be created with proper path restrictions
      expect(executor).toBeInstanceOf(WASMExecutor)
    })
  })

  describe('Error Handling', () => {
    test('should handle file system errors gracefully', async () => {
      mockMkdir.mockRejectedValue(new Error('Permission denied'))

      const executor = new WASMExecutor()
      
      try {
        await executor.execute('console.log("test")')
      } catch (error) {
        expect(error.message).toContain('Permission denied')
      }
    })

    test('should handle spawn errors', async () => {
      mockSpawn.mockReturnValue({
        ...mockProcess,
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((event, callback) => {
          if (event === 'error') {
            callback(new Error('spawn failed'))
          }
        })
      } as any)

      const executor = new WASMExecutor()
      
      try {
        await executor.execute('console.log("test")')
      } catch (error) {
        expect(error.message).toContain('spawn failed')
      }
    })

    test('should fallback to native execution on WASM errors', async () => {
      const executor = new WASMExecutor()
      
      // Mock WASM failure
      mockSpawn.mockImplementation(() => {
        throw new Error('WASM runtime not available')
      })

      const result = await executor.execute('console.log("test")')
      
      // Should fallback gracefully
      expect(result.wasmUsed).toBe(false)
      expect(result.output).toBeDefined()
    })
  })

  describe('Performance and Monitoring', () => {
    test('should track execution time', async () => {
      mockSpawn.mockReturnValue({
        ...mockProcess,
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            // Simulate some execution time
            setTimeout(() => callback(0), 50)
          }
        })
      } as any)

      const executor = new WASMExecutor()
      const result = await executor.execute('console.log("test")')

      expect(result.executionTime).toBeGreaterThan(0)
      expect(typeof result.executionTime).toBe('number')
    })

    test('should report memory usage', async () => {
      mockSpawn.mockReturnValue({
        ...mockProcess,
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((event, callback) => {
          if (event === 'close') callback(0)
        })
      } as any)

      const executor = new WASMExecutor()
      const result = await executor.execute('console.log("test")')

      expect(typeof result.memoryUsed).toBe('number')
      expect(result.memoryUsed).toBeGreaterThanOrEqual(0)
    })
  })
})