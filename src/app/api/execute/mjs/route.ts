import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import { writeFile, mkdir, readFile, access } from 'fs/promises'
import { join } from 'path'
import {
  validatePackageName,
  scanCodeForDangerousPatterns,
  analyzeCodeComplexity,
  detectSuspiciousPatterns,
  scanForMaliciousContent,
  sanitizeEnvironment,
  EXECUTION_TIMEOUT,
} from '../../../utils/security'
import { validateAPIKey, checkKeyRateLimit } from '../../../utils/auth'
import { securityLogger, getClientIP, getUserAgent } from '../../../utils/security-logger'

const execAsync = promisify(exec)
const BASE_TEMP_DIR = join(process.cwd(), 'temp')

function getTempDir(): string {
  return join(BASE_TEMP_DIR, 'esm')
}

// Initialize temp directory and package.json
async function initTempDir() {
  const tempDir = getTempDir()
  await mkdir(tempDir, { recursive: true })
  const packageJsonPath = join(tempDir, 'package.json')

  interface PackageJson {
    name: string
    version: string
    private: boolean
    type?: 'module'
    dependencies: Record<string, string>
  }

  try {
    await access(packageJsonPath)
    // Update package.json if needed
    const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf-8')) as PackageJson
    if (packageJson.type !== 'module') {
      packageJson.type = 'module'
      await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2))

      // Reinstall packages to ensure they're compatible
      if (Object.keys(packageJson.dependencies || {}).length > 0) {
        const deps = Object.keys(packageJson.dependencies).join(' ')
        await execAsync(`npm install ${deps}`, { cwd: tempDir })
      }
    }
  } catch {
    // Initialize npm first
    await execAsync('npm init -y', { cwd: tempDir })

    // Then modify the generated package.json
    const packageJson: PackageJson = {
      name: 'runjs-temp-esm',
      version: '1.0.0',
      private: true,
      type: 'module',
      dependencies: {},
    }

    await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2))
  }
}

function extractPackages(code: string): string[] {
  const packages = new Set<string>()

  // Match import statements: import ... from 'package-name' or import ... from "package-name"
  const importRegex = /import\s+(?:(?:[\w*\s{},]*)\s+from\s+)?['"]([^'"@][^'"]*)['"]/g
  let match = importRegex.exec(code)
  while (match) {
    const packageName = match[1].split('/')[0] // Get base package name

    // Validate package name against whitelist
    if (validatePackageName(packageName)) {
      packages.add(packageName)
    } else {
      throw new Error(`Package '${packageName}' is not allowed for security reasons`)
    }

    match = importRegex.exec(code)
  }

  return Array.from(packages)
}

async function getInstalledPackages(): Promise<{ name: string; version: string }[]> {
  try {
    const packageJsonPath = join(getTempDir(), 'package.json')
    const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf-8'))
    return Object.entries(packageJson.dependencies || {}).map(([name, version]) => ({
      name,
      version: version as string,
    }))
  } catch {
    return []
  }
}

async function installPackages(packages: string[]): Promise<string> {
  try {
    const installedPackages = await getInstalledPackages()
    const packagesToInstall = packages.filter(pkg => !installedPackages.some(p => p.name === pkg))

    if (packagesToInstall.length === 0) {
      return 'All packages already installed'
    }

    const { stdout, stderr } = await execAsync(`npm install ${packagesToInstall.join(' ')}`, {
      cwd: getTempDir(),
    })
    return stdout + stderr
  } catch (error) {
    throw new Error(
      `Failed to install packages: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

async function executeCode(code: string): Promise<string> {
  const tempDir = getTempDir()
  const codeFilename = 'code.mjs'
  const setupFilename = 'setup.mjs'

  // Write user code to a separate file
  const codePath = join(tempDir, codeFilename)
  await writeFile(codePath, code)

  // Prepare the setup code that will execute the user's code
  const setupCode = `
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
  `

  // Write setup code
  const setupPath = join(tempDir, setupFilename)
  await writeFile(setupPath, setupCode)

  // Execute the code with timeout and restricted environment
  try {
    const { stdout, stderr } = await execAsync(`node ${setupPath}`, {
      cwd: tempDir,
      timeout: EXECUTION_TIMEOUT,
      env: {
        ...sanitizeEnvironment(),
        NODE_PATH: join(tempDir, 'node_modules'),
      },
      maxBuffer: 1024 * 1024, // 1MB max output buffer
    })

    if (stderr && !stderr.includes('ExperimentalWarning')) {
      return `Error: ${stderr}`
    }

    return stdout || 'No output'
  } catch (error) {
    if (error instanceof Error && error.message.includes('timeout')) {
      throw new Error('Code execution timed out (10 second limit)')
    }
    throw new Error(`Execution failed: ${error instanceof Error ? error.message : String(error)}`)
  }
}

export async function POST(request: NextRequest) {
  const ip = getClientIP(request)
  const userAgent = getUserAgent(request)

  try {
    // API key authentication
    const authResult = validateAPIKey(request)
    if (!authResult.authenticated) {
      return NextResponse.json(
        { error: 'Authentication required', reason: authResult.reason },
        { status: 401 }
      )
    }

    // Rate limiting per API key
    if (authResult.keyId && !checkKeyRateLimit(authResult.keyId)) {
      securityLogger.logSecurityEvent({
        type: 'rate_limit_exceeded',
        ip,
        userAgent,
        severity: 'medium',
        blocked: true,
        details: { keyId: authResult.keyId, endpoint: '/api/execute' },
      })

      return NextResponse.json({ error: 'Rate limit exceeded for API key' }, { status: 429 })
    }

    const { code } = (await request.json()) as { code: string }

    // Comprehensive security validation
    const dangerousPatterns = scanCodeForDangerousPatterns(code)
    const suspiciousPatterns = detectSuspiciousPatterns(code)
    const maliciousContent = scanForMaliciousContent(code)
    const complexity = analyzeCodeComplexity(code)

    const allViolations = [
      ...dangerousPatterns,
      ...suspiciousPatterns,
      ...maliciousContent,
      ...complexity.violations,
    ]

    if (allViolations.length > 0) {
      securityLogger.logSecurityEvent({
        type: 'code_execution_blocked',
        ip,
        userAgent,
        severity: dangerousPatterns.length > 0 ? 'high' : 'medium',
        blocked: true,
        details: {
          violations: allViolations,
          complexity: complexity.complexity,
          nestedLoops: complexity.nestedLoops,
          codeLength: code.length,
        },
      })

      return NextResponse.json(
        {
          error: 'Code contains security violations',
          violations: allViolations,
          analysis: {
            complexity: complexity.complexity,
            nestedLoops: complexity.nestedLoops,
          },
        },
        { status: 400 }
      )
    }

    // Initialize temp directory
    await initTempDir()

    // Extract required packages (with security validation)
    const packages = extractPackages(code)

    // Install packages if needed
    if (packages.length > 0) {
      const installOutput = await installPackages(packages)
      console.log('Package installation output:', installOutput)
    }

    // Execute the code with security restrictions
    const output = await executeCode(code)

    // Get current installed packages
    const installedPackages = await getInstalledPackages()

    return NextResponse.json({
      output,
      installedPackages,
      moduleType: 'esm',
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 400 }
    )
  }
}
