# Receipt Pro Backend

Node.js (Express) API hosted on Render. Supabase provides auth, storage, and Postgres. Paystack handles ₦100 payments.

## Requirements

- Node 20+
- A Supabase project (with URL + publishable key + service-role secret key)
- A Paystack account (secret key + webhook enabled)

## Setup

1. Copy `.env.example` to `.env` and fill in every value:
   ```
   cp .env.example .env
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create the database:
   - Run `supabase/migrations/001_init.sql` in your Supabase SQL editor.
   - Confirm the `receipt-images` Storage bucket is **private**.
   - Confirm Supabase Auth URL config includes your frontend URL(s).

4. Configure Paystack:
   - Set your settlement account: Charis Digital Skill Academy, 08038303372.
   - Set webhook URL to `https://<your-render-service>.onrender.com/api/webhooks/paystack`.
   - Enable `charge.success` events.

5. Run locally:
   ```
   npm run dev
   ```

## Scripts

- `npm start` — production start
- `npm run dev` — watch mode
- `npm test` — unit tests

## Environment variables

See `.env.example` for the full list. `SUPABASE_SECRET_KEY` and `PAYSTACK_SECRET_KEY` are backend-only.

## Deployment (Render)

Provide `render.yaml` at the repo root (one web service, `rootDir: backend`). Render web services bind `0.0.0.0` and use the `PORT` variable. Add your Vercel frontend URL to `FRONTEND_ORIGINS`, and add the Render URL to Paystack's webhook settings.