import { NextRequest, NextResponse } from "next/server";
import { POST as postMjs } from './mjs/route';
import { POST as postCjs } from './cjs/route';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { moduleType = 'esm' } = body as { code: string; moduleType?: 'esm' | 'commonjs' };

    // Create a new request with the same body
    const clonedRequest = new NextRequest(request.url, {
      method: request.method,
      headers: request.headers,
      body: JSON.stringify(body),
    });

    // Directly call the appropriate handler
    if (moduleType === 'esm') {
      return postMjs(clonedRequest);
    } else {
      return postCjs(clonedRequest);
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 400 }
    );
  }
}
