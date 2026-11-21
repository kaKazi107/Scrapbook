# Stage B — Supabase setup

This folder holds the cloud schema for Stage B (auth + sync + photo storage).

## 1. Create a Supabase project

1. Go to <https://supabase.com> and sign in.
2. **New project** → pick a name (e.g. `scrapbook`), a strong database password, and a region close to you.
3. Wait for provisioning to finish (~1–2 min).

## 2. Run the schema

1. In the Supabase dashboard open **SQL Editor**.
2. Paste the entire contents of [`migrations/0001_init.sql`](./migrations/0001_init.sql) and click **Run**.
3. Then paste [`migrations/0002_photos.sql`](./migrations/0002_photos.sql) and click **Run** (adds the
   `photos` column for personal photos).
4. This creates `profiles`, `catalog_items`, `activity_entries`, row-level-security
   policies, the signup trigger, and the public `entry-images` storage bucket.

## 3. Enable email auth

**Authentication → Providers → Email** is enabled by default.

- For quick local testing you can turn **Confirm email** off
  (Authentication → Providers → Email → toggle "Confirm email").
- If you leave it on, new users must click the link in their inbox before signing in.

## 4. Wire the app

1. **Project Settings → API** → copy:
   - **Project URL** → `EXPO_PUBLIC_SUPABASE_URL`
   - **anon public** key → `EXPO_PUBLIC_SUPABASE_ANON_KEY`
2. Create `.env.local` in the project root (see `.env.example`) and paste them in.
3. Restart the dev server (`Ctrl+C`, then `npm start`) so Expo picks up the new env vars.

> `.env.local` is git-ignored. Never commit real keys.

## Data model

| Table | Purpose |
| --- | --- |
| `profiles` | One row per auth user (auto-created on signup) |
| `catalog_items` | Shared, deduplicated metadata (future edge-function proxy) |
| `activity_entries` | Per-user memories; `local_id` maps back to the phone row || `storage.entry-images` | Public-read photo bucket; writes scoped to the owner's folder |

## How sync works (current)

- **Push**: local rows with `synced_at IS NULL OR updated_at > synced_at` are upserted
  on `(user_id, local_id)`. Local photos are uploaded to storage once and referenced
  by public URL.
- **Pull**: the user's remote rows are merged locally; newer local edits win
  (last-write-wins).
- **Trigger**: on tab focus and after create / edit / delete.

This is a pragmatic first pass. Dedicated conflict resolution and an edge-function
search proxy come later.
