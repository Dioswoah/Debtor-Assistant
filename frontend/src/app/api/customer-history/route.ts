import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const customerId = searchParams.get('customerId');
  const companyId = searchParams.get('companyId') || '1';
  const page = searchParams.get('page') || '1';
  const limit = searchParams.get('limit') || '10';

  const SIMPRO_BASE_URL = process.env.SIMPRO_BASE_URL;
  const SIMPRO_ACCESS_TOKEN = process.env.SIMPRO_ACCESS_TOKEN;

  if (!customerId) {
    return NextResponse.json({ error: "Missing customerId" }, { status: 400 });
  }

  try {
    const url = `${SIMPRO_BASE_URL}/api/v1.0/companies/${companyId}/customers/${customerId}/invoices/?page=${page}&pageSize=${limit}&columns=ID,DateIssued,Total,IsPaid,PaymentTerms`;
    
    const res = await fetch(url, {
      headers: {
        "Authorization": `Bearer ${SIMPRO_ACCESS_TOKEN}`,
        "Accept": "application/json"
      }
    });
    
    if (!res.ok) {
        return NextResponse.json({ error: "Failed to fetch customer invoices" }, { status: res.status });
    }

    const data = await res.json();
    const totalCount = res.headers.get('xc-total-count') || data.length;

    return NextResponse.json({
        invoices: data,
        total: parseInt(totalCount.toString())
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
