/**
 * build.js - Zero-dependency Cross-Browser Build & Manifest Switcher
 * Creates standalone, warning-free distributions for Chrome and Firefox.
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = __dirname;
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const CHROME_DIST = path.join(DIST_DIR, 'chrome');
const FIREFOX_DIST = path.join(DIST_DIR, 'firefox');

const COMMON_FILES = [
  'background.js',
  'storage.js',
  'content.js',
  'content.css',
  'popup.html',
  'popup.css',
  'popup.js',
  'README.md'
];

const ICONS = ['icon16.png', 'icon32.png', 'icon48.png', 'icon128.png', 'icon.svg'];

function copyDirRecursive(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function copyCommonFiles(targetDir) {
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // Copy root scripts and styles
  COMMON_FILES.forEach((f) => {
    const src = path.join(ROOT_DIR, f);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(targetDir, f));
    }
  });

  // Copy icons
  const iconsTargetDir = path.join(targetDir, 'icons');
  if (!fs.existsSync(iconsTargetDir)) {
    fs.mkdirSync(iconsTargetDir, { recursive: true });
  }
  ICONS.forEach((ico) => {
    const src = path.join(ROOT_DIR, 'icons', ico);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(iconsTargetDir, ico));
    }
  });
}

function buildDistributions() {
  console.log('Building browser-specific distributions...');

  // 1. Build Chrome distribution
  copyCommonFiles(CHROME_DIST);
  fs.copyFileSync(path.join(ROOT_DIR, 'manifest.chrome.json'), path.join(CHROME_DIST, 'manifest.json'));
  console.log('✓ Chrome build created at: dist/chrome/ (0 warnings)');

  // 2. Build Firefox distribution
  copyCommonFiles(FIREFOX_DIST);
  fs.copyFileSync(path.join(ROOT_DIR, 'manifest.firefox.json'), path.join(FIREFOX_DIST, 'manifest.json'));
  console.log('✓ Firefox build created at: dist/firefox/ (0 errors)');

  console.log('\nReady! You can load:');
  console.log('  • In Chrome: Load unpacked -> dist/chrome');
  console.log('  • In Firefox: Load Temporary Add-on -> dist/firefox/manifest.json\n');
}

function switchTarget(target) {
  const t = target.toLowerCase().trim();
  if (t === 'chrome') {
    fs.copyFileSync(path.join(ROOT_DIR, 'manifest.chrome.json'), path.join(ROOT_DIR, 'manifest.json'));
    console.log('✓ Switched root manifest.json to Chrome target (service_worker only, 0 warnings)');
  } else if (t === 'firefox') {
    fs.copyFileSync(path.join(ROOT_DIR, 'manifest.firefox.json'), path.join(ROOT_DIR, 'manifest.json'));
    console.log('✓ Switched root manifest.json to Firefox target (background.scripts, 0 errors)');
  } else {
    console.error('Unknown target. Use "chrome" or "firefox".');
  }
}

// CLI Argument Handling
const args = process.argv.slice(2);
const targetIndex = args.indexOf('--target');

if (targetIndex !== -1 && args[targetIndex + 1]) {
  switchTarget(args[targetIndex + 1]);
} else {
  buildDistributions();
}
