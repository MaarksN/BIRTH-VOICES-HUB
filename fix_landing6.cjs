const fs = require('fs');

let c = fs.readFileSync('pages/Landing.tsx', 'utf8');

c = c.replace(/const timer = setInterval/g, 'const timer = setTimeout');

fs.writeFileSync('pages/Landing.tsx', c);
