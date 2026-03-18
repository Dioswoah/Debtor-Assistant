"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export interface Company {
  id: number;
  name: string;
}

export const COMPANIES: Company[] = [
  { id: 1, name: "Redmen Operations" },
  { id: 56, name: "Adair Operations" },
  { id: 21, name: "Safety Maps" }
];

interface CompanyContextType {
  selectedCompany: Company;
  setSelectedCompany: (company: Company) => void;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export function CompanyProvider({ children }: { children: React.ReactNode }) {
  const [selectedCompany, setSelectedCompany] = useState<Company>(COMPANIES[0]);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("selectedCompany");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const exists = COMPANIES.find(c => c.id === parsed.id);
        if (exists) setSelectedCompany(exists);
      } catch (e) {
        console.error("Failed to parse saved company", e);
      }
    }
  }, []);

  const handleSetSelectedCompany = (company: Company) => {
    setSelectedCompany(company);
    localStorage.setItem("selectedCompany", JSON.stringify(company));
    // Optional: Refresh page or notify other parts of the app
    window.dispatchEvent(new Event("companyChanged"));
  };

  return (
    <CompanyContext.Provider value={{ selectedCompany, setSelectedCompany: handleSetSelectedCompany }}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error("useCompany must be used within a CompanyProvider");
  }
  return context;
}
