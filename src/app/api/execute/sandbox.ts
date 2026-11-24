import { spawn } from 'child_process';
import { isBuiltin } from 'module';
import { join } from 'path';

// Limits for user code. Override with environment variables when self-hosting.
export const EXEC_TIMEOUT_MS = Number(process.env.RUNJS_EXEC_TIMEOUT_MS) || 10_000;
export const INSTALL_TIMEOUT_MS = Number(process.env.RUNJS_INSTALL_TIMEOUT_MS) || 120_000;
export const MAX_OUTPUT_BYTES = Number(process.env.RUNJS_MAX_OUTPUT_BYTES) || 1024 * 1024;
export const MAX_PACKAGES = Number(process.env.RUNJS_MAX_PACKAGES) || 10;

// Valid npm package names, scoped or not: lowercase, URL-safe characters
// only, no leading dot or underscore. The name is passed to npm as its own
// argv entry (no shell), so the character set alone keeps it from being
// interpreted by a shell; a leading dash is also rejected so a name can never
// be read as a CLI flag such as `-g`.
const NPM_NAME = /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;

export function isValidPackageName(name: string): boolean {
  return (
    name.length > 0 &&
    name.length <= 214 &&
    !name.startsWith('-') &&
    NPM_NAME.test(name)
  );
}

// `import x from 'spec'`, `import { a } from "spec"`, `import 'spec'`
const IMPORT_RE = /import\s+(?:[\w*\s{},$]*\s+from\s+)?['"]([^'"]+)['"]/g;
// `require('spec')`, `require("spec")`
const REQUIRE_RE = /require\(\s*['"]([^'"]+)['"]\s*\)/g;

function matchAll(code: string, re: RegExp): string[] {
  return Array.from(code.matchAll(re), (m) => m[1]);
}

/** Module specifiers from ESM import statements, including `@scope/pkg`. */
export function extractImportSpecifiers(code: string): string[] {
  return matchAll(code, IMPORT_RE);
}

/** Module specifiers from CommonJS require calls, including `@scope/pkg`. */
export function extractRequireSpecifiers(code: string): string[] {
  return matchAll(code, REQUIRE_RE);
}

/**
 * The package a bare specifier belongs to: `pkg/sub` -> `pkg`,
 * `@scope/pkg/sub` -> `@scope/pkg`.
 */
function packageNameOf(spec: string): string {
  const parts = spec.split('/');
  return spec.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
}

/**
 * Turn the module specifiers found in user code into npm package names to
 * install. Node built-ins and relative/absolute paths are skipped. Throws if a
 * specifier is not a valid npm name or if there are too many packages.
 */
export function toInstallablePackages(specifiers: string[]): string[] {
  const packages = new Set<string>();
  for (const spec of specifiers) {
    if (spec.startsWith('.') || spec.startsWith('/') || isBuiltin(spec)) continue;
    const name = packageNameOf(spec);
    if (!isValidPackageName(name)) {
      throw new Error(`Invalid package name: ${JSON.stringify(name)}`);
    }
    packages.add(name);
  }
  if (packages.size > MAX_PACKAGES) {
    throw new Error(`Too many packages: ${packages.size} (limit is ${MAX_PACKAGES})`);
  }
  return Array.from(packages);
}

type Env = Record<string, string | undefined>;

const PROXY_VARS = [
  'HTTP_PROXY', 'HTTPS_PROXY', 'NO_PROXY', 'http_proxy', 'https_proxy', 'no_proxy',
  'NODE_EXTRA_CA_CERTS', 'npm_config_registry',
];

/** Minimal environment for user code: no server secrets. */
export function codeEnv(tempDir: string): Env {
  return {
    PATH: process.env.PATH ?? '/usr/local/bin:/usr/bin:/bin',
    HOME: tempDir,
    TMPDIR: tempDir,
    LANG: 'C.UTF-8',
    NODE_PATH: join(tempDir, 'node_modules'),
  };
}

/** Environment for `npm install`: PATH/HOME plus network settings npm may need. */
export function installEnv(): Env {
  const env: Env = {
    PATH: process.env.PATH ?? '/usr/local/bin:/usr/bin:/bin',
    HOME: process.env.HOME,
    LANG: 'C.UTF-8',
  };
  for (const key of PROXY_VARS) {
    if (process.env[key]) env[key] = process.env[key];
  }
  return env;
}

export interface RunResult {
  stdout: string;
  stderr: string;
  code: number | null;
}

/**
 * Run a command with an argument array (no shell). The child gets its own
 * process group so the whole group is SIGKILLed on timeout, when output grows
 * past MAX_OUTPUT_BYTES, and after it exits (so stray grandchildren die too).
 */
export function run(
  file: string,
  args: string[],
  opts: { cwd: string; env: Env; timeoutMs: number },
): Promise<RunResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(file, args, {
      cwd: opts.cwd,
      env: opts.env as NodeJS.ProcessEnv,
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    let bytes = 0;
    let failure: Error | null = null;

    const killGroup = () => {
      try {
        if (child.pid) process.kill(-child.pid, 'SIGKILL');
      } catch {
        // group already gone
      }
    };

    const timer = setTimeout(() => {
      failure = new Error(`Execution timed out after ${opts.timeoutMs} ms`);
      killGroup();
    }, opts.timeoutMs);

    const collect = (stream: 'stdout' | 'stderr') => (chunk: Buffer) => {
      if (failure) return;
      bytes += chunk.length;
      if (bytes > MAX_OUTPUT_BYTES) {
        failure = new Error(`Output exceeded ${MAX_OUTPUT_BYTES} bytes`);
        killGroup();
        return;
      }
      if (stream === 'stdout') stdout += chunk.toString();
      else stderr += chunk.toString();
    };
    child.stdout.on('data', collect('stdout'));
    child.stderr.on('data', collect('stderr'));

    child.on('error', (err) => {
      clearTimeout(timer);
      killGroup();
      reject(err);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      killGroup();
      if (failure) reject(failure);
      else resolve({ stdout, stderr, code });
    });
  });
}

/** `npm install <names...>` without a shell. Names must already be validated. */
export async function npmInstall(cwd: string, names: string[]): Promise<string> {
  for (const name of names) {
    if (!isValidPackageName(name)) throw new Error(`Invalid package name: ${JSON.stringify(name)}`);
  }
  const { stdout, stderr, code } = await run('npm', ['install', '--', ...names], {
    cwd,
    env: installEnv(),
    timeoutMs: INSTALL_TIMEOUT_MS,
  });
  if (code !== 0) throw new Error(`npm install exited with code ${code}: ${stderr.trim()}`);
  return stdout + stderr;
}

/** Run a script with the current Node binary, inside tempDir, with limits. */
export function runNode(tempDir: string, scriptPath: string): Promise<RunResult> {
  return run(process.execPath, [scriptPath], {
    cwd: tempDir,
    env: codeEnv(tempDir),
    timeoutMs: EXEC_TIMEOUT_MS,
  });
}
