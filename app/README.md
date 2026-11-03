# DealFlow — Version 1

One platform for **real estate agents**, **investors/flippers** and **remodelers**.
("DealFlow" is a working name — change it any time.)

## What's in Version 1
- Sign up / sign in, choosing one or more roles: Agent, Investor, Remodeler
- **Dashboard** — active leads, pipeline value, tasks due, recent activity
- **Pipeline** — leads by stage (New Lead → Contacted → Warm → Appointment → Offer Made → Under Contract → Closed / Dead)
- **Properties** — address, type, beds/baths, sq ft, lead source
- **Contacts** — owners, buyers, sellers, clients, partners; tap-to-call; "contacted today"
- **Tasks** — follow-ups with due dates, linked to a property or contact
- **Settings** — change your roles

## Try it (demo mode, no database needed)
Requires [Node.js](https://nodejs.org) 18 or newer.

```bash
cd app
npm install
npm run dev
```
Open the address it prints (usually http://localhost:5173). In demo mode, data is saved only in your browser.

## Connect Supabase (save data online)
1. Create a free project at https://supabase.com
2. In Supabase: **SQL Editor** → paste all of `database/schema.sql` → **Run**
3. In Supabase: **Project Settings → API** → copy the **Project URL** and the **anon public** key
4. In the `app` folder, copy `.env.example` to `.env` and fill them in:
   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```
5. Restart `npm run dev`. The yellow "Demo mode" banner disappears.

Each user only sees their own data (enforced in the database by Row Level Security).

## Coming next
- Version 2: investor deal calculator (ARV, repairs, max offer), agent listings, remodel estimator
- Version 3: showings, transactions, commissions, driving-for-dollars mode
- Version 4: subscriptions and billing
