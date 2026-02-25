const fs = require('fs');
const path = require('path');

const commandsPath = 'C:\\Users\\Administrator\\Desktop\\bot\\src\\commands';
let results = [];

function walk(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const f of files) {
        const fullPath = path.join(dir, f);
        if (fs.statSync(fullPath).isDirectory()) {
            walk(fullPath);
        } else if (f.endsWith('.js')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            const nameMatch = content.match(/\.setName\(['"`](.+?)['"`]\)/);
            if (nameMatch) {
                const descMatch = content.match(/\.setDescription\(['"`](.+?)['"`]\)/);
                const desc = descMatch ? descMatch[1] : '';
                // Simple logic for Tier distribution purely for visual demo:
                let tier = 'Premium';
                if (Math.random() > 0.6) tier = 'Free';
                if (Math.random() > 0.8) tier = 'Enterprise';

                results.push(`            { name: '${nameMatch[1]}', desc: '${desc.replace(/'/g, "\\'")}', tier: '${tier}' }`);
            }
        }
    }
}
walk(commandsPath);
const outPath = 'C:\\Users\\Administrator\\Desktop\\bot\\Hacka\\extracted_commands.txt';
fs.writeFileSync(outPath, results.join(',\n'), 'utf8');
console.log("Done extracting " + results.length + " commands.");
