# PROMPT FOR KILO — Build "Receipt Pro" (separate FRONTEND and BACKEND)

You are building **Receipt Pro**, a receipt and invoice maker, as a production-ready project made of two completely separate apps in one repository:

- `frontend/` is hosted on **Vercel**.
- `backend/` is a **Node.js (Express)** API hosted on **Render**.
- **Supabase** provides authentication (Auth) and file storage (Storage), plus a Postgres database.
- **Paystack** takes the ₦100 payment per receipt.

I am attaching two things. Treat them as the source of truth:

1. `receipt-pro.html` is the working prototype. It is a single file that uses `localStorage` and a fake payment check. **Copy its look, wording, layout and behaviour exactly**, but replace the fake parts with the real Supabase, Paystack and Express code described below.
2. `receipt-pro-assets.zip` contains the image folders. Copy them into `frontend/public/images/` and keep every folder name and file name exactly as they are.

Work in phases. First write a short plan, then build phase by phase, committing after each phase. **Before writing integration code, read the official documentation** for Supabase (Auth and Storage), Render (Web Services), Vercel (Vite) and Paystack (Transactions and Webhooks). Do not guess API shapes. If something in this prompt conflicts with the docs, follow the docs and tell me.

---

## 1. Repository layout (frontend and backend must stay separate)

```
receipt-pro/
├─ README.md                      # step-by-step setup + deploy guide (Supabase, Render, Vercel)
├─ render.yaml                    # Render Blueprint (rootDir: backend)
├─ .gitignore
│
├─ frontend/                      # → Vercel
│  ├─ package.json
│  ├─ vite.config.js
│  ├─ vercel.json                 # SPA rewrite to /index.html
│  ├─ index.html
│  ├─ .env.example
│  ├─ README.md
│  ├─ public/
│  │  └─ images/
│  │     ├─ receipt-pro-bg-black/receipt-pro-bg-black.jpg
│  │     ├─ receipt-pro-bg-blue/receipt-pro-bg-blue.jpg
│  │     ├─ receipt-pro-bg-light-blue/receipt-pro-bg-light-blue.jpg
│  │     ├─ receipt-pro-bg-red/receipt-pro-bg-red.jpg
│  │     ├─ receipt-pro-bg-white/receipt-pro-bg-white.jpg
│  │     ├─ sample-business-receipt/sample-business-receipt.jpg
│  │     └─ sample-invoice-receipt/sample-invoice-receipt.jpg
│  └─ src/
│     ├─ main.jsx
│     ├─ App.jsx                  # routes
│     ├─ styles/                  # tokens.css, base.css, components.css
│     ├─ lib/                     # supabase.js, api.js, themes.js, format.js, qr.js, capture.js
│     ├─ context/AuthContext.jsx
│     ├─ pages/                   # WelcomePage, AuthPage, HomePage, EditorPage,
│     │                           # PublicReceiptPage, PaymentCallbackPage
│     └─ components/              # Header, StyleCard, ItemsEditor, ColorSwatches,
│                                 # BusinessReceipt, InvoiceReceipt, PreviewOverlay,
│                                 # PaymentModal, HistoryWindow, ProtectedRoute
│
└─ backend/                       # → Render
   ├─ package.json                # "engines": { "node": ">=20" }, scripts: start, dev, test
   ├─ .env.example
   ├─ README.md
   ├─ supabase/migrations/001_init.sql   # tables, RLS, storage bucket + policies
   └─ src/
      ├─ server.js                # listen on 0.0.0.0, PORT, graceful SIGTERM
      ├─ app.js                   # express app, middleware, routes
      ├─ config/env.js            # zod-validated environment variables
      ├─ lib/                     # supabase.js, paystack.js, fingerprint.js, slug.js
      ├─ middleware/              # auth.js, errorHandler.js, rateLimit.js, validate.js
      ├─ routes/                  # health.js, config.js, payments.js, webhooks.js,
      │                           # receipts.js, publicReceipts.js
      └─ tests/                   # fingerprint, webhook signature, payment verification
```

**Image folder names are fixed.** Use exactly: `receipt-pro-bg-black`, `receipt-pro-bg-blue`, `receipt-pro-bg-light-blue`, `receipt-pro-bg-red`, `receipt-pro-bg-white`, `sample-business-receipt`, `sample-invoice-receipt`. Do not rename them, add folders or move files out of them.

**Frontend stack:** Vite + React (JavaScript), React Router, plain CSS using the design tokens in section 8. No UI framework is needed. Libraries: `@supabase/supabase-js`, `html2canvas`, `jspdf`, `qrcode`. Self-host the fonts with `@fontsource` packages so that image capture is reliable: Instrument Sans, Bricolage Grotesque, Courier Prime, Kaushan Script. Wait for `document.fonts.ready` before capturing a receipt.

**Backend stack:** Node 20+, Express, `@supabase/supabase-js`, `zod`, `helmet`, `cors`, `express-rate-limit`, `multer`, `pino` (or `morgan`). Use ES modules.

---

## 2. Screens and exact copy

Reproduce these screens from the prototype. Keep the capital letters exactly as written.

1. **Welcome page (logged out):** heading `SIGN IN TO ACCESS OUR FEATURES`, line `Sign in or create an account to start making receipts in a minute.`, button `GET STARTED`. The button opens the auth page.
2. **Auth page:** two tabs, `Create account` and `Log in`. Because Supabase password sign-in needs an email (or phone), the **Create account** form has **Name, Email, Password, Re-enter password**, and **Log in** has **Email, Password**. Store the name in `user_metadata.full_name`. Passwords must match and be at least 6 characters. Show clear error messages. Handle the case where email confirmation is turned on (no session is returned after sign-up, so show "Check your email to confirm your account").
3. **Home (after login):** heading `WELCOME TO RECEIPT PRO`, then a card titled `Choose a receipt style to preview` with two large cards, `BUSINESS RECEIPT` and `INVOICE RECEIPT`. Each card shows its sample picture (`/images/sample-business-receipt/sample-business-receipt.jpg` and `/images/sample-invoice-receipt/sample-invoice-receipt.jpg`). Below is a full-width `VIEW HISTORY` button (with the receipt count in brackets).
4. **Editor** (after choosing a style) has a `← Change receipt style` button at the top, then the form, then a `Preview receipt` button. The header always shows `Hi, <name>` and a `Log out` button. Logging out goes back to the welcome page.
5. **Preview overlay** is a full-screen window with a Back button, the receipt, a note when the receipt is already paid for (`✓ Payment received for this receipt. You can download it again.`), and the `Download PDF` and `Download image` buttons.
6. **Payment window** (section 5) opens when an unpaid receipt is downloaded.
7. **View History window** (section 6) is a separate full-screen window.
8. **Public receipt page** `/r/:slug` (section 7) is what a customer sees after scanning the QR code.

Top bar: brand `Receipt Pro`, short helper text, user name, `Log out`, and a 4px amber line under the bar.

### Business receipt form (BUSINESS RECEIPT)
Logo upload; Business name; Phone; Address; **Business motto (optional)**; Customer name; Customer address; Receipt number; Date; Payment method (Cash, Bank transfer, POS card); Currency; background colour swatches (five, see section 4); items table with columns **Qty, Item, Price, Disc %** and add and remove row controls.

### Invoice receipt form (INVOICE RECEIPT)
Only: Business name (shown as the store name); Receipt number; Currency; items with **Qty, Item, Price** (no discount column, no colour swatches).

### Receipt designs
Port `r1()` (Business) and `r2()` (Invoice) from the prototype into `BusinessReceipt.jsx` and `InvoiceReceipt.jsx` with the same markup and styling so the downloaded image looks identical.

- **Business:** title `Payment Receipt`, logo, business details, To / Status / Receipt No / Date / Payment, item table with sub-total and total, PAID box, motto (italic, only if filled), then a QR code on a white square with `SCAN TO SEE RECEIPT` under it. The background is the chosen theme image.
- **Invoice:** cream paper look, store name in the Kaushan Script font, a line, bold `LIST OF ITEMS BOUGHT`, one line per item (`qty NAME price`, name in capitals, line total), a line, bold `TOTAL`, the QR code, and `SCAN TO SEE RECEIPT`. No cash, change, date or terminal lines.

---

## 3. Authentication (Supabase Auth)

- The frontend uses the Supabase **publishable key** (or the legacy anon key) with `supabase.auth.signUp()` and `supabase.auth.signInWithPassword()`. The session is persisted by the Supabase client. Do not store passwords or sessions yourself, and do not keep users in `localStorage`.
- Every call from the frontend to the backend sends `Authorization: Bearer <access_token>`.
- The backend verifies the token on every protected route with `supabase.auth.getUser(token)` (server-side verification). **Never** trust `getSession()` or a decoded-but-unverified JWT on the server.
- The Supabase **secret / service-role key** exists only in the backend environment. It must never reach the frontend, the repo or any log.
- In the README, list the Supabase Auth settings to configure: Site URL and Redirect URLs (the Vercel production URL, preview URLs and `http://localhost:5173`), and whether email confirmation is on.

---

## 4. Colour options and images

The Business receipt has exactly **five** background colour options. They match the five background image folders, and the preview and the downloaded image both use that folder's JPEG as the receipt background (`background: <bg colour> url('/images/<folder>/<file>.jpg') center/cover`). Do not add other colours.

| Folder (and file name) | bg | ink | mut | accent | accent text | panel |
|---|---|---|---|---|---|---|
| `receipt-pro-bg-red` | `#FDECEC` | `#501313` | `#791F1F` | `#A32D2D` | `#fff` | `rgba(255,255,255,.72)` |
| `receipt-pro-bg-blue` | `#E6EEFD` | `#0B2A6B` | `#1E4FD8` | `#1E4FD8` | `#fff` | `rgba(255,255,255,.72)` |
| `receipt-pro-bg-light-blue` | `#EAF6FD` | `#0C447C` | `#1F7FBF` | `#2B8FD1` | `#fff` | `rgba(255,255,255,.72)` |
| `receipt-pro-bg-black` | `#161616` | `#F5F5F5` | `#B5B5B5` | `#FFFFFF` | `#161616` | `rgba(255,255,255,.08)` |
| `receipt-pro-bg-white` | `#FFFFFF` | `#1A1A1A` | `#555555` | `#1A1A1A` | `#fff` | `rgba(245,245,245,.8)` |

Swatch circle colours: red `#D32F2F`, blue `#1E4FD8`, light blue `#7CC4EE`, black `#161616`, white `#FFFFFF`. Default theme: blue. Keep this table in `src/lib/themes.js`.

Capture note: images are served from the same origin (`/images/...`), so `html2canvas` can draw them without CORS problems. Do not load receipt images from another domain.

---

## 5. Payment (Paystack) — real verification

Price: **₦100 per receipt** (`RECEIPT_PRICE_KOBO=10000`, configurable by env). A payment unlocks **one specific receipt** (identified by a fingerprint, below). The Paystack account's settlement bank account is the owner's: **Charis Digital Skill Academy, 08038303372**. Set that in the Paystack dashboard, not in code.

**Fingerprint.** The backend computes `sha256` over a canonical JSON of: trimmed business name, phone, address, motto, customer name and address, receipt number, date, payment method, currency, the items (`qty`, `item`, `price`, `discount`, numbers normalised to 2 decimals) and a hash of the logo. The style and the colour theme are **not** included. The same details always give the same fingerprint, so a returning user can download again without paying again, and changing any detail needs a new payment.

**Flow**

1. User taps `Download PDF` or `Download image`. Frontend calls `POST /api/receipts/check`. If it returns `paid: true`, go straight to step 7.
2. Otherwise the frontend calls `POST /api/payments/initialize` with the receipt payload. The backend: validates the payload; creates or reuses a `receipts` row (unique per `user_id` + `fingerprint`, with an unguessable `slug`); creates a pending `payments` row with `expires_at = now + 5 minutes`; calls Paystack `transaction/initialize` (amount in **kobo**, currency `NGN`, the user's email, a unique `reference`, `metadata.receipt_id`, `callback_url` = the frontend `/payment/callback`); returns `{ authorization_url, access_code, reference, expires_at, receipt: { id, slug } }`.
3. The frontend opens the **Payment window** with a **5:00 countdown**, the amount, and a `Pay now` button that opens Paystack checkout (redirect to `authorization_url`, or Paystack's popup using the returned access code, whichever the docs recommend for a Vite SPA).
4. If the countdown reaches zero before payment starts, show "Time expired" with `Start again` (a new initialize call).
5. After Paystack returns, `/payment/callback?reference=...` calls `GET /api/payments/verify?reference=...`. The backend calls Paystack `GET /transaction/verify/:reference` using the secret key and accepts the payment **only if** Paystack says the status is `success`, the amount is at least the price, the currency is `NGN`, and the reference belongs to the logged-in user. It then marks the payment and the receipt as paid. This must be idempotent.
6. `POST /api/webhooks/paystack` handles `charge.success`. Use `express.raw({ type: 'application/json' })` on this route only, verify the `x-paystack-signature` header (HMAC-SHA512 of the **raw body** with the Paystack secret key, compared in constant time), and do the same idempotent "mark paid" step. Always answer 200 quickly for valid events.
7. **Only after the receipt is paid:** the frontend renders the final receipt with the QR code, captures it as a JPEG, uploads it with `POST /api/receipts/:id/image`, and then saves the PDF or image file on the user's device.

A payment that Paystack confirms after the 5 minutes is still honoured (the money has been received). The 5 minutes only limits how long the window waits.

Secrets: the Paystack **secret** key lives only in the backend. The frontend never sees it.

---

## 6. Receipt history (database + Storage)

The History window is a separate full-screen window opened by `VIEW HISTORY`, with a Back button.

- Filter buttons at the top: `ALL (n)`, `BUSINESS (n)`, `INVOICE (n)`. The window opens on ALL.
- Each entry shows: the receipt picture (tap to enlarge), the store name, a coloured tag (`BUSINESS RECEIPT` in blue `#00A1E4` or `INVOICE RECEIPT` in amber `#F5B700`), date and time, items bought (first five, then `+N more`), total, `You paid ₦100`, and a `Download image` button.
- Empty states: `Nothing here yet. Receipts you pay for will show up here.` and `No business receipts yet.` / `No invoice receipts yet.`
- Endpoint: `GET /api/receipts?style=business|invoice&limit=&cursor=` returns the signed-in user's paid receipts, each with a short-lived signed URL for its image.

**Supabase Storage:** private bucket `receipt-images`, object path `{user_id}/{receipt_id}.jpg`. Add storage RLS policies on `storage.objects` so a signed-in user can read and write only inside their own `{user_id}/` folder (use `(storage.foldername(name))[1] = auth.uid()::text`). The backend validates uploads (JPEG or PNG, at most 2 MB, receipt belongs to the user and is paid) before saving. Use signed URLs for reading, never public URLs on this bucket.

**Database** (put everything in `backend/supabase/migrations/001_init.sql`, RLS enabled on every table):

- `receipts`: `id uuid pk`, `user_id uuid references auth.users`, `style` ('business' | 'invoice'), `theme text`, `fingerprint text`, `slug text unique`, `store_name text`, `total numeric`, `currency text`, `payload jsonb`, `image_path text`, `status` ('pending' | 'paid'), `created_at`, unique (`user_id`, `fingerprint`).
- `payments`: `id uuid pk`, `user_id`, `receipt_id`, `reference text unique`, `amount_kobo int`, `currency text`, `status` ('pending' | 'success' | 'failed' | 'expired'), `expires_at`, `verified_at`, `raw jsonb`, `created_at`.
- RLS: users can `select` only their own rows. All inserts and updates are done by the backend with the secret key.

---

## 7. QR code that shows the receipt picture

The QR code on both receipt styles encodes a link, **not** text: `https://<frontend-domain>/r/<slug>` (from `VITE_PUBLIC_SITE_URL`). The slug is long and unguessable (at least 16 random URL-safe characters).

- `GET /api/public/receipts/:slug` needs no login. It returns `{ store_name, style, created_at, image_url }`, where `image_url` is a Supabase signed URL valid for about 10 minutes. It returns 404 unless the receipt is paid and has an image. Rate-limit it.
- The frontend page `/r/:slug` shows the receipt picture full width on a clean page (store name, date, a `Download image` link), with a friendly "Receipt not found" state.
- Generate the QR with the `qrcode` package: error correction level M, a quiet zone of at least 4 modules, drawn at least 130×130 px on a white square so phones can scan it on dark and coloured backgrounds.
- Before payment the preview shows a placeholder QR; the real QR appears in the final image after payment.
- Note in the README that anyone who has the link can view that one receipt picture.

---

## 8. Design system (match the prototype exactly)

```css
:root{
  --ink:#0B1F2A; --mut:#4F6672; --line:#B7E2C9;
  --bg:#D8F4E3;          /* page background: light shaded green */
  --card:#E9FBF0;        /* cards, top bar, panels: lighter green */
  --inp:#F5FEF9;         /* inputs and option buttons: lightest green */
  --g:#04E762;           /* Malachite  – main buttons */
  --ga:#F5B700;          /* Amber Flame – line under top bar, card top borders, invoice tag */
  --gb:#00A1E4;          /* Blue Bell – outlines, focus ring, business tag */
  --gd:#00709F;          /* darker blue for headings and brand text */
}
```

- Fonts: Instrument Sans (body), Bricolage Grotesque (headings), Courier Prime (invoice lines), Kaushan Script (invoice store name).
- Main buttons: Malachite background with dark text. Secondary buttons: light background with a 1.5px Blue Bell border.
- **Hover on every button:** fade to dark orange `#E8832A` with dark brown text `#2B1500` (about 0.2s transition).
- Welcome and auth pages: soft green gradient background; the white-ish card has a 4px amber top border.
- Style cards on Home are large, with the sample image (about 360px tall, `object-fit: contain`) above a bold capital label. They stack in one column below 420px width.
- Fully responsive and keyboard accessible: visible focus ring, labels on all inputs, `aria-pressed` on toggle buttons, `role="dialog"` on windows, Esc closes windows.

---

## 9. Backend API summary

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/health` | none | Shallow health check, always `200` |
| GET | `/api/config` | none | `{ priceKobo, currency }` |
| POST | `/api/receipts/check` | user | `{ paid, receipt }` for a payload |
| POST | `/api/payments/initialize` | user | Create receipt and payment, call Paystack initialize |
| GET | `/api/payments/verify` | user | Verify with Paystack, mark paid |
| POST | `/api/webhooks/paystack` | signature | Paystack `charge.success` |
| POST | `/api/receipts/:id/image` | user | Upload final JPEG/PNG (multipart) |
| GET | `/api/receipts` | user | History list with signed image URLs, `style` filter |
| GET | `/api/public/receipts/:slug` | none | Public receipt picture by slug |

Backend requirements:

- Validate every body, query and parameter with `zod` (limits: at most 50 items, strings at most 200 characters, numbers 0 or more, request body at most 1 MB except the image upload).
- `helmet`, rate limiting (stricter on `/api/payments/*` and `/api/public/*`), and **CORS that allows only** the origins in `FRONTEND_ORIGINS` (comma separated: the Vercel production URL, preview URL pattern if needed, and `http://localhost:5173`). Allow the `Authorization` header.
- Consistent JSON errors: `{ error: { code, message } }`. Never leak stack traces or keys in production.
- Server: bind to `0.0.0.0` on `process.env.PORT` (Render's default is `10000`), and handle `SIGTERM` by closing the server gracefully.
- Keep `/health` shallow (no database calls). Add `/ready` only if you want a deeper check.

### Environment variables

`backend/.env.example`:
```
PORT=10000
NODE_ENV=development
FRONTEND_ORIGINS=http://localhost:5173
PUBLIC_SITE_URL=http://localhost:5173
SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=            # service-role/secret key, backend only
SUPABASE_STORAGE_BUCKET=receipt-images
PAYSTACK_SECRET_KEY=
PAYSTACK_CALLBACK_URL=http://localhost:5173/payment/callback
RECEIPT_PRICE_KOBO=10000
PAYSTACK_CURRENCY=NGN
```

`frontend/.env.example`:
```
VITE_API_URL=http://localhost:10000
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_PUBLIC_SITE_URL=http://localhost:5173
```
Only `VITE_`-prefixed variables reach the browser, so nothing secret may use that prefix.

---

## 10. Deployment (write all of this into the READMEs)

**Backend on Render**
- Provide `render.yaml` at the repo root: one `web` service, `runtime: node`, `rootDir: backend`, `buildCommand: npm ci`, `startCommand: npm start`, `healthCheckPath: /health`, and every secret as an environment variable with `sync: false`. Set the Node version.
- Explain: Render web services must bind `0.0.0.0` and use the `PORT` variable; after the first deploy copy the `https://<name>.onrender.com` URL into the Vercel variable `VITE_API_URL`, and add the Vercel domain to `FRONTEND_ORIGINS`.
- Free-tier services sleep when idle, so the first request can be slow. Make the frontend handle this with a friendly "Waking up the server…" message and one automatic retry.
- Paystack dashboard: set the webhook URL to `https://<render-url>/api/webhooks/paystack`.

**Frontend on Vercel**
- Import the repo, set **Root Directory = `frontend`** (Vite preset, build `npm run build`, output `dist`).
- Add the four `VITE_` environment variables in the Vercel project settings.
- `frontend/vercel.json` must contain the SPA rewrite so that `/r/:slug`, `/payment/callback` and other deep links work after a refresh:
  `{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }`

**Supabase**
- Create the project, run `001_init.sql` in the SQL editor (or with the Supabase CLI), confirm the `receipt-images` bucket is private, and set the Auth URL configuration.

---

## 11. Rules and acceptance checklist

Do not:
- put any secret key (Supabase secret/service role, Paystack secret) in the frontend, in git, or in logs;
- mark a payment as successful from the browser's say-so. Only the backend, after Paystack verification or a signed webhook, may do that;
- use `localStorage` for accounts, passwords, payments or history (this is the prototype's shortcut and must be replaced);
- change the wording, colours or layout in sections 2 and 8 without asking me.

Done means all of these work, and you have tested them:
1. Sign up, log in and log out with Supabase; the welcome page, GET STARTED, auth and home screens look like the prototype.
2. Both sample images show on the Home cards; the five colour swatches use the five background images; the Invoice style has no swatches.
3. Business and Invoice previews match the prototype; the Business motto shows only when filled; the QR and `SCAN TO SEE RECEIPT` show on both.
4. An unpaid download opens the payment window with a 5-minute countdown; a real Paystack test payment (₦100) unlocks the download; the webhook and the verify call are both idempotent; a fake or tampered webhook is rejected.
5. Downloading the same receipt again, even after logging out and back in, does not ask for payment; changing any detail does.
6. After payment the JPEG is stored in Supabase Storage under the user's folder, and the receipt appears in VIEW HISTORY with the right tag, filters, enlarge and download.
7. Scanning the QR code with a phone opens `/r/<slug>` and shows the receipt picture without logging in; an unknown slug shows "Receipt not found".
8. One user can never read another user's history or images (test it).
9. Frontend builds with `npm run build`; backend starts with `npm start`; unit tests pass for the fingerprint, webhook signature and payment checks.
10. READMEs let a beginner set up Supabase, Paystack, Render and Vercel in order, including every environment variable.

When you finish, give me a short list of what you built, the exact commands to run locally, the values I still need to fill in, and anything you changed from this prompt and why.
