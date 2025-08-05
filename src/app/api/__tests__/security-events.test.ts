import { NextRequest } from 'next/server'
import { GET } from '../security/events/route'

// Mock the security logger
const mockEvents = [
  {
    id: '1',
    type: 'code_execution_blocked',
    ip: '192.168.1.1',
    userAgent: 'Mozilla/5.0',
    severity: 'high',
    blocked: true,
    timestamp: new Date().toISOString(),
    details: { reason: 'dangerous_pattern' },
  },
  {
    id: '2',
    type: 'package_blocked',
    ip: '192.168.1.2',
    userAgent: 'Chrome/90.0',
    severity: 'medium',
    blocked: true,
    timestamp: new Date().toISOString(),
    details: { package: 'malicious-package' },
  },
]

jest.mock('../../utils/security-logger', () => ({
  securityLogger: {
    getRecentEvents: jest.fn((limit: number) => mockEvents.slice(0, limit)),
    getEventsByType: jest.fn((type: string) => 
      mockEvents.filter(event => event.type === type)
    ),
    getEventsByIP: jest.fn((ip: string) => 
      mockEvents.filter(event => event.ip === ip)
    ),
    getSuspiciousIPs: jest.fn((threshold: number) => [
      { ip: '192.168.1.100', eventCount: 25 },
      { ip: '192.168.1.101', eventCount: 15 },
    ]),
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

describe('/api/security/events', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Authentication', () => {
    test('should reject request without API key', async () => {
      const request = new NextRequest('http://localhost/api/security/events')

      const response = await GET(request)
      expect(response.status).toBe(401)

      const data = await response.json()
      expect(data.error).toBe('Authentication required')
    })

    test('should reject request with invalid API key', async () => {
      const request = new NextRequest('http://localhost/api/security/events', {
        headers: { 'x-api-key': 'invalid_key' },
      })

      const response = await GET(request)
      expect(response.status).toBe(401)

      const data = await response.json()
      expect(data.error).toBe('Authentication required')
    })

    test('should accept request with valid API key', async () => {
      const request = new NextRequest('http://localhost/api/security/events', {
        headers: { 'x-api-key': 'valid_key' },
      })

      const response = await GET(request)
      expect(response.status).toBe(200)
    })
  })

  describe('Query Parameters', () => {
    test('should return recent events with default limit', async () => {
      const request = new NextRequest('http://localhost/api/security/events', {
        headers: { 'x-api-key': 'valid_key' },
      })

      const response = await GET(request)
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(Array.isArray(data.events)).toBe(true)
      expect(data.events).toHaveLength(2)
    })

    test('should respect limit query parameter', async () => {
      const request = new NextRequest('http://localhost/api/security/events?limit=1', {
        headers: { 'x-api-key': 'valid_key' },
      })

      const response = await GET(request)
      const data = await response.json()

      const { securityLogger } = require('../../utils/security-logger')
      expect(securityLogger.getRecentEvents).toHaveBeenCalledWith(1)
      expect(data.events).toHaveLength(1)
    })

    test('should filter events by type', async () => {
      const request = new NextRequest('http://localhost/api/security/events?type=code_execution_blocked', {
        headers: { 'x-api-key': 'valid_key' },
      })

      const response = await GET(request)
      const data = await response.json()

      const { securityLogger } = require('../../utils/security-logger')
      expect(securityLogger.getEventsByType).toHaveBeenCalledWith('code_execution_blocked', 100)
      expect(data.events.every((event: any) => event.type === 'code_execution_blocked')).toBe(true)
    })

    test('should filter events by IP address', async () => {
      const request = new NextRequest('http://localhost/api/security/events?ip=192.168.1.1', {
        headers: { 'x-api-key': 'valid_key' },
      })

      const response = await GET(request)
      const data = await response.json()

      const { securityLogger } = require('../../utils/security-logger')
      expect(securityLogger.getEventsByIP).toHaveBeenCalledWith('192.168.1.1', 100)
      expect(data.events.every((event: any) => event.ip === '192.168.1.1')).toBe(true)
    })

    test('should return suspicious IPs when requested', async () => {
      const request = new NextRequest('http://localhost/api/security/events?suspicious_ips=true', {
        headers: { 'x-api-key': 'valid_key' },
      })

      const response = await GET(request)
      const data = await response.json()

      expect(data.suspicious_ips).toBeDefined()
      expect(Array.isArray(data.suspicious_ips)).toBe(true)
      expect(data.suspicious_ips).toHaveLength(2)
      expect(data.suspicious_ips[0]).toMatchObject({
        ip: '192.168.1.100',
        eventCount: 25,
      })
    })

    test('should handle custom suspicious IPs threshold', async () => {
      const request = new NextRequest('http://localhost/api/security/events?suspicious_ips=true&threshold=20', {
        headers: { 'x-api-key': 'valid_key' },
      })

      const response = await GET(request)
      await response.json()

      const { securityLogger } = require('../../utils/security-logger')
      expect(securityLogger.getSuspiciousIPs).toHaveBeenCalledWith(20)
    })

    test('should handle invalid limit parameter', async () => {
      const request = new NextRequest('http://localhost/api/security/events?limit=invalid', {
        headers: { 'x-api-key': 'valid_key' },
      })

      const response = await GET(request)
      const data = await response.json()

      // Should fall back to default behavior
      const { securityLogger } = require('../../utils/security-logger')
      expect(securityLogger.getRecentEvents).toHaveBeenCalledWith(100) // default limit
    })

    test('should handle invalid threshold parameter', async () => {
      const request = new NextRequest('http://localhost/api/security/events?suspicious_ips=true&threshold=invalid', {
        headers: { 'x-api-key': 'valid_key' },
      })

      const response = await GET(request)
      await response.json()

      const { securityLogger } = require('../../utils/security-logger')
      expect(securityLogger.getSuspiciousIPs).toHaveBeenCalledWith(10) // default threshold
    })
  })

  describe('Response Structure', () => {
    test('should return events with correct structure', async () => {
      const request = new NextRequest('http://localhost/api/security/events', {
        headers: { 'x-api-key': 'valid_key' },
      })

      const response = await GET(request)
      const data = await response.json()

      expect(data.events).toBeDefined()
      expect(Array.isArray(data.events)).toBe(true)
      
      if (data.events.length > 0) {
        const event = data.events[0]
        expect(event).toMatchObject({
          type: expect.any(String),
          ip: expect.any(String),
          severity: expect.any(String),
          blocked: expect.any(Boolean),
          timestamp: expect.any(String),
          details: expect.any(Object),
        })
      }
    })

    test('should set correct response headers', async () => {
      const request = new NextRequest('http://localhost/api/security/events', {
        headers: { 'x-api-key': 'valid_key' },
      })

      const response = await GET(request)

      expect(response.headers.get('content-type')).toBe('application/json')
      expect(response.headers.get('cache-control')).toBe('no-cache, no-store, must-revalidate')
    })
  })

  describe('Edge Cases', () => {
    test('should handle empty events list', async () => {
      const { securityLogger } = require('../../utils/security-logger')
      securityLogger.getRecentEvents.mockReturnValueOnce([])

      const request = new NextRequest('http://localhost/api/security/events', {
        headers: { 'x-api-key': 'valid_key' },
      })

      const response = await GET(request)
      const data = await response.json()

      expect(data.events).toEqual([])
    })

    test('should handle very large limit parameter', async () => {
      const request = new NextRequest('http://localhost/api/security/events?limit=999999', {
        headers: { 'x-api-key': 'valid_key' },
      })

      const response = await GET(request)
      expect(response.status).toBe(200)

      const { securityLogger } = require('../../utils/security-logger')
      expect(securityLogger.getRecentEvents).toHaveBeenCalledWith(999999)
    })

    test('should handle multiple query parameters', async () => {
      const request = new NextRequest('http://localhost/api/security/events?limit=5&suspicious_ips=true&threshold=15', {
        headers: { 'x-api-key': 'valid_key' },
      })

      const response = await GET(request)
      const data = await response.json()

      expect(data.events).toBeDefined()
      expect(data.suspicious_ips).toBeDefined()
    })
  })

  describe('Error Handling', () => {
    test('should handle security logger errors gracefully', async () => {
      const { securityLogger } = require('../../utils/security-logger')
      securityLogger.getRecentEvents.mockImplementationOnce(() => {
        throw new Error('Logger error')
      })

      const request = new NextRequest('http://localhost/api/security/events', {
        headers: { 'x-api-key': 'valid_key' },
      })

      const response = await GET(request)
      expect(response.status).toBe(500)

      const data = await response.json()
      expect(data.error).toBe('Failed to retrieve security events')
    })
  })
})