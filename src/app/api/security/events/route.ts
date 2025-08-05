import { NextRequest, NextResponse } from 'next/server'
import { securityLogger } from '../../../utils/security-logger'
import { validateAPIKey } from '../../../utils/auth'

export async function GET(request: NextRequest) {
  // Require authentication for security events
  const authResult = validateAPIKey(request)
  if (!authResult.authenticated) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  try {
    const url = new URL(request.url)
    const limitParam = url.searchParams.get('limit')
    const limit = limitParam ? (parseInt(limitParam) || 100) : 100
    const type = url.searchParams.get('type') as any
    const ip = url.searchParams.get('ip')
    const suspiciousIPs = url.searchParams.get('suspicious_ips') === 'true'
    const thresholdParam = url.searchParams.get('threshold')
    const threshold = thresholdParam ? (parseInt(thresholdParam) || 10) : 10

    let events
    if (type) {
      events = securityLogger.getEventsByType(type, limit)
    } else if (ip) {
      events = securityLogger.getEventsByIP(ip, limit)
    } else {
      events = securityLogger.getRecentEvents(limit)
    }

    const response: any = {
      events,
      total: events.length,
      timestamp: new Date().toISOString(),
    }

    // Add suspicious IPs if requested
    if (suspiciousIPs) {
      response.suspicious_ips = securityLogger.getSuspiciousIPs(threshold)
    }

    return NextResponse.json(response, {
      headers: {
        'cache-control': 'no-cache, no-store, must-revalidate',
      },
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to retrieve security events' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
