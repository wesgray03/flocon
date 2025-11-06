This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

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

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

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
