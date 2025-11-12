This is a Next.js + Supabase project for managing projects, billing, and operational workflows.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open http://localhost:3000 with your browser to see the result.

## Project Overview

- Stack: Next.js 16, React 19, TypeScript 5, Supabase JS v2, ESLint 9, Prettier 3.
- Domains:
  - Projects: `src/domain/projects` with `useProjectCore`, list hook `useProjectsListCore`, and presentational components under `src/components/project` and `src/components/projects`.
  - Billing: `src/domain/billing` with `useBillingCore` and planned component extractions under `src/components/billing`.
- Utilities: `src/lib/format.ts` for currency/date formatting.

See domain READMEs for detailed responsibilities and roadmaps.

## Recent Changes (as of 2025-11-11)

- Projects List
  - Introduced `useProjectsListCore` with filtering/sorting and localStorage persistence (keys: `projects:list:filters`, `projects:list:sort`).
  - Extracted `ProjectsTable` and unified stage rendering via `StageBadge` component.
  - Added CSV export for current filtered/sorted rows.
- Project Detail
  - Extracted `ProjectInfoCard` and `FinancialOverview` components to remove duplicated desktop/mobile markup.
  - Financial Overview redesign: merged “Gross Margin” and “Gross Profit” into a single “Profit” section; consolidated duplicate metrics (Total Profit %, Projected Profit %, Projected Profit $).
- Billing
  - Centralized loading in `useBillingCore` with `sovTotal` and `totalBilled` aggregates; component extractions planned (`SOVTable`, `PayAppsTable`, `BillingSummary`).

## Current Focus

- Wire real financial metrics to `FinancialOverview` via a future `useProjectFinancials` hook.
- Extract billing tables and add a top-line BillingSummary.
- Optional: saved views for projects list; tests for hooks and components.

## Deploy on Vercel

---

## Deployment (Production)

This app uses Next.js + Supabase (DB/Auth) and Microsoft (Azure AD) SSO. Below is a concise production rollout without a preview environment.

### 1) Supabase (prod project)

- Create a new Supabase project for production.
- Auth → URL Configuration:
  - Site URL: `https://your-domain.com`
  - Additional Redirect URLs: `https://your-domain.com`, `http://localhost:3000`
- Auth → Providers → Azure:
  - Tenant ID: your GUID (no angle brackets)
  - Client ID and Client Secret: from your Azure App Registration
- Azure App Registration → Authentication:
  - Redirect URI (Web): `https://<your-supabase>.supabase.co/auth/v1/callback`
- Run SQL migrations in Supabase SQL Editor using files in `db/migrations/`.

### 2) Vercel (production only)

- Import the repo into Vercel (Framework: Next.js).
- Environment variables (Vercel → Project → Settings → Environment Variables):
  - `NEXT_PUBLIC_SUPABASE_URL = https://<prod-project>.supabase.co`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY = <prod anon key>`
- Deploy production.

### 3) Domain (Namecheap → Vercel)

Add your domain to Vercel. Choose one:

Option A — Keep Namecheap DNS

- A record: `@ → 76.76.21.21`
- CNAME: `www → cname.vercel-dns.com`

Option B — Vercel DNS

- Switch nameservers to Vercel and let Vercel manage records.

Wait for DNS (5–30 minutes). Vercel will issue SSL automatically.

### 4) Test auth

- Visit `https://your-domain.com/login` and sign in with Microsoft.
- On success, the Projects page shows your email and a Sign out button.

### Environment variables

Create `.env.local` for local runs or set in Vercel for production:

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-public-key>
```

### Notes

- Azure uses the tenant authority: `https://login.microsoftonline.com/<TENANT_ID>/v2.0` (no `<` `>`).
- Supabase Auth callback remains the Supabase URL: `https://<project>.supabase.co/auth/v1/callback`.

## Developer notes: Supabase edge functions (Deno)

Edge functions under `supabase/functions/**` run in the Deno runtime and are intentionally excluded from the Node/Next TypeScript project.

- TypeScript/ESLint: This folder is excluded from `tsconfig.json` and ESLint to avoid Node-specific diagnostics for Deno globals and URL imports.
- Per-file directive: We add `// @ts-nocheck` to function entry files (e.g. `notify-mention/index.ts`) so VS Code doesn’t show false errors. If you prefer typed editing, see the docs below.
- How-to and rationale: See `supabase/functions/README.md`.

Quick tasks

- Using Deno directly:

```bash
deno task notify-mention
```

- Via npm wrapper:

```bash
npm run deno:notify
```

Enable typed Deno editing (optional)

Install the Deno VS Code extension and enable it only for this folder to keep Node/Next types clean:

```jsonc
{
  "deno.enable": true,
  "deno.enablePaths": ["supabase/functions"],
}
```

Then you can remove `// @ts-nocheck` from individual function files for full type checking in the editor.
