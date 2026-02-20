// src/App.jsx
import { useState } from 'react'
import { AuthProvider, useAuth } from '@context/AuthContext'
import { useSidebar } from '@hooks/useSidebar'
import Sidebar from '@components/Sidebar'
import Topbar from '@components/Topbar'
import LoginPage from '@pages/LoginPage'
import DashboardPage from '@pages/DashboardPage'
import MedicinesPage from '@pages/MedicinesPage'
import POSPage from '@pages/POSPage'
import SalesPage from '@pages/SalesPage'

const PAGES = {
  dashboard: DashboardPage,
  medicines: MedicinesPage,
  pos:       POSPage,
  sales:     SalesPage,
}

function AppShell() {
  const { isAuthenticated } = useAuth()
  const [activePage, setActivePage] = useState('dashboard')
  const sidebar = useSidebar()

  if (!isAuthenticated) return <LoginPage />

  const PageComponent = PAGES[activePage] || DashboardPage

  return (
    <div className="app-shell">
      <Sidebar
        activePage={activePage}
        setPage={setActivePage}
        isOpen={sidebar.isOpen}
        onClose={sidebar.close}
      />

      <div className="main-wrapper">
        <Topbar
          activePage={activePage}
          onMenuClick={sidebar.toggle}
        />
        <main className="page-content">
          <PageComponent key={activePage} />
        </main>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  )
}