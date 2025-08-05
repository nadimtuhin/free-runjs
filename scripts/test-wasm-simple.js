#!/usr/bin/env node

/**
 * Simple WASM Integration Test
 * Tests basic WASM executor functionality
 */

const { createWASMExecutor } = require('../src/app/utils/wasm-executor')

async function testBasicWASM() {
  console.log('🧪 Testing WASM Executor Basic Functionality')
  console.log('=' .repeat(50))
  
  try {
    // Create WASM executor with simple options
    const executor = createWASMExecutor({
      memoryLimit: '64MB',
      cpuTimeLimit: '5s',
      allowNetwork: false,
      runtime: 'native-fallback' // Force fallback for testing
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
    console.log(`\n💥 Test failed with error: ${error.message}`)
    console.log('Stack trace:', error.stack)
    return false
  }
}

async function testErrorHandling() {
  console.log('\n🧪 Testing WASM Error Handling')
  console.log('=' .repeat(50))
  
  try {
    const executor = createWASMExecutor({
      runtime: 'native-fallback'
    })
    
    // Test code that should cause an error
    const errorCode = 'console.log(undefinedVariable)'
    console.log(`📝 Testing error code: ${errorCode}`)
    
    const result = await executor.execute(errorCode, 'esm')
    
    console.log('\n📊 Error Handling Results:')
    console.log(`   Exit Code: ${result.exitCode}`)
    console.log(`   WASM Used: ${result.wasmUsed}`)
    console.log(`   Execution Time: ${result.executionTime}ms`)
    
    if (result.error) {
      console.log(`   Error: ${result.error.trim()}`)
    }
    
    // Error handling is successful if we get a non-zero exit code
    if (result.exitCode !== 0) {
      console.log('\n🎉 Error handling test PASSED!')
      return true
    } else {
      console.log('\n❌ Error handling test FAILED - expected non-zero exit code')
      return false
    }
    
  } catch (error) {
    console.log(`\n💥 Error handling test failed: ${error.message}`)
    return false
  }
}

async function main() {
  console.log('🚀 RunJS WASM Simple Integration Test')
  console.log('====================================\n')
  
  let passedTests = 0
  let totalTests = 0
  
  // Test basic functionality
  totalTests++
  if (await testBasicWASM()) {
    passedTests++
  }
  
  // Test error handling
  totalTests++
  if (await testErrorHandling()) {
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
    console.error('Test suite failed:', error.message)
    process.exit(1)
  })
}