import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = searchParams.get('limit') || '100';
  const startDate = searchParams.get('startDate'); // YYYY-MM-DD
  const endDate = searchParams.get('endDate');     // YYYY-MM-DD
  const companyId = searchParams.get('companyId') || '1';

  const SIMPRO_BASE_URL = process.env.SIMPRO_BASE_URL;
  const SIMPRO_ACCESS_TOKEN = process.env.SIMPRO_ACCESS_TOKEN;

  const customerCache = new Map();

  if (!SIMPRO_BASE_URL || !SIMPRO_ACCESS_TOKEN) {
    return NextResponse.json({ error: "Missing SimPRO configuration in environment variables." }, { status: 500 });
  }

  try {
    // 0. Fetch Setup Payment Terms for Name Mapping
    let paymentTermsMap = new Map();
    let defaultTermName = "N/A";
    try {
        const termsRes = await fetch(`${SIMPRO_BASE_URL}/api/v1.0/companies/${companyId}/setup/accounts/paymentTerms/`, {
            headers: { "Authorization": `Bearer ${SIMPRO_ACCESS_TOKEN}`, "Accept": "application/json" }
        });
        if (termsRes.ok) {
            const termsList = await termsRes.json();
            if (Array.isArray(termsList)) {
                termsList.forEach((t: any) => {
                    const id = t.PaymentTermID || t.ID;
                    const name = t.PaymentTermName || t.Name;
                    if (id && name) {
                        paymentTermsMap.set(String(id), name);
                        if (t.IsDefault) defaultTermName = name;
                    }
                });
            }
        }
    } catch (e) { console.warn("Failed to fetch setup terms", e); }

    // 1. Build Query Parameters for SimPRO
    let queryParams = `columns=ID,Type,Customer,Jobs,Total,IsPaid,DateIssued,PaymentTerms,Period,OrderNo&limit=${limit}`;
    
    if (startDate) {
      queryParams += `&DateIssued=ge,${startDate}`;
    }
    if (endDate) {
      queryParams += `&DateIssued=le,${endDate}`;
    }

    const url = `${SIMPRO_BASE_URL}/api/v1.0/companies/${companyId}/invoices/?${queryParams}`;
    
    const invoicesRes = await fetch(url, {
      headers: {
        "Authorization": `Bearer ${SIMPRO_ACCESS_TOKEN}`,
        "Accept": "application/json"
      }
    });
    
    if (!invoicesRes.ok) {
      const errorText = await invoicesRes.text();
      console.error("SimPRO Invoices Error:", errorText);
      throw new Error(`Failed to fetch invoices: ${invoicesRes.status} ${errorText}`);
    }
    const invoices = await invoicesRes.json();
    
    // Process slices based on requested limit
    const recentInvoices = invoices.slice(0, parseInt(limit));
    
    const today = new Date();

    // Map them to the TriageItem format used by the frontend
    const triageData = await Promise.all(recentInvoices.map(async (inv: any, index: number) => {
      const balance = inv.Total?.BalanceDue || 0;
      const dueDateStr = inv.PaymentTerms?.DueDate;
      
      let category = "call-list";
      let tag = "Active Call";
      let tagColor = "primary";
      let script = "Hi, following up on the recent invoice.";
      let agingText = "Pending";

      if (balance === 0) {
        category = "pending-verif";
        tag = "Verification";
        tagColor = "success";
        script = "Check if finance has verified this paid invoice.";
        agingText = "Closed";
      } else if (dueDateStr) {
        const dueDate = new Date(dueDateStr);
        const diffDays = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 3600 * 24));
        
        if (diffDays > 14) {
          category = "escalations";
          tag = "Warning";
          tagColor = "warning";
          script = `Hi, this invoice is subject to L1/L2 notice. What is the status?`;
          agingText = `${diffDays} Days Overdue`;
        } else if (diffDays >= 1) {
          category = "call-list";
          tag = "Remind";
          tagColor = "primary";
          script = `Friendly reminder: this invoice is ${diffDays} days overdue.`;
          agingText = `${diffDays} Days Overdue`;
        } else {
          category = "call-list";
          tag = "Upcoming";
          tagColor = "primary";
          script = "Hi, just a friendly reminder of the upcoming due date.";
          agingText = "Not Due Yet";
        }
      } else {
        // No due date? Keep as call list
        category = "call-list";
        tag = "No Due Date";
        agingText = "Unknown";
      }
      
      // Fetch Customer Info to get email/phone/terms
      let contactPhone = "N/A";
      let contactEmail = "N/A";
      let contactName = inv.Customer?.CompanyName || inv.Customer?.GivenName ? `${inv.Customer?.GivenName} ${inv.Customer?.FamilyName}`.trim() : "Potential Contact";
      let paymentTermsName = inv.PaymentTerms?.Name || "N/A";
      
      // Try to resolve name from map if missing
      if (paymentTermsName === "N/A" && inv.PaymentTerms?.ID) {
          paymentTermsName = paymentTermsMap.get(String(inv.PaymentTerms.ID)) || "N/A";
      }
      
      // Fallback: If we have Days but no name yet, use Days
      if (paymentTermsName === "N/A" && inv.PaymentTerms?.Days) {
          paymentTermsName = `${inv.PaymentTerms.Days} Days`;
      }

      let allContacts: any[] = [];
      
      try {
        const custId = inv.Customer?.ID;
        if (custId) {
          if (customerCache.has(custId)) {
            const cachedData = customerCache.get(custId);
            contactPhone = cachedData.phone;
            contactEmail = cachedData.email;
            contactName = cachedData.name;
            allContacts = cachedData.contacts || [];
            if (paymentTermsName === "N/A") paymentTermsName = cachedData.paymentTerms || "N/A";
          } else {
            // Fetch Customer Details (Try Company then Individual)
            let custRes = await fetch(`${SIMPRO_BASE_URL}/api/v1.0/companies/${companyId}/customers/companies/${custId}`, {
              headers: { "Authorization": `Bearer ${SIMPRO_ACCESS_TOKEN}`, "Accept": "application/json" }
            });
            
            if (!custRes.ok) {
              custRes = await fetch(`${SIMPRO_BASE_URL}/api/v1.0/companies/${companyId}/customers/individuals/${custId}`, {
                headers: { "Authorization": `Bearer ${SIMPRO_ACCESS_TOKEN}`, "Accept": "application/json" }
              });
            }
 
            if (custRes.ok) {
              const cust = await custRes.json();
              contactPhone = cust.Phone || cust.AltPhone || "N/A";
              contactEmail = cust.Email || "N/A";
              
              if (paymentTermsName === "N/A") {
                // Try various field names for payment terms in customer record
                const cp = cust.PaymentTerms;
                if (typeof cp === 'object' && cp !== null) {
                    paymentTermsName = cp.Name || cp.PaymentTermName || "N/A";
                     if (paymentTermsName === "N/A" && cp.ID) {
                        paymentTermsName = paymentTermsMap.get(String(cp.ID)) || "N/A";
                    } else if (paymentTermsName === "N/A" && cp.PaymentTermID) {
                        paymentTermsName = paymentTermsMap.get(String(cp.PaymentTermID)) || "N/A";
                    }
                } else if (typeof cp === 'number' || typeof cp === 'string') {
                    paymentTermsName = paymentTermsMap.get(String(cp)) || "N/A";
                }
              }

              // If we have a person name in the individual record, use it
              if (cust.GivenName) {
                contactName = `${cust.GivenName} ${cust.FamilyName}`.trim();
              }
 
              // Also fetch multi-contacts sub-resource
              try {
                const contactsRes = await fetch(`${SIMPRO_BASE_URL}/api/v1.0/companies/${companyId}/customers/${custId}/contacts/`, {
                  headers: { "Authorization": `Bearer ${SIMPRO_ACCESS_TOKEN}`, "Accept": "application/json" }
                });
                
                if (contactsRes.ok) {
                  const fetchedContacts = await contactsRes.json();
                  if (Array.isArray(fetchedContacts) && fetchedContacts.length > 0) {
                    allContacts = fetchedContacts.map((c: any) => ({
                      name: `${c.GivenName} ${c.FamilyName}`.trim(),
                      phone: c.Phone || "N/A",
                      email: c.Email || "N/A"
                    }));
                    const primary = allContacts[0];
                    contactName = primary.name;
                    if (primary.phone !== "N/A") contactPhone = primary.phone;
                    if (primary.email !== "N/A") contactEmail = primary.email;
                  }
                }
              } catch (cErr) {
                console.warn("Failed to fetch sub-contacts", cErr);
              }
            }
            customerCache.set(custId, { 
                phone: contactPhone, 
                email: contactEmail, 
                name: contactName, 
                contacts: allContacts,
                paymentTerms: paymentTermsName
            });
          }
        }
      } catch (err) {
        console.error("Error fetching customer details", err);
      }

      let salesperson = "N/A";
      let quoteNo = "N/A";
      let jobOrderNo = "N/A";
      try {
        if (inv.Jobs && inv.Jobs.length > 0) {
            const jobId = inv.Jobs[0].ID;
            const jobRes = await fetch(`${SIMPRO_BASE_URL}/api/v1.0/companies/${companyId}/jobs/${jobId}`, {
                headers: { "Authorization": `Bearer ${SIMPRO_ACCESS_TOKEN}`, "Accept": "application/json" }
            });
            if (jobRes.ok) {
                const job = await jobRes.json();
                salesperson = job.Salesperson?.Name || "N/A";
                quoteNo = job.Quote?.ID || "N/A";
                jobOrderNo = job.CustomerOrderNo || "N/A";
            }
        }
      } catch (err) {
        console.warn("Error fetching job info for salesperson", err);
      }

      return {
        id: `INV-${inv.ID}`,
        invoiceId: inv.ID,
        customerId: inv.Customer?.ID,
        jobNo: inv.Jobs && inv.Jobs.length > 0 ? `JOB-${inv.Jobs[0].ID}` : 'No Job Ref',
        client: inv.Customer?.CompanyName || `${inv.Customer?.GivenName} ${inv.Customer?.FamilyName}`.trim() || "Unknown Client",
        tag: tag,
        tagColor: tagColor,
        aging: agingText,
        amount: `$${(inv.Total?.IncTax || 0).toFixed(2)}`,
        context: balance > 0 ? "Outstanding balance detected directly from SimPRO" : "Invoice is fully paid",
        script: script,
        category: category,
        contact: contactPhone,
        contactName: contactName,
        contacts: allContacts,
        email: contactEmail,
        invoiceDate: inv.DateIssued || "N/A",
        invoiceDueDate: inv.PaymentTerms?.DueDate || "N/A",
        jobStartDate: inv.Period?.StartDate || "N/A",
        jobEndDate: inv.Period?.EndDate || "N/A",
        // Fallback: Use Job's CustomerOrderNo, then Invoice's OrderNo
        orderNo: jobOrderNo !== "N/A" ? jobOrderNo : (inv.OrderNo || "N/A"),
        salesperson: salesperson,
        quoteNo: quoteNo,
        paymentTermsName: paymentTermsName !== "N/A" ? paymentTermsName : defaultTermName,
        history: [
          { date: new Date().toLocaleDateString(), author: "System AI", text: "Auto-synced from SimPRO API MCP tool." }
        ]
      };
    }));

    return NextResponse.json(triageData);
  } catch (error: any) {
    console.error("SimPRO API Error", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
