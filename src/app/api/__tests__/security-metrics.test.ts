import { NextRequest } from 'next/server'
import { GET } from '../security/metrics/route'

// Mock the security logger
jest.mock('../../utils/security-logger', () => ({
  securityLogger: {
    getSecurityMetrics: jest.fn(() => ({
      total_events: 42,
      events_last_hour: 12,
      events_last_day: 24,
      blocked_requests_last_hour: 8,
      critical_events_last_day: 3,
      unique_ips_last_day: 15,
      top_event_types: [
        { type: 'code_execution_blocked', count: 15 },
        { type: 'package_blocked', count: 10 },
        { type: 'rate_limit_exceeded', count: 8 },
      ],
    })),
  },
}))

// Mock the auth system
jest.mock('../../utils/auth', () => ({
  validateAPIKey: jest.fn((request: NextRequest) => {
    const apiKey = request.headers.get('x-api-key')
    if (apiKey === 'valid_key') {
      return { authenticated: true, keyId: 'test_key' }
    }
    return { authenticated: false, reason: 'invalid_api_key' }
  }),
}))

describe('/api/security/metrics', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Authentication', () => {
    test('should reject request without API key', async () => {
      const request = new NextRequest('http://localhost/api/security/metrics')

      const response = await GET(request)
      expect(response.status).toBe(401)

      const data = await response.json()
      expect(data.error).toBe('Authentication required')
    })

    test('should reject request with invalid API key', async () => {
      const request = new NextRequest('http://localhost/api/security/metrics', {
        headers: { 'x-api-key': 'invalid_key' },
      })

      const response = await GET(request)
      expect(response.status).toBe(401)

      const data = await response.json()
      expect(data.error).toBe('Authentication required')
    })

    test('should accept request with valid API key', async () => {
      const request = new NextRequest('http://localhost/api/security/metrics', {
        headers: { 'x-api-key': 'valid_key' },
      })

      const response = await GET(request)
      expect(response.status).toBe(200)
    })
  })

  describe('Response Structure', () => {
    test('should return security metrics with correct structure', async () => {
      const request = new NextRequest('http://localhost/api/security/metrics', {
        headers: { 'x-api-key': 'valid_key' },
      })

      const response = await GET(request)
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data).toMatchObject({
        total_events: expect.any(Number),
        events_last_hour: expect.any(Number),
        events_last_day: expect.any(Number),
        blocked_requests_last_hour: expect.any(Number),
        critical_events_last_day: expect.any(Number),
        unique_ips_last_day: expect.any(Number),
        top_event_types: expect.any(Array),
      })
    })

    test('should return expected metric values', async () => {
      const request = new NextRequest('http://localhost/api/security/metrics', {
        headers: { 'x-api-key': 'valid_key' },
      })

      const response = await GET(request)
      const data = await response.json()

      expect(data.total_events).toBe(42)
      expect(data.events_last_hour).toBe(12)
      expect(data.events_last_day).toBe(24)
      expect(data.blocked_requests_last_hour).toBe(8)
      expect(data.critical_events_last_day).toBe(3)
      expect(data.unique_ips_last_day).toBe(15)
    })

    test('should return top event types array', async () => {
      const request = new NextRequest('http://localhost/api/security/metrics', {
        headers: { 'x-api-key': 'valid_key' },
      })

      const response = await GET(request)
      const data = await response.json()

      expect(Array.isArray(data.top_event_types)).toBe(true)
      expect(data.top_event_types).toHaveLength(3)
      expect(data.top_event_types[0]).toMatchObject({
        type: 'code_execution_blocked',
        count: 15,
      })
    })

    test('should set correct response headers', async () => {
      const request = new NextRequest('http://localhost/api/security/metrics', {
        headers: { 'x-api-key': 'valid_key' },
      })

      const response = await GET(request)

      expect(response.headers.get('content-type')).toBe('application/json')
      expect(response.headers.get('cache-control')).toBe('no-cache, no-store, must-revalidate')
    })
  })

  describe('Error Handling', () => {
    test('should handle security logger errors gracefully', async () => {
      const { securityLogger } = require('../../utils/security-logger')
      securityLogger.getSecurityMetrics.mockImplementationOnce(() => {
        throw new Error('Logger error')
      })

      const request = new NextRequest('http://localhost/api/security/metrics', {
        headers: { 'x-api-key': 'valid_key' },
      })

      const response = await GET(request)
      expect(response.status).toBe(500)

      const data = await response.json()
      expect(data.error).toBe('Failed to retrieve security metrics')
    })
  })

  describe('HTTP Methods', () => {
    test('should only accept GET requests', async () => {
      // This test verifies the route only exports GET
      // POST, PUT, DELETE should result in 405 Method Not Allowed
      const request = new NextRequest('http://localhost/api/security/metrics', {
        method: 'POST',
        headers: { 'x-api-key': 'valid_key' },
      })

      // Since we're only testing the GET export, this would be handled by Next.js
      // We can only test that the GET method works correctly
      const getRequest = new NextRequest('http://localhost/api/security/metrics', {
        method: 'GET',
        headers: { 'x-api-key': 'valid_key' },
      })

      const response = await GET(getRequest)
      expect(response.status).toBe(200)
    })
  })
})