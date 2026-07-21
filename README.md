# HCP Estimator

Mobile-first web application for creating HVAC/ductless estimates. Built for sales teams working in the field with Housecall Pro.

## Tech Stack
- **Full-stack**: Next.js (App Router), TypeScript, Tailwind, shadcn/ui components, Zustand, PWA-ready + Drizzle ORM + Neon Postgres (API routes)
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

### 2. Run the app
```bash
cp frontend/.env.example frontend/.env
# Edit .env with your DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET, etc.

pnpm install
pnpm --filter frontend db:push   # or npx drizzle-kit push (from frontend)
pnpm dev
```

App runs on http://localhost:3000

Login with any email (dev mode will show token in console).

## Environment Variables

See `frontend/.env.example`:
- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- (optional) `HCP_BASE_URL`, `DEV_BYPASS`, `CRON_SCHEDULE`

## Housecall Pro Integration

1. Get your API key from HCP account settings.
2. Save it in Admin → Your HCP API Key.
3. Use "Refresh Pricebook" to sync items.
4. When finalizing an estimate you can push materials (marked-up prices only) to HCP.

**Important**: Labor is internal only. Never sent to HCP.

## Adding New Install Rules

Use the Admin UI or seed directly in `frontend/lib/db/seed.ts` → `seedDefaultRules`.

## Calculation Engine

All calculations live in `frontend/lib/services/calc.ts` (server) and `frontend/lib/calc.ts` (client preview).

Currently uses configurable values from DB settings (no hard-coded defaults):
- markup, tax_rate, labor_rate, financing_fee, etc.

## Deployment Notes

This is now a single Next.js application (API routes + frontend).

### Railway Deployment (Recommended)

1. Connect your GitHub repo to a **single Railway service**.

2. **Settings**:
   - Set **Root Directory** to `frontend` (recommended to keep it simple).
   - Build Command (if needed): `pnpm install --frozen-lockfile && pnpm build`
   - Start Command: `pnpm start`
   - Add environment variables:
     - `DATABASE_URL` (your Neon Postgres URL)
     - `JWT_SECRET`
     - `JWT_REFRESH_SECRET`
     - `HCP_BASE_URL=https://api.housecallpro.com` (optional)
     - Optionally `DEV_BYPASS=false` for prod-like

**Important**:
- Use the `railpack.json` / `railway.json` in `frontend/` for explicit config if needed.
- **You must initialize the database schema** before the app can work (see Database Setup below).

## Database Setup

The app uses Drizzle ORM. Tables are **not** auto-created on startup.

### On Railway (recommended for prod)
1. In Railway dashboard for your service:
   - Go to **Shell** tab (or use "Run Command" / one-off).
   - Run:
     ```bash
     pnpm db:push
     ```

   (Or from root of the project: `pnpm db:push`)
   This connects using your `DATABASE_URL` and creates all tables (users, estimates, pricebook_items, etc.).

### Locally (for dev or to apply to prod DB)
```bash
# Set your Neon DATABASE_URL (copy from Neon console for the correct branch)
export DATABASE_URL="postgresql://user:pass@host/db"

pnpm db:push
```

After this, your Neon "Tables" view should show the tables (users, settings, pricebook_items, install_rules, lineset_rules, estimates, estimate_materials, estimate_labor, magic_tokens).

If you see "0 tables", run the push command above.

### Other Platforms
- **Vercel**: Excellent fit. Set root directory to `frontend`.
- Always set `NODE_ENV=production` and strong secrets.

After deployment the app serves both UI and `/api/*` on one URL.

## Development

```bash
pnpm install
pnpm dev
```

App runs at http://localhost:3000

To run DB migrations:
```bash
pnpm db:push
```

## For Reviewers

### Run locally
```bash
git clone https://github.com/tharrosmedia/hcp_estimator.git
cd hcp_estimator
cp frontend/.env.example frontend/.env
# Add a Neon DATABASE_URL + JWT_SECRET + JWT_REFRESH_SECRET to .env
pnpm install
pnpm dev
```

Visit http://localhost:3000

### Deploy to your own Railway (single service)
1. Fork or connect the repo.
2. Create one service.
3. Root Directory: `frontend`
4. Add env vars (see above).
5. Deploy.

## License
Internal tool for Tharros Media.
