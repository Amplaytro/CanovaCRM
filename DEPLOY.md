# Deployment

Recommended setup from the project requirements:

- Frontend: Vercel
- Backend: Render

## Render Backend

This repo is already set up for a Render backend deploy:

- `sales-crm-api`: Node/Express backend from `server`

## Required Environment Variables

Backend:

- `MONGODB_URI`
- `JWT_SECRET`
- `CLIENT_URL`

Frontend:

- `VITE_API_URL`

## Render How To Deploy

1. Push this repository to GitHub, GitLab, or Bitbucket.
2. In Render, create a new Blueprint deploy from the repository.
3. Render will read [`render.yaml`](./render.yaml).
4. Set these values before applying:
   - `CLIENT_URL=https://<your-admin-frontend-domain>,https://<your-employee-frontend-domain>`
   - `VITE_API_URL=https://<your-backend-domain>/api`
   - your real `MONGODB_URI`
   - your real `JWT_SECRET`

## Vercel Frontends

Both React frontends include a `vercel.json` SPA rewrite so refreshes and deep links work correctly.

Use these settings for the admin dashboard:

1. Root Directory: `client/Sales-CRM`
2. Build Command: `npm run build`
3. Output Directory: `dist`
4. Environment Variable: `VITE_API_URL=https://<your-render-backend-domain>/api`

Use these settings for the employee portal:

1. Root Directory: `client/Employee-Portal`
2. Build Command: `npm run build`
3. Output Directory: `dist`
4. Environment Variable: `VITE_API_URL=https://<your-render-backend-domain>/api`

## Local Reference

- Backend env example: [`server/.env.example`](./server/.env.example)
- Frontend env example: [`client/Sales-CRM/.env.example`](./client/Sales-CRM/.env.example)
- Employee portal env example: [`client/Employee-Portal/.env.example`](./client/Employee-Portal/.env.example)
