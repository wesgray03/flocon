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
  '#f0fdf4': '#d4f0e8',  // Light green → New avocado lightest
  '#eff6ff': '#d4f0e8',  // Light blue → New avocado lightest
  '#e8f0d4': '#d4f0e8',  // Old avocado light → New avocado lightest
  
  // Green text/borders
  '#4a5d23': '#2d5a1e',  // Old avocado dark → New avocado dark
  '#a8c070': '#70b35a',  // Old avocado light → New avocado light
  
  // Yellow/Warning
  '#fef3c7': '#ebe5db',  // Yellow → Toggle background
  
  // Gray borders/backgrounds
  '#e5e7eb': '#e5dfd5',  // Gray → Border color
  '#e2e8f0': '#e5dfd5',  // Slate gray → Border color
  
  // Blue buttons/links
  '#2563eb': '#1e3a5f',  // Blue → Navy
  '#3b82f6': '#1e3a5f',  // Light blue → Navy
  
  // Badge backgrounds
  '#dbeafe': '#d4f0e8',  // Blue badge → New avocado lightest
  '#ede9fe': '#d4f0e8',  // Purple badge → New avocado lightest
  '#fed7aa': '#ebe5db',  // Orange badge → Toggle background
  
  // Stray colors
  '#059669': '#2d5a1e',  // Bright green → New avocado dark
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
