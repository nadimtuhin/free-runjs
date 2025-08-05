import { NextRequest, NextResponse } from 'next/server'
import { POST as postMjs } from './mjs/route'
import { POST as postCjs } from './cjs/route'

interface ExecuteRequest {
  code: string
  moduleType?: 'esm' | 'commonjs'
}

function validateExecuteRequest(body: any): ExecuteRequest {
  if (!body || typeof body !== 'object') {
    throw new Error('Request body must be a valid JSON object')
  }

  if (typeof body.code !== 'string') {
    throw new Error('Code must be a string')
  }

  if (body.code.length === 0) {
    throw new Error('Code cannot be empty')
  }

  if (body.code.length > 50000) {
    throw new Error('Code is too long (max 50KB)')
  }

  const { code, moduleType = 'esm' } = body

  if (moduleType && !['esm', 'commonjs'].includes(moduleType)) {
    throw new Error('moduleType must be either "esm" or "commonjs"')
  }

  return { code, moduleType }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedBody = validateExecuteRequest(body)

    // Create a new request with the validated body
    const clonedRequest = new NextRequest(request.url, {
      method: request.method,
      headers: request.headers,
      body: JSON.stringify(validatedBody),
    })

    // Directly call the appropriate handler
    if (validatedBody.moduleType === 'esm') {
      return postMjs(clonedRequest)
    } else {
      return postCjs(clonedRequest)
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 400 }
    )
  }
}
