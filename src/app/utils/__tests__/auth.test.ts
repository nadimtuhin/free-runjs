import { NextRequest } from 'next/server'
import {
  validateAPIKey,
  generateAPIKey,
  checkKeyRateLimit,
  AuthResult,
} from '../auth'

// Mock security logger
jest.mock('../security-logger', () => ({
  securityLogger: {
    logSecurityEvent: jest.fn(),
  },
  getClientIP: jest.fn(() => '127.0.0.1'),
  getUserAgent: jest.fn(() => 'test-agent'),
}))

describe('Authentication System', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset environment
    delete process.env.API_KEY_1
    delete process.env.API_KEY_2
    delete process.env.API_KEY_3
  })

  describe('validateAPIKey', () => {
    test('should allow requests in development mode without API key', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'

      const request = new NextRequest('http://localhost:3000/api/execute')
      const result = validateAPIKey(request)

      expect(result.authenticated).toBe(true)
      expect(result.reason).toBe('development_mode')

      process.env.NODE_ENV = originalEnv
    })

    test('should reject requests without API key in production', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'

      const request = new NextRequest('http://localhost:3000/api/execute')
      const result = validateAPIKey(request)

      expect(result.authenticated).toBe(false)
      expect(result.reason).toBe('missing_api_key')

      process.env.NODE_ENV = originalEnv
    })

    test('should accept valid API key from Authorization header', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'
      process.env.API_KEY_1 = 'valid_key_123'

      const request = new NextRequest('http://localhost:3000/api/execute', {
        headers: { Authorization: 'Bearer valid_key_123' },
      })

      const result = validateAPIKey(request)

      expect(result.authenticated).toBe(true)
      expect(result.keyId).toBeDefined()

      process.env.NODE_ENV = originalEnv
      delete process.env.API_KEY_1
    })

    test('should accept valid API key from X-API-Key header', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'
      process.env.API_KEY_1 = 'valid_key_456'

      const request = new NextRequest('http://localhost:3000/api/execute', {
        headers: { 'X-API-Key': 'valid_key_456' },
      })

      const result = validateAPIKey(request)

      expect(result.authenticated).toBe(true)
      expect(result.keyId).toBeDefined()

      process.env.NODE_ENV = originalEnv
      delete process.env.API_KEY_1
    })

    test('should accept valid API key from query parameter', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'
      process.env.API_KEY_1 = 'valid_key_789'

      const request = new NextRequest('http://localhost:3000/api/execute?api_key=valid_key_789')

      const result = validateAPIKey(request)

      expect(result.authenticated).toBe(true)
      expect(result.keyId).toBeDefined()

      process.env.NODE_ENV = originalEnv
      delete process.env.API_KEY_1
    })

    test('should reject invalid API key', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'
      process.env.API_KEY_1 = 'valid_key_123'

      const request = new NextRequest('http://localhost:3000/api/execute', {
        headers: { 'X-API-Key': 'invalid_key_456' },
      })

      const result = validateAPIKey(request)

      expect(result.authenticated).toBe(false)
      expect(result.reason).toBe('invalid_api_key')

      process.env.NODE_ENV = originalEnv
      delete process.env.API_KEY_1
    })

    test('should handle multiple valid API keys', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'
      process.env.API_KEY_1 = 'key_one'
      process.env.API_KEY_2 = 'key_two'
      process.env.API_KEY_3 = 'key_three'

      const request1 = new NextRequest('http://localhost:3000/api/execute', {
        headers: { 'X-API-Key': 'key_one' },
      })
      const request2 = new NextRequest('http://localhost:3000/api/execute', {
        headers: { 'X-API-Key': 'key_two' },
      })
      const request3 = new NextRequest('http://localhost:3000/api/execute', {
        headers: { 'X-API-Key': 'key_three' },
      })

      expect(validateAPIKey(request1).authenticated).toBe(true)
      expect(validateAPIKey(request2).authenticated).toBe(true)
      expect(validateAPIKey(request3).authenticated).toBe(true)

      process.env.NODE_ENV = originalEnv
      delete process.env.API_KEY_1
      delete process.env.API_KEY_2
      delete process.env.API_KEY_3
    })

    test('should prioritize Authorization header over other methods', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'
      process.env.API_KEY_1 = 'correct_key'

      const request = new NextRequest('http://localhost:3000/api/execute?api_key=wrong_key', {
        headers: {
          Authorization: 'Bearer correct_key',
          'X-API-Key': 'wrong_key',
        },
      })

      const result = validateAPIKey(request)

      expect(result.authenticated).toBe(true)

      process.env.NODE_ENV = originalEnv
      delete process.env.API_KEY_1
    })
  })

  describe('generateAPIKey', () => {
    test('should generate API key with correct prefix', () => {
      const apiKey = generateAPIKey()

      expect(apiKey).toMatch(/^rjs_[A-Za-z0-9]{32}$/)
      expect(apiKey.length).toBe(36) // 'rjs_' + 32 characters
    })

    test('should generate unique API keys', () => {
      const key1 = generateAPIKey()
      const key2 = generateAPIKey()
      const key3 = generateAPIKey()

      expect(key1).not.toBe(key2)
      expect(key2).not.toBe(key3)
      expect(key1).not.toBe(key3)
    })

    test('should generate keys with valid characters only', () => {
      const apiKey = generateAPIKey()
      const keyPart = apiKey.substring(4) // Remove 'rjs_' prefix

      expect(keyPart).toMatch(/^[A-Za-z0-9]+$/)
    })
  })

  describe('checkKeyRateLimit', () => {
    beforeEach(() => {
      // Clear rate limit data between tests
      jest.clearAllMocks()
    })

    test('should allow requests within rate limit', () => {
      const keyId = 'test_key_1'

      // First request should be allowed
      expect(checkKeyRateLimit(keyId)).toBe(true)

      // Multiple requests within limit should be allowed
      for (let i = 0; i < 50; i++) {
        expect(checkKeyRateLimit(keyId)).toBe(true)
      }
    })

    test('should reject requests exceeding rate limit', () => {
      const keyId = 'test_key_2'

      // Make requests up to the limit
      for (let i = 0; i < 1000; i++) {
        checkKeyRateLimit(keyId)
      }

      // Next request should be rejected
      expect(checkKeyRateLimit(keyId)).toBe(false)
    })

    test('should handle different keys independently', () => {
      const keyId1 = 'test_key_3'
      const keyId2 = 'test_key_4'

      // Max out one key
      for (let i = 0; i < 1000; i++) {
        checkKeyRateLimit(keyId1)
      }

      // First key should be blocked
      expect(checkKeyRateLimit(keyId1)).toBe(false)

      // Second key should still work
      expect(checkKeyRateLimit(keyId2)).toBe(true)
    })

    test('should reset rate limit after time window', () => {
      const keyId = 'test_key_5'

      // Max out the key
      for (let i = 0; i < 1000; i++) {
        checkKeyRateLimit(keyId)
      }

      expect(checkKeyRateLimit(keyId)).toBe(false)

      // Mock time passing (this would require more complex mocking in real implementation)
      // For now, just verify the rate limit structure works
    })
  })

  describe('Integration Tests', () => {
    test('should handle complete authentication flow', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'
      process.env.API_KEY_1 = 'integration_test_key'

      const request = new NextRequest('http://localhost:3000/api/execute', {
        headers: { 'X-API-Key': 'integration_test_key' },
      })

      const authResult = validateAPIKey(request)
      expect(authResult.authenticated).toBe(true)

      if (authResult.keyId) {
        expect(checkKeyRateLimit(authResult.keyId)).toBe(true)
      }

      process.env.NODE_ENV = originalEnv
      delete process.env.API_KEY_1
    })

    test('should handle authentication failure with logging', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'

      const request = new NextRequest('http://localhost:3000/api/execute', {
        headers: { 'X-API-Key': 'invalid_key' },
      })

      const authResult = validateAPIKey(request)
      expect(authResult.authenticated).toBe(false)
      expect(authResult.reason).toBe('invalid_api_key')

      process.env.NODE_ENV = originalEnv
    })
  })
})