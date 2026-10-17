# Complete Production Deployment Guide: Titan Retail Inventory & Sales System

This guide walks you through deploying your full-stack web application completely **free of cost** so anyone in the world can access it via a public URL.

---

## 🏗️ Architecture Overview

```mermaid
graph LR
    User[Browser / Customer / Staff] -->|HTTPS| Frontend[Vercel: Next.js Frontend]
    Frontend -->|REST API with JWT| Backend[Render: Express.js Backend API]
    Backend -->|Mongoose Driver| DB[(MongoDB Atlas Cloud: M0 Free Cluster)]
```

| Component | Platform | Free Tier Benefits |
| :--- | :--- | :--- |
| **Database** | [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) | 512 MB Free Cloud Storage (Never expires, automated backups) |
| **Backend API** | [Render](https://render.com) | Free Web Service (Node.js runtime, automated SSL/TLS certificates) |
| **Frontend Web App** | [Vercel](https://vercel.com) | Free Hobby Plan (Global Edge CDN, automatic Next.js optimizations) |
| **Code Repository** | [GitHub](https://github.com) | Free public/private repository hosting & CI/CD triggers |

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

## Phase 3: Deploy Backend API on Render

Render will host your Express.js REST API with automatic HTTPS.

### Step 3.1: Create Web Service on Render
1. Log in to the [Render Dashboard](https://dashboard.render.com).
2. Click **New +** at the top right and select **Web Service**.
3. Choose **Build and deploy from a Git repository**.
4. Select your `titan-retail-system` repository (grant Render access if needed).

### Step 3.2: Configure Web Service Settings
Fill in the deployment settings carefully:

| Setting | Value | Why it matters |
| :--- | :--- | :--- |
| **Name** | `titan-retail-api` (or custom name) | Determines your API URL (`https://titan-retail-api.onrender.com`) |
| **Region** | Choose closest to your MongoDB region | Lower latency between API and MongoDB |
| **Branch** | `main` | Production branch |
| **Root Directory** | `backend` | **CRITICAL**: Tells Render your backend code is inside `/backend` |
| **Runtime** | `Node` | Node.js environment |
| **Build Command** | `npm install` | Installs backend dependencies |
| **Start Command** | `npm start` | Runs `node src/server.js` |
| **Instance Type** | `Free` | $0/month free tier |

### Step 3.3: Set Environment Variables
Scroll down to **Environment Variables** and add the following keys:

| Key | Value | Description |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Enables production mode |
| `MONGODB_URI` | `mongodb+srv://titan_admin:...` | Your MongoDB Atlas connection URI from Phase 1 |
| `JWT_SECRET` | `titan_production_secret_key_84920491024_secure` | Secret string used to sign authentication tokens |

> [!TIP]
> You do **not** need to manually define `PORT`; Render assigns a dynamic port automatically, which `src/server.js` reads via `process.env.PORT`.

### Step 3.4: Deploy & Verify Backend Health
1. Click **Create Web Service**.
2. Render will build and deploy your app. Watch the live deployment logs.
3. You should see:
   ```text
   [DB] Attempting connection to configured MONGODB_URI...
   [DB] Connected successfully to MongoDB at cluster0.xxxx.mongodb.net
   [Seed] Seeding initial database records...
   [Seed] Created default users:
          Store Manager: storemanager / admin123
          Admin: admin@titan.com / admin123
          Staff: staff@titan.com / staff123
   [Server] API running on http://localhost:...
   ```
4. Copy your backend service URL from the top of the Render page:
   `https://titan-retail-api.onrender.com`
5. Test it in your browser:
   Visit `https://titan-retail-api.onrender.com/api/health`
   You should receive:
   ```json
   {
     "status": "healthy",
     "timestamp": "2026-...",
     "service": "TITAN Retail Inventory & Sales Management System API"
   }
   ```

---

## Phase 4: Deploy Frontend Web App on Vercel

Vercel will build and serve your Next.js application at global edge speeds.

### Step 4.1: Import Project into Vercel
1. Log in to [Vercel](https://vercel.com).
2. From your Vercel Dashboard, click **Add New... > Project**.
3. Locate your `titan-retail-system` GitHub repository and click **Import**.

### Step 4.2: Configure Root Directory
1. In the **Configure Project** screen, find **Root Directory**.
2. Click **Edit** next to `./`.
3. Select the `frontend` folder and click **Continue**.

### Step 4.3: Add Environment Variables
Expand the **Environment Variables** section and add:

| Key | Value | Notes |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | `https://titan-retail-api.onrender.com/api` | **Must include `/api` at the end and use HTTPS** |

### Step 4.4: Deploy
1. Click **Deploy**.
2. Vercel will install dependencies and compile the Next.js production build (`next build`).
3. Once complete, you will be greeted with confetti and your live URL:
   `https://titan-retail-system.vercel.app` (or similar).

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

### 1. Render Free Tier Spin-Down (Cold Start)
- **Behavior**: On Render's free tier, if no requests are received for 15 minutes, the web service enters sleep mode. The next incoming request takes ~30 to 50 seconds while the container spins up.
- **Solution (100% Free)**:
  Use a free uptime monitor like [cron-job.org](https://cron-job.org) or [UptimeRobot](https://uptimerobot.com) to ping your health endpoint every 10 minutes:
  `GET https://titan-retail-api.onrender.com/api/health`
  This keeps your backend warm and fast 24/7 at no cost.

### 2. CORS Errors
- The backend `src/app.js` already includes `cors({ origin: '*' })`, allowing requests from any domain (including your Vercel URL).

### 3. API Returns 404 or Cannot Connect
- Check the `NEXT_PUBLIC_API_URL` setting in Vercel:
  - ✅ Correct: `https://titan-retail-api.onrender.com/api`
  - ❌ Incorrect: `https://titan-retail-api.onrender.com` (missing `/api`)
  - ❌ Incorrect: `http://localhost:48291/api` (points to local machine)
- After changing an environment variable in Vercel, trigger a **Redeploy** (**Deployments > ... > Redeploy**) so Next.js embeds the new URL into the client bundle.

### 4. Database Connection Fails (`MongoServerSelectionError`)
- Ensure your MongoDB Atlas Network Access has IP `0.0.0.0/0` (Allow from Anywhere).
- Verify username and password in `MONGODB_URI`. If your password has special characters like `@` or `#`, encode them (e.g. `@` is `%40`).

---

## 🚀 Summary of URLs & Secrets

Keep a private note of your live URLs:
- **Frontend App**: `https://<your-project>.vercel.app`
- **Backend API**: `https://<your-service>.onrender.com`
- **Health Check**: `https://<your-service>.onrender.com/api/health`
- **MongoDB Atlas**: `https://cloud.mongodb.com`
