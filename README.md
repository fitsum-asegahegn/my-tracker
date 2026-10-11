# ሕይወቴ — Life OS (Vite + React + Supabase)
1. Supabase: new project → SQL Editor → run `supabase/schema.sql`, then `supabase/migration-002.sql`. Auth → Email: turn off "Confirm email" for quick testing.
2. `cp .env.example .env`, fill URL + anon key. `npm install && npm run dev`.
3. Telegram (works with app closed): BotFather token →
   `supabase functions deploy daily-brief` and `supabase secrets set TELEGRAM_BOT_TOKEN=...`
   then uncomment/run the two `cron.schedule` lines at the bottom of schema.sql (fill REF and SERVICE_ROLE_KEY).
4. Deploy the site on Vercel (import the GitHub repo, add the three VITE_ env vars). The site workflow was removed; only `deploy-functions.yml` remains for the Edge Function.

## Realtime, push, partner (migration-003)
- Run `supabase/migration-003.sql`. Changes on one device now appear on others within a second.
- Push keys: `npx web-push generate-vapid-keys`. Put the public key in `.env` / GitHub secret `VITE_VAPID_PUBLIC_KEY`.
  `supabase secrets set VAPID_PUBLIC=... VAPID_PRIVATE=... VAPID_SUBJECT=you@email.com`, then redeploy: `supabase functions deploy daily-brief`.
  iPhone: Add to Home Screen first (iOS 16.4+), then tap Enable in Settings.
- Partner: add their email in Settings; they sign up with the same email and see your check-ins under "Shared with me".

## Auto-deploy the Edge Function (deploy-functions.yml)
Every push to `main` that touches `supabase/functions/**` redeploys `daily-brief`; you can also run it by hand (Actions → Deploy Edge Functions → Run workflow).
Add two GitHub repo secrets (Settings → Secrets and variables → Actions):
- `SUPABASE_ACCESS_TOKEN`: supabase.com → Account → Access Tokens → Generate new token
- `SUPABASE_PROJECT_REF`: the `xxxx` in `https://xxxx.supabase.co`
`--no-verify-jwt` is used because the pg_cron job calls the function with the service-role key. The function secrets (`TELEGRAM_BOT_TOKEN`, `VAPID_*`) are set once in Supabase → Edge Functions → Secrets and survive redeploys.

## Per-user reminder time + Sunday partner summary (migration-004)
- Run `supabase/migration-004.sql` (fill REF and SERVICE_ROLE_KEY in its last line). It replaces the two fixed cron jobs with one job every 15 minutes; `daily-brief` then sends each person's morning/evening reminder at the time set in Settings (Addis time, within a 2-hour catch-up window, once per day).
- Sunday after 19:00 Addis time, each partner gets a summary of the owner's week (active days, daily habits n/7, weekly+ habits done or not, overdue long-interval items) by Telegram and/or push. The partner must have signed up with the shared email and set their own Telegram chat ID or enabled push. The owner can switch it off in Settings.

## Partner nudges (migration-005)
Run `supabase/migration-005.sql`, then redeploy `daily-brief` (push to main). A partner opens "Shared with me" → taps a preset or writes up to 140 characters. The owner sees it instantly on the Today screen (realtime); Telegram/push copies go out on the next 15-minute tick. Partners can only send through the `send_nudge` function (checks the partner link, 1 nudge per 12 hours); the owner is the only one who can read them.

## Security fix (migration-006): run it
Closes a hole where a partner could add check-ins to the owner's habits. `daily-brief` now also rejects any caller that is not the cron job (it checks for the service-role key).
