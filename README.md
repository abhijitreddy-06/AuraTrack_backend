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

Optional variables: `PORT` (Render sets this automatically), `DB_LOGGING`, and `DB_SSL`.

For Supabase, set `SUPABASE_DB_URL` to its PostgreSQL connection string; do not expose it to the mobile app.

### Supabase on Render

In the Supabase dashboard, open **Connect** and copy the **Session pooler** connection string (the host ends in `.pooler.supabase.com` and the port is `5432`). Use that value for `SUPABASE_DB_URL` in Render.

Do not use Supabase's direct `db.<project-ref>.supabase.co:5432` connection string on a Render instance without IPv6 connectivity. It resolves only to IPv6 unless the Supabase IPv4 add-on is enabled.
