import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const invoiceId = searchParams.get('invoiceId');
  const companyId = searchParams.get('companyId') || '1';

  const SIMPRO_BASE_URL = process.env.SIMPRO_BASE_URL;
  const SIMPRO_ACCESS_TOKEN = process.env.SIMPRO_ACCESS_TOKEN;

  if (!invoiceId) {
    return NextResponse.json({ error: "Missing invoiceId" }, { status: 400 });
  }

  try {
    const cleanId = invoiceId.replace('INV-', '');
    const url = `${SIMPRO_BASE_URL}/api/v1.0/companies/${companyId}/invoices/${cleanId}/notes/`;
    
    const res = await fetch(url, {
      headers: {
        "Authorization": `Bearer ${SIMPRO_ACCESS_TOKEN}`,
        "Accept": "application/json"
      }
    });
    
    if (!res.ok) {
        return NextResponse.json({ error: "Failed to fetch invoice logs" }, { status: res.status });
    }

    const data = await res.json();
    
    // Transform SimPRO notes to expected Log format
    const transformed = Array.isArray(data) ? data.map((n: any) => ({
        Author: { Name: n.CreatedBy?.Name || "System" },
        DateCreated: n.DateCreated,
        Message: n.Text || n.Subject || "No content"
    })) : [];

    return NextResponse.json(transformed);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
