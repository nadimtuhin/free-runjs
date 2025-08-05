interface SecurityEvent {
  type:
    | 'code_execution_blocked'
    | 'package_blocked'
    | 'rate_limit_exceeded'
    | 'invalid_request'
    | 'execution_timeout'
    | 'memory_limit_exceeded'
    | 'suspicious_activity'
    | 'authentication_failed'
  timestamp: string
  ip: string
  userAgent?: string
  details: Record<string, any>
  severity: 'low' | 'medium' | 'high' | 'critical'
  blocked: boolean
}

class SecurityLogger {
  private events: SecurityEvent[] = []
  private maxEvents = 10000

  logSecurityEvent(event: Omit<SecurityEvent, 'timestamp'>) {
    const securityEvent: SecurityEvent = {
      ...event,
      timestamp: new Date().toISOString(),
    }

    this.events.push(securityEvent)

    // Keep only recent events
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents)
    }

    // Log to console for monitoring systems
    console.warn(`🔒 SECURITY EVENT [${event.severity.toUpperCase()}]`, {
      type: event.type,
      ip: event.ip,
      blocked: event.blocked,
      details: event.details,
    })

    // In production, send to external logging service
    if (process.env.NODE_ENV === 'production') {
      this.sendToSecurityService(securityEvent)
    }
  }

  private async sendToSecurityService(event: SecurityEvent) {
    // In a real application, send to services like:
    // - Datadog, New Relic, Splunk
    // - AWS CloudWatch, Azure Monitor
    // - Custom SIEM systems

    try {
      // Example: Send to webhook or API
      if (process.env.SECURITY_WEBHOOK_URL) {
        await fetch(process.env.SECURITY_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(event),
        })
      }
    } catch (error) {
      console.error('Failed to send security event to external service:', error)
    }
  }

  getRecentEvents(limit = 100): SecurityEvent[] {
    return this.events.slice(-limit)
  }

  getEventsByType(type: SecurityEvent['type'], limit = 100): SecurityEvent[] {
    return this.events.filter(event => event.type === type).slice(-limit)
  }

  getEventsByIP(ip: string, limit = 100): SecurityEvent[] {
    return this.events.filter(event => event.ip === ip).slice(-limit)
  }

  getSuspiciousIPs(threshold = 10): Array<{ ip: string; eventCount: number; latestEvent: string }> {
    const ipCounts = new Map<string, { count: number; latest: string }>()

    this.events.forEach(event => {
      const current = ipCounts.get(event.ip) || { count: 0, latest: event.timestamp }
      ipCounts.set(event.ip, {
        count: current.count + 1,
        latest: event.timestamp > current.latest ? event.timestamp : current.latest,
      })
    })

    return Array.from(ipCounts.entries())
      .filter(([_, data]) => data.count >= threshold)
      .map(([ip, data]) => ({
        ip,
        eventCount: data.count,
        latestEvent: data.latest,
      }))
      .sort((a, b) => b.eventCount - a.eventCount)
  }

  getSecurityMetrics() {
    const now = new Date()
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    const recentEvents = this.events.filter(event => new Date(event.timestamp) > oneHourAgo)
    const dailyEvents = this.events.filter(event => new Date(event.timestamp) > oneDayAgo)

    return {
      total_events: this.events.length,
      events_last_hour: recentEvents.length,
      events_last_day: dailyEvents.length,
      blocked_requests_last_hour: recentEvents.filter(e => e.blocked).length,
      critical_events_last_day: dailyEvents.filter(e => e.severity === 'critical').length,
      unique_ips_last_day: new Set(dailyEvents.map(e => e.ip)).size,
      top_event_types: this.getTopEventTypes(dailyEvents),
    }
  }

  private getTopEventTypes(events: SecurityEvent[]) {
    const typeCounts = new Map<string, number>()
    events.forEach(event => {
      typeCounts.set(event.type, (typeCounts.get(event.type) || 0) + 1)
    })

    return Array.from(typeCounts.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([type, count]) => ({ type, count }))
  }
}

export const securityLogger = new SecurityLogger()

export function getClientIP(request: Request): string {
  // Try to get real IP from various headers
  const forwardedFor = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  const cfConnectingIP = request.headers.get('cf-connecting-ip')

  return cfConnectingIP || realIP || forwardedFor?.split(',')[0] || 'unknown'
}

export function getUserAgent(request: Request): string {
  return request.headers.get('user-agent') || 'unknown'
}
