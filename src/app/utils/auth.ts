import { NextRequest } from 'next/server'
import { securityLogger, getClientIP, getUserAgent } from './security-logger'

// In production, store these securely (database, vault, etc.)
const VALID_API_KEYS = new Set(
  [process.env.API_KEY_1, process.env.API_KEY_2, process.env.API_KEY_3].filter(Boolean)
)

// For development/demo, allow execution without API key
const ALLOW_ANONYMOUS = process.env.NODE_ENV === 'development'

export interface AuthResult {
  authenticated: boolean
  reason?: string
  keyId?: string
}

export function validateAPIKey(request: NextRequest): AuthResult {
  // Skip authentication in development mode
  if (ALLOW_ANONYMOUS) {
    return { authenticated: true, reason: 'development_mode' }
  }

  const authHeader = request.headers.get('authorization')
  const apiKeyHeader = request.headers.get('x-api-key')
  const apiKeyQuery = request.nextUrl.searchParams.get('api_key')

  let providedKey: string | null = null
  let keySource = ''

  // Check different ways API key can be provided
  if (authHeader?.startsWith('Bearer ')) {
    providedKey = authHeader.substring(7)
    keySource = 'bearer_token'
  } else if (apiKeyHeader) {
    providedKey = apiKeyHeader
    keySource = 'x-api-key_header'
  } else if (apiKeyQuery) {
    providedKey = apiKeyQuery
    keySource = 'query_parameter'
  }

  const ip = getClientIP(request)
  const userAgent = getUserAgent(request)

  if (!providedKey) {
    securityLogger.logSecurityEvent({
      type: 'authentication_failed',
      ip,
      userAgent,
      severity: 'medium',
      blocked: true,
      details: {
        reason: 'missing_api_key',
        endpoint: request.nextUrl.pathname,
      },
    })

    return { authenticated: false, reason: 'missing_api_key' }
  }

  // Validate API key
  if (!VALID_API_KEYS.has(providedKey)) {
    securityLogger.logSecurityEvent({
      type: 'authentication_failed',
      ip,
      userAgent,
      severity: 'high',
      blocked: true,
      details: {
        reason: 'invalid_api_key',
        key_source: keySource,
        key_prefix: providedKey.substring(0, 8) + '...',
        endpoint: request.nextUrl.pathname,
      },
    })

    return { authenticated: false, reason: 'invalid_api_key' }
  }

  // Generate key ID for logging (don't log the actual key)
  const keyId = `key_${Buffer.from(providedKey).toString('base64').substring(0, 8)}`

  return { authenticated: true, keyId }
}

export function generateAPIKey(): string {
  // Generate a secure random API key
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = 'rjs_' // Prefix to identify our keys

  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }

  return result
}

// Rate limiting per API key
const keyUsage = new Map<string, { count: number; resetTime: number }>()
const KEY_RATE_LIMIT = 1000 // requests per hour per key
const KEY_RATE_WINDOW = 60 * 60 * 1000 // 1 hour

export function checkKeyRateLimit(keyId: string): boolean {
  const now = Date.now()
  const usage = keyUsage.get(keyId)

  if (!usage || now > usage.resetTime) {
    keyUsage.set(keyId, { count: 1, resetTime: now + KEY_RATE_WINDOW })
    return true
  }

  if (usage.count >= KEY_RATE_LIMIT) {
    return false
  }

  usage.count++
  return true
}
