export const ALLOWED_PACKAGES = new Set([
  // Core Node.js modules
  'util',
  'path',
  'fs',
  'os',
  'crypto',
  'buffer',
  'stream',
  'events',
  'querystring',
  'url',
  'http',
  'https',
  'zlib',
  'string_decoder',

  // Popular safe packages
  'lodash',
  'ramda',
  'moment',
  'date-fns',
  'uuid',
  'bcrypt',
  'validator',
  'joi',
  'yup',
  'axios',
  'node-fetch',
  'express',
  'fastify',
  'mongoose',
  'prisma',
  'typeorm',
  'sequelize',
  'react',
  'vue',
  'angular',
  'svelte',
  'typescript',
  'ts-node',
  'babel',
  'webpack',
  'vite',
  'jest',
  'mocha',
  'chai',
  'sinon',
  'supertest',
  'winston',
  'pino',
  'debug',
  'dotenv',
  'config',
  'compression',
  'cors',
  'helmet',
  'jsonwebtoken',
  'passport',
  'multer',
  'formidable',
  'nodemailer',
  'sendgrid',
])

export const DANGEROUS_PATTERNS = [
  // File system operations
  'require\\(.*fs.*\\)',
  'import.*fs.*from',
  '\\.readFile',
  '\\.writeFile',
  '\\.unlink',
  '\\.mkdir',
  '\\.rmdir',

  // Process and system operations
  'process\\.exit',
  'process\\.kill',
  'process\\.abort',
  'child_process',
  'spawn',
  'exec',
  'fork',

  // Network operations that could be dangerous
  'require\\(.*net.*\\)',
  'require\\(.*dgram.*\\)',
  'require\\(.*tls.*\\)',
  'require\\(.*cluster.*\\)',

  // Eval and dynamic code execution
  'eval\\(',
  'Function\\(',
  'setTimeout\\(.*eval',
  'setInterval\\(.*eval',
  'new Function',

  // Global object access
  'global\\.',
  'globalThis\\.',
  'window\\.',

  // Potentially dangerous modules
  'require\\(.*vm.*\\)',
  'require\\(.*worker_threads.*\\)',
  'require\\(.*perf_hooks.*\\)',
]

export function validatePackageName(packageName: string): boolean {
  // Check against whitelist
  if (!ALLOWED_PACKAGES.has(packageName)) {
    return false
  }

  // Additional security checks
  if (packageName.includes('..') || packageName.includes('/') || packageName.includes('\\')) {
    return false
  }

  return true
}

export function scanCodeForDangerousPatterns(code: string): string[] {
  const violations: string[] = []

  for (const pattern of DANGEROUS_PATTERNS) {
    const regex = new RegExp(pattern, 'gi')
    if (regex.test(code)) {
      violations.push(`Dangerous pattern detected: ${pattern}`)
    }
  }

  return violations
}

export function analyzeCodeComplexity(code: string): {
  complexity: number
  nestedLoops: number
  violations: string[]
} {
  const violations: string[] = []
  let complexity = 1 // Base complexity
  let nestedLoops = 0
  let currentLoopDepth = 0
  let maxLoopDepth = 0

  // Count complexity-adding constructs
  const complexityPatterns = [
    /\bif\s*\(/g, // if statements
    /\belse\s+if\b/g, // else if
    /\bwhile\s*\(/g, // while loops
    /\bfor\s*\(/g, // for loops
    /\bswitch\s*\(/g, // switch statements
    /\bcase\s+/g, // case statements
    /\bcatch\s*\(/g, // catch blocks
    /\?\s*.*?\s*:/g, // ternary operators
    /&&|\|\|/g, // logical operators
  ]

  complexityPatterns.forEach(pattern => {
    const matches = code.match(pattern)
    if (matches) {
      complexity += matches.length
    }
  })

  // Analyze nested loops
  const lines = code.split('\n')
  lines.forEach(line => {
    const trimmed = line.trim()

    // Check for loop start
    if (/\b(for|while)\s*\(/.test(trimmed) || /\bfor\s+\w+\s+in\s+/.test(trimmed)) {
      currentLoopDepth++
      maxLoopDepth = Math.max(maxLoopDepth, currentLoopDepth)
    }

    // Check for block end (simple heuristic)
    if (trimmed === '}' && currentLoopDepth > 0) {
      currentLoopDepth = Math.max(0, currentLoopDepth - 1)
    }
  })

  nestedLoops = maxLoopDepth

  // Check violations
  if (complexity > MAX_CODE_COMPLEXITY) {
    violations.push(`Code complexity too high: ${complexity} (max: ${MAX_CODE_COMPLEXITY})`)
  }

  if (nestedLoops > MAX_NESTED_LOOPS) {
    violations.push(`Too many nested loops: ${nestedLoops} (max: ${MAX_NESTED_LOOPS})`)
  }

  return { complexity, nestedLoops, violations }
}

export function detectSuspiciousPatterns(code: string): string[] {
  const suspiciousPatterns = [
    // Potential bitcoin mining or crypto operations
    /\b(bitcoin|ethereum|mining|hash|sha256|crypto)\b/gi,

    // Network scanning or attacks
    /\b(nmap|masscan|port.?scan|vulnerability|exploit)\b/gi,

    // Data exfiltration attempts
    /\b(exfiltrate|steal|password|credential|token|secret)\b/gi,

    // Suspicious network operations
    /\b(ddos|flood|attack|payload|shell|backdoor)\b/gi,

    // Obfuscation attempts
    /\\x[0-9a-f]{2}/gi, // hex encoded strings
    /\\u[0-9a-f]{4}/gi, // unicode encoded strings

    // Excessive loops (potential DoS)
    /for\s*\(\s*[^;]*;\s*[^;]*<\s*\d{6,}/gi, // loops with very high iteration counts
  ]

  const violations: string[] = []

  suspiciousPatterns.forEach((pattern, index) => {
    if (pattern.test(code)) {
      violations.push(`Suspicious pattern detected: ${pattern.source}`)
    }
  })

  return violations
}

export function scanForMaliciousContent(code: string): string[] {
  const violations: string[] = []

  // Check for excessive string repetition (potential DoS)
  const stringRepeats = code.match(/(['"`])[^'"]*['"`]\s*\+\s*['"`][^'"]*['"`]/g)
  if (stringRepeats && stringRepeats.length > 100) {
    violations.push('Excessive string concatenation detected (potential DoS)')
  }

  // Check for very long strings (potential buffer overflow attempts)
  const longStrings = code.match(/(['"`])[^'"]{10000,}['"`]/g)
  if (longStrings) {
    violations.push('Extremely long strings detected (potential buffer overflow)')
  }

  // Check for excessive function calls (potential DoS)
  const functionCalls = code.match(/\w+\s*\(/g)
  if (functionCalls && functionCalls.length > 1000) {
    violations.push('Excessive function calls detected (potential DoS)')
  }

  return violations
}

export function sanitizeEnvironment() {
  // Return a minimal, safe environment
  return {
    NODE_ENV: process.env.NODE_ENV,
    // Only include essential environment variables
    // Remove anything that could contain secrets
  }
}

export const EXECUTION_TIMEOUT = 10000 // 10 seconds max execution time
export const MAX_MEMORY_USAGE = 50 * 1024 * 1024 // 50MB max memory
export const MAX_CODE_COMPLEXITY = 100 // Maximum cyclomatic complexity
export const MAX_NESTED_LOOPS = 3 // Maximum nested loop depth
