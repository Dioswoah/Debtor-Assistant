
const fs = require('fs');
const path = require('path');

// Basic env loader
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
            // Remove surrounding quotes
            if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
            if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
            process.env[key] = value;
        }
    });
}

const SIMPRO_BASE_URL = process.env.SIMPRO_BASE_URL;
const SIMPRO_ACCESS_TOKEN = process.env.SIMPRO_ACCESS_TOKEN;

async function debugInvoices() {
  if (!SIMPRO_BASE_URL || !SIMPRO_ACCESS_TOKEN) {
      console.log("Missing env vars", { SIMPRO_BASE_URL, SIMPRO_ACCESS_TOKEN });
      return;
  }
  
  try {
    const url = `${SIMPRO_BASE_URL}/api/v1.0/companies/1/invoices/?columns=ID,Total,PaymentTerms,DateIssued&limit=100`;
    console.log("Fetching from:", url);
    const res = await fetch(url, {
        headers: {
        "Authorization": `Bearer ${SIMPRO_ACCESS_TOKEN}`,
        "Accept": "application/json"
        }
    });
    if (!res.ok) {
        console.log("Response error", res.status, await res.text());
        return;
    }
    const invoices = await res.json();
    const today = new Date();
    
    let callListCount = 0;
    let escalationCount = 0;
    let pendingCount = 0;

    invoices.forEach((inv, i) => {
        const balance = inv.Total?.BalanceDue || 0;
        const dueDateStr = inv.PaymentTerms?.DueDate;
        
        let category = "call-list";
        if (balance === 0) {
            category = "pending-verif";
            pendingCount++;
        } else if (dueDateStr) {
            const dueDate = new Date(dueDateStr);
            const diffDays = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 3600 * 24));
            if (diffDays >= 15) {
                category = "escalations";
                escalationCount++;
            } else if (diffDays > 0) {
                category = "call-list";
                callListCount++;
            } else {
                category = "call-list";
                callListCount++;
            }
        } else {
            category = "call-list";
            callListCount++;
        }
    });
    
    console.log(`TOTAL INVOICES FETCHED: ${invoices.length}`);
    console.log(`CALL LIST: ${callListCount}`);
    console.log(`ESCALATIONS: ${escalationCount}`);
    console.log(`PENDING VERIF: ${pendingCount}`);

    console.log("\n--- SAMPLES (Unpaid) ---");
    invoices.filter(inv => (inv.Total?.BalanceDue || 0) > 0).slice(0, 10).forEach(inv => {
        const dueDate = inv.PaymentTerms?.DueDate;
        const diff = dueDate ? Math.floor((today - new Date(dueDate)) / (1000 * 3600 * 24)) : "NO DUE DATE";
        console.log(`INV-${inv.ID} | Balance: ${inv.Total?.BalanceDue} | Due: ${dueDate} | Days Overdue: ${diff}`);
    });

  } catch (err) {
      console.error(err);
  }
}

debugInvoices();
