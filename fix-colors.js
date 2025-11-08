const fs = require('fs');
const path = require('path');

// Color mappings from old to new theme colors
const colorMappings = {
  // Gray/Blue backgrounds → Warm beige
  '#f8fafc': '#faf8f5',  // Light gray → Card background
  '#f1f5f9': '#f0ebe3',  // Gray → Table header
  '#fafbfc': '#faf8f5',  // White-ish → Card background
  '#ffffff': '#faf8f5',  // White → Card background
  
  // Green backgrounds
  '#f0fdf4': '#e8f0d4',  // Light green → Avocado lightest
  '#eff6ff': '#e8f0d4',  // Light blue → Avocado lightest
  
  // Yellow/Warning
  '#fef3c7': '#ebe5db',  // Yellow → Toggle background
  
  // Gray borders/backgrounds
  '#e5e7eb': '#e5dfd5',  // Gray → Border color
  '#e2e8f0': '#e5dfd5',  // Slate gray → Border color
  
  // Blue buttons/links
  '#2563eb': '#1e3a5f',  // Blue → Navy
  '#3b82f6': '#1e3a5f',  // Light blue → Navy
  
  // Badge backgrounds
  '#dbeafe': '#e8f0d4',  // Blue badge → Avocado lightest
  '#ede9fe': '#e8f0d4',  // Purple badge → Avocado lightest
  '#fed7aa': '#ebe5db',  // Orange badge → Toggle background
  
  // Stray colors
  '#059669': '#4a5d23',  // Bright green → Avocado dark
};

function replaceColorsInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    for (const [oldColor, newColor] of Object.entries(colorMappings)) {
      if (content.includes(oldColor)) {
        const regex = new RegExp(oldColor.replace('#', '\\#'), 'gi');
        content = content.replace(regex, newColor);
        modified = true;
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
console.log('🎨 Fixing colors to match FloCon theme...\n');

const tsxFiles = walkDirectory(srcDir);
let updatedCount = 0;

for (const file of tsxFiles) {
  if (replaceColorsInFile(file)) {
    updatedCount++;
  }
}

console.log(`\n✨ Done! Updated ${updatedCount} files`);
