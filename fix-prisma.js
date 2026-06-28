const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

walkDir('./src', function(filePath) {
  if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
    let content = fs.readFileSync(filePath, 'utf8');
    if (content.includes('new PrismaClient()')) {
      let depth = filePath.split(path.sep).length - 2;
      let relativePath = depth === 0 ? './lib/prisma' : '../'.repeat(depth) + 'lib/prisma';
      
      content = content.replace(/import \{ PrismaClient \} from '@prisma\/client';?/g, '');
      content = content.replace(/const prisma = new PrismaClient\(\);?/g, `import prisma from '${relativePath.replace(/\\/g, '/')}';`);
      
      fs.writeFileSync(filePath, content);
      console.log('Fixed:', filePath);
    }
  }
});
