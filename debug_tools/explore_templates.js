const SIMPRO_BASE_URL = process.env.SIMPRO_BASE_URL;
const SIMPRO_ACCESS_TOKEN = process.env.SIMPRO_ACCESS_TOKEN;

async function testEndpoint(endpoint) {
    console.log(`Testing: ${endpoint}`);
    try {
        const response = await fetch(`${SIMPRO_BASE_URL}${endpoint}`, {
            headers: {
                "Authorization": `Bearer ${SIMPRO_ACCESS_TOKEN}`,
                "Accept": "application/json"
            }
        });
        if (response.ok) {
            const data = await response.json();
            console.log(`Success:`, JSON.stringify(data, null, 2).substring(0, 1000));
        } else {
            console.log(`Failed: ${response.status} ${response.statusText}`);
        }
    } catch (e) {
        console.log(`Error: ${e.message}`);
    }
}

async function run() {
    await testEndpoint('/api/v1.0/setup/accounts/latePayment/');
    await testEndpoint('/api/v1.0/setup/accounts/invoices/forms/');
    await testEndpoint('/api/v1.0/setup/accounts/forms/');
}

run();
