const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, 'frontend', '.env.local');
const envPathAlt = path.join(__dirname, 'frontend', '.env');
const targetPath = fs.existsSync(envPath) ? envPath : envPathAlt;

if (fs.existsSync(targetPath)) {
    const content = fs.readFileSync(targetPath, 'utf8');
    content.split('\n').forEach(line => {
        const parts = line.split('=');
        if (parts.length >= 2) {
            const key = parts[0].trim();
            let value = parts.slice(1).join('=').trim();
            if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
            if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
            process.env[key] = value;
        }
    });
}

const SIMPRO_BASE_URL = process.env.SIMPRO_BASE_URL;
const SIMPRO_ACCESS_TOKEN = process.env.SIMPRO_ACCESS_TOKEN;

async function testEndpoint(endpoint) {
    console.log(`\n--- Testing: ${endpoint} ---`);
    try {
        const response = await fetch(`${SIMPRO_BASE_URL}${endpoint}`, {
            headers: {
                "Authorization": f`Bearer ${SIMPRO_ACCESS_TOKEN}`, // Wait, typo here in prev script too? No, it was single quote.
                "Accept": "application/json"
            }
        });
        // ... (rest of logic)
    } catch(e) {}
}
