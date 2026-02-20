# 💊 PharmacOS — Pharmacy Management System

A full-stack pharmacy POS and inventory management system built with **Django REST Framework** and **React**. Designed for walk-in customer pharmacies with **M-Pesa Daraja STK Push** payment integration, real-time transaction status polling, and a clean dark-themed UI.

---

## ✨ Features

- 🔐 JWT Authentication (login/logout with token refresh)
- 📊 Dashboard with sales charts, revenue stats, and low-stock alerts
- 💊 Medicine inventory with images, barcodes, expiry tracking
- 🛒 Point of Sale (POS) with live barcode/name search
- 💰 Multi-payment: Cash, M-Pesa STK Push, Card
- 📱 M-Pesa Daraja STK Push with real-time callback + polling
- 🧾 Auto-generated receipts with print support
- 📈 Sales history with filters (date, payment method, status)
- ⚠️ Low stock and expiry warnings

---

## 🗂️ Project Structure

```
pharmacos/
├── backend/                          # Django project root
│   ├── manage.py
│   ├── .env                          # Environment variables (never commit)
│   ├── requirements.txt
│   │
│   ├── pharmacy_project/             # Django project config
│   │   ├── __init__.py
│   │   ├── settings.py               # ← use settings_snippet.py as reference
│   │   ├── urls.py                   # ← main_urls.py
│   │   ├── wsgi.py
│   │   └── asgi.py
│   │
│   ├── pharmacy/                     # Main Django app
│   │   ├── __init__.py
│   │   ├── models.py                 # Category, Medicine, Sale, SaleItem, MpesaTransaction
│   │   ├── serializers.py            # All DRF serializers
│   │   ├── views.py                  # ViewSets + MpesaService class
│   │   ├── urls.py                   # ← app_urls.py (router + auth)
│   │   ├── admin.py
│   │   ├── apps.py
│   │   └── migrations/
│   │       └── __init__.py
│   │
│   └── media/                        # Uploaded medicine images (auto-created)
│       └── medicines/
│
├── frontend/                         # React project (Vite)
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   └── src/
│       ├── main.jsx
│       └── App.jsx                   # ← PharmacySystem.jsx (single-file app)
│
└── README.md
```

---

## 🧱 Data Models (5 Models)

```
┌─────────────┐       ┌───────────────────┐
│  Category   │──────▶│     Medicine      │
│─────────────│  1:N  │───────────────────│
│ id          │       │ id                │
│ name        │       │ name              │
│ description │       │ generic_name      │
└─────────────┘       │ category (FK)     │
                      │ image             │
                      │ price             │
                      │ cost_price        │
                      │ stock_quantity    │
                      │ reorder_level     │
                      │ expiry_date       │
                      │ barcode           │
                      │ unit              │
                      │ requires_rx       │
                      └────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │       Sale          │
                    │─────────────────────│
                    │ id                  │
                    │ receipt_number      │ ← auto-generated
                    │ cashier (FK→User)   │
                    │ customer_name       │
                    │ customer_phone      │
                    │ payment_method      │
                    │ subtotal            │
                    │ discount            │
                    │ total_amount        │
                    │ amount_paid         │
                    │ change_amount       │
                    │ status              │
                    └──────┬──────────────┘
                           │ 1:N              1:1
              ┌────────────▼────┐    ┌────────────────────┐
              │    SaleItem     │    │  MpesaTransaction  │
              │─────────────────│    │────────────────────│
              │ sale (FK)       │    │ sale (OneToOne)    │
              │ medicine (FK)   │    │ checkout_req_id    │
              │ medicine_name   │    │ merchant_req_id    │
              │ quantity        │    │ phone_number       │
              │ unit_price      │    │ amount             │
              │ total_price     │    │ mpesa_receipt_no   │
              └─────────────────┘    │ status             │
                                     │ result_code        │
                                     │ result_description │
                                     └────────────────────┘
```

---

## 🔌 API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/token/` | Login — returns access + refresh tokens |
| POST | `/api/auth/token/refresh/` | Refresh access token |

### Medicines
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/medicines/` | List all medicines (paginated, searchable) |
| POST | `/api/medicines/` | Add new medicine (multipart/form-data for image) |
| GET | `/api/medicines/{id}/` | Get single medicine |
| PATCH | `/api/medicines/{id}/` | Update medicine |
| GET | `/api/medicines/pos_search/?q=` | Fast POS search (name, barcode) |
| PATCH | `/api/medicines/{id}/update_stock/` | Adjust stock quantity |

### Categories
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/categories/` | List categories with medicine count |
| POST | `/api/categories/` | Create category |
| PATCH | `/api/categories/{id}/` | Update category |

### Sales
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/sales/` | List sales (filter: date_from, date_to, payment_method, status) |
| POST | `/api/sales/` | Create new sale + deducts stock atomically |
| GET | `/api/sales/{id}/` | Get sale with all line items |
| GET | `/api/sales/dashboard_stats/` | Aggregated stats for dashboard |

### M-Pesa
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/mpesa/stk-push/` | Initiate STK push to customer phone |
| GET | `/api/mpesa/status/{checkout_id}/` | Poll transaction status |
| POST | `/api/mpesa/callback/` | Safaricom callback (AllowAny, no auth) |

---

## ⚙️ Backend Setup

### 1. Clone & Create Virtual Environment

```bash
git clone https://github.com/yourname/pharmacos.git
cd pharmacos/backend

python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

**`requirements.txt`**
```
django>=4.2
djangorestframework
djangorestframework-simplejwt
django-cors-headers
python-decouple
Pillow
requests
psycopg2-binary
```

### 3. Configure Environment Variables

Create a `.env` file in `backend/`:

```env
# Django
SECRET_KEY=your-super-secret-key-here
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Database (PostgreSQL)
DB_NAME=pharmacy_db
DB_USER=postgres
DB_PASSWORD=yourpassword
DB_HOST=localhost
DB_PORT=5432

# CORS (React dev server)
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# M-Pesa Daraja
MPESA_CONSUMER_KEY=your_consumer_key
MPESA_CONSUMER_SECRET=your_consumer_secret
MPESA_SHORTCODE=174379
MPESA_PASSKEY=your_passkey
MPESA_CALLBACK_URL=https://your-ngrok-url.ngrok.io/api/mpesa/callback/
MPESA_ENVIRONMENT=sandbox        # change to 'production' when live
```

> 💡 For local M-Pesa callback testing, use [ngrok](https://ngrok.com):
> ```bash
> ngrok http 8000
> # Copy the https URL → set as MPESA_CALLBACK_URL in .env
> ```

### 4. Database Setup

```bash
# Create PostgreSQL database
psql -U postgres -c "CREATE DATABASE pharmacy_db;"

# Run migrations
python manage.py makemigrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# (Optional) Load sample data
python manage.py loaddata fixtures/sample_data.json
```

### 5. Run Development Server

```bash
python manage.py runserver
```

API available at: `http://localhost:8000/api/`  
Admin panel at: `http://localhost:8000/admin/`

---

## ⚛️ Frontend Setup

### 1. Install & Run

```bash
cd pharmacos/frontend

npm create vite@latest . -- --template react
npm install
```

Replace `src/App.jsx` with the contents of `PharmacySystem.jsx`.

### 2. Configure API URL

In `PharmacySystem.jsx`, update the base URL if needed:

```js
const API_BASE = "http://localhost:8000/api";  // line 4
```

For production, use an environment variable:
```js
const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000/api";
```

And in `.env.local`:
```env
VITE_API_BASE=https://api.yourdomain.com/api
```

### 3. Run Dev Server

```bash
npm run dev
# → http://localhost:5173
```

---

## 📱 M-Pesa Integration Flow

```
Customer at POS
      │
      ▼
[Select M-Pesa payment]
      │
      ▼
[Enter phone: 07XXXXXXXX]
      │
      ▼
POST /api/mpesa/stk-push/
      │
      ▼
Django → Daraja API (STK Push)
      │
      ▼
Customer receives prompt on phone
      │
      ├──── Customer enters PIN ────────────┐
      │                                     │
      ▼                                     ▼
Safaricom POSTs to callback URL    Frontend polls /api/mpesa/status/
      │                                     │
      ▼                                     │
MpesaTransaction updated                   │
Sale marked 'completed'  ◄─────────────────┘
      │
      ▼
Receipt modal shown to cashier
```

**STK Push status codes:**
| ResultCode | Meaning |
|-----------|---------|
| `0` | Success |
| `1032` | Request cancelled by user |
| `1037` | Timeout — user didn't respond |
| Other | Failed |

---

## 🖥️ Frontend Pages

| Page | Route (state) | Description |
|------|--------------|-------------|
| Login | — | JWT auth form |
| Dashboard | `dashboard` | Stats, 7-day bar chart, payment breakdown, top medicines |
| Medicines | `medicines` | Full CRUD with image upload, stock badges |
| Point of Sale | `pos` | Search + cart + checkout + M-Pesa modal + receipt |
| Sales History | `sales` | Filterable table with receipt viewer |

---

pharma-frontend/
├── index.html              ← Bootstrap Icons CDN, Syne + DM Sans fonts
├── vite.config.js          ← Path aliases (@/components etc), proxy to Django :8000
├── package.json            ← All deps (axios, recharts, react-hot-toast, date-fns)
├── .env.local              ← VITE_API_BASE config
├── public/favicon.svg
└── src/
    ├── main.jsx            ← Entry, imports all CSS, configures react-hot-toast
    ├── App.jsx             ← Shell: AuthProvider → Sidebar + Topbar + Pages
    ├── styles/
    │   ├── variables.css   ← All CSS custom properties (colors, fonts, spacing, radii)
    │   ├── global.css      ← Reset, keyframes, utility classes, skeleton shimmer
    │   ├── components.css  ← Buttons, forms, cards, badges, tables, modals, spinners
    │   ├── layout.css      ← Sidebar (fixed+drawer), Topbar, main wrapper, breakpoints
    │   └── pages.css       ← Login, Dashboard, POS, Medicines, Sales page styles
    ├── context/
    │   └── AuthContext.jsx ← JWT login/logout, token storage
    ├── hooks/
    │   ├── useDebounce.js  ← Debounce for search inputs
    │   └── useSidebar.js   ← Drawer open/close + ESC key + body scroll lock
    ├── utils/
    │   └── api.js          ← Axios instance, JWT interceptors, auto token refresh, all API calls
    ├── components/
    │   ├── Sidebar.jsx     ← Drawer sidebar with overlay for mobile (Bootstrap Icons)
    │   ├── Topbar.jsx      ← Hamburger menu button, page title, live indicator
    │   ├── MpesaModal.jsx  ← STK push → polling → success/fail states
    │   └── ReceiptModal.jsx← Receipt view + browser print dialog
    └── pages/
        ├── LoginPage.jsx   ← Animated login with show/hide password
        ├── DashboardPage.jsx ← Stats, 7-day bar chart, payment bars, top medicines
        ├── MedicinesPage.jsx ← CRUD table, image upload, modal form
        ├── POSPage.jsx     ← Search dropdown, cart, checkout, M-Pesa/cash/card
        └── SalesPage.jsx   ← Filterable history table, receipt viewer

## 🔒 Authentication

The system uses **JWT (JSON Web Tokens)** via `djangorestframework-simplejwt`:

- Access token: valid **8 hours** (configurable)
- Refresh token: valid **7 days**
- Tokens stored in `localStorage`
- All API requests include `Authorization: Bearer <token>` header
- M-Pesa callback endpoint is `AllowAny` (required by Safaricom)

---

## 🚀 Production Deployment

### Backend (e.g., Ubuntu + Nginx + Gunicorn)

```bash
pip install gunicorn
gunicorn pharmacy_project.wsgi:application --bind 0.0.0.0:8000 --workers 4

# Collect static files
python manage.py collectstatic
```

### Frontend (Build & Serve)

```bash
npm run build
# Deploy /dist folder to Nginx or Vercel/Netlify
```

### Key production `.env` changes

```env
DEBUG=False
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
MPESA_ENVIRONMENT=production
MPESA_CALLBACK_URL=https://yourdomain.com/api/mpesa/callback/
```

---

## 📦 Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.11+, Django 4.2+, Django REST Framework |
| Auth | djangorestframework-simplejwt |
| Database | PostgreSQL |
| File Storage | Django media files (Pillow for images) |
| Payment | Safaricom Daraja API v1 (STK Push) |
| Frontend | React 18, Vite |
| Styling | Pure CSS-in-JS (no external UI library) |
| Fonts | Plus Jakarta Sans, JetBrains Mono (Google Fonts) |
| HTTP Client | Native `fetch` API |

---

## 🧪 Testing M-Pesa in Sandbox

1. Register at [Safaricom Developer Portal](https://developer.safaricom.co.ke)
2. Create an app → get `Consumer Key` and `Consumer Secret`
3. Use sandbox shortcode `174379` and the provided test passkey
4. Use test phone number `254708374149` for sandbox STK pushes
5. The sandbox auto-approves — no real PIN needed

---

## 📝 License

MIT License — free to use, modify, and distribute.

---

> Built for Kenyan pharmacies 🇰🇪 · M-Pesa powered · Dark mode first