#!/usr/bin/env node
// ===========================
// BUILD SCRIPT: STRIP DEBUG CODE
// ===========================
// 
// This script removes all debug code from the project for production/master branch.
// 
// Usage:
//   node build-strip-debug.js [--dry-run]
//
// What it does:
//   1. Removes DEBUG.* calls from JavaScript files
//   2. Removes DEBUG imports and calls from TypeScript files
//   3. Sets DEBUG_CONFIG.enabled = false in config.js
//   4. Creates production-ready files
//
// For dev branch: Keep all debug code
// For master branch: Run this script before deployment

const fs = require('fs');
const path = require('path');

const DRY_RUN = process.argv.includes('--dry-run');

// Files to process
const filesToProcess = [
  'script.js',
  'config.js',
  'supabase/functions/github-user/index.ts',
  'supabase/functions/stripe-webhook/index.ts',
  'supabase/functions/fetch-stripe-products/index.ts',
  'supabase/functions/create-checkout-session/index.ts',
  'supabase/functions/sync-user-subscription/index.ts'
];

// Patterns to remove
const debugPatterns = [
  // Remove DEBUG.* calls (single line)
  /^\s*if\s*\(typeof\s+DEBUG\s*!==\s*['"]undefined['"]\)\s*\{[^}]*DEBUG\.[^}]+\}\s*$/gm,
  // Remove DEBUG.* calls (multi-line)
  /if\s*\(typeof\s+DEBUG\s*!==\s*['"]undefined['"]\)\s*\{[\s\S]*?DEBUG\.[\s\S]*?\}/g,
  // Remove standalone DEBUG calls
  /DEBUG\.(log|info|warn|error|api|network|request|response|storage|auth|payment|time|timeEnd|group|groupEnd|trace|assert|table|memory|init|enable|disable|setLevel)\([^)]*\)\s*;?/g,
  // Remove DEBUG import statements
  /import\s+\{?\s*DEBUG\s*\}?\s+from\s+['"][^'"]*debug[^'"]*['"]\s*;?\s*\n?/g,
  // Remove DEBUG initialization comments
  /\/\/\s*DEBUG:.*\n/g,
];

// Function to strip debug code from content
function stripDebugCode(content, filePath) {
  let result = content;
  let changes = 0;
  
  // Remove debug patterns
  debugPatterns.forEach((pattern, index) => {
    const matches = result.match(pattern);
    if (matches) {
      changes += matches.length;
      result = result.replace(pattern, '');
    }
  });
  
  // Special handling for config.js - set DEBUG_CONFIG.enabled = false
  if (filePath.includes('config.js')) {
    result = result.replace(
      /enabled:\s*(isDevEnvironment|true)/g,
      'enabled: false'
    );
  }
  
  // Clean up extra blank lines (more than 2 consecutive)
  result = result.replace(/\n{3,}/g, '\n\n');
  
  return { content: result, changes };
}

// Process a single file
function processFile(filePath) {
  const fullPath = path.join(__dirname, filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.warn(`⚠️  File not found: ${filePath}`);
    return;
  }
  
  const originalContent = fs.readFileSync(fullPath, 'utf8');
  const { content: newContent, changes } = stripDebugCode(originalContent, filePath);
  
  if (changes > 0 || originalContent !== newContent) {
    console.log(`✅ ${filePath}: Removed ${changes} debug patterns`);
    
    if (!DRY_RUN) {
      fs.writeFileSync(fullPath, newContent, 'utf8');
    } else {
      console.log(`   (DRY RUN - file not modified)`);
    }
  } else {
    console.log(`ℹ️  ${filePath}: No debug code found`);
  }
}

// Main execution
console.log('🔧 Stripping debug code from project...\n');
if (DRY_RUN) {
  console.log('⚠️  DRY RUN MODE - No files will be modified\n');
}

filesToProcess.forEach(processFile);

console.log('\n✨ Done!');
if (DRY_RUN) {
  console.log('\nRun without --dry-run to apply changes.');
}

