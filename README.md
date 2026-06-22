# Real-time Support Chat (SupaNova AI)
A production-grade, full-stack AI-powered customer support helpdesk, CRM, and live chat platform designed for real-time customer operations, ticket status workflows, and detailed analytics.

---

## 🎓 Internship & Submission Details

### Organization
**Codtech IT Solutions Private Limited**  
Bridging the gap between academic theory and industry-standard production development systems.

### Intern Details
* **Full Name:** Naguru Suhas
* **Intern ID:** CITS1993
* **Duration:** 8 Weeks (April - June 2026)
* **Project Name:** Real-time Support Chat (SupaNova AI)
* **Submission Date:** June 18, 2026

---

## 🌐 Live Services & Demo Links

* **Live Frontend Interface:** [https://real-time-support-chat.vercel.app](https://real-time-support-chat.vercel.app)
* **Live Backend Express Service:** [https://real-time-support-chat.onrender.com](https://real-time-support-chat.onrender.com)
* **Backend Health Check:** [https://real-time-support-chat.onrender.com/health](https://real-time-support-chat.onrender.com/health)

---

## 🎯 Project Scope & Objectives

SupaNova AI was built to solve the latency and visibility gaps of legacy support helpdesks. By replacing asynchronous email ticketing queues with persistent WebSocket messaging channels, SupaNova AI streamlines collaboration between customers, support agents, operational administrators, and corporate owners.

### Key Objectives
1. **Real-time Synchronization:** Eliminate communication lag using bi-directional Socket.IO connections for messaging and status events.
2. **Granular Access Control:** Enforce Role-Based Access Control (RBAC) layers securing endpoints, views, and action limits.
3. **Conversational Intelligence:** Provide automated keyword-based classification, ticket priority assignments, and chat metrics.
4. **Professional Auditing:** Register system transactions (role modifications, status transitions, agent approvals) for system accountability.
5. **Aesthetic Excellence:** Deliver a responsive interface styled with glassmorphism, Framer Motion transitions, and dark modes.

---

## 🛠 Tech Stack

### Frontend Tier
* **Core Framework:** React (Vite-powered HMR)
* **Styling & UI:** Tailwind CSS, Framer Motion (micro-animations), Vanilla CSS
* **State Management:** Zustand (client session store), TanStack Query / React Query (caching and syncing)
* **Real-time client:** Socket.io-client

### Backend Tier
* **Server Runtime:** Node.js, Express.js (REST APIs)
* **Database Engine:** MongoDB Atlas (Cloud Cluster)
* **ODM Framework:** Mongoose (Schema validation)
* **Real-time broker:** Socket.IO
* **Security & Auth:** JSON Web Tokens (JWT), BcryptJS, Express Rate Limiter, Helmet, CORS, sanitizeRequest middleware

### Testing & Deployment
* **Test Runners:** Node native test runner (`node --test`), Supertest, MongoDB Memory Server (`mongodb-memory-server`)
* **Hosts:** Vercel (Frontend), Render (Backend)

---

## 👥 User Roles & Access Boundaries

| User Role | Dashboard Route | Core Permissions |
| :--- | :--- | :--- |
| **Customer** | `/customer` | Register accounts, create support tickets, exchange messages, upload attachments, rate resolved tickets. |
| **Agent** | `/agent` | Toggle presence status, inspect assigned conversations, respond to customers in real-time. |
| **Admin** | `/admin` | Monitor all system conversations, read aggregate performance metrics, search user directory. |
| **Super Admin** | `/admin` | Approve registered agents, alter user roles, configure system settings, reassign tickets, review security audit logs. |

---

## 🔐 Authentication & Session Lifecycle

1. **Registration:** Users register via `POST /api/auth/register` and select a **Security Question & Answer** for recovery.
2. **Login:** Standard email/password verification. Success yields a JWT session token stored in local state.
3. **Recovery:** Users reset password by providing their username and answering the configured security question.
4. **Session Persistence:** Zustand automatically loads the stored JWT from `localStorage` on boot and fetches `/api/auth/me` to hydrate context.

---

## 📐 System Architecture

SupaNova AI utilizes a classic multi-tier architecture with WebSocket event channels:

```text
[Client Layer]                      [Gateway / Security]                  [Backend App Tier]               [Persistence]
React Client (Vite)  ---------->  Vercel Edge / CORS Limits  ---------->  Express Server (APIs)  ------->  Mongoose ODM
                         HTTPS                                                                                |
                         <==================== Socket.IO WebSocket (WSS) ===================>                 v
                                                                          Socket.IO Handlers  ------>  MongoDB Atlas
```

---

## 📂 Folder Structure

```text
supanova-ai/
├── client/                 # React frontend application
│   ├── public/             # Static public assets
│   ├── src/
│   │   ├── api/            # API client (Axios instance)
│   │   ├── components/     # AppShell, ProtectedRoute, ToastHost
│   │   ├── hooks/          # Custom utility hooks
│   │   ├── pages/          # Auth, Dashboards, ChatPage, Profile
│   │   ├── store/          # Zustand global stores
│   │   └── utils/          # Product utilities
│   ├── package.json
│   └── vite.config.js
├── server/                 # Express backend application
│   ├── src/
│   │   ├── config/         # Database and server environments
│   │   ├── controllers/    # API endpoint controllers
│   │   ├── middleware/     # Auth checking, error handling, Joi validation
│   │   ├── models/         # Mongoose schema definitions
│   │   ├── routes/         # Express endpoint maps
│   │   ├── scripts/        # Seeding and super admin utilities
│   │   ├── socket/         # WebSocket routers
│   │   └── utils/          # Roles logic
│   ├── tests/              # Automated integration tests
│   └── package.json
├── screenshots/            # UI screenshots (folder structure only)
├── output-images/          # Output verifications (folder structure only)
└── documentation/          # Submission documentation
```

---

## ⚙️ Installation & Setup Guide

### 1. Prerequisites
* Node.js v18.x or v20.x installed.
* A running MongoDB local instance or MongoDB Atlas connection.

### 2. Dependency Installation
Initialize both workspace environments from the root:
```bash
npm run install:all
```

### 3. Environment Variable Files
Configure the local variable configurations for execution:

#### Create server environment (`server/.env`):
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/supanova_ai
JWT_SECRET=super-random-cryptographic-secret-key-string
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
MAX_UPLOAD_MB=10
```

#### Create client environment (`client/.env`):
```env
VITE_API_URL=http://localhost:5000
```

### 4. Create first Admin / Super Admin
To log in with super-user capabilities, seed an account:
```bash
npm run create-admin --prefix server -- "Suhas Naguru" admin@example.com StrongPassword123
```
*Note: A Super Admin can modify user roles (elevate to admin, super_admin) or approve pending agent registrations.*

### 5. Running the Application
Launch both dev environments concurrently:
```bash
npm run dev
```
* Frontend client: [http://localhost:5173](http://localhost:5173)
* Backend service: [http://localhost:5000](http://localhost:5000)
* Health endpoint: [http://localhost:5000/health](http://localhost:5000/health)

---

## 📡 API Endpoints

### 🔑 Authentication (`/api/auth`)
* `POST /register` — Register customer/agent.
* `POST /login` — Login user, return session JWT.
* `POST /forgot-password` — Retrieve recovery question.
* `POST /reset-password` — Perform password recovery.
* `GET /me` — Returns authenticated user profile.
* `PATCH /profile` — Updates user metadata.
* `POST /logout` — Ends user session and updates presence to offline.

### 💬 Conversations (`/api/conversations`)
* `GET /` — Fetch conversations based on role access limits.
* `POST /` — Submit a new ticket. Includes auto-categorization based on title/description.
* `GET /:id` — Load individual conversation, messages history, and customer CSAT rating.
* `PATCH /:id/status` — Modify ticket lifecycle state.
* `PATCH /:id/assignment` — Assign ticket to active agent (Super Admin only).
* `POST /:id/summary` — Request text summary of conversation.

### ✉️ Messages (`/api/messages`)
* `POST /:conversationId` — Send chat message (supports multipart uploads).
* `GET /search?q=<query>` — Search messages content.
* `POST /:conversationId/read` — Set all messages to read status.
* `POST /:messageId/reactions` — Toggle emoji reaction on message.

### 📊 Admin Control & Operations (`/api/admin`)
* `GET /analytics` — CSAT rates, response averages, ticket breakdowns.
* `GET /users` — Paginated index of all system users.
* `PATCH /users/:id/role` — Modify role state (Super Admin only).
* `PATCH /users/:id/approval` — Approve/Reject agent (Super Admin only).
* `PATCH /users/:id/disabled` — Enable/Disable accounts (Super Admin only).
* `GET /audit-logs` — Read security audit log list (Super Admin only).

---

## 🔌 Socket.IO Communication Reference

### Client Events (Emits)
* `conversation:join` (payload: `conversationId`) — Joins target ticket chat room.
* `conversation:leave` (payload: `conversationId`) — Exits ticket chat room.
* `typing:start` (payload: `{ conversationId }`) — Signals user began writing.
* `typing:stop` (payload: `{ conversationId }`) — Signals user stopped typing.
* `message:send` (payload: `{ conversationId, content }`, callback ack) — Dispatches chat text.

### Server Events (Broadcasts)
* `presence:list` — Active socket user IDs list.
* `presence:update` (payload: `{ userId, status, lastSeenAt }`) — Broadcasts user status changes.
* `conversation:new` — Dispatches newly created tickets to agents/admins.
* `conversation:update` — Dispatches ticket status or assignment transitions.
* `message:new` — Dispatches message document to room listeners.
* `typing:start` — Notifies room that a participant is typing.
* `typing:stop` — Notifies room that a participant stopped typing.
* `notification:new` — Pushes system updates and badges to specific users.

---

## 🚀 Cloud Deployment Configuration

### Frontend (Vercel)
* **Root Directory:** `client/`
* **Build Command:** `npm run build`
* **Output Folder:** `dist`
* **Environment variables:** `VITE_API_URL=https://real-time-support-chat.onrender.com`

### Backend (Render)
* **Root Directory:** `server/`
* **Build Command:** `npm install`
* **Start Command:** `npm start`
* **Environment variables:** `NODE_ENV=production`, `PORT=10000`, `MONGODB_URI=<URI>`, `JWT_SECRET=<secret>`, `CLIENT_URL=https://real-time-support-chat.vercel.app`

---

## 📂 Internship Submission Deliverables

The repository includes the following deliverables required for evaluation:
* [AUDIT_REPORT.md](file:///D:/Codtech/Real%20Time%20chatBot/AUDIT_REPORT.md) — Pre-remediation audit and repository strengths analysis.
* [DEPLOYMENT.md](file:///D:/Codtech/Real%20Time%20chatBot/DEPLOYMENT.md) — Step-by-step setup guides and production settings.
* [TEST_REPORT.md](file:///D:/Codtech/Real%20Time%20chatBot/TEST_REPORT.md) — Testing results evidence showing **100% pass rates**.
* [SUBMISSION_CHECKLIST.md](file:///D:/Codtech/Real%20Time%20chatBot/SUBMISSION_CHECKLIST.md) — Final checklists and validation scores.
* [SCREENSHOT_REQUIREMENTS.md](file:///D:/Codtech/Real%20Time%20chatBot/SCREENSHOT_REQUIREMENTS.md) — Guidelines for capturing screenshots.
* [Project_Documentation.md](file:///D:/Codtech/Real%20Time%20chatBot/documentation/Project_Documentation.md) — Complete 22-section final project report text.
* [Project_Documentation.html](file:///D:/Codtech/Real%20Time%20chatBot/documentation/Project_Documentation.html) — Styled HTML layout.
* [Project_Documentation.pdf](file:///D:/Codtech/Real%20Time%20chatBot/documentation/Project_Documentation.pdf) — Compiled PDF document.
* [generate_pdf.py](file:///D:/Codtech/Real%20Time%20chatBot/documentation/generate_pdf.py) — Compiler script for building PDFs.

### 📐 Architecture Visualizations (`documentation/architecture/`):
* [System Topology](file:///D:/Codtech/Real%20Time%20chatBot/documentation/architecture/architecture_system.md)
* [Frontend Layering](file:///D:/Codtech/Real%20Time%20chatBot/documentation/architecture/architecture_frontend.md)
* [Backend Services Flow](file:///D:/Codtech/Real%20Time%20chatBot/documentation/architecture/architecture_backend.md)
* [Database Schema ERD](file:///D:/Codtech/Real%20Time%20chatBot/documentation/architecture/architecture_database.md)
* [Authentication & RBAC Logic](file:///D:/Codtech/Real%20Time%20chatBot/documentation/architecture/architecture_rbac.md)
* [Socket.IO Events Lifecycle](file:///D:/Codtech/Real%20Time%20chatBot/documentation/architecture/architecture_socket.md)
* [Deployment Infrastructure](file:///D:/Codtech/Real%20Time%20chatBot/documentation/architecture/architecture_deployment.md)

---

## 🔮 Future Enhancements
1. **AI Copilot Responses:** Pre-generate ticket answers from historical databases before agent takeover.
2. **Slack / MS Teams Integration:** Route tickets directly to developer workspaces.
3. **Automated Escalations:** Tag tickets as urgent if no agent responds within a configured time limit.

---

## 📝 Conclusion
SupaNova AI is a full-stack, secure, real-time ticket helpdesk system satisfying the software engineering requirements for internship-submission at Codtech IT Solutions Private Limited. All backend workflows, RBAC matrices, and WebSocket triggers have been successfully tested, verified, and documented.
