# SupaNova AI

SupaNova AI is a production-style, full-stack AI-powered customer support, CRM, and helpdesk platform for real-time support operations, customer context, ticket workflows, and analytics.

It includes:
- JWT authentication and Google OAuth login
- role-based dashboards for customers, agents, and admins
- Socket.io real-time chat, typing indicators, and notifications
- file uploads, ticket status workflows, and message search
- automatic assignment, categorization, and conversation summaries
- MongoDB Atlas persistence and deployment-ready configuration

## Tech Stack

- Frontend: React, Vite, Tailwind CSS, Framer Motion, React Router, TanStack Query, Zustand, socket.io-client
- Backend: Node.js, Express, Socket.io, MongoDB/Mongoose, JWT, Multer, Joi, Helmet, CORS, rate limiting
- Database: MongoDB Atlas
- Deployment: Vercel for `client`, Render for `server`

## Repository Structure

```text
supanova-ai/
├── client/             React frontend application
│   ├── public/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── pages/
│   │   ├── store/
│   │   └── utils/
│   ├── .env.example
│   └── package.json
├── docs/
│   └── API.md          API and realtime event documentation
├── server/             Express backend API
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── scripts/
│   │   ├── socket/
│   │   └── utils/
│   ├── .env.example
│   ├── tests/
│   └── package.json
├── package.json        root workspace scripts
└── README.md
```

## Prerequisites

- Node.js and npm installed
- MongoDB Atlas connection string
- Optional Google OAuth credentials for Google login
- Optional Vercel / Render accounts for deployment

## Setup

### 1. Install dependencies

```bash
npm run install:all
```

### 2. Configure the backend

Copy the backend example file:

```bash
cp server/.env.example server/.env
```

Update `server/.env` with your values:

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb+srv://USER:PASSWORD@cluster.mongodb.net/supanova_ai
JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
GOOGLE_CLIENT_ID=
MAX_UPLOAD_MB=10
```

### 3. Configure the frontend

Copy the frontend example file:

```bash
cp client/.env.example client/.env
```

Update `client/.env` with your values:

```env
VITE_API_URL=http://localhost:5000
VITE_GOOGLE_CLIENT_ID=
```

### 4. Create the first admin user

Run the backend admin script:

```bash
npm run create-admin --prefix server -- "Admin Name" admin@example.com strongpassword
```

### 5. Run the application locally

Run both frontend and backend together:

```bash
npm run dev
```

- Frontend: `http://127.0.0.1:5173`
- Backend: `http://localhost:5000`
- Health check: `http://localhost:5000/health`

### 6. Run tests

```bash
npm test --prefix server
```

## Available Scripts

### Root workspace
- `npm run install:all` - install dependencies for both server and client
- `npm run dev` - start server and client concurrently
- `npm run build` - build the frontend only
- `npm start` - run the backend only

### Client
- `npm run dev --prefix client` - run Vite dev server
- `npm run build --prefix client` - build frontend for production
- `npm run preview --prefix client` - preview production build

### Server
- `npm run dev --prefix server` - run backend in watch mode
- `npm run start --prefix server` - start backend normally
- `npm run lint --prefix server` - check server source for syntax issues
- `npm run test --prefix server` - run backend tests
- `npm run create-admin --prefix server -- ...` - create first admin user

## Application Features

- Customer-facing support chat with real-time messaging and file uploads
- Agent dashboard with conversation assignment, status updates, and customer context
- Admin dashboard for user and ticket management, analytics, and role control
- Notifications: server-generated notifications plus in-app toast notifications
- Authentication: email/password, JWT sessions, Google login support
- Conversation workflow: status updates, summaries, categorization, and ratings

## Environment Variables

### Backend (`server/.env`)

- `NODE_ENV` - `development` or `production`
- `PORT` - backend port, default `5000`
- `MONGODB_URI` - MongoDB Atlas connection string
- `JWT_SECRET` - token signing secret
- `JWT_EXPIRES_IN` - token expiry, default `7d`
- `CLIENT_URL` - allowed frontend origin(s)
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `MAX_UPLOAD_MB` - max upload size in MB, default `10`

### Frontend (`client/.env`)

- `VITE_API_URL` - backend API URL, typically `http://localhost:5000`
- `VITE_GOOGLE_CLIENT_ID` - Google OAuth client ID

## Deployment

### Frontend: Vercel

- Root directory: `client`
- Build command: `npm run build`
- Output directory: `dist`
- Environment variables:
  - `VITE_API_URL=https://<your-render-service>`
  - `VITE_GOOGLE_CLIENT_ID=<your-google-client-id>`

### Backend: Render

- Root directory: `server`
- Build command: `npm install`
- Start command: `npm start`
- Environment variables:
  - `NODE_ENV=production`
  - `PORT=10000`
  - `MONGODB_URI=<your-mongo-uri>`
  - `JWT_SECRET=<your-jwt-secret>`
  - `JWT_EXPIRES_IN=7d`
  - `CLIENT_URL=https://<your-vercel-app>`
  - `GOOGLE_CLIENT_ID=<your-google-client-id>`
  - `MAX_UPLOAD_MB=10`

After deployment, create the admin user using the server script connected to the production database.

## Documentation

- API reference is available in `docs/API.md`

## Notes

- `.env` files are not committed to source control.
- Copy `*.env.example` into `*.env` before running locally.
- Make sure the backend is running before opening the frontend.
