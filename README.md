# AuraTrack backend deployment

## Render

This repository is ready to deploy as a Render Node web service.

- **Build command:** `npm ci`
- **Start command:** `npm start`
- **Health check path:** `/api/health`

The included `render.yaml` defines these settings for a Blueprint deployment.

In Render's Environment page, add these required variables:

- `SUPABASE_DB_URL` (or the local PostgreSQL `DB_NAME`, `DB_USERNAME`, `DB_PASSWORD`, and `DB_HOST` variables)
- `ACCESS_TOKEN_SECRET`
- `PASSWORD_VAULT_KEY`
- `OPENROUTER_API_KEY`

Optional variables: `OPENROUTER_MODEL` (default: `openai/gpt-4o-mini`), `OPENROUTER_SITE_URL`, `OPENROUTER_APP_NAME`, `OPENROUTER_TIMEOUT_MS`, `PORT` (Render sets this automatically), `DB_LOGGING`, and `DB_SSL`.

### Notification jobs

`render.yaml` defines four Render Cron Jobs, so reminders still run if the web
service is asleep or restarted. Set `SUPABASE_DB_URL` only on the
`auratrack-backend` web service. The Blueprint securely references that same
environment variable from the habit, birthday, todo, and push-receipt jobs, so
they all use the production database without duplicating the secret. The
schedules are expressed in UTC and correspond to 11:00 AM, 11:00 PM, midnight,
and every 15 minutes in Asia/Kolkata. Apply `migrations/20260826_add_notifications.sql` and
`migrations/20260907_add_expo_push_receipts.sql` before deploying the jobs.

For Supabase, set `SUPABASE_DB_URL` to its PostgreSQL connection string; do not expose it to the mobile app.

For an existing Blueprint, Render does not populate `sync: false` values during
an update. Confirm `SUPABASE_DB_URL` is set on `auratrack-backend` in the Render
Dashboard, sync the Blueprint, then use **Trigger Run** on
`auratrack-push-receipts` to process pending Expo receipts immediately. No
Firebase service-account JSON is used by any notification cron job.

### Supabase on Render

In the Supabase dashboard, open **Connect** and copy the **Session pooler** connection string (the host ends in `.pooler.supabase.com` and the port is `5432`). Use that value for `SUPABASE_DB_URL` in Render.

Do not use Supabase's direct `db.<project-ref>.supabase.co:5432` connection string on a Render instance without IPv6 connectivity. It resolves only to IPv6 unless the Supabase IPv4 add-on is enabled.
