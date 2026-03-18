import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get('companyId') || '1';
  const SIMPRO_BASE_URL = process.env.SIMPRO_BASE_URL;
  const SIMPRO_ACCESS_TOKEN = process.env.SIMPRO_ACCESS_TOKEN;

  if (!SIMPRO_BASE_URL || !SIMPRO_ACCESS_TOKEN) {
    console.error("Templates API missing env vars:", { SIMPRO_BASE_URL, hasToken: !!SIMPRO_ACCESS_TOKEN });
    return NextResponse.json({ error: "Missing SimPRO configuration" }, { status: 500 });
  }

  const baseUrl = SIMPRO_BASE_URL.trim().endsWith('/') ? SIMPRO_BASE_URL.trim().slice(0, -1) : SIMPRO_BASE_URL.trim();
  console.log("Templates API using baseUrl:", baseUrl);

  try {
    let scripts = [];
    try {
      const res = await fetch(`${baseUrl}/api/v1.0/setup/scripts/`, {
        headers: {
          "Authorization": `Bearer ${SIMPRO_ACCESS_TOKEN}`,
          "Accept": "application/json"
        }
      });
      if (res.ok) scripts = await res.json();
    } catch (e) {
      console.warn("Could not fetch scripts", e);
    }

    let forms = [];
    try {
      const formsRes = await fetch(`${baseUrl}/api/v1.0/companies/${companyId}/invoices/forms/`, {
          headers: {
            "Authorization": `Bearer ${SIMPRO_ACCESS_TOKEN}`,
            "Accept": "application/json"
          }
      });
      if (formsRes.ok) forms = await formsRes.json();
    } catch (e) {
      console.warn("Could not fetch forms", e);
    }

    let latePayment = null;
    try {
      const lpRes = await fetch(`${baseUrl}/api/v1.0/companies/${companyId}/setup/accounts/latePayment/`, {
          headers: {
            "Authorization": `Bearer ${SIMPRO_ACCESS_TOKEN}`,
            "Accept": "application/json"
          }
      });
      if (lpRes.ok) latePayment = await lpRes.json();
    } catch (e) {
      console.warn("Could not fetch latePayment", e);
    }

    return NextResponse.json({ scripts, forms, latePayment });
  } catch (error: any) {
    console.error("Templates API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
