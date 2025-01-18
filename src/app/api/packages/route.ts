import { NextRequest, NextResponse } from "next/server";
import { readFile } from 'fs/promises';
import { join } from 'path';

const BASE_TEMP_DIR = join(process.cwd(), 'temp');

async function getInstalledPackages(): Promise<{ name: string; version: string }[]> {
  try {
    // Try to read from both ESM and CJS directories
    const esmPackages = await readPackagesFromDir('esm');
    const cjsPackages = await readPackagesFromDir('cjs');

    // Combine and deduplicate packages
    const packagesMap = new Map<string, string>();
    [...esmPackages, ...cjsPackages].forEach(pkg => {
      packagesMap.set(pkg.name, pkg.version);
    });

    return Array.from(packagesMap.entries()).map(([name, version]) => ({
      name,
      version
    }));
  } catch (error) {
    console.error('Failed to get installed packages:', error);
    return [];
  }
}

async function readPackagesFromDir(dir: string): Promise<{ name: string; version: string }[]> {
  try {
    const packageJsonPath = join(BASE_TEMP_DIR, dir, 'package.json');
    const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf-8'));
    return Object.entries(packageJson.dependencies || {}).map(([name, version]) => ({
      name,
      version: version as string
    }));
  } catch {
    return [];
  }
}

export async function GET(request: NextRequest) {
  try {
    const packages = await getInstalledPackages();
    return NextResponse.json({ packages });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
