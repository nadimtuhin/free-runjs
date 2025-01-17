import { NextResponse } from "next/server";
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, mkdir, readFile, access } from 'fs/promises';
import { join } from 'path';

const execAsync = promisify(exec);
const BASE_TEMP_DIR = join(process.cwd(), 'temp');

function getTempDir(): string {
  return join(BASE_TEMP_DIR, 'commonjs');
}

// Initialize temp directory and package.json
async function initTempDir() {
  const tempDir = getTempDir();
  await mkdir(tempDir, { recursive: true });
  const packageJsonPath = join(tempDir, 'package.json');

  interface PackageJson {
    name: string;
    version: string;
    private: boolean;
    type?: 'module';
    dependencies: Record<string, string>;
  }

  // Create setup files for CommonJS
  const setupCjsPath = join(tempDir, 'setup.cjs');
  const setupCjsContent = `
    const path = require('path');
    const module = require('module');

    // Create a require function that resolves from our temp directory
    const createRequire = module.createRequire;
    const require = createRequire(path.join(process.cwd(), 'temp/commonjs/package.json'));

    module.exports = { require };
  `;
  await writeFile(setupCjsPath, setupCjsContent);

  try {
    await access(packageJsonPath);
    // Update package.json if needed
    const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf-8')) as PackageJson;
    if (packageJson.type === 'module') {
      delete packageJson.type;
      await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));

      // Reinstall packages to ensure they're compatible
      if (Object.keys(packageJson.dependencies || {}).length > 0) {
        const deps = Object.keys(packageJson.dependencies).join(' ');
        await execAsync(`npm install ${deps}`, { cwd: tempDir });
      }
    }
  } catch {
    // Initialize npm first
    await execAsync('npm init -y', { cwd: tempDir });

    // Then modify the generated package.json
    const packageJson: PackageJson = {
      name: 'runjs-temp-commonjs',
      version: '1.0.0',
      private: true,
      dependencies: {}
    };

    await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
  }
}

function extractPackages(code: string): string[] {
  const packages = new Set<string>();

  // Match require statements: require('package-name') or require("package-name")
  const requireRegex = /require\(['"]([^'"@][^'"]*)['"]\)/g;
  let match = requireRegex.exec(code);
  while (match) {
    packages.add(match[1].split('/')[0]); // Get base package name
    match = requireRegex.exec(code);
  }

  return Array.from(packages);
}

async function getInstalledPackages(): Promise<Set<string>> {
  try {
    const packageJsonPath = join(getTempDir(), 'package.json');
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
      cwd: getTempDir()
    });
    return stdout + stderr;
  } catch (error) {
    throw new Error(`Failed to install packages: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function executeCode(code: string): Promise<string> {
  const tempDir = getTempDir();
  const codeFilename = 'code.cjs';
  const setupFilename = 'setup.cjs';

  // Write user code to a separate file
  const codePath = join(tempDir, codeFilename);
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
    const { code } = await request.json() as { code: string };

    // Initialize temp directory
    await initTempDir();

    // Extract required packages
    const packages = extractPackages(code);

    // Install packages if needed
    if (packages.length > 0) {
      const installOutput = await installPackages(packages);
      console.log('Package installation output:', installOutput);
    }

    // Execute the code
    const output = await executeCode(code);

    // Get current installed packages
    const installedPackages = Array.from(await getInstalledPackages());

    return NextResponse.json({
      output,
      installedPackages,
      moduleType: 'commonjs'
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 400 }
    );
  }
}
