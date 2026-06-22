# Deployment Guide
**Project:** Real-time Support Chat (SupaNova AI)  
**Organization:** Codtech IT Solutions Private Limited  
**Intern:** Naguru Suhas (ID: CITS1993)  

This guide provides step-by-step instructions for running the application locally, provisioning dependencies, deploying the production build to cloud platforms (Render and Vercel), and resolving common environment issues.

---

## 1. Local Development Setup

### Prerequisites
* **Node.js:** v18.x or v20.x installed.
* **npm:** v9.x or v10.x installed.
* **MongoDB:** A running local MongoDB instance or a MongoDB Atlas cloud URI.

### Steps
1. **Clone the Repository:**
   ```bash
   git clone https://github.com/sunnysuhas/Real-time-Support-Chat.git
   cd Real-time-Support-Chat
   ```

2. **Install Workspace Dependencies:**
   Install dependencies for both the frontend (`client/`) and backend (`server/`) simultaneously using the workspace script:
   ```bash
   npm run install:all
   ```

3. **Configure Environment Variables:**
   Follow the configurations in Section 2 to create the `.env` files for both folders.

4. **Initialize First Admin / Super Admin:**
   To log in as a Super Admin or Admin, seed an administrator account using the command:
   ```bash
   npm run create-admin --prefix server -- "Suhas Naguru" admin@example.com StrongPassword123
   ```
   *Note: Super Admin accounts can elevate other users or approve agents through the Admin panel.*

5. **Run the Project Locally:**
   Start the Express server and Vite frontend concurrently:
   ```bash
   npm run dev
   ```
   * Frontend: `http://localhost:5173`
   * Backend: `http://localhost:5000`
   * Health Check: `http://localhost:5000/health`

6. **Run Backend Test Suites:**
   Verify integration correctness locally:
   ```bash
   npm test --prefix server
   ```

---

## 2. Environment Variables Configuration

Create the following files (which are ignored by version control) in their respective directories:

### Backend Configuration (`server/.env`)
```env
# Node Environment Setup
NODE_ENV=development
PORT=5000

# Database Persistence
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/supanova_ai

# Session Security
JWT_SECRET=use-a-very-long-random-cryptographic-hash-here
JWT_EXPIRES_IN=7d

# Allowed Frontend Origins (CORS)
CLIENT_URL=http://localhost:5173

# File Upload Rules
MAX_UPLOAD_MB=10
```

### Frontend Configuration (`client/.env`)
```env
# Backend API Base URL
VITE_API_URL=http://localhost:5000
```

---

## 3. MongoDB Atlas Database Setup

1. **Create Account:** Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and create a free tier cluster.
2. **Setup Network Access:** Add IP Address `0.0.0.0/24` (or `0.0.0.0/0` to allow access from all cloud hosting services like Render).
3. **Database User Credentials:** Create a database user with username and password. Grant `Read and Write to any database` permissions.
4. **Get Connection String:** Click "Connect" -> "Drivers" -> Copy the URI.
5. **Update Configuration:** Replace `<username>` and `<password>` in your `MONGODB_URI` string.

---

## 4. Production Cloud Deployment

### Backend Hosting: Render
The Express server backend is designed to deploy seamlessly to [Render](https://render.com) Web Services.

1. **Create Web Service:** Link your GitHub repository and select the root directory as `server`.
2. **Build Settings:**
   * **Runtime:** Node
   * **Build Command:** `npm install`
   * **Start Command:** `npm start`
3. **Configure Environment Variables:** Add variables matching `server/.env`:
   * `NODE_ENV=production`
   * `PORT=10000`
   * `MONGODB_URI=mongodb+srv://...`
   * `JWT_SECRET=...`
   * `JWT_EXPIRES_IN=7d`
   * `CLIENT_URL=https://real-time-support-chat.vercel.app` (Your live frontend URL)
   * `MAX_UPLOAD_MB=10`
4. **Auto-Deploy:** Enable auto-deploys or manually trigger a build. Note down the backend URL (e.g., `https://real-time-support-chat.onrender.com`).

---

### Frontend Hosting: Vercel
The React client is designed to deploy on [Vercel](https://vercel.com) using the configurations in `client/vercel.json`.

1. **Import Project:** Select your repo in Vercel.
2. **Configure Settings:**
   * **Framework Preset:** Vite
   * **Root Directory:** `client`
   * **Build Command:** `npm run build`
   * **Output Directory:** `dist`
3. **Configure Environment Variables:** Add:
   * `VITE_API_URL=https://real-time-support-chat.onrender.com` (Your live Render backend URL)
4. **Deploy:** Click "Deploy". Vercel will build and host the React bundle.

---

## 5. Troubleshooting Guide

### Issue 1: Web Socket connection fails (polling falls back to HTTP)
* **Reason:** CORS mismatched URLs or proxy configs.
* **Fix:** Verify that the backend `CLIENT_URL` matches the frontend's address exactly (no trailing slash) and the frontend `VITE_API_URL` correctly targets the Render URL.

### Issue 2: Render backend spins down or health checks time out
* **Reason:** Render's free tier spins down services after 15 minutes of inactivity.
* **Fix:** The initial request may take up to 50 seconds to complete. Add a pinging tool (like Cron-job.org) or hit the `/health` endpoint to wake up the server.

### Issue 3: File upload fails (Multer error or payload limit)
* **Reason:** Exceeding `MAX_UPLOAD_MB` or missing write permissions in the server temp directory.
* **Fix:** Ensure the `uploads/` folder is initialized or configured properly. If running on read-only environments, check that the upload middleware writes to `/tmp`.
