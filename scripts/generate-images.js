#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const generateImages = async (url) => {
  if (!url) {
    console.error('Please provide a URL as an argument');
    console.log('Usage: node generate-images.js <url>');
    process.exit(1);
  }

  const publicDir = path.join(process.cwd(), 'public');
  const faviconDir = path.join(publicDir, 'favicon');

  // Create directories if they don't exist
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir);
  }
  if (!fs.existsSync(faviconDir)) {
    fs.mkdirSync(faviconDir);
  }

  console.log('📸 Generating OpenGraph image...');
  execSync(`npx playwright screenshot ${url} public/og-image.png --viewport-size=1200,630 --wait-for-timeout=5000`, { stdio: 'inherit' });

  console.log('🎨 Generating favicon source image...');
  execSync(`npx playwright screenshot ${url} public/favicon/source.png --viewport-size=512,512 --wait-for-timeout=5000`, { stdio: 'inherit' });

  console.log('✨ Generating favicons...');
  const sizes = [
    { size: '16x16', name: 'favicon-16x16.png' },
    { size: '32x32', name: 'favicon-32x32.png' },
    { size: '48x48', name: 'favicon.ico' },
    { size: '180x180', name: 'apple-touch-icon.png' },
    { size: '192x192', name: 'android-chrome-192x192.png' },
    { size: '512x512', name: 'android-chrome-512x512.png' },
    { size: '150x150', name: 'mstile-150x150.png' },
  ];

  // Generate all favicon sizes
  sizes.forEach(({ size, name }) => {
    console.log(`Generating ${name}...`);
    execSync(`magick public/favicon/source.png -resize ${size} public/favicon/${name}`, { stdio: 'inherit' });
  });

  // Generate Safari pinned tab SVG
  console.log('Generating safari-pinned-tab.svg...');
  execSync(
    'magick public/favicon/source.png -colorspace gray -edge 1 -negate -resize 512x512 public/favicon/temp.pnm && ' +
    'potrace public/favicon/temp.pnm -s -o public/favicon/safari-pinned-tab.svg && ' +
    'rm public/favicon/temp.pnm',
    { stdio: 'inherit' }
  );

  // Clean up source image
  fs.unlinkSync(path.join(faviconDir, 'source.png'));

  console.log('✅ All images generated successfully!');
};

// Get URL from command line argument
const url = process.argv[2];
generateImages(url);
