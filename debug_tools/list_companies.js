const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, 'frontend', '.env.local');
const content = fs.readFileSync(envPath, 'utf8');
content.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
        const key = parts[0].trim();
        let value = parts.slice(1).join('=').trim();
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        process.env[key] = value;
    }
});

const url = process.env.SIMPRO_BASE_URL;
const token = process.env.SIMPRO_ACCESS_TOKEN;

async function run() {
    try {
        const res = await fetch(`${url}/api/v1.0/companies/`, {
            headers: {
                "Authorization": `Bearer ${token}`,
                "Accept": "application/json"
            }
        });
        console.log("Companies Status:", res.status);
        const data = await res.json();
        console.log("Companies:", JSON.stringify(data, null, 2));
    } catch (e) {
        console.error(e);
    }
}

run();
