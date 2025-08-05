import { NextRequest } from 'next/server'
import { POST } from '../execute/route'

// Mock the child route modules
jest.mock('../execute/mjs/route', () => ({
  POST: jest.fn().mockResolvedValue(
    new Response(JSON.stringify({ output: 'ESM output', moduleType: 'esm' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  ),
}))

jest.mock('../execute/cjs/route', () => ({
  POST: jest.fn().mockResolvedValue(
    new Response(JSON.stringify({ output: 'CJS output', moduleType: 'commonjs' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  ),
}))

describe('/api/execute', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Input Validation', () => {
    test('should reject request with missing code', async () => {
      const request = new NextRequest('http://localhost/api/execute', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data.error).toContain('Code must be a string')
    })

    test('should reject request with empty code', async () => {
      const request = new NextRequest('http://localhost/api/execute', {
        method: 'POST',
        body: JSON.stringify({ code: '' }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data.error).toContain('Code cannot be empty')
    })

    test('should reject request with non-string code', async () => {
      const request = new NextRequest('http://localhost/api/execute', {
        method: 'POST',
        body: JSON.stringify({ code: 123 }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data.error).toContain('Code must be a string')
    })

    test('should reject request with code too long', async () => {
      const longCode = 'console.log("x");'.repeat(5000) // > 50KB

      const request = new NextRequest('http://localhost/api/execute', {
        method: 'POST',
        body: JSON.stringify({ code: longCode }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data.error).toContain('Code is too long')
    })

    test('should reject request with invalid moduleType', async () => {
      const request = new NextRequest('http://localhost/api/execute', {
        method: 'POST',
        body: JSON.stringify({ code: 'console.log("test")', moduleType: 'invalid' }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data.error).toContain('moduleType must be either')
    })

    test('should reject request with invalid JSON body', async () => {
      const request = new NextRequest('http://localhost/api/execute', {
        method: 'POST',
        body: 'invalid json',
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data.error).toBeDefined()
    })

    test('should reject request with non-object body', async () => {
      const request = new NextRequest('http://localhost/api/execute', {
        method: 'POST',
        body: JSON.stringify('string instead of object'),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data.error).toContain('Request body must be a valid JSON object')
    })
  })

  describe('Module Type Routing', () => {
    test('should route to ESM handler for esm moduleType', async () => {
      const { POST: mjsPost } = require('../execute/mjs/route')

      const request = new NextRequest('http://localhost/api/execute', {
        method: 'POST',
        body: JSON.stringify({ code: 'console.log("test")', moduleType: 'esm' }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      expect(response.status).toBe(200)

      expect(mjsPost).toHaveBeenCalled()
    })

    test('should route to CommonJS handler for commonjs moduleType', async () => {
      const { POST: cjsPost } = require('../execute/cjs/route')

      const request = new NextRequest('http://localhost/api/execute', {
        method: 'POST',
        body: JSON.stringify({ code: 'console.log("test")', moduleType: 'commonjs' }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      expect(response.status).toBe(200)

      expect(cjsPost).toHaveBeenCalled()
    })

    test('should default to ESM when moduleType is not specified', async () => {
      const { POST: mjsPost } = require('../execute/mjs/route')

      const request = new NextRequest('http://localhost/api/execute', {
        method: 'POST',
        body: JSON.stringify({ code: 'console.log("test")' }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      expect(response.status).toBe(200)

      expect(mjsPost).toHaveBeenCalled()
    })
  })

  describe('Request Cloning', () => {
    test('should pass validated body to child handler', async () => {
      const { POST: mjsPost } = require('../execute/mjs/route')

      const request = new NextRequest('http://localhost/api/execute', {
        method: 'POST',
        body: JSON.stringify({ code: 'console.log("test")', moduleType: 'esm', extra: 'field' }),
        headers: { 'Content-Type': 'application/json' },
      })

      await POST(request)

      expect(mjsPost).toHaveBeenCalledWith(expect.any(NextRequest))
      
      // Verify the cloned request has the correct body
      const clonedRequest = mjsPost.mock.calls[0][0]
      expect(clonedRequest).toBeInstanceOf(NextRequest)
    })

    test('should preserve request headers and method', async () => {
      const { POST: mjsPost } = require('../execute/mjs/route')

      const request = new NextRequest('http://localhost/api/execute', {
        method: 'POST',
        body: JSON.stringify({ code: 'console.log("test")' }),
        headers: { 
          'Content-Type': 'application/json',
          'X-Custom-Header': 'test-value',
        },
      })

      await POST(request)

      const clonedRequest = mjsPost.mock.calls[0][0]
      expect(clonedRequest.method).toBe('POST')
      expect(clonedRequest.headers.get('Content-Type')).toBe('application/json')
      expect(clonedRequest.headers.get('X-Custom-Header')).toBe('test-value')
    })
  })

  describe('Response Handling', () => {
    test('should return response from child handler', async () => {
      const request = new NextRequest('http://localhost/api/execute', {
        method: 'POST',
        body: JSON.stringify({ code: 'console.log("test")', moduleType: 'esm' }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.output).toBe('ESM output')
      expect(data.moduleType).toBe('esm')
    })

    test('should handle child handler errors', async () => {
      const { POST: mjsPost } = require('../execute/mjs/route')
      mjsPost.mockRejectedValueOnce(new Error('Child handler error'))

      const request = new NextRequest('http://localhost/api/execute', {
        method: 'POST',
        body: JSON.stringify({ code: 'console.log("test")', moduleType: 'esm' }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data.error).toContain('Child handler error')
    })
  })

  describe('Edge Cases', () => {
    test('should handle very small valid code', async () => {
      const request = new NextRequest('http://localhost/api/execute', {
        method: 'POST',
        body: JSON.stringify({ code: '1' }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      expect(response.status).toBe(200)
    })

    test('should handle code at maximum size limit', async () => {
      const maxCode = 'x'.repeat(50000) // Exactly 50KB

      const request = new NextRequest('http://localhost/api/execute', {
        method: 'POST',
        body: JSON.stringify({ code: maxCode }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      expect(response.status).toBe(200)
    })

    test('should handle unicode characters in code', async () => {
      const unicodeCode = 'console.log("🚀 Hello 世界");'

      const request = new NextRequest('http://localhost/api/execute', {
        method: 'POST',
        body: JSON.stringify({ code: unicodeCode }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      expect(response.status).toBe(200)
    })

    test('should handle code with special characters', async () => {
      const specialCode = 'console.log("Quotes: \\"test\\" and \\\'test\\\' and newlines: \\n\\r");'

      const request = new NextRequest('http://localhost/api/execute', {
        method: 'POST',
        body: JSON.stringify({ code: specialCode }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      expect(response.status).toBe(200)
    })
  })
})