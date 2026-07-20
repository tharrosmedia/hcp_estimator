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
- Frontend can be deployed to Vercel.
- Backend to Railway / Fly.io / Render (supports cron).
- Use Neon for Postgres.

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
