# CanovaCRM

CanovaCRM is a sales CRM workspace with three deployable parts:

- Admin dashboard: React + Vite app in `client/Sales-CRM`
- Employee portal: React + Vite app in `client/Employee-Portal`
- API server: Node.js + Express + MongoDB app in `server`

## Prerequisites

- Node.js 20 or newer
- npm
- MongoDB Atlas or another MongoDB connection string

## Setup

Install all project dependencies from the repository root:

```bash
npm run install:all
```

Create environment files from the examples:

```bash
cp server/.env.example server/.env
cp client/Sales-CRM/.env.example client/Sales-CRM/.env
cp client/Employee-Portal/.env.example client/Employee-Portal/.env
```

Set the backend variables in `server/.env`:

```env
PORT=5000
MONGODB_URI=your-mongodb-uri
JWT_SECRET=your-long-random-secret
CLIENT_URL=http://localhost:5173
```

Set each frontend `VITE_API_URL` to the API URL:

```env
VITE_API_URL=http://localhost:5000/api
```

For production, point `VITE_API_URL` at the deployed API URL.

## Development

Run the API, admin dashboard, and employee portal together:

```bash
npm run dev
```

Useful local URLs:

- Admin dashboard: `http://localhost:5173`
- Employee portal: `http://localhost:5174`
- API health check: `http://localhost:5000/api/health`

### Admin Dashboard Scripts (`client/Sales-CRM`)

If you navigate to `client/Sales-CRM`, you can run these specific scripts for the admin dashboard:

```bash
npm run dev
npm run build
npm run preview
npm run lint
```

## Build

Build both frontend apps:

```bash
npm run build
```

Build individual apps:

```bash
npm run build:client
npm run build:employee
```

The API runs directly with Node:

```bash
npm start --prefix server
```

## Deployment

The repository includes deployment configuration for Render and Vercel:

- Render blueprint: `render.yaml`
- Admin Vercel SPA config: `client/Sales-CRM/vercel.json`
- Employee portal Vercel SPA config: `client/Employee-Portal/vercel.json`

Backend environment variables required in production:

- `MONGODB_URI`
- `JWT_SECRET`
- `CLIENT_URL`

Frontend environment variables required in production:

- `VITE_API_URL`

See `DEPLOY.md` for the Render/Vercel setup steps.

## Repository Hygiene

Generated directories and local-only files are ignored by Git:

- `node_modules/`
- `dist/`
- logs and temporary folders
- `.env` files
- generated screenshots and local test artifacts

Commit the source files, lockfiles, examples, and deployment configs only.
