# Farmers A to Z Web

FarmDirect is a direct farm-to-consumer marketplace for fair pricing, traceable produce, and transparent savings.

## Run locally

**Prerequisite:** Node.js 18 or newer.

```powershell
npm install
npm run dev
```

Authentication uses Supabase email addresses as usernames and passwords for public Consumer, Farmer, and Delivery Partner registration and login. Forgotten passwords use the Supabase email reset link. Keep Customer Care and Admin access invitation-only/manual as described below.

To allow users to sign in immediately after creating an account, disable **Confirm email** under Supabase Dashboard -> Authentication -> Providers -> Email. This does not disable password-reset emails; `resetPasswordForEmail` continues to send reset links.

## Platform architecture

The website is a React/Vite frontend. Browser state currently keeps the demo marketplace inventory and order cache in `localStorage`, while confirmed orders can call the Node delivery service at `http://localhost:8787`.

### Backend services

- **Node.js + Express:** order confirmation, delivery assignment, partner responses, fallback reassignment, OTP/QR verification, payment-release state, and REST APIs.
- **WebSockets:** live assignment, partner notification, GPS location, ETA, pickup, and delivery events at `/ws`.
- **Supabase:** preferred production persistence through the server-only service-role client. Orders are stored in `orders`; assignments are stored in `delivery_assignments`.
- **Supabase Auth + profiles:** email/password authentication is resolved to a database profile. Roles and account status are never trusted from browser state or user-supplied registration fields.
- **MongoDB:** optional compatibility fallback when Supabase variables are absent.
- **FastAPI:** optional AI service in `ai_service.py`, exposing `/recommend-vehicle` for vehicle recommendations.

Demand Radar is calculated by the Express service from the submitted inventory and order history at `/api/demand-radar`; it returns ranked demand pressure, evidence, and model metadata. Configure Razorpay for real card/UPI checkout and server-side signature verification:

```text
RAZORPAY_KEY_ID=your-public-key-id
RAZORPAY_KEY_SECRET=server-only-secret
```

The browser creates a payment order through `/api/payments/create`, opens Razorpay Checkout, and the server verifies the returned signature at `/api/payments/verify` before an order is accepted. Never put `RAZORPAY_KEY_SECRET` in a `VITE_*` variable. Development mode uses an explicitly marked local payment stub; production refuses payment creation without Razorpay credentials.

Start the services locally:

```powershell
npm run delivery
npm run dev
uvicorn ai_service:app --reload --port 8000
```

### Delivery assignment algorithm

When an order is confirmed, the service filters partners by configured radius, availability, and vehicle capacity. It then scores each candidate using distance, estimated travel time, rating, spare capacity, and active workload. The highest score is notified first. A decline or 60-second timeout moves the assignment to the next ranked candidate.

Vehicle recommendation thresholds are: Bike up to 20 kg, Auto 20-300 kg, Mini Truck 300-1500 kg, and Truck above 1500 kg.

### Mapping and live delivery

Without a key, the service uses a Haversine distance estimate so local development works offline. Set `GOOGLE_MAPS_API_KEY` to use Google Distance Matrix for ETA updates. Partner GPS updates are posted to `/api/assignments/:assignmentId/location` and broadcast to WebSocket clients.

### Supabase setup

Create these tables in Supabase SQL Editor:

Run [`supabase-auth.sql`](supabase-auth.sql) first. It creates the `profiles` table, enum constraints, the allowlisted public signup trigger, RLS policies, and the explicit first-admin bootstrap placeholder. Replace the placeholder UUID with the Auth user's real UUID after creating that user manually in the Supabase Dashboard.

Run [`delivery-partner.sql`](delivery-partner.sql) after it. It creates the delivery-partner application table, verification fields, operational state, location-permission flag, and RLS policies.

```sql
create table public.orders (
	id text primary key,
	payload jsonb not null,
	updated_at timestamptz not null default now()
);

create table public.delivery_assignments (
	id text primary key,
	order_id text not null,
	status text not null,
	payload jsonb not null,
	updated_at timestamptz not null default now()
);

alter table public.orders enable row level security;
alter table public.delivery_assignments enable row level security;
```

Configure the delivery service with a `.env` file or deployment secrets:

```text
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=server-only-key
FRONTEND_ORIGIN=http://localhost:5173
DELIVERY_RADIUS_KM=15
PARTNER_RESPONSE_TIMEOUT_MS=60000
GOOGLE_MAPS_API_KEY=optional
FIREBASE_PROJECT_ID=optional
```

Never expose `SUPABASE_SERVICE_ROLE_KEY`, Firebase credentials, Google Maps server keys, or database URLs in React code or `VITE_*` variables. The browser should use authenticated user sessions and the Express API; Supabase Row Level Security should remain enabled, with policies added for farmer, buyer, and delivery-partner ownership.

### Security and data management

- Keep all secrets in deployment environment variables and rotate them regularly.
- Restrict `FRONTEND_ORIGIN` to the real frontend origin in production; do not use `*` outside local development.
- Validate order weight, coordinates, partner IDs, OTPs, and QR tokens on the server before changing status.
- Use HTTPS/WSS, rate-limit login and verification endpoints, and require authenticated farmer/buyer/partner sessions.
- Store only the minimum buyer address and contact data needed for fulfillment; define retention and deletion rules.
- Hash or encrypt OTPs and sensitive delivery data in production rather than keeping demo values in assignment payloads.
- Release payment only after server-side delivery verification, and record an immutable status history for disputes.
- Use Supabase RLS policies and audit logs for row access; never query production tables directly from an untrusted client.

The current repository includes the working demo flow and adapters. Authentication policies, production payment provider integration, real device GPS permissions, and final Supabase RLS policies should be completed before deployment.

### Authentication and authorization flow

1. The owner creates the first user manually in Supabase Auth, copies that Auth user's UUID, and runs the bootstrap row in `supabase-auth.sql` with `role = 'admin'` and `account_status = 'approved'`. There is no public admin registration path.
2. Public registration may choose only `consumer`, `farmer`, or `delivery_partner`. The database trigger allowlists those three values and converts every other requested role to `consumer`; `admin` and `customer_care` cannot be created through public signup.
3. On login, Supabase verifies the password and returns an access token. Express validates that token with Supabase Auth, loads `profiles.user_id`, and requires `role` plus `account_status = 'approved'` before returning `/api/me` or serving protected APIs.
4. An approved admin uses the Admin control screen to invite Customer Care. The backend uses the Supabase service-role admin API, creates a `customer_care` profile in `pending` status, and records the approving admin UUID. The admin must explicitly approve it before access is granted.
5. Direct URL entry or manually changing browser state does not grant access: protected Express routes reject missing, invalid, pending, disabled, or incorrectly role-matched profiles. Supabase RLS also limits profile reads and blocks client role mutation.
6. The admin can disable Customer Care from the staff list. Every subsequent API request checks the current profile status, so the disabled user loses protected access even if an old browser session remains.

### Delivery Partner flow

1. A user selects `Delivery Partner` during public registration. Supabase creates the Auth user and the trigger creates a `delivery_partner` profile with `account_status = pending`.
2. The partner can access only the onboarding application. They submit name, mobile, email, operating location, service area, vehicle details, government-ID verification fields, and optional location permission. The UI shows **Application Pending Admin Verification** and exposes no delivery acceptance controls.
3. An Admin reviews the application in the Admin dashboard. **Verify & activate** sets `verification_status = verified`, `account_status = active`, records `approved_by` and `approved_at`, and approves the linked profile. Rejecting sets `verification_status = rejected`, suspends the partner record, and disables the linked profile.
4. Assignment queries only partners where `verification_status = verified`, `account_status = active`, and `availability_status = available`. Ranking considers service area, pickup distance, destination, active-order count, vehicle capacity, and the configured delivery radius. A partner without permitted current location cannot be distance-ranked.
5. The acceptance endpoint validates the Supabase bearer token, requires the `delivery_partner` role, checks the authenticated UUID against the assigned partner UUID, and re-checks verified/active/available state. A posted `partnerId` cannot impersonate another partner.

Open the local URL printed by Vite, usually `http://localhost:5173/`.

The web app includes:

- Marketplace search, category filters, produce listings, and direct ordering
- Browser-persisted orders and inventory updates
- Zero Cut savings calculator
- Orders and cumulative savings view
- Farmer Hub with listing management and incoming orders

Data is stored in the browser with `localStorage`; no API key or backend is required for the local demo.

## Production build

```powershell
npm run build
npm run preview
```
