const fs = require('node:fs');

fs.mkdirSync('dist', { recursive: true });

for (const name of fs.readdirSync('assets')) {
  if (name.endsWith('.css') || name === 'Temml.woff2') {
    fs.copyFileSync(`assets/${name}`, `dist/${name}`);
  }
}
