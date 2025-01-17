import { NextResponse } from "next/server";
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, mkdir, readFile, access } from 'fs/promises';
import { join } from 'path';

const execAsync = promisify(exec);
const TEMP_DIR = join(process.cwd(), 'temp');

// Initialize temp directory and package.json
async function initTempDir() {
  await mkdir(TEMP_DIR, { recursive: true });
  const packageJsonPath = join(TEMP_DIR, 'package.json');

  try {
    await access(packageJsonPath);
  } catch {
    // Create package.json if it doesn't exist
    await writeFile(packageJsonPath, JSON.stringify({
      name: 'runjs-temp',
      version: '1.0.0',
      type: 'module',
      dependencies: {}
    }, null, 2));

    // Initialize npm
    await execAsync('npm init -y', { cwd: TEMP_DIR });
  }
}

function extractPackages(code: string): string[] {
  const packages = new Set<string>()

  // Match require statements: require('package-name') or require("package-name")
  const requireRegex = /require\(['"]([^'"@][^'"]*)['"]\)/g
  let match = requireRegex.exec(code)
  while (match) {
    packages.add(match[1].split('/')[0]) // Get base package name
    match = requireRegex.exec(code)
  }

  // Match import statements: import ... from 'package-name' or import ... from "package-name"
  const importRegex = /import\s+(?:(?:[\w*\s{},]*)\s+from\s+)?['"]([^'"@][^'"]*)['"]/g
  match = importRegex.exec(code)
  while (match) {
    packages.add(match[1].split('/')[0]) // Get base package name
    match = importRegex.exec(code)
  }

  return Array.from(packages)
}

async function getInstalledPackages(): Promise<Set<string>> {
  try {
    const packageJsonPath = join(TEMP_DIR, 'package.json');
    const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf-8'));
    return new Set(Object.keys(packageJson.dependencies || {}));
  } catch {
    return new Set();
  }
}

async function installPackages(packages: string[]): Promise<string> {
  try {
    const installedPackages = await getInstalledPackages();
    const packagesToInstall = packages.filter(pkg => !installedPackages.has(pkg));

    if (packagesToInstall.length === 0) {
      return 'All packages already installed';
    }

    const { stdout, stderr } = await execAsync(`npm install ${packagesToInstall.join(' ')}`, {
      cwd: TEMP_DIR
    });
    return stdout + stderr;
  } catch (error) {
    throw new Error(`Failed to install packages: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function executeCode(code: string): Promise<string> {
  // Determine if code uses ES modules
  const isESM = code.includes('import') || code.includes('export')

  // Prepare the code with proper module setup
  let executionCode = ''
  if (isESM) {
    executionCode = `
      import { writeFile } from 'fs/promises';
      import { join } from 'path';

      let output = '';
      const originalConsoleLog = console.log;
      console.log = (...args) => {
        output += args.map(arg =>
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(" ") + "\\n";
        process.stdout.write(output);
      };

      try {
        ${code}
      } catch (error) {
        console.log("Error:", error.message);
      }

      console.log = originalConsoleLog;
    `
  } else {
    executionCode = `
      const { writeFile } = require('fs/promises');
      const { join } = require('path');

      let output = '';
      const originalConsoleLog = console.log;
      console.log = (...args) => {
        output += args.map(arg =>
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(" ") + "\\n";
        process.stdout.write(output);
      };

      try {
        ${code}
      } catch (error) {
        console.log("Error:", error.message);
      }

      console.log = originalConsoleLog;
    `
  }

  // Write code to temporary file
  const filename = isESM ? 'temp.mjs' : 'temp.cjs'
  const filepath = join(TEMP_DIR, filename)
  await writeFile(filepath, executionCode)

  // Execute the code
  try {
    const { stdout, stderr } = await execAsync(`node ${filepath}`, {
      cwd: TEMP_DIR
    })

    if (stderr) {
      return `Error: ${stderr}`
    }

    return stdout || 'No output'
  } catch (error) {
    throw new Error(`Execution failed: ${error instanceof Error ? error.message : String(error)}`)
  }
}

// Initialize temp directory when module loads
initTempDir().catch(console.error);

export async function POST(request: Request) {
  try {
    const { code } = await request.json()

    // Extract required packages
    const packages = extractPackages(code)

    // Install packages if needed
    if (packages.length > 0) {
      const installOutput = await installPackages(packages)
      console.log('Package installation output:', installOutput)
    }

    // Execute the code
    const output = await executeCode(code)

    // Get current installed packages
    const installedPackages = Array.from(await getInstalledPackages())

    return NextResponse.json({
      output,
      installedPackages
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 400 }
    )
  }
}
