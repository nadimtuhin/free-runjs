import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { code, moduleType = 'esm' } = await request.json() as { code: string; moduleType?: 'esm' | 'commonjs' };

    // Redirect to the appropriate module-specific endpoint
    const response = await fetch(new URL(moduleType === 'esm' ? '/api/execute/mjs' : '/api/execute/cjs', request.url), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code }),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 400 }
    );
  }
}
