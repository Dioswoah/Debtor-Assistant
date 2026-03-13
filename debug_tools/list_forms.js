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

async function listForms() {
    try {
        const res = await fetch(`${SIMPRO_BASE_URL}/api/v1.0/companies/1/invoices/forms/`, {
            headers: {
                "Authorization": `Bearer ${SIMPRO_ACCESS_TOKEN}`,
                "Accept": "application/json"
            }
        });
        if (res.ok) {
            const data = await res.json();
            console.log("All Invoice Forms:");
            data.forEach(f => {
                console.log(`- [${f.ID}] ${f.Name}`);
            });
            fs.writeFileSync('forms_list.json', JSON.stringify(data, null, 2));
        }
    } catch (e) {
        console.log(e);
    }
}

listForms();
