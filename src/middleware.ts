import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Simple in-memory store for rate limiting
const ipRequests = new Map<string, { count: number; resetTime: number }>()
const globalRequests = { count: 0, resetTime: Date.now() }

// Rate limit configuration
const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute
const MAX_REQUESTS_PER_IP = 60 // 60 requests per minute per IP
const MAX_GLOBAL_REQUESTS = 1000 // 1000 requests per minute globally

function getIP(request: NextRequest) {
  // Get IP from Cloudflare or other proxy headers first
  const ip = request.headers.get('cf-connecting-ip') ||
             request.headers.get('x-real-ip') ||
             request.headers.get('x-forwarded-for')?.split(',')[0] ||
             request.ip ||
             'unknown'
  return ip
}

function isRateLimited(request: NextRequest): boolean {
  const now = Date.now()
  const ip = getIP(request)

  // Reset global counter if window has passed
  if (now > globalRequests.resetTime + RATE_LIMIT_WINDOW) {
    globalRequests.count = 0
    globalRequests.resetTime = now
  }

  // Check global rate limit
  if (globalRequests.count >= MAX_GLOBAL_REQUESTS) {
    return true
  }
  globalRequests.count++

  // Get or create IP specific counter
  let ipData = ipRequests.get(ip)
  if (!ipData || now > ipData.resetTime + RATE_LIMIT_WINDOW) {
    ipData = { count: 0, resetTime: now }
    ipRequests.set(ip, ipData)
  }

  // Check IP specific rate limit
  if (ipData.count >= MAX_REQUESTS_PER_IP) {
    return true
  }
  ipData.count++

  // Clean up old entries periodically
  if (Math.random() < 0.01) { // 1% chance to clean up on each request
    const cleanupTime = now - RATE_LIMIT_WINDOW
    const entries = Array.from(ipRequests.entries())
    for (const [storedIP, data] of entries) {
      if (data.resetTime < cleanupTime) {
        ipRequests.delete(storedIP)
      }
    }
  }

  return false
}

export function middleware(request: NextRequest) {
  // Only rate limit API routes
  if (!request.nextUrl.pathname.startsWith('/api')) {
    return NextResponse.next()
  }

  // Check if rate limited
  if (isRateLimited(request)) {
    return new NextResponse(
      JSON.stringify({
        error: 'Too many requests',
        message: 'Please try again later'
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': '60'
        }
      }
    )
  }

  // Add security headers
  const response = NextResponse.next()
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('X-XSS-Protection', '1; mode=block')

  return response
}

// Configure which paths to run middleware on
export const config = {
  matcher: '/api/:path*'
}
