import fs from 'fs';

// ===== SchoolProfile.tsx: Remove Arabic fallbacks from t() calls =====
let sp = fs.readFileSync('./client/src/pages/SchoolProfile.tsx', 'utf8');
const spBefore = sp;

// Remove Arabic fallback pattern: t("schoolProfile.xxx", "Arabic text") → t("schoolProfile.xxx")
sp = sp.replace(/t\("schoolProfile\.(\w+)",\s*"[^"]+"\)/g, 't("schoolProfile.$1")');

// Fix Arabic comma separator "، " → use locale key
sp = sp.replace(/\.filter\(Boolean\)\.join\("، "\)/g, '.filter(Boolean).join(t("schoolProfile.commaSeparator"))');

const spChanges = (spBefore.match(/[\u0600-\u06FF]/g) || []).length - (sp.match(/[\u0600-\u06FF]/g) || []).length;
console.log('SchoolProfile.tsx: removed', spChanges, 'Arabic characters');

// Verify no more Arabic in t() calls
const remaining = sp.match(/t\("schoolProfile\.\w+",\s*"[^"]+"\)/g);
console.log('Remaining t() with fallbacks:', remaining ? remaining.length : 0);

// Check for any remaining Arabic
const arabicLines = sp.split('\n').filter((l, i) => /[\u0600-\u06FF]/.test(l));
console.log('Lines still with Arabic:', arabicLines.length);
arabicLines.forEach((l, i) => console.log('  ' + l.trim().substring(0, 120)));

fs.writeFileSync('./client/src/pages/SchoolProfile.tsx', sp, 'utf8');
console.log('SchoolProfile.tsx updated successfully');
