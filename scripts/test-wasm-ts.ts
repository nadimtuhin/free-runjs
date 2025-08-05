#!/usr/bin/env ts-node

/**
 * Simple WASM Integration Test using TypeScript
 */

import { createWASMExecutor } from '../src/app/utils/wasm-executor'

async function testBasicWASM(): Promise<boolean> {
  console.log('🧪 Testing WASM Executor Basic Functionality')
  console.log('='.repeat(50))
  
  try {
    // Create WASM executor with simple options
    const executor = createWASMExecutor({
      memoryLimit: '64MB',
      cpuTimeLimit: '5s',
      allowNetwork: false,
      runtime: 'native-fallback' as any // Force fallback for testing
    })
    
    console.log('✅ WASM Executor created successfully')
    
    // Test simple code execution
    const code = 'console.log("Hello from WASM test!")'
    console.log(`\n📝 Testing code: ${code}`)
    
    const result = await executor.execute(code, 'esm')
    
    console.log('\n📊 Execution Results:')
    console.log(`   Output: ${result.output.trim()}`)
    console.log(`   Exit Code: ${result.exitCode}`)
    console.log(`   WASM Used: ${result.wasmUsed}`)
    console.log(`   Execution Time: ${result.executionTime}ms`)
    console.log(`   Memory Used: ${result.memoryUsed} bytes`)
    
    if (result.error) {
      console.log(`   Error: ${result.error}`)
    }
    
    // Check if execution was successful
    if (result.exitCode === 0 && result.output.includes('Hello from WASM test!')) {
      console.log('\n🎉 WASM Executor test PASSED!')
      return true
    } else {
      console.log('\n❌ WASM Executor test FAILED!')
      return false
    }
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined
    console.log(`\n💥 Test failed with error: ${errorMessage}`)
    if (errorStack) {
      console.log('Stack trace:', errorStack)
    }
    return false
  }
}

async function main() {
  console.log('🚀 RunJS WASM Simple Integration Test (TypeScript)')
  console.log('='.repeat(55))
  
  let passedTests = 0
  let totalTests = 0
  
  // Test basic functionality
  totalTests++
  if (await testBasicWASM()) {
    passedTests++
  }
  
  // Summary
  console.log('\n📊 Test Summary')
  console.log('===============')
  console.log(`Total Tests: ${totalTests}`)
  console.log(`Passed: ${passedTests}`)
  console.log(`Failed: ${totalTests - passedTests}`)
  
  if (passedTests === totalTests) {
    console.log('\n🎉 All tests passed!')
    process.exit(0)
  } else {
    console.log(`\n❌ ${totalTests - passedTests} test(s) failed`)
    process.exit(1)
  }
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('Unhandled error:', error)
  process.exit(1)
})

// Run tests
if (require.main === module) {
  main().catch(error => {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('Test suite failed:', errorMessage)
    process.exit(1)
  })
}