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
                "Authorization": `Bearer ${SIMPRO_ACCESS_TOKEN}`,
                "Accept": "application/json"
            }
        });
        if (response.ok) {
            const data = await response.json();
            console.log(`Success! Result:`, JSON.stringify(data, null, 2).substring(0, 1500));
        } else {
            console.log(`Failed: ${response.status} ${response.statusText}`);
            const text = await response.text();
            console.log(`Response: ${text.substring(0, 500)}`);
        }
    } catch (e) {
        console.log(`Error: ${e.message}`);
    }
}

async function run() {
    if (!SIMPRO_BASE_URL || !SIMPRO_ACCESS_TOKEN) {
        console.log("Missing env vars");
        return;
    }
    // Most likely endpoints for Late Payment settings (where L1/L2 usually are)
    await testEndpoint('/api/v1.0/setup/accounts/latePayments/'); // Note the 's'
    await testEndpoint('/api/v1.0/setup/accounts/latePayment/');
    await testEndpoint('/api/v1.0/setup/forms/invoices/');
    // Also check scripts
    await testEndpoint('/api/v1.0/setup/scripts/');
}

run();
