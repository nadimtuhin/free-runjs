import { NextResponse } from "next/server";
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, mkdir, readFile, access } from 'fs/promises';
import { join } from 'path';

const execAsync = promisify(exec);
const BASE_TEMP_DIR = join(process.cwd(), 'temp');

type ModuleType = 'esm' | 'commonjs';

function getTempDir(moduleType: ModuleType): string {
  return join(BASE_TEMP_DIR, moduleType);
}

// Initialize temp directory and package.json
async function initTempDir(moduleType: ModuleType) {
  const tempDir = getTempDir(moduleType);
  await mkdir(tempDir, { recursive: true });
  const packageJsonPath = join(tempDir, 'package.json');

  try {
    await access(packageJsonPath);
    // Update package.json type if needed
    const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf-8'));
    if (moduleType === 'esm' && packageJson.type !== 'module') {
      packageJson.type = 'module';
      await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
    } else if (moduleType === 'commonjs' && packageJson.type === 'module') {
      delete packageJson.type;
      await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
    }
  } catch {
    // Create package.json if it doesn't exist
    await writeFile(packageJsonPath, JSON.stringify({
      name: `runjs-temp-${moduleType}`,
      version: '1.0.0',
      ...(moduleType === 'esm' ? { type: 'module' } : {}),
      dependencies: {}
    }, null, 2));

    // Initialize npm
    await execAsync('npm init -y', { cwd: tempDir });
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

async function getInstalledPackages(moduleType: ModuleType): Promise<Set<string>> {
  try {
    const packageJsonPath = join(getTempDir(moduleType), 'package.json');
    const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf-8'));
    return new Set(Object.keys(packageJson.dependencies || {}));
  } catch {
    return new Set();
  }
}

async function installPackages(packages: string[], moduleType: ModuleType): Promise<string> {
  try {
    const installedPackages = await getInstalledPackages(moduleType);
    const packagesToInstall = packages.filter(pkg => !installedPackages.has(pkg));

    if (packagesToInstall.length === 0) {
      return 'All packages already installed';
    }

    const { stdout, stderr } = await execAsync(`npm install ${packagesToInstall.join(' ')}`, {
      cwd: getTempDir(moduleType)
    });
    return stdout + stderr;
  } catch (error) {
    throw new Error(`Failed to install packages: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function executeCode(code: string, moduleType: ModuleType): Promise<string> {
  const tempDir = getTempDir(moduleType);

  // Create separate files for module setup and user code
  const setupFilename = moduleType === 'esm' ? 'setup.mjs' : 'setup.cjs';
  const codeFilename = moduleType === 'esm' ? 'code.mjs' : 'code.cjs';

  // Write user code to a separate file
  const codePath = join(tempDir, codeFilename);
  await writeFile(codePath, code);

  // Prepare the setup code that will execute the user's code
  let setupCode = '';
  if (moduleType === 'esm') {
    setupCode = `
      import { fileURLToPath } from 'url';
      import { dirname, join } from 'path';

      const __filename = fileURLToPath(import.meta.url);
      const __dirname = dirname(__filename);

      let output = '';
      const originalConsoleLog = console.log;
      console.log = (...args) => {
        output += args.map(arg =>
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(" ") + "\\n";
      };

      try {
        await import('./${codeFilename}');
      } catch (error) {
        console.log("Error:", error.message);
      }

      console.log = originalConsoleLog;
      process.stdout.write(output);
    `;
  } else {
    setupCode = `
      const path = require('path');

      let output = '';
      const originalConsoleLog = console.log;
      console.log = (...args) => {
        output += args.map(arg =>
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(" ") + "\\n";
      };

      try {
        require('./${codeFilename}');
      } catch (error) {
        console.log("Error:", error.message);
      }

      console.log = originalConsoleLog;
      process.stdout.write(output);
    `;
  }

  // Write setup code
  const setupPath = join(tempDir, setupFilename);
  await writeFile(setupPath, setupCode);

  // Execute the code
  try {
    const { stdout, stderr } = await execAsync(`node ${setupPath}`, {
      cwd: tempDir,
      env: {
        ...process.env,
        NODE_PATH: join(tempDir, 'node_modules')
      }
    });

    if (stderr && !stderr.includes('ExperimentalWarning')) {
      return `Error: ${stderr}`;
    }

    return stdout || 'No output';
  } catch (error) {
    throw new Error(`Execution failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function POST(request: Request) {
  try {
    const { code, moduleType = 'esm' } = await request.json() as { code: string; moduleType?: ModuleType }

    // Initialize temp directory with correct module type
    await initTempDir(moduleType)

    // Extract required packages
    const packages = extractPackages(code)

    // Install packages if needed
    if (packages.length > 0) {
      const installOutput = await installPackages(packages, moduleType)
      console.log('Package installation output:', installOutput)
    }

    // Execute the code
    const output = await executeCode(code, moduleType)

    // Get current installed packages
    const installedPackages = Array.from(await getInstalledPackages(moduleType))

    return NextResponse.json({
      output,
      installedPackages,
      moduleType
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 400 }
    )
  }
}
