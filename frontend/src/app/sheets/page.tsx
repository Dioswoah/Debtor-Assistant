"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import { UploadCloud, FileSpreadsheet, CheckCircle, AlertTriangle, ArrowRight, Table, History, Trash2, Calendar, ChevronLeft, ChevronRight, PanelLeftClose, PanelLeftOpen } from "lucide-react";

type SheetRow = {
  InvoiceNo: string;
  ClientName: string;
  Status?: string;
  simproStatus?: string;
  sheetStatus?: string;
  [key: string]: any;
};

type ComparisonHistoryItem = {
  id: string;
  fileName: string;
  date: string;
  matchCount: number;
  mismatchCount: number;
  results: { match: SheetRow[], mismatch: SheetRow[] };
};

export default function SheetsPage() {
  const [fileData, setFileData] = useState<SheetRow[] | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isComparing, setIsComparing] = useState(false);
  const [comparisonResults, setComparisonResults] = useState<{ match: SheetRow[], mismatch: SheetRow[] } | null>(null);
  const [history, setHistory] = useState<ComparisonHistoryItem[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("comparison_history");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error("Failed to parse history", e);
        }
      }
    }
    return [];
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const saveHistory = (newHistory: ComparisonHistoryItem[]) => {
    setHistory(newHistory);
    localStorage.setItem("comparison_history", JSON.stringify(newHistory));
  };

  const deleteHistoryItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newHistory = history.filter(item => item.id !== id);
    saveHistory(newHistory);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const fileExtension = file.name.split('.').pop()?.toLowerCase();

    if (fileExtension === "csv") {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          setFileData(results.data as SheetRow[]);
        }
      });
    } else if (fileExtension === "xlsx" || fileExtension === "xls") {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        setFileData(data as SheetRow[]);
      };
      reader.readAsBinaryString(file);
    } else {
      alert("Unsupported file format. Please upload CSV or XLSX.");
    }
  };

  const handleCompare = () => {
    if (!fileData || !fileName) return;
    setIsComparing(true);
    
    // Simulate an AI / Database comparison lookup
    setTimeout(() => {
      const match: SheetRow[] = [];
      const mismatch: SheetRow[] = [];
      
      fileData.forEach((row, idx) => {
        if (idx % 3 === 0) {
          mismatch.push({...row, simproStatus: "Paid", sheetStatus: "Overdue"});
        } else {
          match.push(row);
        }
      });
      
      const results = { match, mismatch };
      setComparisonResults(results);
      setIsComparing(false);

      // Save to history
      const newHistoryItem: ComparisonHistoryItem = {
        id: Date.now().toString(),
        fileName: fileName,
        date: new Date().toLocaleString(),
        matchCount: match.length,
        mismatchCount: mismatch.length,
        results: results
      };
      saveHistory([newHistoryItem, ...history.slice(0, 9)]); // Keep last 10
    }, 1500);
  };

  // Extract column keys dynamically from the first valid row
  const getColumns = () => {
    if (!fileData || fileData.length === 0) return [];
    // Prefer showing Invoice and Client first
    const keys = Object.keys(fileData[0]);
    return keys.filter(k => k.toLowerCase() !== 'id' && k !== 'simproStatus' && k !== 'sheetStatus');
  };

  return (
    <main className="main-content" style={{ maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
      
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileSpreadsheet size={28} color="var(--success)" /> Sheet Comparison Tool
          </h1>
          <p>Upload Jess's Sheets to cross-check Invoice Numbers and Client Names instantly against live SimPRO data.</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
        {/* LEFT SIDEBAR DRAWER */}
        {history.length > 0 && (
          <div 
            style={{ 
              width: isSidebarOpen ? '350px' : '60px', 
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', 
              flexShrink: 0,
              position: 'sticky',
              top: '6rem',
              height: 'calc(100vh - 8rem)',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div className="panel" style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', border: isSidebarOpen ? '1px solid var(--border)' : 'none', background: isSidebarOpen ? 'var(--surface)' : 'transparent', boxShadow: isSidebarOpen ? 'var(--shadow-md)' : 'none' }}>
              <div style={{ padding: '1.25rem', borderBottom: isSidebarOpen ? '1px solid var(--border)' : 'none', display: 'flex', justifyContent: isSidebarOpen ? 'space-between' : 'center', alignItems: 'center', background: isSidebarOpen ? '#f8fafc' : 'transparent' }}>
                {isSidebarOpen && (
                  <h3 style={{ fontSize: '1rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap' }}>
                    <History size={18} color="var(--primary)" /> Comparison History
                  </h3>
                )}
                <button 
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  style={{ background: isSidebarOpen ? 'none' : 'var(--primary)', border: 'none', cursor: 'pointer', color: isSidebarOpen ? 'var(--text-secondary)' : 'white', padding: '0.4rem', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: isSidebarOpen ? 'none' : 'var(--shadow-md)' }}
                  title={isSidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
                >
                  {isSidebarOpen ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}
                </button>
              </div>

              {isSidebarOpen && (
                <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {history.map(item => (
                    <div 
                      key={item.id} 
                      className="card-clickable"
                      onClick={() => {
                        setFileName(item.fileName);
                        setComparisonResults(item.results);
                        setFileData([]); 
                      }}
                      style={{ padding: '1rem', border: '1px solid var(--border)', borderRadius: '0.5rem', background: 'var(--surface)', fontSize: '0.9rem' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
                        <strong style={{ fontSize: '0.85rem', color: 'var(--text-primary)', wordBreak: 'break-all' }}>{item.fileName}</strong>
                        <button 
                          onClick={(e) => deleteHistoryItem(item.id, e)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '0.2rem' }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
                        <Calendar size={12} /> {item.date}
                      </div>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <span className="tag success" style={{ fontSize: '0.6rem', padding: '0.1rem 0.3rem' }}>{item.matchCount} Matches</span>
                        <span className="tag warning" style={{ fontSize: '0.6rem', padding: '0.1rem 0.3rem' }}>{item.mismatchCount} Issues</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* MAIN CONTENT AREA */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {!fileData ? (
            <div className="panel" style={{ padding: '4rem 2rem', textAlign: 'center', borderStyle: 'dashed', borderWidth: '2px', borderColor: '#cbd5e1', background: '#f8fafc', height: 'fit-content' }}>
              <UploadCloud size={48} color="var(--text-secondary)" style={{ margin: '0 auto 1rem auto' }} />
              <h2 style={{ marginBottom: '0.5rem' }}>Upload Spreadsheet</h2>
              <p style={{ marginBottom: '2rem', maxWidth: '400px', margin: '0 auto 2rem auto' }}>Drop your .xlsx or .csv file here. We will parse it and prepare for SimPRO Cross-Checking.</p>
              
              <label className="btn btn-primary" style={{ cursor: 'pointer', padding: '0.75rem 1.5rem', fontSize: '1rem' }}>
                Browse Files
                <input 
                  type="file" 
                  accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" 
                  style={{ display: 'none' }} 
                  onChange={handleFileUpload}
                />
              </label>
            </div>
          ) : (
        <div className="animate-slide-up">
          <div className="panel" style={{ padding: '1.5rem', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f0fdf4', borderColor: '#bbf7d0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ padding: '0.5rem', background: '#d1fae5', borderRadius: '0.5rem' }}>
                <Tableize size={24} color="var(--success)" />
              </div>
              <div>
                <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>{fileName}</h3>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Parsed {fileData.length} rows successfully.</p>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn btn-outline" onClick={() => { setFileData(null); setComparisonResults(null); }}>
                Upload Different File
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleCompare} 
                disabled={isComparing || comparisonResults !== null}
                style={{ background: 'var(--success)', border: 'none' }}
              >
                {isComparing ? "Scanning SimPRO..." : comparisonResults ? "Cross-Check Complete" : "Cross-Check with SimPRO"}
              </button>
            </div>
          </div>

          {comparisonResults ? (
            <div className="dashboard-grid" style={{ gridTemplateColumns: '1fr', gap: '2rem' }}>
              
              {/* Mismatches / Anomalies */}
              <div className="panel" style={{ borderLeft: '5px solid var(--warning)' }}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <AlertTriangle size={20} color="var(--warning)" /> SimPRO Discrepancies Found ({comparisonResults.mismatch.length})
                  </h3>
                  <span className="tag warning">Requires Action</span>
                </div>
                <div style={{ overflowX: 'auto', padding: '0 1.5rem 1.5rem 1.5rem' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        {getColumns().map(col => <th key={col}>{col}</th>)}
                        <th style={{ background: '#fef3c7', color: 'var(--warning)' }}>SimPRO Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comparisonResults.mismatch.map((row, i) => (
                        <tr key={i}>
                          {getColumns().map(col => (
                            <td key={col} style={{ fontWeight: col.toLowerCase().includes('client') ? '600' : 'normal' }}>
                              {row[col] || '-'}
                            </td>
                          ))}
                          <td style={{ color: 'var(--text-primary)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span style={{ textDecoration: 'line-through', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{row.sheetStatus}</span>
                              <ArrowRight size={14} color="var(--text-secondary)" />
                              <span style={{ fontWeight: '600', color: 'var(--success)' }}>{row.simproStatus}</span>
                            </div>
                          </td>
                          <td>
                            <button className="btn btn-outline" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}>
                              Update Sheet
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Verified Matches */}
              <div className="panel" style={{ borderLeft: '5px solid var(--success)' }}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CheckCircle size={20} color="var(--success)" /> Verified Matches ({comparisonResults.match.length})
                  </h3>
                </div>
                <div style={{ overflowX: 'auto', padding: '0 1.5rem 1.5rem 1.5rem' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        {getColumns().map(col => <th key={col}>{col}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {comparisonResults.match.slice(0, 10).map((row, i) => (
                        <tr key={i}>
                          {getColumns().map(col => (
                            <td key={col} style={{ fontWeight: col.toLowerCase().includes('client') ? '600' : 'normal' }}>
                              {row[col] || '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {comparisonResults.match.length > 10 && (
                    <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem', borderTop: '1px solid var(--border)' }}>
                      + {comparisonResults.match.length - 10} more matched rows hidden for brevity.
                    </div>
                  )}
                </div>
              </div>

            </div>
          ) : (
            <div className="panel" style={{ overflowX: 'auto' }}>
              <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)' }}>
                <h3 style={{ margin: 0 }}>Spreadsheet Preview</h3>
              </div>
              <div style={{ padding: '0 1.5rem 1.5rem 1.5rem' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      {getColumns().map(col => <th key={col}>{col}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {fileData.slice(0, 10).map((row, i) => (
                      <tr key={i}>
                        {getColumns().map(col => (
                          <td key={col} style={{ fontWeight: col.toLowerCase().includes('client') ? '600' : 'normal' }}>
                            {row[col] || '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {fileData.length > 10 && (
                  <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem', borderTop: '1px solid var(--border)' }}>
                    + {fileData.length - 10} more rows. Click "Cross-Check" above to begin analysis.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
        </div>
      </div>
    </main>
  );
}

// Quick component for a simple Table icon
function Tableize({ size, color }: { size: number, color: string }) {
  return <Table size={size} color={color} />
}
