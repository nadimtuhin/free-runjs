import { securityLogger, getClientIP, getUserAgent } from '../security-logger'

// Mock fetch for external webhook testing
global.fetch = jest.fn()

describe('Security Logger', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Clear any existing events
    securityLogger['events'] = []
  })

  describe('logSecurityEvent', () => {
    test('should log security event with timestamp', () => {
      const event = {
        type: 'code_execution_blocked' as const,
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        severity: 'high' as const,
        blocked: true,
        details: { reason: 'dangerous_pattern' },
      }

      securityLogger.logSecurityEvent(event)

      const events = securityLogger.getRecentEvents(1)
      expect(events).toHaveLength(1)
      expect(events[0]).toMatchObject(event)
      expect(events[0].timestamp).toBeDefined()
      expect(new Date(events[0].timestamp)).toBeInstanceOf(Date)
    })

    test('should log different types of security events', () => {
      const events = [
        {
          type: 'code_execution_blocked' as const,
          ip: '192.168.1.1',
          severity: 'high' as const,
          blocked: true,
          details: {},
        },
        {
          type: 'package_blocked' as const,
          ip: '192.168.1.2',
          severity: 'medium' as const,
          blocked: true,
          details: {},
        },
        {
          type: 'rate_limit_exceeded' as const,
          ip: '192.168.1.3',
          severity: 'low' as const,
          blocked: true,
          details: {},
        },
      ]

      events.forEach(event => securityLogger.logSecurityEvent(event))

      const recentEvents = securityLogger.getRecentEvents(10)
      expect(recentEvents).toHaveLength(3)
      expect(recentEvents.map(e => e.type)).toEqual([
        'code_execution_blocked',
        'package_blocked',
        'rate_limit_exceeded',
      ])
    })

    test('should limit number of stored events', () => {
      // Set a lower limit for testing
      securityLogger['maxEvents'] = 5

      // Log more events than the limit
      for (let i = 0; i < 10; i++) {
        securityLogger.logSecurityEvent({
          type: 'invalid_request',
          ip: `192.168.1.${i}`,
          severity: 'low',
          blocked: false,
          details: { index: i },
        })
      }

      const events = securityLogger.getRecentEvents(20)
      expect(events).toHaveLength(5) // Should only keep the last 5

      // Reset to original limit
      securityLogger['maxEvents'] = 10000
    })

    test('should call external webhook in production', async () => {
      const originalEnv = process.env.NODE_ENV
      const originalWebhook = process.env.SECURITY_WEBHOOK_URL

      process.env.NODE_ENV = 'production'
      process.env.SECURITY_WEBHOOK_URL = 'https://example.com/webhook'

      const mockFetch = fetch as jest.MockedFunction<typeof fetch>
      mockFetch.mockResolvedValueOnce(new Response('ok'))

      securityLogger.logSecurityEvent({
        type: 'authentication_failed',
        ip: '192.168.1.1',
        severity: 'high',
        blocked: true,
        details: {},
      })

      // Wait for async webhook call
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(mockFetch).toHaveBeenCalledWith(
        'https://example.com/webhook',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('authentication_failed'),
        })
      )

      process.env.NODE_ENV = originalEnv
      process.env.SECURITY_WEBHOOK_URL = originalWebhook
    })
  })

  describe('getRecentEvents', () => {
    test('should return limited number of events', () => {
      // Log multiple events
      for (let i = 0; i < 10; i++) {
        securityLogger.logSecurityEvent({
          type: 'invalid_request',
          ip: `192.168.1.${i}`,
          severity: 'low',
          blocked: false,
          details: { index: i },
        })
      }

      const events = securityLogger.getRecentEvents(5)
      expect(events).toHaveLength(5)

      // Should return the most recent events
      expect(events[4].details.index).toBe(9)
      expect(events[0].details.index).toBe(5)
    })

    test('should return all events if limit exceeds total', () => {
      securityLogger.logSecurityEvent({
        type: 'invalid_request',
        ip: '192.168.1.1',
        severity: 'low',
        blocked: false,
        details: {},
      })

      const events = securityLogger.getRecentEvents(100)
      expect(events).toHaveLength(1)
    })
  })

  describe('getEventsByType', () => {
    test('should filter events by type', () => {
      const events = [
        { type: 'code_execution_blocked' as const, ip: '1.1.1.1', severity: 'high' as const, blocked: true, details: {} },
        { type: 'rate_limit_exceeded' as const, ip: '1.1.1.2', severity: 'medium' as const, blocked: true, details: {} },
        { type: 'code_execution_blocked' as const, ip: '1.1.1.3', severity: 'high' as const, blocked: true, details: {} },
      ]

      events.forEach(event => securityLogger.logSecurityEvent(event))

      const blockedEvents = securityLogger.getEventsByType('code_execution_blocked')
      expect(blockedEvents).toHaveLength(2)
      expect(blockedEvents.every(e => e.type === 'code_execution_blocked')).toBe(true)

      const rateLimitEvents = securityLogger.getEventsByType('rate_limit_exceeded')
      expect(rateLimitEvents).toHaveLength(1)
    })
  })

  describe('getEventsByIP', () => {
    test('should filter events by IP address', () => {
      const events = [
        { type: 'invalid_request' as const, ip: '192.168.1.1', severity: 'low' as const, blocked: false, details: {} },
        { type: 'invalid_request' as const, ip: '192.168.1.2', severity: 'low' as const, blocked: false, details: {} },
        { type: 'code_execution_blocked' as const, ip: '192.168.1.1', severity: 'high' as const, blocked: true, details: {} },
      ]

      events.forEach(event => securityLogger.logSecurityEvent(event))

      const ip1Events = securityLogger.getEventsByIP('192.168.1.1')
      expect(ip1Events).toHaveLength(2)
      expect(ip1Events.every(e => e.ip === '192.168.1.1')).toBe(true)

      const ip2Events = securityLogger.getEventsByIP('192.168.1.2')
      expect(ip2Events).toHaveLength(1)
    })
  })

  describe('getSuspiciousIPs', () => {
    test('should identify IPs with many events', () => {
      // Log many events from one IP
      for (let i = 0; i < 15; i++) {
        securityLogger.logSecurityEvent({
          type: 'invalid_request',
          ip: '192.168.1.100',
          severity: 'low',
          blocked: false,
          details: {},
        })
      }

      // Log few events from another IP
      for (let i = 0; i < 3; i++) {
        securityLogger.logSecurityEvent({
          type: 'invalid_request',
          ip: '192.168.1.101',
          severity: 'low',
          blocked: false,
          details: {},
        })
      }

      const suspiciousIPs = securityLogger.getSuspiciousIPs(10)
      expect(suspiciousIPs).toHaveLength(1)
      expect(suspiciousIPs[0].ip).toBe('192.168.1.100')
      expect(suspiciousIPs[0].eventCount).toBe(15)
    })

    test('should return IPs sorted by event count', () => {
      // Log different amounts from different IPs
      const ipCounts = [
        { ip: '192.168.1.1', count: 20 },
        { ip: '192.168.1.2', count: 15 },
        { ip: '192.168.1.3', count: 25 },
      ]

      ipCounts.forEach(({ ip, count }) => {
        for (let i = 0; i < count; i++) {
          securityLogger.logSecurityEvent({
            type: 'invalid_request',
            ip,
            severity: 'low',
            blocked: false,
            details: {},
          })
        }
      })

      const suspiciousIPs = securityLogger.getSuspiciousIPs(10)
      expect(suspiciousIPs).toHaveLength(3)
      expect(suspiciousIPs[0].ip).toBe('192.168.1.3') // Highest count first
      expect(suspiciousIPs[1].ip).toBe('192.168.1.1')
      expect(suspiciousIPs[2].ip).toBe('192.168.1.2')
    })
  })

  describe('getSecurityMetrics', () => {
    test('should calculate metrics correctly', () => {
      // Log events with different timestamps (mocking time)
      const now = Date.now()
      const oneHourAgo = now - (60 * 60 * 1000)
      const oneDayAgo = now - (24 * 60 * 60 * 1000)

      // Recent events (within last hour)
      for (let i = 0; i < 5; i++) {
        securityLogger.logSecurityEvent({
          type: 'code_execution_blocked',
          ip: `192.168.1.${i}`,
          severity: 'high',
          blocked: true,
          details: {},
        })
      }

      const metrics = securityLogger.getSecurityMetrics()

      expect(metrics.total_events).toBe(5)
      expect(metrics.events_last_hour).toBeGreaterThanOrEqual(0)
      expect(metrics.events_last_day).toBeGreaterThanOrEqual(0)
      expect(metrics.blocked_requests_last_hour).toBeGreaterThanOrEqual(0)
      expect(metrics.unique_ips_last_day).toBeGreaterThanOrEqual(0)
      expect(Array.isArray(metrics.top_event_types)).toBe(true)
    })

    test('should handle empty event log', () => {
      const metrics = securityLogger.getSecurityMetrics()

      expect(metrics.total_events).toBe(0)
      expect(metrics.events_last_hour).toBe(0)
      expect(metrics.events_last_day).toBe(0)
      expect(metrics.blocked_requests_last_hour).toBe(0)
      expect(metrics.critical_events_last_day).toBe(0)
      expect(metrics.unique_ips_last_day).toBe(0)
      expect(metrics.top_event_types).toEqual([])
    })
  })

  describe('Utility Functions', () => {
    describe('getClientIP', () => {
      test('should extract IP from Cloudflare header', () => {
        const request = new Request('http://localhost', {
          headers: { 'cf-connecting-ip': '203.0.113.1' },
        })

        const ip = getClientIP(request)
        expect(ip).toBe('203.0.113.1')
      })

      test('should extract IP from x-real-ip header', () => {
        const request = new Request('http://localhost', {
          headers: { 'x-real-ip': '203.0.113.2' },
        })

        const ip = getClientIP(request)
        expect(ip).toBe('203.0.113.2')
      })

      test('should extract IP from x-forwarded-for header', () => {
        const request = new Request('http://localhost', {
          headers: { 'x-forwarded-for': '203.0.113.3, 203.0.113.4' },
        })

        const ip = getClientIP(request)
        expect(ip).toBe('203.0.113.3') // Should get first IP
      })

      test('should return unknown when no IP headers present', () => {
        const request = new Request('http://localhost')

        const ip = getClientIP(request)
        expect(ip).toBe('unknown')
      })

      test('should prioritize headers correctly', () => {
        const request = new Request('http://localhost', {
          headers: {
            'cf-connecting-ip': '203.0.113.1',
            'x-real-ip': '203.0.113.2',
            'x-forwarded-for': '203.0.113.3',
          },
        })

        const ip = getClientIP(request)
        expect(ip).toBe('203.0.113.1') // Cloudflare should have priority
      })
    })

    describe('getUserAgent', () => {
      test('should extract user agent from header', () => {
        const request = new Request('http://localhost', {
          headers: { 'user-agent': 'Mozilla/5.0 (Test Browser)' },
        })

        const userAgent = getUserAgent(request)
        expect(userAgent).toBe('Mozilla/5.0 (Test Browser)')
      })

      test('should return unknown when no user agent header', () => {
        const request = new Request('http://localhost')

        const userAgent = getUserAgent(request)
        expect(userAgent).toBe('unknown')
      })
    })
  })
})