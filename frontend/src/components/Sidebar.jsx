// src/components/Sidebar.jsx
import { useAuth } from '@context/AuthContext'

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard',    icon: 'bi-speedometer2' },
  { key: 'medicines', label: 'Medicines',     icon: 'bi-capsule-pill' },
  { key: 'pos',       label: 'Point of Sale', icon: 'bi-bag-check'   },
  { key: 'sales',     label: 'Sales History', icon: 'bi-receipt'     },
]

export default function Sidebar({ activePage, setPage, isOpen, onClose }) {
  const { user, logout } = useAuth()

  function handleNav(key) {
    setPage(key)
    onClose()   // close drawer on mobile after nav
  }

  const initial = user?.first_name?.[0] || user?.username?.[0] || '?'

  return (
    <>
      {/* Overlay (mobile) */}
      <div
        className={`sidebar-overlay ${isOpen ? 'visible' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside className={`sidebar ${isOpen ? 'open' : ''}`} aria-label="Sidebar navigation">
        {/* Brand */}
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">
            <i className="bi bi-capsule-pill" />
          </div>
          <span className="sidebar-brand-text">
            Pharma<span>OS</span>
          </span>
        </div>

        {/* Nav */}
        <nav className="sidebar-nav">
          <span className="nav-section-label">Main Menu</span>

          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              className={`nav-item ${activePage === item.key ? 'active' : ''}`}
              onClick={() => handleNav(item.key)}
              aria-current={activePage === item.key ? 'page' : undefined}
            >
              <i className={`bi ${item.icon}`} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div
              className="avatar avatar-md"
              style={{
                background: 'linear-gradient(135deg, var(--primary), #00ffa8)',
                color: '#000',
                fontSize: 13,
              }}
            >
              {initial.toUpperCase()}
            </div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">
                {user?.first_name ? `${user.first_name} ${user.last_name}`.trim() : user?.username}
              </div>
              <div className="sidebar-user-role">Pharmacist</div>
            </div>
          </div>

          <button
            className="btn btn-ghost w-full"
            style={{ justifyContent: 'center', gap: 8, fontSize: 13 }}
            onClick={logout}
          >
            <i className="bi bi-box-arrow-right" />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  )
}