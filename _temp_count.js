import fs from 'fs';
const c = fs.readFileSync('./client/src/pages/SchoolProfile.tsx', 'utf8');
const re = /t\("schoolProfile\.\w+",\s*"[^"]+"\)/g;
const m = c.match(re);
console.log('Found', m ? m.length : 0, 'matches');
if (m) m.forEach((x, i) => console.log((i+1) + ': ' + x));
