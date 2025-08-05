import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Basic health checks
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        limit: 256, // MB as set in Docker
      },
      version: process.version,
      environment: process.env.NODE_ENV || 'development',
    }

    // Check if memory usage is within limits
    if (healthStatus.memory.used > healthStatus.memory.limit * 0.9) {
      return NextResponse.json(
        { ...healthStatus, status: 'unhealthy', reason: 'Memory usage too high' },
        { status: 503 }
      )
    }

    return NextResponse.json(healthStatus)
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    )
  }
}

// Prevent caching of health checks
export const dynamic = 'force-dynamic'
