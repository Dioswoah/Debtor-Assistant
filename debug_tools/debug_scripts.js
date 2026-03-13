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

async function checkScripts() {
    console.log("Checking scripts at:", SIMPRO_BASE_URL);
    try {
        const res = await fetch(`${SIMPRO_BASE_URL}/api/v1.0/setup/scripts/`, {
            headers: {
                "Authorization": `Bearer ${SIMPRO_ACCESS_TOKEN}`,
                "Accept": "application/json"
            }
        });
        if (res.ok) {
            const data = await res.json();
            console.log("API Result (first 10 scripts):");
            data.slice(0, 10).forEach(s => {
                console.log(`- ID: ${s.ID}, Name: "${s.Name}"`);
            });
            fs.writeFileSync('scripts_debug.json', JSON.stringify(data, null, 2));
        } else {
            console.log("Error status:", res.status);
            console.log("Text:", await res.text());
        }
    } catch (e) {
        console.log("Fetch Error:", e.message);
    }
}

checkScripts();
