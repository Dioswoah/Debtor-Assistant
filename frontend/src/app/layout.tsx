import type { Metadata } from 'next'
import './globals.css'
import Navigation from '@/components/Navigation'

export const metadata: Metadata = {
  title: 'Debtor Overview',
  description: 'AI-Enhanced Debtor Triage and Collections Dashboard',
}

import { CompanyProvider } from '@/context/CompanyContext'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning={true}>
      <body>
        <CompanyProvider>
          <div className="app-container" style={{ flexDirection: 'column' }}>
            <Navigation />
            <div style={{ display: 'flex', flex: 1 }}>
              {children}
            </div>
          </div>
        </CompanyProvider>
      </body>
    </html>
  )
}
