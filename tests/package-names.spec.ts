import { test, expect } from '@playwright/test';
import {
  extractImportSpecifiers,
  extractRequireSpecifiers,
  isValidPackageName,
  toInstallablePackages,
} from '../src/app/api/execute/sandbox';

// Pure unit tests for package-name extraction and validation. No server or
// browser needed.

test.describe('package name extraction', () => {
  test('ESM imports include scoped packages and subpaths', () => {
    const code = [
      "import a from 'lodash';",
      "import { b } from '@scope/pkg';",
      "import c from '@scope/pkg/sub/path.js';",
      "import 'side-effect';",
      "import d from 'lodash/fp';",
    ].join('\n');
    expect(toInstallablePackages(extractImportSpecifiers(code)).sort()).toEqual(
      ['@scope/pkg', 'lodash', 'side-effect'].sort(),
    );
  });

  test('CommonJS requires include scoped packages and subpaths', () => {
    const code = [
      "require('lodash');",
      'require("@scope/pkg");',
      "require('@scope/other/sub');",
    ].join('\n');
    expect(toInstallablePackages(extractRequireSpecifiers(code)).sort()).toEqual(
      ['@scope/other', '@scope/pkg', 'lodash'].sort(),
    );
  });

  test('built-ins and relative paths are skipped', () => {
    expect(toInstallablePackages(['node:fs', 'path', './x', '../y', '/abs'])).toEqual([]);
  });
});

test.describe('package name validation', () => {
  for (const name of ['lodash', 'is-odd', 'a.b_c~d', '@scope/pkg', '@babel/core', '@a-b/c.d']) {
    test(`accepts ${name}`, () => {
      expect(isValidPackageName(name)).toBe(true);
    });
  }

  for (const name of [
    '',
    '@scope',
    '@scope/',
    '@/pkg',
    '@scope/pkg/sub',
    '.hidden',
    '_private',
    '-g',
    '--global',
    'UPPER',
    'left-pad;touch x',
    'a b',
    'a$(id)',
    'a`id`',
    'a|b',
    '@scope/pkg;id',
    'x'.repeat(215),
  ]) {
    test(`rejects ${JSON.stringify(name.length > 20 ? name.slice(0, 20) + '…' : name)}`, () => {
      expect(isValidPackageName(name)).toBe(false);
    });
  }

  test('a malformed scoped specifier is rejected, not silently dropped', () => {
    expect(() => toInstallablePackages(['@scope;id/pkg'])).toThrow(/invalid package name/i);
    expect(() => toInstallablePackages(['@scope'])).toThrow(/invalid package name/i);
  });
});
