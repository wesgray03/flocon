const fs = require('fs');
const path = require('path');

// Replace all green/avocado colors with grayish blue
const colorMappings = {
  // Green hex colors to grayish blue
  '#d4f0e8': '#e0e7ee',  // avocadoLightest → light grayish blue
  '#70b35a': '#64748b',  // avocadoLight → grayish blue (textSecondary)
  '#2d5a1e': '#475569',  // avocadoDark → darker grayish blue
  '#3d7a28': '#475569',  // avocado → darker grayish blue
  
  // Theme variable references
  'colors.avocadoLightest': 'colors.grayBlueLight',
  'colors.avocadoLight': 'colors.textSecondary',
  'colors.avocadoDark': 'colors.grayBlueDark',
  'colors.avocado': 'colors.grayBlueDark',
  
  // Success colors (currently green-based)
  'colors.success': 'colors.grayBlueLight',
  'colors.successBorder': 'colors.textSecondary',
  'colors.successText': 'colors.grayBlueDark',
};

function replaceColorsInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  for (const [oldColor, newColor] of Object.entries(colorMappings)) {
    if (content.includes(oldColor)) {
      const regex = new RegExp(oldColor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      content = content.replace(regex, newColor);
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  }
  return false;
}

function walkDirectory(dir, filePattern = /\.(tsx?|css|scss)$/) {
  const files = fs.readdirSync(dir);
  const matchedFiles = [];

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      if (!file.startsWith('.') && file !== 'node_modules') {
        matchedFiles.push(...walkDirectory(filePath, filePattern));
      }
    } else if (filePattern.test(file)) {
      matchedFiles.push(filePath);
    }
  }

  return matchedFiles;
}

// Process all files
const srcDir = path.join(__dirname, 'src');
const files = walkDirectory(srcDir);
let updatedCount = 0;

console.log('Removing green colors and replacing with grayish blue...\n');

for (const file of files) {
  if (replaceColorsInFile(file)) {
    console.log(`Updated: ${path.relative(__dirname, file)}`);
    updatedCount++;
  }
}

console.log(`\n✨ Done! Updated ${updatedCount} files`);
