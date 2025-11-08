const fs = require('fs');
const path = require('path');

const colorMap = {
  // Text
  '#64748b': 'colors.textSecondary',
  '#475569': 'colors.textMuted',
  '#334155': 'colors.textMuted',
  '#6b7280': 'colors.gray',
  '#8b7d6b': 'colors.textMuted',
  '#94a3b8': 'colors.textMuted',
  '#991b1b': 'colors.errorText',
  '#b91c1c': 'colors.errorText',
  '#c8102e': 'colors.logoRed',
  // Add more as needed
};

function replaceColorsInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  for (const [hex, themeVar] of Object.entries(colorMap)) {
    const regex = new RegExp(hex.replace('#', '\\#'), 'gi');
    if (regex.test(content)) {
      content = content.replace(regex, `THEME_${themeVar}`); // temp marker
      changed = true;
    }
  }
  if (changed) {
    // Replace temp markers with actual theme usage
    content = content.replace(/'\u007fTHEME_([^']+)'/g, (m, v) => `{${v}}`);
    content = content.replace(/"\u007fTHEME_([^"]+)"/g, (m, v) => `{${v}}`);
    content = content.replace(/: ?\u007fTHEME_([^,\s\)\}]+)/g, (m, v) => `: ${v}`);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('✓', filePath);
  }
}

function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (p.endsWith('.tsx')) replaceColorsInFile(p);
  }
}

walk(path.join(__dirname, 'src'));
