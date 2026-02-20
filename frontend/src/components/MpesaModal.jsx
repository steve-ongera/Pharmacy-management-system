// src/components/MpesaModal.jsx
import { useState, useEffect, useRef } from 'react'
import { mpesaApi, getErrorMessage } from '@/utils/api'
import toast from 'react-hot-toast'

const POLL_INTERVAL_MS = 5000   // 5s — safe, won't trigger WAF
const MAX_POLLS        = 24     // 24 × 5s = 120s total wait

export default function MpesaModal({ sale, onSuccess, onClose }) {
  const [phone, setPhone]     = useState(sale.customer_phone || '')
  const [loading, setLoading] = useState(false)
  const [status, setStatus]   = useState('idle')   // idle | pending | success | failed | timeout
  const [msg, setMsg]         = useState('')
  const [elapsed, setElapsed] = useState(0)        // seconds shown to user
  const pollRef               = useRef(null)
  const timerRef              = useRef(null)
  const pollCountRef          = useRef(0)

  // Cleanup on unmount
  useEffect(() => () => {
    clearInterval(pollRef.current)
    clearInterval(timerRef.current)
  }, [])

  function stopPolling() {
    clearInterval(pollRef.current)
    clearInterval(timerRef.current)
  }

  function startPolling(checkoutId) {
    pollCountRef.current = 0
    setElapsed(0)

    // Elapsed seconds counter for UX
    timerRef.current = setInterval(() => {
      setElapsed((s) => s + 1)
    }, 1000)

    pollRef.current = setInterval(async () => {
      pollCountRef.current += 1

      try {
        const { data } = await mpesaApi.checkStatus(checkoutId)

        if (data.status === 'success') {
          stopPolling()
          setStatus('success')
          setMsg(data.mpesa_receipt_number
            ? `Receipt: ${data.mpesa_receipt_number}`
            : 'Payment confirmed!')
          setTimeout(onSuccess, 1800)
          return
        }

        if (data.status === 'failed') {
          stopPolling()
          setStatus('failed')
          setMsg(data.result_description || 'Payment failed. Please try again.')
          return
        }

        if (data.status === 'cancelled') {
          stopPolling()
          setStatus('failed')
          setMsg('You cancelled the M-Pesa prompt. Please retry.')
          return
        }

        // Still pending — check if we've waited long enough
        if (pollCountRef.current >= MAX_POLLS) {
          stopPolling()
          setStatus('timeout')
          setMsg('Payment is taking longer than expected.')
        }

      } catch (err) {
        // Network errors — don't stop polling, just skip this tick
        console.warn('[MpesaModal] Status check error:', err)
      }
    }, POLL_INTERVAL_MS)
  }

  async function sendSTK() {
    const trimmed = phone.trim()
    if (!trimmed) { toast.error('Enter a phone number'); return }

    setLoading(true)
    try {
      const { data } = await mpesaApi.stkPush({
        phone_number: trimmed,
        amount: parseFloat(sale.total_amount),
        sale_id: sale.id,
      })
      setStatus('pending')
      setMsg(data.message || 'Check your phone for the M-Pesa prompt')
      startPolling(data.checkout_request_id)
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  function handleCancel() {
    stopPolling()
    onClose()
  }

  function handleRetry() {
    stopPolling()
    setStatus('idle')
    setMsg('')
    setElapsed(0)
  }

  return (
    <div className="modal-overlay">
      <div className="modal modal-sm animate-scale-in" style={{ textAlign: 'center' }}>

        <div style={{ color: 'var(--primary)', fontSize: 28, marginBottom: 8 }}>
          <i className="bi bi-phone-fill" />
        </div>
        <h2 className="modal-title" style={{ marginBottom: 4 }}>M-Pesa STK Push</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13.5, marginBottom: 20 }}>
          Amount:{' '}
          <strong style={{ color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>
            KES {parseFloat(sale.total_amount).toLocaleString()}
          </strong>
        </p>

        {/* ── IDLE ── */}
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
              <button className="btn btn-secondary w-full" onClick={handleCancel}>Cancel</button>
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

        {/* ── PENDING ── */}
        {status === 'pending' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
            <div className="spinner spinner-lg" />
            <p style={{ fontWeight: 600 }}>{msg}</p>
            <p style={{ color: 'var(--text-secondary)', fontSize: 12.5 }}>
              Waiting for confirmation…{' '}
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                {elapsed}s
              </span>
            </p>

            {/* Progress bar */}
            <div style={{
              width: '100%', height: 4, background: 'var(--border)',
              borderRadius: 2, overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: `${Math.min((elapsed / 120) * 100, 100)}%`,
                background: 'var(--primary)',
                transition: 'width 1s linear',
              }} />
            </div>

            <button className="btn btn-secondary" onClick={handleCancel}>
              <i className="bi bi-x-circle" /> Cancel
            </button>
          </div>
        )}

        {/* ── SUCCESS ── */}
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

        {/* ── TIMEOUT (paid but slow callback) ── */}
        {status === 'timeout' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'rgba(255,165,0,0.1)', border: '1px solid rgba(255,165,0,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 28, color: 'orange',
            }}>
              <i className="bi bi-clock-history" />
            </div>
            <p style={{ fontWeight: 700, color: 'orange' }}>Taking Longer Than Expected</p>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
              If you approved the M-Pesa prompt, your payment will be confirmed
              automatically once we receive confirmation from Safaricom.
              Check your M-Pesa messages for a receipt.
            </p>
            <div style={{ display: 'flex', gap: 10, width: '100%', marginTop: 8 }}>
              <button className="btn btn-secondary w-full" onClick={handleCancel}>Close</button>
              <button className="btn btn-primary w-full" onClick={handleRetry}>
                <i className="bi bi-arrow-repeat" /> Try Again
              </button>
            </div>
          </div>
        )}

        {/* ── FAILED / CANCELLED ── */}
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
              <button className="btn btn-secondary w-full" onClick={handleCancel}>Close</button>
              <button className="btn btn-primary w-full" onClick={handleRetry}>
                <i className="bi bi-arrow-repeat" /> Retry
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}