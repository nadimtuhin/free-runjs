import { GET } from '../health/route'

describe('/api/health', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('should return healthy status with correct structure', async () => {
    const response = await GET()
    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data).toMatchObject({
      status: 'healthy',
      timestamp: expect.any(String),
      uptime: expect.any(Number),
      memory: {
        used: expect.any(Number),
        total: expect.any(Number),
        limit: 256,
      },
      version: expect.any(String),
      environment: expect.any(String),
    })
  })

  test('should return valid timestamp', async () => {
    const response = await GET()
    const data = await response.json()

    const timestamp = new Date(data.timestamp)
    expect(timestamp).toBeInstanceOf(Date)
    expect(timestamp.getTime()).not.toBeNaN()
  })

  test('should return positive uptime', async () => {
    const response = await GET()
    const data = await response.json()

    expect(data.uptime).toBeGreaterThan(0)
  })

  test('should return memory usage in MB', async () => {
    const response = await GET()
    const data = await response.json()

    expect(data.memory.used).toBeGreaterThan(0)
    expect(data.memory.total).toBeGreaterThan(0)
    expect(data.memory.used).toBeLessThanOrEqual(data.memory.total)
  })

  test('should return unhealthy status when memory usage is too high', async () => {
    // Mock high memory usage
    const originalMemoryUsage = process.memoryUsage
    process.memoryUsage = jest.fn().mockReturnValue({
      heapUsed: 250 * 1024 * 1024, // 250MB (over 90% of 256MB limit)
      heapTotal: 256 * 1024 * 1024,
      external: 0,
      arrayBuffers: 0,
      rss: 256 * 1024 * 1024,
    })

    const response = await GET()
    expect(response.status).toBe(503)

    const data = await response.json()
    expect(data.status).toBe('unhealthy')
    expect(data.reason).toBe('Memory usage too high')

    process.memoryUsage = originalMemoryUsage
  })

  test('should handle errors gracefully', async () => {
    // Mock process.uptime to throw an error
    const originalUptime = process.uptime
    process.uptime = jest.fn().mockImplementation(() => {
      throw new Error('Test error')
    })

    const response = await GET()
    expect(response.status).toBe(503)

    const data = await response.json()
    expect(data.status).toBe('unhealthy')
    expect(data.error).toBe('Test error')

    process.uptime = originalUptime
  })

  test('should include Node.js version', async () => {
    const response = await GET()
    const data = await response.json()

    expect(data.version).toMatch(/^v\d+\.\d+\.\d+/)
    expect(data.version).toBe(process.version)
  })

  test('should include environment', async () => {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'test'

    const response = await GET()
    const data = await response.json()

    expect(data.environment).toBe('test')

    process.env.NODE_ENV = originalEnv
  })
})