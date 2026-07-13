const fs = require('fs');
let c = fs.readFileSync('lib/firebase.ts', 'utf8');
c = c.replace(/Hardcoded safe mock config/g, "Configuration");
fs.writeFileSync('lib/firebase.ts', c);
