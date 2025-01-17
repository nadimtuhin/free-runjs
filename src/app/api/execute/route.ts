import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { code } = await request.json();

    // Create a new Function to execute the code in a sandbox
    const sandbox = new Function(code);

    // Capture console.log output
    let output = "";
    const originalConsoleLog = console.log;
    console.log = (...args) => {
      output += args.map(arg =>
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(" ") + "\n";
    };

    // Execute the code
    sandbox();

    // Restore original console.log
    console.log = originalConsoleLog;

    return NextResponse.json({ output });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 400 }
    );
  }
}
