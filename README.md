# TITAN — Retail Inventory & Sales Management System

> **UrsTech Solution | SDE Hiring Assignment**  
> An enterprise-grade full-stack Web Application for retail businesses to manage product catalogs, shelf life and expiry dates, inventory stock levels, POS sales and invoicing, stock adjustments, low-stock replenishment alerts, and comprehensive financial reports.

---

## 🌟 Key Highlights & Architectural Features

1. **Strict Stock Validation & Consistency**:
   - Guaranteed prevention of negative stock.
   - Authoritative backend financial calculations (prices, subtotals, discounts, taxes, and totals are computed strictly server-side, preventing client-side price tampering).
   - Atomic multi-item checkout rollback safeguard: A failed transaction never leaves inventory partially deducted.
2. **Product Catalog with Shelf Life & Auto Expiry**:
   - Support for SKU, product name, category, kind/subcategory (e.g., *Dairy* includes *Milk*, *Curd*, *Paneer*, *Cheese*, *Butter*).
   - Date of Manufacture (DOM) tracking.
   - Configurable shelf life duration (days, months, years).
   - **Auto-calculated Expiry Date** dynamically computed from DOM + Shelf Life.
3. **Point of Sale (POS) Billing Register**:
   - Instant search and category tabs.
   - Real-time stock validation in the cart.
   - Discount slider and GST/tax rate calculation.
   - Printable thermal invoice slip with unique auto-generated invoice IDs (`INV-YYYYMMDD-XXXX`).
4. **Sales Return Workflow with Stock Restoration (Bonus Feature)**:
   - Itemized return processing.
   - Real-time stock restoration back into inventory.
   - Audit trail tracking for all returned goods.
5. **Inventory Audit Movements Trail**:
   - Comprehensive log of every stock change: `RECEIVED`, `MANUAL_ADD`, `MANUAL_SUBTRACT`, `DAMAGE`, `EXPIRED`, `SALE`, `RETURN`.
   - Records previous stock, new stock, timestamp, user, role, and audit reason.
6. **Dedicated Low-Stock Alert Center**:
   - Highlights items at or below their configured reorder thresholds.
   - Immediate "Quick Restock" one-click action.
7. **Executive Dashboard & Financial Reports**:
   - Key Metrics: Total Revenue, Orders Count, Low-Stock items, Out-of-Stock items.
   - Gross Profit & Profit Margin % calculations (`Revenue - Cost of Goods Sold`).
   - Top-selling products ranking.
   - **Download Sales Report as CSV (Bonus Feature)** with date range filtering.
8. **Automated Test Suite (Bonus Feature)**:
   - 17 automated tests verifying RBAC, stock validation, atomic sale rollbacks, price integrity, inventory movements, sales returns, and CSV exports.

---

## 🛠️ Required Technology Stack

| Layer | Technology | Details |
| :--- | :--- | :--- |
| **Frontend** | **Next.js (React 18 / TypeScript)** | App router, responsive dark-mode UI with emerald accents, glassmorphic cards, no external CSS library dependencies |
| **Backend** | **Node.js & Express.js** | RESTful modular API with centralized error handling and audit logging |
| **Database** | **MongoDB & Mongoose** | Native Mongoose schemas with seamless **MongoMemoryServer** automatic fallback for zero-configuration testing |
| **Authentication** | **JWT (JSON Web Tokens)** | Bearer token authorization with Role-Based Access Control (**Admin** vs **Staff**) |
| **Testing** | **Vitest & Supertest** | 17 integration and unit tests covering stock consistency, atomicity, and financial integrity |

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js**: v18+ (tested on Node v24.19)
- **npm**: v9+

### 2. Install Dependencies
Run from the project root (`TITAN`):
```bash
# Install root, backend, and frontend packages
npm run install:all
```
*(Or navigate to `backend/` and `frontend/` and run `npm install` in each).*

### 3. Run Development Servers
Start both backend (Port 48291) and frontend (Port 48290) concurrently:
```bash
npm run dev
```

Or start them individually in separate terminals:
```bash
# Terminal 1: Backend API
npm run dev:backend
# API runs on http://localhost:48291

# Terminal 2: Next.js Frontend
npm run dev:frontend
# Web App opens on http://localhost:48290
```

### 4. Run Automated Test Suite
Run the 17 integration and stock consistency tests:
```bash
npm test
```

---

## 🔐 Demo Credentials (Pre-Seeded)

The system automatically initializes and seeds the database with sample products across Dairy, Bakery, Beverages, Snacks, and Personal Care categories:

| Role | Email | Password | Access Privileges |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@titan.com` | `admin123` | Full access: Product creation, editing, deactivation, stock adjustments, profit analytics, user management |
| **Staff / Cashier** | `staff@titan.com` | `staff123` | Operations access: POS checkout, sales ledger, processing returns, catalog viewing, low stock alerts |

*(Quick-login buttons are also provided directly on the Login page for convenience during evaluation).*

---

## 📡 API Endpoint Reference

### Authentication
- `POST /api/auth/login` — Authenticate user and receive JWT token.
- `GET /api/auth/me` — Get authenticated user profile.
- `POST /api/auth/register` — Register a new staff or admin user.

### Products
- `GET /api/products` — Search and filter products (Query: `search`, `category`, `kind`, `stockStatus`, `includeInactive`).
- `GET /api/products/:id` — Get product detail by ID.
- `GET /api/products/categories/kinds` — Get unique categories and subcategory kinds map.
- `POST /api/products` *(Admin only)* — Create product with DOM, shelf life, auto expiry, and kind.
- `PUT /api/products/:id` *(Admin only)* — Update product details and prices.
- `DELETE /api/products/:id` *(Admin only)* — Soft-deactivate product.
- `PATCH /api/products/:id/toggle-status` *(Admin only)* — Toggle active/deactivated state.

### Inventory & Audit Movements
- `GET /api/inventory/low-stock` — Fetch products at or below their reorder level.
- `POST /api/inventory/adjustments` — Record stock received or manual adjustments with audit trail.
- `GET /api/inventory/movements` — Chronological audit trail of all inventory changes.

### Sales & POS Billing
- `POST /api/sales` — Create a sale with atomic stock deduction, stock validation, and price validation.
- `GET /api/sales` — List past sales invoices with date range and customer search.
- `GET /api/sales/:id` — Get single invoice detail by ID or invoice number.
- `POST /api/sales/:id/return` — Process sales return and restore product stock to inventory.

### Reports & Analytics
- `GET /api/reports/dashboard` — Top-level metrics for dashboard (Revenue, Orders, Low Stock, etc.).
- `GET /api/reports/sales` — Sales timeline breakdown by date range and category.
- `GET /api/reports/profit` *(Admin only)* — Gross Revenue, COGS, Gross Profit, and Margin % breakdown.
- `GET /api/reports/top-selling` — Products ranked by units sold and revenue.
- `GET /api/reports/sales/csv` — Stream downloadable sales report as CSV.

---

## 🧪 Testing Report

The backend includes a comprehensive test suite in `backend/src/tests/inventoryAndSales.test.js`:

```
 ✓ src/tests/inventoryAndSales.test.js (17 tests)
   ✓ 1. Authentication & Role-Based Access Control (RBAC) > should authenticate Admin and return token with admin role
   ✓ 1. Authentication & Role-Based Access Control (RBAC) > should authenticate Staff and return token with staff role
   ✓ 1. Authentication & Role-Based Access Control (RBAC) > should reject unauthenticated requests to protected routes
   ✓ 1. Authentication & Role-Based Access Control (RBAC) > should deny Staff from creating products (Admin only)
   ✓ 2. Product Management, Categories/Kinds & Auto Expiry Calculation > should allow Admin to create product with DOM, shelf life, and auto-set expiry date
   ✓ 2. Product Management, Categories/Kinds & Auto Expiry Calculation > should reject duplicate SKU with 409 Conflict
   ✓ 2. Product Management, Categories/Kinds & Auto Expiry Calculation > should filter products by category and kind
   ✓ 3. Stock Validation & Sale Consistency (Never reduce stock below zero) > should prevent a sale when requested quantity exceeds available stock
   ✓ 3. Stock Validation & Sale Consistency (Never reduce stock below zero) > should fail multi-product sale atomically if any single item has insufficient stock
   ✓ 4. Authoritative Price Calculation & Financial Integrity > should calculate subtotal, discount, tax, and total authoritatively on backend
   ✓ 5. Inventory Adjustments & Audit Trail > should record stock received and update product stock
   ✓ 5. Inventory Adjustments & Audit Trail > should prevent manual subtract from reducing stock below zero
   ✓ 6. Sales Return Workflow with Stock Restoration (Bonus Feature) > should process a return, restore product stock, and log return audit
   ✓ 6. Sales Return Workflow with Stock Restoration (Bonus Feature) > should prevent returning more units than were sold
   ✓ 7. Reports & CSV Export (Bonus Feature) > should provide dashboard metrics
   ✓ 7. Reports & CSV Export (Bonus Feature) > should calculate profit report for Admin
   ✓ 7. Reports & CSV Export (Bonus Feature) > should export sales report as CSV with proper headers

 Test Files  1 passed (1)
      Tests  17 passed (17)
```

---

## 📂 Project Directory Structure

```
TITAN/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js                 # MongoDB connection & MemoryServer fallback
│   │   ├── controllers/
│   │   │   ├── authController.js     # JWT login, registration & session
│   │   │   ├── productController.js  # CRUD, categories/kinds & auto-expiry
│   │   │   ├── inventoryController.js# Low-stock alerts, adjustments & movements
│   │   │   ├── salesController.js    # POS checkout & sales returns
│   │   │   └── reportController.js   # Dashboard, profit margins & CSV export
│   │   ├── middleware/
│   │   │   ├── auth.js               # JWT verification & RBAC authorize()
│   │   │   └── errorHandler.js       # Centralized HTTP error handling
│   │   ├── models/
│   │   │   ├── User.js               # User accounts (Admin / Staff)
│   │   │   ├── Product.js            # Products, shelf life, DOM & expiry
│   │   │   ├── Sale.js               # Invoices, tax, discounts & returns
│   │   │   └── InventoryMovement.js  # Audit log for every stock modification
│   │   ├── routes/
│   │   │   ├── authRoutes.js
│   │   │   ├── productRoutes.js
│   │   │   ├── inventoryRoutes.js
│   │   │   ├── salesRoutes.js
│   │   │   └── reportRoutes.js
│   │   ├── utils/
│   │   │   ├── invoiceGenerator.js   # Unique invoice numbering
│   │   │   ├── seedData.js           # Default catalog & users seeder
│   │   │   └── seedRunner.js         # Standalone CLI seeder
│   │   ├── tests/
│   │   │   └── inventoryAndSales.test.js # Vitest test suite (17 tests)
│   │   ├── app.js                    # Express app configuration
│   │   └── server.js                 # Express server bootstrap
│   ├── package.json
│   └── vitest.config.js
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx            # Global layout with Sidebar & AuthProvider
│   │   │   ├── page.tsx              # Executive Dashboard Overview
│   │   │   ├── login/page.tsx        # Sign In with quick Admin/Staff demo buttons
│   │   │   ├── products/page.tsx     # Product catalog & Add/Edit/Deactivate
│   │   │   ├── sales/page.tsx        # POS Billing register & Receipt modal
│   │   │   ├── sales-history/page.tsx# Sales invoice history & Return workflow
│   │   │   ├── low-stock/page.tsx    # Dedicated Low-Stock Alert view
│   │   │   ├── inventory/page.tsx    # Inventory audit trail & adjustments
│   │   │   └── reports/page.tsx      # Sales & profit reports + CSV export
│   │   ├── components/
│   │   │   ├── Sidebar.tsx           # Enterprise navigation rail
│   │   │   ├── Navbar.tsx            # Header actions and live status
│   │   │   └── ui/icons.tsx          # Lightweight SVG icon system
│   │   ├── context/
│   │   │   └── AuthContext.tsx       # Auth state provider hook
│   │   ├── lib/
│   │   │   └── api.ts                # API client with token interceptor
│   │   └── styles/
│   │       └── globals.css           # Premium enterprise dark-theme design tokens
│   ├── next.config.mjs
│   ├── package.json
│   └── tsconfig.json
├── package.json                      # Monorepo orchestration (npm run dev)
└── README.md                         # Comprehensive documentation
```

---

## 📋 Hiring Assignment Compliance Checklist

- [x] **Frontend**: Next.js with React & TypeScript
- [x] **Backend**: Node.js and Express.js
- [x] **Database**: MongoDB with Mongoose (with automated fallback)
- [x] **Authentication**: JWT authentication with Admin and Staff role-based access control
- [x] **Product Management**: Create, view, edit, and deactivate products with SKU, name, category, purchase/selling price, stock, and reorder levels
- [x] **Search & Filtering**: Search by name/SKU and filter by category, kind, or stock status
- [x] **Inventory Adjustments & Movements**: Store adjustment type, quantity, timestamp, user, previous/new stock, and full audit trail (`/api/inventory/movements`)
- [x] **Sales & Invoicing**: Multi-item sale, unique invoice numbers, subtotal, discount, tax, total calculation
- [x] **Stock Validation**: Never allow stock below zero; deduct only on successful recording; atomic rollback on failure; authoritative backend calculation of all prices and totals
- [x] **Low-Stock Alerts**: Dedicated view for items at or below reorder level (`/api/inventory/low-stock`)
- [x] **Dashboard & Reports**: Total sales, transaction count, top-selling products, low-stock count, date range filtering, gross profit and margins
- [x] **Bonus Features**:
  - [x] Sales-return workflow with inventory restoration
  - [x] Download sales report as CSV
  - [x] Comprehensive automated test suite (17 tests passing)
- [x] **Special Requirements**:
  - [x] Date of manufacture (DOM)
  - [x] Shelf life duration (time it will be good)
  - [x] Auto-set expiry date
  - [x] Product kind selection (e.g., Dairy includes Milk, Curd, Paneer, Cheese, Butter)
  - [x] All legacy Electron files and folders completely deleted.
