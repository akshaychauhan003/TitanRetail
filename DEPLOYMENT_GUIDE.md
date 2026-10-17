# Complete Production Deployment Guide: Titan Retail Inventory & Sales System

This guide walks you through deploying your full-stack web application completely **free of cost** so anyone in the world can access it via a public URL.

---

## 🏗️ Architecture Overview

```mermaid
graph LR
    User[Browser / Customer / Staff] -->|Single Domain HTTPS| Vercel[Vercel: Unified Multi-Service Project]
    subgraph Vercel ["Vercel Single Deployment"]
      Frontend[frontend: Next.js Service /]
      Backend[backend: Express.js Service /api]
      Frontend -.->|Internal Service Binding BACKEND_URL| Backend
    end
    Backend -->|Mongoose Driver| DB[(MongoDB Atlas Cloud: M0 Free Cluster)]
```

| Component | Platform | Configuration |
| :--- | :--- | :--- |
| **Database** | [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) | M0 Free Cloud Cluster (`retail_inventory`) |
| **Full Stack App (Frontend + Backend)** | [Vercel](https://vercel.com) | Multi-Service Project via `vercel.json` (Express + Next.js) |
| **Code Repository** | [GitHub](https://github.com) | Monorepo root hosting both services |

---

## 📋 Pre-Deployment Checklist

Before starting, ensure you have:
- [x] A [GitHub](https://github.com) account
- [x] A [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) account
- [x] A [Render](https://render.com) account (Sign up with GitHub recommended)
- [x] A [Vercel](https://vercel.com) account (Sign up with GitHub recommended)

---

## Phase 1: Set Up Free Cloud Database (MongoDB Atlas)

### Step 1.1: Create a Free Shared Cluster
1. Log in to [MongoDB Atlas](https://cloud.mongodb.com).
2. Click **Create** or **Build a Database**.
3. Choose the **M0 (Free)** tier:
   - **Provider**: AWS or Google Cloud (choose the region closest to your users, e.g., Mumbai `ap-south-1`, Singapore `ap-southeast-1`, or US East `us-east-1`).
   - **Name**: Leave as `Cluster0` or name it `titan-cluster`.
4. Click **Create Deployment**.

### Step 1.2: Create a Database User
1. In the **Security Quickstart** prompt (or from the left sidebar under **Security > Database Access**):
   - Choose **Username and Password** authentication.
   - **Username**: e.g., `titan_admin`
   - **Password**: Enter a secure password (e.g., `TitanRetail2026Secure`).
     > [!IMPORTANT]
     > Avoid using special characters like `@`, `:`, `/`, or `%` inside your password, or make sure to URL-encode them. Keep this password safe!
2. Click **Create Database User**.

### Step 1.3: Configure Network Access (IP Whitelist)
Because Render uses dynamic cloud IP addresses, your database must accept connections from the cloud:
1. Go to **Security > Network Access** in the left menu.
2. Click **+ Add IP Address**.
3. Click the **Allow Access from Anywhere** button (this sets IP `0.0.0.0/0`).
4. Click **Confirm**. (Wait ~1 minute until status becomes "Active").

### Step 1.4: Copy Your MongoDB Connection URI
1. Go to **Database > Clusters** and click the **Connect** button next to your cluster.
2. Select **Drivers** (Node.js).
3. Copy the connection string format:
   ```text
   mongodb+srv://titan_admin:<password>@cluster0.xxxx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
   ```
4. Replace `<password>` with your database user password and specify the database name `retail_inventory` right before the `?`:
   ```text
   mongodb+srv://titan_admin:TitanRetail2026Secure@cluster0.xxxx.mongodb.net/retail_inventory?retryWrites=true&w=majority
   ```
5. Save this URI; you will add it to Render in Phase 3.

---

## Phase 2: Push Your Project to GitHub

Because this workspace contains both `frontend/` and `backend/` in a monorepo structure, push the root folder to GitHub.

### Step 2.1: Verify `.gitignore`
Make sure secrets and dependencies are excluded. The root `.gitignore` already protects:
- `node_modules/`
- `.next/`
- `.env` & `.env.*`
- `DEPLOYMENT_GUIDE.md`

### Step 2.2: Initialize and Push to GitHub
Open your terminal in the project root directory:

```bash
# 1. Initialize git (if not already initialized)
git init

# 2. Stage all project files
git add .

# 3. Create your initial commit
git commit -m "feat: complete Titan Retail Inventory and Sales Management System"

# 4. Rename default branch to main
git branch -M main

# 5. Create a new repository on https://github.com/new (e.g., titan-retail-system)

# 6. Link your local repo to GitHub (replace with your actual GitHub URL)
git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/titan-retail-system.git

# 7. Push your code
git push -u origin main
```

---

## Phase 3: Deploy Unified Full Stack App on Vercel (Multi-Services)

With [`vercel.json`](file:///Users/akshaysinghchauhan/Documents/projects/Web%20Titan/vercel.json) in your project root, Vercel builds and runs both your Express.js backend and Next.js frontend together as a single project under one public domain.

### Step 3.1: Import Project into Vercel
1. Log in to your [Vercel Dashboard](https://vercel.com).
2. Click **Add New... > Project**.
3. Select your GitHub repository (`TitanRetail` or `titan-retail-system`) and click **Import**.

### Step 3.2: Configure Project Settings
1. **Framework Preset**: In **Build and Deployment Settings**, select **Services** (or leave as auto-detected from `vercel.json`).
2. **Root Directory**: Leave as `./` (the repository root).

### Step 3.3: Set Environment Variables in Vercel
Expand the **Environment Variables** section on Vercel and add:

| Key | Value | Description |
| :--- | :--- | :--- |
| `MONGODB_URI` | `mongodb+srv://akshaysinghchauhan003_db_user:MZngCeyz0OX0QDEy@cluster0.k3gratv.mongodb.net/retail_inventory?retryWrites=true&w=majority` | Your live MongoDB Atlas URI |
| `JWT_SECRET` | `titan_retail_jwt_secret_key_2026_secure` | Secret string for signing auth tokens |
| `NODE_ENV` | `production` | Production mode |

> [!NOTE]
> You do **not** need to set `NEXT_PUBLIC_API_URL` or `BACKEND_URL`. Vercel automatically injects the `BACKEND_URL` service binding and routes all public `/api/*` requests directly to your backend service!

### Step 3.4: Deploy & Verify
1. Click **Deploy**.
2. Vercel will build both services in parallel:
   - `backend`: Express.js API
   - `frontend`: Next.js Web App
3. Once the deployment finishes, you get a single public URL (e.g., `https://titan-retail-system.vercel.app`).
4. **Verify Health Endpoint**:
   Visit `https://<your-project>.vercel.app/api/health` in your browser.
   You will receive:
   ```json
   {
     "status": "healthy",
     "timestamp": "2026-...",
     "service": "TITAN Retail Inventory & Sales Management System API"
   }
   ```

---

## Phase 5: Verification & Initial Login

1. Open your live Vercel URL in any browser on any phone, tablet, or PC.
2. Sign in using the seeded cloud database accounts:

| Role | Email | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Store Administrator** | `admin@titan.com` | `admin123` | Full access (Products, Staff, Settings, Purchases, POS, Reports) |
| **Store Manager** | `storemanager@titan.com` | `admin123` | Management & inventory approval privileges |
| **Cashier / Staff** | `staff@titan.com` | `staff123` | Sales terminal (POS), inventory lookups, customer management |

3. **Verify Data Persistence**:
   - Go to **Products** and add a test product or make a sale in the **Sales POS**.
   - Open an incognito window or another device and log in.
   - You will see the new product/sale immediately loaded from your live MongoDB Atlas cloud database.

---

## 🛠️ Maintenance & Troubleshooting

### 1. Database Connection Fails (`MongoServerSelectionError`)
- Ensure your MongoDB Atlas Network Access has IP `0.0.0.0/0` (Allow from Anywhere).
- Verify username and password in `MONGODB_URI`. If your password has special characters like `@` or `#`, encode them (e.g. `@` is `%40`).

### 2. Vercel Framework Detection
- In your Vercel Project settings, ensure the Framework Preset is set to **Services** (under **Settings > Build & Development Settings**).
- Vercel uses `vercel.json` in the root folder to detect and build both the `backend` (Express) and `frontend` (Next.js) services.

### 3. Adding New Features or Migrations
- Whenever you push new commits to `main` on GitHub, Vercel will automatically trigger a new deployment for both services simultaneously.

---

## 🚀 Summary of URLs & Secrets

Keep a private note of your live deployment details:
- **Unified App URL**: `https://<your-project>.vercel.app`
- **Backend API Routes**: `https://<your-project>.vercel.app/api/...`
- **Health Check**: `https://<your-project>.vercel.app/api/health`
- **MongoDB Atlas**: `https://cloud.mongodb.com`
- **Database Name**: `retail_inventory`
- **Default Admin Account**: `admin@titan.com` / `admin123`
- **Default Manager Account**: `storemanager@titan.com` / `admin123`

