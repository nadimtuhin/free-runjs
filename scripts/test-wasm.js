#!/usr/bin/env node

/**
 * WASM Integration Test Script
 * Tests the WebAssembly execution capabilities of RunJS
 */

const { spawn } = require('child_process')
const fs = require('fs').promises
const path = require('path')

// Test configurations
const TEST_CASES = [
  {
    name: 'Simple Console Output',
    code: 'console.log("Hello from WASM!")',
    moduleType: 'esm',
    expectedOutput: 'Hello from WASM!'
  },
  {
    name: 'Mathematical Operations',
    code: `
      const result = 2 + 2;
      console.log('2 + 2 =', result);
      console.log('Square root of 16:', Math.sqrt(16));
    `,
    moduleType: 'esm',
    expectedOutput: ['2 + 2 = 4', 'Square root of 16: 4']
  },
  {
    name: 'CommonJS Require',
    code: `
      const path = require('path');
      console.log('Platform:', process.platform);
      console.log('Path separator:', path.sep);
    `,
    moduleType: 'commonjs',
    expectedOutput: ['Platform:', 'Path separator:']
  },
  {
    name: 'Error Handling',
    code: `
      try {
        throw new Error('Test error');
      } catch (e) {
        console.log('Caught error:', e.message);
      }
    `,
    moduleType: 'esm',
    expectedOutput: 'Caught error: Test error'
  },
  {
    name: 'Async Operations',
    code: `
      async function test() {
        return new Promise(resolve => {
          setTimeout(() => {
            console.log('Async operation completed');
            resolve();
          }, 100);
        });
      }
      test();
    `,
    moduleType: 'esm',
    expectedOutput: 'Async operation completed'
  }
]

// Colors for output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
}

function colorize(text, color) {
  return `${colors[color]}${text}${colors.reset}`
}

function printStatus(message, status = 'info') {
  const statusColors = {
    info: 'blue',
    success: 'green',
    warning: 'yellow',
    error: 'red'
  }
  
  const statusIcons = {
    info: 'ℹ',
    success: '✅',
    warning: '⚠',
    error: '❌'
  }
  
  console.log(`${statusIcons[status]} ${colorize(message, statusColors[status])}`)
}

async function checkWasmtimeInstallation() {
  return new Promise((resolve) => {
    const child = spawn('wasmtime', ['--version'], { stdio: 'pipe' })
    
    child.on('close', (code) => {
      resolve(code === 0)
    })
    
    child.on('error', () => {
      resolve(false)
    })
  })
}

async function checkNodeWasmSupport() {
  try {
    // Check if WebAssembly is available in Node.js
    if (typeof WebAssembly !== 'undefined') {
      return true
    }
    return false
  } catch {
    return false
  }
}

async function testWasmExecutor(testCase) {
  printStatus(`Testing: ${testCase.name}`, 'info')
  
  try {
    // Import the WASM executor (simulated for now)
    const { createWASMExecutor } = require('../src/app/utils/wasm-executor')
    
    const executor = createWASMExecutor({
      memoryLimit: '64MB',
      cpuTimeLimit: '5s',
      allowNetwork: false,
      runtime: 'wasmtime'
    })
    
    const result = await executor.execute(testCase.code, testCase.moduleType)
    
    // Check if execution was successful
    if (result.exitCode === 0) {
      // Verify expected output
      const outputContainsExpected = Array.isArray(testCase.expectedOutput)
        ? testCase.expectedOutput.every(expected => result.output.includes(expected))
        : result.output.includes(testCase.expectedOutput)
      
      if (outputContainsExpected) {
        printStatus(`✓ ${testCase.name} - PASSED`, 'success')
        console.log(`  Output: ${result.output.trim()}`)
        console.log(`  WASM Used: ${result.wasmUsed}`)
        console.log(`  Execution Time: ${result.executionTime}ms`)
        return { passed: true, error: null }
      } else {
        printStatus(`✗ ${testCase.name} - FAILED (unexpected output)`, 'error')
        console.log(`  Expected: ${testCase.expectedOutput}`)
        console.log(`  Got: ${result.output}`)
        return { passed: false, error: 'Unexpected output' }
      }
    } else {
      printStatus(`✗ ${testCase.name} - FAILED (exit code ${result.exitCode})`, 'error')
      console.log(`  Error: ${result.error || 'Unknown error'}`)
      return { passed: false, error: result.error }
    }
    
  } catch (error) {
    printStatus(`✗ ${testCase.name} - ERROR`, 'error')
    console.log(`  Error: ${error.message}`)
    return { passed: false, error: error.message }
  }
}

async function runBenchmarks() {
  printStatus('Running WASM vs Native Performance Benchmarks', 'info')
  
  const benchmarkCode = `
    const iterations = 100000;
    const start = Date.now();
    
    let sum = 0;
    for (let i = 0; i < iterations; i++) {
      sum += Math.sqrt(i) * Math.sin(i);
    }
    
    const end = Date.now();
    console.log('Benchmark completed in', end - start, 'ms');
    console.log('Result:', sum);
  `
  
  try {
    const { createWASMExecutor } = require('../src/app/utils/wasm-executor')
    
    // WASM execution
    const wasmExecutor = createWASMExecutor()
    const wasmStart = Date.now()
    const wasmResult = await wasmExecutor.execute(benchmarkCode, 'esm')
    const wasmTime = Date.now() - wasmStart
    
    printStatus(`WASM Execution: ${wasmTime}ms (WASM used: ${wasmResult.wasmUsed})`, 'info')
    
    // Performance comparison would go here
    console.log('Benchmark results:')
    console.log(`  WASM Time: ${wasmTime}ms`)
    console.log(`  Memory Used: ${wasmResult.memoryUsed} bytes`)
    console.log(`  Exit Code: ${wasmResult.exitCode}`)
    
  } catch (error) {
    printStatus(`Benchmark failed: ${error.message}`, 'error')
  }
}

async function main() {
  console.log(colorize('🚀 RunJS WASM Integration Test Suite', 'magenta'))
  console.log('========================================\n')
  
  // Check prerequisites
  printStatus('Checking prerequisites...', 'info')
  
  const wasmtimeAvailable = await checkWasmtimeInstallation()
  const nodeWasmSupport = await checkNodeWasmSupport()
  
  if (wasmtimeAvailable) {
    printStatus('✓ Wasmtime runtime available', 'success')
  } else {
    printStatus('⚠ Wasmtime not found - will use fallback mode', 'warning')
    console.log('  Install with: npm run wasm:setup')
  }
  
  if (nodeWasmSupport) {
    printStatus('✓ Node.js WebAssembly support available', 'success')
  } else {
    printStatus('✗ Node.js WebAssembly support not available', 'error')
  }
  
  console.log('')
  
  // Run test cases
  printStatus('Running WASM execution tests...', 'info')
  console.log('')
  
  let passed = 0
  let failed = 0
  
  for (const testCase of TEST_CASES) {
    const result = await testWasmExecutor(testCase)
    
    if (result.passed) {
      passed++
    } else {
      failed++
    }
    
    console.log('')
  }
  
  // Run benchmarks
  await runBenchmarks()
  
  // Summary
  console.log('')
  console.log(colorize('📊 Test Summary', 'magenta'))
  console.log('================')
  console.log(`Total tests: ${TEST_CASES.length}`)
  console.log(colorize(`Passed: ${passed}`, 'green'))
  console.log(colorize(`Failed: ${failed}`, failed > 0 ? 'red' : 'green'))
  
  if (failed === 0) {
    printStatus('All tests passed! 🎉', 'success')
    process.exit(0)
  } else {
    printStatus(`${failed} test(s) failed`, 'error')
    process.exit(1)
  }
}

// Handle errors
process.on('unhandledRejection', (error) => {
  printStatus(`Unhandled error: ${error.message}`, 'error')
  process.exit(1)
})

// Run tests
if (require.main === module) {
  main().catch(error => {
    printStatus(`Test suite failed: ${error.message}`, 'error')
    process.exit(1)
  })
}