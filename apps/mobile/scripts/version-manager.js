#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const VERSIONS_DIR = path.join(__dirname, '../.versions');
const PROJECT_ROOT = path.join(__dirname, '..');

// Files to backup
const FILES_TO_BACKUP = [
  'app/(tabs)/_layout.tsx',
  'app/(tabs)/index.tsx',
  'app/(tabs)/search.tsx',
  'app/(tabs)/cart.tsx',
  'app/(tabs)/account.tsx',
  'app/_layout.tsx',
  'app/checkout.tsx',
  'app/orders.tsx',
  'app/business-dashboard.tsx',
  'app/addresses.tsx',
  'app/create-business.tsx',
  'app/contact.tsx',
  'app/custom-request.tsx',
  'app/[id].tsx',
  'app/edit-profile.tsx',
  'app/privacy.tsx',
  'app/notifications.tsx',
  'app/order-success.tsx',
  'app/refund-policy.tsx',
  'app/reset-password.tsx',
  'app/saved.tsx',
  'app/shipping-policy.tsx',
  'app/sign-in.tsx',
  'app/sign-up.tsx',
  'app/terms.tsx',
  'app/track-order.tsx',
  'lib/api.ts',
  'lib/data.ts',
  'package.json',
  'app.json'
];

function ensureVersionsDir() {
  if (!fs.existsSync(VERSIONS_DIR)) {
    fs.mkdirSync(VERSIONS_DIR, { recursive: true });
  }
}

function saveVersion(versionName, description = '') {
  ensureVersionsDir();
  
  const versionDir = path.join(VERSIONS_DIR, versionName);
  if (fs.existsSync(versionDir)) {
    console.log(`❌ Version "${versionName}" already exists. Use a different name or delete the old version first.`);
    process.exit(1);
  }
  
  fs.mkdirSync(versionDir, { recursive: true });
  
  const metadata = {
    name: versionName,
    description,
    timestamp: new Date().toISOString(),
    files: []
  };
  
  FILES_TO_BACKUP.forEach(file => {
    const sourcePath = path.join(PROJECT_ROOT, file);
    if (fs.existsSync(sourcePath)) {
      const destPath = path.join(versionDir, file);
      const destDir = path.dirname(destPath);
      fs.mkdirSync(destDir, { recursive: true });
      fs.copyFileSync(sourcePath, destPath);
      metadata.files.push(file);
    }
  });
  
  fs.writeFileSync(
    path.join(versionDir, 'metadata.json'),
    JSON.stringify(metadata, null, 2)
  );
  
  console.log(`✅ Version "${versionName}" saved successfully!`);
  console.log(`📦 Backed up ${metadata.files.length} files`);
  console.log(`📅 ${new Date(metadata.timestamp).toLocaleString()}`);
  if (description) console.log(`📝 ${description}`);
}

function restoreVersion(versionName) {
  const versionDir = path.join(VERSIONS_DIR, versionName);
  if (!fs.existsSync(versionDir)) {
    console.log(`❌ Version "${versionName}" not found.`);
    listVersions();
    process.exit(1);
  }
  
  const metadataPath = path.join(versionDir, 'metadata.json');
  const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
  
  let restoredCount = 0;
  metadata.files.forEach(file => {
    const sourcePath = path.join(versionDir, file);
    const destPath = path.join(PROJECT_ROOT, file);
    if (fs.existsSync(sourcePath)) {
      const destDir = path.dirname(destPath);
      fs.mkdirSync(destDir, { recursive: true });
      fs.copyFileSync(sourcePath, destPath);
      restoredCount++;
    }
  });
  
  console.log(`✅ Version "${versionName}" restored successfully!`);
  console.log(`📦 Restored ${restoredCount} files`);
  console.log(`📅 Version from: ${new Date(metadata.timestamp).toLocaleString()}`);
  if (metadata.description) console.log(`📝 ${metadata.description}`);
}

function listVersions() {
  ensureVersionsDir();
  
  const versions = fs.readdirSync(VERSIONS_DIR).filter(name => {
    return fs.statSync(path.join(VERSIONS_DIR, name)).isDirectory();
  });
  
  if (versions.length === 0) {
    console.log('📭 No versions saved yet.');
    return;
  }
  
  console.log(`\n📚 Saved Versions (${versions.length}):\n`);
  
  versions.forEach(versionName => {
    const metadataPath = path.join(VERSIONS_DIR, versionName, 'metadata.json');
    if (fs.existsSync(metadataPath)) {
      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
      console.log(`📦 ${metadata.name}`);
      console.log(`   📅 ${new Date(metadata.timestamp).toLocaleString()}`);
      if (metadata.description) console.log(`   📝 ${metadata.description}`);
      console.log(`   📁 ${metadata.files.length} files`);
      console.log('');
    }
  });
}

function deleteVersion(versionName) {
  const versionDir = path.join(VERSIONS_DIR, versionName);
  if (!fs.existsSync(versionDir)) {
    console.log(`❌ Version "${versionName}" not found.`);
    process.exit(1);
  }
  
  fs.rmSync(versionDir, { recursive: true, force: true });
  console.log(`✅ Version "${versionName}" deleted.`);
}

// CLI
const command = process.argv[2];
const versionName = process.argv[3];
const description = process.argv.slice(4).join(' ');

switch (command) {
  case 'save':
    if (!versionName) {
      console.log('Usage: node version-manager.js save <version-name> [description]');
      process.exit(1);
    }
    saveVersion(versionName, description);
    break;
  
  case 'restore':
    if (!versionName) {
      console.log('Usage: node version-manager.js restore <version-name>');
      process.exit(1);
    }
    restoreVersion(versionName);
    break;
  
  case 'list':
    listVersions();
    break;
  
  case 'delete':
    if (!versionName) {
      console.log('Usage: node version-manager.js delete <version-name>');
      process.exit(1);
    }
    deleteVersion(versionName);
    break;
  
  default:
    console.log('Version Manager Commands:');
    console.log('  save <version-name> [description]  - Save current version');
    console.log('  restore <version-name>             - Restore a version');
    console.log('  list                               - List all versions');
    console.log('  delete <version-name>              - Delete a version');
}
