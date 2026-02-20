// src/components/ReceiptModal.jsx
import { format } from 'date-fns'

export default function ReceiptModal({ sale, onClose }) {
  function handlePrint() {
    const w = window.open('', '_blank', 'width=380,height=620')
    w.document.write(`
<!DOCTYPE html>
<html>
<head>
  <title>Receipt ${sale.receipt_number}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Courier New', monospace;
      font-size: 12px;
      padding: 16px;
      color: #111;
      max-width: 320px;
      margin: 0 auto;
    }
    .center { text-align: center; }
    .row { display: flex; justify-content: space-between; margin: 3px 0; }
    hr { border: none; border-top: 1px dashed #999; margin: 8px 0; }
    .bold { font-weight: bold; }
    .total { font-size: 14px; font-weight: bold; }
    .header { margin-bottom: 12px; }
    .footer { margin-top: 12px; font-size: 11px; color: #555; }
    @media print {
      body { padding: 4px; }
    }
  </style>
</head>
<body>
  <div class="header center">
    <div class="bold" style="font-size:16px;letter-spacing:2px;">★ PharmacOS ★</div>
    <div>Pharmacy Management</div>
    <div style="margin-top:6px;font-size:11px;">Receipt: ${sale.receipt_number}</div>
    <div style="font-size:11px;">${format(new Date(sale.created_at), 'PPpp')}</div>
  </div>
  <hr/>
  <div class="row"><span>Customer:</span><span>${sale.customer_name}</span></div>
  <div class="row"><span>Cashier:</span><span>${sale.cashier_name}</span></div>
  ${sale.customer_phone ? `<div class="row"><span>Phone:</span><span>${sale.customer_phone}</span></div>` : ''}
  <hr/>
  ${(sale.items || []).map(i => `
    <div class="row">
      <span style="flex:1;overflow:hidden;">${i.medicine_name}</span>
      <span style="margin-left:8px;">x${i.quantity}</span>
    </div>
    <div class="row" style="padding-left:8px;color:#555;font-size:11px;">
      <span>${i.quantity} × KES ${parseFloat(i.unit_price).toFixed(2)}</span>
      <span>KES ${parseFloat(i.total_price).toFixed(2)}</span>
    </div>
  `).join('')}
  <hr/>
  <div class="row"><span>Subtotal</span><span>KES ${parseFloat(sale.subtotal).toFixed(2)}</span></div>
  ${parseFloat(sale.discount) > 0 ? `<div class="row"><span>Discount</span><span>-KES ${parseFloat(sale.discount).toFixed(2)}</span></div>` : ''}
  <div class="row total"><span>TOTAL</span><span>KES ${parseFloat(sale.total_amount).toFixed(2)}</span></div>
  <div class="row"><span>Paid (${sale.payment_method.toUpperCase()})</span><span>KES ${parseFloat(sale.amount_paid).toFixed(2)}</span></div>
  ${parseFloat(sale.change_amount) > 0 ? `<div class="row"><span>Change</span><span>KES ${parseFloat(sale.change_amount).toFixed(2)}</span></div>` : ''}
  <hr/>
  <div class="footer center">
    <div>Thank you for shopping with us!</div>
    <div>Get well soon 💊</div>
    <div style="margin-top:6px;font-size:10px;">Powered by PharmacOS</div>
  </div>
</body>
</html>`)
    w.document.close()
    setTimeout(() => { w.focus(); w.print(); }, 300)
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-sm animate-scale-in">
        <div className="modal-header">
          <h2 className="modal-title">
            <i className="bi bi-receipt" style={{ marginRight: 8, color: 'var(--primary)' }} />
            Receipt
          </h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary btn-sm" onClick={handlePrint}>
              <i className="bi bi-printer" /> Print
            </button>
            <button className="modal-close" onClick={onClose} aria-label="Close">
              <i className="bi bi-x-lg" />
            </button>
          </div>
        </div>

        <div className="receipt-body">
          <div className="receipt-header">
            <h3>★ PharmacOS ★</h3>
            <p style={{ marginTop: 4 }}>{sale.receipt_number}</p>
            <p>{format(new Date(sale.created_at), 'PPpp')}</p>
          </div>
          <hr className="receipt-divider" />

          <div className="receipt-row">
            <span className="label">Customer</span>
            <span>{sale.customer_name}</span>
          </div>
          <div className="receipt-row">
            <span className="label">Cashier</span>
            <span>{sale.cashier_name}</span>
          </div>
          {sale.customer_phone && (
            <div className="receipt-row">
              <span className="label">Phone</span>
              <span>{sale.customer_phone}</span>
            </div>
          )}

          <hr className="receipt-divider" />

          {(sale.items || []).map((item, i) => (
            <div key={i} style={{ marginBottom: 8 }}>
              <div className="receipt-row">
                <span style={{ fontWeight: 600 }}>{item.medicine_name}</span>
                <span style={{ color: 'var(--primary)', fontWeight: 700 }}>
                  KES {parseFloat(item.total_price).toLocaleString()}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-secondary)', paddingLeft: 8 }}>
                <span>{item.quantity} × KES {parseFloat(item.unit_price).toLocaleString()}</span>
              </div>
            </div>
          ))}

          <hr className="receipt-divider" />

          <div className="receipt-row">
            <span className="label">Subtotal</span>
            <span>KES {parseFloat(sale.subtotal).toLocaleString()}</span>
          </div>
          {parseFloat(sale.discount) > 0 && (
            <div className="receipt-row" style={{ color: 'var(--danger)' }}>
              <span>Discount</span>
              <span>-KES {parseFloat(sale.discount).toLocaleString()}</span>
            </div>
          )}
          <div className="receipt-row total">
            <span>TOTAL</span>
            <span>KES {parseFloat(sale.total_amount).toLocaleString()}</span>
          </div>
          <div className="receipt-row">
            <span className="label">Paid ({sale.payment_method})</span>
            <span>KES {parseFloat(sale.amount_paid).toLocaleString()}</span>
          </div>
          {parseFloat(sale.change_amount) > 0 && (
            <div className="receipt-row change">
              <span>Change</span>
              <span>KES {parseFloat(sale.change_amount).toLocaleString()}</span>
            </div>
          )}

          <hr className="receipt-divider" />
          <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: 11.5 }}>
            <div>Thank you for shopping with us!</div>
            <div style={{ marginTop: 2 }}>Get well soon 💊</div>
          </div>
        </div>
      </div>
    </div>
  )
}