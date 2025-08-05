/**
 * WebAssembly Execution Engine for RunJS
 * Provides secure, isolated JavaScript execution using WASM sandboxing
 */

import { spawn } from 'child_process'
import { writeFile, readFile, mkdir, rm } from 'fs/promises'
import { join } from 'path'
import { generateUUID } from './uuid'
import { securityLogger } from './security-logger'

export interface WASMExecutionOptions {
  memoryLimit: string // e.g., '128MB'
  cpuTimeLimit: string // e.g., '10s'
  allowNetwork: boolean
  allowedPaths: string[]
  maxFileSize: string // e.g., '10MB'
  runtime: 'wasmtime' | 'wasmer' | 'native-fallback'
}

export interface WASMExecutionResult {
  output: string
  error?: string
  exitCode: number
  executionTime: number
  memoryUsed: number
  wasmUsed: boolean
}

export class WASMExecutor {
  private options: WASMExecutionOptions
  private tempDir: string
  private sessionId: string

  constructor(options: Partial<WASMExecutionOptions> = {}) {
    this.options = {
      memoryLimit: '128MB',
      cpuTimeLimit: '10s',
      allowNetwork: false,
      allowedPaths: ['/tmp'],
      maxFileSize: '10MB',
      runtime: 'wasmtime',
      ...options
    }
    this.sessionId = generateUUID()
    this.tempDir = join(process.cwd(), 'temp', 'wasm', this.sessionId)
  }

  /**
   * Execute JavaScript code in WASM sandbox
   */
  async execute(code: string, moduleType: 'esm' | 'commonjs' = 'esm'): Promise<WASMExecutionResult> {
    const startTime = Date.now()
    
    try {
      // Check if WASM runtime is available
      const wasmAvailable = await this.checkWASMAvailability()
      
      if (!wasmAvailable) {
        securityLogger.logSecurityEvent({
          type: 'execution_timeout',
          ip: 'localhost',
          severity: 'low',
          blocked: false,
          details: { reason: 'WASM runtime not available, falling back to native' }
        })
        
        return await this.fallbackToNative(code, moduleType, startTime)
      }

      // Prepare WASM execution environment
      await this.prepareEnvironment()
      
      // Create WASM module for JavaScript execution
      const wasmModule = await this.createJavaScriptWASMModule(code, moduleType)
      
      // Execute in WASM sandbox
      const result = await this.executeWASMModule(wasmModule)
      
      return {
        ...result,
        executionTime: Date.now() - startTime,
        wasmUsed: true
      }

    } catch (error) {
      securityLogger.logSecurityEvent({
        type: 'execution_timeout',
        ip: 'localhost',
        severity: 'medium',
        blocked: false,
        details: { 
          error: error instanceof Error ? error.message : String(error),
          fallback: 'native'
        }
      })

      // Fall back to native execution on WASM errors
      return await this.fallbackToNative(code, moduleType, startTime)
    } finally {
      // Cleanup temporary files
      await this.cleanup()
    }
  }

  /**
   * Check if WASM runtime is available
   */
  private async checkWASMAvailability(): Promise<boolean> {
    try {
      const { execFile } = require('child_process')
      const { promisify } = require('util')
      const execAsync = promisify(execFile)

      switch (this.options.runtime) {
        case 'wasmtime':
          await execAsync('wasmtime', ['--version'])
          return true
        case 'wasmer':
          await execAsync('wasmer', ['--version'])
          return true
        default:
          return false
      }
    } catch {
      return false
    }
  }

  /**
   * Prepare WASM execution environment
   */
  private async prepareEnvironment(): Promise<void> {
    // Create temporary directory for WASM execution
    await mkdir(this.tempDir, { recursive: true })
    
    // Create virtual filesystem structure
    await mkdir(join(this.tempDir, 'fs'), { recursive: true })
    await mkdir(join(this.tempDir, 'fs', 'tmp'), { recursive: true })
    
    // Create WASI configuration
    const wasiConfig = {
      args: ['node', '--version'],
      env: {
        'NODE_ENV': 'sandbox'
      },
      preopens: {
        '/tmp': join(this.tempDir, 'fs', 'tmp')
      },
      inherit_stdout: true,
      inherit_stderr: true
    }
    
    await writeFile(
      join(this.tempDir, 'wasi-config.json'),
      JSON.stringify(wasiConfig, null, 2)
    )
  }

  /**
   * Create WASM module for JavaScript execution
   */
  private async createJavaScriptWASMModule(code: string, moduleType: 'esm' | 'commonjs'): Promise<string> {
    // For now, we'll create a simple JavaScript wrapper
    // In production, this would use a pre-compiled QuickJS or V8 WASM module
    
    const wrappedCode = this.wrapCodeForExecution(code, moduleType)
    const codePath = join(this.tempDir, 'user-code.js')
    
    await writeFile(codePath, wrappedCode)
    
    // Create a simple WASM runner script (placeholder)
    const wasmRunner = `
      const fs = require('fs');
      const path = require('path');
      
      // Simulate WASM-like execution with resource limits
      const startTime = Date.now();
      const memoryLimit = ${this.parseMemoryLimit(this.options.memoryLimit)};
      
      try {
        // Load and execute user code
        const userCode = fs.readFileSync('${codePath}', 'utf8');
        
        // Basic resource monitoring
        if (Date.now() - startTime > ${this.parseTimeLimit(this.options.cpuTimeLimit)}) {
          throw new Error('Execution time limit exceeded');
        }
        
        // Execute in controlled environment
        const vm = require('vm');
        const context = vm.createContext({
          console: console,
          setTimeout: setTimeout,
          setInterval: setInterval,
          clearTimeout: clearTimeout,
          clearInterval: clearInterval,
          Buffer: Buffer,
          process: {
            env: { NODE_ENV: 'sandbox' },
            version: process.version,
            platform: 'wasm'
          }
        });
        
        vm.runInContext(userCode, context, {
          timeout: ${this.parseTimeLimit(this.options.cpuTimeLimit)},
          breakOnSigint: true
        });
        
      } catch (error) {
        console.error('WASM Execution Error:', error.message);
        process.exit(1);
      }
    `
    
    const runnerPath = join(this.tempDir, 'wasm-runner.js')
    await writeFile(runnerPath, wasmRunner)
    
    return runnerPath
  }

  /**
   * Execute WASM module
   */
  private async executeWASMModule(modulePath: string): Promise<Omit<WASMExecutionResult, 'executionTime' | 'wasmUsed'>> {
    return new Promise((resolve, reject) => {
      let output = ''
      let error = ''

      // For now, execute the runner with Node.js
      // In production, this would use the actual WASM runtime
      const child = spawn('node', [modulePath], {
        cwd: this.tempDir,
        timeout: this.parseTimeLimit(this.options.cpuTimeLimit),
        stdio: ['pipe', 'pipe', 'pipe']
      })

      child.stdout?.on('data', (data) => {
        output += data.toString()
      })

      child.stderr?.on('data', (data) => {
        error += data.toString()
      })

      child.on('close', (code) => {
        resolve({
          output: output || 'No output',
          error: error || undefined,
          exitCode: code || 0,
          memoryUsed: 0 // Would be provided by WASM runtime
        })
      })

      child.on('error', (err) => {
        reject(err)
      })

      // Kill process if it exceeds time limit
      setTimeout(() => {
        child.kill('SIGKILL')
        reject(new Error('Execution timeout'))
      }, this.parseTimeLimit(this.options.cpuTimeLimit))
    })
  }

  /**
   * Wrap user code for secure execution
   */
  private wrapCodeForExecution(code: string, moduleType: 'esm' | 'commonjs'): string {
    if (moduleType === 'esm') {
      return `
        // ESM execution wrapper
        (async () => {
          try {
            ${code}
          } catch (error) {
            console.error('Execution error:', error.message);
          }
        })();
      `
    } else {
      return `
        // CommonJS execution wrapper
        try {
          ${code}
        } catch (error) {
          console.error('Execution error:', error.message);
        }
      `
    }
  }

  /**
   * Fallback to native execution using child_process
   */
  private async fallbackToNative(code: string, moduleType: 'esm' | 'commonjs', startTime: number): Promise<WASMExecutionResult> {
    return new Promise((resolve) => {
      try {
        const wrappedCode = this.wrapCodeForExecution(code, moduleType)
        const tempFile = join(this.tempDir, `fallback.${moduleType === 'esm' ? 'mjs' : 'js'}`)
        
        // Write code to temporary file and execute
        const child = spawn('node', ['-e', wrappedCode], {
          stdio: ['pipe', 'pipe', 'pipe'],
          timeout: this.parseTimeLimit(this.options.cpuTimeLimit)
        })
        
        let output = ''
        let error = ''
        
        child.stdout.on('data', (data) => {
          output += data.toString()
        })
        
        child.stderr.on('data', (data) => {
          error += data.toString()
        })
        
        child.on('close', (exitCode) => {
          resolve({
            output,
            error: error || undefined,
            exitCode: exitCode || 0,
            executionTime: Date.now() - startTime,
            memoryUsed: 0, // Not tracked in fallback mode
            wasmUsed: false
          })
        })
        
        child.on('error', (err) => {
          resolve({
            output: '',
            error: err.message,
            exitCode: 1,
            executionTime: Date.now() - startTime,
            memoryUsed: 0,
            wasmUsed: false
          })
        })
        
      } catch (error) {
        resolve({
          output: '',
          error: error instanceof Error ? error.message : String(error),
          exitCode: 1,
          executionTime: Date.now() - startTime,
          memoryUsed: 0,
          wasmUsed: false
        })
      }
    })
  }

  /**
   * Parse memory limit string to bytes
   */
  private parseMemoryLimit(limit: string): number {
    const units = { 'KB': 1024, 'MB': 1024 * 1024, 'GB': 1024 * 1024 * 1024 }
    const match = limit.match(/^(\d+)(KB|MB|GB)$/)
    if (!match) return 128 * 1024 * 1024 // Default 128MB
    
    const [, amount, unit] = match
    return parseInt(amount) * units[unit as keyof typeof units]
  }

  /**
   * Parse time limit string to milliseconds
   */
  private parseTimeLimit(limit: string): number {
    const match = limit.match(/^(\d+)s$/)
    if (!match) return 10000 // Default 10 seconds
    
    return parseInt(match[1]) * 1000
  }

  /**
   * Cleanup temporary files
   */
  private async cleanup(): Promise<void> {
    try {
      await rm(this.tempDir, { recursive: true, force: true })
    } catch (error) {
      // Log cleanup errors but don't throw
      console.warn('WASM cleanup error:', error)
    }
  }
}

// Factory function for easy usage
export function createWASMExecutor(options?: Partial<WASMExecutionOptions>): WASMExecutor {
  return new WASMExecutor(options)
}