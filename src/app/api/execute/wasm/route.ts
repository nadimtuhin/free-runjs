/**
 * WASM-powered code execution endpoint
 * Provides secure, isolated JavaScript execution using WebAssembly
 */

import { NextRequest, NextResponse } from 'next/server'
import { createWASMExecutor, WASMExecutionOptions } from '../../../utils/wasm-executor'
import { validateAPIKey, checkKeyRateLimit } from '../../../utils/auth'
import { securityLogger, getClientIP, getUserAgent } from '../../../utils/security-logger'
import {
  validatePackageName,
  scanCodeForDangerousPatterns,
  analyzeCodeComplexity,
  detectSuspiciousPatterns,
  scanForMaliciousContent,
} from '../../../utils/security'

export async function POST(request: NextRequest) {
  const ip = getClientIP(request)
  const userAgent = getUserAgent(request)

  try {
    // Authentication and rate limiting
    const authResult = validateAPIKey(request)
    if (!authResult.authenticated) {
      securityLogger.logSecurityEvent({
        type: 'authentication_failed',
        ip,
        userAgent,
        severity: 'medium',
        blocked: true,
        details: { reason: authResult.reason }
      })
      return NextResponse.json(
        { error: `Unauthorized: ${authResult.reason}` },
        { status: 401 }
      )
    }

    if (authResult.keyId && !checkKeyRateLimit(authResult.keyId)) {
      securityLogger.logSecurityEvent({
        type: 'rate_limit_exceeded',
        ip,
        userAgent,
        severity: 'medium',
        blocked: true,
        details: { keyId: authResult.keyId }
      })
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { 
      code, 
      moduleType = 'esm',
      wasmOptions = {}
    } = body

    // Input validation
    if (typeof code !== 'string' || code.trim().length === 0) {
      return NextResponse.json(
        { error: 'Code must be a non-empty string' },
        { status: 400 }
      )
    }

    if (!['esm', 'commonjs'].includes(moduleType)) {
      return NextResponse.json(
        { error: 'moduleType must be either "esm" or "commonjs"' },
        { status: 400 }
      )
    }

    // Security validation
    const dangerousPatterns = scanCodeForDangerousPatterns(code)
    if (dangerousPatterns.length > 0) {
      securityLogger.logSecurityEvent({
        type: 'code_execution_blocked',
        ip,
        userAgent,
        severity: 'high',
        blocked: true,
        details: { violations: dangerousPatterns }
      })
      return NextResponse.json(
        {
          error: 'Code contains potentially dangerous patterns',
          violations: dangerousPatterns
        },
        { status: 400 }
      )
    }

    // Code complexity analysis
    const complexity = analyzeCodeComplexity(code)
    if (complexity.complexity > 20) {
      securityLogger.logSecurityEvent({
        type: 'code_execution_blocked',
        ip,
        userAgent,
        severity: 'medium',
        blocked: true,
        details: { 
          complexity: complexity.complexity,
          violations: complexity.violations
        }
      })
      return NextResponse.json(
        {
          error: 'Code complexity too high',
          violations: complexity.violations
        },
        { status: 400 }
      )
    }

    // Suspicious pattern detection
    const suspiciousPatterns = detectSuspiciousPatterns(code)
    if (suspiciousPatterns.length > 0) {
      securityLogger.logSecurityEvent({
        type: 'code_execution_blocked',
        ip,
        userAgent,
        severity: 'high',
        blocked: true,
        details: { suspiciousPatterns }
      })
      return NextResponse.json(
        {
          error: 'Code contains suspicious patterns',
          violations: suspiciousPatterns
        },
        { status: 400 }
      )
    }

    // Malicious content scan
    const maliciousContent = scanForMaliciousContent(code)
    if (maliciousContent.length > 0) {
      securityLogger.logSecurityEvent({
        type: 'code_execution_blocked',
        ip,
        userAgent,
        severity: 'critical',
        blocked: true,
        details: { maliciousContent }
      })
      return NextResponse.json(
        {
          error: 'Code contains malicious content',
          violations: maliciousContent
        },
        { status: 400 }
      )
    }

    // Extract and validate packages
    const packages = extractPackages(code, moduleType)
    for (const pkg of packages) {
      if (!validatePackageName(pkg)) {
        securityLogger.logSecurityEvent({
          type: 'package_blocked',
          ip,
          userAgent,
          severity: 'medium',
          blocked: true,
          details: { package: pkg }
        })
        return NextResponse.json(
          { error: `Package '${pkg}' is not allowed for security reasons` },
          { status: 400 }
        )
      }
    }

    // Configure WASM execution options
    const executionOptions: Partial<WASMExecutionOptions> = {
      memoryLimit: '256MB',
      cpuTimeLimit: '30s',
      allowNetwork: false,
      allowedPaths: ['/tmp'],
      maxFileSize: '10MB',
      runtime: 'wasmtime',
      ...wasmOptions
    }

    // Create WASM executor
    const executor = createWASMExecutor(executionOptions)

    // Execute code in WASM sandbox
    const result = await executor.execute(code, moduleType)

    // Log successful execution
    securityLogger.logSecurityEvent({
      type: 'code_execution_blocked', // Using this as closest type
      ip,
      userAgent,
      severity: 'low',
      blocked: false,
      details: { 
        wasmUsed: result.wasmUsed,
        executionTime: result.executionTime,
        memoryUsed: result.memoryUsed,
        packages
      }
    })

    return NextResponse.json({
      output: result.output,
      error: result.error,
      executionTime: result.executionTime,
      memoryUsed: result.memoryUsed,
      wasmUsed: result.wasmUsed,
      exitCode: result.exitCode,
      moduleType,
      packages,
      securityChecks: {
        dangerousPatterns: 0,
        complexity: complexity.complexity,
        suspiciousPatterns: 0,
        maliciousContent: 0
      }
    })

  } catch (error) {
    securityLogger.logSecurityEvent({
      type: 'execution_timeout',
      ip,
      userAgent,
      severity: 'medium',
      blocked: false,
      details: { 
        error: error instanceof Error ? error.message : String(error)
      }
    })

    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        wasmUsed: false
      },
      { status: 500 }
    )
  }
}

/**
 * Extract package dependencies from code
 */
function extractPackages(code: string, moduleType: 'esm' | 'commonjs'): string[] {
  const packages = new Set<string>()

  if (moduleType === 'esm') {
    // Match ES module imports
    const importRegex = /import\s+(?:(?:[\w*\s{},]*)\s+from\s+)?['"]([^'"@][^'"]*)['"]/g
    let match = importRegex.exec(code)
    while (match) {
      const packageName = match[1].split('/')[0]
      packages.add(packageName)
      match = importRegex.exec(code)
    }
  } else {
    // Match CommonJS requires
    const requireRegex = /require\(['"]([^'"@][^'"]*)['"]\)/g
    let match = requireRegex.exec(code)
    while (match) {
      const packageName = match[1].split('/')[0]
      packages.add(packageName)
      match = requireRegex.exec(code)
    }
  }

  return Array.from(packages)
}

export const dynamic = 'force-dynamic'