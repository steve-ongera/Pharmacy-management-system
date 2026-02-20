// src/components/MpesaModal.jsx
import { useState, useEffect, useRef } from 'react'
import { mpesaApi, getErrorMessage } from '@/utils/api'
import toast from 'react-hot-toast'

export default function MpesaModal({ sale, onSuccess, onClose }) {
  const [phone, setPhone]     = useState(sale.customer_phone || '')
  const [loading, setLoading] = useState(false)
  const [checkoutId, setId]   = useState(null)
  const [status, setStatus]   = useState('idle')   // idle | pending | success | failed
  const [msg, setMsg]         = useState('')
  const pollRef               = useRef(null)

  useEffect(() => () => clearInterval(pollRef.current), [])

  function startPolling(id) {
    pollRef.current = setInterval(async () => {
      try {
        const { data } = await mpesaApi.checkStatus(id)
        if (data.status === 'success') {
          clearInterval(pollRef.current)
          setStatus('success')
          setMsg(data.mpesa_receipt_number ? `Receipt: ${data.mpesa_receipt_number}` : 'Payment confirmed!')
          setTimeout(onSuccess, 1800)
        } else if (['failed', 'cancelled', 'timeout'].includes(data.status)) {
          clearInterval(pollRef.current)
          setStatus('failed')
          setMsg(data.result_description || 'Payment was not completed')
        }
      } catch { /* silent */ }
    }, 3000)
  }

  async function sendSTK() {
    setLoading(true)
    try {
      const { data } = await mpesaApi.stkPush({
        phone_number: phone,
        amount: parseFloat(sale.total_amount),
        sale_id: sale.id,
      })
      setId(data.checkout_request_id)
      setStatus('pending')
      setMsg(data.message || 'Check your phone for the M-Pesa prompt')
      startPolling(data.checkout_request_id)
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal modal-sm animate-scale-in" style={{ textAlign: 'center' }}>
        <div className="mpesa-modal-icon" style={{ color: 'var(--primary)', fontSize: 28 }}>
          <i className="bi bi-phone-fill" />
        </div>

        <h2 className="modal-title" style={{ marginBottom: 4 }}>M-Pesa STK Push</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13.5, marginBottom: 20 }}>
          Amount:{' '}
          <strong style={{ color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>
            KES {parseFloat(sale.total_amount).toLocaleString()}
          </strong>
        </p>

        {/* IDLE — enter phone */}
        {status === 'idle' && (
          <>
            <div className="form-group" style={{ textAlign: 'left', marginBottom: 20 }}>
              <label className="form-label">Customer Phone Number</label>
              <div className="input-wrapper">
                <span className="input-icon"><i className="bi bi-phone" /></span>
                <input
                  className="form-control"
                  type="tel"
                  placeholder="07XXXXXXXX or 254XXXXXXXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-secondary w-full" onClick={onClose}>Cancel</button>
              <button
                className="btn btn-primary w-full"
                onClick={sendSTK}
                disabled={loading || !phone.trim()}
              >
                {loading
                  ? <><div className="spinner" style={{ borderTopColor: '#000' }} /> Sending…</>
                  : <><i className="bi bi-send" /> Send Request</>
                }
              </button>
            </div>
          </>
        )}

        {/* PENDING */}
        {status === 'pending' && (
          <div className="mpesa-status-pending">
            <div className="spinner spinner-lg" />
            <p>{msg}</p>
            <p className="pulse-text">Polling for confirmation every 3s…</p>
            <button className="btn btn-secondary" style={{ marginTop: 8 }} onClick={() => { clearInterval(pollRef.current); onClose() }}>
              Cancel
            </button>
          </div>
        )}

        {/* SUCCESS */}
        {status === 'success' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'rgba(0,214,143,0.15)', border: '2px solid var(--primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 28, color: 'var(--primary)',
            }}>
              <i className="bi bi-check-lg" />
            </div>
            <p style={{ fontWeight: 700, color: 'var(--primary)', fontSize: 16 }}>Payment Successful!</p>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{msg}</p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Opening receipt…</p>
          </div>
        )}

        {/* FAILED */}
        {status === 'failed' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'rgba(255,77,109,0.1)', border: '1px solid rgba(255,77,109,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 28, color: 'var(--danger)',
            }}>
              <i className="bi bi-x-lg" />
            </div>
            <p style={{ fontWeight: 700, color: 'var(--danger)' }}>Payment Failed</p>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{msg}</p>
            <div style={{ display: 'flex', gap: 10, width: '100%', marginTop: 8 }}>
              <button className="btn btn-secondary w-full" onClick={onClose}>Close</button>
              <button className="btn btn-primary w-full" onClick={() => { setStatus('idle'); setMsg('') }}>
                <i className="bi bi-arrow-repeat" /> Retry
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}