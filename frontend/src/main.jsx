import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'react-hot-toast'
import App from './App.jsx'

import './styles/global.css'
import './styles/components.css'
import './styles/layout.css'
import './styles/pages.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
    <Toaster
      position="top-right"
      gutter={8}
      toastOptions={{
        duration: 3500,
        style: {
          background: 'var(--bg-card2)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-strong)',
          borderRadius: 'var(--radius-md)',
          fontFamily: 'var(--font-body)',
          fontSize: '13.5px',
          fontWeight: '500',
          padding: '12px 16px',
          boxShadow: 'var(--shadow-lg)',
        },
        success: {
          iconTheme: { primary: 'var(--primary)', secondary: '#000' },
          style: { borderColor: 'rgba(0,214,143,0.3)' },
        },
        error: {
          iconTheme: { primary: 'var(--danger)', secondary: '#fff' },
          style: { borderColor: 'rgba(255,77,109,0.3)' },
        },
      }}
    />
  </StrictMode>
)