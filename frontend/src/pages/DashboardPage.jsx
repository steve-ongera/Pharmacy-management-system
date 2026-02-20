// src/pages/DashboardPage.jsx
import { useEffect, useState } from 'react'
import { saleApi } from '@/utils/api'
import toast from 'react-hot-toast'
import { format, parseISO } from 'date-fns'

function StatCard({ label, value, icon, accent, sub, iconBg }) {
  return (
    <div className="stat-card animate-fade-up">
      <div
        className="stat-icon"
        style={{ background: iconBg || `${accent}20`, color: accent }}
      >
        <i className={`bi ${icon}`} />
      </div>
      <div>
        <div className="stat-label">{label}</div>
        <div className="stat-value" style={{ color: accent || 'var(--text-primary)' }}>
          {value}
        </div>
        {sub && <div className="stat-sub">{sub}</div>}
      </div>
    </div>
  )
}

function SalesBarChart({ data }) {
  if (!data?.length) return null
  const max = Math.max(...data.map((d) => d.total), 1)
  const today = format(new Date(), 'yyyy-MM-dd')

  return (
    <div className="bar-chart-container">
      {data.map((d, i) => {
        const pct = (d.total / max) * 100
        const isToday = d.date === today
        const label = format(parseISO(d.date), 'EEE')
        const shortAmt = d.total >= 1000 ? `${(d.total / 1000).toFixed(1)}k` : d.total > 0 ? d.total.toFixed(0) : ''

        return (
          <div key={i} className="bar-chart-col">
            <div className="bar-chart-value">{shortAmt}</div>
            <div className="bar-chart-bar-wrap">
              <div
                className={`bar-chart-bar ${isToday ? 'today' : ''}`}
                style={{ height: `${Math.max(pct, 3)}%` }}
                title={`KES ${d.total.toLocaleString()}`}
              />
            </div>
            <div className="bar-chart-label" style={{ color: isToday ? 'var(--primary)' : undefined, fontWeight: isToday ? 700 : 600 }}>
              {label}
            </div>
          </div>
        )
      })}
    </div>
  )
}

const PAYMENT_COLORS = {
  cash:  { color: 'var(--info)',    icon: 'bi-cash-coin' },
  mpesa: { color: 'var(--primary)', icon: 'bi-phone-fill' },
  card:  { color: 'var(--warning)', icon: 'bi-credit-card' },
}

export default function DashboardPage() {
  const [stats, setStats]   = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    saleApi.dashboardStats()
      .then(({ data }) => setStats(data))
      .catch(() => toast.error('Failed to load dashboard'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="loading-overlay">
        <div className="spinner spinner-lg" />
        <span>Loading dashboard…</span>
      </div>
    )
  }

  const totalPayments = Object.values(stats?.payment_breakdown || {}).reduce((a, b) => a + b, 0)

  return (
    <div>
      <div
        className="page-header flex justify-between items-center"
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}
      >
        <div>
          <h1 className="page-header-title">Dashboard</h1>
          <p className="page-header-sub">
            {format(new Date(), "EEEE, MMMM d, yyyy")} · Live overview
          </p>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 14px',
            background: 'var(--primary-subtle)',
            border: '1px solid var(--border-accent)',
            borderRadius: 'var(--radius-full)',
            fontSize: 12.5,
            color: 'var(--primary)',
            fontWeight: 600,
          }}
        >
          <i className="bi bi-graph-up-arrow" />
          Today's Revenue: KES {(stats?.total_sales_today || 0).toLocaleString()}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="dashboard-stats stagger">
        <StatCard
          label="Revenue Today"
          value={`KES ${(stats?.total_sales_today || 0).toLocaleString()}`}
          icon="bi-currency-exchange"
          accent="var(--primary)"
        />
        <StatCard
          label="Transactions"
          value={stats?.total_transactions_today ?? 0}
          icon="bi-bag-check-fill"
          accent="var(--info)"
          sub="Completed today"
        />
        <StatCard
          label="Low Stock"
          value={stats?.low_stock_count ?? 0}
          icon="bi-exclamation-triangle-fill"
          accent="var(--warning)"
          sub="Need reorder"
        />
        <StatCard
          label="Expired"
          value={stats?.expired_count ?? 0}
          icon="bi-calendar-x-fill"
          accent="var(--danger)"
          sub="Remove from shelf"
        />
      </div>

      {/* Charts Row */}
      <div className="chart-row">
        {/* Bar Chart */}
        <div className="card animate-fade-up">
          <div className="card-header">
            <div>
              <div className="card-title">Sales — Last 7 Days</div>
              <div className="card-subtitle">Daily revenue trend</div>
            </div>
            <i className="bi bi-bar-chart-line" style={{ fontSize: 18, color: 'var(--text-muted)' }} />
          </div>
          <SalesBarChart data={stats?.sales_this_week} />
        </div>

        {/* Payment Breakdown */}
        <div className="card animate-fade-up">
          <div className="card-header">
            <div>
              <div className="card-title">Payment Methods</div>
              <div className="card-subtitle">Today's breakdown</div>
            </div>
            <i className="bi bi-pie-chart" style={{ fontSize: 18, color: 'var(--text-muted)' }} />
          </div>

          {Object.entries(stats?.payment_breakdown || {}).map(([method, amt]) => {
            const conf = PAYMENT_COLORS[method] || { color: 'var(--info)', icon: 'bi-cash' }
            const pct = totalPayments > 0 ? ((amt / totalPayments) * 100).toFixed(0) : 0
            return (
              <div key={method} className="payment-item">
                <div className="payment-item-header">
                  <span className="payment-item-label" style={{ color: conf.color }}>
                    <i className={`bi ${conf.icon}`} />
                    {method === 'mpesa' ? 'M-Pesa' : method.charAt(0).toUpperCase() + method.slice(1)}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="payment-item-amount">KES {amt.toLocaleString()}</span>
                    <span style={{ fontSize: 11, color: conf.color, fontWeight: 700 }}>{pct}%</span>
                  </div>
                </div>
                <div className="payment-bar-track">
                  <div
                    className="payment-bar-fill"
                    style={{ width: `${pct}%`, background: conf.color }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Top Medicines */}
      <div className="card animate-fade-up">
        <div className="card-header">
          <div>
            <div className="card-title">Top Medicines This Week</div>
            <div className="card-subtitle">By units sold</div>
          </div>
          <i className="bi bi-trophy" style={{ fontSize: 18, color: 'var(--warning)' }} />
        </div>

        {stats?.top_medicines?.length ? (
          <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Medicine</th>
                  <th>Units Sold</th>
                  <th>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {stats.top_medicines.map((m, i) => (
                  <tr key={i}>
                    <td>
                      <span
                        style={{
                          width: 26, height: 26, borderRadius: '50%',
                          background: i === 0 ? 'rgba(255,176,32,0.15)' : 'var(--bg-surface)',
                          color: i === 0 ? 'var(--warning)' : 'var(--text-secondary)',
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-mono)',
                        }}
                      >
                        {i + 1}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{m.medicine_name}</td>
                    <td>
                      <span className="badge badge-success">
                        <i className="bi bi-box-seam" />
                        {m.total_qty} units
                      </span>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--primary)', fontWeight: 600 }}>
                      KES {parseFloat(m.total_revenue).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <i className="bi bi-bar-chart-steps" />
            <h4>No sales data yet</h4>
            <p>Top medicines will appear here after your first sale.</p>
          </div>
        )}
      </div>
    </div>
  )
}