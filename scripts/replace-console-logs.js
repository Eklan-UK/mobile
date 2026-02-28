#!/usr/bin/env node

/**
 * Script to replace console.log/warn/debug/info with logger equivalents
 * Keeps console.error as logger.error (errors should always be logged)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const loggerImport = `import { logger } from "@/utils/logger";`;

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Check if logger is already imported
  const hasLoggerImport = content.includes('@/utils/logger');

  // Replace console.log
  if (content.includes('console.log(')) {
    content = content.replace(/console\.log\(/g, 'logger.log(');
    modified = true;
  }

  // Replace console.warn
  if (content.includes('console.warn(')) {
    content = content.replace(/console\.warn\(/g, 'logger.warn(');
    modified = true;
  }

  // Replace console.debug
  if (content.includes('console.debug(')) {
    content = content.replace(/console\.debug\(/g, 'logger.debug(');
    modified = true;
  }

  // Replace console.info
  if (content.includes('console.info(')) {
    content = content.replace(/console\.info\(/g, 'logger.info(');
    modified = true;
  }

  // Replace console.error (keep error logging but use logger)
  if (content.includes('console.error(')) {
    content = content.replace(/console\.error\(/g, 'logger.error(');
    modified = true;
  }

  // Add logger import if needed and file was modified
  if (modified && !hasLoggerImport) {
    // Find the last import statement
    const importRegex = /^import .+ from ['"].+['"];$/gm;
    const imports = content.match(importRegex);
    
    if (imports && imports.length > 0) {
      const lastImport = imports[imports.length - 1];
      const lastImportIndex = content.lastIndexOf(lastImport);
      const insertIndex = lastImportIndex + lastImport.length;
      content = content.slice(0, insertIndex) + '\n' + loggerImport + content.slice(insertIndex);
    } else {
      // No imports found, add at the top after any comments
      const commentEnd = content.indexOf('\n', content.indexOf('*/'));
      content = content.slice(0, commentEnd + 1) + loggerImport + '\n' + content.slice(commentEnd + 1);
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Updated: ${filePath}`);
    return true;
  }

  return false;
}

function findTsxFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
      findTsxFiles(filePath, fileList);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

// Main execution
const appDir = path.join(__dirname, '..', 'app');
const servicesDir = path.join(__dirname, '..', 'services');
const hooksDir = path.join(__dirname, '..', 'hooks');

const files = [
  ...findTsxFiles(appDir),
  ...findTsxFiles(servicesDir),
  ...findTsxFiles(hooksDir),
];

let updatedCount = 0;
files.forEach(file => {
  if (processFile(file)) {
    updatedCount++;
  }
});

console.log(`\n✨ Processed ${files.length} files, updated ${updatedCount} files`);




















