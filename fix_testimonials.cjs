const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, 'i18n', 'locales');
const files = fs.readdirSync(localesDir).filter(f => f.endsWith('.json'));

const transformations = [
    // Korean
    { from: /20초대였는데/g, to: '50초대였는데' },
    { from: /7초까지 줄였/g, to: '32초까지 줄였' },
    { from: /7초대 기록/g, to: '38초대 기록' },
    { from: /6초대 기록/g, to: '31초대 기록' },

    // English & others where numbers are used
    { from: /\b7(\s*)(seconds?|secs?|sekunden|secondes|secondi|segundos|saniye|detik|saat|秒|วินาที)\b/gi, to: '38$1$2' },
    { from: /\b6(\s*)(seconds?|secs?|sekunden|secondes|secondi|segundos|saniye|detik|saat|秒|วินาที)\b/gi, to: '31$1$2' },
    { from: /\b20(\s*)(seconds?|secs?|sekunden|secondes|secondi|segundos|saniye|detik|saat|秒|วินาที)\b/gi, to: '50$1$2' },

    // Catch cases without explicit units but obvious context from 7 or 6
    { from: /in 7 /gi, to: 'in 38 ' },
    { from: /in 6 /gi, to: 'in 31 ' },

    // Special languages translation fixes for 20 -> 50, 7 -> 32/38, 6 -> 31
    // Let's just do a generic number replacement in testimonial strings
];

for (const file of files) {
    const filePath = path.join(localesDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    let json = JSON.parse(content);

    let changed = false;
    for (const key of Object.keys(json)) {
        if (key.startsWith('testimonial')) {
            let original = json[key];
            let updated = original;

            // Replace 20 -> 50, 7 -> 38, 6 -> 31 safely
            // e.g. "20s" -> "50s", "7 seconds" -> "38 seconds"
            updated = updated.replace(/\b20\b/g, '50');
            updated = updated.replace(/\b7\b/g, '38');
            updated = updated.replace(/\b6\b/g, '31');

            if (updated !== original) {
                json[key] = updated;
                changed = true;
            }
        }
    }

    if (changed) {
        fs.writeFileSync(filePath, JSON.stringify(json, null, 2) + '\n', 'utf8');
        console.log(`Updated ${file}`);
    }
}
