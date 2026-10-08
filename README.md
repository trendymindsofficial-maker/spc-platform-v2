# Student Benefit Card (SBC)

Monorepo split into a Next.js frontend (Vercel) and an Express API (Render).

```
spc-platform-v2/
├── frontend/              Next.js 16 app  -> Vercel
│   ├── src/app/           pages for student, business, admin
│   ├── src/components/    shared UI (QR scanner, protected routes)
│   ├── src/lib/           firebase client, api client, messaging
│   └── .env.local         NEXT_PUBLIC_* only
│
├── backend/               Express 4 + TypeScript -> Render
│   ├── src/routes/        the API surface
│   ├── src/middleware/    Firebase ID token auth, error handling
│   ├── src/lib/           firebase-admin, razorpay, helpers
│   ├── src/config/        env loading + business constants
│   └── .env               all secrets live here
│
├── _archive/              pre-split originals, kept for reference
├── firestore.rules        deployed with the Firebase CLI from the root
├── firestore.indexes.json
└── storage.rules
```

## How the two halves talk

The browser authenticates directly with Firebase Auth, then sends the
resulting ID token to the backend:

```
Authorization: Bearer <firebase id token>
```

The backend verifies every token with the Admin SDK. There are no
sessions and no cookies, which keeps CORS simple and means the frontend
can be served from any origin on the allowlist.

Frontend calls go through one helper, `frontend/src/lib/api.ts`:

```ts
import { apiFetch } from "@/lib/api";

const res = await apiFetch("/api/payout/history", {
  headers: { Authorization: `Bearer ${idToken}` },
});
```

`apiFetch` prefixes `NEXT_PUBLIC_API_BASE_URL`. Paths are unchanged from
the previous Next.js route handlers, so the mapping is one-for-one.

## API surface

| Method | Path | Auth |
| --- | --- | --- |
| POST | `/api/admin/check-email` | public |
| POST | `/api/admin/notifications/send` | admin |
| GET | `/api/admin/payouts` | admin |
| PATCH | `/api/admin/payouts` | admin |
| POST | `/api/business/check-mobile` | public |
| POST | `/api/business/reset-password` | phone-verified user |
| POST | `/api/payment/webhook` | Razorpay signature |
| GET | `/api/payment/config` | public |
| GET | `/api/payment/membership-status` | user |
| POST | `/api/payment/claim` | user |
| POST | `/api/payment/create-order` | user (disabled without API keys) |
| POST | `/api/payment/verify` | user (disabled without API keys) |
| GET | `/api/payout/history` | user |
| POST | `/api/payout/request` | user |
| POST | `/api/redemption/create` | user |
| POST | `/api/referral/process` | user |
| POST | `/api/referral/reconcile` | user |
| POST | `/api/student/check-mobile` | public |
| GET | `/health` | public |

"admin" means the uid has a document in the `admins` collection.

## How membership payment works

Payment is collected by a **hosted Razorpay Payment Button**, which needs
no Orders API approval. The important consequence: the button gives the
browser no success callback and no payment signature, so the frontend
never decides that a payment succeeded.

```
student registers
      │
      ▼
student document created as  status = pending_payment
                             paymentStatus = pending     ← no benefits
      │
      ▼
hosted Razorpay Payment Button  ──pays──►  Razorpay
                                               │
                        POST /api/payment/webhook  (X-Razorpay-Signature)
                                               │
                                               ▼
                        signature + amount + payer verified
                                               │
                                               ▼
                   status = active, paymentStatus = paid, dates written
      │
      ▼
frontend onSnapshot sees the change and moves on
```

Because the browser is not involved in confirmation, closing the tab
mid-payment does not lose the membership.

### What the webhook checks before granting anything

1. `X-Razorpay-Signature` is HMAC-SHA256 over the **raw request body**,
   keyed with `RAZORPAY_WEBHOOK_SECRET`, compared timing-safely. Note this
   is the *webhook* secret, not the API key secret — they are different
   secrets over different inputs, and mixing them up is the usual cause of
   "signature always fails".
2. The event is `payment.captured` and the payment status is `captured`.
   Authorised-but-not-captured is acknowledged and ignored.
3. The amount is exactly ₹199 in INR.
4. `membershipPayments/<razorpay_payment_id>` acts as the idempotency key,
   inside the same transaction that extends the membership. Razorpay
   retries until it gets a 2xx, so the same payment does arrive more than
   once; it can only ever grant one year.

### Linking a payment to a student

A static payment button is the same for everyone, so the webhook
identifies the payer by, in order: `notes.uid`, then the **phone number**
entered on Razorpay's checkout matched against `students.mobile`, then
email. Razorpay always collects a contact number, so the phone path is
the dependable one.

This is the one soft spot in the design: a student who pays with a
different number cannot be matched automatically. Those payments are
never dropped — they are stored as `status: "unmatched"` and the student
can attach one themselves with the payment id from their receipt via
`POST /api/payment/claim`, which only accepts a payment that was received
over a verified webhook, is captured for ₹199, and is not already
credited to anyone. Admins can also see them in `membershipPayments`.

### Razorpay setup

In the Razorpay dashboard:

1. **Payment Button** — create it, copy the `data-payment_button_id` into
   `RAZORPAY_PAYMENT_BUTTON_ID`. Test-mode and live-mode buttons are
   different ids; a test button will not work in live mode.
2. **Settings → Webhooks → Add New Webhook**
   - URL: `https://<your-render-service>.onrender.com/api/payment/webhook`
   - Secret: any value you choose — put the same value in
     `RAZORPAY_WEBHOOK_SECRET`
   - Active event: `payment.captured`

`RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` are optional and only re-enable
the legacy card-checkout endpoints. While they are blank the server logs
that Checkout is disabled and those two endpoints answer `503`.

> The webhook must be reachable from the internet, so it cannot be tested
> against `localhost` directly. Deploy to Render, or tunnel.

## Business rules enforced server-side

These live in `backend/src/config/constants.ts` so they cannot drift
between endpoints:

- Membership is **₹199 / year**, enforced against the amount Razorpay
  reports, never against anything the browser sends.
- `membershipPayments/<razorpayPaymentId>` is the idempotency key, so a
  retried webhook cannot extend a membership twice. Renewing early
  extends from the current expiry rather than from today.
- An unpaid student (`paymentStatus: "pending"`) has **no benefits**:
  offer redemption returns `MEMBERSHIP_EXPIRED` and referrals do not
  credit, because both gate on `paymentStatus === "paid"`.
- A student may redeem at most **4 times per business**, counted on
  `businessId + studentId`. Replacing an offer does not reset the count.
- Referrals pay **₹250 for every 10** successful referrals. A referral
  only counts once the referred student is `active` **and** `paid`, and
  `referrals/<referredUid>` prevents double counting.
- Payout requests reserve their amount in `referralPendingPayoutAmount`
  inside a transaction, so the same balance cannot be withdrawn twice.
  Minimum payout is ₹250.

## Local development

Two terminals.

```bash
# terminal 1 — backend on http://localhost:8080
cd backend
npm install
cp .env.example .env     # then fill in the values
npm run dev

# terminal 2 — frontend on http://localhost:3000
cd frontend
npm install
cp .env.example .env.local   # set NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
npm run dev
```

Check the backend is healthy:

```bash
curl http://localhost:8080/health
```

## Deploying the backend to Render

1. New -> Web Service, connect the repo.
2. **Root Directory**: `backend`
3. **Build Command**: `npm ci && npm run build`
4. **Start Command**: `npm start`
5. **Health Check Path**: `/health`
6. Add the environment variables from `backend/.env.example`.
   `FRONTEND_ORIGIN` must include your Vercel domain, comma-separated:
   `https://www.studentbenefitcard.com,https://studentbenefitcard.com`
7. Deploy, then note the service URL, e.g.
   `https://sbc-backend.onrender.com`.

`backend/render.yaml` describes the same setup as a blueprint.

> On Render's free plan the service sleeps when idle, so the first
> request after a quiet period takes a few seconds. Use a paid instance
> if payment verification needs to stay warm.

## Deploying the frontend to Vercel

1. New Project, import the repo.
2. **Root Directory**: `frontend`
3. Framework preset: Next.js (detected automatically).
4. Add the environment variables from `frontend/.env.example`. Set
   `NEXT_PUBLIC_API_BASE_URL` to the Render URL from the previous step.
5. Deploy.

`NEXT_PUBLIC_*` values are baked in at build time, so changing
`NEXT_PUBLIC_API_BASE_URL` requires a redeploy, not just a restart.

## Order of operations

Deploy the backend first, because the frontend build needs its URL:

1. Render: deploy backend, copy the service URL.
2. Vercel: set `NEXT_PUBLIC_API_BASE_URL` to that URL, deploy frontend.
3. Render: add the final Vercel domain to `FRONTEND_ORIGIN`, redeploy.

Preview deployments on `*.vercel.app` are allowed by the CORS layer
automatically, so previews work without touching `FRONTEND_ORIGIN`.

## Firebase

Rules and indexes stay at the repo root and deploy with the Firebase CLI:

```bash
firebase deploy --only firestore:rules,firestore:indexes,storage
```

## Secrets

`backend/.env`, `frontend/.env.local` and any service-account JSON are
gitignored. Only the `.env.example` templates are committed.

`RAZORPAY_WEBHOOK_SECRET` in `backend/.env` is a local placeholder. Set
the real value on Render and make it match the secret on the Razorpay
webhook, otherwise every payment notification is rejected as unsigned and
no membership is ever activated.
