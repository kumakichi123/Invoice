# Japan Invoice CSV MVP

Next.js SaaS MVP that converts Japanese invoice PDF/photo files into an English CSV row with 8 fields:

- Vendor/Supplier
- Invoice number
- Issue date
- Due date (optional)
- Currency (fixed to JPY)
- Subtotal (if readable)
- Tax amount (if readable)
- Total

## Stack

- Next.js (App Router, TypeScript)
- Supabase Auth + Supabase Postgres
- Dify Workflow API

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Fill environment values in `.env`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `DIFY_API_KEY`
- `DIFY_BASE_URL` (default `https://api.dify.ai`)

3. Run SQL in Supabase SQL Editor:

`supabase/schema.sql`

4. Start dev server:

```bash
npm run dev
```

## Notes

- Auth implementation avoids Next middleware.
- `/api/extract` uploads file to Dify, runs workflow, normalizes the result into the 8 fields.
- Users can edit extracted values before exporting CSV.
- Export action also saves invoice records into Supabase table `invoice_exports`.

## Deploy

- Push to GitHub.
- Import repository in Vercel.
- Set all environment variables in Vercel project settings.
