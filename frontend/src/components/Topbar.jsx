// src/components/Topbar.jsx
import { format } from 'date-fns'

const PAGE_TITLES = {
  dashboard: 'Dashboard',
  medicines: 'Medicines',
  pos:       'Point of Sale',
  sales:     'Sales History',
}

export default function Topbar({ activePage, onMenuClick }) {
  const now = new Date()
  const dateStr = format(now, "EEE, d MMM yyyy")
  const title = PAGE_TITLES[activePage] || 'PharmacOS'

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          className="topbar-menu-btn"
          onClick={onMenuClick}
          aria-label="Toggle navigation"
        >
          <i className="bi bi-list" />
        </button>
        <h1 className="topbar-title">{title}</h1>
      </div>

      <div className="topbar-right">
        <span className="topbar-date">
          <i className="bi bi-calendar3" style={{ marginRight: 6, fontSize: 12 }} />
          {dateStr}
        </span>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 10px',
            background: 'var(--primary-subtle)',
            border: '1px solid var(--border-accent)',
            borderRadius: 'var(--radius-full)',
            fontSize: 12,
            color: 'var(--primary)',
            fontWeight: 600,
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: 'var(--primary)',
              animation: 'pulse 2s ease infinite',
              display: 'inline-block',
            }}
          />
          Live
        </div>
      </div>
    </header>
  )
}