// src/pages/POSPage.jsx
import { useState, useEffect, useRef, useCallback } from 'react'
import { medicineApi, saleApi, getErrorMessage } from '@/utils/api'
import { useDebounce } from '@hooks/useDebounce'
import MpesaModal from '@components/MpesaModal'
import ReceiptModal from '@components/ReceiptModal'
import toast from 'react-hot-toast'

export default function POSPage() {
  const [query, setQuery]         = useState('')
  const [results, setResults]     = useState([])
  const [showDrop, setShowDrop]   = useState(false)
  const [cart, setCart]           = useState([])
  const [customer, setCustomer]   = useState({ name: 'Walk-in Customer', phone: '' })
  const [payment, setPayment]     = useState('cash')
  const [discount, setDiscount]   = useState('')
  const [amountPaid, setAmtPaid]  = useState('')
  const [processing, setProc]     = useState(false)
  const [mpesaSale, setMpesa]     = useState(null)
  const [receipt, setReceipt]     = useState(null)
  const debouncedQ                = useDebounce(query, 250)
  const searchRef                 = useRef()
  const dropRef                   = useRef()

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (!dropRef.current?.contains(e.target) && !searchRef.current?.contains(e.target)) {
        setShowDrop(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Search medicines
  useEffect(() => {
    if (!debouncedQ.trim()) { setResults([]); setShowDrop(false); return }
    medicineApi.posSearch(debouncedQ)
      .then(({ data }) => { setResults(data); setShowDrop(data.length > 0) })
      .catch(() => {})
  }, [debouncedQ])

  function addToCart(med) {
    setCart((prev) => {
      const exists = prev.find((i) => i.id === med.id)
      if (exists) return prev.map((i) => i.id === med.id ? { ...i, qty: i.qty + 1 } : i)
      return [...prev, { ...med, qty: 1 }]
    })
    setQuery('')
    setResults([])
    setShowDrop(false)
    searchRef.current?.focus()
  }

  function updateQty(id, delta) {
    setCart((prev) =>
      prev
        .map((i) => i.id === id ? { ...i, qty: i.qty + delta } : i)
        .filter((i) => i.qty > 0)
    )
  }

  function setQty(id, val) {
    const n = parseInt(val, 10)
    if (isNaN(n) || n < 0) return
    if (n === 0) setCart((prev) => prev.filter((i) => i.id !== id))
    else setCart((prev) => prev.map((i) => i.id === id ? { ...i, qty: n } : i))
  }

  function removeItem(id) { setCart((prev) => prev.filter((i) => i.id !== id)) }
  function clearCart() { setCart([]); setDiscount(''); setAmtPaid('') }

  const subtotal    = cart.reduce((s, i) => s + parseFloat(i.price) * i.qty, 0)
  const discountAmt = parseFloat(discount || 0)
  const total       = Math.max(0, subtotal - discountAmt)
  const paid        = parseFloat(amountPaid || 0)
  const change      = payment === 'cash' && paid > total ? paid - total : 0

  async function processSale() {
    if (!cart.length) { toast.error('Cart is empty'); return }
    if (payment === 'cash' && parseFloat(amountPaid || 0) < total && amountPaid) {
      toast.error('Amount paid is less than total')
      return
    }
    setProc(true)
    try {
      const { data: sale } = await saleApi.create({
        customer_name: customer.name || 'Walk-in Customer',
        customer_phone: customer.phone,
        payment_method: payment,
        discount: discountAmt,
        amount_paid: payment === 'cash' ? (paid || total) : total,
        items: cart.map((i) => ({
          medicine_id: i.id,
          quantity: i.qty,
          unit_price: parseFloat(i.price),
        })),
      })

      if (payment === 'mpesa') {
        setMpesa(sale)
      } else {
        toast.success('Sale completed!')
        const { data: full } = await saleApi.get(sale.id)
        setReceipt(full)
        clearCart()
        setCustomer({ name: 'Walk-in Customer', phone: '' })
      }
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setProc(false)
    }
  }

  async function onMpesaSuccess() {
    setMpesa(null)
    const { data: full } = await saleApi.get(mpesaSale.id)
    setReceipt(full)
    clearCart()
    setCustomer({ name: 'Walk-in Customer', phone: '' })
  }

  const PAYMENT_OPTIONS = [
    { value: 'cash',  label: 'Cash',   icon: 'bi-cash-coin' },
    { value: 'mpesa', label: 'M-Pesa', icon: 'bi-phone-fill' },
    { value: 'card',  label: 'Card',   icon: 'bi-credit-card' },
  ]

  return (
    <div className="pos-layout">
      {/* ── LEFT: Search + Cart ── */}
      <div className="pos-left">
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 2 }}>
            Point of Sale
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
            {cart.length} item{cart.length !== 1 ? 's' : ''} in cart
          </p>
        </div>

        {/* Search */}
        <div style={{ position: 'relative' }}>
          <div className="input-wrapper" ref={searchRef}>
            <span className="input-icon"><i className="bi bi-search" /></span>
            <input
              className="form-control"
              placeholder="Search medicine or scan barcode…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => results.length > 0 && setShowDrop(true)}
              style={{ fontSize: 15, padding: '13px 14px 13px 42px' }}
              autoFocus
            />
            {query && (
              <button
                className="input-icon-right btn-ghost"
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                onClick={() => { setQuery(''); setResults([]); setShowDrop(false) }}
              >
                <i className="bi bi-x" style={{ fontSize: 16 }} />
              </button>
            )}
          </div>

          {showDrop && (
            <div className="search-dropdown" ref={dropRef}>
              {results.map((m) => (
                <div key={m.id} className="search-result-item" onClick={() => addToCart(m)}>
                  <div className="medicine-thumb" style={{ width: 38, height: 38 }}>
                    {m.image
                      ? <img src={m.image} alt={m.name} />
                      : <i className="bi bi-capsule-pill" style={{ fontSize: 16 }} />
                    }
                  </div>
                  <div className="search-result-info">
                    <div className="search-result-name">{m.name}</div>
                    <div className="search-result-meta">
                      {m.unit} · Stock: {m.stock_quantity}
                      {m.is_low_stock && <span style={{ color: 'var(--warning)', marginLeft: 6 }}>Low stock</span>}
                    </div>
                  </div>
                  <span className="search-result-price">KES {parseFloat(m.price).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cart */}
        <div className="pos-cart">
          <div className="pos-cart-header">
            <i className="bi bi-cart3" style={{ color: 'var(--primary)' }} />
            Cart
            {cart.length > 0 && (
              <button
                className="btn btn-ghost btn-sm"
                style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--danger)', padding: '4px 10px' }}
                onClick={clearCart}
              >
                <i className="bi bi-trash" /> Clear
              </button>
            )}
          </div>

          {cart.length === 0 ? (
            <div className="empty-state" style={{ padding: '40px 24px' }}>
              <i className="bi bi-cart-x" style={{ fontSize: 40, color: 'var(--border-strong)' }} />
              <h4>Cart is empty</h4>
              <p>Search and click a medicine above to add it.</p>
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Medicine</th>
                  <th style={{ width: 110 }}>Qty</th>
                  <th>Unit Price</th>
                  <th>Total</th>
                  <th style={{ width: 40 }} />
                </tr>
              </thead>
              <tbody>
                {cart.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 13.5 }}>{item.name}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>{item.unit}</div>
                    </td>
                    <td>
                      <div className="qty-control">
                        <button className="qty-btn" onClick={() => updateQty(item.id, -1)}>−</button>
                        <input
                          type="number"
                          className="qty-value"
                          style={{ background: 'none', border: 'none', outline: 'none', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontWeight: 600, textAlign: 'center', width: 36 }}
                          value={item.qty}
                          onChange={(e) => setQty(item.id, e.target.value)}
                          min={1}
                        />
                        <button className="qty-btn" onClick={() => updateQty(item.id, 1)}>+</button>
                      </div>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>
                      KES {parseFloat(item.price).toLocaleString()}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--primary)', fontSize: 13.5 }}>
                      KES {(parseFloat(item.price) * item.qty).toLocaleString()}
                    </td>
                    <td>
                      <button
                        className="btn btn-ghost btn-icon btn-sm"
                        style={{ color: 'var(--danger)' }}
                        onClick={() => removeItem(item.id)}
                        title="Remove"
                      >
                        <i className="bi bi-trash3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── RIGHT: Checkout Panel ── */}
      <div className="pos-right">
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, borderBottom: '1px solid var(--border)', paddingBottom: 14 }}>
          <i className="bi bi-cash-register" style={{ marginRight: 8, color: 'var(--primary)' }} />
          Checkout
        </h3>

        {/* Customer */}
        <div className="form-group">
          <label className="form-label">Customer Name</label>
          <div className="input-wrapper">
            <span className="input-icon"><i className="bi bi-person" /></span>
            <input
              className="form-control"
              value={customer.name}
              onChange={(e) => setCustomer((p) => ({ ...p, name: e.target.value }))}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Phone Number</label>
          <div className="input-wrapper">
            <span className="input-icon"><i className="bi bi-telephone" /></span>
            <input
              className="form-control"
              type="tel"
              placeholder="07XXXXXXXX"
              value={customer.phone}
              onChange={(e) => setCustomer((p) => ({ ...p, phone: e.target.value }))}
            />
          </div>
        </div>

        {/* Payment Method */}
        <div className="form-group">
          <label className="form-label">Payment Method</label>
          <div className="payment-toggle">
            {PAYMENT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                className={`payment-toggle-btn ${payment === opt.value ? 'active' : ''}`}
                onClick={() => { setPayment(opt.value); setAmtPaid('') }}
              >
                <i className={`bi ${opt.icon}`} style={{ display: 'block', marginBottom: 2 }} />
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Discount */}
        <div className="form-group">
          <label className="form-label">Discount (KES)</label>
          <div className="input-wrapper">
            <span className="input-icon"><i className="bi bi-tag" /></span>
            <input
              className="form-control"
              type="number"
              min="0"
              max={subtotal}
              placeholder="0"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
            />
          </div>
        </div>

        {/* Amount Received (cash only) */}
        {payment === 'cash' && (
          <div className="form-group">
            <label className="form-label">Amount Received (KES)</label>
            <div className="input-wrapper">
              <span className="input-icon"><i className="bi bi-cash" /></span>
              <input
                className="form-control"
                type="number"
                min={total}
                placeholder={total.toFixed(2)}
                value={amountPaid}
                onChange={(e) => setAmtPaid(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Summary */}
        <div className="checkout-summary">
          <div className="checkout-row">
            <span style={{ color: 'var(--text-secondary)' }}>Subtotal</span>
            <span style={{ fontFamily: 'var(--font-mono)' }}>KES {subtotal.toLocaleString()}</span>
          </div>
          {discountAmt > 0 && (
            <div className="checkout-row" style={{ color: 'var(--danger)' }}>
              <span>Discount</span>
              <span style={{ fontFamily: 'var(--font-mono)' }}>−KES {discountAmt.toLocaleString()}</span>
            </div>
          )}
          <div className="checkout-row total">
            <span>TOTAL</span>
            <span style={{ fontFamily: 'var(--font-mono)' }}>KES {total.toLocaleString()}</span>
          </div>
          {payment === 'cash' && paid > 0 && paid >= total && (
            <div className="checkout-row change">
              <span><i className="bi bi-arrow-return-left" style={{ marginRight: 4 }} />Change</span>
              <span style={{ fontFamily: 'var(--font-mono)' }}>KES {change.toLocaleString()}</span>
            </div>
          )}
        </div>

        {/* Process Button */}
        <button
          className="btn btn-primary w-full"
          style={{ padding: '13px', fontSize: 15, justifyContent: 'center', gap: 10 }}
          onClick={processSale}
          disabled={processing || cart.length === 0}
        >
          {processing ? (
            <><div className="spinner" style={{ borderTopColor: '#000' }} /> Processing…</>
          ) : payment === 'mpesa' ? (
            <><i className="bi bi-phone-fill" /> Send M-Pesa Request</>
          ) : (
            <><i className="bi bi-bag-check-fill" /> Complete Sale</>
          )}
        </button>

        {cart.length > 0 && (
          <button className="btn btn-danger w-full" style={{ justifyContent: 'center' }} onClick={clearCart}>
            <i className="bi bi-x-circle" /> Clear Cart
          </button>
        )}

        {/* Item count summary at bottom */}
        {cart.length > 0 && (
          <div style={{
            marginTop: 'auto', paddingTop: 12, borderTop: '1px solid var(--border)',
            display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-secondary)',
          }}>
            <span>{cart.length} item type{cart.length !== 1 ? 's' : ''}</span>
            <span>{cart.reduce((s, i) => s + i.qty, 0)} units total</span>
          </div>
        )}
      </div>

      {mpesaSale && (
        <MpesaModal
          sale={mpesaSale}
          onSuccess={onMpesaSuccess}
          onClose={() => setMpesa(null)}
        />
      )}

      {receipt && (
        <ReceiptModal sale={receipt} onClose={() => setReceipt(null)} />
      )}
    </div>
  )
}