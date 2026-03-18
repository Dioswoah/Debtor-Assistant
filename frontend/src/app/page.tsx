"use client";

import { useState, useEffect } from "react";
import { Phone, Clock, AlertTriangle, CheckCircle, ArrowLeft, X, FileText, Briefcase, MailWarning, Loader2, User, CreditCard } from "lucide-react";
import { useCompany } from "@/context/CompanyContext";

type TriageItem = {
  id: string; // Invoice number
  jobNo: string; // Job Number
  client: string;
  tag: string;
  tagColor: string;
  aging: string;
  amount: string;
  context: string;
  script: string;
  category: "call-list" | "escalations" | "pending-verif";
  contact: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  contacts?: { name: string, phone: string, email: string }[];
  email: string;
  invoiceDate: string;
  invoiceDueDate: string;
  jobStartDate: string;
  jobEndDate: string;
  orderNo: string;
  salesperson?: string;
  quoteNo?: string;
  paymentTermsName: string;
  customerId?: string;
  invoiceId?: number;
  history: { date: string, author: string, text: string }[];
};

// Global cache to persist data across tab switches within the same session
let cachedTriage: TriageItem[] | null = null;
let cachedParams: string = "";

// Helper to decode HTML entities or clean SimPRO strings for display in text fields
const cleanSimproText = (text: string) => {
  if (!text) return "";
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&ldquo;/g, '"')
    .replace(/&rdquo;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/<\/?[^>]+(>|$)/g, " ") // Fallback strip tags for plain text areas
    .trim();
};


export default function Dashboard() {
  const { selectedCompany } = useCompany();
  const [currentView, setCurrentView] = useState<"dashboard" | "call-list" | "escalations" | "pending-verif">("dashboard");
  const [selectedJob, setSelectedJob] = useState<TriageItem | null>(null);
  const [selectedJobDetails, setSelectedJobDetails] = useState<{
    description: string, 
    notes: string,
    status: string, 
    site: string, 
    orderNo: string, 
    salesperson?: string,
    quoteNo?: string,
    sections?: any[],
    invoiceTotals?: any,
    customerContacts?: { name: string, phone: string, email: string }[],
    siteContacts?: { name: string, phone: string, email: string }[],
    sitePhone?: string,
    siteEmail?: string,
    history: any[]
  } | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"details" | "computation" | "history">("details");

  const [triageList, setTriageList] = useState<TriageItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  
  // Filtering States
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortBy, setSortBy] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc" | "">("");
  const [fetchLimit, setFetchLimit] = useState(100);
  
  // Private User Notes (saved to localStorage)
  const [privateNotes, setPrivateNotes] = useState<Record<string, string>>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("debtor_private_notes");
      return saved ? JSON.parse(saved) : {};
    }
    return {};
  });

  const [historyModalItem, setHistoryModalItem] = useState<TriageItem | null>(null);
  const [historyActiveTab, setHistoryActiveTab] = useState<"invoice" | "company">("invoice");
  const [invoiceLogs, setInvoiceLogs] = useState<any[]>([]);
  const [companyHistory, setCompanyHistory] = useState<any[]>([]);
  const [companyHistoryTotal, setCompanyHistoryTotal] = useState(0);
  const [companyHistoryPage, setCompanyHistoryPage] = useState(1);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchInvoiceLogs = async (invoiceId: string) => {
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/invoice-logs?invoiceId=${invoiceId}&companyId=${selectedCompany?.id || '1'}`);
      if (res.ok) {
        const data = await res.json();
        setInvoiceLogs(data);
      }
    } catch (e) {
      console.error("Failed to fetch logs", e);
    } finally {
      setHistoryLoading(false);
    }
  };

  const fetchCompanyHistory = async (customerId: string, page: number = 1) => {
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/customer-history?customerId=${customerId}&companyId=${selectedCompany?.id || '1'}&page=${page}&limit=10`);
      if (res.ok) {
        const data = await res.json();
        setCompanyHistory(data.invoices || []);
        setCompanyHistoryTotal(data.total || 0);
      }
    } catch (e) {
      console.error("Failed to fetch customer history", e);
    } finally {
      setHistoryLoading(false);
    }
  };

  const openHistoryModal = (item: TriageItem) => {
    setHistoryModalItem(item);
    setHistoryActiveTab("invoice");
    setInvoiceLogs([]);
    setCompanyHistory([]);
    setCompanyHistoryPage(1);
    fetchInvoiceLogs(item.id);
  };

  useEffect(() => {
    if (historyModalItem && historyActiveTab === "company") {
        fetchCompanyHistory(historyModalItem.customerId as string, companyHistoryPage);
    } else if (historyModalItem && historyActiveTab === "invoice") {
        fetchInvoiceLogs(historyModalItem.id);
    }
  }, [historyActiveTab, companyHistoryPage, historyModalItem]);

  const updateNote = (id: string, text: string) => {
    setPrivateNotes(prev => {
      const newNotes = { ...prev, [id]: text };
      localStorage.setItem("debtor_private_notes", JSON.stringify(newNotes));
      return newNotes;
    });
  };

  const [toast, setToast] = useState<{ message: string, type: 'info' | 'success' } | null>(null);
  const [templates, setTemplates] = useState<{scripts: any[], forms: any[], latePayment: any | null}>({scripts: [], forms: [], latePayment: null});
  const [showEmailModal, setShowEmailModal] = useState<TriageItem | null>(null);

  const [templatesLoading, setTemplatesLoading] = useState(false);

  const fetchTemplates = async () => {
    setTemplatesLoading(true);
    try {
      const res = await fetch(`/api/templates?companyId=${selectedCompany.id}`);
      if (res.ok) {
        const data = await res.json();
        setTemplates(data);
      }
    } catch (err) {
      console.error("Failed to fetch templates", err);
    } finally {
      setTemplatesLoading(false);
    }
  };

  const getTemplate = (type: 'L1' | 'L2') => {
      // 1. Check Late Payment Stages if available
      if (templates.latePayment?.Stages) {
          const stage = templates.latePayment.Stages.find((s: any) => s.Name?.includes(type));
          if (stage?.Message) return stage.Message;
      }
      // 2. Check Scripts
      const script = templates.scripts.find(s => s.Name?.includes(type));
      if (script?.Note) return script.Note;

      // 3. Fallback
      if (type === 'L1') {
          return `Hi ${showEmailModal?.client || 'Customer'},\n\nThis is a friendly courtesy reminder that Invoice ${showEmailModal?.id || ''} is now due for payment. We appreciate your prompt attention to this.\n\nRegards,\nAccounts Team`;
      } else {
          return `Hi ${showEmailModal?.client || 'Customer'},\n\nOur records show that Invoice ${showEmailModal?.id || ''} is now considerably overdue. Please arrange for immediate payment to avoid further escalation.\n\nRegards,\nCollections Team`;
      }
  };

  const triggerSoonToast = () => {
    setToast({ message: "📧 Direct emailing from this app is coming soon! For now, please use the templates below.", type: 'info' });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch real SimPRO triage data
  useEffect(() => {
    const currentParams = JSON.stringify({ fetchLimit, startDate, endDate, companyId: selectedCompany.id });

    async function fetchTriageData() {
      // If we have cached data and params haven't changed, use the cache
      if (cachedTriage && cachedParams === currentParams) {
        setTriageList(cachedTriage);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        let url = `/api/triage?limit=${fetchLimit}&companyId=${selectedCompany.id}`;
        if (startDate) url += `&startDate=${startDate}`;
        if (endDate) url += `&endDate=${endDate}`;
        
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setTriageList(data);
          // Update the global cache
          cachedTriage = data;
          cachedParams = currentParams;
        } else {
          console.error("Failed to fetch SimPRO data");
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchTriageData();
  }, [fetchLimit, startDate, endDate, selectedCompany.id]);

  // Fetch Full Job Details when selected
  useEffect(() => {
    if (!selectedJob || selectedJob.jobNo === "No Job Ref") {
        setSelectedJobDetails(null);
        return;
    }

    async function fetchJobDetails() {
        setDetailsLoading(true);
        setActiveTab("details"); // Reset tab
        try {
            const res = await fetch(`/api/job-details?jobId=${selectedJob?.jobNo}&invoiceId=${selectedJob?.id}&companyId=${selectedCompany.id}`);
            if (res.ok) {
                const data = await res.json();
                setSelectedJobDetails(data);
            }
        } catch (err) {
            console.error("Failed to fetch job details", err);
        } finally {
            setDetailsLoading(false);
        }
    }
    fetchJobDetails();
    fetchTemplates();
  }, [selectedJob]);

  // Helper counts
  const counts = {
    "call-list": triageList.filter(i => i.category === "call-list").length,
    "escalations": triageList.filter(i => i.category === "escalations").length,
    "pending-verif": triageList.filter(i => i.category === "pending-verif").length,
  };

  const getFilteredList = () => {
    const filtered = triageList.filter(item => {
      // Category filter
      if (currentView !== "dashboard" && item.category !== currentView) return false;
      
      // Search filter
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        item.id.toLowerCase().includes(searchLower) || 
        item.client.toLowerCase().includes(searchLower) ||
        item.jobNo.toLowerCase().includes(searchLower);
      
      if (!matchesSearch) return false;
      
      // Date range filter
      if (startDate) {
        if (new Date(item.invoiceDate) < new Date(startDate)) return false;
      }
      if (endDate) {
        if (new Date(item.invoiceDate) > new Date(endDate)) return false;
      }
      
      return true;
    });

    // Sorting Logic
    if (!sortBy || !sortOrder) return filtered;

    return filtered.sort((a, b) => {
      let comparison = 0;
      
      if (sortBy === "aging") {
        const ageA = a.aging.includes("Days") ? parseInt(a.aging) : (a.aging === "Closed" ? -100 : -1);
        const ageB = b.aging.includes("Days") ? parseInt(b.aging) : (b.aging === "Closed" ? -100 : -1);
        comparison = ageA - ageB;
      } else if (sortBy === "amount") {
        const valA = parseFloat(a.amount.replace(/[^0-9.]/g, ''));
        const valB = parseFloat(b.amount.replace(/[^0-9.]/g, ''));
        comparison = valA - valB;
      } else if (sortBy === "date") {
        comparison = new Date(a.invoiceDate).getTime() - new Date(b.invoiceDate).getTime();
      }

      return sortOrder === "desc" ? -comparison : comparison;
    });
  };

  const getViewTitle = () => {
    if (currentView === "dashboard") return `${selectedCompany.name} Triage`;
    if (currentView === "call-list") return "Remind (1-14 days)";
    if (currentView === "escalations") return "Warning (Subject to L1/L2)";
    if (currentView === "pending-verif") return "Verification";
  };

  if (loading) {
    return (
      <main className="main-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '80vh', gap: '1rem' }}>
        <p style={{fontSize: '1.2rem', color: 'var(--text-secondary)'}}>Syncing live data via SimPRO MCP Tools...</p>
      </main>
    );
  }

  return (
    <main className="main-content">
      {/* HEADER */}
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Debtor Overview</h1>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Fetch Limit</label>
          <select 
            className="input-field" 
            value={fetchLimit} 
            onChange={(e) => setFetchLimit(Number(e.target.value))}
            style={{ width: '150px', padding: '0.4rem' }}
          >
            <option value={50}>50 Invoices</option>
            <option value={100}>100 Invoices</option>
            <option value={200}>200 Invoices</option>
            <option value={500}>500 Invoices</option>
            <option value={1000}>1000 Invoices (Slow)</option>
          </select>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', margin: 0 }}>Increases coverage vs speed</p>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Left Column - Action Items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* STAT CARDS (Clickable) */}
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div 
              className="panel card-clickable" 
              style={{ flex: 1, borderTop: '4px solid var(--danger)', padding: '1.5rem', background: currentView === 'call-list' ? 'var(--surface-hover)' : 'var(--surface)' }}
              onClick={() => setCurrentView(currentView === "call-list" ? "dashboard" : "call-list")}
            >
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <Phone size={18} color="var(--danger)" /> Remind
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>1-14 days after due date</p>
              <p style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{counts["call-list"]}</p>
            </div>
            
            <div 
              className="panel card-clickable" 
              style={{ flex: 1, borderTop: '4px solid var(--warning)', padding: '1.5rem', background: currentView === 'escalations' ? 'var(--surface-hover)' : 'var(--surface)' }}
              onClick={() => setCurrentView(currentView === "escalations" ? "dashboard" : "escalations")}
            >
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <AlertTriangle size={18} color="var(--warning)" /> Warning
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Subject to L1 and L2</p>
              <p style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{counts["escalations"]}</p>
            </div>
            
            <div 
              className="panel card-clickable" 
              style={{ flex: 1, borderTop: '4px solid var(--success)', padding: '1.5rem', background: currentView === 'pending-verif' ? 'var(--surface-hover)' : 'var(--surface)' }}
              onClick={() => setCurrentView(currentView === "pending-verif" ? "dashboard" : "pending-verif")}
            >
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <CheckCircle size={18} color="var(--success)" /> Verification
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Paid / Pending Verif.</p>
              <p style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{counts["pending-verif"]}</p>
            </div>
          </div>

          {/* DYNAMIC LIST VIEW */}
          <div className="panel animate-slide-up" style={{ padding: '2rem' }} key={currentView}>
            {/* FILTER BAR */}
            <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '0.75rem', marginBottom: '2rem', display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'flex-end', border: '1px solid var(--border)' }}>
              <div style={{ flex: 2, minWidth: '250px' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Search Invoices / Clients</label>
                <input 
                  type="text" 
                  placeholder="Search by ID, Company, or Job..." 
                  className="input-field" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem 1rem' }}
                />
              </div>

              <div style={{ flex: 1, minWidth: '150px' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Sort By</label>
                <select 
                  className="input-field" 
                  value={sortBy} 
                  onChange={(e) => {
                    setSortBy(e.target.value);
                    if (e.target.value && !sortOrder) setSortOrder("desc");
                  }}
                  style={{ width: '100%', padding: '0.5rem' }}
                >
                  <option value="">None</option>
                  <option value="aging">Risk (Aging)</option>
                  <option value="amount">Amount</option>
                  <option value="date">Invoice Date</option>
                </select>
              </div>

              <div style={{ flex: 1, minWidth: '150px' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Order</label>
                <select 
                  className="input-field" 
                  value={sortOrder} 
                  onChange={(e) => setSortOrder(e.target.value as any)}
                  style={{ width: '100%', padding: '0.5rem' }}
                >
                  <option value="">None</option>
                  <option value="desc">Descending</option>
                  <option value="asc">Ascending</option>
                </select>
              </div>
              
              <div style={{ flex: 1, minWidth: '150px' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>From Date</label>
                <input 
                  type="date" 
                  className="input-field" 
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem' }}
                />
              </div>
              
              <div style={{ flex: 1, minWidth: '150px' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>To Date</label>
                <input 
                  type="date" 
                  className="input-field" 
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem' }}
                />
              </div>

              <button 
                className="btn btn-outline" 
                onClick={() => { 
                  setSearchTerm(""); 
                  setStartDate(""); 
                  setEndDate(""); 
                  setSortBy(""); 
                  setSortOrder(""); 
                }}
                style={{ padding: '0.6rem 1rem' }}
              >
                Clear Filters
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.5rem', margin: 0 }}>{getViewTitle()}</h2>
              {currentView === "dashboard" && <span className="tag primary">AI Sorted</span>}
            </div>

            {/* If in a specific category, show a cleaner Table view. If in Dashboard, show detailed cards */}
            {currentView !== "dashboard" ? (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Client</th>
                      <th>Invoice / Job</th>
                      <th>Dates</th>
                      <th>Aging</th>
                      <th>Amount</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getFilteredList().map(item => (
                      <tr key={item.id}>
                        <td style={{ fontWeight: '600' }}>{item.client}</td>
                        <td>
                          <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{item.id}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{item.jobNo}</div>
                        </td>
                        <td>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Issued: {item.invoiceDate}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--danger)', fontWeight: '500' }}>Due: {item.invoiceDueDate}</div>
                        </td>
                        <td style={{ color: item.aging.includes('8') ? 'var(--danger)' : 'var(--text-primary)' }}>{item.aging}</td>
                        <td style={{ color: 'var(--danger)', fontWeight: '600' }}>{item.amount}</td>
                        <td>
                          <button className="btn btn-outline" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }} onClick={() => setSelectedJob(item)}>
                            View Job
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {getFilteredList().length === 0 && (
                  <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No active items in this list.</p>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {getFilteredList().map((item) => (
                  <div key={item.id} style={{ display: 'flex', gap: '1rem' }}>
                    {/* PRIVATE STICKY NOTE (LEFT SIDE) */}
                    <div style={{ width: '200px', flexShrink: 0, position: 'relative' }}>
                      <div style={{ 
                        background: '#fefce8', 
                        border: '1px solid #fef08a', 
                        borderRadius: '0.5rem', 
                        padding: '0.75rem', 
                        height: '100%', 
                        boxShadow: '2px 2px 5px rgba(0,0,0,0.05)',
                        display: 'flex',
                        flexDirection: 'column'
                      }}>
                        <div style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#854d0e', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <FileText size={12} /> My Private Note
                        </div>
                        <textarea 
                          placeholder="Done this..."
                          value={privateNotes[item.id] || ""}
                          onChange={(e) => updateNote(item.id, e.target.value)}
                          style={{ 
                            width: '100%', 
                            flex: 1, 
                            border: 'none', 
                            background: 'transparent', 
                            fontSize: '0.825rem', 
                            resize: 'none', 
                            outline: 'none',
                            color: '#713f12',
                            lineHeight: '1.4'
                          }}
                        />
                      </div>
                    </div>

                    <div className="panel" style={{ margin: 0, padding: '1.25rem', borderLeft: `5px solid var(--${item.tagColor})`, flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                        <div>
                          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem' }}>
                            {item.client} <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 'normal' }}>{item.id}</span>
                          </h3>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            Order No: {item.orderNo} | Terms: {item.paymentTermsName}
                            {item.contactName && ` | Contact: ${item.contactName}`}
                            {item.salesperson && item.salesperson !== "N/A" && ` | Rep: ${item.salesperson}`}
                          </div>
                        </div>
                        <div>
                          <span className={`tag ${item.tagColor}`}>{item.tag}</span>
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '2rem', marginBottom: '1rem', fontSize: '0.9rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)' }}>
                          <Clock size={16} /> <strong>Due Date:</strong> <span style={{color: 'var(--text-primary)'}}>{item.invoiceDueDate}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)' }}>
                          <strong>Aging:</strong> <span style={{color: 'var(--danger)'}}>{item.aging}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)' }}>
                          <strong>Amount:</strong> <span style={{ color: 'var(--danger)', fontWeight: '600' }}>{item.amount}</span>
                        </div>
                      </div>

                      <div style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '0.375rem', marginBottom: '1rem', fontSize: '0.9rem', border: '1px solid #f1f5f9' }}>
                        <strong style={{color: 'var(--text-primary)'}}>AI Context:</strong> <span style={{color: 'var(--text-secondary)'}}>{cleanSimproText(item.context)}</span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                        <div style={{ fontSize: '0.9rem', fontStyle: 'italic', flex: 1, color: 'var(--text-secondary)' }}>
                          "{cleanSimproText(item.script)}"
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button 
                            className="btn btn-outline" 
                            style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem', background: '#f8fafc' }} 
                            onClick={() => openHistoryModal(item)}
                          >
                             Log Details
                          </button>
                          <button className="btn btn-outline" style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }} onClick={() => setSelectedJob(item)}>
                             View Job
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* JOB DETAILS MODAL */}
      {selectedJob && (
        <div className="modal-overlay" onClick={() => setSelectedJob(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedJob(null)}>
              <X size={24} />
            </button>
            
            <h2 style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Briefcase size={22} color="var(--primary)" /> {selectedJob.client}
            </h2>
            
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', fontSize: '0.9rem', flexWrap: 'wrap' }}>
              <span style={{ padding: '0.2rem 0.5rem', background: '#f1f5f9', borderRadius: '4px', border: '1px solid var(--border)' }}>
                <strong>Invoice:</strong> {selectedJob.id}
              </span>
              <span style={{ padding: '0.2rem 0.5rem', background: '#f1f5f9', borderRadius: '4px', border: '1px solid var(--border)' }}>
                <strong>Order No:</strong> {selectedJob.orderNo}
              </span>
              {selectedJobDetails?.quoteNo && selectedJobDetails.quoteNo !== "N/A" && (
                <span style={{ padding: '0.2rem 0.5rem', background: '#f1f5f9', borderRadius: '4px', border: '1px solid var(--border)' }}>
                  <strong>Quote No:</strong> {selectedJobDetails.quoteNo}
                </span>
              )}
              <span style={{ padding: '0.2rem 0.5rem', background: '#f1f5f9', borderRadius: '4px', border: '1px solid var(--border)' }}>
                <strong>Job No:</strong> {selectedJob.jobNo}
              </span>
              <span style={{ padding: '0.2rem 0.5rem', background: '#fef2f2', borderRadius: '4px', border: '1px solid #fee2e2' }}>
                <strong>Amount:</strong> <span style={{color: 'var(--danger)', fontWeight: '600'}}>{selectedJob.amount}</span>
              </span>
            </div>

            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '1.5rem', gap: '2rem' }}>
              <button 
                onClick={() => setActiveTab('details')} 
                style={{ paddingBottom: '0.75rem', border: 'none', borderBottom: activeTab === 'details' ? '2px solid var(--primary)' : '2px solid transparent', color: activeTab === 'details' ? 'var(--primary)' : 'var(--text-secondary)', fontWeight: '600', cursor: 'pointer', background: 'none' }}>
                Details
              </button>
              <button 
                onClick={() => setActiveTab('computation')} 
                style={{ paddingBottom: '0.75rem', border: 'none', borderBottom: activeTab === 'computation' ? '2px solid var(--primary)' : '2px solid transparent', color: activeTab === 'computation' ? 'var(--primary)' : 'var(--text-secondary)', fontWeight: '600', cursor: 'pointer', background: 'none' }}>
                Computation
              </button>
              <button 
                onClick={() => setActiveTab('history')} 
                style={{ paddingBottom: '0.75rem', border: 'none', borderBottom: activeTab === 'history' ? '2px solid var(--primary)' : '2px solid transparent', color: activeTab === 'history' ? 'var(--primary)' : 'var(--text-secondary)', fontWeight: '600', cursor: 'pointer', background: 'none' }}>
                History Logs
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '1rem' }}>
              {activeTab === "details" && (
                <div className="animate-slide-up">
                  {detailsLoading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1rem' }}>
                      <div className="skeleton" style={{ height: '80px', width: '100%' }}></div>
                      <div className="dashboard-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                        <div className="skeleton" style={{ height: '220px' }}></div>
                        <div className="skeleton" style={{ height: '220px' }}></div>
                      </div>
                      <div className="skeleton" style={{ height: '300px', width: '100%' }}></div>
                    </div>
                  ) : (
                    <>
                      <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '0.5rem', border: '1px solid var(--border)', marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '2rem' }}>
                        <div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 'bold' }}>Job Started</div>
                          <div style={{ fontSize: '0.95rem', color: 'var(--text-primary)', fontWeight: '500' }}>{selectedJob.jobStartDate}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 'bold' }}>Job Completed</div>
                          <div style={{ fontSize: '0.95rem', color: 'var(--text-primary)', fontWeight: '500' }}>{selectedJob.jobEndDate}</div>
                        </div>
                        <div style={{ width: '1px', background: 'var(--border)' }}></div>
                        <div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 'bold' }}>Invoice Issued</div>
                          <div style={{ fontSize: '0.95rem', color: 'var(--text-primary)', fontWeight: '500' }}>{selectedJob.invoiceDate}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--danger)', textTransform: 'uppercase', fontWeight: 'bold' }}>Payment Due</div>
                          <div style={{ fontSize: '0.95rem', color: 'var(--danger)', fontWeight: '700' }}>{selectedJob.invoiceDueDate}</div>
                        </div>
                        <div style={{ width: '1px', background: 'var(--border)' }}></div>
                        <div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 'bold' }}>Salesperson</div>
                          <div style={{ fontSize: '0.95rem', color: 'var(--text-primary)', fontWeight: '500' }}>{selectedJobDetails?.salesperson || "N/A"}</div>
                        </div>
                      </div>

                      <div className="dashboard-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'stretch', marginBottom: '1.5rem' }}>
                        <div style={{ border: '1px solid var(--border)', padding: '1.25rem', borderRadius: '0.5rem', background: 'white', display: 'flex', flexDirection: 'column' }}>
                          <h4 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)' }}>
                            <Briefcase size={18} /> Company Contacts
                          </h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '400px', overflowY: 'auto' }}>
                            {(selectedJobDetails?.customerContacts || (selectedJob.contacts?.length ? selectedJob.contacts : [])).map((c, i) => (
                              <div key={i} style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: '0.375rem', border: '1px solid #e2e8f0' }}>
                                <div style={{ fontWeight: '600', fontSize: '0.9rem', marginBottom: '0.35rem' }}>{c.name}</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.85rem' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: c.phone === "N/A" ? 'var(--text-secondary)' : 'var(--text-primary)' }}>
                                    <Phone size={14} className={c.phone === "N/A" ? "opacity-50" : "text-primary"} /> 
                                    <span style={{ fontWeight: '500' }}>{c.phone}</span>
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: c.email === "N/A" ? 'var(--text-secondary)' : 'var(--text-primary)' }}>
                                    <MailWarning size={14} className={c.email === "N/A" ? "opacity-50" : "text-primary"} /> 
                                    <span style={{ fontWeight: '500', wordBreak: 'break-all' }}>{c.email}</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                            {!selectedJobDetails?.customerContacts && !selectedJob.contacts?.length && (
                                <div style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: '0.375rem', border: '1px solid #e2e8f0' }}>
                                    <div style={{ fontWeight: '600', fontSize: '0.9rem', marginBottom: '0.35rem' }}>{selectedJob.contactName || "Primary Contact"}</div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.85rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: (selectedJob.contactPhone || selectedJob.contact) === "N/A" ? 'var(--text-secondary)' : 'var(--text-primary)' }}>
                                            <Phone size={14} className={(selectedJob.contactPhone || selectedJob.contact) === "N/A" ? "opacity-50" : "text-primary"} /> 
                                            <span style={{ fontWeight: '500' }}>{selectedJob.contactPhone || selectedJob.contact}</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: (selectedJob.contactEmail || selectedJob.email) === "N/A" ? 'var(--text-secondary)' : 'var(--text-primary)' }}>
                                            <MailWarning size={14} className={(selectedJob.contactEmail || selectedJob.email) === "N/A" ? "opacity-50" : "text-primary"} /> 
                                            <span style={{ fontWeight: '500', wordBreak: 'break-all' }}>{selectedJob.contactEmail || selectedJob.email}</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                          </div>
                        </div>

                        <div style={{ border: '1px solid #bae6fd', padding: '1.25rem', borderRadius: '0.5rem', background: '#f0f9ff', display: 'flex', flexDirection: 'column' }}>
                          <div style={{ marginBottom: '1rem' }}>
                            <h4 style={{ marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#0369a1' }}>
                              <User size={18} /> Site Contacts ({selectedJobDetails?.site || "N/A"})
                            </h4>
                            <div style={{ fontSize: '0.75rem', color: '#0c4a6e', opacity: 0.8 }}>
                                {selectedJobDetails?.sitePhone && selectedJobDetails.sitePhone !== "N/A" && `Site Phone: ${selectedJobDetails.sitePhone}`}
                                {selectedJobDetails?.siteEmail && selectedJobDetails.siteEmail !== "N/A" && ` | Site Email: ${selectedJobDetails.siteEmail}`}
                            </div>
                          </div>
                          
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '400px', overflowY: 'auto' }}>
                            {selectedJobDetails?.siteContacts && selectedJobDetails.siteContacts.length > 0 ? (
                                selectedJobDetails.siteContacts.map((c, i) => (
                                    <div key={i} style={{ padding: '0.75rem', background: 'white', borderRadius: '0.375rem', border: '1px solid #bae6fd' }}>
                                    <div style={{ fontWeight: '600', fontSize: '0.9rem', marginBottom: '0.35rem', color: '#0369a1' }}>{c.name}</div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.85rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: c.phone === "N/A" ? 'var(--text-secondary)' : 'var(--text-primary)' }}>
                                            <Phone size={14} className={c.phone === "N/A" ? "opacity-30" : "text-primary"} /> 
                                            <span style={{ fontWeight: '500' }}>{c.phone}</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: c.email === "N/A" ? 'var(--text-secondary)' : 'var(--text-primary)' }}>
                                            <MailWarning size={14} className={c.email === "N/A" ? "opacity-30" : "text-primary"} /> 
                                            <span style={{ fontWeight: '500', wordBreak: 'break-all' }}>{c.email}</span>
                                        </div>
                                    </div>
                                    </div>
                                ))
                            ) : (
                                <div style={{ padding: '2rem', textAlign: 'center', color: '#0369a1', background: 'rgba(255,255,255,0.5)', borderRadius: '0.5rem', border: '1px dashed #bae6fd', fontSize: '0.85rem' }}>
                                    No secondary site contacts found.
                                </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div style={{ border: '1px solid var(--border)', padding: '1.25rem', borderRadius: '0.5rem', background: 'white' }}>
                        <h4 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)' }}>
                          <Clock size={18} /> Scope of Works / Job Description
                        </h4>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', maxHeight: '300px', overflowY: 'auto' }}>
                            {selectedJobDetails ? (
                              <>
                                <div 
                                  className="simpro-description"
                                  dangerouslySetInnerHTML={{ __html: selectedJobDetails.description }} 
                                  style={{ lineHeight: '1.6' }}
                                />
                                {selectedJobDetails.notes && selectedJobDetails.notes.length > 0 && (
                                  <div style={{ marginTop: '1.5rem', borderTop: '1px dashed var(--border)', paddingTop: '1rem' }}>
                                    <div style={{ fontWeight: 'bold', fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Internal Job Notes</div>
                                    <div 
                                      className="simpro-description"
                                      dangerouslySetInnerHTML={{ __html: selectedJobDetails.notes }} 
                                      style={{ lineHeight: '1.6', fontStyle: 'italic' }}
                                    />
                                  </div>
                                )}
                              </>
                            ) : (
                              <p>No job description found.</p>
                            )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {activeTab === "computation" && (
                <div className="animate-slide-up" style={{ marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <CreditCard size={18} /> Invoice Computation & Items
                    </h4>
                    {selectedJobDetails?.site && (
                      <div style={{ fontSize: '0.9rem', color: 'var(--primary)', fontWeight: '600' }}>
                        Site: {selectedJobDetails.site}
                      </div>
                    )}
                  </div>

                  {detailsLoading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1rem' }}>
                      <div className="skeleton" style={{ height: '300px', width: '100%' }}></div>
                      <div className="skeleton" style={{ height: '100px', width: '200px', alignSelf: 'flex-end' }}></div>
                    </div>
                  ) : selectedJobDetails?.sections && selectedJobDetails.sections.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                      {selectedJobDetails.sections.map((section, sidx) => (
                        <div key={sidx} style={{ border: '1px solid var(--border)', borderRadius: '0.5rem', overflow: 'hidden' }}>
                          <div style={{ background: '#f8fafc', padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.85rem', letterSpacing: '0.025em' }}>
                            {section.Name}
                          </div>
                          <div style={{ overflowX: 'auto' }}>
                            <table className="data-table" style={{ marginTop: 0 }}>
                              <thead>
                                <tr style={{ background: 'white' }}>
                                  <th style={{ padding: '0.5rem 1rem', fontSize: '0.7rem' }}>PART NO.</th>
                                  <th style={{ padding: '0.5rem 1rem', fontSize: '0.7rem' }}>ITEM</th>
                                  <th style={{ padding: '0.5rem 1rem', fontSize: '0.7rem', textAlign: 'right' }}>QUANTITY</th>
                                  <th style={{ padding: '0.5rem 1rem', fontSize: '0.7rem', textAlign: 'right' }}>UNIT PRICE</th>
                                  <th style={{ padding: '0.5rem 1rem', fontSize: '0.7rem', textAlign: 'right' }}>TOTAL</th>
                                </tr>
                              </thead>
                              <tbody>
                                {section.Items.map((item: any, iidx: number) => {
                                  const qty = typeof item.Quantity === 'object' ? (item.Quantity.Total || 0) : (item.Quantity || 0);
                                  const unitPrice = qty > 0 ? (item.Total?.ExTax / qty) : 0;
                                  
                                  return (
                                    <tr key={iidx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                      <td style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{item.Item?.PartNo || item.PartNumber || "-"}</td>
                                      <td style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>{item.Item?.Name || item.Name || item.Description || "Standard Item"}</td>
                                      <td style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', textAlign: 'right' }}>{qty.toFixed(2)}</td>
                                      <td style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', textAlign: 'right' }}>${unitPrice.toFixed(2)}</td>
                                      <td style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', textAlign: 'right', fontWeight: 'bold' }}>${(item.Total?.IncTax || 0).toFixed(2)}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ))}

                      {/* Financial Summary Block */}
                      {selectedJobDetails.invoiceTotals && (
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                          <div style={{ width: '300px', background: '#f8fafc', padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--border)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                              <span style={{ color: 'var(--text-secondary)' }}>Sub-Total:</span>
                              <span>${(selectedJobDetails.invoiceTotals.ExTax || 0).toFixed(2)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                              <span style={{ color: 'var(--text-secondary)' }}>GST:</span>
                              <span>${(selectedJobDetails.invoiceTotals.GST || 0).toFixed(2)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '1rem', fontWeight: 'bold', borderTop: '1px solid var(--border)', paddingTop: '0.5rem' }}>
                              <span>Total:</span>
                              <span>${(selectedJobDetails.invoiceTotals.IncTax || 0).toFixed(2)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#10b981' }}>
                              <span>Amount Applied:</span>
                              <span>-${((selectedJobDetails.invoiceTotals.IncTax || 0) - (selectedJobDetails.invoiceTotals.BalanceDue || 0)).toFixed(2)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--danger)', borderTop: '2px solid var(--border)', paddingTop: '0.5rem' }}>
                              <span>Balance Due:</span>
                              <span>${(selectedJobDetails.invoiceTotals.BalanceDue || 0).toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ padding: '2rem', textAlign: 'center', background: '#f8fafc', borderRadius: '0.5rem', border: '1px dashed var(--border)' }}>
                      No line items found for this invoice.
                    </div>
                  )}
                </div>
              )}

              {activeTab === "history" && (
                <div className="animate-slide-up">
                  {detailsLoading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1rem' }}>
                      <div className="skeleton" style={{ height: '150px', width: '100%' }}></div>
                      <div className="skeleton" style={{ height: '400px', width: '100%' }}></div>
                    </div>
                  ) : (
                    <>
                      {/* Escalation Timeline (from late payment settings) */}
                      {templates.latePayment && templates.latePayment.Stages && (
                        <div style={{ border: '1px solid #fef08a', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem', background: '#fffbeb' }}>
                          <h4 style={{ marginBottom: '1rem', fontSize: '0.9rem', color: '#854d0e', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <AlertTriangle size={16} /> Current Escalation Path
                          </h4>
                          <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                              {templates.latePayment.Stages.map((stage: any, idx: number) => (
                                <div key={idx} style={{ minWidth: '120px', padding: '0.5rem', background: 'white', borderRadius: '0.375rem', border: '1px solid #fef08a', textAlign: 'center' }}>
                                  <div style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--text-secondary)' }}>{stage.Name}</div>
                                  <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#854d0e' }}>+{stage.Offset} Days</div>
                                </div>
                              ))}
                          </div>
                          <p style={{ fontSize: '0.75rem', color: '#a16207', marginTop: '0.75rem' }}>These stages are configured in SimPRO Late Payment settings.</p>
                        </div>
                      )}

                      <div style={{ border: '1px solid var(--border)', padding: '1rem', borderRadius: '0.5rem' }}>
                        <h4 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <FileText size={18} /> Full Job History & Logs
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0', position: 'relative', paddingLeft: '1.5rem', borderLeft: '2px solid var(--border)' }}>
                          {(selectedJobDetails?.history || selectedJob.history).map((log, index) => (
                              <div key={index} style={{ position: 'relative', marginBottom: '1.5rem' }}>
                                {/* Timeline Dot */}
                                <div style={{ 
                                  position: 'absolute', 
                                  left: '-1.95rem', 
                                  top: '0.25rem', 
                                  width: '12px', 
                                  height: '12px', 
                                  borderRadius: '50%', 
                                  background: index === 0 ? 'var(--success)' : 'var(--border)', 
                                  border: '2px solid white',
                                  zIndex: 1
                                }} />
                                
                                <div style={{ fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', padding: '0.75rem', background: index === 0 ? '#f0fdf4' : 'var(--surface)', borderRadius: '0.375rem', border: '1px solid var(--border)', borderLeft: index === 0 ? '4px solid var(--success)' : '4px solid var(--border)' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: index === 0 ? '1px solid #bbf7d0' : '1px solid var(--border)', paddingBottom: '0.4rem', marginBottom: '0.25rem' }}>
                                    <span style={{ fontWeight: '600', color: index === 0 ? 'var(--success)' : 'var(--text-secondary)' }}>
                                      {new Date(log.date).toLocaleDateString() !== 'Invalid Date' ? new Date(log.date).toLocaleDateString() : log.date}
                                    </span>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '500' }}>By: {log.author}</span>
                                  </div>
                                  <div 
                                    className="simpro-log-text"
                                    style={{ color: 'var(--text-primary)', lineHeight: '1.4' }}
                                    dangerouslySetInnerHTML={{ __html: log.text }}
                                  />
                                </div>
                              </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* EMAIL TEMPLATE MODAL */}
      {showEmailModal && (
        <div className="modal-overlay" onClick={() => setShowEmailModal(null)}>
          <div className="modal-content" style={{ maxWidth: '800px' }} onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowEmailModal(null)}>
              <X size={24} />
            </button>
            
            <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <FileText size={24} color="var(--primary)" /> Collection Email Templates
            </h2>

            <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#fffbeb', border: '1px solid #fef08a', borderRadius: '0.5rem', fontSize: '0.9rem', color: '#854d0e' }}>
              {templatesLoading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Loader2 className="animate-spin" size={16} /> Fetching latest L1/L2 templates from SimPRO...
                </div>
              ) : (
                <>
                  <strong>Debtor Tip:</strong> Select a template below to copy the content for <strong>{showEmailModal.client}</strong>. 
                  Our L1 (Courtesy) and L2 (Overdue) templates are fetched directly from your SimPRO library.
                </>
              )}
            </div>

            <div className="dashboard-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              {/* L1 Template */}
              <div style={{ border: '1px solid var(--border)', borderRadius: '0.75rem', overflow: 'hidden' }}>
                <div style={{ padding: '0.75rem', background: '#f8fafc', borderBottom: '1px solid var(--border)', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between' }}>
                  <span>L1 - Courtesy Reminder</span>
                  <span className="tag success">Friendly</span>
                </div>
                <div style={{ padding: '1rem', minHeight: '200px', fontSize: '0.85rem', color: 'var(--text-secondary)', background: 'white', whiteSpace: 'pre-wrap' }}>
                  {getTemplate('L1')}
                </div>
                <div style={{ padding: '0.75rem', background: '#f1f5f9', textAlign: 'center' }}>
                    <button className="btn btn-outline" style={{ width: '100%', fontSize: '0.8rem' }} onClick={() => {
                        const text = getTemplate('L1');
                        navigator.clipboard.writeText(text);
                        setToast({ message: "L1 Template copied to clipboard!", type: 'success' });
                        setTimeout(() => setToast(null), 3000);
                    }}>Copy Template Contents</button>
                </div>
              </div>

              {/* L2 Template */}
              <div style={{ border: '1px solid var(--border)', borderRadius: '0.75rem', overflow: 'hidden' }}>
                <div style={{ padding: '0.75rem', background: '#f8fafc', borderBottom: '1px solid var(--border)', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between' }}>
                  <span>L2 - Overdue Notice</span>
                  <span className="tag warning">Firm</span>
                </div>
                <div style={{ padding: '1rem', minHeight: '200px', fontSize: '0.85rem', color: 'var(--text-secondary)', background: 'white', whiteSpace: 'pre-wrap' }}>
                  {getTemplate('L2')}
                </div>
                <div style={{ padding: '0.75rem', background: '#f1f5f9', textAlign: 'center' }}>
                    <button className="btn btn-outline" style={{ width: '100%', fontSize: '0.8rem' }} onClick={() => {
                        const text = getTemplate('L2');
                        navigator.clipboard.writeText(text);
                        setToast({ message: "L2 Template copied to clipboard!", type: 'success' });
                        setTimeout(() => setToast(null), 3000);
                    }}>Copy Template Contents</button>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '2rem', textAlign: 'right' }}>
              <button className="btn btn-primary" onClick={() => setShowEmailModal(null)}>Done</button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST NOTIFICATION */}
      {toast && (
        <div style={{ 
          position: 'fixed', 
          bottom: '2rem', 
          right: '2rem', 
          background: '#0f172a', 
          color: 'white', 
          padding: '1rem 1.5rem', 
          borderRadius: '0.75rem', 
          boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', 
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          animation: 'slideInRight 0.3s ease-out',
          border: '1px solid rgba(255,255,255,0.1)',
          maxWidth: '400px'
        }}>
          <div style={{ background: 'rgba(56, 189, 248, 0.2)', padding: '0.4rem', borderRadius: '0.5rem' }}>
            <AlertTriangle size={18} color="#38bdf8" />
          </div>
          <div style={{ fontSize: '0.9rem', lineHeight: '1.4' }}>
            {toast.message}
          </div>
        </div>
      )}


      {/* HISTORY & LOGS MODAL */}
      {historyModalItem && (
        <div className="modal-overlay" onClick={() => setHistoryModalItem(null)}>
          <div className="modal-content" style={{ maxWidth: '1000px', width: '95%', height: '85vh' }} onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setHistoryModalItem(null)}>
              <X size={24} />
            </button>
            
            <div style={{ marginBottom: '1.5rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Clock className="text-primary" size={24} /> History & Logs: {historyModalItem.client}
                </h2>
                <div style={{ margin: '0.25rem 0 0 2rem', color: 'var(--text-secondary)', fontSize: '0.9rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <span>Invoice {historyModalItem.id}</span>
                    <span style={{ padding: '2px 8px', background: '#f1f5f9', borderRadius: '4px', fontSize: '0.75rem' }}>ID: {historyModalItem.customerId}</span>
                </div>
            </div>

            <div className="tab-container" style={{ marginBottom: '1.5rem' }}>
              <button 
                className={`tab-btn ${historyActiveTab === 'invoice' ? 'active' : ''}`}
                onClick={() => setHistoryActiveTab('invoice')}
              >
                Invoice Logs
              </button>
              <button 
                className={`tab-btn ${historyActiveTab === 'company' ? 'active' : ''}`}
                onClick={() => setHistoryActiveTab('company')}
              >
                Company History
              </button>
            </div>

            <div style={{ flex: 1, overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column' }}>
                {historyLoading && (
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10 }}>
                        <Loader2 className="animate-spin text-primary" size={32} />
                    </div>
                )}

                <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.5rem' }}>
                  {historyActiveTab === 'invoice' && (
                      <div className="animate-fade-in">
                          {invoiceLogs && invoiceLogs.length > 0 ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                  {invoiceLogs.map((log, i) => (
                                      <div key={i} style={{ padding: '1.25rem', background: '#f8fafc', borderRadius: '0.6rem', border: '1px solid #e2e8f0' }}>
                                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.6rem', fontSize: '0.85rem' }}>
                                              <span style={{ fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                  <User size={14} className="text-primary" /> {log.Author?.Name || "System"}
                                              </span>
                                              <span style={{ color: 'var(--text-secondary)' }}>{new Date(log.DateModified || log.DateCreated).toLocaleString()}</span>
                                          </div>
                                          <div className="simpro-log-text" style={{ fontSize: '0.925rem', color: 'var(--text-primary)', lineHeight: '1.6' }} dangerouslySetInnerHTML={{ __html: log.Message || log.Text || "No message content" }} />
                                      </div>
                                  ))}
                              </div>
                          ) : (
                              <div style={{ textAlign: 'center', padding: '5rem 2rem', color: 'var(--text-secondary)' }}>
                                  <FileText size={64} style={{ opacity: 0.1, marginBottom: '1.5rem' }} />
                                  <h3 style={{ marginBottom: '0.5rem' }}>No Invoice Logs</h3>
                                  <p>There are no recorded log entries for this specific invoice in SimPRO.</p>
                              </div>
                          )}
                      </div>
                  )}

                  {historyActiveTab === 'company' && (
                      <div className="animate-fade-in">
                          {companyHistory && companyHistory.length > 0 ? (
                            <>
                              <div style={{ overflowX: 'auto', marginBottom: '1.5rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem' }}>
                                  <table className="data-table" style={{ margin: 0 }}>
                                      <thead style={{ position: 'sticky', top: 0, zIndex: 5 }}>
                                          <tr>
                                              <th>Invoice ID</th>
                                              <th>Date Issued</th>
                                              <th>Terms</th>
                                              <th>Total</th>
                                              <th>Status</th>
                                          </tr>
                                      </thead>
                                      <tbody>
                                          {companyHistory.map((h, i) => (
                                              <tr key={i}>
                                                  <td style={{ fontWeight: '700', color: 'var(--primary)' }}>INV-{h.ID}</td>
                                                  <td>{h.DateIssued}</td>
                                                  <td>{h.PaymentTerms?.Name || "Standard"}</td>
                                                  <td style={{ fontWeight: '600', color: 'var(--danger)' }}>${(h.Total?.IncTax || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                                  <td>
                                                      <span className={`tag ${h.IsPaid ? 'success' : 'warning'}`} style={{ fontSize: '0.7rem' }}>
                                                          {h.IsPaid ? 'PAID' : 'UNPAID'}
                                                      </span>
                                                  </td>
                                              </tr>
                                          ))}
                                      </tbody>
                                  </table>
                              </div>

                              {/* PAGINATION */}
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: '#f8fafc', borderRadius: '0.5rem' }}>
                                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                      Showing <strong>{(companyHistoryPage - 1) * 10 + 1}</strong> to <strong>{Math.min(companyHistoryPage * 10, companyHistoryTotal)}</strong> of <strong>{companyHistoryTotal}</strong> invoices
                                  </div>
                                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                      <button 
                                          className="btn btn-outline" 
                                          style={{ padding: '0.4rem 1rem' }}
                                          disabled={companyHistoryPage === 1}
                                          onClick={() => setCompanyHistoryPage(prev => prev - 1)}
                                      >
                                          Previous
                                      </button>
                                      <div style={{ padding: '0 1rem', fontWeight: 'bold' }}>{companyHistoryPage}</div>
                                      <button 
                                          className="btn btn-outline" 
                                          style={{ padding: '0.4rem 1rem' }}
                                          disabled={companyHistoryPage * 10 >= companyHistoryTotal}
                                          onClick={() => setCompanyHistoryPage(prev => prev + 1)}
                                      >
                                          Next
                                      </button>
                                  </div>
                              </div>
                            </>
                          ) : (
                            <div style={{ textAlign: 'center', padding: '5rem 2rem', color: 'var(--text-secondary)' }}>
                                <CreditCard size={64} style={{ opacity: 0.1, marginBottom: '1.5rem' }} />
                                <h3 style={{ marginBottom: '0.5rem' }}>No History Found</h3>
                                <p>This customer does not have any other invoices on record.</p>
                            </div>
                          )}
                      </div>
                  )}
                </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
