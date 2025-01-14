const fs = require('fs');
const path = require('path');

function fixFileEncoding(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  fs.writeFileSync(filePath, content.trim() + '\n', 'utf8');
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      if (!filePath.includes('node_modules') && !filePath.includes('.next')) {
        walkDir(filePath);
      }
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      fixFileEncoding(filePath);
    }
  });
}

walkDir('./src');
console.log('Fixed file encodings'); 