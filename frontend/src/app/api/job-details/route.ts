import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get('jobId');
  const invoiceId = searchParams.get('invoiceId');
  const companyId = searchParams.get('companyId') || '1';

  const SIMPRO_BASE_URL = process.env.SIMPRO_BASE_URL;
  const SIMPRO_ACCESS_TOKEN = process.env.SIMPRO_ACCESS_TOKEN;

  try {
    let jobData: any = {};
    let invoiceData: any = {};
    let history: any[] = [];

    // 1. Fetch Job Details if JobID exists
    if (jobId && jobId !== 'No Job Ref') {
      const cleanJobId = jobId.replace('JOB-', '');
      const jobRes = await fetch(`${SIMPRO_BASE_URL}/api/v1.0/companies/${companyId}/jobs/${cleanJobId}`, {
        headers: { "Authorization": `Bearer ${SIMPRO_ACCESS_TOKEN}`, "Accept": "application/json" }
      });
      if (jobRes.ok) jobData = await jobRes.json();

      // Fetch Job Timelines (Full History)
      try {
        const timelinesRes = await fetch(`${SIMPRO_BASE_URL}/api/v1.0/companies/${companyId}/jobs/${cleanJobId}/timelines/`, {
          headers: { "Authorization": `Bearer ${SIMPRO_ACCESS_TOKEN}`, "Accept": "application/json" }
        });
        if (timelinesRes.ok) {
          const timelines = await timelinesRes.json();
          history = timelines.map((t: any) => ({
            date: t.DateCreated || t.Date || "N/A",
            author: t.Creator?.Name || t.Staff?.Name || "SimPRO User",
            text: t.Message || t.Note || t.Description || ""
          }));
        }
      } catch (err) { console.warn("Failed fetch timelines", err); }
    }

    // 2. Fetch Detailed Invoice Info (Computation, Salesperson, Quote)
    if (invoiceId) {
      const cleanInvId = invoiceId.replace('INV-', '');
      
      // We use a custom fetch pattern for deeper details (matching our logic.py refinement)
      const invRes = await fetch(`${SIMPRO_BASE_URL}/api/v1.0/companies/${companyId}/invoices/${cleanInvId}`, {
        headers: { "Authorization": `Bearer ${SIMPRO_ACCESS_TOKEN}`, "Accept": "application/json" }
      });
      
      if (invRes.ok) {
        invoiceData = await invRes.json();
        
        // Fetch salesperson and quote if not already on jobData from job fetch
        if (!jobData.Salesperson && invoiceData.Jobs && invoiceData.Jobs.length > 0) {
            const jid = invoiceData.Jobs[0].ID;
            const jRes = await fetch(`${SIMPRO_BASE_URL}/api/v1.0/companies/${companyId}/jobs/${jid}`, {
                headers: { "Authorization": `Bearer ${SIMPRO_ACCESS_TOKEN}`, "Accept": "application/json" }
            });
            if (jRes.ok) {
                const jd = await jRes.json();
                invoiceData.Salesperson = jd.Salesperson?.Name || 'N/A';
                invoiceData.QuoteNo = jd.Quote?.ID || 'N/A';
            }
        } else if (jobData.Salesperson) {
            invoiceData.Salesperson = jobData.Salesperson?.Name || 'N/A';
            invoiceData.QuoteNo = jobData.Quote?.ID || 'N/A';
        }

        // Extract Items from Cost Centers or top-level Items array
        if (invoiceData.CostCenters && Array.isArray(invoiceData.CostCenters) && invoiceData.CostCenters.length > 0) {
          invoiceData.Sections = invoiceData.CostCenters.map((cc: any) => ({
            Name: cc.Name,
            Items: cc.Items || []
          }));
        } else if (invoiceData.Items && Array.isArray(invoiceData.Items)) {
          invoiceData.Sections = [{
            Name: "Invoice Items",
            Items: invoiceData.Items
          }];
        }
      }
    }
    // 3. Fetch Full Contact Information (Customer & Site)
    let customerContacts: any[] = [];
    let siteContacts: any[] = [];
    let sitePhone = "N/A";
    let siteEmail = "N/A";
    let customerMainPhone = "N/A";
    let customerMainEmail = "N/A";

    // Fetch Customer Contacts
    const customerId = jobData.Customer?.ID || invoiceData.Customer?.ID;
    if (customerId) {
        try {
            // Fetch main customer details as fallback
            const custRes = await fetch(`${SIMPRO_BASE_URL}/api/v1.0/companies/${companyId}/customers/companies/${customerId}`, {
                headers: { "Authorization": `Bearer ${SIMPRO_ACCESS_TOKEN}`, "Accept": "application/json" }
            });
            if (custRes.ok) {
                const cMap = await custRes.json();
                customerMainPhone = cMap.Phone || cMap.AltPhone || "N/A";
                customerMainEmail = cMap.Email || "N/A";
            }

            const custContactsRes = await fetch(`${SIMPRO_BASE_URL}/api/v1.0/companies/${companyId}/customers/${customerId}/contacts/`, {
                headers: { "Authorization": `Bearer ${SIMPRO_ACCESS_TOKEN}`, "Accept": "application/json" }
            });
            if (custContactsRes.ok) {
                const data = await custContactsRes.json();
                customerContacts = data.map((c: any) => ({
                    name: [c.GivenName, c.FamilyName].filter(Boolean).join(' ') || c.Position || "Unnamed Contact",
                    phone: c.Phone || c.Cellular || c.WorkPhone || c.AltPhone || customerMainPhone,
                    email: c.Email || c.AltEmail || customerMainEmail
                }));
            }
        } catch (err) { console.warn("Failed fetch customer contacts", err); }
    }

    // Fetch Site Contacts & Site Object
    const siteId = jobData.Site?.ID;
    if (siteId) {
        try {
            // Fetch Site Details
            const siteRes = await fetch(`${SIMPRO_BASE_URL}/api/v1.0/companies/${companyId}/sites/${siteId}`, {
                headers: { "Authorization": `Bearer ${SIMPRO_ACCESS_TOKEN}`, "Accept": "application/json" }
            });
            if (siteRes.ok) {
                const sd = await siteRes.json();
                sitePhone = sd.Phone || sd.AltPhone || "N/A";
                siteEmail = sd.Email || "N/A";
            }

            const siteContactsRes = await fetch(`${SIMPRO_BASE_URL}/api/v1.0/companies/${companyId}/sites/${siteId}/contacts/`, {
                headers: { "Authorization": `Bearer ${SIMPRO_ACCESS_TOKEN}`, "Accept": "application/json" }
            });
            if (siteContactsRes.ok) {
                const data = await siteContactsRes.json();
                siteContacts = data.map((c: any) => ({
                    name: [c.GivenName, c.FamilyName].filter(Boolean).join(' ') || c.Position || "Site Contact",
                    phone: c.Phone || c.Cellular || c.WorkPhone || c.AltPhone || sitePhone,
                    email: c.Email || c.AltEmail || siteEmail
                }));
            }
        } catch (err) { console.warn("Failed fetch site contacts", err); }
    }

    return NextResponse.json({
        description: jobData.Description || "No description provided.",
        notes: jobData.Notes || "",
        status: jobData.Status?.Name || "Unknown",
        site: jobData.Site?.Name || "Unknown Site",
        orderNo: jobData.CustomerOrderNo || invoiceData.OrderNo || "N/A",
        salesperson: invoiceData.Salesperson || "N/A",
        quoteNo: invoiceData.QuoteNo || "N/A",
        sections: invoiceData.Sections || [],
        invoiceTotals: invoiceData.Total || null,
        customerContacts: customerContacts,
        siteContacts: siteContacts,
        sitePhone: sitePhone,
        siteEmail: siteEmail,
        history: history.length > 0 ? history : [
          { date: new Date().toLocaleDateString(), author: "System AI", text: "No detailed history found." }
        ]
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
