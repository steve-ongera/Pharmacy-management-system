// src/pages/SalesPage.jsx
import { useEffect, useState, useCallback } from 'react'
import { saleApi, getErrorMessage } from '@/utils/api'
import ReceiptModal from '@components/ReceiptModal'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

const METHOD_BADGE = {
  cash:  { cls: 'badge-info',    icon: 'bi-cash-coin',   label: 'Cash'   },
  mpesa: { cls: 'badge-success', icon: 'bi-phone-fill',  label: 'M-Pesa' },
  card:  { cls: 'badge-warning', icon: 'bi-credit-card', label: 'Card'   },
}

const STATUS_BADGE = {
  completed: { cls: 'badge-success', icon: 'bi-check-circle-fill' },
  pending:   { cls: 'badge-warning', icon: 'bi-clock-fill'        },
  cancelled: { cls: 'badge-danger',  icon: 'bi-x-circle-fill'     },
  refunded:  { cls: 'badge-muted',   icon: 'bi-arrow-counterclockwise' },
}

export default function SalesPage() {
  const [sales, setSales]     = useState([])
  const [loading, setLoading] = useState(true)
  const [receipt, setReceipt] = useState(null)
  const [viewing, setViewing] = useState(false)
  const [filters, setFilters] = useState({
    date_from: '', date_to: '', payment_method: '', status: '',
  })

  const load = useCallback(() => {
    setLoading(true)
    const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v))
    saleApi.list(params)
      .then(({ data }) => setSales(data.results ?? data))
      .catch(() => toast.error('Failed to load sales'))
      .finally(() => setLoading(false))
  }, [filters])

  useEffect(() => { load() }, [load])

  async function viewSale(id) {
    setViewing(true)
    try {
      const { data } = await saleApi.get(id)
      setReceipt(data)
    } catch { toast.error('Failed to load sale') }
    finally { setViewing(false) }
  }

  function setFilter(field) {
    return (e) => setFilters((p) => ({ ...p, [field]: e.target.value }))
  }

  function clearFilters() {
    setFilters({ date_from: '', date_to: '', payment_method: '', status: '' })
  }

  const hasFilters = Object.values(filters).some(Boolean)

  // Totals
  const totalRevenue = sales
    .filter((s) => s.status === 'completed')
    .reduce((sum, s) => sum + parseFloat(s.total_amount), 0)

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-header-title">Sales History</h1>
          <p className="page-header-sub">
            {sales.length} record{sales.length !== 1 ? 's' : ''}
            {hasFilters ? ' (filtered)' : ''}
            {sales.length > 0 && ` · KES ${totalRevenue.toLocaleString()} revenue`}
          </p>
        </div>
        <button className="btn btn-secondary" onClick={load} title="Refresh">
          <i className="bi bi-arrow-clockwise" /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="sales-filters">
        <div className="form-group" style={{ margin: 0 }}>
          <div className="input-wrapper">
            <span className="input-icon"><i className="bi bi-calendar3" /></span>
            <input
              className="form-control"
              type="date"
              style={{ paddingLeft: 38 }}
              value={filters.date_from}
              onChange={setFilter('date_from')}
              title="From date"
            />
          </div>
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <div className="input-wrapper">
            <span className="input-icon"><i className="bi bi-calendar3" /></span>
            <input
              className="form-control"
              type="date"
              style={{ paddingLeft: 38 }}
              value={filters.date_to}
              onChange={setFilter('date_to')}
              title="To date"
            />
          </div>
        </div>
        <select className="form-control" style={{ width: 160 }} value={filters.payment_method} onChange={setFilter('payment_method')}>
          <option value="">All Payments</option>
          <option value="cash">Cash</option>
          <option value="mpesa">M-Pesa</option>
          <option value="card">Card</option>
        </select>
        <select className="form-control" style={{ width: 160 }} value={filters.status} onChange={setFilter('status')}>
          <option value="">All Status</option>
          <option value="completed">Completed</option>
          <option value="pending">Pending</option>
          <option value="cancelled">Cancelled</option>
        </select>
        {hasFilters && (
          <button className="btn btn-ghost btn-sm" onClick={clearFilters}>
            <i className="bi bi-x" /> Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="table-wrapper animate-fade-up">
        {loading ? (
          <div className="loading-overlay">
            <div className="spinner spinner-lg" />
            <span>Loading sales…</span>
          </div>
        ) : sales.length === 0 ? (
          <div className="empty-state">
            <i className="bi bi-receipt-cutoff" />
            <h4>No sales found</h4>
            <p>{hasFilters ? 'Try clearing the filters.' : 'Sales will appear here after your first transaction.'}</p>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Receipt</th>
                <th>Customer</th>
                <th>Cashier</th>
                <th>Items</th>
                <th>Total</th>
                <th>Payment</th>
                <th>Status</th>
                <th>Date &amp; Time</th>
                <th style={{ width: 80 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((s) => {
                const method = METHOD_BADGE[s.payment_method] || METHOD_BADGE.cash
                const stat   = STATUS_BADGE[s.status]   || STATUS_BADGE.completed

                return (
                  <tr key={s.id}>
                    <td>
                      <span style={{
                        fontFamily: 'var(--font-mono)', fontSize: 11.5,
                        color: 'var(--primary)', letterSpacing: '0.02em',
                      }}>
                        {s.receipt_number}
                      </span>
                    </td>
                    <td style={{ fontWeight: 500 }}>{s.customer_name}</td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{s.cashier_name}</td>
                    <td>
                      <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                        {s.items?.length ?? 0} item{(s.items?.length ?? 0) !== 1 ? 's' : ''}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--primary)' }}>
                        KES {parseFloat(s.total_amount).toLocaleString()}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${method.cls}`}>
                        <i className={`bi ${method.icon}`} />
                        {method.label}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${stat.cls}`}>
                        <i className={`bi ${stat.icon}`} />
                        {s.status}
                      </span>
                    </td>
                    <td style={{ fontSize: 12.5, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                      {format(new Date(s.created_at), 'dd MMM yyyy, HH:mm')}
                    </td>
                    <td>
                      <button
                        className="btn btn-ghost btn-sm btn-icon"
                        title="View Receipt"
                        onClick={() => viewSale(s.id)}
                        disabled={viewing}
                      >
                        {viewing ? <div className="spinner" /> : <i className="bi bi-receipt" />}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {receipt && <ReceiptModal sale={receipt} onClose={() => setReceipt(null)} />}
    </div>
  )
}