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
    const limit = parseInt(url.searchParams.get('limit') || '100')
    const type = url.searchParams.get('type') as any
    const ip = url.searchParams.get('ip')

    let events
    if (type) {
      events = securityLogger.getEventsByType(type, limit)
    } else if (ip) {
      events = securityLogger.getEventsByIP(ip, limit)
    } else {
      events = securityLogger.getRecentEvents(limit)
    }

    return NextResponse.json({
      events,
      total: events.length,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to retrieve security events' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
