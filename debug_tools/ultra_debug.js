const fs = require('fs');
const path = require('path');

console.log("Starting debug script...");

const envPath = path.join(__dirname, 'frontend', '.env.local');
console.log("Env path:", envPath);

if (!fs.existsSync(envPath)) {
    console.error("ENV FILE NOT FOUND!");
} else {
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
}

const url = process.env.SIMPRO_BASE_URL;
const token = process.env.SIMPRO_ACCESS_TOKEN;

console.log(`URL: "${url}"`);
console.log(`Token Presence: ${token ? 'YES' : 'NO'}`);

async function run() {
    console.log("Inside async run...");
    try {
        const fetchUrl = `${url}/api/v1.0/companies/1/invoices/forms/`;
        console.log("Fetching:", fetchUrl);
        const res = await fetch(fetchUrl, {
            headers: {
                "Authorization": `Bearer ${token}`,
                "Accept": "application/json"
            }
        });
        console.log("Status:", res.status);
        const data = await res.json();
        console.log("Data length:", data.length);
        if (data.length > 0) {
            console.log("First form name:", data[0].Name);
        }
    } catch (e) {
        console.error("CATCH ERROR:", e.message);
    }
}

run().then(() => console.log("Run finished."));
