import { NextRequest, NextResponse } from "next/server";
import { POST as postMjs } from './mjs/route';
import { POST as postCjs } from './cjs/route';

export async function POST(request: NextRequest) {
  try {
    const { code, moduleType = 'esm' } = await request.json() as { code: string; moduleType?: 'esm' | 'commonjs' };

    // Directly call the appropriate handler
    if (moduleType === 'esm') {
      return postMjs(request);
    } else {
      return postCjs(request);
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 400 }
    );
  }
}
