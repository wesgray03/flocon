const fs = require('fs');
const path = require('path');

// Color mappings from hardcoded hex to theme variable names
const colorMappings = {
  '#0f172a': 'colors.textPrimary',
  '#64748b': 'colors.textSecondary',
  '#475569': 'colors.grayBlueDark',
  '#9ca3af': 'colors.textMuted',
  '#334155': 'colors.textPrimary', // Dark text
  '#6b7280': 'colors.gray',
  '#1e3a5f': 'colors.navy',
  '#152d4a': 'colors.navyHover',
  '#c8102e': 'colors.logoRed',
  '#991b1b': 'colors.errorText',
  '#b91c1c': 'colors.errorText',
  '#f5f1ea': 'colors.backgroundLight',
  '#faf8f5': 'colors.cardBackground',
  '#ebe5db': 'colors.toggleBackground',
  '#f0ebe3': 'colors.tableHeader',
  '#e5dfd5': 'colors.border',
  '#e0e7ee': 'colors.grayBlueLight',
  '#fee2e2': 'colors.error',
  '#cbd5e1': 'colors.border', // Similar border color
};

function replaceColorsInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    let needsImport = false;
    
    // Check if file already imports colors
    const hasColorImport = /import.*\bcolors\b.*from ['"]@\/styles\/theme['"]/.test(content);
    
    for (const [hex, themeVar] of Object.entries(colorMappings)) {
      const regex = new RegExp(`color: ['"]${hex.replace('#', '\\#')}['"]`, 'gi');
      if (content.match(regex)) {
        content = content.replace(regex, `color: ${themeVar}`);
        modified = true;
        needsImport = true;
      }
    }
    
    // Add import if needed and not already present
    if (modified && needsImport && !hasColorImport) {
      // Find the first import statement
      const firstImportMatch = content.match(/^import\s/m);
      if (firstImportMatch) {
        const insertPos = firstImportMatch.index;
        content = content.slice(0, insertPos) + 
                  "import { colors } from '@/styles/theme';\n" + 
                  content.slice(insertPos);
      }
    }
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✓ Updated: ${filePath}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`✗ Error processing ${filePath}:`, error.message);
    return false;
  }
}

function walkDirectory(dir, filePattern = /\.tsx$/) {
  let results = [];
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      results = results.concat(walkDirectory(filePath, filePattern));
    } else if (filePattern.test(file)) {
      results.push(filePath);
    }
  }
  
  return results;
}

// Main execution
const srcDir = path.join(__dirname, 'src');
console.log('🎨 Standardizing all colors to use theme variables...\n');

const tsxFiles = walkDirectory(srcDir);
let updatedCount = 0;

for (const file of tsxFiles) {
  if (replaceColorsInFile(file)) {
    updatedCount++;
  }
}

console.log(`\n✨ Done! Updated ${updatedCount} files`);
