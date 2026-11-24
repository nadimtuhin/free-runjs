import { test, expect } from '@playwright/test';
import { existsSync, rmSync } from 'fs';
import { join } from 'path';

// API-level tests for /api/execute. They need no browser, only the dev server
// that playwright.config.ts starts.

const TEMP = join(process.cwd(), 'temp');

async function run(
  request: import('@playwright/test').APIRequestContext,
  code: string,
  moduleType: 'esm' | 'commonjs',
) {
  const res = await request.post('/api/execute', {
    data: { code, moduleType },
    timeout: 60_000,
  });
  return { status: res.status(), body: await res.json() };
}

test.describe('execute API hardening', () => {
  test.describe.configure({ mode: 'serial' });

  for (const [moduleType, dir, code] of [
    ['commonjs', 'cjs', 'require("left-pad;touch pwned-marker");'],
    ['esm', 'esm', 'import x from "left-pad;touch pwned-marker";'],
  ] as const) {
    test(`package name cannot inject shell commands (${moduleType})`, async ({ request }) => {
      const marker = join(TEMP, dir, 'pwned-marker');
      rmSync(marker, { force: true });

      const { status, body } = await run(request, code, moduleType);

      expect(existsSync(marker)).toBe(false);
      expect(status).toBe(400);
      expect(body.error).toMatch(/invalid package name/i);
    });
  }

  test('node built-ins and relative paths are not sent to npm install', async ({ request }) => {
    const { status, body } = await run(
      request,
      "import fs from 'node:fs';\nimport path from 'path';\nconsole.log(typeof fs.readFileSync, typeof path.join);",
      'esm',
    );
    expect(status).toBe(200);
    expect(body.output).toContain('function function');
  });

  test('child process does not inherit the server environment', async ({ request }) => {
    const { status, body } = await run(
      request,
      'console.log(JSON.stringify(Object.keys(process.env).sort()));',
      'commonjs',
    );
    expect(status).toBe(200);
    const keys: string[] = JSON.parse(body.output.trim());
    const allowed = ['HOME', 'LANG', 'NODE_PATH', 'PATH', 'TMPDIR'];
    expect(keys.filter((k) => !allowed.includes(k))).toEqual([]);
  });

  test('infinite loop is killed by the timeout', async ({ request }) => {
    const started = Date.now();
    const { status, body } = await run(request, 'while (true) {}', 'commonjs');
    expect(Date.now() - started).toBeLessThan(30_000);
    expect(status).toBe(400);
    expect(body.error).toMatch(/timed out/i);
  });

  test('pending timers cannot keep the process alive past the timeout', async ({ request }) => {
    const started = Date.now();
    const { status, body } = await run(request, 'setInterval(() => {}, 1000);', 'esm');
    expect(Date.now() - started).toBeLessThan(30_000);
    expect(status).toBe(400);
    expect(body.error).toMatch(/timed out/i);
  });

  test('number of packages per run is capped', async ({ request }) => {
    const code = Array.from({ length: 25 }, (_, i) => `require('pkg-${i}');`).join('\n');
    const { status, body } = await run(request, code, 'commonjs');
    expect(status).toBe(400);
    expect(body.error).toMatch(/too many packages/i);
  });
});

test.describe('execute API still installs and runs real packages', () => {
  test('commonjs require of an npm package', async ({ request }) => {
    const { status, body } = await run(
      request,
      "const _ = require('lodash');\nconsole.log(_.chunk([1, 2, 3, 4], 2));",
      'commonjs',
    );
    expect(status).toBe(200);
    expect(body.output.replace(/\s/g, '')).toContain('[[1,2],[3,4]]');
  });

  test('esm import of an npm package', async ({ request }) => {
    const { status, body } = await run(
      request,
      "import isOdd from 'is-odd';\nconsole.log(isOdd(3));",
      'esm',
    );
    expect(status).toBe(200);
    expect(body.output).toContain('true');
  });
});
