import { NextResponse } from "next/server";
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, mkdir, readFile, access } from 'fs/promises';
import { join } from 'path';

const execAsync = promisify(exec);
const BASE_TEMP_DIR = join(process.cwd(), 'temp');

// Store debug logs
const debugLogs: string[] = [];
const originalDebug = console.debug;
const originalError = console.error;

// Override console.debug and console.error to collect logs
console.debug = (...args: any[]) => {
  const log = args.map(arg =>
    typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
  ).join(' ');
  debugLogs.push(log);
  originalDebug.apply(console, args);
};

console.error = (...args: any[]) => {
  const log = args.map(arg =>
    typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
  ).join(' ');
  debugLogs.push(`ERROR: ${log}`);
  originalError.apply(console, args);
};

function getTempDir(): string {
  const dir = join(BASE_TEMP_DIR, 'cjs');
  console.debug('[getTempDir] Using directory:', dir);
  return dir;
}

// Initialize temp directory and package.json
async function initTempDir() {
  console.debug('[initTempDir] Starting initialization');
  const tempDir = getTempDir();
  await mkdir(tempDir, { recursive: true });
  console.debug('[initTempDir] Created directory:', tempDir);

  const packageJsonPath = join(tempDir, 'package.json');
  console.debug('[initTempDir] Package.json path:', packageJsonPath);

  interface PackageJson {
    name: string;
    version: string;
    private: boolean;
    type?: 'module';
    dependencies: Record<string, string>;
  }

  // Create setup files for CommonJS
  const setupCjsPath = join(tempDir, 'setup.cjs');
  console.debug('[initTempDir] Creating setup file at:', setupCjsPath);

  const setupCjsContent = `
    const path = require('path');
    const module = require('module');

    // Create a require function that resolves from our temp directory
    const createRequire = module.createRequire;
    const require = createRequire(path.join(process.cwd(), 'temp/cjs/package.json'));

    module.exports = { require };
  `;
  await writeFile(setupCjsPath, setupCjsContent);
  console.debug('[initTempDir] Setup file created');

  try {
    await access(packageJsonPath);
    console.debug('[initTempDir] Existing package.json found');

    // Update package.json if needed
    const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf-8')) as PackageJson;
    if (packageJson.type === 'module') {
      console.debug('[initTempDir] Converting from ESM to CommonJS');
      delete packageJson.type;
      await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));

      // Reinstall packages to ensure they're compatible
      if (Object.keys(packageJson.dependencies || {}).length > 0) {
        const deps = Object.keys(packageJson.dependencies).join(' ');
        console.debug('[initTempDir] Reinstalling dependencies:', deps);
        await execAsync(`npm install ${deps}`, { cwd: tempDir });
      }
    }
  } catch {
    console.debug('[initTempDir] No package.json found, creating new one');
    // Initialize npm first
    await execAsync('npm init -y', { cwd: tempDir });

    // Then modify the generated package.json
    const packageJson: PackageJson = {
      name: 'runjs-temp-cjs',
      version: '1.0.0',
      private: true,
      dependencies: {}
    };

    await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.debug('[initTempDir] Created new package.json');
  }
  console.debug('[initTempDir] Initialization complete');
}

function extractPackages(code: string): string[] {
  console.debug('[extractPackages] Analyzing code for package dependencies');
  const packages = new Set<string>();

  // Match require statements: require('package-name') or require("package-name")
  const requireRegex = /require\(['"]([^'"@][^'"]*)['"]\)/g;
  let match = requireRegex.exec(code);
  while (match) {
    packages.add(match[1].split('/')[0]); // Get base package name
    match = requireRegex.exec(code);
  }

  console.debug('[extractPackages] Found packages:', Array.from(packages));
  return Array.from(packages);
}

async function getInstalledPackages(): Promise<Set<string>> {
  console.debug('[getInstalledPackages] Reading installed packages');
  try {
    const packageJsonPath = join(getTempDir(), 'package.json');
    const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf-8'));
    const packages = new Set(Object.keys(packageJson.dependencies || {}));
    console.debug('[getInstalledPackages] Found packages:', Array.from(packages));
    return packages;
  } catch {
    console.debug('[getInstalledPackages] No packages found');
    return new Set();
  }
}

async function installPackages(packages: string[]): Promise<string> {
  console.debug('[installPackages] Starting package installation:', packages);
  try {
    const installedPackages = await getInstalledPackages();
    const packagesToInstall = packages.filter(pkg => !installedPackages.has(pkg));

    if (packagesToInstall.length === 0) {
      console.debug('[installPackages] All packages already installed');
      return 'All packages already installed';
    }

    console.debug('[installPackages] Installing packages:', packagesToInstall);
    const { stdout, stderr } = await execAsync(`npm install ${packagesToInstall.join(' ')}`, {
      cwd: getTempDir()
    });
    console.debug('[installPackages] Installation complete');
    return stdout + stderr;
  } catch (error) {
    console.error('[installPackages] Installation failed:', error);
    throw new Error(`Failed to install packages: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function executeCode(code: string): Promise<string> {
  console.debug('[executeCode] Starting code execution');
  const tempDir = getTempDir();
  const codeFilename = 'code.cjs';
  const setupFilename = 'setup.cjs';

  // Write user code to a separate file
  const codePath = join(tempDir, codeFilename);
  console.debug('[executeCode] Writing code to:', codePath);
  await writeFile(codePath, code);

  // Prepare the setup code that will execute the user's code
  const setupCode = `
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

  // Write setup code
  const setupPath = join(tempDir, setupFilename);
  console.debug('[executeCode] Writing setup code to:', setupPath);
  await writeFile(setupPath, setupCode);

  // Execute the code
  try {
    console.debug('[executeCode] Executing code with Node.js');
    const { stdout, stderr } = await execAsync(`node ${setupPath}`, {
      cwd: tempDir,
      env: {
        ...process.env,
        NODE_PATH: join(tempDir, 'node_modules')
      }
    });

    if (stderr && !stderr.includes('ExperimentalWarning')) {
      console.debug('[executeCode] Execution produced error:', stderr);
      return `Error: ${stderr}`;
    }

    console.debug('[executeCode] Execution complete');
    return stdout || 'No output';
  } catch (error) {
    console.error('[executeCode] Execution failed:', error);
    throw new Error(`Execution failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function POST(request: Request) {
  // Clear previous logs
  debugLogs.length = 0;

  console.debug('[POST] Handling new code execution request');
  try {
    const { code } = await request.json() as { code: string };
    console.debug('[POST] Received code length:', code.length);

    // Initialize temp directory
    await initTempDir();

    // Extract required packages
    const packages = extractPackages(code);
    console.debug('[POST] Required packages:', packages);

    // Install packages if needed
    if (packages.length > 0) {
      console.debug('[POST] Installing packages');
      const installOutput = await installPackages(packages);
      console.debug('[POST] Package installation output:', installOutput);
    }

    // Execute the code
    console.debug('[POST] Executing code');
    const output = await executeCode(code);

    // Get current installed packages
    const installedPackages = Array.from(await getInstalledPackages());
    console.debug('[POST] Currently installed packages:', installedPackages);

    console.debug('[POST] Request completed successfully');
    return NextResponse.json({
      output,
      installedPackages,
      moduleType: 'commonjs',
      debugLogs // Include debug logs in response
    });
  } catch (error) {
    console.error('[POST] Request failed:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : String(error),
        debugLogs // Include debug logs even in case of error
      },
      { status: 400 }
    );
  }
}
