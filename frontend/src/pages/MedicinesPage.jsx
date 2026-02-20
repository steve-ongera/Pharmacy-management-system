// src/pages/MedicinesPage.jsx
import { useEffect, useState, useCallback, useRef } from 'react'
import { medicineApi, categoryApi, getErrorMessage } from '@/utils/api'
import { useDebounce } from '@hooks/useDebounce'
import toast from 'react-hot-toast'

const UNITS = ['tablet','capsule','syrup','injection','cream','drops','sachet','unit']

const EMPTY_FORM = {
  name: '', generic_name: '', category: '', unit: 'tablet',
  price: '', cost_price: '0', stock_quantity: '0', reorder_level: '10',
  manufacturer: '', barcode: '', expiry_date: '', requires_prescription: false,
  description: '',
}

function MedicineModal({ editing, categories, onClose, onSaved }) {
  const [form, setForm]       = useState(editing ? { ...editing, category: editing.category, requires_prescription: editing.requires_prescription } : EMPTY_FORM)
  const [imageFile, setImg]   = useState(null)
  const [preview, setPreview] = useState(editing?.image || null)
  const [saving, setSaving]   = useState(false)
  const fileRef               = useRef()

  function set(field) {
    return (e) => setForm((p) => ({ ...p, [field]: e.target.value }))
  }

  function handleImageChange(e) {
    const file = e.target.files[0]
    if (!file) return
    setImg(file)
    setPreview(URL.createObjectURL(file))
  }

  async function handleSave() {
    if (!form.name || !form.price) {
      toast.error('Name and price are required')
      return
    }
    setSaving(true)
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => {
        if (v !== null && v !== undefined && k !== 'image') {
          fd.append(k, v)
        }
      })
      if (imageFile) fd.append('image', imageFile)

      if (editing) {
        await medicineApi.update(editing.id, fd)
        toast.success('Medicine updated')
      } else {
        await medicineApi.create(fd)
        toast.success('Medicine added')
      }
      onSaved()
      onClose()
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const F = ({ label, name, type = 'text', placeholder }) => (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <input
        className="form-control"
        type={type}
        placeholder={placeholder}
        value={form[name] ?? ''}
        onChange={set(name)}
      />
    </div>
  )

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg animate-scale-in">
        <div className="modal-header">
          <h2 className="modal-title">
            <i className={`bi ${editing ? 'bi-pencil-square' : 'bi-plus-circle'}`} style={{ marginRight: 8, color: 'var(--primary)' }} />
            {editing ? 'Edit Medicine' : 'Add Medicine'}
          </h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <i className="bi bi-x-lg" />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Image upload */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div
              style={{
                width: 80, height: 80, borderRadius: 'var(--radius-lg)',
                background: 'var(--bg-surface)', border: '1px solid var(--border)',
                overflow: 'hidden', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--text-muted)', fontSize: 26,
              }}
            >
              {preview
                ? <img src={preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <i className="bi bi-image" />
              }
            </div>
            <div style={{ flex: 1 }}>
              <label className="form-label">Product Image</label>
              <div className="file-input-wrapper">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                />
                <div className="file-input-display">
                  <i className="bi bi-cloud-upload" style={{ fontSize: 16 }} />
                  {imageFile ? imageFile.name : 'Click to upload image'}
                </div>
              </div>
            </div>
          </div>

          <div className="grid-2">
            <F label="Medicine Name *" name="name" placeholder="e.g. Amoxicillin 500mg" />
            <F label="Generic Name" name="generic_name" placeholder="e.g. Amoxicillin" />
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-control" value={form.category} onChange={set('category')}>
                <option value="">Select category…</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Unit</label>
              <select className="form-control" value={form.unit} onChange={set('unit')}>
                {UNITS.map((u) => <option key={u} value={u}>{u.charAt(0).toUpperCase() + u.slice(1)}</option>)}
              </select>
            </div>
          </div>

          <div className="grid-2">
            <F label="Selling Price (KES) *" name="price" type="number" placeholder="0.00" />
            <F label="Cost Price (KES)" name="cost_price" type="number" placeholder="0.00" />
          </div>

          <div className="grid-2">
            <F label="Stock Quantity" name="stock_quantity" type="number" />
            <F label="Reorder Level" name="reorder_level" type="number" />
          </div>

          <div className="grid-2">
            <F label="Manufacturer" name="manufacturer" placeholder="e.g. GSK" />
            <F label="Expiry Date" name="expiry_date" type="date" />
          </div>

          <div className="grid-2">
            <F label="Barcode / SKU" name="barcode" placeholder="Scan or type" />
            <div className="form-group">
              <label className="form-label">Prescription Required</label>
              <select
                className="form-control"
                value={form.requires_prescription ? 'yes' : 'no'}
                onChange={(e) => setForm((p) => ({ ...p, requires_prescription: e.target.value === 'yes' }))}
              >
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              className="form-control"
              rows={2}
              placeholder="Optional notes…"
              value={form.description}
              onChange={set('description')}
              style={{ resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
            <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? <><div className="spinner" style={{ borderTopColor: '#000' }} /> Saving…</> : editing ? 'Save Changes' : 'Add Medicine'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function MedicinesPage() {
  const [medicines, setMedicines]   = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [catFilter, setCat]         = useState('')
  const [modal, setModal]           = useState(null)   // null | 'add' | medicine object
  const debouncedSearch             = useDebounce(search, 350)

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([
      medicineApi.list({ search: debouncedSearch, category: catFilter }),
      categoryApi.list(),
    ])
      .then(([{ data: meds }, { data: cats }]) => {
        setMedicines(meds.results ?? meds)
        setCategories(cats.results ?? cats)
      })
      .catch(() => toast.error('Failed to load medicines'))
      .finally(() => setLoading(false))
  }, [debouncedSearch, catFilter])

  useEffect(() => { load() }, [load])

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-header-title">Medicines</h1>
          <p className="page-header-sub">{medicines.length} products in inventory</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal('add')}>
          <i className="bi bi-plus-lg" /> Add Medicine
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div className="input-wrapper" style={{ flex: 1, minWidth: 200 }}>
          <span className="input-icon"><i className="bi bi-search" /></span>
          <input
            className="form-control"
            placeholder="Search name, barcode, manufacturer…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              className="input-icon-right btn-ghost"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              onClick={() => setSearch('')}
              aria-label="Clear search"
            >
              <i className="bi bi-x" style={{ fontSize: 16 }} />
            </button>
          )}
        </div>
        <select
          className="form-control"
          style={{ width: 200 }}
          value={catFilter}
          onChange={(e) => setCat(e.target.value)}
        >
          <option value="">All Categories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.medicine_count})</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="table-wrapper animate-fade-up">
        {loading ? (
          <div className="loading-overlay"><div className="spinner spinner-lg" /><span>Loading…</span></div>
        ) : medicines.length === 0 ? (
          <div className="empty-state">
            <i className="bi bi-capsule-pill" />
            <h4>No medicines found</h4>
            <p>Try a different search or add your first medicine.</p>
            <button className="btn btn-primary btn-sm" style={{ marginTop: 8 }} onClick={() => setModal('add')}>
              <i className="bi bi-plus-lg" /> Add Medicine
            </button>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Medicine</th>
                <th>Category</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Expiry</th>
                <th>Status</th>
                <th style={{ width: 80 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {medicines.map((m) => (
                <tr key={m.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div className="medicine-thumb">
                        {m.image
                          ? <img src={m.image} alt={m.name} />
                          : <i className="bi bi-capsule-pill" />
                        }
                      </div>
                      <div>
                        <div className="medicine-name">{m.name}</div>
                        {m.generic_name && <div className="medicine-generic">{m.generic_name}</div>}
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="badge badge-info">
                      {m.category_name || '—'}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--primary)' }}>
                      KES {parseFloat(m.price).toLocaleString()}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{m.stock_quantity}</span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}> {m.unit}s</span>
                  </td>
                  <td style={{ fontSize: 12.5, color: m.is_expired ? 'var(--danger)' : 'var(--text-secondary)' }}>
                    {m.expiry_date || '—'}
                    {m.is_expired && <i className="bi bi-exclamation-circle" style={{ marginLeft: 4 }} />}
                  </td>
                  <td>
                    {m.is_expired
                      ? <span className="badge badge-danger"><i className="bi bi-calendar-x" /> Expired</span>
                      : m.is_low_stock
                        ? <span className="badge badge-warning"><i className="bi bi-exclamation-triangle" /> Low Stock</span>
                        : <span className="badge badge-success"><i className="bi bi-check-circle" /> In Stock</span>
                    }
                  </td>
                  <td>
                    <button
                      className="btn btn-ghost btn-sm btn-icon"
                      title="Edit"
                      onClick={() => setModal(m)}
                    >
                      <i className="bi bi-pencil" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <MedicineModal
          editing={modal === 'add' ? null : modal}
          categories={categories}
          onClose={() => setModal(null)}
          onSaved={load}
        />
      )}
    </div>
  )
}