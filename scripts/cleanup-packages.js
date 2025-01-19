const { execSync } = require('child_process');
const { join } = require('path');
const { readFileSync, writeFileSync } = require('fs');

const BASE_TEMP_DIR = join(process.cwd(), 'temp');
const CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour in milliseconds

function cleanupPackages(dir) {
  const packageJsonPath = join(BASE_TEMP_DIR, dir, 'package.json');

  try {
    // Read the current package.json
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

    // If there are no dependencies, nothing to clean
    if (!packageJson.dependencies || Object.keys(packageJson.dependencies).length === 0) {
      console.log(`No packages to clean in ${dir}`);
      return;
    }

    // Get list of packages to uninstall
    const packagesToUninstall = Object.keys(packageJson.dependencies);
    console.log(`Uninstalling ${packagesToUninstall.length} packages from ${dir}:`, packagesToUninstall);

    // Uninstall all packages
    execSync(`cd ${join(BASE_TEMP_DIR, dir)} && npm uninstall ${packagesToUninstall.join(' ')}`, {
      stdio: 'inherit'
    });

    console.log(`Successfully cleaned up packages in ${dir}`);
  } catch (error) {
    console.error(`Error cleaning up packages in ${dir}:`, error.message);
  }
}

function performCleanup() {
  console.log('\n=== Starting package cleanup ===');
  console.log('Time:', new Date().toISOString());

  // Clean up both CJS and ESM directories
  cleanupPackages('cjs');
  cleanupPackages('esm');

  console.log('=== Cleanup complete ===\n');
}

// Check if running as part of npm start
const isPartOfStart = process.env.npm_lifecycle_event === 'start';

// If running as part of start, just do one cleanup and exit
if (isPartOfStart) {
  performCleanup();
  return;
}

// Otherwise, run the continuous cleanup process
performCleanup();
setInterval(performCleanup, CLEANUP_INTERVAL);
console.log(`Package cleanup scheduled to run every ${CLEANUP_INTERVAL / 1000 / 60} minutes`);
