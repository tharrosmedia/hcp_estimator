# HCP Estimator

Mobile-first web application for creating HVAC/ductless estimates. Built for sales teams working in the field with Housecall Pro.

## Tech Stack
- **Frontend**: Next.js (App Router), TypeScript, Tailwind, shadcn/ui components, Zustand, PWA-ready
- **Backend**: Node + Express + TypeScript, Drizzle ORM + Neon Postgres
- **Auth**: Passwordless magic link (JWT + refresh)
- **Integrations**: Housecall Pro API (per-user keys)

## Key Features
- Pull & cache pricebook from Housecall Pro
- Build estimates with 40% markup (editable)
- Internal labor calculator (never shown to customer)
- Ductless lineset helper
- 3 customer payment variants (Cash / CC / Financing)
- Push clean line-items to HCP
- Mobile-first with large tap targets
- Offline drafts
- Role-based access (Sales / Manager / Admin)
- Configurable rules & settings

## Quick Start

### Prerequisites
- Node 20+
- pnpm
- Neon Postgres database

### 1. Clone & Install
```bash
git clone https://github.com/tharrosmedia/hcp_estimator.git
cd hcp_estimator
```

### 2. Backend
```bash
cd backend
cp .env.example .env
# Edit .env with your DATABASE_URL, JWT secrets, etc.

pnpm install
pnpm db:push          # or drizzle-kit push
pnpm dev
```

Backend runs on http://localhost:4000

### 3. Frontend
```bash
cd ../frontend
pnpm install
pnpm dev
```

Frontend runs on http://localhost:3000

Login with any email (dev mode will show token in console).

## Environment Variables

See `backend/.env.example` and add to frontend as needed:
- `NEXT_PUBLIC_API_URL=http://localhost:4000/api`

## Housecall Pro Integration

1. Get your API key from HCP account settings.
2. Save it in Admin → Your HCP API Key.
3. Use "Refresh Pricebook" to sync items.
4. When finalizing an estimate you can push materials (marked-up prices only) to HCP.

**Important**: Labor is internal only. Never sent to HCP.

## Adding New Install Rules

Use the Admin UI or seed directly in `backend/src/services/rule.service.ts` → `seedDefaultRules`.

## Calculation Engine

All calculations live in `backend/src/services/calc.service.ts`.

Currently uses configurable values from DB settings (no hard-coded defaults):
- markup, tax_rate, labor_rate, financing_fee, etc.

## Deployment Notes

This is a pnpm monorepo. **You must deploy the backend and frontend as separate services** on Railway (or similar platforms).

### Railway Deployment (Recommended)

1. **Create two services in your Railway project** (one for backend, one for frontend).

2. **For the Backend service**:
   - Connect your GitHub repo.
   - Set **Root Directory** to `backend`.
   - Railway will auto-detect `package.json` and use Nixpacks.
   - Build Command (if needed): `pnpm --filter hcp-estimator-backend install --frozen-lockfile && pnpm --filter hcp-estimator-backend build`
   - Start Command: `pnpm --filter hcp-estimator-backend start`
   - Add environment variables:
     - `DATABASE_URL` (your Neon Postgres URL)
     - `JWT_SECRET`
     - `JWT_REFRESH_SECRET`
     - `FRONTEND_URL` (the public URL of your frontend service, e.g. `https://your-frontend.railway.app`)
     - `HCP_BASE_URL=https://api.housecallpro.com` (optional)
     - Optionally set production values (no `DEV_BYPASS`)

3. **For the Frontend service**:
   - Connect the same GitHub repo.
   - Set **Root Directory** to `frontend`.
    - Build Command (if needed): `pnpm --filter frontend install --frozen-lockfile && pnpm --filter frontend build`
    - Start Command: `pnpm --filter frontend start`
    - Add environment variables:
      - `NEXT_PUBLIC_API_URL` = `https://your-backend-service.railway.app/api` (use the backend's public domain)

**Important**:
- Deploy backend first, then use its public URL for the frontend's `NEXT_PUBLIC_API_URL`.
- Railway will prompt you to set the Root Directory if it detects the monorepo (as seen in the error "Set the Root Directory to the subdirectory...").
- Use the `railway.json` and `railpack.json` files included in each directory for explicit config (Railpack is used by Railway).
- We added a dummy "start" script at the root package.json so that if the monorepo root is used for build, detection passes (the actual start is overridden by config or sub package.json).
- If you still see "No start command detected", in the Railway service settings, explicitly set the **Start Command** to the one above (e.g. `pnpm --filter hcp-estimator-backend start`).

### Other Platforms
- **Vercel**: Great for frontend. Set root directory to `frontend`. Use serverless functions or separate backend.
- **Render / Fly.io**: Similar root directory + build/start commands.
- Always set `NODE_ENV=production` and strong secrets.

After deployment:
- The backend runs on its own port (Railway assigns one).
- Frontend proxies API calls via `NEXT_PUBLIC_API_URL`.

## Development

Use pnpm from the root for monorepo commands:

```bash
pnpm install                 # installs for both
pnpm dev:backend
pnpm dev:frontend
```

Or cd into subdirs:

```bash
# Backend
cd backend
pnpm dev

# Frontend
cd frontend
pnpm dev
```

## Development

```bash
# Backend
cd backend
pnpm dev

# Frontend
cd frontend
pnpm dev
```

## License
Internal tool for Tharros Media.
