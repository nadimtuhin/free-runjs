import { NextRequest, NextResponse } from 'next/server'
import { securityLogger } from '../../../utils/security-logger'
import { validateAPIKey } from '../../../utils/auth'

export async function GET(request: NextRequest) {
  // Require authentication for security metrics
  const authResult = validateAPIKey(request)
  if (!authResult.authenticated) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  try {
    const metrics = securityLogger.getSecurityMetrics()
    const suspiciousIPs = securityLogger.getSuspiciousIPs()

    return NextResponse.json({
      metrics,
      suspicious_ips: suspiciousIPs,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to retrieve security metrics' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
