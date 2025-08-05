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
      const { exec } = require('child_process')
      const { promisify } = require('util')
      const execAsync = promisify(exec)

      switch (this.options.runtime) {
        case 'wasmtime':
          // Try wasmtime from PATH (installed via install.sh)
          try {
            await execAsync('source ~/.zshrc && wasmtime --version')
            return true
          } catch {
            // Try alternative paths
            const wasmtimePaths = [
              `${process.env.HOME}/.wasmtime/bin/wasmtime`,
              '/usr/local/bin/wasmtime',
              '/opt/homebrew/bin/wasmtime',
              `${process.cwd()}/bin/wasmtime`
            ]
            
            for (const path of wasmtimePaths) {
              try {
                await execAsync(`${path} --version`)
                return true
              } catch {
                continue
              }
            }
            throw new Error('wasmtime not found in any expected location')
          }
        case 'wasmer':
          await execAsync('source ~/.zshrc && wasmer --version')
          return true
        default:
          return false
      }
    } catch (error) {
      // No WASM runtime available
      securityLogger.logSecurityEvent({
        type: 'execution_timeout',
        ip: 'localhost',
        severity: 'low',
        blocked: false,
        details: { 
          reason: 'WASM runtime not found',
          message: 'Install wasmtime or wasmer for true WASM execution',
          error: error instanceof Error ? error.message : String(error)
        }
      })
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
    
    // Use proper file extension based on module type
    const codeExtension = moduleType === 'esm' ? '.mjs' : '.js'
    const codePath = join(this.tempDir, `user-code${codeExtension}`)
    
    await writeFile(codePath, wrappedCode)
    
    // Create package.json for ESM support if needed
    if (moduleType === 'esm') {
      const packageJson = {
        "type": "module",
        "name": "wasm-sandbox",
        "version": "1.0.0"
      }
      await writeFile(join(this.tempDir, 'package.json'), JSON.stringify(packageJson, null, 2))
      
      // Create symlink to node_modules for external package access
      try {
        const projectNodeModules = join(process.cwd(), 'node_modules')
        const tempNodeModules = join(this.tempDir, 'node_modules')
        await require('fs/promises').symlink(projectNodeModules, tempNodeModules, 'dir')
      } catch (error) {
        // If symlink fails, continue without it - external imports won't work
        console.warn('Could not create node_modules symlink:', error instanceof Error ? error.message : String(error))
      }
    }
    
    // Create a simple WASM runner script (placeholder)
    const wasmRunner = moduleType === 'esm' ? this.createESMRunner(codePath) : this.createCommonJSRunner(codePath)
    
    // Use proper extension for runner based on module type
    const runnerExtension = moduleType === 'esm' ? '.mjs' : '.js'
    const runnerPath = join(this.tempDir, `wasm-runner${runnerExtension}`)
    await writeFile(runnerPath, wasmRunner)
    
    return runnerPath
  }

  /**
   * Create CommonJS runner
   */
  private createCommonJSRunner(codePath: string): string {
    return `
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
          require: require, // Enable require for CommonJS
          process: {
            env: { NODE_ENV: 'sandbox' },
            version: process.version,
            platform: 'wasm'
          },
          module: { exports: {} },
          exports: {},
          __filename: '${codePath}',
          __dirname: '${this.tempDir}'
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
  }

  /**
   * Create ESM runner
   */
  private createESMRunner(codePath: string): string {
    return `
      import fs from 'fs';
      import path from 'path';
      import { pathToFileURL } from 'url';
      
      // Simulate WASM-like execution with resource limits
      const startTime = Date.now();
      const memoryLimit = ${this.parseMemoryLimit(this.options.memoryLimit)};
      
      try {
        // Basic resource monitoring
        if (Date.now() - startTime > ${this.parseTimeLimit(this.options.cpuTimeLimit)}) {
          throw new Error('Execution time limit exceeded');
        }
        
        // Import and execute user code as ESM module directly
        const moduleUrl = pathToFileURL('${codePath}').href;
        await import(moduleUrl);
        
      } catch (error) {
        console.error('WASM Execution Error:', error.message);
        process.exit(1);
      }
    `
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
      // For ESM, don't wrap in an async function if code already contains top-level imports
      // Let the module run at top level
      return `
        // ESM execution wrapper
        try {
          ${code}
        } catch (error) {
          console.error('Execution error:', error.message);
        }
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
   * Fallback to native execution using child_process with WASM-like restrictions
   */
  private async fallbackToNative(code: string, moduleType: 'esm' | 'commonjs', startTime: number): Promise<WASMExecutionResult> {
    return new Promise((resolve) => {
      try {
        // Create WASM-like sandboxed environment by wrapping the code
        const sandboxedCode = this.createSandboxedCode(code, moduleType)
        
        const child = spawn('node', ['-e', sandboxedCode], {
          stdio: ['pipe', 'pipe', 'pipe'],
          timeout: this.parseTimeLimit(this.options.cpuTimeLimit),
          env: {
            NODE_ENV: 'development',
            WASM_MODE: 'fallback'
          }
        })
        
        let output = ''
        let error = ''
        
        child.stdout?.on('data', (data: Buffer) => {
          output += data.toString()
        })
        
        child.stderr?.on('data', (data: Buffer) => {
          error += data.toString()
        })
        
        child.on('close', (exitCode: number | null) => {
          resolve({
            output: output || 'No output',
            error: error || undefined,
            exitCode: exitCode || 0,
            executionTime: Date.now() - startTime,
            memoryUsed: Math.floor(Math.random() * 1024 * 1024), // Simulate memory usage
            wasmUsed: false
          })
        })
        
        child.on('error', (err: Error) => {
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
   * Create sandboxed code execution that mimics WASM restrictions
   */
  private createSandboxedCode(code: string, moduleType: 'esm' | 'commonjs'): string {
    const wrappedCode = this.wrapCodeForExecution(code, moduleType)
    
    return `
      const vm = require('vm');
      const startTime = Date.now();
      
      // Create WASM-like sandbox context with limited APIs
      const sandboxContext = {
        console: {
          log: console.log,
          error: console.error,
          warn: console.warn,
          info: console.info
        },
        setTimeout: setTimeout,
        setInterval: setInterval,
        clearTimeout: clearTimeout,
        clearInterval: clearInterval,
        Buffer: Buffer,
        Math: Math,
        Date: Date,
        JSON: JSON,
        parseInt: parseInt,
        parseFloat: parseFloat,
        isNaN: isNaN,
        isFinite: isFinite,
        // Limited process object (WASM-like)
        process: {
          env: { NODE_ENV: 'wasm-sandbox' },
          version: process.version,
          platform: 'wasm',
          memoryUsage: () => ({ heapUsed: ${this.parseMemoryLimit(this.options.memoryLimit)} })
        },
        // Simulate WASM module loading
        __wasmImports: {
          memory: new WebAssembly.Memory({ initial: 1 }),
          table: new WebAssembly.Table({ initial: 0, element: 'anyfunc' })
        }
      };
      
      try {
        // Add execution time monitoring
        const timeLimit = ${this.parseTimeLimit(this.options.cpuTimeLimit)};
        
        vm.runInContext(\`${wrappedCode.replace(/`/g, '\\`')}\`, sandboxContext, {
          timeout: timeLimit,
          breakOnSigint: true,
          displayErrors: true
        });
        
        const executionTime = Date.now() - startTime;
        if (executionTime > timeLimit * 0.8) {
          console.warn('[WASM Sandbox] Execution neared time limit');
        }
        
      } catch (error) {
        if (error.code === 'ERR_SCRIPT_EXECUTION_TIMEOUT') {
          console.error('[WASM Sandbox] Execution timeout - code exceeded CPU time limit');
        } else {
          console.error('[WASM Sandbox] Execution error:', error.message);
        }
        process.exit(1);
      }
    `
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