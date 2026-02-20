// src/utils/api.js
import axios from 'axios'
import toast from 'react-hot-toast'

const BASE_URL = import.meta.env.VITE_API_BASE || '/api'

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
})

// ── Request interceptor: attach JWT ──────────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// ── Response interceptor: handle 401 / token refresh ────────────────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      const refresh = localStorage.getItem('refresh_token')

      if (refresh) {
        try {
          const { data } = await axios.post(`${BASE_URL}/auth/token/refresh/`, {
            refresh,
          })
          localStorage.setItem('access_token', data.access)
          original.headers.Authorization = `Bearer ${data.access}`
          return api(original)
        } catch {
          localStorage.clear()
          window.location.href = '/'
        }
      } else {
        localStorage.clear()
        window.location.href = '/'
      }
    }

    return Promise.reject(error)
  }
)

// ── Helper to extract readable error message ─────────────────────────────────
export function getErrorMessage(error) {
  if (error.response?.data) {
    const data = error.response.data
    if (typeof data === 'string') return data
    if (data.detail) return data.detail
    if (data.error) return data.error
    if (data.non_field_errors) return data.non_field_errors[0]
    const firstKey = Object.keys(data)[0]
    if (firstKey) {
      const val = data[firstKey]
      return `${firstKey}: ${Array.isArray(val) ? val[0] : val}`
    }
  }
  return error.message || 'Something went wrong'
}

// ── API calls ─────────────────────────────────────────────────────────────────
export const authApi = {
  login: (creds) => api.post('/auth/token/', creds),
}

export const medicineApi = {
  list:        (params) => api.get('/medicines/', { params }),
  get:         (id)     => api.get(`/medicines/${id}/`),
  create:      (data)   => api.post('/medicines/', data),           // FormData
  update:      (id, data) => api.patch(`/medicines/${id}/`, data),  // FormData
  posSearch:   (q)      => api.get('/medicines/pos_search/', { params: { q } }),
  updateStock: (id, qty) => api.patch(`/medicines/${id}/update_stock/`, { quantity: qty }),
}

export const categoryApi = {
  list:   () => api.get('/categories/'),
  create: (data) => api.post('/categories/', data),
}

export const saleApi = {
  list:           (params) => api.get('/sales/', { params }),
  get:            (id)     => api.get(`/sales/${id}/`),
  create:         (data)   => api.post('/sales/', data),
  dashboardStats: ()       => api.get('/sales/dashboard_stats/'),
}

export const mpesaApi = {
  stkPush:     (data)        => api.post('/mpesa/stk-push/', data),
  checkStatus: (checkoutId)  => api.get(`/mpesa/status/${checkoutId}/`),
}

export default api